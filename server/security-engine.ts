import type { Request, Response, NextFunction } from "express";
import { sendTelegramMessage } from "./telegram";

const OWNER_ALERT_COOLDOWN = 60000;
const BLOCK_THRESHOLD = 20;
const SCAN_THRESHOLD = 10;
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 100;

interface VisitorLog {
  ip: string;
  firstSeen: number;
  lastSeen: number;
  requestCount: number;
  paths: string[];
  suspiciousCount: number;
  blocked: boolean;
  userAgent: string;
  country?: string;
}

interface SecurityEvent {
  type: "SCAN_DETECTED" | "BRUTE_FORCE" | "EXPLOIT_ATTEMPT" | "SUSPICIOUS_ACCESS" | "NEW_VISITOR" | "RATE_LIMITED" | "PATH_TRAVERSAL" | "SQL_INJECTION" | "BOT_DETECTED";
  ip: string;
  path: string;
  userAgent: string;
  details: string;
  timestamp: number;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

const visitors = new Map<string, VisitorLog>();
const blockedIPs = new Set<string>();
const recentAlerts = new Map<string, number>();
const securityEvents: SecurityEvent[] = [];
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const SUSPICIOUS_PATHS = [
  "/wp-admin", "/wp-login", "/.env", "/config", "/admin",
  "/phpmyadmin", "/.git", "/backup", "/sql", "/database",
  "/shell", "/cmd", "/exec", "/eval", "/upload",
  "/cgi-bin", "/.htaccess", "/.htpasswd", "/etc/passwd",
  "/proc/self", "/server-status", "/actuator", "/debug",
  "/console", "/manager", "/jenkins", "/api/v1/token",
  "/.well-known/security.txt", "/xmlrpc.php", "/wp-content",
  "/wp-includes", "/administrator", "/user/login",
  "/node_modules", "/.DS_Store", "/web.config",
];

const EXPLOIT_PATTERNS = [
  /(\.\.\/)/, /(%2e%2e)/, /(%252e)/, 
  /(union\s+select)/i, /(select\s+.*\s+from)/i, /(insert\s+into)/i,
  /(drop\s+table)/i, /(delete\s+from)/i, /(update\s+.*\s+set)/i,
  /(<script)/i, /(javascript:)/i, /(onerror\s*=)/i, /(onload\s*=)/i,
  /(document\.cookie)/i, /(eval\s*\()/i,
  /(\/etc\/passwd)/, /(\/proc\/self)/, /(cmd\.exe)/, /(powershell)/i,
  /(base64_decode)/i, /(system\s*\()/i, /(exec\s*\()/i,
];

const BOT_PATTERNS = [
  /sqlmap/i, /nikto/i, /nmap/i, /masscan/i, /dirbuster/i,
  /gobuster/i, /wfuzz/i, /hydra/i, /metasploit/i, /burpsuite/i,
  /nessus/i, /openvas/i, /acunetix/i, /w3af/i, /skipfish/i,
  /whatweb/i, /fierce/i, /recon-ng/i, /harvester/i,
  /zgrab/i, /censys/i, /shodan/i,
];

const SAFE_PATHS = [
  "/", "/api/", "/assets/", "/static/", "/_expo/",
  "/manifest", "/status", "/favicon.ico",
];

function getClientIP(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

function isSafePath(path: string): boolean {
  return SAFE_PATHS.some(safe => path.startsWith(safe));
}

function detectExploit(path: string, query: string, body: string): string | null {
  const fullInput = `${path} ${query} ${body}`;
  for (const pattern of EXPLOIT_PATTERNS) {
    const match = fullInput.match(pattern);
    if (match) return match[0];
  }
  return null;
}

function detectBot(userAgent: string): string | null {
  for (const pattern of BOT_PATTERNS) {
    const match = userAgent.match(pattern);
    if (match) return match[0];
  }
  return null;
}

function isSuspiciousPath(path: string): boolean {
  const lowerPath = path.toLowerCase();
  return SUSPICIOUS_PATHS.some(sp => lowerPath.includes(sp.toLowerCase()));
}

async function sendSecurityAlert(event: SecurityEvent): Promise<void> {
  const alertKey = `${event.type}-${event.ip}`;
  const lastAlert = recentAlerts.get(alertKey);
  if (lastAlert && Date.now() - lastAlert < OWNER_ALERT_COOLDOWN) return;

  recentAlerts.set(alertKey, Date.now());

  const severityIcons: Record<string, string> = {
    LOW: "🟡",
    MEDIUM: "🟠",
    HIGH: "🔴",
    CRITICAL: "🚨",
  };

  const typeIcons: Record<string, string> = {
    SCAN_DETECTED: "🔍",
    BRUTE_FORCE: "🔨",
    EXPLOIT_ATTEMPT: "💉",
    SUSPICIOUS_ACCESS: "👁️",
    NEW_VISITOR: "👤",
    RATE_LIMITED: "⏱️",
    PATH_TRAVERSAL: "📂",
    SQL_INJECTION: "💀",
    BOT_DETECTED: "🤖",
  };

  const icon = severityIcons[event.severity] || "⚠️";
  const typeIcon = typeIcons[event.type] || "🔔";
  const ist = new Date(event.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  let msg = `${icon} <b>M3R SECURITY ALERT</b> ${icon}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `${typeIcon} <b>Type:</b> ${event.type}\n`;
  msg += `📊 <b>Severity:</b> ${event.severity}\n`;
  msg += `🌐 <b>IP:</b> <code>${event.ip}</code>\n`;
  msg += `📍 <b>Path:</b> <code>${event.path}</code>\n`;
  msg += `📝 <b>Details:</b> ${event.details}\n`;
  msg += `🖥️ <b>Agent:</b> ${event.userAgent.substring(0, 80)}\n`;

  const visitor = visitors.get(event.ip);
  if (visitor) {
    msg += `📊 <b>Total Requests:</b> ${visitor.requestCount}\n`;
    msg += `⚠️ <b>Suspicious Count:</b> ${visitor.suspiciousCount}\n`;
    if (visitor.blocked) msg += `🚫 <b>STATUS: BLOCKED</b>\n`;
  }

  msg += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `🕐 ${ist}\n`;
  msg += `🛡️ M3R Security Engine v1.0`;

  await sendTelegramMessage(msg, "HTML");
}

function logEvent(event: SecurityEvent): void {
  securityEvents.push(event);
  if (securityEvents.length > 1000) {
    securityEvents.splice(0, securityEvents.length - 500);
  }
  console.log(`[SECURITY] ${event.severity} | ${event.type} | IP: ${event.ip} | ${event.details}`);
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

export function securityMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = getClientIP(req);
  const path = req.path;
  const userAgent = req.headers["user-agent"] || "unknown";
  const query = JSON.stringify(req.query || {});
  const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
  const now = Date.now();

  if (blockedIPs.has(ip)) {
    res.status(403).json({
      error: "ACCESS DENIED",
      message: "Your IP has been blocked by M3R Security Engine.",
      legal: "Unauthorized access attempts are logged and reported. Legal action may follow under Indian IT Act 2000, Sections 43 & 66.",
      contact: "laksamy6@gmail.com",
    });
    return;
  }

  let visitor = visitors.get(ip);
  if (!visitor) {
    visitor = {
      ip,
      firstSeen: now,
      lastSeen: now,
      requestCount: 0,
      paths: [],
      suspiciousCount: 0,
      blocked: false,
      userAgent,
    };
    visitors.set(ip, visitor);
  }

  visitor.lastSeen = now;
  visitor.requestCount++;
  if (visitor.paths.length < 100) {
    visitor.paths.push(path);
  }

  if (checkRateLimit(ip)) {
    visitor.suspiciousCount += 3;
    const event: SecurityEvent = {
      type: "RATE_LIMITED",
      ip, path, userAgent,
      details: `Rate limit exceeded: ${rateLimitStore.get(ip)?.count} requests in 1 minute`,
      timestamp: now,
      severity: "HIGH",
    };
    logEvent(event);
    sendSecurityAlert(event);

    if (visitor.suspiciousCount >= BLOCK_THRESHOLD) {
      blockedIPs.add(ip);
      visitor.blocked = true;
    }

    res.status(429).json({
      error: "TOO MANY REQUESTS",
      message: "Rate limit exceeded. Your activity has been logged.",
      retryAfter: 60,
    });
    return;
  }

  const botTool = detectBot(userAgent);
  if (botTool) {
    visitor.suspiciousCount += 10;
    const event: SecurityEvent = {
      type: "BOT_DETECTED",
      ip, path, userAgent,
      details: `Hacking tool detected: ${botTool}`,
      timestamp: now,
      severity: "CRITICAL",
    };
    logEvent(event);
    sendSecurityAlert(event);
    blockedIPs.add(ip);
    visitor.blocked = true;

    res.status(403).json({
      error: "ACCESS DENIED",
      message: "Automated attack tool detected. IP logged and blocked permanently.",
      legal: "This incident has been reported. Legal proceedings under IT Act 2000 Section 66 may follow.",
    });
    return;
  }

  const exploit = detectExploit(path, query, body);
  if (exploit) {
    visitor.suspiciousCount += 5;
    const exploitType = exploit.match(/(select|insert|drop|delete|update)/i) ? "SQL_INJECTION" :
                        exploit.match(/(\.\.\/)/) ? "PATH_TRAVERSAL" : "EXPLOIT_ATTEMPT";
    const event: SecurityEvent = {
      type: exploitType as SecurityEvent["type"],
      ip, path, userAgent,
      details: `Exploit pattern detected: "${exploit}" in request`,
      timestamp: now,
      severity: "CRITICAL",
    };
    logEvent(event);
    sendSecurityAlert(event);

    if (visitor.suspiciousCount >= BLOCK_THRESHOLD / 2) {
      blockedIPs.add(ip);
      visitor.blocked = true;
    }

    res.status(403).json({
      error: "ATTACK BLOCKED",
      message: "Malicious payload detected and blocked. This attempt has been logged with full forensic data.",
      legal: "IP address, timestamp, and attack vector recorded. Report filed under Indian IT Act 2000.",
    });
    return;
  }

  if (isSuspiciousPath(path)) {
    visitor.suspiciousCount += 2;
    const event: SecurityEvent = {
      type: "SCAN_DETECTED",
      ip, path, userAgent,
      details: `Suspicious path access: ${path}`,
      timestamp: now,
      severity: visitor.suspiciousCount >= SCAN_THRESHOLD ? "HIGH" : "MEDIUM",
    };
    logEvent(event);
    sendSecurityAlert(event);

    if (visitor.suspiciousCount >= BLOCK_THRESHOLD) {
      blockedIPs.add(ip);
      visitor.blocked = true;
      res.status(403).json({
        error: "ACCESS DENIED",
        message: "Scanning activity detected. Your IP has been permanently blocked.",
      });
      return;
    }

    res.status(404).json({
      error: "NOT FOUND",
      message: "This path does not exist. Your access attempt has been logged.",
      system: "M3R Security Engine v1.0",
    });
    return;
  }

  next();
}

export function getSecurityStats() {
  const now = Date.now();
  const activeVisitors = Array.from(visitors.values()).filter(v => now - v.lastSeen < 3600000);
  const suspiciousVisitors = activeVisitors.filter(v => v.suspiciousCount > 0);
  const recentEvents = securityEvents.filter(e => now - e.timestamp < 3600000);

  return {
    totalVisitors: visitors.size,
    activeVisitors: activeVisitors.length,
    blockedIPs: blockedIPs.size,
    suspiciousVisitors: suspiciousVisitors.length,
    recentEvents: recentEvents.length,
    criticalEvents: recentEvents.filter(e => e.severity === "CRITICAL").length,
    topThreats: suspiciousVisitors
      .sort((a, b) => b.suspiciousCount - a.suspiciousCount)
      .slice(0, 10)
      .map(v => ({
        ip: v.ip,
        suspiciousCount: v.suspiciousCount,
        requestCount: v.requestCount,
        blocked: v.blocked,
        userAgent: v.userAgent.substring(0, 60),
        lastSeen: new Date(v.lastSeen).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      })),
    recentSecurityEvents: securityEvents
      .slice(-20)
      .reverse()
      .map(e => ({
        type: e.type,
        severity: e.severity,
        ip: e.ip,
        path: e.path,
        details: e.details,
        time: new Date(e.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      })),
    blockedIPList: Array.from(blockedIPs),
  };
}

export function registerSecurityRoutes(app: any): void {
  app.get("/api/security/status", (_req: Request, res: Response) => {
    res.json({
      engine: "M3R Security Engine v1.0",
      status: "ACTIVE",
      owner: "MANIKANDAN RAJENDRAN",
      ...getSecurityStats(),
    });
  });

  app.get("/api/security/events", (_req: Request, res: Response) => {
    const limit = parseInt((_req.query as any).limit || "50");
    res.json({
      events: securityEvents.slice(-limit).reverse(),
      total: securityEvents.length,
    });
  });

  app.post("/api/security/block", (req: Request, res: Response) => {
    const { ip } = req.body;
    if (!ip) return res.status(400).json({ error: "IP required" });
    blockedIPs.add(ip);
    const visitor = visitors.get(ip);
    if (visitor) visitor.blocked = true;
    res.json({ success: true, message: `IP ${ip} blocked`, totalBlocked: blockedIPs.size });
  });

  app.post("/api/security/unblock", (req: Request, res: Response) => {
    const { ip } = req.body;
    if (!ip) return res.status(400).json({ error: "IP required" });
    blockedIPs.delete(ip);
    const visitor = visitors.get(ip);
    if (visitor) visitor.blocked = false;
    res.json({ success: true, message: `IP ${ip} unblocked` });
  });
}

setInterval(() => {
  const now = Date.now();
  const cutoff = now - 24 * 60 * 60 * 1000;
  for (const [ip, visitor] of visitors) {
    if (visitor.lastSeen < cutoff && !visitor.blocked) {
      visitors.delete(ip);
    }
  }
  for (const [key, time] of recentAlerts) {
    if (now - time > 3600000) {
      recentAlerts.delete(key);
    }
  }
  for (const [ip, entry] of rateLimitStore) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(ip);
    }
  }
}, 300000);
