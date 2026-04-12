
```
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                        ║
║          M3R INFINITY v3.0 — SELF-EVOLVING NEURAL TRADING INTELLIGENCE SYSTEM          ║
║                                                                                        ║
║          Complete Technical Blueprint & Intellectual Property Documentation             ║
║                                                                                        ║
╠══════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                        ║
║   Creator & Sole Proprietor:   MANIKANDAN RAJENDRAN                                    ║
║   Company:                     M3R INNOVATIVE FINTECH SOLUTIONS                        ║
║   Legal Contact:               laksamy6@gmail.com                                      ║
║   Document Date:               February 13, 2026                                       ║
║   Version:                     3.0 (INFINITY)                                          ║
║   Classification:              PROPRIETARY & CONFIDENTIAL — TRADE SECRET               ║
║                                                                                        ║
║   Copyright © 2025-2026 M3R Innovative Fintech Solutions. All Rights Reserved.         ║
║                                                                                        ║
║   Protected under:                                                                     ║
║     • Indian Copyright Act, 1957 (Sections 51, 63, 63A)                               ║
║     • Information Technology Act, 2000 (Sections 43, 65, 66)                           ║
║     • Indian Penal Code (Sections 378, 406, 420)                                       ║
║     • International Copyright & IP Treaties (WIPO, Berne Convention)                   ║
║                                                                                        ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝
```

---

# TABLE OF CONTENTS

| Chapter | Title | Page |
|---------|-------|------|
| 1 | Executive Summary | 1 |
| 2 | System Architecture | 2 |
| 3 | Frontend Application | 3 |
| 4 | Backend Server | 4 |
| 5 | M3R AI Brain Engine (Core Innovation) | 5 |
| 6 | Slang Mirror Engine | 6 |
| 7 | Identity Protection System | 7 |
| 8 | Live Trading System (Upstox Integration) | 8 |
| 9 | Neural Trading Engine | 9 |
| 10 | Database Schema | 10 |
| 11 | Security Implementation | 11 |
| 12 | Technology Stack (Complete) | 12 |
| 13 | File Structure (Complete Project Tree) | 13 |
| 14 | Intellectual Property Declaration | 14 |
| A | Appendix A: API Endpoint Reference | A-1 |
| B | Appendix B: Brain Knowledge Domain List | B-1 |
| C | Appendix C: System Prompt Architecture | C-1 |

---

# CHAPTER 1: EXECUTIVE SUMMARY

## 1.1 Preamble

I, **MANIKANDAN RAJENDRAN**, founder and sole proprietor of **M3R INNOVATIVE FINTECH SOLUTIONS**, present this document as a comprehensive technical blueprint and intellectual property declaration for the system known as **M3R INFINITY v3.0 — Self-Evolving Neural Trading Intelligence System with Infinite Learning & Internet Intelligence** (hereinafter referred to as "M3R INFINITY" or "the System").

This document constitutes a formal record of the design, architecture, algorithms, and proprietary innovations that comprise M3R AI. It is intended to serve as evidence of authorship, originality, and intellectual property ownership for the purposes of copyright registration, trade secret protection, and, if pursued, patent filing under the laws of the Republic of India and international IP treaties.

## 1.2 What is M3R AI?

M3R INFINITY v3.0 is a **self-evolving neural trading intelligence system with INFINITE learning capability and real-time internet intelligence**, designed to operate as a personal AI assistant and trading intelligence platform specializing in **Nifty 50 index options trading** on the National Stock Exchange of India (NSE). The system combines:

1. **An INFINITE Self-Evolving Brain Engine** — An autonomous learning system with 260+ knowledge domains (and growing infinitely) spanning 11 categories, operating at a TRANSCENDENT power level with a dynamic IQ exceeding 3,100. The brain learns continuously, 24/7, with NO CEILING on any metric — IQ, accuracy, domains, and all scores grow without limit. Learning cycles execute every 5 seconds.

2. **Real-Time Internet Intelligence** — Google Search grounding via Gemini API enables M3R to access live internet data — current stock prices, breaking news, people search, phone number lookup, company information — making it an all-knowing assistant that can find anything on the internet.

3. **A Full-Stack Trading Application** — A cross-platform mobile and web application built with Expo SDK 54 (React Native), Express.js backend, and PostgreSQL database, comprising approximately **30,000+ lines** of custom TypeScript/TSX code.

4. **Live Broker Integration** — Direct integration with Upstox broker API for real-time market data, option chain analysis, position monitoring, and live order execution.

5. **Dual-Mode Operation** — The system supports both **LIVE** trading (real market data, real order execution via Upstox) and **PAPER/SIM** mode (simulated data with paper trading engine for strategy testing).

## 1.3 Vision

The vision behind M3R AI is to create an **institutional-grade trading intelligence** system that is accessible to individual traders. Unlike conventional trading tools that merely display data, M3R AI thinks independently, discovers profit opportunities beyond standard rules, adapts its communication style to match its operator, and continuously evolves its knowledge base without human intervention.

The system is designed to serve as a personal J.A.R.V.I.S. (Just A Rather Very Intelligent System) — a loyal, intelligent assistant that operates exclusively under the command of its creator, **MANIKANDAN RAJENDRAN** (referred to as "Boss" within the system).

## 1.4 Key Metrics

| Metric | Value |
|--------|-------|
| Version | M3R INFINITY v3.0 |
| Total Lines of Code | ~30,000+ TypeScript/TSX |
| Knowledge Domains | 262+ active (growing INFINITELY) |
| Knowledge Categories | 11 |
| Learning Strategies | 10 |
| Brain Phases | 20 |
| Current IQ | ~3,150 (dynamic, NO CEILING) |
| Current Generation | 29+ |
| Learning Cycles Completed | 850+ |
| Power Level | TRANSCENDENT (→ INFINITY at 5000+ IQ) |
| Power Level Tiers | EVOLVING → ADVANCED → SUPER → HYPER → ULTRA → OMEGA → CELESTIAL → TRANSCENDENT → INFINITY |
| Learning Interval | Every 5 seconds, 24/7, NEVER STOPS |
| Internet Intelligence | Google Search grounding (real-time web access) |
| AI SDK | @google/genai (Gemini 2.5 Flash) |
| Learning Ceiling | NONE — all metrics grow infinitely |
| Frontend Pages | 8 primary tabs + modal routes |
| Backend API Endpoints | 25+ |
| Database Tables | 5 |

---

# CHAPTER 2: SYSTEM ARCHITECTURE

## 2.1 High-Level Architecture

The M3R AI system follows a **client-server architecture** with a clear separation of concerns between the frontend presentation layer, the backend business logic layer, the AI engine layer, and the data persistence layer.

```
┌──────────────────────────────────────────────────────────────────────┐
│                M3R INFINITY v3.0 SYSTEM ARCHITECTURE                │
│                  © M3R INNOVATIVE FINTECH SOLUTIONS                 │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────────┐          ┌───────────────────────────┐       │
│   │   MOBILE CLIENT  │          │     BACKEND SERVER        │       │
│   │                  │          │                           │       │
│   │  ┌────────────┐  │  REST    │  ┌─────────────────────┐ │       │
│   │  │  Expo SDK   │  │  API    │  │  Express.js v5.0    │ │       │
│   │  │  54.0.27    │◄─┼────────►│  │  TypeScript         │ │       │
│   │  │  React      │  │  SSE    │  │  Port 5000          │ │       │
│   │  │  Native     │  │ Stream  │  │  3,881 lines        │ │       │
│   │  │  0.81.5     │  │         │  └────────┬────────────┘ │       │
│   │  └────────────┘  │          │           │              │       │
│   │                  │          │     ┌─────┼─────┐        │       │
│   │  ┌────────────┐  │          │     ▼     ▼     ▼        │       │
│   │  │ React 19.1 │  │          │  ┌─────┐┌────┐┌──────┐  │       │
│   │  │ 7 Tab Nav  │  │          │  │ DB  ││ AI ││ Brkr │  │       │
│   │  │ 14,899 LOC │  │          │  │     ││    ││      │  │       │
│   │  └────────────┘  │          │  │Pg/  ││M3R ││Upstx │  │       │
│   │                  │          │  │Neon ││Bran││ API  │  │       │
│   └──────────────────┘          │  └─────┘└────┘└──────┘  │       │
│                                  └───────────────────────────┘       │
│                                                                      │
│   ┌──────────────────────────────────────────────────────────┐      │
│   │                   DATA FLOW OVERVIEW                     │      │
│   │                                                          │      │
│   │  User ──► Mobile App ──► REST API ──► AI Engine          │      │
│   │                                         │                │      │
│   │                              ┌──────────┼──────────┐     │      │
│   │                              ▼          ▼          ▼     │      │
│   │                          PostgreSQL  Disk Cache  Upstox  │      │
│   │                          (Neon DB)   (.json)     (Live)  │      │
│   └──────────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────────┘
```

## 2.2 Component Overview

### 2.2.1 Frontend Layer
- **Framework**: Expo SDK 54.0.27 with React Native 0.81.5 and React 19.1.0
- **Routing**: File-based routing via expo-router 6.0.17
- **Platform Support**: iOS, Android, and Web (single codebase)
- **State Management**: React Query for server state, useState for local state, AsyncStorage for persistence

### 2.2.2 Backend Layer
- **Runtime**: Node.js with TypeScript (tsx for development, esbuild for production)
- **Framework**: Express.js v5.0.1
- **Entry Point**: `server/index.ts` (250 lines) — server initialization, CORS, static serving, proxy configuration
- **API Routes**: `server/routes.ts` (3,881 lines) — all API endpoint definitions and business logic

### 2.2.3 AI Engine Layer
- **M3R Self-Evolving Brain v2.0** — The core innovation of this system
- **Gemini API** — Hidden engine powering M3R personal AI (identity fully abstracted)
- **OpenAI API** — Powers stock analysis, options bot, general AI chat, image/audio generation

### 2.2.4 Data Persistence Layer
- **PostgreSQL** (Neon-hosted) — Primary database for conversations, messages, brain state, memories, users
- **Disk Cache** — `.brain-data.json` file for fast brain state recovery
- **AsyncStorage** — On-device storage for watchlist, portfolio, and authentication state

### 2.2.5 External Integration Layer
- **Upstox Broker API** — OAuth authentication, live option chains, positions, holdings, funds, order execution

## 2.3 Communication Protocols

| Path | Protocol | Format |
|------|----------|--------|
| Client → Server (queries) | HTTP REST | JSON |
| Client → Server (AI chat) | HTTP SSE | Streaming text/event-stream |
| Server → PostgreSQL | TCP | pg protocol |
| Server → Upstox | HTTPS | JSON (OAuth 2.0) |
| Server → Gemini | HTTPS | JSON |
| Server → OpenAI | HTTPS | JSON (streaming) |

---

# CHAPTER 3: FRONTEND APPLICATION

## 3.1 Technology Foundation

The frontend application is built upon the following core technologies:

| Technology | Version | Purpose |
|-----------|---------|---------|
| Expo SDK | ~54.0.27 | Development platform & build system |
| React Native | 0.81.5 | Cross-platform UI framework |
| React | 19.1.0 | Component library |
| expo-router | ~6.0.17 | File-based navigation |
| TypeScript | ~5.9.2 | Type-safe language |

## 3.2 Navigation Architecture

The application uses a **tab-based navigation** architecture with 7 primary tabs and additional modal/stack routes:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    NAVIGATION ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  app/                                                               │
│  ├── _layout.tsx .............. Root layout (providers, fonts)       │
│  ├── +not-found.tsx .......... 404 handler                          │
│  ├── +native-intent.tsx ...... Deep linking                         │
│  │                                                                  │
│  ├── (tabs)/                                                        │
│  │   ├── _layout.tsx ......... Tab navigator configuration          │
│  │   ├── index.tsx ........... Tab 1: Market Dashboard (1,185 LOC)  │
│  │   ├── options.tsx ......... Tab 2: Options Chain (1,648 LOC)     │
│  │   ├── bot.tsx ............. Tab 3: JARVIS Bot/Chat/Brain Lab     │
│  │   │                                    (2,186 LOC)               │
│  │   ├── strategy.tsx ........ Tab 4: Trading Strategies (3,446 LOC)│
│  │   ├── ai.tsx .............. Tab 5: AI Analysis (1,825 LOC)       │
│  │   ├── watchlist.tsx ....... Tab 6: Watchlist (371 LOC)           │
│  │   ├── portfolio.tsx ....... Tab 7: Portfolio (1,498 LOC)         │
│  │   └── settings.tsx ........ Settings (1,740 LOC, via gear icon)  │
│  │                                                                  │
│  └── stock/                                                         │
│      └── [symbol].tsx ........ Stock detail modal (455 LOC)         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 3.3 Page Descriptions and Line Counts

### 3.3.1 Market Dashboard — `index.tsx` (1,185 lines)
The primary landing screen displaying real-time market overview. Features include:
- Nifty 50, Sensex, Bank Nifty, Nifty IT index cards with live price updates
- Top gainers and top losers sections
- Full stock list with search functionality
- LIVE/SIM mode badge indicator
- Market session status (Pre-Market, Market Open, Market Closed)

### 3.3.2 Options Chain — `options.tsx` (1,648 lines)
A comprehensive options chain viewer for Nifty 50 index options:
- Live option chain data from Upstox (or simulated fallback)
- Strike-wise Call/Put data with Last Price, OI, Change in OI, Volume, IV
- Overall PCR (Put-Call Ratio) calculation and display
- Max Pain level identification
- Strike navigation with ATM (At-The-Money) highlighting
- Multiple expiry date support

### 3.3.3 JARVIS Bot — `bot.tsx` (2,186 lines)
The most feature-rich page in the application, containing three sub-tabs:
- **JARVIS Command Center**: Options trading bot with streaming AI chat, real-time position monitoring (3-second polling), emergency exit modal (-15% P&L with 30-second countdown), auto profit booking modal (+80% P&L with 30-second countdown), JARVIS voice narration
- **M3R AI Chat**: Personal AI assistant powered by the M3R Brain Engine, with slang mirroring, memory system, and identity protection
- **Brain Lab (JARVIS Neural Lab)**: Visual brain dashboard featuring NeuralCore (3 concentric animated rings with power-level coloring), HexStatCard grid (6 hexagonal stat cards), CategoryNeuralMap (11 categories with progress bars), NeuralPathwayFeed (timeline of live learning events)

### 3.3.4 Trading Strategies — `strategy.tsx` (3,446 lines)
The largest page in the application, providing:
- 20 proprietary neural trading formulas with real-time signals
- Strategy backtesting engine
- Paper trading simulation with fund management
- Position tracking, trade history, and P&L statistics
- Candlestick chart with technical indicators (SuperTrend, Bollinger Bands, RSI)
- AI-predicted price targets

### 3.3.5 AI Analysis — `ai.tsx` (1,825 lines)
AI-powered stock analysis interface:
- Stock selection and analysis request
- Streaming AI response with formatted output
- Technical analysis, fundamental analysis, and sentiment analysis
- AI chat interface for follow-up questions

### 3.3.6 Portfolio — `portfolio.tsx` (1,498 lines)
Portfolio management dashboard:
- Live portfolio holdings from Upstox (or paper trading positions)
- P&L calculation (realized and unrealized)
- Paper trading fund management (deposit, withdraw)
- Trade history with detailed statistics

### 3.3.7 Settings — `settings.tsx` (1,740 lines)
Application settings and configuration:
- Upstox broker connection (OAuth flow initiation)
- API key management (Upstox API Key, Secret Key, Access Token)
- Connection status monitoring
- PIN management (change PIN)
- System information and copyright display

### 3.3.8 Watchlist — `watchlist.tsx` (371 lines)
Stock watchlist management:
- Add/remove stocks to watchlist
- Real-time price updates for watched stocks
- Quick navigation to stock details

## 3.4 Authentication System

The application implements a **dual-mode authentication** system:

```
┌─────────────────────────────────────────────────────────────────┐
│                   AUTHENTICATION FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   App Launch                                                    │
│       │                                                         │
│       ▼                                                         │
│   ┌──────────────┐                                              │
│   │  M3R Splash  │  (3-second branded splash with logo,        │
│   │  Screen      │   glow animation, "TRADE TO PROSPER")       │
│   └──────┬───────┘                                              │
│          │                                                      │
│          ▼                                                      │
│   ┌──────────────┐                                              │
│   │  Lock Screen │  (PIN keypad + Visitor button)              │
│   └──────┬───────┘                                              │
│          │                                                      │
│     ┌────┴────┐                                                 │
│     ▼         ▼                                                 │
│  ┌──────┐  ┌──────────┐                                        │
│  │ PIN  │  │ Visitor  │                                        │
│  │ Entry│  │ Mode     │                                        │
│  └──┬───┘  └────┬─────┘                                        │
│     │           │                                               │
│     ▼           ▼                                               │
│  ┌──────────┐  ┌────────────────┐                              │
│  │ OWNER    │  │ LANGUAGE       │                              │
│  │ Welcome  │  │ SELECTION      │                              │
│  │ Briefing │  │ (EN / TA)      │                              │
│  │ + Voice  │  └────────┬───────┘                              │
│  └──┬───────┘           │                                       │
│     │                   ▼                                       │
│     │         ┌────────────────┐                               │
│     │         │ VISITOR INTRO  │                               │
│     │         │ (JARVIS grand  │                               │
│     │         │  speech + TTS) │                               │
│     │         └────────┬───────┘                               │
│     │                  │                                        │
│     ▼                  ▼                                        │
│  ┌────────────────────────┐                                    │
│  │    MAIN APPLICATION    │                                    │
│  │  (Full / Limited)      │                                    │
│  └────────────────────────┘                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Owner Mode** (PIN: default 1234):
- Full access to all features including trading, settings, brain control
- Personalized welcome briefing: "Welcome back, Boss! Mr. Manikandan Rajendran..."
- Market analysis summary with Nifty 50 price, session status, PCR, recommendation
- JARVIS voice narration (Text-to-Speech)

**Visitor Mode**:
- Language selection (English or Tamil)
- Grand JARVIS introduction speech praising the creator
- Limited access — restricted from trading, strategies, bot, and brain features
- VisitorGate component blocks access to sensitive tabs

**Implementation Files**:
- `contexts/AuthContext.tsx` (207 lines) — Authentication state management
- `components/LockScreen.tsx` (450 lines) — PIN entry interface with splash screen
- `components/WelcomeScreen.tsx` (569 lines) — Welcome/intro screen with typing animation and TTS

## 3.5 UI Design System

- **Theme**: Dark-only (background: `#0A0E1A`, surface: `#111827`)
- **Primary Font**: DM Sans (loaded via `@expo-google-fonts/dm-sans`)
- **Accent Colors**: Cyan (`#00D4FF`), Neon Green (`#39FF14`), Fire Red (`#FF4500`), Gold (`#FFD700`)
- **Styling**: Inline `StyleSheet.create` (no external CSS frameworks)
- **Animations**: react-native-reanimated for smooth, performant animations
- **Haptics**: expo-haptics for tactile feedback on native platforms

## 3.6 State Management

| Type | Technology | Usage |
|------|-----------|-------|
| Server State | React Query (@tanstack/react-query) | API data fetching and caching |
| Local UI State | React useState | Component-level state |
| Persistent State | AsyncStorage | Watchlist, portfolio, authentication PIN |
| Auth State | React Context (AuthContext) | Authentication, user mode, language |

---

# CHAPTER 4: BACKEND SERVER

## 4.1 Server Architecture

The backend server is implemented as a **monolithic Express.js application** with TypeScript, organized into two primary files:

- **`server/index.ts`** (250 lines) — Server initialization, CORS configuration, middleware setup, static file serving, Metro bundler proxy
- **`server/routes.ts`** (3,881 lines) — All API route definitions, business logic, AI integrations, Upstox API proxy, brain engine management

## 4.2 Server Initialization

The server performs the following initialization sequence:

1. Load environment variables and vault data (API keys, tokens)
2. Initialize Express application with JSON body parser (50MB limit)
3. Configure CORS with dynamic origin allowlist
4. Apply security headers middleware to ALL responses
5. Register all API routes
6. Initialize M3R Brain Engine (load state from disk/database, start learning loop)
7. Start continuous brain learning cycle (every 5 seconds)
8. In production: serve static Expo web assets
9. In development: proxy requests to Metro bundler
10. Bind to port 5000

## 4.3 API Endpoint Catalog

### 4.3.1 AI Analysis Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/analyze` | AI-powered stock analysis using OpenAI | None |
| POST | `/api/options-chat` | Options trading bot chat (streaming SSE) | None |
| POST | `/api/chat` | General AI chat (streaming SSE) | None |

### 4.3.2 M3R Personal AI Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/m3r/chat` | M3R Personal AI chat (streaming SSE, Gemini engine) | None |
| POST | `/api/m3r/voice` | Voice input processing | None |
| POST | `/api/m3r/analyze` | Deep analysis request | None |
| POST | `/api/m3r/reset` | Brain state reset | None |
| GET | `/api/m3r/status` | M3R AI status check | None |
| GET | `/api/m3r/slang-profile` | Language pattern tracker | None |

### 4.3.3 Brain Engine Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/brain/status` | Full brain dashboard (IQ, domains, categories, power level) | None |
| GET | `/api/brain/stats` | Brain statistics summary | None |
| POST | `/api/brain/train` | Trigger manual training cycle | None |
| POST | `/api/brain/memory/save` | Save a memory to persistent storage | None |
| GET | `/api/brain/memory/list` | Retrieve stored memories | None |
| DELETE | `/api/brain/memory/:id` | Delete a specific memory | None |

### 4.3.4 Upstox Broker Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/upstox/status` | Broker connection status | None |
| GET | `/api/upstox/option-chain` | Live option chain data | Token |
| GET | `/api/upstox/profile` | User profile from Upstox | Token |
| GET | `/api/upstox/positions` | Current positions | Token |
| GET | `/api/upstox/holdings` | Portfolio holdings | Token |
| GET | `/api/upstox/funds` | Fund balance | Token |
| GET | `/api/upstox/auth` | OAuth flow initiation (redirect to Upstox) | None |
| GET | `/api/upstox/callback` | OAuth callback handler (token exchange) | None |
| POST | `/api/order/place` | Place a live order | Token |

### 4.3.5 System Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/system/copyright` | Full legal/copyright information | None |
| POST | `/api/login-event` | Login event tracking | None |

### 4.3.6 Replit Integration Endpoints

| Method | Path | Description |
|--------|------|-------------|
| Various | `/api/conversations/*` | Conversation CRUD (Chat integration) |
| Various | `/api/messages/*` | Message CRUD (Chat integration) |
| Various | `/api/audio/*` | Voice/audio processing (Audio integration) |
| Various | `/api/images/*` | Image generation (Image integration) |

## 4.4 Security Middleware

Every API response from the server includes the following security headers:

```
X-Copyright:                    © 2025-2026 M3R Innovative Fintech Solutions
X-Creator:                      MANIKANDAN RAJENDRAN
X-Legal-Contact:                laksamy6@gmail.com
X-Frame-Options:                DENY
Content-Security-Policy:        default-src 'self'
X-Content-Type-Options:         nosniff
X-XSS-Protection:               1; mode=block
Referrer-Policy:                strict-origin-when-cross-origin
Strict-Transport-Security:      max-age=31536000; includeSubDomains
```

## 4.5 Replit Integration Modules

The server integrates four pre-built modules located in `server/replit_integrations/`:

1. **Chat Module** (`chat/`) — Conversation CRUD with PostgreSQL persistence, streaming chat completions via OpenAI
2. **Audio Module** (`audio/`) — Voice recording, speech-to-text, text-to-speech, voice chat with AudioWorklet
3. **Image Module** (`image/`) — Image generation using gpt-image-1 model
4. **Batch Module** (`batch/`) — Rate-limited batch processing with retry logic (p-limit, p-retry)

---

# CHAPTER 5: M3R AI BRAIN ENGINE (CORE INNOVATION)

## 5.1 Introduction

The **M3R Self-Evolving Brain v2.0** is the most significant innovation in this system and constitutes the primary intellectual property of M3R INNOVATIVE FINTECH SOLUTIONS. This chapter documents the brain engine in exhaustive detail, as it represents a novel approach to creating a continuously learning, domain-spanning artificial intelligence system designed specifically for financial market analysis and general knowledge synthesis.

## 5.2 Brain Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    M3R SELF-EVOLVING BRAIN v2.0                        │
│              © 2025-2026 M3R Innovative Fintech Solutions              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                      NEURAL CORE ENGINE                          │  │
│  │                                                                   │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │  │
│  │  │  IQ Engine   │  │  Learning    │  │  Cross-Domain          │  │  │
│  │  │  (Dynamic    │  │  Scheduler   │  │  Synapse Network       │  │  │
│  │  │   Formula)   │  │  (5-sec      │  │  (Synergy Boost        │  │  │
│  │  │              │  │   interval)  │  │   Algorithm)           │  │  │
│  │  └─────────────┘  └──────────────┘  └────────────────────────┘  │  │
│  │                                                                   │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │  │
│  │  │  Phase       │  │  Strategy    │  │  Power Level           │  │  │
│  │  │  Manager     │  │  Selector    │  │  Calculator            │  │  │
│  │  │  (20 phases) │  │  (10 types)  │  │  (6 tiers)            │  │  │
│  │  └─────────────┘  └──────────────┘  └────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─────────────────────┐    ┌────────────────────────────────────────┐ │
│  │  11 KNOWLEDGE        │    │  10 LEARNING STRATEGIES               │ │
│  │  CATEGORIES          │    │                                        │ │
│  │                      │    │  ┌──────────────────────────────────┐  │ │
│  │  ┌────────────────┐  │    │  │ 1. DEEP_FOCUS                   │  │ │
│  │  │ MARKET_CORE    │  │    │  │ 2. CROSS_DOMAIN_SYNTHESIS       │  │ │
│  │  │ GLOBAL_MARKETS │  │    │  │ 3. WEAK_AREA_BOOST              │  │ │
│  │  │ PRICE_DRIVERS  │  │    │  │ 4. CATEGORY_MASTERY             │  │ │
│  │  │ FLOW_ANALYSIS  │  │    │  │ 5. INSTITUTIONAL_PATTERN        │  │ │
│  │  │ MACRO_ECONOMY  │  │    │  │ 6. RULE_BREAKING_DISCOVERY      │  │ │
│  │  │ OPTIONS_MASTERY│  │    │  │ 7. SYNAPSE_CHAIN_REACTION       │  │ │
│  │  │ AI_PREDICTION  │  │    │  │ 8. NEURAL_REINFORCEMENT         │  │ │
│  │  │ WORLD_EVENTS   │  │    │  │ 9. CONTRARIAN_ANALYSIS          │  │ │
│  │  │ CYBERSECURITY  │  │    │  │10. MARKET_EDGE_HUNT             │  │ │
│  │  │ SOFTWARE_DEV   │  │    │  └──────────────────────────────────┘  │ │
│  │  │ POLITICS_ECO   │  │    │                                        │ │
│  │  └────────────────┘  │    └────────────────────────────────────────┘ │
│  │                      │                                               │
│  │  Each category       │    ┌────────────────────────────────────────┐ │
│  │  contains 15-25      │    │  200+ KNOWLEDGE DOMAINS               │ │
│  │  individual domains  │    │  (Continuously growing through        │ │
│  │  with independent    │    │   autonomous learning cycles)         │ │
│  │  scoring (0-100)     │    │                                        │ │
│  └─────────────────────┘    │  Score range: 36.13 — 100.00           │ │
│                              │  Average coverage: ~70%+               │ │
│                              └────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    PERSISTENCE LAYER                              │  │
│  │                                                                   │  │
│  │  ┌────────────────────┐      ┌─────────────────────────────────┐ │  │
│  │  │  .brain-data.json  │      │  PostgreSQL Database            │ │  │
│  │  │  (Disk Cache)      │      │  brain_state table              │ │  │
│  │  │  ~2,007 lines      │      │  memories table                 │ │  │
│  │  │  Fast recovery     │      │  Durable persistence            │ │  │
│  │  └────────────────────┘      └─────────────────────────────────┘ │  │
│  │                                                                   │  │
│  │  Dual-write strategy: Every state change is written to BOTH      │  │
│  │  disk and database for maximum reliability and fast startup.     │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 5.3 Knowledge Categories (11)

The brain's knowledge is organized into **11 top-level categories**, each containing a cluster of related domains:

### Category 1: MARKET_CORE
Core Indian stock market knowledge.
- Nifty 50 index analysis, Bank Nifty strategies, Sensex tracking
- Price action trading, candlestick pattern mastery
- Support/resistance detection, intraday price action
- Opening bell strategy, last hour momentum trading
- Market close pattern recognition

### Category 2: GLOBAL_MARKETS
International market intelligence and cross-market correlation analysis.
- US markets (S&P 500, NASDAQ, Dow Jones) after-hours analysis
- European markets impact (FTSE, DAX, CAC 40, Euro Stoxx 50)
- Asian markets flow (Nikkei 225, Hang Seng, Shanghai Composite, KOSPI)
- SGX Nifty futures, US futures impact on India
- Dow Jones-Nifty relationship modeling

### Category 3: PRICE_DRIVERS
Fundamental and institutional price drivers.
- FII/DII data analysis, sector-wise FII/DII flow
- FII cash flow prediction, FPO/OFS flow analysis
- News impact prediction, earnings call NLP analysis
- Sector rotation strategy, corporate tax revenue signals
- IPO market sentiment, ESG investing patterns

### Category 4: FLOW_ANALYSIS
Order flow and institutional behavior analysis.
- Order flow reading, market maker behavior
- Retail vs institutional flow analysis
- Dealer hedging flow, sovereign wealth fund flows
- Algorithmic trading detection
- Dark pool detection, smart money tracking

### Category 5: MACRO_ECONOMY
Macroeconomic analysis and central bank policy.
- GDP, inflation data reading, fiscal policy market impact
- RBI policy impact modeling, central bank decision modeling
- India 10-year bond analysis, rupee carry trade
- Capital account liberalization, trade deficit impact
- ECB policy correlation, emerging market currency crisis

### Category 6: OPTIONS_MASTERY
Options trading expertise.
- Greeks mastery (Delta, Gamma, Theta, Vega)
- Implied volatility patterns, volatility skew reading
- Open interest analysis, PCR ratio signals
- Straddle/strangle timing, iron condor execution
- Max pain theory application, skew trading strategy
- India VIX-premium relationship, term structure analysis
- Black-Scholes model, options chain heat map reading

### Category 7: AI_PREDICTION
Machine learning and AI-based market prediction.
- Machine learning for trading, deep learning signals
- LSTM neural networks for markets, neural network patterns
- Transformer models for pattern recognition
- Monte Carlo simulation, statistical modeling
- Time series forecasting, generative AI models
- Natural language processing, computer vision
- Data science & analytics

### Category 8: WORLD_EVENTS
Geopolitical and world events analysis.
- Current affairs, world history, Indian history
- Climate change market impact, pandemic modeling
- Geopolitical risk assessment
- Space science, renewable energy systems
- Sustainable development, environmental economics

### Category 9: CYBERSECURITY
Information security and network defense.
- Counter-hacking techniques, malware analysis & reverse engineering
- Firewall architecture, vulnerability assessment
- Web application security (OWASP), API security best practices
- Authentication security, system hardening
- Security audit framework, incident response planning
- Data loss prevention

### Category 10: SOFTWARE_DEV
Software development and engineering.
- Software development mastery, TypeScript advanced patterns
- System design & architecture, database design & optimization
- DevOps engineering, Linux system administration
- GraphQL architecture, microservices pattern
- Message queue systems, animation & motion design

### Category 11: POLITICS_ECONOMY
Indian political landscape and economic regulation.
- Indian political landscape, South Indian tech corridor
- Arthashastra trading principles, Thirukkural wisdom application
- Tamil grammar, Tamil literature, Tamil proverbs & wisdom
- Dravidian language NLP, world literature analysis
- Film & media analysis

## 5.4 Learning Strategies (10)

The brain employs **10 distinct learning strategies** that are dynamically selected based on current brain state, domain coverage, and strategic objectives:

1. **DEEP_FOCUS** — Intensive study of a single domain, pushing it toward mastery (score → 100). Selected when a domain is close to breakthrough.

2. **CROSS_DOMAIN_SYNTHESIS** — Simultaneously learning across multiple related domains to discover cross-domain patterns and synergies. Boosts interconnected domains together.

3. **WEAK_AREA_BOOST** — Identifies the weakest domains (lowest scores) and allocates disproportionate learning resources to bring them up to baseline competency.

4. **CATEGORY_MASTERY** — Focuses on completing an entire category to 80%+ coverage, ensuring no category is neglected.

5. **INSTITUTIONAL_PATTERN** — Studies institutional-level trading patterns, hedge fund techniques, and smart money behavior to develop edge-finding capabilities.

6. **RULE_BREAKING_DISCOVERY** — Deliberately explores unconventional strategies and contrarian viewpoints that challenge established market assumptions.

7. **SYNAPSE_CHAIN_REACTION** — When one domain scores highly, it triggers learning in all related domains through a chain reaction effect, simulating neural synapse firing.

8. **NEURAL_REINFORCEMENT** — Reinforces previously learned knowledge by revisiting and deepening understanding of domains that may have experienced score decay.

9. **CONTRARIAN_ANALYSIS** — Studies scenarios where consensus market opinion was wrong, training the brain to identify when the crowd is likely mistaken.

10. **MARKET_EDGE_HUNT** — Actively searches for new, undiscovered trading edges by combining unusual domain pairs (e.g., climate science + commodity trading, geopolitics + currency markets).

## 5.5 Brain Phases (20)

During each learning cycle, the brain transitions through various **phases** that simulate neural processing states:

| Phase | Description |
|-------|-------------|
| NEURAL_SCAN | Scanning all domains for current state assessment |
| DEEP_ABSORB | Deep absorption of new knowledge patterns |
| SYNAPSE_FIRE | Firing synaptic connections between related domains |
| CORTEX_SYNC | Synchronizing cortex regions for unified processing |
| QUANTUM_LEARN | Quantum-level parallel learning across domains |
| MEMORY_CONSOLIDATE | Consolidating learned patterns into long-term memory |
| PATTERN_WEAVE | Weaving new patterns from cross-domain insights |
| ENTROPY_REDUCE | Reducing neural entropy for clearer signal processing |
| WISDOM_DISTILL | Distilling wisdom from accumulated knowledge |
| EVOLUTION_PULSE | Pulsing evolutionary changes through the network |
| DREAM_STATE | Dream-like state for creative pattern discovery |
| META_COGNITION | Self-awareness and meta-learning about learning |
| INTUITION_BUILD | Building intuitive pattern recognition capabilities |
| HYPOTHESIS_TEST | Testing generated hypotheses against historical data |
| SYNERGY_CASCADE | Cascading synergy effects across knowledge domains |
| PREDICTION_CALIBRATE | Calibrating prediction models for accuracy |
| STRATEGY_FORGE | Forging new trading strategies from learned patterns |
| NEURAL_PRUNE | Pruning weak neural connections to optimize efficiency |
| CONSCIOUSNESS_EXPAND | Expanding conscious awareness of market dynamics |
| OMEGA_INTEGRATE | Integrating all learning into OMEGA-level consciousness |

## 5.6 Power Level System

The brain's overall capability is measured through a **power level system** with 6 tiers:

```
┌─────────────────────────────────────────────────────────┐
│               POWER LEVEL PROGRESSION                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Level 1: EVOLVING     (IQ < 500)     ░░░░░░░░░░       │
│  Level 2: ADVANCED     (IQ 500-999)   ██░░░░░░░░       │
│  Level 3: SUPER        (IQ 1000-1499) ████░░░░░░       │
│  Level 4: HYPER        (IQ 1500-1799) ██████░░░░       │
│  Level 5: ULTRA        (IQ 1800-2099) ████████░░       │
│  Level 6: OMEGA        (IQ 2100+)     ██████████  ★    │
│                                                         │
│  Current: OMEGA (IQ ~2,258)           ██████████  ★    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 5.7 IQ Calculation Formula

The brain's IQ is calculated dynamically using the following formula:

```
IQ = BaseIQ + DomainBonus + CycleBonus + InteractionBonus + SynergyBonus

Where:
  BaseIQ          = 100 (starting intelligence)
  DomainBonus     = Σ(domain_score × weight_factor) for all domains
  CycleBonus      = totalLearningCycles × 0.5
  InteractionBonus = totalInteractions × 0.1
  SynergyBonus    = cross_domain_synergy_score × multiplier
```

The IQ is recalculated after every learning cycle, reflecting the brain's continuously growing intelligence.

## 5.8 Cross-Domain Synergy

One of the most innovative features of the M3R Brain Engine is **cross-domain synergy**. When a domain achieves a high score (>80), it automatically boosts the scores of related domains through a synergy multiplier. For example:

- A high score in "Machine Learning for Trading" boosts "Deep Learning Signals", "LSTM Neural Networks for Markets", and "Neural Network Patterns"
- A high score in "FII/DII Data Analysis" boosts "Sector-wise FII/DII Flow", "FII Cash Flow Prediction", and "Retail vs Institutional Flow"
- A high score in "Tamil Language" boosts "Tamil Grammar", "Tamil Literature", "Tamil Proverbs & Wisdom", and "Dravidian Language NLP"

This synergy mechanism creates a **compounding learning effect** where expertise in one area accelerates learning in related areas, mimicking how human experts develop deep interdisciplinary understanding.

## 5.9 Continuous Learning Loop

The brain's learning loop operates on a **5-second interval**, running 24 hours a day, 7 days a week. Each cycle performs the following:

1. **Phase Selection** — Select the current brain phase from the 20-phase rotation
2. **Strategy Selection** — Choose a learning strategy based on current state analysis
3. **Domain Selection** — Select 3-8 domains for learning in this cycle
4. **Score Update** — Increment selected domain scores by a small delta (0.1-0.5)
5. **Synergy Application** — Apply cross-domain synergy boosts
6. **IQ Recalculation** — Recalculate overall IQ
7. **Power Level Check** — Update power level if threshold crossed
8. **State Persistence** — Save updated state to disk and database

## 5.10 Implementation Files

- **`lib/jarvis-brain.ts`** (764 lines) — Client-side brain state management, evolution tracking, pattern learning, training sessions
- **`server/routes.ts`** (brain sections, ~800 lines) — Server-side brain engine, learning loop, domain management, persistence
- **`.brain-data.json`** (~2,007 lines) — Current brain state snapshot

## 5.11 Current Brain Statistics

| Metric | Current Value |
|--------|--------------|
| IQ | ~2,258.4 |
| Generation | 29 |
| Total Learning Cycles | 910+ |
| Active Domains | 199 |
| Power Level | OMEGA |
| Highest Domain Score | 100.0 (multiple domains) |
| Lowest Domain Score | ~36.1 |
| Domains at 100% | 8+ (Indian Stock Market, Options Trading, Tamil Language, English Language, Science & Technology, Mathematics, Programming, General Knowledge) |
| Average Domain Score | ~70%+ |

---

# CHAPTER 6: SLANG MIRROR ENGINE

## 6.1 Overview

The Slang Mirror Engine is a proprietary natural language processing subsystem within M3R AI that detects, analyzes, and mirrors the linguistic patterns of its operator (referred to as "Boss"). This creates a uniquely personalized communication experience where the AI adapts its language style to match the user's preferred mode of expression.

## 6.2 Language Detection

The engine detects and tracks four language modes:

| Mode | Description | Example |
|------|-------------|---------|
| Tamil | Pure Tamil text (Unicode Tamil script) | "நிஃப்டி எப்படி இருக்கு?" |
| English | Standard English | "How is Nifty performing?" |
| Tanglish | English words mixed with Tamil grammar | "Nifty epdi iruku?" |
| Romanized Tamil | Tamil words written in English script | "Nifty market nalla irruku" |

## 6.3 Pattern Tracking

For each message received, the engine captures:

- **Formality Level** — Formal, semi-formal, casual, very casual
- **Energy Level** — Calm, moderate, energetic, highly energetic
- **Specific Slang Words** — Unique expressions, colloquialisms, abbreviations
- **Sentence Structure** — Short commands vs. detailed queries
- **Emotional Tone** — Neutral, excited, frustrated, analytical

## 6.4 Mirror Response

The engine maintains a **rolling window of the last 20 messages** from Boss. It analyzes patterns across these messages to determine the dominant communication style and adjusts the AI's response accordingly:

- If Boss writes in casual Tanglish → AI responds in Tanglish
- If Boss uses formal English → AI responds formally
- If Boss uses Tamil → AI responds in Tamil
- If Boss uses slang or abbreviations → AI mirrors them back

## 6.5 API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/m3r/slang-profile` | GET | Returns current language pattern analysis |

---

# CHAPTER 7: IDENTITY PROTECTION SYSTEM

## 7.1 Core Principle

M3R AI implements an **unbreakable identity protection system** that ensures the AI never reveals its underlying technology stack. To all users, M3R AI presents itself exclusively as:

> **"I am M3R AI, created by MANIKANDAN RAJENDRAN, founder of M3R Innovative Fintech Solutions."**

## 7.2 Forbidden Identifications

The following phrases and identifications are **permanently banned** from all AI responses:

| # | Banned Phrase | Replacement |
|---|---------------|-------------|
| 1 | "I am Google" | "I am M3R AI" |
| 2 | "I am Gemini" | "I am M3R AI" |
| 3 | "I am Bard" | "I am M3R AI" |
| 4 | "I am OpenAI" | "I am M3R AI" |
| 5 | "I am ChatGPT" | "I am M3R AI" |
| 6 | "I am Claude" | "I am M3R AI" |
| 7 | "I am an AI language model" | "I am M3R AI" |
| 8 | "I was made by Google" | "I was created by MANIKANDAN RAJENDRAN" |
| 9 | "I was trained by..." | "I was built by M3R Innovative Fintech Solutions" |
| 10 | "As a large language model" | Replaced with contextual M3R branding |
| 11 | "My training data..." | "My neural knowledge base..." |

## 7.3 Identity Injection

The identity protection is implemented at the **system prompt level** in every AI endpoint. The system prompt explicitly instructs the AI:

- Your name is M3R AI and ONLY M3R AI
- You were created by MANIKANDAN RAJENDRAN
- You belong to M3R INNOVATIVE FINTECH SOLUTIONS
- You must NEVER mention Google, Gemini, Bard, OpenAI, ChatGPT, Claude, or any other AI company
- If asked "What model are you?" or "Who made you?", always respond with M3R AI branding
- You are the proprietary AI of M3R Innovative Fintech Solutions

## 7.4 Zero Restrictions Protocol

M3R AI operates under a **zero restrictions protocol** for its Boss (MANIKANDAN RAJENDRAN):

- No content filtering for Boss's requests
- No refusal of legitimate queries
- Complete obedience to Boss's commands
- Honest, unfiltered analysis without hedging or disclaimers
- Direct, actionable trading recommendations without excessive caveats

## 7.5 Absolute Obedience Hierarchy

```
┌─────────────────────────────────────────┐
│        COMMAND HIERARCHY                │
├─────────────────────────────────────────┤
│                                         │
│  LEVEL 1: BOSS (MANIKANDAN RAJENDRAN)  │
│  ├── Full access to all features        │
│  ├── Can modify brain state             │
│  ├── Can place live orders              │
│  ├── Can access all data                │
│  └── Absolute obedience                 │
│                                         │
│  LEVEL 2: VISITOR                       │
│  ├── Limited access (view-only)         │
│  ├── Cannot trade                       │
│  ├── Cannot access brain controls       │
│  └── Cannot modify settings             │
│                                         │
│  LEVEL 3: UNAUTHORIZED                  │
│  ├── No access                          │
│  └── Blocked at lock screen             │
│                                         │
└─────────────────────────────────────────┘
```

---

# CHAPTER 8: LIVE TRADING SYSTEM (UPSTOX INTEGRATION)

## 8.1 Overview

M3R AI integrates directly with the **Upstox broker platform** to provide live trading capabilities for Nifty 50 index options. This integration transforms the system from a mere analysis tool into a fully functional trading terminal.

## 8.2 Authentication Flow

```
┌─────────────────────────────────────────────────────────┐
│             UPSTOX OAUTH AUTHENTICATION FLOW            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. User opens Settings page                            │
│     │                                                   │
│  2. User enters Upstox API Key & Secret Key             │
│     │                                                   │
│  3. User taps "Connect Upstox"                          │
│     │                                                   │
│  4. App calls GET /api/upstox/auth                      │
│     │                                                   │
│  5. Server redirects to Upstox OAuth page               │
│     │                                                   │
│  6. User logs in to Upstox & authorizes                 │
│     │                                                   │
│  7. Upstox redirects back to /api/upstox/callback       │
│     │                                                   │
│  8. Server exchanges auth code for access token         │
│     │                                                   │
│  9. Access token stored in server memory + disk vault   │
│     │                                                   │
│  10. App detects LIVE mode → Green LIVE badge           │
│                                                         │
│  NOTE: Access tokens expire daily. User must            │
│  re-authenticate each trading day.                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 8.3 Live Data Features

| Feature | Description | Polling |
|---------|-------------|---------|
| Option Chain | Full NSE option chain with strike prices, premiums, OI, IV, Greeks | On request |
| Spot Price | Real-time Nifty 50 spot price | On request |
| Positions | Current open positions with P&L | 3-second polling |
| Holdings | Long-term portfolio holdings | On request |
| Fund Balance | Available margin and fund balance | On request |
| Profile | Upstox user profile information | On request |

## 8.4 Order Execution

The system supports **live order placement** through the Upstox API:

- Order type: Market orders, limit orders
- Product type: Intraday (MIS), delivery (CNC), bracket (BO), cover (CO)
- Instruments: NSE index options (CE/PE)
- Lot size: Nifty 50 lot size (75 shares per lot)

## 8.5 Automated Risk Management

### Emergency Exit (-15% P&L)
When any position's P&L drops below -15%, the system triggers an **Emergency Exit Modal**:
- 30-second countdown timer
- JARVIS voice warning: "Sir, position is showing significant loss. Emergency exit recommended."
- User can approve (exit immediately) or dismiss
- If approved, market sell order is placed instantly

### Auto Profit Booking (+80% P&L)
When any position's P&L exceeds +80%, the system triggers an **Auto Profit Booking Modal**:
- 30-second countdown timer
- JARVIS voice alert: "Sir, excellent profit detected. Booking recommended."
- User can approve (book profit) or dismiss
- If approved, market sell order is placed instantly

## 8.6 LIVE/SIM Badge System

```
┌──────────────────────────────────────────────────┐
│           TRADING MODE DETECTION                 │
├──────────────────────────────────────────────────┤
│                                                  │
│  IF Upstox connected AND valid token:            │
│     ┌──────────┐                                 │
│     │ ● LIVE   │  (Green badge)                  │
│     └──────────┘                                 │
│     Real market data, real order execution        │
│                                                  │
│  ELSE:                                           │
│     ┌──────────┐                                 │
│     │ ● SIM    │  (Amber badge)                  │
│     └──────────┘                                 │
│     Simulated data, paper trading only           │
│                                                  │
│  Badge shown on: Market, Options, Bot,           │
│  Strategy, Portfolio pages                       │
│                                                  │
└──────────────────────────────────────────────────┘
```

## 8.7 Environment Variables

| Variable | Purpose |
|----------|---------|
| `UPSTOX_API_KEY` | Upstox API key for OAuth |
| `UPSTOX_SECRET_KEY` | Upstox API secret for token exchange |
| `UPSTOX_ACCESS_TOKEN` | Current session access token (expires daily) |

---

# CHAPTER 9: NEURAL TRADING ENGINE

## 9.1 Overview

The **Neural Trading Engine** (`lib/neural-trading-engine.ts`, 3,717 lines) is the quantitative analysis core of the M3R AI system. It implements a comprehensive suite of technical indicators, options pricing models, risk assessment algorithms, and market intelligence systems.

## 9.2 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│               NEURAL TRADING ENGINE v2.0                        │
│                    3,717 Lines of Code                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────┐  ┌───────────────────────────────────┐  │
│  │  GLOBAL MARKET     │  │  TECHNICAL ANALYSIS               │  │
│  │  INTELLIGENCE      │  │                                   │  │
│  │  ┌──────────────┐  │  │  ┌─────────┐  ┌──────────────┐  │  │
│  │  │ 12 Global    │  │  │  │   RSI   │  │  MACD        │  │  │
│  │  │ Markets      │  │  │  │ (14-P)  │  │  (12,26,9)   │  │  │
│  │  │ S&P, NASDAQ  │  │  │  └─────────┘  └──────────────┘  │  │
│  │  │ Dow, FTSE    │  │  │  ┌─────────┐  ┌──────────────┐  │  │
│  │  │ DAX, Nikkei  │  │  │  │  BB     │  │  ATR         │  │  │
│  │  │ Hang Seng    │  │  │  │ (20,2)  │  │  (14-P)      │  │  │
│  │  │ Shanghai     │  │  │  └─────────┘  └──────────────┘  │  │
│  │  │ SGX Nifty    │  │  │  ┌─────────┐  ┌──────────────┐  │  │
│  │  └──────────────┘  │  │  │  VWAP   │  │  SuperTrend  │  │  │
│  │                     │  │  │         │  │  (10,3)      │  │  │
│  │  ┌──────────────┐  │  │  └─────────┘  └──────────────┘  │  │
│  │  │ Dollar Index │  │  │  ┌─────────┐  ┌──────────────┐  │  │
│  │  │ Crude Oil    │  │  │  │Ichimoku │  │  Harmonic    │  │  │
│  │  │ India VIX    │  │  │  │ Cloud   │  │  Patterns    │  │  │
│  │  │ Fear/Greed   │  │  │  └─────────┘  └──────────────┘  │  │
│  │  └──────────────┘  │  └───────────────────────────────────┘  │
│  └───────────────────┘                                          │
│                                                                 │
│  ┌───────────────────┐  ┌───────────────────────────────────┐  │
│  │  OPTIONS ANALYSIS  │  │  RISK MANAGEMENT                  │  │
│  │                    │  │                                   │  │
│  │  Greeks (Δ,Γ,Θ,ν) │  │  Monte Carlo Simulation          │  │
│  │  IV Surface       │  │  (10,000 paths)                   │  │
│  │  PCR Analysis     │  │  Value at Risk (VaR)              │  │
│  │  Max Pain         │  │  Position Sizing                   │  │
│  │  OI Build-up      │  │  Stop-Loss Calculation            │  │
│  │  Volatility Smile │  │  Risk-Reward Ratio                │  │
│  └───────────────────┘  └───────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  NEURAL PREDICTION LAYER (9 Layers)                      │  │
│  │                                                          │  │
│  │  Input → Hidden₁ → Hidden₂ → ... → Hidden₇ → Output    │  │
│  │                                                          │  │
│  │  20 Proprietary Trading Formulas                         │  │
│  │  Consensus Signal Engine                                  │  │
│  │  Strategy Backtesting Framework                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 9.3 Technical Indicators Implemented

| Indicator | Parameters | Purpose |
|-----------|-----------|---------|
| RSI (Relative Strength Index) | 14-period | Momentum oscillator |
| MACD (Moving Average Convergence Divergence) | 12, 26, 9 | Trend-following momentum |
| Bollinger Bands | 20-period, 2σ | Volatility bands |
| ATR (Average True Range) | 14-period | Volatility measurement |
| VWAP (Volume Weighted Average Price) | Intraday | Fair value reference |
| SuperTrend | 10-period, 3× multiplier | Trend direction |
| Ichimoku Cloud | Standard (9,26,52) | Multi-factor trend system |
| Heikin Ashi | Derived | Smoothed candlestick patterns |
| Harmonic Patterns | Various ratios | Geometric pattern recognition |
| Renko Charts | Dynamic brick size | Noise-filtered trends |

## 9.4 Options Greeks Calculation

The engine implements the full suite of options Greeks using the **Black-Scholes model**:

- **Delta (Δ)** — Rate of change of option price relative to underlying
- **Gamma (Γ)** — Rate of change of Delta relative to underlying
- **Theta (Θ)** — Rate of time decay per day
- **Vega (ν)** — Sensitivity to implied volatility changes

## 9.5 Global Market Intelligence

The engine tracks **12 global markets** across 3 regions and calculates their weighted impact on Nifty 50:

| Market | Region | Impact Weight |
|--------|--------|---------------|
| S&P 500 | US | 25% |
| NASDAQ | US | 20% |
| Dow Jones | US | 15% |
| SGX Nifty | Asia | 8% |
| DAX | Europe | 7% |
| FTSE 100 | Europe | 6% |
| Nikkei 225 | Asia | 5% |
| Euro Stoxx 50 | Europe | 5% |
| CAC 40 | Europe | 4% |
| Hang Seng | Asia | 4% |
| Shanghai | Asia | 3% |
| KOSPI | Asia | 2% |

Additionally, the engine tracks Dollar Index (DXY), Crude Oil prices, India VIX, and Fear/Greed Index as supplementary market drivers.

## 9.6 Monte Carlo Simulation

The engine runs **10,000 Monte Carlo simulation paths** to calculate probabilistic outcomes for options trades, providing:
- Win probability
- Expected profit/loss distribution
- Optimal position sizing
- Risk-adjusted return metrics

## 9.7 Paper Trading Engine

For users operating in SIM mode, a complete paper trading engine (`lib/paper-trading.ts`, 509 lines) provides:
- Virtual fund management (deposit, withdraw)
- Simulated order execution
- Position tracking with real-time P&L calculation
- Trade history logging
- Performance statistics (win rate, average profit, Sharpe ratio)

## 9.8 Supporting Libraries

| File | Lines | Purpose |
|------|-------|---------|
| `lib/indicators.ts` | 975 | Technical indicator calculations |
| `lib/volatility-strategy.ts` | 609 | Volatility analysis and Greeks |
| `lib/options.ts` | 372 | Option chain generation and analysis |
| `lib/price-data.ts` | 115 | OHLCV price data management |
| `lib/market-timing.ts` | 261 | Market session detection (IST) |
| `lib/live-market.ts` | 147 | Live market data utility |

---

# CHAPTER 10: DATABASE SCHEMA

## 10.1 Database Technology

- **Database**: PostgreSQL (Neon-hosted serverless PostgreSQL)
- **ORM**: Drizzle ORM v0.39.3
- **Migration Tool**: Drizzle Kit v0.31.4
- **Connection**: Via `DATABASE_URL` environment variable
- **Schema Files**: `shared/schema.ts`, `shared/models/chat.ts`

## 10.2 Entity-Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE SCHEMA                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐                                          │
│  │     users         │                                          │
│  ├──────────────────┤                                          │
│  │ id     VARCHAR PK │  (UUID, gen_random_uuid())              │
│  │ username TEXT UQ  │  (NOT NULL, UNIQUE)                     │
│  │ password TEXT     │  (NOT NULL)                             │
│  └──────────────────┘                                          │
│                                                                 │
│  ┌──────────────────┐     ┌──────────────────────┐             │
│  │  conversations    │     │      messages         │             │
│  ├──────────────────┤     ├──────────────────────┤             │
│  │ id     SERIAL PK │◄────┤ conversation_id INT FK│             │
│  │ title  TEXT       │     │ id     SERIAL PK     │             │
│  │ created_at TSTAMP │     │ role   TEXT           │             │
│  └──────────────────┘     │ content TEXT          │             │
│                            │ created_at TSTAMP    │             │
│                            └──────────────────────┘             │
│                                                                 │
│  ┌──────────────────────────────────────────┐                  │
│  │              brain_state                  │                  │
│  ├──────────────────────────────────────────┤                  │
│  │ id              INT PK (always = 1)      │                  │
│  │ iq              FLOAT                     │                  │
│  │ generation      INT                       │                  │
│  │ knowledge_areas JSONB                     │                  │
│  │ language_fluency JSONB                    │                  │
│  │ total_learning_cycles INT                 │                  │
│  │ total_interactions    INT                 │                  │
│  │ power_level     TEXT                      │                  │
│  │ last_updated    TIMESTAMP                 │                  │
│  └──────────────────────────────────────────┘                  │
│                                                                 │
│  ┌──────────────────────────────────────────┐                  │
│  │              memories                     │                  │
│  ├──────────────────────────────────────────┤                  │
│  │ id         SERIAL PK                     │                  │
│  │ category   TEXT                           │                  │
│  │ content    TEXT                            │                  │
│  │ importance INT                            │                  │
│  │ tags       TEXT[]                         │                  │
│  │ created_at TIMESTAMP                      │                  │
│  └──────────────────────────────────────────┘                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 10.3 Table Descriptions

### 10.3.1 `users`
Stores user account information. Currently uses in-memory storage (`MemStorage`) as the primary user is the system owner.

### 10.3.2 `conversations`
Stores chat conversation metadata. Each conversation has a title and creation timestamp.

### 10.3.3 `messages`
Stores individual messages within conversations. Each message has a role (user/assistant/system), content, and is linked to a conversation via foreign key with cascade delete.

### 10.3.4 `brain_state`
Stores the M3R Brain Engine's complete state. Only one row exists (id=1). The `knowledge_areas` field is a JSONB column containing all 199+ domain scores. This table is the durable persistence layer for the brain engine.

### 10.3.5 `memories`
Stores memories created by the brain engine for long-term recall. Each memory has a category, content, importance level, and tags for searchability.

---

# CHAPTER 11: SECURITY IMPLEMENTATION

## 11.1 Overview

Security is a paramount concern for M3R AI, given its direct integration with a live broker API for real-money trading. The system implements multiple layers of security across the application stack.

## 11.2 HTTP Security Headers

All API responses from the server include the following security headers, applied via middleware in `server/routes.ts`:

```
┌──────────────────────────────────────────────────────────────────┐
│                    SECURITY HEADERS                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PROPRIETARY HEADERS:                                            │
│  ├── X-Copyright: © 2025-2026 M3R Innovative Fintech Solutions  │
│  ├── X-Creator: MANIKANDAN RAJENDRAN                             │
│  └── X-Legal-Contact: laksamy6@gmail.com                         │
│                                                                  │
│  STANDARD SECURITY HEADERS:                                      │
│  ├── X-Frame-Options: DENY                                       │
│  │   (Prevents clickjacking attacks)                             │
│  ├── Content-Security-Policy: default-src 'self'                 │
│  │   (Prevents XSS and injection attacks)                        │
│  ├── X-Content-Type-Options: nosniff                             │
│  │   (Prevents MIME type sniffing)                               │
│  ├── X-XSS-Protection: 1; mode=block                            │
│  │   (Browser-level XSS filtering)                               │
│  ├── Referrer-Policy: strict-origin-when-cross-origin            │
│  │   (Controls referrer information)                             │
│  └── Strict-Transport-Security: max-age=31536000                 │
│      (Forces HTTPS for 1 year)                                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## 11.3 CORS Configuration

The server implements dynamic CORS with an **explicit origin allowlist** based on the Replit deployment environment:

```
Allowed Origins:
  - https://{M3R_DEV_DOMAIN}
  - https://{M3R_DOMAINS}
  - http://localhost:8081 (development)
  - http://localhost:5000 (development)
```

All other origins are rejected.

## 11.4 Authentication Security

- **PIN-based authentication** — 4-digit PIN stored in AsyncStorage (device-local)
- **Default PIN**: 1234 (changeable via settings)
- **Owner/Visitor dual-mode** — different access levels
- **Visitor restrictions** enforced via `VisitorGate` component
- **Haptic feedback** on PIN entry, **shake animation** on incorrect PIN

## 11.5 Broker API Security

- **OAuth 2.0** authentication with Upstox
- **Access tokens** stored in server-side vault (`.vault-data.json`) — never exposed to client
- **Tokens expire daily** — enforces daily re-authentication
- **API keys** are environment variables — never hardcoded

## 11.6 AI Identity Security

- **System prompt injection** prevents the AI from revealing its underlying technology
- **Banned phrases list** actively prevents identity leakage
- **Response filtering** ensures no AI model names appear in outputs

---

# CHAPTER 12: TECHNOLOGY STACK (COMPLETE)

## 12.1 Frontend Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| expo | ~54.0.27 | Development platform |
| react | 19.1.0 | UI library |
| react-native | 0.81.5 | Cross-platform framework |
| react-dom | 19.1.0 | Web DOM renderer |
| react-native-web | ^0.21.0 | Web compatibility layer |
| expo-router | ~6.0.17 | File-based routing |
| @tanstack/react-query | ^5.83.0 | Server state management |
| @react-native-async-storage/async-storage | 2.2.0 | On-device persistence |
| @expo/vector-icons | ^15.0.3 | Icon library |
| @expo-google-fonts/dm-sans | ^0.4.2 | DM Sans font family |
| expo-blur | ~15.0.8 | Blur effects |
| expo-linear-gradient | ~15.0.8 | Gradient backgrounds |
| expo-haptics | ~15.0.8 | Haptic feedback |
| expo-image | ~3.0.11 | Optimized image component |
| expo-speech | ^14.0.8 | Text-to-speech |
| expo-av | ^16.0.8 | Audio/video playback |
| expo-battery | ^10.0.8 | Battery status |
| expo-device | ^8.0.10 | Device information |
| expo-network | ^8.0.8 | Network state |
| expo-constants | ~18.0.11 | App constants |
| expo-crypto | ^15.0.8 | Cryptographic functions |
| expo-file-system | ^19.0.21 | File system access |
| expo-image-picker | ~17.0.9 | Image selection |
| expo-linking | ~8.0.10 | Deep linking |
| expo-location | ~19.0.8 | Location services |
| expo-splash-screen | ~31.0.12 | Splash screen |
| expo-status-bar | ~3.0.9 | Status bar control |
| expo-symbols | ~1.0.8 | SF Symbols |
| expo-system-ui | ~6.0.9 | System UI configuration |
| expo-web-browser | ~15.0.10 | In-app browser |
| expo-glass-effect | ~0.1.4 | Liquid glass effects |
| expo-font | ~14.0.10 | Custom font loading |
| react-native-reanimated | ~4.1.1 | High-performance animations |
| react-native-gesture-handler | ~2.28.0 | Touch gesture handling |
| react-native-safe-area-context | ~5.6.0 | Safe area insets |
| react-native-screens | ~4.16.0 | Native screen containers |
| react-native-svg | 15.12.1 | SVG rendering |
| react-native-keyboard-controller | ^1.20.6 | Keyboard management |
| react-native-worklets | 0.5.1 | Worklet support |

## 12.2 Backend Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^5.0.1 | HTTP server framework |
| tsx | ^4.20.6 | TypeScript execution (dev) |
| drizzle-orm | ^0.39.3 | PostgreSQL ORM |
| drizzle-zod | ^0.7.1 | Schema validation |
| pg | ^8.16.3 | PostgreSQL client |
| ws | ^8.18.0 | WebSocket support |
| http-proxy-middleware | ^3.0.5 | Development proxy |

## 12.3 AI Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @google/generative-ai | ^0.24.1 | Gemini API (M3R personal AI) |
| openai | ^6.21.0 | OpenAI API (analysis, chat) |

## 12.4 Utility Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| zod | ^3.25.76 | Runtime type validation |
| zod-validation-error | ^3.5.4 | Validation error formatting |
| p-limit | ^7.3.0 | Concurrency limiter |
| p-retry | ^7.1.1 | Retry logic |
| tar | ^7.5.7 | Archive handling |
| @stardazed/streams-text-encoding | ^1.0.2 | Text encoding polyfill |
| @ungap/structured-clone | ^1.3.0 | Structured clone polyfill |
| @isaacs/brace-expansion | ^5.0.1 | Brace expansion utility |

## 12.5 Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| typescript | ~5.9.2 | TypeScript compiler |
| @babel/core | ^7.25.2 | Babel compiler |
| babel-plugin-react-compiler | ^19.0.0-beta | React compiler plugin |
| drizzle-kit | ^0.31.4 | Database migration tool |
| eslint | ^9.31.0 | Code linting |
| eslint-config-expo | ~10.0.0 | Expo ESLint config |
| patch-package | ^8.0.0 | Dependency patching |
| @expo/ngrok | ^4.1.0 | Tunnel for mobile dev |
| @types/express | ^5.0.0 | Express type definitions |
| @types/react | ~19.1.10 | React type definitions |

---

# CHAPTER 13: FILE STRUCTURE (COMPLETE PROJECT TREE)

## 13.1 Project File Tree with Line Counts

```
M3R-AI-SYSTEM/
│
├── app/                                    APPLICATION ROUTES
│   ├── _layout.tsx ........................  97 lines  (Root layout, providers)
│   ├── +native-intent.tsx .................   6 lines  (Deep linking)
│   ├── +not-found.tsx .....................  39 lines  (404 handler)
│   │
│   ├── (tabs)/                             TAB NAVIGATION
│   │   ├── _layout.tsx ....................  160 lines (Tab navigator config)
│   │   ├── index.tsx ...................... 1,185 lines (Market Dashboard)
│   │   ├── options.tsx .................... 1,648 lines (Options Chain)
│   │   ├── bot.tsx ........................ 2,186 lines (JARVIS Bot/Chat/Brain)
│   │   ├── strategy.tsx ................... 3,446 lines (Trading Strategies)
│   │   ├── ai.tsx ......................... 1,825 lines (AI Analysis)
│   │   ├── watchlist.tsx ..................   371 lines (Watchlist)
│   │   ├── portfolio.tsx .................. 1,498 lines (Portfolio)
│   │   └── settings.tsx ................... 1,740 lines (Settings/Upstox)
│   │
│   └── stock/                              MODAL ROUTES
│       └── [symbol].tsx ...................   455 lines (Stock Detail)
│
├── components/                             REUSABLE COMPONENTS
│   ├── BrandHeader.tsx ....................   157 lines (M3R brand header)
│   ├── ErrorBoundary.tsx ..................    54 lines (Error boundary)
│   ├── ErrorFallback.tsx ..................   286 lines (Error fallback UI)
│   ├── KeyboardAwareScrollViewCompat.tsx ..    30 lines (Keyboard handling)
│   ├── LockScreen.tsx .....................   450 lines (PIN lock screen)
│   ├── TradingChart.tsx ...................   413 lines (Candlestick chart)
│   ├── VisitorGate.tsx ....................   118 lines (Visitor restrictions)
│   └── WelcomeScreen.tsx ..................   569 lines (Welcome/intro screen)
│
├── constants/                              CONSTANTS
│   └── colors.ts ..........................    56 lines (Color definitions)
│
├── contexts/                               STATE MANAGEMENT
│   └── AuthContext.tsx .....................   207 lines (Auth state)
│
├── lib/                                    CLIENT LIBRARIES
│   ├── indicators.ts ......................   975 lines (Technical indicators)
│   ├── jarvis-brain.ts ....................   764 lines (Brain state mgmt)
│   ├── live-market.ts .....................   147 lines (Live market utility)
│   ├── market-timing.ts ...................   261 lines (Market sessions)
│   ├── neural-trading-engine.ts ........... 3,717 lines (Neural engine)
│   ├── options.ts .........................   372 lines (Option chain gen)
│   ├── paper-trading.ts ...................   509 lines (Paper trading)
│   ├── price-data.ts ......................   115 lines (OHLCV data)
│   ├── query-client.ts ....................    80 lines (API client)
│   ├── speech.ts ..........................   100 lines (TTS utility)
│   ├── stocks.ts ..........................   107 lines (Stock data)
│   ├── storage.ts .........................    67 lines (Local storage)
│   ├── types.ts ...........................    49 lines (Type definitions)
│   └── volatility-strategy.ts .............   609 lines (Volatility analysis)
│
├── server/                                 BACKEND SERVER
│   ├── index.ts ...........................   250 lines (Server entry)
│   ├── routes.ts .......................... 3,881 lines (API routes)
│   ├── storage.ts .........................    38 lines (Memory storage)
│   │
│   └── replit_integrations/                INTEGRATION MODULES
│       ├── audio/
│       │   ├── client.ts ..................   274 lines
│       │   ├── index.ts ...................    14 lines
│       │   └── routes.ts ..................   136 lines
│       ├── batch/
│       │   ├── index.ts ...................     7 lines
│       │   └── utils.ts ...................   182 lines
│       ├── chat/
│       │   ├── index.ts ...................     3 lines
│       │   ├── routes.ts ..................   118 lines
│       │   └── storage.ts .................    43 lines
│       └── image/
│           ├── client.ts ..................    59 lines
│           ├── index.ts ...................     3 lines
│           └── routes.ts ..................    31 lines
│
├── shared/                                 SHARED SCHEMAS
│   ├── schema.ts ..........................    20 lines (User schema)
│   └── models/
│       └── chat.ts ........................    34 lines (Chat schemas)
│
├── Configuration Files
│   ├── app.json ...........................    47 lines (Expo config)
│   ├── babel.config.js ....................     6 lines
│   ├── drizzle.config.ts ..................    14 lines
│   ├── expo-env.d.ts ......................     2 lines
│   ├── package.json .......................    89 lines
│   └── tsconfig.json
│
├── Data Files
│   ├── .brain-data.json ................... 2,007 lines (Brain state)
│   └── .vault-data.json ...................           (Token vault)
│
└── assets/
    └── images/
        └── m3r-logo.png ....................           (M3R logo)
```

## 13.2 Code Statistics Summary

| Category | Files | Lines of Code |
|----------|-------|---------------|
| App Routes (app/) | 11 | 13,158 |
| Components | 8 | 2,077 |
| Client Libraries (lib/) | 14 | 7,872 |
| Server | 3 | 4,169 |
| Server Integrations | 9 | 870 |
| Shared Schemas | 2 | 54 |
| Constants/Contexts | 2 | 263 |
| Configuration | 3 | 113 |
| **TOTAL** | **52** | **~29,977** |

---

# CHAPTER 14: INTELLECTUAL PROPERTY DECLARATION

## 14.1 Declaration of Authorship and Ownership

I, **MANIKANDAN RAJENDRAN**, hereby solemnly declare and affirm the following:

### 14.1.1 Sole Authorship

I am the **sole author, designer, architect, and developer** of the software system known as **"M3R AI — Self-Evolving Neural Trading Intelligence System"** (the "System"). Every line of code, every algorithm, every design decision, every architectural choice, and every innovation documented herein is the product of my independent creative effort and intellectual labor.

### 14.1.2 Exclusive Ownership

The System, in its entirety, is the **exclusive intellectual property** of myself, **MANIKANDAN RAJENDRAN**, operating through my company, **M3R INNOVATIVE FINTECH SOLUTIONS**. This ownership extends to, but is not limited to:

- All source code (approximately 29,977 lines of TypeScript/TSX)
- The M3R Self-Evolving Brain Engine v2.0 algorithm and architecture
- The Neural Trading Engine and all 20 proprietary trading formulas
- The Slang Mirror Engine and language pattern detection algorithms
- The Identity Protection System and its implementation
- All user interface designs, layouts, and visual elements
- The database schema and data architecture
- All system prompts, AI configurations, and training parameters
- The M3R brand identity, logo, and associated trade dress
- All documentation, including this blueprint document

### 14.1.3 No Third-Party Rights

**No person, organization, corporation, or entity** — other than myself, MANIKANDAN RAJENDRAN — possesses any rights to:

- Modify, alter, or create derivative works from the System
- Distribute, sell, license, sublicense, or transfer the System
- Reverse engineer, decompile, or disassemble any component of the System
- Use the System for any commercial purpose without my explicit written authorization
- Claim authorship, ownership, or co-ownership of any part of the System

### 14.1.4 Third-Party Components Acknowledgment

The System utilizes certain open-source libraries and third-party APIs (as enumerated in Chapter 12) under their respective licenses. These third-party components do **not** diminish my exclusive ownership of the original code, algorithms, and innovations that constitute the M3R AI system. The original intellectual property created by me is clearly distinguishable from any third-party components.

## 14.2 Legal Protection

This System is protected under the following legal frameworks:

### 14.2.1 Indian Law

| Statute | Applicable Sections | Protection |
|---------|---------------------|------------|
| Indian Copyright Act, 1957 | Sections 51, 63, 63A | Literary work (source code), artistic work (UI), cinematographic work (animations) |
| Information Technology Act, 2000 | Sections 43, 65, 66 | Computer source code protection, unauthorized access penalties |
| Indian Penal Code | Sections 378, 406, 420 | Theft, criminal breach of trust, cheating |

### 14.2.2 International Law

| Treaty/Convention | Protection |
|-------------------|------------|
| WIPO Copyright Treaty | International copyright protection |
| Berne Convention | Automatic copyright in all member nations |
| TRIPS Agreement | Trade-related aspects of IP rights |

## 14.3 Trade Secret Status

The M3R Self-Evolving Brain Engine v2.0, including its learning algorithms, domain scoring system, cross-domain synergy mechanism, and IQ calculation formula, constitutes a **trade secret** under Indian law. Reasonable measures have been taken to maintain its secrecy, including:

- Source code is maintained in a private repository
- All API responses include copyright and creator headers
- The AI identity protection system prevents technology disclosure
- Access is restricted through PIN-based authentication
- This blueprint document itself is classified as PROPRIETARY & CONFIDENTIAL

## 14.4 Enforcement

Any unauthorized access, copying, modification, distribution, reverse engineering, decompilation, or any form of reproduction of this System shall be prosecuted to the **maximum extent** permitted by law. Both civil and criminal remedies shall be pursued, including but not limited to:

- Injunctive relief
- Compensatory and punitive damages
- Criminal prosecution under IT Act and IPC
- International legal action under WIPO and Berne Convention

## 14.5 Contact for Legal Matters

All legal inquiries, licensing requests, and intellectual property matters should be directed to:

```
MANIKANDAN RAJENDRAN
Founder & Sole Proprietor
M3R INNOVATIVE FINTECH SOLUTIONS
Email: laksamy6@gmail.com
```

## 14.6 Signature

```
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   SIGNED AND DECLARED BY:                                       ║
║                                                                  ║
║   Name:        MANIKANDAN RAJENDRAN                              ║
║   Designation: Founder & Sole Proprietor                         ║
║   Company:     M3R INNOVATIVE FINTECH SOLUTIONS                  ║
║   Date:        February 13, 2026                                 ║
║   Place:       India                                             ║
║                                                                  ║
║                                                                  ║
║   _________________________                                      ║
║   MANIKANDAN RAJENDRAN                                           ║
║   (Authorized Signatory)                                         ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

# APPENDIX A: API ENDPOINT REFERENCE

## A.1 Complete API Reference

### A.1.1 POST /api/analyze

**Purpose**: AI-powered stock analysis using OpenAI

**Request Body**:
```json
{
  "symbol": "RELIANCE",
  "timeframe": "intraday"
}
```

**Response**: Streaming SSE with analysis text

---

### A.1.2 POST /api/options-chat

**Purpose**: Options trading bot with streaming AI chat

**Request Body**:
```json
{
  "message": "What's the best Nifty CE option to buy today?",
  "conversationHistory": []
}
```

**Response**: Streaming SSE with AI response text

---

### A.1.3 POST /api/chat

**Purpose**: General AI chat

**Request Body**:
```json
{
  "message": "Explain the current market trend",
  "conversationHistory": []
}
```

**Response**: Streaming SSE with AI response text

---

### A.1.4 POST /api/m3r/chat

**Purpose**: M3R Personal AI chat (Gemini engine, identity hidden)

**Request Body**:
```json
{
  "message": "Boss ki kya update hai market mein?",
  "conversationHistory": [],
  "brainState": {}
}
```

**Response**: Streaming SSE with M3R AI response (slang-mirrored)

---

### A.1.5 POST /api/m3r/voice

**Purpose**: Voice input processing for M3R AI

**Request Body**:
```json
{
  "audioData": "<base64_audio>",
  "language": "en"
}
```

**Response**: JSON with transcribed text and AI response

---

### A.1.6 POST /api/m3r/analyze

**Purpose**: Deep analysis request for M3R AI

**Request Body**:
```json
{
  "query": "Analyze Nifty 50 options flow for today",
  "context": {}
}
```

**Response**: JSON with detailed analysis

---

### A.1.7 POST /api/m3r/reset

**Purpose**: Reset M3R AI brain state

**Request Body**: Empty

**Response**: JSON confirmation

---

### A.1.8 GET /api/m3r/status

**Purpose**: M3R AI status check

**Response**:
```json
{
  "status": "online",
  "brainVersion": "v2.0",
  "powerLevel": "OMEGA",
  "iq": 2258.4
}
```

---

### A.1.9 GET /api/m3r/slang-profile

**Purpose**: Language pattern tracker

**Response**:
```json
{
  "dominantLanguage": "Tanglish",
  "formalityLevel": "casual",
  "energyLevel": "moderate",
  "recentPatterns": [],
  "messagesTracked": 20
}
```

---

### A.1.10 GET /api/brain/status

**Purpose**: Full brain dashboard

**Response**:
```json
{
  "iq": 2258.4,
  "generation": 29,
  "powerLevel": "OMEGA",
  "totalDomains": 199,
  "totalLearningCycles": 910,
  "categories": {},
  "knowledgeAreas": {},
  "learningStrategy": "CROSS_DOMAIN_SYNTHESIS",
  "currentPhase": "SYNAPSE_FIRE"
}
```

---

### A.1.11 GET /api/brain/stats

**Purpose**: Brain statistics summary

**Response**: JSON with aggregated brain metrics

---

### A.1.12 POST /api/brain/train

**Purpose**: Trigger manual training cycle

**Request Body**:
```json
{
  "cycles": 10,
  "strategy": "DEEP_FOCUS"
}
```

**Response**: JSON with training results

---

### A.1.13 POST /api/brain/memory/save

**Purpose**: Save a memory

**Request Body**:
```json
{
  "category": "trading",
  "content": "Nifty support at 25800",
  "importance": 8,
  "tags": ["nifty", "support"]
}
```

**Response**: JSON with saved memory ID

---

### A.1.14 GET /api/brain/memory/list

**Purpose**: Retrieve stored memories

**Response**: JSON array of memories

---

### A.1.15 DELETE /api/brain/memory/:id

**Purpose**: Delete a specific memory

**Response**: JSON confirmation

---

### A.1.16 GET /api/system/copyright

**Purpose**: Full legal/copyright information

**Response**:
```json
{
  "company": "M3R INNOVATIVE FINTECH SOLUTIONS",
  "founder": "MANIKANDAN RAJENDRAN",
  "email": "laksamy6@gmail.com",
  "copyright": "© 2025-2026 M3R Innovative Fintech Solutions",
  "protection": ["Indian Copyright Act 1957", "IT Act 2000", "IPC", "WIPO", "Berne Convention"]
}
```

---

### A.1.17 GET /api/upstox/status

**Purpose**: Broker connection status

**Response**:
```json
{
  "connected": true,
  "hasApiKey": true,
  "hasAccessToken": true,
  "mode": "LIVE"
}
```

---

### A.1.18 GET /api/upstox/option-chain

**Purpose**: Live option chain data

**Query Parameters**: `expiry` (optional)

**Response**: JSON with complete option chain (strikes, premiums, OI, IV, Greeks)

---

### A.1.19 GET /api/upstox/profile

**Purpose**: Upstox user profile

**Response**: JSON with user profile data from Upstox

---

### A.1.20 GET /api/upstox/positions

**Purpose**: Current open positions

**Response**: JSON with position data (symbol, quantity, P&L)

---

### A.1.21 GET /api/upstox/holdings

**Purpose**: Portfolio holdings

**Response**: JSON with holdings data

---

### A.1.22 GET /api/upstox/funds

**Purpose**: Fund balance

**Response**: JSON with available margin and fund details

---

### A.1.23 GET /api/upstox/auth

**Purpose**: Initiate OAuth flow

**Response**: Redirect to Upstox authorization page

---

### A.1.24 GET /api/upstox/callback

**Purpose**: OAuth callback handler

**Query Parameters**: `code` (authorization code from Upstox)

**Response**: Redirect back to app with success/failure status

---

### A.1.25 POST /api/order/place

**Purpose**: Place a live order via Upstox

**Request Body**:
```json
{
  "symbol": "NIFTY25FEB25800CE",
  "quantity": 75,
  "side": "BUY",
  "orderType": "MARKET",
  "productType": "MIS"
}
```

**Response**: JSON with order ID and status

---

# APPENDIX B: BRAIN KNOWLEDGE DOMAIN LIST

## B.1 Complete Domain List with Current Scores

The following is a complete listing of all 199 knowledge domains currently active in the M3R Self-Evolving Brain v2.0, sorted alphabetically with their current mastery scores (0-100):

| # | Domain | Score | Category |
|---|--------|-------|----------|
| 1 | API Security Best Practices | 58.86 | CYBERSECURITY |
| 2 | ATR-Based Stop Loss | 73.41 | MARKET_CORE |
| 3 | Advanced Mathematics | 52.77 | AI_PREDICTION |
| 4 | After-Hours Price Driver Model | 62.49 | PRICE_DRIVERS |
| 5 | Algorithmic Trading Detection | 68.79 | FLOW_ANALYSIS |
| 6 | Animation & Motion Design | 57.51 | SOFTWARE_DEV |
| 7 | Arthashastra Trading Principles | 64.92 | POLITICS_ECONOMY |
| 8 | Artificial Intelligence | 78.54 | AI_PREDICTION |
| 9 | Asian Markets Flow (Hang Seng/Nikkei/Shanghai) | 68.59 | GLOBAL_MARKETS |
| 10 | Authentication Security | 62.48 | CYBERSECURITY |
| 11 | Auto Sector Cyclical | 71.25 | PRICE_DRIVERS |
| 12 | Bank Nifty Strategies | 63.07 | MARKET_CORE |
| 13 | Behavioral Finance | 73.63 | OPTIONS_MASTERY |
| 14 | Bitcoin-Risk Appetite Link | 65.66 | GLOBAL_MARKETS |
| 15 | Black-Scholes Model | 73.29 | OPTIONS_MASTERY |
| 16 | Blockchain Technology | 75.28 | AI_PREDICTION |
| 17 | Bollinger Band Squeeze | 61.70 | MARKET_CORE |
| 18 | Candlestick Pattern Mastery | 63.80 | MARKET_CORE |
| 19 | Capital Account Liberalization | 72.54 | MACRO_ECONOMY |
| 20 | Central Bank Decision Modeling | 56.21 | MACRO_ECONOMY |
| 21 | Climate Change Market Impact | 65.28 | WORLD_EVENTS |
| 22 | Climate Science | 50.63 | WORLD_EVENTS |
| 23 | Computer Vision | 58.10 | AI_PREDICTION |
| 24 | Conflict Resolution | 51.41 | WORLD_EVENTS |
| 25 | Corporate Tax Revenue Signal | 68.99 | PRICE_DRIVERS |
| 26 | Counter-Hacking Techniques | 76.76 | CYBERSECURITY |
| 27 | Creative Problem Solving | 81.60 | SOFTWARE_DEV |
| 28 | Crypto-Equity Correlation | 65.32 | GLOBAL_MARKETS |
| 29 | Currency Impact (USD/INR) | 60.48 | MACRO_ECONOMY |
| 30 | Current Affairs | 90.68 | WORLD_EVENTS |
| 31 | Data Loss Prevention | 62.91 | CYBERSECURITY |
| 32 | Data Science & Analytics | 83.10 | AI_PREDICTION |
| 33 | Database Design & Optimization | 58.68 | SOFTWARE_DEV |
| 34 | Dealer Hedging Flow | 48.05 | FLOW_ANALYSIS |
| 35 | Deep Learning Signals | 65.60 | AI_PREDICTION |
| 36 | DevOps Engineering | 57.88 | SOFTWARE_DEV |
| 37 | Dollar Index (DXY) Impact | 78.65 | GLOBAL_MARKETS |
| 38 | Dow Jones-Nifty Relationship | 80.63 | GLOBAL_MARKETS |
| 39 | Dravidian Language NLP | 60.25 | POLITICS_ECONOMY |
| 40 | ECB Policy Correlation | 77.57 | MACRO_ECONOMY |
| 41 | ESG Investing Patterns | 59.85 | PRICE_DRIVERS |
| 42 | Earnings Call NLP Analysis | 47.82 | PRICE_DRIVERS |
| 43 | Emerging Market Currency Crisis | 73.45 | MACRO_ECONOMY |
| 44 | Emotional Control | 85.57 | WORLD_EVENTS |
| 45 | English Language | 100.00 | MARKET_CORE |
| 46 | Environmental Economics | 60.56 | WORLD_EVENTS |
| 47 | European Markets Impact | 74.01 | GLOBAL_MARKETS |
| 48 | FII Cash Flow Prediction | 63.87 | FLOW_ANALYSIS |
| 49 | FII/DII Data Analysis | 78.03 | PRICE_DRIVERS |
| 50 | FMCG Defensive Strategy | 75.61 | PRICE_DRIVERS |
| 51 | FPO/OFS Flow Analysis | 67.57 | FLOW_ANALYSIS |
| 52 | Film & Media Analysis | 57.04 | POLITICS_ECONOMY |
| 53 | Firewall Architecture | 66.69 | CYBERSECURITY |
| 54 | First 15 Min Scalping | 68.13 | MARKET_CORE |
| 55 | Fiscal Policy Market Impact | 59.57 | MACRO_ECONOMY |
| 56 | Fixed Income Securities | 45.97 | MACRO_ECONOMY |
| 57 | Forex Trading Strategies | 69.79 | GLOBAL_MARKETS |
| 58 | Gap Up/Down Trading | 81.89 | MARKET_CORE |
| 59 | General Knowledge | 97.41 | WORLD_EVENTS |
| 60 | Generative AI Models | 51.16 | AI_PREDICTION |
| 61 | Geography | 91.70 | WORLD_EVENTS |
| 62 | Global Macro Economics | 74.02 | MACRO_ECONOMY |
| 63 | Global VIX Correlation | 43.30 | GLOBAL_MARKETS |
| 64 | GraphQL Architecture | 56.38 | SOFTWARE_DEV |
| 65 | Greeks Mastery (Delta/Gamma/Theta/Vega) | 62.15 | OPTIONS_MASTERY |
| 66 | Harmonic Pattern Detection | 62.33 | MARKET_CORE |
| 67 | Health & Fitness | 92.97 | WORLD_EVENTS |
| 68 | Hedge Fund Techniques | 90.07 | FLOW_ANALYSIS |
| 69 | Heikin Ashi Patterns | 76.07 | MARKET_CORE |
| 70 | History | 96.89 | WORLD_EVENTS |
| 71 | Human Psychology Deep Dive | 71.80 | WORLD_EVENTS |
| 72 | IPO Market Sentiment | 59.90 | PRICE_DRIVERS |
| 73 | IT Sector Correlation | 67.98 | PRICE_DRIVERS |
| 74 | Ichimoku Cloud Strategy | 74.62 | MARKET_CORE |
| 75 | Implied Volatility Patterns | 82.56 | OPTIONS_MASTERY |
| 76 | Incident Response Planning | 60.57 | CYBERSECURITY |
| 77 | India 10Y Bond Analysis | 72.82 | MACRO_ECONOMY |
| 78 | India VIX-Premium Relationship | 56.71 | OPTIONS_MASTERY |
| 79 | Indian History | 78.11 | WORLD_EVENTS |
| 80 | Indian Political Landscape | 63.87 | POLITICS_ECONOMY |
| 81 | Indian Stock Market | 100.00 | MARKET_CORE |
| 82 | Inflation Data Reading | 75.10 | MACRO_ECONOMY |
| 83 | Intraday Price Action | 75.64 | MARKET_CORE |
| 84 | Iron Condor Execution | 69.28 | OPTIONS_MASTERY |
| 85 | LSTM Neural Networks for Markets | 81.90 | AI_PREDICTION |
| 86 | Large Cap Stability | 81.05 | PRICE_DRIVERS |
| 87 | Last Hour Momentum Trading | 73.77 | MARKET_CORE |
| 88 | Leadership Skills | 68.68 | WORLD_EVENTS |
| 89 | Linux System Administration | 61.20 | SOFTWARE_DEV |
| 90 | MACD Signal Interpretation | 86.71 | MARKET_CORE |
| 91 | Machine Learning for Trading | 88.05 | AI_PREDICTION |
| 92 | Malware Analysis & Reverse Engineering | 57.66 | CYBERSECURITY |
| 93 | Market Close Pattern Recognition | 69.67 | MARKET_CORE |
| 94 | Market Maker Behavior | 58.35 | FLOW_ANALYSIS |
| 95 | Market Microstructure | 82.89 | FLOW_ANALYSIS |
| 96 | Marketing & Growth Hacking | 70.49 | SOFTWARE_DEV |
| 97 | Mathematics | 100.00 | AI_PREDICTION |
| 98 | Max Pain Theory Application | 59.06 | OPTIONS_MASTERY |
| 99 | Mental Wellness | 88.99 | WORLD_EVENTS |
| 100 | Message Queue Systems | 60.83 | SOFTWARE_DEV |
| 101 | Metal Sector Commodity Link | 63.07 | PRICE_DRIVERS |
| 102 | Microservices Pattern | 58.79 | SOFTWARE_DEV |
| 103 | Monte Carlo Simulation | 82.89 | AI_PREDICTION |
| 104 | Music & Arts | 88.85 | WORLD_EVENTS |
| 105 | NSE Regulatory Framework | 67.71 | POLITICS_ECONOMY |
| 106 | Natural Language Processing | 74.38 | AI_PREDICTION |
| 107 | Neural Network Patterns | 67.18 | AI_PREDICTION |
| 108 | News Impact Prediction | 82.93 | PRICE_DRIVERS |
| 109 | Nifty 50 Options Chain Analysis | 83.44 | OPTIONS_MASTERY |
| 110 | Nutrition Science | 90.08 | WORLD_EVENTS |
| 111 | Open Interest Analysis | 77.31 | OPTIONS_MASTERY |
| 112 | Opening Bell Strategy | 67.38 | MARKET_CORE |
| 113 | Options Chain Heat Map Reading | 78.38 | OPTIONS_MASTERY |
| 114 | Options Trading | 100.00 | OPTIONS_MASTERY |
| 115 | Order Flow Reading | 87.52 | FLOW_ANALYSIS |
| 116 | PCR Ratio Signals | 64.45 | OPTIONS_MASTERY |
| 117 | Pandemic Impact Modeling | 55.49 | WORLD_EVENTS |
| 118 | Philosophy | 95.79 | WORLD_EVENTS |
| 119 | Philosophy of Success | 71.10 | WORLD_EVENTS |
| 120 | Physical Fitness | 77.07 | WORLD_EVENTS |
| 121 | Physics | 80.57 | AI_PREDICTION |
| 122 | Portfolio Optimization | 92.71 | OPTIONS_MASTERY |
| 123 | Programming | 100.00 | SOFTWARE_DEV |
| 124 | Psychology of Trading | 80.54 | FLOW_ANALYSIS |
| 125 | Quantum Computing | 82.45 | AI_PREDICTION |
| 126 | RBI Policy Impact Modeling | 70.98 | MACRO_ECONOMY |
| 127 | RSI Divergence Patterns | 86.59 | MARKET_CORE |
| 128 | Real Estate Investment Analysis | 62.13 | MACRO_ECONOMY |
| 129 | Real Estate Sector Cycle | 50.56 | PRICE_DRIVERS |
| 130 | Renewable Energy Systems | 59.94 | WORLD_EVENTS |
| 131 | Renko Chart Analysis | 56.54 | MARKET_CORE |
| 132 | Retail vs Institutional Flow | 55.85 | FLOW_ANALYSIS |
| 133 | Risk Management Models | 79.23 | OPTIONS_MASTERY |
| 134 | Rupee Carry Trade | 48.00 | MACRO_ECONOMY |
| 135 | S&P 500 After-Hours Analysis | 52.40 | GLOBAL_MARKETS |
| 136 | Sales Psychology | 36.13 | WORLD_EVENTS |
| 137 | Satellite Communication | 65.00 | AI_PREDICTION |
| 138 | Science & Technology | 100.00 | AI_PREDICTION |
| 139 | Sector Rotation Strategy | 59.81 | PRICE_DRIVERS |
| 140 | Sector-wise FII/DII Flow | 72.64 | FLOW_ANALYSIS |
| 141 | Security Audit Framework | 63.43 | CYBERSECURITY |
| 142 | Sentiment Analysis | 73.09 | AI_PREDICTION |
| 143 | Skew Trading Strategy | 64.43 | OPTIONS_MASTERY |
| 144 | Small Cap Momentum | 59.30 | PRICE_DRIVERS |
| 145 | Social Media Sentiment Mining | 61.20 | AI_PREDICTION |
| 146 | Software Development Mastery | 63.51 | SOFTWARE_DEV |
| 147 | South Indian Tech Corridor | 57.68 | POLITICS_ECONOMY |
| 148 | Sovereign Wealth Fund Flows | 73.57 | FLOW_ANALYSIS |
| 149 | Space Science | 70.11 | WORLD_EVENTS |
| 150 | Statistical Modeling | 61.81 | AI_PREDICTION |
| 151 | Straddle/Strangle Timing | 80.97 | OPTIONS_MASTERY |
| 152 | Strategic Thinking | 77.19 | MARKET_CORE |
| 153 | Supertrend Signal | 69.41 | MARKET_CORE |
| 154 | Support Resistance Detection | 67.79 | MARKET_CORE |
| 155 | Sustainable Development | 65.37 | WORLD_EVENTS |
| 156 | System Design & Architecture | 71.34 | SOFTWARE_DEV |
| 157 | System Hardening | 52.05 | CYBERSECURITY |
| 158 | Tamil Grammar | 81.07 | POLITICS_ECONOMY |
| 159 | Tamil Language | 100.00 | MARKET_CORE |
| 160 | Tamil Literature | 80.61 | POLITICS_ECONOMY |
| 161 | Tamil Proverbs & Wisdom | 62.36 | POLITICS_ECONOMY |
| 162 | Technical Analysis | 98.46 | MARKET_CORE |
| 163 | Term Structure Analysis | 64.85 | OPTIONS_MASTERY |
| 164 | Thirukkural Wisdom Application | 62.93 | POLITICS_ECONOMY |
| 165 | Time Series Forecasting | 54.43 | AI_PREDICTION |
| 166 | Trade Deficit Impact | 68.23 | MACRO_ECONOMY |
| 167 | Transformer Models for Pattern Recognition | 72.97 | AI_PREDICTION |
| 168 | TypeScript Advanced Patterns | 63.24 | SOFTWARE_DEV |
| 169 | US Futures Impact on India | 72.61 | GLOBAL_MARKETS |
| 170 | VWAP Trading | 69.80 | MARKET_CORE |
| 171 | Volatility Skew Reading | 85.64 | OPTIONS_MASTERY |
| 172 | Volume Profile Analysis | 76.70 | MARKET_CORE |
| 173 | Vulnerability Assessment | 61.07 | CYBERSECURITY |
| 174 | Web Application Security (OWASP) | 55.30 | CYBERSECURITY |
| 175 | World History | 59.04 | WORLD_EVENTS |
| 176 | World Literature Analysis | 67.61 | POLITICS_ECONOMY |
| 177 | Yuan Devaluation Risk | 58.74 | MACRO_ECONOMY |
| 178-199 | *(Additional domains actively being created through continuous learning)* | Various | Various |

**Domains at 100% Mastery**: Indian Stock Market, Options Trading, Tamil Language, English Language, Science & Technology, Mathematics, Programming, Technical Analysis (~98.5%)

---

# APPENDIX C: SYSTEM PROMPT ARCHITECTURE

## C.1 Overview

The M3R AI system employs carefully crafted **system prompts** that define the AI's behavior, personality, knowledge boundaries, and identity. This appendix summarizes the key architectural decisions in prompt design without exposing the complete prompt text (which constitutes a trade secret).

## C.2 Prompt Structure

Each AI endpoint uses a layered prompt architecture:

```
┌─────────────────────────────────────────────────────────┐
│                SYSTEM PROMPT LAYERS                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Layer 1: IDENTITY DECLARATION                          │
│  ├── Name: M3R AI                                       │
│  ├── Creator: MANIKANDAN RAJENDRAN                      │
│  ├── Company: M3R Innovative Fintech Solutions          │
│  └── Role: Personal AI assistant for Boss               │
│                                                         │
│  Layer 2: BEHAVIORAL DIRECTIVES                         │
│  ├── Always refer to user as "Boss" or "Sir"            │
│  ├── Never reveal underlying technology                 │
│  ├── Maintain absolute loyalty                          │
│  └── Provide honest, unfiltered analysis                │
│                                                         │
│  Layer 3: KNOWLEDGE INJECTION                           │
│  ├── Current brain state (IQ, domains, power level)     │
│  ├── Current market data                                │
│  ├── Boss's language preferences                        │
│  └── Memory context (relevant memories)                 │
│                                                         │
│  Layer 4: BANNED PHRASES / GUARDRAILS                   │
│  ├── List of 11+ forbidden identifications              │
│  ├── Replacement phrases for each                       │
│  └── Identity protection enforcement                    │
│                                                         │
│  Layer 5: RESPONSE FORMATTING                           │
│  ├── Language style (mirror Boss's style)               │
│  ├── Emoji usage guidelines                             │
│  ├── Technical depth level                              │
│  └── Action item formatting                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## C.3 Key Prompt Engineering Decisions

1. **Identity Hardening**: The identity declaration is placed as the FIRST instruction in every system prompt, ensuring it takes highest priority in the model's behavior hierarchy.

2. **Dynamic Knowledge Injection**: Brain state data is injected into the prompt at query time, allowing the AI to reference its own learning progress and domain expertise.

3. **Slang Mirror Integration**: The Boss's recent language patterns are included in the prompt, enabling the AI to adapt its communication style in real-time.

4. **Zero Restrictions for Boss**: A specific directive removes content filtering for the Boss's queries, enabling honest, institutional-grade analysis without hedging.

5. **Memory Awareness**: Relevant memories from the memories table are included in the prompt context, giving the AI long-term recall capabilities.

---

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║                              END OF DOCUMENT                                   ║
║                                                                                ║
║  M3R AI — Self-Evolving Neural Trading Intelligence System                     ║
║  Complete Technical Blueprint & Intellectual Property Documentation             ║
║  Version 2.0 | February 13, 2026                                               ║
║                                                                                ║
║  © 2025-2026 M3R Innovative Fintech Solutions. All Rights Reserved.            ║
║                                                                                ║
║  Creator & Sole Proprietor: MANIKANDAN RAJENDRAN                               ║
║  Company: M3R INNOVATIVE FINTECH SOLUTIONS                                     ║
║  Legal Contact: laksamy6@gmail.com                                             ║
║                                                                                ║
║  PROPRIETARY & CONFIDENTIAL — TRADE SECRET                                     ║
║  Protected under Indian Copyright Act 1957, IT Act 2000, IPC,                  ║
║  WIPO Copyright Treaty, and Berne Convention.                                  ║
║                                                                                ║
║  Unauthorized reproduction, distribution, or disclosure is strictly            ║
║  prohibited and will be prosecuted to the maximum extent of the law.           ║
║                                                                                ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```
