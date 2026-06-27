// Vercel Serverless Function: /api/payments/paypal/create-order
// Creates a PayPal Checkout order.

const PAYPAL_API = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com'
};

function getBaseUrl() {
  const mode = (process.env.PAYPAL_MODE || 'sandbox').toLowerCase();
  return mode === 'live' ? PAYPAL_API.live : PAYPAL_API.sandbox;
}

async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !secret) {
    throw new Error('Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET environment variable');
  }

  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');
  const response = await fetch(`${getBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Could not get PayPal access token');
  }
  return data.access_token;
}

function convertAmount(amount, currency) {
  // PayPal Egypt accounts often receive USD/EUR more reliably than EGP.
  // If your PayPal account supports EGP, set PAYPAL_CURRENCY=EGP and PAYPAL_EGP_TO_USD_RATE is ignored.
  const numeric = Number(amount || 0);
  if (currency === 'USD' && (process.env.PAYPAL_CONVERT_EGP_TO_USD || 'true') === 'true') {
    const rate = Number(process.env.PAYPAL_EGP_TO_USD_RATE || 50);
    return Math.max(1, numeric / rate).toFixed(2);
  }
  return numeric.toFixed(2);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { plan, amount, customer = {}, reference } = req.body || {};
    const currency = process.env.PAYPAL_CURRENCY || 'USD';

    if (!plan || !amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid plan or amount' });
    }

    const accessToken = await getAccessToken();
    const safeReference = reference || `CHEM-PAYPAL-${plan}-${Date.now()}`;
    const value = convertAmount(amount, currency);

    const payload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: safeReference,
          description: `Chemistry 2026 subscription - ${plan}`,
          custom_id: JSON.stringify({ plan, email: customer.email || '', reference: safeReference }).slice(0, 127),
          amount: {
            currency_code: currency,
            value
          }
        }
      ],
      application_context: {
        brand_name: 'Prof. Ayman Mansour',
        landing_page: 'LOGIN',
        user_action: 'PAY_NOW',
        shipping_preference: 'NO_SHIPPING'
      }
    };

    const response = await fetch(`${getBaseUrl()}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': safeReference
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: 'PayPal create order failed', details: data });
    }

    return res.status(200).json({
      id: data.id,
      reference: safeReference,
      currency,
      value,
      raw: data
    });
  } catch (error) {
    console.error('PayPal create-order error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
