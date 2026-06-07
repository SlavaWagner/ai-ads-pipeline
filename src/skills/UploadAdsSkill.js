import { createAdGroupAd } from '../googleAds.js';

export default class UploadAdsSkill {
  /**
   * Uploads the generated paused ad to Google Ads.
   * @param {object} config - Application configuration
   * @param {string} accessToken - OAuth2 access token
   * @param {object} payload - Mutation payload
   * @returns {Promise<object>} Response from Google Ads API
   */
  async execute(config, accessToken, payload) {
    return await createAdGroupAd(config, accessToken, payload);
  }
}
