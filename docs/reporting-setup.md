# Automated Reporting Setup Guide

This guide walks you through setting up automated daily reports for your Notas de Remisión system.

## Overview

**Architecture:**
1. Google Apps Script appends each nota to Google Sheets when email is sent
2. Google Sheets acts as the database (single source of truth)
3. GitHub Actions runs daily to pull data and generate reports
4. Reports are committed back to the repository

**Reports Generated:**
- Yesterday
- Last 7 Days
- Last 15 Days
- This Month
- Last 3 Months

## Prerequisites

- ✅ Google account with access to Google Sheets
- ✅ GitHub repository access
- ✅ Google Apps Script already deployed

## Setup Steps

### Step 1: Update Google Apps Script

1. Go to https://script.google.com
2. Open your "Notas Remision Email Service" project
3. Replace the entire code with the updated version from `google-apps-script.md`
4. The new code includes:
   - Sheet ID: `17zK2IwzvEc1LykPP5_1fBug3_yQaQvV5WtBFa97LDPM`
   - Function to append data to Google Sheets
5. Save the project (Ctrl/Cmd + S)
6. Deploy the new version:
   - Click **"Deploy"** → **"Manage deployments"**
   - Click the pencil icon (Edit)
   - Select **"New version"**
   - Click **"Deploy"**

**Note**: The script will automatically create a "Notas" tab in your Google Sheet on first use.

### Step 2: Test Data Collection

1. Go to http://localhost:5555 (or your live site)
2. Create a test nota and either:
   - Click "Generar PDF" (download)
   - OR click "Enviar por Correo" (send email)
3. Open your Google Sheet: https://docs.google.com/spreadsheets/d/17zK2IwzvEc1LykPP5_1fBug3_yQaQvV5WtBFa97LDPM/edit
4. Verify a "Notas" tab was created with your test data

**Expected columns:**
- Timestamp, Remision, Fecha, Cliente, ClienteEmail, Ciudad, Conceptos_JSON, Subtotal, IVA, Total

### Step 3: Create Google Service Account

Follow the detailed guide in `docs/service-account-setup.md`:

1. Create Google Cloud Project
2. Enable Google Sheets API
3. Create Service Account
4. Download JSON key file
5. Share Google Sheet with service account email
6. Add credentials to GitHub secrets:
   - `GOOGLE_SERVICE_ACCOUNT` (entire JSON file contents)
   - `SHEET_ID` (value: `17zK2IwzvEc1LykPP5_1fBug3_yQaQvV5WtBFa97LDPM`)

**⚠️ Important**: This is 100% free! No credit card required.

### Step 4: Verify GitHub Actions Setup

The workflow file `.github/workflows/daily-reports.yml` is already in your repository.

1. Go to your GitHub repository
2. Click the **"Actions"** tab
3. You should see **"Daily Reports"** workflow listed

### Step 5: Test the Workflow

1. In GitHub Actions, select **"Daily Reports"** workflow
2. Click **"Run workflow"** dropdown
3. Click **"Run workflow"** button
4. Wait for the workflow to complete (1-2 minutes)
5. Check the logs for any errors
6. Verify reports were generated in the `reports/` folder

### Step 6: Verify Reports

After the workflow runs successfully:

1. Go to your repository's `reports/` folder
2. You should see 5 markdown files:
   - `yesterday.md`
   - `last_7_days.md`
   - `last_15_days.md`
   - `this_month.md`
   - `last_3_months.md`
3. Open any report to view sales metrics

## Report Contents

Each report includes:

**Summary Metrics:**
- Total Revenue
- Total Notas
- Average Ticket
- Total Items Sold

**Top Customers:**
- Ranked by total revenue
- Top 5 customers

**Top Products:**
- Ranked by quantity sold
- Top 10 products

## Automation Schedule

The workflow runs automatically:
- **Daily at 1 AM** (Mexico City time)
- **Timezone**: UTC-6 (configured as 7 AM UTC in workflow)

You can also run it manually anytime from the Actions tab.

## Troubleshooting

### Reports Not Generating

**Check Google Sheets:**
- Verify data exists in the "Notas" tab
- Check that columns match expected format

**Check GitHub Secrets:**
- `GOOGLE_SERVICE_ACCOUNT` should contain the full JSON key
- `SHEET_ID` should be: `17zK2IwzvEc1LykPP5_1fBug3_yQaQvV5WtBFa97LDPM`

**Check Service Account Permissions:**
- Verify you shared the sheet with the service account email
- Service account needs at least "Viewer" access

### "The caller does not have permission" Error

1. Go to your Google Sheet
2. Click "Share"
3. Verify the service account email is listed
4. If not, add it with "Viewer" permission

### "API has not been used" Error

1. Go to Google Cloud Console
2. Navigate to "APIs & Services" → "Library"
3. Search for "Google Sheets API"
4. Make sure it's enabled
5. Wait 5-10 minutes for changes to propagate

### Workflow Failed with Import Error

This usually means Python dependencies aren't installed. The workflow should handle this automatically, but if it fails:
- Check that `requirements.txt` exists in the repository
- Verify the workflow includes the "Install dependencies" step

## Data Privacy

- ✅ Service account key stored as encrypted GitHub secret
- ✅ Only your repository's workflows can access secrets
- ✅ Service account has read-only access to Google Sheets
- ✅ Reports are committed to your private/public repository

## Cost

**Everything is FREE:**
- ✅ Google Service Account: Free
- ✅ Google Sheets API: Free (300 requests/min)
- ✅ GitHub Actions: Free for public repos, 2,000 minutes/month for private repos
- ✅ Your usage: ~1 minute/day = 30 minutes/month

## Next Steps

Once everything is working:

1. ✅ Test with real nota data
2. ✅ Verify reports update daily
3. ✅ Share report links with your team
4. ✅ Consider adding more report types if needed

## Support

If you encounter issues:
1. Check GitHub Actions logs for error messages
2. Review Google Apps Script execution logs
3. Verify all secrets are configured correctly
4. Ensure Google Sheet is shared with service account
