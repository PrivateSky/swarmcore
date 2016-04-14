/*
 Simple logger implementation
 */
var core = require ("../../lib/SwarmCore.js");
thisAdapter = core.createAdapter("Logger");

var program = require('commander');
var redis = require('redis');
program
    .version('1.0.1')
    .usage('[options] ')
    .option('-r,-redisHost <redis>', 'redis host name')
    .option('-p,-redisPort <port>', 'redis port')
    .parse(process.argv);

if(!program.RedisHost){
 program.RedisHost="127.0.0.1";
}

if(!program.RedisPort){
 program.RedisPort=6379;
}

var logsDatabase = redis.createClient(program.RedisPort,program.RedisHost);


logsDatabase.



getLogs = function(){
 return gatheredLogs;
}