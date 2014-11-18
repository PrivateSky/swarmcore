/**
 * Created by salbo_000 on 04/11/2014.
 */
//All proper adapters using SwarmCore should provide a set of functions in the globalObject: swarmComImpl

var redis   = require("redis");
var dslUtil = require("../lib/SwarmDSL.js");
var fs = require("fs");

/* encapsulate as many details about communication, error recovery and distributed transactions
*  different communication middleware and different tradeoffs on error recovery and transactions could be implemented
* */
function RedisComImpl(){
    var self = this;
    var redisHost = thisAdapter.config.Core.redisHost;
    var redisPort = thisAdapter.config.Core.redisPort;

    var redisClient = redis.createClient(redisPort, redisHost);
    redisClient.retry_delay = 2000;
    redisClient.max_attempts = 20;
    redisClient.on("error", onRedisError);
    redisClient.on("reconnecting", onRedisReconnecting);
    redisClient.on("ready", onCmdRedisReady);

    function onRedisError(error){
        errLog("Redis error", error);
    }

    function onCmdRedisReady(error){
        console.log("Node " + thisAdapter.nodeName + " ready for swarms!");
        bindAllMembers(redisClient);
        if(self.uploadDescriptionsRequired){
            uploadDescriptionsImpl();
        } else {
            self.reloadAllSwarms();
        }
        self.redisReady = true;
    }

    var pubsubRedisClient = redis.createClient(redisPort, redisHost);
    //TODO: add these in configurations
    pubsubRedisClient.retry_delay = 1000;
    pubsubRedisClient.max_attempts = 100;
    pubsubRedisClient.on("error", onRedisError);

    function onRedisReconnecting(event) {
        //cprint("Redis reconnecting attempt [" + event.attempt + "] with delay [" + event.delay + "] !");
        pubsubRedisClient.retry_delay += 1000;
        //TODO: add in configuration
        if(event.attempt > 50){
            process.exit(-3);
        }
        localLog("redis", "Redis reconnecting attempt [" + event.attempt + "] with delay [" + event.delay + "] !", event);
    }

    pubsubRedisClient.on("reconnecting", onRedisReconnecting);

    /* generate swarm message identity*/
    this.createSwarmIdentity = function(swarm){
        /* create with uuid v4*/
        return swarm.meta.identity+"/" + swarm.meta.currentPhase + generateUUID();
    }

    /* generate unique names */
    this.generateNodeName = function(mainGroup){
        return mainGroup + "["+generateUUID()+"]";
    }

    /* pendingSwarm is an array containing swarms generated in current swarm and required to be sent asap */
    /* this function get called when the execution of a phase is done (including all the asynchronous calls)*/
    this.sendPendingSwarms = function(currentSwarm, pendingSwarms){
        try{
            pendingSwarms.map(function (swarm){
                if(dslUtil.requireResponse(swarm)){
                    updateSwarm(swarm);
                }
                sendSwarm(swarm.meta.targetNode, swarm);
            });
        } catch(err){
            currentSwarm.meta.failed = false;
        }

        if(dslUtil.requireResponse(currentSwarm)){
            if(!currentSwarm.meta.failed){
                startSwarm("SwarmConfirmation","phaseExecuted", currentSwarm.meta.identity);
            } else {
                startSwarm("SwarmConfirmation","phaseFailed", currentSwarm.meta.identity);
            }
        }
    }

    /*
        Save all global contexts
     */
    this.saveSharedContexts = function(arr){
        for(var i = 0,l = arr.length; i<l; i++){
            var ctxt = arr[i];
            var redisKey = makeRedisKey("sharedContexts", ctxt.contextId);
            ctxt.diff(function(propertyName, value){
                redisClient.hset.async(redisKey,propertyName,value);
             });
         }
    }

    /*
        get a global context
     */
    this.getContext = function(contextId, callback){
        var redisKey = makeRedisKey("sharedContexts",contextId);
        var values = redisClient.hgetall.async(redisKey);
        (function(values){
            var ctxt = require("./SharedContext.js").newContext(contextId,values);
            callback(null, ctxt);
        }).swait(values);
    }

    /* abort transaction or notify upstream about errors */
    this.phaseExecutionFailed = function(err, swarmingPhase){
        swarmingPhase.meta.failed = true;
        swarmingPhase.meta.failedErr = err;
    }

    /* additional locking verifications before executing a received swarm */
    this.asyncExecute = function(swarm, callback){
        callback.apply(swarm);
    }

    /* wait for swarms on the queue named uuidName*/
    this.subscribe = function(uuidName, callback){
        pubsubRedisClient.subscribe(uuidName);
        pubsubRedisClient.on("subscribe", function(){

        });

        pubsubRedisClient.on("message", function (channel, message){
            callback(message);
        });
    }

    /*
     * publish a swarm in the required queue
     * */
    function sendSwarm(queueName, swarm){
        function doSend(){
            if(dslUtil.requireResponse(swarm)){
                persistSwarmState(swarm);
            }
            redisClient.publish.async(queueName, J(swarm));
        }

        if(!isNodeName(queueName)){
            var targetNodeName  = chooseOneFromGroup.async(queueName);
            (function(targetNodeName ){
                doSend(targetNodeName);
            }).swait(nodeName);
        } else {
            doSend(queueName);
        }
    }

    var mainGroupPrefix = "UNDEFINED";
    /**
     *Make channels REDIS keys relative to current coreId
     * @param nodeName
     * @return {String}
     */
    this.mkAdapterId = function (groupName) {
        mainGroupPrefix = groupName+"://";
        return mainGroupPrefix + generateUUID();
    }

    /* get a dictionary of the the registered nodes in group and their current load*/
    this.getGroupNodes = function(groupName, callback){
        var redisKey = makeRedisKey("groupMembers","set",groupName);
        var values = redisClient.hgetall.async(redisKey);
        (function(values){
            console.log("FIX HERE (make a list with values and return):",values)
        }).swait(values);
    }

    function isNodeName(queueName){
        return queueName.indexOf("://") != -1;
    }

    function chooseOneFromGroup(groupName, callback){
        var redisKey = makeRedisKey("groupMembers","set",groupName);
        var values = redisClient.hgetall.async(redisKey);
        (function(values){
            console.log("FIX HERE (chose the min value, report issues):",values)
        }).swait(values);
    }

    this.joinGroup = function(groupName, nodeName){
        var redisKey = makeRedisKey("groupMembers","set",groupName);
        redisClient.hset.async(redisKey, nodeName, 0);
    }

    /* save the swarm state and if transactionId is not false or undefined, register in the new transaction*/
    function persistSwarmState( targetNode, swarm){

    }

    /* get the swarm state from execution */
     function getSwarmState(groupName, swarmIdentity){

    }

    /* remove swarm state */
    function removeSwarm(groupName, swarmIdentity){

    }

    /*
    callback(err,res)
    try to get the lock or call with err if is already locked  */
    this.waitSharedLock = function(key, callback){


    }

    /* remove the lock for current adapter*/
    this.removeLock = function(key){

    }


    this.uploadDescriptions = function(){
        if(self.redisReady){
            console.log("Redis ready...");
            uploadDescriptionsImpl();
        } else {
            self.uploadDescriptionsRequired = true;
        }
    }
    function uploadDescriptionsImpl() {
        var folders = thisAdapter.config.Core.paths;

        for (var i = 0; i < folders.length; i++) {

            if (folders[i].enabled == undefined || folders[i].enabled == true) {
                var descriptionsFolder = folders[i].folder;

                var files = fs.readdirSync(getSwarmFilePath(descriptionsFolder));
                files.forEach(function (fileName, index, array) {
                    var fullFileName = getSwarmFilePath(descriptionsFolder + "/" + fileName);

                    fs.watch(fullFileName, function (event, chFileName) {
                        if(event != "change") return;
                        if (uploadFile(fullFileName, fileName)) {
                            startSwarm("CodeUpdate.js", "swarmChanged", fileName);
                        }
                    });

                    uploadFile(fullFileName, fileName);
                });
            }
        }
        //startSwarm("NodeStart.js","boot");
    }

    /**
     *  Make REDIS keys relative to current coreId
     * @param type
     * @param mainBranch
     * @param subBranch
     * @return {String}
     */
    function makeRedisKey(type, mainBranch, subBranch){
        if(subBranch){
            return thisAdapter.coreId+"/"+type+"/"+ mainBranch + "/" + subBranch;
        }
        return thisAdapter.coreId+"/"+type+"/"+ mainBranch;
    }


    function uploadFile(fullFileName, fileName) {
        try {
            var content = fs.readFileSync(fullFileName).toString();
            dprint("Uploading swarm: " + fullFileName);
            redisClient.hset.async(makeRedisKey("system", "code"), fileName, content);
            dslUtil.repository.compileSwarm(fileName, content);
        }
        catch (err) {
            logErr("Failed uploading swarm file ", err);
        }
        return true;
    }


    this.reloadAllSwarms = function () {
        var swarmCode = redisClient.hgetall.async(makeRedisKey("system", "code"));
        (function (swarmCode) {
            for (var i in swarmCode) {
                dslUtil.repository.compileSwarm(i, swarmCode[i]);
            }
        }).wait(swarmCode);
    }


}

var swarmComImpl = null;
exports.implemenation = (function(){
        if(!swarmComImpl){
        swarmComImpl = new RedisComImpl();
        }
        return swarmComImpl;
    })();