// ================================================
// DECRYPT LABS - CONTRACT CONFIGURATION
// ================================================
// Update these addresses when deploying to mainnet!
// ================================================

const CONTRACTS = {
  // Network
  chainId: 8453, // Base Mainnet
  chainName: "Base",
  rpcUrl: "https://mainnet.base.org",
  blockExplorer: "https://basescan.org",
  
  // Contract Addresses (Base Mainnet)
  addresses: {
    botNFT: "0x743EBDfcED2dBA082E282689c35D5c0E173C7728",
    // Supporting contracts (deploy later with $CIPHER token)
    cipher: "",
    botFleet: "",
    fuelManager: "",
    rewardsDistributor: "",
    tierGate: ""
  },

  // Pricing
  mintPrice: "0.1", // 0.1 ETH
  fuelPrice: "TBD", // Set after $CIPHER launch
  
  // NFT Config
  maxSupply: 36,
  strategies: [
    { id: 0, name: "OTE Silver Bullet", risk: "Medium", description: "Trades all valid OTE setups" },
    { id: 1, name: "FVG+IFVG", risk: "Medium", description: "Fair Value Gap + Inverse FVG" },
    { id: 2, name: "OTE Refined (High Risk)", risk: "High", description: "Selective days, larger size" },
    { id: 3, name: "OTE Refined (Low Risk)", risk: "Low", description: "Selective days, conservative" }
  ],

  // Tier Thresholds
  tiers: {
    bronze: "100000",  // 100k $CIPHER
    gold: "500000",    // 500k $CIPHER
    diamond: "1300000" // 1.3M $CIPHER
  }
};

// For ES modules
if (typeof module !== 'undefined') {
  module.exports = CONTRACTS;
}
