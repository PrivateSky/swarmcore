/*
 Simple logger implementation
 */
var core = require ("../../lib/SwarmCore.js");
thisAdapter = core.createAdapter("Logger");

doLog = function(level, nodeName, message){
 console.log(level, nodeName, message);
 localLog("NetworkLog",message);
}
