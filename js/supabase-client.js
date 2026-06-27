// Optional Supabase client with localStorage fallback. Requires js/site-config.js before this file.
(function () {
  const cfg = window.CHEM_CONFIG || {};
  const ready = cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes('YOUR_PROJECT') && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.includes('YOUR_');

  window.ChemSupabaseReady = ready;

  async function loadSdk() {
    if (!ready) return null;
    if (window.supabase) return window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  }

  window.ChemDB = {
    client: null,
    async init() {
      if (!this.client) this.client = await loadSdk();
      return this.client;
    },
    async getLessons() {
      const sb = await this.init();
      if (!sb) return JSON.parse(localStorage.getItem('chemcode_lessons') || '[]');
      const { data, error } = await sb.from('lessons').select('*').order('sort_order');
      if (error) throw error;
      return data;
    },
    async getProfile() {
      const sb = await this.init();
      if (!sb) return null;
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return null;
      const { data, error } = await sb.from('profiles').select('*').eq('id', user.id).single();
      if (error) throw error;
      return data;
    }
  };
})();
