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

/**
 * Adapter core class
 * @param nodeName
 * @constructor
 */

var basePath = process.env.SWARM_PATH;
if (process.env.SWARM_PATH == undefined) {
    delayExit("Please set SWARM_PATH variable to your installation folder", 1000);
}


function AdapterCore(nodeName, mainGroup, config, swarmComImpl) {

    /* local utility, functions  */
    var readConfig = function (configFile) {
        try {
            var configContent = fs.readFileSync(configFile);
            cfg = JSON.parse(configContent);
            return cfg;
        }
        catch (err) {
            delayExit("Syntax error on parsing config file: " + configFile + " |: " + err.toString(), ExitERRORS.WrongConfig);
        }
    }

    /**
     *  Make REDIS keys relative to current coreId
     * @param type
     * @param value
     * @return {String}
     */
    this.mkUri = function (type, value) {
        var uri = thisAdapter.coreId + ":" + type + ":" + value;
        //cprint("URI: " + uri);
        return uri;
    }

    /**
     *Make channels REDIS keys relative to current coreId
     * @param nodeName
     * @return {String}
     */
    this.mkChannelUri = function (nodeName) {
        var uri = thisAdapter.coreId + ":" + nodeName;
        if (nodeName[0] == "@") {
            uri = "group://" + uri;
        }
        return uri;
    }

    this.isGroupChannelName = function (channelName) {
        if (channelName.indexOf("@") === 0) {
            return true;
        }
        return false;
    }


    /* initialisation */
    this.nodeName   = nodeName;
    this.mainGroup  = mainGroup;
    this.config     = config;

    this.coreId = this.config.Core.coreId;

    if(thisAdapter){
        delayExit("Creating two adapters in the same process is forbidden.Process existing...", ExitERROR.MultipleCores);
    }
    thisAdapter = this;

    if(!swarmComImpl){
        swarmComImpl = require("../com/redisComImpl")
    }

    if(!config){
        var basicConfigFile = basePath + "/etc/config";
        config = readConfig(basicConfigFile);
    }

    swarmComImpl.subscribe(this.mkChannelUri(nodeName),onMessageFromQueue );

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

        var cswarm = CompiledSwarmRepository.prototype.getSwarmDescription(swarmingPhase.meta.swarmingName);
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

    //REFACTORING: to be deleted and moved outside !?
    var connectedOutlets = {};
    var sessionOutlets   = {};

    this.findOutlet = function (outletId) {
        return connectedOutlets[outletId];
    }


    function addInSessionCollection(newSession, outlet) {
        if (!sessionOutlets[newSession]) {
            sessionOutlets[newSession] = {};
        }
        sessionOutlets[newSession][outlet.getOutletId()] = outlet;
    }

    this.renameSession = function (oldSession, newSession) {
        if (!sessionOutlets[newSession]) {
            sessionOutlets[newSession] = {};
        }
        for (var i in sessionOutlets[oldSession]) {
            sessionOutlets[newSession][i] = sessionOutlets[oldSession][i];
        }
        delete sessionOutlets[oldSession];
    }

    this.debugDump = function () {
        console.log("connectedOutlets - " + J(connectedOutlets));
        console.log("sessionOutlets - " + J(sessionOutlets));
    }


    this.findOutletForSession = function (sessionId) {
        return sessionOutlets[sessionId];
    }

    this.addOutlet = function (outlet) {
        dprint("Registering outlet " + outlet.getOutletId());
        connectedOutlets[outlet.getOutletId()] = outlet;
        addInSessionCollection(outlet.getSessionId(), outlet);
    }

    this.deleteOutlet = function (outlet) {
        delete connectedOutlets[outlet.getOutletId()];
        delete sessionOutlets[outlet.getSessionId()][outlet.getOutletId()];
    }
}

/**
 * global variable making current Adapter available anywhere
 * @type {AdapterCore}
 */
thisAdapter = null;
/**
 *
 * @param nodeName
 * @param onReadyCallback: called when the adapter is ready for swarming
 * @param messageCallbackSink: null or replace the default message handling function
 * @param verbose: set global verbosity
 * @return {*}
 */

exports.init = function (nodeName,mainGroup, config, verbose) {
    globalVerbosity = verbose;
    if (nodeName == undefined || nodeName == null) {
        nodeName = uuid.v4();
    }
    cprint("Starting adapter " + nodeName);
    addGlobalErrorHandler();
    thisAdapter = new AdapterCore(nodeName, mainGroup, config );
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
        var swarming = util.newSwarmPhase(swarmingName, ctorName);
        if (CompiledSwarmRepository.prototype.getSwarmDescription(swarmingName) == undefined) {
            logErr("Unknown swarm  " + swarmingName);
            return;
        }
        dprint("Starting swarm " + swarmingName);
        swarming.meta.processIdentity   = generateUUID();
        swarming.meta.command           = "phase";
        swarming.meta.tenantId          = getCurrentTenant();
        swarming.meta.userId            = getCurrentUser(true);
        swarming.meta.sessionId         = getCurrentSession();
        swarming.meta.outletId          = getCurrentOutletId();
        //swarming.meta.responseURI = getCurrentResponseURI();
        swarming.meta.entryAdapter      = getEntryAdapter();

        var start = CompiledSwarmRepository.prototype.getSwarmDescription(swarmingName)[ctorName];

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
}






