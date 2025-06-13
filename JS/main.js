// Luxibre Alpha - JS d'accueil et micro-interactions

// Apparition en douceur des sections (animation fade-in)
document.addEventListener('DOMContentLoaded', function () {
  // Animation fade-in
  setTimeout(() => {
    document.querySelectorAll('section').forEach(section => {
      section.classList.add('fade-in');
    });
  }, 100);

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

  // Micro-animation sur le bouton principal (si tu utilises la classe .cta-btn)
  const cta = document.querySelector('.cta-btn');
  if (cta) {
    cta.addEventListener('mouseenter', () => cta.classList.add('cta-animate'));
    cta.addEventListener('mouseleave', () => cta.classList.remove('cta-animate'));
  }

  // Ajout dynamique du bouton feedback s'il n'existe pas déjà
  if (!document.getElementById('avisBtn')) {
    const feedbackBtn = document.createElement('button');
    feedbackBtn.textContent = "💬 Donne ton avis";
    feedbackBtn.className = "fixed right-4 bottom-4 z-50 px-4 py-2 bg-blue-500 text-white font-bold rounded-full shadow-lg hover:bg-blue-600 transition feedback-btn";
    feedbackBtn.id = "avisBtn";
    feedbackBtn.type = "button";
    document.body.appendChild(feedbackBtn);
  }

  // --- Gestion de la modale feedback ---
  const avisBtn = document.getElementById('avisBtn');
  const avisModal = document.getElementById('avisModal');
  const avisOverlay = document.getElementById('avisModalOverlay');
  const avisClose = document.getElementById('avisModalClose');

  function openAvisModal() {
    if (avisModal && avisOverlay) {
      avisModal.classList.remove('hidden');
      avisOverlay.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
      const textarea = document.getElementById('avis-message');
      if (textarea) textarea.focus();
    }
  }
  function closeAvisModal() {
    if (avisModal && avisOverlay) {
      avisModal.classList.add('hidden');
      avisOverlay.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
      const formMsg = document.getElementById('avisFormMsg');
      if (formMsg) formMsg.textContent = '';
    }
  }
  avisBtn && avisBtn.addEventListener('click', e => { e.preventDefault(); openAvisModal(); });
  avisClose && avisClose.addEventListener('click', closeAvisModal);
  avisOverlay && avisOverlay.addEventListener('click', closeAvisModal);
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && avisModal && !avisModal.classList.contains('hidden')) closeAvisModal();
  });

  // Gestion des étoiles pour la note
  const avisStars = document.querySelectorAll('#avis-stars .avis-star');
  const avisNote = document.getElementById('avis-note');
  let currentNote = 5;
  avisStars.forEach(star => {
    star.addEventListener('mouseenter', () => {
      const val = parseInt(star.dataset.star, 10);
      avisStars.forEach((s, i) => s.classList.toggle('text-yellow-300', i < val));
    });
    star.addEventListener('mouseleave', () => {
      avisStars.forEach((s, i) => s.classList.toggle('text-yellow-300', i < currentNote));
    });
    star.addEventListener('click', () => {
      currentNote = parseInt(star.dataset.star, 10);
      if (avisNote) avisNote.value = currentNote;
      avisStars.forEach((s, i) => s.classList.toggle('text-yellow-300', i < currentNote));
    });
  });
  avisStars.forEach((s, i) => s.classList.toggle('text-yellow-300', i < currentNote));

  // Soumission du formulaire d'avis (feedback)
  const avisForm = document.getElementById('avisForm');
  if (avisForm) {
    avisForm.onsubmit = async function(e) {
      e.preventDefault();
      const msg = document.getElementById('avis-message').value.trim();
      const email = document.getElementById('avis-email').value.trim();
      const note = avisNote ? avisNote.value : 5;
      const formMsg = document.getElementById('avisFormMsg');
      if (!msg) {
        if (formMsg) formMsg.textContent = "Merci d'écrire un avis.";
        return;
      }
      if (formMsg) formMsg.textContent = "Envoi...";
      // À remplacer par ton POST AJAX/Supabase/Backend :
      setTimeout(() => {
        if (formMsg) formMsg.textContent = "Merci pour votre retour !";
        setTimeout(closeAvisModal, 1200);
        avisForm.reset();
        avisStars.forEach((s, i) => s.classList.toggle('text-yellow-300', i < 5));
        currentNote = 5;
      }, 900);
    };
  }
});

// Optionnel : Animation fade-in (à ajouter dans ton CSS si tu veux l'effet)
// .fade-in { opacity: 1; transform: none; transition: opacity 0.7s, transform 0.7s; }
// section.fade-in { opacity: 1; transform: none; }
