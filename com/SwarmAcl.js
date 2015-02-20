/*
    Provides an implementation for ACLs in swarms regarding:
    - permissions for an user to execute a specific swarm (ctor or phase)
    - permission for a specific user to read or modify a resources
    - roles

     Each resource identification (a string) can have one or more resourceGroups
     Each user can have one or more groups
     Each group can have one or more other groups


    Api:
        attachResourceGroup(resourceId, resourceGroup)
        allow(group, resourceGroup)

 */

var aclModule = require("magical");


exports.getSwarmAcl = function(){
        var acl = aclModule.create(redis, redisClient());

        /*

         */
        this.checkStartSwarm = function(swarmName,ctor){
            var userId = getCurrentuser();
            return acl.allowed(userId,swarmName+"/"+ctor);
        }

        this.checkPhaseExecution = function(swarmName, phaseName){
            var userId = getCurrentuser();
            return acl.allowed(userId,swarmName+"/"+phaseName);
        }


        this.allowSwarm = function(role, swarmName, ctorList, phasesList){
            var childs = ctorList.concat(phasesList);
            acl.allow(role, swarmName, phasesList)
        }

        this.forbidSwarm = function(role, swarmName, ctorList, phasesList){

        }


        this.allow = function(role, resourceURI, accessType){

        }

        /*
         Available only from swarm contexts

         */
        this.isAllowed = function(resourceURI, accessType){

        }


        this.addRole = function(user, role){

        }

        this.delRole = function(user, role){

        }
}


