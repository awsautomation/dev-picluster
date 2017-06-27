var http = require('http');
var express = require('express');
var request = require('request');
var fs = require('fs');
var config = JSON.parse(fs.readFileSync(PICLUSTER_CONFIG, 'utf8'));
var port = config.agent_port;
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser());
var exec = require('child_process').exec;
var server = require("http").createServer(app);
var node = 'null';
var os = require('os');
var vip = ''
var vip_slave = '';
var vip_device = '';
var ip_add_command = '';
var ip_delete_command = '';
var vip_ping_time = '';
var token = config.token;

exec('hostname', function(error, stdout, stderr) {
    if (error) {
        node = stderr;
    } else {
        node = stdout;
    }
});

if(config.autostart_containers) {
  console.log('Starting all the containers.....');
  var options = {
      host: config.web_connect,
      path: '/start?token=' + token + '&container=*',
      port: config.server_port
  };
  var autostart_request = http.get(options, function(response) {}).on('error', function(e) {
      console.error(e);
  });

}

if (config.vip_ip) {
    var vip = config.vip_ip;
    if (config.vip) {
        for (var i = 0; i < config.vip.length; i++) {
            var node = config.vip[i].node;
            for (var key in config.vip[i]) {
                if (config.vip[i].hasOwnProperty(key)) {
                    var interfaces = require('os').networkInterfaces();
                    for (var devName in interfaces) {
                        var iface = interfaces[devName];
                        for (var h = 0; h < iface.length; h++) {
                            var alias = iface[h];
                            if (alias.address == node) {
                                vip_slave = config.vip[i].slave;
                                vip_eth_device = config.vip[i].vip_eth_device;
                                ip_add_command = 'ip addr add ' + config.vip_ip + ' dev ' + vip_eth_device;
                                ip_delete_command = 'ip addr del ' + config.vip_ip + '/32 dev ' + vip_eth_device;
                                vip_ping_time = config.vip[i].vip_ping_time;
                                var exec = require('child_process').exec;
                                var cmd = ip_delete_command;
                                exec(cmd, function(error, stdout, stderr) {
                                    send_ping();
                                });
                            }
                        }
                    }
                }
            }
        }
    }
}

function send_ping() {
    setTimeout(function() {
        var responseString = "";
        var token_body = JSON.stringify({
            "token": token
        });
        var options = {
            url: 'http://' + vip_slave + ':' + port + '/pong',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': token_body.length
            },
            body: token_body
        };

        request(options, function(error, response, body) {
            var found_vip = false;

            if ((error || response.statusCode != "200")) {
                var exec = require('child_process').exec;
                var cmd = ip_add_command;
                //console.log("\nUnable to connect to: " + vip_slave + ". Bringing up VIP on this host.");
                exec(cmd, function(error, stdout, stderr) {});
            } else {

                var interfaces = require('os').networkInterfaces();
                for (var devName in interfaces) {
                    var iface = interfaces[devName];
                    for (var i = 0; i < iface.length; i++) {
                        var alias = iface[i];
                        if (alias.address == vip) {
                            found_vip = true;
                        }
                    }
                }
                var json_object = JSON.parse(body);

                if (json_object.vip_detected == "false" && found_vip == false) {
                    console.log("\nVIP not detected on either machine. Bringing up the VIP on this host.");
                    var exec = require('child_process').exec;
                    var cmd = ip_add_command;
                    exec(cmd, function(error, stdout, stderr) {
                        if (error) {
                            console.log(error);
                        }
                    });
                }
                if ((json_object.vip_detected == "true" && found_vip == true)) {
                    console.log("\nVIP detected on boths hosts! Stopping the VIP on this host.");
                    var exec = require('child_process').exec;
                    var cmd = ip_delete_command;
                    exec(cmd, function(error, stdout, stderr) {
                        if (error) {
                            console.log(error);
                        }
                    });
                }
                //console.log('\n' + vip_slave + ' is alive');
            }
        });
        send_ping();
    }, vip_ping_time);
};

app.get('/rsyslog', function(req, res) {
  var check_token = req.query['token'];
  if ((check_token != token) || (!check_token)) {
      res.end('\nError: Invalid Credentials')
  } else {
    res.sendFile(config.rsyslog_logfile);
  }
});

app.post('/killvip', function(req, res) {
    var check_token = req.body.token;
    if (!check_token == token) {
        res.end('\nError: Invalid Credentials')
    } else {
        if (config.vip_ip) {
            var exec = require('child_process').exec;
            var cmd = ip_delete_command;
            exec(cmd, function(error, stdout, stderr) {
                if (error) {
                    console.log(error);
                } else {
                    res.end('\nCompleted.');
                }
            });
        }
    }
});

app.post('/pong', function(req, res) {
    var check_token = req.body.token;
    if (check_token == token) {
        var responseString = "";
        var vip_status = "false";
        var interfaces = require('os').networkInterfaces();
        for (var devName in interfaces) {
            var iface = interfaces[devName];
            for (var i = 0; i < iface.length; i++) {
                var alias = iface[i];
                if (alias.address == vip) {
                    vip_status = "true";
                }
            }
        }
        var body = {
            "vip_detected": vip_status
        };
        res.send(body);
    } else {
        res.status(500).send('Something broke!')
    }
});

app.post('/run', function(req, res) {
    var output = {
        "output": "",
        "node": node
    };

    var cmd = req.body.command;
    var check_token = req.body.token;
    if (check_token == token) {
        exec(cmd, function(error, stdout, stderr) {
            if (error) {
                output.output = stderr;
                res.send(output);
            } else {
                output.output = stdout;
                res.send(output);
            }
        });
    } else {
        res.send({
            output: "Not Authorized to connect to this agent!"
        });
    }
});

server.listen(port, function() {
    console.log('Listening on port %d', port);
});
