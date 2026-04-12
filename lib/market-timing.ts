export interface MarketSession {
  istTime: string;
  uaeTime: string;
  istDate: string;
  uaeDate: string;
  sessionStatus: "PRE_MARKET" | "MARKET_OPEN" | "MARKET_CLOSED" | "AFTER_HOURS";
  sessionLabel: string;
  sessionColor: string;
  timeToOpen: string;
  timeToClose: string;
  marketOpenIST: string;
  marketCloseIST: string;
  marketOpenUAE: string;
  marketCloseUAE: string;
  isWeekend: boolean;
  nextSessionEvent: string;
  progressPercent: number;
}

const IST_OFFSET = 5.5 * 60;
const UAE_OFFSET = 4 * 60;
const MARKET_OPEN_HOUR = 9;
const MARKET_OPEN_MIN = 15;
const MARKET_CLOSE_HOUR = 15;
const MARKET_CLOSE_MIN = 30;
const PRE_MARKET_HOUR = 9;
const PRE_MARKET_MIN = 0;

function getISTDate(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + IST_OFFSET * 60000);
}

function getUAEDate(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + UAE_OFFSET * 60000);
}

function fmt2(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatTime(d: Date): string {
  return `${fmt2(d.getHours())}:${fmt2(d.getMinutes())}:${fmt2(d.getSeconds())}`;
}

function formatDate(d: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function minsFromMidnight(h: number, m: number): number {
  return h * 60 + m;
}

function formatDuration(totalMins: number): string {
  if (totalMins <= 0) return "0m";
  const hrs = Math.floor(totalMins / 60);
  const mins = Math.round(totalMins % 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

export function getMarketSession(): MarketSession {
  const ist = getISTDate();
  const uae = getUAEDate();

  const istTime = formatTime(ist);
  const uaeTime = formatTime(uae);
  const istDate = formatDate(ist);
  const uaeDate = formatDate(uae);

  const dayOfWeek = ist.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const currentMins = minsFromMidnight(ist.getHours(), ist.getMinutes());
  const openMins = minsFromMidnight(MARKET_OPEN_HOUR, MARKET_OPEN_MIN);
  const closeMins = minsFromMidnight(MARKET_CLOSE_HOUR, MARKET_CLOSE_MIN);
  const preMarketMins = minsFromMidnight(PRE_MARKET_HOUR, PRE_MARKET_MIN);

  let sessionStatus: MarketSession["sessionStatus"];
  let sessionLabel: string;
  let sessionColor: string;
  let timeToOpen: string;
  let timeToClose: string;
  let nextSessionEvent: string;
  let progressPercent = 0;

  if (isWeekend) {
    sessionStatus = "MARKET_CLOSED";
    sessionLabel = "Weekend - Market Closed";
    sessionColor = "#EF4444";
    timeToOpen = dayOfWeek === 6 ? "Opens Monday 9:15 IST / 7:45 UAE" : "Opens Tomorrow 9:15 IST / 7:45 UAE";
    timeToClose = "--";
    nextSessionEvent = dayOfWeek === 6 ? "Next session: Monday" : "Next session: Tomorrow";
    progressPercent = 0;
  } else if (currentMins < preMarketMins) {
    sessionStatus = "MARKET_CLOSED";
    sessionLabel = "Before Pre-Market";
    sessionColor = "#64748B";
    timeToOpen = formatDuration(openMins - currentMins);
    timeToClose = "--";
    nextSessionEvent = `Pre-market opens in ${formatDuration(preMarketMins - currentMins)}`;
    progressPercent = 0;
  } else if (currentMins >= preMarketMins && currentMins < openMins) {
    sessionStatus = "PRE_MARKET";
    sessionLabel = "Pre-Market Session";
    sessionColor = "#F59E0B";
    timeToOpen = formatDuration(openMins - currentMins);
    timeToClose = formatDuration(closeMins - currentMins);
    nextSessionEvent = `Market opens in ${timeToOpen}`;
    progressPercent = Math.round(((currentMins - preMarketMins) / (openMins - preMarketMins)) * 100);
  } else if (currentMins >= openMins && currentMins < closeMins) {
    sessionStatus = "MARKET_OPEN";
    sessionLabel = "Market Open - Live Trading";
    sessionColor = "#10B981";
    timeToOpen = "NOW";
    timeToClose = formatDuration(closeMins - currentMins);
    const totalSession = closeMins - openMins;
    const elapsed = currentMins - openMins;
    progressPercent = Math.round((elapsed / totalSession) * 100);
    nextSessionEvent = `Market closes in ${timeToClose}`;
  } else {
    sessionStatus = "AFTER_HOURS";
    sessionLabel = "After Hours - Market Closed";
    sessionColor = "#EF4444";
    timeToOpen = "Opens Tomorrow 9:15 IST / 7:45 UAE";
    timeToClose = "--";
    nextSessionEvent = "Next session: Tomorrow 9:15 IST";
    progressPercent = 100;
  }

  return {
    istTime,
    uaeTime,
    istDate,
    uaeDate,
    sessionStatus,
    sessionLabel,
    sessionColor,
    timeToOpen,
    timeToClose,
    marketOpenIST: "09:15",
    marketCloseIST: "15:30",
    marketOpenUAE: "07:45",
    marketCloseUAE: "14:00",
    isWeekend,
    nextSessionEvent,
    progressPercent,
  };
}

export interface TelegramAlert {
  type: "MARKET_OPEN" | "MARKET_CLOSE" | "PRE_MARKET" | "SIGNAL" | "SESSION_UPDATE" | "CUSTOM";
  message: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

export function buildMarketOpenAlert(): TelegramAlert {
  const session = getMarketSession();
  return {
    type: "MARKET_OPEN",
    priority: "HIGH",
    message: [
      `*LAMY - Market Opening Alert*`,
      ``,
      `Indian Market (NSE) is now OPEN`,
      `IST: ${session.istTime} | UAE: ${session.uaeTime}`,
      `Session: ${session.marketOpenIST} - ${session.marketCloseIST} IST`,
      `UAE Time: ${session.marketOpenUAE} - ${session.marketCloseUAE} GST`,
      ``,
      `Sir, ready for trading. All 20 neural formulas active.`,
    ].join("\n"),
  };
}

export function buildMarketCloseAlert(): TelegramAlert {
  const session = getMarketSession();
  return {
    type: "MARKET_CLOSE",
    priority: "HIGH",
    message: [
      `*LAMY - Market Closing Alert*`,
      ``,
      `Indian Market (NSE) is now CLOSED`,
      `IST: ${session.istTime} | UAE: ${session.uaeTime}`,
      ``,
      `Trading session complete. Analysis saved.`,
      `Next session: Tomorrow ${session.marketOpenIST} IST / ${session.marketOpenUAE} UAE`,
    ].join("\n"),
  };
}

export function buildPreMarketAlert(): TelegramAlert {
  const session = getMarketSession();
  return {
    type: "PRE_MARKET",
    priority: "MEDIUM",
    message: [
      `*LAMY - Pre-Market Alert*`,
      ``,
      `Pre-market session started`,
      `IST: ${session.istTime} | UAE: ${session.uaeTime}`,
      `Market opens at ${session.marketOpenIST} IST / ${session.marketOpenUAE} UAE`,
      `Time to open: ${session.timeToOpen}`,
      ``,
      `Warming up neural engine...`,
    ].join("\n"),
  };
}

export function buildSignalAlert(
  action: string,
  confidence: number,
  strike: number,
  premium: number,
  target: number,
  stopLoss: number,
  engineVersion: string,
  rocketThrust?: string,
  neuroWisdom?: string
): TelegramAlert {
  const session = getMarketSession();
  return {
    type: "SIGNAL",
    priority: confidence > 60 ? "HIGH" : "MEDIUM",
    message: [
      `*LAMY Trading Signal*`,
      ``,
      `*${action}* | Confidence: ${confidence}%`,
      `Strike: ${strike} | Premium: Rs.${premium}`,
      `Target: Rs.${target} | SL: Rs.${stopLoss}`,
      ``,
      `Engine: ${engineVersion}`,
      rocketThrust ? `Rocket: ${rocketThrust}` : "",
      neuroWisdom ? `Brain: ${neuroWisdom}` : "",
      ``,
      `IST: ${session.istTime} | UAE: ${session.uaeTime}`,
      `Session: ${session.sessionLabel}`,
    ].filter(Boolean).join("\n"),
  };
}

export function buildSessionUpdateAlert(): TelegramAlert {
  const session = getMarketSession();
  return {
    type: "SESSION_UPDATE",
    priority: "LOW",
    message: [
      `*LAMY Status Update*`,
      ``,
      `IST: ${session.istTime} | UAE: ${session.uaeTime}`,
      `Status: ${session.sessionLabel}`,
      `Progress: ${session.progressPercent}%`,
      session.sessionStatus === "MARKET_OPEN" ? `Closes in: ${session.timeToClose}` : `${session.nextSessionEvent}`,
    ].join("\n"),
  };
}
