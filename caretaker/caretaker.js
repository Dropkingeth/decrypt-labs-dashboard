/**
 * 🤖 Trade Caretaker
 * 
 * Monitors trades and ensures proper execution.
 * Retries failed orders and alerts on discrepancies.
 * 
 * Runs Mon-Fri during trading sessions.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

class TradeCaretaker {
  constructor(config) {
    this.config = config;
    
    // Expected positions based on webhook alerts
    this.expectedPositions = new Map();  // symbol -> { side, size, entryPrice, bot, timestamp }
    
    // Pending orders waiting for confirmation
    this.pendingOrders = [];
    
    // Trade log
    this.logFile = path.join(__dirname, 'logs', 'caretaker.jsonl');
    fs.mkdirSync(path.dirname(this.logFile), { recursive: true });
    
    // Stats
    this.stats = {
      ordersMonitored: 0,
      retriesAttempted: 0,
      alertsSent: 0,
      lastCheck: null
    };
    
    console.log('[Caretaker] 🤖 Initialized');
  }
  
  // ===========================================================================
  // ALERT PROCESSING (Called when webhook received)
  // ===========================================================================
  
  /**
   * Process incoming alert and track expected position
   */
  processAlert(alert, botName) {
    const symbol = this.normalizeSymbol(alert.ticker);
    const timestamp = Date.now();
    
    this.log('alert_received', { bot: botName, alert, symbol });
    
    if (alert.action === 'buy' || alert.action === 'sell') {
      // Entry order - track expected position
      const side = alert.action === 'buy' ? 'long' : 'short';
      const size = parseInt(alert.quantity) || 1;
      const price = parseFloat(alert.limitPrice) || parseFloat(alert.price) || null;
      
      const expected = {
        side,
        size,
        entryPrice: price,
        bot: botName,
        timestamp,
        orderType: alert.orderType || 'market',
        verified: false,
        retries: 0
      };
      
      this.expectedPositions.set(`${botName}:${symbol}`, expected);
      
      // Add to pending orders for verification
      this.pendingOrders.push({
        id: `${botName}-${timestamp}`,
        bot: botName,
        symbol,
        expected,
        checkAfter: timestamp + 30000,  // Check after 30 seconds
        maxRetries: 3
      });
      
      console.log(`[Caretaker] 📝 Tracking: ${botName} expects ${side.toUpperCase()} ${size} ${symbol}`);
      this.stats.ordersMonitored++;
      
    } else if (alert.action === 'exit') {
      // Exit order - expect flat
      this.expectedPositions.delete(`${botName}:${symbol}`);
      console.log(`[Caretaker] 📝 Tracking: ${botName} expects FLAT ${symbol}`);
    }
    
    return { tracked: true };
  }
  
  // ===========================================================================
  // POSITION VERIFICATION
  // ===========================================================================
  
  /**
   * Check actual positions against expected
   * Call this periodically with actual position data
   */
  verifyPositions(actualPositions) {
    const now = Date.now();
    this.stats.lastCheck = new Date().toISOString();
    
    const discrepancies = [];
    
    for (const [key, expected] of this.expectedPositions) {
      const [botName, symbol] = key.split(':');
      
      // Skip if too recent (give order time to fill)
      if (now - expected.timestamp < 30000) continue;
      
      // Find matching actual position
      const actual = actualPositions.find(p => 
        this.normalizeSymbol(p.symbol) === symbol
      );
      
      const actualSize = actual ? Math.abs(actual.netPos || actual.size || 0) : 0;
      const actualSide = actual ? (actual.netPos > 0 ? 'long' : 'short') : 'flat';
      
      // Check for discrepancy
      if (!actual || actualSize === 0) {
        // Expected position but none exists
        discrepancies.push({
          type: 'missing_position',
          bot: botName,
          symbol,
          expected: `${expected.side} ${expected.size}`,
          actual: 'FLAT',
          severity: 'high'
        });
      } else if (actualSide !== expected.side) {
        // Wrong direction!
        discrepancies.push({
          type: 'wrong_direction',
          bot: botName,
          symbol,
          expected: `${expected.side} ${expected.size}`,
          actual: `${actualSide} ${actualSize}`,
          severity: 'critical'
        });
      } else if (actualSize !== expected.size) {
        // Partial fill or wrong size
        discrepancies.push({
          type: 'size_mismatch',
          bot: botName,
          symbol,
          expected: `${expected.side} ${expected.size}`,
          actual: `${actualSide} ${actualSize}`,
          severity: 'medium'
        });
      } else {
        // Position verified!
        expected.verified = true;
        console.log(`[Caretaker] ✅ Verified: ${botName} ${expected.side} ${expected.size} ${symbol}`);
      }
    }
    
    return discrepancies;
  }
  
  // ===========================================================================
  // RETRY LOGIC
  // ===========================================================================
  
  /**
   * Retry a failed order via TradersPost webhook
   */
  async retryOrder(order) {
    // Get webhook for this specific bot
    const webhooks = this.config.tradersPostWebhooks || {};
    const webhook = webhooks[order.bot] || this.config.tradersPostWebhook;
    
    if (!webhook) {
      console.log(`[Caretaker] ⚠️ No TradersPost webhook configured for ${order.bot} - cannot retry`);
      return { success: false, error: 'No webhook configured' };
    }
    
    if (order.retries >= order.maxRetries) {
      console.log(`[Caretaker] ❌ Max retries reached for ${order.id}`);
      return { success: false, error: 'Max retries exceeded' };
    }
    
    console.log(`[Caretaker] 🔄 Retrying order: ${order.id} (attempt ${order.retries + 1})`);
    
    const payload = {
      ticker: order.symbol,
      action: order.expected.side === 'long' ? 'buy' : 'sell',
      quantity: order.expected.size,
      orderType: 'market'  // Retry as market for guaranteed fill
    };
    
    try {
      await this.sendToTradersPost(webhook, payload);
      order.retries++;
      this.stats.retriesAttempted++;
      this.log('retry_sent', { order: order.id, bot: order.bot, payload, attempt: order.retries });
      
      return { success: true, attempt: order.retries };
    } catch (err) {
      console.error(`[Caretaker] ❌ Retry failed:`, err.message);
      return { success: false, error: err.message };
    }
  }
  
  /**
   * Send signal to TradersPost
   */
  sendToTradersPost(webhookUrl, payload) {
    return new Promise((resolve, reject) => {
      const url = new URL(webhookUrl);
      
      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        });
      });
      
      req.on('error', reject);
      req.write(JSON.stringify(payload));
      req.end();
    });
  }
  
  // ===========================================================================
  // EOD CHECK
  // ===========================================================================
  
  /**
   * End of day check - ensure all positions are flat
   */
  async checkEOD(actualPositions) {
    console.log('[Caretaker] 🌙 Running EOD check...');
    
    const openPositions = actualPositions.filter(p => 
      p.netPos && p.netPos !== 0
    );
    
    if (openPositions.length > 0) {
      console.log(`[Caretaker] ⚠️ ${openPositions.length} positions still open at EOD!`);
      
      for (const pos of openPositions) {
        this.log('eod_position_open', { position: pos });
        
        // Could auto-flatten here if configured
        // await this.flattenPosition(pos);
      }
      
      return {
        flat: false,
        openPositions: openPositions.map(p => ({
          symbol: p.symbol,
          size: p.netPos
        }))
      };
    }
    
    console.log('[Caretaker] ✅ All positions flat at EOD');
    return { flat: true };
  }
  
  // ===========================================================================
  // UTILITIES
  // ===========================================================================
  
  normalizeSymbol(symbol) {
    if (!symbol) return '';
    // Strip exchange prefix and standardize
    return symbol.replace(/^[A-Z]+:/, '').toUpperCase();
  }
  
  log(event, data) {
    const entry = {
      event,
      timestamp: new Date().toISOString(),
      ...data
    };
    fs.appendFileSync(this.logFile, JSON.stringify(entry) + '\n');
  }
  
  /**
   * Get trading session status
   */
  isSessionActive() {
    const now = new Date();
    const day = now.getDay();
    
    // Monday (1) through Friday (5)
    if (day === 0 || day === 6) return false;
    
    // Get NY time
    const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const hour = nyTime.getHours();
    const minute = nyTime.getMinutes();
    const time = hour * 100 + minute;
    
    // Trading windows (NY time)
    const sessions = [
      { start: 945, end: 1100 },   // NY AM
      { start: 1345, end: 1600 }   // NY PM
    ];
    
    return sessions.some(s => time >= s.start && time <= s.end);
  }
  
  /**
   * Get status summary
   */
  getStatus() {
    return {
      sessionActive: this.isSessionActive(),
      expectedPositions: Array.from(this.expectedPositions.entries()).map(([key, val]) => ({
        key,
        ...val
      })),
      pendingOrders: this.pendingOrders.length,
      stats: this.stats
    };
  }
}

module.exports = TradeCaretaker;
