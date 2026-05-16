module.exports = {
  apps: [{
    name: "m3r-server",
    script: "./server_dist/index.js",
    env: {
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/m3r_db"
      // add TELEGRAM_BOT_TOKEN, GEMINI_API_KEY, UPSTOX_* here if needed
    }
  }]
}
