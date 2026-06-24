import { fetchActiveAds } from '../googleAds.js';

export default class FetchAdsSkill {
  /**
   * Fetches active ads from the Google Ads API.
   * @param {object} config - Application configuration
   * @param {string} accessToken - OAuth2 access token
   * @returns {Promise<Array>} List of ads fetched
   */
  async execute(config, accessToken) {
    return await fetchActiveAds(config, accessToken);
  }
}
