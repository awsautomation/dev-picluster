var http = require('http');
var port =  process.env.AGENTPORT;
var express = require('express');
var request = require('request');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser());
require('request-debug')(request);
var exec = require('child_process').exec;
var server = require("http").createServer(app);

app.post('/run', function(req, res){
  var output = {
    "output": ""
  };

  var cmd = req.body.command;
  console.log('\Received Command: ' + cmd);
  exec(cmd, function(error, stdout, stderr) {
    if(error){
      output.output = stderr;
      res.send(output);
    } else {
      output.output = stdout;
      res.send(output);
    }
  });
});

server.listen(port, function() {
  console.log('Listening on port %d', port);
});
