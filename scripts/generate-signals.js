// scripts/generate-signals.js (ESM version finale améliorée)
import fs from 'fs';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const STOCKS = [
  { symbol: "AAPL", name: "Apple Inc.", premium: false },
  { symbol: "TSLA", name: "Tesla Inc.", premium: true },
  { symbol: "EXX1.DE", name: "ETF iShares EURO STOXX Banks", premium: false },
  { symbol: "MSFT", name: "Microsoft Corp.", premium: true },
  { symbol: "AMZN", name: "Amazon.com Inc.", premium: true },
  { symbol: "GOOGL", name: "Alphabet Inc.", premium: false },
  { symbol: "META", name: "Meta Platforms Inc.", premium: true },
  { symbol: "NVDA", name: "NVIDIA Corp.", premium: false },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", premium: true },
  { symbol: "V", name: "Visa Inc.", premium: false },
  { symbol: "WMT", name: "Walmart Inc.", premium: true },
  { symbol: "DIS", name: "The Walt Disney Company", premium: false },
  { symbol: "NFLX", name: "Netflix Inc.", premium: true },
  { symbol: "PYPL", name: "PayPal Holdings Inc.", premium: false },
  { symbol: "ADBE", name: "Adobe Inc.", premium: true },
  { symbol: "CRM", name: "Salesforce.com Inc.", premium: false },
  { symbol: "INTC", name: "Intel Corp.", premium: true },
  { symbol: "CMCSA", name: "Comcast Corp.", premium: false },
  { symbol: "PEP", name: "PepsiCo Inc.", premium: true },
  { symbol: "CSCO", name: "Cisco Systems Inc.", premium: false },
  { symbol: "AVGO", name: "Broadcom Inc.", premium: true }
];

// Moyenne mobile simple
function calculateSMA(data) {
  if (data.length === 0) return 0;
  return data.reduce((sum, val) => sum + val, 0) / data.length;
}

// RSI simplifié (basé sur 5 derniers jours)
function calculateRSI(data) {
  if (data.length < 2) return 50; // neutre si pas assez de données
  let gains = 0, losses = 0;
  for (let i = 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  if (gains + losses === 0) return 50; // éviter division par 0 ou RSI extrême
  const rs = gains / (losses || 1);
  return 100 - (100 / (1 + rs));
}

// MACD simplifié : différence entre SMA 5j et SMA 10j
function calculateMACD(data) {
  const short = data.slice(-5);
  const long = data.slice(-10);
  const smaShort = calculateSMA(short);
  const smaLong = calculateSMA(long);
  return smaShort - smaLong;
}

// Calcul de la recommandation finale selon indicateurs combinés
function calculateRecommendation(history) {
  if (history.length < 10) return "Conserver"; // trop peu de données

  const shortHistory = history.slice(-5);
  const latest = history[history.length - 1];
  const first = history[history.length - 6];

  const change = ((latest - first) / first) * 100;
  const sma = calculateSMA(shortHistory);
  const rsi = calculateRSI(shortHistory);
  const macd = calculateMACD(history);

  if (change > 1 && rsi < 70 && macd > 0 && latest > sma) return "Acheter";
  if (change < -1 && rsi > 30 && macd < 0 && latest < sma) return "Vendre";
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
      if (!data || data.history.length < 10) {
        console.warn(`Données insuffisantes pour ${stock.symbol}`);
        continue;
      }

      const recommendation = calculateRecommendation(data.history);
      signals.push({
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

  fs.writeFileSync('data/signals.json', JSON.stringify({ signals }, null, 2));
  console.log("Fichier signals.json généré avec succès !");
};

generate();
