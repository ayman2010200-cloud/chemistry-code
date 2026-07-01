import { activateTapChargeIfPaid } from './_tap-payment-utils.js';

// Vercel Serverless Function: /api/payments/tap/webhook
// Tap will call this endpoint after payment status changes.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const event = req.body || {};
    const secretKey = process.env.TAP_SECRET_KEY;
    if (!secretKey) {
      return res.status(500).json({ error: 'Missing TAP_SECRET_KEY environment variable' });
    }

    const chargeId = event.id || event.charge_id || event?.object?.id;
    if (!chargeId) {
      return res.status(400).json({ error: 'Missing Tap charge id in webhook payload' });
    }

    const verifyResponse = await fetch(`https://api.tap.company/v2/charges/${encodeURIComponent(chargeId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`
      }
    });
    const charge = await verifyResponse.json();

    if (!verifyResponse.ok) {
      return res.status(verifyResponse.status).json({
        error: 'Tap charge verification failed',
        details: charge
      });
    }

    const activation = await activateTapChargeIfPaid(charge, event);
    console.log('Tap webhook processed:', {
      chargeId: charge.id,
      status: charge.status,
      paid: activation.paid,
      activated: activation.activated,
      alreadyProcessed: activation.alreadyProcessed
    });

    return res.status(200).json({
      received: true,
      chargeId: charge.id,
      status: charge.status,
      paid: activation.paid,
      activated: activation.activated,
      alreadyProcessed: activation.alreadyProcessed
    });
  } catch (error) {
    console.error('Tap webhook error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
