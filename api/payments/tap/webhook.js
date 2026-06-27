import { activateSubscription } from '../../subscriptions/activate.js';

// Vercel Serverless Function: /api/payments/tap/webhook
// Tap will call this endpoint after payment status changes.
// TODO: Verify the event with Tap, then activate the user's plan in your database.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const event = req.body || {};

    // Tap charge id may be event.id depending on webhook configuration.
    const chargeId = event.id || event.charge_id || event?.object?.id;
    const status = event.status || event?.object?.status;
    const metadata = event.metadata || event?.object?.metadata || {};

    console.log('Tap webhook received:', { chargeId, status, metadata });

    if ((status === 'CAPTURED' || status === 'PAID') && metadata.customerEmail && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      await activateSubscription({
        email: metadata.customerEmail,
        plan: metadata.plan || 'monthly',
        provider: 'tap',
        reference: chargeId || metadata.reference,
        amount: Number(event.amount || event?.object?.amount || 0),
        currency: event.currency || event?.object?.currency || 'EGP',
        raw: event
      });
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Tap webhook error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
