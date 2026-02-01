// ================================================
// DECRYPT LABS - CONTRACT CONFIGURATION
// ================================================
// Update these addresses when deploying to mainnet!
// ================================================

const CONTRACTS = {
  // Network
  chainId: 84532, // Base Sepolia (testnet)
  chainName: "Base Sepolia",
  rpcUrl: "https://sepolia.base.org",
  blockExplorer: "https://sepolia.basescan.org",
  
  // Contract Addresses (Base Sepolia - Testnet)
  addresses: {
    cipher: "0x85075b6E79FEB545F30e60151f467ff17FD3E8BB",
    botNFT: "0xc267113C4E6f4421B28e51093583eABeC9E201c8",
    botFleet: "0xFB85e2790F12eC12c672B991F9485E52b9329352",
    fuelManager: "0xD28Ca185e4B539bedB2019A6Bc10bCC3CB533b85",
    rewardsDistributor: "0xE7B5e151f05975F441301BC6ac37EDd2013029f6",
    tierGate: "0x08c7C46434B8d0c5cEa538278711df0051C0fCA1"
  },

  // Pricing
  mintPrice: "300", // 300 $CIPHER
  fuelPrice: "175", // 175 $CIPHER per month
  
  // NFT Config
  maxSupply: 20,
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
