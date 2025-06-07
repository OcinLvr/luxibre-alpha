// dashboard.js
// Import des dépendances nécessaires
import html2canvas from "html2canvas";
import Chart from "chart.js/auto";
import zoomPlugin from "chartjs-plugin-zoom";
import { DateTime } from "luxon";
Chart.register(zoomPlugin);

// Fonction pour vérifier si l'utilisateur est premium
export async function isPremiumUser() {
  return await window.isPremiumPromise;
}

// Fonction d'export pour petits graphiques
export function exportChart(chartId) {
  isPremiumUser().then(isPremium => {
    if (!isPremium) {
      alert("Cette fonctionnalité est réservée aux utilisateurs premium.");
      return;
    }
    const element = document.getElementById(chartId);
    html2canvas(element).then(canvas => {
      const link = document.createElement("a");
      link.download = "chart.png";
      link.href = canvas.toDataURL();
      link.click();
    });
  });
}

// Variables globales
let bigChartInstance = null;
const bigChartModal = document.getElementById("bigChartModal");
const bigChartCanvas = document.getElementById("bigChartCanvas").getContext("2d");
const bigChartTitle = document.getElementById("bigChartTitle");
const closeBigChartBtn = document.getElementById("closeBigChartBtn");
const resetZoomBtn = document.getElementById("resetZoomBtn");
const exportBigChartBtn = document.getElementById("exportBigChartBtn");

export async function openBigChart(signal) {
  const isPremium = await isPremiumUser();
  if (signal.premium && !isPremium) {
    alert("Ce signal est réservé aux abonnés premium.");
    return;
  }

  bigChartTitle.textContent = `${signal.name} - Prix Historique`;

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
      animation: { duration: 1000, easing: "easeInOutQuart" },
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: "index",
          intersect: false,
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          titleFont: { size: 16 },
          bodyFont: { size: 14 },
          padding: 10,
          displayColors: false
        },
        zoom: {
          pan: { enabled: true, mode: "xy", modifierKey: "ctrl" },
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: "xy"
          }
        }
      },
      scales: {
        x: {
          ticks: { color: "#9ca3af", font: { size: 12 } },
          grid: { color: "#374151", drawBorder: false }
        },
        y: {
          beginAtZero: false,
          ticks: { color: "#9ca3af", font: { size: 12 } },
          grid: { color: "#374151" }
        }
      }
    }
  });

  const predictionsDiv = document.getElementById("predictionsContainer");
  if (isPremium && signal.predictions) {
    predictionsDiv.innerHTML = `
      <h4>Prédictions de prix</h4>
      <p>Jour 1: $${signal.predictions.day1}</p>
      <p>Jour 3: $${signal.predictions.day3}</p>
      <p>Jour 7: $${signal.predictions.day7}</p>
    `;
  } else {
    predictionsDiv.innerHTML = `
      <p>${isPremium ? "Les prédictions de prix ne sont pas disponibles pour ce signal." : "Les prédictions de prix sont réservées aux membres premium."}</p>
    `;
  }

  document.body.classList.add("modal-open");
  bigChartModal.classList.add("active");
}

export function closeBigChart() {
  if (bigChartInstance) bigChartInstance.destroy();
  bigChartInstance = null;
  document.body.classList.remove("modal-open");
  bigChartModal.classList.remove("active");
}

resetZoomBtn.addEventListener("click", () => {
  if (bigChartInstance) bigChartInstance.resetZoom();
});

exportBigChartBtn.addEventListener("click", () => {
  isPremiumUser().then(isPremium => {
    if (!isPremium) {
      alert("Cette fonctionnalité est réservée aux utilisateurs premium.");
      return;
    }
    html2canvas(bigChartCanvas.canvas).then(canvas => {
      const link = document.createElement("a");
      link.download = "big-chart.png";
      link.href = canvas.toDataURL();
      link.click();
    });
  });
});

closeBigChartBtn.addEventListener("click", closeBigChart);
bigChartModal.addEventListener("click", e => {
  if (e.target === bigChartModal) closeBigChart();
});

export async function fetchSignals() {
  try {
    const res = await fetch("data/signals.json");
    if (!res.ok) throw new Error("HTTP error " + res.status);
    return await res.json();
  } catch (err) {
    console.error("Erreur lors du chargement des signaux:", err);
    document.getElementById("signalsContainer").textContent = "Erreur lors du chargement des signaux.";
    return null;
  }
}

export async function renderSignals() {
  const data = await fetchSignals();
  if (!data) return;

  const isPremium = await isPremiumUser();
  const container = document.getElementById("signalsContainer");
  const premiumNotice = document.getElementById("premiumNotice");
  let premiumLocked = false;
  container.innerHTML = "";

  ["achat", "vente", "conservation"].forEach(category => {
    if (!data[category]) return;

    data[category].sort((a, b) => (a.premium === b.premium) ? 0 : a.premium ? 1 : -1);

    data[category].forEach((signal, i) => {
      const card = document.createElement("div");
      card.className = "card";
      const isLocked = signal.premium && !isPremium;
      if (isLocked) {
        card.classList.add("blur");
        premiumLocked = true;
      }

      const chartId = `chart-${category}-${i}`;
      const updatedDate = DateTime.fromISO(signal.updated).toLocaleString(DateTime.DATETIME_MED);

      card.innerHTML = `
        ${signal.premium ? '<div class="premium-badge">Premium</div>' : ''}
        ${isLocked ? '<button class="upgrade-message" onclick="window.location.href=\'/pricing.html\'">Devenez Premium</button>' : ''}
        <div class="card-content">
          <h3>${signal.name}</h3>
          <p><strong>Prix actuel :</strong> $${signal.price.toFixed(2)}</p>
          <p><strong>Performance (30j) :</strong> ${signal.performance30j}%</p>
          <p><strong>Recommandation :</strong> <span class="recommendation">${signal.recommendation}</span></p>
          <p><strong>Dernière mise à jour :</strong> ${updatedDate}</p>
          <div class="chart-container">
            <canvas id="${chartId}" width="300" height="150"></canvas>
          </div>
        </div>
      `;

      container.appendChild(card);

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
            animation: { duration: 1000, easing: "easeInOutQuart" },
            scales: {
              x: { display: false },
              y: {
                beginAtZero: false,
                ticks: { color: "#9ca3af" },
                grid: { color: "#374151" }
              }
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                mode: "index",
                intersect: false,
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                titleFont: { size: 14 },
                bodyFont: { size: 12 },
                padding: 8,
                displayColors: false
              }
            }
          }
        });

        card.querySelector(".chart-container").addEventListener("click", () => {
          openBigChart(signal);
        });
      }
    });
  });

  if (premiumLocked && !isPremium) {
    premiumNotice.style.display = "block";
    premiumNotice.textContent = "Certains signaux sont réservés aux abonnés premium. Abonnez-vous pour tout débloquer.";
  }
}
