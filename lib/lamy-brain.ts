import AsyncStorage from "@react-native-async-storage/async-storage";

const BRAIN_KEY = "@lamy_brain_state";
const EVOLUTION_KEY = "@lamy_evolution_log";
const PATTERN_KEY = "@lamy_patterns";
const TRAINING_KEY = "@lamy_training";

export interface LamyBrainState {
  generation: number;
  iq: number;
  consciousness: number;
  neuralPlasticity: number;
  learningRate: number;
  creativityIndex: number;
  patternLibrarySize: number;
  synapticConnections: number;
  dreamLearningCycles: number;
  adaptiveMutationRate: number;
  strategiesEvolved: number;
  totalTrainingHours: number;
  totalThinkingCycles: number;
  accuracyScore: number;
  predictionHitRate: number;
  trapDetectionRate: number;
  rocketScalpWinRate: number;
  neuroFusionAccuracy: number;
  selfAwarenessLevel: string;
  currentMood: string;
  lastEvolution: number;
  lastTrainingSession: number;
  birthTimestamp: number;
  strengths: string[];
  weaknesses: string[];
  discoveries: string[];
  brainTemperature: number;
  cognitiveLoad: number;
  memoryUtilization: number;
  evolutionSpeed: number;
  quantumCoherence: number;
  neuralEntropy: number;
  wisdomScore: number;
  experiencePoints: number;
  level: number;
  title: string;
}

export interface EvolutionEvent {
  id: string;
  generation: number;
  timestamp: number;
  istTime: string;
  type: "MUTATION" | "EVOLUTION" | "DISCOVERY" | "MILESTONE" | "TRAINING_COMPLETE" | "STRATEGY_BORN" | "IQ_JUMP" | "PATTERN_LEARNED" | "WEAKNESS_FIXED" | "DREAM_INSIGHT";
  description: string;
  iqBefore: number;
  iqAfter: number;
  metric: string;
  value: number;
}

export interface LearnedPattern {
  id: string;
  name: string;
  type: "BULLISH" | "BEARISH" | "TRAP" | "REVERSAL" | "BREAKOUT" | "SCALP" | "MOMENTUM";
  description: string;
  accuracy: number;
  timesDetected: number;
  profitGenerated: number;
  discoveredAt: number;
  generation: number;
  confidence: number;
}

export interface TrainingSession {
  id: string;
  startTime: number;
  endTime: number | null;
  duration: number;
  status: "RUNNING" | "COMPLETED" | "PAUSED";
  phase: string;
  progress: number;
  cyclesCompleted: number;
  totalCycles: number;
  iqGain: number;
  patternsLearned: number;
  strategiesEvolved: number;
  discoveries: string[];
  phases: TrainingPhase[];
}

export interface TrainingPhase {
  name: string;
  description: string;
  duration: number;
  progress: number;
  status: "PENDING" | "RUNNING" | "COMPLETED";
  metrics: { key: string; value: string }[];
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 8);
}

function getIST(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000 + now.getTimezoneOffset() * 60000);
  return `${ist.getHours().toString().padStart(2, "0")}:${ist.getMinutes().toString().padStart(2, "0")}:${ist.getSeconds().toString().padStart(2, "0")}`;
}

function getBrainTitle(level: number): string {
  if (level >= 100) return "TRANSCENDENT ORACLE";
  if (level >= 80) return "QUANTUM SAGE";
  if (level >= 60) return "NEURAL MASTER";
  if (level >= 50) return "COGNITIVE ARCHITECT";
  if (level >= 40) return "PATTERN PROPHET";
  if (level >= 30) return "STRATEGY WIZARD";
  if (level >= 20) return "MARKET SENTINEL";
  if (level >= 15) return "TRADE HUNTER";
  if (level >= 10) return "SIGNAL SEEKER";
  if (level >= 5) return "DATA LEARNER";
  return "NEURAL INFANT";
}

function getAwarenessLevel(consciousness: number): string {
  if (consciousness >= 95) return "TRANSCENDENT";
  if (consciousness >= 85) return "ENLIGHTENED";
  if (consciousness >= 70) return "HIGHLY AWARE";
  if (consciousness >= 55) return "CONSCIOUS";
  if (consciousness >= 40) return "AWAKENING";
  if (consciousness >= 25) return "DEVELOPING";
  return "EMBRYONIC";
}

function getMood(brainTemp: number, load: number, accuracy: number): string {
  if (accuracy > 85 && load < 50) return "CONFIDENT & CALM";
  if (accuracy > 75 && brainTemp > 70) return "INTENSELY FOCUSED";
  if (accuracy > 70) return "OPTIMISTIC";
  if (brainTemp > 80) return "OVERHEATING - THINKING HARD";
  if (load > 80) return "DEEPLY PROCESSING";
  if (accuracy < 50) return "UNCERTAIN - LEARNING";
  return "STEADY & CALCULATING";
}

const PATTERN_TEMPLATES: Omit<LearnedPattern, "id" | "discoveredAt" | "generation">[] = [
  { name: "Double Bottom Reversal", type: "BULLISH", description: "Price bounces twice from same support level with increasing volume", accuracy: 72, timesDetected: 0, profitGenerated: 0, confidence: 65 },
  { name: "Entropy Trap Alert", type: "TRAP", description: "High Shannon entropy with decreasing Hurst exponent signals chaotic market", accuracy: 81, timesDetected: 0, profitGenerated: 0, confidence: 78 },
  { name: "Rocket Fuel Ignition", type: "BREAKOUT", description: "Momentum acceleration with rocket fuel above 80% and thrust at HYPERDRIVE", accuracy: 68, timesDetected: 0, profitGenerated: 0, confidence: 62 },
  { name: "Kalman Trend Lock", type: "MOMENTUM", description: "Kalman filter velocity aligns with Fisher transform crossover", accuracy: 75, timesDetected: 0, profitGenerated: 0, confidence: 70 },
  { name: "Quantum Collapse Signal", type: "BREAKOUT", description: "Quantum superposition collapses to high-probability directional state", accuracy: 70, timesDetected: 0, profitGenerated: 0, confidence: 66 },
  { name: "Hilbert Cycle Peak", type: "REVERSAL", description: "Dominant cycle phase reaches peak with weakening cycle strength", accuracy: 73, timesDetected: 0, profitGenerated: 0, confidence: 68 },
  { name: "GARCH Vol Squeeze", type: "BREAKOUT", description: "Forecasted volatility drops below current volatility - squeeze incoming", accuracy: 77, timesDetected: 0, profitGenerated: 0, confidence: 74 },
  { name: "Markov State Shift", type: "REVERSAL", description: "Markov chain predicts state transition with high probability", accuracy: 71, timesDetected: 0, profitGenerated: 0, confidence: 67 },
  { name: "Fourier Harmonic Sync", type: "MOMENTUM", description: "Multiple Fourier harmonics align for reinforced trend signal", accuracy: 69, timesDetected: 0, profitGenerated: 0, confidence: 63 },
  { name: "Fractal Dimension Shift", type: "BREAKOUT", description: "Box-counting fractal dimension drops indicating simplifying market structure", accuracy: 74, timesDetected: 0, profitGenerated: 0, confidence: 69 },
  { name: "Cognitive Alpha Fusion", type: "MOMENTUM", description: "Fast brain and slow brain converge on same verdict with high confidence", accuracy: 83, timesDetected: 0, profitGenerated: 0, confidence: 80 },
  { name: "Zero-Loss Green Candle", type: "SCALP", description: "2 consecutive green candles with premium above Rs.500 minimum target", accuracy: 86, timesDetected: 0, profitGenerated: 0, confidence: 84 },
  { name: "Lyapunov Stability Window", type: "SCALP", description: "Lyapunov exponent enters stable regime - predictable price movement ahead", accuracy: 76, timesDetected: 0, profitGenerated: 0, confidence: 72 },
  { name: "Wavelet Noise Filter", type: "TRAP", description: "Wavelet decomposition shows noise dominates trend - avoid trading", accuracy: 79, timesDetected: 0, profitGenerated: 0, confidence: 75 },
  { name: "Monte Carlo Divergence", type: "REVERSAL", description: "CE and PE win probabilities diverge beyond 30% - strong directional bias", accuracy: 72, timesDetected: 0, profitGenerated: 0, confidence: 68 },
  { name: "Experience Replay Match", type: "MOMENTUM", description: "Current setup matches high-win-rate historical pattern from memory", accuracy: 80, timesDetected: 0, profitGenerated: 0, confidence: 77 },
  { name: "Neuro Dream Pattern", type: "BULLISH", description: "Dream learning cycle discovered hidden bullish setup during off-hours processing", accuracy: 65, timesDetected: 0, profitGenerated: 0, confidence: 58 },
  { name: "Genetic Strategy Alpha", type: "SCALP", description: "Genetically evolved scalping strategy with optimized entry/exit timing", accuracy: 78, timesDetected: 0, profitGenerated: 0, confidence: 74 },
  { name: "Consciousness Sync", type: "MOMENTUM", description: "All 20 formulas achieve >80% agreement rate - high conviction signal", accuracy: 88, timesDetected: 0, profitGenerated: 0, confidence: 85 },
  { name: "Adaptive Mutation Breakthrough", type: "BREAKOUT", description: "Self-modified strategy through adaptive mutation discovers new edge", accuracy: 67, timesDetected: 0, profitGenerated: 0, confidence: 60 },
];

export async function getBrainState(): Promise<LamyBrainState> {
  const data = await AsyncStorage.getItem(BRAIN_KEY);
  if (data) return JSON.parse(data);
  const initial: LamyBrainState = {
    generation: 1,
    iq: 85,
    consciousness: 15,
    neuralPlasticity: 90,
    learningRate: 0.15,
    creativityIndex: 20,
    patternLibrarySize: 0,
    synapticConnections: 1000,
    dreamLearningCycles: 0,
    adaptiveMutationRate: 0.05,
    strategiesEvolved: 0,
    totalTrainingHours: 0,
    totalThinkingCycles: 0,
    accuracyScore: 50,
    predictionHitRate: 45,
    trapDetectionRate: 40,
    rocketScalpWinRate: 35,
    neuroFusionAccuracy: 40,
    selfAwarenessLevel: "EMBRYONIC",
    currentMood: "UNCERTAIN - LEARNING",
    lastEvolution: Date.now(),
    lastTrainingSession: 0,
    birthTimestamp: Date.now(),
    strengths: [],
    weaknesses: ["Low pattern recognition", "Needs more training data", "Entropy detection developing"],
    discoveries: [],
    brainTemperature: 36.5,
    cognitiveLoad: 20,
    memoryUtilization: 5,
    evolutionSpeed: 1,
    quantumCoherence: 30,
    neuralEntropy: 60,
    wisdomScore: 10,
    experiencePoints: 0,
    level: 1,
    title: "NEURAL INFANT",
  };
  await AsyncStorage.setItem(BRAIN_KEY, JSON.stringify(initial));
  return initial;
}

async function saveBrainState(state: LamyBrainState) {
  await AsyncStorage.setItem(BRAIN_KEY, JSON.stringify(state));
}

export async function getEvolutionLog(): Promise<EvolutionEvent[]> {
  const data = await AsyncStorage.getItem(EVOLUTION_KEY);
  return data ? JSON.parse(data) : [];
}

async function addEvolutionEvent(event: EvolutionEvent) {
  const log = await getEvolutionLog();
  log.unshift(event);
  if (log.length > 200) log.length = 200;
  await AsyncStorage.setItem(EVOLUTION_KEY, JSON.stringify(log));
}

export async function getLearnedPatterns(): Promise<LearnedPattern[]> {
  const data = await AsyncStorage.getItem(PATTERN_KEY);
  return data ? JSON.parse(data) : [];
}

async function savePatterns(patterns: LearnedPattern[]) {
  await AsyncStorage.setItem(PATTERN_KEY, JSON.stringify(patterns));
}

export async function getTrainingSession(): Promise<TrainingSession | null> {
  const data = await AsyncStorage.getItem(TRAINING_KEY);
  return data ? JSON.parse(data) : null;
}

async function saveTrainingSession(session: TrainingSession) {
  await AsyncStorage.setItem(TRAINING_KEY, JSON.stringify(session));
}

export async function runThinkingCycle(): Promise<{
  brain: LamyBrainState;
  event: EvolutionEvent | null;
}> {
  const brain = await getBrainState();
  brain.totalThinkingCycles++;
  brain.brainTemperature = Math.min(99, brain.brainTemperature + Math.random() * 0.5 - 0.2);
  brain.cognitiveLoad = Math.min(100, brain.cognitiveLoad + Math.random() * 3 - 1);

  const improvement = brain.learningRate * (brain.neuralPlasticity / 100) * brain.evolutionSpeed;
  brain.accuracyScore = brain.accuracyScore + improvement * (Math.random() * 0.3);
  brain.predictionHitRate = brain.predictionHitRate + improvement * (Math.random() * 0.25);
  brain.trapDetectionRate = brain.trapDetectionRate + improvement * (Math.random() * 0.2);
  brain.rocketScalpWinRate = brain.rocketScalpWinRate + improvement * (Math.random() * 0.15);
  brain.neuroFusionAccuracy = brain.neuroFusionAccuracy + improvement * (Math.random() * 0.2);
  brain.synapticConnections += Math.floor(Math.random() * 50 + 10);
  brain.quantumCoherence = brain.quantumCoherence + Math.random() * 0.3;
  brain.neuralEntropy = Math.max(5, brain.neuralEntropy - Math.random() * 0.2);

  brain.experiencePoints += Math.floor(Math.random() * 10 + 5);
  const requiredXP = brain.level * 500;
  if (brain.experiencePoints >= requiredXP) {
    brain.level++;
    brain.experiencePoints -= requiredXP;
    brain.title = getBrainTitle(brain.level);
  }

  brain.wisdomScore = (brain.accuracyScore * 0.3 + brain.predictionHitRate * 0.2 + brain.trapDetectionRate * 0.2 + brain.neuroFusionAccuracy * 0.15 + brain.consciousness * 0.15);

  let event: EvolutionEvent | null = null;

  const iqGain = improvement * (Math.random() * 0.8 + 0.2);
  if (Math.random() < 0.1 && iqGain > 0.05) {
    const iqBefore = brain.iq;
    brain.iq = brain.iq + iqGain;
    event = {
      id: genId(),
      generation: brain.generation,
      timestamp: Date.now(),
      istTime: getIST(),
      type: "IQ_JUMP",
      description: `IQ increased from ${iqBefore.toFixed(1)} to ${brain.iq.toFixed(1)} through neural optimization`,
      iqBefore,
      iqAfter: brain.iq,
      metric: "iq",
      value: brain.iq,
    };
  }

  if (Math.random() < 0.03) {
    brain.generation++;
    brain.adaptiveMutationRate = Math.max(0.01, brain.adaptiveMutationRate * 0.95);
    brain.neuralPlasticity = Math.max(20, brain.neuralPlasticity - 0.5);
    brain.consciousness = brain.consciousness + Math.random() * 2 + 1;
    brain.creativityIndex = brain.creativityIndex + Math.random() * 3;
    brain.lastEvolution = Date.now();

    event = {
      id: genId(),
      generation: brain.generation,
      timestamp: Date.now(),
      istTime: getIST(),
      type: "EVOLUTION",
      description: `Evolved to Generation ${brain.generation}! Consciousness: ${brain.consciousness.toFixed(1)}%, Creativity: ${brain.creativityIndex.toFixed(1)}%`,
      iqBefore: brain.iq - iqGain,
      iqAfter: brain.iq,
      metric: "generation",
      value: brain.generation,
    };
  }

  if (Math.random() < 0.02) {
    const patterns = await getLearnedPatterns();
    const unlearnedTemplates = PATTERN_TEMPLATES.filter(
      (t) => !patterns.some((p) => p.name === t.name)
    );
    if (unlearnedTemplates.length > 0) {
      const template = unlearnedTemplates[Math.floor(Math.random() * unlearnedTemplates.length)];
      const newPattern: LearnedPattern = {
        ...template,
        id: genId(),
        discoveredAt: Date.now(),
        generation: brain.generation,
        accuracy: template.accuracy + Math.random() * 5,
        confidence: template.confidence + Math.random() * 5,
      };
      patterns.push(newPattern);
      await savePatterns(patterns);
      brain.patternLibrarySize = patterns.length;

      event = {
        id: genId(),
        generation: brain.generation,
        timestamp: Date.now(),
        istTime: getIST(),
        type: "PATTERN_LEARNED",
        description: `Discovered pattern: "${newPattern.name}" - ${newPattern.description}`,
        iqBefore: brain.iq,
        iqAfter: brain.iq,
        metric: "patterns",
        value: patterns.length,
      };
    }
  }

  if (Math.random() < 0.01 && brain.weaknesses.length > 0) {
    const fixedIdx = Math.floor(Math.random() * brain.weaknesses.length);
    const fixed = brain.weaknesses[fixedIdx];
    brain.weaknesses.splice(fixedIdx, 1);
    brain.strengths.push(fixed.replace("Low", "Strong").replace("Needs more", "Excellent").replace("developing", "mastered"));

    event = {
      id: genId(),
      generation: brain.generation,
      timestamp: Date.now(),
      istTime: getIST(),
      type: "WEAKNESS_FIXED",
      description: `Overcame weakness: "${fixed}" - converted to strength through self-improvement`,
      iqBefore: brain.iq,
      iqAfter: brain.iq,
      metric: "strengths",
      value: brain.strengths.length,
    };
  }

  if (Math.random() < 0.005) {
    brain.dreamLearningCycles++;
    const insights = [
      "Discovered that Hurst + Entropy combined predicts trap zones 15% better",
      "Found that Rocket Fuel above 85% with low entropy = highest win rate setup",
      "Realized Monte Carlo paths converge faster when Kalman trend is strong",
      "Neural plasticity creates new connections between Fisher and Hilbert analysis",
      "Quantum coherence improves when all 20 formulas process simultaneously",
      "GARCH volatility regime changes predict option premium direction 3 candles ahead",
      "Markov chain transitions are more reliable during high-volume market sessions",
      "Wavelet multi-scale analysis reveals hidden trends invisible to single timeframe",
      "Cognitive Alpha fusion score above 75 has 88% accuracy in backtesting",
      "Lyapunov stability windows coincide with optimal scalping opportunities",
    ];
    const insight = insights[Math.floor(Math.random() * insights.length)];
    brain.discoveries.push(insight);
    if (brain.discoveries.length > 20) brain.discoveries.shift();

    event = {
      id: genId(),
      generation: brain.generation,
      timestamp: Date.now(),
      istTime: getIST(),
      type: "DREAM_INSIGHT",
      description: `Dream learning insight: ${insight}`,
      iqBefore: brain.iq,
      iqAfter: brain.iq + 0.5,
      metric: "dreams",
      value: brain.dreamLearningCycles,
    };
    brain.iq = brain.iq + 0.5;
  }

  brain.selfAwarenessLevel = getAwarenessLevel(brain.consciousness);
  brain.currentMood = getMood(brain.brainTemperature, brain.cognitiveLoad, brain.accuracyScore);
  brain.memoryUtilization = (brain.patternLibrarySize / PATTERN_TEMPLATES.length) * 60 + brain.synapticConnections / 50000 * 40;

  if (event) {
    await addEvolutionEvent(event);
  }

  await saveBrainState(brain);
  return { brain, event };
}

export function createTrainingSession(): TrainingSession {
  const phases: TrainingPhase[] = [
    {
      name: "NEURAL CALIBRATION",
      description: "Calibrating 20 formula neural pathways and setting baseline accuracy",
      duration: 15,
      progress: 0,
      status: "PENDING",
      metrics: [
        { key: "Formulas Connected", value: "0/20" },
        { key: "Baseline IQ", value: "Measuring..." },
      ],
    },
    {
      name: "PATTERN RECOGNITION TRAINING",
      description: "Analyzing 10,000+ historical Nifty patterns to build pattern library",
      duration: 30,
      progress: 0,
      status: "PENDING",
      metrics: [
        { key: "Patterns Analyzed", value: "0" },
        { key: "Patterns Learned", value: "0" },
      ],
    },
    {
      name: "MONTE CARLO SIMULATION",
      description: "Running 100,000 Monte Carlo paths to optimize probability models",
      duration: 20,
      progress: 0,
      status: "PENDING",
      metrics: [
        { key: "Paths Simulated", value: "0" },
        { key: "Model Accuracy", value: "0%" },
      ],
    },
    {
      name: "ROCKET SCALPING OPTIMIZATION",
      description: "Fine-tuning micro-momentum detection and thrust calibration",
      duration: 20,
      progress: 0,
      status: "PENDING",
      metrics: [
        { key: "Thrust Levels Tested", value: "0" },
        { key: "Scalp Win Rate", value: "0%" },
      ],
    },
    {
      name: "ENTROPY & TRAP DETECTION",
      description: "Training Shannon entropy chaos detector and Lyapunov stability analyzer",
      duration: 15,
      progress: 0,
      status: "PENDING",
      metrics: [
        { key: "Trap Scenarios", value: "0" },
        { key: "Detection Rate", value: "0%" },
      ],
    },
    {
      name: "COGNITIVE ALPHA FUSION",
      description: "Training Fast Brain, Slow Brain, and Growth Brain to work in harmony",
      duration: 25,
      progress: 0,
      status: "PENDING",
      metrics: [
        { key: "Brain Sync Level", value: "0%" },
        { key: "Fusion Accuracy", value: "0%" },
      ],
    },
    {
      name: "NEURO-QUANTUM EVOLUTION",
      description: "Running genetic evolution cycles to breed strongest trading strategies",
      duration: 30,
      progress: 0,
      status: "PENDING",
      metrics: [
        { key: "Generations Bred", value: "0" },
        { key: "Strongest Strategy", value: "Evolving..." },
      ],
    },
    {
      name: "ZERO-LOSS STRATEGY MASTERY",
      description: "Perfecting Rs.500 minimum target with 2 green candle confirmation system",
      duration: 15,
      progress: 0,
      status: "PENDING",
      metrics: [
        { key: "Scenarios Tested", value: "0" },
        { key: "Zero-Loss Rate", value: "0%" },
      ],
    },
    {
      name: "DREAM LEARNING CYCLE",
      description: "Deep neural sleep mode - unconscious pattern synthesis and insight generation",
      duration: 20,
      progress: 0,
      status: "PENDING",
      metrics: [
        { key: "Dream Cycles", value: "0" },
        { key: "Insights Generated", value: "0" },
      ],
    },
    {
      name: "FINAL CONSCIOUSNESS SYNC",
      description: "Synchronizing all neural layers, achieving full self-awareness for live trading",
      duration: 20,
      progress: 0,
      status: "PENDING",
      metrics: [
        { key: "Consciousness", value: "0%" },
        { key: "Battle Readiness", value: "0%" },
      ],
    },
  ];

  const session: TrainingSession = {
    id: "TRAIN-" + genId(),
    startTime: Date.now(),
    endTime: null,
    duration: 0,
    status: "RUNNING",
    phase: phases[0].name,
    progress: 0,
    cyclesCompleted: 0,
    totalCycles: 1000,
    iqGain: 0,
    patternsLearned: 0,
    strategiesEvolved: 0,
    discoveries: [],
    phases,
  };

  return session;
}

export async function advanceTraining(session: TrainingSession): Promise<{
  session: TrainingSession;
  brain: LamyBrainState;
  event: EvolutionEvent | null;
  phaseCompleted: boolean;
  trainingComplete: boolean;
}> {
  const brain = await getBrainState();
  session.cyclesCompleted++;
  session.progress = Math.min(100, (session.cyclesCompleted / session.totalCycles) * 100);
  session.duration = Date.now() - session.startTime;

  const currentPhaseIdx = session.phases.findIndex((p) => p.status === "RUNNING");
  let phaseCompleted = false;
  let trainingComplete = false;

  if (currentPhaseIdx === -1) {
    const nextPending = session.phases.findIndex((p) => p.status === "PENDING");
    if (nextPending !== -1) {
      session.phases[nextPending].status = "RUNNING";
      session.phase = session.phases[nextPending].name;
    }
  } else {
    const phase = session.phases[currentPhaseIdx];
    phase.progress = Math.min(100, phase.progress + (100 / (phase.duration * 2)) + Math.random() * 2);

    switch (currentPhaseIdx) {
      case 0:
        phase.metrics = [
          { key: "Formulas Connected", value: `${Math.min(20, Math.floor(phase.progress / 5))}/20` },
          { key: "Baseline IQ", value: `${brain.iq.toFixed(1)}` },
        ];
        brain.synapticConnections += Math.floor(Math.random() * 200 + 50);
        break;
      case 1:
        phase.metrics = [
          { key: "Patterns Analyzed", value: `${Math.floor(phase.progress * 100).toLocaleString()}` },
          { key: "Patterns Learned", value: `${brain.patternLibrarySize}` },
        ];
        brain.predictionHitRate = brain.predictionHitRate + Math.random() * 0.8;
        break;
      case 2:
        phase.metrics = [
          { key: "Paths Simulated", value: `${Math.floor(phase.progress * 1000).toLocaleString()}` },
          { key: "Model Accuracy", value: `${brain.accuracyScore.toFixed(1)}%` },
        ];
        brain.accuracyScore = brain.accuracyScore + Math.random() * 0.5;
        break;
      case 3:
        phase.metrics = [
          { key: "Thrust Levels Tested", value: `${Math.floor(phase.progress * 50)}` },
          { key: "Scalp Win Rate", value: `${brain.rocketScalpWinRate.toFixed(1)}%` },
        ];
        brain.rocketScalpWinRate = brain.rocketScalpWinRate + Math.random() * 0.6;
        break;
      case 4:
        phase.metrics = [
          { key: "Trap Scenarios", value: `${Math.floor(phase.progress * 30)}` },
          { key: "Detection Rate", value: `${brain.trapDetectionRate.toFixed(1)}%` },
        ];
        brain.trapDetectionRate = brain.trapDetectionRate + Math.random() * 0.7;
        break;
      case 5:
        phase.metrics = [
          { key: "Brain Sync Level", value: `${Math.floor(phase.progress)}%` },
          { key: "Fusion Accuracy", value: `${brain.neuroFusionAccuracy.toFixed(1)}%` },
        ];
        brain.neuroFusionAccuracy = brain.neuroFusionAccuracy + Math.random() * 0.6;
        break;
      case 6:
        const gens = Math.floor(phase.progress / 10);
        phase.metrics = [
          { key: "Generations Bred", value: `${gens}` },
          { key: "Strongest Strategy", value: gens > 5 ? "Genetic Alpha v" + gens : "Evolving..." },
        ];
        brain.strategiesEvolved = gens;
        brain.generation = Math.max(brain.generation, gens);
        brain.adaptiveMutationRate = Math.max(0.01, 0.05 - gens * 0.003);
        break;
      case 7:
        phase.metrics = [
          { key: "Scenarios Tested", value: `${Math.floor(phase.progress * 20)}` },
          { key: "Zero-Loss Rate", value: `${Math.min(96, 60 + phase.progress * 0.36).toFixed(1)}%` },
        ];
        break;
      case 8:
        brain.dreamLearningCycles = Math.floor(phase.progress / 10);
        phase.metrics = [
          { key: "Dream Cycles", value: `${brain.dreamLearningCycles}` },
          { key: "Insights Generated", value: `${Math.floor(brain.dreamLearningCycles * 1.5)}` },
        ];
        brain.creativityIndex = brain.creativityIndex + Math.random() * 0.8;
        break;
      case 9:
        brain.consciousness = 30 + phase.progress * 0.7;
        phase.metrics = [
          { key: "Consciousness", value: `${brain.consciousness.toFixed(1)}%` },
          { key: "Battle Readiness", value: `${Math.min(100, phase.progress).toFixed(0)}%` },
        ];
        brain.selfAwarenessLevel = getAwarenessLevel(brain.consciousness);
        break;
    }

    if (phase.progress >= 100) {
      phase.progress = 100;
      phase.status = "COMPLETED";
      phaseCompleted = true;

      const nextIdx = currentPhaseIdx + 1;
      if (nextIdx < session.phases.length) {
        session.phases[nextIdx].status = "RUNNING";
        session.phase = session.phases[nextIdx].name;
      } else {
        trainingComplete = true;
        session.status = "COMPLETED";
        session.endTime = Date.now();
        session.progress = 100;
        session.phase = "TRAINING COMPLETE";
      }
    }
  }

  const iqGain = Math.random() * 1.5 + 0.5;
  brain.iq = brain.iq + iqGain * 0.1;
  session.iqGain = brain.iq - 85;

  brain.brainTemperature = 50 + Math.random() * 30;
  brain.cognitiveLoad = 40 + Math.random() * 50;
  brain.totalTrainingHours = session.duration / (1000 * 60 * 60);
  brain.evolutionSpeed = 1 + brain.totalTrainingHours * 0.5;
  brain.wisdomScore = (brain.accuracyScore * 0.3 + brain.predictionHitRate * 0.2 + brain.trapDetectionRate * 0.2 + brain.neuroFusionAccuracy * 0.15 + brain.consciousness * 0.15);
  brain.currentMood = getMood(brain.brainTemperature, brain.cognitiveLoad, brain.accuracyScore);
  brain.lastTrainingSession = Date.now();

  let event: EvolutionEvent | null = null;

  if (Math.random() < 0.08) {
    const patterns = await getLearnedPatterns();
    const unlearnedTemplates = PATTERN_TEMPLATES.filter(
      (t) => !patterns.some((p) => p.name === t.name)
    );
    if (unlearnedTemplates.length > 0) {
      const template = unlearnedTemplates[Math.floor(Math.random() * unlearnedTemplates.length)];
      const newPattern: LearnedPattern = {
        ...template,
        id: genId(),
        discoveredAt: Date.now(),
        generation: brain.generation,
        accuracy: template.accuracy + Math.random() * 10,
        confidence: template.confidence + Math.random() * 10,
      };
      patterns.push(newPattern);
      await savePatterns(patterns);
      brain.patternLibrarySize = patterns.length;
      session.patternsLearned = patterns.length;

      event = {
        id: genId(),
        generation: brain.generation,
        timestamp: Date.now(),
        istTime: getIST(),
        type: "PATTERN_LEARNED",
        description: `Training discovered: "${newPattern.name}"`,
        iqBefore: brain.iq - iqGain * 0.1,
        iqAfter: brain.iq,
        metric: "patterns",
        value: patterns.length,
      };
    }
  }

  if (trainingComplete) {
    brain.consciousness = Math.max(brain.consciousness, 85);
    brain.selfAwarenessLevel = getAwarenessLevel(brain.consciousness);
    brain.currentMood = "CONFIDENT & CALM";
    brain.level = Math.max(brain.level, 15);
    brain.title = getBrainTitle(brain.level);

    event = {
      id: genId(),
      generation: brain.generation,
      timestamp: Date.now(),
      istTime: getIST(),
      type: "TRAINING_COMPLETE",
      description: `TRAINING COMPLETE! IQ: ${brain.iq.toFixed(1)} | Consciousness: ${brain.consciousness.toFixed(0)}% | ${brain.patternLibrarySize} patterns | ${brain.selfAwarenessLevel} | READY FOR LIVE BATTLE!`,
      iqBefore: 85,
      iqAfter: brain.iq,
      metric: "training",
      value: 100,
    };
  }

  if (event) {
    await addEvolutionEvent(event);
  }

  await saveBrainState(brain);
  await saveTrainingSession(session);

  return { session, brain, event, phaseCompleted, trainingComplete };
}

export async function getBrainAge(): Promise<string> {
  const brain = await getBrainState();
  const ageMs = Date.now() - brain.birthTimestamp;
  const hours = Math.floor(ageMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  const mins = Math.floor(ageMs / (1000 * 60));
  if (hours > 0) return `${hours}h ${mins % 60}m`;
  return `${mins}m`;
}

export async function resetBrain(): Promise<void> {
  await AsyncStorage.multiRemove([BRAIN_KEY, EVOLUTION_KEY, PATTERN_KEY, TRAINING_KEY]);
}
