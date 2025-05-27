// generate-signals.js
import fs from 'fs';
import axios from 'axios';
import dotenv from 'dotenv';
import { DateTime } from 'luxon';
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

  // Pondérations intelligentes
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
  if (score >= 70) return "Achat";
  if (score >= 40) return "Conserver";
  return "Vente";
}

// --- Gestion des horaires des marchés ---

function isMarketOpenUS() {
  const now = DateTime.now().setZone('America/New_York');
  const day = now.weekday;
  const hour = now.hour;
  const minute = now.minute;

  const isWeekday = day >= 1 && day <= 5;
  const afterOpen = hour > 9 || (hour === 9 && minute >= 30);
  const beforeClose = hour < 17 || (hour === 17 && minute <= 30);

  return isWeekday && afterOpen && beforeClose;
}

function isMarketOpenEU() {
  const now = DateTime.now().setZone('Europe/Paris');
  const day = now.weekday;
  const hour = now.hour;
  const minute = now.minute;

  const isWeekday = day >= 1 && day <= 5;
  const afterOpen = hour > 9 || (hour === 9 && minute >= 0);
  const beforeClose = hour < 17 || (hour === 17 && minute <= 30);

  return isWeekday && afterOpen && beforeClose;
}

function isMarketOpen(type) {
  if (type === 'etf') {
    return isMarketOpenEU();
  } else if (type === 'stock' || type === 'crypto') {
    return isMarketOpenUS();
  }
  return isMarketOpenUS();
}

// --- Fonction principale ---

async function fetchHistoricalData(symbol, period = '6mo', interval = '1d') {
  try {
    return await yahooFinance.historical(symbol, { period1: `6mo`, interval });
  } catch (error) {
    console.error(`Erreur récupération historique pour ${symbol}:`, error.message);
    return null;
  }
}

async function generateSignals() {
  const allAssets = [...STOCKS, ...ETFS, ...CRYPTOS];
  const signals = [];

  for (const asset of allAssets) {
    if (!isMarketOpen(asset.type)) {
      console.log(`Marché fermé pour ${asset.name} (${asset.symbol}) [${asset.type}], signal non généré.`);
      continue;
    }

    const data = await fetchHistoricalData(asset.symbol);
    if (!data || data.length === 0) {
      console.log(`Pas de données pour ${asset.name} (${asset.symbol}), signal non généré.`);
      continue;
    }

    // Extraire les prix de clôture et volumes
    const closes = data.map(d => d.close);
    const volumes = data.map(d => d.volume);

    const score = calculateScore(closes, volumes);
    const recommendation = determineRecommendation(score);

    signals.push({
      symbol: asset.symbol,
      name: asset.name,
      type: asset.type,
      premium: asset.premium,
      score: Math.round(score),
      recommendation,
      date: new Date().toISOString()
    });

    console.log(`Signal généré pour ${asset.symbol} : ${recommendation} (score: ${Math.round(score)})`);
  }

  // Sauvegarde dans JSON
  fs.writeFileSync('./data/signals.json', JSON.stringify(signals, null, 2));
  console.log('Génération des signaux terminée.');
}

// Lancer la génération
generateSignals();
