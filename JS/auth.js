// js/auth.js

if (typeof netlifyIdentity !== "undefined") {
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

// Affiche ou masque les boutons selon l’état de connexion
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
