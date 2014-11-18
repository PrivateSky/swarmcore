/**
 *
 * CodeUpdate.js swarm is used by Core to send new code for modified swarms to adapters
 * useful while developing, a bit dangerous in production!
 *
 */
var codeUpdateSwarming =
{
    meta:{
        name:"CodeUpdate.js"
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
            var ctxt = getGlobalContext.async("System:RegisteredNodes");
            (function(ctxt){
                ctxt[this.adapterName] = this.adapterName;
            }).swait(ctxt);

            var ctxt = getGlobalContext.async("System:GroupNodes:"+this.mainGroup);
            (function(ctxt){
                ctxt[this.adapterName] = this.adapterName;
            }).swait(ctxt);
        }
    },
    dispatchRefresh:{
    node:"Core",
        code : function (){
            var ctxt = getGlobalContext.async("System:RegisteredNodes");
            (function(ctxt){
                for(var key in ctxt){
                    if(ctxt.hasOwnProperty(key)){
                        this.swarm("reloadSwarm",key);
                    }
                }
            }).swait(ctxt);

        }
    },
    reloadSwarm:{ //running in all adapters
        node:"",
        code : function (){
            thisAdapter.reloadSwarm(this.reloadingSwarmName );
        }
    }
};  /* s*/

codeUpdateSwarming;