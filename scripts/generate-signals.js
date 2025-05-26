// generate-signals.js
import fs from 'fs';
import axios from 'axios';
import dotenv from 'dotenv';
import { DateTime } from 'luxon';

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
  { symbol: "EXA1.DE", name: "iShares EURO STOXX Banks 30-15 UCITS ETF (DE)", type: "etf", premium: false, price: 12.6910 }
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

function calculateSMA(data, period) {
  if (data.length < period) return null;
  return data.slice(-period).reduce((sum, val) => sum + val, 0) / period;
}

function calculateRSI(data, period = 14) {
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

function calculateMACD(data) {
  const ema12 = calculateSMA(data, 12);
  const ema26 = calculateSMA(data, 26);
  if (ema12 === null || ema26 === null) return 0;
  return ema12 - ema26;
}

function calculateBollingerBands(data, period = 20) {
  if (data.length < period) return { middle: null, upper: null, lower: null };
  const sma = calculateSMA(data, period);
  const stdDev = Math.sqrt(data.slice(-period).reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period);
  return {
    middle: sma,
    upper: sma + 2 * stdDev,
    lower: sma - 2 * stdDev
  };
}

function calculateScore(history) {
  const latest = history[history.length - 1];
  const sma50 = calculateSMA(history, 50);
  const sma200 = calculateSMA(history, 200);
  const rsi = calculateRSI(history);
  const macd = calculateMACD(history);
  const bollinger = calculateBollingerBands(history);
  let score = 50;

  if (sma50 && sma200 && sma50 > sma200) score += 15;
  if (rsi < 30) score += 10;
  if (rsi > 70) score -= 10;
  if (macd > 0) score += 10;
  if (macd < 0) score -= 10;
  if (bollinger.upper && latest > bollinger.upper) score -= 5;
  if (bollinger.lower && latest < bollinger.lower) score += 5;

  return Math.max(0, Math.min(100, score));
}

function determineRecommendation(score) {
  if (score >= 70) return "Acheter";
  if (score <= 40) return "Vendre";
  return "Conserver";
}

async function fetchStock(symbol, type) {
  let url;
  if (type === "crypto") {
    url = `https://www.alphavantage.co/query?function=DIGITAL_CURRENCY_DAILY&symbol=${symbol}&market=USD&apikey=${API_KEY}`;
  } else {
    url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${API_KEY}`;
  }
  const res = await axios.get(url);
  let daily = type === "crypto" ? res.data["Time Series (Digital Currency Daily)"] : res.data["Time Series (Daily)"];
  if (!daily) return null;
  const dates = Object.keys(daily).slice(0, 200).reverse();
  const history = dates.map(date => parseFloat(daily[date]["4a. close (USD)"] || daily[date]["4. close"]));
  const price = history[history.length - 1];
  return { history, price };
}

function isMarketOpen() {
  const now = DateTime.now().setZone('America/New_York');
  const day = now.weekday;
  const hour = now.hour;
  const minute = now.minute;
  if (day >= 6 || hour < 9 || (hour === 9 && minute < 30) || hour > 16) return false;
  return true;
}

function mapRecommendationToCategory(rec) {
  if (rec === "Acheter") return "achat";
  if (rec === "Vendre") return "vente";
  return "conservation";
}

const generate = async () => {
  if (!isMarketOpen()) {
    console.log("La bourse est fermée (heure NY), arrêt de la génération des signaux.");
    return;
  }
  console.log("La bourse est ouverte, génération des signaux...");

  const signals = {
    achat: [],
    vente: [],
    conservation: []
  };

  const allAssets = [...STOCKS, ...ETFS, ...CRYPTOS];

  for (const asset of allAssets) {
    try {
      let data;
      if (asset.type === 'etf') {
        const history = Array.from({ length: 200 }, () => asset.price - (Math.random() * 2 - 1));
        const score = calculateScore(history);
        const recommendation = determineRecommendation(score);
        data = { history, price: asset.price, score, recommendation };
      } else {
        data = await fetchStock(asset.symbol, asset.type);
        if (!data || data.history.length < 50) {
          console.warn(`Données insuffisantes pour ${asset.symbol}`);
          continue;
        }
        data.score = calculateScore(data.history);
        data.recommendation = determineRecommendation(data.score);
      }

      const category = mapRecommendationToCategory(data.recommendation);
      const signal = {
        name: asset.name,
        price: data.price,
        history: data.history,
        recommendation: data.recommendation,
        score: data.score,
        premium: asset.premium,
        updated: new Date().toISOString()
      };

      signal.indicators = {
        rsi: calculateRSI(data.history),
        macd: calculateMACD(data.history),
        bollinger: calculateBollingerBands(data.history),
        sma50: calculateSMA(data.history, 50),
        sma200: calculateSMA(data.history, 200)
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
