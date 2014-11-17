
function CompiledSwarmRepository(){
    var compiledSwarmingDescriptions = [];

    this.compileSwarm = function (swarmName, swarmDescription, verbose) {
        dprint("Loading swarm " + swarmName);
        try {
            var obj = eval(swarmDescription);
            if (obj != null) {
                compiledSwarmingDescriptions[swarmName] = obj;
            }
            else {
                logErr("Failed to load swarming description: " + swarmName);
            }
        }
        catch (err) {
            logErr("Syntax error in swarm description: " + swarmName + "\n" + swarmDescription, err);
        }
    }

    CompiledSwarmRepository.prototype.getSwarmDescription = function(name){
        return compiledSwarmingDescriptions[name];
    }

    CompiledSwarmRepository.prototype.swarmExist = function(name){
        return compiledSwarmingDescriptions[name] != undefined;
    }

}

exports.repository          = new CompiledSwarmRepository();

exports.swarmExist  = CompiledSwarmRepository.prototype.swarmExist;

exports.requireResponse = function(swarm){
        var desc = CompiledSwarmRepository.prototype.getSwarmDescription(swarm.meta.swarmingName);
        var phaseDesc = desc[swarm.meta.currentPhase];
        if(phaseDesc.do || phaseDesc.transaction){
            if(swarm.meta.currentStage != "finish"){
                return true;
            }
        }
        return false;
    }

exports.getSwarmDescription = CompiledSwarmRepository.prototype.getSwarmDescription;


