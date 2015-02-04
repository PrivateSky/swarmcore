/*
    - Launched when a node is started to make sure that only one adapter is executing commands
    - Launched also to make active a redundant node

 */
var fileTransferTest = {
    startFileTransfer:function () {
        this.swarm("node1Phase");
    },
    node1Phase:{
        node:"Node1",
        code:function () {
            console.log("Visiting Node1 ");
            var filename = swarmTempFile.async();
            (function(filename){
                this.fileName =  filename;
                this.fileContent = "Test content";
                require("fs").writeFileSync(filename, this.fileContent);
                thisAdapter.fileBus.transferFile(this.fileName, "FB_Node2",this, "node2Confirm");
            }).swait(filename);

        }
    },
    node2Confirm:{
        node:"Node2",
        do:function () {
            //waked up when transfer was done
            console.log("File: ", this.fileName, " from node1 is now copied in node2 in ", this.__payload);
            if(require(fs).readFileSync(this.__payload) == this.fileContent){
                this.result = "Passed";
                console.log();
            } else {
                this.result = "Failed";
            }
            this.home("result");
        }
    }
}

fileTransferTest;