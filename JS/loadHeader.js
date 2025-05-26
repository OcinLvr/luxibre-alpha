document.addEventListener('DOMContentLoaded', function () {
  fetch('header.html')
    .then(response => response.text())
    .then(data => {
      document.body.insertAdjacentHTML('afterbegin', data);

      // Corriger les couleurs si le fond est sombre (ex: dashboard)
      const isDark = getComputedStyle(document.body).backgroundColor === 'rgb(15, 23, 42)'; // #0f172a
      if (isDark) {
        const style = document.createElement('style');
        style.textContent = `
          header nav a,
          #mobileMenu a,
          #loginBtn, #logoutBtn,
          #mobileLoginBtn, #mobileLogoutBtn {
            color: #f8fafc !important; /* texte clair */
          }

          header {
            background-color: #0f172a !important;
          }

          #menuToggle {
            color: #22c55e !important; /* vert Luxibre */
          }
        `;
        document.head.appendChild(style);
      }

      // Gestion de l'authentification
      const loginBtn = document.getElementById("loginBtn");
      const logoutBtn = document.getElementById("logoutBtn");
      const mobileLoginBtn = document.getElementById("mobileLoginBtn");
      const mobileLogoutBtn = document.getElementById("mobileLogoutBtn");

      const user = false; // à remplacer par votre vraie logique

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
        window.location.href = "login.html";
      });

      mobileLogoutBtn.addEventListener("click", async () => {
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
