/**
 * Tradovate API Client
 * 
 * Handles authentication and order execution with Tradovate/Apex
 */

const https = require('https');
const WebSocket = require('ws');

class TradovateClient {
  constructor(config) {
    this.config = config;
    this.env = config.tradovate[config.tradovate.env];
    this.credentials = config.tradovate.credentials;
    
    this.accessToken = null;
    this.tokenExpiry = null;
    this.userId = null;
    this.accounts = [];
    
    this.ws = null;
    this.wsConnected = false;
    this.requestId = 1;
    this.pendingRequests = new Map();
    
    console.log(`[Tradovate] Initialized for ${config.tradovate.env} environment`);
  }
  
  // =========================================================================
  // AUTHENTICATION
  // =========================================================================
  
  async authenticate() {
    console.log('[Tradovate] Authenticating...');
    
    const authData = {
      name: this.credentials.username,
      password: this.credentials.password,
      appId: this.credentials.appId,
      appVersion: this.credentials.appVersion,
      cid: this.credentials.cid,
      sec: this.credentials.sec
    };
    
    try {
      const response = await this.httpRequest('POST', '/auth/accesstokenrequest', authData);
      
      if (response.accessToken) {
        this.accessToken = response.accessToken;
        this.tokenExpiry = new Date(response.expirationTime);
        this.userId = response.userId;
        
        console.log(`[Tradovate] ✅ Authenticated as user ${this.userId}`);
        console.log(`[Tradovate] Token expires: ${this.tokenExpiry.toISOString()}`);
        
        // Fetch accounts
        await this.fetchAccounts();
        
        return true;
      } else {
        console.error('[Tradovate] ❌ Auth failed:', response);
        return false;
      }
    } catch (err) {
      console.error('[Tradovate] ❌ Auth error:', err.message);
      return false;
    }
  }
  
  async fetchAccounts() {
    const accounts = await this.httpRequest('GET', '/account/list');
    this.accounts = accounts || [];
    console.log(`[Tradovate] Found ${this.accounts.length} accounts`);
    this.accounts.forEach(acc => {
      console.log(`  • ${acc.name} (ID: ${acc.id})`);
    });
    return this.accounts;
  }
  
  isTokenValid() {
    if (!this.accessToken || !this.tokenExpiry) return false;
    // Refresh if less than 5 minutes remaining
    return new Date() < new Date(this.tokenExpiry.getTime() - 5 * 60 * 1000);
  }
  
  async ensureAuthenticated() {
    if (!this.isTokenValid()) {
      return await this.authenticate();
    }
    return true;
  }
  
  // =========================================================================
  // HTTP REQUESTS
  // =========================================================================
  
  httpRequest(method, endpoint, data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(this.env.apiUrl + endpoint);
      
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
      
      if (this.accessToken) {
        options.headers['Authorization'] = `Bearer ${this.accessToken}`;
      }
      
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(json);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(json)}`));
            }
          } catch (e) {
            reject(new Error(`Invalid JSON: ${body}`));
          }
        });
      });
      
      req.on('error', reject);
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }
  
  // =========================================================================
  // WEBSOCKET CONNECTION
  // =========================================================================
  
  async connectWebSocket() {
    if (!await this.ensureAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    return new Promise((resolve, reject) => {
      console.log('[Tradovate] Connecting WebSocket...');
      
      this.ws = new WebSocket(this.env.wsUrl);
      
      this.ws.on('open', () => {
        console.log('[Tradovate] WebSocket connected, authorizing...');
        this.wsSend('authorize', '', { token: this.accessToken });
      });
      
      this.ws.on('message', (data) => {
        this.handleWsMessage(data.toString());
      });
      
      this.ws.on('close', () => {
        console.log('[Tradovate] WebSocket disconnected');
        this.wsConnected = false;
      });
      
      this.ws.on('error', (err) => {
        console.error('[Tradovate] WebSocket error:', err.message);
        reject(err);
      });
      
      // Wait for auth confirmation
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket auth timeout'));
      }, 10000);
      
      this.once('authorized', () => {
        clearTimeout(timeout);
        this.wsConnected = true;
        console.log('[Tradovate] ✅ WebSocket authorized');
        resolve();
      });
    });
  }
  
  wsSend(url, query = '', body = {}) {
    const id = this.requestId++;
    const message = `${url}\n${id}\n${query}\n${JSON.stringify(body)}`;
    this.ws.send(message);
    return id;
  }
  
  handleWsMessage(data) {
    // Parse frame: type\nid\ndata
    const lines = data.split('\n');
    if (lines.length < 2) return;
    
    const type = lines[0];
    const id = parseInt(lines[1]) || 0;
    const payload = lines.slice(2).join('\n');
    
    try {
      const json = payload ? JSON.parse(payload) : {};
      
      // Handle auth response
      if (type === 'a' && json.s === 200) {
        this.emit('authorized');
      }
      
      // Handle order updates
      if (json.e === 'props' && json.d) {
        this.emit('update', json.d);
      }
      
      // Resolve pending request
      if (this.pendingRequests.has(id)) {
        const { resolve } = this.pendingRequests.get(id);
        this.pendingRequests.delete(id);
        resolve(json);
      }
      
    } catch (e) {
      console.error('[Tradovate] WS parse error:', e.message);
    }
  }
  
  // Simple event emitter
  _events = {};
  on(event, fn) { (this._events[event] = this._events[event] || []).push(fn); }
  once(event, fn) { const wrapper = (...args) => { this.off(event, wrapper); fn(...args); }; this.on(event, wrapper); }
  off(event, fn) { this._events[event] = (this._events[event] || []).filter(f => f !== fn); }
  emit(event, ...args) { (this._events[event] || []).forEach(fn => fn(...args)); }
  
  // =========================================================================
  // ORDER OPERATIONS
  // =========================================================================
  
  /**
   * Place a market order
   */
  async placeMarketOrder(accountId, symbol, action, quantity) {
    if (!await this.ensureAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    const order = {
      accountId: accountId,
      action: action,           // 'Buy' or 'Sell'
      symbol: symbol,
      orderQty: quantity,
      orderType: 'Market',
      isAutomated: true
    };
    
    console.log(`[Tradovate] Placing MARKET order:`, order);
    
    const response = await this.httpRequest('POST', '/order/placeorder', order);
    console.log(`[Tradovate] Order response:`, response);
    
    return response;
  }
  
  /**
   * Place a limit order
   */
  async placeLimitOrder(accountId, symbol, action, quantity, price) {
    if (!await this.ensureAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    const order = {
      accountId: accountId,
      action: action,
      symbol: symbol,
      orderQty: quantity,
      orderType: 'Limit',
      price: price,
      isAutomated: true
    };
    
    console.log(`[Tradovate] Placing LIMIT order:`, order);
    
    const response = await this.httpRequest('POST', '/order/placeorder', order);
    console.log(`[Tradovate] Order response:`, response);
    
    return response;
  }
  
  /**
   * Place a stop order
   */
  async placeStopOrder(accountId, symbol, action, quantity, stopPrice) {
    if (!await this.ensureAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    const order = {
      accountId: accountId,
      action: action,
      symbol: symbol,
      orderQty: quantity,
      orderType: 'Stop',
      stopPrice: stopPrice,
      isAutomated: true
    };
    
    console.log(`[Tradovate] Placing STOP order:`, order);
    
    const response = await this.httpRequest('POST', '/order/placeorder', order);
    console.log(`[Tradovate] Order response:`, response);
    
    return response;
  }
  
  /**
   * Cancel an order
   */
  async cancelOrder(orderId) {
    if (!await this.ensureAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    console.log(`[Tradovate] Canceling order ${orderId}`);
    
    const response = await this.httpRequest('POST', '/order/cancelorder', { orderId });
    console.log(`[Tradovate] Cancel response:`, response);
    
    return response;
  }
  
  /**
   * Get current positions
   */
  async getPositions(accountId) {
    if (!await this.ensureAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    const positions = await this.httpRequest('GET', `/position/list?accountId=${accountId}`);
    return positions || [];
  }
  
  /**
   * Flatten a position (close all)
   */
  async flattenPosition(accountId, symbol) {
    const positions = await this.getPositions(accountId);
    const position = positions.find(p => p.contractId && p.netPos !== 0);
    
    if (!position) {
      console.log('[Tradovate] No position to flatten');
      return null;
    }
    
    const action = position.netPos > 0 ? 'Sell' : 'Buy';
    const quantity = Math.abs(position.netPos);
    
    return await this.placeMarketOrder(accountId, symbol, action, quantity);
  }
  
  /**
   * Get account summary
   */
  async getAccountSummary(accountId) {
    if (!await this.ensureAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    const summary = await this.httpRequest('GET', `/cashBalance/getCashBalanceSnapshot?accountId=${accountId}`);
    return summary;
  }
}

module.exports = TradovateClient;
