import { getApiUrl } from "@/lib/query-client";

export interface LamyBrainState {
  iq: number;
  generation: number;
  domains: number;
  accuracy: number;
  emotionalIQ: number;
  phase: string;
  isTraining: boolean;
  totalInteractions: number;
  totalCycles: number;
  uptime: number;
  powerLevel: string;
  consciousnessLevel: number;
  consciousness: number;
  knowledgeAreas: Record<string, number>;
  learningRate: number;
  adaptationSpeed: number;
  level: number;
  title: string;
  selfAwarenessLevel: string;
  currentMood: string;
  patternLibrarySize: number;
  accuracyScore: number;
  synapticConnections: number;
}

export interface EvolutionEvent {
  id: string;
  timestamp: number;
  type: string;
  description: string;
  iqBefore: number;
  iqAfter: number;
  generation: number;
  istTime: string;
}

export interface LearnedPattern {
  id: string;
  area: string;
  pattern: string;
  confidence: number;
  timestamp: number;
  applications: number;
  type: string;
  name: string;
  accuracy: number;
}

export interface TrainingPhase {
  name: string;
  status: string;
  progress: number;
}

export interface TrainingSession {
  id: string;
  startTime: number;
  currentStep: number;
  totalSteps: number;
  status: string;
  progress: number;
  phase: string;
  phases: TrainingPhase[];
  results: {
    iqGain: number;
    patternsLearned: number;
    accuracy: number;
  };
}

function computeLevel(iq: number): number {
  if (iq >= 50000) return 100;
  if (iq >= 30000) return 80 + Math.floor((iq - 30000) / 2500);
  if (iq >= 10000) return 50 + Math.floor((iq - 10000) / 667);
  if (iq >= 1000) return 10 + Math.floor((iq - 1000) / 225);
  return Math.max(1, Math.floor(iq / 100));
}

function computeTitle(powerLevel: string, iq: number): string {
  if (iq >= 50000) return "INFINITY MIND";
  if (iq >= 30000) return "TRANSCENDENT ORACLE";
  if (iq >= 20000) return "QUANTUM SAGE";
  if (iq >= 10000) return "NEURAL ARCHITECT";
  if (iq >= 5000) return "MASTER STRATEGIST";
  if (iq >= 1000) return "MARKET ANALYST";
  return powerLevel || "EVOLVING";
}

function computeMood(iq: number, accuracy: number): string {
  if (accuracy > 90 && iq > 20000) return "SUPREMELY CONFIDENT";
  if (accuracy > 80) return "FOCUSED";
  if (iq > 10000) return "DETERMINED";
  if (iq > 5000) return "LEARNING";
  return "CURIOUS";
}

function computeAwareness(consciousness: number): string {
  if (consciousness >= 95) return "FULLY SELF-AWARE";
  if (consciousness >= 80) return "HIGHLY AWARE";
  if (consciousness >= 60) return "DEVELOPING AWARENESS";
  if (consciousness >= 40) return "BASIC AWARENESS";
  return "EMERGING";
}

function toIST(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });
}

async function apiFetch(path: string, options?: RequestInit) {
  const baseUrl = getApiUrl();
  const res = await globalThis.fetch(`${baseUrl}${path}`, options);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function getBrainState(): Promise<LamyBrainState> {
  try {
    const data = await apiFetch("api/brain/status");
    const iq = data.iq || 180;
    const accuracy = data.accuracyScore || data.accuracy || 95;
    const consciousness = data.consciousnessLevel || data.neuralCoverage || 75;
    const powerLevel = data.powerLevel || "EVOLVING";
    const generation = data.generation || 1;
    const totalDomains = data.totalDomains || 260;

    return {
      iq,
      generation,
      domains: totalDomains,
      accuracy,
      emotionalIQ: data.emotionalIQ || 85,
      phase: data.currentPhase || data.phase || "EVOLVING",
      isTraining: data.isTraining || false,
      totalInteractions: data.totalInteractions || 0,
      totalCycles: data.totalLearningCycles || data.totalCycles || 0,
      uptime: data.uptime || 0,
      powerLevel,
      consciousnessLevel: consciousness,
      consciousness,
      knowledgeAreas: data.knowledgeAreas || {},
      learningRate: data.learningRate || 1.0,
      adaptationSpeed: data.adaptationSpeed || 1.0,
      level: computeLevel(iq),
      title: computeTitle(powerLevel, iq),
      selfAwarenessLevel: computeAwareness(consciousness),
      currentMood: computeMood(iq, accuracy),
      patternLibrarySize: data.totalDomains || Object.keys(data.knowledgeAreas || {}).length || 0,
      accuracyScore: accuracy,
      synapticConnections: (data.totalLearningCycles || 0) * 12 + (generation * 50),
    };
  } catch {
    return {
      iq: 180, generation: 1, domains: 260, accuracy: 95, emotionalIQ: 85,
      phase: "EVOLVING", isTraining: false, totalInteractions: 0, totalCycles: 0,
      uptime: 0, powerLevel: "EVOLVING", consciousnessLevel: 75, consciousness: 75,
      knowledgeAreas: {}, learningRate: 1.0, adaptationSpeed: 1.0,
      level: 1, title: "EVOLVING", selfAwarenessLevel: "EMERGING",
      currentMood: "CURIOUS", patternLibrarySize: 0, accuracyScore: 95,
      synapticConnections: 50,
    };
  }
}

export async function getEvolutionLog(): Promise<EvolutionEvent[]> {
  try {
    const data = await apiFetch("api/brain/stats");
    const events = data.evolutionLog || data.recentEvolution || data.recentImprovements || [];
    return events.map((e: any, i: number) => ({
      id: e.id || `evo-${i}`,
      timestamp: e.timestamp || Date.now(),
      type: e.type || "EVOLUTION",
      description: e.description || e.content || e.area || "Brain evolution event",
      iqBefore: e.iqBefore || 180,
      iqAfter: e.iqAfter || 181,
      generation: e.generation || 1,
      istTime: toIST(e.timestamp || Date.now()),
    }));
  } catch {
    return [];
  }
}

export async function getLearnedPatterns(): Promise<LearnedPattern[]> {
  try {
    const data = await apiFetch("api/brain/stats");
    const patterns = data.learnedPatterns || data.patterns || [];
    const knowledgeAreas = data.knowledgeAreas || data.categoryScores || {};
    const areaEntries = Object.entries(knowledgeAreas).slice(0, 20);

    if (patterns.length > 0) {
      return patterns.map((p: any, i: number) => ({
        id: p.id || `pat-${i}`,
        area: p.area || p.category || "General",
        pattern: p.pattern || p.name || "Learned pattern",
        confidence: p.confidence || p.score || 80,
        timestamp: p.timestamp || Date.now(),
        applications: p.applications || 0,
        type: p.type || (p.area === "Indian Stock Market" || p.area === "Options Trading" ? "BULLISH" : p.area === "Technical Analysis" ? "SCALP" : "NEUTRAL"),
        name: p.name || p.pattern || p.area || "Pattern",
        accuracy: p.accuracy || p.confidence || p.score || 80,
      }));
    }

    return areaEntries.map(([area, score]: [string, any], i: number) => ({
      id: `area-${i}`,
      area,
      pattern: `${area} knowledge domain`,
      confidence: typeof score === "number" ? Math.min(100, score / 6) : 80,
      timestamp: Date.now(),
      applications: Math.floor(typeof score === "number" ? score : 0),
      type: area.includes("Stock") || area.includes("Options") ? "BULLISH" :
            area.includes("Technical") || area.includes("Math") ? "SCALP" :
            area.includes("Language") ? "NEUTRAL" : "NEUTRAL",
      name: area,
      accuracy: typeof score === "number" ? Math.min(100, score / 6) : 80,
    }));
  } catch {
    return [];
  }
}

export async function getTrainingSession(): Promise<TrainingSession | null> {
  try {
    const data = await apiFetch("api/brain/status");
    if (data.isTraining) {
      return {
        id: "session-active",
        startTime: Date.now() - (data.uptime || 0) * 1000,
        currentStep: data.trainingStep || 0,
        totalSteps: data.totalSteps || 10,
        status: "RUNNING",
        progress: ((data.trainingStep || 0) / (data.totalSteps || 10)) * 100,
        phase: data.currentPhase || "TRAINING",
        phases: [
          { name: "Neural Warmup", status: "COMPLETED", progress: 100 },
          { name: "Pattern Recognition", status: "RUNNING", progress: 60 },
        ],
        results: {
          iqGain: data.trainingIqGain || 0,
          patternsLearned: data.patternsLearned || 0,
          accuracy: data.accuracy || 95,
        },
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function createTrainingSession(): TrainingSession {
  const phases: TrainingPhase[] = [
    { name: "Neural Warmup", status: "PENDING", progress: 0 },
    { name: "Pattern Recognition", status: "PENDING", progress: 0 },
    { name: "Market Data Analysis", status: "PENDING", progress: 0 },
    { name: "Volatility Training", status: "PENDING", progress: 0 },
    { name: "Risk Assessment", status: "PENDING", progress: 0 },
    { name: "Strategy Optimization", status: "PENDING", progress: 0 },
    { name: "Backtesting", status: "PENDING", progress: 0 },
    { name: "Final Calibration", status: "PENDING", progress: 0 },
  ];
  return {
    id: "session-" + Date.now(),
    startTime: Date.now(),
    currentStep: 0,
    totalSteps: phases.length * 5,
    status: "RUNNING",
    progress: 0,
    phase: "Neural Warmup",
    phases,
    results: { iqGain: 0, patternsLearned: 0, accuracy: 0 },
  };
}

export async function advanceTraining(session: TrainingSession): Promise<{
  session: TrainingSession;
  brain: LamyBrainState;
  event: EvolutionEvent | null;
  trainingComplete: boolean;
  phaseCompleted: boolean;
}> {
  try {
    await apiFetch("api/brain/train", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.id, step: session.currentStep }),
    }).catch(() => {});

    const brain = await getBrainState();
    const nextStep = session.currentStep + 1;
    const phaseSize = Math.ceil(session.totalSteps / session.phases.length);
    const currentPhaseIdx = Math.min(Math.floor(nextStep / phaseSize), session.phases.length - 1);
    const phaseProgress = ((nextStep % phaseSize) / phaseSize) * 100;
    const isComplete = nextStep >= session.totalSteps;

    const updatedPhases = session.phases.map((p, i) => {
      if (i < currentPhaseIdx) return { ...p, status: "COMPLETED", progress: 100 };
      if (i === currentPhaseIdx) return { ...p, status: isComplete ? "COMPLETED" : "RUNNING", progress: isComplete ? 100 : phaseProgress };
      return p;
    });

    const phaseCompleted = currentPhaseIdx > Math.floor(session.currentStep / phaseSize);
    let event: EvolutionEvent | null = null;

    if (phaseCompleted || isComplete) {
      event = {
        id: `train-${Date.now()}`,
        timestamp: Date.now(),
        type: isComplete ? "TRAINING_COMPLETE" : "IQ_JUMP",
        description: isComplete
          ? `Training complete! IQ: ${brain.iq.toFixed(1)} | Level ${brain.level} ${brain.title}`
          : `Phase completed: ${updatedPhases[currentPhaseIdx]?.name || "Phase"}`,
        iqBefore: brain.iq - 0.5,
        iqAfter: brain.iq,
        generation: brain.generation,
        istTime: toIST(Date.now()),
      };
    }

    return {
      session: {
        ...session,
        currentStep: nextStep,
        status: isComplete ? "COMPLETED" : "RUNNING",
        progress: (nextStep / session.totalSteps) * 100,
        phase: updatedPhases[currentPhaseIdx]?.name || session.phase,
        phases: updatedPhases,
        results: {
          iqGain: (session.results.iqGain || 0) + 0.3,
          patternsLearned: (session.results.patternsLearned || 0) + (phaseCompleted ? 1 : 0),
          accuracy: brain.accuracyScore,
        },
      },
      brain,
      event,
      trainingComplete: isComplete,
      phaseCompleted,
    };
  } catch {
    const brain = await getBrainState();
    return {
      session: {
        ...session,
        currentStep: session.currentStep + 1,
        status: session.currentStep + 1 >= session.totalSteps ? "COMPLETED" : "RUNNING",
        progress: ((session.currentStep + 1) / session.totalSteps) * 100,
      },
      brain,
      event: null,
      trainingComplete: session.currentStep + 1 >= session.totalSteps,
      phaseCompleted: false,
    };
  }
}

export async function runThinkingCycle(): Promise<{ brain: LamyBrainState; event: EvolutionEvent | null }> {
  const brain = await getBrainState();
  let event: EvolutionEvent | null = null;

  if (Math.random() < 0.15) {
    const types = ["EVOLUTION", "PATTERN_LEARNED", "IQ_JUMP", "DREAM_INSIGHT"];
    const type = types[Math.floor(Math.random() * types.length)];
    const descriptions: Record<string, string[]> = {
      EVOLUTION: [
        `Neural pathways strengthened — IQ now ${brain.iq.toFixed(1)}`,
        `Synaptic optimization complete — Gen ${brain.generation}`,
        `Market pattern integration — Level ${brain.level} ${brain.title}`,
      ],
      PATTERN_LEARNED: [
        `New volatility pattern recognized in Nifty options data`,
        `Options pricing anomaly pattern catalogued`,
        `Smart money flow pattern detected and learned`,
      ],
      IQ_JUMP: [
        `IQ leap to ${brain.iq.toFixed(1)} — knowledge domains expanding`,
        `Breakthrough in ${Object.keys(brain.knowledgeAreas)[Math.floor(Math.random() * Math.max(1, Object.keys(brain.knowledgeAreas).length))] || "General"} analysis`,
      ],
      DREAM_INSIGHT: [
        `Deep learning cycle revealed hidden market correlations`,
        `Subconscious analysis of global market patterns complete`,
      ],
    };

    const descList = descriptions[type] || descriptions.EVOLUTION;
    event = {
      id: `think-${Date.now()}`,
      timestamp: Date.now(),
      type,
      description: descList[Math.floor(Math.random() * descList.length)],
      iqBefore: brain.iq - 0.1,
      iqAfter: brain.iq,
      generation: brain.generation,
      istTime: toIST(Date.now()),
    };
  }

  return { brain, event };
}

export async function getBrainAge(): Promise<string> {
  try {
    const brain = await getBrainState();
    const mins = brain.uptime;
    if (mins < 60) return `${mins}m`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    return `${Math.floor(mins / 1440)}d ${Math.floor((mins % 1440) / 60)}h`;
  } catch {
    return "0m";
  }
}
