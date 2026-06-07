import BaseAgent from './BaseAgent.js';
import UploadAdsSkill from '../skills/UploadAdsSkill.js';

export default class UploadAgent extends BaseAgent {
  constructor() {
    super('uploader');
    this.uploadSkill = new UploadAdsSkill();
  }

  /**
   * Formats the reviewed ad and uploads it to Google Ads.
   * @param {object} config - App config
   * @param {string} accessToken - OAuth2 access token
   * @param {string} adGroupId - Target Google Ads Ad Group ID
   * @param {string} finalUrl - Target Final URL
   * @param {object} reviewedAd - Checked headlines and descriptions
   * @returns {Promise<object>} Upload response from the API
   */
  async uploadAlternative(config, accessToken, adGroupId, finalUrl, reviewedAd) {
    this.log(`Building upload payload for Ad Group: ${adGroupId}...`);

    const customerId = config.customerId.replace(/-/g, '');

    // Format headlines for Google Ads API schema
    const formattedHeadlines = reviewedAd.headlines.map(text => ({ text }));
    
    // Format descriptions for Google Ads API schema
    const formattedDescriptions = reviewedAd.descriptions.map(text => ({ text }));

    // Assemble payload
    const payload = {
      operations: [
        {
          create: {
            adGroup: `customers/${customerId}/adGroups/${adGroupId}`,
            status: 'PAUSED',
            ad: {
              finalUrls: [finalUrl],
              responsiveSearchAd: {
                headlines: formattedHeadlines,
                descriptions: formattedDescriptions
              }
            }
          }
        }
      ]
    };

    this.log(`Uploading pausing alternative ad via UploadAdsSkill...`);
    try {
      const response = await this.runSkill(this.uploadSkill, config, accessToken, payload);
      this.log(`Successfully uploaded ad alternative to Ad Group: ${adGroupId}`);
      return response;
    } catch (error) {
      this.log(`Failed upload operation: ${error.message}`);
      throw error;
    }
  }
}
