
var clone = require('clone');


exports.adapter = require("./Adapter.js");
//exports.newSet = require("./Set.js").newSet;

exports.createAdapter = exports.adapter.init;
var fs = require("fs");
var uuid = require('node-uuid');


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
    this.currentSwarm = swarm;
    this.identity = swarm.meta.identity;
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

    this.use = function(){
        counter++;
    }

    var pendingSwarms = [];

    this.release = function(){
        counter--;
        if(counter == 0){
            swarmComImpl.sendPendingSwarms(this.currentSwarm, pendingSwarms);
            delete SwarmExecutionContext.prototype.executionContexList[this.identity];
        }
    }

    this.pushPendingSwarm = function(swarm){
        pendingSwarms.push(swarm);
    }
}

newPendingSwarm = function(){
    executionContext.pushPendingSwarm(swarm);
}

SwarmExecutionContext.prototype.executionContexList = {};
SwarmExecutionContext.prototype.findContext = function(swarm) {
    var ctxt = SwarmExecutionContext.prototype.executionContexList[swarm.meta.identity];
    if(!ctxt){
        ctxt = new SwarmExecutionContext(swarm);
    }
    return ctxt;
};


var executionContext = new SwarmExecutionContext();

beginExecutionContext = function (swarm, use) {
    var ctxt = SwarmExecutionContext.prototype.findContext(swarm);
    executionContext = ctxt;
    if(use){
        executionContext.use();
    }
}

endExecutionContext = function (ctxt) {
    executionContext = null;
    ctxt.release();
}

/**
 * Create a callback that knows in what context will get executed (tenant,session,etc)
 * @param callBack
 * @return {Function}
 */
createSwarmCallback = function (callBack) {
    var thisContext = executionContext;
    thisContext.use();
    return function () {
        beginExecutionContext(thisContext);
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


getCurrentSession = function () {
    return executionContext.sessionId;
}

getCurrentOutletId = function () {
    return executionContext.outletId;
}

getCurrentTenant = function () {
    return executionContext.tenantId;
}

getCurrentUser = function (silent) {
    if(!silent && !executionContext.userId){
        console.log("Security warning: code executing outside of a swarm context",new Error().stack);
        return "DUMMYUSER";
    }
    return executionContext.userId;
}

getCurrentSwarm = function () {
    return executionContext.swarmingName;
}

/*
 getCurrentResponseURI = function(){
 return executionContext.responseURI;
 } */

getEntryAdapter = function () {
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
globalContexts = {};


getGlobalContext = function (contextId) {
    var retCtxt = globalContexts[contextId];
    if (retCtxt == undefined) {
        retCtxt = globalContexts[contextId] = new VariablesContext();
    }
    return retCtxt;
}

getContext = function (contextId) {
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
            retCtxt = tenantContext[contextId] = new VariablesContext();
        }
        return retCtxt;
    }
    cprint("Error: getContext called without an execution tenant active");
    return null;
}


removeContext = function (contextId) {
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

    localLog(thisAdapter.nodeName + ".err", message, err);

    swarmToSwarmLevel++;
    if (swarmToSwarmLevel <= 2) {
        if (message != undefined && message.indexOf("Error while processing Redis commands") == -1) {
            startSwarm("log.js", "err", "ERROR", message, errStr, stack, getCurrentSwarm());
        }
        swarmToSwarmLevel--;
    }
}
/* synonims */
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
    dprint("(*) Logging info: " + message);
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
        adapterName = thisAdapter.nodeName;
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
 * Utility function used in tests, exit current process after a while
 * @param msg
 * @param timeout
 */
delayExit = function (msg, timeout) {
    if (msg != undefined) {
        cprint(msg);
    }
    setTimeout(function () {
        process.exit(-2);
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
    fs.appendFileSync(getSwarmFilePath(thisAdapter.config.logsPath + "/" + logType), msg);
}

/**
 * Print swarm contexts (Messages) and easier to read compared with J
 * @param obj
 */
M = function (obj) {
    var meta = {};
    var ctrl = {};
    meta.swarmingName = obj.meta.swarmingName;
    meta.currentPhase = obj.meta.currentPhase;
    meta.tenantId = obj.meta.tenantId;
    meta.userId = obj.meta.userId;
    meta.sessionId = obj.meta.sessionId;
    meta.entryAdapter = obj.meta.entryAdapter;

    if (obj.meta.pleaseConfirm != undefined) {
        ctrl.pleaseConfirm = obj.meta.pleaseConfirm;
    }
    if (obj.meta.phaseExecutionId != undefined) {
        ctrl.phaseExecutionId = obj.meta.phaseExecutionId;
    }
    if (obj.meta.confirmationNode != undefined) {
        ctrl.confirmationNode = obj.meta.confirmationNode;
    }

    var vars = {};
    for (var i in obj) {
        if (i != "meta") {
            vars[i] = obj[i];
        }
    }

    return "\t{\n\t\tMETA: " + J(meta) +
        "\n\t\tCTRL: " + J(ctrl) +
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
