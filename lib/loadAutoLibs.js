var fs = require("fs");

function includeRec(path) {

    var stat = fs.statSync(path)


    if (stat && stat.isDirectory()) {
        var list = fs.readdirSync(path);
        list.forEach(function(file) {
                file = path + '/' + file;
                includeRec(file);
         })
    } else {
        var ext = path.substr(path.lastIndexOf('.') + 1);
        if(ext.toLowerCase() == "js"){
            console.log("Loading ", path);
            try {
                require(path);
            }catch(e){
                if(e.message !== "Not included in adapter"){
                    throw e;
                }
            }
        }
    }
}

includeInAdapters = function(arrayOfAdapterNames){
    function adapterIncluded(){
        return arrayOfAdapterNames.some(function(adapterName){
            return adapterName===thisAdapter.mainGroup
        })
    }
    if(!adapterIncluded()){
        throw new Error("Not included in adapter");
    }
}

excludeFromAdapters = function(arrayOfAdapterNames){
    function adapterExcluded(adapter){
        if(thisAdapter.mainGroup===adapter){
            throw new Error("Not included in adapter");
        }
    }
    arrayOfAdapterNames.forEach(adapterExcluded)
}


var resetCallBacks = [];

registerResetCallback = function(callBack){
    resetCallBacks.push(callBack);
}


var container = require('safebox').container;

container.service("resetCallBacks", ['swarmingIsWorking'], function(outOfService, swarming){
    if(!outOfService){
        resetCallBacks.forEach(function(c){
            c();
        })
    }
});

includeRec(process.env.SWARM_PATH+"/autolib/");