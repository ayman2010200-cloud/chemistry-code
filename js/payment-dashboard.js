(function () {
  const $ = (id) => document.getElementById(id);
  let latestCodes = [];

  function setStatus(message, kind) {
    const el = $('status');
    el.textContent = message || '';
    el.className = 'status' + (kind ? ' ' + kind : '');
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
      body.innerHTML = '<tr><td colspan="7">No payment events yet.</td></tr>';
      return;
    }
    body.innerHTML = items.map((x) => `
      <tr>
        <td>${new Date(x.created_at).toLocaleString()}</td>
        <td>${x.provider || ''}</td>
        <td>${x.reference || ''}</td>
        <td>${x.user_email || ''}</td>
        <td>${x.plan || ''}</td>
        <td>${x.amount || ''} ${x.currency || ''}</td>
        <td>${x.status || ''}</td>
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
      setStatus(`Generated ${result.count} code(s) successfully.`, 'ok');
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

  $('generateBtn').addEventListener('click', generateCodes);
  $('refreshBtn').addEventListener('click', refreshLists);
  $('copyCsvBtn').addEventListener('click', async () => {
    try {
      await copyCodesCsv();
    } catch (err) {
      setStatus(err.message, 'warn');
    }
  });
  $('downloadCsvBtn').addEventListener('click', downloadCodesCsv);
})();
