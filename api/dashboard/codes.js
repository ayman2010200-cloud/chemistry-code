import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';

function randomCode(prefix) {
  const a = Math.random().toString(36).slice(2, 6).toUpperCase();
  const b = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${a}-${b}`;
}

function requireAdminSecret(req, res) {
  const secret = req.headers['x-admin-secret'];
  if (!process.env.ADMIN_API_SECRET || secret !== process.env.ADMIN_API_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

async function listCodes(req, res) {
  const supabase = getSupabaseAdmin();
  const limit = Math.min(Number(req.query?.limit || 100), 500);

  const { data, error } = await supabase
    .from('activation_codes')
    .select('id,code,plan,used,used_at,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ items: data || [] });
}

async function generateCodes(req, res) {
  const supabase = getSupabaseAdmin();
  const body = req.body || {};

  const plan = ['free', 'monthly', 'vip'].includes(body.plan) ? body.plan : 'monthly';
  const count = Math.max(1, Math.min(Number(body.count || 1), 200));
  const prefix = String(body.prefix || plan.toUpperCase()).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 20) || plan.toUpperCase();
  const payment = body.payment || {};

  const rows = [];
  for (let i = 0; i < count; i++) {
    rows.push({
      code: randomCode(prefix),
      plan,
      used: false
    });
  }

  const { data: insertedCodes, error: insertError } = await supabase
    .from('activation_codes')
    .insert(rows)
    .select('code,plan,used,created_at');

  if (insertError) return res.status(500).json({ error: insertError.message });

  const amount = Number(payment.amount || 0);
  await supabase.from('payment_events').insert({
    provider: payment.provider || 'manual',
    reference: payment.reference || `MANUAL-${Date.now()}`,
    user_email: payment.email || null,
    plan,
    amount,
    currency: payment.currency || 'EGP',
    status: 'code_generated',
    raw: {
      payerName: payment.payerName || '',
      notes: payment.notes || '',
      generatedCount: count,
      generatedCodes: (insertedCodes || []).map(x => x.code)
    }
  });

  return res.status(200).json({
    ok: true,
    count,
    plan,
    codes: (insertedCodes || []).map(x => x.code)
  });
}

async function updateCode(req, res) {
  const supabase = getSupabaseAdmin();
  const { id, action } = req.body || {};

  if (!id) return res.status(400).json({ error: 'Missing code id' });

  let payload;
  if (action === 'revoke' || action === 'mark_used') {
    payload = { used: true, used_at: new Date().toISOString() };
  } else if (action === 'restore' || action === 'mark_unused') {
    payload = { used: false, used_at: null };
  } else {
    return res.status(400).json({ error: 'Invalid action. Use revoke or restore.' });
  }

  const { data, error } = await supabase
    .from('activation_codes')
    .update(payload)
    .eq('id', id)
    .select('id,code,plan,used,used_at,created_at')
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Code not found' });

  return res.status(200).json({ ok: true, item: data });
}

async function removeCode(req, res) {
  const supabase = getSupabaseAdmin();
  const id = req.query?.id;

  if (!id) return res.status(400).json({ error: 'Missing code id' });

  const { error } = await supabase
    .from('activation_codes')
    .delete()
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}

export default async function handler(req, res) {
  if (!requireAdminSecret(req, res)) return;

  try {
    if (req.method === 'GET') return await listCodes(req, res);
    if (req.method === 'POST') return await generateCodes(req, res);
    if (req.method === 'PATCH') return await updateCode(req, res);
    if (req.method === 'DELETE') return await removeCode(req, res);

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
