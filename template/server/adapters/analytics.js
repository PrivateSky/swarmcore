
var core = require ("../../../SwarmCore/lib/SwarmCore.js");
globalVerbosity = false;

thisAdapter = core.createAdapter("Analytics");

var myCfg = getMyConfig("Analytics");


var gaAnalytics = require("ga-analytics");

doAnalytics = function(callback) {
    gaAnalytics({
        metrics: "ga:users",
        clientId: myCfg.clientId,
        serviceEmail: myCfg.serviceEmail,
        key: __dirname + "/" + myCfg.keyFile,
        ids: myCfg.ids
    }, function(err, res) {
        console.log("Result:" , res);
        callback(err, res);

    });
}



