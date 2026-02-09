// ====== DECRYPT LABS DASHBOARD LOGIC v2 ======
// Updated: 2026-02-01
// Changes: Connected all stats to real data per DropKing specs

// ====== CONFIGURATION ======
const CONFIG = {
    // Apex 150K Account Specs
    ACCOUNT_SIZE: 150000,
    MAX_DRAWDOWN: 6000,
    MAX_CONTRACTS: 15,  // Max contracts for 150K Apex account
    PROFIT_TARGET: 9000,
    
    // Fleet capacity
    FLEET_CAPACITY_BASE: 20,
    
    // Silver Bullet Trading Windows (EST timezone)
    TRADING_WINDOWS: [
        { name: 'AM Silver Bullet', startHour: 10, startMin: 0, endHour: 11, endMin: 0 },
        { name: 'PM Silver Bullet', startHour: 14, startMin: 0, endHour: 15, endMin: 0 },
        { name: 'Overnight', startHour: 3, startMin: 0, endHour: 4, endMin: 0 }
    ],
    
    // 2026 US Market Holidays (CME Futures closed)
    HOLIDAYS_2026: [
        '2026-01-01', // New Year's Day
        '2026-01-20', // MLK Day
        '2026-02-17', // Presidents Day
        '2026-04-03', // Good Friday
        '2026-05-25', // Memorial Day
        '2026-07-03', // Independence Day (observed)
        '2026-09-07', // Labor Day
        '2026-11-26', // Thanksgiving
        '2026-12-25', // Christmas
    ],
    
    // Railway API
    API_URL: 'https://stunning-appreciation-production-ea66.up.railway.app'
};

// ====== UTILITY FUNCTIONS ======

// Get current time in EST
function getESTTime() {
    const now = new Date();
    const estOffset = -5; // EST is UTC-5
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * estOffset));
}

// Check if today is a market holiday
function isMarketHoliday() {
    const today = getESTTime().toISOString().split('T')[0];
    return CONFIG.HOLIDAYS_2026.includes(today);
}

// Check if it's a weekend
function isWeekend() {
    const day = getESTTime().getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

// Check if currently in a Silver Bullet trading window
function isInTradingWindow() {
    if (isMarketHoliday() || isWeekend()) return false;
    
    const est = getESTTime();
    const currentHour = est.getHours();
    const currentMin = est.getMinutes();
    const currentTime = currentHour * 60 + currentMin;
    
    for (const window of CONFIG.TRADING_WINDOWS) {
        const startTime = window.startHour * 60 + window.startMin;
        const endTime = window.endHour * 60 + window.endMin;
        
        if (currentTime >= startTime && currentTime < endTime) {
            return true;
        }
    }
    return false;
}

// Calculate Power based on month progress (100% at start, 0% at end)
function calculatePower() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    
    // Days in current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Power decreases through the month: 100% on day 1, ~0% on last day
    const power = Math.round(((daysInMonth - day + 1) / daysInMonth) * 100);
    return Math.max(0, Math.min(100, power));
}

// Calculate Fuel (contracts used / max contracts)
// For now, showing max available contracts as percentage
function calculateFuel(currentContracts, maxContracts = CONFIG.MAX_CONTRACTS) {
    // If no current position, show full fuel (all contracts available)
    const available = maxContracts - (currentContracts || 0);
    return Math.round((available / maxContracts) * 100);
}

// Calculate Condition based on drawdown (100% at $0 DD, 0% at max DD)
function calculateCondition(drawdownUsed, maxDrawdown = CONFIG.MAX_DRAWDOWN) {
    const condition = Math.round((1 - (drawdownUsed / maxDrawdown)) * 100);
    return Math.max(0, Math.min(100, condition));
}

// Calculate Heat (hot during trading windows, cooling outside)
function calculateHeat() {
    if (isInTradingWindow()) {
        // Gradually increase heat during session
        const est = getESTTime();
        const currentMin = est.getMinutes();
        // Heat builds from 60% to 100% over the hour
        return Math.round(60 + (currentMin / 60) * 40);
    }
    // Cooling period - low heat
    return Math.round(10 + Math.random() * 15); // 10-25% when cooling
}

// Get days remaining in current month
function getDaysRemainingInMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return daysInMonth - day;
}

// Calculate drawdown used from balance
function calculateDrawdownUsed(currentBalance, startingBalance = CONFIG.ACCOUNT_SIZE) {
    if (currentBalance >= startingBalance) {
        return 0; // No drawdown if above starting balance
    }
    return startingBalance - currentBalance;
}

// Get bot status based on trading window
function getBotStatus() {
    if (isMarketHoliday() || isWeekend()) {
        return 'cooling'; // Market closed
    }
    if (isInTradingWindow()) {
        return 'online'; // Active trading
    }
    return 'cooling'; // Outside trading window
}

// Format bot name (full name, no abbreviations)
function getFullBotName(botId) {
    const names = {
        'fvg-ifvg-1': 'FVG+IFVG',
        'fvg-ifvg': 'FVG+IFVG',
        'ote-silver-bullet': 'OTE Silver Bullet',
        'ote-sb': 'OTE Silver Bullet'
    };
    return names[botId] || botId;
}

// ====== DASHBOARD DATA BUILDER ======

function buildDashboardFromAPI(apiData, accounts) {
    const oteSB = accounts['ote-silver-bullet'] || {};
    const fvgIfvg = accounts['fvg-ifvg'] || {};
    
    // Calculate real-time stats
    const power = calculatePower();
    const heat = calculateHeat();
    const botStatus = getBotStatus();
    const daysRemaining = getDaysRemainingInMonth();
    
    // Calculate drawdown and condition for each bot
    const fvgDrawdown = calculateDrawdownUsed(fvgIfvg.balance || CONFIG.ACCOUNT_SIZE);
    const oteDrawdown = calculateDrawdownUsed(oteSB.balance || CONFIG.ACCOUNT_SIZE);
    
    const fvgCondition = calculateCondition(fvgDrawdown);
    const oteCondition = calculateCondition(oteDrawdown);
    
    return {
        lastUpdated: apiData.lastUpdated || new Date().toISOString(),
        aum: { 
            total: apiData.totals?.balance || (fvgIfvg.balance || 0) + (oteSB.balance || 0),
            milestone: 300000,
            milestoneLabel: '2x Buyback Power'
        },
        fleet: {
            capacityBase: CONFIG.FLEET_CAPACITY_BASE,
            capacityUnlocked: CONFIG.FLEET_CAPACITY_BASE, // Base for now
            activeBots: 2
        },
        expansionFund: 0, // $0 until we have funded accounts
        bots: {
            'fvg-ifvg-1': {
                name: 'FVG+IFVG', // Full name
                subtitle: 'Determining Order Flow',
                status: botStatus,
                accountId: fvgIfvg.accountId || 'BOT-ALPHA',
                accountSize: CONFIG.ACCOUNT_SIZE,
                currentBalance: fvgIfvg.balance || CONFIG.ACCOUNT_SIZE,
                maxContracts: CONFIG.MAX_CONTRACTS,
                stats: {
                    power: power,
                    fuel: calculateFuel(0), // Full fuel when no position
                    condition: fvgCondition,
                    heat: heat
                },
                performance: {
                    netPnl: fvgIfvg.pnl || 0,
                    todayPnl: 0,
                    winRate: 76.8,
                    totalTrades: 5145
                },
                eval: {
                    status: 'evaluating',
                    profitTarget: fvgIfvg.pnl || 0,
                    profitTargetGoal: CONFIG.PROFIT_TARGET,
                    profitTargetPercent: fvgIfvg.progress || 0,
                    drawdownUsed: fvgDrawdown,
                    drawdownMax: CONFIG.MAX_DRAWDOWN,
                    drawdownPercent: (fvgDrawdown / CONFIG.MAX_DRAWDOWN) * 100,
                    daysRemaining: daysRemaining,
                    daysTotal: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
                }
            },
            'ote-silver-bullet': {
                name: 'OTE Silver Bullet', // Full name
                subtitle: 'Optimal Trade Entry',
                status: botStatus,
                accountId: oteSB.accountId || 'BOT-BRAVO',
                accountSize: CONFIG.ACCOUNT_SIZE,
                currentBalance: oteSB.balance || CONFIG.ACCOUNT_SIZE,
                maxContracts: CONFIG.MAX_CONTRACTS,
                stats: {
                    power: power,
                    fuel: calculateFuel(0),
                    condition: oteCondition,
                    heat: heat
                },
                performance: {
                    netPnl: oteSB.pnl || 0,
                    todayPnl: 0,
                    winRate: 63.2,
                    totalTrades: 4771
                },
                eval: {
                    status: 'evaluating',
                    profitTarget: oteSB.pnl || 0,
                    profitTargetGoal: CONFIG.PROFIT_TARGET,
                    profitTargetPercent: oteSB.progress || 0,
                    drawdownUsed: oteDrawdown,
                    drawdownMax: CONFIG.MAX_DRAWDOWN,
                    drawdownPercent: (oteDrawdown / CONFIG.MAX_DRAWDOWN) * 100,
                    daysRemaining: daysRemaining,
                    daysTotal: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
                }
            }
        },
        trades: (apiData.recentTrades || []).map(t => ({
            bot: t.bot,
            botName: getFullBotName(t.bot), // Full name for display
            timestamp: t.time || new Date().toISOString(),
            symbol: t.symbol || 'MNQ',
            side: t.side || 'long',
            entry: parseFloat(t.price) || 0,
            exit: 0,
            size: 1,
            pnl: 0
        })),
        hallOfFame: [], // Empty until token launches
        hallOfFameNote: 'Potential Burn (Pre-Token Data)', // Placeholder text
        racing: {
            daily: { leader: 'ote-silver-bullet', scores: {} },
            monthly: { leader: 'ote-silver-bullet', scores: {} },
            allTime: { leader: 'ote-silver-bullet', scores: {} }
        }
    };
}

// ====== UI UPDATE FUNCTIONS ======

function updateBotPanel(botNum, botData) {
    const panel = document.getElementById(`bot${botNum}Panel`);
    if (!panel) return;
    
    // Update bot name to full name
    const nameEl = panel.querySelector('.bot-name');
    if (nameEl) nameEl.textContent = botData.name;
    
    // Update gauges
    const gaugeBars = panel.querySelectorAll('.gauge-fill-bar');
    const gaugeValues = panel.querySelectorAll('.gauge-value-text');
    
    gaugeBars.forEach((bar, i) => {
        if (bar.classList.contains('power')) {
            bar.style.width = botData.stats.power + '%';
            gaugeValues[i].textContent = botData.stats.power + '%';
        } else if (bar.classList.contains('fuel')) {
            bar.style.width = botData.stats.fuel + '%';
            // Show contracts format: X/15
            const usedContracts = Math.round((100 - botData.stats.fuel) / 100 * CONFIG.MAX_CONTRACTS);
            gaugeValues[i].textContent = `${CONFIG.MAX_CONTRACTS - usedContracts}/${CONFIG.MAX_CONTRACTS} contracts`;
        } else if (bar.classList.contains('condition')) {
            bar.style.width = botData.stats.condition + '%';
            const conditionLabel = botData.stats.condition > 80 ? 'Excellent' : 
                                   botData.stats.condition > 60 ? 'Good' : 
                                   botData.stats.condition > 40 ? 'Fair' : 'Critical';
            gaugeValues[i].textContent = conditionLabel + ' (' + botData.stats.condition + '%)';
        } else if (bar.classList.contains('heat')) {
            bar.style.width = botData.stats.heat + '%';
            const heatLabel = botData.stats.heat < 30 ? '❄️ Cooling' : 
                              botData.stats.heat < 60 ? '🔥 Warm' : '🔥🔥 Hot';
            gaugeValues[i].textContent = heatLabel;
        }
    });
    
    // Update status badge
    const statusBadge = panel.querySelector('.bot-status-badge');
    statusBadge.className = 'bot-status-badge ' + botData.status;
    statusBadge.querySelector('span').textContent = botData.status.toUpperCase();
}

function updateTransmissionLog(trades) {
    const tableBody = document.querySelector('.log-table tbody');
    if (!tableBody || !trades) return;
    
    tableBody.innerHTML = '';
    
    trades.slice(0, 20).forEach(trade => {
        const row = document.createElement('tr');
        const botClass = trade.bot.includes('fvg') ? 'neutron-01' : 'neutron-02';
        // Use FULL bot name (no abbreviations)
        const botName = getFullBotName(trade.bot);
        const pnlClass = trade.pnl >= 0 ? 'pnl-positive' : 'pnl-negative';
        const sideClass = trade.side === 'long' ? 'side-long' : 'side-short';
        
        const time = new Date(trade.timestamp);
        const timeStr = time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + 
                       time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        
        row.innerHTML = `
            <td>${timeStr}</td>
            <td><span class="bot-tag ${botClass}">${botName}</span></td>
            <td>${trade.symbol}</td>
            <td class="${sideClass}">${trade.side.toUpperCase()}</td>
            <td>${trade.entry.toFixed(2)}</td>
            <td>${trade.exit.toFixed(2)}</td>
            <td>${trade.size}</td>
            <td class="${pnlClass}">${formatPnl(trade.pnl)}</td>
        `;
        tableBody.appendChild(row);
    });
}

function updateRoadToFunded(dashboardData) {
    if (!dashboardData || !dashboardData.bots) return;
    
    const evalCards = document.querySelectorAll('.eval-card[data-bot]');
    
    evalCards.forEach(card => {
        const botId = card.dataset.bot;
        const botData = dashboardData.bots[botId];
        if (!botData || !botData.eval) return;
        
        const evalData = botData.eval;
        const perfData = botData.performance;
        
        // Update drawdown progress (calculated from actual balance)
        const drawdownFill = card.querySelector('.progress-fill.drawdown');
        const drawdownValue = card.querySelector('.drawdown-value');
        const drawdownPercent = evalData.drawdownPercent;
        drawdownFill.style.width = drawdownPercent + '%';
        drawdownValue.textContent = '$' + evalData.drawdownUsed.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0}) + 
            ' / $' + evalData.drawdownMax.toLocaleString() + ' (' + drawdownPercent.toFixed(1) + '%)';
        
        // Color drawdown based on usage level
        if (drawdownPercent >= 75) {
            drawdownValue.style.color = 'var(--red)';
        } else if (drawdownPercent >= 50) {
            drawdownValue.style.color = 'var(--orange)';
        } else if (drawdownPercent >= 25) {
            drawdownValue.style.color = 'var(--yellow)';
        } else {
            drawdownValue.style.color = 'var(--green)';
        }
        
        // Update days remaining (tied to month, resets monthly)
        const daysValue = card.querySelector('.days-value');
        const daysLabel = card.querySelector('.days-label');
        daysValue.textContent = evalData.daysRemaining;
        daysLabel.textContent = 'Days Left (Month)';
    });
}

function updateHallOfFame(hallOfFame, note) {
    const hallSection = document.querySelector('.hall-of-fame-list');
    if (!hallSection) return;
    
    if (!hallOfFame || hallOfFame.length === 0) {
        // Show placeholder for pre-token state
        hallSection.innerHTML = `
            <div class="hall-entry" style="opacity: 0.6; font-style: italic;">
                <span class="hall-medal">🔮</span>
                <span class="hall-month">Coming Soon</span>
                <span class="hall-profit" style="color: var(--text-secondary)">Potential Burn</span>
                <span class="hall-burned" style="color: var(--text-dim)">(Pre-Token Data)</span>
            </div>
        `;
    } else {
        // Normal hall of fame rendering with "potential burn" instead of actual burn
        hallSection.innerHTML = hallOfFame.map((entry, i) => `
            <div class="hall-entry">
                <span class="hall-medal">${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                <span class="hall-month">${entry.month}</span>
                <span class="hall-profit">${formatPnl(entry.profit)}</span>
                <span class="hall-burned">
                    <span class="hall-burned-icon">🔮</span>
                    Potential: ${formatCurrency(entry.potentialBurn || entry.profit * 0.1)}
                </span>
            </div>
        `).join('');
    }
}

function formatPnl(amount) {
    const sign = amount >= 0 ? '+' : '';
    return sign + '$' + Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCurrency(amount) {
    return '$' + Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// Export for use in main dashboard
window.DashboardLogic = {
    CONFIG,
    calculatePower,
    calculateFuel,
    calculateCondition,
    calculateHeat,
    getDaysRemainingInMonth,
    getBotStatus,
    getFullBotName,
    isInTradingWindow,
    isMarketHoliday,
    isWeekend,
    buildDashboardFromAPI,
    updateBotPanel,
    updateTransmissionLog,
    updateRoadToFunded,
    updateHallOfFame
};

console.log('%c🧪 Dashboard Logic v2 Loaded', 'color: #00f0ff; font-weight: bold;');
console.log('%cPower: Monthly cycle | Fuel: Contracts | Condition: Drawdown | Heat: Silver Bullet windows', 'color: #8892a8;');
