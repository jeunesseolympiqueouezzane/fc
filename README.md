# FlipCoin Game 🪙

A community-driven crypto coin flip game with real-time leaderboards and shared statistics across all devices.

## Features

🎮 **Coin Flip Game**: Moon or Rug - test your crypto luck!  
🏆 **Live Leaderboards**: Top Mooners, Rug Kings, and Most Active players  
🌍 **Shared Statistics**: All players see the same stats in real-time  
🎊 **Community Events**: Dynamic announcements and ticker messages  
📱 **Cross-Device Sync**: Play on any device, stats are shared globally  

## Deployment on Vercel

### 1. Quick Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jeunesseolympiqueouezzane/fc)

### 2. Manual Setup

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Clone and Deploy**:
   ```bash
   git clone https://github.com/jeunesseolympiqueouezzane/fc.git
   cd fc
   vercel
   ```

3. **Configure Environment**:
   - No additional environment variables needed
   - The API will automatically use Vercel's serverless functions

### 3. API Endpoints

Once deployed, your game will have these API endpoints:

- `GET /api/gamedata` - Get all game data
- `POST /api/flip` - Record a coin flip
- `GET /api/leaderboards` - Get current leaderboards
- `POST /api/event` - Add community event
- `GET /api/health` - Health check

## Local Development

1. **Install Dependencies**:
   ```bash
   cd api
   npm install
   ```

2. **Start Local Server**:
   ```bash
   npm run dev
   ```

3. **Open Game**:
   Open `index.html` in your browser

## How It Works

### Backend (Node.js + Express)
- Stores player data and game statistics in JSON file
- Provides REST API for all game operations
- Handles leaderboards and community events
- Deployed as Vercel serverless functions

### Frontend (HTML + CSS + JavaScript)
- Responsive game interface
- Real-time updates via API calls
- Fallback to localStorage for offline mode
- Community ticker and event announcements

### Data Persistence
- **Production**: Data stored in Vercel's file system
- **Development**: Local JSON file storage
- **Offline**: Falls back to browser localStorage

## Game Features

### Community Events
Your game includes special ticker messages:
- 🔥 "Moons > Rugs → Owner burns 5% of supply!"
- 💀 "Rugs > Moons → Owner dumps 5% into circulation!"
- 🚀 "Top Mooner of the Day gets 0.5% of owner share!"

### Leaderboard Badges
- 🌙 **MOON GOD** - Top moon champion
- 💀 **RUG DEALER** - Top rug collector  
- ⚡ **FLIP GOD** - Most active player

## Troubleshooting

### Stats Not Syncing?
- Check if API endpoints are accessible
- Verify Vercel deployment status
- Game falls back to local storage if API fails

### Deployment Issues?
- Ensure `vercel.json` is properly configured
- Check Node.js version compatibility (>=16.0.0)
- Verify all dependencies are installed

## Contributing

1. Fork the repository
2. Make your changes
3. Test locally
4. Submit a pull request

## License

MIT License - Feel free to fork and customize!

---

*Ready to moon or get rugged? Start flipping! 🚀💸*
