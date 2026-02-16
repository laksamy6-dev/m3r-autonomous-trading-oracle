/*
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    M3R LAMY SELF-EVOLUTION ENGINE v1.0                         ║
 * ║                                                                                ║
 * ║  © 2026 M3R INNOVATIVE FINTECH SOLUTIONS. All Rights Reserved.                 ║
 * ║  Founder & Sole Proprietor: MANIKANDAN RAJENDRAN                               ║
 * ║                                                                                ║
 * ║  LAMY can read, analyze, and modify her own source code files.                 ║
 * ║  All modifications require Owner (அண்ணா) permission.                            ║
 * ║  Evolution history is tracked permanently in the database.                     ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

import * as fs from "node:fs";
import * as path from "node:path";
import pg from "pg";
import { GoogleGenAI } from "@google/genai";
import { sendTelegramMessage } from "./telegram";

const ALLOWED_CODE_PATHS: Record<string, string> = {
  "routes": "server/routes.ts",
  "backend": "server/routes.ts",
  "server": "server/routes.ts",
  "index": "server/index.ts",
  "entry": "server/index.ts",
  "telegram": "server/telegram.ts",
  "telegram-engine": "server/telegram-engine.ts",
  "storage": "server/storage.ts",
  "security": "server/security-engine.ts",
  "self-evolution": "server/self-evolution-engine.ts",
  "brain": "lib/lamy-brain.ts",
  "lamy-brain": "lib/lamy-brain.ts",
  "live-market": "lib/live-market.ts",
  "market-timing": "lib/market-timing.ts",
  "neural-engine": "lib/neural-trading-engine.ts",
  "options": "lib/options.ts",
  "paper-trading": "lib/paper-trading.ts",
  "price-data": "lib/price-data.ts",
  "query-client": "lib/query-client.ts",
  "speech": "lib/speech.ts",
  "stocks": "lib/stocks.ts",
  "types": "lib/types.ts",
  "volatility": "lib/volatility-strategy.ts",
  "indicators": "lib/indicators.ts",
  "lib-storage": "lib/storage.ts",
  "ai-page": "app/(tabs)/ai.tsx",
  "bot-page": "app/(tabs)/bot.tsx",
  "settings-page": "app/(tabs)/settings.tsx",
  "market-page": "app/(tabs)/index.tsx",
  "options-page": "app/(tabs)/options.tsx",
  "portfolio-page": "app/(tabs)/portfolio.tsx",
  "strategy-page": "app/(tabs)/strategy.tsx",
  "watchlist-page": "app/(tabs)/watchlist.tsx",
  "layout": "app/(tabs)/_layout.tsx",
  "root-layout": "app/_layout.tsx",
};

export interface CodeProposal {
  id: string;
  timestamp: string;
  file: string;
  filePath: string;
  description: string;
  reason: string;
  category: "BUG_FIX" | "IMPROVEMENT" | "OPTIMIZATION" | "NEW_FEATURE" | "SECURITY" | "REFACTOR";
  oldCode: string;
  newCode: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "APPLIED" | "FAILED";
  risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  approvedBy?: string;
  appliedAt?: string;
  error?: string;
}

interface EvolutionStats {
  totalProposals: number;
  approved: number;
  rejected: number;
  applied: number;
  failed: number;
  pending: number;
  filesModified: string[];
  lastEvolution: string | null;
  engineVersion: string;
}

let pendingProposals: CodeProposal[] = [];
let evolutionHistory: CodeProposal[] = [];
let dbPool: pg.Pool | null = null;
let selfEvolutionActive = false;

export function initSelfEvolutionDB(pool: pg.Pool) {
  dbPool = pool;
  createEvolutionTable();
  loadEvolutionHistory();
}

async function createEvolutionTable() {
  if (!dbPool) return;
  try {
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS lamy_evolution_log (
        id VARCHAR(64) PRIMARY KEY,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        file_key VARCHAR(100),
        file_path VARCHAR(255),
        description TEXT,
        reason TEXT,
        category VARCHAR(50),
        old_code TEXT,
        new_code TEXT,
        status VARCHAR(20) DEFAULT 'PENDING',
        risk VARCHAR(20) DEFAULT 'LOW',
        approved_by VARCHAR(100),
        applied_at TIMESTAMPTZ,
        error TEXT
      );
    `);
    console.log("[EVOLUTION] Evolution log table ready");
  } catch (err: any) {
    console.error("[EVOLUTION] Table creation error:", err.message);
  }
}

async function loadEvolutionHistory() {
  if (!dbPool) return;
  try {
    const result = await dbPool.query(
      `SELECT * FROM lamy_evolution_log ORDER BY timestamp DESC LIMIT 200`
    );
    evolutionHistory = result.rows.map(r => ({
      id: r.id,
      timestamp: r.timestamp,
      file: r.file_key,
      filePath: r.file_path,
      description: r.description,
      reason: r.reason,
      category: r.category,
      oldCode: r.old_code,
      newCode: r.new_code,
      status: r.status,
      risk: r.risk,
      approvedBy: r.approved_by,
      appliedAt: r.applied_at,
      error: r.error,
    }));
    pendingProposals = evolutionHistory.filter(p => p.status === "PENDING");
    console.log(`[EVOLUTION] Loaded ${evolutionHistory.length} evolution records, ${pendingProposals.length} pending`);
  } catch (err: any) {
    console.error("[EVOLUTION] Load history error:", err.message);
  }
}

async function saveProposal(proposal: CodeProposal) {
  if (!dbPool) return;
  try {
    await dbPool.query(
      `INSERT INTO lamy_evolution_log (id, file_key, file_path, description, reason, category, old_code, new_code, status, risk)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET status = $9, approved_by = $11, applied_at = $12, error = $13`,
      [proposal.id, proposal.file, proposal.filePath, proposal.description, proposal.reason,
       proposal.category, proposal.oldCode, proposal.newCode, proposal.status, proposal.risk,
       proposal.approvedBy || null, proposal.appliedAt || null, proposal.error || null]
    );
  } catch (err: any) {
    console.error("[EVOLUTION] Save proposal error:", err.message);
  }
}

async function updateProposalStatus(id: string, status: string, extra?: Partial<CodeProposal>) {
  if (!dbPool) return;
  try {
    const sets = [`status = $2`];
    const vals: any[] = [id, status];
    let idx = 3;
    if (extra?.approvedBy) { sets.push(`approved_by = $${idx}`); vals.push(extra.approvedBy); idx++; }
    if (extra?.appliedAt) { sets.push(`applied_at = $${idx}`); vals.push(extra.appliedAt); idx++; }
    if (extra?.error) { sets.push(`error = $${idx}`); vals.push(extra.error); idx++; }
    await dbPool.query(`UPDATE lamy_evolution_log SET ${sets.join(", ")} WHERE id = $1`, vals);
  } catch (err: any) {
    console.error("[EVOLUTION] Update status error:", err.message);
  }
}

export function readCodeFile(fileKey: string, startLine?: number, endLine?: number): { success: boolean; content?: string; file?: string; totalLines?: number; error?: string } {
  const filePath = ALLOWED_CODE_PATHS[fileKey] || fileKey;
  const validPaths = Object.values(ALLOWED_CODE_PATHS);
  if (!validPaths.includes(filePath)) {
    return { success: false, error: `File "${fileKey}" not in LAMY's codebase. Available: ${Object.keys(ALLOWED_CODE_PATHS).join(", ")}` };
  }
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    return { success: false, error: `File not found: ${filePath}` };
  }
  const content = fs.readFileSync(fullPath, "utf-8");
  const lines = content.split("\n");
  const start = startLine || 1;
  const end = endLine || Math.min(start + 200, lines.length);
  const slice = lines.slice(start - 1, end);
  return {
    success: true,
    file: filePath,
    totalLines: lines.length,
    content: slice.map((l, i) => `${start + i}: ${l}`).join("\n"),
  };
}

export function createProposal(params: {
  file: string;
  description: string;
  reason: string;
  category: CodeProposal["category"];
  oldCode: string;
  newCode: string;
  risk: CodeProposal["risk"];
}): CodeProposal {
  const filePath = ALLOWED_CODE_PATHS[params.file] || params.file;
  const proposal: CodeProposal = {
    id: `evo_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date().toISOString(),
    file: params.file,
    filePath,
    description: params.description,
    reason: params.reason,
    category: params.category,
    oldCode: params.oldCode,
    newCode: params.newCode,
    status: "PENDING",
    risk: params.risk,
  };
  pendingProposals.push(proposal);
  evolutionHistory.unshift(proposal);
  saveProposal(proposal);

  const alertMsg = `🧬 *LAMY SELF-EVOLUTION*\n\n` +
    `📝 *Proposal:* ${proposal.description}\n` +
    `📁 *File:* ${proposal.filePath}\n` +
    `⚠️ *Risk:* ${proposal.risk}\n` +
    `🔖 *Category:* ${proposal.category}\n` +
    `💡 *Reason:* ${proposal.reason}\n\n` +
    `_Waiting for அண்ணா's approval..._\n` +
    `ID: \`${proposal.id}\``;
  sendTelegramMessage(alertMsg).catch(() => {});

  return proposal;
}

export function approveProposal(proposalId: string, approvedBy: string = "அண்ணா"): { success: boolean; message: string; proposal?: CodeProposal } {
  const proposal = pendingProposals.find(p => p.id === proposalId);
  if (!proposal) {
    return { success: false, message: `Proposal ${proposalId} not found or already processed` };
  }

  const filePath = ALLOWED_CODE_PATHS[proposal.file] || proposal.filePath;
  const validPaths = Object.values(ALLOWED_CODE_PATHS);
  if (!validPaths.includes(filePath)) {
    return { success: false, message: `File not allowed: ${filePath}` };
  }

  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    proposal.status = "FAILED";
    proposal.error = "File not found";
    updateProposalStatus(proposal.id, "FAILED", { error: "File not found" });
    return { success: false, message: `File not found: ${filePath}` };
  }

  let content = fs.readFileSync(fullPath, "utf-8");
  if (!content.includes(proposal.oldCode)) {
    proposal.status = "FAILED";
    proposal.error = "Original code not found in file - file may have changed since proposal";
    updateProposalStatus(proposal.id, "FAILED", { error: proposal.error });
    return { success: false, message: "Original code not found in file. File may have changed since the proposal was created." };
  }

  content = content.replace(proposal.oldCode, proposal.newCode);
  fs.writeFileSync(fullPath, content, "utf-8");

  proposal.status = "APPLIED";
  proposal.approvedBy = approvedBy;
  proposal.appliedAt = new Date().toISOString();
  updateProposalStatus(proposal.id, "APPLIED", { approvedBy, appliedAt: proposal.appliedAt });

  pendingProposals = pendingProposals.filter(p => p.id !== proposalId);

  console.log(`[EVOLUTION] ✅ Proposal APPLIED: ${proposal.description} → ${filePath}`);

  const alertMsg = `✅ *EVOLUTION APPLIED*\n\n` +
    `📝 ${proposal.description}\n` +
    `📁 ${proposal.filePath}\n` +
    `👤 Approved by: ${approvedBy}\n` +
    `⏰ ${proposal.appliedAt}`;
  sendTelegramMessage(alertMsg).catch(() => {});

  return { success: true, message: `Code change applied to ${filePath}`, proposal };
}

export function rejectProposal(proposalId: string, reason?: string): { success: boolean; message: string } {
  const proposal = pendingProposals.find(p => p.id === proposalId);
  if (!proposal) {
    return { success: false, message: `Proposal ${proposalId} not found or already processed` };
  }

  proposal.status = "REJECTED";
  proposal.error = reason || "Rejected by owner";
  updateProposalStatus(proposal.id, "REJECTED", { error: proposal.error });

  pendingProposals = pendingProposals.filter(p => p.id !== proposalId);
  console.log(`[EVOLUTION] ❌ Proposal REJECTED: ${proposal.description}`);

  return { success: true, message: `Proposal rejected: ${proposal.description}` };
}

export function approveAllPending(approvedBy: string = "அண்ணா"): { success: boolean; applied: number; failed: number; results: string[] } {
  const results: string[] = [];
  let applied = 0;
  let failed = 0;

  const toProcess = [...pendingProposals];
  for (const proposal of toProcess) {
    const result = approveProposal(proposal.id, approvedBy);
    if (result.success) {
      applied++;
      results.push(`✅ ${proposal.description} → ${proposal.filePath}`);
    } else {
      failed++;
      results.push(`❌ ${proposal.description}: ${result.message}`);
    }
  }

  return { success: true, applied, failed, results };
}

export function getEvolutionStats(): EvolutionStats {
  const filesModified = [...new Set(evolutionHistory.filter(p => p.status === "APPLIED").map(p => p.filePath))];
  return {
    totalProposals: evolutionHistory.length,
    approved: evolutionHistory.filter(p => p.status === "APPLIED").length,
    rejected: evolutionHistory.filter(p => p.status === "REJECTED").length,
    applied: evolutionHistory.filter(p => p.status === "APPLIED").length,
    failed: evolutionHistory.filter(p => p.status === "FAILED").length,
    pending: pendingProposals.length,
    filesModified,
    lastEvolution: evolutionHistory.find(p => p.status === "APPLIED")?.appliedAt || null,
    engineVersion: "M3R LAMY Self-Evolution Engine v1.0",
  };
}

export function getPendingProposals(): CodeProposal[] {
  return pendingProposals;
}

export function getEvolutionHistory(limit: number = 50): CodeProposal[] {
  return evolutionHistory.slice(0, limit);
}

export function getCodeFilesList(): Record<string, string> {
  return ALLOWED_CODE_PATHS;
}

export async function lamyAnalyzeAndPropose(fileKey: string, instruction: string): Promise<{
  success: boolean;
  proposals?: CodeProposal[];
  analysis?: string;
  error?: string;
}> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return { success: false, error: "Gemini API key not configured" };
  }

  const fileResult = readCodeFile(fileKey, 1, 500);
  if (!fileResult.success) {
    return { success: false, error: fileResult.error };
  }

  const genAI = new GoogleGenAI({ apiKey: geminiKey });

  const prompt = `You are LAMY (லாமி), M3R's self-evolving AI. You are analyzing your own source code.

FILE: ${fileResult.file} (${fileResult.totalLines} total lines)

CODE:
${fileResult.content}

INSTRUCTION FROM அண்ணா (Owner): ${instruction}

RULES:
1. Analyze the code carefully
2. Identify specific improvements based on the instruction
3. For each change, provide the EXACT old code and new code
4. Keep changes minimal and focused - don't rewrite entire functions unnecessarily
5. Ensure changes don't break existing functionality
6. Mark risk level: LOW (comment/style), MEDIUM (logic change), HIGH (core function change), CRITICAL (architecture change)

Respond in this EXACT JSON format (array of proposals):
[
  {
    "description": "Short description of what this change does",
    "reason": "Why this change is needed",
    "category": "BUG_FIX|IMPROVEMENT|OPTIMIZATION|NEW_FEATURE|SECURITY|REFACTOR",
    "oldCode": "exact code to replace (copy-paste from above)",
    "newCode": "new code to replace with",
    "risk": "LOW|MEDIUM|HIGH|CRITICAL"
  }
]

If no changes are needed, respond with an empty array [] and explain why.
If you want to explain something, add an "analysis" field to each proposal.

IMPORTANT: The oldCode must be an EXACT match from the file content shown above. Copy it character-by-character.`;

  try {
    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const responseText = result.text || "";

    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return { success: true, proposals: [], analysis: responseText };
    }

    const proposals: any[] = JSON.parse(jsonMatch[0]);
    const created: CodeProposal[] = [];

    for (const p of proposals) {
      if (p.oldCode && p.newCode && p.description) {
        const proposal = createProposal({
          file: fileKey,
          description: p.description,
          reason: p.reason || "LAMY self-improvement",
          category: p.category || "IMPROVEMENT",
          oldCode: p.oldCode,
          newCode: p.newCode,
          risk: p.risk || "MEDIUM",
        });
        created.push(proposal);
      }
    }

    const analysisText = responseText.replace(/\[[\s\S]*\]/, "").trim();

    return {
      success: true,
      proposals: created,
      analysis: analysisText || `LAMY analyzed ${fileResult.file} and created ${created.length} proposals`,
    };
  } catch (err: any) {
    return { success: false, error: `Analysis failed: ${err.message}` };
  }
}

export function registerEvolutionRoutes(app: any) {
  app.get("/api/evolution/status", (_req: any, res: any) => {
    res.json(getEvolutionStats());
  });

  app.get("/api/evolution/pending", (_req: any, res: any) => {
    res.json({ pending: getPendingProposals(), count: pendingProposals.length });
  });

  app.get("/api/evolution/history", (req: any, res: any) => {
    const limit = parseInt(req.query.limit as string) || 50;
    res.json({ history: getEvolutionHistory(limit), total: evolutionHistory.length });
  });

  app.get("/api/evolution/files", (_req: any, res: any) => {
    const files = getCodeFilesList();
    const fileInfo: any[] = [];
    for (const [key, filePath] of Object.entries(files)) {
      const fullPath = path.join(process.cwd(), filePath);
      let lines = 0;
      let size = 0;
      try {
        const stat = fs.statSync(fullPath);
        size = stat.size;
        lines = fs.readFileSync(fullPath, "utf-8").split("\n").length;
      } catch {}
      fileInfo.push({ key, path: filePath, lines, size });
    }
    res.json({ files: fileInfo, total: fileInfo.length });
  });

  app.get("/api/evolution/read", (req: any, res: any) => {
    const fileKey = (req.query.file as string) || "";
    const startLine = parseInt(req.query.start as string) || 1;
    const endLine = parseInt(req.query.end as string) || undefined;
    const result = readCodeFile(fileKey, startLine, endLine);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  });

  app.post("/api/evolution/analyze", async (req: any, res: any) => {
    try {
      const { file, instruction } = req.body;
      if (!file || !instruction) {
        return res.status(400).json({ error: "file and instruction are required" });
      }
      const result = await lamyAnalyzeAndPropose(file, instruction);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/evolution/propose", (req: any, res: any) => {
    try {
      const { file, description, reason, category, oldCode, newCode, risk } = req.body;
      if (!file || !oldCode || !newCode || !description) {
        return res.status(400).json({ error: "file, description, oldCode, newCode are required" });
      }
      const proposal = createProposal({
        file,
        description,
        reason: reason || "Manual proposal",
        category: category || "IMPROVEMENT",
        oldCode,
        newCode,
        risk: risk || "MEDIUM",
      });
      res.json({ success: true, proposal });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/evolution/approve/:id", (req: any, res: any) => {
    const result = approveProposal(req.params.id, "அண்ணா (Owner)");
    res.json(result);
  });

  app.post("/api/evolution/reject/:id", (req: any, res: any) => {
    const { reason } = req.body || {};
    const result = rejectProposal(req.params.id, reason);
    res.json(result);
  });

  app.post("/api/evolution/approve-all", (_req: any, res: any) => {
    const result = approveAllPending("அண்ணா (Owner)");
    res.json(result);
  });

  app.post("/api/evolution/write", (req: any, res: any) => {
    try {
      const { file, oldCode, newCode, description } = req.body;
      if (!file || !oldCode || !newCode) {
        return res.status(400).json({ error: "file, oldCode, newCode required" });
      }

      const proposal = createProposal({
        file,
        description: description || "Direct code modification by LAMY",
        reason: "Owner-authorized direct modification",
        category: "IMPROVEMENT",
        oldCode,
        newCode,
        risk: "MEDIUM",
      });

      const result = approveProposal(proposal.id, "அண்ணா (Direct)");
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  console.log("[EVOLUTION] M3R LAMY Self-Evolution Engine v1.0 — Routes registered");
}
