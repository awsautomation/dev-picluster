#!/usr/bin/env bash
# Test is SSL is on or off from config.json

# Stop on error
set -e

# Test if jq is installed
if `type jq &>/dev/null`; then
  # Config file
  config="config-example.json"

  # Set config parameters to assign to variables
  config_token=`jq .token $config | sed -e 's/\"//g'`
  config_docker=`jq .docker $config | sed -e 's/\"//g'`
  config_server_port=`jq .server_port $config | sed -e 's/\"//g'`
  config_agent_port=`jq .agent_port $config | sed -e 's/\"//g'`
  config_ssl=`jq .ssl $config | sed -e 's/\"//g'`
  config_ssl_cert=`jq .ssl_cert $config | sed -e 's/\"//g'`
  config_ssl_key=`jq .ssl_key $config | sed -e 's/\"//g'`
  config_web_username=`jq .web_username $config | sed -e 's/\"//g'`
  config_web_password=`jq .web_password $config | sed -e 's/\"//g'`
  config_web_connect=`jq .web_connect $config | sed -e 's/\"//g'`
  config_web_port=`jq .web_port $config | sed -e 's/\"//g'`

  echo $config_token
  echo $config_docker
  echo $config_server_port
  echo $config_agent_port
  echo $config_ssl_cert
  echo $config_ssl
  echo $config_ssl_key
  echo $config_web_username
  echo $config_web_password
  echo $config_web_connect
  echo $config_web_port
else
  echo "Please install jq"
fi
