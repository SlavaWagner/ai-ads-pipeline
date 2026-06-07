#!/usr/bin/env node

import { Command } from 'commander';
import { input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import http from 'http';
import { URL } from 'url';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

import { getConfig, saveConfig, getAccessToken, refreshAccessToken } from '../src/config.js';
import { listAgents, getAgent, saveAgent, saveRunLog, initStorage } from '../src/storage.js';
import OrchestratorAgent from '../src/agents/OrchestratorAgent.js';
import CopywriterAgent from '../src/agents/CopywriterAgent.js';
import ReviewAgent from '../src/agents/ReviewAgent.js';
import UploadAgent from '../src/agents/UploadAgent.js';

// Initialize storage folders and default agent configurations
initStorage();

// Helper to generate the 3D ASCII Cubicles logo in brand colors
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
    cyanCube("   +---+   ") + blueCube("  +---+   ") + greenCube("  +---+   "),
    '',
    chalk.bold.green('=== ai-ads-pipeline - Marketing & SEA AI Agent ==='),
    chalk.cyan('Optimized for: slavawagner.de'),
    chalk.gray('This AI Agent was created with the help of Google Antigravity CLI'),
    ''
  ].join('\n');
}

const program = new Command();

program
  .name('ai-ads-pipeline')
  .description('Persistent AI Agents CLI for Google Ads Optimization')
  .version('1.0.0');

// Inject the 3D Cubicles logo before Commander help output
program.addHelpText('before', getAsciiLogo());


// SETUP Command
program
  .command('setup')
  .description('Setup Google Ads Credentials and Authorize OAuth2')
  .action(async () => {
    console.log(chalk.bold.cyan('\n=== Antigravity Google Ads Agents Setup ===\n'));

    const current = getConfig();

    try {
      const customerId = await input({
        message: 'Google Ads Customer ID:',
        default: current.customerId
      });

      const clientId = await input({
        message: 'Google Ads Client ID:',
        default: current.clientId
      });

      const clientSecret = await input({
        message: 'Google Ads Client Secret:',
        default: current.clientSecret
      });

      const developerToken = await input({
        message: 'Google Ads Developer Token (MCC):',
        default: current.developerToken
      });

      const loginCustomerId = await input({
        message: 'Manager Login Customer ID (Optional, press enter to skip):',
        default: current.loginCustomerId || ''
      });

      // Save initial variables first
      const updatedConfig = {
        ...current,
        customerId,
        clientId,
        clientSecret,
        developerToken,
        loginCustomerId
      };
      saveConfig(updatedConfig);

      console.log(chalk.yellow('\nStarting OAuth2 Authentication...'));

      const redirectUri = 'http://localhost:8085';
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=https://www.googleapis.com/auth/adwords&access_type=offline&prompt=consent`;

      console.log(chalk.green('\nPlease open the following link in your web browser to authorize access:\n'));
      console.log(chalk.underline.blue(authUrl));
      console.log(chalk.gray('\nWaiting for authorization on port 8085...'));

      let oauthCode = '';

      // Set up a promise that resolves when the authorization server gets the callback code
      const getAuthCodePromise = new Promise((resolve, reject) => {
        const server = http.createServer(async (req, res) => {
          try {
            const urlObj = new URL(req.url, 'http://localhost:8085');
            const code = urlObj.searchParams.get('code');
            if (code) {
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end('<h1>Authentication successful!</h1><p>You can close this window now and return to the terminal.</p>');
              resolve(code);
            } else {
              res.writeHead(400);
              res.end('Authentication failed: No code found in URL.');
              reject(new Error('No code received.'));
            }
          } catch (err) {
            reject(err);
          } finally {
            server.close();
          }
        });

        // Set a timeout of 3 minutes
        server.setTimeout(180000);
        server.on('timeout', () => {
          server.close();
          reject(new Error('OAuth timeout after 3 minutes.'));
        });

        server.listen(8085, (err) => {
          if (err) {
            reject(err);
          }
        });
      });

      try {
        oauthCode = await getAuthCodePromise;
        console.log(chalk.green('✔ Authorization code successfully received!'));
      } catch (authError) {
        console.log(chalk.red(`\nAutomatic connection failed: ${authError.message}`));
        console.log(chalk.cyan('To enter the code manually, open the URL in your browser, copy the "code" parameter from the redirect URL, and paste it here:'));
        oauthCode = await input({ message: 'Enter authorization code here:' });
      }

      if (!oauthCode) {
        throw new Error('No authorization code provided.');
      }

      console.log(chalk.yellow('Exchanging code for Refresh Token...'));

      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
        code: oauthCode,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      });

      const { access_token, refresh_token, expires_in } = tokenResponse.data;

      if (!refresh_token) {
        console.log(chalk.yellow('\nWARNING: No Refresh Token was returned. This happens if you have already consented previously.'));
        console.log(chalk.yellow('To force a new Refresh Token, go to your Google Account settings, remove the app access, and run "setup" again.\n'));
      }

      const finalConfig = getConfig(); // Load current again to make sure we keep any additions
      finalConfig.accessToken = access_token;
      if (refresh_token) {
        finalConfig.refreshToken = refresh_token;
      }
      finalConfig.tokenExpiry = Date.now() + (expires_in - 300) * 1000;

      saveConfig(finalConfig);

      console.log(chalk.bold.green('\n✔ Setup completed successfully! Your configuration has been saved to config.json.'));
      console.log(chalk.green(`OAuth2 Access Token acquired, valid until: ${new Date(finalConfig.tokenExpiry).toLocaleTimeString()}\n`));

    } catch (error) {
      console.error(chalk.bold.red('\n✖ Setup failed:'), error.response ? JSON.stringify(error.response.data) : error.message);
    }
  });

// AGENT LIST Command
const agentCmd = program.command('agent').description('Manage Persistent AI Agents');

agentCmd
  .command('list')
  .description('List all persistent AI agents and their configuration')
  .action(() => {
    console.log(chalk.bold.cyan('\n=== Registered AI Agents ===\n'));
    const agents = listAgents();
    agents.forEach(agent => {
      console.log(chalk.bold.green(`Name:        ${agent.name}`));
      console.log(`Role:        ${agent.role}`);
      console.log(`Model:       ${agent.model}`);
      console.log(`Skills:      ${agent.skills.join(', ')}`);
      console.log(`Prompt:      ${agent.description}`);
      console.log(chalk.gray('---------------------------------------------'));
    });
  });

// AGENT VIEW Command
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

// AGENT SET-PROMPT Command
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

    // Check credentials
    if (!config.refreshToken) {
      console.log(chalk.red('Error: Google Ads Refresh Token is missing. Please run setup first: npm run setup'));
      return;
    }

    try {
      // 1. Get access token (refreshes if expired)
      console.log(chalk.yellow('Validating Google Ads OAuth2 Access Token...'));
      const accessToken = await getAccessToken();
      console.log(chalk.green('✔ Access Token ready.'));

      // 2. Instantiate agents
      console.log(chalk.yellow('Loading AI Agents...'));
      const orchestrator = new OrchestratorAgent();
      const copywriter = new CopywriterAgent();
      const reviewer = new ReviewAgent();
      const uploader = new UploadAgent();
      console.log(chalk.green('✔ All agents loaded.'));

      // 3. Run Pipeline
      const results = await orchestrator.runWorkflow(config, accessToken, copywriter, reviewer, uploader, activeFramework);

      // 4. Save Logs
      if (results.length > 0) {
        const logPath = saveRunLog(results);
        console.log(chalk.green(`\n✔ Pipeline execution logged to:\n  ${logPath}\n`));
      }

      console.log(chalk.bold.green('=== Pipeline execution finished ===\n'));

    } catch (error) {
      console.error(chalk.bold.red('\n✖ Pipeline aborted:'), error.message);
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

program.parse(process.argv);

// If no arguments were passed, show help
if (!process.argv.slice(2).length) {
  console.log(getAsciiLogo());
  program.outputHelp();
}


