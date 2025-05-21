const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const email = event.queryStringParameters.email;

  if (!email) {
    return { statusCode: 400, body: 'Email is required' };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  );

  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('email', email)
    .single();

  if (error || !data) {
    return {
      statusCode: 200,
      body: JSON.stringify({ role: 'free' }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ role: data.role }),
  };
};
