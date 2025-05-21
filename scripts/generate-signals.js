const fs = require('fs');
const path = require('path');

const today = new Date().toLocaleDateString("fr-FR");

const signals = [
  {
    title: "ETF iShares EURO STOXX Banks",
    description: `Analyse du ${today} : rebond technique en cours.`,
    recommendation: "💹 Acheter"
  },
  {
    title: "Apple Inc.",
    description: `Analyse du ${today} : momentum positif.`,
    recommendation: "📈 Conserver"
  },
  {
    title: "Tesla Inc.",
    description: `Analyse du ${today} : surévaluation probable.`,
    recommendation: "🔻 Vendre"
  }
];

// Écrit dans data/signals.json
fs.writeFileSync(
  path.join(__dirname, '../data/signals.json'),
  JSON.stringify(signals, null, 2),
  'utf-8'
);

console.log("Signaux mis à jour avec succès.");
