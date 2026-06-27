<?php
// 1. جلب الروابط والدومين بشكل ديناميكي تلقائي بدون كتابة يدوية
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
$your_vercel_domain = $protocol . $_SERVER['HTTP_HOST']; 
$webhook_url = $your_vercel_domain . $_SERVER['SCRIPT_NAME']; 

// 2. استقبال التنبيهات الخلفية (Webhook) القادمة من شركة Tap تلقائياً
$input = file_get_contents("php://input");
$payload = json_decode($input, true);

if ($payload && isset($payload['status'])) {
    if ($payload['status'] === "CAPTURED") {
        
        // 💾 ضع هنا كود PHP المعتاد لتحديث قاعدة البيانات وتأكيد طلب العميل بعد الدفع الناجح
        
        http_response_code(200);
        echo json_encode(["received" => true]);
        exit();
    }
}

// 3. إذا لم يكن الطلب تنبيهاً خلفياً، فهذا يعني أن العميل يريد بدء عملية دفع جديدة
$amount = 100; 
$currency = "SAR"; 
$customer_email = "test@example.com"; 

// بناء بيانات الفاتورة وإرسالها لـ Tap عبر الـ API
$tap_payload = [
    "amount" => $amount,
    "currency" => $currency,
    "threeDSecure" => true,
    "save_card" => false,
    "customer" => [
        "first_name" => "Client",
        "email" => $customer_email
    ],
    "source" => ["id" => "src_all"],
    "redirect" => [
        "url" => $your_vercel_domain . "/checkout/success" 
    ],
    // 👇 الرابط الديناميكي الجديد الذي اكتشفه السيرفر تلقائياً
    "post" => [
        "url" => $webhook_url
    ]
];

// إرسال الطلب إلى خادم شركة Tap باستخدام cURL
$ch = curl_init("https://tap.company");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($tap_payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer " . getenv('TAP_SECRET_KEY'), 
    "Content-Type: application/json"
]);

$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);

// إذا تم إنشاء الفاتورة بنجاح، نقوم بتوجيه المتصفح فوراً لصفحة الدفع الآمنة
if (isset($data['transaction']['url'])) {
    header("Location: " . $data['transaction']['url']);
    exit();
} else {
    echo "خطأ في إنشاء عملية الدفع: " . json_encode($data['errors'] ?? 'Unknown Error');
}
?>
