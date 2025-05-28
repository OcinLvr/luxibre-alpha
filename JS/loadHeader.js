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
    const premiumUntil = document.getElementById('premiumUntil');
    const manageAccountBtn = document.getElementById('manageAccountBtn');
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

      userName.textContent = user.user_metadata.full_name || 'Non spécifié';
      userEmail.textContent = user.email || 'Non spécifié';

      const { data: userDetails, error: userDetailsError } = await supabase
        .from('users')
        .select('isPremium, plan, premium_until')
        .eq('id', user.id)
        .single();

      if (userDetailsError) {
        console.error("Erreur lors de la récupération des infos utilisateur :", userDetailsError);
        userVersion.textContent = 'Gratuit';
        premiumUntil.textContent = '-';
      } else {
        const isPremium = userDetails.isPremium;
        userVersion.textContent = isPremium ? 'Premium' : 'Gratuit';
        premiumUntil.textContent = userDetails.premium_until ? new Date(userDetails.premium_until).toLocaleDateString() : '-';
        manageAccountBtn.addEventListener('click', () => {
          window.location.href = isPremium ? 'manage-subscription.html' : 'pricing.html';
        });
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

    document.getElementById("menuToggle")?.addEventListener("click", () => {
      document.getElementById("mobileMenu")?.classList.toggle("hidden");
    });

    userIcon?.addEventListener('click', function () {
      userModal.classList.add('show');
    });

    mobileUserIcon?.addEventListener('click', function () {
      userModal.classList.add('show');
    });

    closeModal?.addEventListener('click', function () {
      userModal.classList.remove('show');
    });

    userModal?.addEventListener('click', function (event) {
      if (event.target === userModal) {
        userModal.classList.remove('show');
      }
    });

    notificationIcon?.addEventListener('click', function () {
      notificationModal.classList.add('show');
    });

    mobileNotificationIcon?.addEventListener('click', function () {
      notificationModal.classList.add('show');
    });

    closeNotificationModal?.addEventListener('click', function () {
      notificationModal.classList.remove('show');
    });

    notificationModal?.addEventListener('click', function (event) {
      if (event.target === notificationModal) {
        notificationModal.classList.remove('show');
      }
    });

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

      notificationList.innerHTML = notifications.map(notification => `
        <li class="p-2 border-b">${notification.message}</li>
      `).join('');

      const unreadCount = notifications.filter(notification => !notification.read).length;
      notificationCount.textContent = unreadCount;
      mobileNotificationCount.textContent = unreadCount;
    }

    function updateNotificationIcon(userId) {
      loadNotifications(userId);
    }

  } catch (err) {
    console.error("Erreur lors du chargement du header :", err);
  }
});
