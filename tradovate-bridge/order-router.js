/**
 * Order Router
 * 
 * Maps TradingView alerts to Tradovate orders
 */

class OrderRouter {
  constructor(tradovateClient, config) {
    this.client = tradovateClient;
    this.config = config;
    
    // Track daily stats
    this.dailyStats = {
      date: new Date().toDateString(),
      trades: 0,
      pnl: 0
    };
    
    // Track open orders by bot
    this.openOrders = new Map();
    
    console.log('[Router] Initialized');
  }
  
  /**
   * Reset daily stats at midnight
   */
  checkDayRollover() {
    const today = new Date().toDateString();
    if (this.dailyStats.date !== today) {
      console.log(`[Router] New trading day - resetting stats`);
      this.dailyStats = { date: today, trades: 0, pnl: 0 };
    }
  }
  
  /**
   * Process incoming webhook alert
   */
  async processAlert(alert, botName) {
    this.checkDayRollover();
    
    console.log(`\n[Router] ═══════════════════════════════════════`);
    console.log(`[Router] Processing alert from ${botName}`);
    console.log(`[Router] Action: ${alert.action} | Sentiment: ${alert.sentiment || 'N/A'}`);
    
    // Check daily limits
    if (!this.checkRiskLimits()) {
      console.log(`[Router] ❌ Risk limits exceeded - rejecting order`);
      return { success: false, error: 'Risk limits exceeded' };
    }
    
    // Get account config for this bot
    const accountConfig = this.config.accounts[botName];
    if (!accountConfig || !accountConfig.accountId) {
      console.log(`[Router] ❌ No account configured for bot: ${botName}`);
      return { success: false, error: 'Account not configured' };
    }
    
    // Map symbol
    const symbol = this.mapSymbol(alert.ticker);
    if (!symbol) {
      console.log(`[Router] ❌ Unknown symbol: ${alert.ticker}`);
      return { success: false, error: 'Unknown symbol' };
    }
    
    try {
      let result;
      
      switch (alert.action) {
        case 'buy':
        case 'sell':
          result = await this.handleEntry(alert, accountConfig, symbol);
          break;
          
        case 'exit':
          result = await this.handleExit(alert, accountConfig, symbol);
          break;
          
        case 'cancel':
          result = await this.handleCancel(alert, accountConfig, symbol);
          break;
          
        default:
          console.log(`[Router] Unknown action: ${alert.action}`);
          return { success: false, error: 'Unknown action' };
      }
      
      this.dailyStats.trades++;
      console.log(`[Router] ✅ Order processed | Daily trades: ${this.dailyStats.trades}`);
      
      return result;
      
    } catch (err) {
      console.error(`[Router] ❌ Order error:`, err.message);
      return { success: false, error: err.message };
    }
  }
  
  /**
   * Handle entry orders (buy/sell)
   */
  async handleEntry(alert, accountConfig, symbol) {
    const action = alert.action === 'buy' ? 'Buy' : 'Sell';
    const quantity = parseInt(alert.quantity) || 1;
    
    // Check position limits
    if (quantity > accountConfig.maxPosition) {
      console.log(`[Router] ⚠️ Quantity ${quantity} exceeds max ${accountConfig.maxPosition}`);
    }
    
    let result;
    
    if (alert.orderType === 'limit' && alert.limitPrice) {
      result = await this.client.placeLimitOrder(
        accountConfig.accountId,
        symbol,
        action,
        quantity,
        parseFloat(alert.limitPrice)
      );
    } else if (alert.orderType === 'stop' && alert.stopPrice) {
      result = await this.client.placeStopOrder(
        accountConfig.accountId,
        symbol,
        action,
        quantity,
        parseFloat(alert.stopPrice)
      );
    } else {
      // Default to market order
      result = await this.client.placeMarketOrder(
        accountConfig.accountId,
        symbol,
        action,
        quantity
      );
    }
    
    return { success: true, order: result };
  }
  
  /**
   * Handle exit orders
   */
  async handleExit(alert, accountConfig, symbol) {
    // Exit = flatten the position
    const result = await this.client.flattenPosition(
      accountConfig.accountId,
      symbol
    );
    
    return { success: true, order: result };
  }
  
  /**
   * Handle order cancellation
   */
  async handleCancel(alert, accountConfig, symbol) {
    // Cancel all open orders for this symbol
    // TODO: Track and cancel specific orders
    console.log(`[Router] Cancel requested - would cancel open orders for ${symbol}`);
    
    return { success: true, message: 'Cancel processed' };
  }
  
  /**
   * Map ticker symbol to Tradovate contract
   */
  mapSymbol(ticker) {
    if (!ticker) return null;
    
    // Clean ticker (remove exchange prefix if any)
    const clean = ticker.replace(/^[A-Z]+:/, '').toUpperCase();
    
    // Check direct mapping
    if (this.config.symbols[clean]) {
      return this.config.symbols[clean];
    }
    
    // Check if already a full symbol (e.g., MNQH2026)
    if (clean.length > 3) {
      return clean;
    }
    
    console.log(`[Router] ⚠️ No mapping for symbol: ${ticker}`);
    return null;
  }
  
  /**
   * Check risk limits
   */
  checkRiskLimits() {
    const risk = this.config.risk;
    
    // Check daily trade limit
    if (this.dailyStats.trades >= risk.maxDailyTrades) {
      console.log(`[Router] Max daily trades reached: ${this.dailyStats.trades}/${risk.maxDailyTrades}`);
      return false;
    }
    
    // Check daily P&L limit
    if (this.dailyStats.pnl <= risk.maxDailyLoss) {
      console.log(`[Router] Max daily loss reached: $${this.dailyStats.pnl}`);
      return false;
    }
    
    return true;
  }
  
  /**
   * Update P&L (call when receiving fill updates)
   */
  updatePnL(pnl) {
    this.dailyStats.pnl += pnl;
    console.log(`[Router] Daily P&L: $${this.dailyStats.pnl.toFixed(2)}`);
  }
}

module.exports = OrderRouter;
