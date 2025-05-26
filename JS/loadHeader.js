document.addEventListener('DOMContentLoaded', function() {
  fetch('header.html')
    .then(response => response.text())
    .then(data => {
      document.body.insertAdjacentHTML('afterbegin', data);

      // Ajoutez ici le code pour gérer la logique d'authentification et le menu mobile
      const loginBtn = document.getElementById("loginBtn");
      const logoutBtn = document.getElementById("logoutBtn");
      const mobileLoginBtn = document.getElementById("mobileLoginBtn");
      const mobileLogoutBtn = document.getElementById("mobileLogoutBtn");

      // Exemple de logique d'authentification
      const user = false; // Remplacez par votre logique d'authentification réelle

      if (user) {
        loginBtn.classList.add("hidden");
        logoutBtn.classList.remove("hidden");
        mobileLoginBtn.classList.add("hidden");
        mobileLogoutBtn.classList.remove("hidden");
      } else {
        loginBtn.classList.remove("hidden");
        logoutBtn.classList.add("hidden");
        mobileLoginBtn.classList.remove("hidden");
        mobileLogoutBtn.classList.add("hidden");
      }

      logoutBtn.addEventListener("click", async () => {
        // Ajoutez ici votre logique de déconnexion
        window.location.href = "login.html";
      });

      mobileLogoutBtn.addEventListener("click", async () => {
        // Ajoutez ici votre logique de déconnexion
        window.location.href = "login.html";
      });

      loginBtn.addEventListener("click", () => {
        window.location.href = "login.html";
      });

      mobileLoginBtn.addEventListener("click", () => {
        window.location.href = "login.html";
      });

      document.getElementById("menuToggle").addEventListener("click", () => {
        document.getElementById("mobileMenu").classList.toggle("hidden");
      });
    });
});
