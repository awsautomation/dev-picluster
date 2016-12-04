#!/bin/bash
export PICLUSTER_SERVER_PATH="/root/picluster/server"
export DOCKER="/root/docker"
export NODE_BIN=`which nodejs`;
export PORT="9001"
export AGENTPORT="9002"
cd $PICLUSTER_SERVER_PATH
$NODE_BIN server.js
