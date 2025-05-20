// Initialisation du widget Netlify Identity
if (window.netlifyIdentity) {
  window.netlifyIdentity.on("init", user => {
    updateUI(user);

    // Rediriger automatiquement si déjà connecté
    if (user && window.location.pathname === "/index.html") {
      window.location.href = "/dashboard.html";
    }
  });

  window.netlifyIdentity.on("login", user => {
    updateUI(user);
    window.location.href = "/dashboard.html";
  });

  window.netlifyIdentity.on("logout", () => {
    updateUI(null);
    window.location.href = "/index.html";
  });

  window.netlifyIdentity.init(); // Très important pour charger l'état
}

// Mise à jour de l'interface selon l'état de connexion
function updateUI(user) {
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (user) {
    loginBtn?.classList.add("hidden");
    logoutBtn?.classList.remove("hidden");
  } else {
    loginBtn?.classList.remove("hidden");
    logoutBtn?.classList.add("hidden");
  }
}

// Actions des boutons
document.getElementById("loginBtn")?.addEventListener("click", () => {
  netlifyIdentity.open("login");
});

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  netlifyIdentity.logout();
});
