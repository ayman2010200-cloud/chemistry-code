# CodeVault - Secured HTML Scripts Portal & 1-IP Licensing System

Welcome to the **CodeVault Portal**, a state-of-the-art HTML dashboard designed to link your existing HTML codes, showcase free scripts, securely sell premium templates, and enforce an advanced **1-IP Binding License System**.

---

## 📂 Included Files in this Package

1. **`index.html`** - The beautifully designed main portal. Fully responsive, dark-themed, interactive, and equipped with live IP detection, tabbed payment methods, and an access code unlock form.
2. **`ip_protection_backend.php`** - A production-ready PHP backend script that manages generated license codes, binds them to a user's initial IP address, blocks code sharing across multiple IPs, and securely serves your premium HTML files.
3. **`README.md`** - This documentation guide.

---

## 🎨 How to Link Your Existing HTML Codes

### 1. Linking Free HTML Codes
In `index.html`, scroll to the `<!-- Free Codes Section -->`. You will see cards representing your free items.
Locate the `<a href="free-code-1.html"...>` tags and replace the `href` attribute with the actual filenames of your free HTML files:
```html
<a href="my-free-project.html" target="_blank" class="btn btn-secondary">View / Download Page</a>
```

### 2. Linking Premium HTML Codes
In `index.html`, scroll to the `<!-- Premium Protected Section -->`. Premium items are locked by default until a user enters a valid license code.
Locate the `<button onclick="handlePremiumClick('premium-code-1.html')"...>` buttons. Replace `premium-code-1.html` with your actual premium HTML file paths or secure PHP gateway links (see Backend Protection section below):
```html
<button onclick="handlePremiumClick('my-premium-template.html')" class="btn btn-primary premium-btn">
```

---

## 💳 Configuring Payment Gateways & Wallets

The portal features an elegant, tabbed checkout interface supporting major Egyptian and International payment methods (**Vodafone Cash, InstaPay, Fawry Pay, Orange Cash, and PayPal**).

To update the payment details with your personal wallet numbers and accounts, open `index.html` and search for the following IDs in the `<!-- Payment Details Panels -->` section:

- **Vodafone Cash:** Locate `<span id="vodafone-num">01068018005</span>` and replace `` with your real Vodafone Cash wallet number.
- **InstaPay Egypt:** Locate `<span id="instapay-addr">01287996430</span>` and replace it with your InstaPay payment address (IPA).
- **Fawry Visa (Yellow Card):** Locate `<span id="fawry-visa-card">5078086732310763</span>` and replace it with your 16-digit Fawry Yellow Visa card number. Also update `<span id="fawry-phone">01287996430</span>` with the mobile number linked to your MyFawry account.
- **Orange Cash:** Locate `<span id="orange-num">01287996430</span>` and replace it with your Orange Cash wallet number.
- **PayPal:** Locate `<a href="ayman2010200@gmail.com"...>` and replace the link with your PayPal checkout link.

---

## 🛡️ Implementing the 1-IP Binding Protection (True Server Security)

While `index.html` includes a fully interactive frontend simulation of IP verification (via JavaScript localStorage and IP API detection), real protection against direct URL access requires server-side validation.

We have included `ip_protection_backend.php` to handle this securely on any PHP-supported web server (Apache/Nginx/cPanel/CyberPanel).

### How to Deploy Server-Side IP Locking:
1. **Store Premium HTML Files Securely:**
   Create a folder named `protected_html/` on your server in the same directory as `ip_protection_backend.php`. Place all your premium HTML files inside this folder. Keep this folder protected from direct web access (e.g., using a `.htaccess` file with `Deny from all`).

2. **Managing License Codes:**
   The PHP script automatically generates a `license_database.json` file. You can manually add new generated codes to this file when a customer pays you:
   ```json
   {
     "MY-CUSTOM-PASS-2026": {
       "bound_ip": null,
       "active": true
     }
   }
   ```
   *When a customer enters `MY-CUSTOM-PASS-2026`, the PHP script automatically updates `bound_ip` to their current IP address. Anyone else trying to use the same code from another IP will be immediately blocked.*

3. **Connecting `index.html` to PHP:**
   If you want `index.html` to verify codes against the PHP backend instead of the JavaScript simulation, modify the `verifyCode()` function in `index.html` to call `ip_protection_backend.php?action=verify_code`.

4. **Serving Protected Pages:**
   Update your premium buttons in `index.html` to point to the secure PHP gateway rather than direct HTML files:
   ```javascript
   onclick="handlePremiumClick('ip_protection_backend.php?action=serve&file=premium-code-1.html')"
   ```

---

## 🖥️ Standalone & Offline Support

The portal has been built with zero dependencies on external CSS/JS libraries (all modern styles and high-fidelity SVG icons are natively embedded). This guarantees lightning-fast loading speeds, complete privacy, and full compatibility in sandboxed preview environments or local servers.
