/**
 *
 * Swarm used by WebClientAdapter to send responses back
 *
 */
var VisitUser = {
    vars:{
        debug:true
    },
    response:function(userName, callingSwarm, phaseName, errorSwarm,errorSwarmPhaseName )  {
        this.errorSwarm = errorSwarm;
        this.errorSwarmPhaseName = errorSwarmPhaseName;
        this.callingSwarm  = callingSwarm;
        this.userName = userName;
        this.phaseName = phaseName;
        this.swarm("onResponse");

    },
    onResponse:{
        node:"SessionsRegistry",
        code : function (){
            sendSwarmToUser(this.userName, this.callingSwarm, this.phaseName, this.errorSwarm, this.errorSwarmPhaseName);
        }
    }
};

VisitUser;