var gaAnalytics = require("ga-analytics");

var core = require ("../../../SwarmCore/lib/SwarmCore.js");
thisAdapter = core.createAdapter("Analytics");
globalVerbosity = false;
doAnalytics = function() {
    return {type:"visits", content:"test data"};
}

/*
doAnalytics = function(){
    console.log("Extracting analytics...");
    gaAnalytics(
        {
            clientId: "764924759994-uggjbftel952svia9fag7l70a81e8ss6.apps.googleusercontent.com",
            serviceEmail: "764924759994-uggjbftel952svia9fag7l70a81e8ss6@developer.gserviceaccount.com",
            key: require('path').resolve(__dirname, "google-services-private-key.pem"),
            ids: "ga:14779140"

        }, function(err, res) {
            if(err) throw err;
            console.log(res);
        });
}*/

/* metrics: "ga:users",
 clientId: "429870377341-cr1b1l03rb7d4hlp5q65vk53sm7em91n.apps.googleusercontent.com",
 serviceEmail: "429870377341-cr1b1l03rb7d4hlp5q65vk53sm7em91n@developer.gserviceaccount.com",
 key: require('path').resolve(__dirname, "google-services-private-key.pem"),
 ids: "ga:14779140"*/