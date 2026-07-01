(function () {
  const $ = (id) => document.getElementById(id);
  let latestCodes = [];
  let latestWhatsAppPayload = { codes: [], phone: '', plan: 'monthly' };

  function setStatus(message, kind) {
    const el = $('status');
    el.textContent = message || '';
    el.className = 'status' + (kind ? ' ' + kind : '');
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeWhatsAppPhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('00')) return digits.slice(2);
    if (digits.startsWith('0')) return `20${digits.slice(1)}`;
    return digits;
  }

  function buildWhatsAppUrl(phone, text) {
    const normalized = normalizeWhatsAppPhone(phone);
    if (!normalized) return '';
    return `https://wa.me/${encodeURIComponent(normalized)}?text=${encodeURIComponent(text)}`;
  }

  function sendCodesToWhatsApp(phone, codes, plan) {
    const uniqueCodes = (codes || []).filter(Boolean);
    if (!uniqueCodes.length) {
      setStatus('No generated codes available to send.', 'warn');
      return;
    }
    const url = buildWhatsAppUrl(phone, `Chemistry Code Activation\nPlan: ${plan}\nCode(s): ${uniqueCodes.join(', ')}`);
    if (!url) {
      setStatus('Please enter a valid WhatsApp phone number.', 'warn');
      return;
    }
    window.open(url, '_blank', 'noopener');
    setStatus('WhatsApp message opened successfully.', 'ok');
  }

  function getSecret() {
    return $('adminSecret').value.trim();
  }

  async function api(path, options = {}) {
    const secret = getSecret();
    if (!secret) {
      setStatus('Please enter Admin API Secret first.', 'warn');
      throw new Error('Missing Admin API Secret');
    }

    const headers = {
      'Content-Type': 'application/json',
      'x-admin-secret': secret,
      ...(options.headers || {})
    };

    const res = await fetch(path, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Request failed: ${res.status}`);
    }
    return data;
  }

  function escapeCsv(value) {
    const text = String(value ?? '');
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  function buildCodesCsv(items) {
    const header = ['code', 'plan', 'used', 'used_at', 'created_at'];
    const rows = items.map((x) => [x.code, x.plan, x.used ? 'yes' : 'no', x.used_at || '', x.created_at || '']);
    return [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
  }

  async function copyCodesCsv() {
    if (!latestCodes.length) {
      setStatus('No codes available to copy.', 'warn');
      return;
    }
    const csv = buildCodesCsv(latestCodes);
    await navigator.clipboard.writeText(csv);
    setStatus('CSV copied to clipboard.', 'ok');
  }

  function downloadCodesCsv() {
    if (!latestCodes.length) {
      setStatus('No codes available to download.', 'warn');
      return;
    }
    const csv = buildCodesCsv(latestCodes);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'activation-codes.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setStatus('CSV downloaded.', 'ok');
  }

  function renderPayments(items) {
    const body = $('paymentsBody');
    if (!items.length) {
      body.innerHTML = '<tr><td colspan="9">No payment events yet.</td></tr>';
      return;
    }
    body.innerHTML = items.map((x) => `
      <tr>
        <td>${new Date(x.created_at).toLocaleString()}</td>
        <td>${escapeHtml(x.provider || '')}</td>
        <td>${escapeHtml(x.reference || '')}</td>
        <td>${escapeHtml(x.user_email || '')}</td>
        <td>${escapeHtml((x.raw && x.raw.phone) || '')}</td>
        <td>${escapeHtml(x.plan || '')}</td>
        <td>${escapeHtml(x.amount || '')} ${escapeHtml(x.currency || '')}</td>
        <td>${escapeHtml(x.status || '')}</td>
        <td>
          ${x.raw && x.raw.phone && x.raw.generatedCodes && x.raw.generatedCodes.length
            ? `<button class="ghost" data-action="wa-payment" data-phone="${escapeHtml(x.raw.phone)}" data-codes="${escapeHtml(x.raw.generatedCodes.join('|'))}" data-plan="${escapeHtml(x.plan || 'monthly')}">WhatsApp</button>`
            : '-'}
        </td>
      </tr>
    `).join('');
  }

  function renderCodes(items) {
    latestCodes = items;
    const body = $('codesBody');
    if (!items.length) {
      body.innerHTML = '<tr><td colspan="6">No codes yet.</td></tr>';
      return;
    }
    body.innerHTML = items.map((x) => `
      <tr>
        <td>${new Date(x.created_at).toLocaleString()}</td>
        <td>${x.code}</td>
        <td>${x.plan}</td>
        <td>${x.used ? 'yes' : 'no'}</td>
        <td>${x.used_at ? new Date(x.used_at).toLocaleString() : ''}</td>
        <td>
          <div class="mini-actions">
            <button class="ghost" data-action="${x.used ? 'restore' : 'revoke'}" data-id="${x.id}">${x.used ? 'Mark Unused' : 'Mark Used'}</button>
            <button class="danger" data-action="delete" data-id="${x.id}">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  async function updateCodeStatus(id, action) {
    setStatus('Updating code status...');
    await api('/api/dashboard/codes', {
      method: 'PATCH',
      body: JSON.stringify({ id, action })
    });
    setStatus('Code status updated.', 'ok');
    await refreshLists();
  }

  async function deleteCode(id) {
    setStatus('Deleting code...');
    await api(`/api/dashboard/codes?id=${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    setStatus('Code deleted.', 'ok');
    await refreshLists();
  }

  async function refreshLists() {
    setStatus('Loading latest records...');
    try {
      const [payments, codes] = await Promise.all([
        api('/api/dashboard/payments?limit=100'),
        api('/api/dashboard/codes?limit=200')
      ]);
      renderPayments(payments.items || []);
      renderCodes(codes.items || []);
      setStatus('Dashboard synced with server.', 'ok');
    } catch (err) {
      setStatus(err.message, 'warn');
    }
  }

  async function generateCodes() {
    const payload = {
      plan: $('plan').value,
      count: Number($('count').value || 1),
      prefix: $('prefix').value,
      payment: {
        provider: $('provider').value,
        reference: $('reference').value,
        email: $('email').value,
        payerName: $('payerName').value,
        phone: $('phone').value,
        amount: Number($('amount').value || 0),
        currency: $('currency').value,
        notes: $('notes').value
      }
    };

    setStatus('Generating activation codes...');
    try {
      const result = await api('/api/dashboard/codes', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      $('generatedCodes').textContent = (result.codes || []).join('\n');
      latestWhatsAppPayload = {
        codes: result.codes || [],
        phone: $('phone').value.trim(),
        plan: payload.plan
      };
      setStatus(`Generated ${result.count} code(s) successfully.`, 'ok');
      if (latestWhatsAppPayload.phone && latestWhatsAppPayload.codes.length) {
        sendCodesToWhatsApp(latestWhatsAppPayload.phone, latestWhatsAppPayload.codes, latestWhatsAppPayload.plan);
      }
      await refreshLists();
    } catch (err) {
      setStatus(err.message, 'warn');
    }
  }

  $('codesBody').addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action][data-id]');
    if (!button) return;

    const action = button.getAttribute('data-action');
    const id = button.getAttribute('data-id');
    try {
      if (action === 'delete') {
        if (!window.confirm('Delete this code permanently?')) return;
        await deleteCode(id);
        return;
      }
      await updateCodeStatus(id, action);
    } catch (err) {
      setStatus(err.message, 'warn');
    }
  });

  $('paymentsBody').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action="wa-payment"]');
    if (!button) return;
    const phone = button.getAttribute('data-phone') || '';
    const codes = (button.getAttribute('data-codes') || '').split('|').filter(Boolean);
    const plan = button.getAttribute('data-plan') || 'monthly';
    sendCodesToWhatsApp(phone, codes, plan);
  });

  $('generateBtn').addEventListener('click', generateCodes);
  $('refreshBtn').addEventListener('click', refreshLists);
  $('sendWhatsappBtn').addEventListener('click', () => {
    sendCodesToWhatsApp(latestWhatsAppPayload.phone || $('phone').value.trim(), latestWhatsAppPayload.codes, latestWhatsAppPayload.plan);
  });
  $('copyCsvBtn').addEventListener('click', async () => {
    try {
      await copyCodesCsv();
    } catch (err) {
      setStatus(err.message, 'warn');
    }
  });
  $('downloadCsvBtn').addEventListener('click', downloadCodesCsv);
})();
