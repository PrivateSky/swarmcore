

var adapterPort         = 3000;
var adapterHost         = "localhost";
globalVerbosity = true;
var assert              = require('assert');

var util       = require("../../nodeClient/nodeClient.js");
var client     = util.createClient(adapterHost, adapterPort, "testLoginUser", "ok","testTenant", "testCtor");

client.startSwarm("LaunchingTest.js","clientCtor");

swarmHub.on("LaunchingTest.js","onClient", getGreetings);

var msg = "none";
function getGreetings(obj){
    msg = obj.message;
}

setTimeout (
    function(){
        assert.equal(msg,"Client swarming!");
        process.exit(1);
    },
    1000);

