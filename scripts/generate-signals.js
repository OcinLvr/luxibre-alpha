// scripts/generate-signals.js
import fs from 'fs';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const STOCKS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "EXX1.DE", name: "ETF iShares EURO STOXX Banks" }
];

function calculateRecommendation(history) {
  const latest = history[history.length - 1];
  const past = history[0];
  const change = ((latest - past) / past) * 100;

  if (change > 1.5) return "Acheter";
  if (change < -1.5) return "Vendre";
  return "Conserver";
}

async function fetchStock(symbol) {
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${API_KEY}`;
  const res = await axios.get(url);
  const daily = res.data["Time Series (Daily)"];
  if (!daily) return null;

  const dates = Object.keys(daily).slice(0, 5).reverse(); // 5 derniers jours
  const history = dates.map(date => parseFloat(daily[date]["4. close"]));
  const price = history[history.length - 1];

  return { history, price };
}

const generateSignals = async () => {
  const signals = [];

  for (const stock of STOCKS) {
    try {
      const data = await fetchStock(stock.symbol);
      if (!data) continue;

      const recommendation = calculateRecommendation(data.history);
      signals.push({
        name: stock.name,
        price: data.price,
        history: data.history,
        recommendation
      });
    } catch (err) {
      console.error(`Erreur pour ${stock.symbol}:`, err.message);
    }
  }

  fs.writeFileSync(path.join(__dirname, '../data/signals.json'), JSON.stringify({ signals }, null, 2));
  console.log("Fichier signals.json généré !");
};

generateSignals();
