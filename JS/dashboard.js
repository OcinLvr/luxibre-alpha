// Dashboard JS pour Luxibre Alpha - version améliorée graphiques (Zoom, plages rapides, indicateurs optionnels)

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://jrgdwozxcilasllpvikh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZ2R3b3p4Y2lsYXNsbHB2aWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4MjQ0NTEsImV4cCI6MjA2MzQwMDQ1MX0.S2oGP2rdtq1IkW-oH5mC8omm698PdCgQJtGVLlIFj3w';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Auth ---
async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Erreur récupération utilisateur Supabase:', error);
  }
  return user;
}

// --- Watchlist (Supabase) ---
async function fetchWatchlistFromSupabase(userId) {
  const { data, error } = await supabase
    .from('user_follows')
    .select('symbol')
    .eq('user_id', userId);
  if (error) {
    console.error('Erreur récupération watchlist Supabase:', error);
    return [];
  }
  return data.map(row => row.symbol);
}

async function addToWatchlistSupabase(userId, symbol) {
  const { error } = await supabase
    .from('user_follows')
    .insert([{ user_id: userId, symbol }]);
  if (error && !String(error.message).includes("duplicate")) {
    alert("Erreur lors de l'ajout à la liste de suivi");
    console.error(error);
  }
}

async function removeFromWatchlistSupabase(userId, symbol) {
  const { error } = await supabase
    .from('user_follows')
    .delete()
    .eq('user_id', userId)
    .eq('symbol', symbol);
  if (error) {
    alert("Erreur lors du retrait de la liste de suivi");
    console.error(error);
  }
}

async function isWatchedByUser(userId, symbol) {
  const { data, error } = await supabase
    .from('user_follows')
    .select('id')
    .eq('user_id', userId)
    .eq('symbol', symbol)
    .maybeSingle();
  if (error) {
    console.error(error);
    return false;
  }
  return !!data;
}

// --- Premium utils (inchangé) ---
function waitUntil(conditionFn, interval = 100, maxTry = 30) {
  return new Promise((resolve, reject) => {
    let tries = 0;
    const timer = setInterval(() => {
      if (conditionFn()) {
        clearInterval(timer);
        resolve();
      }
      tries++;
      if (tries >= maxTry) {
        clearInterval(timer);
        reject('Timeout');
      }
    }, interval);
  });
}

async function isPremiumUser() {
  if (!window.isPremiumPromise) {
    await waitUntil(() => window.isPremiumPromise, 100, 30);
  }
  return await window.isPremiumPromise;
}

function performanceBadge(value) {
  const isPositive = value >= 0;
  const cls = isPositive ? "performance-badge performance-positive" : "performance-badge performance-negative";
  const sign = isPositive && value > 0 ? "+" : "";
  return `<span class="${cls}">${sign}${value}%</span>`;
}

// Loader
const loader = document.getElementById('loader');
function showLoader() { loader.style.display = 'flex'; }
function hideLoader() { loader.style.display = 'none'; }

// Variables globales pour modal graphique
let bigChartInstance = null;
let bigChartDataFull = null;
let bigChartSignal = null;
let bigChartIndicators = {};
let bigChartRange = 'all';

const bigChartModal = document.getElementById("bigChartModal");
const bigChartCanvas = document.getElementById("bigChartCanvas").getContext('2d');
const bigChartTitle = document.getElementById("bigChartTitle");
const closeBigChartBtn = document.getElementById("closeBigChartBtn");
const resetZoomBtn = document.getElementById("resetZoomBtn");
const exportBigChartBtn = document.getElementById("exportBigChartBtn");

// Fonction pour ouvrir la modal du grand graphique
async function openBigChart(signal) {
  const isPremium = await isPremiumUser();

  if (signal.premium && !isPremium) {
    alert("Ce signal est réservé aux abonnés premium.");
    return;
  }

  bigChartSignal = signal;
  bigChartRange = 'all';
  bigChartIndicators = { rsi: false, macd: false };

  // Données complètes "brutes"
  bigChartDataFull = {
    labels: (signal.dates || signal.history.map((_, idx) => `J-${signal.history.length - idx}`)),
    price: [...signal.history],
    rsi: signal.rsi || null,
    macd: signal.macd || null
    // Ajoute ici d'autres indicateurs si dispo
  };

  renderBigChart();

  // Affiche les prédictions
  const predictionsDiv = document.getElementById('predictionsContainer');
  if (isPremium) {
    if (signal.predictions) {
      predictionsDiv.innerHTML = `
        <h4>Prédictions de prix</h4>
        <p>Jour 1: $${signal.predictions.day1}</p>
        <p>Jour 3: $${signal.predictions.day3}</p>
        <p>Jour 7: $${signal.predictions.day7}</p>
      `;
    } else {
      predictionsDiv.innerHTML = `<p>Les prédictions de prix ne sont pas disponibles pour ce signal.</p>`;
    }
  } else {
    predictionsDiv.innerHTML = `<p>Les prédictions de prix sont réservées aux membres premium.</p>`;
  }

  document.body.classList.add('modal-open');
  bigChartModal.classList.add("active");
}

function closeBigChart() {
  if (bigChartInstance) {
    bigChartInstance.destroy();
    bigChartInstance = null;
  }
  document.body.classList.remove('modal-open');
  bigChartModal.classList.remove("active");
}

// --- Gestion des boutons de plages rapides ---
function setQuickRange(range) {
  bigChartRange = range;
  renderBigChart();
}

// --- Gestion des indicateurs optionnels ---
function toggleIndicator(indicator) {
  bigChartIndicators[indicator] = !bigChartIndicators[indicator];
  renderBigChart();
}

// --- Calcul du min/max du prix sur la période affichée ---
function getMinMax(data) {
  let min = Math.min(...data);
  let max = Math.max(...data);
  return { min, max };
}

function renderBigChart() {
  // Détermine la plage de données à afficher selon le range sélectionné
  const total = bigChartDataFull.labels.length;
  let start = 0, end = total;
  if (bigChartRange === '30' && total > 30) { start = total - 30; }
  if (bigChartRange === '7' && total > 7) { start = total - 7; }
  if (bigChartRange === '1' && total > 1) { start = total - 1; }
  // else all

  const slice = (arr) => arr ? arr.slice(start, end) : null;

  const labels = slice(bigChartDataFull.labels);
  const price = slice(bigChartDataFull.price);
  const rsi = bigChartIndicators.rsi && bigChartDataFull.rsi ? slice(bigChartDataFull.rsi) : null;
  const macd = bigChartIndicators.macd && bigChartDataFull.macd ? slice(bigChartDataFull.macd) : null;

  // Détruit l'ancien graphique si existant
  if (bigChartInstance) bigChartInstance.destroy();

  // Min/max badge
  const { min, max } = getMinMax(price);
  // Variation %
  const variation = price.length > 1 ? ((price[price.length - 1] - price[0]) / price[0] * 100).toFixed(2) : 0;

  // Mise à jour du titre
  let rangeLabel = '';
  if (bigChartRange === '30') rangeLabel = '30j';
  else if (bigChartRange === '7') rangeLabel = '7j';
  else if (bigChartRange === '1') rangeLabel = '1j';
  else rangeLabel = 'Tout';
  bigChartTitle.innerHTML = `${bigChartSignal.name} <span class="badge-minmax">Min $${min.toFixed(2)}</span> <span class="badge-minmax">Max $${max.toFixed(2)}</span> <span class="badge-minmax ${variation >= 0 ? 'text-green-700' : 'text-red-700'}">${variation >= 0 ? "+" : ""}${variation}%</span> <span class="chart-indicator-label">(${rangeLabel})</span>`;

  // Prépare les datasets
  let datasets = [{
    label: "Prix de clôture",
    data: price,
    borderColor: "#3b82f6",
    backgroundColor: getGradient(bigChartCanvas),
    fill: true,
    tension: 0.35,
    pointRadius: 2,
    pointHoverRadius: 7,
    pointBackgroundColor: "#3b82f6",
    borderWidth: 2,
    yAxisID: 'y'
  }];
  if (rsi) {
    datasets.push({
      label: "RSI",
      data: rsi,
      borderColor: "#f59e42",
      backgroundColor: "rgba(251,191,36,0.08)",
      fill: false,
      tension: 0.3,
      pointRadius: 0,
      borderWidth: 2,
      yAxisID: 'y2'
    });
  }
  if (macd) {
    datasets.push({
      label: "MACD",
      data: macd,
      borderColor: "#10b981",
      backgroundColor: "rgba(16,185,129,0.08)",
      fill: false,
      tension: 0.3,
      pointRadius: 0,
      borderWidth: 2,
      yAxisID: 'y2'
    });
  }

  bigChartInstance = new Chart(bigChartCanvas, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 900, easing: 'easeInOutQuart' },
      plugins: {
        legend: { display: true, position: 'top', labels: { font: { size: 13 } } },
        tooltip: {
          enabled: true,
          mode: 'index',
          intersect: false,
          backgroundColor: '#222e3a',
          borderColor: "#3b82f6",
          borderWidth: 1,
          titleFont: { size: 15, weight: 'bold' },
          bodyFont: { size: 13 },
          callbacks: {
            title: (items) => `Jour : ${items[0].label}`,
            label: (ctx) => {
              if (ctx.dataset.label === "Prix de clôture") {
                return `Prix : $${ctx.parsed.y.toFixed(2)}`;
              }
              if (ctx.dataset.label === "RSI") {
                return `RSI : ${ctx.parsed.y.toFixed(2)}`;
              }
              if (ctx.dataset.label === "MACD") {
                return `MACD : ${ctx.parsed.y.toFixed(2)}`;
              }
              return '';
            }
          },
          padding: 12,
          displayColors: true
        },
        zoom: {
          pan: { enabled: true, mode: 'x', modifierKey: 'ctrl' },
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            drag: { enabled: true },
            mode: 'x',
            onZoomComplete: ({chart}) => {
              // Optionnel : tu peux faire une action ici, par ex afficher la période zoomée
            }
          },
          limits: { x: { min: 0, max: labels.length - 1 } }
        }
      },
      scales: {
        x: {
          display: true,
          ticks: { color: '#374151', font: { size: 12 } },
          grid: { color: '#e5e7eb', drawBorder: false }
        },
        y: {
          type: 'linear',
          position: 'left',
          beginAtZero: false,
          ticks: { color: '#374151', font: { size: 13 } },
          grid: { color: '#e5e7eb' }
        },
        y2: {
          type: 'linear',
          display: (rsi || macd) ? true : false,
          position: 'right',
          beginAtZero: false,
          grid: { drawOnChartArea: false },
          ticks: { color: '#f59e42', font: { size: 11 } },
        }
      }
    }
  });

  function getGradient(ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
    grad.addColorStop(0, "rgba(59,130,246,0.20)");
    grad.addColorStop(1, "rgba(59,130,246,0.03)");
    return grad;
  }

  // Active les boutons UI
  document.querySelectorAll('.quick-range-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.range === bigChartRange);
    btn.onclick = () => setQuickRange(btn.dataset.range);
  });
  document.querySelectorAll('.indicator-toggle-btn').forEach(btn => {
    let key = btn.dataset.indicator;
    btn.classList.toggle('active', !!bigChartIndicators[key]);
    btn.onclick = () => toggleIndicator(key);
  });
}

resetZoomBtn.addEventListener("click", () => { if (bigChartInstance) bigChartInstance.resetZoom(); });
exportBigChartBtn.addEventListener("click", () => {
  isPremiumUser().then(isPremium => {
    if (!isPremium) {
      alert("Cette fonctionnalité est réservée aux utilisateurs premium.");
      return;
    }
    html2canvas(bigChartCanvas.canvas).then(canvas => {
      const link = document.createElement('a');
      link.download = 'big-chart.png';
      link.href = canvas.toDataURL();
      link.click();
    });
  });
});
closeBigChartBtn.addEventListener("click", closeBigChart);
bigChartModal.addEventListener("click", e => { if (e.target === bigChartModal) closeBigChart(); });

// --- Rendu des signaux et dashboard ---
async function fetchSignals() {
  try {
    const res = await fetch("data/signals.json");
    if (!res.ok) throw new Error("HTTP error " + res.status);
    return await res.json();
  } catch (err) {
    console.error("Erreur lors du chargement des signaux:", err);
    document.getElementById("signalsContainer").textContent = "Erreur lors du chargement des signaux.";
    hideLoader();
    return null;
  }
}

async function renderSignals() {
  showLoader();
  const data = await fetchSignals();
  if (!data) return hideLoader();

  const user = await getCurrentUser();
  const isPremium = await isPremiumUser();
  const container = document.getElementById("signalsContainer");
  const premiumNotice = document.getElementById("premiumNotice");
  let premiumLocked = false;
  container.innerHTML = "";

  let userId = null, watchlist = [];
  if (user) {
    userId = user.id;
    watchlist = await fetchWatchlistFromSupabase(userId);
  }

  ["achat", "vente", "conservation"].forEach(category => {
    if (!data[category] || !Array.isArray(data[category])) return;
    data[category].sort((a, b) => (a.premium === b.premium) ? 0 : a.premium ? 1 : -1);

    data[category].forEach((signal, i) => {
      const card = document.createElement("div");
      card.className = "card";
      card.dataset.category = category;
      card.dataset.type = signal.type;

      const isLocked = signal.premium && !isPremium;
      if (isLocked) {
        card.classList.add("blur");
        premiumLocked = true;
      }

      const chartId = `chart-${category}-${i}`;
      const updatedDate = luxon.DateTime.fromISO(signal.updated);
      const formattedUpdatedDate = updatedDate.toLocaleString(luxon.DateTime.DATETIME_MED);

      let followBtnHtml = "";
      if (user) {
        const isFollowed = watchlist.includes(signal.symbol);
        followBtnHtml = `
          <button class="follow-btn" data-symbol="${signal.symbol}">
            ${isFollowed ? "Retirer de la liste" : "Suivre"}
          </button>
        `;
      } else {
        followBtnHtml = `
          <button class="follow-btn" disabled title="Connectez-vous pour activer la liste de suivi">Suivre</button>
        `;
      }

      card.innerHTML = `
        ${signal.premium ? '<div class="premium-badge">Premium</div>' : ''}
        ${isLocked ? '<button class="upgrade-message" onclick="window.location.href=\'/#tarifs\'">Devenez Premium</button>' : ''}
        <div class="card-content">
          <h3>${signal.name}</h3>
          <p><strong>Prix actuel :</strong> $${signal.price.toFixed(2)}</p>
          <p><strong>Performance (30j) :</strong> ${performanceBadge(signal.performance30j)}</p>
          <p><strong>Recommandation :</strong> <span class="recommendation">${signal.recommendation}</span></p>
          <p><strong>Dernière mise à jour :</strong> ${formattedUpdatedDate}</p>
          ${followBtnHtml}
          <div class="chart-container" title="Cliquer pour zoomer">
            <canvas id="${chartId}" width="300" height="150"></canvas>
          </div>
        </div>
      `;
      container.appendChild(card);

      // Gestion du bouton suivre
      if (user) {
        card.querySelector('.follow-btn').addEventListener('click', async function(e) {
          e.stopPropagation();
          if (await isWatchedByUser(userId, signal.symbol)) {
            await removeFromWatchlistSupabase(userId, signal.symbol);
            this.textContent = "Suivre";
            watchlist = watchlist.filter(s => s !== signal.symbol);
          } else {
            await addToWatchlistSupabase(userId, signal.symbol);
            this.textContent = "Retirer de la liste";
            watchlist.push(signal.symbol);
          }
        });
      }

      if (!isLocked) {
        const ctx = document.getElementById(chartId).getContext("2d");
        // Simple graphique (mini) pour la carte (pas de zoom ici)
        let labels = signal.dates || signal.history.map((_, idx) => `J-${signal.history.length - idx}`);
        let min = Math.min(...signal.history);
        let max = Math.max(...signal.history);
        let last = signal.history[signal.history.length-1];
        let first = signal.history[0];
        let variation = ((last - first) / first * 100).toFixed(2);

        new Chart(ctx, {
          type: "line",
          data: {
            labels,
            datasets: [{
              label: `${signal.name} - Prix de clôture`,
              data: signal.history,
              borderColor: "#3b82f6",
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              fill: true,
              tension: 0.4,
              pointRadius: 2,
              pointHoverRadius: 4,
              pointBackgroundColor: "#3b82f6",
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
              duration: 1000,
              easing: 'easeInOutQuart'
            },
            scales: {
              x: { display: false },
              y: {
                beginAtZero: false,
                ticks: { color: '#9ca3af' },
                grid: { color: '#374151' }
              }
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleFont: { size: 14 },
                bodyFont: { size: 12 },
                padding: 8,
                displayColors: false,
                callbacks: {
                  afterBody: () => `Min: $${min.toFixed(2)} | Max: $${max.toFixed(2)} | Var: ${variation>=0?"+":""}${variation}%`
                }
              }
            }
          }
        });
        card.querySelector('.chart-container').addEventListener('click', () => {
          openBigChart(signal);
        });
      }
    });
  });

  if (premiumLocked && !isPremium) {
    premiumNotice.style.display = "block";
  } else {
    premiumNotice.style.display = "none";
  }

  if (!container.querySelector('.card')) {
    container.innerHTML = `<div class="text-center text-gray-400 font-semibold text-lg py-8">Aucun signal pour ce filtre.</div>`;
  }
  hideLoader();
}

document.addEventListener('DOMContentLoaded', async function() {
  const signalFilter = document.getElementById('signalFilter');
  const typeFilter = document.getElementById('typeFilter');
  signalFilter.addEventListener('change', filterAssets);
  typeFilter.addEventListener('change', filterAssets);

  function filterAssets() {
    const signalCategory = signalFilter.value;
    const typeCategory = typeFilter.value;
    const cards = document.querySelectorAll('.card');
    let anyVisible = false;
    cards.forEach(card => {
      const cardSignalCategory = card.dataset.category;
      const cardTypeCategory = card.dataset.type;
      const matchesSignal = signalCategory === 'all' || cardSignalCategory === signalCategory;
      const matchesType = typeCategory === 'all' || cardTypeCategory === typeCategory;
      if (matchesSignal && matchesType) {
        card.style.display = 'flex';
        anyVisible = true;
      } else {
        card.style.display = 'none';
      }
    });
    const container = document.getElementById("signalsContainer");
    if (!anyVisible) {
      container.innerHTML = `<div class="text-center text-gray-400 font-semibold text-lg py-8">Aucun signal pour ce filtre.</div>`;
    }
  }

  await renderSignals();

  // Affiche le message suggestion uniquement pour les utilisateurs connectés
  let showSuggestMsgInterval = setInterval(() => {
    if (window.userInfoPromise && typeof window.userInfoPromise.then === 'function') {
      window.userInfoPromise.then(res => {
        const msg = document.getElementById('suggest-asset-message');
        if (msg) {
          if (res && res.isLogged) {
            msg.style.display = '';
          } else {
            msg.style.display = 'none';
          }
        }
      });
      clearInterval(showSuggestMsgInterval);
    }
  }, 200);
});
