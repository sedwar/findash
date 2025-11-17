# 🚀 Firebase Deployment Guide

## First Time Setup

```bash
# 1. Install Firebase CLI (if not installed)
npm install -g firebase-tools

# 2. Login to Firebase
firebase login

# 3. Initialize Firebase (if not done)
firebase init

# Choose:
# - Hosting
# - Use existing project or create new
# - Public directory: dist
# - Single-page app: Yes
# - Don't overwrite index.html
```

## Deploy

```bash
# Build first
npm run build

# Deploy to Firebase
firebase deploy
```

## Quick Deploy (Every Time)

```bash
npm run build && firebase deploy
```

Your site will be live at: `https://YOUR-PROJECT-ID.web.app`




