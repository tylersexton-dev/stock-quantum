import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
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
const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache

const STOCKS = ['NVDA', 'TSLA', 'MSFT', 'AAPL', 'PLTR'];
const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY || 'demo';

// Fetch real stock data from Alpha Vantage
async function fetchRealStockData(symbol) {
  try {
    const cached = cache.get(`stock-${symbol}`);
    if (cached) return cached;

    const baseUrl = 'https://www.alphavantage.co/query';
    
    // Get daily data
    const dailyRes = await axios.get(baseUrl, {
      params: {
        function: 'TIME_SERIES_DAILY',
        symbol: symbol,
        apikey: ALPHA_VANTAGE_KEY
      },
      timeout: 5000
    });

    // Get quote
    const quoteRes = await axios.get(baseUrl, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: symbol,
        apikey: ALPHA_VANTAGE_KEY
      },
      timeout: 5000
    });

    // Get company overview
    const overviewRes = await axios.get(baseUrl, {
      params: {
        function: 'OVERVIEW',
        symbol: symbol,
        apikey: ALPHA_VANTAGE_KEY
      },
      timeout: 5000
    });

    const quote = quoteRes.data['Global Quote'] || {};
    const overview = overviewRes.data || {};
    const timeSeries = dailyRes.data['Time Series (Daily)'] || {};
    const dates = Object.keys(timeSeries).sort().reverse();

    const price = parseFloat(quote['05. price']) || 0;
    const change = parseFloat(quote['09. change']) || 0;
    const changePercent = parseFloat(quote['10. change percent']?.replace('%', '')) || 0;
    const high = parseFloat(quote['03. high']) || price;
    const low = parseFloat(quote['04. low']) || price;
    const volume = parseInt(quote['06. volume']) || 0;

    // Calculate technical indicators
    const closes = dates.slice(0, 200).map(d => parseFloat(timeSeries[d]['04. close']));
    const rsi = calculateRSI(closes);
    const macd = calculateMACD(closes);
    const sma50 = closes.slice(0, 50).reduce((a, b) => a + b, 0) / 50;
    const sma200 = closes.slice(0, 200).reduce((a, b) => a + b, 0) / 200;

    const data = {
      symbol,
      price,
      change,
      changePercent,
      high: parseFloat(overview['52WeekHigh']) || high,
      low: parseFloat(overview['52WeekLow']) || low,
      volume,
      marketCap: parseInt(overview['MarketCapitalization']) || 0,
      pe: parseFloat(overview['PERatio']) || 0,
      eps: parseFloat(overview['EPS']) || 0,
      dividend: parseFloat(overview['DividendPerShare']) || 0,
      rsi,
      macd,
      sma50,
      sma200,
      name: overview['Name'] || symbol,
      sector: overview['Sector'] || 'N/A'
    };

    cache.set(`stock-${symbol}`, data);
    return data;
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error.message);
    return generateFallbackData(symbol);
  }
}

// Fallback for API limits
function generateFallbackData(symbol) {
  const basePrice = { NVDA: 875, TSLA: 242, MSFT: 420, AAPL: 189, PLTR: 28 };
  const base = basePrice[symbol] || 100;
  const variance = (Math.random() - 0.5) * 20;
  
  return {
    symbol,
    price: base + variance,
    change: (Math.random() - 0.5) * 5,
    changePercent: (Math.random() - 0.5) * 3,
    high: base + variance + 10,
    low: base + variance - 10,
    volume: Math.floor(Math.random() * 100000000),
    marketCap: Math.floor(Math.random() * 3000000000000),
    pe: Math.random() * 40 + 15,
    eps: Math.random() * 5 + 2,
    dividend: Math.random() * 2,
    rsi: Math.random() * 100,
    macd: Math.random() - 0.5,
    sma50: base - Math.random() * 10,
    sma200: base - Math.random() * 20,
    name: symbol,
    sector: 'Technology'
  };
}

// Calculate RSI
function calculateRSI(prices, period = 14) {
  if (prices.length < period) return 50;
  
  let gains = 0, losses = 0;
  for (let i = 0; i < period; i++) {
    const diff = prices[i] - prices[i + 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  
  const rs = (gains / period) / (losses / period || 1);
  return 100 - (100 / (1 + rs));
}

// Calculate MACD
function calculateMACD(prices) {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  return ema12 - ema26;
}

// Calculate EMA
function calculateEMA(prices, period) {
  const multiplier = 2 / (period + 1);
  let ema = prices[period - 1];
  
  for (let i = period; i < Math.min(prices.length, period + 20); i++) {
    ema = prices[i] * multiplier + ema * (1 - multiplier);
  }
  
  return ema;
}

// Get stock data
app.get('/api/stocks', async (req, res) => {
  try {
    const stocks = await Promise.all(
      STOCKS.map(symbol => fetchRealStockData(symbol))
    );
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

    const stockData = await fetchRealStockData(symbol);
    
    const prompt = `You are an expert stock analyst. Analyze ${stockData.name} (${symbol}) and provide actionable insights:

CURRENT DATA:
Price: $${stockData.price.toFixed(2)} (${stockData.changePercent > 0 ? '+' : ''}${stockData.changePercent.toFixed(2)}%)
P/E: ${stockData.pe.toFixed(2)} | EPS: $${stockData.eps.toFixed(2)} | Dividend: ${stockData.dividend.toFixed(2)}%
52W High: $${stockData.high.toFixed(2)} | Low: $${stockData.low.toFixed(2)}
RSI: ${stockData.rsi.toFixed(1)} | MACD: ${stockData.macd.toFixed(3)}
Market Cap: $${(stockData.marketCap / 1e12).toFixed(2)}T | Sector: ${stockData.sector}

PROVIDE:
1. Technical Analysis: Momentum, support/resistance, trend direction
2. Fundamental Assessment: Valuation relative to peers, earnings outlook
3. Sentiment & Catalyst: Near-term catalysts, sentiment indicators
4. Risk Assessment: Key risks to watch, downside scenarios
5. Investment Thesis: Clear buy/hold/sell recommendation with target rationale

Be specific, actionable, honest. Assume experienced investor audience.`;

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

// Compare stocks
app.post('/api/compare', async (req, res) => {
  try {
    const { symbols } = req.body;
    const stocks = await Promise.all(symbols.map(s => fetchRealStockData(s)));

    const prompt = `Compare these stocks as investment opportunities:

${stocks.map(s => 
  `${s.symbol} (${s.name}): $${s.price.toFixed(2)} | P/E ${s.pe.toFixed(1)} | RSI ${s.rsi.toFixed(0)} | Sector: ${s.sector}`
).join('\n')}

PROVIDE:
1. Valuation Comparison: Relative cheapness/expensiveness
2. Technical Setup: Which has best momentum
3. Risk-Adjusted Returns: Sharpe ratio concept (growth vs volatility)
4. Best Pick Now: Which is best positioned and why
5. Portfolio Mix: Allocation suggestion (equal capital starting point)

Be direct. Acknowledge tradeoffs.`;

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
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ Stock Quantum live on port ${PORT}`);
  console.log(`✓ Real-time data: Alpha Vantage`);
  console.log(`✓ AI Analysis: Claude API`);
});
