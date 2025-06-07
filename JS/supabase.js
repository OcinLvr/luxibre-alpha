// Initialiser Supabase
const supabaseUrl = 'https://jrgdwozxcilasllpvikh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // (tronqué pour publication)
const supabase = window.supabase = window.Supabase.createClient(supabaseUrl, supabaseKey);

// Vérifie si l'utilisateur est premium
async function isPremiumUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('users')
    .select('ispremium')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    console.warn("Impossible de vérifier le statut premium.");
    return false;
  }

  return data.ispremium;
}

// Vérifie si un signal est suivi
async function isFollowed(signal) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('followed_signals')
    .select('*')
    .eq('user_id', user.id)
    .eq('signal_name', signal.name)
    .maybeSingle();

  return !!data;
}

// Suivre ou retirer un signal
async function toggleFollow(signal) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    alert("Connectez-vous pour gérer vos suivis.");
    return;
  }

  const premium = await isPremiumUser();

  if (!premium) {
    const { data: followed, error } = await supabase
      .from('followed_signals')
      .select('*')
      .eq('user_id', user.id);

    if (followed?.length >= 1) {
      alert("Offre gratuite : 1 signal suivi maximum. Passez Premium pour plus.");
      return;
    }
  }

  const { data: exist } = await supabase
    .from('followed_signals')
    .select('*')
    .eq('user_id', user.id)
    .eq('signal_name', signal.name)
    .maybeSingle();

  if (exist) {
    await supabase
      .from('followed_signals')
      .delete()
      .eq('id', exist.id);
  } else {
    await supabase
      .from('followed_signals')
      .insert([{ user_id: user.id, signal_name: signal.name }]);
  }
}

// Exposer globalement
window.isPremiumUser = isPremiumUser;
window.isFollowed = isFollowed;
window.toggleFollow = toggleFollow;
