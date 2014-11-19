var jsondiffpatch = require('jsondiffpatch').create();

function SharedContext(contextId, values){
    this.__meta = {
        contextId      : contextId,
        initialValues  : values
    }

    for(var v in values){
        this[v] = values[v];
    }
}

/*
 Detect properties locally changed
 */
SharedContext.prototype.diff = function(propertyHandler) {
    var newThis = {};
    for(var v in this){
        if(v != "__meta" && v != "diff") {
            newThis[v] = this[v];
        }
    }
    var diffLocal      = jsondiffpatch.diff(this.__meta.initialValues, newThis);
    console.log("Diff found", diffLocal);
    for(var v in diffLocal){
        console.log(v, this[v]);
            propertyHandler(v, this[v]);
    }
}

exports.newContext = function(contextId, values){
    console.log("Initial values", values);
    return new SharedContext(contextId, values);
}


