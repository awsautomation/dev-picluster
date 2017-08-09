var http = require('http');
var fs = require('fs');
var multer = require('multer');
var upload = multer({
  dest: '../'
});
if (process.env.PICLUSTER_CONFIG) {
  var config = JSON.parse(fs.readFileSync(process.env.PICLUSTER_CONFIG, 'utf8'));
} else {
  var config = JSON.parse(fs.readFileSync('../config.json', 'utf8'));
}
var express = require('express');
var request = require('request');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser());
//require('request-debug')(request);
var path = require('path');
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

app.use('/assets', express.static(path.join(__dirname, 'assets')))
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')))

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

app.get('/kibana', function(req, res) {
  var check_token = req.query['token'];
  if ((check_token != token) || (!check_token) || (!config.kibana)) {
    res.end('\nError: Invalid Credentials or invalid configuration.')
  } else {
    res.redirect(config.kibana);
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
        res.end(body);
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
  var node = req.body.node;

  if ((check_token != token) || (!check_token)) {
    res.end('\nError: Invalid Credentials')
  } else {
    var responseString = '';
    var command = JSON.stringify({
      "command": req.body.command,
      "token": token,
      "node": node
    });

    var options = {
      url: 'http://' + server + ':' + server_port + '/exec',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': command.length
      },
      body: command
    }

    request(options, function(error, response, body) {
      if (error) {
        res.end(error);
      } else {
        display_log(function(data) {
          res.end(data);
        });
      }
    });
  }
});

app.get('/listregistries', function(req, res) {
  const check_token = req.query.token;
  if (!check_token || check_token !== token) {
    return res.status(401).end('\nError: Invalid Credentials');
  }

  var registries = [{
    name: 'hub.docker.com'
  }];

  if (config.dockerRegistries && config.dockerRegistries.length > 0) {
    config.dockerRegistries.forEach(function(registry) {
      registries.push({
        name: registry
      });
    });
  }

  res.json(registries);
});

app.get('/remoteimagetags', function(req, res) {
  const check_token = req.query.token;
  if (!check_token || check_token !== token) {
    return res.status(401).end('\nError: Invalid Credentials');
  }

  const registry = req.query.registry;
  const image = req.query.image;
  const page = req.query.page || 1;

  const username = req.query.username || '';
  const password = req.query.password || '';

  if (!registry || !image) {
    return res.status(400).end('\nError: Invalid Credentials');
  }

  var endpoint;
  switch (registry) {
    case 'hub.docker.com':
      endpoint = 'https://hub.docker.com/v2/repositories/' + ((image.indexOf('/') === -1) ? ('library/' + image) : image) + '/tags/?page=' + page + '&page_size=500';
      break;
    default:
      // Custom registries
      endpoint = ((registry.startsWith('http://') || registry.startsWith('https://')) ? registry : 'https://' + registry) + '/v2/' + image + '/tags/list';
      break;
  }

  const options = {
    url: endpoint,
    headers: ((username && password)) ? {
      'Authorization': 'Basic ' + new Buffer(`${username}:${password}`).toString('base64')
    } : {}
  }

  request(options, function(error, response, body) {
    if (!error && response.statusCode !== 200) {
      error = body;
    }
    res.status(response.statusCode).end((error) ? JSON.stringify({
      error: error.toString()
    }) : body);
  });
});

app.get('/remoteimages', function(req, res) {
  const check_token = req.query.token;
  if (!check_token || check_token !== token) {
    return res.status(401).end('\nError: Invalid Credentials');
  }

  const registry = req.query.registry;
  const image = req.query.image;
  const page = req.query.page || 1;

  const username = req.query.username || '';
  const password = req.query.password || '';

  if (!registry || !image) {
    return res.status(400).end('\nError: Bad Request');
  }

  var endpoint;
  switch (registry) {
    case 'hub.docker.com':
      endpoint = 'https://hub.docker.com/v2/search/repositories/?page=' + page + '&query=' + image;
      break;
    default:
      // Custom registries
      endpoint = ((registry.startsWith('http://') || registry.startsWith('https://')) ? registry : 'https://' + registry) + '/v2/_catalog';
      break;
  }

  const options = {
    url: endpoint,
    headers: ((username && password)) ? {
      'Authorization': 'Basic ' + new Buffer(`${username}:${password}`).toString('base64')
    } : {}
  }

  request(options, function(error, response, body) {
    if (!error && response.statusCode !== 200) {
      error = body;
    }
    res.status(response.statusCode).end((error) ? JSON.stringify({
      error: error.toString()
    }) : body);
  });
});

app.post('/listcontainers', function(req, res) {
  var check_token = req.body.token;
  if ((check_token != token) || (!check_token)) {
    res.end('\nError: Invalid Credentials')
  } else {
    var responseString = '';
    var node = req.body.node;
    var token_body = JSON.stringify({
      "token": token
    });

    var options = {
      url: 'http://' + server + ':' + server_port + '/listcontainers',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': token_body.length
      },
      body: token_body
    }

    request(options, function(error, response, body) {
      if (error) {
        res.end(error);
      } else {
        res.end(body);
      }
    })
  }
});

app.post('/listcommands', function(req, res) {
  var check_token = req.body.token;
  if ((check_token != token) || (!check_token)) {
    res.end('\nError: Invalid Credentials')
  } else {
    var responseString = '';
    var node = req.body.node;
    var token_body = JSON.stringify({
      "token": token
    });

    var options = {
      url: 'http://' + server + ':' + server_port + '/listcommands',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': token_body.length
      },
      body: token_body
    }

    request(options, function(error, response, body) {
      if (error) {
        res.end(error);
      } else {
        res.end(body);
      }
    })
  }
});

app.post('/listnodes', function(req, res) {
  var check_token = req.body.token;
  if ((check_token != token) || (!check_token)) {
    res.end('\nError: Invalid Credentials')
  } else {
    var responseString = '';
    var node = req.body.node;
    var token_body = JSON.stringify({
      "token": token
    });

    var options = {
      url: 'http://' + server + ':' + server_port + '/listnodes',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': token_body.length
      },
      body: token_body
    }

    request(options, function(error, response, body) {
      if (error) {
        res.end(error);
      } else {
        res.end(body);
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

app.post('/containerlog', function(req, res) {
  var check_token = req.body.token;
  var container = '';

  if (req.body.token) {
    container = req.body.container;
  }

  if ((check_token != token) || (!check_token)) {
    res.end('\nError: Invalid Credentials')
  } else {
    var responseString = '';
    request('http://' + server + ':' + server_port + '/containerlog?' + 'token=' + token + '&container=' + container, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        display_log(function(data) {
          res.end('\n' + data);
        });
      } else {
        res.end('\nError connecting with server.');
      }
    })
  }
});

app.post('/create', function(req, res) {
  var check_token = req.body.token;
  var container = '';

  if (req.body.token) {
    container = req.body.container;
  }

  if ((check_token != token) || (!check_token)) {
    res.end('\nError: Invalid Credentials')
  } else {
    var responseString = '';
    request('http://' + server + ':' + server_port + '/create?' + 'token=' + token + '&container=' + container, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        display_log(function(data) {
          res.end('\nSent request to create the containers.');
        });
      } else {
        res.end('\nError connecting with server.');
      }
    })
  }
});

app.get('/rsyslog', function(req, res) {
  var check_token = req.query['token'];
  if ((check_token != token) || (!check_token)) {
    res.end('\nError: Invalid Credentials')
  } else {
    var responseString = '';
    request('http://' + server + ':' + server_port + '/rsyslog?' + 'token=' + token, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        res.end(body);
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
        if (process.env.PICLUSTER_CONFIG) {
          config = JSON.parse(fs.readFileSync(process.env.PICLUSTER_CONFIG, 'utf8'));
        } else {
          config = JSON.parse(fs.readFileSync('../config.json', 'utf8'));
        }
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

app.get('/killvip', function(req, res) {
  var check_token = req.query['token'];
  if ((check_token != token) || (!check_token)) {
    res.end('\nError: Invalid Credentials')
  } else {
    var responseString = '';
    request('http://' + server + ':' + server_port + '/killvip?' + 'token=' + token, function(error, response, body) {
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

app.post('/delete-image', function(req, res) {
  var check_token = req.body.token;
  var image = req.body.image;

  if (image.indexOf('Everthing') > -1) {
    image = '';
  }

  if ((check_token != token) || (!check_token)) {
    res.end('\nError: Invalid Credentials')
  } else {
    var responseString = '';
    if (image.length > 1) {

      request('http://' + server + ':' + server_port + '/delete-image?' + 'token=' + token + '&image=' + image, function(error, response, body) {
        if (!error && response.statusCode == 200) {
          display_log(function(data) {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    } else {

      request('http://' + server + ':' + server_port + '/delete-image?' + 'token=' + token, function(error, response, body) {
        if (!error && response.statusCode == 200) {
          display_log(function(data) {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    }
  }
});

app.post('/build', function(req, res) {
  var check_token = req.body.token;
  var image = req.body.image;
  var no_cache = req.body.no_cache;

  if (image.indexOf('Everthing') > -1) {
    image = '';
  }

  if ((check_token != token) || (!check_token)) {
    res.end('\nError: Invalid Credentials')
  } else {
    var responseString = '';
    if (image.length > 1) {

      request('http://' + server + ':' + server_port + '/build?' + 'token=' + token + '&image=' + image + '&no_cache=' + no_cache, function(error, response, body) {
        if (!error && response.statusCode == 200) {
          display_log(function(data) {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    } else {

      request('http://' + server + ':' + server_port + '/build?' + 'token=' + token + '&no_cache=' + no_cache, function(error, response, body) {
        if (!error && response.statusCode == 200) {
          display_log(function(data) {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    }
  }
});

app.post('/delete', function(req, res) {
  var check_token = req.body.token;
  var container = "";

  if (req.body.container) {
    container = req.body.container;
    if (container.indexOf('Everything') > -1) {
      container = '';
    }
  }

  if ((check_token != token) || (!check_token)) {
    res.end('\nError: Invalid Credentials')
  } else {
    var responseString = '';
    if (container.length > 1) {
      request('http://' + server + ':' + server_port + '/delete?' + 'token=' + token + '&container=' + container, function(error, response, body) {
        if (!error && response.statusCode == 200) {
          display_log(function(data) {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    } else {
      request('http://' + server + ':' + server_port + '/delete?' + 'token=' + token, function(error, response, body) {
        if (!error && response.statusCode == 200) {
          display_log(function(data) {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    }
  }
});

app.get('/prune', function(req, res) {
  var check_token = req.query['token'];
  if ((check_token != token) || (!check_token)) {
    res.end('\nError: Invalid Credentials')
  } else {
    var responseString = '';
    request('http://' + server + ':' + server_port + '/prune?' + 'token=' + token, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        display_log(function(data) {
          res.end(data);
        });
      } else {
        res.end('\nError connecting with server.');
      }
    });
  }
});

app.post('/stop', function(req, res) {
  var check_token = req.body.token;
  var container = "";

  if (req.body.container) {
    container = req.body.container;
    if (container.indexOf('Everything') > -1) {
      container = '';
    }
  }

  if ((check_token != token) || (!check_token)) {
    res.end('\nError: Invalid Credentials')
  } else {
    var responseString = '';
    if (container.length > 1) {
      request('http://' + server + ':' + server_port + '/stop?' + 'token=' + token + '&container=' + container, function(error, response, body) {
        if (!error && response.statusCode == 200) {
          display_log(function(data) {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    } else {
      request('http://' + server + ':' + server_port + '/stop?' + 'token=' + token, function(error, response, body) {
        if (!error && response.statusCode == 200) {
          display_log(function(data) {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    }
  }
});

app.post('/changehost', function(req, res) {
  var check_token = req.body.token;
  var newhost = req.body.newhost;

  if (req.body.container) {
    container = req.body.container;
    if (container.indexOf('Everything') > -1) {
      container = '';
    }
  }

  if ((check_token != token) || (!check_token)) {
    res.end('\nError: Invalid Credentials')
  } else {
    var responseString = '';
    if (container.length > 1) {

      request('http://' + server + ':' + server_port + '/changehost?' + 'token=' + token + '&container=' + container + '&newhost=' + newhost, function(error, response, body) {
        if (!error && response.statusCode == 200) {
          display_log(function(data) {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    }
  }
});

app.post('/addcontainer', function(req, res) {
  var check_token = req.body.token;
  var host = req.body.host;
  var container_args = req.body.container_args;
  var heartbeat_args = req.body.heartbeat_args;
  var failover_constraints = req.body.failover_constraints;
  var container = req.body.container;

  if (failover_constraints) {
    if (failover_constraints.indexOf('none') > -1) {
      failover_constraints = '';
    }
  }

  if ((check_token != token) || (!check_token)) {
    res.end('\nError: Invalid Credentials')
  } else {
    if ((container) && (container_args) && (host)) {
      request('http://' + server + ':' + server_port + '/addcontainer?' + 'token=' + token + '&container=' + container + '&host=' + host + '&container_args=' + container_args + '&heartbeat_args=' + heartbeat_args + '&failover_constraints=' + failover_constraints, function(error, response, body) {
        if (!error && response.statusCode == 200) {
          display_log(function(data) {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    } else {
      res.end('\nError missing some parameters.');
    }

  }
});

app.post('/upload', upload.single('file'), function(req, res, next) {
  var check_token = req.body.token;
  console.log(check_token);
  var host = req.body.host;
  var file = req.body.file;
  console.log(req);
  fs.readFile(req.file.path, function(err, data) {
    var newPath = "../" + req.file.originalname;
    fs.writeFile(newPath, data, function(err) {
      res.end("");
    });
  });
});


app.post('/removecontainerconfig', function(req, res) {
  var check_token = req.body.token;
  var container = req.body.container;

  if ((check_token != token) || (!check_token)) {
    res.end('\nError: Invalid Credentials')
  } else {
    if (container) {
      request('http://' + server + ':' + server_port + '/removecontainerconfig?' + 'token=' + token + '&container=' + container, function(error, response, body) {
        if (!error && response.statusCode == 200) {
          display_log(function(data) {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    } else {
      res.end('\nError container name.');
    }

  }
});


app.post('/addhost', function(req, res) {
  var check_token = req.body.token;
  var host = req.body.host;

  if ((check_token != token) || (!check_token)) {
    res.end('\nError: Invalid Credentials')
  } else {
    if (host) {
      request('http://' + server + ':' + server_port + '/addhost?' + 'token=' + token + '&host=' + host, function(error, response, body) {
        if (!error && response.statusCode == 200) {
          display_log(function(data) {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    } else {
      res.end('\nError missing host name.');
    }

  }
});

app.post('/rmhost', function(req, res) {
  var check_token = req.body.token;
  var host = req.body.host;

  if ((check_token != token) || (!check_token)) {
    res.end('\nError: Invalid Credentials')
  } else {
    if (host) {
      request('http://' + server + ':' + server_port + '/rmhost?' + 'token=' + token + '&host=' + host, function(error, response, body) {
        if (!error && response.statusCode == 200) {
          display_log(function(data) {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    } else {
      res.end('\nError missing host name.');
    }

  }
});

app.post('/start', function(req, res) {
  var check_token = req.body.token;

  if (req.body.container) {
    container = req.body.container;
    if (container.indexOf('Everything') > -1) {
      container = '';
    }
  }

  if ((check_token != token) || (!check_token)) {
    res.end('\nError: Invalid Credentials')
  } else {
    var responseString = '';
    if (container.length > 1) {

      request('http://' + server + ':' + server_port + '/start?' + 'token=' + token + '&container=' + container, function(error, response, body) {
        if (!error && response.statusCode == 200) {
          display_log(function(data) {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    } else {
      request('http://' + server + ':' + server_port + '/start?' + 'token=' + token, function(error, response, body) {
        if (!error && response.statusCode == 200) {
          display_log(function(data) {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    }
  }
});

app.post('/restart', function(req, res) {
  var check_token = req.body.token;

  if (req.body.container) {
    container = req.body.container;
    if (container.indexOf('Everything') > -1) {
      container = '';
    }
  }

  if ((check_token != token) || (!check_token)) {
    res.end('\nError: Invalid Credentials')
  } else {
    var responseString = '';
    if (container.length > 1) {

      request('http://' + server + ':' + server_port + '/restart?' + 'token=' + token + '&container=' + container, function(error, response, body) {
        if (!error && response.statusCode == 200) {
          display_log(function(data) {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    } else {
      request('http://' + server + ':' + server_port + '/restart?' + 'token=' + token, function(error, response, body) {
        if (!error && response.statusCode == 200) {
          display_log(function(data) {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    }
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
  res.sendFile(__dirname + '/blank.html');;
});

app.get('/nodes.html', function(req, res) {
  res.sendFile(__dirname + '/nodes.html');
});

app.get('/container-layout.html', function(req, res) {
  res.sendFile(__dirname + '/container-layout.html');
});

app.get('/prune.html', function(req, res) {
  res.sendFile(__dirname + '/prune.html');
});

app.get('/background', function(req, res) {
  res.sendFile(__dirname + '/background.jpg');
});

app.get('/reloadconfig.html', function(req, res) {
  res.sendFile(__dirname + '/reloadconfig.html');
});

app.get('/pullimages.html', function(req, res) {
  res.sendFile(__dirname + '/pullimages.html');
});

app.get('/manage-images.html', function(req, res) {
  res.sendFile(__dirname + '/manage-images.html');
});

app.get('/logo.png', function(req, res) {
  res.sendFile(__dirname + '/logo.png');
});

app.get('/image-layout.html', function(req, res) {
  res.sendFile(__dirname + '/image-layout.html');
});

app.get('/log.html', function(req, res) {
  res.sendFile(__dirname + '/log.html');
});

app.get('/hb.html', function(req, res) {
  res.sendFile(__dirname + '/hb.html');
});

app.get('/killvip.html', function(req, res) {
  res.sendFile(__dirname + '/killvip.html');
});

app.get('/syslog.html', function(req, res) {
  res.sendFile(__dirname + '/syslog.html');
});

app.get('/manage.html', function(req, res) {
  res.sendFile(__dirname + '/manage.html');
});

app.get('/terminal.html', function(req, res) {
  res.sendFile(__dirname + '/terminal.html');
});

app.get('/addcontainer.html', function(req, res) {
  res.sendFile(__dirname + '/addcontainer.html');
});
app.get('/addhost.html', function(req, res) {
  res.sendFile(__dirname + '/addhost.html');
});
app.get('/rmhost.html', function(req, res) {
  res.sendFile(__dirname + '/rmhost.html');
});
app.get('/rsyslog.html', function(req, res) {
  res.sendFile(__dirname + '/rsyslog.html');
});
app.get('/server.jpeg', function(req, res) {
  res.sendFile(__dirname + '/server.jpeg');
});
app.get('/favicon.ico', function(req, res) {
  res.sendFile(__dirname + '/favicon.ico');
});
app.get('/upload.html', function(req, res) {
  res.sendFile(__dirname + '/upload.html');
});
app.get('/searching.jpeg', function(req, res) {
  res.sendFile(__dirname + '/searching.jpeg');
});

webconsole.listen(port, function() {
  console.log('Listening on port %d', webconsole.address().port);
});
