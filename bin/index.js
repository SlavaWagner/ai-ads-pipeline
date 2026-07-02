#!/usr/bin/env node

import { Command } from 'commander';
import { input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import http from 'http';
import { URL, fileURLToPath } from 'url';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

import { getConfig, saveConfig, getAccessToken, refreshAccessToken } from '../src/config.js';
import { listAgents, getAgent, saveAgent, saveRunLog, initStorage } from '../src/storage.js';
import BaseAgent from '../src/agents/BaseAgent.js';
import OrchestratorAgent from '../src/agents/OrchestratorAgent.js';
import CopywriterAgent from '../src/agents/CopywriterAgent.js';
import ReviewAgent from '../src/agents/ReviewAgent.js';
import UploadAgent from '../src/agents/UploadAgent.js';
import KeywordPlannerAgent from '../src/agents/KeywordPlannerAgent.js';
import StrategyAdvisorAgent from '../src/agents/StrategyAdvisorAgent.js';

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

// DASHBOARD Command
program
  .command('dashboard')
  .description('Start the visual dashboard server to view agent status')
  .option('-p, --port <number>', 'Port to run the dashboard server on', '8080')
  .action((options) => {
    const port = parseInt(options.port, 10);
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const projectRoot = path.resolve(__dirname, '..');

    const server = http.createServer((req, res) => {
      // Normalize URL path to prevent directory traversal
      let safePath = path.normalize(req.url).replace(/^(\.\.[\/\\])+/, '');
      if (safePath === '/' || safePath === '\\') {
        safePath = '/index.html';
      }

      const filePath = path.join(projectRoot, safePath);

      // Simple MIME type resolver
      const ext = path.extname(filePath).toLowerCase();
      let contentType = 'text/plain';
      if (ext === '.html') contentType = 'text/html; charset=utf-8';
      else if (ext === '.css') contentType = 'text/css';
      else if (ext === '.js') contentType = 'application/javascript';
      else if (ext === '.json') contentType = 'application/json';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.svg') contentType = 'image/svg+xml';

      fs.readFile(filePath, (err, content) => {
        if (err) {
          if (err.code === 'ENOENT') {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 Not Found</h1>', 'utf-8');
          } else {
            res.writeHead(500);
            res.end(`Server Error: ${err.code}`);
          }
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content, 'utf-8');
        }
      });
    });

    server.listen(port, () => {
      console.log(chalk.bold.green(`\n✔ Dashboard server successfully started!`));
      console.log(chalk.cyan(`Please open the following link in your web browser:\n`));
      console.log(chalk.underline.blue(`http://localhost:${port}\n`));
      console.log(chalk.gray('Press Ctrl+C to terminate the server.\n'));
      
      // Attempt to open the browser automatically
      const openCmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
      exec(`${openCmd} http://localhost:${port}`, (err) => {
        // Silent catch if browser fail to open
      });
    });
  });

// KEYWORDS Command (Keyword research agent chat loop)
program
  .command('keywords')
  .description('Start an interactive keyword research session clustered by search intent')
  .action(async () => {
    console.log(chalk.bold.cyan('\n=== Google Ads Keyword Planner Chat Agent ===\n'));
    
    // Check config for API key
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

      // Save raw ideas and report persistently in the tool
      const sanitizeFilename = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const safeTheme = sanitizeFilename(theme);
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const projectRoot = path.resolve(__dirname, '..');
      
      const rawPath = path.resolve(projectRoot, `storage/runs/keywords-${safeTheme}-raw.json`);
      const reportPath = path.resolve(projectRoot, `storage/runs/keywords-${safeTheme}-report.md`);
      
      // Ensure the storage/runs directory exists
      if (!fs.existsSync(path.dirname(rawPath))) {
        fs.mkdirSync(path.dirname(rawPath), { recursive: true });
      }

      // If we got real ideas, save them
      if (agent.rawIdeas && agent.rawIdeas.length > 0) {
        fs.writeFileSync(rawPath, JSON.stringify(agent.rawIdeas, null, 2), 'utf8');
        console.log(chalk.green(`✔ Echte Raw API Keyword-Daten persistent gespeichert unter:\n  ${rawPath}`));
      }
      
      fs.writeFileSync(reportPath, response, 'utf8');
      console.log(chalk.green(`✔ Strukturierter Bericht persistent gespeichert unter:\n  ${reportPath}\n`));

      // Start the interactive chat loop
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

    // Check config for API key
    const config = getConfig();
    if (!config.geminiApiKey) {
      console.log(chalk.red('Error: Gemini API Key is missing in config.json.'));
      return;
    }

    // Load available strategies
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

    // Map files to select choices
    const choices = files.map(file => {
      // Clean up the name for display (e.g. "01-conversion-value-hierarchy.md" -> "01 Conversion Value Hierarchy")
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

// Helper to execute an interactive chat session with any agent
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

// If no arguments were passed, show help
if (!process.argv.slice(2).length) {
  console.log(getAsciiLogo());
  program.outputHelp();
}


