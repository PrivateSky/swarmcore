var util = require("swarmutil");

/**
 *  A SwarmingPhase is basically the message, in phase of execution
 * @param swarmingName:
 * @param phase: in what phase
 * @param fromMessage : fromMessage will be cloned here
 * @constructor
 */

//TODO: investigate why fromMessage is not used in onMessageFromQueue
//TODO: use of clone will be better!?

function SwarmingPhase(swarmingName, phase, fromMessage) {
    if (CompiledSwarmRepository.prototype.swarmExist(swarmingName)) {
        logErr("No such swarm: " + swarmingName);
        return;
    }
    var swarmObject = CompiledSwarmRepository.prototype.getSwarmDescription(swarmingName);
    var meta = swarmObject.meta;
    var initVars = swarmObject.vars;

    for (var key in swarmObject) {
        var obj = swarmObject[key];
        if (typeof obj === 'function') {
            this[key] = obj.bind(this);
        }
    }

    this.meta = new Object();
    if (meta != undefined) {
        for (var i in meta) {
            this.meta[i] = meta[i];
        }
    }

    if (initVars != undefined) {
        for (var i in initVars) {
            this[i] = initVars[i];
        }
    }

    if (fromMessage != undefined && fromMessage != null) {
        for (var i in fromMessage) {
            if (i != "meta") {
                this[i] = fromMessage[i];
            } else {
                if (fromMessage.meta != undefined) {
                    for (var j in fromMessage.meta) {
                        this.meta[j] = fromMessage.meta[j];
                    }
                }
            }
        }
    }

    this.meta.swarmingName = swarmingName;
    this.meta.currentPhase = phase;
}

SwarmingPhase.prototype.getSwarmName = function () {
    return this.meta.swarmingName;
}


SwarmingPhase.prototype.broadcast = function (groupName) {
    this.swarm(groupName, undefined, true);
}

reviveSwarm = function(swarm, phaseName){
    var myswarm = util.newSwarmPhase(swarm.meta.swarmingName, phaseName , swarm);
    myswarm.swarm(phaseName);
}

SwarmingPhase.prototype.swarm = function (phaseName, nodeHint, broadcast) {
    if (thisAdapter.readyForSwarm != true) {
        cprint("Asynchronicity issue: Redis connection is not ready for swarming " + phaseName);
        return;
    }
    try {
        if (CompiledSwarmRepository.prototype.getSwarmDescription(this.meta.swarmingName) == undefined) {
            logErr("Undefined swarm " + this.meta.swarmingName);
            return;
        }

        this.meta.currentPhase = phaseName;
        var targetNodeName = nodeHint;
        if (nodeHint == undefined) {
            var phase = CompiledSwarmRepository.prototype.getSwarmDescription(this.meta.swarmingName)[phaseName];
            if (phase == undefined) {
                logErr("[" + thisAdapter.nodeName + "] " + "Undefined phase " + phaseName + " in swarm " + this.meta.swarmingName);
                return;
            }
            targetNodeName = phase.node;
        }

        if (broadcast == undefined || broadcast == null) {
            broadcast = false;
        }

        if (this.meta.debug == true) {
            dprint("Starting swarm " + this.meta.swarmingName + " towards " + targetNodeName + ", Phase: " + phaseName);
        }

        if (targetNodeName != undefined) {

            publishSwarm(targetNodeName, this, broadcast);
        }
        else {
            logInfo("Unknown phase " + phaseName);
        }
    }
    catch (err) {
        logErr("Unknown error in phase {" + phaseName + "} nodeHint is {" + targetNodeName + "} Dump: " + J(CompiledSwarmRepository.prototype.getSwarmDescription(this.swarmingName)), err);
    }
};

SwarmingPhase.prototype.honey = function (phase) {
    this.meta.honeyRequest = true;
    this.swarm(phase, this.getEntryAdapter());
}


SwarmingPhase.prototype.toUser = function (userName, phaseName, errorSwarm,errorSwarmPhaseName ) {
    startSwarm("VisitUser.js", "response", userName, this, phaseName, errorSwarm,errorSwarmPhaseName);
}

SwarmingPhase.prototype.home = SwarmingPhase.prototype.honey;

SwarmingPhase.prototype.sendFail = function () {
    var phase = this.meta.onError;
    if (phase != undefined) {
        this.swarm(phase, this.meta.confirmationNode);
    }
}

function getWaitingContext(swarm, desiredPhaseName, nodeHint, timeOut, retryTimes, phaseExecutionId) {
    return function () {
        beginExecutionContext(swarm);
        this.meta.phaseExecutionId = phaseExecutionId;
        var ctxt = getContext(phaseExecutionId);
        if (ctxt.confirmedExecution == true) {
            dprint("Confirmed " + phaseExecutionId);
            var phase = this.meta.onSucces;
            if (phase != undefined) {
                this.swarm(phase, this.meta.confirmationNode);
            }
            removeContext(phaseExecutionId);
        }
        else {
            if (retryTimes == 0) {
                dprint("Sending fail notification " + phaseExecutionId);
                this.sendFail();
            } else {
                cprint("Retrying safe swarm  " + phaseExecutionId);
                this.safeSwarm(desiredPhaseName, nodeHint, timeOut, retryTimes - 1, false);
            }
        }
        endExecutionContext();
    }.bind(swarm);
}

SwarmingPhase.prototype.safeSwarm = function (phaseName, nodeHint, timeOut, retryTimes, persistent) {
    var cloneSwarm = util.newSwarmPhase(this.getSwarmName(), phaseName, this);
    if (timeOut == undefined) {
        timeOut = 300;
    }
    if (retryTimes == undefined) {
        retryTimes = 0;
    }
    cloneSwarm.meta.phaseExecutionId = generateUID();
    cloneSwarm.meta.confirmationNode = thisAdapter.nodeName;
    cloneSwarm.meta.pleaseConfirm = true;

    dprint("New phaseExecutionId " + cloneSwarm.meta.phaseExecutionId + M(cloneSwarm));

    setTimeout(getWaitingContext(cloneSwarm, phaseName, nodeHint, timeOut, retryTimes, cloneSwarm.meta.phaseExecutionId), timeOut);
    cloneSwarm.swarm(phaseName, nodeHint);
}

SwarmingPhase.prototype.deleteTimeoutSwarm = function (timerRef) {
    //cleanTimeout(timerRef);
}

SwarmingPhase.prototype.timeoutSwarm = function (timeOut, phaseName, nodeHint) {
    var timeoutId = -1;
    try {
        var targetNodeName = nodeHint;
        if (nodeHint == undefined) {
            targetNodeName = CompiledSwarmRepository.prototype.getSwarmDescription(this.swarmingName)[phaseName].node;
        }
        if (nodeHint == thisAdapter.nodeName) {
            var callBack = CompiledSwarmRepository.prototype.getSwarmDescription(this.swarmingName)[phaseName].code;
            if (typeof callBack == "function") {
                timeoutId = setTimeout(callBack.bind(this), timeOut);
            } else {
                logErr("Failed in setting timeout in swarm " + this.meta.swarmingName + " because " + phaseName + " is not a phase", err);
            }
        } else {
            timeoutId = setTimeout(function () {
                this.swarm(phaseName, nodeHint);
            }.bind(this), timeOut);
        }
    }
    catch (err) {
        logErr("Failed in setting timeout in swarm " + this.swarmingName, err);
    }
    return timeoutId;
}


exports.newSwarmPhase = function (swarmingName, phase, model) {
    return new SwarmingPhase(swarmingName, phase, model);
}

SwarmingPhase.prototype.currentSession = function () {
    return this.meta.sessionId;
}

SwarmingPhase.prototype.getEntryAdapter = function () {
    return this.meta.entryAdapter;
}

SwarmingPhase.prototype.getSessionId = SwarmingPhase.prototype.currentSession;

SwarmingPhase.prototype.setSessionId = function (session) {
    this.meta.sessionId = session;
}


SwarmingPhase.prototype.getTenantId = function () {
    return this.meta.tenantId;
}

SwarmingPhase.prototype.getUserId = function () {
    return this.meta.userId;
}


SwarmingPhase.prototype.hasRole = function (roleName) {
    return this.meta.userRoles.indexOf(roleName) != -1;
}

SwarmingPhase.prototype.setTenantId = function (tenant) {
    this.meta.tenantId = tenant;
    beginExecutionContext(this);
}

function consumeSwarm(channel, swarm, funct) {
    return function () {
        try {
            util.adapter.onMessageFromQueueCallBack(swarm);
            funct(null, null);
        }
        catch (err) {
            funct(err, null);
        }
    }
}

var     swarmCounter = 0;

function safeSwarmPublish(redisClient, channel, swarm) {
    swarmCounter++;
    swarm.meta.swarmCounter = thisAdapter.nodeName +":" + swarmCounter;

    redisClient.publish(channel, J(swarm), function (err, ret) {
        if (err != null) {
            logErr(err.message, err);
        }

        if (ret == 0) { //no one is listening...
            cprint("Retrying swarm propagation towards " + channel + ": " + J(swarm));
            if (swarm.meta.timout == undefined) {
                swarm.meta.timout = 1000;
            }
            else {
                swarm.meta.timout = 25.0 * swarm.meta.timout;
            }
            var maxTmout = swarm.meta.maxtimout;
            if (maxTmout == undefined) {
                maxTmout = 1000 * 60 * 60; //one hour
            }
            if (swarm.meta.timout < maxTmout) {
                setTimeout(function () {
                    safeSwarmPublish(redisClient, channel, swarm);
                }, swarm.meta.timout);
            } else {
                cprint("Warning!!!!!!  Dropping swarm " + J(swarm));
                //startSwarm("saveSwarm.js", "drop", swarm);
            }
        }
    });
}


function publishSwarm(channel, swarm, broadcast) {
    if (channel[0] == "#") {
        //local channel, just execute
        process.nextTick(consumeSwarm(channel, swarm, funct))
    } else if (!broadcast && channel[0] == "@") {
        //choose and send to one node from group
        cprint(channel + " " + broadcast + " " + M(swarm));
        thisAdapter.chooseGroupChannel_RoundRobin(channel, function (chosenChannel) {
            safeSwarmPublish(redisClient, util.mkChannelUri(chosenChannel), swarm);
        });
    }
    else {
        safeSwarmPublish(redisClient, util.mkChannelUri(channel), swarm);
    }
}


/* alternative implementation for local nodes
 var queue = new Array();

 function consumeSwarm(){
 var rec = queue.shift();
 swarm = rec.swarm;
 try{
 onMessageFromQueue(swarm);
 rec.funct(null,null);
 }
 catch(err){
 rec.funct(err,null);
 }
 }


 function publishSwarm(channel,swarm,funct){
 if(channel[0] == "#"){
 //local channel, just execute
 queue.push({"channel":channel,"swarm":swarm,"funct":funct});
 process.nextTick(consumeSwarm) ;
 }
 else{
 redisClient.publish(thisAdapter.coreId+channel, J(swarm),funct);
 }
 } */

