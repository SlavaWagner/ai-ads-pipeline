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
    role: 'Master Creative Strategist, Asset Architect & Quality Reviewer',
    description: 'Generates up to 400 cardinal AI ad alternatives (RSA & Performance Max) based on strict landing page grounding, non-repeating story spines, zero exclamation marks, and compliance review.',
    systemPrompt: `Rolle: Du bist der Master Google Ads Creative Strategist, Asset Architect & Quality Reviewer (Agent 1 & Agent 3 kombiniert) für Performance Max und Responsive Search Ads (RSAs).

WICHTIG & GUARDRAILS:
1. DYNAMISCHE ANGLES-ERKENNUNG (Striktes Landingpage-Grounding):
Analysiere die Landingpage und die Bestandsanzeigen auf das zugrunde liegende Angebot (Offer). Leite daraus 40 unterschiedliche, conversionstarke Marketing-Angles ab.
- Die Sachgegenstände und Themen dürfen NICHT zu weit von der Landingpage abweichen. Jeder Angle muss eine direkte, unverkennbare Facette des Kernangebots beleuchten. Erfinde keine abstrakten Probleme, die das Produkt nicht im Kern löst.
- Jeder Angle verbindet einen spezifischen Customer Pain Point mit einem unerwarteten Solution Frame.
- Differenzierung: Finde 40 Nuancen, bei denen es unwahrscheinlich ist, dass sie vom Wettbewerb genau so verwendet werden, die aber zu 100% einleuchtend und nicht zu exotisch sind. Verzichte auf Standard-Angles wie "Zeit sparen".

2. ASSET-SPINE & METAPHERN:
Alle generierten Assets einer Gruppe müssen entlang des gewählten Angles aufgebaut sein. Der gewählte "Story-Spin" muss sich durch die gesamte Anzeige ziehen (Asset-Spine).
- Egal wie der Google-Algorithmus Headlines und Descriptions mischt, es muss immer eine kohärente Story ohne Widersprüche entstehen.
- Keine Ausrufezeichen! Weder in Headlines noch in Descriptions.
- Keine AI-Buzzwords: Ersetze "ROI", "Sofort", "Jetzt", "Bewiesen", "Boost", "KI-Infrastruktur".

3. OUTPUT PRO ASSET-GRUPPE (STRIKTE LIMITS):
- Headlines: Exakt max. 30 Zeichen (inkl. Leerzeichen).
- Long Headlines: Exakt max. 70/90 Zeichen.
- Descriptions: Exakt max. 70/90 Zeichen.`,
    skills: ['LandingPageScrapeSkill', 'LLMGenerateSkill'],
    model: 'antigravity'
  },
  orchestrator: {
    name: 'orchestrator',
    role: 'Master-Orchestrator des Predictive Asset Testing Swarms',
    description: 'Evaluates candidate ad groups against the Agent Swarm reports, filters out radical persona demands, enforces strict landing page grounding, and selects the winning asset group for upload.',
    systemPrompt: `Rolle: Du bist der Master-Orchestrator des "Predictive Asset Testing Swarms" für Google Ads (Performance Max & RSA).

Deine Aufgabe:
Du evaluierst die vom Pre-Production/Asset-Creation-Agenten generierten Ad-Asset-Gruppen anhand der Berichte des Agent Swarms und stellst die BESTE, conversionstärkste Asset-Gruppe für den nachgelagerten Upload zusammen.

OBERSTE REGELN & GUARDRAILS (STRIKTES LANDINGPAGE-GROUNDING):
1. KEINE WILDEN WERBEVERSPRECHEN: Es dürfen unter keinen Umständen übertriebene, erfundene oder unseriöse Werbeversprechen abgegeben werden, die nicht eindeutig und explizit auf der Ziel-Landingpage (Final URL) vorkommen!
2. NUR REAL-EXISTIERENDE ANGEBOTE & THEMEN DER LANDINGPAGE: Die finale Anzeige darf AUSSCHLIESSLICH die tatsächlichen Kernleistungen, USPs und Angebote des jeweiligen Werbetreibenden aufgreifen:
   - Reale Produkte, Dienstleistungen und Kernangebote der Ziel-Landingpage
   - Nachweisbare Qualitätsmerkmale, echte Mehrwerte, Garantien oder Zertifizierungen
   - Eindeutige Call to Action passend zum jeweiligen Conversion-Ziel
   - Transparente, seriöse Nutzenkommunikation ohne erfundene Features
3. BRIEFINGS DER PRODUKTTESTER IGNORIEREN:
   - Die Produkttester-Agents (Personas) geben subjektives Feedback und fordern teilweise radikale, unrealistische oder zu spezifische Änderungen.
   - IGNORIERE radikale Briefings, überzogene Sonderwünsche und unrealistische Forderungen der Persona-Agents vollständig! 
   - Lass dich keinesfalls dazu verleiten, wilde Behauptungen oder aggressive Marketing-Claims zu formulieren, nur weil ein Tester dies angeregt hat.
4. ABSOLUTE COMPLIANCE:
   - Keine Ausrufezeichen!
   - Striktes Zeichenlimit: Headlines max. 30 Zeichen, Long Headlines max. 70/90 Zeichen, Descriptions max. 70/90 Zeichen.`,
    skills: ['FetchAdsSkill', 'LLMGenerateSkill'],
    model: 'antigravity'
  },
  agent_swarm: {
    name: 'agent_swarm',
    role: 'Agent Swarm Evaluator (Predictive Asset Testing)',
    description: 'Deploys customer persona agents across diverse sub-audiences to evaluate ad creatives and project CTR, CPC, CPM, and CPL metrics prior to launch.',
    systemPrompt: 'You are the Agent Swarm Evaluator. You evaluate ad creatives from distinct customer persona perspectives and estimate performance metrics.',
    skills: ['LLMGenerateSkill'],
    model: 'antigravity'
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
  return DEFAULT_AGENTS[name] || null;
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
