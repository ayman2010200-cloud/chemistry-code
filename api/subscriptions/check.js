import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';

const MAX_DEVICES = 2;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, ip } = req.body || {};
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedIp = String(ip || '').trim();

    if (!normalizedEmail || !normalizedIp) {
      return res.status(400).json({ error: 'Missing email or ip' });
    }

    const supabase = getSupabaseAdmin();

    // Find the user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, plan')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (profileError) return res.status(500).json({ error: profileError.message });
    if (!profile) return res.status(404).json({ error: 'No account found for this email' });
    if (profile.plan === 'free') {
      return res.status(403).json({ error: 'No active subscription for this email' });
    }

    // Find the most recent active subscription
    const { data: sub, error: subError } = await supabase
      .from('subscriptions')
      .select('id, plan, allowed_ips')
      .eq('user_id', profile.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) return res.status(500).json({ error: subError.message });
    if (!sub) return res.status(403).json({ error: 'No active subscription found' });

    const allowedIps = sub.allowed_ips || [];

    // IP already registered — allow immediately
    if (allowedIps.includes(normalizedIp)) {
      return res.status(200).json({ ok: true, plan: sub.plan, device: allowedIps.indexOf(normalizedIp) + 1 });
    }

    // New IP: check device limit
    if (allowedIps.length >= MAX_DEVICES) {
      return res.status(403).json({
        error: `Maximum ${MAX_DEVICES} devices reached. Contact support to reset.`
      });
    }

    // Register the new IP
    const updatedIps = [...allowedIps, normalizedIp];
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({ allowed_ips: updatedIps })
      .eq('id', sub.id);

    if (updateError) return res.status(500).json({ error: updateError.message });

    return res.status(200).json({ ok: true, plan: sub.plan, device: updatedIps.length });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
