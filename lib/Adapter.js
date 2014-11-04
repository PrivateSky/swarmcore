/**
 * Created by: sinica
 * Date: 6/7/12
 * Time: 11:36 PM
 */

//TODO: refactoring, this form was created when my JS knowledge where more shallow

var redis = require("redis");
var fs = require('fs');
var util = require("swarmutil");
var nutil = require("util");
var uuid = require('node-uuid');

/**
 * Adapter core class
 * @param nodeName
 * @constructor
 */

function AdapterBase(nodeName) {
    this.nodeName = nodeName;
    var connectedOutlets = {};
    var sessionOutlets = {};

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
 * @type {AdapterBase}
 */
thisAdapter = null;
var BROADCAST_NODE_NAME = "BROADCAST";
/**
 *
 * @param nodeName
 * @param onReadyCallback: called when the adapter is ready for swarming
 * @param messageCallbackSink: null or replace the default message handling function
 * @param verbose: set global verbosity
 * @return {*}
 */

exports.init = function (nodeName, onReadyCallback, subCallBackSink, verbose) {
    globalVerbosity = verbose;


    if (nodeName == undefined || nodeName == null) {
        nodeName = uuid.v4();
    }

    cprint("Starting adapter " + nodeName);

    thisAdapter = new AdapterBase(nodeName);
    thisAdapter.onReadyCallback = onReadyCallback;


    //thisAdapter.instanceUID      =   uuid.v4();

    thisAdapter.subCallBackSink = subCallBackSink;
    thisAdapter.onSleepCanExecuteCallback = default_onSleepCanExecute;


    var basePath = process.env.SWARM_PATH;
    if (process.env.SWARM_PATH == undefined) {
        util.delayExit("Please set SWARM_PATH variable to your installation folder", 1000);
    }

    util.addGlobalErrorHandler();

    var basicConfigFile = basePath + "/etc/config";
    thisAdapter.config = util.readConfig(basicConfigFile);
    thisAdapter.redisHost = thisAdapter.config.Core.redisHost;
    thisAdapter.redisPort = thisAdapter.config.Core.redisPort;
    thisAdapter.coreId = thisAdapter.config.Core.coreId;

    //redis.debug_mode   = true;

    redisClient = redis.createClient(thisAdapter.redisPort, thisAdapter.redisHost);
    redisClient.retry_delay = 2000;
    redisClient.max_attempts = 20;
    redisClient.on("error", onRedisError);
    redisClient.on("reconnecting", onRedisReconnecting);
    redisClient.on("ready", onCmdRedisReady);

    pubsubRedisClient = redis.createClient(thisAdapter.redisPort, thisAdapter.redisHost);
    pubsubRedisClient.retry_delay = 2000;
    pubsubRedisClient.max_attempts = 20;
    pubsubRedisClient.on("error", onRedisError);
    pubsubRedisClient.on("reconnecting", onRedisReconnecting);

    thisAdapter.compiledSwarmingDescriptions = [];

    // keep info about groups
    thisAdapter.groupInfo = {};


    thisAdapter.msgCounter = 0;

    var channel = util.mkChannelUri(nodeName);
    dprint("Subscribing to channel " + channel);
    pubsubRedisClient.subscribe(channel);
    pubsubRedisClient.on("subscribe", onPubSubRedisReady);

    // handle messages from redis
    pubsubRedisClient.on("message", function (channel, message) {
        var initVars = JSON.parse(message);
        //console.log("           Redis request " + initVars.meta.swarmCounter, initVars.meta.swarmingName, initVars.meta.currentPhase );
        if (!util.isGroupChannelName(channel)) {

            if (thisAdapter.subCallBackSink) {
                thisAdapter.subCallBackSink(initVars);
            } else if (!thisAdapter.isSleeping || thisAdapter.onSleepCanExecuteCallback(initVars)) {
                if (initVars.meta.toUserRequest) {
                    var outlets = thisAdapter.findOutletForSession(initVars.meta.sessionId);
                    var i = 0;
                    for (var o in outlets) {
                        i++;
                        var outlet = outlets[o];
                        if (!outlet) {
                            logErr("Failed sending to user a swarm with outlet " + initVars.meta.outletId + "\n\tDump: " + message);
                            //console.log("-----------");
                        } else {
                            dprint("Sending notification home " + M(initVars));
                            outlet.onHoney(initVars);
                        }
                    }
                    if(i == 0){ //no outlet.. just close that session
                        console.log("Session without outlets found , closing:" + initVars.meta.sessionId, initVars.meta.swarmCounter, initVars.meta.swarmingName, initVars.meta.currentPhase);
                        startSwarm("SessionActivity.js","close",initVars.meta.sessionId) ;
                        //cprint("Having " + i + " outlets for session " + initVars.meta.sessionId);
                    }
                } else if (initVars.meta.honeyRequest) {
                    var outlet = thisAdapter.findOutlet(initVars.meta.outletId);
                    if (!outlet) {
                        logErr("Failed sending home a swarm with outlet " + initVars.meta.outletId + "\n\tDump: " + message);
                        //console.log("-----------");
                    } else {
                        outlet.onHoney(initVars);
                    }
                } else {
                    onMessageFromQueue(initVars);
                }
            }
        } else {
            onMessageFromGroup(channel, message);
        }
    });

    thisAdapter.swarmingCodeLoaded = false;


    return thisAdapter;
}


function default_onSleepCanExecute(initVars) {
    if (initVars.meta.swarmingName == "NodeStart.js") {
        return true;
    }
    return false;
}


function onRedisError(event) {
    cprint("Error while processing Redis commands!" + event.stack);
    localLog("redis", "Error while processing Redis commands!", event);
}

function onRedisReconnecting(event) {
    cprint("Redis reconnecting attempt [" + event.attempt + "] with delay [" + event.delay + "] !");
    localLog("redis", "Redis reconnecting attempt [" + event.attempt + "] with delay [" + event.delay + "] !", event);
}

localLog = function (logType, message, err) {
    var time = new Date();
    var now = time.getDate() + "-" + (time.getMonth() + 1) + "," + time.getHours() + ":" + time.getMinutes();
    var msg;

    msg = '[' + now + '][' + thisAdapter.nodeName + '] ' + message;

    if (err != null && err != undefined) {
        msg += '\n     Err: ' + err.toString();
        if (err.stack && err.stack != undefined)
            msg += '\n     Stack: ' + err.stack + '\n';
    }

    cprint(msg);
    fs.appendFileSync(getSwarmFilePath(thisAdapter.config.logsPath + "/" + logType), msg);
}



function compileSwarm(swarmName, swarmDescription, verbose) {
    dprint("Loading swarm " + swarmName);
    try {
        var obj = eval(swarmDescription);
        if (obj != null) {
            thisAdapter.compiledSwarmingDescriptions[swarmName] = obj;
        }
        else {
            logErr("Failed to load swarming description: " + swarmName);
        }
    }
    catch (err) {
        logErr("Syntax error in swarm description: " + swarmName + "\n" + swarmDescription, err);
    }
    thisAdapter.readyForSwarm = true;
}



function onMessageFromQueue(initVars) {
    var swarmingPhase = util.newSwarmPhase(initVars.meta.swarmingName, initVars.meta.currentPhase);


    for (var i in initVars) {
        swarmingPhase[i] = initVars[i];
    }

    if(!swarmingPhase.meta.phaseStack){
        swarmingPhase.meta.phaseStack = [];
    }
    swarmingPhase.meta.phaseStack.push(initVars.meta.currentPhase);

    if (swarmingPhase.meta.debug == true) {
        cprint("[" + thisAdapter.nodeName + "] executing message: \n" + M(initVars));
    }


    var reportSucces = swarmingPhase.meta.pleaseConfirm;
    swarmingPhase.meta.pleaseConfirm = false;
    //swarmingPhase.meta.fromNode = thisAdapter.nodeName;

    var cswarm = thisAdapter.compiledSwarmingDescriptions[swarmingPhase.meta.swarmingName];
    if (swarmingPhase.meta.swarmingName == undefined || cswarm == undefined) {
        logErr("Unknown swarm requested by another node: " + swarmingPhase.meta.swarmingName);
        return;
    }

    beginExecutionContext(initVars);
    try {
        var phaseFunction = thisAdapter.compiledSwarmingDescriptions[swarmingPhase.meta.swarmingName][swarmingPhase.meta.currentPhase].code;
        if (phaseFunction != null) {
            try {
                /*if(adapterSecurtyCheck != undefined && !adapterSecurtyCheck(swarmingPhase)){
                    logInfo("Security violation in swarming message!" + J(initVars));
                    throw "Security error";
                }  */
                phaseFunction.apply(swarmingPhase);
            }
            catch (err) {
                logErr("Syntax error when running swarm code! Phase: " + swarmingPhase.meta.currentPhase, err);
                reportSucces = false;
            }
        }
        else {
            if (thisAdapter.onMessageCallback != null) {
                thisAdapter.onMessageCallback(message);
            }
            else {
                logInfo("DROPPING unknown swarming message!" + J(initVars));
                reportSucces = false;
            }
        }
    }
    catch (err) {
        logErr("Error running swarm : " + swarmingPhase.meta.swarmingName + " Phase:" + swarmingPhase.meta.currentPhase, err);
        reportSucces = false;
    }
    endExecutionContext();

    if (reportSucces == true) {
        startSwarm("ConfirmExecution.js", "confirm", swarmingPhase);
    }
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
        if (thisAdapter.compiledSwarmingDescriptions[swarmingName] == undefined) {
            logErr("Unknown swarm  " + swarmingName);
            return;
        }
        dprint("Starting swarm " + swarmingName);
        swarming.meta.command = "phase";
        swarming.meta.tenantId  = getCurrentTenant();
        swarming.meta.userId    = getCurrentUser(true);
        swarming.meta.sessionId = getCurrentSession();
        swarming.meta.outletId = getCurrentOutletId();
        //swarming.meta.responseURI       = getCurrentResponseURI();
        swarming.meta.entryAdapter = getEntryAdapter();

        var start = thisAdapter.compiledSwarmingDescriptions[swarmingName][ctorName];

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






