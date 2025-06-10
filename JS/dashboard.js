// Dashboard JS externalisé pour Luxibre Alpha

// Petit utilitaire pour attendre que la promesse premium soit bien définie
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

// Fonction pour vérifier si l'utilisateur est premium (exposez window.isPremiumPromise dans le header !)
async function isPremiumUser() {
  // Attend que la promesse soit bien injectée par le header, max 3s
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

// --- Watchlist (liste de suivi) & notifications ---

function getWatchlist() {
  return JSON.parse(localStorage.getItem('watchlist') || '[]');
}
function setWatchlist(list) {
  localStorage.setItem('watchlist', JSON.stringify(list));
}

function toggleWatch(symbol) {
  let list = getWatchlist();
  if (list.includes(symbol)) {
    list = list.filter(s => s !== symbol);
  } else {
    list.push(symbol);
  }
  setWatchlist(list);
}

function getWatchHistory() {
  return JSON.parse(localStorage.getItem('watchHistory') || '{}');
}
function setWatchHistory(hist) {
  localStorage.setItem('watchHistory', JSON.stringify(hist));
}

function isSymbolWatched(symbol) {
  return getWatchlist().includes(symbol);
}

function checkForWatchlistNotifications(data) {
  const watchlist = getWatchlist();
  const hist = getWatchHistory();
  const notifs = [];
  // Balaye toutes les catégories
  ['achat', 'vente', 'conservation'].forEach(cat => {
    if (!data[cat]) return;
    data[cat].forEach(signal => {
      if (watchlist.includes(signal.symbol)) {
        const prev = hist[signal.symbol];
        if (prev && prev !== cat) {
          notifs.push({
            symbol: signal.symbol,
            name: signal.name,
            from: prev,
            to: cat,
            updated: signal.updated
          });
        }
        // met à jour l'historique pour ce symbol
        hist[signal.symbol] = cat;
      }
    });
  });
  setWatchHistory(hist);
  showNotifBadge(notifs);
}

function showNotifBadge(notifs) {
  const notifWrapper = document.getElementById('notifWrapper');
  const notifCount = document.getElementById('notifCount');
  const notifList = document.getElementById('notifList');
  if (notifs.length > 0) {
    notifWrapper.classList.remove('hidden');
    notifCount.textContent = notifs.length;
    notifList.innerHTML = notifs.map(n =>
      `<li class="py-2 px-2 border-b border-gray-100">
        <strong>${n.name}</strong><br>
        Changement: <span class="capitalize">${n.from}</span> → <span class="capitalize">${n.to}</span><br>
        <span class="text-xs text-gray-400">${luxon.DateTime.fromISO(n.updated).toLocaleString(luxon.DateTime.DATETIME_MED)}</span>
      </li>`
    ).join('');
  } else {
    notifWrapper.classList.add('hidden');
    notifCount.textContent = '';
    notifList.innerHTML = '';
  }
}

document.getElementById('notifBtn')?.addEventListener('click', () => {
  document.getElementById('notifDropdown').classList.toggle('hidden');
});

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

  const isPremium = await isPremiumUser();
  const container = document.getElementById("signalsContainer");
  const premiumNotice = document.getElementById("premiumNotice");
  let premiumLocked = false;
  container.innerHTML = "";

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
      // Luxon pour date
      const updatedDate = luxon.DateTime.fromISO(signal.updated);
      const formattedUpdatedDate = updatedDate.toLocaleString(luxon.DateTime.DATETIME_MED);

      // --- Bouton liste de suivi ---
      const isFollowed = isSymbolWatched(signal.symbol);

      card.innerHTML = `
        ${signal.premium ? '<div class="premium-badge">Premium</div>' : ''}
        ${isLocked ? '<button class="upgrade-message" onclick="window.location.href=\'/#tarifs\'">Devenez Premium</button>' : ''}
        <div class="card-content">
          <h3>${signal.name}</h3>
          <p><strong>Prix actuel :</strong> $${signal.price.toFixed(2)}</p>
          <p><strong>Performance (30j) :</strong> ${performanceBadge(signal.performance30j)}</p>
          <p><strong>Recommandation :</strong> <span class="recommendation">${signal.recommendation}</span></p>
          <p><strong>Dernière mise à jour :</strong> ${formattedUpdatedDate}</p>
          <button class="follow-btn" data-symbol="${signal.symbol}">
            ${isFollowed ? "Retirer de la liste" : "Suivre"}
          </button>
          <div class="chart-container">
            <canvas id="${chartId}" width="300" height="150"></canvas>
          </div>
        </div>
      `;
      container.appendChild(card);

      // Gestion du bouton suivre
      card.querySelector('.follow-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        toggleWatch(signal.symbol);
        this.textContent = isSymbolWatched(signal.symbol) ? "Retirer de la liste" : "Suivre";
      });

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

  // Si aucune carte affichée (après filtrage)
  if (!container.querySelector('.card')) {
    container.innerHTML = `<div class="text-center text-gray-400 font-semibold text-lg py-8">Aucun signal pour ce filtre.</div>`;
  }
  // Notifications après rendu
  checkForWatchlistNotifications(data);
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
    // Message si aucun signal visible
    const container = document.getElementById("signalsContainer");
    if (!anyVisible) {
      container.innerHTML = `<div class="text-center text-gray-400 font-semibold text-lg py-8">Aucun signal pour ce filtre.</div>`;
    }
  }

  await renderSignals();
});
