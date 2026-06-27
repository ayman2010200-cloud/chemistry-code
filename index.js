// index.js (في المجلد الرئيسي لمشروعك)
export default async function handler(req, res) {
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host;
  const currentDomain = `${protocol}://${host}`;

  // 1. استقبال تنبيهات الدفع الناجح من Tap تلقائياً (Webhook)
  if (req.method === 'POST' && req.body && req.body.status) {
    if (req.body.status === 'CAPTURED') {
      return res.status(200).json({ received: true });
    }
    return res.status(200).json({ message: 'Parsed' });
  }

  // 2. إنشاء الفاتورة وتحويل العميل لصفحة الدفع الآمنة لـ Tap
  try {
    const response = await fetch("https://tap.company", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.TAP_SECRET_KEY}`, // قراءة المفتاح من Vercel Dashboard
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: 100, // المبلغ التجريبي
        currency: "SAR", // العملة
        threeDSecure: true,
        save_card: false,
        customer: { first_name: "Client", email: "test@example.com" },
        source: { id: "src_all" },
        redirect: { url: `${currentDomain}` }, 
        post: { url: `${currentDomain}` } 
      }),
    });

    const data = await response.json();

    // 👇 فحص نجاح الرابط أو طباعة الخطأ القادم من سيرفر Tap مباشرة على الشاشة
    if (data.transaction && data.transaction.url) {
        return res.redirect(302, data.transaction.url);
    } else {
        return res.status(400).json({ 
            error_message: "لم تفتح صفحة الدفع بسبب وجود خطأ في البيانات المرسلة أو المفاتيح:", 
            tap_response: data 
        });
    }

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
