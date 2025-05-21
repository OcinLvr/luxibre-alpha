const fs = require('fs');
const path = require('path');

const actions = ['Acheter', 'Vendre'];
const stocks = ['BNP', 'Société Générale', 'AXA', 'TotalEnergies', 'Airbus', 'LVMH'];
const now = new Date().toISOString();

function randomSignal() {
  return {
    action: actions[Math.floor(Math.random() * actions.length)],
    titre: stocks[Math.floor(Math.random() * stocks.length)],
    heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    date: new Date().toLocaleDateString('fr-FR'),
    premium: Math.random() > 0.5
  };
}

const signals = Array.from({ length: 5 }, () => randomSignal());

const filePath = path.join(__dirname, '../data/signals.json');
fs.writeFileSync(filePath, JSON.stringify(signals, null, 2));

console.log('Signaux mis à jour.');
