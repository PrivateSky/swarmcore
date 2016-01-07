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
var core = require ("../../lib/SwarmCore.js");

program
    .version('1.0.1')
    .usage('[options] ')
    .option('-r,-redisHost <redis>', 'redis host name')
    .option('-p,-redisPort <port>', 'redis port')
    .option('-o,-relayPort <publicPort>', 'publicPort ex: 9000')
    .option('-f,-folder <folder>', 'keys folder')
    .option('-s,-share <share>', 'share folder')
    .option('-w,-passWord <passWord>', 'redis password')
    .option('-n,-orgName <orgName>', 'organization name')
    .parse(process.argv);


if(!program.RedisHost){
    program.RedisHost="127.0.0.1";
}

if(!program.RedisPort){
    program.RedisPort=6379;
}

if(!program.RelayPort){
    program.RelayPort=9000;
}

var code = process.env['HTTPS_AUTOCONFIG_CODE'];
if(!code && !program.OrgName){
    //console.log(program);
    program.help();
    process.exit();
}

var baseFolder = process.env.SWARM_PATH;
if(!baseFolder){
    baseFolder = "./";
}

var keysFolder = core.getSecretFolder();
var shareFolder = baseFolder+'/sharedFolder';
var organizationName = "OrganizationNotConfigured";
var httpsEnabled = true;
if (program.OrgName) {
    organizationName = program.OrgName;
    httpsEnabled = false;
}
else {
    organizationName = ha.getOrganizationName(keysFolder);
}

console.log("Starting a redis relay for swarm communication between nodes. Relay port is: ", program.RelayPort);
var relay = psc.createRelay(httpsEnabled, organizationName, program.RedisHost, program.RedisPort,program.PassWord , '0.0.0.0',program.RelayPort, keysFolder, shareFolder, function(err){
    if(err){
        console.log("Redis Relay error:", err);
    }


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
});
