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



var psc = require("pubsubchor");

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
    .parse(process.argv);


if(!program.Name || !program.Redis || !program.Port || !program.url || !program.folder || !program.share){
    console.log(program);
    program.help();
    process.exit();
}

var arr = progam.Url.split(":");
var publicHost = arr[0];
var publicPort = arr[1];
if(!publicPort){
    publicPort = 80;
}

console.log(program.Name, program.Redis, program.Port, publicPort, publicHost, program.Folder, program.Share);
//psc.createRelay(program.Name, program.Redis, program.Port, publicPort, publicHost, program.Folder, program.Share);


