#!/bin/bash
export PICLUSTER_SERVER_PATH="/root/picluster/server"
export DOCKER="/root/docker"
export NODE_BIN=`which nodejs`;
export PORT="3000"
export AGENTPORT="3002"
cd $PICLUSTER_SERVER_PATH
$NODE_BIN server.js
