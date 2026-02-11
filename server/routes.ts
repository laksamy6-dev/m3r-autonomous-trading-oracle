import type { Express } from "express";
import { createServer, type Server } from "node:http";
import OpenAI from "openai";

let upstoxAccessToken: string | null = null;
const geminiApiKey = process.env.GEMINI_API_KEY;
const upstoxApiKey = process.env.UPSTOX_API_KEY;
const upstoxApiSecret = process.env.UPSTOX_API_SECRET;

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

  const httpServer = createServer(app);
  return httpServer;
}
