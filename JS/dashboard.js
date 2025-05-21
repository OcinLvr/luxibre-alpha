async function loadSignals() {
  const res = await fetch('/data/signals.json');
  const signals = await res.json();
  const user = netlifyIdentity.currentUser();
  const isPremium = user && user.app_metadata.roles && user.app_metadata.roles.includes('premium');
  const container = document.getElementById('signals');

  const limitedSignals = isPremium ? signals : signals.slice(0, 1); // 1 signal pour gratuit
  limitedSignals.forEach(signal => {
    const card = document.createElement('div');
    card.className = 'bg-gray-800 p-4 rounded shadow';
    card.innerHTML = `
      <h3 class="text-xl font-bold mb-2">${signal.title}</h3>
      <p>${signal.description}</p>
      <p class="mt-2 text-green-400 font-semibold">${signal.recommendation}</p>
    `;
    container.appendChild(card);
  });
}

document.getElementById('logoutBtn').addEventListener('click', () => {
  netlifyIdentity.logout();
  window.location.href = '/login.html';
});

netlifyIdentity.on("init", loadSignals);
