var log = {
    start:function (logsChunk) {
        this.logsChunk = logsChunk;
        this.swarm("registerForLogs");
    },
    registerForLogs:{
        node:"DefaultLogger",
        code:function () {

            var logLevels = getLogLevels();
            startSwarm("LogsFetcher.js","sendLogLevels",logLevels);

            listenForLogs(S(function(newLog){
                startSwarm("LogsFetcher.js","sendNewLog",newLog);
            }))

            //the logs that come on THIS portion will be double-sended so as not to lose them
            var timestampOfNewLogs = Date.now();
            for(var level in logLevels) {
                startSwarm("LogsFetcher.js", "getOlderLogs", timestampOfNewLogs, this.logsChunk, level);
            }
        }
    }
}
log;
