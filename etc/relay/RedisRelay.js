/**
 * Created by salboaie on 8/14/15.
 * A redis relay allows executable choreographies between organisations
 * A relay is capable to
 *  - send messages between relays (organisations)
 *  - share files between relays (organisations)
 *
 *  All the communication inside of an organisations is still made using Redis pub/sub channels.
 *  The Redis server should not be made available outside of the organisations boundaries (and actually should be firewalled except from adapters)
 */



var psc = require("pubsubshare");

var program = require('commander');
var ha   = require ('https-auto');

program
    .version('1.0.1')
    .usage('[options] ')
    .option('-r,-redis <redis>', 'redis host name')
    .option('-p,-port <port>', 'redis port')
    .option('-o,-publicPort <publicPort>', 'publicPort ex: 9000')
    .option('-f,-folder <folder>', 'keys folder')
    .option('-s,-share <share>', 'share folder')
    .option('-w,-passWord <share>', 'redis password')
    .parse(process.argv);


if(!program.Redis || !program.Port || !program.PublicPort){
    //console.log(program);
    program.help();
    process.exit();
}

var keysFolder = program.Folder;
var shareFolder = program.Share;
var redisPassword = program.PassWord;

var baseFolder = process.env.SWARM_PATH;
if(!baseFolder){
    baseFolder = "./";
}

if(!program.Folder){
    keysFolder = baseFolder+ "/keys";
}

if(!program.Share){
    shareFolder = baseFolder+ "/sharedFolder";
}

var organizationName = ha.getOrganizationName(keysFolder);

console.log("Starting a redis relay for swarm communication between nodes. Public port is: ", program.PublicPort);
var relay = psc.createRelay(organizationName, program.Redis, program.Port, program.Password, '0.0.0.0', program.PublicPort, keysFolder, shareFolder, function(err){
    if(err){
        console.log("Redis Relay error:", err);
    }
});

var core = require ("../../lib/SwarmCore.js");
thisAdapter = core.createAdapter("RedisChoreographyRelay");

relay.doDispatch =  function(redis, channel, message, callback){
    console.log("Dispatching for", channel);
    try{
        thisAdapter.nativeMiddleware.dispatch(channel, JSON.parse(message), callback);
    } catch(err){
        console.log("Invalid message from https server:", err.stack, message);
    }

    //redis.publish(channel, message, callback);
}

