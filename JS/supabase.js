// Initialiser Supabase (en global pour toute l'app)
const supabaseUrl = 'https://jrgdwozxcilasllpvikh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZ2R3b3p4Y2lsYXNsbHB2aWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4MjQ0NTEsImV4cCI6MjA2MzQwMDQ1MX0.S2oGP2rdtq1I6lKdX3hRk8nL6o7r2TtK1J3r4cMWgk8I';

window.supabase = window.Supabase.createClient(supabaseUrl, supabaseKey);

async function getUserInfo() {
  const { data: { user }, error: userError } = await window.supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await window.supabase
    .from('users')
    .select('ispremium, name')
    .eq('id', user.id)
    .single();
  if (error || !data) {
    console.warn("Impossible de récupérer les infos utilisateur.", error);
    return null;
  }
  return {
    isPremium: !!data.ispremium,
    name: data.name || user.email || "Utilisateur",
    id: user.id
  };
}
window.getUserInfo = getUserInfo;
