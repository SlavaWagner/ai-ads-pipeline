#!/usr/bin/env node

import { Command } from 'commander';
import { input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import http from 'http';
import { URL, fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

import axios from 'axios';
import { getConfig, saveConfig, getAccessToken, refreshAccessToken } from '../src/config.js';
import { listAgents, getAgent, saveAgent, saveRunLog, initStorage } from '../src/storage.js';
import BaseAgent from '../src/agents/BaseAgent.js';
import OrchestratorAgent from '../src/agents/OrchestratorAgent.js';
import CopywriterAgent from '../src/agents/CopywriterAgent.js';
import ReviewAgent from '../src/agents/ReviewAgent.js';
import UploadAgent from '../src/agents/UploadAgent.js';
import KeywordPlannerAgent from '../src/agents/KeywordPlannerAgent.js';
import StrategyAdvisorAgent from '../src/agents/StrategyAdvisorAgent.js';
import PreproductionAgent from '../src/agents/PreproductionAgent.js';
import AgentSwarm from '../src/agents/AgentSwarm.js';

// Initialize storage folders and default agent configurations
initStorage();

function getAsciiLogo() {
  const greenCube = chalk.hex('#1dd900');
  const cyanCube = chalk.hex('#06b6d4');
  const blueCube = chalk.hex('#4064d7');
  
  return [
    '',
    greenCube("             +---+ ") + cyanCube("     +---+ ") + blueCube("     +---+ "),
    greenCube("            /   /| ") + cyanCube("    /   /| ") + blueCube("    /   /| "),
    greenCube("           +---+ | ") + cyanCube("  +---+ | ") + blueCube("  +---+ | "),
    greenCube("           |   |/  ") + cyanCube("  |   |/  ") + blueCube("  |   |/  "),
    greenCube("           +---+   ") + cyanCube("  +---+   ") + blueCube("  +---+   "),
    blueCube("     +---+ ") + greenCube("     +---+ ") + blueCube("     +---+ "),
    blueCube("    /   /| ") + greenCube("    /   /| ") + blueCube("    /   /| "),
    blueCube("   +---+ | ") + greenCube("  +---+ | ") + blueCube("  +---+ | "),
    blueCube("   |   |/  ") + cyanCube("  |   |/  ") + blueCube("  |   |/  "),
    blueCube("   +---+   ") + greenCube("  +---+   ") + blueCube("  +---+   "),
    cyanCube("     +---+ ") + blueCube("     +---+ ") + greenCube("     +---+ "),
    cyanCube("    /   /| ") + blueCube("    /   /| ") + greenCube("    /   /| "),
    cyanCube("   +---+ | ") + blueCube("  +---+ | ") + greenCube("  +---+ | "),
    cyanCube("   |   |/  ") + blueCube("  |   |/  ") + greenCube("  |   |/  "),
    cyanCube("   +---+   ") + blueCube("  +---+   ") + blueCube("  +---+   "),
    '',
    chalk.bold.green('=== ai-ads-pipeline - Marketing & SEA AI Agent ==='),
    chalk.cyan('Optimized for: slavawagner.de'),
    chalk.gray('This AI Agent was created with the help of Google Antigravity CLI'),
    ''
  ].join('\n');
}

// Check if running inside Google Antigravity CLI (agy)
function isRunningInsideAntigravity() {
  // Developer/CLI bypass flag
  if (process.argv.includes('--force') || process.argv.includes('--inside-agy')) {
    return true;
  }
  return Boolean(
    process.env.ANTIGRAVITY_PROJECT_ID ||
    process.env.ANTIGRAVITY_LS_VERSION ||
    process.env.ANTIGRAVITY_SOURCE_METADATA ||
    process.env.ANTIGRAVITY_TRAJECTORY_ID ||
    process.env.JETSKI_APP_DATA_DIR ||
    process.env.AGY_SESSION ||
    process.env.AGY
  );
}

// Interceptor notice: skips static output and instructs user to start Antigravity
function showAgyPrerequisiteWarning(attemptedCmd) {
  const yellowBox = chalk.hex('#eab308');
  const greenText = chalk.bold.hex('#1dd900');
  const cyanText = chalk.bold.hex('#06b6d4');
  const whiteBold = chalk.bold.white;
  
  console.log(getAsciiLogo());
  console.log(yellowBox('================================================================================'));
  console.log(yellowBox('⚠️   VORBEDINGUNG ERFORDERLICH: GOOGLE ANTIGRAVITY CLI ("agy")'));
  console.log(yellowBox('================================================================================'));
  console.log();
  console.log(whiteBold('  Die AI Ads Pipeline für Google Ads funktioniert ausschließlich'));
  console.log(whiteBold('  INNERHALB der Antigravity CLI!'));
  console.log();
  console.log(chalk.yellow('  Starte bitte vorher Antigravity mit dem Befehl "agy" und anschließend'));
  console.log(chalk.yellow('  kannst du mit den Befehlen der ai-ads-Pipeline chatten und die'));
  console.log(chalk.yellow('  Asset-Creation-Prozesse bedienen.'));
  console.log();
  console.log(chalk.gray('  Hinweis: Auf dieser normalen Terminal-Ebene findet keine KI-Verarbeitung statt.'));
  console.log(chalk.gray('  Die Wiedergabe statischer Outputs wurde übersprungen.'));
  console.log();
  console.log(cyanText('  👉 SCHRITT 1:'));
  console.log(whiteBold('     Öffne deine Konsole und starte Antigravity mit folgendem Befehl:'));
  console.log();
  console.log('        ' + greenText('agy'));
  console.log();
  console.log(cyanText('  👉 SCHRITT 2:'));
  console.log(whiteBold('     In Antigravity kannst du interaktiv mit den AI Ads Pipeline Agenten'));
  console.log(whiteBold('     chatten und sämtliche Optimierungs- und Asset-Creation-Workflows steuern.'));
  console.log();
  console.log(yellowBox('================================================================================'));
  console.log(chalk.gray('  (Entwickler-Override:   Befehl mit "--force" oder "--inside-agy" ausführen)'));
  console.log();
}

// Intercept execution early if executed in normal shell outside Antigravity
const rawArgs = process.argv.slice(2);

if (!isRunningInsideAntigravity()) {
  showAgyPrerequisiteWarning(rawArgs.join(' '));
  process.exit(0);
}

const program = new Command();

program
  .name('ai-ads-pipeline')
  .description('Persistent AI Agents CLI for Google Ads Optimization (requires Antigravity CLI)')
  .version('1.0.0');

program.addHelpText('before', getAsciiLogo());

// SETUP Command
program
  .command('setup')
  .description('Setup Gemini API Key and Default Campaign Settings')
  .action(async () => {
    console.log(chalk.bold.cyan('\n=== Agent Swarms Setup ===\n'));
    const current = getConfig();

    try {
      const geminiApiKey = await input({
        message: 'Gemini API Key (Optional, for live LLM Swarm Testing):',
        default: current.geminiApiKey || ''
      });

      const defaultTheme = await input({
        message: 'Default Campaign Theme:',
        default: current.defaultTheme || 'Immobilien & High-Price Lead Gen'
      });

      const defaultUrl = await input({
        message: 'Default Landing Page URL:',
        default: current.defaultUrl || 'https://www.slavawagner.de'
      });

      saveConfig({
        ...current,
        geminiApiKey,
        defaultTheme,
        defaultUrl
      });

      console.log(chalk.bold.green('\n[OK] Setup completed successfully! Configurations saved to config.json.\n'));
    } catch (err) {
      console.error(chalk.red('✖ Setup failed:'), err.message);
    }
  });

// PREPRODUCE Command
program
  .command('preproduce')
  .alias('run')
  .description('Pre-produce 400 AI ad alternatives with Decision Matrix Scoring & 20-Agent Swarm Testing')
  .option('-t, --theme <topic>', 'Campaign focus theme / topic', 'Immobilien & High-Price Lead Gen')
  .option('-k, --track <type>', 'Campaign track (rsa or pmax)', 'rsa')
  .option('-c, --count <number>', 'Number of AI ad alternatives to generate', '400')
  .option('-u, --url <url>', 'Target landing page URL context', 'https://www.slavawagner.de')
  .option('-h, --headlines <items...>', 'Existing ad headlines to test against')
  .option('-l, --long-headlines <items...>', 'Existing long headlines (PMax) to test against')
  .option('-d, --descriptions <items...>', 'Existing ad descriptions to test against')
  .option('--no-swarm', 'Skip 20-Agent Persona Swarm testing')
  .action(async (options) => {
    console.log(chalk.bold.cyan('\n=== Mass AI Ad Pre-production & 20-Agent Swarm Testing ===\n'));

    const count = parseInt(options.count, 10) || 400;
    const track = options.track.toUpperCase() === 'PMAX' ? 'PMAX' : 'RSA';
    const finalUrl = options.url || 'https://www.slavawagner.de';
    const theme = options.theme || 'Immobilien & High-Price Lead Gen';
    const runSwarm = options.swarm !== false;

    console.log(`Campaign Focus Theme:   ${chalk.bold.green(theme)}`);
    console.log(`Track:                  ${chalk.bold.green(track)}`);
    console.log(`Target Quantity:        ${chalk.bold.green(count)} AI Ad Alternatives`);
    console.log(`Landing Page URL:       ${chalk.bold.cyan(finalUrl)}`);
    console.log(`20-Agent Swarm Testing: ${runSwarm ? chalk.green('ENABLED') : chalk.gray('DISABLED')}\n`);

    if (options.headlines && options.headlines.length > 0) {
      console.log(chalk.yellow(`Baseline Input Headlines (${options.headlines.length}):`));
      options.headlines.forEach(h => console.log(chalk.gray(`  - "${h}"`)));
      console.log();
    }
    if (options.longHeadlines && options.longHeadlines.length > 0) {
      console.log(chalk.yellow(`Baseline Long Headlines (${options.longHeadlines.length}):`));
      options.longHeadlines.forEach(lh => console.log(chalk.gray(`  - "${lh}"`)));
      console.log();
    }
    if (options.descriptions && options.descriptions.length > 0) {
      console.log(chalk.yellow(`Baseline Input Descriptions (${options.descriptions.length}):`));
      options.descriptions.forEach(d => console.log(chalk.gray(`  - "${d}"`)));
      console.log();
    }

    try {
      const agent = new PreproductionAgent();
      const report = await agent.preproduceAdAlternatives({
        theme,
        targetAd: {
          headlines: options.headlines || [],
          longHeadlines: options.longHeadlines || [],
          descriptions: options.descriptions || []
        },
        finalUrl,
        track,
        count,
        runSwarmTest: runSwarm
      });

      console.log(chalk.bold.green('\n=== AI ASSET DECISION MATRIX SCORING SUMMARY ==='));
      console.log(`Grade A (PMF-Kandidaten / Skalieren):   ${chalk.bold.green(report.gradeCounts.A)}`);
      console.log(`Grade B (Testwürdig / Mehr Varianten):  ${chalk.bold.cyan(report.gradeCounts.B)}`);
      console.log(`Grade C (Grenzwertig / Low-Budget):     ${chalk.yellow(report.gradeCounts.C)}`);
      console.log(`Grade D (Noise / Kill):                ${chalk.red(report.gradeCounts.D)}`);
      console.log(`Top Candidate Ad ID:                    ${report.decisionMatrixSummary.topScoringAdId} (Score: ${report.decisionMatrixSummary.highestScore}/10)`);

      if (report.etsForecast) {
        const ets = report.etsForecast;
        const agg = ets.aggregatedForecast;
        console.log(chalk.bold.blue('\n=== HOLT-WINTERS ETS TIME-SERIES 30-DAY FORECAST ==='));
        console.log(`Forecast Model:          ${chalk.bold.cyan(ets.model)}`);
        console.log(`Account Baseline Source: ${chalk.bold.yellow(ets.baselineSource)}`);
        console.log(`Trend Velocity:          ${chalk.bold.green(ets.trendVelocityPercentPerWeek + '% / week')}`);
        console.log(chalk.cyan(`Projected 30-Day Aggregates:`));
        console.log(`  - 30-Day Projected Spend:       €${agg.totalProjectedSpendEuro}`);
        console.log(`  - 30-Day Projected Conversions: ${agg.totalProjectedConversions} Leads`);
        console.log(`  - Projected Ø CTR:              ${agg.avgProjectedCtrPercent}%`);
        console.log(`  - Projected Ø CPC:              €${agg.avgProjectedCpcEuro}`);
        console.log(`  - Projected Ø CPL:              €${agg.avgProjectedCplEuro}`);
      }

      if (report.swarmPredictiveReport) {
        const swarm = report.swarmPredictiveReport;
        console.log(chalk.bold.magenta('\n=== 20-AGENT DYNAMIC PERSONA SWARM (ENGLISH) ==='));
        console.log(`Derived Industry:       ${chalk.bold.green(swarm.industry || 'N/A')}`);
        console.log(`Derived Offer:          ${chalk.bold.green(swarm.offer || 'N/A')}`);
        console.log(`Target Audience:        ${chalk.bold.cyan(swarm.targetAudience || 'N/A')}`);
        console.log(`Swarm Language:         ${chalk.bold.yellow('ENGLISH (Dynamic Personas)')}\n`);

        const winner = swarm.evaluatedCandidates[0];
        if (winner) {
          console.log(chalk.bold.green(`[WINNER] TOP AD ALTERNATIVE TO LAUNCH: ${winner.candidateId}`));
          console.log(`   Matrix Grade & Score: Grade ${winner.matrixGrade} (${winner.matrixScore}/10)`);
          console.log(`   Swarm Approval Rate:  ${winner.swarmSummary.approvalRatePercent}% (${winner.swarmSummary.approvedAgentsCount}/20 Agents Approved)`);
          console.log(chalk.cyan(`   Proportionale Metriken-Prognose (Hochrechnung):`));
          console.log(`     - Ø CTR:  ${winner.swarmSummary.projectedMetrics.ctrPercent}%`);
          console.log(`     - Ø CPC:  €${winner.swarmSummary.projectedMetrics.cpcEuro}`);
          console.log(`     - Ø CPM:  €${winner.swarmSummary.projectedMetrics.cpmEuro}`);
          console.log(`     - Ø CPL:  €${winner.swarmSummary.projectedMetrics.costPerLeadEuro}`);
        }

        console.log(chalk.bold.yellow('\n========================================================================================================'));
        console.log(chalk.bold.cyan('TABULAR OUTPUT: ALL 40 EVALUATED AD ALTERNATIVES WITH AGENT SWARM FINDINGS'));
        console.log(chalk.bold.yellow('========================================================================================================'));

        swarm.evaluatedCandidates.forEach((cand, idx) => {
          console.log(chalk.bold.white(`\n#${(idx + 1).toString().padStart(2, '0')} [${cand.candidateId}] ${cand.spineTheme}`));
          console.log(chalk.gray(`   Grade: ${cand.matrixGrade} (${cand.matrixScore}/10) | Framework: ${cand.vectorization.d1_framework} | Angle: ${cand.vectorization.d2_angle}`));
          console.log(chalk.cyan(`   Swarm Approval: ${cand.swarmSummary.approvalRatePercent}% | Est. CTR: ${cand.swarmSummary.projectedMetrics.ctrPercent}% | Est. CPC: €${cand.swarmSummary.projectedMetrics.cpcEuro} | Est. CPL: €${cand.swarmSummary.projectedMetrics.costPerLeadEuro}`));
          console.log(chalk.yellow(`   Top Persona Findings & O-Ton Statements:`));
          cand.agentStatements.slice(0, 3).forEach(stmt => {
            console.log(chalk.gray(`     - [${stmt.personaId}] ${stmt.personaName} (${stmt.score}/10): ${stmt.statement}`));
          });
        });
        console.log(chalk.bold.yellow('\n========================================================================================================\n'));
      }

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const projectRoot = path.resolve(__dirname, '..');
      const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
      const reportPath = path.resolve(projectRoot, `storage/runs/preproduction-report-${track.toLowerCase()}-${timestampStr}.json`);
      
      if (!fs.existsSync(path.dirname(reportPath))) {
        fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      }

      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
      console.log(chalk.bold.green(`\n[OK] Report & Asset Catalog saved persistently to:\n  ${reportPath}\n`));

    } catch (error) {
      console.error(chalk.bold.red('\n[ERROR] Execution failed:'), error.message);
    }
  });

// SWARM-TEST Command
program
  .command('swarm-test')
  .description('Run 20-Agent Persona Swarm Predictive Testing on Ad Creatives')
  .option('-k, --track <type>', 'Campaign track (rsa or pmax)', 'rsa')
  .action(async (options) => {
    console.log(chalk.bold.cyan('\n=== 20-Agent Persona Swarm Predictive Testing ===\n'));
    const track = options.track.toUpperCase() === 'PMAX' ? 'PMAX' : 'RSA';

    try {
      const preprodAgent = new PreproductionAgent();
      console.log(chalk.yellow('Testing top candidate creatives with 20 sub-audience personas...'));
      await preprodAgent.preproduceAdAlternatives({
        track,
        count: 20,
        runSwarmTest: true
      });
      console.log(chalk.bold.green('\n[OK] Swarm Testing completed successfully!\n'));
    } catch (error) {
      console.error(chalk.bold.red('\n[ERROR] Swarm Test failed:'), error.message);
    }
  });



// AGENT Command
const agentCmd = program.command('agent').description('Manage Persistent AI Agents');

agentCmd
  .command('list')
  .description('List all persistent AI agents')
  .action(() => {
    console.log(chalk.bold.cyan('\n=== Persistent AI Agents ===\n'));
    const agents = listAgents();
    agents.forEach(agent => {
      console.log(chalk.bold.green(`Name:   ${agent.name}`));
      console.log(`Role:   ${agent.role}`);
      console.log(`Prompt: ${agent.description}`);
      console.log(chalk.gray('---------------------------------------------'));
    });
  });

agentCmd
  .command('view <name>')
  .description('View detailed agent prompts and settings')
  .action((name) => {
    const agent = getAgent(name);
    if (!agent) {
      console.log(chalk.red(`\nAgent "${name}" does not exist.`));
      return;
    }
    console.log(chalk.bold.cyan(`\n=== Agent Details: ${agent.name} ===\n`));
    console.log(chalk.bold.green(`Role:`));
    console.log(`  ${agent.role}\n`);
    console.log(chalk.bold.green(`Model:`));
    console.log(`  ${agent.model}\n`);
    console.log(chalk.bold.green(`Allowed Skills:`));
    console.log(`  ${agent.skills.join(', ')}\n`);
    console.log(chalk.bold.green(`Description:`));
    console.log(`  ${agent.description}\n`);
    console.log(chalk.bold.green(`System Prompt:`));
    console.log(chalk.gray(agent.systemPrompt));
    console.log();
  });

agentCmd
  .command('set-prompt <name> <prompt>')
  .description('Modify system prompt of a persistent agent')
  .action((name, prompt) => {
    const agent = getAgent(name);
    if (!agent) {
      console.log(chalk.red(`\nAgent "${name}" does not exist.`));
      return;
    }
    agent.systemPrompt = prompt;
    if (saveAgent(name, agent)) {
      console.log(chalk.green(`\n✔ System Prompt for Agent "${name}" successfully updated!`));
    } else {
      console.log(chalk.red(`\n✖ Error saving the System Prompt.`));
    }
  });

// FRAMEWORK Command
program
  .command('framework')
  .description('Choose a framework for asset creation in the Copywriter Agent')
  .argument('[name]', 'Optional framework name (angles, audiences, business, copywritings, sophistication, or clear/none)')
  .action(async (name) => {
    const validFrameworks = ['angles', 'audiences', 'business', 'copywritings', 'sophistication'];
    const current = getConfig();

    let chosenFramework = name;

    if (!chosenFramework) {
      console.log(chalk.bold.cyan('\n=== Framework Chooser ===\n'));
      console.log(`Currently selected framework: ${current.framework ? chalk.bold.green(current.framework) : chalk.gray('None (Using default prompt)')}\n`);

      chosenFramework = await select({
        message: 'Choose a framework for asset creation:',
        choices: [
          { name: 'Standard (No Framework / Default System Prompt)', value: 'none' },
          { name: 'Angles (Pain Points & Solution Frames)', value: 'angles' },
          { name: 'Audiences (Targeting sub-audiences)', value: 'audiences' },
          { name: 'Business Frameworks (Value proposition & positioning)', value: 'business' },
          { name: 'Copywritings (AIDA, PAS, storytelling formulas)', value: 'copywritings' },
          { name: 'Market Sophistication (Target audience awareness levels)', value: 'sophistication' }
        ]
      });
    }

    const cleanName = chosenFramework.toLowerCase().trim();

    if (cleanName === 'none' || cleanName === 'clear') {
      current.framework = '';
      saveConfig(current);
      console.log(chalk.green('\n✔ Framework setting reset. The Copywriter Agent now uses the default prompt.\n'));
    } else if (validFrameworks.includes(cleanName)) {
      current.framework = cleanName;
      saveConfig(current);
      console.log(chalk.green(`\n✔ Framework "${cleanName}" successfully set as default. It will be applied automatically in future runs.\n`));
    } else {
      console.log(chalk.red(`\n✖ Invalid framework: "${name}". Valid values are: angles, audiences, business, copywritings, sophistication, none.\n`));
    }
  });

// RUN WORKFLOW Command
program
  .command('run-workflow')
  .description('Run the 4-agent optimization and upload pipeline')
  .option('-f, --framework <name>', 'Specific framework for asset creation (angles, audiences, business, copywritings, sophistication)')
  .action(async (options) => {
    console.log(chalk.bold.cyan('\n=== Google Ads AI Agents Optimization Pipeline ===\n'));
    
    const config = getConfig();
    const activeFramework = options.framework || config.framework || '';

    if (activeFramework) {
      console.log(chalk.cyan(`Selected framework for asset creation: ${activeFramework}\n`));
    } else {
      console.log(chalk.cyan('No specific framework selected. Using default prompt.\n'));
    }

    if (!config.refreshToken) {
      console.log(chalk.red('Error: Google Ads Refresh Token is missing. Please run setup first: ai-ads-pipeline setup'));
      return;
    }

    try {
      console.log(chalk.yellow('Validating Google Ads OAuth2 Access Token...'));
      const accessToken = await getAccessToken();
      console.log(chalk.green('✔ Access Token ready.'));

      console.log(chalk.yellow('Loading AI Agents...'));
      const orchestrator = new OrchestratorAgent();
      const copywriter = new CopywriterAgent();
      const reviewer = new ReviewAgent();
      const uploader = new UploadAgent();
      console.log(chalk.green('✔ All agents loaded.'));

      const results = await orchestrator.runWorkflow(config, accessToken, copywriter, reviewer, uploader, activeFramework);

      if (results.length > 0) {
        const logPath = saveRunLog(results);
        console.log(chalk.green(`\n✔ Pipeline execution logged to:\n  ${logPath}\n`));
      }

      console.log(chalk.bold.green('=== Pipeline execution finished ===\n'));

    } catch (error) {
      console.error(chalk.bold.red('\n✖ Pipeline aborted:'), error.message);
    }
  });

// RUN PMAX Command
program
  .command('run-pmax')
  .description('Run the 4-agent PMax Asset Group creation and upload pipeline')
  .option('-f, --framework <name>', 'Specific framework for asset creation (angles, audiences, business, copywritings, sophistication)')
  .action(async (options) => {
    console.log(chalk.bold.cyan('\n=== Google Ads PMax Asset Group Optimization Pipeline ===\n'));
    
    const config = getConfig();
    const activeFramework = options.framework || config.framework || '';

    if (activeFramework) {
      console.log(chalk.cyan(`Selected framework for asset creation: ${activeFramework}\n`));
    } else {
      console.log(chalk.cyan('No specific framework selected. Using default prompt (Angles).\n'));
    }

    if (!config.refreshToken) {
      console.log(chalk.red('Error: Google Ads Refresh Token is missing. Please run setup first: ai-ads-pipeline setup'));
      return;
    }

    try {
      console.log(chalk.yellow('Validating Google Ads OAuth2 Access Token...'));
      const accessToken = await getAccessToken();
      console.log(chalk.green('✔ Access Token ready.'));

      console.log(chalk.yellow('Loading Orchestrator Agent...'));
      const orchestrator = new OrchestratorAgent();
      console.log(chalk.green('✔ Agent loaded.'));

      const results = await orchestrator.runPMaxPipeline(config, accessToken, activeFramework);

      if (results.length > 0) {
        const logPath = saveRunLog(results);
        console.log(chalk.green(`\n✔ PMax Pipeline execution logged to:\n  ${logPath}\n`));
      }

      console.log(chalk.bold.green('=== PMax Pipeline execution finished ===\n'));

    } catch (error) {
      console.error(chalk.bold.red('\n✖ PMax Pipeline aborted:'), error.message);
    }
  });

// MANUAL TOKEN REFRESH Command
program
  .command('refresh-token')
  .description('Manually refresh Google Ads access token')
  .action(async () => {
    try {
      console.log(chalk.yellow('Requesting fresh Access Token...'));
      const token = await refreshAccessToken();
      console.log(chalk.green('✔ Access Token successfully updated.'));
      console.log(chalk.gray(`Token: ${token.substring(0, 10)}...`));
    } catch (error) {
      console.error(chalk.red('✖ Error:'), error.message);
    }
  });

// KEYWORDS Command (Keyword research agent chat loop)
program
  .command('keywords')
  .description('Start an interactive keyword research session clustered by search intent')
  .action(async () => {
    console.log(chalk.bold.cyan('\n=== Google Ads Keyword Planner Chat Agent ===\n'));
    
    const config = getConfig();
    if (!config.geminiApiKey) {
      console.log(chalk.red('Error: Gemini API Key is missing in config.json.'));
      return;
    }

    try {
      let accessToken = null;
      if (config.refreshToken) {
        try {
          console.log(chalk.yellow('Validating Google Ads OAuth2 Access Token...'));
          accessToken = await getAccessToken();
          console.log(chalk.green('✔ Access Token ready.'));
        } catch (tokenErr) {
          console.log(chalk.yellow(`Warning: Google Ads Token validation failed (${tokenErr.message}). Fallback to simulated metrics.`));
        }
      } else {
        console.log(chalk.yellow('Hinweis: Keine Google Ads API Zugangsdaten gefunden. Die Keyword-Metriken werden geschätzt.'));
      }

      const agent = new KeywordPlannerAgent();
      
      const theme = await input({
        message: 'Geben Sie ein Keyword-Fokus-Thema ein (z. B. "KI-Marketing für Anwälte"):'
      });

      if (!theme.trim()) {
        console.log(chalk.yellow('Eingabe leer. Vorgang abgebrochen.'));
        return;
      }

      console.log(chalk.yellow('\nAnalysiere Thema und generiere Keyword-Cluster...'));
      let response = await agent.generateKeywords(theme, accessToken);
      
      console.log(chalk.bold.green('\n=== Keyword Planner Response ===\n'));
      console.log(response);
      console.log(chalk.bold.green('\n=================================\n'));

      const sanitizeFilename = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const safeTheme = sanitizeFilename(theme);
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const projectRoot = path.resolve(__dirname, '..');
      
      const rawPath = path.resolve(projectRoot, `storage/runs/keywords-${safeTheme}-raw.json`);
      const reportPath = path.resolve(projectRoot, `storage/runs/keywords-${safeTheme}-report.md`);
      
      if (!fs.existsSync(path.dirname(rawPath))) {
        fs.mkdirSync(path.dirname(rawPath), { recursive: true });
      }

      if (agent.rawIdeas && agent.rawIdeas.length > 0) {
        fs.writeFileSync(rawPath, JSON.stringify(agent.rawIdeas, null, 2), 'utf8');
        console.log(chalk.green(`✔ Echte Raw API Keyword-Daten persistent gespeichert unter:\n  ${rawPath}`));
      }
      
      fs.writeFileSync(reportPath, response, 'utf8');
      console.log(chalk.green(`✔ Strukturierter Bericht persistent gespeichert unter:\n  ${reportPath}\n`));

      let keepChatting = true;
      while (keepChatting) {
        const followUp = await input({
          message: 'Stelle eine Folgefrage, gib Verfeinerungen an (z. B. "mehr B2B") oder tippe "exit" zum Beenden:'
        });

        const cleanFollowUp = followUp.trim().toLowerCase();
        if (cleanFollowUp === 'exit' || cleanFollowUp === 'quit' || cleanFollowUp === 'bye') {
          keepChatting = false;
          console.log(chalk.cyan('\nKeyword-Recherche-Sitzung beendet. Auf Wiedersehen!'));
        } else if (followUp.trim()) {
          console.log(chalk.yellow('\nVerarbeite Feedback und aktualisiere Keywords...'));
          response = await agent.generateKeywords(theme, null, followUp);
          console.log(chalk.bold.green('\n=== Updated Keyword Planner Response ===\n'));
          console.log(response);
          console.log(chalk.bold.green('\n========================================\n'));
        }
      }
    } catch (error) {
      console.error(chalk.bold.red('\n✖ Fehler bei der Keyword-Recherche:'), error.message);
    }
  });

// SKILLS Command (Chat with Google Ads Strategy SOPs)
program
  .command('skills')
  .description('Start an interactive chat session with Google Ads Strategy SOPs')
  .action(async () => {
    console.log(chalk.bold.cyan('\n=== Google Ads Strategy Advisor (Chat with SOPs) ===\n'));

    const config = getConfig();
    if (!config.geminiApiKey) {
      console.log(chalk.red('Error: Gemini API Key is missing in config.json.'));
      return;
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const projectRoot = path.resolve(__dirname, '..');
    const strategiesDir = path.resolve(projectRoot, 'src/strategies');

    if (!fs.existsSync(strategiesDir)) {
      console.log(chalk.red('Strategies directory does not exist. Please make sure the strategy markdown files are stored in src/strategies.'));
      return;
    }

    const files = fs.readdirSync(strategiesDir).filter(f => f.endsWith('.md') && f !== 'README.md');
    if (files.length === 0) {
      console.log(chalk.yellow('Keine Strategie-Dokumente (SOPs) in src/strategies gefunden.'));
      return;
    }

    const choices = files.map(file => {
      const displayName = file
        .replace(/\.md$/, '')
        .replace(/-/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      return { name: displayName, value: file };
    });

    const selectedFile = await select({
      message: 'Wählen Sie eine Strategie (SOP) zum Chatten aus:',
      choices
    });

    const strategyPath = path.join(strategiesDir, selectedFile);
    const strategyContent = fs.readFileSync(strategyPath, 'utf8');
    const strategyTitle = choices.find(c => c.value === selectedFile).name;

    console.log(chalk.yellow(`\nLade Strategie: "${strategyTitle}"...`));
    
    const agent = new StrategyAdvisorAgent();
    agent.setStrategy(strategyTitle, strategyContent);

    console.log(chalk.green(`\nBereit! Du chattest jetzt mit der SOP "${strategyTitle}".`));
    console.log(chalk.gray('Du kannst Fragen zur Strategie stellen oder Leistungswerte deines Accounts eingeben, um sie prüfen zu lassen.'));
    console.log(chalk.gray('Tippe "exit" zum Beenden.\n'));

    let keepChatting = true;
    while (keepChatting) {
      const question = await input({
        message: 'Ihre Frage / Daten:'
      });

      const cleanQuestion = question.trim().toLowerCase();
      if (cleanQuestion === 'exit' || cleanQuestion === 'quit' || cleanQuestion === 'bye') {
        keepChatting = false;
        console.log(chalk.cyan('\nStrategie-Beratungssitzung beendet. Viel Erfolg bei der Optimierung!'));
      } else if (question.trim()) {
        console.log(chalk.yellow('\nAnalysiere und generiere Antwort...'));
        try {
          const response = await agent.chat(question);
          console.log(chalk.bold.green(`\n=== Strategy Advisor (${strategyTitle}) ===\n`));
          console.log(response);
          console.log(chalk.bold.green('\n==================================================\n'));
        } catch (error) {
          console.error(chalk.red(`\nFehler: ${error.message}`));
        }
      }
    }
  });

// CHAT Command Helper
async function runChatSession(agentName) {
  let targetAgent = agentName;
  if (!targetAgent) {
    const agents = listAgents();
    targetAgent = await select({
      message: 'Choose an agent to chat with:',
      choices: agents.map(a => ({ name: `${a.role} (${a.name})`, value: a.name }))
    });
  }

  const agent = new BaseAgent(targetAgent);
  console.log(chalk.bold.cyan(`\n=== Started Chat Session with ${agent.role} (${agent.name}) ===`));
  console.log(chalk.gray('Type "exit" or "quit" to end the session.\n'));

  const history = [];

  while (true) {
    const userInput = await input({ message: chalk.bold.green('You: ') });
    if (!userInput) continue;

    const trimmed = userInput.trim().toLowerCase();
    if (trimmed === 'exit' || trimmed === 'quit') {
      console.log(chalk.cyan('\nEnding chat session. Goodbye!\n'));
      break;
    }

    let prompt = '';
    if (history.length > 0) {
      prompt = `Here is the current chat history of our session:\n${history.map(h => `${h.role}: ${h.text}`).join('\n')}\n\nUser: ${userInput}`;
    } else {
      prompt = userInput;
    }

    try {
      console.log(chalk.yellow('\nWaiting for agent response...'));
      const reply = await agent.generateCompletion(prompt, false);
      
      console.log(chalk.bold.magenta(`\nAgent (${agent.name}):`));
      console.log(reply);
      console.log();

      history.push({ role: 'User', text: userInput });
      history.push({ role: 'Agent', text: reply });
    } catch (e) {
      console.log(chalk.red(`\nError generating response: ${e.message}\n`));
    }
  }
}

// CHAT Command
program
  .command('chat [agentName]')
  .description('Start an interactive chat session with an AI Agent')
  .action(async (agentName) => {
    await runChatSession(agentName);
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  console.log(getAsciiLogo());
  program.outputHelp();
}
