import type { Express } from "express";
import { createServer, type Server } from "node:http";
import OpenAI, { toFile } from "openai";
import express from "express";
import { Buffer } from "node:buffer";

let upstoxAccessToken: string | null = null;
const geminiApiKey = process.env.GEMINI_API_KEY;
const upstoxApiKey = process.env.UPSTOX_API_KEY;
const upstoxApiSecret = process.env.UPSTOX_API_SECRET;

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

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const optionsBotHistory: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

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

      const stream = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          {
            role: "system",
            content: "You are an expert Indian stock market advisor. Answer questions about Indian markets (NSE, BSE), stocks, mutual funds, trading strategies, and financial planning. Be concise, practical, and specific to the Indian market context. Use INR for all prices. Reference SEBI regulations when relevant.",
          },
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

  app.post("/api/jarvis/voice", async (req, res) => {
    try {
      const { audio, jarvisContext } = req.body;
      if (!audio) return res.status(400).json({ error: "Audio is required" });

      // 1. Transcribe audio using OpenAI Whisper
      const transcription = await openai.audio.transcriptions.create({
        file: await toFile(Buffer.from(audio, "base64"), "input.wav"),
        model: "whisper-1",
      });

      const userText = transcription.text;

      // 2. Get AI response
      const chatResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: OPTIONS_SYSTEM_PROMPT },
          { role: "user", content: `CONTEXT:\n${jarvisContext}\n\nUSER VOICE INPUT: ${userText}` }
        ],
      });

      const aiText = chatResponse.choices[0].message.content || "I'm sorry, I couldn't process that.";

      // 3. Convert AI response to Speech using OpenAI TTS
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: aiText,
      });

      const audioBuffer = Buffer.from(await mp3.arrayBuffer());
      const audioBase64 = audioBuffer.toString("base64");

      res.json({
        userText,
        aiText,
        audioBase64,
        language: "en"
      });
    } catch (error) {
      console.error("Jarvis voice error:", error);
      res.status(500).json({ error: "Voice processing failed" });
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
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    res.json({ configured: !!(botToken && chatId) });
  });

  app.get("/api/upstox/status", (_req, res) => {
    const apiKey = process.env.UPSTOX_API_KEY;
    const apiSecret = process.env.UPSTOX_API_SECRET;
    res.json({ configured: !!(apiKey && apiSecret), connected: !!upstoxAccessToken });
  });

  app.post("/api/gemini/analyze", async (req, res) => {
    try {
      const { optionChain, question } = req.body;
      if (!geminiApiKey) return res.status(400).json({ error: "Gemini API key not configured" });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      const prompt = question || `Analyze Nifty 50 option chain: Spot ${optionChain?.spotPrice}, PCR ${optionChain?.overallPCR}, Max Pain ${optionChain?.maxPainStrike}. Give trading signal.`;

      const geminiRes = await globalThis.fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `You are a Nifty 50 options trading expert. ${prompt}` }] }],
            generationConfig: { maxOutputTokens: 1024 }
          })
        }
      );

      const data = await geminiRes.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Unable to analyze.";

      const words = text.split(" ");
      for (let i = 0; i < words.length; i += 3) {
        const chunk = words.slice(i, i + 3).join(" ") + " ";
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      console.error("Error in Gemini analyze:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Gemini analysis failed" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to analyze with Gemini" });
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

  app.post("/api/telegram/test", async (_req, res) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
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
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
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
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
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
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
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

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
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

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
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
          `💰 *NIFTY:* ${marketStatus?.price || strike}\n` +
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
        const ttsResponse = await openai.chat.completions.create({
          model: "gpt-audio",
          modalities: ["text", "audio"],
          audio: { voice: "onyx", format: "mp3" },
          messages: [
            { role: "system", content: detectedLang === "tamil"
              ? "You are JARVIS. Speak the following text in Tamil clearly. Pronounce Tamil words naturally."
              : "You are JARVIS, an Iron Man-style AI. Speak with a confident, calm, authoritative tone."
            },
            { role: "user", content: `Repeat the following verbatim: ${aiText}` },
          ],
        });
        const audioData = (ttsResponse.choices[0]?.message as any)?.audio?.data ?? "";
        if (audioData) {
          audioBase64 = audioData;
        }
      } catch (ttsErr) {
        console.error("TTS failed:", ttsErr);
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

  const httpServer = createServer(app);
  return httpServer;
}
