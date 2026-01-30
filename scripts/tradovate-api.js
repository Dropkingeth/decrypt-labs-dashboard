#!/usr/bin/env node
/**
 * Tradovate API Client for Decrypt Labs
 * 
 * Fetches account data, positions, P&L from Apex/Tradovate accounts
 * and updates the dashboard data.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load config
const CONFIG_PATH = path.join(__dirname, 'tradovate-config.json');
const DATA_PATH = path.join(__dirname, '..', 'dashboard', 'data.json');

let config;
try {
  config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
} catch (e) {
  console.error('❌ Config not found. Copy tradovate-config.json and add your credentials.');
  process.exit(1);
}

// API URLs
const BASE_URL = config.environment === 'live' 
  ? 'https://live.tradovateapi.com/v1'
  : 'https://demo.tradovateapi.com/v1';

let accessToken = null;
let tokenExpiry = null;

/**
 * Make HTTPS request
 */
function request(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    if (accessToken) {
      options.headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

/**
 * Authenticate with Tradovate
 */
async function authenticate() {
  console.log('🔐 Authenticating with Tradovate...');
  
  const authBody = {
    name: config.username,
    password: config.password,
    appId: config.appId,
    appVersion: config.appVersion,
    deviceId: config.deviceId,
    cid: config.cid,
    sec: config.sec
  };

  const response = await request('POST', '/auth/accesstokenrequest', authBody);
  
  if (response.status !== 200 || response.data.errorText) {
    console.error('❌ Authentication failed:', response.data.errorText || response.data);
    return false;
  }

  accessToken = response.data.accessToken;
  tokenExpiry = Date.now() + (response.data.expirationTime * 1000);
  
  console.log('✅ Authenticated successfully!');
  console.log(`   User ID: ${response.data.userId}`);
  console.log(`   Token expires: ${new Date(tokenExpiry).toLocaleString()}`);
  
  return true;
}

/**
 * Get all accounts
 */
async function getAccounts() {
  console.log('📊 Fetching accounts...');
  const response = await request('GET', '/account/list');
  
  if (response.status !== 200) {
    console.error('❌ Failed to fetch accounts:', response.data);
    return [];
  }
  
  return response.data;
}

/**
 * Get account balance/cash
 */
async function getCashBalance(accountId) {
  const response = await request('GET', `/cashBalance/getcashbalancesnapshot?accountId=${accountId}`);
  
  if (response.status !== 200) {
    return null;
  }
  
  return response.data;
}

/**
 * Get positions for an account
 */
async function getPositions(accountId) {
  const response = await request('GET', `/position/list?accountId=${accountId}`);
  
  if (response.status !== 200) {
    return [];
  }
  
  return response.data || [];
}

/**
 * Get order history
 */
async function getOrders(accountId) {
  const response = await request('GET', `/order/list?accountId=${accountId}`);
  
  if (response.status !== 200) {
    return [];
  }
  
  return response.data || [];
}

/**
 * Get fills (executed trades)
 */
async function getFills(accountId) {
  const response = await request('GET', `/fill/list?accountId=${accountId}`);
  
  if (response.status !== 200) {
    return [];
  }
  
  return response.data || [];
}

/**
 * Get account risk status (drawdown, etc)
 */
async function getAccountRiskStatus(accountId) {
  const response = await request('GET', `/userAccountRiskParameter/list?accountId=${accountId}`);
  
  if (response.status !== 200) {
    return null;
  }
  
  return response.data;
}

/**
 * Main function - fetch all data and update dashboard
 */
async function main() {
  console.log('🚀 Decrypt Labs - Tradovate Data Sync');
  console.log('=====================================\n');

  // Authenticate
  const authed = await authenticate();
  if (!authed) {
    process.exit(1);
  }

  console.log('');

  // Get accounts
  const accounts = await getAccounts();
  
  if (accounts.length === 0) {
    console.log('⚠️  No accounts found.');
    process.exit(0);
  }

  console.log(`\n📋 Found ${accounts.length} account(s):\n`);

  for (const account of accounts) {
    console.log(`   Account: ${account.name} (ID: ${account.id})`);
    console.log(`   Status: ${account.active ? '🟢 Active' : '🔴 Inactive'}`);
    
    // Get cash balance
    const cashBalance = await getCashBalance(account.id);
    if (cashBalance) {
      console.log(`   Cash Balance: $${cashBalance.cashBalance?.toFixed(2) || 'N/A'}`);
      console.log(`   Realized P&L: $${cashBalance.realizedPnL?.toFixed(2) || 'N/A'}`);
      console.log(`   Unrealized P&L: $${cashBalance.unrealizedPnL?.toFixed(2) || 'N/A'}`);
    }

    // Get positions
    const positions = await getPositions(account.id);
    console.log(`   Open Positions: ${positions.length}`);
    
    // Get fills
    const fills = await getFills(account.id);
    console.log(`   Total Fills: ${fills.length}`);

    console.log('');
  }

  // Update data.json
  console.log('📝 Updating dashboard data...');
  
  try {
    let dashboardData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    
    // Update with fresh data
    dashboardData.lastUpdated = new Date().toISOString();
    
    // Update account data (map to bots)
    // You'll need to customize this mapping based on your account setup
    for (let i = 0; i < accounts.length && i < 2; i++) {
      const account = accounts[i];
      const cashBalance = await getCashBalance(account.id);
      const fills = await getFills(account.id);
      
      const botKey = i === 0 ? 'fvg-ifvg-1' : 'ote-silver-bullet';
      
      if (dashboardData.bots[botKey] && cashBalance) {
        dashboardData.bots[botKey].currentBalance = cashBalance.cashBalance || 150000;
        dashboardData.bots[botKey].stats.fuel = Math.round((cashBalance.cashBalance / 150000) * 100);
        dashboardData.bots[botKey].performance.netPnl = cashBalance.realizedPnL || 0;
        dashboardData.bots[botKey].performance.todayPnl = cashBalance.unrealizedPnL || 0;
        dashboardData.bots[botKey].performance.totalTrades = fills.length;
      }
    }
    
    fs.writeFileSync(DATA_PATH, JSON.stringify(dashboardData, null, 2));
    console.log('✅ Dashboard data updated!');
    
  } catch (e) {
    console.error('❌ Failed to update dashboard data:', e.message);
  }

  console.log('\n🎉 Sync complete!');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  authenticate,
  getAccounts,
  getCashBalance,
  getPositions,
  getOrders,
  getFills
};
