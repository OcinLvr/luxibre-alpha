import fs from 'fs';
import axios from 'axios';
import dotenv from 'dotenv';
import { DateTime } from 'luxon';
import yahooFinance from 'yahoo-finance2';

dotenv.config();

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

// Listes des actifs
const STOCKS = [
  { symbol: "AAPL", name: "Apple Inc.", type: "stock", premium: false, market: "US" },
  { symbol: "TSLA", name: "Tesla Inc.", type: "stock", premium: true, market: "US" },
  { symbol: "MSFT", name: "Microsoft Corp.", type: "stock", premium: true, market: "US" },
  { symbol: "AMZN", name: "Amazon.com Inc.", type: "stock", premium: true, market: "US" },
  { symbol: "GOOGL", name: "Alphabet Inc.", type: "stock", premium: false, market: "US" },
  { symbol: "META", name: "Meta Platforms Inc.", type: "stock", premium: true, market: "US" },
  { symbol: "NVDA", name: "NVIDIA Corp.", type: "stock", premium: false, market: "US" },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", type: "stock", premium: true, market: "US" },
  { symbol: "V", name: "Visa Inc.", type: "stock", premium: false, market: "US" },
  { symbol: "WMT", name: "Walmart Inc.", type: "stock", premium: true, market: "US" },
  { symbol: "DIS", name: "The Walt Disney Company", type: "stock", premium: false, market: "US" },
  { symbol: "NFLX", name: "Netflix Inc.", type: "stock", premium: true, market: "US" },
  { symbol: "PYPL", name: "PayPal Holdings Inc.", type: "stock", premium: false, market: "US" },
  { symbol: "ADBE", name: "Adobe Inc.", type: "stock", premium: true, market: "US" },
  { symbol: "CRM", name: "Salesforce.com Inc.", type: "stock", premium: false, market: "US" },
  { symbol: "INTC", name: "Intel Corp.", type: "stock", premium: true, market: "US" },
  { symbol: "CMCSA", name: "Comcast Corp.", type: "stock", premium: false, market: "US" },
  { symbol: "PEP", name: "PepsiCo Inc.", type: "stock", premium: true, market: "US" },
  { symbol: "CSCO", name: "Cisco Systems Inc.", type: "stock", premium: false, market: "US" },
  { symbol: "AVGO", name: "Broadcom Inc.", type: "stock", premium: true, market: "US" }
];

const ETFS = [
  { symbol: "EXA1.AS", name: "iShares EURO STOXX Banks 30-15 UCITS ETF (DE)", type: "etf", premium: false, market: "FR" }
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

// Indicateurs techniques (SMA, RSI, MACD, Bollinger, etc.)
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

function calculateMomentum(data, period = 10) {
  if (data.length < period) return 0;
  return data[data.length - 1] - data[data.length - period];
}

function calculateStochasticRSI(data, period = 14) {
  if (data.length < period + 1) return 0.5;
  const rsiValues = [];
  for (let i = period; i < data.length; i++) {
    const slice = data.slice(i - period, i + 1);
    rsiValues.push(calculateRSI(slice));
  }
  const currentRSI = rsiValues[rsiValues.length - 1];
  const minRSI = Math.min(...rsiValues);
  const maxRSI = Math.max(...rsiValues);
  if (maxRSI - minRSI === 0) return 0.5;
  return (currentRSI - minRSI) / (maxRSI - minRSI);
}

function calculateADX(data, period = 14) {
  if (data.length < period + 1) return 20;
  let plusDM = 0, minusDM = 0, tr = 0;
  for (let i = 1; i <= period; i++) {
    const upMove = data[data.length - i] - data[data.length - i - 1];
    const downMove = data[data.length - i - 1] - data[data.length - i];
    plusDM += upMove > downMove && upMove > 0 ? upMove : 0;
    minusDM += downMove > upMove && downMove > 0 ? downMove : 0;
    tr += Math.abs(data[data.length - i] - data[data.length - i - 1]);
  }
  const plusDI = (plusDM / tr) * 100;
  const minusDI = (minusDM / tr) * 100;
  const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
  return dx;
}

function detectVolumeSpike(volumeHistory) {
  const recentVolumes = volumeHistory.slice(-20);
  const avg = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
  const last = recentVolumes[recentVolumes.length - 1];
  return last > avg * 1.5;
}

function calculateLinearRegressionSlope(data, period = 20) {
  if (data.length < period) return 0;
  const x = [...Array(period).keys()];
  const y = data.slice(-period);
  const xAvg = x.reduce((a, b) => a + b, 0) / period;
  const yAvg = y.reduce((a, b) => a + b, 0) / period;
  const numerator = x.reduce((sum, xi, i) => sum + (xi - xAvg) * (y[i] - yAvg), 0);
  const denominator = x.reduce((sum, xi) => sum + Math.pow(xi - xAvg, 2), 0);
  return numerator / denominator;
}

function calculateScore(history, volumeHistory = []) {
  const latest = history[history.length - 1];
  const indicators = {
    sma50: calculateSMA(history, 50),
    sma200: calculateSMA(history, 200),
    rsi: calculateRSI(history),
    macd: calculateMACD(history),
    bollinger: calculateBollingerBands(history),
    momentum: calculateMomentum(history),
    stochasticRSI: calculateStochasticRSI(history),
    adx: calculateADX(history),
    slope: calculateLinearRegressionSlope(history),
    volumeSpike: detectVolumeSpike(volumeHistory)
  };

  let score = 50;

  if (indicators.sma50 && indicators.sma200 && indicators.sma50 > indicators.sma200) score += 10;
  if (indicators.rsi < 30) score += 10;
  else if (indicators.rsi > 70) score -= 10;
  if (indicators.macd > 0) score += 7;
  else if (indicators.macd < 0) score -= 7;
  if (indicators.stochasticRSI > 0.8) score -= 5;
  else if (indicators.stochasticRSI < 0.2) score += 5;
  if (indicators.adx > 25) score += 5;
  if (indicators.momentum > 0) score += 5;
  if (indicators.bollinger.upper && latest > indicators.bollinger.upper) score -= 5;
  if (indicators.bollinger.lower && latest < indicators.bollinger.lower) score += 5;
  if (indicators.slope > 0) score += 5;
  if (indicators.volumeSpike) score += 3;

  return Math.max(0, Math.min(100, score));
}

function determineRecommendation(score) {
  if (score >= 70) return "Acheter";
  if (score <= 40) return "Vendre";
  return "Conserver";
}

// Fetch des données Alpha Vantage pour actions et cryptos
async function fetchStock(symbol, type) {
  let url;
  if (type === "crypto") {
    url = `https://www.alphavantage.co/query?function=DIGITAL_CURRENCY_DAILY&symbol=${symbol}&market=USD&apikey=${API_KEY}`;
  } else {
    url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${API_KEY}`;
  }
  try {
    const res = await axios.get(url);
    const daily = type === "crypto" ? res.data["Time Series (Digital Currency Daily)"] : res.data["Time Series (Daily)"];
    if (!daily) return null;
    const dates = Object.keys(daily).slice(0, 200).reverse();
    const history = dates.map(date => parseFloat(daily[date]["4a. close (USD)"] || daily[date]["4. close"]));
    const price = history[history.length - 1];
    return { history, price };
  } catch (error) {
    console.error(`Erreur fetchStock ${symbol}:`, error.message);
    return null;
  }
}

// Fetch Yahoo Finance pour ETFs ou marché européen
async function fetchETF(symbol) {
  try {
    const queryOptions = { period1: '2023-01-01', interval: '1d' };
    const result = await yahooFinance.historical(symbol, queryOptions);
    if (!result || result.length === 0) return null;
    const history = result.map(entry => entry.close);
    const price = history[history.length - 1];
    return { history, price };
  } catch (error) {
    console.error(`Erreur fetchETF ${symbol}:`, error.message);
    return null;
  }
}

// Vérifie si un marché est ouvert : NY ou Paris
function isMarketOpen() {
  const nowNY = DateTime.now().setZone('America/New_York');
  const nowParis = DateTime.now().setZone('Europe/Paris');

  function isOpenNY() {
    const day = nowNY.weekday; // 1 = lundi ... 5 = vendredi
    const hour = nowNY.hour;
    const minute = nowNY.minute;
    const isWeekday = day >= 1 && day <= 5;
    const afterOpen = hour > 9 || (hour === 9 && minute >= 30);
    const beforeClose = hour < 16 || (hour === 16 && minute === 0);
    return isWeekday && afterOpen && beforeClose;
  }

  function isOpenParis() {
    const day = nowParis.weekday;
    const hour = nowParis.hour;
    const minute = nowParis.minute;
    const isWeekday = day >= 1 && day <= 5;
    // Bourse de Paris : 9h00 - 17h30 CET
    const afterOpen = hour > 9 || (hour === 9 && minute >= 0);
    const beforeClose = hour < 17 || (hour === 17 && minute <= 30);
    return isWeekday && afterOpen && beforeClose;
  }

  return { nyOpen: isOpenNY(), parisOpen: isOpenParis() };
}

function mapRecommendationToCategory(rec) {
  if (rec === "Acheter") return "achat";
  if (rec === "Vendre") return "vente";
  return "conservation";
}

const generate = async () => {
  const marketStatus = isMarketOpen();
  if (!marketStatus.nyOpen && !marketStatus.parisOpen) {
    console.log("Les marchés NY et Paris sont fermés. Arrêt de la génération.");
    return;
  }
  console.log(`Marché NY ouvert: ${marketStatus.nyOpen}, Marché Paris ouvert: ${marketStatus.parisOpen}. Démarrage génération.`);

  const signals = {
    achat: [],
    vente: [],
    conservation: []
  };

  const allAssets = [...STOCKS, ...ETFS, ...CRYPTOS];

  for (const asset of allAssets) {
    // On traite uniquement les actifs dont le marché est ouvert
    if (
      (asset.market === "US" && !marketStatus.nyOpen) ||
      (asset.market === "FR" && !marketStatus.parisOpen)
    ) {
      console.log(`Marché fermé pour ${asset.symbol} (${asset.market}), on skip.`);
      continue;
    }

    try {
      let data;
      if (asset.type === 'etf' || asset.market === 'FR') {
        data = await fetchETF(asset.symbol);
      } else {
        data = await fetchStock(asset.symbol, asset.type);
      }

      if (!data || !data.history || data.history.length === 0) {
        console.warn(`Pas de données pour ${asset.symbol}`);
        continue;
      }

      const score = calculateScore(data.history);
      const recommendation = determineRecommendation(score);

      // Gestion du contenu premium
      const isPremiumContent = asset.premium;
      const signalEntry = {
        symbol: asset.symbol,
        name: asset.name,
        score,
        recommendation,
        premium: isPremiumContent,
        price: data.price.toFixed(2),
        history: data.history.map(h => h.close)
      };

      signals[mapRecommendationToCategory(recommendation)].push(signalEntry);
      console.log(`Signal ${asset.symbol} - ${recommendation} - score: ${score}`);
    } catch (err) {
      console.error(`Erreur traitement ${asset.symbol}:`, err.message);
    }
  }

  // Sauvegarde dans JSON
  fs.writeFileSync('data/signals.json', JSON.stringify(signals, null, 2));
  console.log("Fichier signals.json généré avec succès !");
};

generate();
