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

// Utilitaires classiques
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

// Indicateurs avancés
function ATR(highs, lows, closes, period = 14) {
  if (closes.length < period + 1) return null;
  let trs = [];
  for (let i = 1; i < closes.length; i++) {
    trs.push(
      Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      )
    );
  }
  return SMA(trs.slice(-period), period);
}
function StochasticOscillator(closes, lows, highs, period = 14) {
  if (closes.length < period) return null;
  const recentClose = closes[closes.length - 1];
  const low = Math.min(...lows.slice(-period));
  const high = Math.max(...highs.slice(-period));
  return 100 * ((recentClose - low) / (high - low));
}
function VWAP(closes, volumes) {
  if (closes.length !== volumes.length) return null;
  let cumulativePV = 0, cumulativeVol = 0;
  for (let i = 0; i < closes.length; i++) {
    cumulativePV += closes[i] * volumes[i];
    cumulativeVol += volumes[i];
  }
  return cumulativePV / cumulativeVol;
}
function momentum(data, period = 7) {
  if (data.length < period + 1) return 0;
  return data[data.length - 1] - data[data.length - period - 1];
}
function sharpeRatio(returns, riskFree = 0.01) {
  const avg = SMA(returns, returns.length);
  const std = Math.sqrt(SMA(returns.map(r => Math.pow(r - avg, 2)), returns.length));
  return std === 0 ? 0 : (avg - riskFree) / std;
}
function linearRegressionPrediction(history, days = [1, 3, 7]) {
  const n = history.length;
  if (n < 8) return {};
  const xs = Array.from({ length: n }, (_, i) => i + 1);
  const ys = history;
  const meanX = xs.reduce((a, b) => a + b) / n;
  const meanY = ys.reduce((a, b) => a + b) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const b = num / den;
  const a = meanY - b * meanX;
  const lastX = xs[n - 1];
  const predictions = {};
  for (const d of days) {
    predictions[`day${d}`] = +(a + b * (lastX + d)).toFixed(2);
  }
  return predictions;
}
function performance30Jours(history) {
  if (history.length < 30) return null;
  const old = history[history.length - 30];
  const last = history[history.length - 1];
  return +(((last - old) / old) * 100).toFixed(2);
}

// Mapping, harmonisation, etc.
function assetTypeToDashboardType(assetType) {
  if (assetType === "stock") return "actions";
  if (assetType === "etf") return "etf";
  if (assetType === "crypto") return "cryptomonnaie";
  return assetType;
}
function mapRecommendationToCategory(rec) {
  if (rec.includes("Acheter")) return "achat";
  if (rec.includes("Vendre")) return "vente";
  return "conservation";
}

// Algorithme de score ultra-fiable & pondéré
function ultraSophisticatedScore({ closes, highs, lows, volumes }) {
  // Calcul des indicateurs
  const latest = closes[closes.length - 1];
  const sma50 = SMA(closes, 50);
  const sma200 = SMA(closes, 200);
  const rsi = RSI(closes);
  const macd = MACD(closes);
  const bollinger = BollingerBands(closes);
  const adx = ADX(closes);
  const atr = ATR(highs, lows, closes);
  const stoch = StochasticOscillator(closes, lows, highs);
  const vwap = VWAP(closes.slice(-30), volumes.slice(-30));
  const mom = momentum(closes, 7);

  // Retour/jour pour Sharpe
  const returns = [];
  for (let i = 1; i < closes.length; i++)
    returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  const sharpe = sharpeRatio(returns);

  // Pondérations par indicateur + analyse croisée
  let score = 50;
  let reasons = [];

  // Tendance long terme
  if (sma50 && sma200) {
    if (sma50 > sma200) { score += 12; reasons.push('Golden cross (sma50 > sma200)'); }
    if (sma50 < sma200) { score -= 10; reasons.push('Death cross (sma50 < sma200)'); }
  }

  // Momentum
  if (mom > 0) { score += 4; reasons.push('Momentum haussier'); }
  if (mom < 0) { score -= 4; reasons.push('Momentum baissier'); }

  // Surachat/survente
  if (rsi < 30) { score += 8; reasons.push('RSI survendu'); }
  if (rsi > 70) { score -= 8; reasons.push('RSI suracheté'); }

  // MACD
  if (macd > 0) { score += 6; reasons.push('MACD positif'); }
  if (macd < 0) { score -= 6; reasons.push('MACD négatif'); }

  // Bollinger
  if (bollinger.upper && latest > bollinger.upper) { score -= 3; reasons.push('Cours au-dessus Bollinger supérieur'); }
  if (bollinger.lower && latest < bollinger.lower) { score += 3; reasons.push('Cours sous Bollinger inférieur'); }

  // ADX
  if (adx > 25) { score += 2; reasons.push('Tendance forte (ADX>25)'); }
  else { score -= 2; reasons.push('Tendance faible (ADX<25)'); }

  // ATR (volatilité)
  if (atr && atr > 0.04 * latest) { score -= 2; reasons.push('Volatilité élevée'); }

  // Stochastique
  if (stoch !== null && stoch < 20) { score += 2; reasons.push('Stochastique survendu'); }
  if (stoch !== null && stoch > 80) { score -= 2; reasons.push('Stochastique suracheté'); }

  // VWAP
  if (vwap && latest > vwap) { score += 1; reasons.push('Cours au-dessus VWAP'); }
  if (vwap && latest < vwap) { score -= 1; reasons.push('Cours sous VWAP'); }

  // Sharpe ratio
  if (sharpe > 0.7) { score += 3; reasons.push('Bon ratio rendement/risque'); }
  if (sharpe < 0.2) { score -= 3; reasons.push('Risqué pour peu de rendement'); }

  // Contradictions => affaiblissement du score (incertitude)
  const bullish = [sma50 > sma200, rsi < 30, macd > 0, mom > 0, stoch < 20];
  const bearish = [sma50 < sma200, rsi > 70, macd < 0, mom < 0, stoch > 80];
  const sumBull = bullish.filter(Boolean).length;
  const sumBear = bearish.filter(Boolean).length;
  if (sumBull > 0 && sumBear > 0) {
    score = 50 + (score - 50) * 0.6; // on réduit l'écart
    reasons.push('Signaux contradictoires : fiabilité réduite');
  }

  // Limitation
  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, reasons };
}

// Prédiction avancée
function advancedPrediction(history, volatility) {
  const pred = linearRegressionPrediction(history);
  if (volatility > 0.06) {
    Object.keys(pred).forEach(k => pred[k] = null); // Si trop volatil, pas de prédiction fiable
    pred.confidence = "Faible (volatilité élevée)";
  } else {
    pred.confidence = "Bonne";
  }
  return pred;
}

// Détermination recommandation + niveau confiance
function determineRecommendation(score, reasons) {
  let reco = "Conserver";
  let confiance = "Modérée";
  if (score >= 80) { reco = "Acheter fort"; confiance = "Forte"; }
  else if (score >= 65) { reco = "Acheter"; confiance = "Bonne"; }
  else if (score <= 20) { reco = "Vendre fort"; confiance = "Forte"; }
  else if (score <= 35) { reco = "Vendre"; confiance = "Bonne"; }
  if (reasons.some(r => r.includes('Signaux contradictoires'))) confiance = "Faible";
  return { reco, confiance };
}

// Fetchers
async function fetchStockFull(symbol, type) {
  let url = type === "crypto"
    ? `https://www.alphavantage.co/query?function=DIGITAL_CURRENCY_DAILY&symbol=${symbol}&market=USD&apikey=${API_KEY}`
    : `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${API_KEY}`;
  const res = await axios.get(url);
  const daily = type === "crypto" ? res.data["Time Series (Digital Currency Daily)"] : res.data["Time Series (Daily)"];
  if (!daily) return null;
  const dates = Object.keys(daily).slice(0, 250).reverse();
  const closes = dates.map(date => parseFloat(daily[date]["4a. close (USD)"] || daily[date]["4. close"]));
  const highs = dates.map(date => parseFloat(daily[date]["2. high"] || daily[date]["2a. high (USD)"] || closes[0]));
  const lows = dates.map(date => parseFloat(daily[date]["3. low"] || daily[date]["3a. low (USD)"] || closes[0]));
  const volumes = dates.map(date => parseFloat(daily[date]["5. volume"] || daily[date]["5. volume"] || 1));
  return { closes, highs, lows, volumes, price: closes[closes.length - 1] };
}
async function fetchETFfull(symbol) {
  try {
    const result = await yahooFinance.historical(symbol, { period1: '2023-01-01', interval: '1d' });
    const closes = result.map(e => e.close);
    const highs = result.map(e => e.high || e.close);
    const lows = result.map(e => e.low || e.close);
    const volumes = result.map(e => e.volume || 1);
    const price = closes[closes.length - 1];
    return { closes, highs, lows, volumes, price };
  } catch (err) {
    console.error(`Erreur données ETF ${symbol}:`, err.message);
    return null;
  }
}

// Fusion signaux (inchangé)
function mergeMoveAndUpdate(existingSignals, newSignals) {
  const newBySymbol = {};
  for (const cat of ["achat", "vente", "conservation"]) {
    for (const sig of newSignals[cat]) {
      newBySymbol[sig.symbol] = { ...sig, category: cat };
    }
  }
  const merged = { achat: [], vente: [], conservation: [] };
  for (const cat of ["achat", "vente", "conservation"]) {
    if (!existingSignals || !existingSignals[cat]) continue;
    for (const sig of existingSignals[cat]) {
      if (!newBySymbol[sig.symbol]) {
        merged[cat].push(sig);
      }
    }
  }
  for (const cat of ["achat", "vente", "conservation"]) {
    for (const sig of newSignals[cat]) {
      merged[cat].push(sig);
    }
  }
  return merged;
}

// Générateur principal
const generate = async (type) => {
  let existingSignals = null;
  if (fs.existsSync('data/signals.json')) {
    existingSignals = JSON.parse(fs.readFileSync('data/signals.json', 'utf8'));
  }

  let assetsToProcess = [];
  if (type === 'cryptos') {
    assetsToProcess = [...CRYPTOS];
  } else if (type === 'stocks-etfs') {
    assetsToProcess = [...STOCKS, ...ETFS];
  } else {
    assetsToProcess = [...STOCKS, ...ETFS, ...CRYPTOS];
  }

  const newSignals = { achat: [], vente: [], conservation: [] };

  for (const asset of assetsToProcess) {
    try {
      const data =
        asset.type === 'etf'
          ? await fetchETFfull(asset.symbol)
          : await fetchStockFull(asset.symbol, asset.type);

      if (!data || data.closes.length < 50) continue;

      // Score ultra-fiable + audit
      const { score, reasons } = ultraSophisticatedScore(data);
      const { reco, confiance } = determineRecommendation(score, reasons);
      const category = mapRecommendationToCategory(reco);
      const signalType = assetTypeToDashboardType(asset.type);
      const volatility = ATR(data.highs, data.lows, data.closes, 14) / data.closes[data.closes.length - 1];

      const signal = {
        name: asset.name,
        symbol: asset.symbol,
        type: signalType,
        price: data.price,
        history: data.closes,
        recommendation: reco,
        score,
        premium: asset.premium,
        updated: new Date().toISOString(),
        confidence: confiance,
        audit: reasons,
        indicators: {
          rsi: RSI(data.closes),
          macd: MACD(data.closes),
          bollinger: BollingerBands(data.closes),
          sma50: SMA(data.closes, 50),
          sma200: SMA(data.closes, 200),
          ema20: EMA(data.closes, 20),
          adx: ADX(data.closes),
          atr: ATR(data.highs, data.lows, data.closes),
          stochastic: StochasticOscillator(data.closes, data.lows, data.highs),
          vwap: VWAP(data.closes.slice(-30), data.volumes.slice(-30)),
          momentum: momentum(data.closes, 7),
          sharpe: sharpeRatio(data.closes)
        },
        predictions: advancedPrediction(data.closes, volatility),
        performance30j: performance30Jours(data.closes)
      };

      console.log(`[${category.toUpperCase()}][${confiance}] ${signal.symbol} | Score: ${score} | Reco: ${reco}`, reasons);

      const existingIndex = newSignals[category].findIndex(s => s.symbol === asset.symbol);
      if (existingIndex >= 0) {
        newSignals[category][existingIndex] = signal;
      } else {
        newSignals[category].push(signal);
      }
    } catch (err) {
      console.error(`Erreur pour ${asset.symbol}:`, err.message);
    }
  }

  let mergedSignals = mergeMoveAndUpdate(existingSignals, newSignals);

  fs.writeFileSync('data/signals.json', JSON.stringify(mergedSignals, null, 2));
  console.log("Fichier signals.json mis à jour avec succès !");
};

const assetType = process.argv[2];
generate(assetType);
