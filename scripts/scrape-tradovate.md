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

- **Date:** 2026-01-28 05:49 PST
- **APEX2519120000014:** $153,003.76 (+$3,003.76)
- **APEX2519120000018:** $150,424.06 (+$424.06)
- **Combined AUM:** $303,427.82
- **Total Profit:** +$3,427.82
