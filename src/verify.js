import chalk from 'chalk';
import { getAgent, listAgents, initStorage } from './storage.js';
import ReviewAgent from './agents/ReviewAgent.js';
import ETSForecaster from './scoring/ETSForecaster.js';
import { fetchHistoricalPerformanceMetrics } from './googleAds.js';

initStorage();

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(chalk.green(`  ✔ PASSED: ${message}`));
    passedTests++;
  } else {
    console.log(chalk.red(`  ✖ FAILED: ${message}`));
    failedTests++;
  }
}

async function runTests() {
  console.log(chalk.bold.cyan('\n=== Run local verification tests ===\n'));

  // Test 1: Storage Initialization and Agent configs loading
  try {
    console.log(chalk.yellow('Test 1: Agent Loader and Config Storage...'));
    const agents = listAgents();
    assert(agents.length >= 6, `Expected at least 6 default agents, found ${agents.length}`);
    
    const reviewer = getAgent('reviewer');
    assert(reviewer !== null, 'Should be able to load reviewer agent config');
    assert(reviewer.name === 'reviewer', `Expected agent name "reviewer", got "${reviewer?.name}"`);
    assert(reviewer.skills.includes('LLMGenerateSkill'), 'Reviewer should have LLMGenerateSkill');
    assert(!reviewer.skills.includes('LandingPageScrapeSkill'), 'Reviewer should NOT have LandingPageScrapeSkill (security check)');

    const preproduction = getAgent('preproduction');
    assert(preproduction !== null, 'Should be able to load preproduction agent config');

    const agentSwarm = getAgent('agent_swarm');
    assert(agentSwarm !== null, 'Should be able to load agent_swarm config');

    const keywordPlanner = getAgent('keywordPlanner');
    assert(keywordPlanner !== null, 'Should be able to load keyword planner agent config');
    assert(keywordPlanner.name === 'keywordPlanner', `Expected agent name "keywordPlanner", got "${keywordPlanner?.name}"`);

    const strategyAdvisor = getAgent('strategyAdvisor');
    assert(strategyAdvisor !== null, 'Should be able to load strategy advisor agent config');
    assert(strategyAdvisor.name === 'strategyAdvisor', `Expected agent name "strategyAdvisor", got "${strategyAdvisor?.name}"`);
  } catch (err) {
    console.log(chalk.red(`  ✖ FAILED: Agent Loader error: ${err.message}`));
    failedTests++;
  }

  // Test 2: Programmatic Sanitizer in ReviewAgent
  try {
    console.log(chalk.yellow('\nTest 2: ReviewAgent Programmatic Compliance Sanitizer...'));
    const agent = new ReviewAgent();

    // Mock an ad with compliance violations
    const badDraft = {
      headlines: [
        'Super ROI Boost!',                // Banned words ROI and Boost, exclamation mark
        'Jetzt Sofort Anmelden.',          // Banned words Jetzt and Sofort, ends with period
        'Bewiesene Leistung!',            // Banned word Bewiesene, exclamation mark
        'Dies ist ein viel zu langer Titel, der definitiv die Dreißig-Zeichen-Grenze überschreitet und daher gekürzt werden muss', // Over 30 characters
        'Guter Titel',
        'Noch einer'
      ],
      descriptions: [
        'Holen Sie sich jetzt den absoluten Boost für Ihre Conversion-Rate!', // Banned Jetzt and Boost, exclamation mark
        'Dieses Angebot ist absolut bewiesen und hat einen massiven ROI für Sie!', // Banned bewiesen and ROI
        'Dies ist eine extrem lange Beschreibung, die die Grenze von siebzig Zeichen auf jeden Fall überschreitet, was verboten ist und eine konsequente Kürzung erfordert.' // Over 70 chars
      ]
    };

    const sanitized = agent.programmaticSanitization(badDraft);

    // Assert exact size
    assert(sanitized.headlines.length === 15, `Expected exactly 15 headlines, got ${sanitized.headlines.length}`);
    assert(sanitized.descriptions.length === 4, `Expected exactly 4 descriptions, got ${sanitized.descriptions.length}`);

    // Assert banned words replaced
    const headlinesText = sanitized.headlines.join(' ');
    const descText = sanitized.descriptions.join(' ');
    
    assert(!/ROI/i.test(headlinesText) && !/ROI/i.test(descText), 'Should remove "ROI"');
    assert(!/Boost/i.test(headlinesText) && !/Boost/i.test(descText), 'Should remove "Boost"');
    assert(!/Sofort/i.test(headlinesText) && !/Sofort/i.test(descText), 'Should remove "Sofort"');
    assert(!/Jetzt/i.test(headlinesText) && !/Jetzt/i.test(descText), 'Should remove "Jetzt"');
    assert(!/Bewiesen/i.test(headlinesText) && !/Bewiesen/i.test(descText), 'Should remove "Bewiesen"');

    // Assert exclamation marks removed
    assert(!headlinesText.includes('!'), 'Headlines should not contain exclamation marks');
    assert(!descText.includes('!'), 'Descriptions should not contain exclamation marks');

    // Assert no period at the end of headlines
    assert(sanitized.headlines.every(h => !h.endsWith('.')), 'No headlines should end with a period');

    // Assert character length limits
    assert(sanitized.headlines.every(h => h.length <= 30), 'All headlines must be <= 30 chars');
    assert(sanitized.descriptions.every(d => d.length <= 70), 'All descriptions must be <= 70 chars');

    // Check replacements mapping
    assert(sanitized.headlines[0] === 'Super Ertrag Optimieren', `Expected "Super Ertrag Optimieren", got "${sanitized.headlines[0]}"`);
    assert(sanitized.headlines[1] === 'Heute Direkt Anmelden', `Expected "Heute Direkt Anmelden", got "${sanitized.headlines[1]}"`);

  } catch (err) {
    console.log(chalk.red(`  ✖ FAILED: Sanitizer test error: ${err.message}`));
    failedTests++;
  }

  // Test 3: Programmatic Sanitizer for PMax Asset Groups in ReviewAgent
  try {
    console.log(chalk.yellow('\nTest 3: ReviewAgent PMax Asset Group Compliance Sanitizer...'));
    const agent = new ReviewAgent();

    const badPMaxDraft = {
      headlines: [
        'Super ROI Boost!',
        'Jetzt Sofort Handeln.'
      ],
      longHeadlines: [
        'Dies ist ein extrem langer PMax Titel, der die Schwelle von neunzig Zeichen überschreitet und daher unbedingt gekürzt werden muss um konform zu sein!',
        'Bewiesener ROI Boost für Ihre Performance Max Kampagne.'
      ],
      descriptions: [
        'Jetzt sofort ROI optimieren!',
        'Nachhaltiges Wachstum für Ihr Business.'
      ]
    };

    const sanitizedPMax = agent.programmaticSanitizationPMax(badPMaxDraft);

    assert(sanitizedPMax.headlines.length === 15, `Expected 15 PMax headlines, got ${sanitizedPMax.headlines.length}`);
    assert(sanitizedPMax.longHeadlines.length === 4, `Expected 4 PMax long headlines, got ${sanitizedPMax.longHeadlines.length}`);
    assert(sanitizedPMax.descriptions.length === 4, `Expected 4 PMax descriptions, got ${sanitizedPMax.descriptions.length}`);

    assert(sanitizedPMax.headlines.every(h => h.length <= 30), 'All PMax headlines must be <= 30 chars');
    assert(sanitizedPMax.longHeadlines.every(lh => lh.length <= 90), 'All PMax long headlines must be <= 90 chars');
    assert(sanitizedPMax.descriptions.every(d => d.length <= 90), 'All PMax descriptions must be <= 90 chars');

    assert(sanitizedPMax.longHeadlines.every(lh => !lh.endsWith('.')), 'No long headlines should end with a period');
    assert(!sanitizedPMax.longHeadlines.join(' ').includes('!'), 'Long headlines should not contain exclamation marks');
    assert(!/ROI/i.test(sanitizedPMax.longHeadlines.join(' ')), 'Long headlines should not contain banned word "ROI"');

  } catch (err) {
    console.log(chalk.red(`  ✖ FAILED: PMax Sanitizer test error: ${err.message}`));
    failedTests++;
  }

  // Test 4: Google Ads Account Baseline Stream & Holt-Winters ETS Forecasting Engine
  console.log(chalk.bold.yellow('\nTest 4: Google Ads Baseline Performance & Holt-Winters ETS Forecasting Engine...'));
  try {
    const baseline = await fetchHistoricalPerformanceMetrics({}, null, { daysCount: 30 });
    assert(baseline.dailySeries && baseline.dailySeries.length === 30, 'Baseline daily series should contain 30 days of performance');
    assert(baseline.aggregates.avgCtrPercent > 0, 'Baseline avg CTR should be > 0');
    assert(baseline.aggregates.avgCpcEuro > 0, 'Baseline avg CPC should be > 0');
    assert(baseline.aggregates.avgCplEuro > 0, 'Baseline avg CPL should be > 0');
    console.log(chalk.green(`  ✔ PASSED: Pulled baseline performance metrics (${baseline.source})`));
    passedTests++;

    const forecast = ETSForecaster.forecast(baseline, { ctrUplift: 1.15, cpcDiscount: 0.95, cplUplift: 0.90 }, 30);
    assert(forecast.model.includes('Exponential Triple Smoothing'), 'Forecast model should specify Holt-Winters ETS');
    assert(forecast.dailyForecastSeries.length === 30, 'Forecast daily series should project 30 days');
    assert(forecast.aggregatedForecast.totalProjectedSpendEuro > 0, 'Projected 30-day spend should be > 0');
    assert(forecast.aggregatedForecast.totalProjectedConversions > 0, 'Projected 30-day conversions should be > 0');
    console.log(chalk.green(`  ✔ PASSED: Computed 30-day Holt-Winters ETS Forecast with confidence bounds`));
    passedTests++;
  } catch (err) {
    console.log(chalk.red(`  ✖ FAILED: ETS Forecast test error: ${err.message}`));
    failedTests++;
  }

  // Summary
  console.log(chalk.bold.cyan('\n=== Test Summary ==='));
  console.log(chalk.bold.green(`Passed: ${passedTests}`));
  if (failedTests > 0) {
    console.log(chalk.bold.red(`Failed: ${failedTests}`));
    process.exit(1);
  } else {
    console.log(chalk.bold.green('All tests passed successfully!'));
    process.exit(0);
  }
}

runTests();
