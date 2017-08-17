var http = require('http');
var https = require("https");
var express = require('express');
var request = require('request');
var fs = require('fs');
var unzip = require('unzip');
if (process.env.PICLUSTER_CONFIG) {
  var config = JSON.parse(fs.readFileSync(process.env.PICLUSTER_CONFIG, 'utf8'));
} else {
  var config = JSON.parse(fs.readFileSync('../config.json', 'utf8'));
}
var agent_port = config.agent_port;
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser());
if ( config.ssl && config.ssl_cert && config.ssl_key ) {
    var ssl_options = {
        cert: fs.readFileSync(config.ssl_cert),
        key: fs.readFileSync(config.ssl_key)
    }
    var server = https.createServer(ssl_options, app);
    console.log("SSL Agent API enabled");
} else {
    var server = http.createServer(app);
    console.log("Non-SSL Agent API enabled");
}
var os = require('os');
const node = os.hostname();
const async = require('async');
const Promisify = require('util').promisify;
const exec = require('child-process-promise').exec;
const noop = function() {};
var vip = ''
var vip_slave = '';
var vip_device = '';
var ip_add_command = '';
var ip_delete_command = '';
var vip_ping_time = '';
var token = config.token;
var multer = require('multer');
var upload = multer({
  dest: '../'
});

if (config.autostart_containers) {
  console.log('Starting all the containers.....');
  var options = {
    if ( config.ssl ){
      host: "https://" + config.web_connect
    } else {
      host: "http://" + config.web_connect
    },
    path: '/start?token=' + token + '&container=*',
    port: config.server_port
  };
  var autostart_request = app.get(options, function(response) {}).on('error', function(e) {
    console.error(e);
  });

}

if (config.vip_ip && config.vip) {
  var vip = config.vip_ip;
  Object.keys(config.vip).forEach(function(i) {
    const _node = config.vip[i].node;
    Object.keys(config.vip[i]).forEach(function(key) {
      if (!config.vip[i].hasOwnProperty(key)) {
        return;
      }
      const interfaces = require('os').networkInterfaces();
      Object.keys(interfaces).forEach(function(devName) {
        const iface = interfaces[devName];
        iface.forEach(function(alias) {
          if (alias.address !== _node) {
            return;
          }
          vip_slave = config.vip[i].slave;
          vip_eth_device = config.vip[i].vip_eth_device;
          ip_add_command = 'ip addr add ' + config.vip_ip + ' dev ' + vip_eth_device;
          const cmd = ip_delete_command = 'ip addr del ' + config.vip_ip + '/32 dev ' + vip_eth_device;
          vip_ping_time = config.vip[i].vip_ping_time;
          exec(cmd).then(send_ping).catch(send_ping);
        });
      })
    })
  });
}

function send_ping() {
  setTimeout(function() {
    var responseString = "";
    var token_body = JSON.stringify({
      "token": token
    });
    var options = {
      if ( config.ssl ){
        url: "https://" + vip_slave + ':' + agent_port + '/pong'
      } else {
        url: "http://" + vip_slave + ':' + agent_port + '/pong'
      },
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
        var cmd = ip_add_command;
        //console.log("\nUnable to connect to: " + vip_slave + ". Bringing up VIP on this host.");
        exec(cmd).then(noop).catch(noop);
      } else {
        const interfaces = require('os').networkInterfaces();
        Object.keys(interfaces).forEach(function(devName) {
          var iface = interfaces[devName];
          iface.forEach(function(alias) {
            if (alias.address == vip) {
              found_vip = true;
            }
          });
        });
        var json_object = JSON.parse(body);

        if (json_object.vip_detected == "false" && found_vip == false) {
          console.log("\nVIP not detected on either machine. Bringing up the VIP on this host.");
          var cmd = ip_add_command;
          exec(cmd).catch(function(error) {
            console.log(error);
          });
        }
        if ((json_object.vip_detected == "true" && found_vip == true)) {
          console.log("\nVIP detected on boths hosts! Stopping the VIP on this host.");
          var cmd = ip_delete_command;
          exec(cmd).catch(function(error) {
            console.log(error);
          });
        }
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
  const check_token = req.body.token;
  if (check_token !== token) {
    return res.status(401).end('\nError: Invalid Credentials');
  }

  if (config.vip_ip) {
    var cmd = ip_delete_command;
    exec(cmd).then(function(stdout, stderr) {
      res.end('\nCompleted.');
    }).catch(function(error) {
      console.log(error);
    });
  }
});

app.post('/pong', function(req, res) {
  const check_token = req.body.token;
  if (check_token !== token) {
    return res.status(500).send('Something broke!')
  }

  var responseString = "";
  var vip_status = "false";
  const interfaces = require('os').networkInterfaces();

  Object.keys(interfaces).forEach(function(devName) {
    const iface = interfaces[devName];
    iface.forEach(function(alias) {
      if (alias.address == vip) {
        vip_status = "true";
      }
    });
  });

  var body = {
    "vip_detected": vip_status
  };
  res.send(body);
});

function unzipFile(file) {
  fs.createReadStream(file).pipe(unzip.Extract({
    path: config.docker
  }));

}
app.post('/receive-file', upload.single('file'), function(req, res, next) {
  var check_token = req.body.token;
  if ((check_token != token) || (!check_token)) {
    res.end('\nError: Invalid Credentials')
  } else {
    fs.readFile(req.file.path, function(err, data) {
      var newPath = "../" + req.file.originalname;
      fs.writeFile(newPath, data, function(err) {
        unzipFile(newPath);
      });
    });
    res.end('Done');
  }
});

app.post('/run', function(req, res) {
  var output = {
    "output": [],
    "node": node
  };

  const check_token = req.body.token;

  if (check_token !== token) {
    return res.status(401).json({
      output: "Not Authorized to connect to this agent!"
    });
  }

  // Backwards compatability...
  if (!('commands' in req.body) && 'command' in req.body) {
    req.body.commands = req.body.command;
  }

  const commands = (typeof req.body.commands === 'string') ? [req.body.commands] : req.body.commands;

  if (!(commands instanceof Array)) {
    return res.status(400).json({
      output: "Bad Request"
    });
  }

  async.eachSeries(commands, function(command, cb) {
    if (typeof command === "string") {
      command = [command];
    }
    if (!(command instanceof Array)) {
      return;
    }
    //console.log('command', command);
    exec(command.join(' '), {
      cwd: __dirname
    }).then(function(log) {
      //console.log('output', log);
      output.output.push(`${log.stdout||''}${log.stderr||''}`);
      return cb();
    }).catch(function(e) {
      //console.log('error', e);
      output.output.push(`${e.stdout||''}${e.stderr||''}`);
      return cb(e);
    });
  }, function(e) {
    if (e) {
      console.error('error:', e);
    }
    //console.log('output', output);
    res.json(output);
  });
});

server.listen(agent_port, function() {
  console.log('Listening on port %d', agent_port);
});
