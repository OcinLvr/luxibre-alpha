document.addEventListener("DOMContentLoaded", () => {
  const protectedPages = ["pricing.html", "dashboard.html"];
  const currentPage = window.location.pathname.split("/").pop();

  const showMessage = () => {
    const message = document.createElement("div");
    message.textContent = "Veuillez vous connecter pour accéder à cette page.";
    message.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: #f87171;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: bold;
      z-index: 9999;
    `;
    document.body.appendChild(message);
    setTimeout(() => message.remove(), 3000);
  };

  netlifyIdentity.on("init", user => {
    if (!user && protectedPages.includes(currentPage)) {
      showMessage();
      setTimeout(() => {
        netlifyIdentity.open("login");
      }, 800);
    }
  });

  netlifyIdentity.on("login", () => {
    netlifyIdentity.close();
    if (protectedPages.includes(currentPage)) {
      window.location.href = "/dashboard.html";
    }
  });

  netlifyIdentity.on("logout", () => {
    if (protectedPages.includes(currentPage)) {
      window.location.href = "/";
    }
  });

  netlifyIdentity.init();
});
