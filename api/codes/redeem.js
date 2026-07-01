import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, email, ip } = req.body || {};
    const normalizedCode = String(code || '').trim().toUpperCase();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedIp = String(ip || '').trim();

    if (!normalizedCode) {
      return res.status(400).json({ error: 'Missing activation code' });
    }

    const supabase = getSupabaseAdmin();

    const { data: codeRow, error: findError } = await supabase
      .from('activation_codes')
      .select('id,code,plan,used')
      .eq('code', normalizedCode)
      .maybeSingle();

    if (findError) return res.status(500).json({ error: findError.message });
    if (!codeRow) return res.status(404).json({ error: 'Invalid activation code' });
    if (codeRow.used) {
      return res.status(409).json({ error: 'This activation code is already used' });
    }

    // Mark code as used (atomic: only if still unused)
    const { error: updateError } = await supabase
      .from('activation_codes')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('id', codeRow.id)
      .eq('used', false);

    if (updateError) return res.status(500).json({ error: updateError.message });

    // If email provided, upgrade the user's plan in Supabase
    let profileActivated = false;
    if (normalizedEmail) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (profile) {
        await supabase
          .from('profiles')
          .update({ plan: codeRow.plan, updated_at: new Date().toISOString() })
          .eq('id', profile.id);

        await supabase.from('subscriptions').insert({
          user_id: profile.id,
          plan: codeRow.plan,
          provider: 'code',
          provider_reference: normalizedCode,
          status: 'active',
          amount: 0,
          currency: 'EGP',
          allowed_ips: normalizedIp ? [normalizedIp] : []
        });

        await supabase.from('payment_events').insert({
          provider: 'code',
          reference: normalizedCode,
          user_email: normalizedEmail,
          plan: codeRow.plan,
          amount: 0,
          currency: 'EGP',
          status: 'active',
          raw: { source: 'code-redeem' }
        });

        profileActivated = true;
      } else {
        console.warn(`redeem.js: profile not found for email ${normalizedEmail}, code marked used but plan not updated`);
      }
    }

    return res.status(200).json({
      ok: true,
      plan: codeRow.plan,
      code: codeRow.code,
      profileActivated,
      message: 'Code redeemed successfully'
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
