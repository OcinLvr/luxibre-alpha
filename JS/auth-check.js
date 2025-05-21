netlifyIdentity.on("init", (user) => {
  if (!user && window.location.pathname !== "/index.html") {
    alert("Veuillez vous connecter pour accéder à cette page.");
    setTimeout(() => {
      netlifyIdentity.open(); // Affiche la fenêtre de connexion
    }, 200); // Léger délai pour contourner le blocage navigateur

    netlifyIdentity.on("login", () => {
      window.location.reload(); // Recharge la page après connexion
    });
  }
});

netlifyIdentity.init();
