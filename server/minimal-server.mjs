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

// Root
app.get('/', (req, res) => {
  res.json({ 
    status: 'online',
    service: 'M3R Trading Oracle',
    version: '3.0',
    endpoints: [
      '/',
      '/health', 
      '/api/auth/upstox',
      '/api/auth/upstox/callback',
      '/api/upstox/postback',
      '/api/upstox/webhook'
    ],
    timestamp: new Date().toISOString()
  });
});

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Upstox Auth
app.get('/api/auth/upstox', (req, res) => {
  const clientId = upstoxConfig.api_key || '7b15b4a4-052f-4ec7-8e10-d34e458f1a8b';
  const redirectUri = 'https://m3r-trading-oracle.com/api/auth/upstox/callback';
  const authUrl = `https://api.upstox.com/v2/login/authorization/dialog?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  res.redirect(authUrl);
});

// Upstox Callback - THIS IS THE KEY ROUTE
app.get('/api/auth/upstox/callback', (req, res) => {
  const { code, error } = req.query;
  console.log('[UPSTOX CALLBACK]', { code: code ? 'present' : 'missing', error });
  
  if (error) {
    return res.status(400).json({ error: 'Auth failed', details: error });
  }
  if (!code) {
    return res.status(400).json({ error: 'No code received' });
  }
  
  res.json({
    status: 'success',
    message: 'Authorization code received',
    code_preview: code.substring(0, 10) + '...',
    timestamp: new Date().toISOString()
  });
});

// Postback & Webhook
app.post('/api/upstox/postback', (req, res) => {
  console.log('[POSTBACK]', req.body);
  res.send('OK');
});

app.post('/api/upstox/webhook', (req, res) => {
  console.log('[WEBHOOK]', req.body);
  res.send('OK');
});

server.listen(port, '0.0.0.0', () => {
  console.log(`[SERVER] M3R Trading Oracle on port ${port}`);
});

// Load Upstox


// Load Upstox Configuration

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let upstoxConfig = null;
try {
  const configPath = join(__dirname, '..', 'config', 'upstox.json');
  upstoxConfig = JSON.parse(readFileSync(configPath, 'utf8'));
  console.log('[UPSTOX] Config loaded successfully');
  console.log('[UPSTOX] API Base:', upstoxConfig.api_base);
  console.log('[UPSTOX] Redirect URI:', upstoxConfig.redirect_uri);
} catch (err) {
  console.error('[UPSTOX] Failed to load config:', err.message);
  upstoxConfig = {
    api_key: process.env.UPSTOX_API_KEY || '',
    api_secret: process.env.UPSTOX_API_SECRET || '',
    redirect_uri: process.env.UPSTOX_REDIRECT_URI || '',
    api_base: 'https://api.upstox.com/v2',
    version: '2.0'
  };
}

// Export for use in routes
export { upstoxConfig };

// Helper to get Upstox headers
export function getUpstoxHeaders(accessToken = null) {
  const headers = {
    'Content-Type': 'application/json',
    'Api-Version': '2.0'
  };
  if (upstoxConfig.api_key) headers['X-API-KEY'] = upstoxConfig.api_key;
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  return headers;
}













