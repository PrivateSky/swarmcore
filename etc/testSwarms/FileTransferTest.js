/*
    - Launched when a node is started to make sure that only one adapter is executing commands
    - Launched also to make active a redundant node

 */
var fileTransferTest = {
    startFileTransfer:function () {
        this.swarm("node1Phase");
    },
    generateTmp:function(){
        var filename = swarmTempFile();
        fs.writeFileSync(filename, "Test file. Dont generate such files in production");
    },
    node1Phase:{
        node:"Node1",
        code:function () {
            this.fileName = this.generateTmp();
            fileBus.transferFile(this.fileName, "FB_Node2",this, "node2Confirm");
        }
    },
    node2Confirm:{
        node:"Node2",
        do:function () {
            //waked up when transfer was done
            console.log("File: ", this.fileName, " from node1 is now copied in node2 in ", this.__payload);
        }
    }
}

fileTransferTest;