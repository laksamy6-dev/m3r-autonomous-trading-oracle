module.exports = {
  apps: [{
    name: 'm3r-ngrok',
    script: 'ngrok',
    args: 'http 5000 --url=m3r-trading-oracle.ngrok-free.app',
    exec_mode: 'fork',
    autorestart: true,
    watch: false
  }]
};
