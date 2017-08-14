# PiCluster

![Pic](http://i.imgur.com/WBnXC2R.png)

 PiCluster is a simple way to manage Docker containers on multiple hosts. I created this because I found Docker Swarm not that good and Kubernetes was too difficult to install currently on ARM. PiCluster will only build and run images from Dockerfile's on the host specified in the config file. This software will work on regular x86 hardware also and is not tied to ARM.



[![Build Status](https://travis-ci.org/picluster/picluster.svg?branch=master)](https://travis-ci.org/picluster/picluster) [![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](http://www.gnu.org/licenses/gpl-3.0)

![Pic](http://i.imgur.com/N7KBk6z.pngg)
![Pic](http://i.imgur.com/h63NLRI.png)

## Community Chat
 [![Slack](http://i.imgur.com/PXLxay0.png)](https://join.slack.com/t/piclusterteam/shared_invite/MjI1NzU0NDE2MDM3LTE1MDI0Nzg2ODktYmNmZDk2NzZhMA)

## Features

- Move containers to different hosts in the cluster
- Run commands in parallel across Nodes
- Heartbeat for services
- Easily build and orchestrate Docker images across nodes
- Command-line interface
- Web interface
- HTTP interface
- Virtual IP Manager
- Rsyslog Analytics
- Built-in web terminal to easily run commands on nodes
- Integrate the Kibana dashboard into PiCluster
- Integrates with Elasticsearch to store the PiCluster logs.
- Automatic container failover to different nodes
- Pull container images from a registry
- Upload Dockerfile archives to the entire cluster

## Prerequisites

- Docker
- Node.js

If you are using Docker 1.12.x and earlier, please use [PiCluster v1.0](https://github.com/picluster/picluster/tree/1.0)

## Cloning this Repository

```
git clone https://github.com/picluster/picluster.git picluster
```

To clone the developer branch (not recommended unless you know what you're doing):

```
git clone -b dev https://github.com/picluster/picluster.git picluster
```

## Config file reference
[See Wiki Page](https://github.com/picluster/picluster/wiki/Config-Reference)

## Try PiCluster in Docker

We included a compose file to evaluate PiCluster easily on your laptop. Simply Install Docker on your laptop and do the following:

```
cd picluster
docker-compose up -d
```

Finally, in your web browser go to <http://127.0.0.1:3003>

## Server Installation

### 1\. Copy config-example.json to config.json and modify with your desired layout.

This is the core config file for the web console, agent, and server.

You can run the server and agent on the same node since they are listening on different ports.


### 2\. Copy the example Dockerfile layout depending on architecture

**Arch Linux ARM**
```
cd /opt/picluster
cp -r example/arm/archlinux/* docker/
```

**x86_64 Ubuntu x86_64**
```
cd /opt/picluster
cp -r example/x86_64/ubuntu/* docker/
```

#### An example on the Docker folder layout:

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

### 2\. Running the Application

This section will cover how to install and run each component of PiCluster.

## Server Installation

The server is the brain of PiCluster and the agents and web console connect to it.

```
cd server
npm install
node server.js
```

## Agent Installation

The server will send commands to be executed on the agents nodes. The agent should be installed on each host in the cluster.

```
cd agent
npm install
node agent.js
```

## Web Console Installation

The web console will send commands to the server that will run commands or gather information from the agent nodes.

```
cd web
npm install
node webconsole.js
```

## Upgrading

[See Wiki Page](https://github.com/picluster/picluster/wiki/Upgrading)


## Configuring and using the client "pictl"

Pictl is a bash client to easily control the cluster. It will make all the HTTP requests using curl.

### 1\. The following variables need to be set in the file:

- server - IP address of the server
- port - PORT that the server uses
- token - The token used in the Server and Agent configs.

### 2\. Using the Command-line client

[See Wiki Page](https://github.com/picluster/picluster/wiki/Pictl)

## Using pm2 to init PiCluster on systemd

[See Wiki Page](https://github.com/picluster/picluster/wiki/PM2)

# Automatic Container failover to other hosts

[See Wiki Page](https://github.com/picluster/picluster/wiki/Automatic-Container-failover-to-other-hosts)

# Authors and Contributions

Project created by Phillip Tribble. [LinkedIn](https://www.linkedin.com/in/philliptribble) , [Twitter](https://twitter.com/rusher81572)

PiCluster Logos by chzbacon.

## Images

This work, "Raspy Whale", is a derivative of "raspberry" by Chanut is Industries from the Noun Project used under CC BY, "Sperm Whale" by Oksana Latysheva from the Noun Project used under CC BY, and "Sperm Whale" by Oksana Latysheva from the Noun Project used under CC BY. "Raspy Whale" is licensed under CC BY by Jordan Sinn.
