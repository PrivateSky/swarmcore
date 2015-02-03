var adapterPort         = 3000;
var adapterHost         = "localhost";
var assert              = require('assert');
var util                = require("../../nodeClient/nodeClient.js");

var client             = util.createClient(adapterHost, adapterPort, "BenchmarkUser", "ok","BenchmarkTest", "testCtor");

client.startSwarm("BroadcastBenchMark.js","start",2000, 50);

client.on("BroadcastBenchMark.js",getGreetings);

var msg = "none";
function getGreetings(obj){
    msg = "success";
    cprint(obj.result);
}

setTimeout (
    function(){
        assert.equal(msg,"success");
        process.exit(0);
    },
    5000);