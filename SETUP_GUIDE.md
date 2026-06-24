# End-User Setup Guide: AI Ads Pipeline

This guide walks you through the initial setup, credential storage, and Google Ads OAuth2 authentication process for the **AI Ads Pipeline** CLI.

---

## 1. Prerequisites

Before setting up the CLI, make sure you have the following ready:
- **Node.js**: Version 18.0.0 or higher.
- **Antigravity CLI**: Global installation (`npm install -g @google/antigravity-cli`).
- **Google Ads Developer Token**: Required to access the Google Ads API (Basic or Standard Access from your Google Ads MCC Manager Account).
- **Google Ads Customer ID**: The 10-digit ID of the Google Ads client account you want to optimize (e.g. `123-456-7890`).
- **Google Cloud Project**: An active GCP project with the **Google Ads API** enabled and OAuth2 credentials configured.

---

## 2. Setting Up OAuth2 Client Credentials in Google Cloud

To authenticate via Google Ads, you must create OAuth2 Client Credentials in your Google Cloud Console:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project, then navigate to **APIs & Services > OAuth consent screen**.
3. Configure the consent screen and add the scope: `https://www.googleapis.com/auth/adwords`.
4. Add your email as a **Test User** (required if your app is in "Testing" publishing status).
5. Go to **APIs & Services > Credentials**, click **+ Create Credentials**, and select **OAuth client ID**.
6. Set the **Application type** to `Web application`.
7. Add the following to **Authorized redirect URIs**:
   - `http://localhost:8085`
8. Click **Create** and copy your **Client ID** and **Client Secret**.

---

## 3. Installation & Initial Configuration

1. Install the global **Antigravity CLI**:
   ```bash
   npm install -g @google/antigravity-cli
   ```

2. Clone your repository and install local packages:
   ```bash
   git clone https://github.com/SlavaWagner/ai-ads-pipeline.git
   cd ai-ads-pipeline
   npm install
   ```

3. Initialize the configuration file:
   ```bash
   cp config.example.json config.json
   ```

4. Expose the command line globally:
   ```bash
   npm link
   ```

---

## 4. Google Ads OAuth2 Authentication

Run the interactive setup tool:

```bash
ai-ads-pipeline setup
```

The CLI will prompt you for the following inputs:
- **Google Ads Customer ID**: (e.g., `2586797344`)
- **Google Ads Client ID**: (copied from Google Cloud Console)
- **Google Ads Client Secret**: (copied from Google Cloud Console)
- **Google Ads Developer Token**: (your MCC developer token)
- **Manager Login Customer ID**: (Optional; fill this if your client account is managed through an MCC manager account and requires a `login-customer-id` header).

### How the Consent Flow Works:

1. After saving your initial variables, the CLI launches a local HTTP redirect server listening on **port `8085`**.
2. It displays a secure Google OAuth consent URL in the terminal:
   ```text
   Please open the following link in your web browser to authorize access:
   https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=...
   ```
3. Copy and open the link in your web browser. 
4. Log in with your Google Account, review the requested permissions (access to manage Google Ads campaigns), and click **Allow**.
5. Upon authorization, Google redirects your browser to `http://localhost:8085/?code=AUTHORIZATION_CODE`.
6. The CLI's redirect server automatically intercepts the `code` parameter, prints a success message, and shuts down.
7. The CLI exchanges the authorization code for a permanent **Refresh Token** via Google's token endpoint (`https://oauth2.googleapis.com/token`) and saves both the refresh token and the active access token into `config.json`.

---

## 5. Location-Independent Configuration (Persistence)

The **AI Ads Pipeline** CLI is designed with absolute path persistence. All configurations (`config.json`) and agent data (`storage/`) are resolved relative to the package installation directory, **not** the directory where you trigger the command.

This means you can trigger the pipeline globally from anywhere:
```bash
# Run from your Desktop, Home directory, or any other path
ai-ads-pipeline run-workflow
```
The CLI will automatically locate your tokens and run logs inside the project folder (`ai-ads-pipeline/`).
