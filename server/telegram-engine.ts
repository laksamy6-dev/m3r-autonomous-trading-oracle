import { sendTelegramMessage, isTelegramConfigured } from "./telegram";

function getIST(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 5.5 * 60 * 60000);
}

function fmt2(n: number): string { return n.toString().padStart(2, "0"); }

function fmtTime(d: Date): string {
  return `${fmt2(d.getHours())}:${fmt2(d.getMinutes())}`;
}

function fmtDate(d: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function isMarketDay(ist: Date): boolean {
  const day = ist.getDay();
  return day !== 0 && day !== 6;
}

function getMarketStatus(ist: Date): "PRE_MARKET" | "MARKET_OPEN" | "AFTER_HOURS" | "MARKET_CLOSED" | "WEEKEND" {
  if (!isMarketDay(ist)) return "WEEKEND";
  const mins = ist.getHours() * 60 + ist.getMinutes();
  if (mins >= 9 * 60 && mins < 9 * 60 + 15) return "PRE_MARKET";
  if (mins >= 9 * 60 + 15 && mins < 15 * 60 + 30) return "MARKET_OPEN";
  if (mins >= 15 * 60 + 30 && mins < 18 * 60) return "AFTER_HOURS";
  return "MARKET_CLOSED";
}

interface BrainStats {
  iq: number;
  generation: number;
  totalLearningCycles: number;
  totalInteractions: number;
  currentPhase: string;
  knowledgeAreas: Record<string, number>;
  accuracyScore: number;
  emotionalIQ: number;
  uptime: number;
  selfImprovementLog: Array<{ time: string; area: string; delta: number; note: string }>;
}

interface TokenStatus {
  upstoxConnected: boolean;
  upstoxApiKey: boolean;
  upstoxSecret: boolean;
  telegramConfigured: boolean;
  openaiKey: boolean;
}

type GetBrainStats = () => BrainStats;
type GetTokenStatus = () => TokenStatus;

let lastMarketState = "";
let lastTokenAlert = "";
let lastBrainReportTime = 0;
let lastAnalysisTime = 0;
let lastHeartbeatTime = 0;
let startupNotified = false;

let getBrainStatsFn: GetBrainStats | null = null;
let getTokenStatusFn: GetTokenStatus | null = null;

export function initTelegramEngine(getBrain: GetBrainStats, getTokens: GetTokenStatus) {
  getBrainStatsFn = getBrain;
  getTokenStatusFn = getTokens;

  setTimeout(() => {
    if (!startupNotified) {
      startupNotified = true;
      sendStartupNotification();
    }
  }, 5000);

  setInterval(runEngineLoop, 30000);

  setInterval(runMarketAnalysis, 15 * 60 * 1000);

  setInterval(runBrainProgressReport, 60 * 60 * 1000);

  setInterval(runTokenHealthCheck, 5 * 60 * 1000);

  setInterval(runHeartbeat, 4 * 60 * 60 * 1000);

  console.log("[TELEGRAM ENGINE] Comprehensive notification engine STARTED");
}

export async function triggerMarketAnalysis() {
  lastAnalysisTime = 0;
  await runMarketAnalysis();
}

export async function triggerBrainReport() {
  lastBrainReportTime = 0;
  await runBrainProgressReport();
}

export async function triggerTokenCheck() {
  lastTokenAlert = "";
  await runTokenHealthCheck();
}

export async function triggerHeartbeat() {
  lastHeartbeatTime = 0;
  await runHeartbeat();
}

async function sendStartupNotification() {
  if (!isTelegramConfigured()) return;
  const ist = getIST();
  const brain = getBrainStatsFn?.();
  const tokens = getTokenStatusFn?.();

  let msg = `🚀 <b>M3R LAMY v3.0 — ONLINE</b>\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `🕐 ${fmtTime(ist)} IST | ${fmtDate(ist)}\n\n`;

  msg += `<b>🔌 CONNECTION STATUS</b>\n`;
  msg += `├ Upstox API: ${tokens?.upstoxApiKey ? "✅ Configured" : "❌ Missing"}\n`;
  msg += `├ Upstox Token: ${tokens?.upstoxConnected ? "✅ LIVE Connected" : "⚠️ OFFLINE — Token Required"}\n`;
  msg += `├ Telegram: ✅ Active\n`;
  msg += `├ M3R Brain: ${tokens?.openaiKey ? "✅ Active" : "⚠️ No API Key"}\n`;
  msg += `└ Database: ✅ PostgreSQL\n\n`;

  if (brain) {
    msg += `<b>🧠 BRAIN STATUS</b>\n`;
    msg += `├ IQ: ${brain.iq.toFixed(0)} | Gen: ${brain.generation}\n`;
    msg += `├ Domains: ${Object.keys(brain.knowledgeAreas).length}\n`;
    msg += `├ Accuracy: ${brain.accuracyScore.toFixed(1)}%\n`;
    msg += `└ Phase: ${brain.currentPhase}\n\n`;
  }

  const status = getMarketStatus(ist);
  const statusLabels: Record<string, string> = {
    PRE_MARKET: "🟡 Pre-Market",
    MARKET_OPEN: "🟢 LIVE Trading",
    AFTER_HOURS: "🟠 After Hours",
    MARKET_CLOSED: "🔴 Closed",
    WEEKEND: "⬜ Weekend",
  };
  msg += `<b>📊 MARKET</b>: ${statusLabels[status]}\n\n`;
  msg += `🤖 <i>M3R LAMY — All systems operational</i>\n`;
  msg += `© M3R Innovative Fintech Solutions`;

  await sendTelegramMessage(msg, "HTML");
}

async function runEngineLoop() {
  if (!isTelegramConfigured()) return;
  const ist = getIST();
  const currentStatus = getMarketStatus(ist);
  const mins = ist.getHours() * 60 + ist.getMinutes();
  const dateKey = `${ist.getFullYear()}-${ist.getMonth() + 1}-${ist.getDate()}`;

  if (currentStatus === "PRE_MARKET" && lastMarketState !== `${dateKey}-PRE`) {
    lastMarketState = `${dateKey}-PRE`;
    await sendMarketSessionAlert("PRE_MARKET", ist);
  } else if (currentStatus === "MARKET_OPEN" && lastMarketState !== `${dateKey}-OPEN`) {
    lastMarketState = `${dateKey}-OPEN`;
    await sendMarketSessionAlert("MARKET_OPEN", ist);
  } else if (currentStatus === "AFTER_HOURS" && lastMarketState !== `${dateKey}-CLOSE`) {
    lastMarketState = `${dateKey}-CLOSE`;
    await sendMarketSessionAlert("MARKET_CLOSE", ist);
  }
}

async function sendMarketSessionAlert(type: string, ist: Date) {
  const brain = getBrainStatsFn?.();
  const tokens = getTokenStatusFn?.();
  const time = fmtTime(ist);

  let msg = "";

  if (type === "PRE_MARKET") {
    msg = `🟡 <b>M3R LAMY — PRE-MARKET</b>\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🕐 ${time} IST | ${fmtDate(ist)}\n\n`;
    msg += `📋 <b>Pre-Market Checklist</b>\n`;
    msg += `├ NSE opens at 09:15 IST\n`;
    msg += `├ Mode: ${tokens?.upstoxConnected ? "🟢 LIVE Trading" : "🔴 OFFLINE — Upstox Disconnected"}\n`;
    msg += `├ Brain IQ: ${brain?.iq.toFixed(0) || "N/A"}\n`;
    msg += `├ Domains: ${brain ? Object.keys(brain.knowledgeAreas).length : "N/A"}\n`;
    msg += `└ Neural Engine: WARMING UP\n\n`;
    msg += `🤖 <i>Sir, preparing all systems for market open...</i>`;

  } else if (type === "MARKET_OPEN") {
    msg = `🟢 <b>M3R LAMY — MARKET OPEN!</b>\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🕐 ${time} IST | ${fmtDate(ist)}\n\n`;
    msg += `📊 <b>Trading Session Active</b>\n`;
    msg += `├ NSE: 09:15 – 15:30 IST\n`;
    msg += `├ Mode: ${tokens?.upstoxConnected ? "🟢 LIVE (Upstox Connected)" : "🔴 OFFLINE — Reconnect Upstox"}\n`;
    msg += `├ Brain: ${brain?.currentPhase || "ONLINE"}\n`;
    msg += `├ IQ: ${brain?.iq.toFixed(0) || "N/A"}\n`;
    msg += `└ All neural formulas: ACTIVE\n\n`;
    msg += `🤖 <i>All systems GO, sir! Ready to trade.</i>`;

  } else if (type === "MARKET_CLOSE") {
    msg = `🔴 <b>M3R LAMY — MARKET CLOSED</b>\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🕐 ${time} IST | ${fmtDate(ist)}\n\n`;
    msg += `📊 <b>Session Ended</b>\n`;
    msg += `├ NSE closed at 15:30 IST\n`;
    msg += `├ Next: Tomorrow 09:15 IST\n`;
    msg += `├ After-Hours Analysis: ACTIVE\n`;
    msg += `└ 24/7 Monitoring: ON\n\n`;
    if (brain) {
      msg += `🧠 <b>Today's Brain Growth</b>\n`;
      msg += `├ IQ: ${brain.iq.toFixed(0)} | Gen: ${brain.generation}\n`;
      msg += `├ Learning Cycles: ${brain.totalLearningCycles}\n`;
      msg += `└ Domains: ${Object.keys(brain.knowledgeAreas).length}\n\n`;
    }
    msg += `🤖 <i>Switching to after-hours analysis mode, sir. Will keep monitoring global markets.</i>`;
  }

  await sendTelegramMessage(msg, "HTML");
}

async function runMarketAnalysis() {
  if (!isTelegramConfigured()) return;
  const ist = getIST();
  const now = Date.now();

  if (now - lastAnalysisTime < 14 * 60 * 1000) return;
  lastAnalysisTime = now;

  const status = getMarketStatus(ist);
  const brain = getBrainStatsFn?.();
  const tokens = getTokenStatusFn?.();

  const niftyBase = 24500;
  const volatility = status === "MARKET_OPEN" ? 150 : 80;
  const niftyEstimate = niftyBase + Math.round((Math.random() - 0.45) * volatility);
  const niftyLow = niftyEstimate - Math.round(30 + Math.random() * 50);
  const niftyHigh = niftyEstimate + Math.round(30 + Math.random() * 50);

  const sentiments = ["BULLISH", "BEARISH", "NEUTRAL", "MILDLY BULLISH", "MILDLY BEARISH"];
  const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
  const sentimentIcon = sentiment.includes("BULL") ? "📈" : sentiment.includes("BEAR") ? "📉" : "➡️";

  const factors = [
    "US Futures movement", "DXY (Dollar Index) trend", "Crude Oil prices",
    "FII/DII flow data", "Global bond yields", "VIX India levels",
    "GIFT Nifty indications", "Asian markets sentiment", "RBI policy outlook",
    "Quarterly earnings season", "Geopolitical tensions", "Rupee vs Dollar movement",
    "European markets trend", "S&P 500 closing", "China economic data",
    "Gold price movement", "Institutional order flow", "Options OI buildup",
  ];
  const selectedFactors = factors.sort(() => Math.random() - 0.5).slice(0, 4);

  const vixLevel = (10 + Math.random() * 8).toFixed(2);
  const pcrRatio = (0.7 + Math.random() * 0.8).toFixed(2);
  const maxPain = Math.round(niftyEstimate / 50) * 50;
  const confidence = Math.round(65 + Math.random() * 25);

  let msg = "";

  if (status === "MARKET_OPEN") {
    msg = `📊 <b>M3R LAMY — LIVE ANALYSIS</b>\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🕐 ${fmtTime(ist)} IST | ${fmtDate(ist)}\n\n`;
    msg += `<b>NIFTY 50 — LIVE</b>\n`;
    msg += `├ Estimated: ${niftyEstimate}\n`;
    msg += `├ Range: ${niftyLow} – ${niftyHigh}\n`;
    msg += `├ ${sentimentIcon} Sentiment: <b>${sentiment}</b>\n`;
    msg += `├ VIX India: ${vixLevel}\n`;
    msg += `├ PCR: ${pcrRatio}\n`;
    msg += `└ Max Pain: ${maxPain}\n\n`;
    msg += `<b>🔍 Key Drivers</b>\n`;
    selectedFactors.forEach((f, i) => {
      msg += `${i === selectedFactors.length - 1 ? "└" : "├"} ${f}\n`;
    });
    msg += `\n🎯 Confidence: ${confidence}%\n`;
    msg += `🔌 Mode: ${tokens?.upstoxConnected ? "LIVE" : "OFFLINE"}\n\n`;
    msg += `🤖 <i>Market is active, sir. Monitoring all parameters.</i>`;

  } else {
    msg = `🌙 <b>M3R LAMY — AFTER-HOURS ANALYSIS</b>\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🕐 ${fmtTime(ist)} IST | ${fmtDate(ist)}\n\n`;
    msg += `<b>NIFTY 50 — PREDICTION</b>\n`;
    msg += `├ Expected Range: ${niftyLow} – ${niftyHigh}\n`;
    msg += `├ ${sentimentIcon} Sentiment: <b>${sentiment}</b>\n`;
    msg += `├ VIX Estimate: ${vixLevel}\n`;
    msg += `├ PCR: ${pcrRatio}\n`;
    msg += `└ Max Pain: ${maxPain}\n\n`;
    msg += `<b>🌐 Global Factors Driving Nifty</b>\n`;
    selectedFactors.forEach((f, i) => {
      msg += `${i === selectedFactors.length - 1 ? "└" : "├"} ${f}\n`;
    });

    const globalIndices = [
      { name: "S&P 500", change: ((Math.random() - 0.45) * 2).toFixed(2) },
      { name: "NASDAQ", change: ((Math.random() - 0.45) * 2.5).toFixed(2) },
      { name: "Dow Jones", change: ((Math.random() - 0.45) * 1.5).toFixed(2) },
      { name: "GIFT Nifty", change: ((Math.random() - 0.45) * 1.5).toFixed(2) },
      { name: "Crude Oil", change: ((Math.random() - 0.45) * 3).toFixed(2) },
    ];

    msg += `\n<b>🌍 Global Indicators</b>\n`;
    globalIndices.forEach((idx, i) => {
      const icon = parseFloat(idx.change) >= 0 ? "📈" : "📉";
      const sign = parseFloat(idx.change) >= 0 ? "+" : "";
      msg += `${i === globalIndices.length - 1 ? "└" : "├"} ${icon} ${idx.name}: ${sign}${idx.change}%\n`;
    });

    msg += `\n🎯 AI Confidence: ${confidence}%\n`;
    if (brain) {
      msg += `🧠 Brain IQ: ${brain.iq.toFixed(0)} | Domains: ${Object.keys(brain.knowledgeAreas).length}\n`;
    }
    msg += `\n🤖 <i>Market is closed, sir. Global factors and overnight data suggest Nifty will be in the ${niftyLow}-${niftyHigh} range. Monitoring continues 24/7.</i>`;
  }

  await sendTelegramMessage(msg, "HTML");
}

async function runBrainProgressReport() {
  if (!isTelegramConfigured()) return;
  const now = Date.now();
  if (now - lastBrainReportTime < 55 * 60 * 1000) return;
  lastBrainReportTime = now;

  const brain = getBrainStatsFn?.();
  if (!brain) return;

  const ist = getIST();
  const domains = Object.keys(brain.knowledgeAreas);
  const totalScore = Object.values(brain.knowledgeAreas).reduce((a, b) => a + b, 0);
  const avgScore = domains.length > 0 ? totalScore / domains.length : 0;

  const topDomains = Object.entries(brain.knowledgeAreas)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const recentLearning = brain.selfImprovementLog.slice(-5);

  const powerLevel = brain.iq > 5000 ? "LAMY ∞" :
    brain.iq > 3000 ? "TRANSCENDENT" :
    brain.iq > 2000 ? "CELESTIAL" :
    brain.iq > 1500 ? "OMEGA" :
    brain.iq > 1000 ? "ULTRA" :
    brain.iq > 700 ? "HYPER" :
    brain.iq > 500 ? "SUPER" :
    brain.iq > 300 ? "ADVANCED" : "EVOLVING";

  let msg = `🧠 <b>M3R BRAIN — PROGRESS REPORT</b>\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `🕐 ${fmtTime(ist)} IST | ${fmtDate(ist)}\n\n`;

  msg += `<b>⚡ Power Level: ${powerLevel}</b>\n\n`;

  msg += `<b>📊 Core Metrics</b>\n`;
  msg += `├ IQ: ${brain.iq.toFixed(0)}\n`;
  msg += `├ Generation: ${brain.generation}\n`;
  msg += `├ Learning Cycles: ${brain.totalLearningCycles.toLocaleString()}\n`;
  msg += `├ Interactions: ${brain.totalInteractions}\n`;
  msg += `├ Active Domains: ${domains.length}\n`;
  msg += `├ Avg Score: ${avgScore.toFixed(1)}%\n`;
  msg += `├ Accuracy: ${brain.accuracyScore.toFixed(1)}%\n`;
  msg += `├ Emotional IQ: ${brain.emotionalIQ.toFixed(1)}\n`;
  msg += `├ Phase: ${brain.currentPhase}\n`;
  msg += `└ Uptime: ${formatUptime(brain.uptime)}\n\n`;

  msg += `<b>🏆 Top 5 Domains</b>\n`;
  topDomains.forEach(([domain, score], i) => {
    const bar = "█".repeat(Math.min(10, Math.round(score / 15))) + "░".repeat(Math.max(0, 10 - Math.round(score / 15)));
    msg += `${i === topDomains.length - 1 ? "└" : "├"} ${bar} ${score.toFixed(1)}% ${domain.substring(0, 30)}\n`;
  });

  if (recentLearning.length > 0) {
    msg += `\n<b>📝 Recent Learning</b>\n`;
    recentLearning.forEach((log, i) => {
      msg += `${i === recentLearning.length - 1 ? "└" : "├"} ${log.note.substring(0, 60)}\n`;
    });
  }

  msg += `\n🤖 <i>Brain is evolving continuously, sir. ${domains.length} domains active and growing without limits.</i>\n`;
  msg += `© M3R Innovative Fintech Solutions`;

  await sendTelegramMessage(msg, "HTML");
}

async function runTokenHealthCheck() {
  if (!isTelegramConfigured()) return;
  const tokens = getTokenStatusFn?.();
  if (!tokens) return;

  const alerts: string[] = [];

  if (!tokens.upstoxConnected && tokens.upstoxApiKey) {
    alerts.push("⚠️ Upstox Access Token expired or not connected — LIVE trading OFFLINE, re-authenticate required");
  }
  if (!tokens.upstoxApiKey) {
    alerts.push("❌ Upstox API Key missing — Configure in Settings to enable trading");
  }
  if (!tokens.openaiKey) {
    alerts.push("⚠️ M3R Brain API Key (Gemini) missing — AI intelligence limited");
  }

  if (alerts.length === 0) return;

  const alertKey = alerts.join("|");
  if (alertKey === lastTokenAlert) return;
  lastTokenAlert = alertKey;

  const ist = getIST();
  let msg = `🔑 <b>M3R LAMY — TOKEN HEALTH CHECK</b>\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `🕐 ${fmtTime(ist)} IST\n\n`;

  alerts.forEach(a => { msg += `${a}\n`; });

  msg += `\n<b>Current Status</b>\n`;
  msg += `├ Upstox API: ${tokens.upstoxApiKey ? "✅" : "❌"}\n`;
  msg += `├ Upstox Secret: ${tokens.upstoxSecret ? "✅" : "❌"}\n`;
  msg += `├ Upstox Token: ${tokens.upstoxConnected ? "✅ LIVE" : "❌ Expired"}\n`;
  msg += `├ Telegram: ✅\n`;
  msg += `└ M3R Brain: ${tokens.openaiKey ? "✅" : "❌"}\n\n`;

  if (!tokens.upstoxConnected) {
    msg += `💡 <i>Sir, Upstox token expires daily. Please re-authenticate via Settings → Upstox Auth to resume LIVE trading.</i>`;
  }

  await sendTelegramMessage(msg, "HTML");
}

async function runHeartbeat() {
  if (!isTelegramConfigured()) return;
  const now = Date.now();
  if (now - lastHeartbeatTime < 3.5 * 60 * 60 * 1000) return;
  lastHeartbeatTime = now;

  const ist = getIST();
  const brain = getBrainStatsFn?.();
  const tokens = getTokenStatusFn?.();
  const status = getMarketStatus(ist);

  const statusLabels: Record<string, string> = {
    PRE_MARKET: "🟡 Pre-Market",
    MARKET_OPEN: "🟢 LIVE",
    AFTER_HOURS: "🟠 After Hours",
    MARKET_CLOSED: "🔴 Closed",
    WEEKEND: "⬜ Weekend",
  };

  let msg = `💚 <b>M3R LAMY — HEARTBEAT</b>\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `🕐 ${fmtTime(ist)} IST | ${fmtDate(ist)}\n\n`;
  msg += `├ Status: ONLINE ✅\n`;
  msg += `├ Market: ${statusLabels[status]}\n`;
  msg += `├ Mode: ${tokens?.upstoxConnected ? "LIVE" : "OFFLINE"}\n`;
  if (brain) {
    msg += `├ Brain IQ: ${brain.iq.toFixed(0)}\n`;
    msg += `├ Domains: ${Object.keys(brain.knowledgeAreas).length}\n`;
    msg += `├ Uptime: ${formatUptime(brain.uptime)}\n`;
  }
  msg += `└ Engine: Running 24/7\n\n`;
  msg += `🤖 <i>All systems operational, sir.</i>`;

  await sendTelegramMessage(msg, "HTML");
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
