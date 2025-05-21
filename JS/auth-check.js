document.addEventListener("DOMContentLoaded", function () {
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  netlifyIdentity.on("init", user => {
    if (user) {
      loginBtn.classList.add("hidden");
      logoutBtn.classList.remove("hidden");
    } else {
      loginBtn.classList.remove("hidden");
      logoutBtn.classList.add("hidden");
    }
  });

  netlifyIdentity.init();

  loginBtn.addEventListener("click", () => {
    netlifyIdentity.open("login");
  });

  logoutBtn.addEventListener("click", () => {
    netlifyIdentity.logout();
  });

  netlifyIdentity.on("login", () => {
    window.location.href = "dashboard.html";
  });
});
