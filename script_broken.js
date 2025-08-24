// Game state - Database simulation
let gameState = {
    currentPlayer: '',
    currentPlayerId: '', // Unique player ID
    moonCount: 0,
    rugCount: 0,
    totalFlips: 0,
    isFlipping: false,
    
    // Database tables simulation
    players: [], // { id, username, total_moons, total_rugs, total_flips, lastPlayed, deviceId, sessionId }
    flips: [], // { id, playerId, username, result, timestamp }
    
    // UI state
    activeTab: 'moons'
};

// Extreme stats tracking
const extremeStats = {
    currentStreak: { player: '', count: 0, type: '' }, // Current streak tracking
    dailyStats: { date: '', moons: 0, rugs: 0, total: 0 }, // Daily aggregate stats
    funnyStats: {
        taxPaid: {}, // username: count of rugs (taxes paid)
        liquidityBurned: 0, // global rug counter
        devBuysBack: 0, // global moon counter
        devAllocation: 100, // Dev starts with 100% allocation
        communityMood: 'neutral' // 'mooning', 'rugging', 'neutral'
    }
};

// Generate unique device fingerprint
function generateDeviceFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);
    
    const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        canvas.toDataURL(),
        navigator.hardwareConcurrency || 'unknown'
    ].join('|');
    
    // Generate a hash from the fingerprint
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    return 'device_' + Math.abs(hash).toString(36) + '_' + Date.now().toString(36);
}

// Generate unique session ID
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 12);
}

// Get or create device ID
function getDeviceId() {
    let deviceId = localStorage.getItem('flipcoin_device_id');
    if (!deviceId) {
        deviceId = generateDeviceFingerprint();
        localStorage.setItem('flipcoin_device_id', deviceId);
    }
    return deviceId;
}

// Notification System
class NotificationManager {
    constructor() {
        this.container = document.getElementById('notificationContainer');
        this.notifications = [];
    }
    
    show(type, title, message, duration = 5000) {
        const notification = this.createNotification(type, title, message);
        this.container.appendChild(notification);
        this.notifications.push(notification);
        
        // Trigger animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.remove(notification);
            }, duration);
        }
        
        return notification;
    }
    
    createNotification(type, title, message) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            moon: '🌙',
            rug: '💸'
        };
        
        notification.innerHTML = `
            <div class="notification-header">
                <span class="notification-icon">${icons[type] || 'ℹ️'}</span>
                <h4 class="notification-title">${title}</h4>
            </div>
            <p class="notification-message">${message}</p>
            <button class="notification-close" onclick="notificationManager.remove(this.parentElement)">×</button>
        `;
        
        return notification;
    }
    
    remove(notification) {
        if (!notification || !notification.parentElement) return;
        
        notification.classList.add('hide');
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.parentElement.removeChild(notification);
            }
            const index = this.notifications.indexOf(notification);
            if (index > -1) {
                this.notifications.splice(index, 1);
            }
        }, 400);
    }
    
    success(title, message, duration = 4000) {
        return this.show('success', title, message, duration);
    }
    
    error(title, message, duration = 6000) {
        return this.show('error', title, message, duration);
    }
    
    warning(title, message, duration = 5000) {
        return this.show('warning', title, message, duration);
    }
    
    info(title, message, duration = 4000) {
        return this.show('info', title, message, duration);
    }
    
    moon(title, message, duration = 3000) {
        return this.show('moon', title, message, duration);
    }
    
    rug(title, message, duration = 3000) {
        return this.show('rug', title, message, duration);
    }
    
    clear() {
        this.notifications.forEach(notification => {
            this.remove(notification);
        });
    }
}

// Initialize notification manager
const notificationManager = new NotificationManager();

// Load saved data from localStorage
function loadGameData() {
    try {
        // Load players database
        const savedPlayers = localStorage.getItem('flipGamePlayers');
        if (savedPlayers) {
            gameState.players = JSON.parse(savedPlayers);
        }
        
        // Load flips database
        const savedFlips = localStorage.getItem('flipGameFlips');
        if (savedFlips) {
            gameState.flips = JSON.parse(savedFlips);
        }
        
        // Load extreme stats
        const savedExtremeStats = localStorage.getItem('flipGameExtremeStats');
        if (savedExtremeStats) {
            const loadedStats = JSON.parse(savedExtremeStats);
            // Merge with defaults to handle new properties
            Object.assign(extremeStats, loadedStats);
        }
        
        // Load current session data with device verification
        const savedSessionData = localStorage.getItem('flipGameSession');
        if (savedSessionData) {
            const sessionData = JSON.parse(savedSessionData);
            const currentDeviceId = getDeviceId();
            
            // Find player by device ID and username to verify they belong to this device
            const playerData = gameState.players.find(p => 
                p.username === sessionData.currentPlayer && 
                p.deviceId === currentDeviceId
            );
            
            if (playerData) {
                gameState.currentPlayer = sessionData.currentPlayer;
                gameState.currentPlayerId = playerData.id;
                gameState.moonCount = playerData.total_moons || 0;
                gameState.rugCount = playerData.total_rugs || 0;
                gameState.totalFlips = playerData.total_flips || 0;
                
                console.log('🔐 Session verified for device:', currentDeviceId.slice(0, 12) + '...');
            } else {
                // Session doesn't match this device - clear it
                localStorage.removeItem('flipGameSession');
                console.log('🚫 Session cleared - device mismatch');
            }
        }
        
        console.log('✅ Database loaded successfully');
        console.log('� Players:', gameState.players.length);
        console.log('🎯 Total flips recorded:', gameState.flips.length);
        if (gameState.currentPlayer) {
            console.log('👤 Current player:', gameState.currentPlayer);
        }
    } catch (error) {
        console.error('❌ Error loading database:', error);
        // Reset to default state if data is corrupted
        gameState.players = [];
        gameState.flips = [];
        gameState.currentPlayer = '';
        gameState.moonCount = 0;
        gameState.rugCount = 0;
        gameState.totalFlips = 0;
    }
}

// Save game data to localStorage
function saveGameData() {
    try {
        // Show saving status
        updateDataStatus('saving', '💾 Saving...');
        
        // Save players database
        localStorage.setItem('flipGamePlayers', JSON.stringify(gameState.players));
        
        // Save flips database (keep only last 1000 flips to prevent storage overflow)
        const recentFlips = gameState.flips.slice(-1000);
        gameState.flips = recentFlips;
        localStorage.setItem('flipGameFlips', JSON.stringify(gameState.flips));
        
        // Save extreme stats
        localStorage.setItem('flipGameExtremeStats', JSON.stringify(extremeStats));
        
        // Save current session info with device binding
        if (gameState.currentPlayer && gameState.currentPlayerId) {
            const sessionData = {
                currentPlayer: gameState.currentPlayer,
                playerId: gameState.currentPlayerId,
                deviceId: getDeviceId(),
                timestamp: new Date().getTime()
            };
            localStorage.setItem('flipGameSession', JSON.stringify(sessionData));
        }
        
        // Auto-save backup
        setTimeout(() => {
            const backupData = {
                players: gameState.players,
                flips: gameState.flips.slice(-100), // Last 100 flips only for backup
                extremeStats: extremeStats,
                timestamp: new Date().getTime(),
                version: '3.1'
            };
            localStorage.setItem('flipGameBackup', JSON.stringify(backupData));
        }, 100);
        
        // Show success status
        updateDataStatus('saved', '💾 Database Saved');
        console.log('💾 Database saved successfully');
    } catch (error) {
        console.error('❌ Error saving database:', error);
        updateDataStatus('error', '❌ Save Failed');
        notificationManager.error('Save Failed!', 'Could not save database. Your progress might be lost on refresh. ⚠️');
    }
}

// Update data status indicator
function updateDataStatus(status, message) {
    const dataStatus = document.getElementById('dataStatus');
    const indicator = dataStatus.querySelector('.data-indicator');
    
    // Remove all status classes
    dataStatus.classList.remove('saving', 'error');
    
    // Add appropriate class
    if (status === 'saving') {
        dataStatus.classList.add('saving');
    } else if (status === 'error') {
        dataStatus.classList.add('error');
    }
    
    // Update message
    indicator.textContent = message;
    
    // Auto-revert to saved status after 3 seconds
    if (status === 'saving' || status === 'error') {
        setTimeout(() => {
            if (status !== 'error') {
                dataStatus.classList.remove('saving', 'error');
                indicator.textContent = '💾 Data Auto-Saved';
            }
        }, 3000);
    }
}

// Initialize the game
function initGame() {
    console.log('🚀 Initializing FlipCoin Database...');
    
    // Try to recover data if main storage fails
    tryDataRecovery();
    
    loadGameData();
    
    // Update global stats
    updateGlobalStats();
    
    // If player session exists, go directly to dashboard
    if (gameState.currentPlayer) {
        console.log('📱 Resuming session for:', gameState.currentPlayer);
        showDashboard();
        notificationManager.info('Session Restored', `Welcome back, ${gameState.currentPlayer}! Your session has been restored. 🎮`);
    } else {
        showUserEntry();
        updateQuickStats();
    }
    
    updateAllLeaderboards();
    updateDailyStats();
    updateLiveFeed();
    
    // Force immediate update of extreme stats if there's existing data
    if (gameState.players.length > 0) {
        updateExtremeStats();
    }
    
    // Add enter key listener for username input
    const usernameInput = document.getElementById('usernameInput');
    usernameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            enterGame();
        }
    });
    
    // Auto-save every 30 seconds
    setInterval(() => {
        if (gameState.currentPlayer) {
            saveGameData();
            console.log('💾 Auto-saved database');
        }
    }, 30000);
    
    // Update live feed and stats every 5 seconds
    setInterval(() => {
        updateLiveFeed();
        updateExtremeStats();
    }, 5000);
    
    console.log('✅ FlipCoin Database initialized successfully');
}

// Data recovery system
function tryDataRecovery() {
    try {
        // Check if main data is corrupted and backup exists
        const mainData = localStorage.getItem('flipGameLeaderboard');
        const backupData = localStorage.getItem('flipGameBackup');
        
        if (!mainData && backupData) {
            console.log('🔧 Recovering data from backup...');
            const backup = JSON.parse(backupData);
            if (backup.players && Array.isArray(backup.players)) {
                localStorage.setItem('flipGamePlayers', JSON.stringify(backup.players));
                console.log('✅ Data recovered successfully');
                notificationManager.success('Data Recovered!', 'Your game data has been recovered from backup! 🔧');
            }
            if (backup.flips && Array.isArray(backup.flips)) {
                localStorage.setItem('flipGameFlips', JSON.stringify(backup.flips));
            }
        }
    } catch (error) {
        console.error('❌ Data recovery failed:', error);
    }
}

// Show user entry section
function showUserEntry() {
    document.getElementById('userSection').style.display = 'block';
    document.getElementById('dashboard').style.display = 'none';
}

// Show dashboard
function showDashboard() {
    document.getElementById('userSection').style.display = 'none';
    document.getElementById('dashboard').style.display = 'grid';
    updatePlayerInfo();
    
    // Update all stats when dashboard is shown
    updateAllLeaderboards();
    updateExtremeStats();
    updateLiveFeed();
    updateDailyStats();
}

// Enter the game
function enterGame() {
    const usernameInput = document.getElementById('usernameInput');
    let username = usernameInput.value.trim();
    
    if (username === '') {
        notificationManager.warning('Username Required', 'Please enter a username to start playing! 🚀');
        usernameInput.focus();
        return;
    }
    
    if (username.length > 20) {
        notificationManager.error('Username Too Long', 'Username must be 20 characters or less! 📏');
        usernameInput.focus();
        return;
    }
    
    const deviceId = getDeviceId();
    const sessionId = generateSessionId();
    
    // First check if username exists anywhere in the system
    const existingUserAnywhere = gameState.players.find(p => p.username === username);
    
    if (existingUserAnywhere) {
        // Username exists - check if it's the same device
        if (existingUserAnywhere.deviceId === deviceId) {
            // Same device, same username - restore session
            gameState.currentPlayer = username;
            gameState.currentPlayerId = existingUserAnywhere.id;
            gameState.moonCount = existingUserAnywhere.total_moons || 0;
            gameState.rugCount = existingUserAnywhere.total_rugs || 0;
            gameState.totalFlips = existingUserAnywhere.total_flips || 0;
            
            // Update session info
            existingUserAnywhere.sessionId = sessionId;
            existingUserAnywhere.lastPlayed = new Date().getTime();
            
            console.log('🔄 Welcome back,', username + '! (Device verified)');
            alert(`Welcome back, ${username}! Your stats have been restored! 🎉`);
        } else {
            // Different device - username is taken
            alert(`Username "${username}" is already taken by another player! Please choose a different username. �`);
            usernameInput.focus();
            return;
        }
    } else {
        const newPlayer = {
            id: generatePlayerId(),
        // Username is available - create new player
        const newPlayer = {
            id: generatePlayerId(),
            username: username,
            total_moons: 0,
            total_rugs: 0,
            total_flips: 0,
            lastPlayed: new Date().getTime(),
            deviceId: deviceId,
            sessionId: sessionId
        };
        
        gameState.players.push(newPlayer);
        gameState.currentPlayer = username;
        gameState.currentPlayerId = newPlayer.id;
        gameState.moonCount = 0;
        gameState.rugCount = 0;
        gameState.totalFlips = 0;
        
        console.log('🆕 New player registered:', username, 'Device:', deviceId.slice(0, 12) + '...');
        alert(`Welcome to FlipCoin, ${username}! Your account has been created! 🚀`);
    }
    
    saveGameData();
    showDashboard();
    
    // Add entrance animation
    const dashboard = document.getElementById('dashboard');
    dashboard.style.opacity = '0';
    dashboard.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        dashboard.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        dashboard.style.opacity = '1';
        dashboard.style.transform = 'translateY(0)';
    }, 100);
}

// Generate unique player ID
function generatePlayerId() {
    return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Update global statistics
function updateGlobalStats() {
    const totalMoons = gameState.players.reduce((sum, p) => sum + p.total_moons, 0);
    const totalRugs = gameState.players.reduce((sum, p) => sum + p.total_rugs, 0);
    const totalFlips = gameState.players.reduce((sum, p) => sum + p.total_flips, 0);
    
    document.getElementById('globalMoons').textContent = totalMoons.toLocaleString();
    document.getElementById('globalRugs').textContent = totalRugs.toLocaleString();
    document.getElementById('globalFlips').textContent = totalFlips.toLocaleString();
    document.getElementById('devAllocation').textContent = extremeStats.funnyStats.devAllocation;
}

// Update quick stats on entry screen
function updateQuickStats() {
    const totalPlayers = gameState.players.length;
    const totalFlips = gameState.players.reduce((sum, p) => sum + p.total_flips, 0);
    
    document.getElementById('totalPlayers').textContent = totalPlayers.toLocaleString();
    document.getElementById('totalGlobalFlips').textContent = totalFlips.toLocaleString();
}

// Update extreme performers
function updateExtremeStats() {
    console.log('updateExtremeStats called, players:', gameState.players.length);
    
    if (gameState.players.length === 0) {
        console.log('No players, showing placeholders...');
        // Reset to placeholders
        document.getElementById('moonChampion').textContent = 'No moon champion yet!';
        document.getElementById('moonChampionStat').textContent = '';
        document.getElementById('rugKing').textContent = 'No rug king yet!';
        document.getElementById('rugKingStat').textContent = '';
        document.getElementById('mostActive').textContent = 'No active players yet!';
        document.getElementById('mostActiveStat').textContent = '';
        document.getElementById('luckiestPlayer').textContent = 'No lucky players yet!';
        document.getElementById('luckiestStat').textContent = '';
        return;
    }
    
    // Find players with any activity
    const activePlayers = gameState.players.filter(p => (p.total_flips || 0) > 0);
    
    if (activePlayers.length === 0) {
        console.log('No active players, showing placeholders...');
        // Show current player as placeholder if they exist but haven't flipped
        const currentPlayer = gameState.players.find(p => p.username === gameState.currentPlayer);
        if (currentPlayer) {
            document.getElementById('moonChampion').textContent = `${currentPlayer.username} (no flips yet)`;
            document.getElementById('moonChampionStat').textContent = 'Start flipping! 🪙';
            document.getElementById('rugKing').textContent = `${currentPlayer.username} (no flips yet)`;
            document.getElementById('rugKingStat').textContent = 'Start flipping! 🪙';
            document.getElementById('mostActive').textContent = `${currentPlayer.username} (no flips yet)`;
            document.getElementById('mostActiveStat').textContent = 'Start flipping! 🪙';
            document.getElementById('luckiestPlayer').textContent = `${currentPlayer.username} (no flips yet)`;
            document.getElementById('luckiestStat').textContent = 'Start flipping! 🪙';
        }
        return;
    }
    
    // Calculate performers with safe defaults
    const moonChampion = activePlayers.reduce((max, p) => 
        (p.total_moons || 0) > (max.total_moons || 0) ? p : max
    );
    
    const rugKing = activePlayers.reduce((max, p) => 
        (p.total_rugs || 0) > (max.total_rugs || 0) ? p : max
    );
    
    const mostActive = activePlayers.reduce((max, p) => 
        (p.total_flips || 0) > (max.total_flips || 0) ? p : max
    );
    
    // Calculate luckiest (highest moon ratio, need at least 3 flips to qualify)
    const eligibleForLuck = activePlayers.filter(p => (p.total_flips || 0) >= 3);
    let luckiestPlayer = null;
    
    if (eligibleForLuck.length > 0) {
        luckiestPlayer = eligibleForLuck.reduce((max, p) => {
            const ratio = (p.total_moons || 0) / (p.total_flips || 1);
            const maxRatio = (max.total_moons || 0) / (max.total_flips || 1);
            return ratio > maxRatio ? p : max;
        });
    }
    
    console.log('Performers found:', { moonChampion, rugKing, mostActive, luckiestPlayer });
    
    // Update UI using the existing HTML structure
    updatePerformerCard('moonChampion', 'moonChampionStat', moonChampion, 
        `${moonChampion.total_moons || 0} moons 🌙`);
    
    updatePerformerCard('rugKing', 'rugKingStat', rugKing, 
        `${rugKing.total_rugs || 0} rugs 💸`);
    
    updatePerformerCard('mostActive', 'mostActiveStat', mostActive, 
        `${mostActive.total_flips || 0} total flips 🎯`);
    
    if (luckiestPlayer) {
        const luckRatio = (((luckiestPlayer.total_moons || 0) / (luckiestPlayer.total_flips || 1)) * 100).toFixed(1);
        updatePerformerCard('luckiestPlayer', 'luckiestStat', luckiestPlayer, 
            `${luckRatio}% moon rate 🍀`);
    } else {
        document.getElementById('luckiestPlayer').textContent = 'Need 3+ flips to qualify!';
        document.getElementById('luckiestStat').textContent = 'Keep flipping! 🎲';
    }
}

// Update funny stats
function updateFunnyStats() {
    console.log('Updating performer card:', nameId, 'Player:', player, 'Stat:', statText);
    const nameElement = document.getElementById(nameId);
    const statElement = document.getElementById(statId);
    
    console.log('Elements found:', !!nameElement, !!statElement);
    
    if (player && (player.total_flips || 0) > 0) {
        console.log('Updating with player data:', player.username);
        nameElement.textContent = player.username;
        statElement.textContent = statText;
    } else {
        console.log('No data, showing placeholder');
        nameElement.textContent = nameId.includes('moon') ? 'No moon champion yet!' :
                                nameId.includes('rug') ? 'No rug king yet!' :
                                nameId.includes('active') ? 'No active players yet!' :
                                'No lucky players yet!';
        statElement.textContent = '';
    }
}

// Update funny memecoin stats
function updateFunnyStats() {
    // Update global funny counters
    extremeStats.funnyStats.liquidityBurned = gameState.players.reduce((sum, p) => sum + p.total_rugs, 0);
    extremeStats.funnyStats.devBuysBack = gameState.players.reduce((sum, p) => sum + p.total_moons, 0);
    
    // Calculate community mood
    const totalMoons = extremeStats.funnyStats.devBuysBack;
    const totalRugs = extremeStats.funnyStats.liquidityBurned;
    const total = totalMoons + totalRugs;
    
    if (total > 0) {
        const moonRatio = totalMoons / total;
        if (moonRatio > 0.6) {
            extremeStats.funnyStats.communityMood = 'mooning';
        } else if (moonRatio < 0.4) {
            extremeStats.funnyStats.communityMood = 'rugging';
        } else {
            extremeStats.funnyStats.communityMood = 'neutral';
        }
    }
    
    // Check for global events
    checkGlobalEvents();
}

// Check and display global events
function checkGlobalEvents() {
    const today = new Date().toDateString();
    
    // Initialize daily stats if new day
    if (extremeStats.dailyStats.date !== today) {
        extremeStats.dailyStats = { date: today, moons: 0, rugs: 0, total: 0 };
    }
    
    // Count today's flips
    const todayFlips = gameState.flips.filter(flip => 
        new Date(flip.timestamp).toDateString() === today
    );
    
    extremeStats.dailyStats.total = todayFlips.length;
    extremeStats.dailyStats.moons = todayFlips.filter(f => f.result === 'moon').length;
    extremeStats.dailyStats.rugs = todayFlips.filter(f => f.result === 'rug').length;
    
    const eventContainer = document.getElementById('globalEvents');
    const eventBanner = document.getElementById('eventBanner');
    
    // Check for events
    if (extremeStats.dailyStats.total >= 10) {
        const rugRatio = extremeStats.dailyStats.rugs / extremeStats.dailyStats.total;
        
        if (rugRatio > 0.6) {
            showGlobalEvent('Rug Season is here 💀 Hide your bags!', 'rug-season');
            return;
        }
        
        if (extremeStats.dailyStats.total >= 100 && extremeStats.dailyStats.moons / extremeStats.dailyStats.total > 0.6) {
            showGlobalEvent('Bull Run Mode Activated 🚀🚀🚀', 'bull-run');
            return;
        }
    }
    
    // Check for legendary streak
    if (extremeStats.currentStreak.count >= 10 && extremeStats.currentStreak.type === 'moon') {
        showGlobalEvent(`Legendary Streak! ${extremeStats.currentStreak.player} is blessed by the Flip Gods 🙌`, 'legendary-streak');
        return;
    }
    
    // Hide events if none active
    eventContainer.style.display = 'none';
}

function showGlobalEvent(message, type) {
    const eventContainer = document.getElementById('globalEvents');
    const eventBanner = document.getElementById('eventBanner');
    
    eventBanner.textContent = message;
    eventBanner.className = `event-banner ${type}`;
    eventContainer.style.display = 'block';
    
    // Auto-hide after 30 seconds
    setTimeout(() => {
        eventContainer.style.display = 'none';
    }, 30000);
}

// Track streaks
function updateStreak(username, result) {
    if (extremeStats.currentStreak.player === username && extremeStats.currentStreak.type === result) {
        extremeStats.currentStreak.count++;
    } else {
        extremeStats.currentStreak = { player: username, count: 1, type: result };
    }
    
    // Update tax counter for rugs
    if (result === 'rug') {
        if (!extremeStats.funnyStats.taxPaid[username]) {
            extremeStats.funnyStats.taxPaid[username] = 0;
        }
        extremeStats.funnyStats.taxPaid[username]++;
    }
}

// Update daily stats section
function updateDailyStats() {
    const today = new Date().toDateString();
    
    // Get today's flips
    const todayFlips = gameState.flips.filter(flip => 
        new Date(flip.timestamp).toDateString() === today
    );
    
    const totalToday = todayFlips.length;
    const moonsToday = todayFlips.filter(f => f.result === 'moon').length;
    const rugsToday = todayFlips.filter(f => f.result === 'rug').length;
    
    // Calculate percentages
    const moonPercent = totalToday > 0 ? Math.round((moonsToday / totalToday) * 100) : 0;
    const rugPercent = totalToday > 0 ? Math.round((rugsToday / totalToday) * 100) : 0;
    
    // Update moon stats
    document.getElementById('dailyMoonPercent').textContent = `${moonPercent}%`;
    document.getElementById('dailyMoonCount').textContent = `${moonsToday} moons`;
    document.getElementById('moonProgressBar').style.width = `${moonPercent}%`;
    
    // Update rug stats
    document.getElementById('dailyRugPercent').textContent = `${rugPercent}%`;
    document.getElementById('dailyRugCount').textContent = `${rugsToday} rugs`;
    document.getElementById('rugProgressBar').style.width = `${rugPercent}%`;
    
    // Find top performers today
    const todayStats = {};
    todayFlips.forEach(flip => {
        if (!todayStats[flip.username]) {
            todayStats[flip.username] = { moons: 0, rugs: 0 };
        }
        if (flip.result === 'moon') {
            todayStats[flip.username].moons++;
        } else {
            todayStats[flip.username].rugs++;
        }
    });
    
    // Find top mooner today
    let topMooner = { name: 'None yet', count: 0 };
    Object.entries(todayStats).forEach(([username, stats]) => {
        if (stats.moons > topMooner.count) {
            topMooner = { name: username, count: stats.moons };
        }
    });
    
    // Find most rugged today
    let mostRugged = { name: 'None yet', count: 0 };
    Object.entries(todayStats).forEach(([username, stats]) => {
        if (stats.rugs > mostRugged.count) {
            mostRugged = { name: username, count: stats.rugs };
        }
    });
    
    // Update event announcements only (removed non-existent element updates)
    updateEventAnnouncements(moonPercent, rugPercent, topMooner, mostRugged);
}

// Update event announcement cards
function updateEventAnnouncements(moonPercent, rugPercent, topMooner, mostRugged) {
    const container = document.getElementById('eventCardsContainer');
    if (!container) {
        console.error('Event container not found!');
        return;
    }
    
    container.innerHTML = '';
    
    // Create event cards based on current stats
    const events = [];
    
    // Always add at least one test event to ensure something shows up
    events.push({
        type: 'reward-event',
        icon: '🎮',
        title: 'FlipCoin Game is Live!',
        description: 'Welcome to the ultimate flip game! Moon or Rug - the choice is yours! 🚀'
    });
    
    if (rugPercent > moonPercent && rugPercent > 50) {
        const devAllocation = extremeStats.funnyStats.devAllocation;
        if (devAllocation > 0) {
            const dumpAmount = Math.min(5, devAllocation);
            extremeStats.funnyStats.devAllocation = Math.max(0, devAllocation - dumpAmount);
            events.push({
                type: 'dump-event',
                icon: '�',
                title: `Rugs > Moons → Dev dumps ${dumpAmount}% into circulation!`,
                description: `Community is rugging (${rugPercent}%)! Dev panic selling! Dev allocation: ${extremeStats.funnyStats.devAllocation}% remaining �`
            });
        }
    }
    
    if (moonPercent > rugPercent && moonPercent > 50) {
        events.push({
            type: 'burn-event',
            icon: '�',
            title: 'Moons > Rugs → Owner burns 5% of supply!',
            description: `Too much mooning (${moonPercent}%)! Deflationary burn activated! �`
        });
    }
    
    if (topMooner.count >= 5) {
        events.push({
            type: 'reward-event',
            icon: '🚀',
            title: `Top Mooner of the Day gets 0.5% of owner share!`,
            description: `${topMooner.name} is leading with ${topMooner.count} moons! Earn more to win! 💰`
        });
    }
    
    // Check if dev allocation is depleted
    if (extremeStats.funnyStats.devAllocation <= 0) {
        events.push({
            type: 'reward-event',
            icon: '🎉',
            title: 'DEV ALLOCATION DEPLETED! Community Takeover! 🎉',
            description: 'Dev has 0% tokens left! The community now controls the project! True decentralization achieved! 💪'
        });
    }
    
    // Always show community mood event
    const totalMoons = extremeStats.funnyStats.devBuysBack;
    const totalRugs = extremeStats.funnyStats.liquidityBurned;
    const communityMood = extremeStats.funnyStats.communityMood;
    
    if (communityMood === 'mooning') {
        events.push({
            type: 'reward-event',
            icon: '🌕',
            title: 'Community is MOONING! 🚀',
            description: `Dev is buying back aggressively! ${totalMoons} total moons vs ${totalRugs} rugs! 📈`
        });
    } else if (communityMood === 'rugging') {
        events.push({
            type: 'burn-event',
            icon: '💸',
            title: 'RUG SEASON ACTIVATED! 💀',
            description: `Liquidity is getting rekt! ${totalRugs} total rugs vs ${totalMoons} moons! 📉`
        });
    } else {
        events.push({
            type: 'dump-event',
            icon: '⚖️',
            title: 'Market in Balance ⚖️',
            description: `Equal moon/rug ratio! The flip gods are neutral today! 🎯`
        });
    }
    
    // Render event cards
    events.forEach(event => {
        const eventCard = document.createElement('div');
        eventCard.className = `event-card ${event.type}`;
        eventCard.innerHTML = `
            <div class="event-card-content">
                <div class="event-icon">${event.icon}</div>
                <div class="event-title">${event.title}</div>
                <div class="event-description">${event.description}</div>
            </div>
        `;
        container.appendChild(eventCard);
    });
}

// Update player info display
function updatePlayerInfo() {
    document.getElementById('playerName').textContent = gameState.currentPlayer;
    document.getElementById('moonCount').textContent = gameState.moonCount;
    document.getElementById('rugCount').textContent = gameState.rugCount;
    document.getElementById('totalFlips').textContent = gameState.totalFlips;
}

// Flip the coin
function flipCoin() {
    if (gameState.isFlipping) return;
    
    gameState.isFlipping = true;
    const flipBtn = document.getElementById('flipBtn');
    const coin = document.getElementById('coin');
    const result = document.getElementById('result');
    
    // Disable button and show flipping state
    flipBtn.disabled = true;
    flipBtn.textContent = '🔄 FLIPPING...';
    result.textContent = '';
    result.className = 'result';
    
    // Add flipping animation
    coin.classList.add('flipping');
    
    // Generate random result (50/50 chance)
    const isMoon = Math.random() < 0.5;
    const flipResult = isMoon ? 'moon' : 'rug';
    
    // Wait for animation to complete
    setTimeout(() => {
        // Update game state
        gameState.totalFlips++;
        if (isMoon) {
            gameState.moonCount++;
        } else {
            gameState.rugCount++;
        }
        
        // Record flip in database
        recordFlip(gameState.currentPlayer, flipResult);
        
        // Update streak tracking
        updateStreak(gameState.currentPlayer, flipResult);
        
        // Update player in database
        updatePlayerInDatabase();
        
        // Show result
        if (isMoon) {
            result.textContent = '🌙 WE WILL MOON! 🚀';
            result.className = 'result moon show';
            coin.style.transform = 'rotateY(0deg)'; // Show moon face
            notificationManager.moon('MOON! 🌙', 'To the moon we go! 🚀');
        } else {
            result.textContent = '💸 WE WILL RUG! 📉';
            result.className = 'result rug show';
            coin.style.transform = 'rotateY(180deg)'; // Show rug face
            notificationManager.rug('RUG! 💸', 'Rugged again! Better luck next time! 📉');
        }
        
        // Update UI
        updatePlayerInfo();
        updateGlobalStats();
        updateAllLeaderboards();
        updateDailyStats();
        updateLiveFeed();
        updateExtremeStats();
        saveGameData();
        
        // Re-enable button
        flipBtn.disabled = false;
        flipBtn.textContent = '🪙 FLIP AGAIN';
        gameState.isFlipping = false;
        
        // Remove flipping class
        coin.classList.remove('flipping');
        
    }, 2000); // Match the CSS animation duration
}

// Record flip in database
function recordFlip(username, result) {
    const flipRecord = {
        id: generateFlipId(),
        username: username,
        playerId: gameState.currentPlayerId,
        deviceId: getDeviceId(),
        result: result,
        timestamp: new Date().getTime()
    };
    
    gameState.flips.push(flipRecord);
    console.log('📝 Flip recorded:', flipRecord);
}

// Generate unique flip ID
function generateFlipId() {
    return 'flip_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Update player in database
function updatePlayerInDatabase() {
    const player = gameState.players.find(p => 
        p.id === gameState.currentPlayerId || 
        (p.username === gameState.currentPlayer && p.deviceId === getDeviceId())
    );
    if (player) {
        player.total_moons = gameState.moonCount;
        player.total_rugs = gameState.rugCount;
        player.total_flips = gameState.totalFlips;
        player.lastPlayed = new Date().getTime();
        
        // Update session tracking
        if (player.deviceId === getDeviceId()) {
            player.sessionId = generateSessionId();
        }
    }
}

// Switch leaderboard tabs
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    document.getElementById(tabName + 'Pane').classList.add('active');
    
    // Update active tab state
    gameState.activeTab = tabName;
    
    // Update the specific leaderboard
    updateLeaderboard(tabName);
}

// Update all leaderboards
function updateAllLeaderboards() {
    updateLeaderboard('moons');
    updateLeaderboard('rugs');
    updateLeaderboard('active');
    updateDailyStats();
}

// Update specific leaderboard
function updateLeaderboard(type) {
    const leaderboardId = type + 'Leaderboard';
    const leaderboardElement = document.getElementById(leaderboardId);
    
    if (!leaderboardElement) return;
    
    // Sort players based on type
    let sortedPlayers = [...gameState.players];
    
    switch (type) {
        case 'moons':
            sortedPlayers.sort((a, b) => b.total_moons - a.total_moons);
            break;
        case 'rugs':
            sortedPlayers.sort((a, b) => b.total_rugs - a.total_rugs);
            break;
        case 'active':
            sortedPlayers.sort((a, b) => b.total_flips - a.total_flips);
            break;
    }
    
    // Take top 10 players
    const topPlayers = sortedPlayers.slice(0, 10);
    
    // Clear current leaderboard
    leaderboardElement.innerHTML = '';
    
    if (topPlayers.length === 0) {
        leaderboardElement.innerHTML = '<div style="text-align: center; color: #a0aec0; padding: 20px;">No players yet. Be the first! 🥇</div>';
        return;
    }
    
    // Display players
    topPlayers.forEach((player, index) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        
        const rank = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        const isCurrentPlayer = player.username === gameState.currentPlayer;
        
        let primaryStat, winRate;
        
        switch (type) {
            case 'moons':
                primaryStat = player.total_moons;
                winRate = player.total_flips > 0 ? ((player.total_moons / player.total_flips) * 100).toFixed(1) : 0;
                break;
            case 'rugs':
                primaryStat = player.total_rugs;
                winRate = player.total_flips > 0 ? ((player.total_rugs / player.total_flips) * 100).toFixed(1) : 0;
                break;
            case 'active':
                primaryStat = player.total_flips;
                winRate = player.total_flips > 0 ? ((player.total_moons / player.total_flips) * 100).toFixed(1) : 0;
                break;
        }
        
        item.innerHTML = `
            <div class="leaderboard-entry">
                <div class="player-rank-name">
                    <span class="rank-icon">${rank}</span>
                    <span class="player-name ${isCurrentPlayer ? 'current-player' : ''}">${player.username}${isCurrentPlayer ? ' (YOU)' : ''}</span>
                </div>
                <div class="primary-stat ${type}-stat">
                    ${type === 'moons' ? '🌙' : type === 'rugs' ? '💸' : '🎯'} ${primaryStat}
                </div>
                <div class="secondary-stats">
                    💸 ${player.total_rugs} | 🎯 ${player.total_flips} | ${winRate}% ${type === 'rugs' ? 'rug' : 'win'} rate
                </div>
            </div>
        `;
        
        leaderboardElement.appendChild(item);
    });
}

// Update live feed
function updateLiveFeed() {
    const liveFeedElement = document.getElementById('liveFeed');
    
    // Get last 10 flips
    const recentFlips = gameState.flips.slice(-10).reverse();
    
    if (recentFlips.length === 0) {
        liveFeedElement.innerHTML = '<div class="feed-placeholder">Waiting for flips...</div>';
        return;
    }
    
    // Clear current feed
    liveFeedElement.innerHTML = '';
    
    // Display recent flips
    recentFlips.forEach(flip => {
        const item = document.createElement('div');
        item.className = `feed-item ${flip.result}`;
        
        const timeAgo = getTimeAgo(flip.timestamp);
        const resultText = flip.result === 'moon' ? '🌙 MOONED!' : '💸 RUGGED!';
        const resultClass = flip.result === 'moon' ? 'moon' : 'rug';
        
        item.innerHTML = `
            <div class="feed-user">${flip.username}</div>
            <div class="feed-result ${resultClass}">${resultText}</div>
            <div class="feed-time">${timeAgo}</div>
        `;
        
        liveFeedElement.appendChild(item);
    });
    
    // Auto-scroll to top for newest entries
    liveFeedElement.scrollTop = 0;
}

// Get time ago string
function getTimeAgo(timestamp) {
    const now = new Date().getTime();
    const diff = now - timestamp;
    
    if (diff < 60000) { // Less than 1 minute
        return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
        const minutes = Math.floor(diff / 60000);
        return `${minutes}m ago`;
    } else if (diff < 86400000) { // Less than 1 day
        const hours = Math.floor(diff / 3600000);
        return `${hours}h ago`;
    } else {
        const days = Math.floor(diff / 86400000);
        return `${days}d ago`;
    }
}

// Clear live feed
function clearFeed() {
    notificationManager.warning('Clear Feed?', 'Are you sure you want to clear the live feed? This will remove all flip history! 🗑️', 0)
        .addEventListener('click', function(e) {
            if (e.target.classList.contains('notification-close')) return;
            
            // Create confirmation
            const confirmNotification = notificationManager.error('Confirm Clear', 'This action cannot be undone! Click here to confirm.', 0);
            confirmNotification.style.cursor = 'pointer';
            
            confirmNotification.addEventListener('click', function(confirmE) {
                if (confirmE.target.classList.contains('notification-close')) return;
                
                gameState.flips = [];
                updateLiveFeed();
                saveGameData();
                
                notificationManager.success('Feed Cleared!', 'Live feed cleared successfully! 🗑️');
                notificationManager.remove(confirmNotification);
                notificationManager.remove(this);
            });
        });
}

// Logout function
function logout() {
    // Simple logout with basic confirmation
    if (confirm('Logout and return to start screen?')) {
        // Save data first
        saveGameData();
        
        // Clear session
        localStorage.removeItem('flipGameSession');
        
        // Reset game state
        gameState.currentPlayer = '';
        gameState.currentPlayerId = '';
        gameState.moonCount = 0;
        gameState.rugCount = 0;
        gameState.totalFlips = 0;
        gameState.isFlipping = false;
        
        // Reset UI elements
        document.getElementById('usernameInput').value = '';
        const flipBtn = document.getElementById('flipBtn');
        flipBtn.textContent = '🪙 FLIP THE COIN';
        flipBtn.disabled = false;
        
        // Show login screen
        document.getElementById('userSection').style.display = 'block';
        document.getElementById('dashboard').style.display = 'none';
        
        // Update quick stats
        updateQuickStats();
        
        alert('Logged out successfully!');
    }
}

// Add some fun effects
function addRandomEffects() {
    // Random glitch effect
    setInterval(() => {
        if (Math.random() < 0.1) { // 10% chance every interval
            const title = document.querySelector('.title');
            title.style.textShadow = '2px 2px #ff00ff, -2px -2px #00ffff';
            setTimeout(() => {
                title.style.textShadow = '0 0 30px rgba(0, 212, 255, 0.5)';
            }, 100);
        }
    }, 5000);
    
    // Floating particles effect
    createFloatingParticles();
}

function createFloatingParticles() {
    const particles = ['🚀', '💎', '🌙', '⭐', '💫', '🪙'];
    
    setInterval(() => {
        if (Math.random() < 0.3) { // 30% chance
            const particle = document.createElement('div');
            particle.textContent = particles[Math.floor(Math.random() * particles.length)];
            particle.style.cssText = `
                position: fixed;
                font-size: ${Math.random() * 20 + 10}px;
                left: ${Math.random() * 100}vw;
                top: 100vh;
                pointer-events: none;
                z-index: 1000;
                animation: floatUp ${Math.random() * 3 + 2}s linear forwards;
                opacity: 0.7;
            `;
            
            document.body.appendChild(particle);
            
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 5000);
        }
    }, 3000);
}

// Add CSS for floating animation
const style = document.createElement('style');
style.textContent = `
    @keyframes floatUp {
        0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.7;
        }
        50% {
            opacity: 1;
        }
        100% {
            transform: translateY(-100vh) rotate(360deg);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize the game when page loads
document.addEventListener('DOMContentLoaded', function() {
    initGame();
    addRandomEffects();
    
    // Add some console messages for fun
    console.log('🚀 Welcome to MOON or RUG!');
    console.log('💎 Built for diamond hands only!');
    console.log('🌙 May your flips forever moon!');
});

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Spacebar to flip coin when dashboard is visible
    if (e.code === 'Space' && document.getElementById('dashboard').style.display !== 'none' && !gameState.isFlipping) {
        e.preventDefault();
        flipCoin();
    }
    
    // Enter to start game when username input is focused
    if (e.code === 'Enter' && document.activeElement === document.getElementById('usernameInput')) {
        enterGame();
    }
});

// Prevent space from scrolling the page
window.addEventListener('keydown', function(e) {
    if(e.keyCode === 32 && e.target === document.body) {
        e.preventDefault();
    }
});
