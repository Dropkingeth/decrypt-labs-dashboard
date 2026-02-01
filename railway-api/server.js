/**
 * Decrypt Labs - Webhook API (Railway Edition)
 * 
 * Receives trade alerts from TradingView/TradersPost
 * Serves data to decryptlabs.io website
 * 
 * Deploy: Railway free tier for stable URL
 */

const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 3456;

// In-memory storage (Railway filesystem is ephemeral)
let trades = [];
let stats = {
  bots: {
    'ote-silver-bullet': { trades: 0, wins: 0, losses: 0, totalPnl: 0, todayPnl: 0, lastReset: new Date().toDateString() },
    'ote-refined': { trades: 0, wins: 0, losses: 0, totalPnl: 0, todayPnl: 0, lastReset: new Date().toDateString() },
    'ote-refined-small': { trades: 0, wins: 0, losses: 0, totalPnl: 0, todayPnl: 0, lastReset: new Date().toDateString() },
    'fvg-ifvg': { trades: 0, wins: 0, losses: 0, totalPnl: 0, todayPnl: 0, lastReset: new Date().toDateString() }
  },
  lastUpdated: new Date().toISOString()
};

// Account data from Apex (updated via API or scraper)
// Trailing drawdown: threshold = peakBalance - $5,000 (never stops on Tradovate)
let accounts = {
  'ote-silver-bullet': {
    accountId: 'APEX2519120000014',
    name: 'OTE Silver Bullet',
    product: '150k Tradovate',
    pnl: 1296.32,
    balance: 151296.32,
    peakBalance: 151296.32,        // Highest balance ever reached
    trailingThreshold: 146296.32,  // peakBalance - 5000
    target: 159000,
    profitNeeded: 9000,
    progress: 14.4,
    drawdown: 0,                   // peakBalance - balance (how much used)
    drawdownMax: 5000,
    days: 34,
    status: 'Active',
    lastUpdated: new Date().toISOString()
  },
  'fvg-ifvg': {
    accountId: 'APEX2519120000018',
    name: 'FVG+IFVG',
    product: '150k Tradovate',
    pnl: 1133.32,
    balance: 151133.32,
    peakBalance: 151133.32,
    trailingThreshold: 146133.32,
    target: 159000,
    profitNeeded: 9000,
    progress: 12.6,
    drawdown: 0,
    drawdownMax: 5000,
    days: 17,
    status: 'Active',
    lastUpdated: new Date().toISOString()
  }
};

// Reset daily stats at midnight
function checkDailyReset() {
  const today = new Date().toDateString();
  for (const bot of Object.keys(stats.bots)) {
    if (stats.bots[bot].lastReset !== today) {
      stats.bots[bot].todayPnl = 0;
      stats.bots[bot].lastReset = today;
    }
  }
}

// Update stats from trade
function updateStats(trade) {
  checkDailyReset();
  
  const botKey = trade.bot || trade.source || 'unknown';
  if (!stats.bots[botKey]) {
    stats.bots[botKey] = { trades: 0, wins: 0, losses: 0, totalPnl: 0, todayPnl: 0, lastReset: new Date().toDateString() };
  }
  
  const bot = stats.bots[botKey];
  
  // Count exits as completed trades
  if (['tp1', 'tp2', 'tp3', 'runner_cbdr', 'sl', 'bias_flip', 'eod', 'exit'].includes(trade.action)) {
    bot.trades++;
    const pnl = parseFloat(trade.pnl) || 0;
    bot.totalPnl += pnl;
    bot.todayPnl += pnl;
    if (pnl > 0) bot.wins++;
    else if (pnl < 0) bot.losses++;
  }
  
  stats.lastUpdated = new Date().toISOString();
}

// CORS headers
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// JSON response helper
function jsonResponse(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// HTTP Server
const server = http.createServer((req, res) => {
  setCors(res);
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  // ============ API ENDPOINTS ============

  // Health check
  if (req.method === 'GET' && pathname === '/health') {
    return jsonResponse(res, 200, { status: 'ok', timestamp: new Date().toISOString(), trades: trades.length });
  }

  // GET /api/stats
  if (req.method === 'GET' && pathname === '/api/stats') {
    checkDailyReset();
    let totalTrades = 0, totalWins = 0, totalPnl = 0, todayPnl = 0;
    for (const bot of Object.values(stats.bots)) {
      totalTrades += bot.trades;
      totalWins += bot.wins;
      totalPnl += bot.totalPnl;
      todayPnl += bot.todayPnl;
    }
    const winRate = totalTrades > 0 ? ((totalWins / totalTrades) * 100).toFixed(1) : 0;
    
    return jsonResponse(res, 200, {
      totalTrades,
      totalWins,
      winRate: parseFloat(winRate),
      totalPnl: parseFloat(totalPnl.toFixed(2)),
      todayPnl: parseFloat(todayPnl.toFixed(2)),
      activeBots: Object.keys(stats.bots).length,
      lastUpdated: stats.lastUpdated
    });
  }

  // GET /api/bots
  if (req.method === 'GET' && pathname === '/api/bots') {
    checkDailyReset();
    const bots = {};
    for (const [name, data] of Object.entries(stats.bots)) {
      const winRate = data.trades > 0 ? ((data.wins / data.trades) * 100).toFixed(1) : 0;
      bots[name] = {
        name,
        trades: data.trades,
        wins: data.wins,
        losses: data.losses,
        winRate: parseFloat(winRate),
        totalPnl: parseFloat(data.totalPnl.toFixed(2)),
        todayPnl: parseFloat(data.todayPnl.toFixed(2)),
        status: 'active'
      };
    }
    return jsonResponse(res, 200, bots);
  }

  // GET /api/trades
  if (req.method === 'GET' && pathname === '/api/trades') {
    let filtered = [...trades].reverse();
    if (query.bot) filtered = filtered.filter(t => t.bot === query.bot || t.source === query.bot);
    if (query.action) filtered = filtered.filter(t => t.action === query.action);
    const limit = parseInt(query.limit) || 50;
    return jsonResponse(res, 200, filtered.slice(0, limit));
  }

  // GET /api/live
  if (req.method === 'GET' && pathname === '/api/live') {
    checkDailyReset();
    let totalPnl = 0, todayPnl = 0;
    for (const bot of Object.values(stats.bots)) {
      totalPnl += bot.totalPnl;
      todayPnl += bot.todayPnl;
    }
    const recentTrades = trades.slice(-5).reverse().map(t => ({
      bot: t.bot || t.source,
      action: t.action,
      side: t.side,
      pnl: t.pnl,
      time: t.time || t.receivedAt
    }));
    return jsonResponse(res, 200, { totalPnl, todayPnl, recentTrades, lastUpdated: stats.lastUpdated });
  }

  // GET /api/accounts - Get all account data
  if (req.method === 'GET' && pathname === '/api/accounts') {
    // Calculate progress for each account
    const accountsWithProgress = {};
    for (const [key, acc] of Object.entries(accounts)) {
      const profitNeeded = acc.target - 150000; // Starting balance is 150k
      const progress = profitNeeded > 0 ? ((acc.pnl / profitNeeded) * 100).toFixed(1) : 0;
      accountsWithProgress[key] = {
        ...acc,
        progress: parseFloat(progress),
        profitNeeded
      };
    }
    return jsonResponse(res, 200, accountsWithProgress);
  }

  // POST /api/accounts - Update account data (from scraper)
  // Automatically calculates trailing drawdown based on peak balance
  if (req.method === 'POST' && pathname === '/api/accounts') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const updates = JSON.parse(body);
        
        for (const [key, data] of Object.entries(updates)) {
          if (accounts[key]) {
            // Merge new data
            accounts[key] = { ...accounts[key], ...data, lastUpdated: new Date().toISOString() };
          } else {
            accounts[key] = { ...data, lastUpdated: new Date().toISOString() };
          }
          
          const acc = accounts[key];
          const maxDD = acc.drawdownMax || 5000;
          
          // Update peak balance if current balance is higher
          if (acc.balance && (!acc.peakBalance || acc.balance > acc.peakBalance)) {
            acc.peakBalance = acc.balance;
          }
          
          // Calculate trailing threshold and drawdown used
          if (acc.peakBalance) {
            acc.trailingThreshold = acc.peakBalance - maxDD;
            acc.drawdown = Math.max(0, acc.peakBalance - acc.balance);
            acc.drawdownRemaining = acc.balance - acc.trailingThreshold;
          }
          
          // Calculate progress toward profit target
          if (acc.profitNeeded && acc.pnl !== undefined) {
            acc.progress = parseFloat(((acc.pnl / acc.profitNeeded) * 100).toFixed(1));
          }
        }
        
        console.log(`📊 Accounts updated: ${Object.keys(updates).join(', ')}`);
        return jsonResponse(res, 200, { success: true, updated: Object.keys(updates) });
      } catch (err) {
        return jsonResponse(res, 400, { success: false, error: err.message });
      }
    });
    return;
  }

  // GET /api/dashboard - Full dashboard data (accounts + stats + recent trades)
  if (req.method === 'GET' && pathname === '/api/dashboard') {
    checkDailyReset();
    
    // Calculate totals from accounts
    let totalBalance = 0, totalPnl = 0;
    for (const acc of Object.values(accounts)) {
      totalBalance += acc.balance || 0;
      totalPnl += acc.pnl || 0;
    }
    
    const recentTrades = trades.slice(-10).reverse().map(t => ({
      bot: t.bot || t.source,
      action: t.action,
      side: t.side || t.direction,
      symbol: t.symbol,
      price: t.price || t.entryPrice,
      time: t.time || t.receivedAt
    }));
    
    return jsonResponse(res, 200, {
      accounts,
      totals: {
        balance: totalBalance,
        pnl: totalPnl,
        activeAccounts: Object.keys(accounts).length
      },
      recentTrades,
      lastUpdated: new Date().toISOString()
    });
  }

  // ============ HOME PAGE ============
  if (req.method === 'GET' && pathname === '/') {
    let totalPnl = 0, totalTrades = 0;
    for (const bot of Object.values(stats.bots)) {
      totalPnl += bot.totalPnl;
      totalTrades += bot.trades;
    }
    
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
<!DOCTYPE html>
<html>
<head>
  <title>Decrypt Labs API</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: monospace; background: #0a0a0a; color: #0f0; padding: 40px; }
    h1 { margin-bottom: 20px; }
    .stat { background: rgba(0,255,0,0.1); padding: 15px 20px; border-radius: 8px; margin: 10px 10px 10px 0; display: inline-block; }
    .stat-label { font-size: 12px; color: #0a0; }
    .stat-value { font-size: 24px; font-weight: bold; }
    .endpoint { background: rgba(255,255,255,0.05); padding: 10px 15px; margin: 5px 0; border-radius: 4px; }
    .method { color: #0ff; margin-right: 10px; }
    a { color: #0f0; }
  </style>
</head>
<body>
  <h1>🤖 Decrypt Labs API (Railway)</h1>
  
  <div class="stat"><div class="stat-label">STATUS</div><div class="stat-value">● ONLINE</div></div>
  <div class="stat"><div class="stat-label">TOTAL P&L</div><div class="stat-value">$${totalPnl.toFixed(2)}</div></div>
  <div class="stat"><div class="stat-label">TRADES</div><div class="stat-value">${totalTrades}</div></div>
  <div class="stat"><div class="stat-label">SIGNALS RECEIVED</div><div class="stat-value">${trades.length}</div></div>
  
  <h2 style="margin: 30px 0 10px;">📡 API Endpoints</h2>
  <div class="endpoint"><span class="method">GET</span><a href="/api/stats">/api/stats</a> — Overall statistics</div>
  <div class="endpoint"><span class="method">GET</span><a href="/api/bots">/api/bots</a> — Bot stats</div>
  <div class="endpoint"><span class="method">GET</span><a href="/api/trades">/api/trades</a> — Trade history</div>
  <div class="endpoint"><span class="method">GET</span><a href="/api/live">/api/live</a> — Live widget data</div>
  
  <h2 style="margin: 30px 0 10px;">📥 Webhooks</h2>
  <div class="endpoint"><span class="method">POST</span>/webhook/ote-silver-bullet</div>
  <div class="endpoint"><span class="method">POST</span>/webhook/ote-refined</div>
  <div class="endpoint"><span class="method">POST</span>/webhook/ote-refined-small</div>
  <div class="endpoint"><span class="method">POST</span>/webhook/fvg-ifvg</div>
  
  <p style="margin-top: 40px; color: #333;">Server started: ${new Date().toISOString()}</p>
</body>
</html>
    `);
    return;
  }

  // ============ WEBHOOK ENDPOINTS ============
  if (req.method === 'POST' && pathname.startsWith('/webhook')) {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const trade = JSON.parse(body);
        trade.receivedAt = new Date().toISOString();
        trade.source = pathname.replace('/webhook/', '') || 'unknown';
        
        // Normalize direction: buy/sell → long/short
        if (trade.direction === 'buy') trade.direction = 'long';
        if (trade.direction === 'sell') trade.direction = 'short';
        if (trade.side === 'buy') trade.side = 'long';
        if (trade.side === 'sell') trade.side = 'short';
        
        console.log(`📊 [${trade.source}] ${trade.action || 'signal'} received`);
        
        trades.push(trade);
        if (trades.length > 1000) trades = trades.slice(-500); // Keep last 500
        
        updateStats(trade);
        
        return jsonResponse(res, 200, { success: true, tracked: true });
      } catch (err) {
        console.error('❌ Webhook error:', err.message);
        return jsonResponse(res, 400, { success: false, error: err.message });
      }
    });
    return;
  }

  // 404
  jsonResponse(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════╗
║  🤖 Decrypt Labs API - Railway Edition             ║
║  Port: ${PORT}                                         ║
║  Status: ONLINE                                    ║
╚════════════════════════════════════════════════════╝
  `);
});
