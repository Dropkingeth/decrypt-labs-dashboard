/**
 * Tradovate Bridge Configuration
 * 
 * ⚠️ IMPORTANT: Copy this to config.local.js and fill in your credentials
 * Never commit config.local.js to git!
 */

module.exports = {
  // Server settings
  port: process.env.PORT || 3457,
  
  // Tradovate API
  tradovate: {
    // Demo environment (for testing)
    demo: {
      apiUrl: 'https://demo.tradovateapi.com/v1',
      wsUrl: 'wss://demo.tradovateapi.com/v1/websocket',
      mdUrl: 'wss://md-demo.tradovateapi.com/v1/websocket'
    },
    // Live environment
    live: {
      apiUrl: 'https://live.tradovateapi.com/v1',
      wsUrl: 'wss://live.tradovateapi.com/v1/websocket',
      mdUrl: 'wss://md.tradovateapi.com/v1/websocket'
    },
    
    // Which environment to use
    env: process.env.TRADOVATE_ENV || 'demo',
    
    // Credentials (set these in config.local.js or environment variables)
    credentials: {
      username: process.env.TRADOVATE_USERNAME || '',
      password: process.env.TRADOVATE_PASSWORD || '',
      appId: process.env.TRADOVATE_APP_ID || 'DecryptLabs',
      appVersion: '1.0.0',
      cid: process.env.TRADOVATE_CID || '',        // Client ID
      sec: process.env.TRADOVATE_SECRET || ''       // Client Secret
    }
  },
  
  // Account mapping - map bot names to account IDs
  accounts: {
    'ote-silver-bullet': {
      accountId: process.env.ACCOUNT_OTE_SB || null,
      accountSpec: process.env.ACCOUNT_SPEC_OTE_SB || null,
      maxPosition: 12  // Maximum contracts
    },
    'ote-refined': {
      accountId: process.env.ACCOUNT_OTE_REFINED || null,
      accountSpec: process.env.ACCOUNT_SPEC_OTE_REFINED || null,
      maxPosition: 12
    },
    'ote-refined-small': {
      accountId: process.env.ACCOUNT_OTE_REFINED_SMALL || null,
      accountSpec: process.env.ACCOUNT_SPEC_OTE_REFINED_SMALL || null,
      maxPosition: 6
    },
    'fvg-ifvg': {
      accountId: process.env.ACCOUNT_FVG_IFVG || null,
      accountSpec: process.env.ACCOUNT_FVG_IFVG || null,
      maxPosition: 12
    }
  },
  
  // Symbol mapping
  symbols: {
    'MNQ': 'MNQH5',   // Micro Nasdaq - update contract month as needed
    'NQ': 'NQH5',     // Nasdaq
    'MES': 'MESH5',   // Micro S&P
    'ES': 'ESH5'      // S&P
  },
  
  // Risk settings
  risk: {
    maxDailyLoss: -500,           // Stop trading if daily P&L drops below this
    maxDailyTrades: 20,           // Maximum trades per day
    requireConfirmation: false    // Require manual confirmation for orders
  },
  
  // Logging
  logging: {
    level: 'info',  // debug, info, warn, error
    file: './logs/tradovate-bridge.log'
  }
};
