/*
 Simple logger implementation
 */
var core = require ("../../lib/SwarmCore.js");
thisAdapter = core.createAdapter("PhasesMonitor");

setTimeout(function () {
    setInterval(function () {
     thisAdapter.nativeMiddleware.tickForStaleSwarms();
    }, 500);
}, 500);
