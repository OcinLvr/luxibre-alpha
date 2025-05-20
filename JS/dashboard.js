// Charger les signaux financiers depuis signals.json
fetch('/data/signals.json')
  .then(response => response.json())
  .then(data => {
    const container = document.getElementById('signals');
    container.innerHTML = ''; // Réinitialiser le contenu

    data.signals.forEach(signal => {
      const color = signal.confidence >= 80 ? 'text-green-600' : signal.confidence >= 60 ? 'text-yellow-500' : 'text-red-500';
      const icon = signal.type === 'achat' ? '⬆️' : '⬇️';

      container.innerHTML += `
        <div class="bg-white rounded-xl shadow p-6 transition hover:shadow-md">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-xl font-bold text-gray-800">${icon} ${signal.title}</h3>
            <span class="text-sm ${color} font-semibold">Confiance: ${signal.confidence}%</span>
          </div>
          <p class="text-gray-600 text-sm mb-2">${signal.description}</p>
          <div class="flex justify-between text-xs text-gray-500">
            <span>Timeframe: ${signal.timeframe}</span>
            <span>${signal.date}</span>
          </div>
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
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'BTC/USD',
            data: chartData.data.btcusd,
            borderColor: '#FF9800',
            backgroundColor: 'rgba(255, 152, 0, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'SPY ETF',
            data: chartData.data.spy,
            borderColor: '#2196F3',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#4B5563'
            }
          },
          title: {
            display: true,
            text: 'Performance des marchés',
            color: '#1F2937',
            font: {
              size: 18
            }
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            ticks: {
              color: '#4B5563'
            }
          },
          x: {
            ticks: {
              color: '#4B5563'
            }
          }
        }
      }
    });
  });
