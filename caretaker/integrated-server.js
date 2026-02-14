/**
 * 🚀 Mission Control — Integrated Trading Server
 * 
 * Combines:
 * - Webhook receiver (for TradingView alerts)
 * - Trade monitoring & retry
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
  'BOT-BRAVO': { position: 0, equity: 150177.52, openPL: 0, lastCheck: null },
  'BOT-CHARLIE': { position: 0, equity: 150000, openPL: 0, lastCheck: null },
  'BOT-DELTA': { position: 0, equity: 150000, openPL: 0, lastCheck: null }
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

// Bills storage (loaded after PERSIST_DIR is set)
let bills = [];
let BILLS_FILE; // initialized after PERSIST_DIR

function loadBills() {
  try {
    if (fs.existsSync(BILLS_FILE)) {
      bills = JSON.parse(fs.readFileSync(BILLS_FILE, 'utf8'));
      console.log(`[Bills] Loaded ${bills.length} bills`);
    } else {
      // Seed with default bills if new
      seedBills();
    }
  } catch (e) {
    console.log('[Bills] Error loading bills:', e.message);
    bills = [];
  }
}

function saveBills() {
  try {
    fs.writeFileSync(BILLS_FILE, JSON.stringify(bills, null, 2));
  } catch (e) {
    console.log('[Bills] Failed to save bills:', e.message);
  }
}

function seedBills() {
  bills = [
    {
      id: "seed-1",
      name: "APEX-18 Renewal",
      amount: 50,
      frequency: "monthly",
      dayOfMonth: 2,
      category: "business",
      color: "#00ff88", // Green
      enabled: true
    },
    {
      id: "seed-2",
      name: "APEX-19/20 Renewal",
      amount: 156.80,
      frequency: "monthly",
      dayOfMonth: 4,
      category: "business",
      color: "#00ff88",
      enabled: true
    },
    {
      id: "seed-3",
      name: "Spline",
      amount: 15,
      frequency: "monthly",
      dayOfMonth: 26,
      category: "business",
      color: "#aa66ff", // Purple
      enabled: true
    },
    {
      id: "seed-4",
      name: "APEX-21 (300K)",
      amount: 78.40,
      frequency: "monthly",
      dayOfMonth: 27,
      category: "business",
      color: "#00ff88",
      enabled: true
    },
    {
      id: "seed-5",
      name: "Anthropic",
      amount: 20,
      frequency: "monthly",
      dayOfMonth: 30,
      category: "business",
      color: "#00d4ff", // Cyan
      enabled: true
    }
  ];
  saveBills();
  console.log('[Bills] Seeded initial bills');
}

// Bills loaded after PERSIST_DIR is set (see line ~326)

// Load access requests on startup
loadAccessRequests();
console.log('[DEPLOY] 🚀 MISSION CONTROL v1.1 — Build Feb 9 2026 (Personal Tab)');

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
  const sessionId = cookies['mc_session'];
  return sessionId && sessions.has(sessionId);
}

function getLoginPage(error = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🚀 Mission Control — Login</title>
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
      <div class="logo-icon">🚀</div>
      <div class="logo-text">Mission Control</div>
    </div>
    ${error ? '<div class="error">' + error + '</div>' : ''}
    <form method="POST" action="/login">
      <div class="form-group">
        <label>Password</label>
        <input type="password" name="password" placeholder="Enter access code" autofocus required>
      </div>
      <button type="submit">Access Dashboard</button>
    </form>
    <div class="footer">Mission Control v1.0 — Decrypt Labs</div>
  </div>
</body>
</html>`;
}

// Logging
const LOG_DIR = path.join(__dirname, 'logs');
fs.mkdirSync(LOG_DIR, { recursive: true });

// Persistent data directory (survives deploys on Railway with volume mount)
const PERSIST_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'persist');
fs.mkdirSync(PERSIST_DIR, { recursive: true });
BILLS_FILE = path.join(PERSIST_DIR, 'bills.json');
loadBills();
const TRADES_HISTORY_PATH = path.join(PERSIST_DIR, 'trades-history.json');

// Initialize persistent trades file if not exists
if (!fs.existsSync(TRADES_HISTORY_PATH)) {
  fs.writeFileSync(TRADES_HISTORY_PATH, JSON.stringify([], null, 2));
  console.log('[Server] Created trades-history.json');
}

// Helper to load persistent trades
function loadPersistentTrades() {
  try {
    return JSON.parse(fs.readFileSync(TRADES_HISTORY_PATH, 'utf8'));
  } catch (e) {
    return [];
  }
}

// Helper to save trade to persistent storage
function saveTradeToPersist(trade) {
  try {
    const trades = loadPersistentTrades();
    trades.unshift(trade);
    // Keep last 500 trades in history
    const trimmed = trades.slice(0, 500);
    fs.writeFileSync(TRADES_HISTORY_PATH, JSON.stringify(trimmed, null, 2));
    console.log(`[Server] Trade saved to persistent storage: ${trade.bot}`);
  } catch (e) {
    console.error('[Server] Failed to save trade to persist:', e.message);
  }
}

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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
            'Set-Cookie': `mc_session=${sessionId}; Path=/; HttpOnly; SameSite=Strict`,
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
    const sessionId = cookies['mc_session'];
    if (sessionId) sessions.delete(sessionId);
    
    res.writeHead(302, {
      'Set-Cookie': 'mc_session=; Path=/; HttpOnly; Max-Age=0',
      'Location': '/login'
    });
    res.end();
    return;
  }
  
  // -------------------------------------------------------------------------
  // AUTH CHECK (protect dashboard routes)
  // -------------------------------------------------------------------------
  
  const publicPaths = ['/health', '/webhook/', '/position', '/api/', '/beta-preview'];
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
          'BOT-ALPHA': {
            position: positions['BOT-ALPHA']?.position || 0,
            equity: fvg.currentBalance || 0,
            openPL: 0,
            lastCheck: storedData.lastUpdated || null,
            pnl: fvg.performance?.netPnl || 0,
            progress: fvg.eval?.profitTargetPercent || 0
          },
          'BOT-BRAVO': {
            position: positions['BOT-BRAVO']?.position || 0,
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
  
  // Serve NFT art images
  if (req.method === 'GET' && pathname.startsWith('/nft-art/')) {
    const imgPath = path.join(__dirname, '..', pathname);
    if (fs.existsSync(imgPath)) {
      const ext = path.extname(imgPath).toLowerCase();
      const mimeTypes = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream', 'Cache-Control': 'public, max-age=86400' });
      res.end(fs.readFileSync(imgPath));
      return;
    }
  }

  // Serve Cipher City
  // Serve beta build previews
  if (req.method === 'GET' && pathname.startsWith('/beta-preview/')) {
    const buildName = pathname.replace('/beta-preview/', '').replace(/\/$/, '');
    const buildPath = path.join(__dirname, 'beta-builds', buildName + '.html');
    if (fs.existsSync(buildPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(fs.readFileSync(buildPath, 'utf8'));
      return;
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Build not found');
      return;
    }
  }

  if (req.method === 'GET' && pathname === '/city.html') {
    const cityPath = path.join(__dirname, 'city.html');
    if (fs.existsSync(cityPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(fs.readFileSync(cityPath, 'utf8'));
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
  <title>🚀 Mission Control</title>
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
  <h1>🚀 Mission Control</h1>
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
        
        // Save trade to data.json for transmission log
        try {
          const dataPath = path.join(__dirname, './dashboard/data.json');
          const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
          
          // Only log trades from active bots (not ote-refined variants)
          const activeBots = ['ote-silver-bullet', 'fvg-ifvg'];
          const isActiveBot = activeBots.includes(botName);
          
          // Only log entry/exit trades (not cancels) from active bots
          if (isActiveBot && (alert.action === 'entry' || alert.action === 'exit' || alert.side)) {
            const trade = {
              id: Date.now(),
              bot: botName,
              timestamp: alert.time || new Date().toISOString(),
              symbol: alert.symbol || alert.ticker || 'MNQ',
              side: alert.side || (alert.sentiment === 'bullish' ? 'long' : alert.sentiment === 'bearish' ? 'short' : 'flat'),
              action: alert.action || 'entry',
              price: parseFloat(alert.price || alert.entryPrice || alert.limitPrice || 0),
              size: parseInt(alert.size || alert.quantity || 1),
              pnl: parseFloat(alert.pnl || 0)
            };
            
            // Add to front of trades array (most recent first)
            data.trades = data.trades || [];
            data.trades.unshift(trade);
            
            // Keep only last 100 trades
            data.trades = data.trades.slice(0, 100);
            
            // Update lastUpdated
            data.lastUpdated = new Date().toISOString();
            
            fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
            
            // Also save to persistent storage (survives deploys)
            saveTradeToPersist(trade);
            
            console.log(`[Trades] Saved trade: ${trade.side} ${trade.symbol} @ ${trade.price}`);
          }
        } catch (saveErr) {
          console.log('[Trades] Could not save trade:', saveErr.message);
        }
        
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
  
  // -------------------------------------------------------------------------
  // BILLS CALENDAR API
  // -------------------------------------------------------------------------

  // GET /api/bills
  if (req.method === 'GET' && pathname === '/api/bills') {
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(bills));
    return;
  }

  // POST /api/bills - Add new bill
  if (req.method === 'POST' && pathname === '/api/bills') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const newBill = JSON.parse(body);
        newBill.id = Date.now().toString(36); // simple ID
        newBill.created = new Date().toISOString();
        if (!newBill.color) newBill.color = '#00ff88';
        
        bills.push(newBill);
        saveBills();
        
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ success: true, bill: newBill }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid bill data' }));
      }
    });
    return;
  }

  // PUT /api/bills/:id - Update bill
  if (req.method === 'PUT' && pathname.startsWith('/api/bills/')) {
    const id = pathname.split('/').pop();
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const updates = JSON.parse(body);
        const index = bills.findIndex(b => b.id === id);
        
        if (index !== -1) {
          bills[index] = { ...bills[index], ...updates };
          saveBills();
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ success: true, bill: bills[index] }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Bill not found' }));
        }
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid update data' }));
      }
    });
    return;
  }

  // DELETE /api/bills/:id - Delete bill
  if (req.method === 'DELETE' && pathname.startsWith('/api/bills/')) {
    const id = pathname.split('/').pop();
    const initialLen = bills.length;
    bills = bills.filter(b => b.id !== id);
    
    if (bills.length < initialLen) {
      saveBills();
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: true }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Bill not found' }));
    }
    return;
  }
  
  // GET /api/dashboard - Full dashboard data (alias for stats + more)
  if (req.method === 'GET' && pathname === '/api/dashboard') {
    try {
      const data = JSON.parse(fs.readFileSync(DASHBOARD_DATA_PATH, 'utf8'));
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify(data));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to load dashboard data' }));
    }
    return;
  }
  
  // GET /api/accounts - Account data for public dashboard
  if (req.method === 'GET' && pathname === '/api/accounts') {
    try {
      const data = JSON.parse(fs.readFileSync(DASHBOARD_DATA_PATH, 'utf8'));
      const bots = data.bots || {};
      
      // Transform to expected format for decryptlabs.io
      const accounts = {};
      
      // Dynamically build accounts from all bots in data.json
      for (const [botId, bot] of Object.entries(bots)) {
        accounts[botId] = {
          name: bot.name || botId,
          status: bot.status || 'online',
          accountId: bot.accountId || botId,
          balance: bot.currentBalance || 150000,
          pnl: bot.performance?.netPnl || (bot.currentBalance - 150000) || 0,
          profitNeeded: 9000,
          progress: bot.eval?.profitTargetPercent || ((bot.currentBalance - 150000) / 9000 * 100) || 0,
          drawdown: bot.trailing?.ddUsed || bot.eval?.drawdownUsed || 0,
          drawdownMax: 5000,
          drawdownRemaining: bot.trailing?.buffer ? (bot.trailing.ddMax * bot.trailing.buffer / 100) : 5000,
          peakBalance: bot.trailing?.peakBalance || bot.currentBalance || 150000,
          trailingThreshold: bot.trailing?.liquidation || ((bot.currentBalance || 150000) - 5000)
        };
      }
      
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify(accounts));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to load accounts' }));
    }
    return;
  }
  
  // GET /api/trades - Recent trades (from persistent storage)
  if (req.method === 'GET' && pathname === '/api/trades') {
    try {
      const limit = parseInt(parsedUrl.query.limit) || 20;
      const trades = loadPersistentTrades().slice(0, limit);
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

  // POST /api/trades - Add trades manually (saves to persistent storage)
  if (req.method === 'POST' && pathname === '/api/trades') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const newTrades = JSON.parse(body);
        
        // Accept array or single trade
        const tradesToAdd = Array.isArray(newTrades) ? newTrades : [newTrades];
        
        tradesToAdd.forEach(trade => {
          trade.id = trade.id || Date.now() + Math.random();
          trade.timestamp = trade.timestamp || new Date().toISOString();
          // Save to persistent storage
          saveTradeToPersist(trade);
        });
        
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ success: true, added: tradesToAdd.length }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid trade data' }));
      }
    });
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
  
  // POST /api/todo-update - Receive task notes from dashboard
  if (req.method === 'POST' && pathname === '/api/todo-update') {
    try {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        const data = JSON.parse(body);
        const logPath = path.join(LOG_DIR, 'todo-updates.jsonl');
        fs.appendFileSync(logPath, JSON.stringify(data) + '\n');
        console.log(`📋 Todo update: [${data.taskId}] ${data.task} — "${data.note}"`);
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: true }));
      });
    } catch(e) {
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // GET /api/todo-updates - Poll for task updates
  if (req.method === 'GET' && pathname === '/api/todo-updates') {
    try {
      const logPath = path.join(LOG_DIR, 'todo-updates.jsonl');
      const updates = [];
      if (fs.existsSync(logPath)) {
        const lines = fs.readFileSync(logPath, 'utf8').split('\n').filter(l => l.trim());
        for (const line of lines) {
          try { updates.push(JSON.parse(line)); } catch(e) {}
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(updates.slice(-50)));
    } catch(e) {
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // GET /api/signals/ict — Isolated ICT pipeline signals only (for dashboard feed)
  if (req.method === 'GET' && pathname === '/api/signals/ict') {
    try {
      const logPath = path.join(LOG_DIR, 'caretaker.jsonl');
      const ictSignals = [];
      if (fs.existsSync(logPath)) {
        const lines = fs.readFileSync(logPath, 'utf8').split('\n').filter(l => l.trim());
        const recentLines = lines.slice(-500);
        for (const line of recentLines) {
          try {
            const entry = JSON.parse(line);
            if (entry.type === 'webhook' && entry.bot === 'ict-analysis') {
              const alert = entry.alert || {};
              ictSignals.push({
                timestamp: entry.timestamp,
                trigger: alert.trigger || alert.type || 'Signal',
                bias: alert.bias || alert.direction || null,
                confidence: alert.confidence || null,
                model: alert.model || alert.modelName || null,
                keyLevel: alert.keyLevel || alert.level || alert.price || null,
                timeframe: alert.timeframe || alert.tf || null,
                instrument: alert.instrument || alert.symbol || 'MNQ',
                biasReason: alert.biasReason || alert.reason || null,
                entryZone: alert.entryZone || null,
                dol: alert.dol || alert.drawOnLiquidity || null,
                raw: alert
              });
            }
          } catch (e) {}
        }
      }
      ictSignals.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(ictSignals.slice(0, 50)));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to load ICT signals' }));
    }
    return;
  }

  // GET /api/signals/pending — Returns the latest qualifying signal for X post
  if (req.method === 'GET' && pathname === '/api/signals/pending') {
    try {
      const pendingFile = path.join(LOG_DIR, 'pending-tweet-signal.json');
      
      // 1. Try to read explicit pending file
      if (fs.existsSync(pendingFile)) {
        const data = fs.readFileSync(pendingFile, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(data);
        return;
      }
      
      // 2. Fallback: Search logs for latest CONVICTION_CROSSED or PRE_MARKET
      const logPath = path.join(LOG_DIR, 'caretaker.jsonl');
      let foundSignal = null;
      
      if (fs.existsSync(logPath)) {
        const lines = fs.readFileSync(logPath, 'utf8').split('\n').filter(l => l.trim());
        // Read backwards
        for (let i = lines.length - 1; i >= 0; i--) {
          try {
            const entry = JSON.parse(lines[i]);
            if (entry.type === 'webhook' && entry.bot === 'ict-analysis') {
              const alert = entry.alert || {};
              const trigger = alert.trigger || alert.type || '';
              // Check criteria
              if (trigger === 'CONVICTION_CROSSED' || trigger === 'PRE_MARKET') {
                 foundSignal = {
                   timestamp: entry.timestamp,
                   ...alert,
                   status: 'derived_from_log'
                 };
                 break;
              }
            }
          } catch(e) {}
        }
      }
      
      if (foundSignal) {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(foundSignal));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ message: 'No pending signal found' }));
      }
      
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to load pending signal' }));
    }
    return;
  }

  // GET /api/signals/bot/:botName — Signals filtered to a specific bot
  if (req.method === 'GET' && pathname.startsWith('/api/signals/bot/')) {
    const targetBot = pathname.replace('/api/signals/bot/', '');
    try {
      const logPath = path.join(LOG_DIR, 'caretaker.jsonl');
      const botSignals = [];
      if (fs.existsSync(logPath)) {
        const lines = fs.readFileSync(logPath, 'utf8').split('\n').filter(l => l.trim());
        const recentLines = lines.slice(-500);
        for (const line of recentLines) {
          try {
            const entry = JSON.parse(line);
            if ((entry.type === 'webhook' || entry.type === 'alert') && entry.bot === targetBot) {
              botSignals.push({
                timestamp: entry.timestamp,
                type: entry.type,
                bot: entry.bot,
                title: formatSignalTitle(entry),
                details: formatSignalDetails(entry),
                raw: entry.alert || entry
              });
            }
          } catch (e) {}
        }
      }
      botSignals.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(botSignals.slice(0, 50)));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to load bot signals' }));
    }
    return;
  }

  // GET /api/signals - Recent signals for dashboard (all bots)
  // Optional query params: ?bot=fvg-ifvg or ?grouped=true
  if (req.method === 'GET' && pathname === '/api/signals') {
    try {
      const logPath = path.join(LOG_DIR, 'caretaker.jsonl');
      const signals = [];
      const urlParams = new URL(req.url, `http://${req.headers.host}`).searchParams;
      const botFilter = urlParams.get('bot');
      const grouped = urlParams.get('grouped') === 'true';
      
      if (fs.existsSync(logPath)) {
        const lines = fs.readFileSync(logPath, 'utf8').split('\n').filter(l => l.trim());
        const recentLines = lines.slice(-200); // Last 200 entries for grouping
        
        for (const line of recentLines) {
          try {
            const entry = JSON.parse(line);
            if (entry.type === 'webhook' || entry.type === 'alert' || entry.type === 'discrepancy') {
              // Filter by bot if specified
              if (botFilter && entry.bot !== botFilter) continue;
              
              signals.push({
                timestamp: entry.timestamp,
                type: entry.type,
                bot: entry.bot || 'unknown',
                icon: entry.type === 'webhook' ? '📥' : entry.type === 'alert' ? '🚨' : '⚠️',
                title: formatSignalTitle(entry),
                details: formatSignalDetails(entry),
                raw: entry
              });
            }
          } catch (e) {}
        }
      }
      
      // Sort by timestamp descending
      signals.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // If grouped, organize by bot
      if (grouped) {
        const groupedSignals = {};
        for (const signal of signals.slice(0, 100)) {
          const bot = signal.bot || 'unknown';
          if (!groupedSignals[bot]) {
            groupedSignals[bot] = [];
          }
          if (groupedSignals[bot].length < 20) { // Max 20 per bot
            groupedSignals[bot].push(signal);
          }
        }
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify(groupedSignals));
        return;
      }
      
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify(signals.slice(0, 50)));
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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }
  
  // ============================================
  // TRADINGVIEW TIER ACCESS SYSTEM
  // ============================================
  
  // POST /api/tradingview-access - Submit new TradingView access request
  if (req.method === 'POST' && pathname === '/api/tradingview-access') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const request = {
          id: Date.now(),
          wallet: data.wallet,
          tradingViewUsername: data.tradingViewUsername,
          cipherBalance: data.cipherBalance,
          tier: data.tier,
          selectedStrategy: data.selectedStrategy,
          accessList: data.accessList,
          timestamp: data.timestamp || new Date().toISOString(),
          status: 'pending'
        };
        
        // Check for duplicate
        const existing = accessRequests.find(r => 
          r.tradingViewUsername?.toLowerCase() === request.tradingViewUsername.toLowerCase()
        );
        if (existing) {
          // Update existing request
          Object.assign(existing, request);
          existing.updatedAt = new Date().toISOString();
          saveAccessRequests();
          console.log(`[TV Access] Updated request for @${request.tradingViewUsername} (${request.tier})`);
        } else {
          accessRequests.push(request);
          saveAccessRequests();
          console.log(`[TV Access] New ${request.tier} request: @${request.tradingViewUsername}`);
          console.log(`  → Access: ${request.accessList.join(', ')}`);
        }
        
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ success: true, id: request.id }));
      } catch (e) {
        console.error('[TV Access] Error:', e);
        res.writeHead(400, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }
  
  // GET /api/tradingview-access - Get all TV access requests (admin)
  if (req.method === 'GET' && pathname === '/api/tradingview-access') {
    const tvRequests = accessRequests.filter(r => r.tradingViewUsername);
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({
      pending: tvRequests.filter(r => r.status === 'pending'),
      approved: tvRequests.filter(r => r.status === 'approved'),
      total: tvRequests.length
    }));
    return;
  }
  
  // POST /api/balances - Update account balances (from Jimmy's scraper)
  if (req.method === 'POST' && pathname === '/api/balances') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const updates = JSON.parse(body);
        const DASHBOARD_DATA_PATH = path.join(__dirname, './dashboard/data.json');
        const data = JSON.parse(fs.readFileSync(DASHBOARD_DATA_PATH, 'utf8'));
        
        // Update each bot's balance
        for (const [botId, balanceData] of Object.entries(updates)) {
          if (data.bots[botId]) {
            const bot = data.bots[botId];
            const oldBalance = bot.currentBalance || 150000;
            const newBalance = balanceData.balance;
            const startingBalance = bot.accountSize || 150000;
            
            // Update balance
            bot.currentBalance = newBalance;
            
            // Update P&L
            const pnl = newBalance - startingBalance;
            bot.performance = bot.performance || {};
            bot.performance.netPnl = pnl;
            bot.performance.todayPnl = balanceData.todayPnl || (newBalance - oldBalance);
            
            // Update eval progress (300K target = $20K, 150K target = $9K)
            bot.eval = bot.eval || {};
            const profitGoal = bot.eval.profitTargetGoal || (startingBalance >= 300000 ? 20000 : 9000);
            bot.eval.profitTarget = pnl;
            bot.eval.profitTargetGoal = profitGoal;
            bot.eval.profitTargetPercent = Math.max(0, (pnl / profitGoal) * 100);
            
            // Update trailing drawdown (300K accounts have $7,500 max DD)
            bot.trailing = bot.trailing || {};
            const ddMax = bot.trailing.ddMax || (startingBalance >= 300000 ? 7500 : startingBalance >= 250000 ? 6500 : 5000);
            const peakBalance = Math.max(bot.trailing.peakBalance || startingBalance, newBalance);
            bot.trailing.peakBalance = peakBalance;
            bot.trailing.liquidation = peakBalance - ddMax;
            bot.trailing.ddUsed = peakBalance - newBalance;
            bot.trailing.ddMax = ddMax;
            bot.trailing.buffer = ((ddMax - bot.trailing.ddUsed) / ddMax) * 100;
            
            bot.eval.drawdownUsed = bot.trailing.ddUsed;
            bot.eval.drawdownPercent = (bot.trailing.ddUsed / 5000) * 100;
            
            console.log(`[Balances] Updated ${botId}: $${oldBalance.toFixed(2)} -> $${newBalance.toFixed(2)}`);
          }
        }
        
        // Update AUM
        let totalAum = 0;
        for (const bot of Object.values(data.bots)) {
          totalAum += bot.currentBalance || 0;
        }
        data.aum = data.aum || {};
        data.aum.total = Math.round(totalAum);
        
        // Update timestamp
        data.lastUpdated = new Date().toISOString();
        
        // Save
        fs.writeFileSync(DASHBOARD_DATA_PATH, JSON.stringify(data, null, 2));
        
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ success: true, updated: Object.keys(updates), aum: totalAum }));
      } catch (err) {
        console.error('[Balances] Error:', err);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }
  
  // GET /api/holder/:wallet - Get holder's account data
  if (req.method === 'GET' && pathname.startsWith('/api/holder/')) {
    const walletAddress = pathname.split('/api/holder/')[1]?.toLowerCase();
    
    if (!walletAddress || walletAddress.length !== 42) {
      res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: 'Invalid wallet address' }));
      return;
    }
    
    try {
      const DASHBOARD_DATA_PATH = path.join(__dirname, './dashboard/data.json');
      const data = JSON.parse(fs.readFileSync(DASHBOARD_DATA_PATH, 'utf8'));
      
      // Build accounts array with current data
      const accounts = [];
      for (const [botId, bot] of Object.entries(data.bots || {})) {
        accounts.push({
          id: bot.accountId || botId,
          botId: botId,
          name: bot.name || botId,
          strategy: bot.strategy || 'Unknown',
          balance: bot.currentBalance || 150000,
          pnl: bot.performance?.netPnl || 0,
          drawdownUsed: bot.trailing?.ddUsed || 0,
          drawdownMax: bot.trailing?.ddMax || 5000,
          status: bot.status || 'online',
          lastTrade: bot.lastTrade || null
        });
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ 
        wallet: walletAddress,
        accounts: accounts,
        aum: data.aum || { total: 0 }
      }));
    } catch (err) {
      console.error('[Holder API] Error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }
  
  // ============================================================================
  // ICT ANALYSIS WEBHOOK (receives TradingView ICT Smart Entry alerts)
  // Stores the alert and forwards to local pipeline via stored webhook
  // ============================================================================
  
  if (req.method === 'POST' && pathname === '/ict-webhook') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        
        console.log(`\n${'═'.repeat(60)}`);
        console.log(`🧠 ICT ANALYSIS WEBHOOK RECEIVED`);
        console.log(`${'═'.repeat(60)}`);
        console.log(JSON.stringify(payload, null, 2));
        
        // Log it
        log('ict_analysis', { payload });
        
        // Store latest alert for local pipeline to pick up
        const ictAlertPath = path.join(PERSIST_DIR, 'ict-latest-alert.json');
        fs.writeFileSync(ictAlertPath, JSON.stringify({
          payload,
          receivedAt: new Date().toISOString(),
          processed: false
        }, null, 2));
        
        // Also append to alert history
        const ictHistoryPath = path.join(PERSIST_DIR, 'ict-alert-history.json');
        let history = [];
        try { history = JSON.parse(fs.readFileSync(ictHistoryPath, 'utf8')); } catch(e) {}
        history.unshift({ payload, receivedAt: new Date().toISOString() });
        history = history.slice(0, 100); // Keep last 100
        fs.writeFileSync(ictHistoryPath, JSON.stringify(history, null, 2));
        
        // Forward to local pipeline if configured
        const localWebhook = process.env.ICT_LOCAL_WEBHOOK;
        if (localWebhook) {
          const forwardUrl = new URL(localWebhook + '/webhook');
          const options = {
            hostname: forwardUrl.hostname,
            port: forwardUrl.port || 443,
            path: forwardUrl.pathname,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          };
          const proto = forwardUrl.protocol === 'https:' ? https : http;
          const fwdReq = proto.request(options, (fwdRes) => {
            console.log(`[ICT] Forwarded to local pipeline: ${fwdRes.statusCode}`);
          });
          fwdReq.on('error', (e) => {
            console.log(`[ICT] Forward failed (local pipeline may be offline): ${e.message}`);
          });
          fwdReq.write(body);
          fwdReq.end();
        }
        
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ 
          success: true, 
          message: 'ICT alert received and queued for analysis',
          timestamp: new Date().toISOString()
        }));
        
      } catch (err) {
        console.error('[ICT Webhook] Error:', err.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }
  
  // GET /ict-webhook/latest - Get latest ICT alert (for local pipeline polling)
  if (req.method === 'GET' && pathname === '/ict-webhook/latest') {
    try {
      const ictAlertPath = path.join(PERSIST_DIR, 'ict-latest-alert.json');
      if (fs.existsSync(ictAlertPath)) {
        const alert = JSON.parse(fs.readFileSync(ictAlertPath, 'utf8'));
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(alert));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ message: 'No alerts yet' }));
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }
  
  // GET /ict-webhook/history - Get ICT alert history
  if (req.method === 'GET' && pathname === '/ict-webhook/history') {
    try {
      const ictHistoryPath = path.join(PERSIST_DIR, 'ict-alert-history.json');
      if (fs.existsSync(ictHistoryPath)) {
        const history = JSON.parse(fs.readFileSync(ictHistoryPath, 'utf8'));
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(history));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify([]));
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /api/site-config — Centralized data for ALL pages (landing, city, admin)
  if (req.method === 'GET' && pathname === '/api/site-config') {
    try {
      const DASHBOARD_DATA_PATH = path.join(__dirname, './dashboard/data.json');
      const data = JSON.parse(fs.readFileSync(DASHBOARD_DATA_PATH, 'utf8'));
      const bots = data.bots || {};
      
      // Calculate global stats
      let totalAUM = 0, totalPnl = 0, todayPnl = 0, activeBots = 0, totalTrades = 0;
      const botList = [];
      
      for (const [botId, bot] of Object.entries(bots)) {
        const bal = bot.currentBalance || 0;
        const startBal = bot.accountSize || 150000;
        const pnl = bal - startBal;
        const ddMax = startBal >= 300000 ? 7500 : startBal >= 250000 ? 6500 : 5000;
        const profitTarget = startBal >= 300000 ? 320000 : 159000;
        
        totalAUM += bal;
        totalPnl += pnl;
        todayPnl += (bot.performance?.todayPnl || 0);
        if (bot.status === 'online') activeBots++;
        totalTrades += (bot.performance?.totalTrades || 0);
        
        botList.push({
          id: botId,
          name: bot.name,
          subtitle: bot.subtitle,
          strategy: bot.strategy,
          status: bot.status,
          accountId: bot.accountId,
          accountSize: startBal,
          balance: bal,
          pnl: pnl,
          todayPnl: bot.performance?.todayPnl || 0,
          winRate: bot.performance?.winRate || null,
          totalTrades: bot.performance?.totalTrades || 0,
          drawdownUsed: bot.trailing?.ddUsed || 0,
          drawdownMax: ddMax,
          drawdownRemaining: ddMax - (bot.trailing?.ddUsed || 0),
          peakBalance: bot.trailing?.peakBalance || bal,
          trailingThreshold: (bot.trailing?.peakBalance || bal) - ddMax,
          profitTarget: profitTarget,
          progressPct: Math.max(0, (pnl / (profitTarget - startBal)) * 100),
          nft: bot.nft || null
        });
      }
      
      // Count 24h signals
      let signalCount24h = 0;
      try {
        const logPath = path.join(__dirname, 'logs', 'caretaker.jsonl');
        if (fs.existsSync(logPath)) {
          const lines = fs.readFileSync(logPath, 'utf8').split('\n').filter(l => l.trim());
          const cutoff = Date.now() - 86400000;
          for (const line of lines.slice(-500)) {
            try {
              const e = JSON.parse(line);
              if (e.type === 'webhook' && new Date(e.timestamp).getTime() > cutoff) signalCount24h++;
            } catch(e) {}
          }
        }
      } catch(e) {}
      
      const config = {
        // Global stats (used by ALL pages)
        global: {
          totalAUM: Math.round(totalAUM),
          totalAUMFormatted: '$' + Math.round(totalAUM).toLocaleString('en-US'),
          activeBots: activeBots,
          totalBots: botList.length,
          totalPnl: parseFloat(totalPnl.toFixed(2)),
          todayPnl: parseFloat(todayPnl.toFixed(2)),
          totalTrades: totalTrades,
          signalCount24h: signalCount24h,
          lastUpdated: data.lastUpdated
        },
        // Bot details (used by city, admin, landing)
        bots: botList,
        // Graveyard (used by city, landing)
        graveyard: data.graveyard || [],
        // Notices
        notices: data.notices || [],
        // Racing data
        racing: data.racing || {}
      };
      
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=30'
      });
      res.end(JSON.stringify(config));
    } catch(err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // PUT /api/data - Full data.json replacement (admin only)
  if (req.method === 'PUT' && pathname === '/api/data') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const newData = JSON.parse(body);
        // Validate basic structure
        if (!newData.bots || typeof newData.bots !== 'object') {
          throw new Error('Missing or invalid bots field');
        }
        const DASHBOARD_DATA_PATH = path.join(__dirname, './dashboard/data.json');
        fs.writeFileSync(DASHBOARD_DATA_PATH, JSON.stringify(newData, null, 2));
        console.log(`[API] Full data.json replaced. Bots: ${Object.keys(newData.bots).join(', ')}`);
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ success: true, bots: Object.keys(newData.bots) }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // GET /api/ideas
  if (req.method === 'GET' && pathname === '/api/ideas') {
    try {
      const p = path.join(PERSIST_DIR, 'ideas.json');
      if (fs.existsSync(p)) {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(fs.readFileSync(p, 'utf8'));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify([]));
      }
    } catch(e) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: e.message })); }
    return;
  }

  // POST /api/ideas
  if (req.method === 'POST' && pathname === '/api/ideas') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const ideas = JSON.parse(body);
        fs.writeFileSync(path.join(PERSIST_DIR, 'ideas.json'), JSON.stringify(ideas, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: true }));
      } catch(e) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: e.message })); }
    });
    return;
  }

  // GET /api/kanban-tasks
  if (req.method === 'GET' && pathname === '/api/kanban-tasks') {
    try {
      const kbPath = path.join(PERSIST_DIR, 'kanban-tasks.json');
      if (fs.existsSync(kbPath)) {
        const data = fs.readFileSync(kbPath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(data);
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify([]));
      }
    } catch(e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // POST /api/kanban-tasks
  if (req.method === 'POST' && pathname === '/api/kanban-tasks') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const tasks = JSON.parse(body);
        const kbPath = path.join(PERSIST_DIR, 'kanban-tasks.json');
        fs.writeFileSync(kbPath, JSON.stringify(tasks, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: true }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // GET /api/personal-tasks
  if (req.method === 'GET' && pathname === '/api/personal-tasks') {
    try {
      const taskPath = path.join(PERSIST_DIR, 'personal-tasks.json');
      if (fs.existsSync(taskPath)) {
        const data = fs.readFileSync(taskPath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(data);
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({}));
      }
    } catch(e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // POST /api/personal-tasks
  if (req.method === 'POST' && pathname === '/api/personal-tasks') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const tasks = JSON.parse(body);
        const taskPath = path.join(PERSIST_DIR, 'personal-tasks.json');
        fs.writeFileSync(taskPath, JSON.stringify(tasks, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: true }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // GET /api/expenses - Load saved expenses
  if (req.method === 'GET' && pathname === '/api/expenses') {
    try {
      const expPath = path.join(PERSIST_DIR, 'expenses.json');
      if (fs.existsSync(expPath)) {
        const data = fs.readFileSync(expPath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(data);
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify([]));
      }
    } catch(e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // POST /api/expenses - Save expenses
  if (req.method === 'POST' && pathname === '/api/expenses') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const expenses = JSON.parse(body);
        const expPath = path.join(PERSIST_DIR, 'expenses.json');
        fs.writeFileSync(expPath, JSON.stringify(expenses, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: true }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // GET /api/goddard/risk-state - Get Goddard's current risk state
  if (req.method === 'GET' && pathname === '/api/goddard/risk-state') {
    try {
      const rsPath = path.join(PERSIST_DIR, 'goddard-risk-state.json');
      if (fs.existsSync(rsPath)) {
        const data = fs.readFileSync(rsPath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(data);
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({}));
      }
    } catch(e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // POST /api/goddard/risk-state - Update Goddard's risk state (from dashboard edits)
  if (req.method === 'POST' && pathname === '/api/goddard/risk-state') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const state = JSON.parse(body);
        const rsPath = path.join(PERSIST_DIR, 'goddard-risk-state.json');
        fs.writeFileSync(rsPath, JSON.stringify(state, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: true }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // GET /api/goddard/risk-rules - Get Goddard's risk rules
  if (req.method === 'GET' && pathname === '/api/goddard/risk-rules') {
    try {
      const rulesPath = path.join(PERSIST_DIR, 'goddard-risk-rules.md');
      if (fs.existsSync(rulesPath)) {
        const data = fs.readFileSync(rulesPath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ rules: data }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ rules: '' }));
      }
    } catch(e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // POST /api/goddard/risk-rules - Update Goddard's risk rules from dashboard
  if (req.method === 'POST' && pathname === '/api/goddard/risk-rules') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { rules } = JSON.parse(body);
        const rulesPath = path.join(PERSIST_DIR, 'goddard-risk-rules.md');
        // Also sync to local Goddard workspace if available
        const localPath = '/Users/jimmy/clawd-goddard/RISK-RULES.md';
        try { fs.writeFileSync(localPath, rules); } catch(e) { /* Railway won't have this */ }
        fs.writeFileSync(rulesPath, rules);
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: true }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // GET /api/goddard/news-feed - Get ICT live news analysis feed
  if (req.method === 'GET' && pathname === '/api/goddard/news-feed') {
    try {
      const feedPath = path.join(PERSIST_DIR, 'goddard-news-feed.json');
      if (fs.existsSync(feedPath)) {
        const data = fs.readFileSync(feedPath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(data);
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ entries: [] }));
      }
    } catch(e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // POST /api/goddard/news-feed - Add news entry from Goddard's analysis
  if (req.method === 'POST' && pathname === '/api/goddard/news-feed') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const entry = JSON.parse(body);
        const feedPath = path.join(PERSIST_DIR, 'goddard-news-feed.json');
        let feed = { entries: [] };
        if (fs.existsSync(feedPath)) {
          feed = JSON.parse(fs.readFileSync(feedPath, 'utf8'));
        }
        feed.entries.unshift({ ...entry, timestamp: new Date().toISOString() });
        // Keep last 50 entries
        feed.entries = feed.entries.slice(0, 50);
        fs.writeFileSync(feedPath, JSON.stringify(feed, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: true }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // GET /api/goddard/cron-schedule - Get Goddard's cron schedule
  if (req.method === 'GET' && pathname === '/api/goddard/cron-schedule') {
    try {
      const cronPath = path.join(PERSIST_DIR, 'goddard-cron-schedule.json');
      if (fs.existsSync(cronPath)) {
        const data = fs.readFileSync(cronPath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(data);
      } else {
        // Default schedule
        const defaultSchedule = {
          jobs: [
            { id: 'morning-risk', name: 'Morning Risk Briefing', cron: '30 4 * * 1-5', tz: 'America/Los_Angeles', enabled: true, description: 'Forex Factory news check + drawdown status + pause recommendations' },
            { id: 'pm-risk', name: 'PM Session Risk Check', cron: '30 8 * * 1-5', tz: 'America/Los_Angeles', enabled: true, description: 'Check P&L before PM session — recommend pausing if green' }
          ]
        };
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(defaultSchedule));
      }
    } catch(e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // POST /api/goddard/cron-schedule - Update Goddard's cron schedule
  if (req.method === 'POST' && pathname === '/api/goddard/cron-schedule') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const schedule = JSON.parse(body);
        const cronPath = path.join(PERSIST_DIR, 'goddard-cron-schedule.json');
        fs.writeFileSync(cronPath, JSON.stringify(schedule, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: true }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ═══ MEETING ROOM + LOUNGE SHARED HELPERS ═══
  const roomCors = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
  const MEETING_FILE = path.join(PERSIST_DIR, 'meeting-room.json');
  const LOUNGE_FILE_P = path.join(PERSIST_DIR, 'lounge.json');

  // ═══ MEETING ROOM API ═══
  // GET /api/meeting-room - Get all meeting messages
  if (req.method === 'GET' && pathname === '/api/meeting-room') {
    try {
      const data = fs.existsSync(MEETING_FILE)
        ? JSON.parse(fs.readFileSync(MEETING_FILE, 'utf8'))
        : [];
      res.writeHead(200, roomCors);
      res.end(JSON.stringify(data));
    } catch (e) {
      res.writeHead(200, roomCors);
      res.end('[]');
    }
    return;
  }

  // POST /api/meeting-room - Add a message
  if (req.method === 'POST' && pathname === '/api/meeting-room') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const msg = JSON.parse(body);
        const messages = fs.existsSync(MEETING_FILE)
          ? JSON.parse(fs.readFileSync(MEETING_FILE, 'utf8'))
          : [];
        messages.push({
          id: Date.now().toString(36),
          sender: msg.sender || 'jimmy',
          message: msg.message || '',
          timestamp: msg.timestamp || new Date().toISOString()
        });
        const trimmed = messages.slice(-200);
        fs.writeFileSync(MEETING_FILE, JSON.stringify(trimmed, null, 2));
        res.writeHead(200, roomCors);
        res.end(JSON.stringify({ ok: true, total: trimmed.length }));
      } catch (e) {
        res.writeHead(400, roomCors);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // DELETE /api/meeting-room - Clear all messages
  if (req.method === 'DELETE' && pathname === '/api/meeting-room') {
    try { fs.writeFileSync(MEETING_FILE, '[]'); } catch(e) {}
    res.writeHead(200, roomCors);
    res.end(JSON.stringify({ ok: true, cleared: true }));
    return;
  }

  // ═══ THE LOUNGE API ═══
  // GET /api/lounge - Get all lounge messages
  if (req.method === 'GET' && pathname === '/api/lounge') {
    try {
      const data = fs.existsSync(LOUNGE_FILE_P)
        ? JSON.parse(fs.readFileSync(LOUNGE_FILE_P, 'utf8'))
        : [];
      res.writeHead(200, roomCors);
      res.end(JSON.stringify(data));
    } catch (e) {
      res.writeHead(200, roomCors);
      res.end('[]');
    }
    return;
  }

  // POST /api/lounge - Add a message or idea
  if (req.method === 'POST' && pathname === '/api/lounge') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const msg = JSON.parse(body);
        const messages = fs.existsSync(LOUNGE_FILE_P)
          ? JSON.parse(fs.readFileSync(LOUNGE_FILE_P, 'utf8'))
          : [];
        messages.push({
          id: Date.now().toString(36),
          sender: msg.sender || 'jimmy',
          message: msg.message || '',
          type: msg.type || 'chat',
          timestamp: msg.timestamp || new Date().toISOString()
        });
        const trimmed = messages.slice(-300);
        fs.writeFileSync(LOUNGE_FILE_P, JSON.stringify(trimmed, null, 2));
        res.writeHead(200, roomCors);
        res.end(JSON.stringify({ ok: true, total: trimmed.length }));
      } catch (e) {
        res.writeHead(400, roomCors);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // DELETE /api/lounge - Clear all messages
  if (req.method === 'DELETE' && pathname === '/api/lounge') {
    try { fs.writeFileSync(LOUNGE_FILE_P, '[]'); } catch(e) {}
    res.writeHead(200, roomCors);
    res.end(JSON.stringify({ ok: true, cleared: true }));
    return;
  }

  // ═══ THE FOUNTAIN API ═══
  const fountainCors = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
  const FOUNTAIN_TRENDS_FILE = path.join(PERSIST_DIR, 'fountain-trends.json');
  const FOUNTAIN_IDEAS_FILE = path.join(PERSIST_DIR, 'fountain-ideas.json');

  function loadFountainTrends() {
    try { return fs.existsSync(FOUNTAIN_TRENDS_FILE) ? JSON.parse(fs.readFileSync(FOUNTAIN_TRENDS_FILE, 'utf8')) : []; } catch(e) { return []; }
  }
  function saveFountainTrends(data) {
    fs.writeFileSync(FOUNTAIN_TRENDS_FILE, JSON.stringify(data, null, 2));
  }
  function loadFountainIdeas() {
    try { return fs.existsSync(FOUNTAIN_IDEAS_FILE) ? JSON.parse(fs.readFileSync(FOUNTAIN_IDEAS_FILE, 'utf8')) : []; } catch(e) { return []; }
  }
  function saveFountainIdeas(data) {
    fs.writeFileSync(FOUNTAIN_IDEAS_FILE, JSON.stringify(data, null, 2));
  }

  // GET /api/fountain/trends
  if (req.method === 'GET' && pathname === '/api/fountain/trends') {
    res.writeHead(200, fountainCors);
    res.end(JSON.stringify(loadFountainTrends()));
    return;
  }

  // POST /api/fountain/trends
  if (req.method === 'POST' && pathname === '/api/fountain/trends') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const trend = JSON.parse(body);
        const trends = loadFountainTrends();
        trend.id = trend.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        trend.timestamp = trend.timestamp || new Date().toISOString();
        trends.unshift(trend);
        saveFountainTrends(trends.slice(0, 200));
        res.writeHead(200, fountainCors);
        res.end(JSON.stringify({ ok: true, id: trend.id }));
      } catch(e) {
        res.writeHead(400, fountainCors);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // DELETE /api/fountain/trends
  if (req.method === 'DELETE' && pathname === '/api/fountain/trends') {
    saveFountainTrends([]);
    res.writeHead(200, fountainCors);
    res.end(JSON.stringify({ ok: true, cleared: true }));
    return;
  }

  // GET /api/fountain/ideas
  if (req.method === 'GET' && pathname === '/api/fountain/ideas') {
    const ideas = loadFountainIdeas();
    const labOnly = parsedUrl.query.lab === 'true';
    const filtered = labOnly ? ideas.filter(i => i.status === 'lab' || i.status === 'pipeline') : ideas;
    res.writeHead(200, fountainCors);
    res.end(JSON.stringify(filtered));
    return;
  }

  // POST /api/fountain/ideas
  if (req.method === 'POST' && pathname === '/api/fountain/ideas') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const idea = JSON.parse(body);
        const ideas = loadFountainIdeas();
        idea.id = idea.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        idea.timestamp = idea.timestamp || new Date().toISOString();
        idea.status = idea.status || 'stream';
        ideas.unshift(idea);
        saveFountainIdeas(ideas.slice(0, 500));
        res.writeHead(200, fountainCors);
        res.end(JSON.stringify({ ok: true, id: idea.id }));
      } catch(e) {
        res.writeHead(400, fountainCors);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // POST /api/fountain/ideas/:id/promote
  if (req.method === 'POST' && pathname.match(/^\/api\/fountain\/ideas\/[^/]+\/promote$/)) {
    const ideaId = pathname.split('/')[4];
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { status } = JSON.parse(body);
        if (!['lab', 'pipeline'].includes(status)) throw new Error('Invalid status');
        const ideas = loadFountainIdeas();
        const idea = ideas.find(i => i.id === ideaId);
        if (!idea) { res.writeHead(404, fountainCors); res.end(JSON.stringify({ error: 'Idea not found' })); return; }
        idea.status = status;
        idea.promotedAt = new Date().toISOString();
        saveFountainIdeas(ideas);
        res.writeHead(200, fountainCors);
        res.end(JSON.stringify({ ok: true, id: ideaId, status }));
      } catch(e) {
        res.writeHead(400, fountainCors);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // DELETE /api/fountain/ideas
  if (req.method === 'DELETE' && pathname === '/api/fountain/ideas') {
    saveFountainIdeas([]);
    res.writeHead(200, fountainCors);
    res.end(JSON.stringify({ ok: true, cleared: true }));
    return;
  }

  // ═══ TEAM STARS & EOTM API ═══
  const TEAM_STARS_FILE = path.join(PERSIST_DIR, 'team-stars.json');

  function loadTeamStars() {
    try {
      if (fs.existsSync(TEAM_STARS_FILE)) {
        return JSON.parse(fs.readFileSync(TEAM_STARS_FILE, 'utf8'));
      }
      return seedTeamStars();
    } catch (e) {
      return seedTeamStars();
    }
  }

  function saveTeamStars(data) {
    fs.writeFileSync(TEAM_STARS_FILE, JSON.stringify(data, null, 2));
  }

  function seedTeamStars() {
    const initialData = {
      stars: {
        "DropKing": 0,
        "Jimmy Neutron": 0,
        "Goddard": 0,
        "Cindy Vortex": 0,
        "Sheen Estevez": 0,
        "Carl Wheezer": 0,
        "Prof. Finbarr": 1
      },
      eotm: {
        agent: "Prof. Finbarr",
        emoji: "🔬",
        reason: "First prototype delivery — Website Upgrader with confetti, terminal scanner & GeoCities before/after",
        month: "February 2026",
        starsEarned: 1
      },
      history: []
    };
    saveTeamStars(initialData);
    return initialData;
  }

  // GET /api/team/stars
  if (req.method === 'GET' && pathname === '/api/team/stars') {
    const data = loadTeamStars();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(data.stars));
    return;
  }

  // PUT /api/team/stars - Reset/set all stars
  if (req.method === 'PUT' && pathname === '/api/team/stars') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const newStars = JSON.parse(body);
        const data = loadTeamStars();
        data.stars = newStars;
        data.history = data.history || [];
        data.history.unshift({ action: 'stars_reset', timestamp: new Date().toISOString() });
        saveTeamStars(data);
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: true, stars: data.stars }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // POST /api/team/stars - Award a star
  if (req.method === 'POST' && pathname === '/api/team/stars') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { agent, reason } = JSON.parse(body);
        const data = loadTeamStars();
        
        if (!data.stars[agent]) data.stars[agent] = 0;
        data.stars[agent]++;
        
        // Log to history
        if (!data.history) data.history = [];
        data.history.unshift({
          agent,
          action: 'star_awarded',
          reason: reason || 'Contribution',
          timestamp: new Date().toISOString()
        });
        
        saveTeamStars(data);
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: true, newCount: data.stars[agent] }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // GET /api/team/eotm
  if (req.method === 'GET' && pathname === '/api/team/eotm') {
    const data = loadTeamStars();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(data.eotm));
    return;
  }

  // POST /api/team/eotm
  if (req.method === 'POST' && pathname === '/api/team/eotm') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const newData = JSON.parse(body);
        const data = loadTeamStars();
        
        data.eotm = {
          ...data.eotm,
          ...newData,
          updatedAt: new Date().toISOString()
        };
        
        saveTeamStars(data);
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: true, eotm: data.eotm }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ═══ THE FORGE API ═══
  const FORGE_BUILDS_FILE = path.join(PERSIST_DIR, 'forge-builds.json');

  // GET /api/fountain/builds
  if (req.method === 'GET' && pathname === '/api/fountain/builds') {
    try {
      const builds = JSON.parse(fs.readFileSync(FORGE_BUILDS_FILE, 'utf8') || '[]');
      res.writeHead(200, fountainCors);
      res.end(JSON.stringify(builds));
    } catch (e) {
      if (e.code === 'ENOENT') {
        res.writeHead(200, fountainCors);
        res.end('[]');
      } else {
        res.writeHead(500, fountainCors);
        res.end(JSON.stringify({ error: e.message }));
      }
    }
    return;
  }

  // POST /api/fountain/builds — Queue a new build
  if (req.method === 'POST' && pathname === '/api/fountain/builds') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const buildData = JSON.parse(body);
        let builds = [];
        try {
          builds = JSON.parse(fs.readFileSync(FORGE_BUILDS_FILE, 'utf8') || '[]');
        } catch (e) { /* ignore */ }

        const newBuild = {
          id: 'forge-' + Date.now().toString(36),
          title: buildData.title || 'Untitled Build',
          description: buildData.description || '',
          ideaId: buildData.ideaId || null,
          status: 'queued', // queued, building, deployed, failed, reviewed
          costEstimate: buildData.costEstimate || '$0.00',
          previewUrl: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        builds.unshift(newBuild);
        fs.writeFileSync(FORGE_BUILDS_FILE, JSON.stringify(builds, null, 2));

        res.writeHead(200, fountainCors);
        res.end(JSON.stringify({ ok: true, build: newBuild }));
      } catch (e) {
        res.writeHead(400, fountainCors);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // PATCH /api/fountain/builds/:id — Update build status
  if (req.method === 'PATCH' && pathname.startsWith('/api/fountain/builds/')) {
    const buildId = pathname.split('/').pop();
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const patchData = JSON.parse(body);
        let builds = [];
        try {
          builds = JSON.parse(fs.readFileSync(FORGE_BUILDS_FILE, 'utf8') || '[]');
        } catch (e) { 
           res.writeHead(404, fountainCors);
           res.end(JSON.stringify({ error: 'No builds found' }));
           return;
        }

        const buildIndex = builds.findIndex(b => b.id === buildId);
        if (buildIndex === -1) {
          res.writeHead(404, fountainCors);
          res.end(JSON.stringify({ error: 'Build not found' }));
          return;
        }

        // Validate status if present
        if (patchData.status) {
          const validStatuses = ['queued', 'building', 'done', 'failed', 'review', 'approved', 'rejected', 'live', 'archived', 'prototype', 'production'];
          if (!validStatuses.includes(patchData.status)) {
             res.writeHead(400, fountainCors);
             res.end(JSON.stringify({ error: 'Invalid status' }));
             return;
          }
        }

        // Merge updates
        builds[buildIndex] = {
          ...builds[buildIndex],
          ...patchData,
          updatedAt: new Date().toISOString()
        };

        fs.writeFileSync(FORGE_BUILDS_FILE, JSON.stringify(builds, null, 2));

        res.writeHead(200, fountainCors);
        res.end(JSON.stringify({ ok: true, build: builds[buildIndex] }));
      } catch (e) {
        res.writeHead(400, fountainCors);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // DELETE /api/fountain/builds/:id — Remove a build
  if (req.method === 'DELETE' && pathname.startsWith('/api/fountain/builds/')) {
    const buildId = pathname.split('/').pop();
    try {
      let builds = [];
      try {
        builds = JSON.parse(fs.readFileSync(FORGE_BUILDS_FILE, 'utf8') || '[]');
      } catch (e) { /* ignore */ }

      const newBuilds = builds.filter(b => b.id !== buildId);
      fs.writeFileSync(FORGE_BUILDS_FILE, JSON.stringify(newBuilds, null, 2));

      res.writeHead(200, fountainCors);
      res.end(JSON.stringify({ ok: true, deleted: buildId }));
    } catch (e) {
      res.writeHead(500, fountainCors);
      res.end(JSON.stringify({ error: e.message }));
    }
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
║  🚀 Mission Control v1.0 — Decrypt Labs                      ║
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
