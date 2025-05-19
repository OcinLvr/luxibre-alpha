// ID du produit Stripe (à remplacer par le tien)
const priceId = "price_1234567890";

// Gérer le clic sur le bouton d'abonnement
document.getElementById('checkout-button')?.addEventListener('click', () => {
  fetch("/js/create-checkout-session.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ priceId: priceId })
  })
  .then(function (response) {
    return response.json();
  })
  .then(function (session) {
    return Stripe("pk_test_YOUR_STRIPE_PUBLIC_KEY").redirectToCheckout({
      sessionId: session.id
    });
  })
  .then(function (result) {
    if (result.error) {
      alert(result.error.message);
    }
  })
  .catch(function (error) {
    console.error("Erreur :", error);
    alert("Une erreur est survenue. Réessayez plus tard.");
  });
});
