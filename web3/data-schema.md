# Decrypt Labs — Data Schema

## Buyback Record Structure

When Jimmy executes a monthly buyback, the record is added to `data.json`:

```json
{
  "buybacks": [
    {
      "id": "buyback-2026-02",
      "month": "2026-02",
      "timestamp": "2026-03-01T00:30:00Z",
      
      "grossProfit": 10000.00,
      "taxSetAside": 3000.00,
      "netProfit": 7000.00,
      "buybackUSD": 2800.00,
      
      "tokensBought": 2800000,
      "tokensBurned": 2800000,
      "avgPrice": 0.001,
      
      "swapTxHash": "0x1234...abcd",
      "burnTxHash": "0x5678...efgh",
      
      "status": "completed",
      "error": null,
      
      "swapTxUrl": "https://basescan.org/tx/0x1234...abcd",
      "burnTxUrl": "https://basescan.org/tx/0x5678...efgh"
    }
  ]
}
```

## Hall of Fame Structure

Top token holders/burners:

```json
{
  "hallOfFame": [
    {
      "rank": 1,
      "address": "0x1234...5678",
      "displayName": "whale.eth",
      "balance": 50000000,
      "tier": "diamond",
      "firstSeen": "2026-02-01T00:00:00Z"
    }
  ]
}
```

## Token Stats Structure (Future)

```json
{
  "tokenStats": {
    "totalSupply": 1000000000,
    "circulatingSupply": 970000000,
    "totalBurned": 30000000,
    "burnedPercent": 3.0,
    "price": 0.0012,
    "marketCap": 1164000,
    "holders": 1523,
    "lastUpdated": "2026-03-01T00:00:00Z"
  }
}
```

## Fee Breakdown for Display

```json
{
  "lastMonthBreakdown": {
    "month": "2026-02",
    "grossProfit": 10000.00,
    "taxSetAside": 3000.00,
    "netProfit": 7000.00,
    "allocations": {
      "buyback": { "percent": 40, "amount": 2800.00 },
      "treasury": { "percent": 20, "amount": 1400.00 },
      "engineers": { "percent": 20, "amount": 1400.00 },
      "fuel": { "percent": 10, "amount": 700.00 },
      "repairs": { "percent": 5, "amount": 350.00 },
      "insurance": { "percent": 5, "amount": 350.00 }
    }
  }
}
```
