// Load .env before anything else - EXPLICIT PATH
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Debug: Log if env vars loaded
console.log('[ENV] UPSTOX_API_KEY:', process.env.UPSTOX_API_KEY ? 'Loaded' : 'NOT FOUND');
console.log('[ENV] DATABASE_URL:', process.env.DATABASE_URL ? 'Loaded' : 'NOT FOUND');

// Define globals before anything loads
global.MIN_PROFIT_TARGET = 2000;
global.priceHistory = [];
global.nearestExpiry = "";
global.MIN_HOLD_SECONDS = 300;
global.LOSS_ALERT_THRESHOLD = 1000;
global.lastNiftySignalTime = 0;
global.positionSimInterval = null;

// Load and run the server
require('./server_dist/index.js');
