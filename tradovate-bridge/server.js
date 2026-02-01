/**
 * Tradovate Bridge Server
 * 
 * Direct TradingView → Tradovate order execution
 * No TradersPost required!
 * 
 * Usage:
 *   1. Copy config.js to config.local.js and fill in credentials
 *   2. Run: node server.js
 *   3. Set TradingView webhook to: http://YOUR_URL/webhook/{bot-name}
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Load config (prefer local config if exists)
let config;
try {
  config = require('./config.local.js');
  console.log('[Server] Using config.local.js');
} catch (e) {
  config = require('./config.js');
  console.log('[Server] Using config.js (default)');
}

const TradovateClient = require('./tradovate-client');
const OrderRouter = require('./order-router');

// Initialize clients
const tradovate = new TradovateClient(config);
const router = new OrderRouter(tradovate, config);

// Logging
const LOG_FILE = path.join(__dirname, 'logs', 'orders.jsonl');
fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });

function logOrder(data) {
  const entry = {
    ...data,
    timestamp: new Date().toISOString()
  };
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
}

// =========================================================================
// HTTP SERVER
// =========================================================================

const server = http.createServer(async (req, res) => {
  // CORS
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
  
  // =========================================================================
  // STATUS ENDPOINTS
  // =========================================================================
  
  // Health check
  if (req.method === 'GET' && pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      authenticated: tradovate.isTokenValid(),
      accounts: tradovate.accounts.length,
      dailyTrades: router.dailyStats.trades,
      dailyPnl: router.dailyStats.pnl,
      timestamp: new Date().toISOString()
    }));
    return;
  }
  
  // Status page
  if (req.method === 'GET' && pathname === '/') {
    const authenticated = tradovate.isTokenValid();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
<!DOCTYPE html>
<html>
<head>
  <title>Tradovate Bridge</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Monaco', monospace;
      background: linear-gradient(135deg, #1a1a2e 0%, #0a0a15 100%);
      color: #0f0;
      padding: 40px;
      min-height: 100vh;
    }
    h1 { margin-bottom: 20px; color: #0ff; }
    .status { 
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 14px;
      margin-bottom: 20px;
    }
    .online { background: rgba(0,255,0,0.2); color: #0f0; }
    .offline { background: rgba(255,0,0,0.2); color: #f00; }
    .stat {
      background: rgba(0,255,255,0.1);
      padding: 15px 20px;
      border-radius: 8px;
      margin: 10px 0;
      display: inline-block;
      margin-right: 15px;
    }
    .stat-label { font-size: 12px; color: #0aa; }
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
    .accounts { margin-top: 20px; }
    .account {
      background: rgba(255,255,255,0.05);
      padding: 10px 15px;
      margin: 5px 0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <h1>🌉 Tradovate Bridge</h1>
  
  <div class="status ${authenticated ? 'online' : 'offline'}">
    ${authenticated ? '● AUTHENTICATED' : '○ NOT AUTHENTICATED'}
  </div>
  
  <div>
    <div class="stat">
      <div class="stat-label">ENVIRONMENT</div>
      <div class="stat-value">${config.tradovate.env.toUpperCase()}</div>
    </div>
    <div class="stat">
      <div class="stat-label">DAILY TRADES</div>
      <div class="stat-value">${router.dailyStats.trades}</div>
    </div>
    <div class="stat">
      <div class="stat-label">DAILY P&L</div>
      <div class="stat-value">$${router.dailyStats.pnl.toFixed(2)}</div>
    </div>
  </div>
  
  <div class="accounts">
    <h3 style="color: #0aa; margin-bottom: 10px;">📊 Connected Accounts</h3>
    ${tradovate.accounts.length > 0 
      ? tradovate.accounts.map(acc => `
          <div class="account">
            <strong>${acc.name}</strong> (ID: ${acc.id})
          </div>
        `).join('')
      : '<div class="account" style="color: #666;">No accounts loaded. Authenticate first.</div>'
    }
  </div>
  
  <div class="endpoints">
    <h3 style="color: #0aa; margin-bottom: 10px;">📥 Webhook Endpoints</h3>
    ${Object.keys(config.accounts).map(bot => `
      <div class="endpoint">
        <span class="method">POST</span>
        /webhook/${bot}
      </div>
    `).join('')}
  </div>
  
  <div class="endpoints">
    <h3 style="color: #0aa; margin-bottom: 10px;">🔧 Control</h3>
    <div class="endpoint">
      <span class="method">POST</span>
      /auth — Authenticate with Tradovate
    </div>
    <div class="endpoint">
      <span class="method">GET</span>
      /positions — Get all positions
    </div>
    <div class="endpoint">
      <span class="method">GET</span>
      /health — Health check
    </div>
  </div>
  
  <p style="margin-top: 40px; color: #333;">Last updated: ${new Date().toISOString()}</p>
</body>
</html>
    `);
    return;
  }
  
  // Authenticate endpoint
  if (req.method === 'POST' && pathname === '/auth') {
    try {
      const success = await tradovate.authenticate();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success,
        accounts: tradovate.accounts.map(a => ({ id: a.id, name: a.name }))
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }
  
  // Get positions
  if (req.method === 'GET' && pathname === '/positions') {
    try {
      const positions = [];
      for (const acc of tradovate.accounts) {
        const pos = await tradovate.getPositions(acc.id);
        positions.push({ account: acc.name, positions: pos });
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(positions, null, 2));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }
  
  // =========================================================================
  // WEBHOOK ENDPOINTS
  // =========================================================================
  
  if (req.method === 'POST' && pathname.startsWith('/webhook/')) {
    const botName = pathname.replace('/webhook/', '');
    
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    
    req.on('end', async () => {
      try {
        const alert = JSON.parse(body);
        
        console.log(`\n${'═'.repeat(60)}`);
        console.log(`📥 WEBHOOK: ${botName}`);
        console.log(`${'═'.repeat(60)}`);
        console.log(JSON.stringify(alert, null, 2));
        
        // Log the incoming alert
        logOrder({ type: 'webhook', bot: botName, alert });
        
        // Route to Tradovate
        const result = await router.processAlert(alert, botName);
        
        // Log the result
        logOrder({ type: 'result', bot: botName, result });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        
      } catch (err) {
        console.error('[Webhook] Error:', err.message);
        
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: err.message 
        }));
      }
    });
    return;
  }
  
  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// =========================================================================
// STARTUP
// =========================================================================

async function start() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🌉 Tradovate Bridge                                         ║
║  Direct TradingView → Tradovate Execution                    ║
╠══════════════════════════════════════════════════════════════╣
║  Port: ${config.port}                                              ║
║  Environment: ${config.tradovate.env.toUpperCase().padEnd(43)}║
╚══════════════════════════════════════════════════════════════╝
  `);
  
  // Try to authenticate on startup
  if (config.tradovate.credentials.username) {
    console.log('[Server] Attempting auto-authentication...');
    try {
      await tradovate.authenticate();
    } catch (err) {
      console.log('[Server] Auto-auth failed:', err.message);
      console.log('[Server] POST /auth to authenticate manually');
    }
  } else {
    console.log('[Server] No credentials configured - POST /auth after configuring');
  }
  
  server.listen(config.port, () => {
    console.log(`\n[Server] ✅ Listening on port ${config.port}`);
    console.log(`[Server] Dashboard: http://localhost:${config.port}`);
    console.log(`[Server] Health: http://localhost:${config.port}/health`);
    console.log(`\n[Server] Webhook endpoints:`);
    Object.keys(config.accounts).forEach(bot => {
      console.log(`  • POST /webhook/${bot}`);
    });
  });
}

start().catch(err => {
  console.error('[Server] Fatal error:', err);
  process.exit(1);
});
