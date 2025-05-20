// js/auth.js

// Initialisation manuelle
if (typeof netlifyIdentity !== "undefined") {
  netlifyIdentity.init();

  // Gestion du token de confirmation dans l’URL
  const params = new URLSearchParams(window.location.hash.slice(1));
  const token = params.get("confirmation_token");

  if (token) {
    // Si token présent, on affiche un message ou redirige
    alert("Votre email a été confirmé avec succès !");
    window.location.href = "/login.html";
  }

  // Événements d'identité
  netlifyIdentity.on("init", user => {
    updateUI(user);
  });

  netlifyIdentity.on("login", user => {
    updateUI(user);
    netlifyIdentity.close();
    window.location.href = "/dashboard.html";
  });

  netlifyIdentity.on("logout", () => {
    updateUI(null);
    window.location.href = "/login.html";
  });
}

// Gère les boutons dynamiques
function updateUI(user) {
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (user) {
    if (loginBtn) loginBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "inline-block";
  } else {
    if (loginBtn) loginBtn.style.display = "inline-block";
    if (logoutBtn) logoutBtn.style.display = "none";
  }
}
