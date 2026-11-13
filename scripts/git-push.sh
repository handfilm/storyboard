#!/usr/bin/env bash
# ==============================================================================
# HANDFILM // Autonomous Git Synchronization & Push Engine
# Usage:
#   ./scripts/git-push.sh <GITHUB_REPO_URL_OR_TOKEN> [REPO_URL] [BRANCH]
# Examples:
#   ./scripts/git-push.sh https://github.com/username/handfilm-storyboard.git
#   ./scripts/git-push.sh ghp_yourTokenHere https://github.com/username/handfilm-storyboard.git
# ==============================================================================

set -e

echo "🎬 HANDFILM // Git Synchronization Engine"
echo "=========================================="

# 0. Global safe directory configuration to prevent dubious ownership fatal errors
git config --global --add safe.directory "$PWD" 2>/dev/null || true
git config --global --add safe.directory '*' 2>/dev/null || true

# Ensure inside repository
if [ ! -d ".git" ]; then
  echo "⚡ Initializing git repository..."
  git init -b main
fi

git config user.name "${GIT_AUTHOR_NAME:-Rakib Himon}"
git config user.email "${GIT_AUTHOR_EMAIL:-nitambini.one@gmail.com}"
git config --global user.name "${GIT_AUTHOR_NAME:-Rakib Himon}" 2>/dev/null || true
git config --global user.email "${GIT_AUTHOR_EMAIL:-nitambini.one@gmail.com}" 2>/dev/null || true

ARG1="$1"
ARG2="$2"
BRANCH="${3:-main}"

# 1. Determine Remote URL & Token
REMOTE_URL=""
TOKEN=""

if [[ "$ARG1" =~ ^ghp_ ]] || [[ "$ARG1" =~ ^github_pat_ ]]; then
  TOKEN="$ARG1"
  REMOTE_URL="$ARG2"
elif [[ "$ARG1" =~ ^https:// ]]; then
  REMOTE_URL="$ARG1"
  if [[ "$ARG2" =~ ^ghp_ ]] || [[ "$ARG2" =~ ^github_pat_ ]]; then
    TOKEN="$ARG2"
  fi
elif [ -n "$GITHUB_TOKEN" ] && [ -n "$GITHUB_REPO_URL" ]; then
  TOKEN="$GITHUB_TOKEN"
  REMOTE_URL="$GITHUB_REPO_URL"
elif [ -n "$GITHUB_REPO_URL" ]; then
  REMOTE_URL="$GITHUB_REPO_URL"
fi

# Fallback: check existing origin
EXISTING_ORIGIN=$(git remote get-url origin 2>/dev/null || echo "")

if [ -z "$REMOTE_URL" ]; then
  if [ -n "$EXISTING_ORIGIN" ]; then
    REMOTE_URL="$EXISTING_ORIGIN"
    echo "ℹ️  Using existing remote: $REMOTE_URL"
  else
    echo "❌ Error: No GitHub repository URL provided."
    echo ""
    echo "Usage:"
    echo "  ./scripts/git-push.sh <REPO_URL>"
    echo "  ./scripts/git-push.sh <TOKEN> <REPO_URL>"
    echo ""
    echo "Example:"
    echo "  ./scripts/git-push.sh https://github.com/your-username/your-repo.git"
    echo "  ./scripts/git-push.sh ghp_xxxx https://github.com/your-username/your-repo.git"
    exit 1
  fi
fi

# Inject token if provided and URL is https
TARGET_PUSH_URL="$REMOTE_URL"
if [ -n "$TOKEN" ]; then
  # Strip any existing https:// prefix and user
  CLEAN_URL=$(echo "$REMOTE_URL" | sed -E 's|^https?://([^@]+@)?||')
  TARGET_PUSH_URL="https://${TOKEN}@${CLEAN_URL}"
fi

# Configure or update origin remote
if [ -z "$EXISTING_ORIGIN" ]; then
  git remote add origin "$TARGET_PUSH_URL"
  echo "✅ Remote 'origin' added."
else
  git remote set-url origin "$TARGET_PUSH_URL"
  echo "✅ Remote 'origin' updated."
fi

# Purge monolithic files (>100MB) from git tracking
echo "🧹 Purging monolithic media files from git tracking index..."
git rm -r --cached public/assets/videos/*.mp4 2>/dev/null || true
git rm -r --cached src/assets/mockups/*.mov 2>/dev/null || true
git rm -r --cached assets/*.mp4 2>/dev/null || true
git rm -r --cached *.cube 2>/dev/null || true
git rm -r --cached *.bin 2>/dev/null || true

# Build static production bundle and synchronize all assets
echo "🔨 Running production build & static asset sync..."
npm run build

# Stage files
echo "📦 Staging files..."
git add .

# Commit if there are changes
if git diff-index --quiet HEAD -- 2>/dev/null; then
  echo "ℹ️  Working tree clean; no new changes to commit."
else
  COMMIT_MSG="fix(core): declutter UI, inject 6-shot showcase presets, purge heavy media $(date -u +'%Y-%m-%d %H:%M:%SZ')"
  git commit -m "$COMMIT_MSG"
  echo "✅ Committed changes: $COMMIT_MSG"
fi

# Align branch pointer to target branch
git branch -M "$BRANCH"

# Fetch & rebase against remote origin to resolve divergence
echo "🔄 Fetching remote origin..."
if git fetch origin "$BRANCH" 2>/dev/null; then
  echo "🔀 Rebasing against origin/$BRANCH..."
  git rebase "origin/$BRANCH" || git rebase --skip || true
fi

# Push to destination cleanly (using force-with-lease to protect history if rebased)
echo "🚀 Pushing cleanly to origin $BRANCH..."
if git push -u origin "$BRANCH" --force-with-lease; then
  echo ""
  echo "🎉 SUCCESS: Pushed to GitHub repository successfully!"
  echo "Branch: $BRANCH"
else
  echo ""
  echo "⚠️ Standard push failed; attempting fallback push..."
  if git push -u origin "$BRANCH"; then
    echo "🎉 SUCCESS: Pushed to GitHub repository successfully!"
  else
    echo "❌ PUSH FAILED. Common causes:"
    echo "  1. Authentication Required: GitHub requires a Personal Access Token (PAT) with 'repo' scope."
    echo "     Run: ./scripts/git-push.sh <YOUR_GITHUB_PAT> $REMOTE_URL"
    echo "  2. Branch protection: Target branch '$BRANCH' may require pull request reviews."
    echo "  3. Repository does not exist or user lacks write permissions."
    exit 1
  fi
fi

