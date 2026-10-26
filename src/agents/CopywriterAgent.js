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
    const cleanKey = frameworkName.toLowerCase().trim();
    const nameMap = {
      angles: 'Angles.md',
      audiences: 'Audiences (Sub Audiences).md',
      business: 'Business Frameworks.md',
      copywritings: 'Copywritings.md',
      sophistication: 'Market Sophistication.md',
      swa: 'SWA Alle meine Frameworks.md',
      'swa-frameworks': 'SWA Alle meine Frameworks.md',
      all: 'SWA Alle meine Frameworks.md'
    };

    let fileName = nameMap[cleanKey];
    if (!fileName) {
      const directPath = path.resolve(__dirname, '../frameworks', `${frameworkName}.md`);
      if (fs.existsSync(directPath)) {
        return fs.readFileSync(directPath, 'utf8');
      }
      fileName = 'SWA Alle meine Frameworks.md';
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
      .replace('{{LANDING_PAGE_CONTENT}}', scrapeResult.textContent)
      .replace('{{EXISTING_HEADLINES}}', headlinesStr)
      .replace('{{EXISTING_DESCRIPTIONS}}', descriptionsStr);

    const userPrompt = `Analysiere die Landing Page und die bestehende Anzeige. Generiere 15 hochgradig relevante, conversionstarke neue Headlines (jede strikt <= 30 Zeichen) und 4 neue Descriptions (jede strikt <= 90 Zeichen). Antworte ausschließlich mit einem JSON-Objekt mit den Keys "headlines" und "descriptions".`;

    this.log('Invoking LLM for copywriting alternative...');
    const appConfig = getConfig();
    const rawResponse = await generateText(
      appConfig.geminiApiKey,
      customizedSystemPrompt,
      userPrompt,
      this.model,
      true // JSON mode
    );

    try {
      const parsed = JSON.parse(rawResponse);
      this.log(`Generated alternative ad with ${parsed.headlines.length} headlines and ${parsed.descriptions.length} descriptions.`);
      return parsed;
    } catch (err) {
      this.log(`Failed to parse LLM response as JSON. Error: ${err.message}`);
      throw new Error(`LLM output was not valid JSON: ${rawResponse}`);
    }
  }

  /**
   * Generates alternative Performance Max assets (15 headlines, 4 long headlines, 4 descriptions).
   * @param {object} pmaxGroup - Current PMax asset group object
   * @param {string} finalUrl - Target landing page URL
   * @param {string} [frameworkName] - Optional framework name chosen by user
   * @returns {Promise<object>} Draft headlines, long headlines, and descriptions
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
    const longHeadlinesStr = (pmaxGroup.longHeadlines || []).map(lh => `"${lh}"`).join(', ');

    const promptWithContext = `
${basePrompt}

======================================
AKTUELLE LANDINGPAGE-INHALTE:
======================================
${scrapeResult.textContent.slice(0, 4000)}

======================================
BESTEHENDE PERFORMANCE MAX ASSETS:
======================================
Headlines: ${headlinesStr || 'Keine'}
Long Headlines: ${longHeadlinesStr || 'Keine'}
Descriptions: ${descriptionsStr || 'Keine'}

======================================
AUFGABE FÜR PERFORMANCE MAX:
======================================
Framework-Fokus: ${selectedFramework}

Identifiziere basierend auf diesen Daten einen neuen Angle (Pain Point + Solution Frame) und erstelle ein komplettes, hochkonvertierendes Asset-Paket für Performance Max:
- Exakt 15 Headlines (jede strikt <= 30 Zeichen, keine Ausrufezeichen)
- Exakt 4 Long Headlines (jede strikt <= 90 Zeichen, keine Ausrufezeichen)
- Exakt 4 Descriptions (jede strikt <= 90 Zeichen, keine Ausrufezeichen)

Antworte ausschließlich im JSON-Format:
{
  "angle": "Name des gewählten Angles",
  "headlines": ["...", "..."],
  "longHeadlines": ["...", "..."],
  "descriptions": ["...", "..."]
}
`;

    this.log(`Invoking model for PMax copywriting alternatives (Framework: ${selectedFramework})...`);
    const rawResponse = await generateText(
      appConfig.geminiApiKey,
      'Du bist ein Elite-Copywriter für Performance Max Kampagnen.',
      promptWithContext,
      this.model,
      true
    );

    try {
      const parsed = JSON.parse(rawResponse);
      this.log(`Successfully generated PMax assets with ${parsed.headlines?.length || 0} headlines and ${parsed.descriptions?.length || 0} descriptions.`);
      return parsed;
    } catch (err) {
      this.log(`Failed to parse PMax JSON response: ${err.message}`);
      throw new Error(`LLM output was not valid JSON: ${rawResponse}`);
    }
  }
}
