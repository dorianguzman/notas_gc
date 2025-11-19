# Cloudflare Pages Setup Guide

This guide will help you deploy the Notas GC application on Cloudflare Pages with secure API endpoints.

## Overview

The application now uses:
- **Cloudflare Pages** for hosting the frontend
- **Cloudflare Workers** (Functions) for secure backend API
- **GitHub** as the data store (JSON files)
- **Environment Variables** to securely store the GitHub token

## Repository Structure

```
notas_gc/
├── functions/
│   └── api/
│       ├── save-remision.js      # Saves new remisions
│       └── update-remision.js    # Deletes/restores remisions
├── data/
│   ├── historial.json            # Remisions history
│   └── secuencia.json            # Sequence counter
├── assets/
│   └── logo.png
├── index.html
├── script.js
├── style.css
└── wrangler.toml                 # Cloudflare configuration
```

## Deployment Steps

### 1. Create GitHub Personal Access Token

1. Go to GitHub: **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Click **Generate new token (classic)**
3. Give it a name: `notas-gc-cloudflare`
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
5. Click **Generate token**
6. **COPY THE TOKEN** - you won't see it again!

### 2. Create Cloudflare Pages Project

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to **Workers & Pages** → **Create application** → **Pages**
3. Click **Connect to Git**
4. Select your **notas_gc** repository
5. Configure build settings:
   - **Project name**: `notas-gc`
   - **Production branch**: `main`
   - **Build command**: (leave empty)
   - **Build output directory**: `/`
6. Click **Save and Deploy**

### 3. Configure Environment Variables

1. In your Cloudflare Pages project, go to **Settings** → **Environment variables**
2. Add a new variable:
   - **Variable name**: `GITHUB_TOKEN`
   - **Value**: (paste the token you created in step 1)
   - **Environment**: Select **Production** and **Preview**
3. Click **Save**

### 4. Redeploy

1. Go to **Deployments** tab
2. Click **Retry deployment** on the latest deployment
3. Wait for deployment to complete

### 5. Get Your URL

Your app will be available at:
```
https://notas-gc.pages.dev
```

Or a custom domain if you configure one.

## How It Works

### Frontend (Browser)
- User fills out the remision form
- Clicks "Guardar Remisión"
- JavaScript calls `/api/save-remision`

### Backend (Cloudflare Worker)
- Receives remision data
- Uses `GITHUB_TOKEN` from environment variables (secure!)
- Calls GitHub API to:
  1. Read `secuencia.json`
  2. Read `historial.json`
  3. Increment sequence
  4. Add new remision to history
  5. Update both files on GitHub
- Returns new remision number to frontend

### Data Persistence
- All data stored in GitHub JSON files
- Automatically versioned (Git history)
- Can be edited manually if needed
- Survives deployments

## Local Development

To test locally with Wrangler:

```bash
# Install Wrangler CLI
npm install -g wrangler

# Set up environment variable
echo "GITHUB_TOKEN=your_token_here" > .dev.vars

# Start development server
wrangler pages dev . --port 8788

# Open browser
open http://localhost:8788
```

The app will automatically detect localhost and use the dev server URL.

## Troubleshooting

### Error: "GITHUB_TOKEN not configured"
- Make sure you added the environment variable in Cloudflare Pages settings
- Redeploy after adding the variable

### Error: "Failed to fetch history"
- Check that the GitHub token has `repo` scope
- Verify the repository is accessible with the token

### Changes not appearing
- Clear browser cache
- Check that files were updated in GitHub repository
- Redeploy Cloudflare Pages project

### API calls failing
- Open browser console (F12) to see errors
- Check Network tab for failed requests
- Verify the API endpoint URLs are correct

## Security Notes

✅ **Secure:**
- GitHub token is stored in Cloudflare environment variables
- Never exposed to the browser
- API calls go through Cloudflare Workers
- CORS properly configured

❌ **Do NOT:**
- Put the GitHub token in the frontend code
- Commit the token to the repository
- Share the token publicly

## Monitoring

View logs in Cloudflare Dashboard:
1. Go to your Pages project
2. Click **Functions** tab
3. View real-time logs of API calls

## Custom Domain (Optional)

To use your own domain:
1. Go to **Custom domains** in Cloudflare Pages
2. Click **Set up a custom domain**
3. Follow the instructions to configure DNS

## Next Steps

1. Test the application thoroughly
2. Create a few test remisions
3. Verify data is saved to GitHub
4. Test delete/restore functionality
5. Generate and download PDFs
6. Configure EmailJS if needed (optional)

## Support

If you encounter issues:
1. Check browser console for errors
2. Check Cloudflare Functions logs
3. Verify GitHub token permissions
4. Ensure JSON files are properly formatted
