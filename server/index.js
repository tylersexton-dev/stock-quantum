import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import NodeCache from 'node-cache';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

const client = new Anthropic();
const cache = new NodeCache({ stdTTL: 3600 });

const STOCKS = ['NVDA', 'TSLA', 'MSFT', 'AAPL', 'PLTR'];

// Production-grade mock data (realistic, stable)
function generateStockData(symbol) {
  const seed = symbol.charCodeAt(0) + symbol.charCodeAt(1);
  const basePrice = { NVDA: 875, TSLA: 242, MSFT: 420, AAPL: 189, PLTR: 28 };
  const base = basePrice[symbol] || 100;
  
  // Deterministic but varied
  const variance = Math.sin(seed) * 20;
  const changePercent = Math.cos(seed) * 3;
  
  return {
    symbol,
    price: base + variance,
    change: changePercent * base / 100,
    changePercent,
    high: base + variance + 15,
    low: base + variance - 15,
    volume: Math.floor(Math.random() * 150000000) + 50000000,
    marketCap: Math.floor(Math.random() * 3000000000000) + 500000000000,
    pe: 25 + Math.sin(seed) * 10,
    eps: 5 + Math.cos(seed) * 2,
    dividend: Math.abs(Math.sin(seed)) * 2,
    rsi: 50 + Math.sin(seed) * 30,
    macd: Math.sin(seed / 2) * 0.5,
    sma50: base + Math.sin(seed) * 10,
    sma200: base + Math.cos(seed) * 15,
    name: symbol,
    sector: ['Technology', 'Automotive', 'Cloud', 'Consumer', 'Defense'][STOCKS.indexOf(symbol)]
  };
}

// Get stocks
app.get('/api/stocks', async (req, res) => {
  try {
    const stocks = STOCKS.map(symbol => generateStockData(symbol));
    res.json(stocks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI analysis
app.post('/api/analyze', async (req, res) => {
  try {
    const { symbol } = req.body;
    
    const cached = cache.get(`analysis-${symbol}`);
    if (cached) return res.json(cached);

    const stockData = generateStockData(symbol);
    
    const prompt = `You are a senior stock analyst. Analyze ${symbol} and provide professional insights:

CURRENT DATA:
Price: $${stockData.price.toFixed(2)} (${stockData.changePercent > 0 ? '+' : ''}${stockData.changePercent.toFixed(2)}%)
P/E: ${stockData.pe.toFixed(1)} | EPS: $${stockData.eps.toFixed(2)} | Dividend: ${stockData.dividend.toFixed(2)}%
52W High: $${stockData.high.toFixed(2)} | Low: $${stockData.low.toFixed(2)}
RSI: ${stockData.rsi.toFixed(0)} | Market Cap: $${(stockData.marketCap / 1e12).toFixed(2)}T
Sector: ${stockData.sector}

PROVIDE:
1. Technical Analysis: Current momentum and key levels
2. Fundamental Assessment: Valuation and growth outlook
3. Risk & Catalysts: What could move this stock
4. Investment Case: Buy/hold/sell thesis with rationale
5. Action: Specific entry/exit levels

Be concise, direct, actionable.`;

    const message = await client.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    const analysis = message.content[0].type === 'text' ? message.content[0].text : '';
    
    const result = {
      symbol,
      stockData,
      analysis,
      timestamp: new Date().toISOString()
    };

    cache.set(`analysis-${symbol}`, result);
    res.json(result);
  } catch (error) {
    console.error('Error analyzing:', error);
    res.status(500).json({ error: error.message });
  }
});

// Compare
app.post('/api/compare', async (req, res) => {
  try {
    const { symbols } = req.body;
    const stocks = symbols.map(s => generateStockData(s));

    const prompt = `Compare these stocks as investment opportunities:

${stocks.map(s => 
  `${s.symbol} (${s.name}): $${s.price.toFixed(2)} | P/E ${s.pe.toFixed(1)} | RSI ${s.rsi.toFixed(0)} | Sector: ${s.sector}`
).join('\n')}

PROVIDE:
1. Valuation Comparison: Which is cheapest relative to growth
2. Technical Setup: Which has best momentum
3. Risk/Reward: Which offers best risk-adjusted returns
4. Pick Now: Best positioned stock and why
5. Allocation: Suggested weighting if equal capital

Be direct and specific.`;

    const message = await client.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    const comparison = message.content[0].type === 'text' ? message.content[0].text : '';
    
    res.json({
      stocks,
      comparison,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ Stock Quantum live on port ${PORT}`);
  console.log(`✓ AI Analysis: Claude API`);
  console.log(`✓ Data: Production-grade demo`);
});
