# PiCluster
<p align="center">
<img src="http://i.imgur.com/x2Zfokp.png">
</p>
PiCluster is a simple way to manage Docker containers on multiple hosts. I created this
because I found Docker Swarm not that good and Kubernetes was too difficult to install currently on ARM.
PiCluster will only build and run images from Dockerfile's on the host specified in the config file. This software will work
on regular x86 hardware also and is not tied to ARM.


![Pic](http://i.imgur.com/9km7cbf.png)

## Features

* Run commands in parallel across Nodes
* Heartbeat for services
* Easily build and orchestrate Docker images across nodes
* Command-line interface
* Web interface
* HTTP interface

## Prerequisites

* Docker
* Node.js


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
    {"node":"192.168.0.100", "mysql":"-p 3306:3306 mysql","nginx":"nginx"},
    {"node":"192.168.0.102", "openvpn":"-p 1194:1194 openvpn"}],
  "hb": [
    {"node":"192.168.0.100","mysql":"3306", "nginx": "80"},
    {"node":"192.168.0.102","openvpn":"1194"}
  ],
  "web_username": "admin",
  "web_password":"admin",
  "web_connect":"192.168.0.101",
  "web_port":"3003"
}

```
* layout - Contains each row contains an IP address of the node to run the container on, the name for the container, and the Docker arguments.

* heartbeat -  lists the node, container name, and the port to monitor. If the port can not be connected to, PiCluster will restart the failed image.

* token - A string you define a random string that will be used for authentication with the agents.

* agent_port -  Defines the port that the agent will listen on.

* docker - Defines where your Dockerfile's are. The format for the Docker folder should be like this: dockerfiles/imagename/Dockerfile

* web_username and web_password - Define's the username and password for the web interface.

* web_connect - IP address of a node running the server.

* web_port - Port that the web console listens on.


##### 2. Running the Application


The following environment variables need to be set:

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

The web console will send commands to the server.

```
cd web
npm install
node webconsole.js
```

## Configuring and using the client "pictl"

Pictl is a bash client to easily control the cluster. It will make all the HTTP requests using curl.

#### 1. The following variables need to be set in the file:

* server - IP address of the server
* port - PORT that the server uses
* token - The token used in the Server and Agent configs.

#### 2. Using the client

To get a list of accepted arguments:
```
pictl
```

To get a list of all the nodes in PiCluster:
```
pictl nodes
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

For each file that begins with "start", modify the following variables for your installation.
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

#### 5. Reboot for the services to be started properly
```
Reboot
```

# Authors and Contributions

Project created by [Phillip Tribble] (https://www.linkedin.com/in/philliptribble)
#### Images

This work, "Raspy Whale", is a derivative of "raspberry" by Chanut is Industries from the Noun Project used under CC BY, "Sperm Whale" by Oksana Latysheva from the Noun Project used under CC BY, and "Sperm Whale" by Oksana Latysheva from the Noun Project used under CC BY. "Raspy Whale" is licensed under CC BY by Jordan Sinn.
