// dashboard.js

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("signals-container");

  try {
    const response = await fetch("../data/signals.json");
    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML = "<p class='text-center text-gray-600'>Aucun signal disponible pour le moment.</p>";
      return;
    }

    data.forEach((signal) => {
      const card = document.createElement("div");
      card.className =
        "bg-white rounded-xl shadow p-6 transition hover:shadow-lg border-t-4 mb-6 border-" +
        (signal.direction === "Achat" ? "green-500" : "red-500");

      const lastUpdated = new Date(signal.date).toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      card.innerHTML = `
        <h3 class="text-xl font-semibold mb-2">${signal.nom}</h3>
        <p class="text-sm text-gray-500 mb-4">${signal.secteur || "Secteur inconnu"}</p>
        <div class="flex justify-between items-center mb-4">
          <span class="text-sm text-gray-600">Dernier cours :</span>
          <span class="font-bold text-lg">${signal.prix} €</span>
        </div>
        <div class="flex justify-between items-center mb-2">
          <span class="text-sm text-gray-600">Tendance :</span>
          <span class="font-semibold ${
            signal.direction === "Achat" ? "text-green-600" : "text-red-600"
          }">${signal.direction}</span>
        </div>
        <div class="flex justify-between items-center mb-2">
          <span class="text-sm text-gray-600">Volatilité :</span>
          <span>${signal.volatilite || "N/A"}</span>
        </div>
        <div class="flex justify-between items-center mb-2">
          <span class="text-sm text-gray-600">Confiance :</span>
          <span class="font-semibold">${signal.confiance || "N/A"}%</span>
        </div>
        <div class="text-right text-xs text-gray-400 mt-4">
          Mis à jour le ${lastUpdated}
        </div>
      `;

      container.appendChild(card);
    });
  } catch (error) {
    container.innerHTML =
      "<p class='text-center text-red-600'>Erreur de chargement des signaux.</p>";
    console.error("Erreur lors du chargement des signaux :", error);
  }
});
