// Luxibre Alpha - JS d'accueil et micro-interactions

// Animation d'apparition en douceur des sections
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('section').forEach(section => {
    section.classList.add('fade-in');
  });
});

// Effet smooth scroll sur les liens internes
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({behavior: 'smooth'});
    }
  });
});

// Pop-up feedback utilisateur (exemple)
const feedbackBtn = document.createElement('button');
feedbackBtn.textContent = "💬 Donne ton avis";
feedbackBtn.className = "feedback-btn";
feedbackBtn.onclick = () => {
  alert("Merci pour votre retour ! (Formulaire à venir)");
};
document.body.appendChild(feedbackBtn);

// Apparition d'un bandeau statut données (fictif, à adapter avec ton backend plus tard)
function showStatusBanner(statusText, color = "#10b981") {
  const banner = document.createElement('div');
  banner.textContent = statusText;
  banner.className = "status-banner";
  banner.style.background = color;
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 7000);
}
showStatusBanner("✅ Données actualisées à 12:30");

// Micro-animation sur le bouton principal
const cta = document.querySelector('.cta-btn');
if (cta) {
  cta.addEventListener('mouseenter', () => cta.classList.add('cta-animate'));
  cta.addEventListener('mouseleave', () => cta.classList.remove('cta-animate'));
}
