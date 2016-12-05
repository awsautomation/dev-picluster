var http = require('http');
var fs = require('fs');
var config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
var randomstring = require("randomstring");
var express = require('express');
var request = require('request');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser());
//require('request-debug')(request);
var port = config.port;
var lineReader = require('line-reader');
var webconsole = require("http").createServer(app);
var token = config.token;
var user = config.username;
var password = config.password;
var server = config.server;
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
      var options = {
        host: server,
        path: '/log?' + 'token=' + token,
        port: server_port
      };
      var request = http.get(options, function(response){
        response.on('data', function(data) {
          responseString += data;
        });
        response.on('end', function(data){
          callback(responseString);
        });
      });
    },5000);
  });
}

function clear_log(callback){
  var responseString = '';
  var options = {
    host: server,
    path: '/clearlog?' + 'token=' + token,
    port: server_port
  };
  var request = http.get(options, function(response){
    response.on('data', function(data) {
      responseString += data;
    });
    response.on('end', function(data){
      callback('');
    });
  });
}


app.get('/status', function(req, res){
  var responseString  = '';
  var options = {
    host: server,
    path: '/status?' + 'token=' + token,
    port: server_port
  };

  var request = http.get(options, function(response){
    response.on('data', function(data) {
      responseString += data;
    });
    response.on('end', function(data){
      display_log(function(data) {
        res.end(data);
      });
    });
  });
});

app.get('/images', function(req, res){
  var responseString  = '';
  var options = {
    host: server,
    path: '/images?' + 'token=' + token,
    port: server_port
  };

  var request = http.get(options, function(response){
    response.on('data', function(data) {
      responseString += data;
    });
    response.on('end', function(data){
      display_log(function(data) {
        res.end(data);
      });
    });
  });
});


app.get('/build', function(req, res){
  var responseString  = '';
  var options = {
    host: server,
    path: '/build?' + 'token=' + token,
    port: server_port
  };

  var request = http.get(options, function(response){
    response.on('data', function(data) {
      responseString += data;
    });
    response.on('end', function(data){
      display_log(function(data) {
        res.end(data);
      });
    });
  });
});


app.get('/hb', function(req, res){
  var responseString  = '';
  var options = {
    host: server,
    path: '/hb?' + 'token=' + token,
    port: server_port
  };

  var request = http.get(options, function(response){
    response.on('data', function(data) {
      responseString += data;
    });
    response.on('end', function(data){
      display_log(function(data) {
        res.end(data);
      });
    });
  });
});



app.get('/stop', function(req, res){
  var responseString  = '';
  var options = {
    host: server,
    path: '/stop?' + 'token=' + token,
    port: server_port
  };

  var request = http.get(options, function(response){
    response.on('data', function(data) {
      responseString += data;
    });
    response.on('end', function(data){
      display_log(function(data) {
        res.end(data);
      });

    });
  });
});


app.get('/start', function(req, res){
  var responseString  = '';
  var options = {
    host: server,
    path: '/start?' + 'token=' + token,
    port: server_port
  };

  var request = http.get(options, function(response){
    response.on('data', function(data) {
      responseString += data;
    });
    response.on('end', function(data){
      display_log(function(data) {
        res.end(data);
      });
    });
  });
});

app.get('/log', function(req, res){
  var responseString = '';
  var options = {
    host: server,
    path: '/log?' + 'token=' + token,
    port: server_port
  };
  var request = http.get(options, function(response){
    response.on('data', function(data) {
      responseString += data;
    });
    response.on('end', function(data){
    res.end(responseString);
    });
  });
});


app.get('/nodes', function(req, res){
  var responseString  = '';
  var options = {
    host: server,
    path: '/nodes?' + 'token=' + token,
    port: server_port
  };

  var request = http.get(options, function(response){
    response.on('data', function(data) {
      responseString += data;
    });
    response.on('error', function(err) {
      res.end(err);
    });
    response.on('end', function(data){
      display_log(function(data) {
        res.end(data);
      });
    });
  });
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
