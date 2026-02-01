# 🔐 Security Guidelines

## NEVER Commit These Files

| Type | Examples | Why |
|------|----------|-----|
| **Private Keys** | `.env`, `*.key`, `*.pem` | Full wallet access |
| **PineScript** | `*.pine` | Trading strategies |
| **Trade Data** | `*.jsonl`, `trades.json` | Performance data |
| **Local Config** | `*.local.js` | Machine-specific secrets |

## Pre-Commit Checklist

Before every commit, run:
```bash
git status
```

⚠️ **STOP if you see:**
- Any `.pine` file
- Any `.env` file
- Any `*private*` or `*secret*` file
- Any `.jsonl` or `.log` file

## If You Accidentally Commit Secrets

1. **DON'T PANIC**
2. Remove from tracking: `git rm --cached <file>`
3. Add to `.gitignore`
4. If pushed: Consider nuking history (ask Jimmy)
5. If it's a private key: **That wallet is BURNED** - never use it again

## Safe File Locations

| What | Where | In Git? |
|------|-------|---------|
| Private keys | `~/.decrypt-labs-wallet.txt` | ❌ NO |
| PineScript | `webhook/*.pine` (gitignored) | ❌ NO |
| Trade logs | `webhook/*.jsonl` (gitignored) | ❌ NO |
| Smart contracts | `contracts/src/*.sol` | ✅ YES |
| Deployment scripts | `contracts/script/*.sol` | ✅ YES |

## Contact

If you're unsure, ask before committing!
