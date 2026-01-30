/**
 * Decrypt Labs - Webhook Server + API
 * 
 * Receives trade alerts from TradingView strategies
 * and serves data to decryptlabs.io website.
 * 
 * Usage:
 *   node server.js
 *   ngrok http 3456
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3456;
const TRADES_LOG = path.join(__dirname, 'trades.jsonl');
const DATA_FILE = path.join(__dirname, '../dashboard/data.json');
const STATS_FILE = path.join(__dirname, 'stats.json');

// Initialize files
if (!fs.existsSync(TRADES_LOG)) {
  fs.writeFileSync(TRADES_LOG, '');
}

if (!fs.existsSync(STATS_FILE)) {
  fs.writeFileSync(STATS_FILE, JSON.stringify({
    bots: {
      'ote-silver-bullet': { trades: 0, wins: 0, losses: 0, totalPnl: 0, todayPnl: 0, lastReset: new Date().toDateString() },
      'ote-refined': { trades: 0, wins: 0, losses: 0, totalPnl: 0, todayPnl: 0, lastReset: new Date().toDateString() },
      'ote-refined-small': { trades: 0, wins: 0, losses: 0, totalPnl: 0, todayPnl: 0, lastReset: new Date().toDateString() },
      'fvg-ifvg': { trades: 0, wins: 0, losses: 0, totalPnl: 0, todayPnl: 0, lastReset: new Date().toDateString() }
    },
    lastUpdated: new Date().toISOString()
  }, null, 2));
}

// =============================================================================
// STATS MANAGEMENT
// =============================================================================

function getStats() {
  try {
    const stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
    
    // Reset daily stats if new day
    const today = new Date().toDateString();
    for (const bot of Object.keys(stats.bots)) {
      if (stats.bots[bot].lastReset !== today) {
        stats.bots[bot].todayPnl = 0;
        stats.bots[bot].lastReset = today;
      }
    }
    
    return stats;
  } catch (err) {
    return { bots: {}, lastUpdated: null };
  }
}

function updateStats(trade) {
  const stats = getStats();
  
  const botKey = trade.bot || trade.source || 'unknown';
  if (!stats.bots[botKey]) {
    stats.bots[botKey] = { trades: 0, wins: 0, losses: 0, totalPnl: 0, todayPnl: 0, lastReset: new Date().toDateString() };
  }
  
  const bot = stats.bots[botKey];
  
  // Only count exits as trades
  if (['tp1', 'tp2', 'tp3', 'runner_cbdr', 'sl', 'bias_flip', 'eod', 'exit'].includes(trade.action)) {
    bot.trades++;
    
    const pnl = parseFloat(trade.pnl) || 0;
    bot.totalPnl += pnl;
    bot.todayPnl += pnl;
    
    if (pnl > 0) bot.wins++;
    else if (pnl < 0) bot.losses++;
  }
  
  stats.lastUpdated = new Date().toISOString();
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
  
  return stats;
}

// =============================================================================
// HTTP SERVER
// =============================================================================

const server = http.createServer((req, res) => {
  // CORS headers for decryptlabs.io
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  // ==========================================================================
  // API ENDPOINTS (for decryptlabs.io)
  // ==========================================================================

  // GET /api/stats - Overall statistics
  if (req.method === 'GET' && pathname === '/api/stats') {
    const stats = getStats();
    
    // Calculate totals
    let totalTrades = 0, totalWins = 0, totalPnl = 0, todayPnl = 0;
    for (const bot of Object.values(stats.bots)) {
      totalTrades += bot.trades;
      totalWins += bot.wins;
      totalPnl += bot.totalPnl;
      todayPnl += bot.todayPnl;
    }
    
    const winRate = totalTrades > 0 ? ((totalWins / totalTrades) * 100).toFixed(1) : 0;
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      totalTrades,
      totalWins,
      winRate: parseFloat(winRate),
      totalPnl: parseFloat(totalPnl.toFixed(2)),
      todayPnl: parseFloat(todayPnl.toFixed(2)),
      activeBots: Object.keys(stats.bots).length,
      lastUpdated: stats.lastUpdated,
      bots: stats.bots
    }));
    return;
  }

  // GET /api/bots - Individual bot stats
  if (req.method === 'GET' && pathname === '/api/bots') {
    const stats = getStats();
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
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(bots));
    return;
  }

  // GET /api/trades - Trade history with optional filters
  if (req.method === 'GET' && pathname === '/api/trades') {
    try {
      let trades = fs.readFileSync(TRADES_LOG, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map(line => JSON.parse(line))
        .reverse();
      
      // Filter by bot
      if (query.bot) {
        trades = trades.filter(t => t.bot === query.bot || t.source === query.bot);
      }
      
      // Filter by action
      if (query.action) {
        trades = trades.filter(t => t.action === query.action);
      }
      
      // Filter by side
      if (query.side) {
        trades = trades.filter(t => t.side === query.side);
      }
      
      // Limit results
      const limit = parseInt(query.limit) || 50;
      trades = trades.slice(0, limit);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(trades));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /api/live - Real-time summary for widgets
  if (req.method === 'GET' && pathname === '/api/live') {
    const stats = getStats();
    
    // Get last 5 trades
    let recentTrades = [];
    try {
      recentTrades = fs.readFileSync(TRADES_LOG, 'utf8')
        .split('\n')
        .filter(Boolean)
        .slice(-5)
        .map(line => JSON.parse(line))
        .reverse();
    } catch (e) {}
    
    // Calculate totals
    let totalPnl = 0, todayPnl = 0;
    for (const bot of Object.values(stats.bots)) {
      totalPnl += bot.totalPnl;
      todayPnl += bot.todayPnl;
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      totalPnl: parseFloat(totalPnl.toFixed(2)),
      todayPnl: parseFloat(todayPnl.toFixed(2)),
      recentTrades: recentTrades.map(t => ({
        bot: t.bot || t.source,
        action: t.action,
        side: t.side,
        pnl: t.pnl,
        time: t.time || t.receivedAt
      })),
      lastUpdated: stats.lastUpdated
    }));
    return;
  }

  // ==========================================================================
  // EMBEDDABLE WIDGET
  // ==========================================================================

  // GET /widget.js - Embeddable JavaScript widget
  if (req.method === 'GET' && pathname === '/widget.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.end(`
(function() {
  const API_URL = window.DECRYPT_LABS_API || '${req.headers.host ? 'https://' + req.headers.host : 'http://localhost:3456'}';
  
  // Styles
  const styles = \`
    .dl-widget {
      font-family: 'Inter', -apple-system, sans-serif;
      background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
      border: 1px solid #333;
      border-radius: 12px;
      padding: 20px;
      color: #fff;
      min-width: 300px;
    }
    .dl-widget-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #333;
    }
    .dl-widget-logo {
      font-size: 24px;
    }
    .dl-widget-title {
      font-size: 14px;
      font-weight: 600;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .dl-widget-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    .dl-widget-stat {
      background: rgba(255,255,255,0.05);
      padding: 12px;
      border-radius: 8px;
    }
    .dl-widget-stat-label {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .dl-widget-stat-value {
      font-size: 20px;
      font-weight: 700;
    }
    .dl-widget-stat-value.positive { color: #00ff88; }
    .dl-widget-stat-value.negative { color: #ff4444; }
    .dl-widget-trades {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #333;
    }
    .dl-widget-trade {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 13px;
      border-bottom: 1px solid #222;
    }
    .dl-widget-trade:last-child { border-bottom: none; }
    .dl-widget-trade-bot { color: #888; }
    .dl-widget-trade-pnl.positive { color: #00ff88; }
    .dl-widget-trade-pnl.negative { color: #ff4444; }
    .dl-widget-footer {
      margin-top: 15px;
      text-align: center;
      font-size: 10px;
      color: #444;
    }
    .dl-widget-live {
      display: inline-block;
      width: 8px;
      height: 8px;
      background: #00ff88;
      border-radius: 50%;
      margin-right: 5px;
      animation: dl-pulse 2s infinite;
    }
    @keyframes dl-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  \`;

  // Inject styles
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);

  // Format currency
  function formatPnl(value) {
    const num = parseFloat(value) || 0;
    const sign = num >= 0 ? '+' : '';
    return sign + '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Render widget
  function render(container, data) {
    const pnlClass = data.totalPnl >= 0 ? 'positive' : 'negative';
    const todayClass = data.todayPnl >= 0 ? 'positive' : 'negative';
    
    let tradesHtml = '';
    if (data.recentTrades && data.recentTrades.length > 0) {
      tradesHtml = '<div class="dl-widget-trades">' +
        data.recentTrades.slice(0, 5).map(t => {
          const tClass = (t.pnl || 0) >= 0 ? 'positive' : 'negative';
          return '<div class="dl-widget-trade">' +
            '<span class="dl-widget-trade-bot">' + (t.bot || 'Bot') + ' • ' + (t.action || '').toUpperCase() + '</span>' +
            '<span class="dl-widget-trade-pnl ' + tClass + '">' + formatPnl(t.pnl) + '</span>' +
          '</div>';
        }).join('') +
      '</div>';
    }
    
    container.innerHTML = \`
      <div class="dl-widget">
        <div class="dl-widget-header">
          <span class="dl-widget-logo">🤖</span>
          <span class="dl-widget-title">Decrypt Labs Live</span>
        </div>
        <div class="dl-widget-stats">
          <div class="dl-widget-stat">
            <div class="dl-widget-stat-label">Total P&L</div>
            <div class="dl-widget-stat-value \${pnlClass}">\${formatPnl(data.totalPnl)}</div>
          </div>
          <div class="dl-widget-stat">
            <div class="dl-widget-stat-label">Today</div>
            <div class="dl-widget-stat-value \${todayClass}">\${formatPnl(data.todayPnl)}</div>
          </div>
        </div>
        \${tradesHtml}
        <div class="dl-widget-footer">
          <span class="dl-widget-live"></span> Live from TradingView
        </div>
      </div>
    \`;
  }

  // Fetch and update
  async function update(container) {
    try {
      const res = await fetch(API_URL + '/api/live');
      const data = await res.json();
      render(container, data);
    } catch (err) {
      container.innerHTML = '<div class="dl-widget"><p style="color:#ff4444;">Unable to load data</p></div>';
    }
  }

  // Initialize all widgets
  document.querySelectorAll('[data-decrypt-labs-widget]').forEach(container => {
    update(container);
    // Auto-refresh every 30 seconds
    setInterval(() => update(container), 30000);
  });
})();
    `);
    return;
  }

  // GET /embed - Full embed page
  if (req.method === 'GET' && pathname === '/embed') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Decrypt Labs - Live Performance</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Inter', -apple-system, sans-serif;
      background: transparent;
    }
  </style>
</head>
<body>
  <div data-decrypt-labs-widget></div>
  <script>window.DECRYPT_LABS_API = '${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host || 'localhost:3456'}';</script>
  <script src="/widget.js"></script>
</body>
</html>
    `);
    return;
  }

  // ==========================================================================
  // EXISTING ENDPOINTS
  // ==========================================================================

  // Health check
  if (req.method === 'GET' && pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  // Status page
  if (req.method === 'GET' && pathname === '/') {
    const stats = getStats();
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
    body { 
      font-family: 'Monaco', monospace;
      background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
      color: #0f0;
      padding: 40px;
      min-height: 100vh;
    }
    h1 { margin-bottom: 20px; }
    .stat { 
      background: rgba(0,255,0,0.1);
      padding: 15px 20px;
      border-radius: 8px;
      margin: 10px 0;
      display: inline-block;
      margin-right: 15px;
    }
    .stat-label { font-size: 12px; color: #0a0; }
    .stat-value { font-size: 24px; font-weight: bold; }
    .endpoints { margin-top: 30px; }
    .endpoint {
      background: rgba(255,255,255,0.05);
      padding: 10px 15px;
      margin: 5px 0;
      border-radius: 4px;
      font-size: 14px;
    }
    .method { color: #0ff; margin-right: 10px; }
    .path { color: #fff; }
    .desc { color: #666; margin-left: 20px; }
    a { color: #0f0; }
  </style>
</head>
<body>
  <h1>🤖 Decrypt Labs API</h1>
  
  <div class="stat">
    <div class="stat-label">STATUS</div>
    <div class="stat-value">● ONLINE</div>
  </div>
  <div class="stat">
    <div class="stat-label">TOTAL P&L</div>
    <div class="stat-value">$${totalPnl.toFixed(2)}</div>
  </div>
  <div class="stat">
    <div class="stat-label">TRADES</div>
    <div class="stat-value">${totalTrades}</div>
  </div>
  
  <div class="endpoints">
    <h2 style="margin: 20px 0 10px;">📡 API Endpoints</h2>
    
    <div class="endpoint">
      <span class="method">GET</span>
      <span class="path"><a href="/api/stats">/api/stats</a></span>
      <span class="desc">— Overall statistics</span>
    </div>
    <div class="endpoint">
      <span class="method">GET</span>
      <span class="path"><a href="/api/bots">/api/bots</a></span>
      <span class="desc">— Individual bot stats</span>
    </div>
    <div class="endpoint">
      <span class="method">GET</span>
      <span class="path"><a href="/api/trades">/api/trades</a></span>
      <span class="desc">— Trade history (?bot=&limit=&action=)</span>
    </div>
    <div class="endpoint">
      <span class="method">GET</span>
      <span class="path"><a href="/api/live">/api/live</a></span>
      <span class="desc">— Real-time summary for widgets</span>
    </div>
    
    <h2 style="margin: 30px 0 10px;">🎨 Embed</h2>
    
    <div class="endpoint">
      <span class="method">GET</span>
      <span class="path"><a href="/embed">/embed</a></span>
      <span class="desc">— Embeddable widget page (iframe)</span>
    </div>
    <div class="endpoint">
      <span class="method">GET</span>
      <span class="path"><a href="/widget.js">/widget.js</a></span>
      <span class="desc">— JavaScript widget script</span>
    </div>
    
    <h2 style="margin: 30px 0 10px;">📥 Webhooks</h2>
    
    <div class="endpoint">
      <span class="method">POST</span>
      <span class="path">/webhook/ote-silver-bullet</span>
    </div>
    <div class="endpoint">
      <span class="method">POST</span>
      <span class="path">/webhook/ote-refined</span>
      <span class="desc">— Large Account</span>
    </div>
    <div class="endpoint">
      <span class="method">POST</span>
      <span class="path">/webhook/ote-refined-small</span>
      <span class="desc">— Small Account</span>
    </div>
    <div class="endpoint">
      <span class="method">POST</span>
      <span class="path">/webhook/fvg-ifvg</span>
    </div>
  </div>
  
  <p style="margin-top: 40px; color: #333;">Last updated: ${new Date().toISOString()}</p>
</body>
</html>
    `);
    return;
  }

  // Recent trades (legacy endpoint)
  if (req.method === 'GET' && pathname === '/trades') {
    try {
      const trades = fs.readFileSync(TRADES_LOG, 'utf8')
        .split('\n')
        .filter(Boolean)
        .slice(-50)
        .map(line => JSON.parse(line))
        .reverse();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(trades, null, 2));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ==========================================================================
  // WEBHOOK ENDPOINTS
  // ==========================================================================

  if (req.method === 'POST' && pathname.startsWith('/webhook')) {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const trade = JSON.parse(body);
        
        // Add server timestamp and source
        trade.receivedAt = new Date().toISOString();
        trade.source = pathname.replace('/webhook/', '') || 'unknown';
        
        // Log the trade
        console.log(`📊 Trade received:`, JSON.stringify(trade));
        
        // Append to trades log
        fs.appendFileSync(TRADES_LOG, JSON.stringify(trade) + '\n');
        
        // Update stats
        updateStats(trade);
        
        // Update dashboard data (if exists)
        updateDashboard(trade);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          message: 'Trade logged',
          trade: trade 
        }));
        
      } catch (err) {
        console.error('❌ Error processing webhook:', err.message);
        console.error('Raw body:', body);
        
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: err.message,
          hint: 'Ensure JSON is valid'
        }));
      }
    });
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

function updateDashboard(trade) {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return;
    }

    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    
    const botKey = trade.bot === 'ote-silver-bullet' ? 'ote-silver-bullet' 
                 : trade.bot === 'fvg-ifvg' ? 'fvg-ifvg-1'
                 : trade.bot;
    
    if (!data.bots || !data.bots[botKey]) {
      return;
    }

    const bot = data.bots[botKey];
    
    if (['exit', 'tp1', 'tp2', 'tp3', 'sl', 'runner_cbdr', 'bias_flip', 'eod'].includes(trade.action)) {
      if (trade.pnl !== undefined) {
        bot.performance.netPnl = parseFloat(trade.totalPnl) || bot.performance.netPnl + parseFloat(trade.pnl);
        bot.performance.todayPnl = (bot.performance.todayPnl || 0) + parseFloat(trade.pnl);
        bot.currentBalance = bot.accountSize + bot.performance.netPnl;
        
        bot.eval.profitTarget = bot.performance.netPnl;
        bot.eval.profitTargetPercent = parseFloat(((bot.performance.netPnl / bot.eval.profitTargetGoal) * 100).toFixed(1));
      }
      
      bot.performance.totalTrades = (bot.performance.totalTrades || 0) + 1;
    }
    
    bot.lastTrade = {
      id: bot.performance.totalTrades,
      bot: botKey,
      timestamp: trade.time || trade.receivedAt,
      symbol: trade.symbol || 'MNQ',
      side: trade.side,
      entry: parseFloat(trade.entryPrice) || 0,
      exit: parseFloat(trade.price) || parseFloat(trade.exitPrice) || 0,
      size: parseInt(trade.size) || 1,
      pnl: parseFloat(trade.pnl) || 0,
      signal: trade.action
    };
    
    data.trades.unshift(bot.lastTrade);
    if (data.trades.length > 100) {
      data.trades = data.trades.slice(0, 100);
    }
    
    data.lastUpdated = new Date().toISOString();
    data.aum.total = Object.values(data.bots).reduce((sum, b) => sum + (b.currentBalance || 0), 0);
    
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log(`✅ Dashboard updated for ${botKey}`);
    
  } catch (err) {
    console.error('❌ Error updating dashboard:', err.message);
  }
}

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🤖 Decrypt Labs Webhook Server + API                        ║
╠══════════════════════════════════════════════════════════════╣
║  Status:    ONLINE                                           ║
║  Port:      ${PORT}                                             ║
╠══════════════════════════════════════════════════════════════╣
║  📡 API Endpoints:                                           ║
║    GET  /api/stats     — Overall statistics                  ║
║    GET  /api/bots      — Individual bot data                 ║
║    GET  /api/trades    — Trade history                       ║
║    GET  /api/live      — Real-time widget data               ║
╠══════════════════════════════════════════════════════════════╣
║  🎨 Embed:                                                   ║
║    GET  /embed         — Embeddable widget (iframe)          ║
║    GET  /widget.js     — JavaScript widget                   ║
╠══════════════════════════════════════════════════════════════╣
║  📥 Webhooks:                                                ║
║    POST /webhook/ote-silver-bullet                           ║
║    POST /webhook/ote-refined         (Large)                 ║
║    POST /webhook/ote-refined-small   (Small)                 ║
║    POST /webhook/fvg-ifvg                                    ║
╠══════════════════════════════════════════════════════════════╣
║  🌐 ngrok http ${PORT}  to expose publicly                      ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
