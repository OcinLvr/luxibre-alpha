// scripts/generate-signals.js (ESM version améliorée avec indicateurs techniques)
import fs from 'fs';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const STOCKS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "EXX1.DE", name: "ETF iShares EURO STOXX Banks" }
];

// Moyenne mobile simple
function calculateSMA(data) {
  return data.reduce((sum, val) => sum + val, 0) / data.length;
}

// RSI simplifié (basé sur 5 derniers jours)
function calculateRSI(data) {
  let gains = 0, losses = 0;
  for (let i = 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const rs = gains / (losses || 1); // éviter division par 0
  return 100 - (100 / (1 + rs));
}

// MACD simplifié : différence entre 5j et 10j SMA
function calculateMACD(data) {
  const short = data.slice(-5);
  const long = data.slice(-10);
  const smaShort = calculateSMA(short);
  const smaLong = calculateSMA(long);
  return smaShort - smaLong;
}

function calculateRecommendation(history) {
  const shortHistory = history.slice(-5);
  const longHistory = history.slice(-10);
  const latest = history[history.length - 1];
  const first = history[history.length - 6];

  const change = ((latest - first) / first) * 100;
  const sma = calculateSMA(shortHistory);
  const rsi = calculateRSI(shortHistory);
  const macd = calculateMACD(history);

  if ((change > 1 && rsi < 70 && macd > 0 && latest > sma)) return "Acheter";
  if ((change < -1 && rsi > 30 && macd < 0 && latest < sma)) return "Vendre";
  return "Conserver";
}

async function fetchStock(symbol) {
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${API_KEY}`;
  const res = await axios.get(url);
  const daily = res.data["Time Series (Daily)"];
  if (!daily) return null;

  const dates = Object.keys(daily).slice(0, 10).reverse();
  const history = dates.map(date => parseFloat(daily[date]["4. close"]));
  const price = history[history.length - 1];

  return { history, price };
}

const generate = async () => {
  const signals = [];

  for (const stock of STOCKS) {
    try {
      const data = await fetchStock(stock.symbol);
      if (!data || data.history.length < 10) continue;

      const recommendation = calculateRecommendation(data.history);
      signals.push({
        name: stock.name,
        price: data.price,
        history: data.history,
        recommendation,
        updated: new Date().toISOString()
      });
    } catch (err) {
      console.error(`Erreur pour ${stock.symbol}:`, err.message);
    }
  }

  fs.writeFileSync('data/signals.json', JSON.stringify({ signals }, null, 2));
};

generate();
