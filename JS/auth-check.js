if (window.location.pathname !== "/index.html") {
  netlifyIdentity.on("init", (user) => {
    if (!user) {
      window.location.href = "/index.html";
    }
  });

  netlifyIdentity.init();
}
