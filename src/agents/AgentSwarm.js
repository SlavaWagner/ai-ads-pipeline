import BaseAgent from './BaseAgent.js';
import { generateText } from '../gemini.js';
import { getConfig } from '../config.js';

// Default English Persona Archetypes for initial export / fallback
export const DEFAULT_ENGLISH_PERSONAS = [
  { id: 'SWARM-01', name: 'Early Tech Adopter (m/28)', role: 'Tech-Savvy Innovation Lead', focus: 'Efficiency, Automation, Modern Stack & Innovation', mindset: 'Constantly seeks technological edge. Critical of outdated marketing claims and buzzwords.' },
  { id: 'SWARM-02', name: 'Skeptical Auditor (m/54)', role: 'Risk-Averse Quality Controller', focus: 'Transparency, Proven Proof Points & Risk Minimization', mindset: 'Questions every claim. Demands guarantees and precise facts without marketing hype.' },
  { id: 'SWARM-03', name: 'First-Time Buyer (f/32)', role: 'Entry-Level Customer', focus: 'Planning Security, Clear Guidance & Transparent Budgeting', mindset: 'Seeks security and clarity. Responds strongly to trust elements and clear upfront pricing.' },
  { id: 'SWARM-04', name: 'ROI-Driven Investor (m/48)', role: 'Yield & Cashflow Strategist', focus: 'ROI, Net Margin, Scalability & Equity Growth', mindset: 'Purely data and numbers driven. Rejects vague promises lacking financial substantiation.' },
  { id: 'SWARM-05', name: 'Cautious Conservative (f/42)', role: 'Security-Oriented Decision Maker', focus: 'Solid Protection, Stability & Proven Frameworks', mindset: 'Avoids unproven experiments. Requires established, trusted market frameworks.' },
  { id: 'SWARM-06', name: 'Legacy Asset Manager (m/39)', role: 'Substance Preserver & Successor', focus: 'Long-Term Value Preservation & Seamless Execution', mindset: 'Looks for simple, highly professional solutions for existing high-value assets.' },
  { id: 'SWARM-07', name: 'Senior Estate Planner (m/67)', role: 'Generational Wealth Advisor', focus: 'Family Protection & Tax-Optimized Legacy Transfer', mindset: 'Thinks in terms of decades. Values dignified, authoritative, and respectful messaging.' },
  { id: 'SWARM-08', name: 'Urban Career Executive (f/35)', role: 'Time-Constrained Senior Manager', focus: 'Time Optimization, Premium Service & Fast Execution', mindset: 'High purchasing power but severely time-constrained. Responds to high-end positioning.' },
  { id: 'SWARM-09', name: 'Conservative Wealth Protector (m/61)', role: 'Capital Protection Specialist', focus: 'Inflation Defense & Tangible Asset Stability', mindset: 'Seeks stability during volatile market cycles. Dislikes aggressive pushy advertising.' },
  { id: 'SWARM-10', name: 'ESG & Sustainability Advocate (f/31)', role: 'Sustainability Specialist', focus: 'Eco-Efficiency, ESG Compliance & Future-Proofing', mindset: 'Evaluates ecological alignment and long-term sustainable standards.' },
  { id: 'SWARM-11', name: 'Value & Deal Hunter (m/44)', role: 'Cost-Performance Optimizer', focus: 'Undervalued Deals, High Leverage & Arbitrage Edge', mindset: 'Always searches for pricing leverage, value arbitrage, and strategic cost advantage.' },
  { id: 'SWARM-12', name: 'Commercial Portfolio Scaler (m/52)', role: 'Multi-Unit B2B Investor', focus: 'Scalability, Portfolio Synergies & Enterprise Growth', mindset: 'Thinks in terms of multi-unit portfolios. Responds to structured B2B metrics.' },
  { id: 'SWARM-13', name: 'Suburban Relocator (f/37)', role: 'Quality of Life & Space Seeker', focus: 'Expansion, Space, Work-Life Balance & Comfort', mindset: 'Escaping urban burnout, looking for sustainable spatial and lifestyle upgrades.' },
  { id: 'SWARM-14', name: 'Downsizer / Best-Ager (f/64)', role: 'Low-Maintenance & Comfort Advocate', focus: 'Accessibility, Simplicity & Low Operational Friction', mindset: 'Streamlining footprint for maximum enjoyment without operational hassle.' },
  { id: 'SWARM-15', name: 'Growth Tech Entrepreneur (m/33)', role: 'Scaling Founder', focus: 'Asymmetrical Leverage, Automation & Rapid Scaling', mindset: 'Seeks exponential leverage. Immediately understands modern AI-driven solutions.' },
  { id: 'SWARM-16', name: 'Multi-Stakeholder Coordinator (f/45)', role: 'Organizational Planner', focus: 'Alignment, Multi-Gen Flexibility & Risk Balancing', mindset: 'Carefully balances requirements across diverse decision-makers before buying.' },
  { id: 'SWARM-17', name: 'Passive Income Seeker (m/36)', role: 'Hands-Off Investor', focus: 'Automated Management & Frictionless Yield', mindset: 'Wants zero administrative overhead with maximum stress-free return.' },
  { id: 'SWARM-18', name: 'Prestige & Status Buyer (m/46)', role: 'High-End Exclusive Buyer', focus: 'Exclusivity, Status, Brand Prestige & Craftsmanship', mindset: 'Seeks elite, premium-grade offerings unavailable to the mass market.' },
  { id: 'SWARM-19', name: 'Value-Add Practitioner (m/41)', role: 'Hands-On Growth Optimizer', focus: 'Equity Creation, Renovation & Upside Potential', mindset: 'Looks for unpolished gems with high value-add potential.' },
  { id: 'SWARM-20', name: 'Institutional Board Director (f/58)', role: 'Regulated Governance Officer', focus: 'Governance, Compliance, Low Volatility & Stability', mindset: 'Strict investment guidelines and conservative risk profile. Requires compliance.' }
];

export const SWARM_PERSONAS = DEFAULT_ENGLISH_PERSONAS;

export default class AgentSwarm extends BaseAgent {
  constructor() {
    super('agent_swarm');
    this.personas = [...DEFAULT_ENGLISH_PERSONAS];
    this.currentOffer = 'General Offer';
    this.currentIndustry = 'General Industry';
    this.currentAudience = 'Target Customers';
  }

  /**
   * Derives offer, industry, and target audience from ad copy assets, theme, or context.
   * @param {object} adContext
   * @returns {object} { offer, industry, targetAudience }
   */
  deriveOfferAndAudience(adContext = {}) {
    let textToAnalyze = '';

    if (adContext.headlines && Array.isArray(adContext.headlines)) {
      textToAnalyze += adContext.headlines.join(' ') + ' ';
    }
    if (adContext.descriptions && Array.isArray(adContext.descriptions)) {
      textToAnalyze += adContext.descriptions.join(' ') + ' ';
    }
    if (adContext.theme) {
      textToAnalyze += adContext.theme + ' ';
    }
    if (adContext.contextIndustry) {
      textToAnalyze += adContext.contextIndustry + ' ';
    }

    let offer = adContext.offer || '';
    let industry = adContext.industry || adContext.contextIndustry || adContext.theme || '';
    let targetAudience = adContext.targetAudience || '';

    // Infer Industry if generic
    if (!industry || industry === 'Immobilien & High-Price Lead Gen') {
      const lower = textToAnalyze.toLowerCase();
      if (lower.includes('saas') || lower.includes('software') || lower.includes('b2b')) {
        industry = 'B2B Software & Tech Services';
      } else if (lower.includes('finance') || lower.includes('refinanc') || lower.includes('loan') || lower.includes('bank') || lower.includes('kredit')) {
        industry = 'Financial Services & Capital Management';
      } else if (lower.includes('e-commerce') || lower.includes('shop') || lower.includes('store')) {
        industry = 'E-Commerce & DTC Retail';
      } else if (lower.includes('immo') || lower.includes('estate') || lower.includes('haus') || lower.includes('wohnung') || lower.includes('rendite')) {
        industry = 'Real Estate & High-Ticket Investments';
      } else {
        industry = adContext.theme || 'Performance Marketing & Lead Gen';
      }
    }

    // Infer Offer if not set
    if (!offer) {
      if (adContext.headlines && adContext.headlines.length > 0) {
        offer = adContext.headlines.slice(0, 3).join(' | ');
      } else if (adContext.theme) {
        offer = `${adContext.theme} Solution`;
      } else {
        offer = 'High-Value Product / Service Offer';
      }
    }

    // Infer Target Audience if not set
    if (!targetAudience) {
      const lowerInd = industry.toLowerCase();
      if (lowerInd.includes('b2b') || lowerInd.includes('software')) {
        targetAudience = 'B2B Executives, Founders & Operations Directors';
      } else if (lowerInd.includes('real estate') || lowerInd.includes('immo')) {
        targetAudience = 'High-Net-Worth Investors, Homebuyers & Property Owners';
      } else if (lowerInd.includes('finance') || lowerInd.includes('capital')) {
        targetAudience = 'Investors, Asset Managers & Capital Allocators';
      } else {
        targetAudience = 'Target Buyers & Decision Makers';
      }
    }

    return { offer, industry, targetAudience };
  }

  /**
   * Dynamically generates 20 persona test customer agents based on the ad copy, derived offer, industry, and target audience.
   * Runs in ENGLISH.
   * @param {object} adContext
   * @param {string} [apiKey]
   * @returns {Promise<Array>} List of 20 persona objects
   */
  async generateDynamicPersonas(adContext = {}, apiKey = null) {
    const { offer, industry, targetAudience } = this.deriveOfferAndAudience(adContext);
    this.currentOffer = offer;
    this.currentIndustry = industry;
    this.currentAudience = targetAudience;

    this.log(`Dynamically generating 20 Persona Agents in English...`);
    this.log(`  Derived Industry: ${industry}`);
    this.log(`  Derived Offer:    ${offer}`);
    this.log(`  Target Audience:  ${targetAudience}`);

    const config = getConfig();
    const activeApiKey = apiKey || config.geminiApiKey;

    if (activeApiKey) {
      try {
        const personas = await this.generatePersonasWithLLM(activeApiKey, offer, industry, targetAudience, adContext);
        if (personas && personas.length >= 15) {
          this.personas = personas;
          this.log(`[SUCCESS] LLM dynamically generated ${this.personas.length} personas tailored to offer & branding!`);
          return this.personas;
        }
      } catch (err) {
        this.log(`Notice: LLM persona generation fallback triggered (${err.message}). Using dynamic dynamic-fallback generator.`);
      }
    }

    // Fallback dynamic persona generator in English
    this.personas = this.generatePersonasFallback(offer, industry, targetAudience);
    this.log(`[OK] Generated ${this.personas.length} dynamic English personas tailored to "${offer}" (${industry}).`);
    return this.personas;
  }

  /**
   * Generates 20 tailored English personas via Gemini LLM call.
   */
  async generatePersonasWithLLM(apiKey, offer, industry, targetAudience, adContext) {
    const systemPrompt = `
You are an AI Agent Swarm Architect specializing in customer persona generation for predictive ad testing.
Your job is to generate exactly 20 distinct, highly realistic test customer personas (SWARM-01 through SWARM-20) in ENGLISH representing diverse sub-audiences, buyer types, decision-makers, and risk profiles tailored specifically to the offer, industry, and target audience of the given ad creative.

Each persona MUST be an object with:
- id: "SWARM-01" to "SWARM-20"
- name: Persona Title with demographic/role tag in English (e.g. "Risk-Averse CFO (m/52)")
- role: Customer or buyer job role in English (e.g. "Enterprise Financial Auditor")
- focus: Key buying priorities & criteria for this specific offer in English
- mindset: Psychographic attitude and behavior towards this offer in English

Return ONLY a valid JSON array containing exactly 20 persona objects.
`;

    const sampleHeadlines = (adContext.headlines || []).slice(0, 5).join(' | ');
    const sampleDescriptions = (adContext.descriptions || []).slice(0, 3).join(' | ');

    const userPrompt = `
CAMPAIGN & AD COPY CONTEXT FOR DYNAMIC PERSONA GENERATION:
- Industry / Niche: ${industry}
- Derived Offer: ${offer}
- Primary Target Audience: ${targetAudience}
- Sample Headlines: ${sampleHeadlines || 'N/A'}
- Sample Descriptions: ${sampleDescriptions || 'N/A'}

Generate 20 tailored English test customer personas in JSON format.
`;

    const rawText = await generateText(apiKey, systemPrompt, userPrompt, this.model, true);
    let cleanJson = rawText.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
    }
    const parsed = JSON.parse(cleanJson);
    if (Array.isArray(parsed) && parsed.length >= 15) {
      return parsed.map((p, idx) => ({
        id: p.id || `SWARM-${(idx + 1).toString().padStart(2, '0')}`,
        name: p.name || `Test Customer ${idx + 1}`,
        role: p.role || `Buyer Role ${idx + 1}`,
        focus: p.focus || `Key priorities for ${offer}`,
        mindset: p.mindset || `Evaluates ${offer} based on value and fit.`
      }));
    }
    throw new Error('Invalid persona array returned from LLM');
  }

  /**
   * Deterministic dynamic fallback generator for 20 English personas tailored to offer & industry.
   */
  generatePersonasFallback(offer, industry, targetAudience) {
    return [
      { id: 'SWARM-01', name: 'Early Tech Adopter (m/28)', role: 'Innovation Driver', focus: `Efficiency, Automation & Modern Stack in ${industry}`, mindset: `Constantly seeks technological edge for ${offer}. Critical of outdated marketing claims.` },
      { id: 'SWARM-02', name: 'Skeptical Auditor (m/54)', role: 'Risk-Averse Controller', focus: `Transparency, Data Proof & Risk Reduction for ${offer}`, mindset: `Questions every claim. Demands verifiable facts and proof before committing.` },
      { id: 'SWARM-03', name: 'First-Time Buyer (f/32)', role: 'Entry-Level Customer', focus: `Planning Security, Transparent Pricing & Clear Guidance`, mindset: `Seeks security and trust when evaluating ${offer}. Responds strongly to transparent terms.` },
      { id: 'SWARM-04', name: 'ROI-Driven Investor (m/48)', role: 'Yield & Performance Specialist', focus: `ROI, Net Margins, Cashflow & Measurable Gains`, mindset: `Data and ROI-focused. Dismissive of marketing hype lacking financial proof for ${offer}.` },
      { id: 'SWARM-05', name: 'Cautious Conservative (f/42)', role: 'Security-Oriented Decision Maker', focus: `Solid Protection, Stability & Proven Industry Frameworks`, mindset: `Avoids unnecessary risks. Requires established, trusted solutions in ${industry}.` },
      { id: 'SWARM-06', name: 'Legacy Asset Manager (m/39)', role: 'Substance & Succession Specialist', focus: `Long-Term Value Preservation & Hassle-Free Execution`, mindset: `Seeks seamless, highly professional execution for existing high-value assets.` },
      { id: 'SWARM-07', name: 'Senior Estate Planner (m/67)', role: 'Generational Advisor', focus: `Protection & Sustainable Value Transition`, mindset: `Thinks in terms of decades. Prefers dignified, authoritative, and respectful positioning.` },
      { id: 'SWARM-08', name: 'Urban Career Executive (f/35)', role: 'Time-Constrained Senior Manager', focus: `Time Savings, Premium Service & Fast Implementation`, mindset: `Has budget but limited time. Responds strongly to premium service for ${offer}.` },
      { id: 'SWARM-09', name: 'Conservative Wealth Protector (m/61)', role: 'Capital Protection Specialist', focus: `Purchasing Power Defense & Asset Security`, mindset: `Seeks stability in volatile market environments. Dislikes aggressive pushy ads.` },
      { id: 'SWARM-10', name: 'ESG & Sustainability Advocate (f/31)', role: 'Sustainability Specialist', focus: `Eco-Efficiency, ESG Compliance & Future-Proofing`, mindset: `Prioritizes ecological standards and sustainable long-term standards in ${industry}.` },
      { id: 'SWARM-11', name: 'Value & Arbitrage Hunter (m/44)', role: 'Cost-Performance Optimizer', focus: `Undervalued Deals & Competitive Leverage`, mindset: `Always searches for pricing leverage and strategic advantage with ${offer}.` },
      { id: 'SWARM-12', name: 'Commercial Portfolio Scaler (m/52)', role: 'Multi-Unit B2B Investor', focus: `Scalability, Synergies & Enterprise Metrics`, mindset: `Thinks in terms of scale. Evaluates structured B2B performance metrics.` },
      { id: 'SWARM-13', name: 'Suburban Relocator (f/37)', role: 'Quality of Life & Space Seeker', focus: `Expansion, Work-Life Balance & Comfort`, mindset: `Looking to upgrade performance and experience with minimal operational friction.` },
      { id: 'SWARM-14', name: 'Downsizer / Best-Ager (f/64)', role: 'Low-Maintenance Advocate', focus: `Ease of Use, Maintenance-Free & Accessibility`, mindset: `Streamlines operations for maximum peace of mind with ${offer}.` },
      { id: 'SWARM-15', name: 'Growth Tech Entrepreneur (m/33)', role: 'Scaling Founder', focus: `Asymmetrical Leverage & Autonomous Workflows`, mindset: `Seeks high leverage. Immediately grasps modern automated frameworks for ${offer}.` },
      { id: 'SWARM-16', name: 'Multi-Stakeholder Planner (f/45)', role: 'Organizational Coordinator', focus: `Alignment, Flexibility & Risk Mitigation`, mindset: `Balances requirements across diverse internal decision-makers before buying.` },
      { id: 'SWARM-17', name: 'Passive Income Seeker (m/36)', role: 'Hands-Off Customer', focus: `Automated Management & Stress-Free Returns`, mindset: `Wants zero administrative overhead with maximum operational efficiency.` },
      { id: 'SWARM-18', name: 'Prestige & Status Buyer (m/46)', role: 'High-End Status Buyer', focus: `Exclusivity, Brand Prestige & Distinction`, mindset: `Seeks elite, premium-grade solutions that set them apart from competitors.` },
      { id: 'SWARM-19', name: 'Value-Add Specialist (m/41)', role: 'Hands-On Growth Optimizer', focus: `Equity Creation, Renovation & Upside Potential`, mindset: `Looks for unpolished gems with high upside potential for ${offer}.` },
      { id: 'SWARM-20', name: 'Institutional Board Director (f/58)', role: 'Regulated Governance Officer', focus: `Governance, Compliance & Low Volatility`, mindset: `Strict guidelines and conservative risk profile. Requires compliance for ${industry}.` }
    ];
  }

  /**
   * Evaluates candidate ad alternatives using the dynamically generated 20 persona customer agents in ENGLISH.
   * @param {Array} adCandidates - List of scored ad alternatives
   * @param {string} [track='RSA'] - 'RSA' or 'PMax'
   * @param {string} [contextIndustry] - Industry context
   * @param {object} [adContext={}] - Context containing headlines, descriptions, theme, url, offer, audience
   * @returns {Promise<object>} Swarm evaluation report with statements & metric projections in English
   */
  async runPredictiveTesting(adCandidates, track = 'RSA', contextIndustry = 'General Industry', adContext = {}) {
    this.log(`[START] Starting 20-Agent Swarm Predictive Asset Testing in English...`);
    
    // Combine candidate information with adContext to generate dynamic personas
    const combinedContext = {
      contextIndustry,
      theme: adContext.theme || contextIndustry,
      finalUrl: adContext.finalUrl,
      headlines: adContext.headlines || (adCandidates[0] ? adCandidates[0].headlines : []),
      descriptions: adContext.descriptions || (adCandidates[0] ? adCandidates[0].descriptions : []),
      offer: adContext.offer,
      targetAudience: adContext.targetAudience
    };

    // Dynamically generate personas for this ad creative & offer
    await this.generateDynamicPersonas(combinedContext);

    this.log(`Track: ${track} | Industry: ${this.currentIndustry} | Offer: ${this.currentOffer}`);
    this.log(`Active Personas: 20 Swarm Agents generated dynamically for ${this.currentAudience}`);

    const config = getConfig();
    const hasLLM = Boolean(config.geminiApiKey);

    const evaluatedCandidates = [];
    const topCandidates = adCandidates.slice(0, adContext.topCount || 40);

    for (let i = 0; i < topCandidates.length; i++) {
      const candidate = topCandidates[i];
      this.log(`\n--------------------------------------------------`);
      this.log(`Swarm evaluating Ad Candidate #${i + 1} [${candidate.id}] (${candidate.vectorization.d1_framework} | ${candidate.vectorization.d2_angle})`);
      
      let swarmResults = [];

      if (hasLLM) {
        swarmResults = await this.evaluateCandidateWithLLMSwarm(config.geminiApiKey, candidate, track, this.currentIndustry);
      } else {
        swarmResults = this.simulateSwarmEvaluation(candidate, track);
      }

      // Aggregate Swarm Metrics
      const avgCTR = (swarmResults.reduce((acc, curr) => acc + curr.projectedCTR, 0) / swarmResults.length).toFixed(2);
      const avgCPC = (swarmResults.reduce((acc, curr) => acc + curr.projectedCPC, 0) / swarmResults.length).toFixed(2);
      const avgCPM = (swarmResults.reduce((acc, curr) => acc + curr.projectedCPM, 0) / swarmResults.length).toFixed(2);
      const avgCPL = (swarmResults.reduce((acc, curr) => acc + curr.projectedCPL, 0) / swarmResults.length).toFixed(2);
      const approvalCount = swarmResults.filter(r => r.score >= 7.0).length;
      const approvalRate = ((approvalCount / swarmResults.length) * 100).toFixed(1);

      evaluatedCandidates.push({
        candidateId: candidate.id,
        track,
        spineTheme: candidate.spineTheme,
        metaphor: candidate.metaphor,
        matrixGrade: candidate.matrixEvaluation.grade,
        matrixScore: candidate.matrixEvaluation.weighted_score,
        headlines: candidate.headlines,
        longHeadlines: candidate.longHeadlines || [],
        descriptions: candidate.descriptions,
        vectorization: candidate.vectorization,
        swarmSummary: {
          approvalRatePercent: parseFloat(approvalRate),
          approvedAgentsCount: approvalCount,
          totalAgents: swarmResults.length,
          projectedMetrics: {
            ctrPercent: parseFloat(avgCTR),
            cpcEuro: parseFloat(avgCPC),
            cpmEuro: parseFloat(avgCPM),
            costPerLeadEuro: parseFloat(avgCPL)
          }
        },
        agentStatements: swarmResults
      });
    }

    evaluatedCandidates.sort((a, b) => b.swarmSummary.approvalRatePercent - a.swarmSummary.approvalRatePercent);

    const winner = evaluatedCandidates[0];
    this.log(`\n[WINNER] AD ALTERNATIVE DETERMINED BY SWARM:`);
    if (winner) {
      this.log(`  ID: ${winner.candidateId} (Grade: ${winner.matrixGrade}, Matrix Score: ${winner.matrixScore})`);
      this.log(`  Swarm Approval: ${winner.swarmSummary.approvalRatePercent}%`);
      this.log(`  Projections: CTR ${winner.swarmSummary.projectedMetrics.ctrPercent}% | CPC €${winner.swarmSummary.projectedMetrics.cpcEuro} | CPM €${winner.swarmSummary.projectedMetrics.cpmEuro} | CPL €${winner.swarmSummary.projectedMetrics.costPerLeadEuro}`);
    }

    return {
      timestamp: new Date().toISOString(),
      track,
      industry: this.currentIndustry,
      offer: this.currentOffer,
      targetAudience: this.currentAudience,
      totalCandidatesTested: topCandidates.length,
      swarmSize: this.personas.length,
      winnerCandidateId: winner ? winner.candidateId : null,
      evaluatedCandidates
    };
  }

  /**
   * Uses Gemini to evaluate a candidate ad against all 20 dynamic personas in English.
   */
  async evaluateCandidateWithLLMSwarm(apiKey, candidate, track, contextIndustry) {
    const systemPrompt = `
You are a high-precision simulator for an Agent Swarm testing system consisting of 20 distinct test customer personas (Agent Swarm).
Your task is to analyze an ad creative (Track: ${track}, Industry Context: ${contextIndustry}, Offer: ${this.currentOffer}) from the perspectives of all 20 dynamically generated personas and output their qualitative statement and performance metric projections.

CRITICAL INSTRUCTION: ALL STATEMENTS, FEEDBACK, AND COMMENTS MUST BE IN ENGLISH.

The 20 dynamic personas are:
${this.personas.map(p => `- ${p.id}: ${p.name} (${p.role}). Focus: ${p.focus}. Mindset: ${p.mindset}`).join('\n')}

Evaluate the ad copy thoroughly from each persona's mindset and return a JSON array containing exactly 20 objects:
[
  {
    "personaId": "SWARM-01",
    "personaName": "Early Tech Adopter (m/28)",
    "score": 8.5,
    "statement": "Authentic 1-2 sentence feedback comment in English in the persona's tone",
    "projectedCTR": 6.8,
    "projectedCPC": 2.10,
    "projectedCPM": 32.00,
    "projectedCPL": 45.00
  },
  ...
]
`;

    const userPrompt = `
AD DRAFT FOR EVALUATION:
Candidate ID: ${candidate.id}
Offer: ${this.currentOffer}
Industry: ${contextIndustry}
Spine Theme: ${candidate.spineTheme}
Angle / Metaphor: ${candidate.metaphor}
Framework: ${candidate.vectorization.d1_framework} | Angle: ${candidate.vectorization.d2_angle} | Hook: ${candidate.vectorization.d5_hook_type}

Headlines:
${candidate.headlines.map(h => `- ${h}`).join('\n')}

${candidate.longHeadlines && candidate.longHeadlines.length > 0 ? `Long Headlines:\n${candidate.longHeadlines.map(lh => `- ${lh}`).join('\n')}\n` : ''}
Descriptions:
${candidate.descriptions.map(d => `- ${d}`).join('\n')}
`;

    try {
      const rawText = await generateText(apiKey, systemPrompt, userPrompt, this.model, true);
      let cleanJson = rawText.trim();
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
      }
      const parsed = JSON.parse(cleanJson);
      if (Array.isArray(parsed) && parsed.length >= 15) {
        return parsed;
      }
      throw new Error('LLM returned incomplete persona array.');
    } catch (err) {
      this.log(`LLM Swarm evaluation fallback triggered: ${err.message}`);
      return this.simulateSwarmEvaluation(candidate, track);
    }
  }

  /**
   * Deterministic mathematical fallback simulation for 20 dynamic personas in ENGLISH.
   */
  simulateSwarmEvaluation(candidate, track) {
    const baseScore = candidate.matrixEvaluation.weighted_score;
    const isPMax = track.toUpperCase() === 'PMAX';

    return this.personas.map((p, idx) => {
      const variance = ((idx * 7) % 19 - 9) / 10;
      const personaScore = Math.min(9.9, Math.max(3.0, parseFloat((baseScore + variance).toFixed(1))));

      const ctr = parseFloat((3.5 + (personaScore / 10) * 4.8 + (idx % 3) * 0.4).toFixed(2));
      const cpc = parseFloat((3.80 - (personaScore / 10) * 1.60 + (idx % 4) * 0.25).toFixed(2));
      const cpm = parseFloat((24.00 + (10 - personaScore) * 3.50 + (idx % 5) * 2.10).toFixed(2));
      const cpl = parseFloat((isPMax ? 38.00 : 48.00) + (10 - personaScore) * 7.50 + (idx % 6) * 3.20).toFixed(2);

      let statement = '';
      if (personaScore >= 8.0) {
        statement = `"The story spin '${candidate.spineTheme}' directly hits my core priority for ${this.currentOffer}. This messaging stands out clearly from competitors!"`;
      } else if (personaScore >= 6.5) {
        statement = `"Solid approach using the ${candidate.vectorization.d1_framework} framework. Clear value proposition and understandable call-to-action."`;
      } else {
        statement = `"Feels a bit generic for my specific requirements. I would expect a sharper hook and stronger proof points for ${this.currentOffer}."`;
      }

      return {
        personaId: p.id,
        personaName: p.name,
        score: personaScore,
        statement,
        projectedCTR: ctr,
        projectedCPC: Math.max(0.80, cpc),
        projectedCPM: Math.max(12.00, cpm),
        projectedCPL: Math.max(18.00, cpl)
      };
    });
  }
}

