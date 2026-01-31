# Tradovate Data Scraping - Daily Update

## Account Mapping

| Bot | Tradovate Account | Starting Balance |
|-----|-------------------|------------------|
| FVG+IFVG #1 | APEX2519120000014 | $150,000 |
| OTE Silver Bullet | APEX2519120000018 | $150,000 |

## How to Update (Manual)

1. Login to https://trader.tradovate.com
2. Check each account's Equity
3. Update `dashboard/data.json`:
   - `bots.fvg-ifvg-1.currentBalance` = Account 14 equity
   - `bots.fvg-ifvg-1.performance.netPnl` = equity - 150000
   - `bots.ote-silver-bullet.currentBalance` = Account 18 equity  
   - `bots.ote-silver-bullet.performance.netPnl` = equity - 150000
   - `aum.total` = sum of both equities
   - `lastUpdated` = current ISO timestamp

## Automated Scraping (via Jimmy)

Daily at 5:00 AM PST, Jimmy will:
1. Open Tradovate in browser
2. Login with saved credentials
3. Scrape equity for both accounts
4. Update data.json
5. Notify if significant changes

## Last Scraped

- **Date:** 2026-01-31 05:19 PST
- **APEX2519120000014 (FVG+IFVG):** $151,133.32 (+$1,133.32)
- **APEX2519120000018 (OTE Silver Bullet):** $151,296.32 (+$1,296.32)
- **Combined AUM:** $302,429.64
- **Total Profit:** +$2,429.64
