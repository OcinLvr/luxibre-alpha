// loadHeader.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://jrgdwozxcilasllpvikh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZ2R3b3p4Y2lsYXNsbHB2aWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4MjQ0NTEsImV4cCI6MjA2MzQwMDQ1MX0.S2oGP2rdtq1IkW-oH5mC8omm698PdCgQJtGVLlIFj3w'
);

document.addEventListener('DOMContentLoaded', async function () {
  try {
    const response = await fetch('header.html');
    const headerHTML = await response.text();
    document.body.insertAdjacentHTML('afterbegin', headerHTML);

    // Thème sombre : ajustements des couleurs
    const isDark = getComputedStyle(document.body).backgroundColor === 'rgb(15, 23, 42)';
    if (isDark) {
      const style = document.createElement('style');
      style.textContent = `
        header nav a,
        #mobileMenu a,
        #loginBtn, #logoutBtn,
        #mobileLoginBtn, #mobileLogoutBtn {
          color: #f8fafc !important;
        }

        header {
          background-color: #0f172a !important;
        }

        #menuToggle {
          color: #22c55e !important;
        }

        #mobileMenu {
          background-color: #0f172a !important;
        }
      `;
      document.head.appendChild(style);
    }

    // Supabase Auth : gestion de l'état de connexion
    const { data: { user } } = await supabase.auth.getUser();

    const loginBtn = document.getElementById("loginBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const mobileLoginBtn = document.getElementById("mobileLoginBtn");
    const mobileLogoutBtn = document.getElementById("mobileLogoutBtn");
    const userIcon = document.getElementById("userIcon");
    const mobileUserIcon = document.getElementById("mobileUserIcon");
    const closeModal = document.getElementById('closeModal');
    const userModal = document.getElementById('userModal');
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const userVersion = document.getElementById('userVersion');
    const watchlistItems = document.getElementById('watchlistItems');
    const freeAccountBtn = document.getElementById("freeAccountBtn");

    if (user) {
      loginBtn?.classList.add("hidden");
      logoutBtn?.classList.remove("hidden");
      mobileLoginBtn?.classList.add("hidden");
      mobileLogoutBtn?.classList.remove("hidden");

      // Afficher les informations de l'utilisateur dans la modale
      userName.textContent = user.user_metadata.full_name || 'Non spécifié';
      userEmail.textContent = user.email || 'Non spécifié';

      // Vérifier si l'utilisateur est premium (à adapter selon votre logique)
      const isPremium = user.user_metadata.isPremium || false;
      userVersion.textContent = isPremium ? 'Premium' : 'Gratuit';

      // Charger la liste de surveillance (à adapter selon votre logique)
      const watchlist = user.user_metadata.watchlist || [];
      watchlistItems.innerHTML = watchlist.map(item => `<li>${item}</li>`).join('');

      // Mettre à jour le texte du bouton si l'utilisateur est connecté
      if (freeAccountBtn) {
        freeAccountBtn.textContent = "Accéder à mon compte";
        freeAccountBtn.href = "dashboard.html"; // Rediriger vers le tableau de bord ou une autre page appropriée
      }
    } else {
      loginBtn?.classList.remove("hidden");
      logoutBtn?.classList.add("hidden");
      mobileLoginBtn?.classList.remove("hidden");
      mobileLogoutBtn?.classList.add("hidden");
    }

    logoutBtn?.addEventListener("click", async () => {
      await supabase.auth.signOut();
      window.location.href = "login.html";
    });

    mobileLogoutBtn?.addEventListener("click", async () => {
      await supabase.auth.signOut();
      window.location.href = "login.html";
    });

    loginBtn?.addEventListener("click", () => {
      window.location.href = "login.html";
    });

    mobileLoginBtn?.addEventListener("click", () => {
      window.location.href = "login.html";
    });

    // Menu mobile
    document.getElementById("menuToggle")?.addEventListener("click", () => {
      document.getElementById("mobileMenu")?.classList.toggle("hidden");
    });

    // Ouvrir la modale lorsque l'icône utilisateur est cliquée
    userIcon?.addEventListener('click', function () {
      userModal.classList.add('show');
    });

    // Ouvrir la modale lorsque l'icône utilisateur mobile est cliquée
    mobileUserIcon?.addEventListener('click', function () {
      userModal.classList.add('show');
    });

    // Fermer la modale lorsque le bouton de fermeture est cliqué
    closeModal?.addEventListener('click', function () {
      userModal.classList.remove('show');
    });

    // Fermer la modale lorsque l'utilisateur clique en dehors de la modale
    userModal?.addEventListener('click', function (event) {
      if (event.target === userModal) {
        userModal.classList.remove('show');
      }
    });

  } catch (err) {
    console.error("Erreur lors du chargement du header :", err);
  }
});
