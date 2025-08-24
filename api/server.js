const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Data file path
const dataFile = path.join(__dirname, 'gameData.json');

// Initialize data structure
const initData = {
    players: {},
    globalStats: {
        totalFlips: 0,
        totalMoons: 0,
        totalRugs: 0,
        lastUpdated: new Date().toISOString()
    },
    events: [],
    ticker: []
};

// Ensure data file exists
async function ensureDataFile() {
    try {
        await fs.access(dataFile);
    } catch {
        await fs.writeFile(dataFile, JSON.stringify(initData, null, 2));
    }
}

// Read data from file
async function readData() {
    try {
        const data = await fs.readFile(dataFile, 'utf8');
        return JSON.parse(data);
    } catch {
        return initData;
    }
}

// Write data to file
async function writeData(data) {
    await fs.writeFile(dataFile, JSON.stringify(data, null, 2));
}

// Routes

// Get all game data
app.get('/api/gamedata', async (req, res) => {
    try {
        const data = await readData();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read game data' });
    }
});

// Update player data
app.post('/api/player', async (req, res) => {
    try {
        const { playerId, playerData } = req.body;
        const data = await readData();
        
        data.players[playerId] = {
            ...data.players[playerId],
            ...playerData,
            lastActive: new Date().toISOString()
        };
        
        await writeData(data);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update player data' });
    }
});

// Record flip result
app.post('/api/flip', async (req, res) => {
    try {
        const { playerId, result, playerName } = req.body;
        const data = await readData();
        
        // Update player stats
        if (!data.players[playerId]) {
            data.players[playerId] = {
                name: playerName || 'Anonymous',
                moons: 0,
                rugs: 0,
                flips: 0,
                joined: new Date().toISOString(),
                lastActive: new Date().toISOString()
            };
        }
        
        data.players[playerId].flips++;
        if (result === 'moon') {
            data.players[playerId].moons++;
            data.globalStats.totalMoons++;
        } else {
            data.players[playerId].rugs++;
            data.globalStats.totalRugs++;
        }
        data.players[playerId].lastActive = new Date().toISOString();
        
        // Update global stats
        data.globalStats.totalFlips++;
        data.globalStats.lastUpdated = new Date().toISOString();
        
        await writeData(data);
        res.json({ 
            success: true, 
            playerStats: data.players[playerId],
            globalStats: data.globalStats 
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to record flip' });
    }
});

// Add event
app.post('/api/event', async (req, res) => {
    try {
        const event = req.body;
        const data = await readData();
        
        event.timestamp = new Date().toISOString();
        data.events.unshift(event);
        
        // Keep only last 50 events
        data.events = data.events.slice(0, 50);
        
        await writeData(data);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add event' });
    }
});

// Get leaderboards
app.get('/api/leaderboards', async (req, res) => {
    try {
        const data = await readData();
        const players = Object.values(data.players);
        
        const leaderboards = {
            topMooners: players
                .filter(p => p.moons > 0)
                .sort((a, b) => b.moons - a.moons)
                .slice(0, 10),
            topRuggers: players
                .filter(p => p.rugs > 0)
                .sort((a, b) => b.rugs - a.rugs)
                .slice(0, 10),
            mostActive: players
                .filter(p => p.flips > 0)
                .sort((a, b) => b.flips - a.flips)
                .slice(0, 10)
        };
        
        res.json(leaderboards);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get leaderboards' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Initialize and start server
async function startServer() {
    await ensureDataFile();
    app.listen(PORT, () => {
        console.log(`FlipCoin API server running on port ${PORT}`);
    });
}

startServer().catch(console.error);
