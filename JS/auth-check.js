document.addEventListener("DOMContentLoaded", async () => {
  const protectedPages = ["pricing.html", "dashboard.html"];
  const currentPage = window.location.pathname.split("/").pop();

  const supabase = supabase.createClient(
    'https://jrgdwozxcilasllpvikh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZ2R3b3p4Y2lsYXNsbHB2aWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4MjQ0NTEsImV4cCI6MjA2MzQwMDQ1MX0.S2oGP2rdtq1IkW-oH5mC8omm698PdCgQJtGVLlIFj3w'
  );

  const { data: { session } } = await supabase.auth.getSession();

  if (!session && protectedPages.includes(currentPage)) {
    alert("Veuillez vous connecter pour accéder à cette page.");
    window.location.href = "login.html";
  }
});
