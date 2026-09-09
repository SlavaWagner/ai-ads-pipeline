# ai-ads-pipeline: Persistent AI Agents for Google Ads Optimization

`ai-ads-pipeline` is a persistent AI agent framework designed to automatically generate, optimize, and upload compliant, high-performing Responsive Search Ad (RSA) and Performance Max (PMax) alternatives to Google Ads. It uses a structured multi-agent workflow powered by Gemini and the Google Ads API.

> [!IMPORTANT]
> **Prerequisite for AI Processing:**
> Please start Google Antigravity beforehand using the command **`agy`** in your console!
> Interactive chat sessions, asset generation workflows, and AI processing run exclusively **INSIDE the Antigravity CLI**. In a standard terminal shell outside Antigravity, no AI processing takes place, and static execution outputs are intercepted with a guidance notice.

---

## Architecture & Agents

This package contains two main workflows: a Multi-Agent Optimization Pipeline for generating responsive search ads and PMax asset groups, and an interactive Keyword Planner Chat Agent.

### 1. The 4-Agent Ad Optimization Pipeline
The ad optimization workflow is divided into four distinct agents to isolate tasks, enforce compliance, and control token usage:

1. **Orchestrator & Data Fetcher Agent**: Connects to the Google Ads API using `FetchAdsSkill` to download active ads and campaign baseline metrics, coordinates data transfer between agents, and manages execution limits.
2. **Creative Copywriter Agent**: Scrapes landing page content using `LandingPageScrapeSkill` and prompts Gemini to identify customer pain points and solution frames (Angles), generating 15 headlines and 4 descriptions.
3. **Quality & Compliance Review Agent**: Reviews ad copy against character limits (30 chars for headlines, 90 chars for descriptions), normalizes marketing tone, removes restricted terms (`ROI`, `Boost`, `Sofort`, `Jetzt`, `Bewiesen`), and applies programmatic compliance sanitization.
4. **Formatting & Upload Agent**: Formats the sanitized copy into Google Ads mutation payloads and uploads the new alternative as a `PAUSED` ad or asset group using `UploadAdsSkill`.

```
[Orchestrator] -> (Fetch Ads) -> [Copywriter] -> (Scrape & Write) -> [Reviewer] -> (Clean & Sanitize) -> [Uploader] -> (Mutate PAUSED)
```

### 2. Google Ads Keyword Planner Chat Agent
An interactive assistant that lets you query real keyword ideas and historical metrics (search volume, competition, top-of-page bids) directly from the Google Ads API, clusters them by search intent (High-Intent, MoFu, ToFu) with up to 25 keywords per cluster, and maintains an interactive feedback loop to refine the selection.

---

## Installation & Setup

### 0. Google Cloud Prerequisites
Before configuring the pipeline, you need a Google Cloud project with the **Google Ads API** enabled and OAuth2 credentials configured:
1. Enable the **Google Ads API** in your Google Cloud Console.
2. Configure the **OAuth Consent Screen**:
   - Add the scope: `https://www.googleapis.com/auth/adwords`.
   - Add your email as a **Test User** (if your publishing status is "Testing").
3. Create an **OAuth Client ID** (Application type: `Web application`):
   - Set the **Authorized redirect URIs** to: `http://localhost:8085`
   - Copy the generated **Client ID** and **Client Secret** (required for step 4).

For a detailed step-by-step walkthrough, see [SETUP_GUIDE.md](SETUP_GUIDE.md).

### 1. Install Antigravity CLI
This AI Agent package runs inside the **Antigravity CLI**. Install it globally on your system:
```bash
npm install -g @google/antigravity-cli
```
*(Note: While the host environment uses the `agy` command globally, the commands for this specific SEA Ads Pipeline package are run using `ai-ads-pipeline`)*.

### 2. Clone Repository & Install Dependencies
Clone this repository to your local machine and install dependencies:
```bash
git clone https://github.com/SlavaWagner/ai-ads-pipeline.git
cd ai-ads-pipeline
npm install
```

### 3. Configure Credentials
Create your configuration file from the template:
```bash
cp config.example.json config.json
```
Edit `config.json` and enter your Google Ads API credentials:
- `customerId`: Your 10-digit Google Ads customer ID.
- `developerToken`: Your Google Ads developer token.
- `clientId`: Your Google Cloud OAuth2 Client ID.
- `clientSecret`: Your Google Cloud OAuth2 Client Secret.

### 4. Authorize Google Ads
Run the interactive setup tool to authenticate your client via OAuth2:
```bash
ai-ads-pipeline setup
```
This starts a local redirect server on port `8085` and displays an authorization link in the terminal. Open the link in your web browser, grant the required permissions, and the CLI will store your tokens.

### 5. Link CLI Globally (Optional)
To make the command globally available on your machine:
```bash
npm link
```

---

## CLI Usage

Run any of the following commands:

* **Start the RSA Workflow**: Coordinates all 4 agents to fetch, write, sanitize, and upload paused RSA alternatives:
  ```bash
  ai-ads-pipeline run-workflow
  ```
  Optionally override the active framework for this run using the `-f` or `--framework` option:
  ```bash
  ai-ads-pipeline run-workflow --framework business
  ```
  Available frameworks: `angles` (default), `audiences`, `business`, `copywritings`, `sophistication`.

* **Start the PMax Asset Group Workflow**: Creates new Performance Max (PMax) Asset Groups with 15 headlines (max 30 chars), 4 long headlines (max 90 chars), and 4 descriptions (max 90 chars) in `PAUSED` status:
  ```bash
  ai-ads-pipeline run-pmax
  ```
  Optionally specify a framework (defaults to `angles`):
  ```bash
  ai-ads-pipeline run-pmax --framework angles
  ```

* **Mass Pre-production & ETS Predictive Testing (`preproduce`)**:
  - **Phase 0 Angle Discovery Engine**: Prior to asset creation, the preproduction agent executes an offer-tailored Angle Search to discover **40 unique, distinct positioning angles** (story spines & buyer motivators) tailored to the offer, industry, and landing page context.
  - **Google Ads Account Baseline Stream**: Automatically pulls 30-day historical account performance metrics (`searchStream`) directly from the Google Ads API (CTR, CPC, CPM, CPL, Cost, Conversions) to establish an empirical performance baseline.
  - **Exponential Triple Smoothing (Holt-Winters ETS) Forecasting**: Runs Level ($\alpha$), Trend ($\beta$), and Seasonality ($\gamma$) time-series smoothing over historical Google Ads baseline data combined with Swarm Winner Uplift to project a 30-day performance forecast (Total Spend, Conversions, CTR, CPC, CPL) with 95% confidence bounds.
  - **Full 40 Asset-Group Swarm Evaluation**: Evaluates up to 40 top candidate asset groups via the 20-Agent Persona Swarm in complete tabular format and projects CTR, CPC, CPM, and CPL metrics:
  ```bash
  ai-ads-pipeline preproduce
  ```
  Options:
  - `-t, --theme <topic>`: Campaign focus theme / topic
  - `-k, --track <rsa|pmax>`: Campaign track (default `rsa`)
  - `-c, --count <number>`: Number of AI ad alternatives to pre-produce (default `400`)
  - `-u, --url <url>`: Target landing page URL for context scraping
  - `--no-swarm`: Skip 20-Agent Persona Swarm testing

* **Standalone 20-Agent Swarm Testing**: Run predictive asset testing directly across 20 test customer personas (sub-audiences) to get qualitative persona feedback and CTR/CPC/CPM/CPL projections:
  ```bash
  ai-ads-pipeline swarm-test --track rsa
  ```

* **Framework Chooser**: Select a framework for asset creation interactively, or pass the framework name directly. The selected framework becomes the default for future runs:
  ```bash
  ai-ads-pipeline framework
  ```
  Or set it directly:
  ```bash
  ai-ads-pipeline framework <angles|audiences|business|copywritings|sophistication|none>
  ```

* **Interactive Keyword Research**: Start an interactive chat session to generate keyword clusters based on real Google Ads Keyword Planner API data:
  ```bash
  ai-ads-pipeline keywords
  ```
  This command prompts you for a keyword theme, queries the Google Ads API, outputs a structured markdown report, saves raw ideas to `storage/runs/keywords-<theme>-raw.json` and the markdown report to `storage/runs/keywords-<theme>-report.md`, and maintains a feedback loop for refinement (e.g., "more B2B focus", "more local keywords").

* **Interactive Strategy Chat (SOPs)**: Start an interactive chat session using your Google Ads strategy markdown documents (SOPs) as the knowledge base:
  ```bash
  ai-ads-pipeline skills
  ```
  This command lists all available strategy SOPs found in `src/strategies/`, lets you select one, and launches an advisor chat session where you can ask questions or evaluate your campaign metrics according to that specific SOP.

* **Interactive Chat with AI Agents**: Chat directly with any persistent AI agent:
  ```bash
  ai-ads-pipeline chat
  ```
  Or target a specific agent by name:
  ```bash
  ai-ads-pipeline chat orchestrator
  ```

* **Visual Web Dashboard**: Start the local browser dashboard server to view telemetry and system status:
  ```bash
  ai-ads-pipeline dashboard
  ```

* **Interactive Setup**: Set up credentials and perform OAuth2 authentication:
  ```bash
  ai-ads-pipeline setup
  ```

* **Manual Token Refresh**: Refresh your Google Ads API access token immediately:
  ```bash
  ai-ads-pipeline refresh-token
  ```

* **Manage Agents**: List or view persistent AI agent configurations:
  ```bash
  ai-ads-pipeline agent list
  ```

---

## Features

- **Location-Independent Configs**: Configuration and storage directory paths are resolved relative to the package installation directory, allowing you to run the CLI from any directory without losing access tokens.
- **Programmatic Sanitizer**: A hard fallback review module checks headlines and descriptions for exact lengths and forbidden characters to avoid API upload errors.
- **Automatic Paused Status**: All new ad creatives are uploaded with a `PAUSED` status, allowing human review and approval in Google Ads Editor before going live.
- **Antigravity CLI Guard**: Built-in environment detection ensures users are properly informed when attempting to run AI workloads outside of the Antigravity CLI environment.

---

*This AI Agent was created with the help of Google Antigravity CLI*
