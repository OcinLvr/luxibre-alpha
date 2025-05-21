netlifyIdentity.on("init", (user) => {
  if (!user && window.location.pathname !== "/index.html") {
    alert("Veuillez vous connecter pour accéder à cette page.");
    netlifyIdentity.open(); // Ouvre la fenêtre de login
    netlifyIdentity.on("login", () => {
      window.location.reload(); // Recharge après connexion
    });
  }
});

netlifyIdentity.init();
