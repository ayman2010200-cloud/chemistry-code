import { activateTapChargeIfPaid, isTapPaymentPaid, resolveTapReference } from './_tap-payment-utils.js';

function readFirstCharge(payload) {
  if (Array.isArray(payload)) return payload[0] || null;
  if (Array.isArray(payload?.charges)) return payload.charges[0] || null;
  if (Array.isArray(payload?.data)) return payload.data[0] || null;
  return null;
}

async function fetchTapJson(pathname, secretKey) {
  const response = await fetch(`https://api.tap.company${pathname}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${secretKey}`
    }
  });
  const data = await response.json();
  return { response, data };
}

async function fetchChargeByReference(reference, secretKey) {
  const direct = await fetchTapJson(`/v2/charges/${encodeURIComponent(reference)}`, secretKey);
  if (direct.response.ok) return direct.data;

  const queryByOrder = await fetchTapJson(`/v2/charges?reference.order=${encodeURIComponent(reference)}&limit=1`, secretKey);
  if (queryByOrder.response.ok) {
    const charge = readFirstCharge(queryByOrder.data);
    if (charge) return charge;
  }

  const queryByTransaction = await fetchTapJson(`/v2/charges?reference.transaction=${encodeURIComponent(reference)}&limit=1`, secretKey);
  if (queryByTransaction.response.ok) {
    const charge = readFirstCharge(queryByTransaction.data);
    if (charge) return charge;
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const secretKey = process.env.TAP_SECRET_KEY;
    if (!secretKey) {
      return res.status(500).json({ error: 'Missing TAP_SECRET_KEY environment variable' });
    }

    const reference = String(req.body?.reference || '').trim();
    if (!reference) {
      return res.status(400).json({ error: 'Missing Tap payment reference' });
    }

    const charge = await fetchChargeByReference(reference, secretKey);
    if (!charge) {
      return res.status(404).json({ error: 'Tap payment not found for this reference' });
    }

    const activation = await activateTapChargeIfPaid(charge, {
      source: 'manual-check',
      referenceInput: reference
    });

    return res.status(200).json({
      paid: isTapPaymentPaid(charge.status),
      status: charge.status,
      chargeId: charge.id,
      reference: resolveTapReference(charge, reference),
      activated: activation.activated,
      alreadyProcessed: activation.alreadyProcessed
    });
  } catch (error) {
    console.error('Tap check-payment error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
