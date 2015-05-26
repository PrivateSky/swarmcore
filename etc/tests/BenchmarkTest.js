var adapterPort         = 3000;
var adapterHost         = "localhost";
var assert              = require('assert');
var util                = require("../../nodeClient/nodeClient.js");

swarmSettings.authentificationMethod = "testCtor";

var client             = util.createClient(adapterHost, adapterPort, "BenchmarkUser", "ok","BenchmarkTest");

client.startSwarm("BenchMark.js","start",9024);

client.on("BenchMark.js",getGreetings);

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
    50000);