var jsondiffpatch = require('jsondiffpatch').create();

function SharedContext(contextId, values){
    this.contextId      = contextId;
    this.initialValues  = values;
    for(var v in values){
        this[v] = values[v];
    }
    /*
        Detect properties locally changed
     */
    this.diff = function(propertyHandler) {
        var diffLocal      = jsondiffpatch.diff(initialValues, this);
        for(var v in diffLocal){
            propertyHandler(v, this[v]);
        }
    }
}

exports.newContext = function(values){
    return new SharedContext(values);
}


