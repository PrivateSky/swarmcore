/*
    - Launched when a node is started to make sure that only one adapter is executing commands
    - Launched also to make active a redundant node

 */
var doBlockTest = {
    vars:{
    },
    meta:{
      debug:false
    },
    testSuccess:function () {
        console.log("run testSuccess ctor");
        this.swarm("doSuccess");
    },
    testFail:function (text) {
        console.log("run testFail ctor");
        this.swarm("doFail");
    },
    testRevive:function (text) {
        console.log("run testRevive ctor");
        //if not a revived swarm, kill current adapter..
        //this.swarm("doTestRevive");
    },
    doSuccess:{
        node:"TestAdapter",
        do:function () {
            console.log("Running do in doSuccess");
            this.doExecuted = true;
        },
        done:function(){
            console.log("Running done in doSuccess");
            this.home("successCallDone");
        }
    },
    doFail:{
        node:"TestAdapter",
        do:function () {
            console.log("Running do in doFail");
            throw new Error("Test exception!");
        },
        failed:function(err){
            console.log("Running failed in doFail");
            this.err = err;
            this.home("successCallFail");
        }
    },
    doTestRevive:{
        node:"TestAdapter",
        do:function () {
            if(!this.meta.rebornCounter){
                process.exit(-1000);
                while(true){
                    true;
                }
            }
            this.home("successRevived");
        }
    }
}

doBlockTest;