
function executionMonitor(forkOptions, config){
    var adaptorForks = {};


    function createSingleFork(fork){
        try{
            fork.proc = childForker.fork(fork.path, null, forkOptions);
            fork.name = fork.path.substring(fork.path.lastIndexOf('/') + 1, fork.path.length - 3);
            fork.alive = false;
            fork.messages = [];
            if (index) {
                fork.name = '[' + index + '] ' + fork.name;
            }
            return true;
        }catch(err){
            fork.failOnStart = true;
            fork.startErr = err;
            console.log("Unable to fork ", fork.path, fork.startErr);
            return false;
        }
    }

    function restartFork(fork) {
        killFork(fork);
        if(fork.failOnStart){
         console.log("Unable to refork ", fork.path, fork.startErr);
        } else {
            fork.proc = createSingleFork(fork);
        }
    }

    this.createFork = function(itemConfig) {
        fork.config = itemConfig;
        var swarmPath = itemConfig.path;

        function monitorSingleFork(){
            var self = this;
            try {
                this.alive = false;
                this.proc.removeAllListeners();
                this.proc.on('message', function (data) {
                    self.alive = true;
                    //console.log(adaptorFork.name + " " + JSON.stringify(data));
                    if (!data.ok) {
                        self.messages.push(data);
                    }
                });
                this.proc.send({data: 'Are you ok?'});
            }
            catch (err) {
                this.alive = false;
            }

            setTimeout(function () {
                if(self.alive){
                    setTimeout(function(){
                        self.monitorFork();
                    }, config.pingTimeout)
                } else {
                 restartFork(self);
                }
            }, config.responseTimeout);
        }

        var maxIndex = itemConfig.instances;
        for(var index = 0; index < maxIndex; index++){
            var fork = {};
            fork.index = index;
            fork.path = swarmPath;
            if(createSingleFork(fork)){
                adaptorForks[fork.name] = fork;
                fork.monitorFork = monitorSingleFork.bind(fork);
            }
        }
    }

    function killFork(fork) {
        try {
            fork.proc.removeAllListeners();
            fork.proc.disconnect();
            fork.proc.kill();
        } catch (err) {
            console.log(err);
        }
    }


    this.monitorForks = function () {
        for (var key  in adaptorForks) {
            adaptorForks[key].monitorFork();
        }
    };


    this.killAllForks = function() {
        var fork, key;
        try {
            for (key  in adaptorForks) {
                fork = adaptorForks[key];
                killFork(fork);
            }
        } catch (e) {
            console.log(e);
        }
    }
}


exports.createExecutionMonitor = function(forkOptions, config){
    return new executionMonitor(forkOptions, config);
}



