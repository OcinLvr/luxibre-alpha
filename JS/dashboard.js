// Dashboard JS pour Luxibre Alpha - gestion watchlist Supabase (ESM CORRECTIF)

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// --- Supabase Client ---
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
function showLoader() { loader.style.display = 'block'; }
function hideLoader() { loader.style.display = 'none'; }

// Variables globales pour modal graphique
let bigChartInstance = null;
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

  bigChartTitle.textContent = signal.name + " - Prix Historique";

  // Détruire l'ancien graphique si présent
  if (bigChartInstance) {
    bigChartInstance.destroy();
  }

  bigChartInstance = new Chart(bigChartCanvas, {
    type: "line",
    data: {
      labels: signal.history.map((_, idx) => `J-${signal.history.length - idx}`),
      datasets: [{
        label: `${signal.name} - Prix de clôture`,
        data: signal.history,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
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
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleFont: { size: 16 },
          bodyFont: { size: 14 },
          padding: 10,
          displayColors: false
        },
        zoom: {
          pan: { enabled: true, mode: 'xy', modifierKey: 'ctrl' },
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: 'xy',
          }
        }
      },
      scales: {
        x: {
          display: true,
          ticks: { color: '#9ca3af', font: { size: 12 } },
          grid: { color: '#374151', drawBorder: false }
        },
        y: {
          beginAtZero: false,
          ticks: { color: '#9ca3af', font: { size: 12 } },
          grid: { color: '#374151' }
        }
      }
    }
  });

  // Afficher les prédictions de prix si premium
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

  // Ouvrir la modal
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

  // DEBUG LOGS POUR VERIFIER
  console.log("DEBUG USER:", user);
  console.log("DEBUG WATCHLIST:", watchlist);

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
          <div class="chart-container">
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
            // Retire de la variable watchlist (pour la session)
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
        new Chart(ctx, {
          type: "line",
          data: {
            labels: signal.history.map((_, idx) => `J-${signal.history.length - idx}`),
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
                displayColors: false
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
