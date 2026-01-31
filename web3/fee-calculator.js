/**
 * Decrypt Labs — Maintenance Fee Calculator
 * Calculates fee breakdown from monthly profits (NET after costs)
 * 
 * IMPORTANT: "Profit" = NET profit AFTER:
 * - Prop firm fees (activation, monthly, etc.)
 * - Data feed costs
 * - Platform fees (TradersPost, etc.)
 * - Server/infrastructure costs
 * - Estimated taxes (quarterly set-aside ~25-30%)
 */

const FEE_BREAKDOWN = {
  buyback: 0.40,      // 40% → Token buyback & burn
  treasury: 0.20,     // 20% → Operations, listings, legal, infra
  engineers: 0.20,    // 20% → Team compensation
  fuel: 0.10,         // 10% → Account scaling (grow AUM)
  repairs: 0.05,      // 5%  → Drawdown recovery buffer
  insurance: 0.05     // 5%  → Emergency reserve (black swan)
};

const TAX_RATE = 0.30; // Estimated 30% for taxes (federal + state + self-employment)

/**
 * Calculate gross-to-net after estimated taxes
 * @param {number} grossProfit - Gross profit before taxes
 * @returns {number} Net profit after tax set-aside
 */
function calculateNetAfterTaxes(grossProfit) {
  const taxSetAside = grossProfit * TAX_RATE;
  return grossProfit - taxSetAside;
}

/**
 * Calculate full maintenance fee breakdown
 * @param {number} netProfit - NET profit after all costs and taxes
 * @returns {object} Breakdown of all fee allocations
 */
function calculateFeeBreakdown(netProfit) {
  const breakdown = {
    input: {
      netProfit: netProfit,
      currency: 'USD'
    },
    allocations: {},
    totals: {
      allocated: 0,
      buybackUSD: 0
    },
    timestamp: new Date().toISOString()
  };

  // Calculate each allocation
  for (const [key, percentage] of Object.entries(FEE_BREAKDOWN)) {
    const amount = netProfit * percentage;
    breakdown.allocations[key] = {
      percentage: percentage * 100,
      amount: Math.round(amount * 100) / 100,
      label: getFeeLabel(key)
    };
    breakdown.totals.allocated += amount;
  }

  breakdown.totals.allocated = Math.round(breakdown.totals.allocated * 100) / 100;
  breakdown.totals.buybackUSD = breakdown.allocations.buyback.amount;

  return breakdown;
}

/**
 * Calculate buyback from gross profit (convenience function)
 * Includes tax deduction
 * @param {number} grossProfit - Gross profit before taxes
 * @returns {object} Full breakdown including tax set-aside
 */
function calculateFromGrossProfit(grossProfit) {
  const taxSetAside = grossProfit * TAX_RATE;
  const netProfit = grossProfit - taxSetAside;
  const breakdown = calculateFeeBreakdown(netProfit);
  
  // Add gross profit info
  breakdown.input.grossProfit = grossProfit;
  breakdown.input.taxSetAside = Math.round(taxSetAside * 100) / 100;
  breakdown.input.taxRate = TAX_RATE * 100;
  
  return breakdown;
}

/**
 * Get human-readable label for fee category
 */
function getFeeLabel(key) {
  const labels = {
    buyback: '🔥 Buybacks (Token Burns)',
    treasury: '🏦 Treasury (Operations)',
    engineers: '👨‍🔬 Engineers (Team)',
    fuel: '⛽ Fuel (Account Scaling)',
    repairs: '🔧 Repairs (Drawdown Buffer)',
    insurance: '🛡️ Insurance (Emergency)'
  };
  return labels[key] || key;
}

/**
 * Format breakdown for display
 * @param {object} breakdown - Result from calculateFeeBreakdown
 * @returns {string} Formatted string for display
 */
function formatBreakdown(breakdown) {
  let output = `\n📊 MAINTENANCE FEE BREAKDOWN\n`;
  output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  
  if (breakdown.input.grossProfit) {
    output += `Gross Profit:     $${breakdown.input.grossProfit.toLocaleString()}\n`;
    output += `Tax Set-Aside:    -$${breakdown.input.taxSetAside.toLocaleString()} (${breakdown.input.taxRate}%)\n`;
    output += `Net Profit:       $${breakdown.input.netProfit.toLocaleString()}\n`;
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  }
  
  for (const [key, data] of Object.entries(breakdown.allocations)) {
    output += `${data.label}\n`;
    output += `  ${data.percentage}% → $${data.amount.toLocaleString()}\n`;
  }
  
  output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  output += `💰 BUYBACK AMOUNT: $${breakdown.totals.buybackUSD.toLocaleString()}\n`;
  
  return output;
}

/**
 * Monthly projection based on AUM
 * @param {number} aum - Assets Under Management
 * @param {number} monthlyReturnPercent - Expected monthly return (default 3%)
 * @returns {object} Projected breakdown
 */
function projectMonthlyBuyback(aum, monthlyReturnPercent = 3) {
  const grossProfit = aum * (monthlyReturnPercent / 100);
  return calculateFromGrossProfit(grossProfit);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FEE_BREAKDOWN,
    TAX_RATE,
    calculateNetAfterTaxes,
    calculateFeeBreakdown,
    calculateFromGrossProfit,
    formatBreakdown,
    projectMonthlyBuyback
  };
}

// Browser global
if (typeof window !== 'undefined') {
  window.DecryptFeeCalculator = {
    FEE_BREAKDOWN,
    TAX_RATE,
    calculateNetAfterTaxes,
    calculateFeeBreakdown,
    calculateFromGrossProfit,
    formatBreakdown,
    projectMonthlyBuyback
  };
}

// Example usage (can be removed in production)
/*
const example = calculateFromGrossProfit(10000);
console.log(formatBreakdown(example));

// Output:
// 📊 MAINTENANCE FEE BREAKDOWN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Gross Profit:     $10,000
// Tax Set-Aside:    -$3,000 (30%)
// Net Profit:       $7,000
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔥 Buybacks (Token Burns)
//   40% → $2,800
// 🏦 Treasury (Operations)
//   20% → $1,400
// 👨‍🔬 Engineers (Team)
//   20% → $1,400
// ⛽ Fuel (Account Scaling)
//   10% → $700
// 🔧 Repairs (Drawdown Buffer)
//   5% → $350
// 🛡️ Insurance (Emergency)
//   5% → $350
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💰 BUYBACK AMOUNT: $2,800
*/
