var core = require ("../../../SwarmCore/lib/SwarmCore.js");
thisAdapter = core.createAdapter("Node1");

var fileBus  = thisAdapter.initFileBusNode("FB_Node1", "localhost", 3001);
