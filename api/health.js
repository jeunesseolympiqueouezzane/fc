// api/health.js - Health check endpoint
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method === 'GET') {
        res.status(200).json({ 
            status: 'healthy', 
            timestamp: new Date().toISOString(),
            service: 'FlipCoin API'
        });
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
