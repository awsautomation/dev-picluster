var express = require('express');
var request = require('request');
var app = express();
var http = require('http');
var net = require('net');
var fs = require('fs');
var config = JSON.parse(fs.readFileSync('../config.json', 'utf8'));
var port = config.server_port;
var agentPort = config.agent_port;
var bodyParser = require('body-parser');
app.use(bodyParser());
//require('request-debug')(request);
var exec = require('child_process').exec;
var server = require("http").createServer(app);
var logFile = './log.txt';
var log = '';
var token = config.token;
var dockerFolder = config.docker;

if (config.automatic_heartbeat) {
    if (config.automatic_heartbeat.indexOf('enabled') > -1) {
        if (config.heartbeat_interval) {
            console.log('\nAutomatic Heartbeat Enabled. Will check every: ' + config.heartbeat_interval + ' ms.');
            automatic_heartbeat();
        } else {
            console.log('\nAutomatic Heartbeat Disabled: heartbeat_interval is not set.');
        }
    } else {
        console.log('\nAutomatic Heartbeat Disabled.');
    }
} else {
    console.log('\nAutomatic Heartbeat Disabled.');
}

function automatic_heartbeat() {
    if (config.automatic_heartbeat.indexOf('enabled') > -1) {
        setTimeout(function() {
            var options = {
                host: '127.0.0.1',
                path: '/hb?token=' + token,
                port: port
            };
            var request = http.get(options, function(response) {}).on('error', function(e) {
                console.error(e);
            });
            automatic_heartbeat();
        }, config.heartbeat_interval);
    } else {
        console.log('\nAutomatic Heartbeat Disabled.');
    }
}

app.get('/status', function(req, res) {
    var check_token = req.query['token'];
    if ((check_token != token) || (!check_token)) {
        res.end('\nError: Invalid Credentials')
    } else {
        var command = JSON.stringify({
            "command": 'docker ps',
            "token": token
        });
        for (var i = 0; i < config.layout.length; i++) {
            var node = config.layout[i].node;
            var responseString = '';

            //Runs a command on each node
            var options = {
                url: 'http://' + node + ':' + agentPort + '/run',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': command.length
                },
                body: command
            }

            request(options, function(error, response, body) {
                if (error) {
                    res.end("An error has occurred.");
                } else {
                    var results = JSON.parse(response.body);
                    addLog('\nNode:' + results.node + '\n' + results.output);
                }
            })

        }
        res.end('');
    }
});

app.get('/clearlog', function(req, res) {
    var check_token = req.query['token'];
    if ((check_token != token) || (!check_token)) {
        res.end('\nError: Invalid Credentials')
    } else {
        log = '';
        fs.writeFile(logFile, log, function(err) {
            if (err) {
                console.log('\nError while adding data to the log' + err);
            } else {
                res.end('');
            }
        });
    }
});


app.get('/nodes', function(req, res) {
    var check_token = req.query['token'];
    if ((check_token != token) || (!check_token)) {
        res.end('\nError: Invalid Credentials')
    } else {
        var command = JSON.stringify({
            "command": 'hostname',
            "token": token
        });
        for (var i = 0; i < config.layout.length; i++) {
            var node = config.layout[i].node;
            var responseString = '';

            //Runs a command on each node
            var options = {
                url: 'http://' + node + ':' + agentPort + '/run',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': command.length
                },
                body: command
            }

            request(options, function(error, response, body) {
                if (error) {
                    res.end(error);
                } else {
                    console.log(response);
                    var results = JSON.parse(response.body);
                    addLog('\nNode Online: ' + results.output);
                }
            })

        }
        res.end('');
    }
});


app.get('/images', function(req, res) {
    var check_token = req.query['token'];
    if ((check_token != token) || (!check_token)) {
        res.end('\nError: Invalid Credentials')
    } else {
        var command = JSON.stringify({
            "command": 'docker images',
            "token": token
        });
        for (var i = 0; i < config.layout.length; i++) {
            var node = config.layout[i].node;
            var responseString = '';

            //Runs a command on each node
            var options = {
                url: 'http://' + node + ':' + agentPort + '/run',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': command.length
                },
                body: command
            }

            request(options, function(error, response, body) {
                if (error) {
                    res.end("An error has occurred.");
                } else {
                    var results = JSON.parse(response.body);
                    addLog('\nNode:' + results.node + '\n' + results.output);
                }
            })

        }
        res.end('');
    }
});


function addLog(data) {
    log += data;
    fs.appendFile(logFile, log, function(err) {
        if (err) {
            console.log('\nError while adding data to the log' + err);
        }
    });
    log = '';
}

app.get('/build', function(req, res) {
    var check_token = req.query['token'];
    var image = '';
    if (req.query['image']) {
        image = req.query['image'];
    }
    if ((check_token != token) || (!check_token)) {
        res.end('\nError: Invalid Credentials')
    } else {
        var responseString = '';
        for (var i = 0; i < config.layout.length; i++) {
            var node = config.layout[i].node;
            for (var key in config.layout[i]) {
                if (config.layout[i].hasOwnProperty(key)) { //Builds the required images on each host
                    if (key.indexOf("node") > -1) {} else {

                        var command = JSON.stringify({
                            "command": 'docker build ' + dockerFolder + '/' + key + ' -t ' + key + ' -f ' + dockerFolder + '/' + key + '/Dockerfile',
                            "token": token
                        });

                        var options = {
                            url: 'http://' + node + ':' + agentPort + '/run',
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Content-Length': command.length
                            },
                            body: command
                        }
                        if (image) {
                            if (key.indexOf(image) > -1) {
                                request(options, function(error, response, body) {
                                    if (error) {
                                        res.end("An error has occurred.");
                                    } else {
                                        var results = JSON.parse(response.body);
                                        addLog('\n' + results.output);
                                    }
                                });
                            }
                        } else {
                            request(options, function(error, response, body) {
                                if (error) {
                                    res.end("An error has occurred.");
                                } else {
                                    var results = JSON.parse(response.body);
                                    addLog('\n' + results.output);
                                }
                            });
                        }
                    }
                }
            }
        }
        res.end('');
    }
});


app.get('/create', function(req, res) {
    var check_token = req.query['token'];
    container = '';

    if (req.query['container']) {
        container = req.query['container'];
    }

    if ((check_token != token) || (!check_token)) {
        res.end('\nError: Invalid Credentials')
    } else {
        var responseString = '';
        for (var i = 0; i < config.layout.length; i++) {
            var node = config.layout[i].node;
            for (var key in config.layout[i]) {
                if (config.layout[i].hasOwnProperty(key)) {
                    //Creates and runs the Docker images assigned to each host.
                    var command = JSON.stringify({
                        "command": 'docker run -d --name ' + key + ' ' + config.layout[i][key] + ' ' + key,
                        "token": token
                    });

                    var options = {
                        hostname: node,
                        port: agentPort,
                        path: '/run',
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Content-Length': command.length
                        }
                    }

                    if (container.indexOf('Everything') > -1) {
                        var request = http.request(options, function(response) {
                            response.on('data', function(data) {
                                responseString += data;
                            });
                            response.on('end', function(data) {
                                if (!responseString.body) {

                                } else {
                                    var results = JSON.parse(body.toString("utf8"));
                                    addLog(results.output);
                                }

                            });
                        }).on('error', function(e) {
                            console.error(e);
                        });
                        request.write(command);
                        req.end;
                    } else {
                        if (container.indexOf(key) > -1) {
                            var request = http.request(options, function(response) {
                                response.on('data', function(data) {
                                    responseString += data;
                                });
                                response.on('end', function(data) {
                                    if (!responseString.body) {

                                    } else {
                                        var results = JSON.parse(body.toString("utf8"));
                                        addLog(results.output);
                                    }

                                });
                            }).on('error', function(e) {
                                console.error(e);
                            });
                            request.write(command);
                            req.end;
                        }
                    }
                }
            }
        }
    }

    res.end('');
});

app.get('/start', function(req, res) {
    var check_token = req.query['token'];
    var container = '';
    if (req.query['container']) {
        container = req.query['container'];
    }

    if ((check_token != token) || (!check_token)) {
        res.end('\nError: Invalid Credentials')
    } else {
        var responseString = '';
        for (var i = 0; i < config.layout.length; i++) {
            var node = config.layout[i].node;
            for (var key in config.layout[i]) {
                if (config.layout[i].hasOwnProperty(key)) {
                    if (key.indexOf('node') > -1) {} else {
                        //Starts the Docker images assigned to each host.
                        var command = JSON.stringify({
                            "command": 'docker start ' + key,
                            "token": token
                        });
                        var options = {
                            url: 'http://' + node + ':' + agentPort + '/run',
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Content-Length': command.length
                            },
                            body: command
                        }
                        if (container.length > 1) {
                            if (key.indexOf(container) > -1) {
                                request(options, function(error, response, body) {
                                    if (error) {
                                        res.end("An error has occurred.");
                                    } else {
                                        var results = JSON.parse(response.body);
                                        addLog('\nStarting: ' + key + '\n' + results.output);
                                    }
                                });
                            }
                        } else {
                            request(options, function(error, response, body) {
                                if (error) {
                                    res.end("An error has occurred.");
                                } else {
                                    var results = JSON.parse(response.body);
                                    addLog('\nStarting: ' + key + '\n' + results.output);
                                }
                            });
                        }
                    }
                }
            }
        }
        res.end('');
    }
});

app.get('/stop', function(req, res) {
    var check_token = req.query['token'];
    var container = '';
    if (req.query['container']) {
        container = req.query['container'];
    }

    if ((check_token != token) || (!check_token)) {
        res.end('\nError: Invalid Credentials')
    } else {
        var responseString = '';
        for (var i = 0; i < config.layout.length; i++) {
            var node = config.layout[i].node;
            for (var key in config.layout[i]) {
                if (config.layout[i].hasOwnProperty(key)) {
                    if (key.indexOf('node') > -1) {} else {
                        //Starts the Docker images assigned to each host.
                        var command = JSON.stringify({
                            "command": 'docker stop ' + key,
                            "token": token
                        });
                        var options = {
                            url: 'http://' + node + ':' + agentPort + '/run',
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Content-Length': command.length
                            },
                            body: command
                        }
                        if (container) {
                            if (key.indexOf(container) > -1) {
                                request(options, function(error, response, body) {
                                    if (error) {
                                        res.end("An error has occurred.");
                                    } else {
                                        var results = JSON.parse(response.body);
                                        addLog('\nStopping: ' + key + '\n' + results.output);
                                    }
                                });
                            }
                        } else {
                            request(options, function(error, response, body) {
                                if (error) {
                                    res.end("An error has occurred.");
                                } else {
                                    var results = JSON.parse(response.body);
                                    addLog('\nStopping: ' + key + '\n' + results.output);
                                }
                            });
                        }
                    }
                }
            }
        }
        res.end('');
    }
});



app.get('/delete', function(req, res) {
    var check_token = req.query['token'];
    var container = '';
    if (req.query['container']) {
        container = req.query['container'];
    }

    if ((check_token != token) || (!check_token)) {
        res.end('\nError: Invalid Credentials')
    } else {
        var responseString = '';
        for (var i = 0; i < config.layout.length; i++) {
            var node = config.layout[i].node;
            for (var key in config.layout[i]) {
                if (config.layout[i].hasOwnProperty(key)) {
                    if (key.indexOf('node') > -1) {} else {
                        //Starts the Docker images assigned to each host.
                        var command = JSON.stringify({
                            "command": 'docker rm -f ' + key,
                            "token": token
                        });
                        var options = {
                            url: 'http://' + node + ':' + agentPort + '/run',
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Content-Length': command.length
                            },
                            body: command
                        }
                        if (container) {
                            if (key.indexOf(container) > -1) {
                                request(options, function(error, response, body) {
                                    if (error) {
                                        res.end("An error has occurred.");
                                    } else {
                                        var results = JSON.parse(response.body);
                                        addLog('\nStopping: ' + key + '\n' + results.output);
                                    }
                                });
                            }
                        } else {
                            request(options, function(error, response, body) {
                                if (error) {
                                    res.end("An error has occurred.");
                                } else {
                                    var results = JSON.parse(response.body);
                                    addLog('\nStopping: ' + key + '\n' + results.output);
                                }
                            });
                        }
                    }
                }
            }
        }
        res.end('');
    }
});

app.get('/restart', function(req, res) {
    var check_token = req.query['token'];
    var selected_container = '';
    if (req.query['container']) {
        selected_container = req.query['container'];
    }

    if ((check_token != token) || (!check_token)) {
        res.end('\nError: Invalid Credentials')
    } else {
        var responseString = '';
        for (var i = 0; i < config.layout.length; i++) {
            var node = config.layout[i].node;
            for (var key in config.layout[i]) {
                if (config.layout[i].hasOwnProperty(key)) {
                    if (key.indexOf('node') > -1) {} else {
                        //Starts the Docker images assigned to each host.
                        var command = JSON.stringify({
                            "command": 'docker restart ' + key,
                            "token": token
                        });
                        var options = {
                            url: 'http://' + node + ':' + agentPort + '/run',
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Content-Length': command.length
                            },
                            body: command
                        }
                        if (selected_container) {
                            if (key.indexOf(selected_container) > -1) {
                                request(options, function(error, response, body) {
                                    if (error) {
                                        res.end("An error has occurred.");
                                    } else {
                                        var results = JSON.parse(response.body);
                                        addLog('\nStopping: ' + key + '\n' + results.output);
                                    }
                                });
                            }
                        } else {
                            request(options, function(error, response, body) {
                                if (error) {
                                    res.end("An error has occurred.");
                                } else {
                                    var results = JSON.parse(response.body);
                                    addLog('\nStopping: ' + key + '\n' + results.output);
                                }
                            });
                        }
                    }
                }
            }
        }
        res.end('');
    }
});




app.post('/listcontainers', function(req, res) {
    var command = req.body.command;
    var node = req.body.node;
    var check_token = req.body.token;
    var output = [];
    if ((check_token != token) || (!check_token)) {
        res.end('\nError: Invalid Credentials')
    } else {
        for (var i = 0; i < config.layout.length; i++) {
            for (var key in config.layout[i]) {
                if (config.layout[i].hasOwnProperty(key)) {
                    container = key;
                    node = config.layout[i].node;
                    port = config.layout[i][key];
                    if (port != node) {
                        output.push(container);
                    }
                }
            }
        }
        res.send(output);
    }
});

app.post('/listcontainers', function(req, res) {
    var command = req.body.command;
    var node = req.body.node;
    var check_token = req.body.token;
    var output = [];
    if ((check_token != token) || (!check_token)) {
        res.end('\nError: Invalid Credentials')
    } else {
        for (var i = 0; i < config.layout.length; i++) {
            for (var key in config.layout[i]) {
                if (config.layout[i].hasOwnProperty(key)) {
                    container = key;
                    node = config.layout[i].node;
                    port = config.layout[i][key];
                    if (port != node) {
                        output.push(container);
                    }
                }
            }
        }
        res.send(output);
    }
});

app.post('/listnodes', function(req, res) {
    var command = req.body.command;
    var node = req.body.node;
    var check_token = req.body.token;
    var output = [];
    if ((check_token != token) || (!check_token)) {
        res.end('\nError: Invalid Credentials')
    } else {
        for (var i = 0; i < config.layout.length; i++) {
            for (var key in config.layout[i]) {
                if (config.layout[i].hasOwnProperty(key)) {
                    container = key;
                    node = config.layout[i].node;
                    var port_check = config.layout[i][key];
                    if (port_check != node) {
                        output.push(node);
                    }
                }
            }
        }
        res.send(output);
    }
});

app.post('/exec', function(req, res) {
    var check_token = req.body.token;
    var selected_node = '';
    if (req.body.node) {
        selected_node = req.body.node;
    }

    if (selected_node.indexOf('*') > -1) {
        var selected_node = '';
    }

    if ((check_token != token) || (!check_token)) {
        res.end('\nError: Invalid Credentials')
    } else {
        var command = JSON.stringify({
            "command": req.body.command,
            "token": token
        });

        for (var i = 0; i < config.layout.length; i++) {
            var node = config.layout[i].node;
            var responseString = '';

            var options = {
                url: 'http://' + node + ':' + agentPort + '/run',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': command.length
                },
                body: command
            }

            if (selected_node.length == 0) {
                request(options, function(error, response, body) {
                    if (error) {
                        res.end("An error has occurred.");
                    } else {
                        var results = JSON.parse(response.body);
                        addLog('\nNode:' + results.node + '\n' + results.output);
                    }
                });
            }
            if (selected_node.indexOf(node) > -1) {
                request(options, function(error, response, body) {
                    if (error) {
                        res.end("An error has occurred.");
                    } else {
                        var results = JSON.parse(response.body);
                        addLog('\nNode:' + results.node + '\n' + results.output);
                    }
                });
            }
            res.end('');
        }
    }
});

function hb_check(node, container_port, container) {
    var client = new net.Socket();

    client.connect(container_port, node, container, function() {});

    client.on('end', function(data) {
        addLog('\nA Heart Beat Check Just Ran.');
    });

    client.on('error', function(data) {
        addLog('\n' + container + ' failed on: ' + node);

        var options = {
            host: '127.0.0.1',
            path: '/restart?node=' + node + '&container=' + container + '&token=' + token,
            port: port
        };

        var request = http.get(options, function(response) {}).on('error', function(e) {
            console.error(e);
        });
        client.destroy();
    });
};

app.get('/hb', function(req, res) {
    var check_token = req.query['token'];
    if ((check_token != token) || (!check_token)) {
        res.end('\nError: Invalid Credentials')
    } else {
        var responseString = '';
        var node = '';
        var port = ''
        var container = '';
        for (var i = 0; i < config.hb.length; i++) {
            for (var key in config.hb[i]) {
                if (config.hb[i].hasOwnProperty(key)) {
                    container = key;
                    node = config.hb[i].node;
                    port = config.hb[i][key];
                    if (port != node) {
                        hb_check(node, port, container);
                    }
                }
            }
        }
        res.end('');
    }
});

function gatherLog(callback) {
    callback(log);
}

app.get('/log', function(req, res) {
    var check_token = req.query['token'];
    if ((check_token != token) || (!check_token)) {
        res.end('\nError: Invalid Credentials')
    } else {
        res.sendFile(__dirname + '/log.txt');
    }
});

app.get('/reloadconfig', function(req, res) {
    var check_token = req.query['token'];
    if ((check_token != token) || (!check_token)) {
        res.end('\nError: Invalid Credentials')
    } else {
        config = JSON.parse(fs.readFileSync('../config.json', 'utf8'));
        token = config.token;
        dockerFolder = config.docker;
        addLog('\nReloading Config.json\n');
        res.end('');
    }
});

app.get('/getconfig', function(req, res) {
    var check_token = req.query['token'];
    if ((check_token != token) || (!check_token)) {
        res.end('\nError: Invalid Credentials')
    } else {
        res.send(config);
    }
});

app.get('/killvip', function(req, res) {
    var check_token = req.query['token'];
    if ((check_token != token) || (!check_token)) {
        res.end('\nError: Invalid Credentials')
    } else {
        var responseString = '';
        for (var i = 0; i < config.vip.length; i++) {
            var node = config.vip[i].node;
            for (var key in config.vip[i]) {
                if (config.vip[i].hasOwnProperty(key)) { //Builds the required images on each host
                    var token_body = JSON.stringify({
                        "token": token
                    });

                    var options = {
                        url: 'http://' + node + ':' + agentPort + '/killvip',
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Content-Length': token_body.length
                        },
                        body: token_body
                    }

                    request(options, function(error, response, body) {
                        if (error) {
                            res.end("An error has occurred.");
                        }
                    })
                }
            }
        }
        res.end('');
    }
});

app.post('/updateconfig', function(req, res) {
    var payload = req.body.payload;
    var check_token = req.body.token;
    if ((check_token != token) || (!check_token)) {
        res.end('\nError: Invalid Credentials')
    } else {
        fs.writeFile('../config.json', payload, function(err) {
            if (err) {
                console.log('\nError while writing config.' + err);
            } else {
                res.end('Updated Configuration. Please reload it now for changes to take effect.');
            }
        });
    }
});


server.listen(port, function() {
    console.log('Listening on port %d', port);
});
