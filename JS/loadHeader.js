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
    const notificationIcon = document.getElementById("notificationIcon");
    const mobileNotificationIcon = document.getElementById("mobileNotificationIcon");
    const closeNotificationModal = document.getElementById('closeNotificationModal');
    const notificationModal = document.getElementById('notificationModal');
    const notificationList = document.getElementById('notificationList');
    const notificationCount = document.getElementById('notificationCount');
    const mobileNotificationCount = document.getElementById('mobileNotificationCount');

    if (user) {
      loginBtn?.classList.add("hidden");
      logoutBtn?.classList.remove("hidden");
      mobileLoginBtn?.classList.add("hidden");
      mobileLogoutBtn?.classList.remove("hidden");

      // Récupérer les informations utilisateur depuis la table 'users'
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user data:', error);
      } else {
        // Afficher les informations de l'utilisateur dans la modale
        userName.textContent = userData.name || 'Non spécifié';
        userEmail.textContent = userData.email || 'Non spécifié';

        // Mettre à jour la version de l'utilisateur
        userVersion.textContent = userData.ispremium ? 'Premium' : 'Gratuit';
      }

      // Charger la liste de surveillance
      const watchlist = user.user_metadata.watchlist || [];
      watchlistItems.innerHTML = watchlist.map(item => `<li>${item}</li>`).join('');

      // Écouter les changements sur les actifs favoris
      supabase
        .channel('asset_updates')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'assets' }, payload => {
          checkForNotifications(payload.new);
        })
        .subscribe();

      // Charger les notifications initiales
      loadNotifications(user.id);
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

    // Ouvrir la modale de notification lorsque l'icône de notification est cliquée
    notificationIcon?.addEventListener('click', function () {
      notificationModal.classList.add('show');
    });

    // Ouvrir la modale de notification lorsque l'icône de notification mobile est cliquée
    mobileNotificationIcon?.addEventListener('click', function () {
      notificationModal.classList.add('show');
    });

    // Fermer la modale de notification lorsque le bouton de fermeture est cliqué
    closeNotificationModal?.addEventListener('click', function () {
      notificationModal.classList.remove('show');
    });

    // Fermer la modale de notification lorsque l'utilisateur clique en dehors de la modale
    notificationModal?.addEventListener('click', function (event) {
      if (event.target === notificationModal) {
        notificationModal.classList.remove('show');
      }
    });

    // Fonction pour ajouter aux favoris
    window.addToFavorites = async function(userId, assetId) {
      const { data, error } = await supabase
        .from('favorites')
        .insert([{ user_id: userId, asset_id: assetId }]);

      if (error) {
        console.error('Error adding to favorites:', error);
      } else {
        console.log('Added to favorites:', data);
      }
    };

    // Fonction pour vérifier les notifications
    async function checkForNotifications(updatedAsset) {
      const { data: favorites, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('asset_id', updatedAsset.id);

      if (error) {
        console.error('Error fetching favorites:', error);
        return;
      }

      favorites.forEach(favorite => {
        sendNotification(favorite.user_id, `Le signal de ${updatedAsset.name} a changé.`);
      });
    }

    // Fonction pour envoyer une notification
    async function sendNotification(userId, message) {
      const { data, error } = await supabase
        .from('notifications')
        .insert([{ user_id: userId, message: message, read: false }]);

      if (error) {
        console.error('Error sending notification:', error);
      } else {
        console.log('Notification sent:', data);
        updateNotificationIcon(userId);
      }
    }

    // Fonction pour charger les notifications
    async function loadNotifications(userId) {
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading notifications:', error);
        return;
      }

      notificationList.innerHTML = notifications.map(notification => `
        <li class="p-2 border-b">${notification.message}</li>
      `).join('');

      const unreadCount = notifications.filter(notification => !notification.read).length;
      notificationCount.textContent = unreadCount;
      mobileNotificationCount.textContent = unreadCount;
    }

    // Fonction pour mettre à jour l'icône de notification
    function updateNotificationIcon(userId) {
      loadNotifications(userId);
    }

  } catch (err) {
    console.error("Erreur lors du chargement du header :", err);
  }
});
