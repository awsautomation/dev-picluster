# PiCluster

![Pic](http://i.imgur.com/WBnXC2R.png)

 PiCluster is a simple way to manage Docker containers on multiple hosts. I created this because I found Docker Swarm not that good and Kubernetes was too difficult to install currently on ARM. PiCluster will only build and run images from Dockerfile's on the host specified in the config file. This software will work on regular x86 hardware also and is not tied to ARM.



[![Build Status](https://travis-ci.org/picluster/picluster.svg?branch=master)](https://travis-ci.org/picluster/picluster) [![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](http://www.gnu.org/licenses/gpl-3.0)

![Pic](http://i.imgur.com/N7KBk6z.pngg)
![Pic](http://i.imgur.com/h63NLRI.png)

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

## Try PiCluster in Docker

We included a compose file to evaluate PiCluster easily on your laptop. Simply Install Docker on your laptop and do the following:

```
cd picluster
docker-compose up -d
```

Finally, in your web browser go to <http://127.0.0.1:3003>

## Server Installation

### 1\. Modify config.json with your desired layout.

This is the core config file for the web console, agent, and server.

You can run the server and agent on the same node since they are listening on different ports.

```
{
  "token":"1234567890ABCDEFGHJKLMNOP",
  "docker":"/root/docker",
  "server_port":"3000",
  "agent_port": "3001",
  "dockerRegistries": [
    "registry.fedoraproject.org"
  ],
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
  "container_host_constraints": [{
    "container": "mysql,192.168.0.101,192.168.0.102"
  }, {
    "container": "nginx,192.168.0.103,192.168.0.104"
  }],
  "commandlist": [{
  "SystemUpdate": "apt-get update;apt-get dist-upgrade -y"
  }],
  "vip_ip": "192.168.0.15",
  "autostart_containers": "enabled",
  "rsyslog_logfile": "/var/log/syslog",
  "rsyslog_host": "192.168.0.15",
  "automatic_heartbeat": "enabled",
  "heartbeat_interval": "300000",
  "kibana": "https://127.0.0.1:5601",
  "syslog": "dmesg",
  "web_username": "admin",
  "web_password":"admin",
  "web_connect":"192.168.0.101",
  "web_port":"3003",
  "elasticsearch": "http://127.0.0.1:9200",
  "elasticsearch_index": "picluster"
}
```

- layout - Each row contains an IP address of the node to run the container on, the name for the container image as it corresponds in the Docker folder, and the Docker run arguments.

- heartbeat - lists the node, container name, and the port to monitor. If the port can not be connected to, PiCluster will restart the failed image.

- token - A string you define a random string that will be used for authentication with the agents.

- agent_port - Defines the port that the agent will listen on.

- dockerRegistries - Defines additional third-party docker registries to pull images from

- docker - Defines where your Dockerfile's are. The format for the Docker folder should be like this: dockerfiles/imagename/Dockerfile

- web_username and web_password - Define's the username and password for the web interface.

- web_connect - IP address of a node running the server.

- web_port - Port that the web console listens on.

- automatic_heartbeat - Have the server do a heartbeat check on the services in the hb section of config.json. Valid values are: enabled or disabled.

- heartbeat_interval - How often to do the heartbeat check. Requires automatic_heartbeat to be enabled.

- syslog - The command used to read the logs on each host.

- vip - This section contains the agent nodes that the VIP can run on, the ethernet device on each node, and the slave node to run checks against.

- vip_ping_time - Time in ms to ping each slave. Each host should have different times.

- vip_ip - The Virtual IP address to use in the cluster

- autostart_containers - If set, the agent will connect to the server specififed in web_connect to start all of the containers.

- rsyslog_logfile - Location of the log file on the Rsyslog server

- rsyslog_host - The host running the PiCluster Agent with a Rsyslog server running or has access to the log drain file.

- commandlist - A list of commands to run on the nodes on demand from the web console under Operations -> Run Command.

- kibana - The is for the URL to Kibana to integrate the console inside PiCluster.

- elasticsearch - The URL for your Elasticsearch server.

- elasticsearch_index - The Elasticsearch index to use for PiCluster.

- container_host_constraints - This section enables automatic container failover. Requires automatic_heartbeat,heartbeat_interval, and hb set for the container.

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

## Configuring and using the client "pictl"

Pictl is a bash client to easily control the cluster. It will make all the HTTP requests using curl.

### 1\. The following variables need to be set in the file:

- server - IP address of the server
- port - PORT that the server uses
- token - The token used in the Server and Agent configs.

### 2\. Using the client

If a command has arguments ([image] or [container]), the commands will run cluster-wide. For example if you run "pictl delete" without specifying a container, all of the containers will be deleted.

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

## Using pm2 to init PiCluster on systemd

### 0\. Login as root to install pm2

```
sudo -i
```

### 1\. Install pm2

```
npm install -g pm2
```

### 2\. Install the pm2 systemd unit file

```
pm2 startup systemd
```

### 3\. Export the PiCluster config path (change the path accordingly)

```
export PICLUSTER_CONFIG='/opt/picluster/config.json'
```

### 4\. Start the server, agent, and webconsole scripts (change the path accordingly)

```
pm2 start /opt/picluster/server/server.js
pm2 start /opt/picluster/agent/agent.js
pm2 start /opt/picluster/web/webconsole.js
```

### 5\. Save the pm2 session to restart at boot

```
pm2 save
```

### 6\. Enable pm2 at boot:

```
systemctl enable pm2-root
```

### 7\. Reboot for the services to be started properly

```
Reboot
```

# Automatic Container failover to other hosts

This feature will automatically migrate a container to another host after three failed heartbeat attempts. It is recommended to use a Git repository for your Dockerfile's to easily build and move containers across nodes. For applications require data persistence using Docker volumes, it is best to use a distributed filesytem like GlusterFS or NFS so the container will have access to it's data on any host.

## Overview of the process.

When container_host_constraints is enabled in config.json, each failed heartbeat attempt to a container is logged. When three failed heartbeat attempts occur, the following action is taken:

- A new host is chosen randomly from the container map that you designated in container_host_constraints.
- The container is deleted on it's current host.
- The configuration file is updated with the new host layout.
- The container image is built and run on the new host.

## Prerequisites

1. Heartbeat configured in config.json (automatic_heartbeat,heartbeat_interval, and container added to heartbeat section)
2. container_host_constraints enabled in config.json

  ```
  "container_host_constraints": [],
  ```

  ### How to assign container_host_constraints to a container and hosts?

3. Manually in config.json

4. Once container_host_constraints is enabled in config.json, you can add the hosts when you choose "Add Container" in the web console.

## Sample configuration and Testing

The following config.json is a minimal configuration needed to try this out on your laptop. It consists of two nodes (localhost and 127.0.0.1) that will run Minio in a container. Currently, Minio is only on the node called localhost.

```
{
  "token": "1234567890ABCDEFGHJKLMNOP",
  "docker": "../docker",
  "server_port": "3000",
  "agent_port": "3001",
  "layout": [{
      "node": "localhost",
      "minio": "-p 9000:9000"
    },
    {
      "node": "127.0.0.1"
    }
  ],
  "hb": [{
      "node": "localhost",
      "minio": "9000"
    },
    {
      "node": "127.0.0.1"
    }
  ],
  "container_host_constraints": [
    {
      "container": "minio,localhost,127.0.0.1"
    }
  ],
  "automatic_heartbeat": "enabled",
  "heartbeat_interval": "300000",
  "web_username": "admin",
  "web_password": "admin",
  "web_connect": "127.0.0.1",
  "web_port": "3003"
}
```

Based on the sample above, PiCluster will check if Minio is running every 30 seconds. Since Minio is not created yet, the failover event should start after about 90 seconds.

# Authors and Contributions

Project created by Phillip Tribble. [LinkedIn](https://www.linkedin.com/in/philliptribble) , [Twitter](https://twitter.com/rusher81572)

PiCluster Logos by chzbacon.

## Images

This work, "Raspy Whale", is a derivative of "raspberry" by Chanut is Industries from the Noun Project used under CC BY, "Sperm Whale" by Oksana Latysheva from the Noun Project used under CC BY, and "Sperm Whale" by Oksana Latysheva from the Noun Project used under CC BY. "Raspy Whale" is licensed under CC BY by Jordan Sinn.
