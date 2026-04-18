const express = require('express');
const app = express();
const port = process.env.PORT || 5000;

app.get('/health', (req, res) => res.json({status: 'ok', time: Date.now()}));

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`[SERVER] Running on port ${port}`);
});

// Now load the real routes asynchronously (don't block)
setTimeout(() => {
  try {
    const { registerRoutes } = require('./routes');
    registerRoutes(app).catch(e => console.log('[DB] Routes loaded with errors:', e.message));
  } catch(e) {
    console.log('[DB] Could not load routes:', e.message);
  }
}, 1000);
