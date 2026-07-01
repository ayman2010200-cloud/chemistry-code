// js/payment.js
// Tap Payments + PayPal integration helpers.

const PaymentGateways = {
    config: {
        currency: 'EGP',
        tap: {
            createChargeEndpoint: '/api/payments/tap/create-charge'
        },
        paypal: {
            configEndpoint: '/api/payments/paypal/config',
            createOrderEndpoint: '/api/payments/paypal/create-order',
            captureOrderEndpoint: '/api/payments/paypal/capture-order'
        }
    },

    isPlaceholder(value) {
        return !value || value.includes('YOUR_');
    },

    getUserData() {
        const user = typeof DB !== 'undefined' ? DB.getCurrentUser() : null;
        return user || {
            name: 'Guest Student',
            email: 'student@example.com',
            phone: '01000000000'
        };
    },

    buildOrder(plan, amount, extra = {}) {
        const user = this.getUserData();
        return {
            plan,
            amount: Number(amount || 0),
            currency: this.config.currency,
            customer: {
                name: extra.name || user.name || 'Student',
                email: extra.email || user.email || 'student@example.com',
                phone: extra.phone || user.phone || '01000000000'
            },
            reference: `CHEM-${plan}-${Date.now()}`,
            returnUrl: window.location.origin + window.location.pathname + '?payment=success',
            cancelUrl: window.location.origin + window.location.pathname + '?payment=cancelled'
        };
    },

    async postJSON(url, payload) {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            throw new Error(`Payment server error: ${response.status}`);
        }
        return response.json();
    },

    async startTapPayment(plan, amount, extra = {}) {
        const order = this.buildOrder(plan, amount, extra);

        if (this.isPlaceholder(this.config.tap.createChargeEndpoint)) {
            this.showSetupMessage('Tap Payments', order, [
                'Create a backend endpoint that calls Tap Charges API using your Tap SECRET key.',
                'Put your Tap public key in PaymentGateways.config.tap.publicKey.',
                'Set PaymentGateways.config.tap.createChargeEndpoint to your backend endpoint.',
                'Your backend should return: { "paymentUrl": "https://..." } or { "transaction": { "url": "https://..." } }.'
            ]);
            return { pendingSetup: true, order };
        }

        const result = await this.postJSON(this.config.tap.createChargeEndpoint, order);
        const url = result.paymentUrl || result.redirectUrl || result?.transaction?.url;
        if (!url) throw new Error('Tap response did not include a payment URL.');
        window.location.href = url;
        return result;
    },

    async getPayPalConfig() {
        if (this._paypalConfig) return this._paypalConfig;
        const response = await fetch(this.config.paypal.configEndpoint);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Could not load PayPal config');
        }
        this._paypalConfig = data;
        return data;
    },

    async loadPayPalSdk() {
        if (window.paypal) return window.paypal;
        const cfg = await this.getPayPalConfig();
        await new Promise((resolve, reject) => {
            const existing = document.querySelector('script[data-paypal-sdk="true"]');
            if (existing) {
                existing.addEventListener('load', resolve, { once: true });
                existing.addEventListener('error', reject, { once: true });
                return;
            }
            const script = document.createElement('script');
            script.dataset.paypalSdk = 'true';
            script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(cfg.clientId)}&currency=${encodeURIComponent(cfg.currency || 'USD')}&intent=capture`;
            script.onload = resolve;
            script.onerror = () => reject(new Error('Could not load PayPal SDK'));
            document.head.appendChild(script);
        });
        return window.paypal;
    },

    async createPayPalOrder(plan, amount, extra = {}) {
        const order = this.buildOrder(plan, amount, extra);
        const response = await fetch(this.config.paypal.createOrderEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'PayPal order creation failed');
        return data.id;
    },

    async capturePayPalOrder(orderID, plan, extra = {}) {
        const order = this.buildOrder(plan, 0, extra);
        const response = await fetch(this.config.paypal.captureOrderEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderID, plan, customer: order.customer })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'PayPal capture failed');
        return data;
    },

    async renderPayPalButtons(containerId, plan, amount, callbacks = {}) {
        const container = document.getElementById(containerId);
        if (!container) throw new Error('PayPal container not found');
        container.innerHTML = '';
        const paypal = await this.loadPayPalSdk();
        const self = this;
        paypal.Buttons({
            style: {
                layout: 'vertical',
                color: 'gold',
                shape: 'pill',
                label: 'paypal'
            },
            createOrder() {
                return self.createPayPalOrder(plan, amount, callbacks.extra || {});
            },
            async onApprove(data) {
                const result = await self.capturePayPalOrder(data.orderID, plan, callbacks.extra || {});
                if (result.paid) {
                    if (callbacks.onSuccess) callbacks.onSuccess(result);
                } else {
                    throw new Error('PayPal order was not completed');
                }
            },
            onCancel(data) {
                if (callbacks.onCancel) callbacks.onCancel(data);
            },
            onError(err) {
                console.error('PayPal button error:', err);
                if (callbacks.onError) callbacks.onError(err);
            }
        }).render(container);
    },

    showSetupMessage(provider, order, steps) {
        const message = `${provider} setup is ready in the page, but credentials/backend are still placeholders.\n\n` +
            `Order reference: ${order.reference}\nAmount: ${order.amount} ${order.currency}\nPlan: ${order.plan}\n\n` +
            steps.map((s, i) => `${i + 1}. ${s}`).join('\n');

        if (typeof showToast === 'function') {
            showToast(`${provider} needs merchant credentials/backend setup first.`, 'info');
        }
        alert(message);
    }
};

// Backward-compatible aliases used by pricing pages.
async function payWithTap(plan, amount, extra) {
    return PaymentGateways.startTapPayment(plan, amount, extra);
}

async function renderPayPalButtons(containerId, plan, amount, callbacks) {
    return PaymentGateways.renderPayPalButtons(containerId, plan, amount, callbacks);
}
