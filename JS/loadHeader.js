import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://jrgdwozxcilasllpvikh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZ2R3b3p4Y2lsYXNsbHB2aWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4MjQ0NTEsImV4cCI6MjA2MzQwMDQ1MX0.S2oGP2rdtq1IkW-oH5mC8omm698PdCgQJtGVLlIFj3w'
);

async function getUserInfo() {
  const { data: auth } = await supabase.auth.getUser();
  if (auth && auth.user) {
    const user = auth.user;
    const { data: userData } = await supabase
      .from('users')
      .select('ispremium, email')
      .eq('id', user.id)
      .single();
    return {
      isLogged: true,
      isPremium: !!(userData && userData.ispremium),
      email: userData?.email || user.email || "Utilisateur",
      user,
    };
  } else {
    return {
      isLogged: false,
      isPremium: false,
      email: "",
      user: null,
    };
  }
}

// Récupère les actifs suivis pour l'utilisateur
async function getUserActifs(userId) {
  // Adapter ici selon ta structure de base (exemple table "follows" ou "actifs_suivis")
  // Suppose table "actifs_suivis" avec colonnes "user_id" et "nom_actif"
  const { data, error } = await supabase
    .from('actifs_suivis')
    .select('nom_actif')
    .eq('user_id', userId);
  if (error) {
    return [];
  }
  return (data || []).map(a => a.nom_actif);
}

async function loadHeader() {
  const headerContainer = document.getElementById('header');
  if (!headerContainer) return;
  const res = await fetch('header.html');
  headerContainer.innerHTML = await res.text();

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
  const userIconBtn = document.getElementById('userIconBtn');
  // Modale utilisateur
  const userModal = document.getElementById('userModal');
  const closeUserModal = document.getElementById('closeUserModal');
  const modalUserEmail = document.getElementById('modalUserEmail');
  const modalUserStatus = document.getElementById('modalUserStatus');
  const modalUserActifs = document.getElementById('modalUserActifs');
  const modalUserActifsEmpty = document.getElementById('modalUserActifsEmpty');
  const userModalLogoutBtn = document.getElementById('userModalLogoutBtn');

  window.isPremiumPromise = (async () => {
    const userInfoObj = await getUserInfo();
    let { isLogged, isPremium, email, user } = userInfoObj;
    let notifications = [];

    async function updateNotifications() {
      if (!isLogged || !user) return;
      notifWrapper.classList.remove('hidden');
      const { data: notifData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      notifications = notifData || [];
      const unread = notifications.filter(n => !n.read).length;
      notifCount.textContent = unread > 0 ? unread : "";
      notifList.innerHTML = notifications.length
        ? notifications.map(n => `<li class="p-2 border-b last:border-b-0 ${n.read ? '' : 'font-bold'}">${n.message}</li>`).join('')
        : '<li class="p-2 text-gray-400">Aucune notification</li>';
    }

    notifBtn?.addEventListener('click', (e) => {
      notifDropdown.classList.toggle('hidden');
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

    document.addEventListener('mousedown', function(e){
      if (!notifDropdown.classList.contains('hidden') &&
        !notifWrapper.contains(e.target)) {
        notifDropdown.classList.add('hidden');
      }
    });

    // Affichage header selon statut utilisateur
    if (isLogged) {
      loginBtnLi.style.display = "none";
      signupBtnLi.style.display = "none";
      logoutBtnLi.style.display = "";
      logoutBtnLi.classList.remove('hidden');
      premiumBtnLi.style.display = isPremium ? "none" : "";
      notifWrapper.classList.remove('hidden');
      // Affiche icône utilisateur
      if (userIconWrapper) userIconWrapper.classList.remove('hidden');
      // -- GESTION MODALE UTILISATEUR --
      userIconBtn?.addEventListener('click', async () => {
        // Remplit la modale dynamiquement
        modalUserEmail.textContent = email;
        modalUserStatus.textContent = isPremium ? "Premium" : "Gratuit";
        // Récupère les actifs suivis
        if (modalUserActifs) {
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
        }
        userModal.classList.remove('hidden');
      });
      // Ferme la modale utilisateur
      closeUserModal?.addEventListener('click', () => userModal.classList.add('hidden'));
      window.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !userModal.classList.contains('hidden')) userModal.classList.add('hidden');
      });
      userModal.addEventListener('mousedown', function(e){
        if (e.target === userModal) userModal.classList.add('hidden');
      });
      // Déconnexion depuis modale user
      userModalLogoutBtn?.addEventListener('click', async function () {
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
      // Cache icône utilisateur si déco
      if (userIconWrapper) userIconWrapper.classList.add('hidden');
    }
    // Version mobile info utilisateur (facultatif)
    const mobileUserName = document.getElementById('mobileUserName');
    const mobileUserStatus = document.getElementById('mobileUserStatus');
    if (isLogged) {
      if (mobileUserName) mobileUserName.textContent = email;
      if (mobileUserStatus) mobileUserStatus.textContent = isPremium ? "Premium" : "Gratuit";
    } else {
      if (mobileUserName) mobileUserName.textContent = "";
      if (mobileUserStatus) mobileUserStatus.textContent = "";
    }
    return isPremium;
  })();

  document.getElementById('logoutBtn')?.addEventListener('click', async function (e) {
    e.preventDefault();
    await supabase.auth.signOut();
    window.location.href = "index.html";
  });

  // --- Mobile burger menu ---
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
  headerNav?.querySelectorAll('a').forEach(link =>
    link.addEventListener('click', closeMenu)
  );
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

  // --- MODALE AUTH ---
  function setupAuthModal() {
    const authModal = document.getElementById('authModal');
    const closeAuthModal = document.getElementById('closeAuthModal');
    const authForm = document.getElementById('authForm');
    const authTitle = document.getElementById('authTitle');
    const switchAuthMode = document.getElementById('switchAuthMode');
    const authError = document.getElementById('authError');
    const authExtra = document.getElementById('authExtra');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const authSubmitText = document.getElementById('authSubmitText');
    const authLoader = document.getElementById('authLoader');
    const authEmail = document.getElementById('authEmail');
    const authPassword = document.getElementById('authPassword');
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');
    const togglePwd = document.getElementById('togglePwd');
    const googleAuthBtn = document.getElementById('googleAuthBtn');
    const forgotPwdLink = document.getElementById('forgotPwdLink');
    let mode = 'login';

    function showAuthModal(type = 'login') {
      mode = type;
      authModal.classList.remove('hidden');
      authTitle.textContent = type === 'login' ? 'Connexion' : "Inscription";
      authSubmitText.textContent = type === 'login' ? "Se connecter" : "S'inscrire";
      switchAuthMode.textContent = type === 'login'
        ? "Pas encore de compte ? Inscription"
        : "Déjà un compte ? Connexion";
      authError.textContent = '';
      authExtra.innerHTML = '';
      emailError.textContent = '';
      passwordError.textContent = '';
      authEmail.value = '';
      authPassword.value = '';
      authEmail.focus();
    }
    function closeModal() {
      authModal.classList.add('hidden');
    }
    document.getElementById('openLoginModal')?.addEventListener('click', (e) => {
      e.preventDefault(); showAuthModal('login');
    });
    document.getElementById('openSignupModal')?.addEventListener('click', (e) => {
      e.preventDefault(); showAuthModal('signup');
    });
    closeAuthModal?.addEventListener('click', closeModal);
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !authModal.classList.contains('hidden')) closeModal();
    });
    authModal.addEventListener('mousedown', function(e){
      if (e.target === authModal) closeModal();
    });
    switchAuthMode.addEventListener('click', () => showAuthModal(mode === 'login' ? 'signup' : 'login'));

    // Affichage/masquage mot de passe
    togglePwd.addEventListener('click', () => {
      if (authPassword.type === "password") {
        authPassword.type = "text";
        togglePwd.innerHTML = '<i class="fa fa-eye-slash"></i>';
      } else {
        authPassword.type = "password";
        togglePwd.innerHTML = '<i class="fa fa-eye"></i>';
      }
      authPassword.focus();
    });

    // Validation live
    authEmail.addEventListener('input', () => {
      emailError.textContent = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authEmail.value) ? '' : "Email invalide";
    });
    authPassword.addEventListener('input', () => {
      passwordError.textContent = authPassword.value.length >= 8 ? '' : "8 caractères minimum";
    });

    // Mot de passe oublié
    forgotPwdLink.addEventListener('click', async (e) => {
      e.preventDefault();
      emailError.textContent = '';
      authError.textContent = '';
      const email = authEmail.value.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        emailError.textContent = "Entrez un email valide";
        authEmail.focus();
        return;
      }
      authExtra.innerHTML = '';
      authLoader.classList.remove('hidden');
      authSubmitBtn.disabled = true;
      forgotPwdLink.textContent = 'Envoi...';
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      authLoader.classList.add('hidden');
      authSubmitBtn.disabled = false;
      forgotPwdLink.textContent = 'Mot de passe oublié ?';
      if (error) {
        authError.textContent = error.message || "Erreur lors de la demande de réinitialisation.";
      } else {
        authExtra.innerHTML = "Un email de réinitialisation a été envoyé.";
      }
    });

    // Google OAuth
    googleAuthBtn.addEventListener('click', async () => {
      authError.textContent = '';
      authLoader.classList.remove('hidden');
      authSubmitBtn.disabled = true;
      try {
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
        if (error) authError.textContent = error.message || "Erreur Google";
      } finally {
        authLoader.classList.add('hidden');
        authSubmitBtn.disabled = false;
      }
    });

    // Soumission du formulaire
    authForm.onsubmit = async function(e) {
      e.preventDefault();
      emailError.textContent = '';
      passwordError.textContent = '';
      authError.textContent = '';
      authExtra.innerHTML = '';
      const email = authEmail.value.trim();
      const password = authPassword.value.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        emailError.textContent = "Entrez un email valide";
        authEmail.focus();
        return;
      }
      if (password.length < 8) {
        passwordError.textContent = "8 caractères minimum";
        authPassword.focus();
        return;
      }
      authLoader.classList.remove('hidden');
      authSubmitBtn.disabled = true;
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        authLoader.classList.add('hidden');
        authSubmitBtn.disabled = false;
        if (error) {
          authError.textContent = error.message || "Erreur lors de la connexion";
        } else {
          location.reload();
        }
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        authLoader.classList.add('hidden');
        authSubmitBtn.disabled = false;
        if (error) {
          authError.textContent = error.message || "Erreur lors de l'inscription";
        } else {
          authExtra.innerHTML = "Un email de confirmation a été envoyé.";
        }
      }
    };
  }
  setupAuthModal();
}

document.addEventListener('DOMContentLoaded', loadHeader);
