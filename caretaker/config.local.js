/**
 * Trade Caretaker Configuration (LOCAL - DO NOT COMMIT)
 * 
 * TradersPost webhook URLs for retry signals
 */

module.exports = {
  // Dashboard authentication
  auth: {
    enabled: true,
    password: 'decrypt2026!',  // Change this!
    sessionSecret: 'caretaker-session-' + Math.random().toString(36).slice(2)
  },
  
  // TradersPost webhooks per strategy
  tradersPostWebhooks: {
    'ote-silver-bullet': 'https://webhooks.traderspost.io/trading/webhook/f008918a-7923-4a44-8983-734dcb774cf7/fe1f26376964e8b109ed701439fb7a16',
    'fvg-ifvg': 'https://webhooks.traderspost.io/trading/webhook/d1504eeb-0491-4a24-8dfa-de7f98098209/92e8e401312c2a8be48237dafa04caf4',
    'ote-refined': 'https://webhooks.traderspost.io/trading/webhook/cad24957-3bb7-45f2-960c-42d3f52ef34e/529c2901e390b6c5d00ea842be571648',
    'ote-refined-small': 'https://webhooks.traderspost.io/trading/webhook/3f2753ee-973d-4501-8f32-c499ddae21cd/a7766e90eca1ccd4ff644851e19a15f9'
  },
  
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
    tradingDays: [1, 2, 3, 4, 5],  // Mon-Fri
    sessions: [
      { name: 'NY_AM', start: '09:45', end: '11:00' },
      { name: 'NY_PM', start: '13:45', end: '16:00' }
    ],
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
