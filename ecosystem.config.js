module.exports = {
  apps: [{
    name: 'm3r-trading-oracle',
    script: './server_dist/index.js',
    cwd: '/root/m3r-autonomous-trading-oracle',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      PG_HOST: 'localhost',
      PG_PORT: 5432,
      PG_USER: 'm3r_user',
      PG_PASSWORD: 'm3r2024',
      PG_DATABASE: 'm3r_trading',
      PG_SSL: 'false',
      UPSTOX_API_KEY: '7b15b4a4-052f-4ec7-8e10-d34e458f1a8b',
      UPSTOX_API_SECRET: 'sgde6er76a',
      UPSTOX_REDIRECT_URI: 'https://143.110.233.187.nip.io/api/upstox/callback',
      GEMINI_API_KEY: 'AIzaSyDaRaAUAoyj9BlZ_fItiiUUfQ7i2lqu9z0',
      GEMINI_MODEL: 'gemini-2.5-flash-latest',
      TELEGRAM_BOT_TOKEN: '8734115646:AAF7ph2mII5LpLimUM2TmDNl9FVuzWeiXjo',
      TELEGRAM_CHAT_ID: '8584257466',
      OLLAMA_HOST: 'http://localhost:11434',
      OLLAMA_MODEL: 'llama3.2:1b'
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: '/root/.pm2/logs/m3r-error.log',
    out_file: '/root/.pm2/logs/m3r-out.log',
    merge_logs: true,
    max_restarts: 5,
    min_uptime: '10s',
    restart_delay: 3000,
    max_memory_restart: '1G',
    autorestart: true
  }]
};
