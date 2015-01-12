var gaAnalytics = require("ga-analytics");

var core = require ("../../../SwarmCore/lib/SwarmCore.js");
thisAdapter = core.createAdapter("Analytics");
globalVerbosity = false;
doAnalytics = function() {
    return {type:"visits", content:"test data"};
}
