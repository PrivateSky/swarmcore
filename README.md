SwarmCore
=========

Swarm 2.0 implementation



SwarmCore includes core functionality for working with swarms version 2.0. Is a refactored version of the SwarmUtil module.

## Install for some small tests and quick play

    1. get SwarmCore from github
    2. install redis
    3. set SWARM_PATH folder to the SwarmCore directory
    4. now you can launch adapters and the tests to get an impression about swarming

## Install for creating real projects

    1. get SwarmCore from GitHub
    2. install redis
    3. install all node.js dependencies with npm (run "node install" in the SwarmCore folder)
    3. create a new project, in a different source control . Set SWARM_PATH variable on this folder
    4. create folders like etc, adapters, swarms in this new project
    5. clone etc/config for your own folders and cases
    6. create your new Adapters, tests, swarms
    7. you should start adapters from SwarmCore (from etc/adapters ) like Core.js, DefaultLogger.js, PhaseMonitor.js

## Create a new Swarm node (Adapter)

    thisAdapter = require('swarmcore').createAdapter("<<adapterName>>",false,false,true);

The "true" parameter enable verbose output and is usefull for debugging.


