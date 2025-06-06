// Initialiser Supabase
const supabaseUrl = 'https://jrgdwozxcilasllpvikh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZ2R3b3p4Y2lsYXNsbHB2aWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4MjQ0NTEsImV4cCI6MjA2MzQwMDQ1MX0.S2oGP2rdtq1IkW-oH5mC8omm698PdCgQJtGVLlIFj3w';
const supabase = window.supabase = window.Supabase.createClient(supabaseUrl, supabaseKey);

// Fonction pour vérifier si l'utilisateur est premium
async function isPremiumUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('users')
    .select('ispremium')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error fetching user premium status:', error);
    return false;
  }

  return data.ispremium;
}

// Fonction pour vérifier si un signal est suivi
async function isFollowed(signal) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('followed_signals')
    .select('*')
    .eq('user_id', user.id)
    .eq('signal_name', signal.name)
    .single();

  if (error && error.message !== "JSON object requested, multiple (or no) rows returned") {
    console.error("Erreur lors de la vérification du signal suivi:", error);
    return false;
  }

  return !!data;
}

// Fonction pour basculer l'état de suivi d'un signal
async function toggleFollow(signal) {
  const isPremium = await isPremiumUser();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    alert("Vous devez être connecté pour suivre un signal.");
    return;
  }

  if (!isPremium) {
    const { data: followedSignals, error } = await supabase
      .from('followed_signals')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error("Erreur lors de la récupération des signaux suivis:", error);
      return;
    }

    if (followedSignals.length >= 1) {
      alert("Les utilisateurs gratuits ne peuvent suivre qu'un seul article. Passez premium pour en suivre plus.");
      return;
    }
  }

  const { data: existingFollow, error: fetchError } = await supabase
    .from('followed_signals')
    .select('*')
    .eq('user_id', user.id)
    .eq('signal_name', signal.name)
    .single();

  if (fetchError && fetchError.message !== "JSON object requested, multiple (or no) rows returned") {
    console.error("Erreur lors de la vérification du signal suivi:", fetchError);
    return;
  }

  if (existingFollow) {
    const { error: deleteError } = await supabase
      .from('followed_signals')
      .delete()
      .eq('id', existingFollow.id);

    if (deleteError) {
      console.error("Erreur lors de la suppression du signal suivi:", deleteError);
    } else {
      alert("Signal retiré de vos suivis.");
    }
  } else {
    const { error: insertError } = await supabase
      .from('followed_signals')
      .insert([{ user_id: user.id, signal_name: signal.name }]);

    if (insertError) {
      console.error("Erreur lors de l'ajout du signal suivi:", insertError);
    } else {
      alert("Signal ajouté à vos suivis.");
    }
  }
}

// Exposer les fonctions pour qu'elles soient accessibles globalement
window.isPremiumUser = isPremiumUser;
window.isFollowed = isFollowed;
window.toggleFollow = toggleFollow;
