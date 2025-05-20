// 🔐 Vérification premium avant affichage
firebase.auth().onAuthStateChanged(user => {
  if (!user) return window.location.href = '/login.html';

  // Vérifier l'abonnement Stripe via un endpoint sécurisé (ex: Cloud Function ou proxy Netlify)
  fetch('/.netlify/functions/check-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email })
  })
  .then(res => res.json())
  .then(status => {
    if (!status.active) {
      alert("Votre abonnement premium est inactif. Veuillez vous abonner.");
      return window.location.href = '/pricing.html';
    }

    // 🧠 Chargement des signaux premium
    fetch('/data/signals.json')
      .then(response => response.json())
      .then(data => {
        const container = document.getElementById('signals');
        data.signals.forEach(signal => {
          container.innerHTML += `
            <div class="bg-white rounded-xl shadow p-5 hover:shadow-md transition">
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-lg font-semibold text-green-700">${signal.title}</h3>
                <span class="text-xs text-gray-500">${signal.timeframe}</span>
              </div>
              <p class="text-sm text-gray-700">${signal.description}</p>
              <div class="text-xs text-gray-400 mt-2">Confiance: ${signal.confidence}</div>
            </div>
          `;
        });
      });

    // 📊 Chargement des données graphiques
    fetch('/data/charts-data.json')
      .then(res => res.json())
      .then(chartData => {
        const ctx = document.getElementById('signalsChart').getContext('2d');
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: chartData.labels,
            datasets: [
              {
                label: 'EUR/USD',
                data: chartData.data.eurusd,
                borderColor: '#16a34a',
                backgroundColor: 'rgba(22, 163, 74, 0.1)',
                fill: true,
                tension: 0.3
              },
              {
                label: 'BTC/USD',
                data: chartData.data.btcusd,
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                fill: true,
                tension: 0.3
              },
              {
                label: 'SPY ETF',
                data: chartData.data.spy,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                fill: true,
                tension: 0.3
              }
            ]
          },
          options: {
            responsive: true,
            scales: {
              y: {
                beginAtZero: false
              }
            }
          }
        });
      });
  });
});
