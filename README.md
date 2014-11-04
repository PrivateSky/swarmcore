SwarmCore
=========

Swarm 2.0 implementation



SwarmCore includes core functionality for working with swarms version 2.0. Is a refactored version of the SwarmUtil module.

## Install

    $ npm install swarmcore

## Create a new Swarm node (Adapter)

    thisAdapter = require('swarmcore').createAdapter("<<adapterName>>",false,false,true);

The "true" parameter enable verbose output and is usefull for debugging.


