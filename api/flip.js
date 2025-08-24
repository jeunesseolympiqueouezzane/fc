// api/flip.js - Record flip results
const fs = require('fs').promises;
const path = require('path');

const dataFile = path.join('/tmp', 'gameData.json');

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

async function ensureDataFile() {
    try {
        await fs.access(dataFile);
    } catch {
        await fs.writeFile(dataFile, JSON.stringify(initData, null, 2));
    }
}

async function readData() {
    try {
        await ensureDataFile();
        const data = await fs.readFile(dataFile, 'utf8');
        return JSON.parse(data);
    } catch {
        return initData;
    }
}

async function writeData(data) {
    await fs.writeFile(dataFile, JSON.stringify(data, null, 2));
}

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method === 'POST') {
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
            res.status(200).json({ 
                success: true, 
                playerStats: data.players[playerId],
                globalStats: data.globalStats 
            });
        } catch (error) {
            console.error('Error recording flip:', error);
            res.status(500).json({ error: 'Failed to record flip' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
