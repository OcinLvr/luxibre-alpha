import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://jrgdwozxcilasllpvikh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZ2R3b3p4Y2lsYXNsbHB2aWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4MjQ0NTEsImV4cCI6MjA2MzQwMDQ1MX0.S2oGP2rdtq1IkW-oH5mC8omm698PdCgQJtGVLlIFj3w'
);

// Promesse globale pour attendre le statut Premium dans les autres scripts
window.isPremiumPromise = new Promise((resolve) => {
  document.addEventListener('DOMContentLoaded', async function () {
    try {
      const response = await fetch('header.html');
      const headerHTML = await response.text();
      document.body.insertAdjacentHTML('afterbegin', headerHTML);

      // Thème sombre
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

        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user data:', error);
          resolve(false); // défaut à gratuit
        } else {
          userName.textContent = userData.name || 'Non spécifié';
          userEmail.textContent = userData.email || 'Non spécifié';
          userVersion.textContent = userData.ispremium ? 'Premium' : 'Gratuit';

          window.isPremium = userData.ispremium === true;
          console.log("Premium actif :", window.isPremium);
          resolve(window.isPremium);
        }

        const watchlist = user.user_metadata.watchlist || [];
        watchlistItems.innerHTML = watchlist.map(item => `<li>${item}</li>`).join('');

        supabase
          .channel('asset_updates')
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'assets' }, payload => {
            checkForNotifications(payload.new);
          })
          .subscribe();

        loadNotifications(user.id);
      } else {
        loginBtn?.classList.remove("hidden");
        logoutBtn?.classList.add("hidden");
        mobileLoginBtn?.classList.remove("hidden");
        mobileLogoutBtn?.classList.add("hidden");
        resolve(false); // utilisateur non connecté = gratuit
      }

      logoutBtn?.addEventListener("click", async () => {
        await supabase.auth.signOut();
        window.location.href = "login.html";
      });

      mobileLogoutBtn?.addEventListener("click", async () => {
        await supabase.auth.signOut();
        window.location.href = "login.html";
      });

      loginBtn?.addEventListener("click", () => window.location.href = "login.html");
      mobileLoginBtn?.addEventListener("click", () => window.location.href = "login.html");

      document.getElementById("menuToggle")?.addEventListener("click", () => {
        document.getElementById("mobileMenu")?.classList.toggle("hidden");
      });

      userIcon?.addEventListener('click', () => userModal.classList.add('show'));
      mobileUserIcon?.addEventListener('click', () => userModal.classList.add('show'));
      closeModal?.addEventListener('click', () => userModal.classList.remove('show'));
      userModal?.addEventListener('click', event => {
        if (event.target === userModal) userModal.classList.remove('show');
      });

      notificationIcon?.addEventListener('click', () => notificationModal.classList.add('show'));
      mobileNotificationIcon?.addEventListener('click', () => notificationModal.classList.add('show'));
      closeNotificationModal?.addEventListener('click', () => notificationModal.classList.remove('show'));
      notificationModal?.addEventListener('click', event => {
        if (event.target === notificationModal) notificationModal.classList.remove('show');
      });

      window.addToFavorites = async function(userId, assetId) {
        const { data, error } = await supabase
          .from('favorites')
          .insert([{ user_id: userId, asset_id: assetId }]);

        if (error) console.error('Error adding to favorites:', error);
        else console.log('Added to favorites:', data);
      };

      async function checkForNotifications(updatedAsset) {
        const { data: favorites, error } = await supabase
          .from('favorites')
          .select('*')
          .eq('asset_id', updatedAsset.id);

        if (error) {
          console.error('Error fetching favorites:', error);
          return;
        }

        favorites.forEach(fav => {
          sendNotification(fav.user_id, `Le signal de ${updatedAsset.name} a changé.`);
        });
      }

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

        notificationList.innerHTML = notifications.map(n => `
          <li class="p-2 border-b">${n.message}</li>
        `).join('');

        const unread = notifications.filter(n => !n.read).length;
        notificationCount.textContent = unread;
        mobileNotificationCount.textContent = unread;
      }

      function updateNotificationIcon(userId) {
        loadNotifications(userId);
      }

    } catch (err) {
      console.error("Erreur lors du chargement du header :", err);
      resolve(false); // sécurité en cas d'erreur
    }
  });
});
