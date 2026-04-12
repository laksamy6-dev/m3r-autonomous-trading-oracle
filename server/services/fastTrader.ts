// Ultra-fast intent parser - no LLM needed
export function parseTradeIntent(message: string): {action: string, symbol: string, qty: number} | null {
  const msg = message.toLowerCase().trim();
  
  // Tamil + English keyword matching
  const isBuy = /buy|purchase|வாங்கு|கொள்முதல்/.test(msg);
  const isSell = /sell|விற்கு|விற்பனை/.test(msg);
  const isStatus = /status|position|நிலை|இடம்/.test(msg);
  
  if (!isBuy && !isSell && !isStatus) return null;
  
  // Extract NIFTY/BANKNIFTY with strike
  const symbolMatch = msg.match(/(nifty|banknifty|finnifty)\s*(\d+)/i);
  const strike = symbolMatch ? symbolMatch[2] : null;
  const index = symbolMatch ? symbolMatch[1].toUpperCase() : 'NIFTY';
  
  // Extract CE/PE
  const isCE = /ce|call|கால்/.test(msg);
  const isPE = /pe|put|புட்/.test(msg);
  const optionType = isCE ? 'CE' : (isPE ? 'PE' : 'CE');
  
  // Extract quantity
  const qtyMatch = msg.match(/(\d+)\s*(lot|quantity|qty|மடங்கு)/);
  const qty = qtyMatch ? parseInt(qtyMatch[1]) * 75 : 75; // Default 1 lot
  
  if (isStatus) return {action: 'STATUS', symbol: 'ALL', qty: 0};
  
  return {
    action: isBuy ? 'BUY' : 'SELL',
    symbol: `${index}${strike}${optionType}`,
    qty: qty
  };
}
