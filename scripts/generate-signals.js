// generate-signals.js
import fs from 'fs';
import axios from 'axios';
import dotenv from 'dotenv';
import yahooFinance from 'yahoo-finance2';

dotenv.config();

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

const STOCKS = [
  { symbol: "AAPL", name: "Apple Inc.", type: "stock", premium: false },
  { symbol: "TSLA", name: "Tesla Inc.", type: "stock", premium: true },
  { symbol: "MSFT", name: "Microsoft Corp.", type: "stock", premium: true },
  { symbol: "AMZN", name: "Amazon.com Inc.", type: "stock", premium: true },
  { symbol: "GOOGL", name: "Alphabet Inc.", type: "stock", premium: false },
  { symbol: "META", name: "Meta Platforms Inc.", type: "stock", premium: true },
  { symbol: "NVDA", name: "NVIDIA Corp.", type: "stock", premium: false },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", type: "stock", premium: true },
  { symbol: "V", name: "Visa Inc.", type: "stock", premium: false },
  { symbol: "WMT", name: "Walmart Inc.", type: "stock", premium: true },
  { symbol: "DIS", name: "The Walt Disney Company", type: "stock", premium: false },
  { symbol: "NFLX", name: "Netflix Inc.", type: "stock", premium: true },
  { symbol: "PYPL", name: "PayPal Holdings Inc.", type: "stock", premium: false },
  { symbol: "ADBE", name: "Adobe Inc.", type: "stock", premium: true },
  { symbol: "CRM", name: "Salesforce.com Inc.", type: "stock", premium: false },
  { symbol: "INTC", name: "Intel Corp.", type: "stock", premium: true },
  { symbol: "CMCSA", name: "Comcast Corp.", type: "stock", premium: false },
  { symbol: "PEP", name: "PepsiCo Inc.", type: "stock", premium: true },
  { symbol: "CSCO", name: "Cisco Systems Inc.", type: "stock", premium: false },
  { symbol: "AVGO", name: "Broadcom Inc.", type: "stock", premium: true }
];

const ETFS = [
  { symbol: "EXA1.AS", name: "iShares EURO STOXX Banks 30-15 UCITS ETF (DE)", type: "etf", premium: false }
];

const CRYPTOS = [
  { symbol: "BTC", name: "Bitcoin", type: "crypto", premium: true },
  { symbol: "ETH", name: "Ethereum", type: "crypto", premium: true },
  { symbol: "BNB", name: "Binance Coin", type: "crypto", premium: true },
  { symbol: "XRP", name: "XRP", type: "crypto", premium: false },
  { symbol: "ADA", name: "Cardano", type: "crypto", premium: true },
  { symbol: "SOL", name: "Solana", type: "crypto", premium: false },
  { symbol: "DOT", name: "Polkadot", type: "crypto", premium: true },
  { symbol: "DOGE", name: "Dogecoin", type: "crypto", premium: false }
];

function SMA(data, period) {
  if (data.length < period) return null;
  return data.slice(-period).reduce((sum, val) => sum + val, 0) / period;
}

function EMA(data, period) {
  if (data.length < period) return null;
  const k = 2 / (period + 1);
  let ema = SMA(data.slice(0, period), period);
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  return ema;
}

function RSI(data, period = 14) {
  if (data.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = data[data.length - i] - data[data.length - i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const rs = gains / (losses || 1);
  return 100 - (100 / (1 + rs));
}

function MACD(data) {
  const ema12 = EMA(data, 12);
  const ema26 = EMA(data, 26);
  return ema12 !== null && ema26 !== null ? ema12 - ema26 : 0;
}

function BollingerBands(data, period = 20) {
  if (data.length < period) return { middle: null, upper: null, lower: null };
  const sma = SMA(data, period);
  const stdDev = Math.sqrt(data.slice(-period).reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period);
  return {
    middle: sma,
    upper: sma + 2 * stdDev,
    lower: sma - 2 * stdDev
  };
}

function ADX(data, period = 14) {
  if (data.length < period + 1) return 20;
  let upMoves = [], downMoves = [], tr = [];
  for (let i = 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    upMoves.push(diff > 0 ? diff : 0);
    downMoves.push(diff < 0 ? -diff : 0);
    tr.push(Math.abs(diff));
  }
  const plusDI = 100 * SMA(upMoves.slice(-period), period) / SMA(tr.slice(-period), period);
  const minusDI = 100 * SMA(downMoves.slice(-period), period) / SMA(tr.slice(-period), period);
  const dx = 100 * Math.abs(plusDI - minusDI) / (plusDI + minusDI);
  return dx;
}

function calculateScore(history) {
  const latest = history[history.length - 1];
  const sma50 = SMA(history, 50);
  const sma200 = SMA(history, 200);
  const rsi = RSI(history);
  const macd = MACD(history);
  const bollinger = BollingerBands(history);
  const adx = ADX(history);

  let score = 50;
  if (sma50 && sma200 && sma50 > sma200) score += 15;
  if (rsi < 30) score += 10;
  else if (rsi > 70) score -= 10;
  if (macd > 0) score += 10;
  else if (macd < 0) score -= 10;
  if (bollinger.upper && latest > bollinger.upper) score -= 5;
  if (bollinger.lower && latest < bollinger.lower) score += 5;
  if (adx > 25) score += 5;
  else score -= 5;

  return Math.max(0, Math.min(100, score));
}

function predictFuturePrices(history) {
  const last = history[history.length - 1];
  const slope = (last - history[history.length - 8]) / 7;
  return {
    day1: +(last + slope).toFixed(2),
    day3: +(last + 3 * slope).toFixed(2),
    day7: +(last + 7 * slope).toFixed(2)
  };
}

function performance30Jours(history) {
  if (history.length < 30) return null;
  const old = history[history.length - 30];
  const last = history[history.length - 1];
  return +(((last - old) / old) * 100).toFixed(2);
}

function determineRecommendation(score) {
  if (score >= 75) return "Acheter fort";
  if (score >= 65) return "Acheter";
  if (score <= 25) return "Vendre fort";
  if (score <= 35) return "Vendre";
  return "Conserver";
}

async function fetchStock(symbol, type) {
  let url = type === "crypto"
    ? `https://www.alphavantage.co/query?function=DIGITAL_CURRENCY_DAILY&symbol=${symbol}&market=USD&apikey=${API_KEY}`
    : `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${API_KEY}`;
  const res = await axios.get(url);
  const daily = type === "crypto" ? res.data["Time Series (Digital Currency Daily)"] : res.data["Time Series (Daily)"];
  if (!daily) return null;
  const dates = Object.keys(daily).slice(0, 250).reverse();
  const history = dates.map(date => parseFloat(daily[date]["4a. close (USD)"] || daily[date]["4. close"]));
  const price = history[history.length - 1];
  return { history, price };
}

async function fetchETF(symbol) {
  try {
    const result = await yahooFinance.historical(symbol, { period1: '2023-01-01', interval: '1d' });
    const history = result.map(entry => entry.close);
    const price = history[history.length - 1];
    return { history, price };
  } catch (err) {
    console.error(`Erreur données ETF ${symbol}:`, err.message);
    return null;
  }
}

function mapRecommendationToCategory(rec) {
  if (rec.includes("Acheter")) return "achat";
  if (rec.includes("Vendre")) return "vente";
  return "conservation";
}

const generate = async () => {
  const signals = { achat: [], vente: [], conservation: [] };
  const allAssets = [...STOCKS, ...ETFS, ...CRYPTOS];

  for (const asset of allAssets) {
    try {
      const data = asset.type === 'etf'
        ? await fetchETF(asset.symbol)
        : await fetchStock(asset.symbol, asset.type);
      if (!data || data.history.length < 50) continue;

      const score = calculateScore(data.history);
      const recommendation = determineRecommendation(score);
      const category = mapRecommendationToCategory(recommendation);

      const signal = {
        name: asset.name,
        symbol: asset.symbol,
        price: data.price,
        history: data.history,
        recommendation,
        score,
        premium: asset.premium,
        updated: new Date().toISOString(),
        indicators: {
          rsi: RSI(data.history),
          macd: MACD(data.history),
          bollinger: BollingerBands(data.history),
          sma50: SMA(data.history, 50),
          sma200: SMA(data.history, 200),
          ema20: EMA(data.history, 20),
          adx: ADX(data.history)
        },
        predictions: asset.premium ? predictFuturePrices(data.history) : null,
        performance30j: performance30Jours(data.history)
      };

      signals[category].push(signal);
    } catch (err) {
      console.error(`Erreur pour ${asset.symbol}:`, err.message);
    }
  }

  fs.writeFileSync('data/signals.json', JSON.stringify(signals, null, 2));
  console.log("Fichier signals.json généré avec succès !");
};

generate();
