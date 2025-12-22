# Lifestyle Trader PWA

Your Personal Trading Assistant for Low Screen Time Trading 📈

## Overview

Lifestyle Trader is a Progressive Web App designed for Product Managers and busy professionals who want to treat trading as a business. It leverages Google's Gemini AI to provide intelligent trade analysis and management with minimal screen time.

## Features

### 🔍 Analysis Mode (No Active Trade)
- Input daily market data (OHLC, Technical Indicators, Option Chain)
- AI-powered market structure analysis
- Defined risk strategy recommendations (Spreads only - no naked positions)
- Clear risk/reward calculations

### 📊 Management Mode (Active Trade)
- Track active positions with entry details
- Visual Kill Switch levels (Warning/Abort/Profit zones)
- **3:15 PM Routine**: End-of-day AI review for Hold/Exit decisions
- Trade history with P&L tracking

### 📱 PWA Features
- Installable on mobile devices
- Offline-capable (view saved trades)
- Fast, responsive dashboard UI

## Tech Stack

- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS
- **AI**: Google Gemini API (gemini-1.5-flash)
- **Storage**: LocalStorage
- **PWA**: vite-plugin-pwa

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Google Gemini API Key ([Get one here](https://aistudio.google.com/app/apikey))

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```

3. **Open in browser**
   Navigate to `http://localhost:3000`

4. **Configure API Key**
   - Go to Settings (⚙️ icon)
   - Enter your Gemini API key
   - Click "Save API Key"

### Building for Production

```bash
npm run build
npm run preview
```

## Usage Guide

### Step 1: Enter Market Data
1. Navigate to **Data Input**
2. Enter the date and Spot Price (OHLC)
3. Add Technical Indicators (10 DMA, 50 DMA, RSI, MACD)
4. Paste Option Chain data (CSV format)
5. Click **Analyze Market**

### Step 2: Review Analysis
- Check the AI's verdict (Bullish/Bearish/Neutral)
- Review the recommended strategy
- Note the Kill Switch levels (Target/Warning/Stop Loss)
- Click **Accept Trade** to add to active positions

### Step 3: Manage Active Trades
- View all active trades on the **Dashboard**
- Update current spot price as needed
- Use the **3:15 PM Routine** button for end-of-day review
- Close trades when target is hit or thesis invalidates

## Data Format

### Option Chain CSV Format
```
Strike,CallOI,CallLTP,PutOI,PutLTP
21400,45000,180,35000,90
21500,50000,150,40000,120
21600,55000,100,45000,160
```

### JSON Import Format
```json
{
  "date": "2024-01-15",
  "spot": {
    "open": 21500,
    "high": 21650,
    "low": 21450,
    "close": 21600
  },
  "indicators": {
    "dma10": 21400,
    "dma50": 21200,
    "rsi": 55,
    "macd": {
      "value": 50,
      "signal": 40,
      "histogram": 10
    }
  },
  "optionChain": "Strike,CallOI,CallLTP,PutOI,PutLTP\n21500,50000,150,40000,120"
}
```

## Security

- API keys are stored locally in your browser (base64 encoded)
- No data is sent to external servers except Gemini API
- All trade data stays in your browser's LocalStorage

## Backup & Restore

1. Go to **Settings**
2. Click **Export All Data** to download a backup
3. Use **Import Data** to restore from a backup file

## Philosophy

> "Capital Preservation First, Profits Second"

This app is designed around the principle of treating trading as a business:
- Only defined-risk strategies (spreads)
- Clear entry/exit rules
- Systematic 3:15 PM review routine
- Low screen time approach

## License

MIT License - Use freely for personal trading.

---

Built with ❤️ for the Lifestyle Trader

