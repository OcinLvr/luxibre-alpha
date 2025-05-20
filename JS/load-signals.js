// js/load-signals.js

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("signals-container");

  try {
    const response = await fetch("signals.json");
    const data = await response.json();

    data.forEach(signal => {
      const { name, price, recommendation } = signal;

      let color, icon, action;
      switch (recommendation.toLowerCase()) {
        case "buy":
          color = "bg-green-100 border-green-500 text-green-800";
          icon = "🔼";
          action = "Acheter";
          break;
        case "sell":
          color = "bg-red-100 border-red-500 text-red-800";
          icon = "🔽";
          action = "Vendre";
          break;
        default:
          color = "bg-gray-100 border-gray-400 text-gray-700";
          icon = "⏸";
          action = "Attente";
      }

      const card = document.createElement("div");
      card.className = `p-6 border-l-4 rounded shadow-sm ${color}`;

      card.innerHTML = `
        <h3 class="text-xl font-semibold mb-2">${name}</h3>
        <p class="text-2xl font-bold mb-2">${price.toFixed(2)} €</p>
        <p class="text-lg font-medium">${icon} ${action}</p>
      `;

      container.appendChild(card);
    });

  } catch (error) {
    container.innerHTML = `<p class="text-red-500">Erreur lors du chargement des signaux.</p>`;
    console.error("Erreur chargement signaux:", error);
  }
});
