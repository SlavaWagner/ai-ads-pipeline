import axios from 'axios';

/**
 * Helper to build headers for Google Ads API requests
 * @param {object} config - Configuration object
 * @param {string} accessToken - Current OAuth2 access token
 * @returns {object} Headers dictionary
 */
function getHeaders(config, accessToken) {
  const headers = {
    'Content-Type': 'application/json',
    'developer-token': config.developerToken,
    'Authorization': `Bearer ${accessToken}`
  };

  if (config.loginCustomerId) {
    headers['login-customer-id'] = config.loginCustomerId.replace(/-/g, '');
  }

  return headers;
}

/**
 * Fetches up to 10 active Responsive Search Ads from Google Ads using searchStream.
 * @param {object} config - Configuration object
 * @param {string} accessToken - Current OAuth2 access token
 * @returns {Promise<Array>} Array of parsed ad objects
 */
export async function fetchActiveAds(config, accessToken) {
  const customerId = config.customerId.replace(/-/g, '');
  const url = `https://googleads.googleapis.com/${config.googleAdsVersion}/customers/${customerId}/googleAds:searchStream`;
  
  const query = `
    SELECT 
      ad_group_ad.ad.id, 
      ad_group_ad.ad.responsive_search_ad.headlines, 
      ad_group_ad.ad.responsive_search_ad.descriptions, 
      ad_group_ad.ad.final_urls, 
      ad_group_ad.ad_group, 
      metrics.all_conversions, 
      metrics.cost_per_all_conversions, 
      metrics.cost_micros 
    FROM ad_group_ad 
    WHERE ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD' 
      AND ad_group_ad.status IN ('ENABLED', 'PAUSED') 
      AND ad_group.status IN ('ENABLED', 'PAUSED') 
      AND campaign.status IN ('ENABLED', 'PAUSED') 
    LIMIT 10
  `.replace(/\s+/g, ' ').trim();

  try {
    const response = await axios.post(url, { query }, {
      headers: getHeaders(config, accessToken)
    });

    let allResults = [];
    if (Array.isArray(response.data)) {
      for (const chunk of response.data) {
        if (chunk.results && Array.isArray(chunk.results)) {
          allResults.push(...chunk.results);
        }
      }
    } else if (response.data && response.data.results) {
      // In case the API returns a single object instead of an array
      allResults = response.data.results;
    }

    return allResults.map(item => {
      const adGroupAd = item.adGroupAd;
      const metrics = item.metrics || {};
      
      return {
        adId: adGroupAd.ad.id,
        adGroup: adGroupAd.adGroup, // Format: customers/{customer_id}/adGroups/{ad_group_id}
        adGroupId: adGroupAd.adGroup.split('/').pop(),
        headlines: adGroupAd.ad.responsiveSearchAd?.headlines?.map(h => h.text) || [],
        descriptions: adGroupAd.ad.responsiveSearchAd?.descriptions?.map(d => d.text) || [],
        finalUrls: adGroupAd.ad.finalUrls || [],
        metrics: {
          allConversions: metrics.allConversions || 0,
          costPerAllConversion: metrics.costPerAllConversions || 0,
          cost: (metrics.costMicros || 0) / 1000000
        }
      };
    });
  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    throw new Error(`Google Ads searchStream API error: ${errorDetails}`);
  }
}

/**
 * Creates a new Responsive Search Ad in Google Ads as PAUSED using adGroupAds:mutate.
 * @param {object} config - Configuration object
 * @param {string} accessToken - Current OAuth2 access token
 * @param {object} payload - Mutation payload
 * @returns {Promise<object>} Response data from Google Ads API
 */
export async function createAdGroupAd(config, accessToken, payload) {
  const customerId = config.customerId.replace(/-/g, '');
  const url = `https://googleads.googleapis.com/${config.googleAdsVersion}/customers/${customerId}/adGroupAds:mutate`;

  try {
    const response = await axios.post(url, payload, {
      headers: getHeaders(config, accessToken)
    });
    return response.data;
  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    throw new Error(`Google Ads mutate API error: ${errorDetails}`);
  }
}

/**
 * Fetches keyword ideas and metrics from Google Ads API.
 * @param {object} config - Configuration object
 * @param {string} accessToken - Current OAuth2 access token
 * @param {string} seedKeyword - The keyword focus theme to generate ideas for
 * @returns {Promise<Array>} List of keywords with metrics
 */
export async function fetchKeywordIdeas(config, accessToken, seedKeyword) {
  const customerId = config.customerId.replace(/-/g, '');
  const url = `https://googleads.googleapis.com/${config.googleAdsVersion}/customers/${customerId}:generateKeywordIdeas`;

  const payload = {
    language: 'languageConstants/1001', // German
    geoTargetConstants: ['geoTargetConstants/2276'], // Germany
    keywordPlanNetwork: 'GOOGLE_SEARCH',
    keywordSeed: {
      keywords: [seedKeyword]
    }
  };

  try {
    const response = await axios.post(url, payload, {
      headers: getHeaders(config, accessToken)
    });

    if (response.data && Array.isArray(response.data.results)) {
      return response.data.results.map(item => {
        const metrics = item.keywordIdeaMetrics || {};
        return {
          keyword: item.text,
          avgMonthlySearches: metrics.avgMonthlySearches ? parseInt(metrics.avgMonthlySearches, 10) : 0,
          competition: metrics.competition || 'UNKNOWN',
          avgCpc: metrics.averageCpcMicros ? (parseInt(metrics.averageCpcMicros, 10) / 1000000) : 0,
          lowTopOfPageBid: metrics.lowTopOfPageBidMicros ? (parseInt(metrics.lowTopOfPageBidMicros, 10) / 1000000) : 0,
          highTopOfPageBid: metrics.highTopOfPageBidMicros ? (parseInt(metrics.highTopOfPageBidMicros, 10) / 1000000) : 0
        };
      });
    }
    return [];
  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    console.log(`[Google Ads API Warning]: Failed to fetch keyword ideas: ${errorDetails}`);
    return [];
  }
}

