// js/auth-check.js

document.addEventListener("DOMContentLoaded", () => {
  const userData = JSON.parse(localStorage.getItem("luxibre_user"));

  if (!userData || !userData.isAuthenticated) {
    // Redirige les utilisateurs non connectés vers la page de connexion
    window.location.href = "/login.html";
  }

  // Si l'utilisateur est connecté mais n'est pas abonné
  if (!userData.isPremium) {
    // Redirige les utilisateurs non premium vers la page d’abonnement
    window.location.href = "/pricing.html";
  }
});
