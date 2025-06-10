import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://jrgdwozxcilasllpvikh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZ2R3b3p4Y2lsYXNsbHB2aWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4MjQ0NTEsImV4cCI6MjA2MzQwMDQ1MX0.S2oGP2rdtq1IkW-oH5mC8omm698PdCgQJtGVLlIFj3w'
);

// Système de header dynamique avec affichage utilisateur, notifications et gestion premium
async function loadHeader() {
  const headerContainer = document.getElementById('header');
  if (!headerContainer) return;

  // Charge le template header
  const res = await fetch('header.html');
  headerContainer.innerHTML = await res.text();

  // ...après avoir chargé le header...
let userInfoObj = null;
if (window.getUserInfo) {
  userInfoObj = await getUserInfo();
}
if (userInfoObj) {
  // Afficher le nom et le statut premium
  userInfo.classList.remove('hidden');
  userName.textContent = userInfoObj.name;
  userStatus.textContent = userInfoObj.isPremium ? "Premium" : "Gratuit";
  premiumBtnLi.style.display = userInfoObj.isPremium ? "none" : "";
  // ... notifications, etc.
} else {
  // Non connecté
  userInfo.classList.add('hidden');
  premiumBtnLi.style.display = "none";
}
  
  // Sélecteurs utiles
  const loginBtnLi = document.getElementById('loginBtnLi');
  const signupBtnLi = document.getElementById('signupBtnLi');
  const premiumBtnLi = document.getElementById('premiumBtnLi');
  const logoutBtnLi = document.getElementById('logoutBtnLi');
  const userInfo = document.getElementById('userInfo');
  const userName = document.getElementById('userName');
  const userStatus = document.getElementById('userStatus');
  const notifWrapper = document.getElementById('notifWrapper');
  const notifBtn = document.getElementById('notifBtn');
  const notifCount = document.getElementById('notifCount');
  const notifDropdown = document.getElementById('notifDropdown');
  const notifList = document.getElementById('notifList');

  // Authentification via Supabase
  let isLogged = false;
  let isPremium = false;
  let user = null;
  let name = "";
  let notifications = [];

  if (window.supabase) {
    const { data: auth } = await supabase.auth.getUser();
    if (auth && auth.user) {
      isLogged = true;
      user = auth.user;
      // Récup info utilisateur dans la table users
      const { data: userData } = await supabase
        .from('users')
        .select('ispremium, name')
        .eq('id', user.id)
        .single();
      if (userData) {
        isPremium = !!userData.ispremium;
        name = userData.name || user.email || "Utilisateur";
      }
    }
  }

  // Notifications (simple)
  async function updateNotifications() {
    if (!isLogged || !user) return;
    notifWrapper.classList.remove('hidden');
    // Récupère la liste depuis la table notifications
    const { data: notifData } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    notifications = notifData || [];
    // Affiche badge nombre non lues
    const unread = notifications.filter(n => !n.read).length;
    notifCount.textContent = unread > 0 ? unread : "";
    // Liste déroulante
    notifList.innerHTML = notifications.length
      ? notifications.map(n => `<li class="p-2 border-b last:border-b-0 ${n.read ? '' : 'font-bold'}">${n.message}</li>`).join('')
      : '<li class="p-2 text-gray-400">Aucune notification</li>';
  }

  // Gestion du menu notifications
  notifBtn?.addEventListener('click', (e) => {
    notifDropdown.classList.toggle('hidden');
    // Marque tous comme lus à l'ouverture
    if (!notifDropdown.classList.contains('hidden') && notifications.length) {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      if (unreadIds.length) {
        supabase.from('notifications').update({ read: true }).in('id', unreadIds);
        notifications.forEach(n => n.read = true);
        notifCount.textContent = "";
        notifList.querySelectorAll('li').forEach(l => l.classList.remove('font-bold'));
      }
    }
  });

  // Gestion click hors du menu pour fermer
  document.addEventListener('mousedown', function(e){
    if (!notifDropdown.classList.contains('hidden') &&
      !notifWrapper.contains(e.target)) {
      notifDropdown.classList.add('hidden');
    }
  });

  // Affichage selon statut utilisateur
  if (isLogged) {
    loginBtnLi.style.display = "none";
    signupBtnLi.style.display = "none";
    logoutBtnLi.style.display = "";
    userInfo.classList.remove('hidden');
    userName.textContent = name;
    userStatus.textContent = isPremium ? "Premium" : "Gratuit";
    premiumBtnLi.style.display = isPremium ? "none" : "";
    await updateNotifications();
  } else {
    loginBtnLi.style.display = "";
    signupBtnLi.style.display = "";
    logoutBtnLi.style.display = "none";
    userInfo.classList.add('hidden');
    notifWrapper.classList.add('hidden');
    premiumBtnLi.style.display = "none";
  }

  // Déconnexion
  document.getElementById('logoutBtn')?.addEventListener('click', async function (e) {
    e.preventDefault();
    if (window.supabase) await supabase.auth.signOut();
    window.location.href = "index.html";
  });
}

document.addEventListener('DOMContentLoaded', loadHeader);
