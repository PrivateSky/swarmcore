/**
 * Created by: sinica
 * Date: 6/7/12
 * Time: 11:36 PM
 */
    
var redis = require("redis");
var fs = require('fs');
var nutil = require("util");
var uuid = require('node-uuid');
var newSwarmPhase = require("./SwarmingPhase.js").newSwarmPhase;
var swarmDSL = require("./SwarmDSL.js");

/**
 * Adapter core class
 * @param nodeName
 * @constructor
 */


function AdapterCore(mainGroup, config, swarmComImpl) {
    /* local utility, functions  */

    if(thisAdapter.initilised){
        delayExit("Creating two adapters in the same process is forbidden.Process existing...", ExitERROR.MultipleCores);
    }
    thisAdapter = this;

    if(!config){
        var basePath = process.env.SWARM_PATH;
        var basicConfigFile = basePath + "/etc/config";
    }
    try {
        var configContent = fs.readFileSync(basicConfigFile);
        this.config = JSON.parse(configContent);
    }
    catch (err) {
        delayExit("Syntax error on parsing config file: " + basicConfigFile + " |: " + err.toString(), ExitCodes.WrongConfig);
        return null;
    }

    if(!swarmComImpl){
        swarmComImpl = require("../com/redisComImpl").implemenation;
    }

    this.nativeMiddleware = swarmComImpl;

    /* initialisation */
    this.nodeName   = swarmComImpl.generateNodeName(mainGroup);
    this.mainGroup  = mainGroup;


    this.coreId = this.config.Core.coreId;

    thisAdapter.initilised = true;

    swarmComImpl.subscribe(this.nodeName, onMessageFromQueue );

    function onMessageFromQueue(initVars) {
        var swarmingPhase = newSwarmPhase(initVars.meta.swarmingName, initVars.meta.currentPhase, initVars);

        if(!swarmingPhase.meta.phaseStack){
            swarmingPhase.meta.phaseStack = [];
        }
        swarmingPhase.meta.phaseStack.push(initVars.meta.currentPhase);

        if (swarmingPhase.meta.debug == true) {
            cprint("[" + thisAdapter.nodeName + "] executing message: \n" + M(initVars));
        }

        //swarmingPhase.meta.fromNode = thisAdapter.nodeName;

        var cswarm = swarmDSL.getSwarmDescription(swarmingPhase.meta.swarmingName);
        if (swarmingPhase.meta.swarmingName == undefined || cswarm == undefined) {
            logErr("Unknown swarm requested by another node: " + swarmingPhase.meta.swarmingName);
            return;
        }

        swarmComImpl.asyncExecute(swarmingPhase, function(){
            beginExecutionContext(swarmingPhase);
            try {
                var executionError = false;
                var stage = swarmingPhase.meta.currentStage;
                if(!stage){
                    stage = "code";
                }
                var phaseFunction = cswarm[swarmingPhase.meta.currentPhase][stage];
                if (phaseFunction != null) {
                    try {
                        phaseFunction.apply(swarmingPhase);
                    }
                    catch (err) {
                        logErr("Syntax error when running swarm code! Phase: " + swarmingPhase.meta.currentPhase, err);
                        executionError = err;
                    }
                }
                else {
                        logInfo("DROPPING unknown swarming message!" + J(initVars));
                        executionError = new Error("Unknown swarm phase or stage");
                    }
            }
            catch (err) {
                logErr("Error running swarm : " + swarmingPhase.meta.swarmingName + " Phase:" + swarmingPhase.meta.currentPhase, err);
                executionError = err;
            }
            if(executionError){
                swarmComImpl.phaseExecutionFailed(executionError, swarmingPhase);
            }
            endExecutionContext();
        })
    }

    this.joinGroup = function(groupName){
        swarmComImpl.joinGroup(groupName);
    }

}

/**
 * global variable making current Adapter available anywhere
 * @type {AdapterCore}
 */
thisAdapter = null;
/**
 *
 * @param mainGroup
 * @param config: node config(optional)
 * @param communication implemnattion
 * @param verbose: set global verbosity
 * @return {*}
 */

exports.init = function (mainGroup, config, swarmComImpl, verbose) {
    globalVerbosity = verbose;
    addGlobalErrorHandler();
    thisAdapter = new AdapterCore(mainGroup, config, swarmComImpl );
    return thisAdapter;
}

//exports.onMessageFromQueueCallBack = onMessageFromQueue;


/**
 * Global function, start a swarm in another adapter, even another session
 * @param targetAdapter
 * @param targetSession
 * @param swarmingName
 * @param ctorName
 */
startRemoteSwarm = function (targetAdapter, targetSession, swarmingName, ctorName, outletId) {
    var args = []; // empty array
    // copy all other arguments we want to "pass through"
    for (var i = 5; i < arguments.length; i++) {
        args.push(arguments[i]);
    }
    cprint("Starting remote swarm " + swarmingName + " towards " + targetAdapter + " Args: " + J(args));
    startSwarm("startRemoteSwarm.js", "start", targetAdapter, targetSession, swarmingName, ctorName, outletId, args);
}

/**
 * Global function, start swarms knowing swarm name, constructor name and variable arguments
 * @param swarmingName
 * @param ctorName
 * @param var args
 */
startSwarm = function (swarmingName, ctorName) {
    try {
        var swarming = newSwarmPhase(swarmingName, ctorName);
        if (!swarmDSL.swarmExist(swarmingName)) {
            logErr("Unknown swarm  " + swarmingName);
            return;
        }
        dprint("Starting swarm " + swarmingName);
        swarming.meta.processIdentity   = thisAdapter.nativeMiddleware.createProcessIdentity();
        swarming.meta.phaseIdentity     = thisAdapter.nativeMiddleware.createPhaseIdentity(swarming);
        swarming.meta.command           = "phase";
        swarming.meta.tenantId          = getCurrentTenant(true);
        swarming.meta.userId            = getCurrentUser(true);
        swarming.meta.sessionId         = getCurrentSession(true);
        swarming.meta.outletId          = getCurrentOutletId(true);
        //swarming.meta.responseURI = getCurrentResponseURI();
        swarming.meta.entryAdapter      = getEntryAdapter(true);

        beginExecutionContext(swarming);
        var start = swarmDSL.getSwarmDescription(swarmingName)[ctorName];

        if (start == undefined) {
            logErr("Unknown ctor  " + ctorName + " in swarm " + swarmingName);
            return;
        }

        var args = []; // empty array
        // copy all other arguments we want to "pass through"
        for (var i = 2; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
        start.apply(swarming, args);
    }
    catch (err) {
        logErr("Error starting new swarm " + swarmingName + " ctor:" + ctorName, err);
    }
    endExecutionContext(swarming);
}






