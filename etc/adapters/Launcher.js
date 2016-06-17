

/**********************************************************************************************
 * new Launcher for usage from
 **********************************************************************************************/


var core = require ("swarmcore");


var config, forkOptions;

var executionSteps = {}; /* object with key 0,1,..,10*/
function pushInStep(step,item){
    var stepList = executionSteps[step];
    if(!stepList){
        stepList = [];
        executionSteps[step] = stepList;
    }
    stepList.push(item);
}

function NodeConfig(key){
    /*
     path: executable path
     instances: number of instances
     args: other arguments,
     enabled: boolean
     */
}

function configure(){

    config = getMyConfig("Launcher");
    forkOptions = {
        cwd: process.cwd(),
        env: process.env
    };

    if(!config.stepsDelay){
        config.stepsDelay = 500; //half seconds
    }


    if(!config.pingTimeout){
        config.pingTimeout = 10000; //10 seconds
    }

    if(!config.responseTimeout){
        config.responseTimeout = 1000; //1 second
    }


    var watch = config.watch;
    if(!watch || watch.length <= 0){
        console.log("Watch sections missing or not an array. Exiting...");
        process.exit(-1);
    }

    for(var i = 0, len = watch.length; i < len; i++ ){

        var p = watch[i];

        var name = p.node;
        var path;

        if(!name){
            name = p.core;
            path = core.getCorePath() + name;
            console.log("Core:",path)
        } else {
            path = core.getSwarmFilePath(name);
            console.log("Path:", path);
        }
        if(!name){
            console.log("Ignoring watch configuration, missing node or core property ", p);
        }

        var item = new NodeConfig(name);

        item.path = path;

        item.instances  = p.instances;

        if(!item.instances){
            item.instances = 1;
        }

        item.args       = p.args;
        var step        = p.step;
        if(!step){
            step = 10;
        }
        if(p.enabled){
            pushInStep(step, item);
        }
    }
    return config;
}

function startAdapters(monitor, endCallback){
    var currentStep = 0;
    function doNextStep(){
        currentStep++;
        if(currentStep < 11){
            var items = executionSteps[currentStep];
            if(items){
                for(var v = 0, len = items.length; v < len;v++){
                    monitor.createFork(items[v], v);
                }
                setTimeout(doNextStep, config.stepsDelay);
            } else {
                doNextStep();
            }
        } else {
            endCallback();
        }
    }
    doNextStep();
}

/*
 Start Launcher
 */

var subprocessesCounter = 0;
var globalAdaptersRestartsCounter = 0;
function onRestart(fork){
    globalAdaptersRestartsCounter++;
    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>> restart:", globalAdaptersRestartsCounter);
}


config = configure();

var monitor = require ("../../com/launcher/executionMonitor.js").createExecutionMonitor(forkOptions, config, onRestart);

process.on('exit',      monitor.killAllForks);
process.on('SIGTERM',   monitor.killAllForks);
process.on('SIGHUP',    monitor.killAllForks);
process.on('SIGINT',    monitor.killAllForks);

startAdapters(monitor, function(){
    console.log("Finally creating launcher adapter...");
    core.createAdapter("Launcher");
    subprocessesCounter = monitor.monitorForks();
});


var fs = require('fs');


updateCodeBase = function(pathToZip,callback){

    console.log("Kill all adapters but the launcer")
    monitor.killAllForks();
    console.log("Replace code")

    var replacementError = false

    try{
        replaceCode(pathToZip,process.env.SWARM_PATH)
    }
    catch(e){
        replacementError = e
    }

    if(replacementError===false) {
        console.log("Update completed")
    }else{
        console.log("Update failed with error:"+JSON.stringify(replacementError,null,4))
        callback(e)
    }

    console.log("Restart adapters")

    startAdapters(monitor,function(err,result){
        subprocessesCounter = monitor.monitorForks()
        callback(err,result);
    })
}

function replaceCode(pathToNewCodeZip,oldCodeLocation){
    /*
     Extract the zip in a temp folder and then move it in the project
     Don't drop them directly from zip because you might want to make further verifications before that
     */
    var AdmZip = require('adm-zip')
    var zip = undefined
    try{
        zip = new AdmZip(pathToNewCodeZip)
    }
    catch(e){
        //fs.unlinkSync(pathToNewCodeZip)
        throw e
    }

    var root = oldCodeLocation
    var githubName = zip.getEntries()[0].entryName.split("/")[0]

    console.log("Extract new code to temporary location")
    zip.extractAllTo(root,true)

    var newElements = allNewElements(root+"/"+githubName)

    var dirs = newElements.filter(function(element){
        return element['type']=='dir'
    }).map(function(element){
        return element['path']
    })

    var files = newElements.filter(function(element){
        return element['type']=='file'
    }).map(function(element){
        return element['path']
    })

    console.log("Create new folders in project structure")
    dirs.forEach(function(dir){
        dir = eliminateFromPath(dir,githubName)
        try{
            fs.mkdirSync(dir)
        }catch(e){
            //folder already exists so don't bother
        }
    })

    console.log("Copy files to project")
    files.forEach(function(file){
        source = fs.readFileSync(file)
        file = eliminateFromPath(file,githubName)
        fs.writeFileSync(file,source)
    })

    console.log("Remove temporary directory")
    removeDirectory(root+"/"+githubName)
    fs.unlinkSync(pathToNewCodeZip)

    function allNewElements(directory) {
        var files = [];
        var content = fs.readdirSync(directory);
        content.forEach(function (item) {
            item = directory+"/"+item
            var status = fs.statSync(item);

            if (status.isDirectory()) {
                files.push({
                    'path':item,
                    'type':'dir'
                })
                files = files.concat(allNewElements(item))
            } else {
                files.push({
                    'path':item,
                    'type':'file'
                })
            }
        })
        return files;
    }

    function eliminateFromPath(path,intermediaryToEliminate) {
        return path.split("/").reduce(function (prev, current) {
            var ret = prev
            if (current !== intermediaryToEliminate) {
                if (prev === "") {
                    ret = current
                } else {
                    ret += "/" + current
                }
            }
            return ret
        }, "/")
    }

    function removeDirectory(directory){
        var content = fs.readdirSync(directory);
        content.forEach(function (item) {
            item = directory+"/"+item
            var status = fs.statSync(item);
            if (status.isDirectory()) {
                removeDirectory(item)
            } else {
                fs.unlinkSync(item)
            }
        })
        fs.rmdirSync(directory)
    }
}


getLatestCodeVersion = function(callback){

    if (config['codeDownloadLink'] == undefined && config['codePath']==undefined){
        callback(new Error("This organization cannot access zip with the latest code version\n" +
            "Add 'codeDownloadLink' of 'codePath' in the launcher configuration of this organization"))
        return
    }

    if(config['codePath']!==undefined){
        console.log("Latest version of the code is at "+latestCodeVersionPath)
        callback(null,config['codePath'])
        return
    }

    var http = require('http');
    var latestCodeVersionPath = process.env.SWARM_PATH+"/tmp/latestCodeVersion.zip"
    var zipFile = fs.createWriteStream(latestCodeVersionPath)
    var downloadRequest = http.get(config['codeDownloadLink'],function(response){
        response.on('data',function(data){
            zipFile.write(data)
        }).on('end',function(){
            zipFile.end();
            console.log("Latest version of the code downloaded at "+latestCodeVersionPath)
            callback(null,latestCodeVersionPath)
        })
    })
}

clearLatestCodeVersion = function(callback){
    fs.unlink(process.env.SWARM_PATH+"/tmp/latestCodeVersion.zip",callback)
    callback()
}

getLauncherStatus = function(){
    return {
        "launcherId":thisAdapter.nodeName,
        "adaptersCounter": subprocessesCounter,
        "restartsCounter": globalAdaptersRestartsCounter
    }
}
