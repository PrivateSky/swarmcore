/**
 *
 * WatchNodes.js swarm is used to clean from Redis database all the invalid nodes:
 *  very busy nodes,
 *  crushed nodes and sort of zombie (hopefully no one)
 *  killed nodes
 *
 * Cleaned nodes will receive no other swarms
 */
var WatchNodes = {
    meta:{
        name:"WatchNodes.js",
        debug:false
    },
    vars:{
    },
    alivePulse:function(timeOut){
        this.timeOut = timeOut;
        this.swarm("doAlivePulse");
    },
    doAlivePulse:{
        node:"Logger",
        code : function (){
            var self = this;
            var ctxt = getSharedContext.async("System:RegisteredNodes");
            (function(ctxt){
                self.ctxt = ctxt;
                console.log("doCleanings ", ctxt);
                self.swarm("doCleanings");
            }).swait(ctxt);
        }
    },
    doCleanings:{
    node:"Logger",
        code : function (){
            var self = this;
            this.randomUUID = "CleaningZone/"+generateUUID();

            var ctxt = this.ctxt;
            delete this.ctxt;
            for(var v in ctxt){
                console.log("confirmAlive? ", v);
                this.swarm("confirmAlive", v);
            }

            this.ctxt = ctxt;
            setTimeout(function(){
                var aliveCtxt = getSharedContext.async(self.randomUUID);
                (function(aliveCtxt){
                    for(var v in self.ctxt){
                        if(ctxt[v]){
                            delete self.ctxt[v];
                        }
                    }
                    thisAdapter.nativeMiddleware.saveSharedContexts([self.ctxt]);
                    //thisAdapter.nativeMiddleware.deleteContext(aliveCtxt);
                }).wait(aliveCtxt);
            }, this.timeOut);
        }
    },
    confirmAlive: { //running in all adapters
        node:"",
        code : function (){
            var ctxt = getSharedContext.async(this.randomUUID);
            (function(ctxt){
                ctxt[thisAdapter.nodeName] = thisAdapter.mainGroup;
            }).swait(ctxt);
        }
    }
};

WatchNodes;