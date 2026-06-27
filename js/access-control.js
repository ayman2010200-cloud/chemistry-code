// Access control for paid revision/model pages.
// Model 1 English/Arabic is free. Other models/parts are private.
(function () {
  const FREE_FILES = new Set(['model 1.html', 'model 1-ar.html']);

  function fileName() {
    return decodeURIComponent(location.pathname.split('/').pop() || 'index.html');
  }

  function getUsers() {
    try { return JSON.parse(localStorage.getItem('chemcode_users') || '[]'); }
    catch { return []; }
  }

  function getCurrentUser() {
    const email = localStorage.getItem('chemcode_current_user');
    if (!email) return null;
    return getUsers().find(u => u.email === email) || null;
  }

  function isArabicPage() {
    const f = fileName();
    return f.endsWith('-ar.html') || document.documentElement.dir === 'rtl' || document.documentElement.lang === 'ar';
  }

  function paid(user) {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'teacher') return true;
    return user.plan === 'monthly' || user.plan === 'vip';
  }

  function go(url) {
    location.replace(url);
  }

  window.ChemAccess = {
    isFreePage() {
      return FREE_FILES.has(fileName());
    },
    requirePaid() {
      if (this.isFreePage()) return true;

      const user = getCurrentUser();
      const ar = isArabicPage();
      const current = fileName();
      localStorage.setItem('chemcode_pending_private_page', current);

      if (!user) {
        alert(ar ? 'هذه الصفحة خاصة. سجّل الدخول أولاً.' : 'This page is private. Please login first.');
        go(ar ? 'login-ar.html' : 'login.html');
        return false;
      }

      if (!paid(user)) {
        alert(ar ? 'هذه الصفحة للمشتركين فقط. يرجى ترقية الاشتراك.' : 'This page is for subscribers only. Please upgrade your plan.');
        go(ar ? 'pricing-ar.html' : 'pricing.html');
        return false;
      }

      document.documentElement.classList.add('access-granted');
      return true;
    }
  };
})();
