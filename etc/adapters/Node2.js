var core = require ("../../../SwarmCore/lib/SwarmCore.js");
thisAdapter = core.createAdapter("Node2");

var fileBus  = thisAdapter.initFileBusNode("FB_Node2", "localhost", 3001);
