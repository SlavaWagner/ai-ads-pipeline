import BaseAgent from './BaseAgent.js';
import LandingPageScrapeSkill from '../skills/LandingPageScrapeSkill.js';
import { generateText } from '../gemini.js';
import { getConfig } from '../config.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default class CopywriterAgent extends BaseAgent {
  constructor() {
    super('copywriter');
    this.scrapeSkill = new LandingPageScrapeSkill();
  }

  /**
   * Loads a specific framework prompt from the frameworks directory.
   */
  getFrameworkPrompt(frameworkName) {
    const nameMap = {
      angles: 'Angles.md',
      audiences: 'Audiences (Sub Audiences).md',
      business: 'Business Frameworks.md',
      copywritings: 'Copywritings.md',
      sophistication: 'Market Sophistication.md'
    };

    const fileName = nameMap[frameworkName.toLowerCase().trim()];
    if (!fileName) {
      this.log(`WARN: Framework "${frameworkName}" nicht gefunden. Verwende Default-Prompt.`);
      return null;
    }

    const filePath = path.resolve(__dirname, '../frameworks', fileName);
    if (fs.existsSync(filePath)) {
      this.log(`Lade spezifisches Asset-Creation Framework: ${fileName}`);
      return fs.readFileSync(filePath, 'utf8');
    } else {
      this.log(`WARN: Framework-Datei nicht gefunden unter ${filePath}. Verwende Default-Prompt.`);
      return null;
    }
  }

  /**
   * Generates a new alternative ad.
   * @param {object} ad - Original ad object containing current headlines & descriptions
   * @param {string} finalUrl - Target landing page URL
   * @param {string} [frameworkName] - Optional framework name chosen by the user
   * @returns {Promise<object>} Draft headlines and descriptions
   */
  async createAlternative(ad, finalUrl, frameworkName) {
    // 1. Scrape the landing page
    this.log(`Scraping context from landing page: ${finalUrl}`);
    const scrapeResult = await this.runSkill(this.scrapeSkill, finalUrl);
    
    // 2. Prepare the system prompt by replacing placeholders
    const headlinesStr = ad.headlines.map(h => `"${h}"`).join(', ');
    const descriptionsStr = ad.descriptions.map(d => `"${d}"`).join(', ');
    
    let basePrompt = this.systemPrompt;
    if (frameworkName) {
      const frameworkPrompt = this.getFrameworkPrompt(frameworkName);
      if (frameworkPrompt) {
        basePrompt = frameworkPrompt;
      }
    }

    const customizedSystemPrompt = basePrompt
      .replace(/\\?\[INPUT\\?_HEADLINES\\?\]/g, headlinesStr)
      .replace(/\\?\[INPUT\\?_DESCRIPTIONS\\?\]/g, descriptionsStr)
      .replace(/\\?\[INPUT\\?_FINAL\\?_URL\\?\]/g, finalUrl);

    // 3. Build user prompt with scraped context
    const userPrompt = `
Gescrapteter Inhalt der Landingpage (${finalUrl}):
==================================================
${scrapeResult.textContent}
==================================================

Identifiziere basierend auf diesen Daten einen neuen Angle (Pain Point + Solution Frame) und erstelle exakt:
- 15 Anzeigentitel (Headlines) mit maximal 30 Zeichen.
- 4 Beschreibungen (Descriptions) mit maximal 70 Zeichen.

Gib das Ergebnis zwingend als valides JSON-Objekt zurück.
`;

    // 4. Request generation (in JSON mode)
    const appConfig = getConfig();
    this.log('Querying Gemini model for creative copywriting alternatives...');
    const rawResponse = await generateText(
      appConfig.geminiApiKey,
      customizedSystemPrompt,
      userPrompt,
      this.model,
      true // JSON Mode
    );

    // 5. Parse and return
    try {
      const parsed = this.parseJsonResponse(rawResponse);
      this.log(`Angle identified:`);
      this.log(`  Pain Point: ${parsed.angle?.painPoint || 'N/A'}`);
      this.log(`  Solution Frame: ${parsed.angle?.solutionFrame || 'N/A'}`);
      this.log(`Generated ${parsed.headlines?.length || 0} headlines and ${parsed.descriptions?.length || 0} descriptions.`);
      return {
        ...parsed,
        scrapedContext: scrapeResult.textContent
      };
    } catch (parseError) {
      this.log(`Error parsing JSON response: ${parseError.message}`);
      this.log(`Raw response was: \n${rawResponse}`);
      throw new Error(`Copywriter LLM did not return valid JSON structure: ${parseError.message}`);
    }
  }

  /**
   * Helper to clean markdown json fences and parse JSON.
   */
  parseJsonResponse(text) {
    let clean = text.trim();
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
    }
    return JSON.parse(clean);
  }

  /**
   * Generates a new Performance Max Asset Group alternative.
   * @param {object} pmaxGroup - PMax asset group object
   * @param {string} finalUrl - Target landing page URL
   * @param {string} [frameworkName] - Optional framework name chosen by user
   * @returns {Promise<object>} Draft headlines, longHeadlines, and descriptions
   */
  async createPMaxAlternative(pmaxGroup, finalUrl, frameworkName) {
    this.log(`Scraping context from landing page: ${finalUrl}`);
    const scrapeResult = await this.runSkill(this.scrapeSkill, finalUrl);
    
    let basePrompt = this.systemPrompt;
    const selectedFramework = frameworkName || 'angles';
    const frameworkPrompt = this.getFrameworkPrompt(selectedFramework);
    if (frameworkPrompt) {
      basePrompt = frameworkPrompt;
    }

    const headlinesStr = (pmaxGroup.headlines || []).map(h => `"${h}"`).join(', ');
    const descriptionsStr = (pmaxGroup.descriptions || []).map(d => `"${d}"`).join(', ');

    const customizedSystemPrompt = basePrompt
      .replace(/\\?\[INPUT\\?_HEADLINES\\?\]/g, headlinesStr)
      .replace(/\\?\[INPUT\\?_DESCRIPTIONS\\?\]/g, descriptionsStr)
      .replace(/\\?\[INPUT\\?_FINAL\\?_URL\\?\]/g, finalUrl);

    const userPrompt = `
Gescrapteter Inhalt der Landingpage (${finalUrl}):
==================================================
${scrapeResult.textContent}
==================================================

Framework-Fokus: ${selectedFramework}

Identifiziere basierend auf diesen Daten einen neuen Angle (Pain Point + Solution Frame) und erstelle die vollständige Performance Max (PMax) Asset-Klassifikation:
- Exakt 15 Anzeigentitel (Headlines) mit maximal 30 Zeichen.
- Exakt 4 Lange Anzeigentitel (Long Headlines) mit maximal 90 Zeichen.
- Exakt 4 Beschreibungen (Descriptions) mit maximal 90 Zeichen.

Wichtige Regeln:
1. Keine Ausrufezeichen (!)
2. Keine Punkte am Satzende von Headlines und Long Headlines.
3. Verwende keine Begriffe wie "ROI", "Boost", "Jetzt", "Sofort", "Bewiesen".
4. Verfasse die Texte in der Sprache der Landingpage.

Gib das Ergebnis zwingend als valides JSON-Objekt im folgenden Format zurück:
{
  "angle": {
    "painPoint": "Kernproblem der Zielgruppe",
    "solutionFrame": "Lösungspositionierung"
  },
  "headlines": [
    "Headline 1",
    "Headline 2",
    "Headline 3",
    "Headline 4",
    "Headline 5",
    "Headline 6",
    "Headline 7",
    "Headline 8",
    "Headline 9",
    "Headline 10",
    "Headline 11",
    "Headline 12",
    "Headline 13",
    "Headline 14",
    "Headline 15"
  ],
  "longHeadlines": [
    "Long Headline 1",
    "Long Headline 2",
    "Long Headline 3",
    "Long Headline 4"
  ],
  "descriptions": [
    "Description 1",
    "Description 2",
    "Description 3",
    "Description 4"
  ]
}
`;

    const appConfig = getConfig();
    this.log(`Querying Gemini model for PMax copywriting alternatives (Framework: ${selectedFramework})...`);
    const rawResponse = await generateText(
      appConfig.geminiApiKey,
      customizedSystemPrompt,
      userPrompt,
      this.model,
      true // JSON Mode
    );

    try {
      const parsed = this.parseJsonResponse(rawResponse);
      this.log(`Angle identified for PMax Asset Group:`);
      this.log(`  Pain Point: ${parsed.angle?.painPoint || 'N/A'}`);
      this.log(`  Solution Frame: ${parsed.angle?.solutionFrame || 'N/A'}`);
      this.log(`Generated ${parsed.headlines?.length || 0} headlines, ${parsed.longHeadlines?.length || 0} long headlines, and ${parsed.descriptions?.length || 0} descriptions.`);
      return {
        ...parsed,
        scrapedContext: scrapeResult.textContent
      };
    } catch (parseError) {
      this.log(`Error parsing JSON response for PMax: ${parseError.message}`);
      this.log(`Raw response was:\n${rawResponse}`);
      throw new Error(`Copywriter LLM did not return valid PMax JSON structure: ${parseError.message}`);
    }
  }
}
