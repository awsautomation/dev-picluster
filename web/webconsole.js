const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const express = require('express');
const request = require('request');
const bodyParser = require('body-parser');
/* eslint-disable capitalized-comments */
// require('request-debug')(request);
/* eslint-enable capitalized-comments */

let config = JSON.parse(fs.readFileSync((process.env.PICLUSTER_CONFIG ? process.env.PICLUSTER_CONFIG : '../config.json'), 'utf8'));

process.env.NODE_TLS_REJECT_UNAUTHORIZED = config.ssl_self_signed ? '0' : '1';

const app = express();
app.use(bodyParser());
app.use('/assets', express.static(path.join(__dirname, 'assets'), {
  maxage: '48h'
}));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules'), {
  maxage: '48h'
}));

const upload = multer({
  dest: '../'
});
const scheme = config.ssl ? 'https://' : 'http://';
const ssl_self_signed = config.ssl_self_signed === false;
const request_timeout = 5000;
const web_port = config.web_port;
const syslog = config.syslog ? config.syslog : '';
const doc_dir = config.doc_dir;
const theme = config.theme;
let token = config.token;
let user = config.web_username;
let password = config.web_password;
let server = config.web_connect;
let server_port = config.server_port;
let nodedata = '';

if (fs.existsSync(path.normalize(doc_dir))) {
  app.use('/docs', express.static(path.join(__dirname, doc_dir)));
}

function getData() {
  setTimeout(() => {
    const options = {
      url: `${scheme}${server}:${server_port}/nodes?token=${token}`,
      rejectUnauthorized: ssl_self_signed
    };

    request(options, (error, response) => {
      if (!error && response.statusCode === 200) {
        try {
          nodedata = JSON.parse(response.body);
        } catch (err) {
          console.error(err);
        }
      } else {
        console.log('\nError connecting with server. ' + error);
      }
    });
    getData();
  }, 5000);
}
getData();

function get_file_list_by_extention(dirpath, extention) {
  const files = fs.readdirSync(dirpath);
  const output = [];

  for (const i in files) {
    if (path.extname(files[i]) === extention) {
      output.push(files[i]);
    }
  }

  return output;
}

function serve_doc_pages() {
  const doc_pages = get_file_list_by_extention(path.join(__dirname, doc_dir.toString()), '.md');

  for (const i in doc_pages) {
    if (i) {
      app.get('/doc' + i, (req, res) => {
        res.sendFile(path.resolve(__dirname + '/' + doc_dir + '/' + doc_pages[i]));
      });
    }
  }
}

app.get('/exec.html', (req, res) => {
  const check_token = req.query.token;
  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    res.sendFile(__dirname + '/exec.html');
  }
});

app.get('/config-edit.html', (req, res) => {
  const check_token = req.query.token;
  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    res.sendFile(__dirname + '/config-edit.html');
  }
});

app.get('/kibana.html', (req, res) => {
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
      url: `${scheme}${server}:${server_port}/updateconfig`,
      rejectUnauthorized: ssl_self_signed,
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

  if (get_user === user && get_pass === password) {
    const auth_data = {
      token,
      syslog
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
      url: `${scheme}${server}:${server_port}/exec`,
      rejectUnauthorized: ssl_self_signed,
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

app.get('/listdocs', (req, res) => {
  res.json(get_file_list_by_extention(path.join(__dirname, doc_dir.toString()), '.md'));
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
  const registry = req.query.registry;
  const image = req.query.image;
  const page = req.query.page || 1;
  const username = req.query.username || '';
  const password = req.query.password || '';
  const check_token = req.query.token;

  if (!check_token || check_token !== token) {
    return res.status(401).end('\nError: Invalid Credentials');
  }

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
  const registry = req.query.registry;
  const image = req.query.image;
  const page = req.query.page || 1;
  const username = req.query.username || '';
  const password = req.query.password || '';
  const check_token = req.query.token;

  if (!check_token || check_token !== token) {
    return res.status(401).end('\nError: Invalid Credentials');
  }

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

app.post('/listcommands', (req, res) => {
  const check_token = req.body.token;

  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    const token_body = JSON.stringify({
      token
    });

    const options = {
      url: `${scheme}${server}:${server_port}/listcommands`,
      rejectUnauthorized: ssl_self_signed,
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
  const options = {
    url: `${scheme}${server}:${server_port}/log?token=${token}`,
    rejectUnauthorized: ssl_self_signed
  };

  clear_log(() => {
    setTimeout(() => {
      request(options, (error, response, body) => {
        if (!error && response.statusCode === 200) {
          callback(body);
        } else {
          callback('\nError connecting with server.');
        }
      });
    }, request_timeout);
  });
}

function clear_log(callback) {
  const options = {
    url: `${scheme}${server}:${server_port}/clearlog?token=${token}`,
    rejectUnauthorized: ssl_self_signed
  };

  request(options, (error, response) => {
    if (!error && response.statusCode === 200) {
      callback('');
    } else {
      console.log('\nError clearing log: ' + error);
    }
  });
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
    const options = {
      url: `${scheme}${server}:${server_port}/containerlog?token=${token}&container=${container}`,
      rejectUnauthorized: ssl_self_signed
    };

    request(options, (error, response) => {
      if (!error && response.statusCode === 200) {
        display_log(data => {
          res.end('\n' + data);
        });
      } else {
        res.end('\nError connecting with server.');
      }
    });
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
    const options = {
      url: `${scheme}${server}:${server_port}/create?token=${token}&container=${container}`,
      rejectUnauthorized: ssl_self_signed
    };

    request(options, (error, response) => {
      if (!error && response.statusCode === 200) {
        display_log(() => {
          res.end('\nSent request to create the containers.');
        });
      } else {
        res.end('\nError connecting with server.');
      }
    });
  }
});

app.get('/rsyslog', (req, res) => {
  const check_token = req.query.token;

  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    const options = {
      url: `${scheme}${server}:${server_port}/rsyslog?token=${token}`,
      rejectUnauthorized: ssl_self_signed
    };

    request(options, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        res.end(body);
      } else {
        res.end('\nError connecting with server.');
      }
    });
  }
});

app.get('/reloadconfig', (req, res) => {
  const check_token = req.query.token;

  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    const options = {
      url: `${scheme}${server}:${server_port}/reloadconfig?token=${token}`,
      rejectUnauthorized: ssl_self_signed
    };

    request(options, (error, response) => {
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
    });
  }
});

app.get('/killvip', (req, res) => {
  const check_token = req.query.token;

  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    const options = {
      url: `${scheme}${server}:${server_port}/killvip?token=${token}`,
      rejectUnauthorized: ssl_self_signed
    };

    request(options, (error, response) => {
      if (!error && response.statusCode === 200) {
        display_log(data => {
          res.end(data);
        });
      } else {
        res.end('\nError connecting with server.');
      }
    });
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
    const options = image.length > 1 ? {
      url: `${scheme}${server}:${server_port}/delete-image?token=${token}&image=${image}`,
      rejectUnauthorized: ssl_self_signed
    } : {
      url: `${scheme}${server}:${server_port}/delete-image?token=${token}`,
      rejectUnauthorized: ssl_self_signed
    };

    request(options, (error, response) => {
      if (!error && response.statusCode === 200) {
        display_log(data => {
          res.end(data);
        });
      } else {
        res.end('\nError connecting with server.');
      }
    });
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
    const options = image.length > 1 ? {
      url: `${scheme}${server}:${server_port}/build?token=${token}&image=${image}&no_cache=${no_cache}`,
      rejectUnauthorized: ssl_self_signed
    } : {
      url: `${scheme}${server}:${server_port}/build?token=${token}&no_cache=${no_cache}`,
      rejectUnauthorized: ssl_self_signed
    };

    request(options, (error, response) => {
      if (!error && response.statusCode === 200) {
        display_log(data => {
          res.end(data);
        });
      }
    });
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
    const options = container.length > 1 ? {
      url: `${scheme}${server}:${server_port}/delete?token=${token}&container=${container}`,
      rejectUnauthorized: ssl_self_signed
    } : {
      url: `${scheme}${server}:${server_port}/delete?token=${token}`,
      rejectUnauthorized: ssl_self_signed
    };

    request(options, (error, response) => {
      if (!error && response.statusCode === 200) {
        display_log(data => {
          res.end(data);
        });
      } else {
        res.end('\nError connecting with server.');
      }
    });
  }
});

app.get('/prune', (req, res) => {
  const check_token = req.query.token;

  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    const options = {
      url: `${scheme}${server}:${server_port}/prune?token=${token}`,
      rejectUnauthorized: ssl_self_signed
    };

    request(options, (error, response, body) => { // eslint-disable-line no-unused-vars
      if (!error && response.statusCode === 200) {
        display_log(data => {
          res.end(data);
        });
      } else {
        res.end('\nError connecting with server.');
      }
    });
  }
});

app.get('/clear-functions', (req, res) => {
  const check_token = req.query.token;

  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    const options = {
      url: `${scheme}${server}:${server_port}/clear-functions?token=${token}`,
      rejectUnauthorized: ssl_self_signed
    };

    request(options, (error, response, body) => { // eslint-disable-line no-unused-vars
      if (!error && response.statusCode === 200) {
        res.end('Sent request to delete functions.');
      } else {
        res.end('\nError connecting with server.');
      }
    });
  }
});

app.get('/function', (req, res) => {
  const check_token = req.query.token;
  const get_function = req.query.function;
  let get_args = req.query.container_args;

  if (req.query.container_args) {
    get_args = req.query.container_args;
  }

  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    const options = {
      url: scheme + server + ':' + server_port + '/function?token=' + token + '&function=' + get_function + '&container_args=' + get_args,
      rejectUnauthorized: ssl_self_signed
    };

    request(options, (error, response, body) => { // eslint-disable-line no-unused-vars
      if (!error && response.statusCode === 200) {
        res.end('');
      } else {
        console.log('\n' + error);
      }
    });
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
    const options = container.length > 1 ? {
      url: `${scheme}${server}:${server_port}/stop?token=${token}&container=${container}`,
      rejectUnauthorized: ssl_self_signed
    } : {
      url: `${scheme}${server}:${server_port}/stop?token=${token}`,
      rejectUnauthorized: ssl_self_signed
    };

    request(options, (error, response) => {
      if (!error && response.statusCode === 200) {
        display_log(data => {
          res.end(data);
        });
      } else {
        res.end('\nError connecting with server.');
      }
    });
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
    const options = {
      url: `${scheme}${server}:${server_port}/changehost?token=${token}&container=${container}&newhost=${newhost}`,
      rejectUnauthorized: ssl_self_signed
    };

    request(options, (error, response) => {
      if (!error && response.statusCode === 200) {
        display_log(data => {
          res.end(data);
        });
      } else {
        res.end('\nError connecting with server.');
      }
    });
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
    const options = {
      url: `${scheme}${server}:${server_port}/addcontainer?token=${token}&container=${container}&host=${host}&container_args=${container_args}&heartbeat_args=${heartbeat_args}&failover_constraints=${failover_constraints}`,
      rejectUnauthorized: ssl_self_signed
    };

    request(options, (error, response) => {
      if (!error && response.statusCode === 200) {
        display_log(data => {
          res.end(data);
        });
      } else {
        res.end('\nError connecting with server.');
      }
    });
  } else {
    res.end('\nError missing some parameters.');
  }
});

function sendFile(file, temp_file) {
  const formData = {
    name: 'file',
    token,
    file: fs.createReadStream(file)
  };

  const options = {
    url: `${scheme}${server}:${server_port}/receive-file`,
    rejectUnauthorized: ssl_self_signed,
    formData
  };

  request.post(options, err => {
    if (err) {
      console.error('upload failed:', err);
    } else {
      fs.unlink(temp_file, error => {
        if (error) {
          console.log(error);
        }
      });
      console.log('Upload successful!');
    }
  });
}

app.post('/upload', upload.single('file'), (req, res) => {
  const check_token = req.body.token;

  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    fs.readFile(req.file.path, (err, data) => {
      const newPath = '../' + req.file.originalname;
      fs.writeFile(newPath, data, () => {
        sendFile(newPath, req.file.path);
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
    const options = {
      url: `${scheme}${server}:${server_port}/removecontainerconfig?token=${token}&container=${container}`,
      rejectUnauthorized: ssl_self_signed
    };

    request(options, (error, response) => {
      if (!error && response.statusCode === 200) {
        display_log(data => {
          res.end(data);
        });
      } else {
        res.end('\nError connecting with server.');
      }
    });
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
    const options = {
      url: `${scheme}${server}:${server_port}/addhost?token=${token}&host=${host}`,
      rejectUnauthorized: ssl_self_signed
    };

    request(options, (error, response) => {
      if (!error && response.statusCode === 200) {
        display_log(data => {
          res.end(data);
        });
      } else {
        res.end('\nError connecting with server.');
      }
    });
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
    const options = {
      url: `${scheme}${server}:${server_port}/rmhost?token=${token}&host=${host}`,
      rejectUnauthorized: ssl_self_signed
    };

    request(options, (error, response) => {
      if (!error && response.statusCode === 200) {
        display_log(data => {
          res.end(data);
        });
      } else {
        res.end('\nError connecting with server.');
      }
    });
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
    const options = container.length > 1 ? {
      url: `${scheme}${server}:${server_port}/start?token=${token}&container=${container}`,
      rejectUnauthorized: ssl_self_signed
    } : {
      url: `${scheme}${server}:${server_port}/start?token=${token}`,
      rejectUnauthorized: ssl_self_signed
    };

    request(options, (error, response) => {
      if (!error && response.statusCode === 200) {
        display_log(data => {
          res.end(data);
        });
      } else {
        res.end('\nError connecting with server.');
      }
    });
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
    const options = container.length > 1 ? {
      url: `${scheme}${server}:${server_port}/restart?token=${token}&container=${container}`,
      rejectUnauthorized: ssl_self_signed
    } : {
      url: `${scheme}${server}:${server_port}/restart?token=${token}`,
      rejectUnauthorized: ssl_self_signed
    };

    request(options, (error, response) => {
      if (!error && response.statusCode === 200) {
        display_log(data => {
          res.end(data);
        });
      } else {
        res.end('\nError connecting with server.');
      }
    });
  }
});

app.get('/hb', (req, res) => {
  const check_token = req.query.token;

  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    const options = {
      url: `${scheme}${server}:${server_port}/hb?token=${token}`,
      rejectUnauthorized: ssl_self_signed
    };

    request(options, (error, response) => {
      if (!error && response.statusCode === 200) {
        display_log(data => {
          res.end(data);
        });
      } else {
        res.end('\nError connecting with server.');
      }
    });
  }
});

app.get('/log', (req, res) => {
  const check_token = req.query.token;

  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    const options = {
      url: `${scheme}${server}:${server_port}/log?token=${token}`,
      rejectUnauthorized: ssl_self_signed
    };

    request(options, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        res.end(body);
      } else {
        res.end('\nError connecting with server.');
      }
    });
  }
});

app.get('/nodes', (req, res) => {
  const check_token = req.query.token;

  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    res.json(nodedata);
  }
});

app.get('/getconfig', (req, res) => {
  const check_token = req.query.token;

  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    const options = {
      url: `${scheme}${server}:${server_port}/getconfig?token=${token}`,
      rejectUnauthorized: ssl_self_signed
    };

    request(options, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        res.end(body);
      } else {
        res.end('Error connecting with server. ' + error);
      }
    });
  }
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});
app.get('/blank.html', (req, res) => {
  res.sendFile(__dirname + '/blank.html');
});
app.get('/nodes-list.html', (req, res) => {
  res.sendFile(__dirname + '/nodes-list.html');
});
app.get('/containers-layout.html', (req, res) => {
  res.sendFile(__dirname + '/containers-layout.html');
});
app.get('/images-prune.html', (req, res) => {
  res.sendFile(__dirname + '/images-prune.html');
});
app.get('/functions-clear.html', (req, res) => {
  res.sendFile(__dirname + '/functions-clear.html');
});
app.get('/functions-viewer.html', (req, res) => {
  res.sendFile(__dirname + '/functions-viewer.html');
});
app.get('/functions-create.html', (req, res) => {
  res.sendFile(__dirname + '/functions-create.html');
});
app.get('/functions-current.html', (req, res) => {
  res.sendFile(__dirname + '/functions-current.html');
});
app.get('/config-reload.html', (req, res) => {
  res.sendFile(__dirname + '/config-reload.html');
});
app.get('/images-pull.html', (req, res) => {
  res.sendFile(__dirname + '/images-pull.html');
});
app.get('/images-manage.html', (req, res) => {
  res.sendFile(__dirname + '/images-manage.html');
});
app.get('/images-layout.html', (req, res) => {
  res.sendFile(__dirname + '/images-layout.html');
});
app.get('/log.html', (req, res) => {
  res.sendFile(__dirname + '/log.html');
});
app.get('/heartbeat.html', (req, res) => {
  res.sendFile(__dirname + '/heartbeat.html');
});
app.get('/killvip.html', (req, res) => {
  res.sendFile(__dirname + '/killvip.html');
});
app.get('/syslog.html', (req, res) => {
  res.sendFile(__dirname + '/syslog.html');
});
app.get('/containers-manage.html', (req, res) => {
  res.sendFile(__dirname + '/containers-manage.html');
});
app.get('/terminal.html', (req, res) => {
  res.sendFile(__dirname + '/terminal.html');
});
app.get('/containers-add.html', (req, res) => {
  res.sendFile(__dirname + '/containers-add.html');
});
app.get('/nodes-add.html', (req, res) => {
  res.sendFile(__dirname + '/nodes-add.html');
});
app.get('/nodes-remove.html', (req, res) => {
  res.sendFile(__dirname + '/nodes-remove.html');
});
app.get('/rsyslog.html', (req, res) => {
  res.sendFile(__dirname + '/rsyslog.html');
});
app.get('/favicon.ico', (req, res) => {
  res.sendFile(__dirname + '/favicon.ico');
});
app.get('/docs.html', (req, res) => {
  res.sendFile(__dirname + '/docs.html');
});
app.get('/images-upload.html', (req, res) => {
  res.sendFile(__dirname + '/images-upload.html');
});

const logo_slug = __dirname + '/assets/images/theme/' + theme + '/logo.png';

app.get('/logo.png', (req, res) => {
  res.sendFile(logo_slug);
});

serve_doc_pages();

if (config.ssl && config.ssl_cert && config.ssl_key) {
  console.log('SSL Web Console enabled');
  const ssl_options = {
    cert: fs.readFileSync(config.ssl_cert),
    key: fs.readFileSync(config.ssl_key)
  };
  const webconsole = https.createServer(ssl_options, app);
  webconsole.listen(web_port, () => {
    console.log('Listening on port %d', web_port);
  });
} else {
  console.log('Non-SSL Web Console enabled');
  const webconsole = http.createServer(app);
  webconsole.listen(web_port, () => {
    console.log('Listening on port %d', web_port);
  });
}
