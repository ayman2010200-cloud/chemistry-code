<?php
/**
 * CodeVault - Advanced 1-IP Binding License Verification Backend
 * ---------------------------------------------------------------
 * This PHP script acts as a secure firewall/backend gateway for your premium HTML files.
 * It ensures that a generated license code works ONLY on the very first IP address it is paired with.
 * Any attempt to use the same code from a different IP address will be instantly blocked.
 */

session_start();

// Simulated Database / File Storage for License Codes
// In a production environment, store this in MySQL / SQLite / JSON file.
// Structure: 'LICENSE_CODE' => ['bound_ip' => 'IP_ADDRESS_OR_NULL', 'active' => true]
$license_db_file = __DIR__ . '/license_database.json';

// Initialize dummy database if it doesn't exist
if (!file_exists($license_db_file)) {
    $initial_data = [
        "PREMIUM-VIP-8899" => ["bound_ip" => null, "active" => true],
        "HTML-ELITE-7766"  => ["bound_ip" => "198.51.100.42", "active" => true], // Already bound to another IP
        "CODEVAULT-2026"   => ["bound_ip" => null, "active" => true]
    ];
    file_put_contents($license_db_file, json_encode($initial_data, JSON_PRETTY_PRINT));
}

// Helper to get real visitor IP address securely
function get_visitor_ip() {
    if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        return $_SERVER['HTTP_CLIENT_IP'];
    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        // Get the first IP in the forwarded array
        $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        return trim($ips[0]);
    } else {
        return $_SERVER['REMOTE_ADDR'];
    }
}

$current_ip = get_visitor_ip();
$action = isset($_POST['action']) ? $_POST['action'] : (isset($_GET['action']) ? $_GET['action'] : '');

// 1. API Endpoint: Validate and Bind Code
if ($action === 'verify_code') {
    header('Content-Type: application/json');
    $code = isset($_POST['code']) ? trim($_POST['code']) : '';

    if (empty($code)) {
        echo json_encode(["status" => "error", "message" => "Please enter a valid license code."]);
        exit;
    }

    $db = json_decode(file_get_contents($license_db_file), true);

    if (!isset($db[$code])) {
        echo json_encode(["status" => "error", "message" => "Invalid license code! Please check your purchase details."]);
        exit;
    }

    if (!$db[$code]['active']) {
        echo json_encode(["status" => "error", "message" => "This license code has been revoked or expired."]);
        exit;
    }

    // Check IP Binding Logic
    if ($db[$code]['bound_ip'] === null) {
        // First time use -> Bind to current IP
        $db[$code]['bound_ip'] = $current_ip;
        file_put_contents($license_db_file, json_encode($db, JSON_PRETTY_PRINT));
        
        $_SESSION['authenticated_code'] = $code;
        $_SESSION['authenticated_ip'] = $current_ip;

        echo json_encode([
            "status" => "success", 
            "bound_ip" => $current_ip, 
            "message" => "License successfully bound to your IP ($current_ip). Premium access unlocked!"
        ]);
        exit;
    } else {
        // Code is already bound to an IP. Check if it matches the current IP.
        if ($db[$code]['bound_ip'] === $current_ip) {
            $_SESSION['authenticated_code'] = $code;
            $_SESSION['authenticated_ip'] = $current_ip;
            echo json_encode([
                "status" => "success", 
                "bound_ip" => $current_ip, 
                "message" => "Welcome back! IP verification passed."
            ]);
            exit;
        } else {
            // IP mismatch! Someone is trying to share the code.
            echo json_encode([
                "status" => "error", 
                "message" => "SECURITY VOID: This access code is already bound to a different IP address. Code sharing is strictly prohibited."
            ]);
            exit;
        }
    }
}

// 2. Gateway Gateway: Protect Premium HTML Pages
// Usage: Point your premium links to `ip_protection_backend.php?action=serve&file=premium-code-1.html`
if ($action === 'serve') {
    $requested_file = isset($_GET['file']) ? basename($_GET['file']) : '';
    
    // Check session authorization
    if (!isset($_SESSION['authenticated_code']) || $_SESSION['authenticated_ip'] !== $current_ip) {
        http_response_code(403);
        echo "<!DOCTYPE html>
        <html>
        <head>
            <title>Access Denied - IP Protection Active</title>
            <style>
                body { background-color: #0f172a; color: #f8fafc; font-family: sans-serif; text-align: center; padding: 100px 20px; }
                .box { max-width: 600px; margin: 0 auto; background: #1e293b; border: 1px solid #ef4444; padding: 40px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
                h1 { color: #ef4444; margin-bottom: 10px; }
                p { color: #94a3b8; line-height: 1.6; }
                a { display: inline-block; margin-top: 20px; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class='box'>
                <h1>🛡️ Access Denied</h1>
                <p>This premium HTML file is protected by <strong>1-IP Binding Security</strong>. You must verify a valid access code on the main portal before viewing this file from your IP address (<strong>$current_ip</strong>).</p>
                <a href='index.html'>Return to Portal & Verify Code</a>
            </div>
        </body>
        </html>";
        exit;
    }

    // Serve the actual premium HTML file securely from a hidden directory
    // Store your actual premium HTML files in a folder like `/protected_html/` outside public web root
    $secure_path = __DIR__ . '/protected_html/' . $requested_file;

    if (file_exists($secure_path)) {
        // Output the HTML content directly
        header('Content-Type: text/html');
        readfile($secure_path);
        exit;
    } else {
        http_response_code(404);
        echo "Protected file not found on server.";
        exit;
    }
}
?>
