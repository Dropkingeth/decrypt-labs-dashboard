/**
 * Trade Caretaker Configuration
 * 
 * ⚠️ Copy to config.local.js and fill in your TradersPost webhook URL
 */

module.exports = {
  // TradersPost webhook URL for retry signals
  // Format: https://traderspost.io/trading/webhook/XXXXX/XXXXX
  tradersPostWebhook: process.env.TRADERSPOST_WEBHOOK || '',
  
  // How long to wait before checking if order filled (ms)
  verifyDelay: 30000,  // 30 seconds
  
  // Max retries for failed orders
  maxRetries: 3,
  
  // Alert settings
  alerts: {
    telegram: true,
    discord: false
  },
  
  // Trading schedule (NY timezone)
  schedule: {
    // Days: 0=Sun, 1=Mon, ... 6=Sat
    tradingDays: [1, 2, 3, 4, 5],  // Mon-Fri
    
    // Session windows
    sessions: [
      { name: 'NY_AM', start: '09:45', end: '11:00' },
      { name: 'NY_PM', start: '13:45', end: '16:00' }
    ],
    
    // EOD flatten check time
    eodCheck: '16:00'
  },
  
  // Position check interval during active session (ms)
  checkInterval: 60000,  // 1 minute
  
  // Symbols to monitor
  symbols: ['MNQ', 'NQ', 'MES', 'ES'],
  
  // Bots to monitor
  bots: [
    'ote-silver-bullet',
    'ote-refined',
    'ote-refined-small',
    'fvg-ifvg'
  ]
};
