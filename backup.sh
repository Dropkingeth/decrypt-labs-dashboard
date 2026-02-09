#!/bin/bash
# Auto-backup before any site changes
# Usage: ./backup.sh "description of what's about to change"

cd "$(dirname "$0")"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
MSG="${1:-Pre-edit backup}"

git add -A 2>/dev/null
git commit -m "💾 BACKUP ($TIMESTAMP): $MSG" --allow-empty 2>/dev/null

echo "✅ Backup committed: $MSG"
echo "   To rollback: git revert HEAD"
echo "   To see diff: git diff HEAD~1"
