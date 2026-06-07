import chalk from 'chalk';
import { getAgent, listAgents, initStorage } from './storage.js';
import ReviewAgent from './agents/ReviewAgent.js';

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
    assert(agents.length === 4, `Expected 4 default agents, found ${agents.length}`);
    
    const reviewer = getAgent('reviewer');
    assert(reviewer !== null, 'Should be able to load reviewer agent config');
    assert(reviewer.name === 'reviewer', `Expected agent name "reviewer", got "${reviewer?.name}"`);
    assert(reviewer.skills.includes('LLMGenerateSkill'), 'Reviewer should have LLMGenerateSkill');
    assert(!reviewer.skills.includes('LandingPageScrapeSkill'), 'Reviewer should NOT have LandingPageScrapeSkill (security check)');
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
