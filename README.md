# PiCluster
<p align="center">
<img src="http://i.imgur.com/x2Zfokp.png">
</p>
PiCluster is a simple way to manage Docker containers on multiple hosts. I created this
because I found Docker Swarm not that good and Kubernetes was too difficult to install currently on ARM.
PiCluster will only build and run images from Dockerfile's on the host specified in the config file. This software will work
on regular x86 hardware also and is not tied to ARM.

[![Build Status](https://travis-ci.org/rusher81572/picluster.svg?branch=master)](https://travis-ci.org/rusher81572/picluster)
[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](http://www.gnu.org/licenses/gpl-3.0)

![Pic](http://i.imgur.com/4l15YjW.png)

## Features
* Move containers to different hosts in the cluster
* Run commands in parallel across Nodes
* Heartbeat for services
* Easily build and orchestrate Docker images across nodes
* Command-line interface
* Web interface
* HTTP interface
* Virtual IP Manager
* Rsyslog Analytics

## Prerequisites

* Docker
* Node.js

If you are using Docker 1.12.x and earlier, please use [PiCluster v1.0](https://github.com/rusher81572/picluster/tree/1.0)

## Server Installation

##### 1. Modify config.json with your desired layout.

This is the core config file for the web console, agent, and server.

You can run the server and agent on the same node since they are listening on different ports.


```
{
  "token":"1234567890ABCDEFGHJKLMNOP",
  "docker":"/root/docker",
  "server_port":"3000",
  "agent_port": "3001",
  "layout": [
    {"node":"192.168.0.100", "mysql":"-p 3306:3306","nginx":"-p 80:80"},
    {"node":"192.168.0.102", "openvpn":"-p 1194:1194"}],
  "hb": [
    {"node":"192.168.0.100","mysql":"3306", "nginx": "80"},
    {"node":"192.168.0.102","openvpn":"1194"}
  ],
  "vip": [
    {"node":"192.168.0.101","vip_eth_device":"eth0", "slave": "192.168.0.102", "vip_ping_time": "10000"},
    {"node":"192.168.0.102","vip_eth_device":"eth0","slave": "192.168.0.101", "vip_ping_time": "15000"}
  ],
  "commandlist": [{
  "SystemUpdate": "apt-get update;apt-get dist-upgrade -y"
  }],
  "vip_ip": "192.168.0.15",
  "autostart_containers": "enabled",
  "rsyslog_logfile": "/var/log/syslog",
  "rsyslog_host": "192.168.0.15",
  "automatic_heartbeat": "enabled",
  "heartbeat_interval": "300000",
  "syslog": "dmesg",
  "web_username": "admin",
  "web_password":"admin",
  "web_connect":"192.168.0.101",
  "web_port":"3003"
}

```
* layout - Each row contains an IP address of the node to run the container on, the name for the container image as it corresponds in the Docker folder, and the Docker run arguments.

* heartbeat -  lists the node, container name, and the port to monitor. If the port can not be connected to, PiCluster will restart the failed image.

* token - A string you define a random string that will be used for authentication with the agents.

* agent_port -  Defines the port that the agent will listen on.

* docker - Defines where your Dockerfile's are. The format for the Docker folder should be like this: dockerfiles/imagename/Dockerfile

* web_username and web_password - Define's the username and password for the web interface.

* web_connect - IP address of a node running the server.

* web_port - Port that the web console listens on.

* automatic_heartbeat - Have the server do a heartbeat check on the services in the hb section of config.json. Valid values are: enabled or disabled.

* heartbeat_interval - How often to do the heartbeat check. Requires automatic_heartbeat to be enabled.

* syslog - The command used to read the logs on each host.

* vip - This section contains the agent nodes that the VIP can run on, the ethernet device on each node, and the slave node to run checks against.

* vip_ping_time - Time in ms to ping each slave. Each host should have different times.

* vip_ip - The Virtual IP address to use in the cluster

* autostart_containers - If set, the agent will connect to the server specififed in web_connect to start all of the containers.

* rsyslog_logfile - Location of the log file on the Rsyslog server

* rsyslog_host - The host running the PiCluster Agent with a Rsyslog server running or has access to the log drain file.

* commandlist - A list of commands to run on the nodes on demand from the web console under Operations -> Run Command.

###### An example on the Docker folder layout:
Based on the config snippet below, I have two container images that will be called "mysql" and "nginx" that will run on host 192.168.0.100.
```
"layout": [
  {"node":"192.168.0.100", "mysql":"-p 3306:3306","nginx":"-p 80:80"}
```

The Docker folder will need to be setup like this to match the container names:
```
/root/docker/mysql/Dockerfile
/root/docker/nginx/Dockerfile
```

When it is time to build the containers, PiCluster will use the "docker" variable from config.json plus the container name to locate and build the images.

##### 2. Running the Application

This section will cover how to install and run each component of PiCluster.

## Server Installation

The server is the brain of PiCluster and the agents and web console connect to it.

```
export picluster_config='/root/picluster/config.json'
cd server
npm install
node server.js
```
Modify picluster_config to the exact location of the PiCluster configuration file.

##### You can safely ignore the following error if found when running npm install
```
npm WARN picluster-agent@0.0.1 No description
npm WARN picluster-agent@0.0.1 No repository field.
npm WARN picluster-agent@0.0.1 No license field.
npm ERR! file sh
npm ERR! code ELIFECYCLE
npm ERR! errno ENOENT
npm ERR! syscall spawn
npm ERR! microtime@0.2.0 install: `node-waf configure build`
npm ERR! spawn ENOENT
npm ERR!
npm ERR! Failed at the microtime@0.2.0 install script.
```

## Agent Installation

The server will send commands to be executed on the agents nodes. The agent should be installed on each host in the cluster.

```
export picluster_config='/root/picluster/config.json'
cd agent
npm install
node agent.js
```
Modify picluster_config to the exact location of the PiCluster configuration file.

## Web Console Installation

The web console will send commands to the server that will run commands or gather information from the agent nodes.

```
export picluster_config='/root/picluster/config.json'
cd web
npm install
node webconsole.js
```
Modify picluster_config to the exact location of the PiCluster configuration file.

## Configuring and using the client "pictl"

Pictl is a bash client to easily control the cluster. It will make all the HTTP requests using curl.

#### 1. The following variables need to be set in the file:

* server - IP address of the server
* port - PORT that the server uses
* token - The token used in the Server and Agent configs.

#### 2. Using the client

If a command has arguments ([image] or [container]), the commands will
run cluster-wide. For example if you run "pictl delete" without
specifying a container, all of the containers will be deleted.

To get a list of accepted arguments:
```
pictl
```

To get a list of all the nodes in PiCluster:
```
pictl nodes
```

To build a Docker image from the config:
```
pictl build [image]
```

To create and start a container from the config:
```
pictl create [container]
```

To stop a container from the config:
```
pictl stop [container]
```

To delete a container from the config:
```
pictl delete [container]
```

To restart a container from the config:
```
pictl restart [container]
```

To execute a command on all of the hosts
```
pictl exec "command"
```

Display all of the Docker images on each host
```
pictl images
```

To view the current log
```
pictl log
```

## Using Systemd for Server and Agent Processes

The systemd folder containers the service files and scripts to make PiCluster start at boot time.

#### 1. Modify the .service files in the systemd folder

For each .service file, change ExecStart and ExecStop to reflect the location of the PiCluster folder.
```
ExecStart=/bin/bash /root/picluster/systemd/start-agent.sh
ExecStop=/bin/bash /root/picluster/systemd/stop-agent.sh
```
#### 2. Modify the start scripts in the systemd folder

For each file that begins with "start", modify the PICLUSTER_ variables for your installation.

Example for start-agent.sh.
```
export PICLUSTER_AGENT_PATH="/root/picluster/agent"
```

#### 3. Copy the systemd files to the systemd directory
```
cp systemd/*.service /lib/systemd/system/
```

#### 4. Enable the services

To enable the server service.
```
systemctl enable picluster-server.service
```

To enable the agent service.
```
systemctl enable picluster-agent.service
```

To enable the web console service.
```
systemctl enable picluster-web.service
```

#### 5. Reboot for the services to be started properly
```
Reboot
```

# Authors and Contributions

Project created by Phillip Tribble. [LinkedIn](https://www.linkedin.com/in/philliptribble) , [Twitter](https://twitter.com/rusher81572)

#### Images

This work, "Raspy Whale", is a derivative of "raspberry" by Chanut is Industries from the Noun Project used under CC BY, "Sperm Whale" by Oksana Latysheva from the Noun Project used under CC BY, and "Sperm Whale" by Oksana Latysheva from the Noun Project used under CC BY. "Raspy Whale" is licensed under CC BY by Jordan Sinn.
