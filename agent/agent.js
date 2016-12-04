var http = require('http');
var port =  process.env.AGENTPORT;
var express = require('express');
var fs = require('fs');
var request = require('request');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser());
require('request-debug')(request);
var exec = require('child_process').exec;
var server = require("http").createServer(app);
var token_file = JSON.parse(fs.readFileSync('./auth.json', 'utf8'));
var node = 'null';

  exec('hostname', function(error, stdout, stderr) {
    if(error){
      node = stderr;
    } else {
      node = stdout;
    }
  });

  app.post('/run', function(req, res){
    var token = token_file.token;

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
