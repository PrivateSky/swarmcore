/*
    - Launched when a node is started to make sure that only one adapter is executing commands
    - Launched also to make active a redundant node

 */
var fileTransferTest = {
    startFileTransfer:function () {
        this.swarm("node1");
    },
    generateTmp:function(){

    },
    node1:{
        node:"Node1",
        code:function () {
            var fileName = this.generateTmp();
            fileBus.transferFile(fileName, this, "node2");
        }
    },
    node2:{
        node:"Node2",
        code:function () {
            //waked up when transfer was done
        }
    }
}

fileTransferTest;