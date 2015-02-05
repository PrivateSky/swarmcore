/*
 A prototype implementation for "Swarm File Transfer Bus"
 The File Transfer Bus offers an API for large binary content transfers between adapters.
 Transfers signaling is performed from swarms

 Implementation can be:
    - A http server that can be accessed from other nodes
    - A P2P node

 The core provides the following function:
        registerSwarmFileTransferBus(storageName, protocol, connectionString);
 Use:
 in your

 */

var fileBus = require("../lib/FileBusUtil.js");
var fs = require("fs");

var http = require('http');
var querystring = require('querystring');
var request = require('request');

var cfgFileSizeLimit = getConfigProperty("fileSizeLimit", 100*1024*1024);//100 mega

function processPost(request, response, callback) {
    var queryData = "";
    if(typeof callback !== 'function') return null;

    if(request.method == 'POST') {
        var requestId = 0; // getRequestid(request)
        request.on('data', function(data) {
            queryData += data;
            if(queryData.length > cfg.limit) {
                queryData = "";
                response.writeHead(413, {'Content-Type': 'text/plain'}).end();
                request.connection.destroy();
            }
        });

        request.on('end', function() {
            request.post = querystring.parse(queryData);
            callback();
        });

    } else {
        response.writeHead(405, {'Content-Type': 'text/plain'});
        response.end();
    }
}

var requestCallbacks = {};

exports.initFileBusNode = function(storageName, cfgBindAddress, cfgPort){
    if(!cfgPort)        {
        cfgPort      = getConfigProperty("port", 3001);
    }

    if(!cfgBindAddress) {
        cfgBindAddress = getConfigProperty("fbBindAddress", "localhost");
    }

    var http = require("http");

    http.createServer(function(request, response) {
        console.log("Request:", request);
        if(request.method == 'PUT') {
            console.log("Receiving PUT request:", request);
            var requestUID = request.url.substring(1); // remove the /
            var temporaryFilePath = requestUID; //TODO: generate temporary file
            processPost(request, response, function() {
                startSwarm("FileBus.js", "waitTransfer", requestUID );

                // Use request.post here
                response.writeHead(200, "OK", {'Content-Type': 'text/plain'});
                response.end();
            });
        } else {
            response.writeHead(200, "OK", {'Content-Type': 'text/plain'});
            response.end();
        }
    }).listen(cfgPort, cfgBindAddress);

    var fileBusInstance = fileBus.initFileBusNode(storageName, "http",cfgBindAddress, cfgPort, "");
    fileBusInstance.transferFile = function(localFilePath, otherStorageName, swarm, phase, target){

        var requestUUID = generateUUID();
        var url = fileBusInstance.getStorageUrl(otherStorageName)+"/"+requestUUID;
        fs.createReadStream(localFilePath).pipe(request.put(url));
        return requestUUID;
    }

    fileBusInstance.onTransferReady = function(requestUUID, callback){
        requestCallbacks[requestUUID] = callback;
    }

    return fileBusInstance;
}