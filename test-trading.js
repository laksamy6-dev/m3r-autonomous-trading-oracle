const http = require('http');

console.log("=== M3R LIVE TRADING VERIFICATION ===\n");

// Test 1: Server Health
http.get('http://localhost:3000/api/health', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log("✓ Server:", data);
    
    // Test 2: Upstox Profile (Real or Paper?)
    http.get('http://localhost:3000/api/upstox/profile', (res2) => {
      let data2 = '';
      res2.on('data', chunk => data2 += chunk);
      res2.on('end', () => {
        try {
          const profile = JSON.parse(data2);
          console.log("\n✓ Upstox Email:", profile.data?.email || "NOT CONNECTED");
          console.log("✓ Broker:", profile.data?.broker || "Unknown");
          console.log("✓ Mode:", profile.data?.is_active ? "🟢 LIVE ACCOUNT" : "🔴 NOT ACTIVE");
          
          if (profile.data?.email) {
            console.log("\n🟢 VERDICT: REAL TRADING ACCOUNT CONNECTED");
            console.log("⚠️  WARNING: This will place REAL orders with REAL money!");
          } else {
            console.log("\n🔴 VERDICT: NOT CONNECTED - Check API keys in .env");
          }
        } catch(e) {
          console.log("\n🔴 Upstox Error:", data2.substring(0, 200));
        }
      });
    }).end();
  });
}).on('error', (e) => {
  console.log("🔴 Server Error:", e.message);
}).end();
