export async function POST(request) {
  try {
    const { amount, currency, customer, redirectUrl } = await request.json();

    const response = await fetch("https://tap.company", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.TAP_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amount,
        currency: currency,
        threeDSecure: true,
        save_card: false,
        customer: {
          first_name: customer.firstName,
          email: customer.email,
        },
        source: { id: "src_all" },
        redirect: {
          url: redirectUrl 
        },
        // 👇 هذا الجزء الجديد الذي يغنيك عن لوحة تحكم Tap
        post: {
          url: " https://chemistry-code.vercel.app" 
        }
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.errors }), { status: 400 });
    }

    return new Response(JSON.stringify({ url: data.transaction.url }), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
