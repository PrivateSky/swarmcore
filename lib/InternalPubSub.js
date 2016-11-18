/**
 * Created by salboaie on 11/18/16.
 */


function InternalBus() {
    var subscribersOnce = {};
    var subscribers     = {};

    function FuncReference(callback){
        this.call = function(obj){
            callback(obj);
        };
    }

    function callbackArray() {
        var arr = [];
        this.push = function(callback){
            var ref = new FuncReference(callback);
            arr.push(ref);
            return ref;
        }

        this.publish = function(obj){
            arr.forEach(function(ref){
                ref.call(obj);
            })
        }

        this.delete = function(ref){
            var index = arr.indexOf(ref);
            arr.splice(index, 1);
        }

    }


    this.publish = function(topic, obj){
        var c = subscribersOnce[topic];
        if(undefined != c){
            c();
            delete subscribersOnce[topic];
        }
        var s = subscribers[topic];
        if(s){
            s.publish(obj);
        }
    }


    this.subscribeOnce = function(topic, callback){
        subscribersOnce[topic] = callback;
    }

    this.subscribe = function(topic, callback){
        var s = subscribers[topic];
        if(!s){
            subscribers[topic] = s = new  callbackArray();
        }
        return s.push(callback);
    }

    this.unsubscribe = function(topic, callback){
        var s = subscribers[topic];
        if(s){
            s.delete(callback);
        }
    }
}


internalBus = new InternalBus();

