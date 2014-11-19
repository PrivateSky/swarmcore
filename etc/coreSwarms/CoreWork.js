/**
 *
 * CodeUpdate.js swarm is used by Core to send new code for modified swarms to adapters
 * useful while developing, a bit dangerous in production!
 *
 */
var codeUpdateSwarming =
{
    meta:{
        name:"CoreWork.js",
        debug:true
    },
    vars:{
    },
    swarmChanged:function(swarmName){
        this.reloadingSwarmName = swarmName;
        this.swarm("dispatchRefresh");
    },
    register:function(mainGroup, adapterName){
        this.adapterName = adapterName;
        this.mainGroup   = mainGroup;
        this.swarm("doRegister");
    },
    doRegister:{
        node:"Core",
        code : function (){
            console.log("CW:doRegister");
            var self = this;
            var ctxt = getSharedContext.async("System:RegisteredNodes");
            (function(ctxt){
                ctxt[self.adapterName] = self.mainGroup;
                ctxt.test = "test";
                ctxt.test1 = "test1";
                delete ctxt.test;
            }).swait(ctxt);
        }
    },
    dispatchRefresh:{
    node:"Core",
        code : function (){
            var self = this;
            var ctxt = getSharedContext.async("System:RegisteredNodes");
            (function(ctxt){
                console.log(ctxt);
                for(var key in ctxt){
                    if(key != "__meta"){
                        self.swarm("reloadSwarm", key);
                    }
                }
            }).swait(ctxt);
        }
    },
    reloadSwarm:{ //running in all adapters
        node:"",
        code : function (){
            thisAdapter.nativeMiddleware.reloadSwarm(this.reloadingSwarmName );
        }
    }
};  /* s */

codeUpdateSwarming;