/**
 * Decrypt Labs — Tier-Based Access Control
 * Controls access to indicators and strategies based on token holdings
 */

// ============================================
// TIER DEFINITIONS
// ============================================

const TIERS = {
  diamond: {
    minTokens: 1000000,
    label: '💎 Diamond',
    color: '#b9f2ff',
    gradient: 'linear-gradient(135deg, #b9f2ff 0%, #89CFF0 50%, #4169E1 100%)',
    benefits: [
      'All 4 ICT Strategies',
      'ICT HTF Pro Indicator',
      'Real-time Alerts',
      'Priority Support',
      'Governance Voting',
      'Early Access to New Strategies',
      'Private Discord Channel'
    ],
    access: {
      indicators: ['ict-htf-pro'],
      strategies: ['fvg-ifvg', 'silver-bullet', 'refined-high', 'refined-low'],
      alerts: true,
      governance: true,
      priority: true,
      privateChannel: true
    }
  },
  gold: {
    minTokens: 200000,
    label: '🥇 Gold',
    color: '#ffd700',
    gradient: 'linear-gradient(135deg, #ffd700 0%, #ffb700 50%, #ff9500 100%)',
    benefits: [
      'All 4 ICT Strategies',
      'ICT HTF Pro Indicator',
      'Real-time Alerts',
      'Standard Support'
    ],
    access: {
      indicators: ['ict-htf-pro'],
      strategies: ['fvg-ifvg', 'silver-bullet', 'refined-high', 'refined-low'],
      alerts: true,
      governance: false,
      priority: false,
      privateChannel: false
    }
  },
  silver: {
    minTokens: 50000,
    label: '🥈 Silver',
    color: '#c0c0c0',
    gradient: 'linear-gradient(135deg, #e8e8e8 0%, #c0c0c0 50%, #a8a8a8 100%)',
    benefits: [
      'ICT HTF Pro Indicator',
      '2 Strategies (FVG+IFVG, Silver Bullet)',
      'Daily Alerts Summary'
    ],
    access: {
      indicators: ['ict-htf-pro'],
      strategies: ['fvg-ifvg', 'silver-bullet'],
      alerts: 'daily', // daily summary only
      governance: false,
      priority: false,
      privateChannel: false
    }
  },
  bronze: {
    minTokens: 10000,
    label: '🥉 Bronze',
    color: '#cd7f32',
    gradient: 'linear-gradient(135deg, #cd7f32 0%, #b87333 50%, #8b4513 100%)',
    benefits: [
      'ICT HTF Pro Indicator',
      'Weekly Performance Reports'
    ],
    access: {
      indicators: ['ict-htf-pro'],
      strategies: [],
      alerts: false,
      governance: false,
      priority: false,
      privateChannel: false
    }
  },
  spectator: {
    minTokens: 0,
    label: '👀 Spectator',
    color: '#666666',
    gradient: 'linear-gradient(135deg, #666666 0%, #555555 50%, #444444 100%)',
    benefits: [
      'Dashboard View Only',
      'Public Performance Stats'
    ],
    access: {
      indicators: [],
      strategies: [],
      alerts: false,
      governance: false,
      priority: false,
      privateChannel: false
    }
  }
};

// ============================================
// PRODUCTS
// ============================================

const PRODUCTS = {
  indicators: {
    'ict-htf-pro': {
      name: 'ICT HTF Pro',
      description: 'Higher Timeframe Analysis Indicator',
      tradingViewId: 'PUB;xxxxxxxx', // TradingView publication ID
      minTier: 'bronze'
    }
  },
  strategies: {
    'fvg-ifvg': {
      name: 'FVG+IFVG (Order Flow)',
      description: 'Determining Order Flow Strategy',
      winRate: 76.68,
      profit: 62119,
      tradingViewId: 'PUB;yyyyyyyy',
      minTier: 'silver'
    },
    'silver-bullet': {
      name: 'Silver Bullet',
      description: 'Optimal Trade Entry - Time-based Killzones',
      winRate: 62.54,
      profit: 72357,
      tradingViewId: 'PUB;zzzzzzzz',
      minTier: 'silver'
    },
    'refined-high': {
      name: 'Refined High',
      description: 'Aggressive OTE Strategy',
      winRate: 69.04,
      profit: 191410,
      tradingViewId: 'PUB;aaaaaaaa',
      minTier: 'gold'
    },
    'refined-low': {
      name: 'Refined Low',
      description: 'Conservative OTE Strategy',
      winRate: 69.04,
      profit: 92772,
      tradingViewId: 'PUB;bbbbbbbb',
      minTier: 'gold'
    }
  }
};

// ============================================
// ACCESS CONTROL FUNCTIONS
// ============================================

/**
 * Get tier from token balance
 * @param {number} balance - Token balance
 * @returns {string} Tier key
 */
function getTierFromBalance(balance) {
  if (balance >= TIERS.diamond.minTokens) return 'diamond';
  if (balance >= TIERS.gold.minTokens) return 'gold';
  if (balance >= TIERS.silver.minTokens) return 'silver';
  if (balance >= TIERS.bronze.minTokens) return 'bronze';
  return 'spectator';
}

/**
 * Get tier info
 * @param {string} tierKey - Tier key
 * @returns {object} Tier configuration
 */
function getTierInfo(tierKey) {
  return TIERS[tierKey] || TIERS.spectator;
}

/**
 * Check if user has access to a product
 * @param {string} tierKey - User's tier
 * @param {string} productType - 'indicators' or 'strategies'
 * @param {string} productId - Product identifier
 * @returns {boolean} Has access
 */
function hasAccess(tierKey, productType, productId) {
  const tier = TIERS[tierKey];
  if (!tier) return false;
  
  const accessList = tier.access[productType];
  if (!accessList) return false;
  
  return accessList.includes(productId);
}

/**
 * Get all products user has access to
 * @param {string} tierKey - User's tier
 * @returns {object} Accessible products
 */
function getAccessibleProducts(tierKey) {
  const tier = TIERS[tierKey];
  if (!tier) return { indicators: [], strategies: [] };
  
  return {
    indicators: tier.access.indicators.map(id => ({
      id,
      ...PRODUCTS.indicators[id]
    })),
    strategies: tier.access.strategies.map(id => ({
      id,
      ...PRODUCTS.strategies[id]
    })),
    alerts: tier.access.alerts,
    governance: tier.access.governance,
    priority: tier.access.priority,
    privateChannel: tier.access.privateChannel
  };
}

/**
 * Get upgrade path for a tier
 * @param {string} currentTier - Current tier
 * @returns {object|null} Next tier info or null if at max
 */
function getUpgradePath(currentTier) {
  const tierOrder = ['spectator', 'bronze', 'silver', 'gold', 'diamond'];
  const currentIndex = tierOrder.indexOf(currentTier);
  
  if (currentIndex === -1 || currentIndex >= tierOrder.length - 1) {
    return null;
  }
  
  const nextTierKey = tierOrder[currentIndex + 1];
  const nextTier = TIERS[nextTierKey];
  const currentTokens = TIERS[currentTier]?.minTokens || 0;
  
  return {
    nextTier: nextTierKey,
    nextTierInfo: nextTier,
    tokensNeeded: nextTier.minTokens - currentTokens,
    newBenefits: nextTier.benefits.filter(b => 
      !TIERS[currentTier]?.benefits?.includes(b)
    )
  };
}

/**
 * Generate access summary for display
 * @param {string} tierKey - User's tier
 * @param {number} balance - Token balance
 * @returns {object} Summary for UI
 */
function generateAccessSummary(tierKey, balance) {
  const tier = getTierInfo(tierKey);
  const accessible = getAccessibleProducts(tierKey);
  const upgrade = getUpgradePath(tierKey);
  
  return {
    tier: tierKey,
    tierInfo: tier,
    balance: balance,
    balanceFormatted: balance.toLocaleString(),
    
    // Access counts
    indicatorCount: accessible.indicators.length,
    strategyCount: accessible.strategies.length,
    totalIndicators: Object.keys(PRODUCTS.indicators).length,
    totalStrategies: Object.keys(PRODUCTS.strategies).length,
    
    // What they have
    accessible: accessible,
    
    // Upgrade info
    canUpgrade: !!upgrade,
    upgrade: upgrade,
    
    // For UI
    progressToNext: upgrade 
      ? Math.min(100, (balance / TIERS[upgrade.nextTier].minTokens) * 100)
      : 100
  };
}

// ============================================
// EXPORTS
// ============================================

const DecryptAccess = {
  TIERS,
  PRODUCTS,
  getTierFromBalance,
  getTierInfo,
  hasAccess,
  getAccessibleProducts,
  getUpgradePath,
  generateAccessSummary
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DecryptAccess;
}

if (typeof window !== 'undefined') {
  window.DecryptAccess = DecryptAccess;
}
