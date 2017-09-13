var logger = require("./../../lib/Logger.js");
var child_process = require('child_process');
var fs = require("fs");
var os = require("os");

//actions registry
var actions = {};

//--------------- Default actions --------------------

actions.install = function(dependency, project, callback){
/*    callback({});
    return;*/
    if(!dependency || !dependency.src){
        var err = {message: "No source (src) attribute found on: "+JSON.stringify(dependency)};
        logger.error(err.message);
        callback(err);
    }else{
        try{
            var target = dependency.src;
            var src = dependency.src.toLowerCase();
            if(src.indexOf("npm")===0){
                target = dependency.name;
            }
            console.log("npm install "+target);
            child_process.execSync("npm install "+target, {stdio:[0,1,2]});
        }catch(err){
            callback(err);
        }

        callback();
    }
};

var _download = function(url, dest, callback) {
    var file = fs.createWriteStream(dest);
    var request = http.get(url, function(response) {
        response.pipe(file);
        file.on('finish', function() {
            file.close(callback);  //async
        });
    }).on('error', function(err) {
        fs.unlink(dest); // async
        if(callback){
            callback(err.message);
        }
    });
};

actions.download = function(dependency, project, callback){
    var src = dependency.src;
    if(!src){
        var err = {message: "No source (src) attribute found on: " + JSON.stringify(dependency)};
        logger.error(err.message);
        callback(err);
    }else{
        var target = os.tmpdir();

        if(dependency.target){
            target = dependency.target;
        }

        logger.info("Start downloading " + dependency.src + " to folder " + target);
        _download(src, target, callback);
    }
}

var _move = function(from, to, callback) {
    var isWin = (os.platform() === 'win32');
    var cmd = isWin ? "move " : "mv ";
    child_process.execSync(cmd + from + " "+ to, {stdio:[0,1,2]});
    callback();
}

actions.move = function(dependency, project, callback){
    var src = dependency.src;
    if(!src){
        var err = {message: "No source (src) attribute found on: " + JSON.stringify(dependency)};
        logger.error(err.message);
        callback(err);
    }else{
        var target = os.tmpdir();

        if(dependency.target){
            target = dependency.target;
        }

        logger.info("Start moving " + dependency.src + " to folder " + target);
        _move(src, target, callback);
    }
}

//-------------- End Default action ------------------

//-------------- Actions registery ------------------
function getActions(){
    return actions;
}

function getActionHandler(name, logIfMissing){
    if(!name){
        logger.error("No name provided in order to get the action!");
    }
    if(logIfMissing && !actions[name]){
        logger.error("No handler found for action: "+name);
    }
    return actions[name];
}

function registerActionHandler(name, func, overwrite){
    if(!func){
        logger.error("Trying to register an action without any handler!");
        return;
    }

    registerAction(name, func, overwrite);
}

function registerActionHandlerFromFile(name, file, overwrite){

    if(!file){
        logger.error("Trying to register an action without any file reference!");
        return;
    }

    registerAction(name, require(file), overwrite, file);
}

function registerAction(name, func, overwrite, fileName){
    if(!name){
        logger.error("No action name provided!");
        return;
    }

    if(actions[name]){
        if(overwrite){
            if(fileName){
                logger.info("Action "+name+" was overwritten with file reference "+fileName);
            }else{
                logger.info("Action "+name+" was overwritten.");
            }
            actions[name] = func;
        }
    }else{
        logger.info("Action "+name+" was registered.");
        actions[name] = func;
    }
}

//-------------- End Actions registery ------------------

//-------------- Simple Deployer ------------------
function Deployer(configJson){
    var dependencies = configJson ? configJson.dependencies : null;

    if(!dependencies){
        logger.info("[Deployer]", "No dependencies found!");
        return;
    }

    if(!Array.isArray(dependencies)){
        logger.error("[Deployer]", "Dependencies prop is not Array!");
        return;
    }

    function runDependency(index){
        if(index>=dependencies.length){
            logger.info("[Deployer]", "Finishing checking dependencies...");
            return;
        }

        var dep = dependencies[index];
        logger.info("[Deployer]", "Running dependency: ["+index+"] "+dep.name);
        if(dep.actions && Array.isArray(dep.actions) && dep.actions.length > 0){
            runAction(index, 0);
        }else{
            logger.warning("[Deployer]", "No actions available for "+dep.name+" dependecy or wrong format.");
        }
    }

    function runAction(depIndex, actionIndex){
        function next(err, res){
            //TODO check the error!!!!

            actionIndex +=1;
            if(actionIndex < dep.actions.length){
                runAction(depIndex, actionIndex);
            }else{
                if(depIndex < dependencies.length){
                    runDependency(++depIndex);
                }
            }
        }

        var dep = dependencies[depIndex];
        var action = dep.actions[actionIndex];
        var handler;

        if(typeof action === "object"){
            handler = getActionHandler(action.type, true);
        }else{
            handler = getActionHandler(action, true);
        }

        if(handler){
            handler(dep, configJson, next);
        }else{
            next("No handler");
        }
    }

    function goNext(){

    }

    logger.info("[Deployer]", "Start checking dependencies...");
    runDependency(0);
}
//-------------- End Simple Deployer ------------------

module.exports.deployer = Deployer;

module.exports.registerActionHandler = registerActionHandler;
module.exports.registerActionHandlerFromFile = registerActionHandlerFromFile;
module.exports.getActionHandler = getActionHandler;