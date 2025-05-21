const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      webhookSecret
    );
  } catch (err) {
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const customerEmail = session.customer_details.email;

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', customerEmail)
      .single();

    if (!existingUser) {
      await supabase.from('users').insert([
        {
          email: customerEmail,
          role: 'premium',
          stripe_customer_id: session.customer,
        },
      ]);
    } else {
      await supabase
        .from('users')
        .update({
          role: 'premium',
          stripe_customer_id: session.customer,
        })
        .eq('email', customerEmail);
    }
  }

  return { statusCode: 200, body: 'User synced' };
};
