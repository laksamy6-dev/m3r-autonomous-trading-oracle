/* Minimal initTelegram stub — replace with real implementation from your repo */
export async function initTelegram(..._args:any) {
  // intentionally minimal: initialize later with real code
  return;
}

export async function sendTelegramMessage(chatId:any, text:any, opts?:any) {
  // minimal no-op implementation to satisfy imports
  return { ok: false, reason: "stub" };
}

export function isTelegramConfigured() {
  return false;
}

export async function sendTradingAlert(payload:any) {
  return;
}

export async function getBotInfo() {
  return { id: null, username: null };
}
