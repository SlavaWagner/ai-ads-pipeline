import { generateText } from '../gemini.js';
import { getConfig } from '../config.js';

export default class LLMGenerateSkill {
  /**
   * Generates text/JSON via the Gemini model.
   * @param {string} systemPrompt - System prompt to instruct the AI
   * @param {string} userPrompt - User prompt containing context and details
   * @param {string} [modelName] - Gemini model identifier
   * @param {boolean} [jsonMode] - Toggles JSON output format
   * @returns {Promise<string>} LLM response
   */
  async execute(systemPrompt, userPrompt, modelName = 'gemini-1.5-flash', jsonMode = false) {
    const config = getConfig();
    return await generateText(config.geminiApiKey, systemPrompt, userPrompt, modelName, jsonMode);
  }
}
