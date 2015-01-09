var gaAnalytics = require("ga-analytics");

var core = require ("../../../SwarmCore/lib/SwarmCore.js");
thisAdapter = core.createAdapter("Analytics");
globalVerbosity = false;


doAnalytics = function(){
    console.log("Extracting analytics...");
    gaAnalytics(
        {
            metrics: "ga:users",
            clientId: "429870377341-cr1b1l03rb7d4hlp5q65vk53sm7em91n.apps.googleusercontent.com",
            serviceEmail: "429870377341-cr1b1l03rb7d4hlp5q65vk53sm7em91n@developer.gserviceaccount.com",
            key: require('path').resolve(__dirname, "google-services-private-key.pem"),
            ids: "ga:14779140"
        }, function(err, res) {
            if(err) throw err;
            console.log(res);
        });
}