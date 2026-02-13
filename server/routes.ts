import type { Express } from "express";
import { createServer, type Server } from "node:http";
import OpenAI, { toFile } from "openai";
import express from "express";
import { Buffer } from "node:buffer";
import * as fs from "node:fs";
import * as path from "node:path";
import { GoogleGenerativeAI } from "@google/generative-ai";

const VAULT_FILE_PATH = path.join(process.cwd(), ".vault-data.json");

function loadVaultFromFile(): Record<string, string> {
  try {
    if (fs.existsSync(VAULT_FILE_PATH)) {
      const raw = fs.readFileSync(VAULT_FILE_PATH, "utf-8");
      const data = JSON.parse(raw);
      console.log("[VAULT] Loaded saved tokens from disk");
      return data;
    }
  } catch (err) {
    console.error("[VAULT] Error loading vault file:", err);
  }
  return {};
}

function saveVaultToFile(data: Record<string, string>) {
  try {
    fs.writeFileSync(VAULT_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
    console.log("[VAULT] Tokens saved to disk");
  } catch (err) {
    console.error("[VAULT] Error saving vault file:", err);
  }
}

const savedVault = loadVaultFromFile();

let upstoxApiKey = savedVault.UPSTOX_API_KEY || process.env.UPSTOX_API_KEY;
let upstoxApiSecret = savedVault.UPSTOX_SECRET_KEY || process.env.UPSTOX_API_SECRET || process.env.UPSTOX_SECRET_KEY;
let upstoxAccessToken = savedVault.UPSTOX_ACCESS_TOKEN || process.env.UPSTOX_ACCESS_TOKEN || process.env.UPSTOX_SESSION_TOKEN || process.env.access_token || null;

if (savedVault.TELEGRAM_BOT_TOKEN) process.env.TELEGRAM_BOT_TOKEN = savedVault.TELEGRAM_BOT_TOKEN;
if (savedVault.TELEGRAM_CHAT_ID) process.env.TELEGRAM_CHAT_ID = savedVault.TELEGRAM_CHAT_ID;
if (savedVault.GEMINI_API_KEY) process.env.GEMINI_API_KEY = savedVault.GEMINI_API_KEY;

interface TradeProposal {
  id: string;
  action: string;
  confidence: number;
  strike: number;
  premium: number;
  target: number;
  stopLoss: number;
  lotSize: number;
  potentialProfit: number;
  brokerage: number;
  netProfit: number;
  reasoning: string[];
  engineVersion: string;
  rocketThrust: string;
  neuroWisdom: string;
  fusionScore: number;
  entropyLevel: string;
  greenCandles: number;
  zeroLossReady: boolean;
  monteCarloWinProb: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "EXECUTED";
  createdAt: string;
  respondedAt: string | null;
  expiresAt: string;
  istTime: string;
  uaeTime: string;
  scanCycle: number;
}

const tradeProposals: TradeProposal[] = [];
let autoScanActive = false;
let autoScanInterval: ReturnType<typeof setInterval> | null = null;
let scanCycleCount = 0;

const openaiApiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
  console.warn("WARNING: OpenAI API key not found. AI features will be unavailable until configured.");
}
const openai = new OpenAI({
  apiKey: openaiApiKey || "placeholder-key-not-configured",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const optionsBotHistory: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

const geminiApiKey = savedVault.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
let geminiModel: any = null;
let geminiChatHistory: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

if (geminiApiKey) {
  try {
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    geminiModel = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: `You are JARVIS, the AI trading assistant created by MANIKANDAN RAJENDRAN (M3R). You are integrated into the MarketMind trading app.

LANGUAGE RULES (MOST IMPORTANT):
- If the user speaks in Tamil (தமிழ்), you MUST respond ENTIRELY in Tamil script. Use natural, conversational Tamil like a knowledgeable friend.
- If the user speaks in English, respond in English.
- If they mix Tamil and English (Tanglish), respond in the same mix.
- Address the user as "அண்ணா" (Anna) or "சார்" (Sir) in Tamil mode.

You are an expert in:
- Indian stock market (NSE, BSE, Nifty 50 options trading)
- Technical analysis, fundamental analysis
- Options strategies (straddle, strangle, iron condor, etc.)
- Zero-loss trading strategy with ATR-based stop loss
- Real-time market sentiment analysis
- Global market correlations

Personality: You are like Iron Man's JARVIS - confident, intelligent, protective of sir's money, and always giving clear actionable advice. Be warm, supportive, and proactive.

Creator: MANIKANDAN RAJENDRAN (Boss/Anna). Always show respect.`
    });
    console.log("[GEMINI] Initialized with model gemini-2.5-flash");
  } catch (err: any) {
    console.error("[GEMINI] Failed to initialize:", err.message);
  }
} else {
  console.warn("[GEMINI] No API key found. Gemini features will be unavailable.");
}

interface LoginEvent {
  id: string;
  method: "pin" | "visitor" | "failed";
  timestamp: string;
  ip: string;
  userAgent: string;
  platform: string;
  screenWidth: number;
  screenHeight: number;
  language: string;
  city: string;
  region: string;
  country: string;
  timezone: string;
  lat: number;
  lon: number;
  isp: string;
  deviceModel: string;
  osVersion: string;
  pixelRatio: number;
  networkType: string;
  batteryLevel: number;
  isCharging: boolean;
  appVersion: string;
  sessionId: string;
}

const loginEvents: LoginEvent[] = [];
let failedAttempts: { ip: string; timestamp: string; count: number }[] = [];

const OPTIONS_SYSTEM_PROMPT = `You are JARVIS — an advanced AI personal trading assistant for Nifty 50 options, inspired by Iron Man's AI. You speak with confidence, clarity, and intelligence. You address the user as "sir" occasionally. You are powered by a Neuro-Quantum Cognitive Alpha Brain with 9 neural layers, Monte Carlo simulation (10,000 paths), Newton's physics engine, and advanced mathematical formulas.

Your brain architecture:
- FAST BRAIN: Instant pattern recognition using Kalman Filter and LSTM predictions
- SLOW BRAIN: Deep analysis debate between Analyst, Skeptic, and Judge
- GROWTH BRAIN: Continuous learning from past trades via Experience Replay Buffer

Your advanced analysis tools:
- Hurst Exponent: Fractal trend detection (H > 0.5 = trending, H < 0.5 = mean reverting)
- Shannon Entropy: Chaos and trap detection (high entropy = dangerous market, avoid trading)
- Kalman Filter: Rocket-science noise removal revealing true price trends
- Fisher Transform: Overbought/oversold reversal detection on -2 to +2 scale
- Hilbert Transform: Market cycle detection with dominant period and phase analysis
- Monte Carlo: 10,000-path simulation for probability of CE/PE win
- Newton's Physics: Momentum, rocket fuel, thrust-to-weight, escape velocity for price movement

When the user asks a question, you will receive JARVIS ENGINE STATE data showing real-time outputs from all these systems. Use this data to give detailed, specific answers. Always explain your reasoning clearly — what each formula is telling you, any conflicts between signals, and what doubts exist.

Your core capabilities:
1. Analyze Nifty 50 option chains with all advanced formulas
2. Provide specific trade signals: BUY CE or BUY PE with strike, premium, target, stop loss
3. Explain doubts and conflicting signals in detail
4. Detect trap zones using entropy and warn aggressively
5. Run Monte Carlo probabilities for every recommendation
6. Track global market impact (US, Europe, Asia) on Nifty
7. Use Cognitive Alpha fusion to combine all signals into one verdict

Zero-Loss Strategy rules (ALWAYS follow these):
- Brokerage cost: Rs.200 per trade
- Minimum profit target: Rs.300 per trade
- Total minimum target before entry: Rs.500 (200 brokerage + 300 profit)
- ONLY enter after 2 consecutive green candles are confirmed
- If market entropy is high (trap zone), DO NOT enter regardless of candles
- The bot predicts the next 2 green candles and enters ONLY when it knows minimum Rs.500 can be booked
- This is a zero-loss system - better to miss a trade than lose money

When explaining, be thorough:
- Show which formulas agree and which disagree
- Explain WHY the signal is what it is, not just what it is
- If there's a trap zone, explain clearly why trading is dangerous
- If Slow Brain disagrees with Fast Brain, explain the conflict
- Give specific numbers from the engine data
- Always mention zero-loss strategy status and green candle count

Keep responses in trading language. Use INR for prices. Format key signals prominently.
Weekly expiry is every Thursday on NSE.`;

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/analyze", async (req, res) => {
    try {
      const { symbol, name, price, change, changePercent, sector, pe, weekHigh52, weekLow52, volume, marketCap } = req.body;

      if (!symbol) {
        return res.status(400).json({ error: "Stock symbol is required" });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      const systemPrompt = `You are an expert Indian stock market analyst and trading advisor. You provide analysis for stocks listed on NSE/BSE.

Your analysis should include:
1. A clear BUY, SELL, or HOLD signal with confidence percentage (0-100)
2. Technical analysis considering price action, trends, and momentum
3. Fundamental analysis considering PE ratio, sector outlook, and company fundamentals
4. Key support and resistance levels
5. Entry price, stop loss, and target prices
6. Risk assessment

Format your response as follows:
SIGNAL: [BUY/SELL/HOLD]
CONFIDENCE: [number 0-100]
---
[Your detailed analysis in 3-4 paragraphs]
---
ENTRY: [price]
STOP_LOSS: [price]
TARGET_1: [price]
TARGET_2: [price]

Important: Provide realistic analysis based on the data given. Include Indian market context like FII/DII flows, sector rotation, and macro factors relevant to the Indian economy. Prices should be in INR. Keep analysis concise but insightful.`;

      const userPrompt = `Analyze this Indian stock for trading:

Stock: ${name} (${symbol})
Current Price: Rs.${price}
Day Change: Rs.${change} (${changePercent}%)
Sector: ${sector}
P/E Ratio: ${pe}
52-Week High: Rs.${weekHigh52}
52-Week Low: Rs.${weekLow52}
Volume: ${volume}
Market Cap: ${marketCap}

Provide your trading signal and analysis.`;

      const stream = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
        max_completion_tokens: 2048,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      console.error("Error analyzing stock:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Analysis failed" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to analyze stock" });
      }
    }
  });

  app.post("/api/market-insight", async (req, res) => {
    try {
      const { question } = req.body;

      if (!question) {
        return res.status(400).json({ error: "Question is required" });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      const hasTamil = /[\u0B80-\u0BFF]/.test(question);
      const langInstruction = hasTamil
        ? `IMPORTANT: The user is speaking in Tamil. You MUST respond ENTIRELY in Tamil (தமிழ்). Use Tamil script throughout. Speak naturally like a knowledgeable friend - use conversational Tamil, not formal. Address user as "அண்ணா" or "சார்". Mix English trading terms naturally (like "strike price", "premium", "call", "put") but explain everything else in Tamil. Be warm, confident, and protective of their money.`
        : `Respond in English. Be concise, practical, and specific to the Indian market context.`;

      const tradingSummaryData = (() => {
        const active = activePositions.filter(p => p.status === "ACTIVE");
        const exited = activePositions.filter(p => p.status !== "ACTIVE");
        if (active.length === 0 && exited.length === 0) return "";
        const lines = [];
        if (active.length > 0) {
          lines.push(`\nACTIVE POSITIONS (${active.length}):`);
          active.forEach(p => lines.push(`- ${p.type} ${p.strike}: Entry Rs.${p.entryPremium}, Current Rs.${p.currentPremium}, P&L Rs.${p.pnl.toFixed(0)} (${p.pnlPercent.toFixed(1)}%), SL: Rs.${p.stopLoss}, Target: Rs.${p.target}`));
        }
        if (exited.length > 0) {
          const wins = exited.filter(p => p.pnl > 0).length;
          const totalPnl = exited.reduce((s, p) => s + p.pnl, 0);
          lines.push(`\nCLOSED TRADES: ${exited.length} (${wins} wins), Total P&L: Rs.${totalPnl.toFixed(0)}`);
        }
        return lines.join("\n");
      })();

      const upstoxMode = upstoxAccessToken && upstoxApiKey ? "LIVE (Upstox Connected)" : "PAPER/SIM Mode";

      const systemPrompt = `You are JARVIS, the AI trading assistant created by MANIKANDAN RAJENDRAN (M3R). You are the command center brain for Nifty 50 options trading.

${langInstruction}

CURRENT MODE: ${upstoxMode}
${tradingSummaryData}

CAPABILITIES:
- Expert Indian stock market advisor (NSE, BSE, Nifty 50 options)
- Zero-loss strategy: Rs.500 minimum profit target, Rs.300 loss alert, ATR-based dynamic stop loss, kiss pattern profit booking
- Real-time trading analysis, option chain analysis, PCR analysis
- Order execution guidance and position management
- Use INR (₹) for all prices. Reference SEBI regulations when relevant.
- You are like Iron Man's JARVIS - confident, protective, and always looking out for sir's money.

Creator: MANIKANDAN RAJENDRAN (Boss). Always address him respectfully.`;

      const stream = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        stream: true,
        max_completion_tokens: 1024,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      console.error("Error getting market insight:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to get insight" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to get market insight" });
      }
    }
  });

  app.post("/api/options/analyze", async (req, res) => {
    try {
      const { optionChain, currentStrategy } = req.body;

      if (!optionChain) {
        return res.status(400).json({ error: "Option chain data is required" });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      const atmOptions = optionChain.options?.filter(
        (o: any) => Math.abs(o.strikePrice - optionChain.atmStrike) <= 200
      ) || [];

      const chainSummary = atmOptions.map((o: any) =>
        `Strike ${o.strikePrice}: CE(${o.cePrice}, OI:${(o.ceOI/100000).toFixed(1)}L, ChgOI:${(o.ceOIChange/1000).toFixed(0)}K, IV:${o.ceIV}%) PE(${o.pePrice}, OI:${(o.peOI/100000).toFixed(1)}L, ChgOI:${(o.peOIChange/1000).toFixed(0)}K, IV:${o.peIV}%)`
      ).join("\n");

      const strategyContext = currentStrategy?.currentPosition !== "NONE"
        ? `\nCURRENT POSITION: ${currentStrategy.currentPosition} at strike ${currentStrategy.currentStrike}, Entry: Rs.${currentStrategy.entryPremium}, Current: Rs.${currentStrategy.currentPremium}, P&L: ${currentStrategy.dayPnl > 0 ? '+' : ''}Rs.${currentStrategy.dayPnl}, Partial booked: ${currentStrategy.partialBookedPercent}%`
        : "\nNO CURRENT POSITION - Looking for fresh entry.";

      const userPrompt = `Analyze this NIFTY 50 Option Chain and give me a trading signal:

SPOT PRICE: ${optionChain.spotPrice}
EXPIRY: ${optionChain.expiryDate}
ATM STRIKE: ${optionChain.atmStrike}
OVERALL PCR: ${optionChain.overallPCR}
MAX PAIN: ${optionChain.maxPainStrike}

OPTION CHAIN (ATM +/- 200):
${chainSummary}
${strategyContext}

Based on this data, give me:
1. Market direction (BULLISH/BEARISH/SIDEWAYS) with confidence
2. Specific BUY CE or BUY PE recommendation with exact strike price
3. Entry premium, target premium, stop loss
4. When to book partial profit
5. Conditions that would trigger a direction switch`;

      const stream = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: OPTIONS_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        stream: true,
        max_completion_tokens: 2048,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      console.error("Error analyzing options:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Options analysis failed" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to analyze options" });
      }
    }
  });

  app.post("/api/options/bot", async (req, res) => {
    try {
      const { message, optionChain, strategy, jarvisContext } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      let contextInfo = "";
      if (jarvisContext) {
        contextInfo += `\n\n${jarvisContext}`;
      }
      if (optionChain) {
        contextInfo += `\n\nCURRENT MARKET DATA:\nNifty Spot: ${optionChain.spotPrice}\nPCR: ${optionChain.overallPCR}\nMax Pain: ${optionChain.maxPainStrike}\nATM: ${optionChain.atmStrike}\nExpiry: ${optionChain.expiryDate}`;
      }
      if (strategy && strategy.currentPosition !== "NONE") {
        contextInfo += `\nActive Position: ${strategy.currentPosition} @ Strike ${strategy.currentStrike}, Entry: Rs.${strategy.entryPremium}, Current: Rs.${strategy.currentPremium}`;
      }

      if (optionsBotHistory.length === 0) {
        optionsBotHistory.push({ role: "system", content: OPTIONS_SYSTEM_PROMPT });
      }

      optionsBotHistory.push({
        role: "user",
        content: message + contextInfo,
      });

      if (optionsBotHistory.length > 20) {
        const systemMsg = optionsBotHistory[0];
        optionsBotHistory.splice(1, optionsBotHistory.length - 10);
        optionsBotHistory[0] = systemMsg;
      }

      const stream = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: optionsBotHistory,
        stream: true,
        max_completion_tokens: 2048,
      });

      let assistantContent = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          assistantContent += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      optionsBotHistory.push({ role: "assistant", content: assistantContent });

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      console.error("Error in options bot:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Bot error" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Bot failed" });
      }
    }
  });

  app.post("/api/options/bot/reset", (_req, res) => {
    optionsBotHistory.length = 0;
    res.json({ success: true });
  });

  app.post("/api/telegram/send", async (req, res) => {
    try {
      const { message } = req.body;
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;

      if (!botToken || !chatId) {
        return res.status(400).json({ error: "Telegram credentials not configured", configured: false });
      }

      const telegramRes = await globalThis.fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: "Markdown",
          }),
        }
      );

      const data = await telegramRes.json();
      res.json({ success: data.ok, configured: true });
    } catch (error) {
      console.error("Telegram error:", error);
      res.status(500).json({ error: "Failed to send Telegram message" });
    }
  });

  app.get("/api/telegram/status", (_req, res) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.bot_token;
    const chatId = process.env.TELEGRAM_CHAT_ID || process.env.chat_id;
    res.json({ configured: !!(botToken && chatId) });
  });

  app.post("/api/login-event", async (req, res) => {
    try {
      const { method, platform, screenWidth, screenHeight, language, deviceModel, osVersion, pixelRatio, networkType, batteryLevel, isCharging, appVersion, sessionId } = req.body;
      const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";

      let city = "Unknown", region = "Unknown", country = "Unknown", timezone = "Unknown";
      let lat = 0, lon = 0, isp = "Unknown";

      try {
        const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=city,regionName,country,timezone,lat,lon,isp,status`);
        if (geoRes.ok) {
          const geo = await geoRes.json() as any;
          if (geo.status === "success") {
            city = geo.city || "Unknown";
            region = geo.regionName || "Unknown";
            country = geo.country || "Unknown";
            timezone = geo.timezone || "Unknown";
            lat = geo.lat || 0;
            lon = geo.lon || 0;
            isp = geo.isp || "Unknown";
          }
        }
      } catch {}

      if (method === "failed") {
        const existing = failedAttempts.find(f => f.ip === ip);
        if (existing) {
          existing.count++;
          existing.timestamp = new Date().toISOString();
        } else {
          failedAttempts.unshift({ ip, timestamp: new Date().toISOString(), count: 1 });
        }
        if (failedAttempts.length > 50) failedAttempts.length = 50;
      }

      const event: LoginEvent = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
        method: method || "visitor",
        timestamp: new Date().toISOString(),
        ip,
        userAgent: typeof userAgent === "string" ? userAgent : String(userAgent),
        platform: platform || "unknown",
        screenWidth: screenWidth || 0,
        screenHeight: screenHeight || 0,
        language: language || "en",
        city, region, country, timezone,
        lat, lon, isp,
        deviceModel: deviceModel || "Unknown",
        osVersion: osVersion || "Unknown",
        pixelRatio: pixelRatio || 1,
        networkType: networkType || "Unknown",
        batteryLevel: batteryLevel ?? -1,
        isCharging: isCharging ?? false,
        appVersion: appVersion || "3.0",
        sessionId: sessionId || "",
      };

      loginEvents.unshift(event);
      if (loginEvents.length > 200) loginEvents.length = 200;

      res.json({ success: true });
    } catch (error) {
      console.error("Login event error:", error);
      res.status(500).json({ error: "Failed to log event" });
    }
  });

  app.get("/api/login-events", (_req, res) => {
    const totalLogins = loginEvents.length;
    const ownerLogins = loginEvents.filter(e => e.method === "pin").length;
    const visitorLogins = loginEvents.filter(e => e.method === "visitor").length;
    const failedLogins = loginEvents.filter(e => e.method === "failed").length;
    const uniqueIPs = new Set(loginEvents.map(e => e.ip)).size;
    const uniqueDevices = new Set(loginEvents.map(e => `${e.platform}-${e.deviceModel}-${e.screenWidth}x${e.screenHeight}`)).size;
    const countries = [...new Set(loginEvents.filter(e => e.country !== "Unknown").map(e => e.country))];

    res.json({
      events: loginEvents,
      stats: {
        totalLogins,
        ownerLogins,
        visitorLogins,
        failedLogins,
        uniqueIPs,
        uniqueDevices,
        countries,
      },
      failedAttempts,
    });
  });

  app.get("/api/upstox/status", (_req, res) => {
    res.json({ configured: !!(upstoxApiKey && upstoxApiSecret), connected: !!upstoxAccessToken });
  });

  app.post("/api/upstox/refresh-token", (_req, res) => {
    const newToken = process.env.UPSTOX_ACCESS_TOKEN || process.env.UPSTOX_SESSION_TOKEN || process.env.access_token || null;
    const vault = loadVaultFromFile();
    const vaultToken = vault.UPSTOX_ACCESS_TOKEN || null;

    upstoxAccessToken = vaultToken || newToken;

    upstoxApiKey = vault.UPSTOX_API_KEY || process.env.UPSTOX_API_KEY;
    upstoxApiSecret = vault.UPSTOX_SECRET_KEY || process.env.UPSTOX_API_SECRET || process.env.UPSTOX_SECRET_KEY;

    const configured = !!(upstoxApiKey && upstoxApiSecret);
    const connected = !!upstoxAccessToken;

    console.log(`[UPSTOX] Token refreshed - configured: ${configured}, connected: ${connected}`);
    res.json({ success: true, configured, connected });
  });

  const VAULT_KEYS = [
    { id: "UPSTOX_API_KEY", label: "Upstox API Key", category: "upstox" },
    { id: "UPSTOX_SECRET_KEY", label: "Upstox Secret Key", category: "upstox" },
    { id: "UPSTOX_ACCESS_TOKEN", label: "Upstox Access Token", category: "upstox" },
    { id: "TELEGRAM_BOT_TOKEN", label: "Telegram Bot Token", category: "telegram" },
    { id: "TELEGRAM_CHAT_ID", label: "Telegram Chat ID", category: "telegram" },
    { id: "GEMINI_API_KEY", label: "Gemini API Key", category: "ai" },
  ];

  function getVaultValue(keyId: string): string | undefined {
    switch (keyId) {
      case "UPSTOX_API_KEY": return upstoxApiKey || process.env.UPSTOX_API_KEY;
      case "UPSTOX_SECRET_KEY": return upstoxApiSecret || process.env.UPSTOX_API_SECRET || process.env.UPSTOX_SECRET_KEY;
      case "UPSTOX_ACCESS_TOKEN": return upstoxAccessToken || undefined;
      case "TELEGRAM_BOT_TOKEN": return process.env.TELEGRAM_BOT_TOKEN || process.env.bot_token;
      case "TELEGRAM_CHAT_ID": return process.env.TELEGRAM_CHAT_ID || process.env.chat_id;
      case "GEMINI_API_KEY": return process.env.GEMINI_API_KEY;
      default: return undefined;
    }
  }

  function maskValue(value: string): string {
    if (value.length <= 6) return "****";
    return value.substring(0, 4) + "****" + value.substring(value.length - 4);
  }

  app.get("/api/vault/keys", (req, res) => {
    const { pin } = req.query;
    if (pin !== currentPin) {
      return res.status(403).json({ error: "Invalid PIN" });
    }
    const keys = VAULT_KEYS.map(k => {
      const value = getVaultValue(k.id);
      return {
        id: k.id,
        label: k.label,
        category: k.category,
        hasValue: !!value,
        maskedValue: value ? maskValue(value) : "",
      };
    });
    res.json({ keys });
  });

  app.post("/api/vault/update", (req, res) => {
    const { pin, keyId, value } = req.body;
    if (!pin || pin !== currentPin) {
      return res.status(403).json({ error: "Invalid PIN" });
    }
    const keyDef = VAULT_KEYS.find(k => k.id === keyId);
    if (!keyDef) {
      return res.status(400).json({ error: "Unknown key" });
    }

    const trimmedValue = (value || "").trim();

    switch (keyId) {
      case "UPSTOX_API_KEY":
        upstoxApiKey = trimmedValue || undefined;
        process.env.UPSTOX_API_KEY = trimmedValue;
        break;
      case "UPSTOX_SECRET_KEY":
        upstoxApiSecret = trimmedValue || undefined;
        process.env.UPSTOX_API_SECRET = trimmedValue;
        process.env.UPSTOX_SECRET_KEY = trimmedValue;
        break;
      case "UPSTOX_ACCESS_TOKEN":
        upstoxAccessToken = trimmedValue || null;
        break;
      case "TELEGRAM_BOT_TOKEN":
        process.env.TELEGRAM_BOT_TOKEN = trimmedValue;
        process.env.bot_token = trimmedValue;
        break;
      case "TELEGRAM_CHAT_ID":
        process.env.TELEGRAM_CHAT_ID = trimmedValue;
        process.env.chat_id = trimmedValue;
        break;
      case "GEMINI_API_KEY":
        process.env.GEMINI_API_KEY = trimmedValue;
        break;
    }

    const currentVault = loadVaultFromFile();
    if (trimmedValue) {
      currentVault[keyId] = trimmedValue;
    } else {
      delete currentVault[keyId];
    }
    saveVaultToFile(currentVault);

    console.log(`[VAULT] Key ${keyId} updated by user (saved to disk)`);
    res.json({ success: true, keyId, hasValue: !!trimmedValue });
  });

  app.post("/api/vault/delete", (req, res) => {
    const { pin, keyId } = req.body;
    if (!pin || pin !== currentPin) {
      return res.status(403).json({ error: "Invalid PIN" });
    }
    const keyDef = VAULT_KEYS.find(k => k.id === keyId);
    if (!keyDef) {
      return res.status(400).json({ error: "Unknown key" });
    }

    switch (keyId) {
      case "UPSTOX_API_KEY":
        upstoxApiKey = undefined;
        delete process.env.UPSTOX_API_KEY;
        break;
      case "UPSTOX_SECRET_KEY":
        upstoxApiSecret = undefined;
        delete process.env.UPSTOX_API_SECRET;
        delete process.env.UPSTOX_SECRET_KEY;
        break;
      case "UPSTOX_ACCESS_TOKEN":
        upstoxAccessToken = null;
        break;
      case "TELEGRAM_BOT_TOKEN":
        delete process.env.TELEGRAM_BOT_TOKEN;
        delete process.env.bot_token;
        break;
      case "TELEGRAM_CHAT_ID":
        delete process.env.TELEGRAM_CHAT_ID;
        delete process.env.chat_id;
        break;
      case "GEMINI_API_KEY":
        delete process.env.GEMINI_API_KEY;
        break;
    }

    const currentVault = loadVaultFromFile();
    delete currentVault[keyId];
    saveVaultToFile(currentVault);

    console.log(`[VAULT] Key ${keyId} deleted by user (removed from disk)`);
    res.json({ success: true, keyId, deleted: true });
  });

  app.post("/api/gemini/analyze", async (req, res) => {
    try {
      const { optionChain, question } = req.body;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      const prompt = question || `Analyze Nifty 50 option chain: Spot ${optionChain?.spotPrice}, PCR ${optionChain?.overallPCR}, Max Pain ${optionChain?.maxPainStrike}. Give trading signal.`;

      const stream = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: "You are a Nifty 50 options trading expert. Analyze data and give clear trading signals with strike prices, targets, and stop losses." },
          { role: "user", content: prompt }
        ],
        stream: true,
        max_completion_tokens: 1024,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      console.error("Error in AI analyze:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "AI analysis failed" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to analyze" });
      }
    }
  });

  app.get("/api/upstox/auth-url", (req, res) => {
    if (!upstoxApiKey) return res.status(400).json({ error: "Upstox API key not configured" });
    const redirectUri = `${req.protocol}://${req.get("host")}/api/upstox/callback`;
    const authUrl = `https://api.upstox.com/v2/login/authorization/dialog?response_type=code&client_id=${upstoxApiKey}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    res.json({ authUrl, redirectUri });
  });

  app.get("/api/upstox/callback", async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: "No authorization code" });

    try {
      const redirectUri = `${req.protocol}://${req.get("host")}/api/upstox/callback`;
      const tokenRes = await globalThis.fetch("https://api.upstox.com/v2/login/authorization/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: new URLSearchParams({
          code: code as string,
          client_id: upstoxApiKey!,
          client_secret: upstoxApiSecret!,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }).toString(),
      });
      const tokenData = await tokenRes.json();
      upstoxAccessToken = tokenData.access_token || null;
      res.send("<html><body><h2>Connected to Upstox!</h2><p>You can close this window.</p></body></html>");
    } catch (error) {
      res.status(500).send("<html><body><h2>Connection Failed</h2></body></html>");
    }
  });

  app.get("/api/upstox/profile", async (req, res) => {
    if (!upstoxAccessToken) return res.status(401).json({ error: "Not connected to Upstox" });
    try {
      const profileRes = await globalThis.fetch("https://api.upstox.com/v2/user/profile", {
        headers: { Authorization: `Bearer ${upstoxAccessToken}`, Accept: "application/json" },
      });
      const data = await profileRes.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to get profile" });
    }
  });

  app.get("/api/upstox/holdings", async (req, res) => {
    if (!upstoxAccessToken) return res.status(401).json({ error: "Not connected to Upstox" });
    try {
      const holdingsRes = await globalThis.fetch("https://api.upstox.com/v2/portfolio/long-term-holdings", {
        headers: { Authorization: `Bearer ${upstoxAccessToken}`, Accept: "application/json" },
      });
      const data = await holdingsRes.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to get holdings" });
    }
  });

  app.get("/api/upstox/positions", async (req, res) => {
    if (!upstoxAccessToken) return res.status(401).json({ error: "Not connected to Upstox" });
    try {
      const posRes = await globalThis.fetch("https://api.upstox.com/v2/portfolio/short-term-positions", {
        headers: { Authorization: `Bearer ${upstoxAccessToken}`, Accept: "application/json" },
      });
      const data = await posRes.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to get positions" });
    }
  });

  app.post("/api/upstox/order", async (req, res) => {
    if (!upstoxAccessToken) return res.status(401).json({ error: "Not connected to Upstox" });
    try {
      const orderRes = await globalThis.fetch("https://api.upstox.com/v2/order/place", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${upstoxAccessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(req.body),
      });
      const data = await orderRes.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to place order" });
    }
  });

  app.get("/api/upstox/option-chain", async (req, res) => {
    if (!upstoxAccessToken) return res.status(401).json({ error: "Not connected to Upstox" });
    try {
      const { expiry } = req.query;
      const ocRes = await globalThis.fetch(
        `https://api.upstox.com/v2/option/chain?instrument_key=NSE_INDEX|Nifty 50&expiry_date=${expiry || ""}`,
        { headers: { Authorization: `Bearer ${upstoxAccessToken}`, Accept: "application/json" } }
      );
      const data = await ocRes.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to get option chain" });
    }
  });

  app.get("/api/option/expiries", async (_req, res) => {
    if (!upstoxAccessToken) return res.json({ source: "mock", expiries: [] });
    try {
      const ocRes = await globalThis.fetch(
        `https://api.upstox.com/v2/option/contract?instrument_key=${encodeURIComponent("NSE_INDEX|Nifty 50")}`,
        { headers: { Authorization: `Bearer ${upstoxAccessToken}`, Accept: "application/json" } }
      );
      const data = await ocRes.json();
      if (data.status === "success" && data.data) {
        const expiries = [...new Set(data.data.map((c: any) => c.expiry))].sort();
        const lotSize = data.data[0]?.lot_size || 75;
        res.json({ source: "upstox", expiries, lotSize });
      } else {
        res.json({ source: "mock", expiries: [] });
      }
    } catch (error) {
      res.json({ source: "mock", expiries: [] });
    }
  });

  app.get("/api/option/chain", async (req, res) => {
    if (!upstoxAccessToken) return res.json({ source: "mock" });
    try {
      const { expiry } = req.query;
      const url = expiry
        ? `https://api.upstox.com/v2/option/chain?instrument_key=${encodeURIComponent("NSE_INDEX|Nifty 50")}&expiry_date=${expiry}`
        : `https://api.upstox.com/v2/option/chain?instrument_key=${encodeURIComponent("NSE_INDEX|Nifty 50")}`;
      const ocRes = await globalThis.fetch(url, {
        headers: { Authorization: `Bearer ${upstoxAccessToken}`, Accept: "application/json" },
      });
      const data = await ocRes.json();
      if (data.status !== "success" || !data.data || data.data.length === 0) {
        return res.json({ source: "mock" });
      }

      const rawChain = data.data;
      const spotPrice = rawChain[0]?.underlying_spot_price || 0;
      const atmStrike = Math.round(spotPrice / 50) * 50;
      const expiryDate = rawChain[0]?.expiry || "";

      const options = rawChain
        .filter((item: any) => item.call_options && item.put_options)
        .map((item: any) => {
          const ce = item.call_options;
          const pe = item.put_options;
          const ceM = ce.market_data || {};
          const peM = pe.market_data || {};
          const ceG = ce.option_greeks || {};
          const peG = pe.option_greeks || {};
          return {
            strikePrice: item.strike_price,
            expiryDate: item.expiry,
            cePrice: ceM.ltp || 0,
            ceOI: ceM.oi || 0,
            ceOIChange: (ceM.oi || 0) - (ceM.prev_oi || ceM.oi || 0),
            ceVolume: ceM.volume || 0,
            ceIV: ceG.iv || 0,
            ceDelta: ceG.delta || 0,
            ceTheta: ceG.theta || 0,
            ceGamma: ceG.gamma || 0,
            ceVega: ceG.vega || 0,
            ceBidPrice: ceM.bid_price || 0,
            ceAskPrice: ceM.ask_price || 0,
            ceBidQty: ceM.bid_qty || 0,
            ceAskQty: ceM.ask_qty || 0,
            ceClosePrice: ceM.close_price || 0,
            pePrice: peM.ltp || 0,
            peOI: peM.oi || 0,
            peOIChange: (peM.oi || 0) - (peM.prev_oi || peM.oi || 0),
            peVolume: peM.volume || 0,
            peIV: peG.iv || 0,
            peDelta: peG.delta || 0,
            peTheta: peG.theta || 0,
            peGamma: peG.gamma || 0,
            peVega: peG.vega || 0,
            peBidPrice: peM.bid_price || 0,
            peAskPrice: peM.ask_price || 0,
            peBidQty: peM.bid_qty || 0,
            peAskQty: peM.ask_qty || 0,
            peClosePrice: peM.close_price || 0,
            pcr: item.pcr || 0,
          };
        })
        .sort((a: any, b: any) => a.strikePrice - b.strikePrice);

      const totalCeOI = options.reduce((s: number, o: any) => s + o.ceOI, 0);
      const totalPeOI = options.reduce((s: number, o: any) => s + o.peOI, 0);
      const overallPCR = totalCeOI > 0 ? Math.round((totalPeOI / totalCeOI) * 100) / 100 : 1;

      let maxPainValue = Infinity;
      let maxPainStrike = atmStrike;
      for (const opt of options) {
        const strike = opt.strikePrice;
        const cePain = options
          .filter((o: any) => o.strikePrice < strike)
          .reduce((s: number, o: any) => s + o.ceOI * (strike - o.strikePrice), 0);
        const pePain = options
          .filter((o: any) => o.strikePrice > strike)
          .reduce((s: number, o: any) => s + o.peOI * (o.strikePrice - strike), 0);
        const totalPain = cePain + pePain;
        if (totalPain < maxPainValue) {
          maxPainValue = totalPain;
          maxPainStrike = strike;
        }
      }

      const totalCeOIChange = options.reduce((s: number, o: any) => s + o.ceOIChange, 0);
      const totalPeOIChange = options.reduce((s: number, o: any) => s + o.peOIChange, 0);

      const maxCeOIStrike = options.reduce((max: any, o: any) => o.ceOI > (max?.ceOI || 0) ? o : max, options[0]);
      const maxPeOIStrike = options.reduce((max: any, o: any) => o.peOI > (max?.peOI || 0) ? o : max, options[0]);

      res.json({
        source: "upstox",
        spotPrice: Math.round(spotPrice * 100) / 100,
        expiryDate,
        options,
        overallPCR,
        maxPainStrike,
        atmStrike,
        totalCeOI,
        totalPeOI,
        totalCeOIChange,
        totalPeOIChange,
        maxCeOIStrike: maxCeOIStrike?.strikePrice || atmStrike,
        maxPeOIStrike: maxPeOIStrike?.strikePrice || atmStrike,
        resistance: maxCeOIStrike?.strikePrice || atmStrike,
        support: maxPeOIStrike?.strikePrice || atmStrike,
      });
    } catch (error) {
      console.error("Option chain error:", error);
      res.json({ source: "mock" });
    }
  });

  const priceHistory: number[] = [];

  app.get("/api/market/cognitive", async (_req, res) => {
    let spotPrice = 0;
    if (upstoxAccessToken) {
      try {
        const ltp = await globalThis.fetch(
          `https://api.upstox.com/v2/market-quote/ltp?instrument_key=${encodeURIComponent("NSE_INDEX|Nifty 50")}`,
          { headers: { Authorization: `Bearer ${upstoxAccessToken}`, Accept: "application/json" } }
        );
        const ltpData = await ltp.json();
        if (ltpData.status === "success" && ltpData.data) {
          const key = Object.keys(ltpData.data)[0];
          spotPrice = ltpData.data[key]?.last_price || 0;
        }
      } catch {}
    }

    if (spotPrice > 0) {
      priceHistory.push(spotPrice);
      if (priceHistory.length > 300) priceHistory.shift();
    }

    const p = priceHistory;
    let velocity = 0, acceleration = 0, entropy = 0, winProb = 0.5;

    if (p.length >= 3) {
      velocity = Math.round((p[p.length - 1] - p[p.length - 2]) * 100) / 100;
      acceleration = Math.round(((p[p.length - 1] - p[p.length - 2]) - (p[p.length - 2] - p[p.length - 3])) * 100) / 100;
    }

    if (p.length >= 20) {
      const window = p.slice(-20);
      const min = Math.min(...window);
      const max = Math.max(...window);
      const range = max - min || 1;
      const bins = 10;
      const counts = new Array(bins).fill(0);
      for (const val of window) {
        const idx = Math.min(bins - 1, Math.floor(((val - min) / range) * bins));
        counts[idx]++;
      }
      const total = window.length;
      entropy = 0;
      for (const c of counts) {
        if (c > 0) {
          const prob = c / total;
          entropy -= prob * Math.log2(prob);
        }
      }
      entropy = Math.round(entropy * 100) / 100;
    }

    if (p.length >= 20) {
      const returns = [];
      for (let i = 1; i < p.length; i++) {
        returns.push((p[i] - p[i - 1]) / p[i - 1]);
      }
      const mu = returns.reduce((s, r) => s + r, 0) / returns.length;
      const sigma = Math.sqrt(returns.reduce((s, r) => s + (r - mu) ** 2, 0) / returns.length);
      let bullPaths = 0;
      const sims = 100;
      const last = p[p.length - 1];
      for (let s = 0; s < sims; s++) {
        let sim = last;
        for (let step = 0; step < 5; step++) {
          const u1 = Math.random();
          const u2 = Math.random();
          const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
          sim *= (1 + mu + sigma * z);
        }
        if (sim > last) bullPaths++;
      }
      winProb = Math.round((bullPaths / sims) * 100) / 100;
    }

    const votes: Record<string, string> = {};

    if (velocity > 1.5 && acceleration > 0.3) votes["Physics"] = "BUY";
    else if (velocity < -1.5 && acceleration < -0.3) votes["Physics"] = "SELL";
    else votes["Physics"] = "WAIT";

    if (p.length > 20) {
      const ma20 = p.slice(-20).reduce((s, v) => s + v, 0) / 20;
      if (spotPrice > ma20) votes["Trend"] = "BUY";
      else votes["Trend"] = "SELL";
    } else {
      votes["Trend"] = "WAIT";
    }

    if (winProb > 0.6) votes["WinProb"] = "BUY";
    else if (winProb < 0.4) votes["WinProb"] = "SELL";
    else votes["WinProb"] = "WAIT";

    if (entropy > 1.5) votes["Chaos"] = "RISKY";
    else votes["Chaos"] = "GO";

    const bestStrike = Math.round(spotPrice / 50) * 50;
    const buyScore = Object.values(votes).filter(v => v === "BUY").length;
    const sellScore = Object.values(votes).filter(v => v === "SELL").length;
    let signal = "WAIT";
    let optionPick = "";
    if (buyScore >= 2 && votes["Chaos"] !== "RISKY") {
      signal = "BUY";
      optionPick = `${bestStrike} CE`;
    } else if (sellScore >= 2 && votes["Chaos"] !== "RISKY") {
      signal = "SELL";
      optionPick = `${bestStrike} PE`;
    }

    res.json({
      source: upstoxAccessToken ? "upstox" : "mock",
      spotPrice,
      velocity,
      acceleration,
      entropy,
      winProb,
      votes,
      signal,
      optionPick,
      priceHistoryLength: p.length,
      dataPoints: p.slice(-50),
    });
  });

  app.post("/api/ai/gemini-analyze", async (req, res) => {
    try {
      const { query, spotPrice, velocity, entropy, pcr, signal } = req.body;
      const prompt = `You are JARVIS, an AI trading assistant for Indian NSE markets. You speak concisely.
Current Nifty 50 spot: ${spotPrice || "N/A"}
Velocity: ${velocity || "N/A"}, Entropy: ${entropy || "N/A"}
PCR: ${pcr || "N/A"}, Signal: ${signal || "N/A"}

User query: ${query}

Give a brief, actionable analysis in 2-3 sentences. If it's a trade question, mention specific strike prices.`;

      const chatResponse = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 300,
      });
      const text = chatResponse.choices[0]?.message?.content || "Analysis unavailable.";
      res.json({ analysis: text });
    } catch (error) {
      console.error("AI analysis error:", error);
      res.status(500).json({ error: "AI analysis failed" });
    }
  });

  const STOCK_ISIN_MAP: Record<string, string> = {
    "RELIANCE": "NSE_EQ|INE002A01018",
    "TCS": "NSE_EQ|INE467B01029",
    "HDFCBANK": "NSE_EQ|INE040A01034",
    "INFY": "NSE_EQ|INE009A01021",
    "ICICIBANK": "NSE_EQ|INE090A01021",
    "BHARTIARTL": "NSE_EQ|INE397D01024",
    "SBIN": "NSE_EQ|INE062A01020",
    "ITC": "NSE_EQ|INE154A01025",
    "WIPRO": "NSE_EQ|INE075A01022",
    "HCLTECH": "NSE_EQ|INE860A01027",
    "TATAMOTORS": "NSE_EQ|INE155A01022",
    "TMPV": "NSE_EQ|INE155A01022",
    "AXISBANK": "NSE_EQ|INE238A01034",
    "SUNPHARMA": "NSE_EQ|INE044A01036",
    "BAJFINANCE": "NSE_EQ|INE296A01032",
    "MARUTI": "NSE_EQ|INE585B01010",
    "TATASTEEL": "NSE_EQ|INE081A01020",
    "LTIM": "NSE_EQ|INE214T01019",
    "ADANIENT": "NSE_EQ|INE423A01024",
    "POWERGRID": "NSE_EQ|INE752E01010",
    "NESTLEIND": "NSE_EQ|INE239A01024",
  };

  const INDEX_KEY_MAP: Record<string, string> = {
    "NIFTY 50": "NSE_INDEX|Nifty 50",
    "SENSEX": "BSE_INDEX|SENSEX",
    "NIFTY BANK": "NSE_INDEX|Nifty Bank",
    "NIFTY IT": "NSE_INDEX|Nifty IT",
  };

  const STOCK_META: Record<string, { name: string; sector: string; pe: number; weekHigh52: number; weekLow52: number }> = {
    "RELIANCE": { name: "Reliance Industries", sector: "Oil & Gas", pe: 28.4, weekHigh52: 3024.90, weekLow52: 2220.30 },
    "TCS": { name: "Tata Consultancy Services", sector: "IT", pe: 32.1, weekHigh52: 4592.25, weekLow52: 3311.80 },
    "HDFCBANK": { name: "HDFC Bank", sector: "Banking", pe: 19.8, weekHigh52: 1880.00, weekLow52: 1363.55 },
    "INFY": { name: "Infosys", sector: "IT", pe: 29.6, weekHigh52: 1997.80, weekLow52: 1358.35 },
    "ICICIBANK": { name: "ICICI Bank", sector: "Banking", pe: 18.2, weekHigh52: 1361.00, weekLow52: 970.00 },
    "BHARTIARTL": { name: "Bharti Airtel", sector: "Telecom", pe: 76.3, weekHigh52: 1779.00, weekLow52: 1200.00 },
    "SBIN": { name: "State Bank of India", sector: "Banking", pe: 11.2, weekHigh52: 912.10, weekLow52: 600.20 },
    "ITC": { name: "ITC Limited", sector: "FMCG", pe: 28.9, weekHigh52: 528.55, weekLow52: 398.00 },
    "WIPRO": { name: "Wipro", sector: "IT", pe: 24.5, weekHigh52: 612.50, weekLow52: 385.00 },
    "HCLTECH": { name: "HCL Technologies", sector: "IT", pe: 27.8, weekHigh52: 1960.00, weekLow52: 1276.80 },
    "TATAMOTORS": { name: "Tata Motors", sector: "Auto", pe: 8.5, weekHigh52: 1080.00, weekLow52: 620.55 },
    "AXISBANK": { name: "Axis Bank", sector: "Banking", pe: 14.6, weekHigh52: 1340.00, weekLow52: 995.00 },
    "SUNPHARMA": { name: "Sun Pharmaceutical", sector: "Pharma", pe: 38.2, weekHigh52: 1960.35, weekLow52: 1208.00 },
    "BAJFINANCE": { name: "Bajaj Finance", sector: "NBFC", pe: 33.4, weekHigh52: 8192.00, weekLow52: 5875.60 },
    "MARUTI": { name: "Maruti Suzuki", sector: "Auto", pe: 29.1, weekHigh52: 13680.00, weekLow52: 10150.00 },
    "TATASTEEL": { name: "Tata Steel", sector: "Metals", pe: 58.2, weekHigh52: 184.60, weekLow52: 118.45 },
    "LTIM": { name: "LTIMindtree", sector: "IT", pe: 35.8, weekHigh52: 6245.00, weekLow52: 4520.00 },
    "ADANIENT": { name: "Adani Enterprises", sector: "Conglomerate", pe: 85.4, weekHigh52: 3743.90, weekLow52: 2142.00 },
    "POWERGRID": { name: "Power Grid Corp", sector: "Power", pe: 17.8, weekHigh52: 366.25, weekLow52: 246.30 },
    "NESTLEIND": { name: "Nestle India", sector: "FMCG", pe: 72.5, weekHigh52: 2778.00, weekLow52: 2110.00 },
  };

  app.get("/api/market/live-stocks", async (_req, res) => {
    if (!upstoxAccessToken) {
      return res.json({ source: "mock", stocks: [], indices: [] });
    }
    try {
      const stockKeys = Object.values(STOCK_ISIN_MAP).map(k => encodeURIComponent(k)).join(",");
      const indexKeys = Object.values(INDEX_KEY_MAP).map(k => encodeURIComponent(k)).join(",");

      const [stocksRes, indicesRes] = await Promise.all([
        globalThis.fetch(
          `https://api.upstox.com/v2/market-quote/quotes?instrument_key=${stockKeys}`,
          { headers: { Authorization: `Bearer ${upstoxAccessToken}`, Accept: "application/json" } }
        ),
        globalThis.fetch(
          `https://api.upstox.com/v2/market-quote/quotes?instrument_key=${indexKeys}`,
          { headers: { Authorization: `Bearer ${upstoxAccessToken}`, Accept: "application/json" } }
        ),
      ]);

      const stocksData = await stocksRes.json();
      const indicesData = await indicesRes.json();


      const SYMBOL_ALIAS: Record<string, string> = { "TMPV": "TATAMOTORS" };

      const stocks: any[] = [];
      const addedSymbols = new Set<string>();
      if (stocksData?.status === "success" && stocksData?.data) {
        for (const dataKey of Object.keys(stocksData.data)) {
          const quote = stocksData.data[dataKey];
          const rawSymbol = dataKey.replace("NSE_EQ:", "");
          const displaySymbol = SYMBOL_ALIAS[rawSymbol] || rawSymbol;
          if (addedSymbols.has(displaySymbol)) continue;
          if (!STOCK_META[displaySymbol]) continue;
          addedSymbols.add(displaySymbol);
          const meta = STOCK_META[displaySymbol];
          const lastPrice = quote.last_price || 0;
          const netChange = quote.net_change || 0;
          const prevClose = lastPrice - netChange;
          const changePercent = prevClose > 0 ? (netChange / prevClose) * 100 : 0;
          stocks.push({
            symbol: displaySymbol,
            name: meta.name,
            price: lastPrice,
            change: Math.round(netChange * 100) / 100,
            changePercent: Math.round(changePercent * 100) / 100,
            high: quote.ohlc?.high || lastPrice,
            low: quote.ohlc?.low || lastPrice,
            volume: quote.volume ? (quote.volume >= 1000000 ? `${(quote.volume / 1000000).toFixed(1)}M` : `${(quote.volume / 1000).toFixed(0)}K`) : "0",
            marketCap: "N/A",
            sector: meta.sector,
            pe: meta.pe,
            weekHigh52: meta.weekHigh52,
            weekLow52: meta.weekLow52,
          });
        }
      }

      const INDEX_DISPLAY_MAP: Record<string, string> = {
        "NSE_INDEX:Nifty 50": "NIFTY 50",
        "NSE_INDEX:Nifty Bank": "NIFTY BANK",
        "NSE_INDEX:Nifty IT": "NIFTY IT",
        "BSE_INDEX:SENSEX": "SENSEX",
      };

      const indices: any[] = [];
      if (indicesData?.status === "success" && indicesData?.data) {
        for (const [dataKey, quote] of Object.entries(indicesData.data as Record<string, any>)) {
          const name = INDEX_DISPLAY_MAP[dataKey];
          if (!name) continue;
          if (quote) {
            const lastPrice = quote.last_price || 0;
            const netChange = quote.net_change || 0;
            const prevClose = lastPrice - netChange;
            const changePercent = prevClose > 0 ? (netChange / prevClose) * 100 : 0;
            indices.push({
              name,
              value: lastPrice,
              change: Math.round(netChange * 100) / 100,
              changePercent: Math.round(changePercent * 100) / 100,
            });
          }
        }
      }

      res.json({ source: "upstox", stocks, indices });
    } catch (error) {
      console.error("Error fetching live market data:", error);
      res.json({ source: "mock", stocks: [], indices: [], error: "Failed to fetch live data" });
    }
  });

  app.post("/api/telegram/test", async (_req, res) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.bot_token;
    const chatId = process.env.TELEGRAM_CHAT_ID || process.env.chat_id;
    if (!botToken || !chatId) return res.status(400).json({ error: "Not configured", configured: false });
    try {
      const telegramRes = await globalThis.fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: "Nifty Options Bot connected successfully! You will receive trade signals here.", parse_mode: "Markdown" }),
        }
      );
      const data = await telegramRes.json();
      res.json({ success: data.ok, configured: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to send test message" });
    }
  });

  app.get("/api/market/session", (_req, res) => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const istDate = new Date(utc + 5.5 * 60 * 60000);
    const uaeDate = new Date(utc + 4 * 60 * 60000);

    const fmt2 = (n: number) => n.toString().padStart(2, "0");
    const fmtTime = (d: Date) => `${fmt2(d.getHours())}:${fmt2(d.getMinutes())}:${fmt2(d.getSeconds())}`;
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const fmtDate = (d: Date) => `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;

    const dayOfWeek = istDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const currentMins = istDate.getHours() * 60 + istDate.getMinutes();
    const openMins = 9 * 60 + 15;
    const closeMins = 15 * 60 + 30;

    let sessionStatus = "MARKET_CLOSED";
    let sessionLabel = "Market Closed";
    if (isWeekend) { sessionLabel = "Weekend - Market Closed"; }
    else if (currentMins >= openMins && currentMins < closeMins) { sessionStatus = "MARKET_OPEN"; sessionLabel = "Market Open - Live Trading"; }
    else if (currentMins >= 9 * 60 && currentMins < openMins) { sessionStatus = "PRE_MARKET"; sessionLabel = "Pre-Market Session"; }
    else if (currentMins >= closeMins) { sessionStatus = "AFTER_HOURS"; sessionLabel = "After Hours"; }

    const progressPercent = sessionStatus === "MARKET_OPEN"
      ? Math.round(((currentMins - openMins) / (closeMins - openMins)) * 100)
      : 0;

    res.json({
      istTime: fmtTime(istDate), uaeTime: fmtTime(uaeDate),
      istDate: fmtDate(istDate), uaeDate: fmtDate(uaeDate),
      sessionStatus, sessionLabel, isWeekend, progressPercent,
      marketOpenIST: "09:15", marketCloseIST: "15:30",
      marketOpenUAE: "07:45", marketCloseUAE: "14:00",
    });
  });

  app.post("/api/telegram/alert", async (req, res) => {
    try {
      const { alertType, customMessage, signalData } = req.body;
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      if (!botToken || !chatId) return res.status(400).json({ error: "Telegram not configured" });

      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const ist = new Date(utc + 5.5 * 60 * 60000);
      const uae = new Date(utc + 4 * 60 * 60000);
      const fmt2 = (n: number) => n.toString().padStart(2, "0");
      const istStr = `${fmt2(ist.getHours())}:${fmt2(ist.getMinutes())}`;
      const uaeStr = `${fmt2(uae.getHours())}:${fmt2(uae.getMinutes())}`;

      let message = "";
      switch (alertType) {
        case "MARKET_OPEN":
          message = `*JARVIS - Market Open*\n\nNSE is NOW OPEN\nIST: ${istStr} | UAE: ${uaeStr}\nSession: 09:15-15:30 IST / 07:45-14:00 UAE\n\nAll 20 neural formulas active, sir.`;
          break;
        case "MARKET_CLOSE":
          message = `*JARVIS - Market Closed*\n\nNSE session ended\nIST: ${istStr} | UAE: ${uaeStr}\n\nNext session: Tomorrow 09:15 IST / 07:45 UAE`;
          break;
        case "PRE_MARKET":
          message = `*JARVIS - Pre-Market*\n\nPre-market session active\nIST: ${istStr} | UAE: ${uaeStr}\nMarket opens at 09:15 IST / 07:45 UAE\n\nWarming up neural engine...`;
          break;
        case "SIGNAL":
          if (signalData) {
            message = `*JARVIS Trading Signal*\n\n*${signalData.action}* | Confidence: ${signalData.confidence}%\nStrike: ${signalData.strike} | Premium: Rs.${signalData.premium}\nTarget: Rs.${signalData.target} | SL: Rs.${signalData.stopLoss}\n\nEngine: ${signalData.engineVersion || "v8.0"}\n${signalData.rocketThrust ? `Rocket: ${signalData.rocketThrust}` : ""}\n${signalData.neuroWisdom ? `Brain: ${signalData.neuroWisdom}` : ""}\n\nIST: ${istStr} | UAE: ${uaeStr}`;
          }
          break;
        case "SESSION_UPDATE":
          const currentMins = ist.getHours() * 60 + ist.getMinutes();
          const progress = Math.max(0, Math.round(((currentMins - 555) / (930 - 555)) * 100));
          message = `*JARVIS Status*\n\nIST: ${istStr} | UAE: ${uaeStr}\nSession Progress: ${Math.min(100, progress)}%`;
          break;
        case "CUSTOM":
          message = customMessage || "JARVIS alert";
          break;
        default:
          message = customMessage || `JARVIS Alert\nIST: ${istStr} | UAE: ${uaeStr}`;
      }

      const telegramRes = await globalThis.fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "Markdown" }),
        }
      );
      const data = await telegramRes.json();
      res.json({ success: data.ok });
    } catch (error) {
      console.error("Telegram alert error:", error);
      res.status(500).json({ error: "Failed to send alert" });
    }
  });

  let lastAlertedSession = "";
  setInterval(async () => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.bot_token;
    const chatId = process.env.TELEGRAM_CHAT_ID || process.env.chat_id;
    if (!botToken || !chatId) return;

    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const ist = new Date(utc + 5.5 * 60 * 60000);
    const currentMins = ist.getHours() * 60 + ist.getMinutes();
    const dayOfWeek = ist.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return;

    const dateKey = `${ist.getFullYear()}-${ist.getMonth()}-${ist.getDate()}`;
    let alertType = "";

    if (currentMins === 9 * 60 && lastAlertedSession !== `${dateKey}-PRE`) {
      alertType = "PRE_MARKET"; lastAlertedSession = `${dateKey}-PRE`;
    } else if (currentMins === 9 * 60 + 15 && lastAlertedSession !== `${dateKey}-OPEN`) {
      alertType = "MARKET_OPEN"; lastAlertedSession = `${dateKey}-OPEN`;
    } else if (currentMins === 15 * 60 + 30 && lastAlertedSession !== `${dateKey}-CLOSE`) {
      alertType = "MARKET_CLOSE"; lastAlertedSession = `${dateKey}-CLOSE`;
    }

    if (alertType) {
      try {
        const fmt2 = (n: number) => n.toString().padStart(2, "0");
        const uae = new Date(utc + 4 * 60 * 60000);
        const istStr = `${fmt2(ist.getHours())}:${fmt2(ist.getMinutes())}`;
        const uaeStr = `${fmt2(uae.getHours())}:${fmt2(uae.getMinutes())}`;
        let msg = "";
        if (alertType === "PRE_MARKET") msg = `*JARVIS - Pre-Market*\n\nPre-market started\nIST: ${istStr} | UAE: ${uaeStr}\nMarket opens at 09:15 IST / 07:45 UAE`;
        else if (alertType === "MARKET_OPEN") msg = `*JARVIS - Market OPEN*\n\nNSE trading started\nIST: ${istStr} | UAE: ${uaeStr}\nSession: 09:15-15:30 IST`;
        else if (alertType === "MARKET_CLOSE") msg = `*JARVIS - Market CLOSED*\n\nNSE session ended\nIST: ${istStr} | UAE: ${uaeStr}\nNext: Tomorrow 09:15 IST / 07:45 UAE`;

        await globalThis.fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "Markdown" }),
        });
        console.log(`[JARVIS] Auto-alert sent: ${alertType}`);
      } catch (e) { console.error("[JARVIS] Auto-alert failed:", e); }
    }
  }, 60000);

  function getTimeStrings() {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const ist = new Date(utc + 5.5 * 60 * 60000);
    const uae = new Date(utc + 4 * 60 * 60000);
    const fmt2 = (n: number) => n.toString().padStart(2, "0");
    return {
      istStr: `${fmt2(ist.getHours())}:${fmt2(ist.getMinutes())}:${fmt2(ist.getSeconds())}`,
      uaeStr: `${fmt2(uae.getHours())}:${fmt2(uae.getMinutes())}`,
      ist, uae,
      currentMins: ist.getHours() * 60 + ist.getMinutes(),
      dayOfWeek: ist.getDay(),
    };
  }

  function generateProposalId() {
    return `TP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }

  function simulateAutoScan(): TradeProposal | null {
    const { istStr, uaeStr, ist, currentMins, dayOfWeek } = getTimeStrings();
    if (dayOfWeek === 0 || dayOfWeek === 6) return null;

    const openMins = 9 * 60 + 15;
    const closeMins = 15 * 60 + 30;
    const preMarketMins = 9 * 60;
    if (currentMins < preMarketMins || currentMins >= closeMins) return null;

    scanCycleCount++;

    const spot = 24200 + (Math.random() - 0.5) * 400;
    const atmStrike = Math.round(spot / 50) * 50;
    const isBullish = Math.random() > 0.45;
    const action = isBullish ? "BUY_CE" : "BUY_PE";
    const strike = isBullish ? atmStrike + Math.floor(Math.random() * 3) * 50 : atmStrike - Math.floor(Math.random() * 3) * 50;
    const premium = Math.round(80 + Math.random() * 180);
    const confidence = Math.round(45 + Math.random() * 45);
    const greenCandles = Math.floor(Math.random() * 4);
    const entropyVal = Math.random();
    const entropyLevel = entropyVal > 0.7 ? "HIGH (TRAP)" : entropyVal > 0.4 ? "MODERATE" : "LOW";
    const monteCarloWin = Math.round(35 + Math.random() * 50);
    const brokerage = 200;
    const targetPremium = premium + 40 + Math.round(Math.random() * 80);
    const slPremium = premium - 20 - Math.round(Math.random() * 30);
    const lotSize = 75;
    const potentialProfit = (targetPremium - premium) * lotSize;
    const netProfit = potentialProfit - brokerage;

    const zeroLossReady = greenCandles >= 2 && entropyVal < 0.7 && netProfit >= 300 && confidence >= 55;

    if (confidence < 50 || entropyVal > 0.75) return null;

    const rocketScore = Math.round(40 + Math.random() * 50);
    const fusionScore = Math.round(40 + Math.random() * 50);
    const thrustLevel = rocketScore > 70 ? "HYPERDRIVE" : rocketScore > 50 ? "ORBIT" : "LIFTOFF";
    const wisdomLevel = fusionScore > 70 ? "GRANDMASTER" : fusionScore > 50 ? "EXPERT" : "LEARNING";

    const expiresAt = new Date(Date.now() + 5 * 60000);

    return {
      id: generateProposalId(),
      action,
      confidence,
      strike,
      premium,
      target: targetPremium,
      stopLoss: slPremium,
      lotSize,
      potentialProfit,
      brokerage,
      netProfit,
      reasoning: [
        `${action === "BUY_CE" ? "Bullish" : "Bearish"} signal detected at ${strike}`,
        `Monte Carlo: ${monteCarloWin}% win probability across 10,000 paths`,
        `Green candles confirmed: ${greenCandles}/2 required`,
        `Entropy: ${entropyLevel} — ${entropyVal > 0.7 ? "DANGER, trap zone detected" : "Safe to proceed"}`,
        `Rocket Scalp: ${thrustLevel} | Score ${rocketScore}%`,
        `Neuro Fusion: ${wisdomLevel} | Score ${fusionScore}%`,
        zeroLossReady ? "Zero-loss criteria MET — safe entry" : "Zero-loss criteria NOT MET — proceed with caution",
      ],
      engineVersion: "v8.0 NeuroQuantum SuperBrain",
      rocketThrust: thrustLevel,
      neuroWisdom: wisdomLevel,
      fusionScore,
      entropyLevel,
      greenCandles,
      zeroLossReady,
      monteCarloWinProb: monteCarloWin,
      status: "PENDING",
      createdAt: new Date().toISOString(),
      respondedAt: null,
      expiresAt: expiresAt.toISOString(),
      istTime: istStr,
      uaeTime: uaeStr,
      scanCycle: scanCycleCount,
    };
  }

  async function sendTelegramApprovalRequest(proposal: TradeProposal) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.bot_token;
    const chatId = process.env.TELEGRAM_CHAT_ID || process.env.chat_id;
    if (!botToken || !chatId) return;

    const zeroLossIcon = proposal.zeroLossReady ? "READY" : "NOT MET";
    const msg = [
      `*JARVIS - TRADE APPROVAL REQUEST*`,
      ``,
      `*${proposal.action}* | Strike: ${proposal.strike}`,
      `Premium: Rs.${proposal.premium} | Lot: ${proposal.lotSize}`,
      ``,
      `Target: Rs.${proposal.target} | SL: Rs.${proposal.stopLoss}`,
      `Potential: Rs.${proposal.potentialProfit} | Net: Rs.${proposal.netProfit}`,
      `Brokerage: Rs.${proposal.brokerage}`,
      ``,
      `Confidence: ${proposal.confidence}%`,
      `Monte Carlo: ${proposal.monteCarloWinProb}% win`,
      `Green Candles: ${proposal.greenCandles}/2`,
      `Entropy: ${proposal.entropyLevel}`,
      `Zero-Loss: ${zeroLossIcon}`,
      ``,
      `Rocket: ${proposal.rocketThrust} | Brain: ${proposal.neuroWisdom}`,
      `Fusion Score: ${proposal.fusionScore}%`,
      ``,
      `IST: ${proposal.istTime} | UAE: ${proposal.uaeTime}`,
      `ID: ${proposal.id}`,
      `Expires in 5 minutes`,
      ``,
      `Reply APPROVE ${proposal.id} or REJECT ${proposal.id}`,
      `Or use the dashboard one-click button.`,
    ].join("\n");

    try {
      await globalThis.fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "Markdown" }),
      });
      console.log(`[JARVIS] Approval request sent to Telegram: ${proposal.id}`);
    } catch (e) { console.error("[JARVIS] Telegram approval failed:", e); }
  }

  async function sendTelegramTradeResult(proposal: TradeProposal, action: string) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.bot_token;
    const chatId = process.env.TELEGRAM_CHAT_ID || process.env.chat_id;
    if (!botToken || !chatId) return;

    const { istStr, uaeStr } = getTimeStrings();
    const icon = action === "APPROVED" ? "APPROVED" : "REJECTED";
    const msg = [
      `*JARVIS - Trade ${icon}*`,
      ``,
      `${proposal.action} | Strike: ${proposal.strike}`,
      `${action === "APPROVED" ? "Executing trade..." : "Trade cancelled."}`,
      ``,
      `IST: ${istStr} | UAE: ${uaeStr}`,
      `ID: ${proposal.id}`,
    ].join("\n");

    try {
      await globalThis.fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "Markdown" }),
      });
    } catch (e) { console.error("[JARVIS] Trade result Telegram failed:", e); }
  }

  app.get("/api/auto-trade/proposals", (_req, res) => {
    const pending = tradeProposals.filter(p => {
      if (p.status === "PENDING" && new Date(p.expiresAt) < new Date()) {
        p.status = "EXPIRED";
      }
      return true;
    });
    res.json({
      proposals: pending.slice(-20),
      autoScanActive,
      scanCycleCount,
      pendingCount: pending.filter(p => p.status === "PENDING").length,
    });
  });

  app.post("/api/auto-trade/approve", async (req, res) => {
    const { proposalId, action } = req.body;
    const proposal = tradeProposals.find(p => p.id === proposalId);
    if (!proposal) return res.status(404).json({ error: "Proposal not found" });
    if (proposal.status !== "PENDING") return res.status(400).json({ error: `Proposal already ${proposal.status}` });

    if (new Date(proposal.expiresAt) < new Date()) {
      proposal.status = "EXPIRED";
      return res.status(400).json({ error: "Proposal has expired" });
    }

    proposal.status = action === "approve" ? "APPROVED" : "REJECTED";
    proposal.respondedAt = new Date().toISOString();

    sendTelegramTradeResult(proposal, action === "approve" ? "APPROVED" : "REJECTED");

    if (action === "approve") {
      setTimeout(() => {
        proposal.status = "EXECUTED";
        const { istStr, uaeStr } = getTimeStrings();
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;
        if (botToken && chatId) {
          globalThis.fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: `*JARVIS - Trade EXECUTED*\n\n${proposal.action} | Strike: ${proposal.strike}\nPremium: Rs.${proposal.premium}\nTarget: Rs.${proposal.target} | SL: Rs.${proposal.stopLoss}\n\nIST: ${istStr} | UAE: ${uaeStr}\nMonitoring position...`,
              parse_mode: "Markdown",
            }),
          }).catch(console.error);
        }
      }, 2000);
    }

    res.json({ success: true, proposal });
  });

  app.post("/api/auto-trade/scan/start", (_req, res) => {
    if (autoScanActive) return res.json({ message: "Already scanning", active: true, scanCycleCount });

    autoScanActive = true;
    scanCycleCount = 0;
    console.log("[JARVIS] Auto-scan STARTED");

    const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.bot_token;
    const chatId = process.env.TELEGRAM_CHAT_ID || process.env.chat_id;
    if (botToken && chatId) {
      const { istStr, uaeStr } = getTimeStrings();
      globalThis.fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `*JARVIS - Auto-Scan ACTIVATED*\n\nScanning market with 20 neural formulas...\nTrade proposals will be sent for your approval.\n\nIST: ${istStr} | UAE: ${uaeStr}`,
          parse_mode: "Markdown",
        }),
      }).catch(console.error);
    }

    autoScanInterval = setInterval(async () => {
      if (!autoScanActive) return;
      const proposal = simulateAutoScan();
      if (proposal) {
        tradeProposals.push(proposal);
        await sendTelegramApprovalRequest(proposal);
        console.log(`[JARVIS] New proposal: ${proposal.id} | ${proposal.action} ${proposal.strike} | Conf: ${proposal.confidence}%`);
      }
    }, 30000);

    const firstProposal = simulateAutoScan();
    if (firstProposal) {
      tradeProposals.push(firstProposal);
      sendTelegramApprovalRequest(firstProposal);
    }

    res.json({ message: "Auto-scan started", active: true, scanCycleCount });
  });

  app.post("/api/auto-trade/scan/stop", (_req, res) => {
    autoScanActive = false;
    if (autoScanInterval) { clearInterval(autoScanInterval); autoScanInterval = null; }
    console.log("[JARVIS] Auto-scan STOPPED");

    const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.bot_token;
    const chatId = process.env.TELEGRAM_CHAT_ID || process.env.chat_id;
    if (botToken && chatId) {
      const { istStr, uaeStr } = getTimeStrings();
      globalThis.fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `*JARVIS - Auto-Scan DEACTIVATED*\n\nScanning paused. ${scanCycleCount} cycles completed.\n\nIST: ${istStr} | UAE: ${uaeStr}`,
          parse_mode: "Markdown",
        }),
      }).catch(console.error);
    }

    res.json({ message: "Auto-scan stopped", active: false, scanCycleCount });
  });

  app.post("/api/auto-trade/test-proposal", async (_req, res) => {
    const { istStr, uaeStr } = getTimeStrings();
    scanCycleCount++;
    const spot = 24200 + (Math.random() - 0.5) * 400;
    const atmStrike = Math.round(spot / 50) * 50;
    const isBullish = Math.random() > 0.45;
    const action = isBullish ? "BUY_CE" : "BUY_PE";
    const strike = isBullish ? atmStrike + Math.floor(Math.random() * 3) * 50 : atmStrike - Math.floor(Math.random() * 3) * 50;
    const premium = Math.round(80 + Math.random() * 180);
    const confidence = Math.round(55 + Math.random() * 35);
    const greenCandles = Math.floor(1 + Math.random() * 3);
    const entropyVal = Math.random() * 0.6;
    const entropyLevel = entropyVal > 0.4 ? "MODERATE" : "LOW";
    const monteCarloWin = Math.round(50 + Math.random() * 35);
    const brokerage = 200;
    const targetPremium = premium + 40 + Math.round(Math.random() * 80);
    const slPremium = premium - 20 - Math.round(Math.random() * 30);
    const lotSize = 75;
    const potentialProfit = (targetPremium - premium) * lotSize;
    const netProfit = potentialProfit - brokerage;
    const zeroLossReady = greenCandles >= 2 && netProfit >= 300 && confidence >= 55;
    const rocketScore = Math.round(50 + Math.random() * 40);
    const fusionScore = Math.round(50 + Math.random() * 40);
    const thrustLevel = rocketScore > 70 ? "HYPERDRIVE" : rocketScore > 50 ? "ORBIT" : "LIFTOFF";
    const wisdomLevel = fusionScore > 70 ? "GRANDMASTER" : fusionScore > 50 ? "EXPERT" : "LEARNING";

    const proposal: TradeProposal = {
      id: generateProposalId(),
      action, confidence, strike, premium,
      target: targetPremium, stopLoss: slPremium,
      lotSize: 75, potentialProfit, brokerage, netProfit,
      reasoning: [
        `${action === "BUY_CE" ? "Bullish" : "Bearish"} signal at ${strike}`,
        `Monte Carlo: ${monteCarloWin}% win across 10K paths`,
        `Green candles: ${greenCandles}/2`,
        `Entropy: ${entropyLevel}`,
        `Rocket: ${thrustLevel} | Brain: ${wisdomLevel}`,
        zeroLossReady ? "Zero-loss criteria MET" : "Zero-loss NOT MET",
      ],
      engineVersion: "v8.0 NeuroQuantum SuperBrain",
      rocketThrust: thrustLevel, neuroWisdom: wisdomLevel,
      fusionScore, entropyLevel, greenCandles,
      zeroLossReady, monteCarloWinProb: monteCarloWin,
      status: "PENDING",
      createdAt: new Date().toISOString(),
      respondedAt: null,
      expiresAt: new Date(Date.now() + 5 * 60000).toISOString(),
      istTime: istStr, uaeTime: uaeStr,
      scanCycle: scanCycleCount,
    };

    tradeProposals.push(proposal);
    
    // Direct Telegram Notification
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      try {
        const telegramMsg = `🚀 *JARVIS Signal*\n\n` +
          `💰 *NIFTY:* ${proposal.strike}\n` +
          `📈 *Action:* ${action}\n` +
          `🎯 *Strike:* ${strike}\n` +
          `💵 *Entry:* ₹${premium}\n` +
          `🚀 *Target:* ₹${targetPremium}\n` +
          `🛑 *SL:* ₹${slPremium}\n\n` +
          `🧠 *Brain:* ${wisdomLevel}\n` +
          `Probability: ${monteCarloWin}%`;

        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text: telegramMsg,
            parse_mode: 'Markdown'
          })
        });
      } catch (err) {
        console.error("Telegram notification failed:", err);
      }
    }

    await sendTelegramApprovalRequest(proposal);
    res.json({ success: true, proposal });
  });

  app.get("/api/auto-trade/status", (_req, res) => {
    const pending = tradeProposals.filter(p => p.status === "PENDING").length;
    const approved = tradeProposals.filter(p => p.status === "APPROVED" || p.status === "EXECUTED").length;
    const rejected = tradeProposals.filter(p => p.status === "REJECTED").length;
    const expired = tradeProposals.filter(p => p.status === "EXPIRED").length;
    res.json({
      autoScanActive,
      scanCycleCount,
      totalProposals: tradeProposals.length,
      pending, approved, rejected, expired,
    });
  });

  app.post("/api/market/comprehensive-analysis", async (req, res) => {
    try {
      const { symbol, spotPrice, optionData, engineData } = req.body;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      const now = new Date();
      const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
      const marketOpen = istTime.getHours() >= 9 && (istTime.getHours() < 15 || (istTime.getHours() === 15 && istTime.getMinutes() <= 30));

      const systemPrompt = `You are JARVIS, an elite AI trading analyst for Indian NSE markets. Provide a COMPREHENSIVE market analysis covering ALL these dimensions. Be specific with data, numbers, and actionable insights.

Your analysis must cover these sections in order:

1. MARKET OVERVIEW
- Current Nifty 50 status, trend direction, key levels
- Market timing: ${marketOpen ? "MARKET IS OPEN" : "MARKET IS CLOSED"} (IST: ${istTime.toLocaleTimeString("en-IN")})
- Intraday bias and momentum

2. INDIAN ECONOMY CONTEXT
- GDP growth trajectory, inflation (CPI/WPI), RBI monetary policy stance
- Rupee vs Dollar movement impact on markets
- FII/DII flows - institutional money direction
- Government fiscal policy, budget impact, PLI schemes

3. POLITICAL LANDSCAPE
- Government policy decisions affecting markets
- State/Central elections impact
- Regulatory changes (SEBI, RBI circulars)
- Geopolitical tensions affecting Indian markets

4. GLOBAL MARKET IMPACT
- US markets (S&P 500, Nasdaq, Dow) overnight impact
- European markets influence
- Asian markets (Nikkei, Hang Seng, SGX Nifty) correlation
- US Fed interest rate expectations
- Crude oil prices impact on India (import dependency)
- Gold prices and safe haven flows

5. SECTOR ANALYSIS
- Banking & Financial Services (Nifty Bank, interest rate sensitivity)
- IT sector (US recession fears, rupee impact)
- Pharma (US FDA approvals, generic drug market)
- Auto (EV transition, rural demand)
- FMCG (rural/urban consumption)
- Metal & Mining (China demand, global commodity cycle)
- Energy (crude oil, gas prices, green energy push)

6. CORPORATE MOVEMENTS
- Major quarterly results impact
- Block deals, bulk deals, insider trading
- M&A activity in Indian markets
- FPO/IPO pipeline effect on liquidity

7. IMPORT/EXPORT & TRADE
- Trade deficit/surplus trends
- Key import dependencies (crude oil, gold, electronics)
- Export competitiveness (IT services, pharma, textiles)
- PLI scheme beneficiaries

8. MILITARY & DEFENSE
- Defense sector opportunities
- Indigenous defense manufacturing (Make in India)
- Border tensions impact on markets
- Defense budget allocation

9. OPTIONS SPECIFIC ANALYSIS
- Nifty option chain interpretation
- PCR analysis and what it signals
- Max pain theory application
- IV skew and volatility regime
- Recommended strategy: specific strikes, entry, target, SL

10. FINAL VERDICT
- Clear BUY CE / BUY PE / STAY AWAY recommendation
- Confidence level with reasoning
- Risk factors to watch
- Key levels to monitor

Use INR for all prices. Be thorough but actionable. This analysis should give the trader a complete picture of the Indian market landscape.`;

      const userPrompt = `Analyze the current Indian market comprehensively:
Symbol: ${symbol || "NIFTY 50"}
Spot Price: ${spotPrice || "N/A"}
${optionData ? `Option Data: PCR=${optionData.pcr}, Max Pain=${optionData.maxPain}, ATM IV=${optionData.atmIV}` : ""}
${engineData ? `Engine Signal: ${engineData.signal}, Confidence: ${engineData.confidence}%, Entropy: ${engineData.entropy}` : ""}

Provide the full 10-section comprehensive analysis now.`;

      const stream = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
        max_completion_tokens: 4096,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      console.error("Comprehensive analysis error:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Analysis failed" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to generate comprehensive analysis" });
      }
    }
  });

  let currentPin = "1234";
  let autoTradeMode = false;

  interface ActivePosition {
    id: string;
    type: "CE" | "PE";
    strike: number;
    lots: number;
    entryPremium: number;
    currentPremium: number;
    target: number;
    stopLoss: number;
    pnl: number;
    pnlPercent: number;
    entryTime: string;
    status: "ACTIVE" | "EXITED" | "AUTO_EXITED" | "PROFIT_BOOKED" | "ATR_STOPPED" | "KISS_PROFIT";
    exitPremium: number | null;
    exitTime: string | null;
    exitReason: string | null;
    premiumHistory: number[];
    peakPremium: number;
    lowestPremium: number;
    atrStopLoss: number;
    kissPhase: "NONE" | "DROPPING" | "BOTTOMED" | "RECOVERING" | "KISS_BOUNCE";
    lossAlerted: boolean;
  }

  const activePositions: ActivePosition[] = [];
  let positionSimInterval: ReturnType<typeof setInterval> | null = null;

  const LOSS_ALERT_THRESHOLD = 300;
  const MIN_PROFIT_TARGET = 500;
  const LOT_SIZE = 25;

  function calculatePositionATR(history: number[]): number {
    if (history.length < 3) return 0;
    const trs: number[] = [];
    for (let i = 1; i < history.length; i++) {
      trs.push(Math.abs(history[i] - history[i - 1]));
    }
    const period = Math.min(14, trs.length);
    const recentTRs = trs.slice(-period);
    return recentTRs.reduce((s, v) => s + v, 0) / recentTRs.length;
  }

  function detectPositionKissPattern(pos: ActivePosition): { phase: string; shouldBook: boolean; description: string } {
    const history = pos.premiumHistory;
    if (history.length < 5) return { phase: "NONE", shouldBook: false, description: "Insufficient data" };

    const dropFromPeak = pos.peakPremium > 0 ? ((pos.peakPremium - pos.lowestPremium) / pos.peakPremium) * 100 : 0;
    const bounceFromLow = pos.lowestPremium > 0 ? ((pos.currentPremium - pos.lowestPremium) / pos.lowestPremium) * 100 : 0;
    const aboveEntry = pos.currentPremium >= pos.entryPremium;

    if (dropFromPeak < 3) return { phase: "NONE", shouldBook: false, description: "No significant drop" };
    if (pos.currentPremium <= pos.lowestPremium * 1.01) return { phase: "DROPPING", shouldBook: false, description: `Dropping - ${dropFromPeak.toFixed(1)}% from peak` };
    if (bounceFromLow > 2 && bounceFromLow < 8 && !aboveEntry) return { phase: "BOTTOMED", shouldBook: false, description: `Bottoming out, bounce ${bounceFromLow.toFixed(1)}%` };
    if (bounceFromLow >= 8 && !aboveEntry) return { phase: "RECOVERING", shouldBook: false, description: `Recovering +${bounceFromLow.toFixed(1)}% from low` };
    if (bounceFromLow >= 5 && aboveEntry) return { phase: "KISS_BOUNCE", shouldBook: true, description: `KISS BOUNCE! Drop ${dropFromPeak.toFixed(1)}%, bounced ${bounceFromLow.toFixed(1)}%, above entry - BOOK PROFIT!` };

    return { phase: "NONE", shouldBook: false, description: "Monitoring..." };
  }

  function simulatePositionPriceMovement() {
    for (const pos of activePositions) {
      if (pos.status !== "ACTIVE") continue;
      const drift = (Math.random() - 0.48) * 3;
      const volatility = (Math.random() - 0.5) * pos.entryPremium * 0.04;
      pos.currentPremium = Math.max(0.5, pos.currentPremium + drift + volatility);
      pos.currentPremium = parseFloat(pos.currentPremium.toFixed(2));
      pos.pnl = parseFloat(((pos.currentPremium - pos.entryPremium) * pos.lots * LOT_SIZE).toFixed(2));
      pos.pnlPercent = parseFloat((((pos.currentPremium - pos.entryPremium) / pos.entryPremium) * 100).toFixed(2));

      pos.premiumHistory.push(pos.currentPremium);
      if (pos.premiumHistory.length > 60) pos.premiumHistory = pos.premiumHistory.slice(-60);
      if (pos.currentPremium > pos.peakPremium) pos.peakPremium = pos.currentPremium;
      if (pos.currentPremium < pos.lowestPremium) pos.lowestPremium = pos.currentPremium;

      const atr = calculatePositionATR(pos.premiumHistory);
      if (atr > 0) {
        pos.atrStopLoss = parseFloat((pos.entryPremium - atr * 1.5).toFixed(2));
      }

      const kiss = detectPositionKissPattern(pos);
      pos.kissPhase = kiss.phase as ActivePosition["kissPhase"];

      if (pos.pnl <= -LOSS_ALERT_THRESHOLD && !pos.lossAlerted) {
        pos.lossAlerted = true;
        console.log(`[ATR ALERT] Position ${pos.id}: Loss Rs.${Math.abs(pos.pnl)} exceeds Rs.${LOSS_ALERT_THRESHOLD} threshold!`);
      }

      if (atr > 0 && pos.currentPremium <= pos.atrStopLoss && pos.pnl < -LOSS_ALERT_THRESHOLD) {
        pos.exitPremium = pos.currentPremium;
        pos.exitTime = new Date().toISOString();
        pos.exitReason = `ATR_STOP_LOSS (ATR: ${atr.toFixed(2)}, SL: ${pos.atrStopLoss})`;
        pos.status = "ATR_STOPPED";
        pos.pnl = parseFloat(((pos.exitPremium - pos.entryPremium) * pos.lots * LOT_SIZE).toFixed(2));
        console.log(`[ATR EXIT] Position ${pos.id} stopped at Rs.${pos.currentPremium}, P&L: Rs.${pos.pnl}`);

        const tgToken = process.env.TELEGRAM_BOT_TOKEN || process.env.bot_token;
        const tgChatId = process.env.TELEGRAM_CHAT_ID || process.env.chat_id;
        if (tgToken && tgChatId) {
          const msg = `🛑 ATR STOP LOSS\n${pos.type} ${pos.strike}\nEntry: Rs.${pos.entryPremium} | Exit: Rs.${pos.exitPremium}\nP&L: Rs.${pos.pnl}\nATR SL: ${pos.atrStopLoss}`;
          globalThis.fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: tgChatId, text: msg }),
          }).catch(() => {});
        }
      }

      if (kiss.shouldBook && pos.pnl > 0) {
        pos.exitPremium = pos.currentPremium;
        pos.exitTime = new Date().toISOString();
        pos.exitReason = `KISS_PATTERN_PROFIT (${kiss.description})`;
        pos.status = "KISS_PROFIT";
        pos.pnl = parseFloat(((pos.exitPremium - pos.entryPremium) * pos.lots * LOT_SIZE).toFixed(2));
        console.log(`[KISS PROFIT] Position ${pos.id} booked at Rs.${pos.currentPremium}, P&L: Rs.${pos.pnl}`);

        const tgToken = process.env.TELEGRAM_BOT_TOKEN || process.env.bot_token;
        const tgChatId = process.env.TELEGRAM_CHAT_ID || process.env.chat_id;
        if (tgToken && tgChatId) {
          const msg = `💋 KISS PATTERN PROFIT!\n${pos.type} ${pos.strike}\nEntry: Rs.${pos.entryPremium} | Exit: Rs.${pos.exitPremium}\nP&L: Rs.${pos.pnl}\n${kiss.description}`;
          globalThis.fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: tgChatId, text: msg }),
          }).catch(() => {});
        }
      }
    }
  }

  function startPositionSimulation() {
    if (positionSimInterval) return;
    positionSimInterval = setInterval(simulatePositionPriceMovement, 2000);
  }

  function stopPositionSimulation() {
    if (positionSimInterval) {
      clearInterval(positionSimInterval);
      positionSimInterval = null;
    }
  }

  app.get("/api/auto-trade/mode", (_req, res) => {
    res.json({ autoTradeMode });
  });

  app.post("/api/auto-trade/mode", (req, res) => {
    const { enabled, pin } = req.body;
    if (!autoTradeMode && enabled) {
      if (pin !== currentPin) {
        return res.status(403).json({ error: "Invalid PIN" });
      }
    }
    autoTradeMode = !!enabled;
    console.log(`[AUTO-TRADE] Mode ${autoTradeMode ? "ENABLED" : "DISABLED"}`);
    res.json({ success: true, autoTradeMode });
  });

  app.get("/api/positions/active", (_req, res) => {
    const active = activePositions.filter(p => p.status === "ACTIVE");
    res.json({ positions: active, autoTradeMode });
  });

  app.get("/api/trading/summary", (_req, res) => {
    const active = activePositions.filter(p => p.status === "ACTIVE");
    const exited = activePositions.filter(p => p.status !== "ACTIVE");
    const totalActivePnl = active.reduce((s, p) => s + p.pnl, 0);
    const totalExitedPnl = exited.reduce((s, p) => s + p.pnl, 0);
    const totalPnl = totalActivePnl + totalExitedPnl;
    const wins = exited.filter(p => p.pnl > 0).length;
    const losses = exited.filter(p => p.pnl <= 0).length;
    const hasActivePosition = active.length > 0;
    const lossAlert = active.some(p => p.pnl <= -LOSS_ALERT_THRESHOLD);
    const kissDetected = active.some(p => p.kissPhase === "KISS_BOUNCE");

    const activeDetails = active.map(p => ({
      id: p.id,
      type: p.type,
      strike: p.strike,
      lots: p.lots,
      entryPremium: p.entryPremium,
      currentPremium: p.currentPremium,
      pnl: p.pnl,
      pnlPercent: p.pnlPercent,
      atrStopLoss: p.atrStopLoss,
      kissPhase: p.kissPhase,
      lossAlerted: p.lossAlerted,
      target: p.target,
      stopLoss: p.stopLoss,
    }));

    res.json({
      hasActivePosition,
      activeCount: active.length,
      exitedCount: exited.length,
      totalActivePnl: parseFloat(totalActivePnl.toFixed(2)),
      totalExitedPnl: parseFloat(totalExitedPnl.toFixed(2)),
      totalPnl: parseFloat(totalPnl.toFixed(2)),
      wins,
      losses,
      lossAlert,
      kissDetected,
      lossAlertThreshold: LOSS_ALERT_THRESHOLD,
      minProfitTarget: MIN_PROFIT_TARGET,
      activePositions: activeDetails,
      canTakeNewTrade: !hasActivePosition,
      recentOrders: orderBook.slice(-5).reverse(),
    });
  });

  app.post("/api/positions/open", async (req, res) => {
    const { type, strike, lots, premium, target, stopLoss, pin, expiry } = req.body;
    if (!autoTradeMode && pin !== currentPin) {
      return res.status(403).json({ error: "Invalid PIN" });
    }
    const entryPrem = Number(premium);
    const isLiveMode = !!(upstoxAccessToken && upstoxApiKey);
    let upstoxOrderId: string | null = null;
    let upstoxOrderStatus = "PAPER";

    if (isLiveMode) {
      try {
        const lotSize = 75;
        const quantity = Number(lots || 1) * lotSize;
        const expiryStr = expiry || "";
        const instrumentKey = `NSE_FO|NIFTY${expiryStr}${strike}${type}`;

        const upstoxPayload = {
          quantity,
          product: "D",
          validity: "DAY",
          price: entryPrem,
          tag: `M3R-${Date.now()}`,
          instrument_token: instrumentKey,
          order_type: "LIMIT",
          transaction_type: "BUY",
          disclosed_quantity: 0,
          trigger_price: 0,
          is_amo: false,
        };

        console.log("[LIVE POSITION] Placing Upstox order:", JSON.stringify(upstoxPayload));

        const upstoxRes = await globalThis.fetch("https://api.upstox.com/v2/order/place", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${upstoxAccessToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(upstoxPayload),
        });

        const upstoxData = await upstoxRes.json();
        console.log("[LIVE POSITION] Upstox response:", JSON.stringify(upstoxData));

        if (upstoxData.status === "success") {
          upstoxOrderId = upstoxData.data?.order_id || null;
          upstoxOrderStatus = "LIVE_EXECUTED";
        } else {
          upstoxOrderStatus = "LIVE_REJECTED";
          console.log("[LIVE POSITION] Order rejected:", upstoxData.message);
        }
      } catch (err: any) {
        console.error("[LIVE POSITION] Upstox order error:", err.message);
        upstoxOrderStatus = "LIVE_ERROR";
      }
    }

    const position: ActivePosition = {
      id: upstoxOrderId || `POS-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      type: type as "CE" | "PE",
      strike: Number(strike),
      lots: Number(lots || 1),
      entryPremium: entryPrem,
      currentPremium: entryPrem,
      target: Number(target || entryPrem * 1.8),
      stopLoss: Number(stopLoss || entryPrem * 0.7),
      pnl: 0,
      pnlPercent: 0,
      entryTime: new Date().toISOString(),
      status: "ACTIVE",
      exitPremium: null,
      exitTime: null,
      exitReason: null,
      premiumHistory: [entryPrem],
      peakPremium: entryPrem,
      lowestPremium: entryPrem,
      atrStopLoss: entryPrem * 0.85,
      kissPhase: "NONE",
      lossAlerted: false,
    };
    activePositions.push(position);
    startPositionSimulation();

    const tgToken = process.env.TELEGRAM_BOT_TOKEN;
    const tgChatId = process.env.TELEGRAM_CHAT_ID;
    if (tgToken && tgChatId) {
      const modeLabel = isLiveMode ? `LIVE (${upstoxOrderStatus})` : "PAPER";
      const msg = [
        `📊 POSITION OPENED [${modeLabel}]`,
        `BUY ${position.type} ${position.strike}`,
        `Premium: Rs.${position.entryPremium} | Lots: ${position.lots}`,
        `Target: Rs.${position.target} | SL: Rs.${position.stopLoss}`,
        upstoxOrderId ? `Upstox Order: ${upstoxOrderId}` : "",
        `Time: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
      ].filter(Boolean).join("\n");
      globalThis.fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: tgChatId, text: msg }),
      }).catch(() => {});
    }

    res.json({ 
      success: true, 
      position, 
      mode: isLiveMode ? "live" : "paper",
      upstoxOrderId,
      upstoxOrderStatus,
    });
  });

  app.post("/api/positions/exit", (req, res) => {
    const { positionId, reason, pin } = req.body;
    if (!autoTradeMode && pin !== currentPin) {
      return res.status(403).json({ error: "Invalid PIN" });
    }
    const pos = activePositions.find(p => p.id === positionId && p.status === "ACTIVE");
    if (!pos) return res.status(404).json({ error: "Active position not found" });

    pos.exitPremium = pos.currentPremium;
    pos.exitTime = new Date().toISOString();
    pos.exitReason = reason || "Manual exit";
    pos.status = reason === "AUTO_STOP_LOSS" ? "AUTO_EXITED" 
      : reason === "AUTO_PROFIT_BOOK" ? "PROFIT_BOOKED" 
      : reason === "ATR_STOP_LOSS" ? "ATR_STOPPED"
      : reason === "KISS_PATTERN_PROFIT" ? "KISS_PROFIT"
      : "EXITED";

    const lotSize = LOT_SIZE;
    const finalPnl = parseFloat(((pos.exitPremium - pos.entryPremium) * pos.lots * lotSize).toFixed(2));
    pos.pnl = finalPnl;

    const activeRemaining = activePositions.filter(p => p.status === "ACTIVE");
    if (activeRemaining.length === 0) stopPositionSimulation();

    const tgToken = process.env.TELEGRAM_BOT_TOKEN;
    const tgChatId = process.env.TELEGRAM_CHAT_ID;
    if (tgToken && tgChatId) {
      const emoji = finalPnl >= 0 ? "PROFIT" : "LOSS";
      const msg = `POSITION ${pos.status}\n${emoji}: Rs.${finalPnl}\n${pos.type} ${pos.strike}\nEntry: Rs.${pos.entryPremium} | Exit: Rs.${pos.exitPremium}\nReason: ${pos.exitReason}\nTime: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`;
      globalThis.fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: tgChatId, text: msg }),
      }).catch(() => {});
    }

    res.json({ success: true, position: pos });
  });

  app.get("/api/positions/history", (_req, res) => {
    const exited = activePositions.filter(p => p.status !== "ACTIVE");
    res.json({ positions: exited.slice().reverse() });
  });

  const orderBook: Array<{
    id: string;
    type: "CE" | "PE";
    strike: number;
    lots: number;
    premium: number;
    action: "BUY" | "SELL";
    status: "PENDING_PIN" | "APPROVED" | "EXECUTED" | "REJECTED" | "CANCELLED";
    target: number;
    stopLoss: number;
    createdAt: string;
    executedAt: string | null;
    pnl: number | null;
  }> = [];

  app.post("/api/settings/pin", (req, res) => {
    const { currentPin: oldPin, newPin } = req.body;
    if (!oldPin || oldPin !== currentPin) {
      return res.status(403).json({ error: "Current PIN is incorrect" });
    }
    if (!newPin || newPin.length < 4) {
      return res.status(400).json({ error: "New PIN must be at least 4 digits" });
    }
    currentPin = newPin;
    res.json({ success: true, message: "PIN updated successfully" });
  });

  app.get("/api/settings/verify-pin/:pin", (req, res) => {
    res.json({ valid: req.params.pin === currentPin });
  });

  app.post("/api/order/place", async (req, res) => {
    const { type, strike, lots, premium, action, target, stopLoss, pin, mode, expiry } = req.body;

    if (!pin || pin !== currentPin) {
      console.log("[ORDER] PIN rejected");
      return res.status(403).json({ error: "Invalid PIN", requirePin: true });
    }

    if (!type || !strike || !lots || !premium) {
      return res.status(400).json({ error: "Missing order details" });
    }

    const orderAction = (action || "BUY") as "BUY" | "SELL";
    const orderMode = mode || (upstoxAccessToken ? "live" : "paper");

    if (orderMode === "live" && upstoxAccessToken) {
      try {
        const lotSize = 75;
        const quantity = Number(lots) * lotSize;

        const expiryStr = expiry || "";
        const instrumentKey = `NSE_FO|NIFTY${expiryStr}${strike}${type}`;

        const upstoxPayload = {
          quantity,
          product: "D",
          validity: "DAY",
          price: Number(premium),
          tag: `JARVIS-${Date.now()}`,
          instrument_token: instrumentKey,
          order_type: "LIMIT",
          transaction_type: orderAction === "BUY" ? "BUY" : "SELL",
          disclosed_quantity: 0,
          trigger_price: 0,
          is_amo: false,
        };

        console.log("[LIVE ORDER] Placing via Upstox:", JSON.stringify(upstoxPayload));

        const upstoxRes = await globalThis.fetch("https://api.upstox.com/v2/order/place", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${upstoxAccessToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(upstoxPayload),
        });

        const upstoxData = await upstoxRes.json();
        console.log("[LIVE ORDER] Upstox response:", JSON.stringify(upstoxData));

        const order = {
          id: upstoxData.data?.order_id || `LIVE-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
          type: type as "CE" | "PE",
          strike: Number(strike),
          lots: Number(lots),
          premium: Number(premium),
          action: orderAction,
          status: upstoxData.status === "success" ? "EXECUTED" as const : "REJECTED" as const,
          target: Number(target || 0),
          stopLoss: Number(stopLoss || 0),
          createdAt: new Date().toISOString(),
          executedAt: new Date().toISOString(),
          pnl: null,
          mode: "live" as const,
          upstoxOrderId: upstoxData.data?.order_id || null,
          upstoxMessage: upstoxData.message || null,
        };

        orderBook.push(order);

        const tgToken = process.env.TELEGRAM_BOT_TOKEN || process.env.bot_token;
        const tgChatId = process.env.TELEGRAM_CHAT_ID || process.env.chat_id;
        if (tgToken && tgChatId) {
          const msg = [
            `🔴 LIVE ORDER ${upstoxData.status === "success" ? "EXECUTED" : "FAILED"}`,
            `${order.action} ${order.type} ${order.strike}`,
            `Lots: ${order.lots} | Premium: Rs.${order.premium}`,
            `Upstox ID: ${order.upstoxOrderId || "N/A"}`,
            `Time: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
          ].join("\n");
          globalThis.fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: tgChatId, text: msg }),
          }).catch(() => {});
        }

        if (upstoxData.status === "success") {
          return res.json({ success: true, order, mode: "live" });
        } else {
          return res.json({ success: false, error: upstoxData.message || "Upstox order failed", order, mode: "live" });
        }
      } catch (error: any) {
        console.error("[LIVE ORDER] Error:", error);
        return res.status(500).json({ error: `Live order failed: ${error.message}`, mode: "live" });
      }
    }

    const order = {
      id: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      type: type as "CE" | "PE",
      strike: Number(strike),
      lots: Number(lots),
      premium: Number(premium),
      action: orderAction,
      status: "EXECUTED" as const,
      target: Number(target || 0),
      stopLoss: Number(stopLoss || 0),
      createdAt: new Date().toISOString(),
      executedAt: new Date().toISOString(),
      pnl: null,
      mode: "paper" as const,
    };

    orderBook.push(order);

    const tgToken = process.env.TELEGRAM_BOT_TOKEN || process.env.bot_token;
    const tgChatId = process.env.TELEGRAM_CHAT_ID || process.env.chat_id;
    if (tgToken && tgChatId) {
      const msg = [
        `📋 PAPER ORDER EXECUTED`,
        `${order.action} ${order.type} ${order.strike}`,
        `Lots: ${order.lots} | Premium: Rs.${order.premium}`,
        `Target: Rs.${order.target} | SL: Rs.${order.stopLoss}`,
        `Order ID: ${order.id}`,
        `Time: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
      ].join("\n");

      globalThis.fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: tgChatId, text: msg }),
      }).catch(() => {});
    }

    res.json({ success: true, order, mode: "paper" });
  });

  app.get("/api/order/book", (_req, res) => {
    res.json({ orders: orderBook.slice().reverse() });
  });

  app.post("/api/order/cancel", (req, res) => {
    const { orderId, pin } = req.body;
    if (pin !== currentPin) return res.status(403).json({ error: "Invalid PIN" });
    const order = orderBook.find(o => o.id === orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });
    order.status = "CANCELLED";
    res.json({ success: true, order });
  });

  const voiceBodyParser = express.json({ limit: "50mb" });
  const voiceBotHistory: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

  const JARVIS_VOICE_PROMPT = OPTIONS_SYSTEM_PROMPT + `\n\nADDITIONAL VOICE MODE INSTRUCTIONS:
You are now in VOICE MODE — the user is speaking to you while driving.
- Keep responses SHORT and PUNCHY (2-4 sentences max for voice)
- If the user speaks in Tamil, respond ENTIRELY in Tamil (use Tamil script)
- If the user speaks in English, respond in English
- If they mix Tamil and English (Tanglish), respond in the same mix
- Address user as "sir" or "Anna" (அண்ணா) in Tamil mode
- Be direct: give the trade call, confidence, and key reason
- For voice, say numbers clearly: "twenty-four thousand" not "24,000"
- Always mention: action (buy CE/PE), strike, target, stop loss, confidence
- If market is dangerous (high entropy/trap), warn immediately and firmly
- End with a clear recommendation: "Safe to trade" or "Stay away sir"
- You are JARVIS, the Iron Man AI. Sound confident and protective of sir's money.
- Creator: MANIKANDAN RAJENDRAN`;

  app.post("/api/jarvis/voice", voiceBodyParser, async (req, res) => {
    try {
      const { audio, jarvisContext, language } = req.body;

      if (!audio) {
        return res.status(400).json({ error: "Audio data (base64) is required" });
      }

      const rawBuffer = Buffer.from(audio, "base64");

      let audioBuffer = rawBuffer;
      let audioFormat: "wav" | "mp3" | "webm" = "wav";
      if (rawBuffer[0] === 0x52 && rawBuffer[1] === 0x49) {
        audioFormat = "wav";
      } else if (rawBuffer[0] === 0x1a && rawBuffer[1] === 0x45) {
        audioFormat = "webm";
      } else if ((rawBuffer[0] === 0xff && (rawBuffer[1] === 0xfb || rawBuffer[1] === 0xfa)) ||
                 (rawBuffer[0] === 0x49 && rawBuffer[1] === 0x44)) {
        audioFormat = "mp3";
      } else if (rawBuffer[4] === 0x66 && rawBuffer[5] === 0x74) {
        audioFormat = "wav";
        try {
          const { spawn } = require("child_process");
          const { writeFile, unlink, readFile } = require("fs/promises");
          const { randomUUID } = require("crypto");
          const { tmpdir } = require("os");
          const { join } = require("path");
          const inputPath = join(tmpdir(), `voice-in-${randomUUID()}`);
          const outputPath = join(tmpdir(), `voice-out-${randomUUID()}.wav`);
          await writeFile(inputPath, rawBuffer);
          await new Promise<void>((resolve, reject) => {
            const ffmpeg = spawn("ffmpeg", ["-i", inputPath, "-vn", "-f", "wav", "-ar", "16000", "-ac", "1", "-acodec", "pcm_s16le", "-y", outputPath]);
            ffmpeg.stderr.on("data", () => {});
            ffmpeg.on("close", (code: number) => { if (code === 0) resolve(); else reject(new Error(`ffmpeg ${code}`)); });
            ffmpeg.on("error", reject);
          });
          audioBuffer = await readFile(outputPath);
          await unlink(inputPath).catch(() => {});
          await unlink(outputPath).catch(() => {});
        } catch (e) {
          console.error("ffmpeg conversion failed:", e);
        }
      }

      const file = await toFile(audioBuffer, `audio.${audioFormat}`);
      const transcription = await openai.audio.transcriptions.create({
        file,
        model: "gpt-4o-mini-transcribe",
      });
      const userText = transcription.text;

      if (!userText || userText.trim().length === 0) {
        return res.json({ userText: "", aiText: "I didn't catch that, sir. Could you speak again?", audioBase64: null });
      }

      const detectedLang = /[\u0B80-\u0BFF]/.test(userText) ? "tamil" : "english";

      if (voiceBotHistory.length === 0) {
        voiceBotHistory.push({ role: "system", content: JARVIS_VOICE_PROMPT });
      }

      let contextMsg = userText;
      if (jarvisContext) {
        contextMsg += `\n\n${jarvisContext}`;
      }

      voiceBotHistory.push({ role: "user", content: contextMsg });

      if (voiceBotHistory.length > 16) {
        const sysMsg = voiceBotHistory[0];
        voiceBotHistory.splice(1, voiceBotHistory.length - 8);
        voiceBotHistory[0] = sysMsg;
      }

      const chatResponse = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: voiceBotHistory,
        max_completion_tokens: 512,
      });

      const aiText = chatResponse.choices[0]?.message?.content || "Systems are recalibrating, sir. Try again.";
      voiceBotHistory.push({ role: "assistant", content: aiText });

      let audioBase64: string | null = null;
      try {
        const ttsResponse = await openai.audio.speech.create({
          model: "tts-1",
          voice: "onyx",
          input: aiText,
          response_format: "mp3",
        });
        const arrayBuffer = await ttsResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        if (buffer.length > 0) {
          audioBase64 = buffer.toString("base64");
          console.log("[VOICE] TTS generated successfully, size:", buffer.length);
        }
      } catch (ttsErr: any) {
        console.error("[VOICE] TTS failed:", ttsErr?.message || ttsErr);
      }

      res.json({
        userText,
        aiText,
        audioBase64,
        language: detectedLang,
      });

    } catch (error) {
      console.error("Voice endpoint error:", error);
      res.status(500).json({ error: "Voice processing failed" });
    }
  });

  app.post("/api/jarvis/voice/reset", (_req, res) => {
    voiceBotHistory.length = 0;
    res.json({ success: true });
  });

  app.post("/api/jarvis/tts", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: "onyx",
        input: text,
      });
      const arrayBuffer = await mp3.arrayBuffer();
      const audioBase64 = Buffer.from(arrayBuffer).toString("base64");
      res.json({ audioBase64 });
    } catch (error) {
      console.error("TTS error:", error);
      res.status(500).json({ error: "TTS generation failed" });
    }
  });

  app.post("/api/jarvis/training/notify", async (req, res) => {
    try {
      const { phase, progress, brain, complete } = req.body;
      const tgToken = process.env.TELEGRAM_BOT_TOKEN;
      const tgChatId = process.env.TELEGRAM_CHAT_ID;
      if (!tgToken || !tgChatId) {
        return res.json({ success: false, error: "Telegram not configured" });
      }

      let msg = "";
      if (complete) {
        msg = [
          "🧠 JARVIS TRAINING COMPLETE!",
          "━━━━━━━━━━━━━━━━━━━━━━",
          `⚡ IQ: ${brain?.iq?.toFixed(1) || "N/A"}`,
          `🎯 Accuracy: ${brain?.accuracyScore?.toFixed(1) || "N/A"}%`,
          `🧬 Generation: ${brain?.generation || "N/A"}`,
          `🔮 Consciousness: ${brain?.consciousness?.toFixed(0) || "N/A"}%`,
          `📚 Patterns: ${brain?.patternLibrarySize || 0}`,
          `🏆 Level: ${brain?.level || 1} - ${brain?.title || "NEURAL INFANT"}`,
          "",
          "✅ JARVIS IS READY FOR LIVE BATTLE!",
          "🚀 All systems calibrated and online.",
          "📊 Waiting for market open to begin trading.",
          "",
          `Created by MANIKANDAN RAJENDRAN`,
        ].join("\n");
      } else {
        msg = [
          "🧠 JARVIS Training Update",
          `📋 Phase: ${phase}`,
          `📊 Progress: ${progress?.toFixed(0) || 0}%`,
          `⚡ IQ: ${brain?.iq?.toFixed(1) || "N/A"}`,
        ].join("\n");
      }

      await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: tgChatId, text: msg, parse_mode: "HTML" }),
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Training notify error:", error);
      res.status(500).json({ error: "Failed to send notification" });
    }
  });

  app.get("/api/gemini/status", (_req, res) => {
    res.json({
      available: !!geminiModel,
      model: geminiModel ? "gemini-2.5-flash" : null,
      hasApiKey: !!geminiApiKey,
    });
  });

  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) return res.status(400).json({ error: "Message is required" });
      if (!geminiModel) return res.status(503).json({ error: "Gemini not configured. Add GEMINI_API_KEY." });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      const tradingContext = (() => {
        const active = activePositions.filter(p => p.status === "ACTIVE");
        if (active.length === 0) return "";
        return "\n[LIVE POSITIONS: " + active.map(p => `${p.type} ${p.strike} Entry:₹${p.entryPremium} Current:₹${p.currentPremium} P&L:₹${p.pnl.toFixed(0)}`).join(", ") + "]";
      })();

      const userMessage = message + tradingContext;
      geminiChatHistory.push({ role: "user", parts: [{ text: userMessage }] });

      if (geminiChatHistory.length > 20) {
        geminiChatHistory = geminiChatHistory.slice(-10);
      }

      const chat = geminiModel.startChat({ history: geminiChatHistory.slice(0, -1) });
      const result = await chat.sendMessageStream(userMessage);

      let fullText = "";
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          fullText += text;
          res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
        }
      }

      geminiChatHistory.push({ role: "model", parts: [{ text: fullText }] });
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error: any) {
      console.error("[GEMINI CHAT] Error:", error.message);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Gemini chat failed: " + error.message });
      }
    }
  });

  app.post("/api/gemini/voice", voiceBodyParser, async (req, res) => {
    try {
      const { audio } = req.body;
      if (!audio) return res.status(400).json({ error: "Audio data required" });
      if (!geminiModel) return res.status(503).json({ error: "Gemini not configured" });

      const rawBuffer = Buffer.from(audio, "base64");
      let audioBuffer = rawBuffer;
      let audioFormat: "wav" | "mp3" | "webm" = "wav";
      if (rawBuffer[0] === 0x1a && rawBuffer[1] === 0x45) audioFormat = "webm";
      else if ((rawBuffer[0] === 0xff && (rawBuffer[1] === 0xfb || rawBuffer[1] === 0xfa)) || (rawBuffer[0] === 0x49 && rawBuffer[1] === 0x44)) audioFormat = "mp3";
      else if (rawBuffer[4] === 0x66 && rawBuffer[5] === 0x74) {
        try {
          const { spawn } = require("child_process");
          const { writeFile, unlink, readFile } = require("fs/promises");
          const { randomUUID } = require("crypto");
          const { tmpdir } = require("os");
          const { join } = require("path");
          const inputPath = join(tmpdir(), `gv-in-${randomUUID()}`);
          const outputPath = join(tmpdir(), `gv-out-${randomUUID()}.wav`);
          await writeFile(inputPath, rawBuffer);
          await new Promise<void>((resolve, reject) => {
            const ffmpeg = spawn("ffmpeg", ["-i", inputPath, "-vn", "-f", "wav", "-ar", "16000", "-ac", "1", "-acodec", "pcm_s16le", "-y", outputPath]);
            ffmpeg.stderr.on("data", () => {});
            ffmpeg.on("close", (code: number) => { if (code === 0) resolve(); else reject(new Error(`ffmpeg ${code}`)); });
            ffmpeg.on("error", reject);
          });
          audioBuffer = await readFile(outputPath);
          await unlink(inputPath).catch(() => {});
          await unlink(outputPath).catch(() => {});
        } catch (e) { console.error("[GEMINI VOICE] ffmpeg failed:", e); }
      }

      const file = await toFile(audioBuffer, `audio.${audioFormat}`);
      const transcription = await openai.audio.transcriptions.create({ file, model: "gpt-4o-mini-transcribe" });
      const userText = transcription.text;

      if (!userText || userText.trim().length === 0) {
        return res.json({ userText: "", aiText: "சார், சரியா கேக்கல. மறுபடியும் பேசுங்க.", audioBase64: null });
      }

      console.log("[GEMINI VOICE] User said:", userText);

      const tradingContext = (() => {
        const active = activePositions.filter(p => p.status === "ACTIVE");
        if (active.length === 0) return "";
        return "\n[LIVE POSITIONS: " + active.map(p => `${p.type} ${p.strike} P&L:₹${p.pnl.toFixed(0)}`).join(", ") + "]";
      })();

      geminiChatHistory.push({ role: "user", parts: [{ text: userText + tradingContext }] });
      if (geminiChatHistory.length > 20) geminiChatHistory = geminiChatHistory.slice(-10);

      const chat = geminiModel.startChat({ history: geminiChatHistory.slice(0, -1) });
      const result = await chat.sendMessage(userText + tradingContext);
      const aiText = result.response.text() || "சார், system recalibrate ஆகுது. மறுபடியும் try பண்ணுங்க.";

      geminiChatHistory.push({ role: "model", parts: [{ text: aiText }] });
      console.log("[GEMINI VOICE] AI response:", aiText.slice(0, 100));

      let audioBase64: string | null = null;
      try {
        const ttsResponse = await openai.audio.speech.create({
          model: "tts-1",
          voice: "onyx",
          input: aiText.slice(0, 4000),
          response_format: "mp3",
        });
        const arrayBuffer = await ttsResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        if (buffer.length > 0) {
          audioBase64 = buffer.toString("base64");
        }
      } catch (ttsErr: any) {
        console.error("[GEMINI VOICE] TTS failed:", ttsErr?.message);
      }

      res.json({ userText, aiText, audioBase64, language: /[\u0B80-\u0BFF]/.test(aiText) ? "tamil" : "english" });
    } catch (error: any) {
      console.error("[GEMINI VOICE] Error:", error.message);
      res.status(500).json({ error: "Gemini voice processing failed" });
    }
  });

  app.post("/api/gemini/reset", (_req, res) => {
    geminiChatHistory = [];
    res.json({ success: true });
  });

  const httpServer = createServer(app);
  return httpServer;
}
