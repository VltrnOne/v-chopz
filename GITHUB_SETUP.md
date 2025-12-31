# GitHub Repository Setup

## Quick Setup Commands

After creating a GitHub repository, run these commands:

```bash
# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/v-chopz.git

# Or if you prefer SSH:
# git remote add origin git@github.com:YOUR_USERNAME/v-chopz.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Create Repository on GitHub

1. Go to https://github.com/new
2. Repository name: `v-chopz` (or `v-chopz-app`)
3. Description: "Free video splitting tool - Split videos up to 24 hours into equal segments"
4. Choose Public or Private
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

## After Pushing

Once pushed, you can:
- Connect to Render for backend deployment
- Connect to Vercel for frontend deployment
- Or deploy frontend to Siteground at vchopz.com

## Deployment URLs

- **Frontend**: https://vchopz.com (Siteground)
- **Backend**: https://v-chopz-api.onrender.com (Render - update after deployment)

