// Live market data via HTTP polling (no WebSocket needed)
let marketCache: any = {};
let lastUpdate = 0;

export const startMarketPoller = (accessToken: string) => {
  setInterval(async () => {
    try {
      const response = await fetch('https://api-v2.upstox.com/market-quote/quotes', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        marketCache = data.data || {};
        lastUpdate = Date.now();
      }
    } catch (err) {
      // Silent fail - will retry in 5 seconds
    }
  }, 5000);
};

export const getMarketData = () => ({
  timestamp: lastUpdate,
  data: marketCache,
  live: lastUpdate > Date.now() - 10000
});
