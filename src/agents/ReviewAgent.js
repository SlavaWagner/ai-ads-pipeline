import BaseAgent from './BaseAgent.js';
import LandingPageScrapeSkill from '../skills/LandingPageScrapeSkill.js';
import { generateText } from '../gemini.js';
import { getConfig } from '../config.js';

export default class ReviewAgent extends BaseAgent {
  constructor() {
    super('reviewer');
    // Note: reviewer does not have LandingPageScrapeSkill in its config to demonstrate skill isolation.
    // It will receive the scraped content from the orchestrator.
  }

  /**
   * Reviews and cleans the copywriting drafts.
   * @param {object} draft - Draft headlines and descriptions from the Copywriter
   * @param {string} finalUrl - Target landing page URL
   * @param {string} scrapedContext - Scraped context from the landing page
   * @returns {Promise<object>} Cleaned and reviewed headlines and descriptions
   */
  async reviewDraft(draft, finalUrl, scrapedContext) {
    this.log('Performing LLM-based compliance and policy review...');

    const userPrompt = `
Landingpage URL: ${finalUrl}

Gescrapteter Landingpage-Inhalt (zur Faktenprüfung):
==================================================
${scrapedContext || 'Kein Content verfügbar.'}
==================================================

Zu prüfende Entwürfe:
Headlines (Anzeigentitel):
${draft.headlines?.map((h, i) => `${i + 1}. ${h}`).join('\n') || 'Keine'}

Descriptions (Beschreibungen):
${draft.descriptions?.map((d, i) => `${i + 1}. ${d}`).join('\n') || 'Keine'}

Bitte korrigiere diese Entwürfe unter strikter Einhaltung aller Regeln:
1. Keine Satzzeichen wie Punkte am Satzende von Headlines.
2. Keine Ausrufezeichen (!) anywhere.
3. Ersetze Wörter wie "ROI", "Sofort", "Jetzt", "Bewiesen", "Boost".
4. Headlines dürfen maximal 30 Zeichen haben.
5. Descriptions dürfen maximal 70 Zeichen haben.
6. Alle Aussagen müssen auf der Landingpage belegbar sein.

Gib das Ergebnis zwingend als JSON aus.
`;

    const appConfig = getConfig();
    const rawResponse = await generateText(
      appConfig.geminiApiKey,
      this.systemPrompt,
      userPrompt,
      this.model,
      true // JSON Mode
    );

    let parsedResult;
    try {
      parsedResult = this.parseJsonResponse(rawResponse);
    } catch (err) {
      this.log(`Error parsing Reviewer response: ${err.message}. Using copywriter draft as baseline.`);
      parsedResult = {
        headlines: draft.headlines || [],
        descriptions: draft.descriptions || []
      };
    }

    // Run programmatic compliance sanitization (Bulletproof fallback)
    const sanitized = this.programmaticSanitization(parsedResult);
    return sanitized;
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
   * Ensures 100% compliance with length and policy rules.
   * @param {object} ad - Headlines and descriptions
   * @returns {object} Highly sanitized ad object
   */
  programmaticSanitization(ad) {
    this.log('Running programmatic compliance sanitizer to ensure 100% rule-adherence...');
    
    let headlines = Array.isArray(ad.headlines) ? [...ad.headlines] : [];
    let descriptions = Array.isArray(ad.descriptions) ? [...ad.descriptions] : [];

    // Banned words mapping (case-insensitive)
    const replacements = [
      { pattern: /\bROI\b/gi, replacement: 'Ertrag' },
      { pattern: /\bSofort\b/gi, replacement: 'Direkt' },
      { pattern: /\bJetzt\b/gi, replacement: 'Heute' },
      { pattern: /\bBewiesen/gi, replacement: 'Geprüft' },
      { pattern: /\bBoost\b/gi, replacement: 'Optimieren' }
    ];

    const cleanText = (text, isHeadline) => {
      if (!text || typeof text !== 'string') return '';
      let clean = text.trim();

      // Rule 1: No exclamation marks
      clean = clean.replace(/!/g, '');

      // Rule 2: Replace banned words
      for (const { pattern, replacement } of replacements) {
        clean = clean.replace(pattern, replacement);
      }

      // Rule 3: No periods at the end of headlines
      if (isHeadline && clean.endsWith('.')) {
        clean = clean.slice(0, -1).trim();
      }

      return clean;
    };

    // Sanitize headlines
    headlines = headlines.map(h => {
      let cleaned = cleanText(h, true);
      // Hard limit check (30 chars)
      if (cleaned.length > 30) {
        const truncated = cleaned.slice(0, 30).trim();
        this.log(`Truncated headline: "${cleaned}" (${cleaned.length} chars) -> "${truncated}"`);
        cleaned = truncated;
      }
      return cleaned;
    }).filter(h => h.length > 0);

    // Sanitize descriptions
    descriptions = descriptions.map(d => {
      let cleaned = cleanText(d, false);
      // Hard limit check (70 chars)
      if (cleaned.length > 70) {
        const truncated = cleaned.slice(0, 70).trim();
        this.log(`Truncated description: "${cleaned}" (${cleaned.length} chars) -> "${truncated}"`);
        cleaned = truncated;
      }
      return cleaned;
    }).filter(d => d.length > 0);

    // Enforce exact quantities: 15 headlines and 4 descriptions
    // Pad if short, slice if long
    while (headlines.length < 15) {
      headlines.push(`Ihr Experte vor Ort ${headlines.length + 1}`);
    }
    if (headlines.length > 15) {
      headlines = headlines.slice(0, 15);
    }

    while (descriptions.length < 4) {
      descriptions.push(`Ihr zuverlässiger Partner für nachhaltige Google Ads Optimierung.`);
    }
    if (descriptions.length > 4) {
      descriptions = descriptions.slice(0, 4);
    }

    return { headlines, descriptions };
  }

  /**
   * Reviews and cleans PMax copywriting drafts.
   * @param {object} draft - Draft headlines, longHeadlines, and descriptions
   * @param {string} finalUrl - Target landing page URL
   * @param {string} scrapedContext - Scraped context from landing page
   * @returns {Promise<object>} Cleaned and reviewed headlines, longHeadlines, and descriptions
   */
  async reviewPMaxDraft(draft, finalUrl, scrapedContext) {
    this.log('Performing LLM-based compliance and policy review for PMax Asset Group...');

    const userPrompt = `
Landingpage URL: ${finalUrl}

Gescrapteter Landingpage-Inhalt (zur Faktenprüfung):
==================================================
${scrapedContext || 'Kein Content verfügbar.'}
==================================================

Zu prüfende PMax Entwürfe:
Headlines (Anzeigentitel, max 30 Zeichen):
${draft.headlines?.map((h, i) => `${i + 1}. ${h}`).join('\n') || 'Keine'}

Long Headlines (Lange Anzeigentitel, max 90 Zeichen):
${draft.longHeadlines?.map((lh, i) => `${i + 1}. ${lh}`).join('\n') || 'Keine'}

Descriptions (Beschreibungen, max 90 Zeichen):
${draft.descriptions?.map((d, i) => `${i + 1}. ${d}`).join('\n') || 'Keine'}

Bitte korrigiere diese Entwürfe unter strikter Einhaltung aller Regeln:
1. Keine Satzzeichen wie Punkte am Satzende von Headlines und Long Headlines.
2. Keine Ausrufezeichen (!) anywhere.
3. Ersetze Wörter wie "ROI", "Sofort", "Jetzt", "Bewiesen", "Boost".
4. Headlines dürfen maximal 30 Zeichen haben.
5. Long Headlines dürfen maximal 90 Zeichen haben.
6. Descriptions dürfen maximal 90 Zeichen haben.
7. Alle Aussagen müssen auf der Landingpage belegbar sein.

Gib das Ergebnis zwingend als JSON aus mit den Feldern "headlines", "longHeadlines", "descriptions".
`;

    const appConfig = getConfig();
    let parsedResult;
    try {
      const rawResponse = await generateText(
        appConfig.geminiApiKey,
        this.systemPrompt,
        userPrompt,
        this.model,
        true // JSON Mode
      );
      parsedResult = this.parseJsonResponse(rawResponse);
    } catch (err) {
      this.log(`Error parsing Reviewer response for PMax: ${err.message}. Using copywriter draft as baseline.`);
      parsedResult = {
        headlines: draft.headlines || [],
        longHeadlines: draft.longHeadlines || [],
        descriptions: draft.descriptions || []
      };
    }

    const sanitized = this.programmaticSanitizationPMax(parsedResult);
    return sanitized;
  }

  /**
   * Ensures 100% compliance for PMax asset groups (30/90/90 length and policy rules).
   * @param {object} ad - Draft PMax object
   * @returns {object} Highly sanitized PMax ad object
   */
  programmaticSanitizationPMax(ad) {
    this.log('Running programmatic compliance sanitizer for PMax Asset Group (15 H / 4 LH / 4 D)...');
    
    let headlines = Array.isArray(ad.headlines) ? [...ad.headlines] : [];
    let longHeadlines = Array.isArray(ad.longHeadlines) ? [...ad.longHeadlines] : [];
    let descriptions = Array.isArray(ad.descriptions) ? [...ad.descriptions] : [];

    const replacements = [
      { pattern: /\bROI\b/gi, replacement: 'Ertrag' },
      { pattern: /\bSofort\b/gi, replacement: 'Direkt' },
      { pattern: /\bJetzt\b/gi, replacement: 'Heute' },
      { pattern: /\bBewiesen/gi, replacement: 'Geprüft' },
      { pattern: /\bBoost\b/gi, replacement: 'Optimieren' }
    ];

    const cleanText = (text, isHeadline) => {
      if (!text || typeof text !== 'string') return '';
      let clean = text.trim();

      clean = clean.replace(/!/g, '');

      for (const { pattern, replacement } of replacements) {
        clean = clean.replace(pattern, replacement);
      }

      if (isHeadline && clean.endsWith('.')) {
        clean = clean.slice(0, -1).trim();
      }

      return clean;
    };

    // Headlines (max 30 chars)
    headlines = headlines.map(h => {
      let cleaned = cleanText(h, true);
      if (cleaned.length > 30) {
        const truncated = cleaned.slice(0, 30).trim();
        this.log(`Truncated PMax headline: "${cleaned}" (${cleaned.length} chars) -> "${truncated}"`);
        cleaned = truncated;
      }
      return cleaned;
    }).filter(h => h.length > 0);

    // Long Headlines (max 90 chars)
    longHeadlines = longHeadlines.map(lh => {
      let cleaned = cleanText(lh, true);
      if (cleaned.length > 90) {
        const truncated = cleaned.slice(0, 90).trim();
        this.log(`Truncated PMax long headline: "${cleaned}" (${cleaned.length} chars) -> "${truncated}"`);
        cleaned = truncated;
      }
      return cleaned;
    }).filter(lh => lh.length > 0);

    // Descriptions (max 90 chars)
    descriptions = descriptions.map(d => {
      let cleaned = cleanText(d, false);
      if (cleaned.length > 90) {
        const truncated = cleaned.slice(0, 90).trim();
        this.log(`Truncated PMax description: "${cleaned}" (${cleaned.length} chars) -> "${truncated}"`);
        cleaned = truncated;
      }
      return cleaned;
    }).filter(d => d.length > 0);

    // Enforce exact quantities: 15 headlines, 4 long headlines, 4 descriptions
    while (headlines.length < 15) {
      headlines.push(`Ihr Experte vor Ort ${headlines.length + 1}`);
    }
    if (headlines.length > 15) {
      headlines = headlines.slice(0, 15);
    }

    while (longHeadlines.length < 4) {
      longHeadlines.push(`Ihr führender Partner für nachhaltige und geprüfte Performance Max Optimierung`);
    }
    if (longHeadlines.length > 4) {
      longHeadlines = longHeadlines.slice(0, 4);
    }

    while (descriptions.length < 4) {
      descriptions.push(`Ihr zuverlässiger Partner für nachhaltige Google Ads Optimierung.`);
    }
    if (descriptions.length > 4) {
      descriptions = descriptions.slice(0, 4);
    }

    return { headlines, longHeadlines, descriptions };
  }
}
