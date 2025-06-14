// Dashboard JS pour Luxibre Alpha - gestion watchlist, premium, gamification

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// --- Supabase Client ---
const supabaseUrl = 'https://jrgdwozxcilasllpvikh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIs...'; // Remplace par ta clé publique
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Auth ---
async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// --- Watchlist ---
async function fetchWatchlistFromSupabase(userId) {
  const { data, error } = await supabase
    .from('user_follows')
    .select('symbol')
    .eq('user_id', userId);
  return data ? data.map(row => row.symbol) : [];
}
async function addToWatchlistSupabase(userId, symbol) {
  await supabase.from('user_follows').insert([{ user_id: userId, symbol }]);
}
async function removeFromWatchlistSupabase(userId, symbol) {
  await supabase.from('user_follows').delete().eq('user_id', userId).eq('symbol', symbol);
}
async function isWatchedByUser(userId, symbol) {
  const { data } = await supabase.from('user_follows').select('id').eq('user_id', userId).eq('symbol', symbol).maybeSingle();
  return !!data;
}

// --- Premium utils ---
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
  if (!window.isPremiumPromise) await waitUntil(() => window.isPremiumPromise, 100, 30);
  return await window.isPremiumPromise;
}

// Loader
const loader = document.getElementById('loader');
function showLoader() { loader && (loader.style.display = 'block'); }
function hideLoader() { loader && (loader.style.display = 'none'); }

// Variables globales pour modal graphique
let bigChartInstance = null;
const bigChartModal = document.getElementById("bigChartModal");
const bigChartCanvas = document.getElementById("bigChartCanvas")?.getContext('2d');
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

  if (bigChartInstance) bigChartInstance.destroy();

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
      animation: { duration: 1000, easing: 'easeInOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index', intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleFont: { size: 16 }, bodyFont: { size: 14 },
          padding: 10, displayColors: false
        },
        zoom: {
          pan: { enabled: true, mode: 'xy', modifierKey: 'ctrl' },
          zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'xy' }
        }
      },
      scales: {
        x: { display: true, ticks: { color: '#9ca3af', font: { size: 12 } }, grid: { color: '#374151', drawBorder: false } },
        y: { beginAtZero: false, ticks: { color: '#9ca3af', font: { size: 12 } }, grid: { color: '#374151' } }
      }
    }
  });

  // Prédictions IA
  const predictionsDiv = document.getElementById('predictionsContainer');
  if (isPremium && signal.predictions) {
    predictionsDiv.innerHTML = `
      <h4 class="font-bold text-green-400 mb-2">Prédictions IA</h4>
      <p>Jour 1 : $${signal.predictions.day1}</p>
      <p>Jour 3 : $${signal.predictions.day3}</p>
      <p>Jour 7 : $${signal.predictions.day7}</p>
    `;
  } else if (!isPremium) {
    predictionsDiv.innerHTML = `<p class="italic text-gray-400">Les prédictions IA sont réservées aux membres premium.</p>`;
  } else {
    predictionsDiv.innerHTML = `<p>Pas de prédiction IA disponible pour ce signal.</p>`;
  }

  document.body.classList.add('modal-open');
  bigChartModal.classList.remove("hidden");
}
function closeBigChart() {
  if (bigChartInstance) { bigChartInstance.destroy(); bigChartInstance = null; }
  document.body.classList.remove('modal-open');
  bigChartModal.classList.add("hidden");
}
resetZoomBtn?.addEventListener("click", () => { if (bigChartInstance) bigChartInstance.resetZoom(); });
exportBigChartBtn?.addEventListener("click", () => {
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
closeBigChartBtn?.addEventListener("click", closeBigChart);
bigChartModal?.addEventListener("click", e => { if (e.target === bigChartModal) closeBigChart(); });

// --- Rendu des signaux ---
async function fetchSignals() {
  try {
    const res = await fetch("data/signals.json");
    if (!res.ok) throw new Error("HTTP error " + res.status);
    return await res.json();
  } catch (err) {
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
      card.className = "card flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-xs min-w-[290px] mb-4";
      card.dataset.category = category;
      card.dataset.type = signal.type;

      const isLocked = signal.premium && !isPremium;
      if (isLocked) {
        card.classList.add("opacity-60", "pointer-events-none");
        premiumLocked = true;
      }

      const chartId = `chart-${category}-${i}`;
      const updatedDate = luxon.DateTime.fromISO(signal.updated);
      const formattedUpdatedDate = updatedDate.toLocaleString(luxon.DateTime.DATETIME_MED);

      let followBtnHtml = "";
      if (user) {
        const isFollowed = watchlist.includes(signal.symbol);
        followBtnHtml = `
          <button class="follow-btn bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-3 py-1 rounded-full font-medium text-xs mt-2" data-symbol="${signal.symbol}">
            ${isFollowed ? "Retirer de la liste" : "Suivre"}
          </button>
        `;
      } else {
        followBtnHtml = `
          <button class="follow-btn bg-gray-200 dark:bg-gray-700 text-gray-500 px-3 py-1 rounded-full font-medium text-xs mt-2" disabled title="Connectez-vous pour activer la liste de suivi">Suivre</button>
        `;
      }

      card.innerHTML = `
        ${signal.premium ? '<div class="absolute top-4 right-4 bg-yellow-400 text-black text-xs font-bold py-1 px-2 rounded-full">Premium</div>' : ''}
        <div class="flex-1 flex flex-col">
          <h3 class="font-bold text-lg mb-1">${signal.name}</h3>
          <p><strong>Prix actuel :</strong> $${signal.price.toFixed(2)}</p>
          <p><strong>Performance (30j) :</strong>
            <span class="inline-block rounded-full px-2 py-0.5 ${signal.performance30j>=0?'bg-green-100 text-green-700':'bg-red-100 text-red-700'} ml-1">${signal.performance30j>=0?'+':''}${signal.performance30j}%</span>
          </p>
          <p><strong>Recommandation :</strong> <span class="font-semibold text-green-500">${signal.recommendation}</span></p>
          <p class="mb-2 text-xs text-gray-500">Dernière mise à jour : ${formattedUpdatedDate}</p>
          ${followBtnHtml}
        </div>
        <div class="chart-container mt-4 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900 shadow" style="height:150px;">
          <canvas id="${chartId}" width="300" height="150"></canvas>
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
            animation: { duration: 1000, easing: 'easeInOutQuart' },
            scales: {
              x: { display: false },
              y: { beginAtZero: false, ticks: { color: '#9ca3af' }, grid: { color: '#374151' } }
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                mode: 'index', intersect: false,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleFont: { size: 14 }, bodyFont: { size: 12 }, padding: 8, displayColors: false
              }
            }
          }
        });
        card.querySelector('.chart-container').addEventListener('click', () => openBigChart(signal));
      }
    });
  });

  if (premiumLocked && !isPremium) premiumNotice.style.display = "block";
  else premiumNotice.style.display = "none";

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
          if (res && res.isLogged) msg.style.display = '';
          else msg.style.display = 'none';
        }
      });
      clearInterval(showSuggestMsgInterval);
    }
  }, 200);
});
