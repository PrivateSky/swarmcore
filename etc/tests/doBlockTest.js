var adapterPort         = 3000;
var adapterHost         = "localhost";
var util                = require("../../nodeClient/nodeClient.js");
var assert              = require('assert');
var client             = util.createClient(adapterHost, adapterPort, "TestUser", "ok","genericTenant", "testCtor");

swarmHub.startSwarm("DoBlockTest.js", "testSuccess");
swarmHub.startSwarm("DoBlockTest.js", "testFail");
swarmHub.startSwarm("DoBlockTest.js", "testRevive");

swarmHub.on("DoBlockTest.js","successCallDone", countReturns);
swarmHub.on("DoBlockTest.js","successCallFail", countReturns);
//swarmHub.on("DoBlockTest.js","successRevived",  countReturns);

var counter = 0;
function countReturns(obj){
    counter++;
}

setTimeout (
    function(){
        assert.equal(counter, 3);
        process.exit(1);
    }, 2000);

