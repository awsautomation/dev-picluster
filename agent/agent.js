const http = require('http');
const https = require('https');
const fs = require('fs');
const os = require('os');
const unzip = require('unzip');
const express = require('express');
const request = require('request');
const diskspace = require('diskspace');
const bodyParser = require('body-parser');
const multer = require('multer');
const getos = require('picluster-getos');
const async = require('async');
const exec = require('child-process-promise').exec;
const sysinfo = require('systeminformation');

const config = process.env.PICLUSTER_CONFIG ? JSON.parse(fs.readFileSync(process.env.PICLUSTER_CONFIG, 'utf8')) : JSON.parse(fs.readFileSync('../config.json', 'utf8'));
const app = express();

if (config.ssl_self_signed) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

app.use(bodyParser());

const upload = multer({
  dest: '../'
});
const scheme = config.ssl ? 'https://' : 'http://';
const server = config.web_connect;
const server_port = config.server_port;
const agent_port = config.agent_port;
const node = os.hostname();
const token = config.token;
const noop = () => {};
let vip = '';
let vip_slave = '';
let ip_add_command = '';
let ip_delete_command = '';
let vip_ping_time = '';
let cpu_percent = 0;
let os_type = '';
let disk_percentage = 0;
let total_running_containers = 0;
let running_containers = '';
let cpu_cores = 0;
let memory_buffers = 0;
let memory_swap = 0;
let memory_total = 0;
let memory_used = 0;
let memory_percentage = 0;
let images = '';

function monitoring() {
  sysinfo.mem(data => {
    memory_total = data.total;
    memory_buffers = data.buffcache;
    memory_used = data.used;
    memory_swap = data.swapused;
    const this_os = os.platform();

    if (this_os.indexOf('linux') > -1) {
      memory_percentage = Math.round((memory_used - memory_buffers) / memory_total * 100);
    } else {
      memory_percentage = Math.round((memory_swap + memory_buffers) / memory_total * 100);
    }
  });

  exec('docker container ps -q', (err, stdout) => {
    if (err) {
      console.error(err);
    }
    total_running_containers = stdout.split('\n').length - 1;
  });

  exec('docker ps --format "{{.Names}}"', (err, stdout) => {
    if (err) {
      console.error(err);
    }
    running_containers = stdout.split('\n');
  });

  exec('docker images --format "table {{.Repository}}"', (err, stdout) => {
    if (err) {
      console.error(err);
    }
    images = stdout.split('\n');
    for (const i in images) {
      if ((images[i].indexOf('REPOSITORY') > -1) || images[i].indexOf('<none>') > -1) {
        images[i] = '';
      }
    }
    images = images.filter((e, pos) => {
      return e.length > 0 && images.indexOf(e) === pos;
    });
    images = images.sort();
  });

  setTimeout(() => {
    getos((e, os) => {
      os_type = (e) ? '' : os.dist || os.os;
    });

    diskspace.check('/', (err, result) => {
      disk_percentage = Math.round(result.used / result.total * 100);
    });

    require('cpu-stats')(1000, (error, result) => {
      cpu_cores = 0;
      let usage = 0;
      result.forEach(e => {
        usage += e.cpu;
        cpu_cores++;
      });
      cpu_percent = usage;
    });
    monitoring();
  }, 3000);
}

monitoring();

if (config.autostart_containers) {
  console.log('Starting all the containers.....');

  const options = {
    url: `${scheme}${server}:${server_port}/start?token=${token}&container=*`
  };

  if (config.ssl_self_signed) {
    options.rejectUnauthorized = 'false';
  }

  request.get(options).on('error', e => {
    console.error(e);
  });
}

if (config.vip_ip && config.vip) {
  vip = config.vip_ip;
  Object.keys(config.vip).forEach(i => {
    const _node = config.vip[i].node;
    Object.keys(config.vip[i]).forEach(key => {
      if (!config.vip[i].hasOwnProperty(key)) {
        return;
      }
      const interfaces = require('os').networkInterfaces();
      Object.keys(interfaces).forEach(devName => {
        const iface = interfaces[devName];
        iface.forEach(alias => {
          if (alias.address !== _node) {
            return;
          }
          vip_slave = config.vip[i].slave;
          const vip_eth_device = config.vip[i].vip_eth_device;
          ip_add_command = 'ip addr add ' + config.vip_ip + ' dev ' + vip_eth_device;
          ip_delete_command = 'ip addr del ' + config.vip_ip + '/32 dev ' + vip_eth_device;
          vip_ping_time = config.vip[i].vip_ping_time;
          exec(ip_delete_command).then(send_ping).catch(send_ping);
        });
      });
    });
  });
}

function send_ping() {
  setTimeout(() => {
    const token_body = JSON.stringify({
      token
    });

    const options = {
      url: `${scheme}${vip_slave}:${agent_port}/pong`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': token_body.length
      },
      body: token_body
    };

    if (config.ssl_self_signed) {
      options.rejectUnauthorized = 'false';
    }

    request(options, (error, response, body) => {
      let found_vip = false;

      if ((error || response.statusCode !== '200')) {
        const cmd = ip_add_command;
        exec(cmd).then(noop).catch(noop);
      } else {
        const interfaces = require('os').networkInterfaces();
        Object.keys(interfaces).forEach(devName => {
          const iface = interfaces[devName];
          iface.forEach(alias => {
            if (alias.address === vip) {
              found_vip = true;
            }
          });
        });
        const json_object = JSON.parse(body);

        if (json_object.vip_detected === 'false' && found_vip === false) {
          console.log('\nVIP not detected on either machine. Bringing up the VIP on this host.');
          const cmd = ip_add_command;
          exec(cmd).catch(err => {
            console.log(err);
          });
        }
        if ((json_object.vip_detected === 'true' && found_vip === true)) {
          console.log('\nVIP detected on boths hosts! Stopping the VIP on this host.');
          const cmd = ip_delete_command;
          exec(cmd).catch(err => {
            console.log(err);
          });
        }
      }
    });
    send_ping();
  }, vip_ping_time);
}

app.get('/rsyslog', (req, res) => {
  const check_token = req.query.token;
  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    res.sendFile(config.rsyslog_logfile);
  }
});

app.get('/node-status', (req, res) => {
  const check_token = req.query.token;
  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    const json_output = JSON.stringify({
      cpu_percent,
      hostname: node,
      os_type: (os_type === '') ? os.platform() : os_type,
      disk_percentage,
      total_running_containers,
      running_containers,
      images,
      cpu_cores,
      memory_percentage
    });

    res.send(json_output);
  }
});

app.post('/killvip', (req, res) => {
  const check_token = req.body.token;
  if (check_token !== token) {
    return res.status(401).end('\nError: Invalid Credentials');
  }

  if (config.vip_ip) {
    const cmd = ip_delete_command;
    exec(cmd).then(() => {
      res.end('\nCompleted.');
    }).catch(err => {
      console.log(err);
    });
  }
});

app.post('/pong', (req, res) => {
  const check_token = req.body.token;
  if (check_token !== token) {
    return res.status(500).send('Something broke!');
  }

  let vip_status = 'false';
  const interfaces = require('os').networkInterfaces();

  Object.keys(interfaces).forEach(devName => {
    const iface = interfaces[devName];
    iface.forEach(alias => {
      if (alias.address === vip) {
        vip_status = 'true';
      }
    });
  });

  const body = {
    vip_detected: vip_status
  };
  res.send(body);
});

function unzipFile(file) {
  fs.createReadStream(file).pipe(new unzip.Extract({
    path: config.docker
  }));
}
app.post('/receive-file', upload.single('file'), (req, res) => {
  const check_token = req.body.token;
  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    fs.readFile(req.file.path, (err, data) => {
      const newPath = '../' + req.file.originalname;
      fs.writeFile(newPath, data, err => { // eslint-disable-line no-unused-vars
        unzipFile(newPath);
      });
    });
    res.end('Done');
  }
});

app.post('/run', (req, res) => {
  const output = {
    output: [],
    node
  };

  const check_token = req.body.token;

  if (check_token !== token) {
    return res.status(401).json({
      output: 'Not Authorized to connect to this agent!'
    });
  }

  // Backwards compatability...
  if (!('commands' in req.body) && 'command' in req.body) {
    req.body.commands = req.body.command;
  }

  const commands = (typeof req.body.commands === 'string') ? [req.body.commands] : req.body.commands;

  if (!(Array.isArray(commands))) {
    return res.status(400).json({
      output: 'Bad Request'
    });
  }

  async.eachSeries(commands, (command, cb) => {
    if (typeof command === 'string') {
      command = [command];
    }
    if (!(Array.isArray(command))) {
      return;
    }
    // Console.log('command', command);
    exec(command.join(' '), {
      cwd: __dirname
    }).then(log => {
      // Console.log('output', log);
      output.output.push(`${log.stdout || ''}${log.stderr || ''}`);
      return cb();
    }).catch(err => {
      // Console.log('error', err);
      output.output.push(`${err.stdout || ''}${err.stderr || ''}`);
      return cb(err);
    });
  }, err => {
    if (err) {
      console.error('error:', err);
    }
    // Console.log('output', output);
    res.json(output);
  });
});

if (config.ssl && config.ssl_cert && config.ssl_key) {
  console.log('SSL Agent API enabled');
  const ssl_options = {
    cert: fs.readFileSync(config.ssl_cert),
    key: fs.readFileSync(config.ssl_key)
  };
  const agent = https.createServer(ssl_options, app);
  agent.listen(agent_port, () => {
    console.log('Listening on port %d', agent_port);
  });
} else {
  console.log('Non-SSL Agent API enabled');
  const agent = http.createServer(app);
  agent.listen(agent_port, () => {
    console.log('Listening on port %d', agent_port);
  });
}
