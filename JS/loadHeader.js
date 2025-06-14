import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://jrgdwozxcilasllpvikh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZ2R3b3p4Y2lsYXNsbHB2aWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4MjQ0NTEsImV4cCI6MjA2MzQwMDQ1MX0.S2oGP2rdtq1IkW-oH5mC8omm698PdCgQJtGVLlIFj3w'
);

// Auth & profil
async function getUserInfo() {
  const { data: auth } = await supabase.auth.getUser();
  if (auth && auth.user) {
    const user = auth.user;
    const { data: userData } = await supabase.from('users').select('ispremium, email').eq('id', user.id).single();
    return {
      isLogged: true,
      isPremium: !!(userData && userData.ispremium),
      email: userData?.email || user.email || "Utilisateur",
      user,
    };
  } else {
    return { isLogged: false, isPremium: false, email: "", user: null };
  }
}
async function getUserActifs(userId) {
  const { data } = await supabase.from('user_follows').select('symbol').eq('user_id', userId);
  return (data || []).map(a => a.symbol);
}

// Globales promises
window.userInfoPromise = getUserInfo();
window.isPremiumPromise = window.userInfoPromise.then(user => user.isPremium);

// Header dynamique
async function loadHeader() {
  const headerContainer = document.getElementById('header');
  if (!headerContainer) return;
  const res = await fetch('header.html');
  headerContainer.innerHTML = await res.text();

  // Réglages post-injection
  const loginBtnLi = document.getElementById('loginBtnLi');
  const signupBtnLi = document.getElementById('signupBtnLi');
  const premiumBtnLi = document.getElementById('premiumBtnLi');
  const logoutBtnLi = document.getElementById('logoutBtnLi');
  const notifWrapper = document.getElementById('notifWrapper');
  const notifBtn = document.getElementById('notifBtn');
  const notifCount = document.getElementById('notifCount');
  const notifDropdown = document.getElementById('notifDropdown');
  const notifList = document.getElementById('notifList');
  const userIconWrapper = document.getElementById('userIconWrapper');
  let userIconBtn = document.getElementById('userIconBtn');
  let userModal = document.getElementById('userModal');
  let closeUserModal = document.getElementById('closeUserModal');
  let modalUserEmail = document.getElementById('modalUserEmail');
  let modalUserStatus = document.getElementById('modalUserStatus');
  let modalUserActifs = document.getElementById('modalUserActifs');
  let modalUserActifsEmpty = document.getElementById('modalUserActifsEmpty');
  let userModalLogoutBtn = document.getElementById('userModalLogoutBtn');

  window.userInfoPromise.then(async userInfoObj => {
    let { isLogged, isPremium, email, user } = userInfoObj;
    let notifications = [];

    // Rendering notifications
    function renderNotifications() {
      const unread = notifications.filter(n => !n.read).length;
      notifCount.textContent = unread > 0 ? unread : "";
      notifCount.style.display = unread > 0 ? "" : "none";
      notifWrapper.classList.remove('hidden');

      if (notifications.length) {
        notifList.innerHTML = notifications
          .map(n => `
            <li class="p-2 border-b last:border-b-0 flex items-center gap-2 ${n.read ? '' : 'font-bold'}">
              <span class="flex-1">${n.message}</span>
              ${!n.read ? `<button class="text-xs text-green-600 underline mark-as-read-btn" data-id="${n.id}">Marquer comme lu</button>` : ''}
            </li>
          `).join('');
      } else {
        notifList.innerHTML = '<li class="p-2 text-gray-400">Aucune notification</li>';
      }

      notifList.querySelectorAll('.mark-as-read-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          await supabase.from('notifications').update({ read: true }).eq('id', id);
          const notif = notifications.find(n => n.id === id);
          if (notif) notif.read = true;
          renderNotifications();
        });
      });
    }

    async function updateNotifications() {
      if (!isLogged || !user) return;
      notifWrapper.classList.remove('hidden');
      const { data: notifData } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      notifications = notifData || [];
      renderNotifications();
    }

    notifBtn?.addEventListener('click', (e) => {
      notifDropdown.classList.toggle('hidden');
    });
    document.addEventListener('mousedown', function(e){
      if (!notifDropdown.classList.contains('hidden') && !notifWrapper.contains(e.target)) {
        notifDropdown.classList.add('hidden');
      }
    });

    if (isLogged) {
      loginBtnLi.style.display = "none";
      signupBtnLi.style.display = "none";
      logoutBtnLi.style.display = "";
      logoutBtnLi.classList.remove('hidden');
      premiumBtnLi.style.display = isPremium ? "none" : "";
      notifWrapper.classList.remove('hidden');
      if (userIconWrapper) userIconWrapper.classList.remove('hidden');

      userIconBtn = document.getElementById('userIconBtn');
      const newUserIconBtn = userIconBtn.cloneNode(true);
      userIconBtn.parentNode.replaceChild(newUserIconBtn, userIconBtn);
      userIconBtn = newUserIconBtn;

      userModal = document.getElementById('userModal');
      closeUserModal = document.getElementById('closeUserModal');
      modalUserEmail = document.getElementById('modalUserEmail');
      modalUserStatus = document.getElementById('modalUserStatus');
      modalUserActifs = document.getElementById('modalUserActifs');
      modalUserActifsEmpty = document.getElementById('modalUserActifsEmpty');
      userModalLogoutBtn = document.getElementById('userModalLogoutBtn');

      userIconBtn.addEventListener('click', async () => {
        modalUserEmail.textContent = email;
        modalUserStatus.textContent = isPremium ? "Premium" : "Gratuit";
        modalUserActifs.innerHTML = "";
        const actifs = await getUserActifs(user.id);
        if (actifs.length === 0) {
          modalUserActifsEmpty.classList.remove('hidden');
        } else {
          modalUserActifsEmpty.classList.add('hidden');
          actifs.forEach(a => {
            const li = document.createElement('li');
            li.textContent = a;
            modalUserActifs.appendChild(li);
          });
        }
        userModal.classList.remove('hidden');
      });

      const newCloseUserModal = closeUserModal.cloneNode(true);
      closeUserModal.parentNode.replaceChild(newCloseUserModal, closeUserModal);
      closeUserModal = newCloseUserModal;
      closeUserModal.addEventListener('click', () => userModal.classList.add('hidden'));

      userModal.addEventListener('mousedown', function(e){ if (e.target === userModal) userModal.classList.add('hidden'); });
      window.addEventListener('keydown', function escListener(e){
        if (e.key === 'Escape' && !userModal.classList.contains('hidden')) userModal.classList.add('hidden');
      });

      const newUserModalLogoutBtn = userModalLogoutBtn.cloneNode(true);
      userModalLogoutBtn.parentNode.replaceChild(newUserModalLogoutBtn, userModalLogoutBtn);
      userModalLogoutBtn = newUserModalLogoutBtn;
      userModalLogoutBtn.addEventListener('click', async function () {
        await supabase.auth.signOut();
        window.location.href = "index.html";
      });

      await updateNotifications();
    } else {
      loginBtnLi.style.display = "";
      signupBtnLi.style.display = "";
      logoutBtnLi.style.display = "none";
      logoutBtnLi.classList.add('hidden');
      premiumBtnLi.style.display = "none";
      notifWrapper.classList.add('hidden');
      if (userIconWrapper) userIconWrapper.classList.add('hidden');
    }
  });

  document.getElementById('logoutBtn')?.addEventListener('click', async function (e) {
    e.preventDefault();
    await supabase.auth.signOut();
    window.location.href = "index.html";
  });

  // Burger menu mobile
  const burgerBtn = document.getElementById('burgerBtn');
  const headerNav = document.getElementById('headerNav');
  const menuOverlay = document.getElementById('menuOverlay');
  function openMenu() {
    headerNav.classList.remove('-translate-x-full');
    menuOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
  function closeMenu() {
    headerNav.classList.add('-translate-x-full');
    menuOverlay.classList.add('hidden');
    document.body.style.overflow = '';
  }
  burgerBtn?.addEventListener('click', openMenu);
  menuOverlay?.addEventListener('click', closeMenu);
  headerNav?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  function handleResize() {
    if (window.innerWidth >= 768) {
      headerNav.classList.remove('-translate-x-full');
      menuOverlay.classList.add('hidden');
      document.body.style.overflow = '';
    } else {
      headerNav.classList.add('-translate-x-full');
    }
  }
  window.addEventListener('resize', handleResize);
  handleResize();

  // Modale Auth (voir template HTML pour les handlers)
  // ... (Déjà géré par le script principal ou un module séparé)
}

document.addEventListener('DOMContentLoaded', loadHeader);
