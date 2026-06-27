import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';

function requireAdminSecret(req, res) {
  const secret = req.headers['x-admin-secret'];
  if (!process.env.ADMIN_API_SECRET || secret !== process.env.ADMIN_API_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (!requireAdminSecret(req, res)) return;
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getSupabaseAdmin();
    const limit = Math.min(Number(req.query?.limit || 100), 500);

    const { data, error } = await supabase
      .from('payment_events')
      .select('id,provider,reference,user_email,plan,amount,currency,status,created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ items: data || [] });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
