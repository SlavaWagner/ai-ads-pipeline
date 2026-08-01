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

  /**
   * Formats and uploads a PMax Asset Group to Google Ads as PAUSED.
   * @param {object} config - App config
   * @param {string} accessToken - OAuth2 access token
   * @param {string} campaignResourceName - Target Campaign Resource Name
   * @param {string} finalUrl - Target Final URL
   * @param {object} reviewedPMaxAd - Checked headlines, longHeadlines, and descriptions
   * @param {Array} [sourceImageResourceNames] - Optional source image resource names
   * @param {string} [customGroupName] - Optional name for the new PMax Asset Group
   * @returns {Promise<object>} Upload response from the API
   */
  async uploadPMaxAssetGroup(config, accessToken, campaignResourceName, finalUrl, reviewedPMaxAd, sourceImageResourceNames = [], customGroupName = null) {
    this.log(`Building PMax upload payload for Campaign: ${campaignResourceName}...`);
    try {
      const { createPMaxAssetGroup } = await import('../googleAds.js');
      const response = await createPMaxAssetGroup(
        config,
        accessToken,
        campaignResourceName,
        finalUrl,
        reviewedPMaxAd.headlines,
        reviewedPMaxAd.longHeadlines,
        reviewedPMaxAd.descriptions,
        sourceImageResourceNames,
        customGroupName
      );
      this.log(`Successfully created PMax Asset Group: "${response.groupName}" (${response.createdAssetsCount} text assets attached).`);
      return response;
    } catch (error) {
      this.log(`Failed PMax asset group creation: ${error.message}`);
      throw error;
    }
  }
}
