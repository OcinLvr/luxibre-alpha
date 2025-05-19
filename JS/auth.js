// Initialisation Firebase (à remplacer par tes propres clés)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  appId: "your-app-id"
};

// Initialiser Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Connexion utilisateur
document.getElementById('login-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      window.location.href = 'dashboard.html';
    })
    .catch((error) => {
      document.getElementById('error-message').textContent = error.message;
      document.getElementById('error-message').classList.remove('hidden');
    });
});

// Inscription utilisateur
document.getElementById('register-btn')?.addEventListener('click', () => {
  const email = document.getElementById('new-email').value;
  const password = document.getElementById('new-password').value;

  auth.createUserWithEmailAndPassword(email, password)
    .then(() => {
      window.location.href = 'dashboard.html';
    })
    .catch((error) => {
      document.getElementById('error-message').textContent = error.message;
      document.getElementById('error-message').classList.remove('hidden');
    });
});

// Déconnexion
document.getElementById('logout-btn')?.addEventListener('click', () => {
  auth.signOut().then(() => {
    window.location.href = 'login.html';
  });
});

// Vérifier si l'utilisateur est connecté
auth.onAuthStateChanged(user => {
  if (user) {
    document.getElementById('user-email') ? document.getElementById('user-email').textContent = user.email : null;
  } else {
    if (window.location.pathname.includes('dashboard')) {
      window.location.href = 'login.html';
    }
  }
});
