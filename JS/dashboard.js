// js/dashboard.js

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("signals-container");

  fetch("data/signals.json")
    .then((response) => {
      if (!response.ok) throw new Error("Erreur de chargement des signaux.");
      return response.json();
    })
    .then((data) => {
      if (!Array.isArray(data)) throw new Error("Données de signaux invalides.");

      container.innerHTML = ""; // Clear loader or fallback
      data.forEach((signal) => {
        const signalCard = createSignalCard(signal);
        container.appendChild(signalCard);
      });
    })
    .catch((error) => {
      console.error(error);
      container.innerHTML = "<p class='text-red-500'>Erreur de chargement des signaux.</p>";
    });
});

function createSignalCard(signal) {
  const card = document.createElement("div");
  card.className = "bg-white p-6 rounded-xl shadow hover:shadow-lg transition";

  const signalColor =
    signal.signal === "Acheter"
      ? "text-green-600"
      : signal.signal === "Vendre"
      ? "text-red-600"
      : "text-gray-600";

  card.innerHTML = `
    <h3 class="text-lg font-semibold mb-1">${signal.name}</h3>
    <p class="text-sm text-gray-500 mb-2">${signal.symbol}</p>
    <p class="text-xl font-bold mb-2">${signal.price.toFixed(2)} €</p>
    <p class="text-md font-medium mb-1 ${signalColor}">${signal.signal}</p>
    <div class="text-sm text-gray-500 mb-1">Confiance : ${(signal.confidence * 100).toFixed(0)}%</div>
    <div class="text-xs text-gray-400">MAJ : ${formatDate(signal.lastUpdated)}</div>
  `;

  return card;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
