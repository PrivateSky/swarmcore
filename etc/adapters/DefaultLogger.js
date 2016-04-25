/*
 Simple logger implementation
 */


var core = require ("../../lib/SwarmCore.js");
var fs = require('fs');
var winston = require('swarm-winston');

thisAdapter = core.createAdapter("DefaultLogger");

var pathToLogs = process.argv[2];
if(!pathToLogs){
 pathToLogs = process.cwd()+"/logs";
}

if(!fs.existsSync(pathToLogs)){
   fs.mkdirSync(pathToLogs);
}

console.log("Logs will be saved at "+pathToLogs);

var levels = {
    'hardError':0,
    'systemError':13,
    'error':1,
    'logError':2,
    'uxError':3,
    'throttling':4,
    'warning':5,
    'info':6,
    'debug':7,
    'ldebug':8,
    'udebug':9,
    'devel':10,
    'logwhy':11,
    'assert':12
}

winston.setLevels(levels);

var transports = [];
for(var level in levels){
    var transport =  {
        'name':level,
        'filename':pathToLogs+"/"+level+"s.logs",
        'level':level
    }
    transports.push(new (winston.transports.File)(transport));
}
var logger = new (winston.Logger)({'transports':transports,'levels':levels})

function treatNewLogs(log){
    if(log==null){
        return;
    }
    log = JSON.parse(log);
    logger[log.type](log);

    logListeners.forEach(function(listener){
        listener(log);
    })
}

thisAdapter.nativeMiddleware.subscribeForLogs(treatNewLogs);

logListeners = [];

listenForLogs = function(callback){
    logListeners.push(callback);
}

getLogLevels = function(){
    return levels;
}



getLogsUntil = function(until,limit,type,callback){
    var queryOptions = {
        from:until - 48 * 60 * 60 * 1000,
        until:until,
        limit:limit,
        start:0,
        order:'desc',
        transport:type
    }
    try {
        logger.query(queryOptions, function (err, results) {
            if (err) {
                console.error(err);
            } else {
                results = results.filter(function(log){
                    if(until === log.timestamp){
                        return false;
                    }
                    return true;
                })
                callback(results);
            }
        })
    }
    catch(e){
        //no logs of type 'type' occured which mean that the associated transport is undefined
        //and will throw an error on query
        callback([]);
    }
}

