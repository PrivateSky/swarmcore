/**
 * Created by ciprian on 07.02.2017.
 */


require("acl-magic").enableACLChecker();

var container = require('safebox').container;



/*
 This file enables the global function checkAccess. The function has the following params:
 -contextType
 -contextValue
 -subcontextType
 -subcontextValue  ---- these 4 params indicate the resource to access (e.g. swarm/swarm1/ctor/ctor1)

 -action  ----- indicates the intended usage (e.g. read,write,execution)
 -zone    ----- the user that intends to access it ( or one of the user-zones he belongs to)
 -callback ----- is called with (err,hasRights) where hasRights is a boolean
 */

var checker = undefined;

checkAccess = function(){
    /*
     Did this so that checkAccess can be passed as parameter without problems.
     Not really necessary since it is global, but:
     1. it seems better just make it idiot-proof .
     2. might actually be necessary for some use cases
     (maybe have more ways of checking access and you want to choose between them)
     */
    checker.apply({},arguments);
};

container.declareDependency("checkAccess",["aclChecker"],function(outOfService,aclChecker){
    /*ACL CHECKER is a 'safe' dependency meaning that even if the database connection fails, one can still issue
     check calls which will be resolved once the connection reestablishes or will return error.
     */
    checker = aclChecker;
});