// Vercel Serverless Function: /api/payments/paypal/config
// Returns safe public PayPal config to the browser.

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const currency = process.env.PAYPAL_CURRENCY || 'USD';

  if (!clientId) {
    return res.status(500).json({ error: 'Missing PAYPAL_CLIENT_ID environment variable' });
  }

  return res.status(200).json({
    clientId,
    currency,
    intent: 'capture'
  });
}
