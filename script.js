document.addEventListener("DOMContentLoaded", () => {
  const prices = {
    btcPrice: "bitcoin",
    ethPrice: "ethereum",
    solPrice: "solana",
    adaPrice: "cardano"
  };

  for (const [id, coin] of Object.entries(prices)) {
    fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=eur`)
      .then(res => res.json())
      .then(data => {
        document.getElementById(id).textContent = data[coin].eur + " €";
      });
  }

  const langData = {
    en: {
      title: "Luxibre Alpha",
      subtitle: "Live signals & predictive tools for investors",
      unlock: "🔓 Unlock Premium – 5€/mo",
      referral: "Boursobank referral: Join here",
      footer: "Stripe-secured | Luxibre © 2025",
      locked: "Subscribe to unlock full insights & trend analytics",
      freeAssets: "Live Prices (Free)"
    },
    fr: {
      title: "Luxibre Alpha",
      subtitle: "Signaux en temps réel et outils prédictifs pour investisseurs",
      unlock: "🔓 Débloquez Premium – 5€/mois",
      referral: "Parrainage Boursobank : Rejoindre ici",
      footer: "Paiements sécurisés via Stripe | Luxibre © 2025",
      locked: "Abonnez-vous pour débloquer les analyses et prédictions complètes",
      freeAssets: "Prix en direct (Gratuit)"
    }
  };

  document.getElementById("langSwitch").addEventListener("change", e => {
    const lang = e.target.value;
    document.querySelectorAll("[data-i18n]").forEach(el => {
      el.innerHTML = langData[lang][el.dataset.i18n];
    });
  });

  const ctx = document.getElementById("chart-etf").getContext("2d");
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ["2020", "2022", "2024", "2026", "2028", "2030", "2035"],
      datasets: [{
        label: 'ETF Value',
        borderColor: "#00ff88",
        backgroundColor: "rgba(0,255,136,0.1)",
        data: [7, 9, 10, 12, 15, 17.6, 28.74]
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } }
    }
  });
});