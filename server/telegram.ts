const TELEGRAM_API = "https://api.telegram.org";

function getConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID_OVERRIDE || process.env.TELEGRAM_CHAT_ID;
  return { token, chatId };
}

export function isTelegramConfigured(): boolean {
  const { token, chatId } = getConfig();
  return !!(token && chatId);
}

export async function sendTelegramMessage(
  text: string,
  parseMode: "HTML" | "Markdown" = "HTML"
): Promise<{ ok: boolean; error?: string }> {
  const { token, chatId } = getConfig();
  if (!token || !chatId) {
    return { ok: false, error: "Telegram bot token or chat ID not configured" };
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      return { ok: false, error: data.description || "Telegram API error" };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Network error" };
  }
}

export async function sendTradingAlert(params: {
  type: "BUY" | "SELL" | "EXIT" | "SL_HIT" | "TARGET_HIT" | "ALERT" | "INFO";
  symbol?: string;
  price?: number;
  message: string;
  pnl?: number;
}): Promise<{ ok: boolean; error?: string }> {
  const icons: Record<string, string> = {
    BUY: "🟢",
    SELL: "🔴",
    EXIT: "🔵",
    SL_HIT: "⛔",
    TARGET_HIT: "🎯",
    ALERT: "⚠️",
    INFO: "ℹ️",
  };
  const icon = icons[params.type] || "📊";

  let text = `${icon} <b>M3R FINTECH — ${params.type}</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━\n`;
  if (params.symbol) text += `📌 <b>Symbol:</b> ${params.symbol}\n`;
  if (params.price !== undefined) text += `💰 <b>Price:</b> ₹${params.price.toFixed(2)}\n`;
  text += `📝 ${params.message}\n`;
  if (params.pnl !== undefined) {
    const pnlIcon = params.pnl >= 0 ? "📈" : "📉";
    text += `${pnlIcon} <b>P&L:</b> ${params.pnl >= 0 ? "+" : ""}₹${params.pnl.toFixed(2)}\n`;
  }
  text += `━━━━━━━━━━━━━━━━━━\n`;
  text += `🕐 ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}\n`;
  text += `🤖 M3R LAMY v3.0`;

  return sendTelegramMessage(text);
}

export async function getBotInfo(): Promise<any> {
  const { token } = getConfig();
  if (!token) return null;
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/getMe`);
    const data = await res.json();
    return data.ok ? data.result : null;
  } catch {
    return null;
  }
}
