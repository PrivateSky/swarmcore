
var clone = require('clone');
var assert = require("assert");

exports.adapter = require("./Adapter.js");
//exports.newSet = require("./Set.js").newSet;

exports.createAdapter = exports.adapter.init;
var fs = require("fs");
var uuid = require('node-uuid');
require('./errorCodes.js');

//exports.createClient = require("./SwarmClient.js").createClient;


var util = require("util");
cprint = console.log;

uncaughtExceptionString = "";
uncaughtExceptionExists = false;
globalVerbosity = false;

/**
 * Debug functions, influenced by globalVerbosity global variable
 * @param txt
 */
dprint = function (txt) {
    if (globalVerbosity == true) {
        if (thisAdapter != undefined) {
            console.log("DEBUG: [" + thisAdapter.nodeName + "]: " + txt);
        }
        else {
            console.log("DEBUG: " + txt);
        }
    }
}

/**
 * obsolete!?
 * @param txt
 */
aprint = function (txt) {
    console.log("DEBUG: [" + thisAdapter.nodeName + "]: " + txt);
}

/**
 *
 * Set of function helping swarm enabled functions to know in what context they are (current swarm, current session, tenant,etc)
 *
 * */

function SwarmExecutionContext(swarm){
    var identity = generateUUID();
    this.currentSwarm = swarm;
    this.processIdentity = swarm.meta.processIdentity;
    this.phaseIdentity = swarm.meta.phaseIdentity;
    this.sessionId = swarm.meta.sessionId;
    this.outletId = swarm.meta.outletId;
    this.swarmingName = swarm.meta.swarmingName;
    this.tenantId = swarm.meta.tenantId;
    this.userId = swarm.meta.userId;
    //console.log("new execution for userId", swarm.meta.userId, swarm.meta.swarmingName,swarm.meta.currentPhase);
    //ctxt.responseURI        = swarm.meta.responseURI;
    /**
     * adapter that invoked current swarm
     */
    this.entryAdapter = swarm.meta.entryAdapter;
    var counter = 0;

    //assert.notEqual(swarm.meta.phaseIdentity, undefined, "Phase identity should be defined!");

    this.use = function(){
        counter++;
        //console.log("Counter ", counter, " Phase:", swarm.meta.phaseIdentity, "Context: ", identity, swarm.meta.swarmingName);
    }

    var pendingSwarms = [];
    var attachedGC    = [];

    this.release = function(){
            counter--;
            //console.log("Counter ", counter, " Phase:", swarm.meta.phaseIdentity, "Context: ", identity, swarm.meta.swarmingName);
            if(counter == 0) {
                thisAdapter.nativeMiddleware.sendPendingSwarms(this.currentSwarm, pendingSwarms);
                thisAdapter.nativeMiddleware.saveSharedContexts(attachedGC);
                delete SwarmExecutionContext.prototype.executionContexList[this.phaseIdentity];
        }
    }

    this.pushPendingSwarm = function(swarm){
        pendingSwarms.push(swarm);
    }

    this.attachSharedContext = function(context){
        attachedGC.push(context);
    }
}

newPendingSwarm = function(swarm){
    if(executionContext){
        executionContext.pushPendingSwarm(swarm);
    } else {
        errLog("Executing invalid code from callbacks. Please use asynchron/swait to keep proper track for execution contexts");
    }
}

SwarmExecutionContext.prototype.executionContexList = {};
SwarmExecutionContext.prototype.findContext = function(swarm) {
    var ctxt = SwarmExecutionContext.prototype.executionContexList[swarm.meta.phaseIdentity];
    if(!ctxt){
        ctxt = new SwarmExecutionContext(swarm);
    }
    return ctxt;
};


var executionStack = [];
var executionContext = null;

beginExecutionContext = function (swarm, ctxt) {
    if(!ctxt){
        ctxt = SwarmExecutionContext.prototype.findContext(swarm);
        ctxt.use();
    }
    executionStack.push(ctxt);
    executionContext = ctxt;
}

endExecutionContext = function () {
    executionStack.pop();
    executionContext.release();

    var l = executionStack.length;
    if(l>0){
        executionContext = executionStack[l-1];
    } else{
        executionContext = null;
    }

}

/**
 * Create a callback that knows in what context will get executed (tenant,session,etc)
 * @param callBack
 * @return {Function}
 */
createSwarmCallback = function (callBack) {
    var ctxt = executionContext;
    if(!executionContext){
        errLog("Use createSwarmCallback only in phase code context.  Use of createSwarmCallback or .swait in upper callbacks");
        throw new Error("Invalid context! Call this function in a swarm phase only!");
    }
    executionContext.use();
    return function () {
        beginExecutionContext(null, ctxt);
        var args = []; // empty array
        for (var i = 0; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
        callBack.apply(this, args);
        endExecutionContext();
    }
}

/* it will use createSwarmCallback for swait */
require('asynchron');


getCurrentSession = function (silent) {
    if(executionContext == null || !executionContext.sessionId){
        if(!silent){
            logErr("Security warning: code executing outside of a swarm context",new Error().stack);
        }
        return "NO_SESSION";
    }
    return executionContext.sessionId;
}

getCurrentOutletId = function (silent) {
    if(executionContext == null || !executionContext.outletId){
        if(!silent){
            logErr("Security warning: code executing outside of a swarm context",new Error().stack);
        }
        return "NO_OUTLET";
    }
    return executionContext.outletId;
}

getCurrentTenant = function (silent) {
    if(executionContext == null || !executionContext.tenantId){
        if(!silent){
            logErr("Security warning: code executing outside of a swarm context",new Error().stack);
        }
        return "NO_TENANT";
    }
    return executionContext.tenantId;
}

getCurrentUser = function (silent) {
    if(executionContext == null || !executionContext.userId){
        if(!silent){
            console.log("Security warning: code executing outside of a swarm context",new Error().stack);
        }
        return "NO_USER";
    }
    return executionContext.userId;
}

getCurrentSwarm = function () {
    if(!executionContext){
        return "SystemExecution";
    }
    return executionContext.swarmingName;
}

/*
 getCurrentResponseURI = function(){
 return executionContext.responseURI;
 } */

getEntryAdapter = function () {
    if(!executionContext){
        return "SystemExecution";
    }
    return executionContext.entryAdapter;
}
/**
 *  Functions for creating tenant aware contexts in adapters
 * @constructor
 */

function VariablesContext() {

}

VariablesContext.prototype.getArray = function (name) {
    if (this[name] == undefined) {
        this[name] = [];
    }
    return this[name];
}

VariablesContext.prototype.getObject = function (name) {
    if (this[name] == undefined) {
        this[name] = {};
    }
    return this[name];
}


tenantsContexts = {};

getSharedContext = function (contextId, callback) {
    var ctxt = thisAdapter.nativeMiddleware.getSharedContext.async(contextId);
    if(!executionContext){
      errLog("Use getSharedContext only in phase code context.  Use of createSwarmCallback or .swait could be appropriate");
    }
    console.log("Waiting...");
    (function(ctxt){
        console.log("Attaching...");
        executionContext.attachSharedContext(ctxt);
        callback(null, ctxt);
    }).swait(ctxt);

}

getDisconectedSharedContext = function (contextId, callback) {
    var ctxt = thisAdapter.nativeMiddleware.getSharedContext.async(contextId);
    (function(ctxt){
        callback(null, ctxt);
    }).wait(ctxt);
}

getLocalContext = function (contextId) {
    if (contextId == undefined) {
        contextId = "thisAdapter";
    }

    if (executionContext.tenantId != null) {
        var tenantContext = tenantsContexts[executionContext.tenantId];
        if (tenantContext == undefined) {
            tenantContext = tenantsContexts[executionContext.tenantId] = new VariablesContext();
        }
        var retCtxt = tenantContext[contextId];
        if (retCtxt == undefined) {
            console.log("Creating new local context ", contextId, executionContext.tenantId);
            retCtxt = tenantContext[contextId] = new VariablesContext();
        }
        return retCtxt;
    }
    cprint("Error: getContext called without an execution tenant active");
    return null;
}

removeLocalContext = function (contextId) {
    console.log("Removing context ", contextId);
    if (executionContext.tenantId != null) {
        var tenantContext = tenantsContexts[executionContext.tenantId];
        delete tenantContext[contextId];
    }
}

/**
 * Error handling families of functions
 *
 */

var swarmToSwarmLevel = 0;
thisAdapter = {
    nodeName : "Starting Node",
    initilised: false
    };

/**
 * Sending error to "Logger" adapter (or whatever "log.js" swarm decides to do)
 * @param message
 * @param err
 */
logErr = function (message, err) {

    var errStr;
    var stack;

    if (err != null && err != undefined) {
        errStr = err.toString();
        stack = err.stack;
    } else {
        errStr = err;
        stack = "";
    }

    localLog(thisAdapter.mainGroup + ".err", message, err);

    if(thisAdapter.initilised){
        swarmToSwarmLevel++;
        if (swarmToSwarmLevel <= 2) {
            if (message != undefined && message.indexOf("Error while processing Redis commands") == -1) {
                startSwarm("log.js", "err", "ERROR", message, errStr, stack, getCurrentSwarm());
            }
            swarmToSwarmLevel--;
        }
    }
}

/* synonyms, too easy to forget */
errLog = logErr;

/**
 * Log a debug messages, usually ignored in production
 * @param message
 * @param details
 * @param aspect
 */
logDebug = function (message, details, aspect) {
    if (aspect == undefined) {
        aspect = "DEBUG";
    }
    dprint("(**) Logging debug info: " + message);

    swarmToSwarmLevel++;
    if (swarmToSwarmLevel <= 2) {
        startSwarm("log.js", "info", aspect, message, details, getCurrentSwarm());
        swarmToSwarmLevel--;
    }
}

/**
 * Log some relatively low importance information
 * @param message
 * @param details
 * @param aspect
 */
logInfo = function (message, details, aspect) {
    if (aspect == undefined) {
        aspect = "INFO";
    }
    cprint("(*) Logging info: " + message);
    swarmToSwarmLevel++;
    if (swarmToSwarmLevel <= 2) {
        startSwarm("log.js", "info", aspect, message, details, getCurrentSwarm());
        swarmToSwarmLevel--;
    }
}

inspect = function (object) {
    var out = "----------------------------------------------------------------------\n" +
        util.inspect(object) +
        "----------------------------------------------------------------------\n";
    util.puts(out);
}

/**
 * Set of debug functions
 * @param object
 */
exports.inspect = inspect;

/**
 * Shortcut to JSON.stringify
 * @param obj
 */
J = function (obj) {
    return JSON.stringify(obj);
}



/**
 * catching all errors is nice and mandatory in a server, all errors got logged
 */
//TODO: better handling, may be a restart? notifications on a central monitor
addGlobalErrorHandler = function () {
    process.on('uncaughtException', function (err) {
        logErr("uncaughtException", err);
        uncaughtExceptionString = "<br>Error : " + err.toString() + "<br>Stack :" + err.stack;
        uncaughtExceptionExists = true;
    });
}


/**
 *  global settings, used in SwarmClient and adapters that are doing authentication!
 * @type {Object}
 */
swarmSettings = {authentificationMethod: "default"};

/**
 *  return the config for current adapter
 */
getMyConfig = function (adapterName) {
    if (adapterName == undefined) {
        adapterName = thisAdapter.mainGroup;
    }
    var cfg = thisAdapter.config[adapterName];
    if (cfg == undefined) {
        cprint("Config section missing for " + adapterName);
        return {};
    }
    return cfg;
}

/**
 * Get a path that is absolute or possible a relative path to SWARM_PATH)
 * @param possibleRelativePath
 * @return {*}
 */

getSwarmFilePath = function (possibleRelativePath) {
    var basePath = process.env.SWARM_PATH;
    if (possibleRelativePath[0] == "/" || possibleRelativePath[0] == ":") {
        return possibleRelativePath;
    }
    return basePath + "/" + possibleRelativePath;
}

/**
 *   generate an UID
 * @return {*}
 */
generateUUID = function () {
    return uuid.v4()
}


/**
 * Utility function usually used in tests, exit current process after a while
 * @param msg
 * @param timeout
 */
delayExit = function (msg, retCode,timeout) {
    if(retCode == undefined){
        retCode = ExitCodes.UnknownError;
    }

    if(timeout == undefined){
        timeout = 100;
    }

    if(msg == undefined){
        msg = "Delaying exit with "+ timeout + "ms";
    }

    console.log(msg);
    setTimeout(function () {
        process.exit(retCode);
    }, timeout);
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
    if(thisAdapter.initilised){
        fs.appendFileSync(getSwarmFilePath(thisAdapter.config.logsPath + "/" + logType), msg);
    }
}

/**
 * Print swarm contexts (Messages) and easier to read compared with J
 * @param obj
 */
M = function (obj) {
    var meta = {};
    var ctrl = {};
    var req = {};

    meta.swarmingName   = obj.meta.swarmingName;
    meta.currentPhase   = obj.meta.currentPhase;
    meta.currentStage   = obj.meta.currentStage;
    meta.targetGroup    = obj.meta.targetGroup;
    meta.targetNodeName = obj.meta.targetNodeName;

    ctrl.entryAdapter       = obj.meta.entryAdapter;
    ctrl.honeyRequest       = obj.meta.honeyRequest;
    ctrl.debug              = obj.meta.debug;
    ctrl.phaseIdentity      = obj.meta.phaseIdentity;
    ctrl.processIdentity    = obj.meta.processIdentity;

    req.userId      = obj.meta.userId;
    req.tenantId    = obj.meta.tenantId;
    req.sessionId   = obj.meta.sessionId;
    req.outletId    = obj.meta.outletId;

    /*if (obj.meta.pleaseConfirm != undefined) {
        ctrl.pleaseConfirm = obj.meta.pleaseConfirm;
    }*/
    if (obj.meta.phaseExecutionId != undefined) {
        ctrl.phaseExecutionId = obj.meta.phaseExecutionId;
    }
    /*if (obj.meta.confirmationNode != undefined) {
        ctrl.confirmationNode = obj.meta.confirmationNode;
    }*/

    var vars = {};
    for (var i in obj) {
        if (i != "meta") {
            vars[i] = obj[i];
        }
    }

    return "\t{\n\t\tMETA: " + J(meta) +
        "\n\t\tCTRL: " + J(ctrl) +
        "\n\t\tREQS: "  + J(req) +
        "\n\t\tVARS: " + J(vars) +
        "\n\t\tDUMP: " + J(obj) + "\n\t}";
}

/**
 * Experimental functions
 */
printf = function () {
    var args = []; // empty array
    // copy all other arguments we want to "pass through"
    for (var i = 0; i < arguments.length; i++) {
        args.push(arguments[i]);
    }
    var out = util.format.apply(this, args);
    console.log(out);
}

sprintf = function () {
    var args = []; // empty array
    for (var i = 0; i < arguments.length; i++) {
        args.push(arguments[i]);
    }
    return util.format.apply(this, args);
}

process.on("message", function (data) {
    var message = {'ok': true};

    if (uncaughtExceptionExists) {
        message = {'ok': false, 'details': 'Uncaught Exception : ' + uncaughtExceptionString, 'requireRestart': true};
    }
    else {
        var handler = global['adapterStateCheck'];
        if (handler) {
            var handlerResult;
            try {
                handlerResult = handler(data);
            } catch (e) {
                handlerResult = {'ok': false, 'details': "Error calling custom adapterStateCheck handler - " + e.toString()};
            }
            message = handlerResult;
        }
    }

    process.send(message);
});


var basePath = process.env.SWARM_PATH;
if (process.env.SWARM_PATH == undefined) {
    delayExit("Please set SWARM_PATH variable to your installation folder", ExitCodes.WrongSwarmPath);
}

argsBinder = function(callback, arguments){
    return function(){
        var args = [];
        for(var i = 0; i < arguments.length; i++){
            args.push(arguments(i));
        }
        console.log(args);
        callback.apply(null,args);
    }
}

callLaterBinder = function(timeout,callback){
    return function(){
        setTimeout(argsBinder(callback, arguments), timeout);
    }
}