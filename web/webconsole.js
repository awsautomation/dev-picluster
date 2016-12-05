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

var sandbox_html = ('<html>'
+ '<title>PiCluster</title>'
+ '<head>'
+ '<style type="text/css">.myinput { width:200px; height:50px; } </style>'
+ '</head>'
+ '<body bgcolor="#f5f5f5">'
+ '<p align=center>'
+ '<table style="width:10%">'
+ '<tr>'
+ '<td><form action="/exec" method="POST">'
+ '<b>Run a command on each server:</b><br><input type="text" size="50" name="command" value=""><br>'
+ '<br><br>'
+ '<input type="submit" value="Submit"/>'
+ '</form></td></tr></table></p>');

app.get('/sandbox', function(req, res){
  res.end(sandbox_html);
});


app.post('/login', function(req, res){
  var get_user = req.body.username;
  var get_pass = req.body.password;

  if (get_user == user)  {
    if (get_pass == password){
      res.sendFile(__dirname + '/main.html');
    } else {
      res.end('<html>'
      + '<title>Access Denied</title>'
      + '<head>'
      + '<p align=center><a href="/"><img src="/logo.png" height="150" width="100"></a></p>'
      + '</head>'
      + '<body><p align=center> Invalid Login!</p></body</html>');
    }
  } else {
    res.end('<html>'
    + '<title>Access Denied</title>'
    + '<head>'
    + '<p align=center><a href="/"><img src="/logo.png" height="150" width="100" ></a></p>'
    + '</head>'
    + '<body><p align=center> Invalid Login!</p></body</html>');
  }
});


app.post('/exec', function(req, res){
  var responseString  = '';
  var command = JSON.stringify({ "command": req.body.command, "token": token});

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
});

function display_log(callback){
  var responseString = '';
  clear_log(function(data) {
    setTimeout(function() {
      var responseString  = '';
      request('http://' + server + ':' + server_port + '/log?' + 'token=' + token, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          callback(body);
        } else {
          callback('\nError connecting with server.');
        }
      })
    },5000);
  });
}

function clear_log(callback){

  var responseString  = '';
  request('http://' + server + ':' + server_port + '/clearlog?' + 'token=' + token, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      callback('');
    } else {
      console.log('\nError clearing log: '  + error);
    }
  })
}

app.get('/create', function(req, res){
  var responseString  = '';
  request('http://' + server + ':' + server_port + '/create?' + 'token=' + token, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      display_log(function(data) {
        res.end('\nSent request to build all the containers in the configuration file.');
      });
    } else {
      res.end('\nError connecting with server.');
    }
  })
});

app.get('/status', function(req, res){
  var responseString  = '';
  request('http://' + server + ':' + server_port + '/status?' + 'token=' + token, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      display_log(function(data) {
        res.end(data);
      });
    } else {
      res.end('\nError connecting with server.');
    }
  })
});

app.get('/reloadconfig', function(req, res){
  var responseString  = '';
  request('http://' + server + ':' + server_port + '/reloadconfig?' + 'token=' + token, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      res.end('\nRequest to update configuation succeeded.');
    } else {
      res.end('\nError connecting with server.' + error);
    }
  })
});

app.get('/images', function(req, res){
  var responseString  = '';
  request('http://' + server + ':' + server_port +  '/images?' + 'token=' + token, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      display_log(function(data) {
        res.end(data);
      });
    } else {
      res.end('\nError connecting with server.');
    }
  })
});


app.get('/build', function(req, res){
  var responseString  = '';
  request('http://' + server + ':' + server_port +  '/build?' + 'token=' + token, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      display_log(function(data) {
        res.end(data);
      });
    } else {
      res.end('\nError connecting with server.');
    }
  })
});


app.get('/hb', function(req, res){
  var responseString  = '';
  request('http://' + server + ':' + server_port + '/hb?' + 'token=' + token, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      display_log(function(data) {
        res.end(data);
      });
    } else {
      res.end('\nError connecting with server.');
    }
  })
});



app.get('/stop', function(req, res){
  var responseString  = '';
  request('http://' + server + ':' + server_port + '/stop?' + 'token=' + token, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      display_log(function(data) {
        res.end(data);
      });
    } else {
      res.end('\nError connecting with server.');
    }
  })
});


app.get('/start', function(req, res){
  var responseString  = '';
  request('http://' + server + ':' + server_port + '/start?' + 'token=' + token, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      display_log(function(data) {
        res.end(data);
      });
    } else {
      res.end('\nError connecting with server.');
    }
  })
});

app.get('/log', function(req, res){
  var responseString  = '';
  request('http://' + server + ':' + server_port + '/log?' + 'token=' + token, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      res.end(body);
    } else {
      res.end('\nError connecting with server.');
    }
  })
});


app.get('/nodes', function(req, res){
  var responseString  = '';
  request('http://' + server + ':' + server_port + '/nodes?' + 'token=' + token, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      display_log(function(data) {
        res.end(data);
      });
    } else {
      res.end('\nError connecting with server. ' + error);
    }
  })
});

app.get('/', function(req, res){
  var responseString = "";
  res.sendFile(__dirname + '/index.html');
});


app.get('/logo.png', function(req, res){
  res.sendFile(__dirname + '/logo.png');
});

webconsole.listen(port, function() {
  console.log('Listening on port %d', webconsole.address().port);
});
