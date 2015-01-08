SwarmCore
=========

Swarm 2.0 implementation

SwarmCore includes core functionality for working with swarms version 2.0. Is a refactored version of the SwarmUtil module.

## Install for some small tests and quick play

    1. get SwarmCore from GitHub
    2. install Redis server
    3. set SWARM_PATH folder to the SwarmCore directory
    4. install all dependencies, go in SwarmCore folder and run: "npm install -g"
    5. now you can launch adapters and the tests to get an impression about swarming

## Install for creating real projects

    1. get SwarmCore from GitHub
    2. install redis
    3. install all node.js dependencies with npm (run "node install -g" in the SwarmCore folder)
    3. create a new project, with your source control. Set SWARM_PATH variable on this folder
    4. create folders like etc, adapters, swarms in this new project
    5. clone etc/config for your own folders and cases
    6. create your new Adapters, tests, swarms
    7. you should start adapters from SwarmCore (from etc/adapters ) like Core.js, DefaultLogger.js, PhaseMonitor.js


How to:
## Create a new Swarm node (Adapter)

    var core = require ("../../lib/SwarmCore.js");  //check your relative paths accordingly with your conventions
    thisAdapter = core.createAdapter("Give_Me_A_Name");
    /*  now add your functions and they could be called by executing swarms */

    /*l
        Notice: The name yu gave is the name of a group of nodes doing similar tasks. "swarm" primitive is doing load distribution by implementation.
        You can start as many nodes in the same group and they will be used.
        For normal cases, load distribution is similar with load balancing as is trying to not overload already busy nodes
        and is doing something like Round Robin strategy when choosing nodes.
        For tasks that are not taking comparable amounts of time to execute, you could be in need to implement your own balancing strategies
    */

## Create a new Swarm node (Adapter)

