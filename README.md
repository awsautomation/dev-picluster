# PiCluster

PiCluster is a simple way to manage Docker containers on multiple hosts. I created this
because I found Docker Swarm not that good and Kubernetes was too difficult to install currently on ARM.

## Prerequisites

* Docker
* Node.js

## Server Installation

##### 1. Modify config.json with your desired layout.

This is the core config file. Under layout, each row contains an IP
address of the node to run the container on, the name for the container, and the Docker arguments.

The heartbeat section of config.json lists the node, container name, and the port to monitor. If the port can not be connected to, PiCluster will restart the failed image.

```
{
  "layout": [
    {"node":"192.168.0.100", "mysql":"-p 3306:3306 mysql","nginx":"nginx"},
    {"node":"192.168.0.102", "openvpn":"-p 1194:1194 openvpn"}
  ],
  "hb": [
    {"node":"192.168.0.100","mysql":"3306", "nginx": "80"},
    {"node":"192.168.0.102","openvpn":"1194"}
  ]
}

```

##### 2. Running the Application


The following environment variables need to be set:
* DOCKER - Where the Dockerfiles' are
* PORT - Port that the master listens on
* AGENTPORT - Port that the agent listens on

The format for the Docker folder should be like this:
dockerfiles/imagename/Dockerfile

```
export DOCKER='/home/user/dockefiles'
export PORT='9000'
export AGENTPORT='9001'
cd server
npm install
node server.js
```

## Agent Installation
##### 1. Running the Application

The following variable needs to be set:
* AGENTPORT - Port that the agent listens on
```
export AGENTPORT='9001'
cd agent
npm install
node agent.js
```

## Configuring and using the client "pictl"

Pictl is a bash client to easilly control the cluster. It will make all the HTTP requests using curl.

#### 1. The following variables need to be set in the file:

* server - IP address of the master
* port - PORT that the master uses

#### 2. Using the client

To get a list of accepted arguments:
```
pictl
```

To build all of the Docker images from your config:
```
pictl build
```

To run all of the Docker images from your config:
```
pictl run
```

To stop all of the Docker images from your config:
```
pictl stop
```

To execute a command on all of the hosts
```
pictl exec "command"
```

To view the current log
```
pictl log
```
