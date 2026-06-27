// Secure server-side subscription activation helper.
// Call from payment webhooks/capture endpoints after verifying payment.

import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';

export async function activateSubscription({ email, plan, provider, reference, amount, currency = 'EGP', raw = {} }) {
  const supabase = getSupabaseAdmin();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (profileError || !profile) {
    throw new Error(`Profile not found for ${email}`);
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ plan, updated_at: new Date().toISOString() })
    .eq('id', profile.id);

  if (updateError) throw updateError;

  const { error: subError } = await supabase.from('subscriptions').insert({
    user_id: profile.id,
    plan,
    provider,
    provider_reference: reference,
    status: 'active',
    amount,
    currency
  });

  if (subError) throw subError;

  await supabase.from('payment_events').insert({
    provider,
    reference,
    user_email: email,
    plan,
    amount,
    currency,
    status: 'active',
    raw
  });

  return { ok: true, profileId: profile.id };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const secret = req.headers['x-admin-secret'];
    if (!process.env.ADMIN_API_SECRET || secret !== process.env.ADMIN_API_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const result = await activateSubscription(req.body || {});
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
