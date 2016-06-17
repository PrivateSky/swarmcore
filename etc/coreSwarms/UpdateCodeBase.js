/**
 * Created by ciprian on 4/14/16.
 */

/*
    The return swarms can be of 3 kinds:
        - updateProgress which sends information about the the status of the update process
        - updateFail which adds information about certain non-critical errors that can occur
        - updateResult which returns the result the update at each organisation:
                -A critical error occured while updating organisation "+organisationDisplayName
                -Organisation "+organisationDisplayName+" was updated successfully

    The fields 'updateStatus' and 'error' contain more detailed information about what happened

 */


var updateCode = {
    update:function(codeSource){
        this.codeSource = codeSource
        this.swarm("downloadLatestVersion","!"+codeSource+"/Launcher");
    },

    downloadLatestVersion:{
        node:"#codeSource",
        code : function (){
            var self = this
            getLatestCodeVersion(S(function(err,pathToZip){
                if(err){
                    self['updateStatus'] = "Failed to download the latest code version"
                    self['error'] = err
                    self.home("updateFail")

                }else {
                    self.shareFile(pathToZip, "failShare", "sendUpdates", "!"+self.codeSource+"/UsersManager")
                    self['updateStatus'] = "Downloaded the latest code version"
                    self.home("updateProgress")
                }
            }))
        }
    },

    sendUpdates:{
        node:"#organisationsManager",
        code:function(){
            var self=this
            getOrganisations(S(function(err,organisationsList){
                organisationsList = organisationsList.filter(function(organisation){
                    return organisation.canUpdate;
                })
                console.log("Sending updates to ",organisationsList.map(function(org){ return org.displayName}))
                
                organisationsList.forEach(function(organisation,index){
                    setTimeout(S(function() {
                        console.log("Going to "+organisation.displayName)
                        self.organisationName = organisation.displayName
                        self.swarm("performUpdate", "!" + organisation.organisationId + "/Launcher")
                    },(index+1)*2000))
                })
                
                self.swarm("clearLatestCodeVersion","!"+self.codeSource+"/Launcher")

                self['updateStatus'] = JSON.stringify({
                    "Organisations to update":organisationsList
                },null,4)
                self.home("updateProgress")
            }))
        }
    },

    clearLatestCodeVersion:{
        node:"#codeSource",
        code:function(){
            var self = this
            clearLatestCodeVersion(S(function(err){
                if(err){
                    self['error'] = err
                    self['updateStatus'] = "Failed to clear the latest code version"
                    self.home("updateFail")
                }else{
                    self['updateStatus'] = "Cleared latest code version"
                    self.home("updateProgress")
                }
            }));
        }
    },

    performUpdate:{
        node:"#target",
        code:function () {
            var self = this;
            var codeLocation = process.env.SWARM_PATH+"/tmp/" + this.__transferId;
            console.log('Preparing code update',codeLocation,self.organisationName);

            var downloadsPerformed = 0
            this.download(this.__transferId,codeLocation,S(onDownload))

            function onDownload(err,pathToFile){
                downloadsPerformed++;
                if(err){
                    if(downloadsPerformed<10){
                        self.download(self.__transferId,codeLocation,S(onDownload));
                        return
                    }
                    else{
                        self['error'] = err
                        self['updateStatus'] = "A critical error occured while updating organisation "+organisationDisplayName;
                    }

                    self.home('updateResult')
                }
                else{
                    updateCodeBase(pathToFile,S(function(){
                        self['updateStatus'] = "Organisation "+organisationDisplayName+" was updated successfully"
                        self.home('updateResult')
                    }))
                }
            }

        }
    }
}


updateCode;