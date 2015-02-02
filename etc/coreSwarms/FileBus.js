/**
 *
 * Swarm used by WebClientAdapter to send responses back
 *
 */
var FileBus = {
    vars:{
        debug:true
    },
    register:function(storageName, protocol, server, port, connectionString)  {
        this.nodeName = thisAdapter.nodeName;
        this.storageName        = storageName;
        this.protocol           = protocol;
        this.server             = server;
        this.port               = port;
        this.connectionString   = connectionString;
        this.broadcast("notifyAll");

    },
    waitTransfer:function(transferId, swarm, phaseName, target){
        /*this.transferId = transferId;
        this.swarm      = swarm;
        this.phaseName  = phaseName;
        this.target     = target;*/
        thisAdapter.observeGlobal(transferId, swarm, phaseName, target);
    },
    notifyAll:{
        node:"All",
        code : function (){
            notifyNewSwarmFileTransferNode(this.storageName, this.protocol, this.server, this.port, this.connectionString, this.nodeName);
            this.adapterForStorage = thisAdapter.nodeName;
            this.swarm("notifyEachOne",this.nodeName);
        }
    },
    notifyEachOne:{
        node:"initial node name",
        code : function (){
            notifyNewSwarmFileTransferNode(this.storageName, this.protocol, this.server, this.port, this.connectionString, this.adapterForStorage);
        }
    }



};

FileBus;