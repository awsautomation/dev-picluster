var http = require('http');
var net = require('net');
var port =  process.env.PORT;
var express = require('express');
var agentPort = process.env.AGENTPORT;
var request = require('request');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser());
//require('request-debug')(request);
var fs = require('fs');
var exec = require('child_process').exec;
var config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
var server = require("http").createServer(app);
var logFile = './log.txt';
var log = '';
var token = config.token;
var dockerFolder = config.docker;

app.get('/status', function(req, res){
  var check_token = req.query['token'];
  if((check_token != token) || (!check_token)) {
    res.end('\nError: Invalid Credentials')
  } else {
    var command = JSON.stringify({ "command": 'docker ps', "token": token});
    for(var i = 0; i < config.layout.length; i++) {
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

app.get('/clearlog', function(req, res){
  var check_token = req.query['token'];
  if((check_token != token) || (!check_token)) {
    res.end('\nError: Invalid Credentials')
  } else {
    log = '';
    fs.writeFile(logFile, log, function(err) {
      if(err) {
        console.log('\nError while adding data to the log' + err);
      } else {
        res.end('');
      }
    });
  }
});


app.get('/nodes', function(req, res){
  var check_token = req.query['token'];
  if((check_token != token) || (!check_token)) {
    res.end('\nError: Invalid Credentials')
  } else {
    var command = JSON.stringify({ "command": 'hostname', "token": token});
    for(var i = 0; i < config.layout.length; i++) {
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
          res.end('\nRegistered Node:' + node + '\nStatus: disconnected');
        } else {
          console.log(response);
          var results = JSON.parse(response.body);
          addLog('\nRegistered Node:' + results.output);
        }
      })

    }
    res.end('');
  }
});


app.get('/images', function(req, res){
  var check_token = req.query['token'];
  if((check_token != token) || (!check_token)) {
    res.end('\nError: Invalid Credentials')
  } else {
    var command = JSON.stringify({ "command": 'docker images', "token": token});
    for(var i = 0; i < config.layout.length; i++) {
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
          addLog('\nNode:' + node + '\n' +  results.output);
        }
      })

    }
    res.end('');
  }
});


function addLog(data){
  log += data;
  fs.appendFile(logFile, log, function(err) {
    if(err) {
      console.log('\nError while adding data to the log' + err);
    }
  });
  log = '';
}

app.get('/build', function(req, res){
  var check_token = req.query['token'];
  if((check_token != token) || (!check_token)) {
    res.end('\nError: Invalid Credentials')
  } else {
    var responseString = '';
    for(var i = 0; i < config.layout.length; i++) {
      var node = config.layout[i].node;
      for (var key in config.layout[i]) {
        if (config.layout[i].hasOwnProperty(key)) {    //Builds the required images on each host
          if(key.indexOf("node") > -1){
          } else {
            var command = JSON.stringify({ "command": 'docker build ' + dockerFolder + '/' + key + ' -t ' + key + ' -f ' + dockerFolder + '/' + key + '/Dockerfile', "token": token});

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
                addLog('\n' + results.output);
              }
            })
          }
        }
      }
    }
    res.end('');
  }
});


app.get('/create', function(req, res){
  var check_token = req.query['token'];
  if((check_token != token) || (!check_token)) {
    res.end('\nError: Invalid Credentials')
  } else {
    var responseString = '';
    for(var i = 0; i < config.layout.length; i++) {
      var node = config.layout[i].node;
      for (var key in config.layout[i]) {
        if (config.layout[i].hasOwnProperty(key)) {
          //Creates and runs the Docker images assigned to each host.
          var command = JSON.stringify({ "command": 'docker run -d --name ' + key +  ' ' + config.layout[i][key], "token": token});
          var options = {
            hostname: node,
            port    : agentPort,
            path    : '/run',
            method  : 'POST',
            headers : {
              'Content-Type': 'application/json',
              'Content-Length': command.length
            }
          }
          var request = http.request(options, function(response){
            response.on('data', function(data) {
              responseString += data;
            });
            response.on('end', function(data){
              if(!responseString.body) {

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
    res.end('');
  }
});

app.get('/start', function(req, res){
  var check_token = req.query['token'];
  if((check_token != token) || (!check_token)) {
    res.end('\nError: Invalid Credentials')
  } else {
    var responseString = '';
    for(var i = 0; i < config.layout.length; i++) {
      var node = config.layout[i].node;
      for (var key in config.layout[i]) {
        if (config.layout[i].hasOwnProperty(key)) {
          if(key.indexOf('node') > -1) {
          } else {
            //Starts the Docker images assigned to each host.
            var command = JSON.stringify({ "command": 'docker start ' + key, "token": token});
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
                addLog('\nStarting: ' + key + '\n' + results.output);
              }
            })
          }
        }
      }
    }
    res.end('');
  }
});

app.get('/stop', function(req, res){
  var check_token = req.query['token'];
  if((check_token != token) || (!check_token)) {
    res.end('\nError: Invalid Credentials')
  } else {
    var responseString = '';
    for(var i = 0; i < config.layout.length; i++) {
      var node = config.layout[i].node;
      for (var key in config.layout[i]) {
        if (config.layout[i].hasOwnProperty(key)) {
          if(key.indexOf('node') > -1) {
          } else {
            //Starts the Docker images assigned to each host.
            var command = JSON.stringify({ "command": 'docker stop ' + key, "token": token});
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
                addLog('\nStopping: ' + key + '\n' + results.output);
              }
            })
          }
        }
      }
    }
    res.end('');
  }
});

app.get('/restart', function(req, res){
  var check_token = req.query['token'];
  if((check_token != token) || (!check_token)) {
    res.end('\nError: Invalid Credentials')
  } else {
    var node = req.query['node'];
    var container = req.query['container'];
    var responseString = '';
    var command = JSON.stringify({ "command": 'docker restart ' + container, "token": token});

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
        addLog('\nRestarting: ' + container + '\n' + results.output);
      }
    })
  }
});



app.post('/exec', function(req, res){
  var command = JSON.stringify({ "command": req.body.command, "token": token});
  for(var i = 0; i < config.layout.length; i++) {
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
});

function hb_check(node, container_port, container){
  var client = new net.Socket();

  client.connect(container_port, node, container, function() {
  });

  client.on('end', function(data) {
      addLog('\nA Heart Beat Check Just Run.');
  });

  client.on('error', function(data) {
    addLog('\n' + container + ' failed on: ' + node);

    var options = {
      host: '127.0.0.1',
      path: '/restart?node=' + node + '&container=' + container + '&token=' + token,
      port: port
    };

    var request = http.get(options, function(response){
    }).on('error', function(e) {
      console.error(e);
    });
    client.destroy();
  });

};

app.get('/hb', function(req, res){
  var check_token = req.query['token'];
  if((check_token != token) || (!check_token)) {
    res.end('\nError: Invalid Credentials')
  } else {
    var responseString = '';
    var node = '';
    var port = ''
    var container = '';
    for(var i = 0; i < config.hb.length; i++) {
      for (var key in config.hb[i]) {
        if (config.hb[i].hasOwnProperty(key)) {
          container = key;
          node = config.hb[i].node;
          port = config.hb[i][key];
          if(port != node){
            hb_check(node, port, container);
          }
        }
      }
    }
    res.end('');
  }
});

function gatherLog (callback){
  callback(log);
}

app.get('/log', function(req, res){
  var check_token = req.query['token'];
  if((check_token != token) || (!check_token)) {
    res.end('\nError: Invalid Credentials')
  } else {
    res.sendFile(__dirname + '/log.txt');
  }
});

app.get('/reloadconfig', function(req, res){
  var check_token = req.query['token'];
  if((check_token != token) || (!check_token)) {
    res.end('\nError: Invalid Credentials')
  } else {
    config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    addLog('\nReloading Config.json\n\n');
    res.end('');
  }
});

server.listen(port, function() {
  console.log('Listening on port %d', port);
});
