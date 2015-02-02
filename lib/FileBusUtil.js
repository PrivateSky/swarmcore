
var registeredServers = {};

exports.initFileBusNode = function(storageName, protocol, server, port, connectionString){
    startSwarm("FileBus.js", "register",storageName, protocol, server, port, connectionString);
    return {
        acknowledgeNewSwarmFileTransferNode : function(storageName, protocol, server, port, connectionString, adapterName){
            registeredServers[storageName] = {
                "protocol":protocol,
                "server":server,
                "port":port,
                "connectionString":connectionString,
                "adapterName":adapterName
            }
        },
        waitRemoteTransfer:function(transferId, swarm, phase, target){
            startSwarm("FileBus.js", "waitTransfer",transferId, swarm, phase, target);
        }
    }
}

