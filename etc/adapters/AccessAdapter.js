var core = require ("swarmcore");
var container = require('safebox').container;
thisAdapter = core.createAdapter("AccessManager");

var fundamentalRules = [
    {
        "contextType": "swarm",
        "context": "login.js",
        "subcontextType": "ctor",
        "subcontext": "userLogin",
        "zone": "NO_USER",
        "action": "execution",
        "type":"white_list"
    },
    {
        "contextType": "swarm",
        "context": "acl.js",
        "zone": "NO_USER",
        "action": "execution",
        "type":"white_list"
    },
    {
        "contextType": "swarm",
        "context": "UserInfo.js",
        "subcontextType":"ctor",
        "subcontextValue":"resetPassword",
        "zone": "NO_USER",
        "action": "execution",
        "type":"white_list"
    }
];

require('acl-magic').enableACLConfigurator();


addRule = undefined;
removeRule = undefined;
getRules = undefined;
addZoneParent = undefined;
delZoneParent = undefined;





container.declareDependency("AccessAdapter",['aclConfigurator'],function(outOfService,aclConfigurator){
    if(!outOfService){
        addRule = aclConfigurator.addRule;
        removeRule = aclConfigurator.removeRule;
        getRules = function(callback){
            aclConfigurator.getRules(function(err,rules){
                if(err){
                    callback(err);
                }else{
                    callback(undefined,fundamentalRules.concat(rules));
                }
            })
        }
        addZoneParent = aclConfigurator.addZoneParent;
        delZoneParent = aclConfigurator.delZoneParent;
        getRuleById = aclConfigurator.getRuleById;

        var fs = require('fs');

        init(function (err, result) {
            if (err) {
                console.log("Could not initialize AccessAdapter");
                container.outOfService("AccessAdapter");
            } else {
                container.resolve("AccessAdapter");
            }
        });
    }else{
        console.log("AccessAdapter is not available");
    }
});


function init(callback){

    var fundamentalRulesCnt=0;
    var errors = [];
    fundamentalRules.forEach(function(rule){
        addRule(rule,false,function(err){
            if(err){
                errors.push(err);
            }else{
                fundamentalRulesCnt++;
            }
            if(errors.length+fundamentalRulesCnt === fundamentalRulesCnt.length){
                if(errors){
                    callback(errors);
                }else{
                    getRules(function(err,rules){
                        if(err){
                            console.log(err);
                            callback(err);
                        }else{
                            rules.forEach(function(rule){
                                addRule(rule,false,function(err){
                                    if(err){
                                        console.log("Could not add rule "+rule+"\nError '"+err.message+"' encountered")
                                    }
                                });
                            });
                            callback();
                        }
                    })
                }
            }
        })
    })
}







    //LITTLE TEST
/*
getCurrentUser = function(){
    return "admin";
}
setTimeout(function() {
    checkAccess("swarm","swarmName1","ctor","ctor1","execution",function(){
        console.log("Response 1:",arguments);
    });

    checkAccess("swarm","swarmName1","ctor",undefined,"execution",function(){
        console.log("Response 2:",arguments);
    });
},4000);
    */