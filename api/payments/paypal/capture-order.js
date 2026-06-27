// Vercel Serverless Function: /api/payments/paypal/capture-order
// Captures an approved PayPal Checkout order.

import { activateSubscription } from '../../subscriptions/activate.js';

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderID, plan, customer = {} } = req.body || {};
    if (!orderID) {
      return res.status(400).json({ error: 'Missing PayPal orderID' });
    }

    const accessToken = await getAccessToken();
    const response = await fetch(`${getBaseUrl()}/v2/checkout/orders/${encodeURIComponent(orderID)}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: 'PayPal capture failed', details: data });
    }

    const capture = data?.purchase_units?.[0]?.payments?.captures?.[0];
    const paid = data.status === 'COMPLETED' || capture?.status === 'COMPLETED';

    console.log('PayPal captured:', {
      orderID,
      captureId: capture?.id,
      paid,
      plan,
      email: customer.email
    });

    if (paid && customer.email && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      await activateSubscription({
        email: customer.email,
        plan,
        provider: 'paypal',
        reference: capture?.id || orderID,
        amount: Number(capture?.amount?.value || 0),
        currency: capture?.amount?.currency_code || process.env.PAYPAL_CURRENCY || 'USD',
        raw: data
      });
    }

    return res.status(200).json({
      paid,
      status: data.status,
      captureId: capture?.id,
      orderID,
      plan,
      raw: data
    });
  } catch (error) {
    console.error('PayPal capture-order error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
