/**
 * Created by ciprian on 4/14/16.
 */

var logsFetcher = {
    sendNewLog:function (newLog) {
        this.log = newLog;
        this.home("gotNewLog");
    },
    sendLogLevels:function(levels){
        this.levels = levels;
        this.home("getLogLevels");
    },

    getOlderLogs:function(timestamp,limit,type){
        this.until = new Date(timestamp);
        this.limit = limit;
        this.type = type;
        this.swarm("queryOlderLogs");
    },

    queryOlderLogs:{
        node:"DefaultLogger",
        code:function(){
            var self = this;
            getLogsUntil(this.until,this.limit,this.type,S(function(olderLogs){
                self.logs = olderLogs;
                self.home("gotOlderLogs");
            }))
        }
    }
}
logsFetcher;