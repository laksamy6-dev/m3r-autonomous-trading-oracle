// FORCE LIVE MODE - NO MOCK DATA
export const config = {
  MOCK_DATA: false,
  PAPER_TRADING: false,
  DEMO_MODE: false,
  LIVE_DATA: true,
  USE_UPSTOX_API: true
};

// Override any mock generators
export const isMock = () => false;
export const isLive = () => true;
