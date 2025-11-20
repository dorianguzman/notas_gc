# Google Service Account Setup for GitHub Actions

This guide explains how to create a Google Service Account that GitHub Actions will use to access your Google Sheets data.

## Why Service Account?

Service accounts allow automated systems (like GitHub Actions) to access Google APIs securely without user interaction. The credentials are stored as GitHub secrets.

## Step-by-Step Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** dropdown at the top
3. Click **"New Project"**
4. Name it: "Notas GC Reporting"
5. Click **"Create"**
6. Wait for project creation (notification will appear)

### 2. Enable Google Sheets API

1. Make sure your new project is selected
2. Go to **"APIs & Services"** → **"Library"**
3. Search for **"Google Sheets API"**
4. Click on it and click **"Enable"**

### 3. Create Service Account

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"Service Account"**
3. Fill in details:
   - **Service account name**: `github-actions-reporter`
   - **Service account ID**: (auto-generated)
   - **Description**: "Service account for GitHub Actions to read notas data"
4. Click **"Create and Continue"**
5. Skip optional steps (click **"Continue"** and **"Done"**)

### 4. Create Service Account Key

1. In the **"Credentials"** page, find your service account under **"Service Accounts"**
2. Click on the service account email
3. Go to the **"Keys"** tab
4. Click **"Add Key"** → **"Create new key"**
5. Select **"JSON"** format
6. Click **"Create"**
7. The key file will download automatically (e.g., `notas-gc-reporting-xxxxx.json`)
8. ⚠️ **IMPORTANT**: Keep this file secure! Do not commit it to Git!

### 5. Share Google Sheet with Service Account

1. Open the downloaded JSON file
2. Copy the **"client_email"** value (looks like: `github-actions-reporter@notas-gc-reporting.iam.gserviceaccount.com`)
3. Go to your Google Sheet: https://docs.google.com/spreadsheets/d/17zK2IwzvEc1LykPP5_1fBug3_yQaQvV5WtBFa97LDPM/edit
4. Click **"Share"** button
5. Paste the service account email
6. Set permission to **"Viewer"** (GitHub Actions only needs to read)
7. Uncheck **"Notify people"**
8. Click **"Share"**

### 6. Add Credentials to GitHub Secrets

1. Go to your GitHub repository
2. Click **"Settings"** → **"Secrets and variables"** → **"Actions"**
3. Click **"New repository secret"**

**Secret 1: GOOGLE_SERVICE_ACCOUNT**
- Name: `GOOGLE_SERVICE_ACCOUNT`
- Value: Copy the **entire contents** of the downloaded JSON file
- Click **"Add secret"**

**Secret 2: SHEET_ID**
- Click **"New repository secret"** again
- Name: `SHEET_ID`
- Value: `17zK2IwzvEc1LykPP5_1fBug3_yQaQvV5WtBFa97LDPM`
- Click **"Add secret"**

### 7. Verify Setup

Once the GitHub Actions workflow is set up, you can test it by:
1. Going to **"Actions"** tab in your repository
2. Selecting the **"Daily Reports"** workflow
3. Clicking **"Run workflow"** → **"Run workflow"**
4. Check the logs to see if it successfully reads from Google Sheets

## Security Notes

- ✅ Service account key is stored as GitHub secret (encrypted)
- ✅ Service account only has read access to the specific sheet
- ✅ Key is never exposed in logs or code
- ⚠️ Never commit the JSON key file to Git
- ⚠️ Delete local copy of JSON file after adding to GitHub secrets

## Troubleshooting

**Error: "The caller does not have permission"**
- Make sure you shared the sheet with the service account email
- Verify the service account has at least Viewer permission

**Error: "Unable to parse range"**
- Check that the SHEET_ID is correct in GitHub secrets
- Verify the sheet name is "Notas" (case-sensitive)

**Error: "API has not been used"**
- Make sure Google Sheets API is enabled in Google Cloud Console
- Wait a few minutes after enabling (can take time to propagate)
