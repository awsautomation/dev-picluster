var http = require('http');
var config = JSON.parse(fs.readFileSync('../config.json', 'utf8'));
var fs = require('fs');
var port =  config.agent_port;
var express = require('express');
var request = require('request');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser());
require('request-debug')(request);
var exec = require('child_process').exec;
var server = require("http").createServer(app);
var node = 'null';

  exec('hostname', function(error, stdout, stderr) {
    if(error){
      node = stderr;
    } else {
      node = stdout;
    }
  });

  app.post('/run', function(req, res){
    var token = config.token;

    var output = {
      "output": "",
      "node": node
    };

    var cmd = req.body.command;
    var check_token = req.body.token;
    if(check_token == token) {
      exec(cmd, function(error, stdout, stderr) {
        if(error){
          output.output = stderr;
          res.send(output);
        } else {
          output.output = stdout;
          res.send(output);
        }
      });
    }  else {
      res.send( { output: "Not Authorized to connect to this agent!" });
    }
  });

  server.listen(port, function() {
    console.log('Listening on port %d', port);
  });
