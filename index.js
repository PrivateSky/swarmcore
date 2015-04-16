
function getSwarmESBCorePath(){
    console.log(__dirname);
}


var core = require("lib/SwarmCore.js");
var clientModule = require("nodeClient/NodeClient.js");

exports.createClient = clientModule.createClient;
exports.createAdapter = core.createAdapter;


exports.runLauncher = function(){
    return exports.runNode("etc/adapters/Launcher.js")
}

exports.runNode = function(path){
    return require('child_process').fork(getSwarmESBCorePath() + path);
}


exports.getCorePath = function(){
    return getSwarmESBCorePath();
}

exports.getSwarmFilePath = function(){
    return getSwarmFilePath();
}