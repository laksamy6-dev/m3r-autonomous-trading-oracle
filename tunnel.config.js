module.exports = {
  apps: [{
    name: 'm3r-tunnel',
    script: 'npx',
    args: 'localtunnel --port 5000',
    exec_mode: 'fork',
    autorestart: true,
    max_restarts: 10
  }]
};
