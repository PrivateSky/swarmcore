
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
