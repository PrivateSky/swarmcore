/**
 * do anaalytics flow
 *
 */
var logGAData =
{
    meta:{
        name:"GASwarm.js",
        debug:false
    },
    vars:{

    },
    extractData:function(){
        console.log("extractData");
        this.swarm("doCrawl");
    },
    doCrawl:{ //phase that should be replaced. Use your own logging logic
        node:"Analytics",
        do : function (){
            console.log("doCrawl");
            var self = this;
            var result = doAnalytics.async();
            (function(result){
                self.result = result;
                self.swarm("doMetrics");
            }).swait(result);
        }
    },
    doMetrics: { //phase that should be replaced. Use your own logging logic
        node: "Metrics",
        do: function () {
            console.log("doMetrics");
            this.swarm("doSave");
        }
    },
    doSave: { //phase that should be replaced. Use your own logging logic
        node: "MySqlAdapter",
        do: function () {
            var self = this;
            console.log("doSave");
            var ret = doSave.async(this.result);
            (function(ret){
                self.recordInfo = ret;
                self.home("success");
            }).swait(ret);
        }
    }
}

logGAData;