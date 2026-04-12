module.exports = {
  apps: [{
    name: 'm3r-cloudflare',
    script: 'cloudflared',
    args: 'tunnel run m3r-trading-oracle',
    exec_mode: 'fork',
    autorestart: true
  }]
};
