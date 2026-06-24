import BaseAgent from './BaseAgent.js';
import { generateText } from '../gemini.js';
import { getConfig } from '../config.js';

export default class StrategyAdvisorAgent extends BaseAgent {
  constructor() {
    super('strategyAdvisor');
    this.chatHistory = [];
    this.currentStrategyName = '';
    this.currentStrategyContent = '';
  }

  /**
   * Sets the active strategy document for the chat session.
   * @param {string} name - The strategy name/title
   * @param {string} content - The markdown content of the strategy
   */
  setStrategy(name, content) {
    this.currentStrategyName = name;
    this.currentStrategyContent = content;
  }

  /**
   * Responds to user queries based on the strategy and chat history.
   * @param {string} userMessage - User query or input
   * @returns {Promise<string>} Advisor response
   */
  async chat(userMessage) {
    const appConfig = getConfig();
    
    // Add user message to history
    this.chatHistory.push({ role: 'user', content: userMessage });

    // Construct prompt
    const strategyContext = `\n\n=== AKTIVE STRATEGIE (SOP) ===\nTitel: ${this.currentStrategyName}\n\nInhalt:\n${this.currentStrategyContent}\n==============================\n\n`;
    
    // Build the full prompt including history to keep context
    let historyStr = '';
    if (this.chatHistory.length > 1) {
      historyStr = '\n\nChat-Verlauf:\n' + this.chatHistory.slice(0, -1).map(h => `${h.role === 'user' ? 'User' : 'Advisor'}: ${h.content}`).join('\n') + '\n\n';
    }

    const fullUserPrompt = `${strategyContext}${historyStr}Aktuelle Benutzerfrage/Eingabe:\n${userMessage}`;

    const rawResponse = await generateText(
      appConfig.geminiApiKey,
      this.systemPrompt,
      fullUserPrompt,
      this.model,
      false // Markdown text formatting
    );

    // Save assistant response to history
    this.chatHistory.push({ role: 'assistant', content: rawResponse });

    return rawResponse;
  }
}
