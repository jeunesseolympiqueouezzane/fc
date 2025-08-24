// api/leaderboards.js - Get leaderboards
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

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method === 'GET') {
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
            
            res.status(200).json(leaderboards);
        } catch (error) {
            console.error('Error getting leaderboards:', error);
            res.status(500).json({ error: 'Failed to get leaderboards' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
