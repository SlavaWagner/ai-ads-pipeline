import { scrapeLandingPage } from '../scraper.js';

export default class LandingPageScrapeSkill {
  /**
   * Scrapes landing page content for grounding context.
   * @param {string} url - Final URL of the ad
   * @returns {Promise<object>} Content object including title, headings, body
   */
  async execute(url) {
    return await scrapeLandingPage(url);
  }
}
