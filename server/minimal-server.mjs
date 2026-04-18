import express from 'express';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const app = express();
const server = createServer(app);
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load Upstox Config
let upstoxConfig = null;
try {
  const configPath = join(__dirname, '..', 'config', 'upstox.json');
  upstoxConfig = JSON.parse(readFileSync(configPath, 'utf8'));
  console.log('[UPSTOX] Config loaded');
} catch (err) {
  upstoxConfig = {
    api_key: process.env.UPSTOX_API_KEY || '',
    api_secret: process.env.UPSTOX_API_SECRET || '',
    redirect_uri: process.env.UPSTOX_REDIRECT_URI || '',
    api_base: 'https://api.upstox.com/v2',
    version: '2.0'
  };
}

// SERVE STATIC FRONTEND FROM server_dist
const staticPath = join(__dirname, '..', 'server_dist');
app.use(express.static(staticPath, { maxAge: 0 }));

// API Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Upstox Auth
app.get('/api/auth/upstox', (req, res) => {
  const clientId = upstoxConfig.api_key;
  const redirectUri = upstoxConfig.redirect_uri;
  if (!clientId) return res.status(500).json({ error: 'API key not configured' });
  const authUrl = 'https://api.upstox.com/v2/login/authorization/dialog?response_type=code&client_id=' + clientId + '&redirect_uri=' + encodeURIComponent(redirectUri);
  res.redirect(authUrl);
});

app.get('/api/auth/upstox/callback', (req, res) => {
  const code = req.query.code;
  const error = req.query.error;
  if (error) return res.status(400).json({ error: error, message: 'Auth failed' });
  if (!code) return res.status(400).json({ error: 'No code received' });
  res.json({ status: 'success', code_preview: code.substring(0, 6) + '...' });
});

app.post('/api/upstox/postback', (req, res) => {
  console.log('[POSTBACK]', req.body);
  res.json({ status: 'received' });
});

app.post('/api/upstox/webhook', (req, res) => {
  console.log('[WEBHOOK]', req.body);
  res.json({ status: 'received' });
});

// SPA CATCH-ALL - MUST BE LAST
app.get('*', (req, res) => {
  res.sendFile(join(staticPath, 'index.html'));
});

server.listen(port, '0.0.0.0', () => {
  console.log('[SERVER] M3R Trading Oracle on port ' + port);
  console.log('[FRONTEND] Serving from: ' + staticPath);
});

export { upstoxConfig };