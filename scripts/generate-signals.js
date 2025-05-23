// scripts/generate-signals.js (ESM version finale améliorée)
import fs from 'fs';
import axios from 'axios';
import dotenv from 'dotenv';

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
  { symbol: "EXI4", name: "iShares EURO STOXX Banks 30-15 UCITS ETF (DE) EUR (Acc)", type: "etf", premium: false },
  { symbol: "EUNL.DE", name: "iShares STOXX Europe 600 Health Care UCITS ETF (DE)", type: "etf", premium: true },
  { symbol: "EXS1.DE", name: "iShares STOXX Europe 600 UCITS ETF (DE)", type: "etf", premium: false },
  { symbol: "EXH1.DE", name: "iShares STOXX Europe 600 Financial Services UCITS ETF (DE)", type: "etf", premium: true },
  { symbol: "EXV1.DE", name: "iShares STOXX Europe 600 Utilities UCITS ETF (DE)", type: "etf", premium: false }
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

// Moyenne mobile simple
function calculateSMA(data, period = 5) {
  if (data.length < period) return null;
  return data.slice(-period).reduce((sum, val) => sum + val, 0) / period;
}

// RSI simplifié (basé sur 14 derniers jours)
function calculateRSI(data, period = 14) {
  if (data.length < period) return 50; // neutre si pas assez de données
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = data[i] - data[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  if (gains + losses === 0) return 50; // éviter division par 0 ou RSI extrême
  const rs = gains / (losses || 1);
  return 100 - (100 / (1 + rs));
}

// MACD simplifié : différence entre SMA 12j et SMA 26j
function calculateMACD(data) {
  const sma12 = calculateSMA(data, 12);
  const sma26 = calculateSMA(data, 26);
  if (sma12 === null || sma26 === null) return 0;
  return sma12 - sma26;
}

// Bollinger Bands
function calculateBollingerBands(data, period = 20) {
  if (data.length < period) return { middle: null, upper: null, lower: null };
  const sma = calculateSMA(data, period);
  const stdDev = Math.sqrt(data.slice(-period).reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period);
  return {
    middle: sma,
    upper: sma + (stdDev * 2),
    lower: sma - (stdDev * 2)
  };
}

// Calcul de la recommandation finale selon indicateurs combinés
function calculateRecommendation(history, type) {
  if (history.length < 26) return "Conserver"; // trop peu de données

  const latest = history[history.length - 1];
  const first = history[history.length - 26];
  const change = ((latest - first) / first) * 100;
  const sma = calculateSMA(history, 5);
  const rsi = calculateRSI(history, 14);
  const macd = calculateMACD(history);
  const bollinger = calculateBollingerBands(history);

  if (type === "crypto") {
    if (change > 5 && rsi < 70 && macd > 0 && latest > sma && latest < bollinger.upper) return "Acheter";
    if (change < -5 && rsi > 30 && macd < 0 && latest < sma && latest > bollinger.lower) return "Vendre";
  } else {
    if (change > 2 && rsi < 70 && macd > 0 && latest > sma && latest < bollinger.upper) return "Acheter";
    if (change < -2 && rsi > 30 && macd < 0 && latest < sma && latest > bollinger.lower) return "Vendre";
  }

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
  let daily;
  if (type === "crypto") {
    daily = res.data["Time Series (Digital Currency Daily)"];
  } else {
    daily = res.data["Time Series (Daily)"];
  }

  if (!daily) return null;

  const dates = Object.keys(daily).slice(0, 26).reverse();
  const history = dates.map(date => parseFloat(daily[date]["4a. close (USD)"] || daily[date]["4. close"]));
  const price = history[history.length - 1];

  return { history, price };
}

const generate = async () => {
  const signals = { etfs: [], stocks: [], cryptos: [] };

  for (const stock of STOCKS) {
    try {
      const data = await fetchStock(stock.symbol, stock.type);
      if (!data || data.history.length < 26) {
        console.warn(`Données insuffisantes pour ${stock.symbol}`);
        continue;
      }

      const recommendation = calculateRecommendation(data.history, stock.type);
      signals[stock.type === "etf" ? "etfs" : "stocks"].push({
        name: stock.name,
        price: data.price,
        history: data.history,
        recommendation,
        premium: stock.premium,
        updated: new Date().toISOString()
      });
    } catch (err) {
      console.error(`Erreur pour ${stock.symbol}:`, err.message);
    }
  }

  for (const etf of ETFS) {
    try {
      const data = await fetchStock(etf.symbol, etf.type);
      if (!data || data.history.length < 26) {
        console.warn(`Données insuffisantes pour ${etf.symbol}`);
        continue;
      }

      const recommendation = calculateRecommendation(data.history, etf.type);
      signals.etfs.push({
        name: etf.name,
        price: data.price,
        history: data.history,
        recommendation,
        premium: etf.premium,
        updated: new Date().toISOString()
      });
    } catch (err) {
      console.error(`Erreur pour ${etf.symbol}:`, err.message);
    }
  }

  for (const crypto of CRYPTOS) {
    try {
      const data = await fetchStock(crypto.symbol, crypto.type);
      if (!data || data.history.length < 26) {
        console.warn(`Données insuffisantes pour ${crypto.symbol}`);
        continue;
      }

      const recommendation = calculateRecommendation(data.history, crypto.type);
      signals.cryptos.push({
        name: crypto.name,
        price: data.price,
        history: data.history,
        recommendation,
        premium: crypto.premium,
        updated: new Date().toISOString(),
        indicators: {
          rsi: calculateRSI(data.history, 14),
          macd: calculateMACD(data.history),
          bollinger: calculateBollingerBands(data.history)
        }
      });
    } catch (err) {
      console.error(`Erreur pour ${crypto.symbol}:`, err.message);
    }
  }

  fs.writeFileSync('data/signals.json', JSON.stringify(signals, null, 2));
  console.log("Fichier signals.json généré avec succès !");
};

generate();
