import type { Express } from "express";
import { createServer, type Server } from "node:http";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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

  const httpServer = createServer(app);
  return httpServer;
}
