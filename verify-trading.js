const http = require('http');

console.log("=== M3R TRADING VERIFICATION ===\n");

// Test 1: Check if server is running
const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/health',
  method: 'GET',
  timeout: 5000
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log("✓ Server Health:", data);
    
    // Test 2: Check Upstox connection
    const upstoxReq = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/upstox/profile',
      method: 'GET',
      timeout: 5000
    }, (upstoxRes) => {
      let upstoxData = '';
      upstoxRes.on('data', chunk => upstoxData += chunk);
      upstoxRes.on('end', () => {
        try {
          const profile = JSON.parse(upstoxData);
          console.log("✓ Upstox Connected:", profile.data?.email || "Paper Trading Mode");
          console.log("✓ Broker:", profile.data?.broker || "Not connected");
        } catch (e) {
          console.log("✗ Upstox not connected - Check API keys in .env");
        }
      });
    });
    
    upstoxReq.on('error', (e) => {
      console.log("✗ Upstox endpoint error:", e.message);
    });
    
    upstoxReq.end();
  });
});

req.on('error', (e) => {
  console.log("✗ Server not running on port 3000:", e.message);
  console.log("→ Check: pm2 logs m3r-trading-oracle");
});

req.end();
