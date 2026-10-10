// Supabase backend for the hosted version. The publishable key is designed to be public:
// every table is locked to signed-in users by row level security, and sign-ups are disabled,
// so only the shared party login can read or write anything.
(function(){
'use strict';
const URL_ = 'https://lpbjlnjjlfxdtlcdvvhs.supabase.co';
const KEY = 'sb_publishable_njesaCWWT3TJ3nKF6G-61g_daOa1cE6';
const EMAIL = 'party@example.com';
const sb = window.supabase.createClient(URL_, KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'party-sheets-auth' } });
const CLIENT = Math.random().toString(36).slice(2, 10);
const urlCache = {};

const BE = window.BACKEND = {
  online: false,
  client: CLIENT,
  async start(h){
    const { data, error } = await sb.from('docs').select('path,data');
    if (error) throw error;
    this.online = true;
    data.forEach(r => h.onDoc(r.path, r.data));
    h.loaded(new Set(data.map(r => r.path)));
    const rolls = await sb.from('rolls').select('*').order('id', { ascending: false }).limit(40);
    if (!rolls.error) h.onRolls(rolls.data);
    sb.channel('party-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'docs' }, p => {
        if (p.eventType === 'DELETE') { if (p.old && p.old.path) h.onDel(p.old.path); }
        else if (p.new && p.new.path) h.onDoc(p.new.path, p.new.data);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rolls' }, p => { if (p.new && p.new.client !== CLIENT) h.onRoll(p.new); })
      .subscribe(status => { h.status(status === 'SUBSCRIBED' ? 'ok' : status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' ? 'local' : 'busy'); });
  },
  async set(path, data){ const { error } = await sb.from('docs').upsert({ path, data, updated_at: new Date().toISOString() }); if (error) throw error; },
  async del(path){ const { error } = await sb.from('docs').delete().eq('path', path); if (error) throw error; },
  async addRoll(r){ await sb.from('rolls').insert({ who: r.who, label: r.label, total: String(r.total), detail: r.detail, nat: r.nat || null, client: CLIENT }); },
  async upload(path, blob){ const { error } = await sb.storage.from('portraits').upload(path, blob, { contentType: 'image/jpeg', upsert: true }); if (error) throw error; return path; },
  async remove(path){ await sb.storage.from('portraits').remove([path]); },
  async url(path){
    if (urlCache[path]) return urlCache[path];
    const { data, error } = await sb.storage.from('portraits').download(path);
    if (error) throw error;
    return (urlCache[path] = URL.createObjectURL(data));
  },
  async signOut(){ await sb.auth.signOut(); location.reload(); }
};

function loginScreen(msg){
  document.getElementById('tabs').hidden = true;
  document.getElementById('app').innerHTML = `<div class="login">
    <h1>Party Sheets</h1><p class="note">Amber, Mäusfänger, Mamuk and the Mule.</p>
    <form id="loginform"><div class="field"><label for="pw">Party password</label><input id="pw" type="password" autocomplete="current-password" required></div>
    <button class="btn pri" type="submit" style="width:100%">Enter</button>
    <p class="note" id="loginmsg" role="alert">${msg || ''}</p></form></div>`;
  document.getElementById('loginform').addEventListener('submit', async e => {
    e.preventDefault();
    const m = document.getElementById('loginmsg'); m.textContent = 'Checking…';
    const { error } = await sb.auth.signInWithPassword({ email: EMAIL, password: document.getElementById('pw').value });
    if (error) { m.textContent = 'That password did not work. Check it and try again.'; return; }
    window.startApp();
  });
  setTimeout(() => { const p = document.getElementById('pw'); if (p) p.focus(); }, 50);
}
BE.boot = async function(){
  const { data } = await sb.auth.getSession();
  if (data && data.session) window.startApp(); else loginScreen();
};
})();
