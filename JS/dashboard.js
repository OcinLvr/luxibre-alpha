// Charger les signaux financiers depuis signals.json
fetch('/data/signals.json')
  .then(response => response.json())
  .then(data => {
    const container = document.getElementById('signals');
    data.signals.forEach(signal => {
      container.innerHTML += `
        <div class="signal-card bg-white p-6 rounded-lg shadow mb-4">
          <h3 class="text-xl font-semibold">${signal.title}</h3>
          <p>${signal.description}</p>
          <small class="block mt-2 text-gray-500">Timeframe: ${signal.timeframe} | Confiance: ${signal.confidence}</small>
        </div>
      `;
    });
  });

// Charger et afficher les graphiques
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
            borderColor: '#4CAF50',
            tension: 0.3
          },
          {
            label: 'BTC/USD',
            data: chartData.data.btcusd,
            borderColor: '#FF9800',
            tension: 0.3
          },
          {
            label: 'SPY ETF',
            data: chartData.data.spy,
            borderColor: '#2196F3',
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
