document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("chart-etf");
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#00ff88";
  ctx.fillRect(10, 60, 80, 30);

  const langData = {
    en: {
      title: "Luxibre Alpha",
      subtitle: "Smart signals for ETF and crypto investors",
      unlock: "Unlock Premium",
      referral: "Boursobank referral: Join here",
      footer: "Secure payments via Stripe | Luxibre © 2025",
      locked: "Available in Premium only. Subscribe to unlock full analysis & indicators."
    },
    fr: {
      title: "Luxibre Alpha",
      subtitle: "Signaux intelligents pour les investisseurs ETF et crypto",
      unlock: "Débloquer Premium",
      referral: "Parrainage Boursobank : Rejoindre ici",
      footer: "Paiements sécurisés via Stripe | Luxibre © 2025",
      locked: "Disponible uniquement en Premium. Abonnez-vous pour débloquer l'analyse complète."
    }
  };

  document.getElementById("langSwitch").addEventListener("change", (e) => {
    const lang = e.target.value;
    const elements = document.querySelectorAll("[data-i18n]");
    elements.forEach(el => {
      const key = el.getAttribute("data-i18n");
      el.innerHTML = langData[lang][key];
    });
  });
});