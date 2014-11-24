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

    var pubsubRedisClient = redis.createClient(redisPort, redisHost);
    var redisClient  = null;
    pubsubRedisClient.retry_delay = 1000;
    pubsubRedisClient.max_attempts = 100;
    pubsubRedisClient.on("error", onRedisError);
    pubsubRedisClient.on("ready", function(){
        redisClient = redis.createClient(redisPort, redisHost);
        redisClient.retry_delay = 2000;
        redisClient.max_attempts = 20;
        redisClient.on("error", onRedisError);
        redisClient.on("reconnecting", onRedisReconnecting);
        redisClient.on("ready", onCmdRedisReady);
    });

    var pendingInitialisationCalls = [];

    function onRedisError(error){
        errLog("Redis error", error);
    }

    function onCmdRedisReady(error){
        console.log("Node " + thisAdapter.nodeName + " ready for swarms!");
        bindAllMembers(redisClient);
        if(self.uploadDescriptionsRequired){
            uploadDescriptionsImpl();
            registerInSharedDB();
        } else {
            self.reloadAllSwarms();
        }
        self.redisReady = true;
        self.joinGroup(thisAdapter.mainGroup, true);
        self.joinGroup("All");
        for(var i = 0, l = pendingInitialisationCalls.length; i<l; i++){
            var call =  pendingInitialisationCalls[i];
            call();
        }
        pendingInitialisationCalls = null;
    }

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
    this.createPhaseIdentity = function(swarm){
        /* create with uuid v4*/
        return swarm.meta.processIdentity+"/Phase:" + swarm.meta.currentPhase + "/" + generateUUID();
    }

    /* generate swarm message identity*/
    this.createProcessIdentity = function(){
        /* create with uuid v4*/
        return "Process:" + generateUUID();
    }

    /* generate unique names */
    this.generateNodeName = function(mainGroup){
        return "_"+mainGroup + "("+generateUUID()+")";
    }

    /* pendingSwarm is an array containing swarms generated in current swarm and required to be sent asap */
    /* this function get called when the execution of a phase is done (including all the asynchronous calls)*/
    this.sendPendingSwarms = function(currentSwarm, pendingSwarms){
        try{
            pendingSwarms.map(function (swarm){
                if(dslUtil.handleErrors(swarm)){
                    updateSwarm(swarm);
                }
                sendSwarm(swarm.meta.targetNodeName, swarm);
            });
        } catch(err){
            currentSwarm.meta.failed = false;
        }

        if(dslUtil.handleErrors(currentSwarm)){
            if(currentSwarm.meta.failed){
                if(currentSwarm.inTransaction()){
                    //currentSwarm.meta.stage = "abort";
                    abortTransaction(currentSwarm);
                } else {
                    currentSwarm.executeFailStage();
                    removeSwarmState(currentSwarm);
                }
            } else {
                if(currentSwarm.inTransaction()){
                    continueTransaction(currentSwarm);
                } else {
                    currentSwarm.executeFinishBlock();
                    removeSwarmState(currentSwarm);
                }

                updateSwarmExecutionStatus(currentSwarm);
            }
        }
    }

    /*
        current swarm finished successfully (without exceptions
     */
    function updateSwarmExecutionStatus(swarm){



    }
    /*
        Save all global contexts
     */
    this.saveSharedContexts = function(arr){
        for(var i = 0,l = arr.length; i<l; i++){
            var ctxt = arr[i];
            var redisKey = makeRedisKey("sharedContexts", ctxt.__meta.contextId);
            ctxt.diff(function(propertyName, value){
                if(value === undefined){
                    console.log("Deleting in ", redisKey, propertyName);
                    redisClient.hdel.async(redisKey, propertyName);
                } else {
                    console.log("Adding in ", redisKey, propertyName);
                    redisClient.hset.async(redisKey, propertyName, value);
                }
             });
         }
    }

    this.deleteContext = function(ctxt){
        var redisKey = makeRedisKey("sharedContexts", ctxt.__meta.contextId);
        redisClient.del.async(redisKey);
    }

    /*
        get a global context
     */
    this.getSharedContext = function(contextId, callback){
        var redisKey = makeRedisKey("sharedContexts",contextId);
        var values = redisClient.hgetall.async(redisKey);
        (function(values){
            var ctxt = require("./SharedContext.js").newContext(contextId,values);
            callback(null, ctxt);
        }).wait(values);
    }

    /* abort transaction or notify upstream about errors */
    this.phaseExecutionFailed = function(err, swarmingPhase){
        swarmingPhase.meta.failed = true;
        swarmingPhase.meta.failedErr = err;
    }

    /* pottentia to add additional locking/verifications before executing a received swarm */
    this.asyncExecute = function(swarm, callback){
        callback.apply(swarm);
    }

    var homeHandler;
    this.registerHomeSwarmHandler = function(callback){
        homeHandler = callback;
    }

    /* wait for swarms on the queue named uuidName*/
    this.subscribe = function(uuidName, callback){
        pubsubRedisClient.subscribe(uuidName);
        pubsubRedisClient.on("subscribe", function(){

        });

        pubsubRedisClient.on("message", function (channel, message){
            try{
                var msg = JSON.parse(message);
                if(homeHandler && msg.meta.honeyRequest){
                    homeHandler(msg);
                } else {
                    callback(msg);
                }
            } catch(err){
                errLog("Malformed JSON response received");
            }
        });
    }

    /*
     * publish a swarm in the required queue
     * */
    function sendSwarm(queueName, swarm){

        function doSend(specificNodeName){
            if(dslUtil.handleErrors(swarm)){
                persistSwarmState(swarm);
            }
            redisClient.publish(specificNodeName, J(swarm), function(error,result){
                if(result == 0){
                    // the node is down, force cleaning and retry the send
                    var success = waitToForceblyCleanNode.async(specificNodeName);
                    (function(success){
                            if(!success){
                                errLog("Dropping swarm targeted towards dead node or group: " + queueName + M(swarm));
                                return ;
                            }
                            if(!isNodeName(queueName)){
                                var alternative = chooseOneFromGroup.async(queueName);
                                (function(alternative){
                                    if(alternative  == "null"){
                                        errLog("Dropping swarm targeted towards dead node: " + specificNodeName);
                                    } else {
                                        doSend(alternative);
                                    }
                                }).wait(alternative);

                            } else {
                                errLog("Dropping swarm targeted towards dead node: " + specificNodeName);
                            }
                    }).wait(success);
                }
            });
        }

        if(!isNodeName(queueName)){
            var targetNodeName  = chooseOneFromGroup.async(queueName);
            (function(targetNodeName ){
                doSend(targetNodeName);
            }).wait(targetNodeName);
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
        mainGroupPrefix = groupName+"#";
        return mainGroupPrefix + generateUUID();
    }

    /* get a dictionary of the the registered nodes in group and their current load*/
    this.getGroupNodes = function(groupName, callback){
        var redisKey = makeRedisKey("groupMembers",groupName);
        var values = redisClient.hgetall.async(redisKey);
        (function(values){
            callback(null, values);
        }).wait(values);
    }

    function isNodeName(queueName){
        return queueName[0] == '_';
    }

    function chooseOneFromGroup(groupName, callback){
        if(groupName == thisAdapter.mainGroup){
            //allays send to the same node if a message is requested for the same group from the same group
            callback(null,thisAdapter.nodeName);
            return ;
        }

        var redisKey = makeRedisKey("groupMembers",groupName);
        var values = redisClient.hgetall.async(redisKey);
        (function(values){
            var sortable = [];
            for (var v in values){
                sortable.push([v, values[v]]);
7            }

            if(sortable.length >0){
                sortable.sort(function(a, b) {return a[1] - b[1]});
                callback(null,sortable[0][0]);
            } else {
                callback(null,"null");
                if(groupName != "Logger"){
                    errLog("Missing any node in group [" + groupName + "]")
                } else{
                    localLog("missing","Error: Missing logger nodes!!!");
                }
            }
        }).wait(values);
    }

    function doJoin(groupName, isMain){
        var redisKey = makeRedisKey("groupMembers",groupName);
        redisClient.hset.async(redisKey, thisAdapter.nodeName, 0);

        redisKey = makeRedisKey("groupsForNode", thisAdapter.nodeName);
        var groupNameValue = groupName;
        if(isMain){
            groupNameValue = "mainGroup";
        }
        redisClient.hset.async(redisKey, groupName, groupNameValue);
    }

    this.joinGroup = function(groupName, isMain){
        if(self.redisReady){
            doJoin(groupName, isMain);
        } else {
         pendingInitialisationCalls.push(function(){
             doJoin(groupName, isMain);
         });
        }
    }

    function getNodeGroups(nodeName, callback){
        var redisKey = makeRedisKey("groupsForNode", nodeName);
        redisClient.hgetall(redisKey,callback);
    }

    function registerInSharedDB(){
        startSwarm("CoreWork.js", "register", thisAdapter.mainGroup, thisAdapter.nodeName);
    }

    function waitToForceblyCleanNode(nodeName, callback){
        if(nodeName == "null"){
            callback(null, false);
            return ;
        }

        var nodes = getNodeGroups.async(nodeName);
        (function(nodes){
            console.log("Clearing redis information about dead node ", nodeName);
            for(var groupName in nodes){
                var redisKey = makeRedisKey("groupMembers",groupName);
                var res = redisClient.hdel.async(redisKey, nodeName);
                if(nodes[groupName] == "mainGroup"){
                    (function(res){
                        //return result
                        callback(null, true);
                    }).wait(res);
                }
            }
            //clean group information for the dead node
            var redisKey = makeRedisKey("groupsForNode", nodeName);
            redisClient.del.async(redisKey);
            //clean RegisteredNodes key
            redisKey = makeRedisKey("sharedContexts","System:RegisteredNodes");
            redisClient.del.async(redisKey, nodeName);
        }).wait(nodes);
    }

    function findMainGroup(nodeName, callback){
        var nodes = getNodeGroups.async(nodeName);
        (function(nodes){
            for(var v in nodes){
                if(nodes[v] == "mainGroup"){
                    callback(null,v);
                }
            }
            callback(new Error("No main group for " + nodeName), null);
        }).wait(nodes);
    }

    /* save the swarm state and if transactionId is not false or undefined, register in the new transaction*/
    function persistSwarmState( swarm){

    }

    /* get the swarm state from execution */
     function getSwarmState(swarm){

    }

    /* remove swarm state */
    function removeSwarmState(swarm){

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
                            startSwarm("CoreWork.js", "swarmChanged", fileName);
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
            return thisAdapter.coreId+":"+type+":"+ mainBranch + ":" + subBranch;
        }
        return thisAdapter.coreId+":"+type+":"+ mainBranch;
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

            registerInSharedDB();
        }).wait(swarmCode);
    }

    this.reloadSwarm = function(swarmName){
        var swarmCode = redisClient.hget.async(makeRedisKey("system", "code"), swarmName);
        (function (swarmCode) {
            dslUtil.repository.compileSwarm(swarmName, swarmCode);
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