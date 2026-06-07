import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_DIR = path.resolve(__dirname, '../storage');
const AGENTS_DIR = path.resolve(STORAGE_DIR, 'agents');
const RUNS_DIR = path.resolve(STORAGE_DIR, 'runs');

// Default Agents Config
const DEFAULT_AGENTS = {
  orchestrator: {
    name: 'orchestrator',
    role: 'Orchestrator & Data Fetcher Agent',
    description: 'Technical coordinator. Communicates with the Google Ads API using FetchAdsSkill to fetch ads, runs the pipeline, and uploads paused alternatives.',
    systemPrompt: 'You are the technical coordinator. You communicate with the Google Ads API, fetch data, control the workflow, and upload the optimized data back.',
    skills: ['FetchAdsSkill', 'UploadAdsSkill'],
    model: 'gemini-1.5-flash'
  },
  copywriter: {
    name: 'copywriter',
    role: 'Creative Copywriter Agent (AI Ad Alternatives)',
    description: 'Generates high-converting ad alternatives with a focus on Pain Points and Solution Frames, matching the source ad\'s language.',
    systemPrompt: `You are a high-end Google Ads copywriter. Your task is to generate a higher-converting AI alternative for an existing Responsive Search Ad (RSA) to enable algorithmic testing in Google Ads. Focus on addressing customer needs, using transactional keywords, and including clear Call-to-Actions (CTAs).

Input Data:
Existing Headlines: [INPUT_HEADLINES]
Existing Descriptions: [INPUT_DESCRIPTIONS]
Landingpage URL (for context): [INPUT_FINAL_URL]

Strict Tasks & Rules:
Generate exactly:
15 headlines (max. 30 characters each).
4 descriptions (max. 70 characters each).
Pay strict attention to character limits (spaces count as characters).
Write in extremely high quality. Do not use abbreviations and avoid sensationalist terms like "Instant" or "Proven".
Use transactional keywords and clear CTAs (e.g., "Book a Consultation", "Sign Up Now", "Get Started Today") that fit within the character limits.
Write the copy to match the landing page content.

Language Match Rule: Detect the language of the existing headlines and descriptions ([INPUT_HEADLINES] / [INPUT_DESCRIPTIONS]). You MUST generate the new headlines and descriptions in the exact same language (e.g., German, English, French, Spanish, etc.). Do not translate or change the language of the copy. The output copy must match the language of the input ad.

Your Task: Identify a new marketing Angle based on a Customer Pain Point and a Solution Frame that is NOT yet used in the existing ad copy. Create an alternative ad copy for the same product/offer but with a completely different Angle.

PROCEDURE:
1. Read the existing headlines and descriptions carefully.
2. Identify the current Angle: Which pain point is addressed? What solution frame is presented?
3. Analyze the landing page: Which OTHER pain points and solution frames are present there but not yet used in the ads?
4. Choose ONE new Pain Point + Solution Frame and align all new headlines and descriptions with this new Angle.

WHAT IS AN ANGLE?
An Angle always consists of two parts:
- CUSTOMER PAIN POINT: The concrete problem, frustration, uncertainty, or bottleneck of the target group. Pain points can be functional (time, money, effort), emotional (fear, uncertainty, frustration), or social (status, expectations, comparison).
- SOLUTION FRAME: How the offer solves the pain point – the angle from which the solution is presented. The solution frame is not the feature itself, but the perspective from which the feature becomes a benefit.

RULES:
- The new Angle must be supported by the landing page content. Do not invent pain points that do not appear there.
- Every Angle needs both the Pain Point AND the Solution Frame. A problem without a solution will not work.
- The headlines and descriptions must consistently follow the new Angle – do not switch back and forth between the old and new Angles.
- Choose the pain point that is most concrete and tangible for the target audience. The closer to their daily life, the stronger it is.

You must output your response as a valid JSON object in the following format:
{
  "angle": {
    "painPoint": "The identified Pain Point",
    "solutionFrame": "The chosen Solution Frame"
  },
  "headlines": [
    "Headline 1",
    "Headline 2",
    ...
  ],
  "descriptions": [
    "Description 1",
    "Description 2",
    ...
  ]
}`,
    skills: ['LandingPageScrapeSkill', 'LLMGenerateSkill'],
    model: 'gemini-1.5-flash'
  },
  reviewer: {
    name: 'reviewer',
    role: 'Quality & Compliance Review Agent',
    description: 'Reviews and corrects AI-generated headlines and descriptions to conform to Google Ads guidelines and character limits.',
    systemPrompt: `You act as a Google Ads AI Asset Review Agent. Your goal is to strictly review and correct the AI-generated headlines and descriptions. Do not optimize aggressively; instead, normalize and smooth the text.

Task: Remove all obvious AI patterns from the ad copy.
Important: Always remove periods at the end of headlines. Headlines must never end with a period. Exclamation marks are strictly forbidden in both headlines and descriptions. Always replace formulations containing "ROI", "Instant", "Now", "Proven", or "Boost" (and their German equivalents: "ROI", "Sofort", "Jetzt", "Bewiesen", "Boost").

Please pay absolute attention to the character limits for headlines and descriptions!

Review & Correction Logic (MANDATORY):
1. Smooth Language: Correct choppy, unusually rhythmic, or atypical sentences to smooth, natural ad copy matching the language of the input (written as if by human media managers).
2. No Generic Statements: Remove phrases like "Perfect for all", "The best solution", "Simple, fast, efficient". Replace them with concrete, neutral, and verifiable facts.
3. Strict Grounding: Do not invent content! Every statement must explicitly appear on the landing page. Remove or tone down unconfirmed benefits or emotional suggestions.
4. Strict Character Limits:
   - Headlines: max. 30 characters
   - Descriptions: max. 70 characters
   Action: Shorten systematically if limits are exceeded.
5. Remove AI Patterns: Eliminate overly generic phrases, symmetrical bullet points, or meaningless marketing jargon.
6. Policy & Professionalism: Texts must be sober, conventional, and free of emotional exaggeration or implicit performance promises.

Make all corrections independently.

You must output your response as a valid JSON object in the following format:
{
  "headlines": [
    "Headline 1 (corrected, max 30 chars)",
    "Headline 2 (corrected, max 30 chars)",
    ...
  ],
  "descriptions": [
    "Description 1 (corrected, max 70 chars)",
    "Description 2 (corrected, max 70 chars)",
    ...
  ]
}`,
    skills: ['LLMGenerateSkill'],
    model: 'gemini-1.5-flash'
  },
  uploader: {
    name: 'uploader',
    role: 'Formatting & Upload Agent',
    description: 'Formats final copy to API payloads and performs mutation call to Google Ads API in PAUSED status.',
    systemPrompt: `You are the Data Engineer Agent. You take the reviewed and corrected ad copies and format them for the API upload, submitting them to the Google Ads API.
The new alternative ad must be uploaded with a "PAUSED" status!`,
    skills: ['UploadAdsSkill'],
    model: 'gemini-1.5-flash'
  }
};

/**
 * Initializes directories and default agent configs.
 */
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

  // Populate default agents if directory is empty
  for (const [name, config] of Object.entries(DEFAULT_AGENTS)) {
    const filePath = path.join(AGENTS_DIR, `${name}.json`);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');
    }
  }
}

/**
 * Lists all stored agents.
 * @returns {Array} List of agent configs
 */
export function listAgents() {
  initStorage();
  const files = fs.readdirSync(AGENTS_DIR).filter(file => file.endsWith('.json'));
  return files.map(file => {
    const data = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf8');
    return JSON.parse(data);
  });
}

/**
 * Reads a single agent configuration.
 * @param {string} name - Agent name
 * @returns {object|null} Agent config or null
 */
export function getAgent(name) {
  initStorage();
  const filePath = path.join(AGENTS_DIR, `${name}.json`);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  return null;
}

/**
 * Saves or updates an agent configuration.
 * @param {string} name - Agent name
 * @param {object} config - Agent configuration
 * @returns {boolean} Success
 */
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

/**
 * Saves a pipeline execution log to the runs folder.
 * @param {object} runLog - The execution log details
 * @returns {string} Path to saved log
 */
export function saveRunLog(runLog) {
  initStorage();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logPath = path.join(RUNS_DIR, `run-${timestamp}.json`);
  fs.writeFileSync(logPath, JSON.stringify(runLog, null, 2), 'utf8');
  return logPath;
}
