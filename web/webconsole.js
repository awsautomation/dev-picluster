var http = require('http');
var https = require('https');
var fs = require('fs');
var multer = require('multer');
var upload = multer({
  dest: '../'
});

let config;
if (process.env.PICLUSTER_CONFIG) {
  config = JSON.parse(fs.readFileSync(process.env.PICLUSTER_CONFIG, 'utf8'));
} else {
  config = JSON.parse(fs.readFileSync('../config.json', 'utf8'));
}
const express = require('express');
const request = require('request');

const app = express();
const bodyParser = require('body-parser');

app.use(bodyParser());
//require('request-debug')(request);
let path = require('path');
const web_port = config.web_port;
let lineReader = require('line-reader');
if ( config.ssl && config.ssl_cert && config.ssl_key ) {
    var ssl_options = {
        cert: fs.readFileSync(config.ssl_cert),
        key: fs.readFileSync(config.ssl_key)
    }
    const webconsole = https.createServer(ssl_options, app);
    console.log("SSL Web Console enabled");
} else {
    const webconsole = http.createServer(app);
    console.log("Non-SSL Web Console enabled");
}
let token = config.token;
let user = config.web_username;
let password = config.web_password;
let server = config.web_connect;
let server_port = config.server_port;
let syslog = "";
const request_timeout = 5000;

app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));
if (config.syslog) {
  syslog = config.syslog;
}

app.get('/sandbox', (req, res) => {
  const check_token = req.query.token;
  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    res.sendFile(__dirname + '/exec.html');
  }
});

app.get('/editconfig', (req, res) => {
  const check_token = req.query.token;
  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    res.sendFile(__dirname + '/editconfig.html');
  }
});

app.get('/kibana', (req, res) => {
  const check_token = req.query.token;
  if ((check_token !== token) || (!check_token) || (!config.kibana)) {
    res.end('\nError: Invalid Credentials or invalid configuration.');
  } else {
    res.redirect(config.kibana);
  }
});

app.post('/sendconfig', (req, res) => {
  const check_token = req.body.token;
  const payload = req.body.payload;
  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    const command = JSON.stringify({
      payload,
      token
    });

    const options = {
      if ( config.ssl ){
        url: "https://" + server + ':' + server_port + '/updateconfig'
      } else {
        url: "http://" + server + ':' + server_port + '/updateconfig'
      },
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': command.length
      },
      body: command,
      token
    };

    request(options, (error, response, body) => {
      if (error) {
        res.end(error);
      } else {
        res.end(body);
      }
    });
  }
});

app.post('/', (req, res) => {
  const get_user = req.body.username;
  const get_pass = req.body.password;

  if ( get_user == user && get_pass == password ) {
    const auth_data = {
      "token": token,
      "syslog": syslog
    };
    res.send(auth_data);
  } else {
    res.end('Access Denied!');
  }
});

app.post('/exec', (req, res) => {
  const check_token = req.body.token;
  const node = req.body.node;

  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    const command = JSON.stringify({
      command: req.body.command,
      token,
      node
    });

    const options = {
      if ( config.ssl ){
        url: "https://" + node + ':' + agent_port + '/exec'
      } else {
        url: "http://" + node + ':' + agent_port + '/exec'
      },
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': command.length
      },
      body: command
    };

    request(options, error => {
      if (error) {
        res.end(error);
      } else {
        display_log(data => {
          res.end(data);
        });
      }
    });
  }
});

app.get('/listregistries', (req, res) => {
  const check_token = req.query.token;
  if (!check_token || check_token !== token) {
    return res.status(401).end('\nError: Invalid Credentials');
  }

  const registries = [{
    name: 'hub.docker.com'
  }];

  if (config.dockerRegistries && config.dockerRegistries.length > 0) {
    config.dockerRegistries.forEach(registry => {
      registries.push({
        name: registry
      });
    });
  }

  res.json(registries);
});

app.get('/remoteimagetags', (req, res) => {
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

  let endpoint;
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
      Authorization: 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
    } : {}
  };

  request(options, (error, response, body) => {
    if (!error && response.statusCode !== 200) {
      error = body;
    }
    res.status(response.statusCode).end((error) ? JSON.stringify({
      error: error.toString()
    }) : body);
  });
});

app.get('/remoteimages', (req, res) => {
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

  let endpoint;
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
      Authorization: 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
    } : {}
  };

  request(options, (error, response, body) => {
    if (!error && response.statusCode !== 200) {
      error = body;
    }
    res.status(response.statusCode).end((error) ? JSON.stringify({
      error: error.toString()
    }) : body);
  });
});

app.post('/listcontainers', (req, res) => {
  const check_token = req.body.token;
  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    const token_body = JSON.stringify({
      token
    });

    const options = {
      if ( config.ssl ){
        url: "https://" + server + ':' + server_port + '/listcontainers'
      } else {
        url: "http://" + server + ':' + server_port + '/listcontainers'
      },
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': token_body.length
      },
      body: token_body
    };

    request(options, (error, response, body) => {
      if (error) {
        res.end(error);
      } else {
        res.end(body);
      }
    });
  }
});

app.post('/listcommands', (req, res) => {
  const check_token = req.body.token;
  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    const token_body = JSON.stringify({
      token
    });

    const options = {
      if ( config.ssl ){
        url: "https://" + server + ':' + server_port + '/listcommands'
      } else {
        url: "http://" + server + ':' + server_port + '/listcommands'
      },
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': token_body.length
      },
      body: token_body
    };

    request(options, (error, response, body) => {
      if (error) {
        res.end(error);
      } else {
        res.end(body);
      }
    });
  }
});

app.post('/listnodes', (req, res) => {
  const check_token = req.body.token;
  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    const token_body = JSON.stringify({
      token
    });

    const options = {
      if ( config.ssl ){
        url: "https://" + server + ':' + server_port + '/listnodes'
      } else {
        url: "http://" + server + ':' + server_port + '/listnodes'
      },
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': token_body.length
      },
      body: token_body
    };

    request(options, (error, response, body) => {
      if (error) {
        res.end(error);
      } else {
        res.end(body);
      }
    });
  }
});

function display_log(callback) {
  var responseString = '';
  clear_log(function(data) {
    setTimeout(() => {
      if (config.ssl) {
        request('https://' + server + ':' + server_port + '/log?token=' + token, (error, response, body) => {
          if (!error && response.statusCode === 200) {
            callback(body);
          } else {
            callback('\nError connecting with server.');
          }
      } else {
        request('http://' + server + ':' + server_port + '/log?token=' + token, (error, response, body) => {
          if (!error && response.statusCode === 200) {
            callback(body);
          } else {
            callback('\nError connecting with server.');
          }
      }
    }, request_timeout);
  });
}

function clear_log(callback) {

  if (config.ssl) {
    request('https://' + server + ':' + server_port + '/clearlog?token=' + token, (error, response) => {
      if (!error && response.statusCode === 200) {
        callback('');
      } else {
        console.log('\nError clearing log: ' + error);
      }
    });
  } else {
    request('http://' + server + ':' + server_port + '/clearlog?token=' + token, (error, response) => {
      if (!error && response.statusCode === 200) {
        callback('');
      } else {
        console.log('\nError clearing log: ' + error);
      }
    });
  }
}

app.post('/containerlog', (req, res) => {
  const check_token = req.body.token;
  let container = '';

  if (req.body.token) {
    container = req.body.container;
  }

  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {

    if (config.ssl) {
      request('https://' + server + ':' + server_port + '/containerlog?token=' + token + '&container=' + container, (error, response) => {
        if (!error && response.statusCode === 200) {
          display_log(data => {
            res.end('\n' + data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    } else {
      request('http://' + server + ':' + server_port + '/containerlog?token=' + token + '&container=' + container, (error, response) => {
        if (!error && response.statusCode === 200) {
          display_log(data => {
            res.end('\n' + data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    }
  }
});

app.post('/create', (req, res) => {
  const check_token = req.body.token;
  let container = '';

  if (req.body.token) {
    container = req.body.container;
  }

  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    if (config.ssl) {
      request('https://' + server + ':' + server_port + '/create?token=' + token + '&container=' + container, (error, response) => {
        if (!error && response.statusCode === 200) {
          display_log(() => {
            res.end('\nSent request to create the containers.');
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
  } else {
    request('http://' + server + ':' + server_port + '/create?token=' + token + '&container=' + container, (error, response) => {
      if (!error && response.statusCode === 200) {
        display_log(() => {
          res.end('\nSent request to create the containers.');
        });
      } else {
        res.end('\nError connecting with server.');
      }
    });
    }
  }
});

app.get('/rsyslog', (req, res) => {
  const check_token = req.query.token;
  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {

    if (config.ssl) {
      request('https://' + server + ':' + server_port + '/rsyslog?token=' + token, (error, response, body) => {
        if (!error && response.statusCode === 200) {
          res.end(body);
        } else {
          res.end('\nError connecting with server.');
        }
      });
    } else {
      request('http://' + server + ':' + server_port + '/rsyslog?token=' + token, (error, response, body) => {
        if (!error && response.statusCode === 200) {
          res.end(body);
        } else {
          res.end('\nError connecting with server.');
        }
      });
    }
  }
});

app.get('/status', (req, res) => {
  const check_token = req.query.token;
  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    if (config.ssl) {
      request('https://' + server + ':' + server_port + '/status?token=' + token, (error, response) => {
        if (!error && response.statusCode === 200) {
          display_log(data => {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
  } else {
    request('http://' + server + ':' + server_port + '/status?token=' + token, (error, response) => {
      if (!error && response.statusCode === 200) {
        display_log(data => {
          res.end(data);
        });
      } else {
        res.end('\nError connecting with server.');
      }
    });
    }
  }
});

app.get('/reloadconfig', (req, res) => {
  const check_token = req.query.token;
  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    var responseString = '';
    if (config.ssl) {
      request('https://' + server + ':' + server_port + '/reloadconfig?token=' + token, (error, response) => {
        if (!error && response.statusCode === 200) {
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
    } else {
      request('http://' + server + ':' + server_port + '/reloadconfig?token=' + token, (error, response) => {
        if (!error && response.statusCode === 200) {
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
  }
});

app.get('/images', (req, res) => {
  const check_token = req.query.token;
  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {

    if (config.ssl) {
      request('https://' + server + ':' + server_port + '/images?token=' + token, (error, response) => {
        if (!error && response.statusCode === 200) {
          display_log(data => {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
  } else {
    request('http://' + server + ':' + server_port + '/images?token=' + token, (error, response) => {
      if (!error && response.statusCode === 200) {
        display_log(data => {
          res.end(data);
        });
      } else {
        res.end('\nError connecting with server.');
      }
    });
    }
  }
});

app.get('/killvip', (req, res) => {
  const check_token = req.query.token;
  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {

    if (config.ssl) {
      request('https://' + server + ':' + server_port + '/killvip?token=' + token, (error, response) => {
        if (!error && response.statusCode === 200) {
          display_log(data => {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
  } else {
      request('http://' + server + ':' + server_port + '/killvip?token=' + token, (error, response) => {
        if (!error && response.statusCode === 200) {
          display_log(data => {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    }
  }
});

app.post('/delete-image', (req, res) => {
  const check_token = req.body.token;
  let image = req.body.image;

  if (image.indexOf('Everthing') > -1) {
    image = '';
  }

  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
  if (config.ssl) {
    // FixMe: This isn't a massive issue but should still probably be fixed at some point.
    if (image.length > 1) { // eslint-disable-line no-lonely-if
      request('https://' + server + ':' + server_port + '/delete-image?token=' + token + '&image=' + image, (error, response) => {
        if (!error && response.statusCode === 200) {
          display_log(data => {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    } else {
      request('http://' + server + ':' + server_port + '/delete-image?token=' + token, (error, response) => {
        if (!error && response.statusCode === 200) {
          display_log(data => {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
  } else {
    // FixMe: This isn't a massive issue but should still probably be fixed at some point.
    if (image.length > 1) { // eslint-disable-line no-lonely-if
      request('http://' + server + ':' + server_port + '/delete-image?token=' + token + '&image=' + image, (error, response) => {
        if (!error && response.statusCode === 200) {
          display_log(data => {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    } else {
      request('http://' + server + ':' + server_port + '/delete-image?token=' + token, (error, response) => {
        if (!error && response.statusCode === 200) {
          display_log(data => {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
  }
    }
  }
});

app.post('/build', (req, res) => {
  const check_token = req.body.token;
  let image = req.body.image;
  const no_cache = req.body.no_cache;

  if (image.indexOf('Everthing') > -1) {
    image = '';
  }

  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
  if (config.ssl) {
    // FixMe: Same as above - Not a massive issue but restructure this at some point in time.
    if (image.length > 1) { // eslint-disable-line no-lonely-if
      request('https://' + server + ':' + server_port + '/build?token=' + token + '&image=' + image + '&no_cache=' + no_cache, (error, response) => {
        if (!error && response.statusCode === 200) {
          display_log(data => {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    } else {
      request('http://' + server + ':' + server_port + '/build?token=' + token + '&no_cache=' + no_cache, (error, response) => {
        if (!error && response.statusCode === 200) {
          display_log(data => {
            res.end(data);
  } else {
    // FixMe: Same as above - Not a massive issue but restructure this at some point in time.
    if (image.length > 1) { // eslint-disable-line no-lonely-if
      request('http://' + server + ':' + server_port + '/build?token=' + token + '&image=' + image + '&no_cache=' + no_cache, (error, response) => {
        if (!error && response.statusCode === 200) {
          display_log(data => {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    } else {
      request('http://' + server + ':' + server_port + '/build?token=' + token + '&no_cache=' + no_cache, (error, response) => {
        if (!error && response.statusCode === 200) {
          display_log(data => {
            res.end(data);
  }
          });
      } else {
        if (config.ssl) {
          request('http://' + server + ':' + server_port + '/build?' + 'token=' + token + '&no_cache=' + no_cache, function(error, response, body) {
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
    }
  }
});

app.post('/delete', (req, res) => {
  const check_token = req.body.token;
  let container = '';

  if (req.body.container) {
    container = req.body.container;
    if (container.indexOf('Everything') > -1) {
      container = '';
    }
  }

  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    if (config.ssl) {
      // FixMe: Fix this!
      if (container.length > 1) { // eslint-disable-line no-lonely-if
        request('https://' + server + ':' + server_port + '/delete?token=' + token + '&container=' + container, (error, response) => {
          if (!error && response.statusCode === 200) {
            display_log(data => {
              res.end(data);
            });
          } else {
            res.end('\nError connecting with server.');
          }
        });
      } else {
        request('https://' + server + ':' + server_port + '/delete?token=' + token, (error, response) => {
          if (!error && response.statusCode === 200) {
            display_log(data => {
              res.end(data);
            });
          } else {
            res.end('\nError connecting with server.');
          }
        });
      }
    } else {
      // FixMe: Fix this!
      if (container.length > 1) { // eslint-disable-line no-lonely-if
        request('http://' + server + ':' + server_port + '/delete?token=' + token + '&container=' + container, (error, response) => {
          if (!error && response.statusCode === 200) {
            display_log(data => {
              res.end(data);
            });
          } else {
            res.end('\nError connecting with server.');
          }
        });
      } else {
        request('http://' + server + ':' + server_port + '/delete?token=' + token, (error, response) => {
          if (!error && response.statusCode === 200) {
            display_log(data => {
              res.end(data);
            });
          } else {
            res.end('\nError connecting with server.');
          }
        });
      }
    }
  }
});

app.get('/prune', (req, res) => {
  const check_token = req.query.token;
  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    if (config.ssl) {
      request('https://' + server + ':' + server_port + '/prune?token=' + token, (error, response) => {
        if (!error && response.statusCode === 200) {
          display_log(data => {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    } else {
      request('http://' + server + ':' + server_port + '/prune?token=' + token, (error, response) => {
        if (!error && response.statusCode === 200) {
          display_log(data => {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    }
  }
});

app.post('/stop', (req, res) => {
  const check_token = req.body.token;
  let container = '';

  if (req.body.container) {
    container = req.body.container;
    if (container.indexOf('Everything') > -1) {
      container = '';
    }
  }

  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    if (config.ssl) {
      // FixMe: Fix this!
      if (container.length > 1) { // eslint-disable-line no-lonely-if
        request('https://' + server + ':' + server_port + '/stop?token=' + token + '&container=' + container, (error, response) => {
          if (!error && response.statusCode === 200) {
            display_log(data => {
              res.end(data);
            });
          } else {
            res.end('\nError connecting with server.');
          }
        });
      } else {
        request('https://' + server + ':' + server_port + '/stop?token=' + token, (error, response) => {
          if (!error && response.statusCode === 200) {
            display_log(data => {
              res.end(data);
            });
          } else {
            res.end('\nError connecting with server.');
          }
        });
  	  } else {
      // FixMe: Fix this!
      if (container.length > 1) { // eslint-disable-line no-lonely-if
        request('http://' + server + ':' + server_port + '/stop?token=' + token + '&container=' + container, (error, response) => {
          if (!error && response.statusCode === 200) {
            display_log(data => {
              res.end(data);
            });
          } else {
            res.end('\nError connecting with server.');
          }
        });
      } else {
        request('http://' + server + ':' + server_port + '/stop?token=' + token, (error, response) => {
          if (!error && response.statusCode === 200) {
            display_log(data => {
              res.end(data);
            });
          } else {
            res.end('\nError connecting with server.');
          }
        });
  	  }
    }
  }
});

app.post('/changehost', (req, res) => {
  const check_token = req.body.token;
  const newhost = req.body.newhost;
  let container;
  if (req.body.container) {
    container = req.body.container;
    if (container.indexOf('Everything') > -1) {
      container = '';
    }
  }

  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    if (config.ssl) {
      // FixMe: Fix this!
      if (container.length > 1) { // eslint-disable-line no-lonely-if
        request('http://' + server + ':' + server_port + '/changehost?token=' + token + '&container=' + container + '&newhost=' + newhost, (error, response) => {
          if (!error && response.statusCode === 200) {
            display_log(data => {
              res.end(data);
            });
        } else {
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
    }
  } else {
    // FixMe: Fix this!
    if (container.length > 1) { // eslint-disable-line no-lonely-if
      request('http://' + server + ':' + server_port + '/changehost?token=' + token + '&container=' + container + '&newhost=' + newhost, (error, response) => {
        if (!error && response.statusCode === 200) {
          display_log(data => {
            res.end(data);
          });
        }
      } else {
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
  }
  }
});

app.post('/addcontainer', (req, res) => {
  const check_token = req.body.token;
  const host = req.body.host;
  const container_args = req.body.container_args;
  const heartbeat_args = req.body.heartbeat_args;
  let failover_constraints = req.body.failover_constraints;
  const container = req.body.container;

  if (failover_constraints) {
    if (failover_constraints.indexOf('none') > -1) {
      failover_constraints = '';
    }
  }

  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else if ((container) && (container_args) && (host)) {
    if (config.ssl) {
      request('https://' + server + ':' + server_port + '/addcontainer?token=' + token + '&container=' + container + '&host=' + host + '&container_args=' + container_args + '&heartbeat_args=' + heartbeat_args + '&failover_constraints=' + failover_constraints, (error, response) => {
        if (!error && response.statusCode === 200) {
          display_log(data => {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    } else {
      request('http://' + server + ':' + server_port + '/addcontainer?token=' + token + '&container=' + container + '&host=' + host + '&container_args=' + container_args + '&heartbeat_args=' + heartbeat_args + '&failover_constraints=' + failover_constraints, (error, response) => {
        if (!error && response.statusCode === 200) {
          display_log(data => {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    }
  } else {
    res.end('\nError missing some parameters.');
  }
});

function sendFile(file) {
  const formData = {
    name: 'file',
    token,
    file: fs.createReadStream(file)
  };

  request.post({
    if (config.ssl) {
      url: 'https://' + server + ':' + server_port + '/receive-file'
    } else {
      url: 'http://' + server + ':' + server_port + '/receive-file'
    }
    url: 'http://' + server + ':' + server_port + '/receive-file'
    formData
  }, err => {
    if (err) {
      console.error('upload failed:', err);
    } else {
      console.log('Upload successful!');
    }
  });
}

app.post('/upload', upload.single('file'), (req, res) => {
  const check_token = req.body.token;
  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    // FixMe: Handle the error...
    fs.readFile(req.file.path, (err, data) => { // eslint-disable-line handle-callback-err
      const newPath = '../' + req.file.originalname;
      fs.writeFile(newPath, data, () => {
        sendFile(newPath, req.file.originalname);
        res.end('');
      });
    });
  }
});

app.post('/removecontainerconfig', (req, res) => {
  const check_token = req.body.token;
  const container = req.body.container;

  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else if (container) {
    if (config.ssl) {
      request('https://' + server + ':' + server_port + '/removecontainerconfig?token=' + token + '&container=' + container, (error, response) => {
        if (!error && response.statusCode === 200) {
          display_log(data => {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    } else {
      request('http://' + server + ':' + server_port + '/removecontainerconfig?token=' + token + '&container=' + container, (error, response) => {
        if (!error && response.statusCode === 200) {
          display_log(data => {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    }
  } else {
    res.end('\nError container name.');
  }
});

app.post('/addhost', (req, res) => {
  const check_token = req.body.token;
  const host = req.body.host;

  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else if (host) {
    if (config.ssl) {
      request('https://' + server + ':' + server_port + '/addhost?token=' + token + '&host=' + host, (error, response) => {
        if (!error && response.statusCode === 200) {
          display_log(data => {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    } else {
      request('http://' + server + ':' + server_port + '/addhost?token=' + token + '&host=' + host, (error, response) => {
        if (!error && response.statusCode === 200) {
          display_log(data => {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    }
  } else {
    res.end('\nError missing host name.');
  }
});

app.post('/rmhost', (req, res) => {
  const check_token = req.body.token;
  const host = req.body.host;

  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else if (host) {
    if (config.ssl) {
      request('https://' + server + ':' + server_port + '/rmhost?token=' + token + '&host=' + host, (error, response) => {
        if (!error && response.statusCode === 200) {
          display_log(data => {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    } else {
      request('http://' + server + ':' + server_port + '/rmhost?token=' + token + '&host=' + host, (error, response) => {
        if (!error && response.statusCode === 200) {
          display_log(data => {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    }
  } else {
    res.end('\nError missing host name.');
  }
});

app.post('/start', (req, res) => {
  const check_token = req.body.token;
  let container;
  if (req.body.container) {
    container = req.body.container;
    if (container.indexOf('Everything') > -1) {
      container = '';
    }
  }

  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    if (config.ssl) {
      // FixMe: Fix this!
      if (container.length > 1) { // eslint-disable-line no-lonely-if
        request('https://' + server + ':' + server_port + '/start?token=' + token + '&container=' + container, (error, response) => {
          if (!error && response.statusCode === 200) {
            display_log(data => {
              res.end(data);
            });
          } else {
            res.end('\nError connecting with server.');
          }
        });
      } else {
        request('https://' + server + ':' + server_port + '/start?token=' + token, (error, response) => {
          if (!error && response.statusCode === 200) {
            display_log(data => {
              res.end(data);
            });
          } else {
            res.end('\nError connecting with server.');
          }
        });
      }
    } else {
      // FixMe: Fix this!
      if (container.length > 1) { // eslint-disable-line no-lonely-if
        request('http://' + server + ':' + server_port + '/start?token=' + token + '&container=' + container, (error, response) => {
          if (!error && response.statusCode === 200) {
            display_log(data => {
              res.end(data);
            });
          } else {
            res.end('\nError connecting with server.');
          }
        });
      } else {
        request('http://' + server + ':' + server_port + '/start?token=' + token, (error, response) => {
          if (!error && response.statusCode === 200) {
            display_log(data => {
              res.end(data);
            });
          } else {
            res.end('\nError connecting with server.');
          }
        });
      }
    }
  }
});

app.post('/restart', (req, res) => {
  const check_token = req.body.token;
  let container;

  if (req.body.container) {
    container = req.body.container;
    if (container.indexOf('Everything') > -1) {
      container = '';
    }
  }

  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    if (config.ssl) {
      // FixMe: Fix this!
      if (container.length > 1) { // eslint-disable-line no-lonely-if
        request('https://' + server + ':' + server_port + '/restart?token=' + token + '&container=' + container, (error, response) => {
          if (!error && response.statusCode === 200) {
            display_log(data => {
              res.end(data);
            });
          } else {
            res.end('\nError connecting with server.');
          }
        })
      } else {
        request('https://' + server + ':' + server_port + '/restart?token=' + token, (error, response) => {
          if (!error && response.statusCode === 200) {
            display_log(data => {
              res.end(data);
            });
          } else {
            res.end('\nError connecting with server.');
          }
        })
      }
    } else {
      // FixMe: Fix this!
      if (container.length > 1) { // eslint-disable-line no-lonely-if
        request('http://' + server + ':' + server_port + '/restart?token=' + token + '&container=' + container, (error, response) => {
          if (!error && response.statusCode === 200) {
            display_log(data => {
              res.end(data);
            });
          } else {
            res.end('\nError connecting with server.');
          }
        })
      } else {
        request('http://' + server + ':' + server_port + '/restart?token=' + token, (error, response) => {
          if (!error && response.statusCode === 200) {
            display_log(data => {
              res.end(data);
            });
          } else {
            res.end('\nError connecting with server.');
          }
        })
      }
    }
  }
});

app.get('/hb', (req, res) => {
  const check_token = req.query.token;
  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    if (config.ssl) {
      request('https://' + server + ':' + server_port + '/hb?token=' + token, (error, response) => {
        if (!error && response.statusCode === 200) {
          display_log(data => {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    } else {
      request('http://' + server + ':' + server_port + '/hb?token=' + token, (error, response) => {
        if (!error && response.statusCode === 200) {
          display_log(data => {
            res.end(data);
          });
        } else {
          res.end('\nError connecting with server.');
        }
      });
    }
  }
});

app.get('/log', (req, res) => {
  const check_token = req.query.token;
  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    if (config.ssl) {
      request('https://' + server + ':' + server_port + '/log?token=' + token, (error, response, body) => {
        if (!error && response.statusCode === 200) {
          res.end(body);
        } else {
          res.end('\nError connecting with server.');
        }
      });
    } else {
      request('http://' + server + ':' + server_port + '/log?token=' + token, (error, response, body) => {
        if (!error && response.statusCode === 200) {
          res.end(body);
        } else {
          res.end('\nError connecting with server.');
        }
      });s
    }
  }
});

app.get('/nodes', (req, res) => {
  const check_token = req.query.token;
  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    if (config.ssl) {
      request('http://' + server + ':' + server_port + '/nodes?token=' + token, (error, response) => {
        if (!error && response.statusCode === 200) {
          let json;
          let statusCode = 200;
          try {
            json = JSON.parse(response.body);
          } catch (err) {
            statusCode = 500;
            console.error(err);
            json = {status: statusCode, error: 'Internal Server Error'};
          }
          res.status(statusCode).json(json);
        } else {
          res.end('\nError connecting with server. ' + error);
        }
      });
    } else {
      request('http://' + server + ':' + server_port + '/nodes?token=' + token, (error, response) => {
        if (!error && response.statusCode === 200) {
          let json;
          let statusCode = 200;
          try {
            json = JSON.parse(response.body);
          } catch (err) {
            statusCode = 500;
            console.error(err);
            json = {status: statusCode, error: 'Internal Server Error'};
          }
          res.status(statusCode).json(json);
        } else {
          res.end('\nError connecting with server. ' + error);
        }
      });
    }
  }
});

app.get('/getconfig', (req, res) => {
  const check_token = req.query.token;
  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    if (config.ssl) {
      request('https://' + server + ':' + server_port + '/getconfig?token=' + token, (error, response, body) => {
        if (!error && response.statusCode === 200) {
          res.end(body);
        } else {
          res.end('Error connecting with server. ' + error);
        }
      });
    } else {
      request('http://' + server + ':' + server_port + '/getconfig?token=' + token, (error, response, body) => {
        if (!error && response.statusCode === 200) {
          res.end(body);
        } else {
          res.end('Error connecting with server. ' + error);
        }
      });
    }
  }
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/main.html');
});

app.get('/blank', (req, res) => {
  res.sendFile(__dirname + '/blank.html');
});

app.get('/nodes.html', (req, res) => {
  res.sendFile(__dirname + '/nodes.html');
});

app.get('/container-layout.html', (req, res) => {
  res.sendFile(__dirname + '/container-layout.html');
});

app.get('/prune.html', (req, res) => {
  res.sendFile(__dirname + '/prune.html');
});

app.get('/background', (req, res) => {
  res.sendFile(__dirname + '/background.jpg');
});

app.get('/reloadconfig.html', (req, res) => {
  res.sendFile(__dirname + '/reloadconfig.html');
});

app.get('/pullimages.html', (req, res) => {
  res.sendFile(__dirname + '/pullimages.html');
});

app.get('/manage-images.html', (req, res) => {
  res.sendFile(__dirname + '/manage-images.html');
});

app.get('/logo.png', (req, res) => {
  res.sendFile(__dirname + '/logo.png');
});

app.get('/image-layout.html', (req, res) => {
  res.sendFile(__dirname + '/image-layout.html');
});

app.get('/log.html', (req, res) => {
  res.sendFile(__dirname + '/log.html');
});

app.get('/hb.html', (req, res) => {
  res.sendFile(__dirname + '/hb.html');
});

app.get('/killvip.html', (req, res) => {
  res.sendFile(__dirname + '/killvip.html');
});

app.get('/syslog.html', (req, res) => {
  res.sendFile(__dirname + '/syslog.html');
});

app.get('/manage.html', (req, res) => {
  res.sendFile(__dirname + '/manage.html');
});

app.get('/terminal.html', (req, res) => {
  res.sendFile(__dirname + '/terminal.html');
});

app.get('/addcontainer.html', (req, res) => {
  res.sendFile(__dirname + '/addcontainer.html');
});
app.get('/addhost.html', (req, res) => {
  res.sendFile(__dirname + '/addhost.html');
});
app.get('/rmhost.html', (req, res) => {
  res.sendFile(__dirname + '/rmhost.html');
});
app.get('/rsyslog.html', (req, res) => {
  res.sendFile(__dirname + '/rsyslog.html');
});
app.get('/server.jpeg', (req, res) => {
  res.sendFile(__dirname + '/server.jpeg');
});
app.get('/favicon.ico', (req, res) => {
  res.sendFile(__dirname + '/favicon.ico');
});
app.get('/upload.html', (req, res) => {
  res.sendFile(__dirname + '/upload.html');
});
app.get('/searching.jpeg', (req, res) => {
  res.sendFile(__dirname + '/searching.jpeg');
});

webconsole.listen(port, () => {
  console.log('Listening on port %d', webconsole.address().web_port);
});
