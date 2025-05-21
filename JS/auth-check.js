if (window.netlifyIdentity) {
  netlifyIdentity.on("init", (user) => {
    if (!user) {
      window.location.href = "/login.html";
    }
  });
}
