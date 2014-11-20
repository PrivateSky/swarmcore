/*
 Simple logger implementation
 */
var core = require ("../../lib/SwarmCore.js");
thisAdapter = core.createAdapter("Logger");

doLog = function(level, nodeName, message){
 console.log(level, nodeName, message);
}

/*
 function triggerCleanings(){
  startSwarm("WatchNodes.js","alivePulse", 3000);
  //setTimeout(triggerCleanings, 4000);
 }

 setTimeout(triggerCleanings, 2000);

*/