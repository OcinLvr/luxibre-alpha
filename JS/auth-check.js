if (typeof netlifyIdentity === 'undefined') {
  const script = document.createElement('script');
  script.src = 'https://identity.netlify.com/v1/netlify-identity-widget.js';
  script.onload = () => netlifyIdentityInit();
  document.head.appendChild(script);
} else {
  netlifyIdentityInit();
}

function netlifyIdentityInit() {
  netlifyIdentity.on('init', user => {
    if (!user && window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
      alert("Vous devez être connecté pour accéder à cette page.");
      netlifyIdentity.open('login');
    }
  });
  netlifyIdentity.init();
}
