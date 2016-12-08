var http = require('http');
var fs = require('fs');
var config = JSON.parse(fs.readFileSync('../config.json', 'utf8'));
var randomstring = require("randomstring");
var express = require('express');
var request = require('request');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser());
//require('request-debug')(request);
var port = config.web_port;
var lineReader = require('line-reader');
var webconsole = require("http").createServer(app);
var token = config.token;
var user = config.web_username;
var password = config.web_password;
var server = config.web_connect;
var server_port = config.server_port;
var syslog = "";
var request_timeout = 5000;

if (config.syslog) {
    syslog = config.syslog;
}

app.get('/sandbox', function(req, res) {
    var check_token = req.query['token'];
    if ((check_token != token) || (!check_token)) {
        res.end('\nError: Invalid Credentials')
    } else {
        res.sendFile(__dirname + '/exec.html');
    }
});

app.get('/editconfig', function(req, res) {
    var check_token = req.query['token'];
    if ((check_token != token) || (!check_token)) {
        res.end('\nError: Invalid Credentials')
    } else {
        res.sendFile(__dirname + '/editconfig.html');
    }
});

app.post('/sendconfig', function(req, res) {
    var check_token = req.body.token;
    var payload = req.body.payload;
    if ((check_token != token) || (!check_token)) {
        res.end('\nError: Invalid Credentials')
    } else {
        var responseString = '';
        var command = JSON.stringify({
            "payload": payload,
            "token": token
        });

        var options = {
            url: 'http://' + server + ':' + server_port + '/updateconfig',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': command.length
            },
            body: command,
            token: token
        }

        request(options, function(error, response, body) {
            if (error) {
                res.end(error);
            } else {
                display_log(function(data) {
                    res.end(data);
                });
            }
        })
    }
});

app.post('/', function(req, res) {
    var get_user = req.body.username;
    var get_pass = req.body.password;

    if (get_user == user) {
        if (get_pass == password) {
            var auth_data = {
                "token": token,
                "syslog": syslog
            };
            res.send(auth_data);
        } else {
            res.end('Access Denied!');
        }
    } else {
        res.end('Access Denied!');
    }
});


app.post('/exec', function(req, res) {
    var check_token = req.body.token
    if ((check_token != token) || (!check_token)) {
        res.end('\nError: Invalid Credentials')
    } else {
        var responseString = '';
        var command = JSON.stringify({
            "command": req.body.command,
            "token": token
        });

        var options = {
            url: 'http://' + server + ':' + server_port + '/exec',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': command.length
            },
            body: command,
            token: token
        }

        request(options, function(error, response, body) {
            if (error) {
                res.end(error);
            } else {
                display_log(function(data) {
                    res.end(data);
                });
            }
        })
    }
});

function display_log(callback) {
    var responseString = '';
    clear_log(function(data) {
        setTimeout(function() {
            var responseString = '';
            request('http://' + server + ':' + server_port + '/log?' + 'token=' + token, function(error, response, body) {
                if (!error && response.statusCode == 200) {
                    callback(body);
                } else {
                    callback('\nError connecting with server.');
                }
            })
        }, request_timeout);
    });
}

function clear_log(callback) {

    var responseString = '';
    request('http://' + server + ':' + server_port + '/clearlog?' + 'token=' + token, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            callback('');
        } else {
            console.log('\nError clearing log: ' + error);
        }
    })
}

app.get('/create', function(req, res) {
    var check_token = req.query['token'];
    if ((check_token != token) || (!check_token)) {
        res.end('\nError: Invalid Credentials')
    } else {
        var responseString = '';
        request('http://' + server + ':' + server_port + '/create?' + 'token=' + token, function(error, response, body) {
            if (!error && response.statusCode == 200) {
                display_log(function(data) {
                    res.end('\nSent request to run all the containers in the configuration file.');
                });
            } else {
                res.end('\nError connecting with server.');
            }
        })
    }
});

app.get('/status', function(req, res) {
    var check_token = req.query['token'];
    if ((check_token != token) || (!check_token)) {
        res.end('\nError: Invalid Credentials')
    } else {
        var responseString = '';
        request('http://' + server + ':' + server_port + '/status?' + 'token=' + token, function(error, response, body) {
            if (!error && response.statusCode == 200) {
                display_log(function(data) {
                    res.end(data);
                });
            } else {
                res.end('\nError connecting with server.');
            }
        })
    }
});

app.get('/reloadconfig', function(req, res) {
    var check_token = req.query['token'];
    if ((check_token != token) || (!check_token)) {
        res.end('\nError: Invalid Credentials')
    } else {
        var responseString = '';
        request('http://' + server + ':' + server_port + '/reloadconfig?' + 'token=' + token, function(error, response, body) {
            if (!error && response.statusCode == 200) {
                config = JSON.parse(fs.readFileSync('../config.json', 'utf8'));
                token = config.token;
                user = config.web_username;
                password = config.web_password;
                server = config.web_connect;
                server_port = config.server_port;
                res.end('\nRequest to update configuration succeeded.');
            } else {
                res.end('\nError connecting with server.' + error);
            }
        })
    }
});

app.get('/images', function(req, res) {
    var check_token = req.query['token'];
    if ((check_token != token) || (!check_token)) {
        res.end('\nError: Invalid Credentials')
    } else {
        var responseString = '';
        request('http://' + server + ':' + server_port + '/images?' + 'token=' + token, function(error, response, body) {
            if (!error && response.statusCode == 200) {
                display_log(function(data) {
                    res.end(data);
                });
            } else {
                res.end('\nError connecting with server.');
            }
        })
    }
});


app.get('/build', function(req, res) {
    var check_token = req.query['token'];
    if ((check_token != token) || (!check_token)) {
        res.end('\nError: Invalid Credentials')
    } else {
        var responseString = '';
        request('http://' + server + ':' + server_port + '/build?' + 'token=' + token, function(error, response, body) {
            if (!error && response.statusCode == 200) {
                display_log(function(data) {
                    res.end(data);
                });
            } else {
                res.end('\nError connecting with server.');
            }
        })
    }
});


app.get('/hb', function(req, res) {
    var check_token = req.query['token'];
    if ((check_token != token) || (!check_token)) {
        res.end('\nError: Invalid Credentials')
    } else {
        var responseString = '';
        request('http://' + server + ':' + server_port + '/hb?' + 'token=' + token, function(error, response, body) {
            if (!error && response.statusCode == 200) {
                display_log(function(data) {
                    res.end(data);
                });
            } else {
                res.end('\nError connecting with server.');
            }
        })
    }
});



app.get('/stop', function(req, res) {
    var check_token = req.query['token'];
    if ((check_token != token) || (!check_token)) {
        res.end('\nError: Invalid Credentials')
    } else {
        var responseString = '';
        request('http://' + server + ':' + server_port + '/stop?' + 'token=' + token, function(error, response, body) {
            if (!error && response.statusCode == 200) {
                display_log(function(data) {
                    res.end(data);
                });
            } else {
                res.end('\nError connecting with server.');
            }
        })
    }
});


app.get('/start', function(req, res) {
    var check_token = req.query['token'];
    if ((check_token != token) || (!check_token)) {
        res.end('\nError: Invalid Credentials')
    } else {
        var responseString = '';
        request('http://' + server + ':' + server_port + '/start?' + 'token=' + token, function(error, response, body) {
            if (!error && response.statusCode == 200) {
                display_log(function(data) {
                    res.end(data);
                });
            } else {
                res.end('\nError connecting with server.');
            }
        })
    }
});

app.get('/log', function(req, res) {
    var check_token = req.query['token'];
    if ((check_token != token) || (!check_token)) {
        res.end('\nError: Invalid Credentials')
    } else {
        var responseString = '';
        request('http://' + server + ':' + server_port + '/log?' + 'token=' + token, function(error, response, body) {
            if (!error && response.statusCode == 200) {
                res.end(body);
            } else {
                res.end('\nError connecting with server.');
            }
        })
    }
});


app.get('/nodes', function(req, res) {
    var check_token = req.query['token'];
    if ((check_token != token) || (!check_token)) {
        res.end('\nError: Invalid Credentials')
    } else {
        var responseString = '';
        request('http://' + server + ':' + server_port + '/nodes?' + 'token=' + token, function(error, response, body) {
            if (!error && response.statusCode == 200) {
                display_log(function(data) {
                    res.end(data);
                });
            } else {
                res.end('\nError connecting with server. ' + error);
            }
        })
    }
});

app.get('/getconfig', function(req, res) {
    var check_token = req.query['token'];
    if ((check_token != token) || (!check_token)) {
        res.end('\nError: Invalid Credentials')
    } else {
        var responseString = '';
        request('http://' + server + ':' + server_port + '/getconfig?' + 'token=' + token, function(error, response, body) {
            if (!error && response.statusCode == 200) {
                res.end(body);
            } else {
                res.end('Error connecting with server. ' + error);
            }
        })
    }
});



app.get('/', function(req, res) {
    var responseString = "";
    res.sendFile(__dirname + '/main.html');
});

app.get('/blank', function(req, res) {
    res.end('');
});

app.get('/nodes.html', function(req, res) {
    res.sendFile(__dirname + '/nodes.html');
});

app.get('/running.html', function(req, res) {
    res.sendFile(__dirname + '/running.html');
});

app.get('/background', function(req, res) {
    res.sendFile(__dirname + '/background.jpg');
});

app.get('/reloadconfig.html', function(req, res) {
    res.sendFile(__dirname + '/reloadconfig.html');
});

app.get('/build.html', function(req, res) {
    res.sendFile(__dirname + '/build.html');
});

app.get('/logo.png', function(req, res) {
    res.sendFile(__dirname + '/logo.png');
});

app.get('/images.html', function(req, res) {
    res.sendFile(__dirname + '/images.html');
});

app.get('/create.html', function(req, res) {
    res.sendFile(__dirname + '/create.html');
});

app.get('/log.html', function(req, res) {
    res.sendFile(__dirname + '/log.html');
});

app.get('/start.html', function(req, res) {
    res.sendFile(__dirname + '/start.html');
});

app.get('/stop.html', function(req, res) {
    res.sendFile(__dirname + '/stop.html');
});

app.get('/hb.html', function(req, res) {
    res.sendFile(__dirname + '/hb.html');
});

app.get('/syslog.html', function(req, res) {
    res.sendFile(__dirname + '/syslog.html');
});

app.get('/style.css', function(req, res) {
    res.sendFile(__dirname + '/style.css');
});


webconsole.listen(port, function() {
    console.log('Listening on port %d', webconsole.address().port);
});
