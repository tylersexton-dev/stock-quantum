# stock-quantum
# Stock Quantum

> AI-powered stock analysis dashboard with real-time data and Claude API integration

![Stock Quantum](https://img.shields.io/badge/Built%20with-Claude%20API-blue) ![Live](https://img.shields.io/badge/Status-Live-green) ![Node.js](https://img.shields.io/badge/Runtime-Node.js-green)

## 🚀 Live Demo

**[Open Stock Quantum](https://stock-quantum.replit.app/)**

## ✨ Features

- **Real-Time Stock Data** — Live prices for NVDA, TSLA, MSFT, AAPL, PLTR
- **AI Analysis** — Claude API generates intelligent investment insights
- **Technical Indicators** — RSI, MACD, moving averages, technical analysis
- **Comparative Analysis** — Multi-stock comparison with AI-generated insights
- **Professional Dashboard** — Dark theme, responsive design, production-grade UI
- **Production-Ready** — Error handling, caching, optimized for scale

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vanilla JavaScript, CSS Grid, Responsive Design |
| **Backend** | Node.js + Express.js |
| **AI** | Anthropic Claude API (Opus 4.1) |
| **Deployment** | Replit |
| **Caching** | Node-cache (1-hour TTL) |

## 📊 What It Does

### Overview Tab
See all 5 stocks at a glance:
- Current price & % change
- P/E ratio (valuation indicator)
- RSI (momentum)
- Select multiple stocks to compare

### Detailed Analysis Tab
Deep dive into any stock:
- 8 key metrics (market cap, EPS, dividend, RSI, volume, etc.)
- **Claude AI Analysis** with:
  - Technical momentum assessment
  - Fundamental valuation breakdown
  - Risk factors and catalysts
  - Investment thesis & recommendation

### Compare Tab
Multi-stock comparison:
- Side-by-side metrics
- Claude-generated comparative analysis
- Valuation comparison
- Best positioning analysis
- Allocation suggestions

## 🚀 Quick Start

### Run Locally

```bash
# Clone repo
git clone https://github.com/yourusername/stock-quantum.git
cd stock-quantum

# Install dependencies
npm install

# Create .env file
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
echo "PORT=3000" >> .env

# Run
npm start
```

Open: http://localhost:3000

### Deploy to Replit

1. Go to [Replit](https://replit.com)
2. Click **"Create"** → **"Import from GitHub"**
3. Paste this repo URL
4. Add `ANTHROPIC_API_KEY` secret (in Replit Secrets)
5. Click **"Run"**

Your app is now live with a public URL.

## 📡 API Endpoints

### Get All Stocks
