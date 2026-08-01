import BaseAgent from './BaseAgent.js';
import FetchAdsSkill from '../skills/FetchAdsSkill.js';

export default class OrchestratorAgent extends BaseAgent {
  constructor() {
    super('orchestrator');
    this.fetchAdsSkill = new FetchAdsSkill();
  }

  /**
   * Fetches active responsive search ads using Google Ads SearchStream.
   * @param {object} config - App credentials config
   * @param {string} accessToken - Google Ads access token
   * @returns {Promise<Array>} List of ads (max 10)
   */
  async fetchAds(config, accessToken) {
    this.log('Fetching active responsive search ads from Google Ads API...');
    try {
      const ads = await this.runSkill(this.fetchAdsSkill, config, accessToken);
      this.log(`Successfully fetched ${ads.length} active ads.`);
      // Enforce the requirement: Limit processing to exactly 10 active ads.
      const targetAds = ads.slice(0, 10);
      this.log(`Limiting pipeline processing to ${targetAds.length} ads.`);
      return targetAds;
    } catch (error) {
      this.log(`Error fetching ads: ${error.message}`);
      throw error;
    }
  }

  /**
   * Coordinates the complete optimization workflow.
   * @param {object} config - Application configuration
   * @param {string} accessToken - OAuth2 access token
   * @param {CopywriterAgent} copywriterAgent - Instantiated Copywriter Agent
   * @param {ReviewAgent} reviewAgent - Instantiated Review Agent
   * @param {UploadAgent} uploadAgent - Instantiated Upload Agent
   * @param {string} [frameworkName] - Optional framework name chosen by user
   * @returns {Promise<Array>} Run logs and results
   */
  async runWorkflow(config, accessToken, copywriterAgent, reviewAgent, uploadAgent, frameworkName) {
    this.log('Starting entire Google Ads optimization workflow...');
    
    // Step 1: Fetch active ads
    const activeAds = await this.fetchAds(config, accessToken);
    if (activeAds.length === 0) {
      this.log('No active responsive search ads found to process.');
      return [];
    }

    const results = [];

    // Step 2: Loop through each ad and run the pipeline
    for (let idx = 0; idx < activeAds.length; idx++) {
      const ad = activeAds[idx];
      this.log(`--------------------------------------------------`);
      this.log(`Processing Ad [${idx + 1}/${activeAds.length}] (Ad ID: ${ad.adId})`);
      this.log(`Ad Group ID: ${ad.adGroupId}`);
      this.log(`Current Headlines: ${ad.headlines.slice(0, 3).join(' | ')}...`);
      this.log(`Final URL: ${ad.finalUrls[0] || 'None'}`);

      const finalUrl = ad.finalUrls[0];
      if (!finalUrl) {
        this.log(`Skipping Ad ID ${ad.adId}: Final URL is missing (required for scraping context).`);
        continue;
      }

      try {
        // Run Agent 2: Copywriter
        this.log(`Executing Copywriter Agent to identify new angle and create headlines/descriptions...`);
        const copywritingDraft = await copywriterAgent.createAlternative(ad, finalUrl, frameworkName);
        
        // Run Agent 3: Quality & Compliance Reviewer
        this.log(`Executing Review Agent to verify character limits, normalize tone, and filter terms...`);
        const complianceResult = await reviewAgent.reviewDraft(copywritingDraft, finalUrl, copywritingDraft.scrapedContext);
        
        // Run Agent 4: Formatting & Uploader
        this.log(`Executing Upload Agent to format payload and upload pausing alternative...`);
        const uploadResult = await uploadAgent.uploadAlternative(config, accessToken, ad.adGroupId, finalUrl, complianceResult);
        
        this.log(`Ad ID ${ad.adId} successfully processed and alternative uploaded!`);
        results.push({
          originalAdId: ad.adId,
          adGroupId: ad.adGroupId,
          finalUrl,
          angle: copywritingDraft.angle,
          originalHeadlines: ad.headlines,
          originalDescriptions: ad.descriptions,
          optimizedHeadlines: complianceResult.headlines,
          optimizedDescriptions: complianceResult.descriptions,
          uploadResult
        });
      } catch (err) {
        this.log(`Failed to process Ad ID ${ad.adId}: ${err.message}`);
        results.push({
          originalAdId: ad.adId,
          adGroupId: ad.adGroupId,
          finalUrl,
          error: err.message
        });
      }
    }

    this.log('--------------------------------------------------');
    this.log(`Workflow complete. Processed ${activeAds.length} ads. Successful: ${results.filter(r => !r.error).length}`);
    return results;
  }

  /**
   * Executes the full autonomous workflow to generate Performance Max (PMax) Asset Group alternatives.
   * @param {object} config - App config
   * @param {string} accessToken - OAuth2 access token
   * @param {string} [frameworkName] - Optional copywriting framework name
   * @returns {Promise<Array>} Results of processing active PMax Asset Groups
   */
  async runPMaxPipeline(config, accessToken, frameworkName = null) {
    this.log('==================================================');
    this.log('Starting PMax Asset Group Alternative Pipeline Execution...');
    if (frameworkName) {
      this.log(`Selected Copywriting Framework: ${frameworkName}`);
    } else {
      this.log('Using default framework: Angles (Pain Point + Solution Frame)');
    }
    this.log('==================================================');

    const { fetchActivePMaxAssetGroups } = await import('../googleAds.js');
    const CopywriterAgent = (await import('./CopywriterAgent.js')).default;
    const ReviewAgent = (await import('./ReviewAgent.js')).default;
    const UploadAgent = (await import('./UploadAgent.js')).default;

    const copywriterAgent = new CopywriterAgent();
    const reviewAgent = new ReviewAgent();
    const uploadAgent = new UploadAgent();

    this.log('Fetching active Performance Max Asset Groups via Google Ads API...');
    let activeGroups = [];
    try {
      activeGroups = await fetchActivePMaxAssetGroups(config, accessToken);
      this.log(`Found ${activeGroups.length} active Performance Max Asset Group(s).`);
    } catch (err) {
      this.log(`Error fetching active PMax Asset Groups: ${err.message}`);
      throw err;
    }

    if (activeGroups.length === 0) {
      this.log('No active Performance Max Asset Groups found to process.');
      return [];
    }

    const results = [];

    for (let idx = 0; idx < activeGroups.length; idx++) {
      const pmaxGroup = activeGroups[idx];
      this.log(`--------------------------------------------------`);
      this.log(`Processing PMax Asset Group [${idx + 1}/${activeGroups.length}] (ID: ${pmaxGroup.assetGroupId}, Name: "${pmaxGroup.assetGroupName}")`);
      this.log(`Campaign Resource Name: ${pmaxGroup.campaignResourceName}`);
      this.log(`Final URL: ${pmaxGroup.finalUrls[0] || 'None'}`);

      const finalUrl = pmaxGroup.finalUrls[0];
      if (!finalUrl) {
        this.log(`Skipping Asset Group ${pmaxGroup.assetGroupId}: Final URL is missing (required for scraping context).`);
        continue;
      }

      try {
        this.log(`Executing Copywriter Agent for PMax Asset Group alternative...`);
        const copywritingDraft = await copywriterAgent.createPMaxAlternative(pmaxGroup, finalUrl, frameworkName);
        
        this.log(`Executing Review Agent for PMax Compliance (30/90/90 limits & policy)...`);
        const complianceResult = await reviewAgent.reviewPMaxDraft(copywritingDraft, finalUrl, copywritingDraft.scrapedContext);
        
        this.log(`Executing Upload Agent to create PMax Asset Group as PAUSED...`);
        const uploadResult = await uploadAgent.uploadPMaxAssetGroup(
          config,
          accessToken,
          pmaxGroup.campaignResourceName,
          finalUrl,
          complianceResult,
          pmaxGroup.imageResourceNames || [],
          `AI PMax ${pmaxGroup.assetGroupName} (PAUSED)`
        );
        
        this.log(`PMax Asset Group ID ${pmaxGroup.assetGroupId} successfully processed and new Asset Group created!`);
        results.push({
          originalAssetGroupId: pmaxGroup.assetGroupId,
          campaignResourceName: pmaxGroup.campaignResourceName,
          finalUrl,
          angle: copywritingDraft.angle,
          optimizedHeadlines: complianceResult.headlines,
          optimizedLongHeadlines: complianceResult.longHeadlines,
          optimizedDescriptions: complianceResult.descriptions,
          uploadResult
        });
      } catch (err) {
        this.log(`Failed to process PMax Asset Group ID ${pmaxGroup.assetGroupId}: ${err.message}`);
        results.push({
          originalAssetGroupId: pmaxGroup.assetGroupId,
          campaignResourceName: pmaxGroup.campaignResourceName,
          finalUrl,
          error: err.message
        });
      }
    }

    this.log('--------------------------------------------------');
    this.log(`PMax Workflow complete. Processed ${activeGroups.length} groups. Successful: ${results.filter(r => !r.error).length}`);
    return results;
  }
}
