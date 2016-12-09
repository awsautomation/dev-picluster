var http = require('http');
var express = require('express');
var request = require('request');
var fs = require('fs');
var config = JSON.parse(fs.readFileSync('../config.json', 'utf8'));
var port = config.agent_port;
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser());
require('request-debug')(request);
var exec = require('child_process').exec;
var server = require("http").createServer(app);
var node = 'null';
var os = require('os');
var vip = ''
var vip_slave = '';
var vip_device = '';
var vip_port = '';
var ip_add_command = '';
var ip_delete_command ='';

exec('hostname', function(error, stdout, stderr) {
    if (error) {
        node = stderr;
    } else {
        node = stdout;
    }
});

if ((config.vip_ip) && (config.vip_ping_time) && (config.vip_ping_time)) {
    var vip = config.vip_ip;
    var vip_ping_time = config.vip_ping_time;
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
                            vip_port = config.vip[i].vip_port;
                            vip_eth_device = config.vip[i].vip_eth_device;
                            ip_add_command = 'ip addr add ' + config.vip_ip + ' dev ' + vip_eth_device;
                            ip_delete_command = 'ip addr del ' + config.vip_ip + ' dev ' + vip_eth_device;
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
    console.log('\nVirtual IP Manager Running: ' + config.vip_ip);
}

function send_ping() {
    setTimeout(function() {
        var responseString = "";
        var options = {
            url: 'http://' + vip_slave + ':' + vip_port + '/pong',
            method: 'POST'
        };

        request(options, function(error, response, body) {
            var found_vip = false;

            if ((error || response.statusCode != "200")) {
                var exec = require('child_process').exec;
                var cmd = ip_add_command;
                console.log("\nUnable to connect to: " + vip_slave + ". Bringing up VIP on this host.");
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
                console.log('\n' + vip_slave + ' is alive');
            }
        });
        send_ping();
    }, config.vip_ping_time);
};

app.post('/pong', function(req, res) {
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
});

app.post('/run', function(req, res) {
    var token = config.token;

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
