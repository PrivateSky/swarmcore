
var util = require("util");
var fs = require("fs");
cprint = console.log;

uncaughtExceptionString = "";
uncaughtExceptionExists = false;
if(typeof globalVerbosity == 'undefined'){
    globalVerbosity = false;
}

var DEBUG_START_TIME = new Date().getTime();

function getDebugDelta(){
    var currentTime = new Date().getTime();
    return currentTime - DEBUG_START_TIME;
}

/**
 * Debug functions, influenced by globalVerbosity global variable
 * @param txt
 */
dprint = function (txt) {
    if (globalVerbosity == true) {
        if (thisAdapter.initilised ) {
            console.log("DEBUG: [" + thisAdapter.nodeName + "](" + getDebugDelta()+ "):"+txt);
        }
        else {
            console.log("DEBUG: (" + getDebugDelta()+ "):"+txt);
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
    if (swarmToSwarmLevel <= 2 && thisAdapter.initilised) {
        startSwarm("log.js", "info", aspect, message, details, getCurrentSwarm());
        swarmToSwarmLevel--;
    }
}

/**
 * Set of debug functions
 * @param object
 */

/*
inspect = function (object) {
    var out = "Inspect:\n ----------------------------------------------------------------------\n" +
        util.inspect(object) +
        "----------------------------------------------------------------------\n";
    util.puts(out);
}

//apparently useless...
 exports.inspect = inspect;
*/


/**
 * Shortcut to JSON.stringify
 * @param obj
 */
J = function (obj) {
    return JSON.stringify(obj);
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