var adapterPort         = 3000;
var adapterHost         = "localhost";
var util                = require("../../../SwarmCore/nodeClient/NodeClient.js");
var assert              = require('assert');
var client             = util.createClient(adapterHost, adapterPort, "TestUser", "ok","genericTenant", "testCtor");
globalVerbosity = true;

swarmHub.startSwarm("GASwarm.js", "extractData");

swarmHub.on("GASwarm.js","success", function(){
    success = true;
});

var success = false;


setTimeout (
    function(){
        assert.equal(success, true);
        process.exit(0);
    }, 2000);
