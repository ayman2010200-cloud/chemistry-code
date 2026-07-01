import { getSupabaseAdmin } from '../../_lib/supabaseAdmin.js';
import { activateSubscription } from '../../subscriptions/activate.js';

const TAP_PAID_STATUSES = new Set(['CAPTURED', 'PAID']);

export function isTapPaymentPaid(status) {
  return TAP_PAID_STATUSES.has(String(status || '').toUpperCase());
}

export function resolveTapReference(charge, fallbackReference = '') {
  const metadataReference = charge?.metadata?.reference;
  const transactionReference = charge?.reference?.transaction;
  const orderReference = charge?.reference?.order;
  return metadataReference || transactionReference || orderReference || fallbackReference || charge?.id || '';
}

async function hasProcessedTapReference(reference) {
  if (!reference || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return false;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('payment_events')
    .select('id')
    .eq('provider', 'tap')
    .eq('reference', reference)
    .eq('status', 'active')
    .limit(1);

  if (error) throw error;
  return Array.isArray(data) && data.length > 0;
}

export async function activateTapChargeIfPaid(charge, rawEvent = {}) {
  const paid = isTapPaymentPaid(charge?.status);
  const email = charge?.metadata?.customerEmail || charge?.metadata?.customer_email || charge?.customer?.email || '';
  const reference = resolveTapReference(charge, charge?.id || '');

  if (!paid) {
    return { paid, activated: false, alreadyProcessed: false, reference };
  }

  if (!email) {
    console.warn(`activateTapChargeIfPaid: payment is paid but customer email is missing — chargeId=${charge?.id} reference=${reference}. Activation skipped.`);
    return { paid, activated: false, alreadyProcessed: false, reference };
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('activateTapChargeIfPaid: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — activation skipped.');
    return { paid, activated: false, alreadyProcessed: false, reference };
  }

  if (await hasProcessedTapReference(reference)) {
    return { paid, activated: false, alreadyProcessed: true, reference };
  }

  await activateSubscription({
    email,
    plan: charge?.metadata?.plan || 'monthly',
    provider: 'tap',
    reference,
    amount: Number(charge?.amount || 0),
    currency: charge?.currency || 'EGP',
    raw: rawEvent
  });

  return { paid, activated: true, alreadyProcessed: false, reference };
}
