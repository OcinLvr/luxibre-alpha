if (window.netlifyIdentity) {
  window.netlifyIdentity.on("init", user => {
    updateUI(user);

    // Redirection automatique si connecté ET sur la page d'accueil
    if (user) {
      const path = window.location.pathname;
      // On redirige uniquement si on est sur la page d'accueil (index.html ou /)
      if (path === "/" || path === "/index.html") {
        window.location.replace("/dashboard.html");
      }
    }
  });

  window.netlifyIdentity.on("login", user => {
    updateUI(user);
    window.location.replace("/dashboard.html");
  });

  window.netlifyIdentity.on("logout", () => {
    updateUI(null);
    window.location.replace("/index.html");
  });

  window.netlifyIdentity.init();
}

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

document.getElementById("loginBtn")?.addEventListener("click", () => {
  netlifyIdentity.open("login");
});

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  netlifyIdentity.logout();
});
