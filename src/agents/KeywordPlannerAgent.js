import BaseAgent from './BaseAgent.js';
import { generateText } from '../gemini.js';
import { getConfig } from '../config.js';
import { fetchKeywordIdeas } from '../googleAds.js';

export default class KeywordPlannerAgent extends BaseAgent {
  constructor() {
    super('keywordPlanner');
    this.chatHistory = [];
    this.rawIdeas = [];
  }

  /**
   * Generates keywords clustered by funnel stage.
   * @param {string} theme - The keyword focus theme
   * @param {string} [accessToken] - OAuth2 access token for Google Ads API
   * @param {string} [followUpMessage] - Optional follow-up feedback
   * @returns {Promise<string>} The structured keyword list from Gemini
   */
  async generateKeywords(theme, accessToken = null, followUpMessage = null) {
    const appConfig = getConfig();
    
    // 1. Fetch real ideas if they aren't loaded yet and we have an access token
    if (this.rawIdeas.length === 0 && accessToken) {
      this.log('Querying Google Ads API for real keyword ideas & historical metrics...');
      try {
        const realIdeas = await fetchKeywordIdeas(appConfig, accessToken, theme);
        if (realIdeas && realIdeas.length > 0) {
          this.rawIdeas = realIdeas;
          this.log(`Successfully fetched ${realIdeas.length} keyword ideas from Google Ads API.`);
        } else {
          this.log('No keyword ideas returned from API.');
        }
      } catch (err) {
        this.log(`Failed to fetch keyword ideas from Google Ads API: ${err.message}`);
      }
    }

    // 2. Prepare the real keywords context text
    let realKeywordsText = '';
    if (this.rawIdeas && this.rawIdeas.length > 0) {
      // Pass up to 400 keywords to Gemini to give it a rich set of real keywords
      realKeywordsText = `Hier sind die echten Keywords und historischen Leistungsdaten aus der Google Ads API:\n` + 
        JSON.stringify(this.rawIdeas.slice(0, 400), null, 2) + 
        `\n\nWICHTIG:\n` +
        `1. Verwende AUSSCHLIESSLICH Keywords und Metriken aus dieser echten Liste!\n` +
        `2. Simuliere oder erfinde KEINE Keywords oder Metriken.\n` +
        `3. Zeige die echten Suchvolumen, den Wettbewerb und die Gebote für die obere Position (Min/Max) exakt wie in der Liste angegeben.\n` +
        `4. Jedes Cluster soll nach Möglichkeit genau 25 Keywords aus dieser echten Liste enthalten. Falls nicht genügend passende Keywords in der Liste vorhanden sind, nutze alle passenden aus der Liste, aber erfinde NIEMALS Keywords oder Metriken.`;
    } else {
      this.log('Using simulated fallback metrics since no real ideas are available.');
      realKeywordsText = 'Hinweis: Es konnten keine echten Daten direkt aus der Google Ads API abgerufen werden (Fallback). Generiere und schätze realistische Werte für Suchvolumen, durchschnittlichen CPC sowie Gebote für die obere Position (Min/Max) basierend auf deinen Daten für den deutschen Markt (Fokus Berlin).';
    }

    // 3. Construct user prompt
    let userPrompt = '';
    if (followUpMessage) {
      this.log(`Follow-up request received: "${followUpMessage}"`);
      userPrompt = `Der Nutzer hat eine Folgefrage/Feedback zur vorherigen Keyword-Liste: "${followUpMessage}".\n\n` +
        `Bitte passe den Bericht entsprechend an und erstelle einen aktualisierten Bericht. Beachte dabei die folgenden Regeln strikt:\n` +
        `1. Verwende weiterhin AUSSCHLIESSLICH Keywords und Metriken aus der unten bereitgestellten echten API-Liste.\n` +
        `2. Simuliere oder erfinde KEINE Keywords oder Metriken.\n` +
        `3. Wenn der Nutzer nach einer Verfeinerung fragt (z.B. "mehr lokale Keywords", "Fokus auf B2B"), wähle andere passende Keywords aus der bereitgestellten echten Liste aus.\n\n` +
        realKeywordsText;
      this.chatHistory.push({ role: 'user', content: followUpMessage });
    } else {
      this.log(`Starting keyword research session for theme: "${theme}"`);
      userPrompt = `Das Keyword-Fokus-Thema ist: "${theme}".\n\n` +
        realKeywordsText + `\n\n` +
        `Bitte generiere die Keyword-Cluster-Listen für:\n` +
        `a) High-Intent - Transaktionale Keywords\n` +
        `b) Middle of the Funnel - Erwägungsphasen-Intent\n` +
        `c) Top of the Funnel - Informationsphasen-Intent\n\n` +
        `Gib für jedes Keyword im Bericht zwingend folgende Metriken an:\n` +
        `1. Echte monatliche Suchanfragen (Suchvolumen)\n` +
        `2. Gebote für obere Positionen (Bereich Untergrenze - Obergrenze in EUR)\n` +
        `3. Wettbewerb (HIGH, MEDIUM, LOW)\n` +
        `4. Kurze Begründung für den Suchintent und das gewählte Cluster.`;
      this.chatHistory.push({ role: 'user', content: theme });
    }

    // 4. Build the full prompt including history to keep context
    let historyStr = '';
    if (this.chatHistory.length > 1) {
      historyStr = '\n\nChat-Verlauf:\n' + this.chatHistory.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n') + '\n\nAktuelle Anfrage:\n';
    }

    const fullUserPrompt = `${historyStr}${userPrompt}`;

    const rawResponse = await generateText(
      appConfig.geminiApiKey,
      this.systemPrompt,
      fullUserPrompt,
      this.model,
      false // We want text/markdown formatting for chat output
    );

    // Save assistant response to history
    this.chatHistory.push({ role: 'assistant', content: rawResponse });

    return rawResponse;
  }
}
