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
  knowledgeAreas: Record<string, number>;
  learningRate: number;
  adaptationSpeed: number;
}

export interface EvolutionEvent {
  id: string;
  timestamp: number;
  type: string;
  description: string;
  iqBefore: number;
  iqAfter: number;
  generation: number;
}

export interface LearnedPattern {
  id: string;
  area: string;
  pattern: string;
  confidence: number;
  timestamp: number;
  applications: number;
}

export interface TrainingSession {
  id: string;
  startTime: number;
  currentStep: number;
  totalSteps: number;
  status: "active" | "paused" | "completed";
  results: {
    iqGain: number;
    patternsLearned: number;
    accuracy: number;
  };
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
    return {
      iq: data.iq || data.brainState?.iq || 180,
      generation: data.generation || data.brainState?.generation || 1,
      domains: data.domains || data.brainState?.domains || 260,
      accuracy: data.accuracy || data.brainState?.accuracy || 95,
      emotionalIQ: data.emotionalIQ || data.brainState?.emotionalIQ || 85,
      phase: data.phase || data.brainState?.phase || "EVOLVING",
      isTraining: data.isTraining || false,
      totalInteractions: data.totalInteractions || data.brainState?.totalInteractions || 0,
      totalCycles: data.totalCycles || data.brainState?.totalCycles || 0,
      uptime: data.uptime || 0,
      powerLevel: data.powerLevel || data.brainState?.powerLevel || "EVOLVING",
      consciousnessLevel: data.consciousnessLevel || 75,
      knowledgeAreas: data.knowledgeAreas || data.brainState?.knowledgeAreas || {},
      learningRate: data.learningRate || data.brainState?.learningRate || 1.0,
      adaptationSpeed: data.adaptationSpeed || 1.0,
    };
  } catch {
    return {
      iq: 180,
      generation: 1,
      domains: 260,
      accuracy: 95,
      emotionalIQ: 85,
      phase: "EVOLVING",
      isTraining: false,
      totalInteractions: 0,
      totalCycles: 0,
      uptime: 0,
      powerLevel: "EVOLVING",
      consciousnessLevel: 75,
      knowledgeAreas: {},
      learningRate: 1.0,
      adaptationSpeed: 1.0,
    };
  }
}

export async function getEvolutionLog(): Promise<EvolutionEvent[]> {
  try {
    const data = await apiFetch("api/brain/stats");
    const events = data.evolutionLog || data.recentEvolution || [];
    return events.map((e: any, i: number) => ({
      id: e.id || `evo-${i}`,
      timestamp: e.timestamp || Date.now(),
      type: e.type || "evolution",
      description: e.description || e.content || "Brain evolution event",
      iqBefore: e.iqBefore || 180,
      iqAfter: e.iqAfter || 181,
      generation: e.generation || 1,
    }));
  } catch {
    return [];
  }
}

export async function getLearnedPatterns(): Promise<LearnedPattern[]> {
  try {
    const data = await apiFetch("api/brain/stats");
    const patterns = data.learnedPatterns || data.patterns || [];
    return patterns.map((p: any, i: number) => ({
      id: p.id || `pat-${i}`,
      area: p.area || p.category || "General",
      pattern: p.pattern || p.name || "Learned pattern",
      confidence: p.confidence || p.score || 80,
      timestamp: p.timestamp || Date.now(),
      applications: p.applications || 0,
    }));
  } catch {
    return [];
  }
}

export async function getTrainingSession(): Promise<TrainingSession | null> {
  try {
    const data = await apiFetch("api/brain/status");
    if (data.isTraining || data.brainState?.isTraining) {
      return {
        id: "session-active",
        startTime: Date.now() - (data.uptime || 0) * 1000,
        currentStep: data.trainingStep || 0,
        totalSteps: data.totalSteps || 10,
        status: "active",
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
  return {
    id: "session-" + Date.now(),
    startTime: Date.now(),
    currentStep: 0,
    totalSteps: 10,
    status: "active",
    results: {
      iqGain: 0,
      patternsLearned: 0,
      accuracy: 0,
    },
  };
}

export async function advanceTraining(session: TrainingSession): Promise<TrainingSession> {
  try {
    const data = await apiFetch("api/brain/train", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.id, step: session.currentStep }),
    });

    const nextStep = session.currentStep + 1;
    const isComplete = nextStep >= session.totalSteps;

    return {
      ...session,
      currentStep: nextStep,
      status: isComplete ? "completed" : "active",
      results: {
        iqGain: (session.results.iqGain || 0) + (data.iqGain || 0.5),
        patternsLearned: (session.results.patternsLearned || 0) + (data.patternsLearned || 1),
        accuracy: data.accuracy || session.results.accuracy,
      },
    };
  } catch {
    return {
      ...session,
      currentStep: session.currentStep + 1,
      status: session.currentStep + 1 >= session.totalSteps ? "completed" : "active",
      results: {
        ...session.results,
        iqGain: session.results.iqGain + 0.3,
        patternsLearned: session.results.patternsLearned + 1,
      },
    };
  }
}

export async function runThinkingCycle(): Promise<{ brain: LamyBrainState; event: EvolutionEvent }> {
  try {
    const data = await apiFetch("api/brain/train", { method: "POST" });
    const brain = await getBrainState();
    const event: EvolutionEvent = {
      id: "think-" + Date.now(),
      timestamp: Date.now(),
      type: "thinking",
      description: data.description || "Thinking cycle completed",
      iqBefore: brain.iq - 0.1,
      iqAfter: brain.iq,
      generation: brain.generation,
    };
    return { brain, event };
  } catch {
    const brain = await getBrainState();
    return {
      brain,
      event: {
        id: "think-" + Date.now(),
        timestamp: Date.now(),
        type: "thinking",
        description: "Neural processing cycle",
        iqBefore: brain.iq,
        iqAfter: brain.iq,
        generation: brain.generation,
      },
    };
  }
}

export async function getBrainAge(): Promise<string> {
  try {
    const data = await apiFetch("api/brain/status");
    const uptime = data.uptime || 0;
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  } catch {
    return "0m";
  }
}
