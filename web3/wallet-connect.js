/**
 * Decrypt Labs — Web3 Wallet Integration
 * Handles wallet connection, token balance checking, and holder tier verification
 * 
 * Chain: Base (Coinbase L2)
 * Token: $DECRYPT (TBD - update after launch)
 */

// ============================================
// CONFIGURATION (Update after token launch)
// ============================================

const CONFIG = {
  // Base Mainnet
  chainId: 8453,
  chainName: 'Base',
  rpcUrl: 'https://mainnet.base.org',
  blockExplorer: 'https://basescan.org',
  
  // Token Contract (UPDATE AFTER LAUNCH)
  tokenAddress: '0x0000000000000000000000000000000000000000', // PLACEHOLDER
  tokenSymbol: '$DECRYPT',
  tokenDecimals: 18,
  
  // Burn Address
  burnAddress: '0x000000000000000000000000000000000000dEaD',
  
  // Holder Tiers (in token units, not wei)
  tiers: {
    diamond: { min: 1000000, label: '💎 Diamond', color: '#b9f2ff' },
    gold: { min: 200000, label: '🥇 Gold', color: '#ffd700' },
    silver: { min: 50000, label: '🥈 Silver', color: '#c0c0c0' },
    bronze: { min: 10000, label: '🥉 Bronze', color: '#cd7f32' },
    none: { min: 0, label: '👀 Spectator', color: '#666' }
  }
};

// ============================================
// STATE
// ============================================

let state = {
  connected: false,
  address: null,
  balance: 0,
  tier: 'none',
  provider: null,
  signer: null
};

// ============================================
// WALLET CONNECTION
// ============================================

/**
 * Check if MetaMask or compatible wallet is installed
 */
function isWalletInstalled() {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
}

/**
 * Connect to wallet
 * @returns {Promise<object>} Connection result with address
 */
async function connectWallet() {
  if (!isWalletInstalled()) {
    throw new Error('No Web3 wallet detected. Please install MetaMask or Coinbase Wallet.');
  }

  try {
    // Request account access
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });
    
    if (accounts.length === 0) {
      throw new Error('No accounts found. Please unlock your wallet.');
    }

    state.address = accounts[0];
    state.connected = true;

    // Check if on Base network
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (parseInt(chainId, 16) !== CONFIG.chainId) {
      await switchToBase();
    }

    // Get token balance
    await refreshBalance();

    // Emit connection event
    dispatchEvent('walletConnected', { address: state.address, tier: state.tier });

    return {
      success: true,
      address: state.address,
      balance: state.balance,
      tier: state.tier
    };

  } catch (error) {
    console.error('Wallet connection failed:', error);
    throw error;
  }
}

/**
 * Disconnect wallet
 */
function disconnectWallet() {
  state = {
    connected: false,
    address: null,
    balance: 0,
    tier: 'none',
    provider: null,
    signer: null
  };
  dispatchEvent('walletDisconnected', {});
}

/**
 * Switch to Base network
 */
async function switchToBase() {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x' + CONFIG.chainId.toString(16) }]
    });
  } catch (switchError) {
    // Chain not added, add it
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x' + CONFIG.chainId.toString(16),
          chainName: CONFIG.chainName,
          nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
          rpcUrls: [CONFIG.rpcUrl],
          blockExplorerUrls: [CONFIG.blockExplorer]
        }]
      });
    } else {
      throw switchError;
    }
  }
}

// ============================================
// TOKEN BALANCE & TIERS
// ============================================

/**
 * Get token balance for an address
 * @param {string} address - Wallet address
 * @returns {Promise<number>} Token balance (in tokens, not wei)
 */
async function getTokenBalance(address) {
  if (CONFIG.tokenAddress === '0x0000000000000000000000000000000000000000') {
    console.warn('Token address not set - returning mock balance');
    return 0;
  }

  // ERC20 balanceOf ABI
  const balanceOfData = '0x70a08231000000000000000000000000' + address.slice(2);
  
  try {
    const result = await window.ethereum.request({
      method: 'eth_call',
      params: [{
        to: CONFIG.tokenAddress,
        data: balanceOfData
      }, 'latest']
    });
    
    // Convert from wei to tokens
    const balanceWei = BigInt(result);
    const balance = Number(balanceWei / BigInt(10 ** CONFIG.tokenDecimals));
    
    return balance;
  } catch (error) {
    console.error('Failed to get token balance:', error);
    return 0;
  }
}

/**
 * Refresh current wallet balance and tier
 */
async function refreshBalance() {
  if (!state.connected || !state.address) return;
  
  state.balance = await getTokenBalance(state.address);
  state.tier = calculateTier(state.balance);
  
  dispatchEvent('balanceUpdated', { 
    balance: state.balance, 
    tier: state.tier 
  });
}

/**
 * Calculate holder tier based on balance
 * @param {number} balance - Token balance
 * @returns {string} Tier key
 */
function calculateTier(balance) {
  if (balance >= CONFIG.tiers.diamond.min) return 'diamond';
  if (balance >= CONFIG.tiers.gold.min) return 'gold';
  if (balance >= CONFIG.tiers.silver.min) return 'silver';
  if (balance >= CONFIG.tiers.bronze.min) return 'bronze';
  return 'none';
}

/**
 * Get tier info
 * @param {string} tierKey - Tier key
 * @returns {object} Tier configuration
 */
function getTierInfo(tierKey) {
  return CONFIG.tiers[tierKey] || CONFIG.tiers.none;
}

// ============================================
// BURN TRACKING
// ============================================

/**
 * Get total burned tokens
 * @returns {Promise<number>} Total burned tokens
 */
async function getTotalBurned() {
  return await getTokenBalance(CONFIG.burnAddress);
}

/**
 * Get circulating supply (total - burned)
 * @returns {Promise<object>} Supply info
 */
async function getSupplyInfo() {
  const totalSupply = 1000000000; // 1 billion
  const burned = await getTotalBurned();
  const circulating = totalSupply - burned;
  
  return {
    total: totalSupply,
    burned: burned,
    circulating: circulating,
    burnedPercent: (burned / totalSupply) * 100
  };
}

// ============================================
// EVENT HELPERS
// ============================================

function dispatchEvent(name, detail) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(`decrypt:${name}`, { detail }));
  }
}

// ============================================
// WALLET EVENT LISTENERS
// ============================================

function setupWalletListeners() {
  if (!isWalletInstalled()) return;

  // Account changed
  window.ethereum.on('accountsChanged', async (accounts) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      state.address = accounts[0];
      await refreshBalance();
      dispatchEvent('accountChanged', { address: state.address });
    }
  });

  // Chain changed
  window.ethereum.on('chainChanged', (chainId) => {
    const newChainId = parseInt(chainId, 16);
    if (newChainId !== CONFIG.chainId) {
      dispatchEvent('wrongNetwork', { chainId: newChainId, expected: CONFIG.chainId });
    }
  });
}

// ============================================
// INITIALIZATION
// ============================================

function init() {
  setupWalletListeners();
  
  // Check if already connected
  if (isWalletInstalled() && window.ethereum.selectedAddress) {
    state.address = window.ethereum.selectedAddress;
    state.connected = true;
    refreshBalance();
  }
}

// Auto-init on load
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

// ============================================
// EXPORTS
// ============================================

const DecryptWallet = {
  // Config
  CONFIG,
  
  // State
  getState: () => ({ ...state }),
  isConnected: () => state.connected,
  getAddress: () => state.address,
  getBalance: () => state.balance,
  getTier: () => state.tier,
  
  // Actions
  connect: connectWallet,
  disconnect: disconnectWallet,
  refreshBalance,
  switchToBase,
  
  // Token
  getTokenBalance,
  calculateTier,
  getTierInfo,
  getTotalBurned,
  getSupplyInfo,
  
  // Helpers
  isWalletInstalled
};

// Node.js exports
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DecryptWallet;
}

// Browser global
if (typeof window !== 'undefined') {
  window.DecryptWallet = DecryptWallet;
}
