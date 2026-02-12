# MarketMind

## Overview

MarketMind is an Indian stock market analysis app built with Expo (React Native) on the frontend and Express.js on the backend. It focuses on Nifty 50 options trading, AI-powered stock analysis, portfolio management, and volatility-based trading strategies. The app uses simulated/mock stock data (hardcoded Indian stocks with random variations) rather than live market feeds, with AI integrations (OpenAI) for chat-based analysis and options trading recommendations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo / React Native)

- **Framework**: Expo SDK 54 with expo-router (file-based routing)
- **Navigation**: Tab-based layout with 7 tabs: Market (index), Options, Bot, Strategy, AI, Watchlist, Portfolio. A modal route exists for individual stock details (`/stock/[symbol]`).
- **State Management**: React Query (`@tanstack/react-query`) for server state; local React state for UI. No global state library.
- **Local Storage**: `@react-native-async-storage/async-storage` for persisting watchlist and portfolio data on-device.
- **Styling**: Dark theme only (light theme colors are identical to dark). Uses `DM Sans` font family loaded via `@expo-google-fonts/dm-sans`. All styling is inline `StyleSheet.create`.
- **Platform Support**: iOS, Android, and Web. Platform-specific handling exists (e.g., haptics only on native, keyboard handling differences).
- **Stock Data**: Mock data generated client-side in `lib/stocks.ts` with hardcoded Indian stocks and random price variations. Not connected to real market data APIs.
- **Options Data**: Simulated option chain generation in `lib/options.ts` with mock OI, IV, Greeks, and PCR calculations.
- **Key Libraries**: expo-haptics, expo-image, expo-blur, expo-linear-gradient, react-native-reanimated, react-native-gesture-handler, react-native-keyboard-controller.
- **Authentication**: PIN-based lock screen with dual-mode access:
  - **Owner Mode**: PIN entry (default 1234) → WelcomeScreen with personal greeting for Mr. Manikandan Rajendran + auto market analysis briefing with JARVIS voice
  - **Visitor Mode**: "Enter as Visitor" button → Language selection (English/Tamil) → Grand JARVIS intro speech praising creator → Limited access
  - Auth state managed in `contexts/AuthContext.tsx` (isVisitor, isOwner, showWelcome, selectedLanguage)
  - Welcome/intro screen in `components/WelcomeScreen.tsx` with typing animation, TTS voice, arc reactor animation
- **Auto Trading**: Bot page (`app/(tabs)/bot.tsx`) includes position monitoring (3s polling), emergency exit modal (-15% P&L, 30s countdown), auto profit booking modal (+80% P&L, 30s countdown), JARVIS voice narration for all auto-actions

### Backend (Express.js)

- **Runtime**: Node.js with TypeScript (tsx for dev, esbuild for production build)
- **Server Location**: `server/index.ts` (entry point), `server/routes.ts` (API routes)
- **API Endpoints**:
  - `POST /api/analyze` — AI-powered stock analysis using OpenAI
  - `POST /api/options-chat` — Options trading bot chat (streaming SSE)
  - `POST /api/chat` — General AI chat (streaming SSE)
  - Conversation CRUD endpoints for chat history
  - Image generation endpoints
  - Audio/voice chat endpoints
- **AI Integration**: OpenAI SDK configured via Replit AI Integrations environment variables (`AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`). Used for stock analysis, options trading advice, and general market chat.
- **CORS**: Dynamic origin allowlist based on Replit environment variables, plus localhost for development.
- **Static Serving**: In production, serves pre-built Expo web assets. In development, proxies to Expo's Metro bundler.

### Database

- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` (users table), `shared/models/chat.ts` (conversations and messages tables)
- **Tables**:
  - `users` — id (UUID), username, password
  - `conversations` — id (serial), title, created_at
  - `messages` — id (serial), conversation_id (FK), role, content, created_at
- **Current Storage**: `server/storage.ts` uses in-memory storage (`MemStorage`) for users. Chat storage (`server/replit_integrations/chat/storage.ts`) uses Drizzle/Postgres.
- **Migration**: Drizzle Kit with `drizzle-kit push` command. Config in `drizzle.config.ts`.
- **Note**: The database connection requires `DATABASE_URL` environment variable. The `server/db.ts` file (not shown but referenced) handles the connection.

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
- **Environment Variables**: `EXPO_PUBLIC_DOMAIN` for API URL construction, `DATABASE_URL` for Postgres, `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` for AI, optional `GEMINI_API_KEY`, `UPSTOX_API_KEY`, `UPSTOX_API_SECRET` for future integrations

## External Dependencies

- **OpenAI API** (via Replit AI Integrations): Powers all AI features — stock analysis, options trading bot, general chat, image generation, and voice/audio processing. Configured through `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL`.
- **PostgreSQL**: Primary database for chat conversations/messages and user data. Connected via `DATABASE_URL` environment variable.
- **Upstox API** (partially integrated): Environment variables exist (`UPSTOX_API_KEY`, `UPSTOX_API_SECRET`) for potential live market data integration, but currently unused beyond OAuth token storage.
- **Gemini API** (referenced but not actively used): `GEMINI_API_KEY` environment variable exists but no active integration found.
- **AsyncStorage**: On-device persistence for watchlist and portfolio (no server sync).