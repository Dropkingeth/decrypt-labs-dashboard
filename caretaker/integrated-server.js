/**
 * 🤖 Integrated Trading Server with Caretaker
 * 
 * Combines:
 * - Webhook receiver (for TradingView alerts)
 * - Trade Caretaker (monitoring & retry)
 * - Position verification (via Tradovate browser)
 * - Telegram alerts
 * 
 * Run: node integrated-server.js
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Load config
let config;
try {
  config = require('./config.local.js');
  console.log('[Server] Using config.local.js');
} catch (e) {
  config = require('./config.js');
  console.log('[Server] Using config.js (default)');
}

// Override auth with environment variables if set
if (process.env.CARETAKER_PASSWORD) {
  config.auth = config.auth || {};
  config.auth.enabled = true;
  config.auth.password = process.env.CARETAKER_PASSWORD;
  console.log('[Server] Auth password set from environment');
}

const TradeCaretaker = require('./caretaker.js');
const PositionChecker = require('./position-checker.js');

// Initialize
const caretaker = new TradeCaretaker(config);
const positionChecker = new PositionChecker();

// State
let lastPositionData = {
  'APEX2519120000014': { position: 0, equity: 0, openPL: 0, lastCheck: null },
  'APEX2519120000018': { position: 0, equity: 0, openPL: 0, lastCheck: null }
};

// Session storage (in-memory, resets on restart)
const sessions = new Map();

// Access Requests storage (persisted to file)
let accessRequests = [];
const ACCESS_REQUESTS_FILE = path.join(__dirname, 'access-requests.json');

function loadAccessRequests() {
  try {
    if (fs.existsSync(ACCESS_REQUESTS_FILE)) {
      accessRequests = JSON.parse(fs.readFileSync(ACCESS_REQUESTS_FILE, 'utf8'));
      console.log(`[Access] Loaded ${accessRequests.length} access requests`);
    }
  } catch (e) {
    console.log('[Access] No existing access requests file');
    accessRequests = [];
  }
}

function saveAccessRequests() {
  try {
    fs.writeFileSync(ACCESS_REQUESTS_FILE, JSON.stringify(accessRequests, null, 2));
  } catch (e) {
    console.log('[Access] Failed to save access requests:', e.message);
  }
}

// Load access requests on startup
loadAccessRequests();
console.log('[DEPLOY] 🚀 NEW CODE ACTIVE - Build Feb 1 2026 3:00pm');

// Auth helpers
function generateSessionId() {
  return 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      cookies[name] = value;
    });
  }
  return cookies;
}

function isAuthenticated(req) {
  if (!config.auth?.enabled) return true;
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies['caretaker_session'];
  return sessionId && sessions.has(sessionId);
}

function getLoginPage(error = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🔐 Bot Caretaker — Login</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'SF Mono', 'Monaco', monospace;
      background: #0a0a12;
      color: #fff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    body::before {
      content: '';
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: 
        radial-gradient(ellipse at 30% 20%, rgba(0,212,255,0.1) 0%, transparent 50%),
        radial-gradient(ellipse at 70% 80%, rgba(170,102,255,0.1) 0%, transparent 50%);
      pointer-events: none;
    }
    .login-box {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      padding: 40px;
      width: 100%;
      max-width: 400px;
      position: relative;
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo-icon { font-size: 48px; }
    .logo-text {
      font-size: 24px;
      font-weight: 700;
      background: linear-gradient(90deg, #00d4ff, #aa66ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-top: 10px;
    }
    .form-group { margin-bottom: 20px; }
    label {
      display: block;
      font-size: 12px;
      color: #88889a;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    input[type="password"] {
      width: 100%;
      padding: 14px 16px;
      background: rgba(0,0,0,0.4);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      color: #fff;
      font-size: 16px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s;
    }
    input[type="password"]:focus {
      border-color: #00d4ff;
    }
    button {
      width: 100%;
      padding: 14px;
      background: linear-gradient(90deg, #00d4ff, #aa66ff);
      border: none;
      border-radius: 8px;
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    button:hover { opacity: 0.9; }
    .error {
      background: rgba(255,68,85,0.1);
      border: 1px solid rgba(255,68,85,0.3);
      color: #ff4455;
      padding: 12px;
      border-radius: 8px;
      font-size: 13px;
      margin-bottom: 20px;
      text-align: center;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      font-size: 11px;
      color: #88889a;
    }
  </style>
</head>
<body>
  <div class="login-box">
    <div class="logo">
      <div class="logo-icon">🤖</div>
      <div class="logo-text">Bot Caretaker</div>
    </div>
    ${error ? '<div class="error">' + error + '</div>' : ''}
    <form method="POST" action="/login">
      <div class="form-group">
        <label>Password</label>
        <input type="password" name="password" placeholder="Enter access code" autofocus required>
      </div>
      <button type="submit">Access Dashboard</button>
    </form>
    <div class="footer">🔒 Internal monitoring tool</div>
  </div>
</body>
</html>`;
}

// Logging
const LOG_DIR = path.join(__dirname, 'logs');
fs.mkdirSync(LOG_DIR, { recursive: true });

function log(type, data) {
  const entry = { type, timestamp: new Date().toISOString(), ...data };
  fs.appendFileSync(path.join(LOG_DIR, 'caretaker.jsonl'), JSON.stringify(entry) + '\n');
  return entry;
}

// Format signal for dashboard display
function formatSignalTitle(entry) {
  if (entry.type === 'webhook') {
    const alert = entry.alert || {};
    const direction = alert.direction || alert.side || 'SIGNAL';
    return `${entry.bot || 'Bot'} — ${direction.toUpperCase()}`;
  }
  if (entry.type === 'alert') {
    return '🚨 Alert';
  }
  if (entry.type === 'discrepancy') {
    return `⚠️ Discrepancy — ${entry.bot || 'Unknown'}`;
  }
  return entry.type;
}

function formatSignalDetails(entry) {
  if (entry.type === 'webhook') {
    const alert = entry.alert || {};
    const parts = [];
    if (alert.direction) parts.push(alert.direction.toUpperCase());
    if (alert.size) parts.push(`${alert.size} contracts`);
    if (alert.price) parts.push(`@ ${alert.price}`);
    if (alert.symbol) parts.push(alert.symbol);
    return parts.join(' ') || JSON.stringify(alert).slice(0, 50);
  }
  if (entry.type === 'alert') {
    return entry.message || 'Alert triggered';
  }
  if (entry.type === 'discrepancy') {
    return `Expected: ${entry.expected}, Actual: ${entry.actual}`;
  }
  return '';
}

// ============================================================================
// TELEGRAM ALERTS
// ============================================================================

async function sendTelegramAlert(message) {
  // This will be called by Clawdbot via the message tool
  // For now, log it and the main process will pick it up
  console.log(`\n🚨 ALERT: ${message}\n`);
  log('alert', { message });
  
  // Write to alert file for external pickup
  fs.writeFileSync(
    path.join(LOG_DIR, 'pending-alert.txt'), 
    `${new Date().toISOString()}: ${message}\n`,
    { flag: 'a' }
  );
}

// ============================================================================
// POSITION UPDATE (Called by external process with browser data)
// ============================================================================

function updatePositionData(accountId, data) {
  lastPositionData[accountId] = {
    ...data,
    lastCheck: new Date().toISOString()
  };
  
  log('position_update', { account: accountId, ...data });
  
  // Check for discrepancies
  const discrepancies = caretaker.verifyPositions([{
    account: accountId,
    netPos: data.position,
    symbol: data.symbol || 'MNQ'
  }]);
  
  if (discrepancies.length > 0) {
    handleDiscrepancies(discrepancies);
  }
  
  return lastPositionData[accountId];
}

// ============================================================================
// DISCREPANCY HANDLING
// ============================================================================

async function handleDiscrepancies(discrepancies) {
  for (const d of discrepancies) {
    console.log(`\n⚠️ DISCREPANCY DETECTED:`);
    console.log(`   Bot: ${d.bot}`);
    console.log(`   Expected: ${d.expected}`);
    console.log(`   Actual: ${d.actual}`);
    console.log(`   Severity: ${d.severity}`);
    
    log('discrepancy', d);
    
    if (d.severity === 'critical') {
      // Wrong direction - alert immediately
      await sendTelegramAlert(`🚨 CRITICAL: ${d.bot} position mismatch! Expected ${d.expected}, got ${d.actual}`);
    } else if (d.severity === 'high' && d.type === 'missing_position') {
      // Order didn't fill - attempt retry
      console.log(`[Caretaker] Attempting retry for ${d.bot}...`);
      
      const pendingOrder = caretaker.pendingOrders.find(o => o.bot === d.bot);
      if (pendingOrder && pendingOrder.retries < pendingOrder.maxRetries) {
        const result = await caretaker.retryOrder(pendingOrder);
        
        if (result.success) {
          console.log(`[Caretaker] ✅ Retry sent (attempt ${result.attempt})`);
        } else {
          await sendTelegramAlert(`⚠️ ${d.bot}: Order retry failed - ${result.error}`);
        }
      } else {
        await sendTelegramAlert(`⚠️ ${d.bot}: Position missing, max retries reached`);
      }
    }
  }
}

// ============================================================================
// HTTP SERVER
// ============================================================================

const server = http.createServer(async (req, res) => {
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
  console.log(`[REQ] ${req.method} ${pathname}`);
  
  // -------------------------------------------------------------------------
  // LOGIN / LOGOUT
  // -------------------------------------------------------------------------
  
  if (pathname === '/login') {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(getLoginPage());
      return;
    }
    
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        const params = new URLSearchParams(body);
        const password = params.get('password');
        
        if (password === config.auth?.password) {
          const sessionId = generateSessionId();
          sessions.set(sessionId, { created: Date.now() });
          
          res.writeHead(302, {
            'Set-Cookie': `caretaker_session=${sessionId}; Path=/; HttpOnly; SameSite=Strict`,
            'Location': '/'
          });
          res.end();
          log('auth', { event: 'login_success' });
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(getLoginPage('Invalid password'));
          log('auth', { event: 'login_failed' });
        }
      });
      return;
    }
  }
  
  if (pathname === '/logout') {
    const cookies = parseCookies(req.headers.cookie);
    const sessionId = cookies['caretaker_session'];
    if (sessionId) sessions.delete(sessionId);
    
    res.writeHead(302, {
      'Set-Cookie': 'caretaker_session=; Path=/; HttpOnly; Max-Age=0',
      'Location': '/login'
    });
    res.end();
    return;
  }
  
  // -------------------------------------------------------------------------
  // AUTH CHECK (protect dashboard routes)
  // -------------------------------------------------------------------------
  
  const publicPaths = ['/health', '/webhook/', '/position', '/api/'];
  const isPublicPath = publicPaths.some(p => pathname.startsWith(p) || pathname === p.replace('/', ''));
  
  if (!isPublicPath && !isAuthenticated(req)) {
    res.writeHead(302, { 'Location': '/login' });
    res.end();
    return;
  }
  
  // -------------------------------------------------------------------------
  // STATUS / HEALTH
  // -------------------------------------------------------------------------
  
  if (req.method === 'GET' && pathname === '/health') {
    // Merge stored account data when session not active
    let positions = lastPositionData;
    try {
      const DASHBOARD_DATA_PATH = path.join(__dirname, './dashboard/data.json');
      const storedData = JSON.parse(fs.readFileSync(DASHBOARD_DATA_PATH, 'utf8'));
      
      // If session not active, use stored balances
      if (!caretaker.isSessionActive()) {
        const fvg = storedData.bots?.['fvg-ifvg-1'] || {};
        const ote = storedData.bots?.['ote-silver-bullet'] || {};
        
        positions = {
          'APEX2519120000014': {
            position: positions['APEX2519120000014']?.position || 0,
            equity: fvg.currentBalance || 0,
            openPL: 0,
            lastCheck: storedData.lastUpdated || null,
            pnl: fvg.performance?.netPnl || 0,
            progress: fvg.eval?.profitTargetPercent || 0
          },
          'APEX2519120000018': {
            position: positions['APEX2519120000018']?.position || 0,
            equity: ote.currentBalance || 0,
            openPL: 0,
            lastCheck: storedData.lastUpdated || null,
            pnl: ote.performance?.netPnl || 0,
            progress: ote.eval?.profitTargetPercent || 0
          }
        };
      }
    } catch (e) {
      console.warn('[Health] Could not load stored data:', e.message);
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      caretaker: 'active',
      sessionActive: caretaker.isSessionActive(),
      positions: positions,
      stats: caretaker.stats,
      timestamp: new Date().toISOString()
    }));
    return;
  }
  
  // Serve dashboard
  if (req.method === 'GET' && pathname === '/') {
    const dashboardPath = path.join(__dirname, 'dashboard', 'index.html');
    if (fs.existsSync(dashboardPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(fs.readFileSync(dashboardPath, 'utf8'));
      return;
    }
  }
  
  // Serve admin page
  if (req.method === 'GET' && (pathname === '/admin' || pathname === '/admin/')) {
    const adminPath = path.join(__dirname, 'dashboard', 'admin', 'index.html');
    if (fs.existsSync(adminPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(fs.readFileSync(adminPath, 'utf8'));
      return;
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Admin page not found');
      return;
    }
    // Fallback to basic dashboard
    const sessionActive = caretaker.isSessionActive();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
<!DOCTYPE html>
<html>
<head>
  <title>🤖 Trade Caretaker</title>
  <meta http-equiv="refresh" content="30">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Monaco', monospace;
      background: linear-gradient(135deg, #1a1a2e 0%, #0a0a15 100%);
      color: #0f0;
      padding: 40px;
      min-height: 100vh;
    }
    h1 { color: #0ff; margin-bottom: 10px; }
    .status { 
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 14px;
      margin-bottom: 20px;
    }
    .active { background: rgba(0,255,0,0.2); color: #0f0; }
    .inactive { background: rgba(255,165,0,0.2); color: #ffa500; }
    .section { margin: 20px 0; }
    .card {
      background: rgba(255,255,255,0.05);
      padding: 15px 20px;
      border-radius: 8px;
      margin: 10px 0;
    }
    .card h3 { color: #0aa; margin-bottom: 10px; }
    .account { display: flex; justify-content: space-between; }
    .position { font-size: 24px; font-weight: bold; }
    .flat { color: #666; }
    .long { color: #0f0; }
    .short { color: #f55; }
    .stat { display: inline-block; margin-right: 20px; }
    .stat-label { font-size: 12px; color: #0aa; }
    .stat-value { font-size: 18px; }
    table { width: 100%; border-collapse: collapse; }
    td, th { padding: 8px; text-align: left; border-bottom: 1px solid #333; }
  </style>
</head>
<body>
  <h1>🤖 Trade Caretaker</h1>
  <div class="status ${sessionActive ? 'active' : 'inactive'}">
    ${sessionActive ? '● SESSION ACTIVE' : '○ SESSION CLOSED'}
  </div>
  
  <div class="section">
    <div class="card">
      <h3>📊 Account Positions</h3>
      ${Object.entries(lastPositionData).map(([acc, data]) => {
        const posClass = data.position > 0 ? 'long' : data.position < 0 ? 'short' : 'flat';
        const posText = data.position > 0 ? `LONG ${data.position}` : data.position < 0 ? `SHORT ${Math.abs(data.position)}` : 'FLAT';
        return `
          <div class="account card">
            <div>
              <div style="color:#0aa">${acc}</div>
              <div class="position ${posClass}">${posText}</div>
            </div>
            <div style="text-align:right">
              <div>Equity: $${(data.equity || 0).toLocaleString()}</div>
              <div>P/L: $${(data.openPL || 0).toFixed(2)}</div>
              <div style="font-size:11px;color:#666">Last: ${data.lastCheck || 'Never'}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  </div>
  
  <div class="section">
    <div class="card">
      <h3>📈 Caretaker Stats</h3>
      <div class="stat">
        <div class="stat-label">Orders Monitored</div>
        <div class="stat-value">${caretaker.stats.ordersMonitored}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Retries</div>
        <div class="stat-value">${caretaker.stats.retriesAttempted}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Alerts Sent</div>
        <div class="stat-value">${caretaker.stats.alertsSent}</div>
      </div>
    </div>
  </div>
  
  <div class="section">
    <div class="card">
      <h3>📝 Expected Positions</h3>
      <table>
        <tr><th>Bot</th><th>Symbol</th><th>Expected</th><th>Verified</th></tr>
        ${Array.from(caretaker.expectedPositions.entries()).map(([key, val]) => `
          <tr>
            <td>${val.bot}</td>
            <td>MNQ</td>
            <td>${val.side.toUpperCase()} ${val.size}</td>
            <td>${val.verified ? '✅' : '⏳'}</td>
          </tr>
        `).join('') || '<tr><td colspan="4" style="color:#666">No pending positions</td></tr>'}
      </table>
    </div>
  </div>
  
  <p style="margin-top:30px;color:#333">Auto-refresh: 30s | ${new Date().toISOString()}</p>
</body>
</html>
    `);
    return;
  }
  
  // -------------------------------------------------------------------------
  // POSITION UPDATE (POST from browser checker)
  // -------------------------------------------------------------------------
  
  if (req.method === 'POST' && pathname === '/position') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const result = updatePositionData(data.account, data);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, position: result }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }
  
  // -------------------------------------------------------------------------
  // WEBHOOKS (from TradingView)
  // -------------------------------------------------------------------------
  
  if (req.method === 'POST' && pathname.startsWith('/webhook/')) {
    const botName = pathname.replace('/webhook/', '');
    
    let body = '';
    req.on('data', chunk => body += chunk);
    
    req.on('end', () => {
      try {
        const alert = JSON.parse(body);
        
        console.log(`\n${'═'.repeat(60)}`);
        console.log(`📥 WEBHOOK: ${botName}`);
        console.log(`${'═'.repeat(60)}`);
        console.log(JSON.stringify(alert, null, 2));
        
        // Log the alert
        log('webhook', { bot: botName, alert });
        
        // Track with caretaker
        caretaker.processAlert(alert, botName);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, tracked: true }));
        
      } catch (err) {
        console.error('[Webhook] Error:', err.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }
  
  // -------------------------------------------------------------------------
  // MANUAL ACTIONS
  // -------------------------------------------------------------------------
  
  // Force retry
  if (req.method === 'POST' && pathname === '/retry') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { bot } = JSON.parse(body);
        const order = caretaker.pendingOrders.find(o => o.bot === bot);
        
        if (order) {
          const result = await caretaker.retryOrder(order);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No pending order for bot' }));
        }
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }
  
  // -------------------------------------------------------------------------
  // DASHBOARD API (for decryptlabs.io website)
  // -------------------------------------------------------------------------
  
  const DASHBOARD_DATA_PATH = path.join(__dirname, './dashboard/data.json');
  
  // GET /api/stats - Dashboard stats
  if (req.method === 'GET' && pathname === '/api/stats') {
    try {
      const data = JSON.parse(fs.readFileSync(DASHBOARD_DATA_PATH, 'utf8'));
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({
        aum: data.aum,
        bots: data.bots,
        notices: data.notices || [],
        racing: data.racing,
        lastUpdated: data.lastUpdated
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to load stats' }));
    }
    return;
  }
  
  // GET /api/trades - Recent trades
  if (req.method === 'GET' && pathname === '/api/trades') {
    try {
      const data = JSON.parse(fs.readFileSync(DASHBOARD_DATA_PATH, 'utf8'));
      const limit = parseInt(parsedUrl.query.limit) || 20;
      const trades = (data.trades || []).slice(0, limit);
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify(trades));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to load trades' }));
    }
    return;
  }
  
  // GET /api/data - Full dashboard data
  if (req.method === 'GET' && pathname === '/api/data') {
    try {
      const data = JSON.parse(fs.readFileSync(DASHBOARD_DATA_PATH, 'utf8'));
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify(data));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to load data' }));
    }
    return;
  }
  
  // GET /api/signals - Recent signals for dashboard
  if (req.method === 'GET' && pathname === '/api/signals') {
    try {
      const logPath = path.join(LOG_DIR, 'caretaker.jsonl');
      const signals = [];
      
      if (fs.existsSync(logPath)) {
        const lines = fs.readFileSync(logPath, 'utf8').split('\n').filter(l => l.trim());
        const recentLines = lines.slice(-100); // Last 100 entries
        
        for (const line of recentLines) {
          try {
            const entry = JSON.parse(line);
            if (entry.type === 'webhook' || entry.type === 'alert' || entry.type === 'discrepancy') {
              signals.push({
                timestamp: entry.timestamp,
                type: entry.type,
                icon: entry.type === 'webhook' ? '📥' : entry.type === 'alert' ? '🚨' : '⚠️',
                title: formatSignalTitle(entry),
                details: formatSignalDetails(entry),
                raw: entry
              });
            }
          } catch (e) {}
        }
      }
      
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify(signals.reverse().slice(0, 50)));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to load signals' }));
    }
    return;
  }
  
  // GET /api/positions - Current position status
  if (req.method === 'GET' && pathname === '/api/positions') {
    const expected = Array.from(caretaker.expectedPositions?.entries() || []).map(([key, val]) => ({
      bot: val.bot,
      symbol: 'MNQ',
      expected: `${val.side.toUpperCase()} ${val.size}`,
      actual: lastPositionData[val.account]?.position || 0,
      verified: val.verified || false
    }));
    
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({
      accounts: lastPositionData,
      expected,
      stats: caretaker.stats
    }));
    return;
  }

  // ============================================================================
  // ACCESS CONTROL ENDPOINTS
  // ============================================================================
  
  // GET /api/access-requests - Get all access requests
  console.log(`[DEBUG] Checking access-requests: method=${req.method}, pathname=${pathname}`);
  if (req.method === 'GET' && pathname === '/api/access-requests') {
    console.log('[DEBUG] ✅ Matched /api/access-requests');
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({
      pending: accessRequests.filter(r => r.status === 'pending'),
      approved: accessRequests.filter(r => r.status === 'approved')
    }));
    return;
  }
  
  // POST /api/access-requests - Submit new access request
  if (req.method === 'POST' && pathname === '/api/access-requests') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const request = {
          id: Date.now(),
          tvUsername: data.tvUsername,
          wallet: data.wallet,
          type: data.type, // 'indicator' or 'strategy'
          strategyId: data.strategyId,
          tier: data.tier || 0,
          holdings: data.holdings || 0,
          timestamp: Date.now(),
          status: 'pending'
        };
        accessRequests.push(request);
        saveAccessRequests();
        console.log(`[Access] New ${data.type} request from @${data.tvUsername}`);
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ success: true, id: request.id }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }
  
  // POST /api/access-requests/:id/approve - Approve a request
  if (req.method === 'POST' && pathname.match(/^\/api\/access-requests\/\d+\/approve$/)) {
    const id = parseInt(pathname.split('/')[3]);
    const request = accessRequests.find(r => r.id === id);
    if (request) {
      request.status = 'approved';
      request.approvedAt = Date.now();
      saveAccessRequests();
      console.log(`[Access] ✅ Approved @${request.tvUsername} for ${request.type}`);
    }
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ success: true }));
    return;
  }
  
  // POST /api/access-requests/:id/reject - Reject a request
  if (req.method === 'POST' && pathname.match(/^\/api\/access-requests\/\d+\/reject$/)) {
    const id = parseInt(pathname.split('/')[3]);
    accessRequests = accessRequests.filter(r => r.id !== id);
    saveAccessRequests();
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }
  
  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// ============================================================================
// STARTUP
// ============================================================================

const PORT = process.env.PORT || 3458;

console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🤖 Trade Caretaker - Integrated Server                      ║
╠══════════════════════════════════════════════════════════════╣
║  Webhook receiver + Position monitoring + Auto-retry         ║
╚══════════════════════════════════════════════════════════════╝
`);

server.listen(PORT, () => {
  console.log(`[Server] ✅ Running on port ${PORT}`);
  console.log(`[Server] Dashboard: http://localhost:${PORT}`);
  console.log(`[Server] Session active: ${caretaker.isSessionActive()}`);
  console.log(`\n[Server] Webhook endpoints:`);
  config.bots.forEach(bot => {
    console.log(`  • POST /webhook/${bot}`);
  });
  console.log(`\n[Server] Accounts monitored:`);
  Object.keys(lastPositionData).forEach(acc => {
    console.log(`  • ${acc}`);
  });
});
// Rebuild Sun Feb  1 14:29:25 PST 2026
