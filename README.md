# ai-ads-pipeline: Persistent AI Agents for Google Ads Optimization

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![AI Framework: Antigravity](https://img.shields.io/badge/AI_Framework-Antigravity_CLI-blue.svg)](https://github.com/SlavaWagner)
[![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)

`ai-ads-pipeline` is a persistent AI agent framework designed to automatically generate, optimize, and upload compliant, high-performing Responsive Search Ad (RSA) and Performance Max (PMax) alternatives to Google Ads. It uses a structured multi-agent workflow powered by Gemini and the Google Ads API.

> [!IMPORTANT]
> **Prerequisite for AI Processing:**  
> Please launch Google Antigravity beforehand using the command **`agy`** in your console. Interactive chat sessions, asset generation workflows, and AI agent processing run natively inside the Antigravity CLI.

---

## 1. System Architecture & Circuit

The package orchestrates autonomous persistent agents to handle end-to-end copywriting, rigorous compliance review, and direct mutate uploads via the Google Ads API.

<p align="center">
  <img src="docs/images/system-circuit.svg" alt="AI Ads Pipeline System Circuit" width="100%">
  <br>
  <em>System Circuit Architecture — <a href="docs/system-circuit.html">View interactive standalone widget</a></em>
</p>

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ 1. Orchestrator │ ───►  │ 2. Copywriter   │ ───►  │ 3. Review Agent │ ───►  │ 4. Upload Engine│
│ (Fetch Live Ads)│       │ (Angle & Spine) │       │ (Sanitize & QA) │       │ (Mutate PAUSED) │
└─────────────────┘       └─────────────────┘       └─────────────────┘       └─────────────────┘
```

---

## 2. The Multi-Agent Pipeline

1. **Orchestrator Agent (`orchestrator`)**:
   - Queries Google Ads SearchStream API v24 to download active campaigns, ad groups, and baseline copy assets.
   - Evaluates ad candidates against swarm feedback, enforces strict landing page grounding, and filters out unrealistic tester demands.
2. **Creative Copywriter Agent (`copywriter`)**:
   - Scrapes target landing page content in real-time.
   - Injects tested strategic frameworks (`PAS`, `AIDA`, `SWOT`, `4P`, `Hook Models`, etc.).
   - Produces 15 headlines and 4 descriptions per group with tight story spines.
3. **Quality & Review Agent (`reviewer`)**:
   - Hard character limit enforcement (Headlines: max 30 chars, Long Headlines / Descriptions: max 90 chars).
   - Removes trailing periods, exclamation marks, and restricted buzzwords (*"ROI"*, *"Boost"*, *"Sofort"*, *"Jetzt"*, *"Bewiesen"*).
4. **API Upload Engine (`uploader`)**:
   - Constructs single-batch mutate operations for Google Ads API.
   - Uploads compiled text assets and creates new RSAs or PMax Asset Groups in **`PAUSED`** status for safe verification.

---

## 3. Mass Pre-Production & Agent Swarm Module

Derived directly from advanced Make.com templates (`Module 309`, `Module 324`, `Module 321`), the pipeline includes an enterprise-grade pre-production engine:

- **Up to 400 Cardinal AI Ad Alternatives**: Generates 40 unique, non-repeating angles × 10 variations prior to ad launch.
- **Strict Landing Page Grounding**: The engine enforces strict alignment with verifiable USPs from the landing page. No invented features, no artificial guarantees.
- **Predictive Swarm Evaluation**: Simulates target customer sub-audiences to compute approval ratings alongside projected **CTR (%)**, **CPC (€)**, **CPM (€)**, and **CPL (€)**.
- **Holt-Winters ETS Forecasting**: Combines 30-day historical Google Ads account metrics with Swarm Winner uplift to forecast 30-day performance bounds.

---

## 4. Strategic Frameworks Suite (`frameworks/`)

The repository includes a comprehensive library of **over 100 Make.com blueprints and framework definitions** under [`frameworks/`](frameworks/):

### A. Slava Wagner Automations Frameworks ([`frameworks/slava-wagner-automations/`](frameworks/slava-wagner-automations/))
50 full-scale Make blueprints (25 RSA, 25 PMax) plus [`SWA Alle meine Frameworks.md`](frameworks/slava-wagner-automations/SWA%20Alle%20meine%20Frameworks.md):
- **Core Marketing**: 4P Marketing Mix, 7P Service Marketing, AIDA, PAS, FAB
- **Business Strategy**: SWOT Analysis, Business Model Canvas, Value Proposition Canvas, Three Horizons Framework, Ten Types of Innovation, Core Competence Analysis, Value Chain Analysis
- **Psychology & Personas**: Empathy Map, Customer Journey Mapping, Lifecycles, Market Sophistication

### B. 50 Hook Pipelines ([`frameworks/50-hook-pipelines/`](frameworks/50-hook-pipelines/))
50 specialized blueprints (25 RSA, 25 PMax) testing high-interrupt hooks:
- *Authority Hooks*, *Proof Hooks*, *Urgency Hooks*, *Curiosity Hooks*, *Contrarian Hooks*, *Status Hooks*, *Mechanism Hooks*, *Story Hooks*, and *Myth-Buster Hooks*.

---

## 5. Installation & Setup

### 1. Install Antigravity CLI
```bash
npm install -g @google/antigravity-cli
```

### 2. Clone Repository & Install Dependencies
```bash
git clone https://github.com/SlavaWagner/ai-ads-pipeline.git
cd ai-ads-pipeline
npm install
```

### 3. Configure Credentials
```bash
cp config.example.json config.json
```
Edit `config.json` with your Google Ads API & Gemini credentials:
- `customerId`: 10-digit Google Ads customer ID.
- `developerToken`: Google Ads developer token.
- `clientId`: Google Cloud OAuth2 Client ID.
- `clientSecret`: Google Cloud OAuth2 Client Secret.

### 4. Authorize Google Ads
```bash
ai-ads-pipeline setup
```
Starts a local redirect server on port `8085` to securely complete the OAuth2 flow.

---

## 6. CLI Command Reference

All commands run inside Google Antigravity CLI (`agy`):

| Command | Description |
| :--- | :--- |
| `ai-ads-pipeline run-workflow` | Runs the 4-agent RSA workflow: fetches active ads, writes 15 headlines & 4 descriptions, reviews compliance, and uploads as `PAUSED` ad. |
| `ai-ads-pipeline run-pmax` | Runs the Performance Max workflow: creates 15 headlines, 4 long headlines, 4 descriptions, and creates a paused asset group. |
| `ai-ads-pipeline preproduce` | Mass pre-production of up to 400 ad alternatives based on 40 angles, 6-D vectorization, Swarm testing & 30-day ETS forecast. |
| `ai-ads-pipeline swarm-test` | Standalone Persona Swarm test on existing creatives to project CTR, CPC, CPM, and CPL metrics. |
| `ai-ads-pipeline framework` | Interactively selects the active copywriting framework for asset creation. |
| `ai-ads-pipeline keywords` | Interactive keyword research using the Google Ads Keyword Planner API with intent clustering (ToFu, MoFu, High-Intent). |
| `ai-ads-pipeline skills` | Launches an interactive strategy chat based on Google Ads Standard Operating Procedures (SOPs). |
| `ai-ads-pipeline chat` | Starts a multi-turn chat session with a specific persistent agent (`orchestrator`, `copywriter`, `reviewer`, `uploader`). |
| `ai-ads-pipeline setup` | Interactive assistant for Gemini API Key, Google Ads OAuth2 (port 8085), and default settings. |
| `ai-ads-pipeline refresh-token`| Immediately refreshes the Google Ads API OAuth2 access token. |
| `ai-ads-pipeline agent list` | Lists all registered persistent agents and their system prompt configurations. |

### Example CLI Workflows:

```bash
# 1. Run standard RSA workflow with PAS framework:
ai-ads-pipeline run-workflow --framework pas

# 2. Pre-produce 400 alternatives with Landing Page Grounding:
ai-ads-pipeline preproduce -t "Real Estate Valuation" -k rsa -c 400 -u "https://www.slavawagner.de"

# 3. Create Performance Max alternatives:
ai-ads-pipeline run-pmax --framework angles

# 4. Interactive Keyword Planner research:
ai-ads-pipeline keywords
```

---

## License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for details.

---

*Created with Google Antigravity CLI | 100% Compliant SEA Architectures*
