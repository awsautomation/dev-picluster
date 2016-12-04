#!/bin/bash
export PICLUSTER_AGENT_PATH="/root/picluster/agent"
export NODE_BIN=`which nodejs`;
export PORT="3001"
export AGENTPORT="3002"
cd $PICLUSTER_AGENT_PATH
$NODE_BIN agent.js&
