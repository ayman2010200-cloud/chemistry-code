// Vercel Serverless Function: /api/payments/tap/create-charge
// Creates a Tap charge and returns the hosted checkout URL.

function buildTapRedirectUrl(returnUrl, baseUrl, reference) {
  const fallback = `${baseUrl}/index.html`;
  let target;
  try {
    target = new URL(returnUrl || fallback, baseUrl);
  } catch (_) {
    target = new URL(fallback, baseUrl);
  }

  target.searchParams.set('payment', 'tap-success');
  target.searchParams.set('ref', reference);
  return target.toString();
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

    const { plan, amount, currency = 'EGP', customer = {}, reference, returnUrl } = req.body || {};

    if (!plan || !amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid plan or amount' });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://chemistry-code.com';
    const safeReference = reference || `CHEM-${plan}-${Date.now()}`;

    const payload = {
      amount: Number(amount),
      currency,
      threeDSecure: true,
      save_card: false,
      description: `Chemistry 2026 subscription - ${plan}`,
      statement_descriptor: 'Chemistry 2026',
      metadata: {
        plan,
        reference: safeReference,
        customerEmail: customer.email || ''
      },
      reference: {
        transaction: safeReference,
        order: safeReference
      },
      receipt: {
        email: true,
        sms: true
      },
      customer: {
        first_name: String(customer.name || 'Student').split(' ')[0] || 'Student',
        last_name: String(customer.name || 'Student').split(' ').slice(1).join(' ') || 'Chemistry',
        email: customer.email || 'student@example.com',
        phone: {
          country_code: '20',
          number: String(customer.phone || '01000000000').replace(/^\+?20/, '').replace(/^0/, '')
        }
      },
      source: {
        id: 'src_all'
      },
      redirect: {
        url: buildTapRedirectUrl(returnUrl, baseUrl, safeReference)
      },
      post: {
        url: `${baseUrl}/api/payments/tap/webhook`
      }
    };

    const tapResponse = await fetch('https://api.tap.company/v2/charges', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await tapResponse.json();

    if (!tapResponse.ok) {
      return res.status(tapResponse.status).json({ error: 'Tap charge failed', details: data });
    }

    return res.status(200).json({
      id: data.id,
      status: data.status,
      reference: safeReference,
      paymentUrl: data?.transaction?.url,
      raw: data
    });
  } catch (error) {
    console.error('Tap create-charge error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
