#!/bin/bash
export PICLUSTER_AGENT_PATH="/root/picluster/agent"
export NODE_BIN=`which nodejs`;
export PORT="9001"
export AGENTPORT="9002"
cd $PICLUSTER_AGENT_PATH
$NODE_BIN agent.js
