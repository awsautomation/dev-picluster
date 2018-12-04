const http = require('http');
const https = require('https');
const fs = require('fs');
const os = require('os');
const unzip = require('unzip-stream');
const express = require('express');
const request = require('request');
const diskspace = require('diskspace');
const bodyParser = require('body-parser');
const multer = require('multer');
const getos = require('picluster-getos');
const async = require('async');
const {
  exec
} = require('child-process-promise');
const sysinfo = require('systeminformation');

let config = process.env.PICLUSTER_CONFIG ? JSON.parse(fs.readFileSync(process.env.PICLUSTER_CONFIG, 'utf8')) : JSON.parse(fs.readFileSync('../config.json', 'utf8'));
const app = express();

if (config.ssl_self_signed) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

app.use(bodyParser());

const upload = multer({
  dest: '../'
});

const scheme = config.ssl ? 'https://' : 'http://';
const ssl_self_signed = config.ssl_self_signed === false;
let server = config.web_connect;
let {
  server_port
} = config;
const {
  agent_port
} = config;
const node = os.hostname();
let {
  token
} = config;
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
let container_uptime = '';
let network_rx = 0;
let network_tx = 0;
let running_containers = '';
let container_mem_stats = '';
let container_cpu_stats = '';
let cpu_cores = 0;
let memory_buffers = 0;
let memory_swap = 0;
let memory_total = 0;
let memory_used = 0;
let memory_percentage = 0;
let images = '';

function monitoring() {
  sysinfo.networkStats(data => {
    network_tx = Math.round(data.tx_sec / 1000);
    network_rx = Math.round(data.rx_sec / 1000);
  });

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

  exec('docker stats --no-stream  --format "{{.CPUPerc}}"', (err, stdout) => {
    if (err) {
      console.error(err);
    }
    container_cpu_stats = stdout.replace(/%/gi, '').split('\n');
  });

  exec('docker stats --no-stream  --format "{{.MemPerc}}"', (err, stdout) => {
    if (err) {
      console.error(err);
    }
    container_mem_stats = stdout.replace(/%/gi, '').split('\n');
  });

  exec('docker ps --format "{{.Status}}"', (err, stdout) => {
    if (err) {
      console.error(err);
    }
    container_uptime = stdout.split('\n');
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
      if (!err) {
        disk_percentage = Math.round(result.used / result.total * 100);
      }
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

function send_ping() {
  setTimeout(() => {
    const token_body = JSON.stringify({
      token
    });

    const options = {
      url: `${scheme}${vip_slave}:${agent_port}/pong`,
      rejectUnauthorized: ssl_self_signed,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': token_body.length
      },
      body: token_body
    };

    request(options, (error, response, body) => {
      let found_vip = false;
      if (error) {
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
          exec(cmd).catch(error2 => {
            console.log(error2);
          });
        }
        if ((json_object.vip_detected === 'true' && found_vip === true)) {
          console.log('\nVIP detected on boths hosts! Stopping the VIP on this host.');
          const cmd = ip_delete_command;
          exec(cmd).catch(error2 => {
            console.log(error2);
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
      container_mem_stats,
      container_cpu_stats,
      container_uptime,
      network_rx,
      network_tx,
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
    }).catch(error => {
      console.log(error);
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

function reloadConfig() {
  config = process.env.PICLUSTER_CONFIG ? JSON.parse(fs.readFileSync(process.env.PICLUSTER_CONFIG, 'utf8')) : JSON.parse(fs.readFileSync('../config.json', 'utf8'));
  token = config.token;
  server = config.web_connect;
  server_port = config.server_port;
}

app.post('/receive-file', upload.single('file'), (req, res) => {
  const check_token = req.body.token;
  const get_config_file = req.body.config_file;

  if ((check_token !== token) || (!check_token)) {
    res.end('\nError: Invalid Credentials');
  } else {
    fs.readFile(req.file.path, (err, data) => {
      if (err) {
        console.log('\nError reading file: ' + err);
      }
      let newPath = '../' + req.file.originalname;
      let config_file = '';

      if (get_config_file) {
        if (process.env.PICLUSTER_CONFIG) {
          config_file = process.env.PICLUSTER_CONFIG;
        } else {
          config_file = '../config.json';
        }
        newPath = config_file;
      }
      setTimeout(() => {
        fs.writeFile(newPath, data, err => {
          if (!err) {
            if (get_config_file) {
              reloadConfig();
            }

            if (req.file.originalname.indexOf('.zip') > -1) {
              unzipFile(newPath);
            }

            fs.unlink(req.file.path, error => {
              if (error) {
                console.log(error);
              }
            });
          }
        });
      }, 5000);
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
    }).catch(error => {
      // Console.log('error', err);
      output.output.push(`${error.stdout || ''}${error.stderr || ''}`);
      return cb(error);
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

function bootstrapNode() {
  setTimeout(() => {
    console.log('Attempting to bootstrap node to server......');
    const bootstrap_body = JSON.stringify({
      token,
      host: node
    });

    const options = {
      url: `${scheme}${server}:${server_port}/bootstrap`,
      rejectUnauthorized: ssl_self_signed,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': bootstrap_body.length
      },
      body: bootstrap_body
    };

    request(options, (error, response, body) => {
      if (error) {
        console.log('Bootstrap failed due to an error or another bootstrap operation already in progress.\n');
        console.log(error);
        bootstrapNode();
      } else {
        const status = JSON.parse(body);
        if (status.output > 0) {
          console.log('Bootstrap successful.');
          additional_services();
        } else {
          console.log('\nAnother bootstrap is in progress. Will try again soon.....');
          bootstrapNode();
        }
      }
    });
  }, 3000);
}

bootstrapNode();

function additional_services() {
  monitoring();

  if (config.autostart_containers) {
    console.log('Starting all the containers.....');

    const options = {
      url: `${scheme}${server}:${server_port}/start?token=${token}&container=*`,
      rejectUnauthorized: ssl_self_signed
    };

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
            const {
              vip_eth_device
            } = config.vip[i];
            ip_add_command = 'ip addr add ' + config.vip_ip + '/32 dev ' + vip_eth_device;
            ip_delete_command = 'ip addr del ' + config.vip_ip + '/32 dev ' + vip_eth_device;
            vip_ping_time = config.vip[i].vip_ping_time;
            exec(ip_delete_command).then(send_ping).catch(send_ping);
          });
        });
      });
    });
  }
}
