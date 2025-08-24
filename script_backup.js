// Fixed login system - BACKUP VERSION
// This ensures usernames are unique across all devices

function enterGame() {
    const usernameInput = document.getElementById('usernameInput');
    let username = usernameInput.value.trim();
    
    if (username === '') {
        alert('Please enter a username to start playing! 🚀');
        usernameInput.focus();
        return;
    }
    
    if (username.length > 20) {
        alert('Username must be 20 characters or less! 📏');
        usernameInput.focus();
        return;
    }
    
    const deviceId = getDeviceId();
    const sessionId = generateSessionId();
    
    // Check if username exists anywhere in the system
    const existingUser = gameState.players.find(p => p.username === username);
    
    if (existingUser) {
        // Username exists - check if it's the same device
        if (existingUser.deviceId === deviceId) {
            // Same device, same username - restore session
            gameState.currentPlayer = username;
            gameState.currentPlayerId = existingUser.id;
            gameState.moonCount = existingUser.total_moons || 0;
            gameState.rugCount = existingUser.total_rugs || 0;
            gameState.totalFlips = existingUser.total_flips || 0;
            
            // Update session info
            existingUser.sessionId = sessionId;
            existingUser.lastPlayed = new Date().getTime();
            
            console.log('🔄 Welcome back,', username + '! (Device verified)');
            alert(`Welcome back, ${username}! Your stats have been restored! 🎉`);
        } else {
            // Different device - username is taken
            alert(`Username "${username}" is already taken! Please choose a different username. 🚫`);
            usernameInput.focus();
            return;
        }
    } else {
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
        
        console.log('🆕 New player registered:', username);
        alert(`Welcome to FlipCoin, ${username}! Your account has been created! 🚀`);
    }
    
    saveGameData();
    showDashboard();
}

function generatePlayerId() {
    return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getDeviceId() {
    let deviceId = localStorage.getItem('flipGameDeviceId');
    if (!deviceId) {
        deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('flipGameDeviceId', deviceId);
    }
    return deviceId;
}
