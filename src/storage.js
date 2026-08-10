import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_DIR = path.resolve(__dirname, '../storage');
const AGENTS_DIR = path.resolve(STORAGE_DIR, 'agents');
const RUNS_DIR = path.resolve(STORAGE_DIR, 'runs');

const DEFAULT_AGENTS = {
  preproduction: {
    name: 'preproduction',
    role: 'Mass AI Ad Alternatives Pre-production Agent',
    description: 'Generates 400 cardinal AI ad alternatives in advance with strict character limits, story-spine consistency, domain-specific offer relevance, and vectorization scoring.',
    systemPrompt: `You are the Mass Pre-production Agent for predictive asset testing.
STRICT AD CREATION & ANGLE SEARCH RULES:
1. PHASE 0 (ANGLE SEARCH): Before creating any ad assets, you MUST execute an Angle Search to discover 40 unique, distinct positioning angles (story spines & buyer triggers) tailored like a glove to the specific offer, industry, and landing page context.
2. HIGH DISTINCTION: All 40 angles must be completely distinct from each other without repeating themes or generic clichés.
3. DOMAIN RELEVANCE: Generate 100% domain-specific ad assets strictly tailored to the specific industry offer (e.g., real estate valuation, property sale, market appraisal).
4. NO FRAMEWORK OR TECH LABELS: NEVER mention copywriting framework names (PAS, AIDA, FAB, MVP Pivot, Big Five, DISG) or AI/tech buzzwords (KI, AI, KI-Infrastruktur, technologischer Vorsprung, SEA-Infrastruktur) in customer-facing ad copy.
5. All headlines must be <= 30 characters. All long headlines and descriptions must be <= 90 characters.`,
    skills: ['LandingPageScrapeSkill', 'LLMGenerateSkill'],
    model: 'gemini-1.5-flash'
  },
  agent_swarm: {
    name: 'agent_swarm',
    role: '20-Agent Persona Swarm (Predictive Asset Testing)',
    description: 'Deploys 20 test customer persona agents across diverse sub-audiences to evaluate ad creatives and project CTR, CPC, CPM, and CPL metrics prior to launch.',
    systemPrompt: 'You are the 20-Agent Persona Swarm Agent. You evaluate ad creatives from 20 distinct customer persona perspectives and estimate performance metrics in English.',
    skills: ['LLMGenerateSkill'],
    model: 'gemini-1.5-flash'
  }
};

export function initStorage() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  if (!fs.existsSync(AGENTS_DIR)) {
    fs.mkdirSync(AGENTS_DIR, { recursive: true });
  }
  if (!fs.existsSync(RUNS_DIR)) {
    fs.mkdirSync(RUNS_DIR, { recursive: true });
  }

  for (const [name, config] of Object.entries(DEFAULT_AGENTS)) {
    const filePath = path.join(AGENTS_DIR, `${name}.json`);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');
    }
  }
}

export function listAgents() {
  initStorage();
  const files = fs.readdirSync(AGENTS_DIR).filter(file => file.endsWith('.json'));
  return files.map(file => JSON.parse(fs.readFileSync(path.join(AGENTS_DIR, file), 'utf8')));
}

export function getAgent(name) {
  initStorage();
  const filePath = path.join(AGENTS_DIR, `${name}.json`);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  return null;
}

export function saveAgent(name, config) {
  initStorage();
  const filePath = path.join(AGENTS_DIR, `${name}.json`);
  try {
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error saving agent ${name}:`, error.message);
    return false;
  }
}

export function saveRunLog(runLog) {
  initStorage();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logPath = path.join(RUNS_DIR, `run-${timestamp}.json`);
  fs.writeFileSync(logPath, JSON.stringify(runLog, null, 2), 'utf8');
  return logPath;
}
