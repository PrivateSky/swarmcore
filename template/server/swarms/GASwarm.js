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
            this.result = doAnalytics();
            this.swarm("doMetrics");
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
            console.log("doSave");
            doSave(this.data);
            this.home("success");
        }
    }
}

logGAData;