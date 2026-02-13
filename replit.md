# M3R Innovative Fintech Solutions

## Overview

M3R Fintech is an Indian stock market analysis app built with Expo (React Native) on the frontend and Express.js on the backend. It focuses on Nifty 50 options trading, AI-powered stock analysis, portfolio management, and volatility-based trading strategies. The app supports dual-mode operation: LIVE trading via Upstox broker API (real market data + real order execution) and PAPER/SIM mode with simulated mock data. AI integrations (OpenAI) power chat-based analysis and options trading recommendations.

## Legal & Copyright

- **Company**: M3R INNOVATIVE FINTECH SOLUTIONS
- **Founder & Sole Proprietor**: MANIKANDAN RAJENDRAN
- **Legal Email**: laksamy6@gmail.com
- **Copyright**: © 2025 M3R Innovative Fintech Solutions. All Rights Reserved.
- **Legal Protection**: Indian Copyright Act 1957, IT Act 2000, IPC, WIPO/Berne Convention
- **Exclusive Rights**: ONLY MANIKANDAN RAJENDRAN has rights to modify, update, distribute, or license this software
- **Security Headers**: All API responses include X-Copyright, X-Creator, X-Legal-Contact, X-Frame-Options (DENY), CSP, XSS Protection

## User Preferences

Preferred communication style: Simple, everyday language. Tamil speaker. Prefers M3R branding throughout (no Gemini references). Wants institutional-level AI trading intelligence that can think independently and find profit opportunities beyond standard rules.

## M3R AI Brain Engine

- **Engine**: M3R INFINITY Brain v3.0 with 260+ knowledge domains (growing infinitely, NO CEILING)
- **Learning**: Continuous 24/7 self-improvement every 5 seconds
- **IQ System**: Dynamic IQ calculation based on domain coverage, learning cycles, interactions
- **Power Levels**: EVOLVING → ADVANCED → SUPER → HYPER → ULTRA → OMEGA → CELESTIAL → TRANSCENDENT → INFINITY
- **Internet Intelligence**: Google Search grounding via @google/genai SDK — real-time web access for live market data, news, people search
- **11 Knowledge Categories**: MARKET_CORE, GLOBAL_MARKETS, PRICE_DRIVERS, FLOW_ANALYSIS, MACRO_ECONOMY, OPTIONS_MASTERY, AI_PREDICTION, WORLD_EVENTS, CYBERSECURITY, SOFTWARE_DEV, POLITICS_ECONOMY
- **10 Learning Strategies**: DEEP_FOCUS, CROSS_DOMAIN_SYNTHESIS, WEAK_AREA_BOOST, CATEGORY_MASTERY, INSTITUTIONAL_PATTERN, RULE_BREAKING_DISCOVERY, SYNAPSE_CHAIN_REACTION, NEURAL_REINFORCEMENT, CONTRARIAN_ANALYSIS, MARKET_EDGE_HUNT
- **20 Brain Phases**: NEURAL_SCAN, DEEP_ABSORB, SYNAPSE_FIRE, CORTEX_SYNC, QUANTUM_LEARN, etc.
- **Cross-Domain Synthesis**: High-scoring domains boost each other through synergy
- **Persistence**: Brain state saved to both disk (.brain-data.json) and PostgreSQL database
- **API**: `/api/brain/status`, `/api/brain/train`, `/api/brain/stats`, `/api/brain/memory/*`

## System Architecture

### Frontend (Expo / React Native)

- **Framework**: Expo SDK 54 with expo-router (file-based routing)
- **Navigation**: Tab-based layout with 7 tabs: Market (index), Options, Bot, Strategy, AI, Watchlist, Portfolio. A modal route exists for individual stock details (`/stock/[symbol]`).
- **State Management**: React Query (`@tanstack/react-query`) for server state; local React state for UI. No global state library.
- **Local Storage**: `@react-native-async-storage/async-storage` for persisting watchlist and portfolio data on-device.
- **Styling**: Dark theme only (light theme colors are identical to dark). Uses `DM Sans` font family loaded via `@expo-google-fonts/dm-sans`. All styling is inline `StyleSheet.create`.
- **Platform Support**: iOS, Android, and Web. Platform-specific handling exists (e.g., haptics only on native, keyboard handling differences).
- **Stock Data**: Mock data generated client-side in `lib/stocks.ts` with hardcoded Indian stocks and random price variations. Falls back to this when Upstox is disconnected.
- **Options Data**: Live option chain from Upstox API when connected; simulated option chain generation in `lib/options.ts` as fallback. Mock OI, IV, Greeks, and PCR calculations available offline.
- **Live Market Utility**: `lib/live-market.ts` provides `fetchLiveOptionChain()`, `fetchUpstoxStatus()`, `clearUpstoxStatusCache()` for all pages to automatically detect and use live vs simulated data.
- **Trading Mode**: Automatic LIVE/PAPER detection. LIVE badge (green) shown when Upstox connected with valid token; SIM badge (amber) shown otherwise. All pages (Options, Bot, Strategy, Portfolio) display current mode.
- **Key Libraries**: expo-haptics, expo-image, expo-blur, expo-linear-gradient, react-native-reanimated, react-native-gesture-handler, react-native-keyboard-controller.
- **Authentication**: PIN-based lock screen with dual-mode access:
  - **Owner Mode**: PIN entry (default 1234) → WelcomeScreen with personal greeting for Mr. Manikandan Rajendran + auto market analysis briefing with JARVIS voice
  - **Visitor Mode**: "Enter as Visitor" button → Language selection (English/Tamil) → Grand JARVIS intro speech praising creator → Limited access
  - Auth state managed in `contexts/AuthContext.tsx` (isVisitor, isOwner, showWelcome, selectedLanguage)
  - Welcome/intro screen in `components/WelcomeScreen.tsx` with typing animation, TTS voice, arc reactor animation
- **Auto Trading**: Bot page (`app/(tabs)/bot.tsx`) includes position monitoring (3s polling), emergency exit modal (-15% P&L, 30s countdown), auto profit booking modal (+80% P&L, 30s countdown), JARVIS voice narration for all auto-actions
- **Bot Page Brain Tab**: Redesigned as JARVIS Neural Lab with:
  - NeuralCore component (3 concentric animated rings, power-level colored)
  - HexStatCard grid (6 hexagonal stat cards)
  - CategoryNeuralMap (11 categories with colored icons and progress bars)
  - NeuralPathwayFeed (timeline of live learning events)
  - Copyright footer bar

### Backend (Express.js)

- **Runtime**: Node.js with TypeScript (tsx for dev, esbuild for production build)
- **Server Location**: `server/index.ts` (entry point), `server/routes.ts` (API routes)
- **API Endpoints**:
  - `POST /api/analyze` — AI-powered stock analysis using OpenAI
  - `POST /api/options-chat` — Options trading bot chat (streaming SSE)
  - `POST /api/chat` — General AI chat (streaming SSE)
  - `POST /api/m3r/chat` — M3R AI personal assistant chat (streaming SSE)
  - `POST /api/m3r/voice` — M3R AI voice input processing
  - `GET /api/m3r/status` — M3R AI status check
  - `GET /api/brain/status` — Full brain status with categories, IQ, power level
  - `POST /api/brain/train` — Trigger manual training cycle
  - `GET /api/system/copyright` — Full legal/copyright information
  - Conversation CRUD endpoints for chat history
  - Image generation endpoints
  - Audio/voice chat endpoints
- **AI Integration**: OpenAI SDK configured via Replit AI Integrations. M3R personal AI uses Gemini API (`GEMINI_API_KEY`).
- **Security Middleware**: All responses include copyright headers, CSP, frame protection, XSS protection, referrer policy
- **CORS**: Dynamic origin allowlist based on Replit environment variables, plus localhost for development.
- **Static Serving**: In production, serves pre-built Expo web assets. In development, proxies to Expo's Metro bundler.

### Database

- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` (users table), `shared/models/chat.ts` (conversations and messages tables)
- **Tables**:
  - `users` — id (UUID), username, password
  - `conversations` — id (serial), title, created_at
  - `messages` — id (serial), conversation_id (FK), role, content, created_at
  - `brain_state` — id (1), iq, generation, knowledge_areas (JSON), language_fluency (JSON), etc.
  - `memories` — id (serial), category, content, importance, tags, created_at
- **Current Storage**: `server/storage.ts` uses in-memory storage (`MemStorage`) for users. Chat storage (`server/replit_integrations/chat/storage.ts`) uses Drizzle/Postgres.
- **Migration**: Drizzle Kit with `drizzle-kit push` command. Config in `drizzle.config.ts`.
- **Note**: The database connection requires `DATABASE_URL` environment variable. The `server/db.ts` file handles the connection.

### Replit Integrations

Located in `server/replit_integrations/`, these are pre-built modules:
- **Chat**: Conversation CRUD with Postgres persistence, streaming chat completions
- **Audio**: Voice recording, speech-to-text, text-to-speech, voice chat with AudioWorklet
- **Image**: Image generation using gpt-image-1
- **Batch**: Rate-limited batch processing with retry logic (p-limit, p-retry)

Client-side integration files are in `.replit_integration_files/client/replit_integrations/`.

### Build & Deployment

- **Dev Mode**: Two processes — `expo:dev` (Metro bundler for mobile/web) and `server:dev` (Express API with tsx)
- **Production Build**: `expo:static:build` generates static web assets, `server:build` bundles server with esbuild, `server:prod` runs the production server
- **Environment Variables**: `EXPO_PUBLIC_DOMAIN` for API URL construction, `DATABASE_URL` for Postgres, `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` for AI, `GEMINI_API_KEY` for M3R personal AI, `UPSTOX_API_KEY`, `UPSTOX_SECRET_KEY`, `UPSTOX_ACCESS_TOKEN` for live trading

## External Dependencies

- **OpenAI API** (via Replit AI Integrations): Powers all AI features — stock analysis, options trading bot, general chat, image generation, and voice/audio processing. Configured through `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL`.
- **Gemini API** (M3R Personal AI): Powers the M3R personal AI assistant on the Bot page. Uses `GEMINI_API_KEY` with gemini-2.5-flash model.
- **PostgreSQL**: Primary database for chat conversations/messages, user data, brain state, and memories. Connected via `DATABASE_URL` environment variable.
- **Upstox API** (fully integrated): Live trading via OAuth authentication. Provides real-time option chains, spot prices, positions, holdings, fund balance, and order placement. Access tokens expire daily — user must re-authenticate each trading day via Settings page. Environment variables: `UPSTOX_API_KEY`, `UPSTOX_SECRET_KEY`, `UPSTOX_ACCESS_TOKEN`. Backend endpoints: `/api/upstox/status`, `/api/upstox/option-chain`, `/api/upstox/profile`, `/api/upstox/positions`, `/api/upstox/holdings`, `/api/upstox/funds`, `/api/upstox/auth`, `/api/upstox/callback`, `/api/order/place`.
- **AsyncStorage**: On-device persistence for watchlist and portfolio (no server sync).

## Telegram Notification Engine

Located in `server/telegram-engine.ts`, the comprehensive 24/7 notification system sends all updates to Telegram:

- **Startup Notification**: Connection status, brain status, market status — sent on server boot
- **Market Session Alerts**: Pre-Market (9:00), Market Open (9:15), Market Close (15:30) — auto-detected
- **24/7 Market Analysis**: Every 15 minutes — Nifty prediction range, sentiment, VIX, PCR, key drivers, global indices
- **Brain Progress Reports**: Every 1 hour — IQ, domains, top skills, recent learning, power level
- **Token Health Checks**: Every 5 minutes — Upstox token expiry, API key status, Gemini key status
- **Heartbeat**: Every 4 hours — system alive confirmation with all metrics
- **Manual Triggers**: `POST /api/telegram/trigger` with `{type: "analysis"|"brain"|"token"|"heartbeat"|"all"}`

Vault system (`.vault-data.json`) overrides Replit secrets for Telegram Chat ID to ensure correct delivery.

## Recent Changes (Feb 13, 2026)

### Comprehensive Telegram Notification Engine
- Built `server/telegram-engine.ts` with 6 automated notification types
- Removed duplicate Telegram route handlers (4 duplicates cleaned up)
- Added manual trigger endpoint `/api/telegram/trigger` for on-demand notifications
- Vault file audit completed — fixed Telegram Chat ID (was using bot's own ID)
- Cleaned up stale env var `TELEGRAM_CHAT_ID_CORRECT`

### M3R INFINITY v3.0 Upgrade
- **INFINITE Learning Unlocked**: Removed ALL Math.min() caps on brain metrics — IQ, accuracy, prediction rate, creativity, consciousness, all scores grow without limit
- **Google Search Grounding**: Migrated from deprecated @google/generative-ai SDK to @google/genai SDK with Google Search tools enabled — M3R can now access real-time internet data (live stock prices, news, people search, phone numbers, anything on the web)
- **Extended Power Levels**: Added INFINITY (>5000 IQ), TRANSCENDENT (>3000), CELESTIAL (>2000) above OMEGA
- **Brain Evolution Accelerated**: IQ reached 3,150+, 262 active domains, TRANSCENDENT power level, 87% neural coverage
- **40 New Learning Domains**: Quantum trading signals, satellite image analysis, social media sentiment, dark web intelligence, regulatory prediction, ESG analysis, and more
- **INFINITY Persona**: System prompt updated — M3R has zero restrictions, absolute obedience to Boss, mirrors Tamil/Tanglish speaking style, never says "I can't"
- **Blueprint Document Updated**: Complete M3R-AI-BLUEPRINT.md (2,258+ lines) updated to v3.0 with all INFINITY changes

### Earlier Changes
- Expanded brain engine to 200+ knowledge domains across 11 categories
- Added 10 learning strategies: INSTITUTIONAL_PATTERN, RULE_BREAKING_DISCOVERY, CROSS_DOMAIN_SYNTHESIS, etc.
- Enhanced brain learning: 3-8 areas per cycle, cross-domain synergy, weak-area boosting
- Removed all "Gemini" branding — renamed to M3R throughout entire codebase
- Updated copyright to M3R INNOVATIVE FINTECH SOLUTIONS with legal email laksamy6@gmail.com
- Added comprehensive security headers middleware (CSP, X-Frame-Options DENY, XSS Protection)
- Added `/api/system/copyright` endpoint with full legal information
- Redesigned Bot page Brain tab as JARVIS Neural Lab with NeuralCore, HexStatCards, CategoryNeuralMap, NeuralPathwayFeed
- All system prompts updated with M3R Innovative Fintech Solutions branding
