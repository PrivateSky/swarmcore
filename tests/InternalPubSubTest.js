var assert = require("double-check").assert;
var busModule = require("../lib/InternalPubSub.js");

assert.callback("Test subscribe/publish main use case", function(f){
    var counter = 0;
    internalBus.subscribe("test",function(){});
    internalBus.subscribe("test",function(){});
    internalBus.subscribe("test", function(obj){
        assert.equal(obj.fieldForTest, true);
        counter++;
        if(counter == 3) {
            f();
        }
    });
    internalBus.subscribe("test",function(){});
    internalBus.subscribe("test",function(){});
    internalBus.publish("test", {fieldForTest:true});
    internalBus.publish("test", {fieldForTest:true});
    internalBus.publish("test", {fieldForTest:true});
})


assert.callback("Test subscribeOnce", function(f){
    var counter = 0;
    internalBus.subscribeOnce("test_subscribeOnce", function(obj){
        assert.equal(counter, 0);
        counter++;
        f();
    });
    internalBus.publish("test_subscribeOnce", {fieldForTest:true});
    internalBus.publish("test_subscribeOnce", {fieldForTest:true});
})


assert.callback("Test unsubscribe", function(f){
    var counter = 0;
    internalBus.subscribe("test_unsubscribe", function(){});
    internalBus.subscribe("test_unsubscribe", function(){});

    var ref = internalBus.subscribe("test_unsubscribe", function(obj){
        assert.equal(obj.fieldForTest, true);
        f();
        internalBus.unsubscribe("test_unsubscribe", ref);
        internalBus.publish("test_unsubscribe", {fieldForTest:false});

    });
    internalBus.subscribe("test_unsubscribe", function(){});
    internalBus.subscribe("test_unsubscribe", function(){});
    internalBus.publish("test_unsubscribe", {fieldForTest:true});

})
