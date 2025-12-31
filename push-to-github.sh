#!/bin/bash

# Script to push V-Chopz to GitHub
# Usage: ./push-to-github.sh YOUR_GITHUB_USERNAME

if [ -z "$1" ]; then
    echo "Usage: ./push-to-github.sh YOUR_GITHUB_USERNAME"
    echo "Example: ./push-to-github.sh morpheous"
    exit 1
fi

GITHUB_USER=$1
REPO_NAME="v-chopz"

echo "🚀 Setting up GitHub repository for V-Chopz..."
echo ""
echo "📋 Steps:"
echo "1. Go to https://github.com/new"
echo "2. Repository name: $REPO_NAME"
echo "3. Description: 'Free video splitting tool - Split videos up to 24 hours into equal segments'"
echo "4. Choose Public or Private"
echo "5. DO NOT initialize with README, .gitignore, or license"
echo "6. Click 'Create repository'"
echo ""
read -p "Press Enter after you've created the repository on GitHub..."

echo ""
echo "🔗 Adding remote and pushing..."
git remote add origin https://github.com/$GITHUB_USER/$REPO_NAME.git 2>/dev/null || git remote set-url origin https://github.com/$GITHUB_USER/$REPO_NAME.git

echo "📤 Pushing to GitHub..."
git branch -M main
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo "🌐 Repository: https://github.com/$GITHUB_USER/$REPO_NAME"
else
    echo ""
    echo "❌ Push failed. Make sure:"
    echo "   - You've created the repository on GitHub"
    echo "   - You have the correct permissions"
    echo "   - You're authenticated (may need to login)"
fi

