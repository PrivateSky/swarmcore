/**
 *
 * Login swarm, version 2
 */

//TODO: check to be clean in production, it is an ideal place where you can put a backdoor for your authentication
var loginSwarming =
{
    meta:{
        debug: false
    },
    vars:{
        authenticated:false
    },
    autoLogin:function(clientSessionId,userId,tempToken){
        this.authenticated          = false;
        this.setSessionId(clientSessionId);
        this.userId                 = userId;
        this.tempToken              = tempToken;
        this.clientAdapter          = thisAdapter.nodeName;
        this.enableCause = "a ";
        console.log("My user name is "+ userId);
        this.swarm("validateLogin");
    },
    guestLogin:function(clientSessionId,userId,tempToken){
        this.authenticated          = false;
        this.setSessionId(clientSessionId);
        this.userId                 = userId;
        this.tempToken              = tempToken;
        this.clientAdapter = thisAdapter.nodeName;
        this.enableCause = "g ";
        this.swarm("validateLogin");
    },
    sgLogin:function(clientSessionId,userId,tempToken){
        this.authenticated          = false;
        this.setSessionId(clientSessionId);
        this.userId                 = userId;
        this.tempToken              = tempToken;
        this.clientAdapter          = thisAdapter.nodeName;
        this.enableCause = "c ";
        this.isSignUp = false;
        this.swarm("validateLogin");
    },
    FBLogin:function(clientSessionId,userId,tempToken){
        this.authenticated          = false;
        this.setSessionId(clientSessionId);
        this.userId                 = userId;
        this.tempToken              = tempToken;
        this.clientAdapter          = thisAdapter.nodeName;
        this.enableCause = "c ";
        this.swarm("validateAuthFB");
    },
    signUp:function(clientSessionId,userId,tempToken){
        this.authenticated          = false;
        this.setSessionId(clientSessionId);
        this.userId                 = userId;
        this.tempToken              = tempToken;
        this.clientAdapter          = thisAdapter.nodeName;
        this.enableCause = "c ";
        this.isSignUp = true;
        this.swarm("validateSignUp");
    },
    testCtor:function(clientSessionId,userId,authorisationToken){
        this.authenticated      = false;
        this.setSessionId(clientSessionId);
        this.userId             = userId;
        this.authorisationToken = authorisationToken;
        this.clientAdapter = thisAdapter.nodeName;
        cprint("testCtor... " + this.clientAdapter);

        if(authorisationToken == "ok"){
            this.isOk = true;
            cprint("enabling... " + this.clientAdapter);
            this.swarm("enableSwarms",this.clientAdapter);
        } else{
            this.swarm("failed", this.clientAdapter);
            cprint("disabling... " + this.clientAdapter);
        }
    },
    validateLogin:{
        node: "UsersRepo",
        code: function() {
            var self = this;
            console.log("token ",self.tempToken)
            genericValidateUser(self.userId, self.tempToken, false, "", function(err,userInfo,userNotExist,enableCause){
                self.userInfo = userInfo ;
                if(self.userInfo){
                    self.isOk = true;
                    self.enableCause += enableCause;
                    self.authToken = self.tempToken;
                    if(self.userInfo.userId == "SGuest"){
                        self.authToken = self.userInfo.token;
                    }
                    self.userId = self.userInfo.userId;
                    self.swarm("enableSwarms",self.clientAdapter);
                }else{
                       if(userNotExist){
                           console.log("userNotExist ");
                           self.swarm("userNotExist",self.clientAdapter);
                       }else{
                           console.log("failed ");
                           self.swarm("failed",self.clientAdapter);
                       }

                }

            });
        }
    },
    checkForAnotherLogin:{
        node: "SessionsRegistry",
        code: function(){
            if(userIsLoggedIn(this.userId)){
                //console.log("Already logged in");
                this.swarm("alreadyLoggedIn",this.clientAdapter);
            } else {
                this.isOk = true;
                this.enableCause += "checkForAnotherLogin";
                this.swarm("enableSwarms",this.clientAdapter);
            }
        }
    },

    validateSignUp:{
        node: "UsersRepo",
        code: function() {
            var self = this;
            var userInfo = this.userId;
            var userEmail = this.userId.email;
            var userTelephone = this.userId.telephone;
            onSignup(userEmail, userTelephone, this.tempToken, false, userInfo,function(err,userInfo,existingEmailOrPhone){
                if(userInfo){
                    self.userInfo = userInfo
                    self.isOk = true;
                    self.enableCause += "validateSignUp";
                    self.authToken = self.tempToken;
                    self.userId = self.userInfo.userId;
                    self.swarm("enableSwarms",self.clientAdapter);
                }else{
                    if(existingEmailOrPhone){
                        self.swarm("existingEmail",self.clientAdapter);
                    }else{
                        self.swarm("failed",self.clientAdapter);
                    }
                }
            });
        }
    },
    validateAuthFB:{
        node: "UsersRepo",
        code: function() {
            var self = this;
            validateFbResponse(this.tempToken, function(err,userFbInfo){
                self.userFbInfo = userFbInfo;
                if(self.userFbInfo){
                    console.log(self.tempToken,self.userFbInfo);
                    genericValidateUser(self.userFbInfo.id, self.tempToken, true, self.userFbInfo, function(err,userInfo){
                        self.userInfo = userInfo ;
                        if(self.userInfo){
                            self.isOk = true;
                            self.enableCause += "validateAuthFB";
                            self.authToken = userInfo.token;
                            self.userId = self.userInfo.userId;
                            self.swarm("enableSwarms",self.clientAdapter);
                            //console.log("userInfo altceva "+self.userInfo);
                            console.log(J(userInfo));
                        }else{
                            console.log("failed ");
                            self.swarm("failed",self.clientAdapter);
                        }
                    });
                }else{
                    console.log("autentificare esuata");

                }

            });
        }
    },
    enableSwarms:{   //phase
        node:"this.clientAdapter",
        code : function (){
            console.log("a intrat in faza enableSwarms");
            var outlet = thisAdapter.findOutlet(this.meta.outletId);
            dprint("Enabling outlet:" + this.meta.outletId + "for remote ip "  + outlet.getClientIp());
            if(outlet){
                outlet.successfulLogin(this);
                //logInfo("Successful login for user " + this.userId + " " + this.enableCause);
                console.log("Successful login for user " + this.userId);
                this.home("authenticated");
            } else {
                logErr("Could not enable swarms for "+ this.userId);
            }
        }
    },
    selfDestroy:function(){
        var self = this;
        setTimeout(function(){
            var outlet = thisAdapter.findOutlet(self.meta.outletId);
            if(outlet){
                outlet.destroy();
            } else {
                logErr("Unknown outlet for session "+ self.userId);
            }
        }, 2000);
    },

    failed:{   //phase
        node:"this.clientAdapter",
        code : function (){
            logInfo("Failed login for " + this.userId );
            this.home("failed");
        }
    },
    userNotExist:{   //phase
        node:"this.clientAdapter",
        code : function (){
            logInfo("this userId " + this.userId+"not exist" );
            this.home("userNotExist");
        }
    },
    needPassword:{   //phase
        node:"this.clientAdapter",
        code : function (){
            logInfo("needPassword for " + this.userId );
            this.home("needPassword");

        }
    },
    existingEmail:{   //phase
        node:"this.clientAdapter",
        code : function (){
            logInfo("this email is use already " + this.userId );
            this.home("existingEmail");

        }
    },
    alreadyLoggedIn:{   //phase
        node:"this.clientAdapter",
        code : function (){
            logInfo("alreadyLoggedIn for " + this.userId );
            this.home("alreadyLoggedIn");
        }
    }
};

loginSwarming;

