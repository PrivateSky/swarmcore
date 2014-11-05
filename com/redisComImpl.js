/**
 * Created by salbo_000 on 04/11/2014.
 */
//All proper adapters using SwarmCore should provide a set of functions in the globalObject: swarmComImpl

var redis = require("redis");

function RedisComImpl(){

    var redisHost = thisAdapter.config.Core.redisHost;
    var redisPort = thisAdapter.config.Core.redisPort;

    var redisClient = redis.createClient(redisPort, redisHost);
    redisClient.retry_delay = 2000;
    redisClient.max_attempts = 20;
    redisClient.on("error", onRedisError);
    redisClient.on("reconnecting", onRedisReconnecting);
    redisClient.on("ready", onCmdRedisReady);


    var pubsubRedisClient = redis.createClient(redisPort, redisHost);
    //TODO: add these in configurations
    pubsubRedisClient.retry_delay = 1000;
    pubsubRedisClient.max_attempts = 100;
    pubsubRedisClient.on("error", function(err){
        logErr("Redis error ", err);
    });

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

    /* create with uuid v4*/
    this.createSwarmIdentity = function(){
        return generateUID();
    }

    /* wait for swarms on the queue named uuidName*/
    this.subscribe = function(uuidName, callback){
        pubsubRedisClient.subscribe(channel);
        pubsubRedisClient.on("subscribe", function(){

        });

        pubsubRedisClient.on("message", function (channel, message){
            callback(message);
        });
    }

    /*
     * publish a swarm in that que
     * the callback(err,ret)  get called with error if nobody is listening on that queue*/
    this.publish = function(queueName, swarm, callback){

    }

    /* get a dictionary of the the registered nodes in group and their current load*/
    this.getGroupNodes = function(groupName){

    }


    /* save the swarm state and if transactionId is not false or undefined, register in the new transaction*/
    this.persistSwarmState = function( groupName, targetNode, swarmIdentity, swarm, transactionId){

    }

    /* get the swarm state from execution */
    this.getSwarmState = function(groupName, swarmIdentity){

    }

    /* remove swarm state */
    this.removeSwarm = function(groupName, swarmIdentity){

    }

    /*
    callback(err,res)
    try to get the lock or call with err if is already locked  */
    this.waitSharedLock = function(key, callback){


    }

    /* remove the lock for current adapter*/
    this.removeLock = function(key){

    }

    /* get a list with current swarms waiting execution */
    this.getPendingSwarms = function(groupName){

    }



    function uploadDescriptions() {

        var folders = thisAdapter.config.Core.paths;

        for (var i = 0; i < folders.length; i++) {

            if (folders[i].enabled == undefined || folders[i].enabled == true) {
                var descriptionsFolder = folders[i].folder;

                var files = fs.readdirSync(getSwarmFilePath(descriptionsFolder));
                files.forEach(function (fileName, index, array) {

                    var fullFileName = getSwarmFilePath(descriptionsFolder + "/" + fileName);
                    fs.watch(fullFileName, function (event, fileName) {
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

    function uploadFile(fullFileName, fileName) {
        try {
            var content = fs.readFileSync(fullFileName);
            redisClient.hset(util.mkUri("system", "code"), fileName, content);
            dprint("Uploading swarm: " + fileName);
            compileSwarm(fileName, content.toString());
            //cprint(fileName + " \n "+ content);
        }
        catch (err) {
            return false;
            //logErr("Failed uploading swarm file ", err);
        }
        return true;
    }


    function loadSwarms() {
        if (thisAdapter.swarmingCodeLoaded == false) {
            loadSwarmingCode(function () {
                startSwarm("CodeUpdate.js", "register", thisAdapter.nodeName);
                startSwarm("NodeStart.js", "boot");
                if (thisAdapter.onReadyCallback) {
                    thisAdapter.onReadyCallback();
                }
                thisAdapter.swarmingCodeLoaded = true;
            });
        }

        setTimeout(function () {
            if (thisAdapter.swarmingCodeLoaded == false) {
                loadSwarms();
            }
        }, 500);
    }

    function loadSwarmingCode(onEndFunction) {
        redisClient.hgetall(util.mkUri("system", "code"),
            function (err, hash) {
                if (err != null) {
                    logErr("Error loading swarms descriptions\n", err);
                }

                for (var i in hash) {
                    compileSwarm(i, hash[i]);
                }
                if (onEndFunction != undefined) {
                    onEndFunction();
                }
            });
    }


    AdapterBase.prototype.reloadSwarm = function (swarmName) {
        redisClient.hget(util.mkUri("system", "code"), swarmName, function (err, value) {
            compileSwarm(swarmName, value, true);
        });
    }

}

swarmComImpl = new RedisComImpl();