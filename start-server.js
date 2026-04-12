// Global constants patch
global.MIN_PROFIT_TARGET = 2000;
global.priceHistory = [];
global.nearestExpiry = "";
global.MIN_HOLD_SECONDS = 300;
global.LOSS_ALERT_THRESHOLD = 1000;
global.lastNiftySignalTime = 0;
global.positionSimInterval = null;

// Now start the server
require('./server_dist/index.js');
