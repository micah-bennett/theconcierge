#!/usr/bin/env bash
# Build, deploy to Firebase, then commit and push to GitHub.
# Usage:
#   ./scripts/deploy-and-push.sh              # hosting + functions
#   ./scripts/deploy-and-push.sh hosting      # hosting only
#   ./scripts/deploy-and-push.sh functions    # functions only

set -euo pipefail
cd "$(dirname "$0")/.."

TARGET="${1:-hosting,functions}"

echo "→ Building site…"
npm run build

echo "→ Deploying Firebase ($TARGET)…"
firebase deploy --only "$TARGET"

if [[ -z "$(git status --porcelain)" ]]; then
  echo "→ Git: no changes to commit."
else
  echo "→ Git: committing and pushing…"
  git add -A
  git commit -m "Deploy: sync after Firebase deploy ($(date +%Y-%m-%d))"
  git push origin HEAD
fi

echo "✔ Done."
