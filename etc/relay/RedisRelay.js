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

program
    .version('1.0.1')
    .usage('[options] ')
    .option('-n,-name <name>', 'organisation name')
    .option('-r,-redis <redis>', 'redis host name')
    .option('-p,-port <port>', 'redis port')
    .option('-u,-url <url>', 'public url, eg www.example.com:3000')
    .option('-f,-folder <folder>', 'keys folder')
    .option('-s,-share <share>', 'share folder')
    .option('-w,-passWord <share>', 'redis password')
    .parse(process.argv);


if(!program.Name || !program.Redis || !program.Port || !program.Url){
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

var arr = program.Url.split(":");
var publicHost = arr[0];
var publicPort = arr[1];
if(!publicPort){
    publicPort = 80;
}

console.log("Starting a redis relay for swarm communication between nodes. Public url is: ", program.Url);
/* eyJ1cmwiOiJsb2NhbGhvc3Q6MzMwMDAiLCJjb2RlIjoiUmpZeksxazVWMmRGTjFGT1lXYzlQUW89Iiwia2V5IjoiVjNkTlVEYzVWemhZZEc0d2QzYzlQUW89In0= */
psc.createRelay(program.Name, program.Redis, program.Port, program.Password, publicHost, publicPort, keysFolder, shareFolder, function(err){
    if(err){
        console.log("Redis Relay error:", err);
    }
});


