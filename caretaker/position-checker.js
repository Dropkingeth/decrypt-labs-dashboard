/**
 * Position Checker
 * 
 * Checks actual positions via Tradovate browser
 * Returns position data for comparison with expected
 */

class PositionChecker {
  constructor() {
    this.accounts = {
      'BOT-ALPHA': { name: 'Account 1 (014)', bots: ['ote-silver-bullet', 'fvg-ifvg'] },
      'BOT-BRAVO': { name: 'Account 2 (018)', bots: ['ote-refined', 'ote-refined-small'] }
    };
    
    this.lastCheck = null;
    this.lastPositions = [];
  }
  
  /**
   * Parse position data from Tradovate snapshot
   * Returns: { account, symbol, position, equity, openPL, price }
   */
  parseSnapshot(snapshot) {
    const data = {
      account: null,
      equity: null,
      openPL: null,
      position: 0,
      symbol: null,
      lastPrice: null,
      bid: null,
      ask: null,
      timestamp: new Date().toISOString()
    };
    
    // Extract account number (look for BOT pattern)
    const accountMatch = snapshot.match(/BOT-[A-Z]+/);
    if (accountMatch) {
      data.account = accountMatch[0];
    }
    
    // Extract equity (look for pattern like "150,017.12 usd")
    const equityMatch = snapshot.match(/Equity[^\d]*([\d,]+\.?\d*)\s*usd/i);
    if (equityMatch) {
      data.equity = parseFloat(equityMatch[1].replace(/,/g, ''));
    }
    
    // Extract Open P/L
    const plMatch = snapshot.match(/Open P\/L[^\d-]*([-\d,]+\.?\d*)\s*usd/i);
    if (plMatch) {
      data.openPL = parseFloat(plMatch[1].replace(/,/g, ''));
    }
    
    // Extract position size (look for "Position" followed by number)
    const posMatch = snapshot.match(/Position[^\d-]*([-\d]+)/i);
    if (posMatch) {
      data.position = parseInt(posMatch[1]);
    }
    
    // Extract symbol (MNQH6, etc)
    const symbolMatch = snapshot.match(/(MNQ|NQ|MES|ES)[A-Z]\d/);
    if (symbolMatch) {
      data.symbol = symbolMatch[0];
    }
    
    // Extract last price
    const priceMatch = snapshot.match(/LAST[^\d]*([\d,]+\.?\d*)/i);
    if (priceMatch) {
      data.lastPrice = parseFloat(priceMatch[1].replace(/,/g, ''));
    }
    
    return data;
  }
  
  /**
   * Get bot names associated with an account
   */
  getBotsForAccount(accountId) {
    const account = this.accounts[accountId];
    return account ? account.bots : [];
  }
  
  /**
   * Get account for a bot
   */
  getAccountForBot(botName) {
    for (const [accountId, config] of Object.entries(this.accounts)) {
      if (config.bots.includes(botName)) {
        return accountId;
      }
    }
    return null;
  }
  
  /**
   * Format position for logging
   */
  formatPosition(data) {
    const side = data.position > 0 ? 'LONG' : data.position < 0 ? 'SHORT' : 'FLAT';
    const size = Math.abs(data.position);
    return `${data.account}: ${side} ${size} ${data.symbol || 'MNQ'} | P/L: $${data.openPL?.toFixed(2) || '0.00'}`;
  }
}

module.exports = PositionChecker;
