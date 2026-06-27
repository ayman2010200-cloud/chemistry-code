import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code } = req.body || {};
    const normalizedCode = String(code || '').trim().toUpperCase();

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

    const { error: updateError } = await supabase
      .from('activation_codes')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('id', codeRow.id)
      .eq('used', false);

    if (updateError) return res.status(500).json({ error: updateError.message });

    return res.status(200).json({
      ok: true,
      plan: codeRow.plan,
      code: codeRow.code,
      message: 'Code redeemed successfully'
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
