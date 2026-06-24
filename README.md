# ai-ads-pipeline: Persistent AI Agents for Google Ads Optimization

ai-ads-pipeline is a persistent AI agent framework designed to automatically generate, optimize, and upload compliant, high-performing Responsive Search Ad (RSA) alternatives to Google Ads. It uses a structured 4-agent workflow powered by Gemini and the Google Ads API.

## Architecture & Agents

This package contains two main workflows: a 4-Agent Optimization Pipeline for generating responsive search ad alternatives, and an interactive Keyword Planner Chat Agent.

### 1. The 4-Agent Ad Optimization Pipeline
The ad optimization workflow is split into four distinct agents to isolate tasks, enforce security compliance, and control token usage:

1. **Orchestrator & Data Fetcher Agent**: Connects to the Google Ads API using the `FetchAdsSkill` to download active ads, coordinates data transfer between agents, and manages execution safety limits.
2. **Creative Copywriter Agent**: Scrapes the landing page content using `LandingPageScrapeSkill` and prompts Gemini to identify a customer pain point & solution frame (Angle), generating 15 headlines and 4 descriptions.
3. **Quality & Compliance Review Agent**: Reviews the ad copies against character limits (30 chars for headlines, 70 chars for descriptions), normalizes marketing tone, removes restricted terms (`ROI`, `Boost`, `Sofort`, `Jetzt`, `Bewiesen`), and applies programmatic compliance sanitization.
4. **Formatting & Upload Agent**: Formats the sanitized copy into Google Ads mutation payloads and uploads the new alternative as a `PAUSED` ad using `UploadAdsSkill`.

```
[Orchestrator] -> (Fetch Ads) -> [Copywriter] -> (Scrape & Write) -> [Reviewer] -> (Clean & Sanitize) -> [Uploader] -> (Mutate PAUSED)
```

### 2. Google Ads Keyword Planner Chat Agent
An interactive assistant that lets you query real keyword ideas and historical metrics (search volume, competition, top-of-page bids range) from the Google Ads API, clusters them by search intent (High-Intent, MoFu, ToFu) with up to 25 keywords per cluster, and runs a feedback loop to refine the selection.


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
   - Copy the generated **Client ID** and **Client Secret** (you will need these in step 4).

For a detailed step-by-step walkthrough, see [SETUP_GUIDE.md](SETUP_GUIDE.md).

### 1. Install Antigravity CLI
This AI Agent package runs on the **Antigravity CLI**. You must have it installed globally on your system:
```bash
npm install -g @google/antigravity-cli
```
*(Note: While the host environment uses the `agy` command globally, the commands for this specific SEA Ads Pipeline package are run using `ai-ads-pipeline`)*.

### 2. Clone Repository & Install Dependencies
Clone this repository to your local machine and install the dependencies:
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
This starts a local redirect server on port `8085` and prints an authorization link in the terminal. Open the link in your web browser, grant the required permissions, and the CLI will save your tokens.

### 5. Link CLI Globally (Optional)
To make the command globally available on your machine:
```bash
npm link
```

---

## CLI Usage

Run any of the following commands:

* **Start the Workflow**: Coordinates all 4 agents to fetch, write, sanitize, and upload paused alternatives.
  ```bash
  ai-ads-pipeline run-workflow
  ```
  You can optionally override the active framework for this run using the `-f` or `--framework` option:
  ```bash
  ai-ads-pipeline run-workflow --framework business
  ```
  Available frameworks: `angles`, `audiences`, `business`, `copywritings`, `sophistication`.

* **Framework Chooser**: Select a framework for asset creation interactively, or pass the framework name directly. The selected framework becomes the default for future runs:
  ```bash
  ai-ads-pipeline framework
  ```
  Or set it directly:
  ```bash
  ai-ads-pipeline framework <angles|audiences|business|copywritings|sophistication|none>
  ```

* **Interactive Keyword Research**: Start an interactive chat session to generate keyword clusters based on real Google Ads Keyword Planner API data.
  ```bash
  ai-ads-pipeline keywords
  ```
  This command prompts you for a keyword theme, queries the Google Ads API, outputs a structured markdown report, saves the raw ideas to `storage/runs/keywords-<theme>-raw.json` and the markdown report to `storage/runs/keywords-<theme>-report.md`, and starts a feedback loop where you can enter follow-up instructions (e.g. "mehr B2B", "mehr lokale Keywords").

* **Interactive Strategy Chat (SOPs)**: Start an interactive chat session using your Google Ads strategy markdown documents (SOPs) as the knowledge base.
  ```bash
  ai-ads-pipeline skills
  ```
  This command lists all available strategy SOPs found in `src/strategies/`, lets you select one, and launches an advisor chat session where you can ask questions or evaluate your campaign metrics according to that specific SOP.

* **Interactive Setup**: Set up credentials and perform OAuth2 authentication.
  ```bash
  ai-ads-pipeline setup
  ```
* **Manual Token Refresh**: Refresh your Google Ads API access token immediately.
  ```bash
  ai-ads-pipeline refresh-token
  ```
* **Manage Agents**: List or modify persistent AI agent configurations.
  ```bash
  ai-ads-pipeline agent list
  ```

---

## Features

- **Location-Independent Configs**: Configuration and storage directory paths are resolved relative to the package installation directory, allowing you to run the CLI from any directory without losing access tokens.
- **Programmatic Sanitizer**: A hard fallback review module checks headlines and descriptions for exact lengths and forbidden characters to avoid API upload errors.
- **Automatic Paused Status**: All new ad creatives are uploaded with a `PAUSED` status, allowing human review and approval in Google Ads Editor before going live.

---

*This AI Agent was created with the help of Google Antigravity CLI*

