(function(){
'use strict';
const R = window.RULES;
const AB = ['str','dex','con','int','wis','cha'];
const ABN = {str:'Strength',dex:'Dexterity',con:'Constitution',int:'Intelligence',wis:'Wisdom',cha:'Charisma'};
const SKILLS = [
 ['acrobatics','Acrobatics','dex'],['animal','Animal Handling','wis'],['arcana','Arcana','int'],['athletics','Athletics','str'],
 ['deception','Deception','cha'],['history','History','int'],['insight','Insight','wis'],['intimidation','Intimidation','cha'],
 ['investigation','Investigation','int'],['medicine','Medicine','wis'],['nature','Nature','int'],['perception','Perception','wis'],
 ['performance','Performance','cha'],['persuasion','Persuasion','cha'],['religion','Religion','int'],['sleight','Sleight of Hand','dex'],
 ['stealth','Stealth','dex'],['survival','Survival','wis']];
const PCS = ['amber','mausfanger','mamuk'];
const ORDER = PCS.concat(['mule']);
const LS_KEY = 'party-sheets-v1', LS_TEXT = 'party-texts-v1', LS_UI = 'party-ui-v1', LS_PARTY = 'party-shared-v1', LS_COMBAT = 'party-combat-v1';
const SRC_LABEL = {class:'Class list', sub:'Subclass', tome:'Book of Shadows', mi:'Magic Initiate', mark:'Mark of Warding', arcanum:'Mystic Arcanum'};
const TARGET_INV = ['agonizing blast','eldritch spear','repelling blast'];
const CONDS = ['blinded','charmed','deafened','frightened','grappled','incapacitated','invisible','paralyzed','petrified','poisoned','prone','restrained','stunned','unconscious'];

const clone = o => JSON.parse(JSON.stringify(o));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sgn = n => (n >= 0 ? '+' : '') + n;
const mod = s => Math.floor((s - 10) / 2);
const pbOf = L => 2 + Math.floor((L - 1) / 4);
const tierOf = L => 1 + (L >= 5) + (L >= 11) + (L >= 17);
const ord = n => { const s = ['th','st','nd','rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const skillName = k => k === 'thieves' ? "Thieves' Tools" : (SKILLS.find(s => s[0] === k) || [k,k])[1];
const lk = (ty, key, text) => `<a class="lk" data-l="${esc(ty)}|${esc(key)}">${esc(text)}</a>`;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
function lsGet(k){ try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch(e){ return null; } }
function lsSet(k,v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
function today(){ return new Date().toLocaleDateString('en-GB', {weekday:'short', day:'numeric', month:'short', year:'numeric'}); }

// ---------- state ----------
let chars = clone(SHEETS);
const local = lsGet(LS_KEY);
if (local) for (const id of ORDER) if (local[id] && local[id].v === SHEETS[id].v) chars[id] = local[id];
ORDER.forEach(id => normalise(chars[id]));
let texts = lsGet(LS_TEXT) || {};
let party = Object.assign({notes:'', loot:'', coins:{cp:0,sp:0,ep:0,gp:0,pp:0}, quests:[], npcs:[], log:[]}, lsGet(LS_PARTY) || {});
const ui = Object.assign({cur:'amber', tab:{}, filter:{}, q:{}}, lsGet(LS_UI) || {});
ui.q = ui.q || {};
ui.ia = Object.assign({n:'', c:1, hp:'', ac:'', ally:false, v:''}, ui.ia || {});
if (ui.cur === 'mule') ui.cur = 'party';
const PAGES = PCS.concat(['party','init']);
const hashId = (location.hash || '').slice(1);
if (PAGES.includes(hashId)) ui.cur = hashId; else if (hashId === 'mule') ui.cur = 'party';
// shared initiative tracker: one document for the whole table
let combat = Object.assign({round:0, turn:null, list:[]}, lsGet(LS_COMBAT) || {});
let ctxOverride = null;
let DB = null, canWrite = true, syncState = 'local';
let rolls = [];

function normalise(c){
  if (!c) return;
  c.used = c.used || {}; c.history = c.history || [];
  if (c.kind !== 'pc') return;
  c.conditions = c.conditions || []; c.exhaustion = c.exhaustion || 0;
  if (!Array.isArray(c.masteries)) c.masteries = [];
  c.invTargets = c.invTargets || {};
  (c.invocations || []).forEach(n => { if (TARGET_INV.includes(n.toLowerCase()) && !c.invTargets[n]) c.invTargets[n] = 'eldritch blast'; });
  c.invocations = c.invocations || []; c.metamagic = c.metamagic || []; c.expertise = c.expertise || []; c.arcanum = c.arcanum || {};
  if (c.conc === undefined) c.conc = null;
  if (!Array.isArray(c.effects)) c.effects = [];
  if (c.ac2 && !c.ac2Label) c.ac2Label = 'Mage Armor';
  (c.attacks || []).forEach(a => {
    if (!a.ref && a.n === 'Sneak Attack') a.ref = 'cf|Sneak Attack';
    if (!a.ref && a.n === 'Dagger') a.ref = 'weapon|Dagger';
    if (!a.ref && a.n === 'Quarterstaff') a.ref = 'weapon|Quarterstaff';
    if (!a.ref && /^Claws/.test(a.n)) a.ref = "species|Cat's Claws";
  });
}
const normalised = o => { const c = clone(o); normalise(c); return c; };

// ---------- derived ----------
const cl = c => R.classes[c.cls];
const row = c => cl(c) ? cl(c).table[c.level - 1] : null;
const hasFeat = (c, n) => (c.feats || []).some(f => f.n === n);
const hasInv = (c, n) => (c.invocations || []).some(x => x.toLowerCase() === n.toLowerCase());
function D(c){
  const L = c.level, pb = pbOf(L), m = {};
  AB.forEach(a => m[a] = mod(c.ab[a]));
  const cm = m[c.castAb] ?? 0;
  const skills = {};
  SKILLS.forEach(([k,,a]) => { const p = c.skills[k] || 0; skills[k] = m[a] + (p ? pb * p : 0); });
  const innate = c.cls === 'Sorcerer' && !!(c.used && c.used.innateOn);
  return { L, pb, m, cm, dc: 8 + pb + cm + (innate ? 1 : 0), baseDc: 8 + pb + cm, innate, atk: pb + cm, skills, ex: (c.exhaustion || 0) * 2,
    init: m.dex + (c.initMisc || 0), passive: 10 + skills.perception, pInv: 10 + skills.investigation, pIns: 10 + skills.insight, tier: tierOf(L) };
}
function maxSpellLevel(c, r){
  r = r || row(c); if (!r) return 0;
  if (c.cls === 'Warlock') return r.sl;
  if (c.cls === 'Sorcerer') { let x = 0; r.slots.forEach((n,i) => { if (n) x = i + 1; }); return x; }
  return 0;
}
function spellList(c){
  const out = (c.spells || []).map(s => Object.assign({}, s));
  const have = new Set(out.map(s => s.k));
  const ss = R.subSpells[c.sub];
  if (ss) for (const [lv, ks] of Object.entries(ss)) if (c.level >= +lv) ks.forEach(k => { if (!have.has(k)) { out.push({k, src:'sub', always:true}); have.add(k); } });
  if (hasFeat(c,'Mark of Warding')) ['alarm','mage armor'].concat(c.level >= 3 ? ['arcane lock'] : []).forEach(k => { if (!have.has(k)) { out.push({k, src:'mark', always:true}); have.add(k); } });
  for (const [lv,k] of Object.entries(c.arcanum || {})) if (k && !have.has(k)) { out.push({k, src:'arcanum', always:true, arc:+lv}); have.add(k); }
  return out.filter(s => R.spells[s.k]);
}
function counts(c){
  const list = c.spells || [];
  const can = list.filter(s => s.src === 'class' && R.spells[s.k] && R.spells[s.k].l === 0).length;
  const prep = list.filter(s => s.src === 'class' && R.spells[s.k] && R.spells[s.k].l > 0 && !s.off).length;
  return {can, prep};
}
const metaMax = L => L >= 17 ? 6 : L >= 10 ? 4 : L >= 2 ? 2 : 0;
function checks(c){
  const out = [], r = row(c); if (!r || c.kind !== 'pc') return out;
  const n = counts(c);
  if (c.cls === 'Warlock' || c.cls === 'Sorcerer') {
    if (n.can < r.can) out.push({k:'can', msg:`${r.can - n.can} cantrip${r.can - n.can > 1 ? 's' : ''} to choose (${n.can} of ${r.can}).`});
    if (n.prep < r.prep) out.push({k:'prep', msg:`${r.prep - n.prep} prepared spell${r.prep - n.prep > 1 ? 's' : ''} to choose (${n.prep} of ${r.prep}).`});
    if (n.prep > r.prep) out.push({k:'over', msg:`${n.prep} spells prepared, the table allows ${r.prep}. Remove or unprepare some.`});
  }
  if (c.cls === 'Warlock' && c.invocations.length < r.inv) out.push({k:'inv', msg:`${r.inv - c.invocations.length} invocation${r.inv - c.invocations.length > 1 ? 's' : ''} to choose.`});
  if (c.cls === 'Sorcerer' && c.metamagic.length < metaMax(c.level)) out.push({k:'meta', msg:`${metaMax(c.level) - c.metamagic.length} Metamagic option${metaMax(c.level) - c.metamagic.length > 1 ? 's' : ''} to choose.`});
  if (c.cls === 'Rogue' && c.masteries.length < 2) out.push({k:'mastery', msg:`${2 - c.masteries.length} Weapon Mastery choice${2 - c.masteries.length > 1 ? 's' : ''} to make.`});
  return out;
}
function resources(c){
  const L = c.level, r = row(c), d = D(c), out = [];
  if (c.kind !== 'pc') return out;
  if (c.cls === 'Warlock') {
    out.push({id:'pact', n:'Pact slots', sub:`${ord(r.sl)} level, back on a Short Rest`, max:r.slots, rest:'short', pips:true, ref:'cf|Pact Magic'});
    if (L >= 2) out.push({id:'cunning', n:'Magical Cunning', sub:`1-minute rite: regain up to ${Math.ceil(r.slots/2)} Pact slot${Math.ceil(r.slots/2)>1?'s':''}`, max:1, rest:'long', pips:true, ref:'cf|Magical Cunning'});
    if (c.sub === 'Celestial' && L >= 3) out.push({id:'heal', n:'Healing Light', sub:`d6 pool, Bonus Action, 60 ft, up to ${Math.max(1, d.cm)} dice at once`, max:1 + L, rest:'long', count:true, ref:'sf|Healing Light', roll:'heal'});
    if (L >= 9) out.push({id:'contact', n:'Contact Patron', sub:'Contact Other Plane without a slot', max:1, rest:'long', pips:true, ref:'cf|Contact Patron'});
    for (const [lv,k] of Object.entries(c.arcanum || {})) if (k) out.push({id:'arc'+lv, n:`Mystic Arcanum (${ord(+lv)})`, sub:R.spells[k] ? R.spells[k].n : k, max:1, rest:'long', pips:true, ref:'spell|' + k});
    if (c.sub === 'Celestial' && L >= 14) out.push({id:'searing', n:'Searing Vengeance', sub:'', max:1, rest:'long', pips:true, ref:'sf|Searing Vengeance'});
  }
  if (c.cls === 'Sorcerer') {
    if (r.sp) out.push({id:'sp', n:'Sorcery Points', sub:'Font of Magic: turn points into spell slots, or slots into points', max:r.sp, rest:'long', count:true, ref:'cf|Font of Magic', btn:['font','Convert']});
    out.push({id:'innate', n:'Innate Sorcery', sub: d.innate ? `Active: spell save DC ${d.dc}, Advantage on Sorcerer spell attacks` : 'Bonus Action, 1 minute: +1 spell DC, Advantage on Sorcerer spell attacks', max:2, rest:'long', pips:true, ref:'cf|Innate Sorcery', btn:['innate', d.innate ? 'End' : 'Activate']});
    if (L >= 5) out.push({id:'restore', n:'Sorcerous Restoration', sub:`On a Short Rest, regain up to ${Math.floor(L/2)} Sorcery Points`, max:1, rest:'long', pips:true, ref:'cf|Sorcerous Restoration'});
    if (c.sub === 'Aberrant' && L >= 18) out.push({id:'warp', n:'Warping Implosion', sub:'Or spend 5 Sorcery Points', max:1, rest:'long', pips:true, ref:'sf|Warping Implosion'});
  }
  if (hasFeat(c,'Mark of Warding')) {
    out.push({id:'m_alarm', n:'Alarm (free)', sub:'Mark of Warding, once per Long Rest', max:1, rest:'long', pips:true, ref:'spell|alarm'});
    out.push({id:'m_armor', n:'Mage Armor (free)', sub:'Mark of Warding, once per Long Rest', max:1, rest:'long', pips:true, ref:'spell|mage armor'});
    if (L >= 3) out.push({id:'m_lock', n:'Arcane Lock (free)', sub:'Mark of Warding, once per Long Rest', max:1, rest:'long', pips:true, ref:'spell|arcane lock'});
  }
  if (hasFeat(c,'Magic Initiate')) {
    const lv1 = (c.spells || []).find(s => s.src === 'mi' && R.spells[s.k] && R.spells[s.k].l === 1);
    out.push({id:'mi', n:(lv1 ? R.spells[lv1.k].n : 'Level 1 spell') + ' (free)', sub:'Magic Initiate, once per Long Rest', max:1, rest:'long', pips:true, ref:lv1 ? 'spell|' + lv1.k : 'feat|magic initiate'});
  }
  if (c.species === 'Tabaxi') out.push({id:'feline', n:'Feline Agility', sub:'Double Speed this turn. Recharges after a turn where you move 0 ft', max:1, rest:'short', pips:true, ref:'species|Feline Agility'});
  if (c.cls === 'Rogue' && L >= 20) out.push({id:'stroke', n:'Stroke of Luck', sub:'', max:1, rest:'short', pips:true, ref:'cf|Stroke of Luck'});
  out.push({id:'hd', n:`Hit Dice (d${cl(c).hd})`, sub:'Spend on a Short Rest. All return on a Long Rest', max:L, rest:'long', pips:L <= 12, count:L > 12, ref:'rule|hit point dice'});
  return out;
}
const used = (c,id) => (c.used && c.used[id]) || 0;
// Sorcerer slots, plus any made with Font of Magic (kept in used.x1..x5, so a Long Rest clears them)
const slotsOf = c => { const r = row(c); return (c.cls === 'Sorcerer' && r) ? r.slots.map((n,i) => ({lv:i+1, max:n, x:used(c,'x'+(i+1))})).filter(s => s.max || s.x).map(s => Object.assign(s, {left: Math.max(0, s.max - used(c,'s'+s.lv)) + s.x})) : []; };
const META = {'Subtle Spell':{cost:1, short:'Subtle', save:false}, 'Heightened Spell':{cost:2, short:'Heightened', save:true}};
const mmTag = mm => mm && META[mm] ? ` (${META[mm].short})` : '';
const FONT = [[1,2,2],[2,3,3],[3,5,5],[4,6,7],[5,7,9]]; // slot level, Sorcery Point cost, minimum Sorcerer level
const spLeft = c => Math.max(0, (row(c) ? row(c).sp : 0) - used(c,'sp'));
function slotMax(c, id){
  const r = resources(c).find(x => x.id === id); if (r) return r.max;
  if (/^s\d$/.test(id)) return row(c).slots[+id.slice(1) - 1];
  return 1;
}

// ---------- persistence ----------
const BE = window.BACKEND || null;
const timers = {};
const online = () => BE ? BE.online : (DB && canWrite);
function dbSet(path, data){ return BE ? BE.set(path, Object.assign({}, data, {by: BE.client})) : DB.doc(path).set(data); }
function dbDel(path){ return BE ? BE.del(path) : DB.doc(path).delete(); }
function save(id){
  lsSet(LS_KEY, chars);
  if (!online()) { setSync('local'); return; }
  setSync('busy');
  clearTimeout(timers[id]);
  timers[id] = setTimeout(async () => {
    try { await dbSet('chars/' + id, {state: chars[id], updated: Date.now()}); setSync('ok'); }
    catch(e){ writeFailed(e); }
  }, 700);
}
function writeFailed(e){ if (!BE && e && e.code === 'invalid_argument') { canWrite = false; toast('You can view the party, but changes save on this device only.'); } else if (BE) toast('Could not save to the party. It is kept on this device.'); setSync('local'); }
function saveTexts(){ lsSet(LS_TEXT, texts); if (online()) dbSet('texts/custom', {map: texts, updated: Date.now()}).catch(writeFailed); }
function saveParty(){
  lsSet(LS_PARTY, party);
  if (!online()) return;
  clearTimeout(timers.party);
  timers.party = setTimeout(() => { dbSet('party/main', {notes: party.notes, loot: party.loot, coins: party.coins, updated: Date.now()}).catch(writeFailed); }, 700);
}
function saveCombat(){
  lsSet(LS_COMBAT, combat);
  if (!online()) return;
  clearTimeout(timers.combat);
  timers.combat = setTimeout(() => { dbSet('combat/main', {round: combat.round, turn: combat.turn, list: combat.list, updated: Date.now()}).catch(writeFailed); }, 250);
}
function saveItem(coll, item){ lsSet(LS_PARTY, party); if (online()) dbSet(coll + '/' + item.id, item).catch(writeFailed); }
function deleteItem(coll, id){ lsSet(LS_PARTY, party); if (online()) dbDel(coll + '/' + id).catch(writeFailed); }
function setSync(s){ syncState = s; document.querySelectorAll('.sync').forEach(el => { el.dataset.s = s; el.lastElementChild.textContent = s === 'ok' ? 'Party sync' : s === 'busy' ? 'Saving' : 'This device'; }); }
function applyDoc(path, v){
  const [coll, id] = path.split('/');
  if (coll === 'chars' && v && v.state && SHEETS[id] && v.state.v === SHEETS[id].v) {
    const st = clone(v.state); normalise(st);
    if (JSON.stringify(st) !== JSON.stringify(chars[id])) { chars[id] = st; lsSet(LS_KEY, chars); return true; }
  }
  if (coll === 'texts' && v && v.map && JSON.stringify(v.map) !== JSON.stringify(texts)) { texts = clone(v.map); lsSet(LS_TEXT, texts); return true; }
  if (coll === 'party' && v) { party.notes = v.notes || ''; party.loot = v.loot || ''; party.coins = v.coins || party.coins; lsSet(LS_PARTY, party); return true; }
  if (coll === 'combat' && v) { const nx = {round: v.round || 0, turn: v.turn || null, list: v.list || []}; if (JSON.stringify(nx) === JSON.stringify(combat)) return false; combat = nx; lsSet(LS_COMBAT, combat); return true; }
  if (['quests','npcs','log'].includes(coll) && v) { const i = party[coll].findIndex(x => x.id === id); const it = Object.assign({}, v, {id}); if (i >= 0) { if (JSON.stringify(party[coll][i]) === JSON.stringify(it)) return false; party[coll][i] = it; } else party[coll].push(it); lsSet(LS_PARTY, party); return true; }
  return false;
}
async function connectBackend(){
  setSync('busy');
  try {
    await BE.start({
      onDoc: (path, v) => { if (v && v.by === BE.client) return; if (applyDoc(path, v)) softRender(); },
      onDel: path => { const [coll, id] = path.split('/'); if (party[coll]) { party[coll] = party[coll].filter(x => x.id !== id); lsSet(LS_PARTY, party); softRender(); } },
      loaded: seen => {
        ORDER.forEach(id => { if (!seen.has('chars/' + id)) save(id); });
        if (!seen.has('party/main') && (party.notes || party.loot)) saveParty();
        if (!seen.has('combat/main') && combat.list.length) saveCombat();
        ['quests','npcs','log'].forEach(coll => party[coll].forEach(it => { if (!seen.has(coll + '/' + it.id)) saveItem(coll, it); }));
        render();
      },
      onRolls: rows => { rolls = rows.map(rowToRoll); softRender(); },
      onRoll: r => { const x = rowToRoll(r); rolls.unshift(x); rolls = rolls.slice(0, 40); softRender(); toast(`${x.who ? x.who + ': ' : ''}${x.label} ${x.total}`); },
      status: s => setSync(s)
    });
    setSync('ok');
  } catch(e){ setSync('local'); toast('Could not reach the party database. Working on this device for now.'); }
}
function rowToRoll(r){ return {who: r.who || '', label: r.label || '', total: r.total, detail: r.detail || '', nat: r.nat, at: new Date(r.created_at).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'})}; }
async function connect(){
  if (BE) return connectBackend();
  try {
    if (!window.claude || !window.claude.use) return;
    const db = await window.claude.use('db'); if (!db) return;
    DB = db; setSync('ok');
    try { const user = await window.claude.use('user'); if (user && user.can) { const w = await user.can('data.write'); if (w === false) { canWrite = false; setSync('local'); } } } catch(e){}
    let first = true;
    db.collection('chars').onSnapshot(snap => {
      let changed = false;
      if (first) { first = false; const seen = new Set(snap.docs.map(d => d.id)); ORDER.forEach(id => { if (!seen.has(id) && canWrite && JSON.stringify(chars[id]) !== JSON.stringify(normalised(SHEETS[id]))) save(id); }); }
      snap.docs.forEach(d => { const v = d.data(); if (v && v.state && SHEETS[d.id] && v.state.v === SHEETS[d.id].v && !d.metadata.hasPendingWrites) {
        const st = clone(v.state); normalise(st);
        if (JSON.stringify(st) !== JSON.stringify(chars[d.id])) { chars[d.id] = st; changed = true; } } });
      if (changed) { lsSet(LS_KEY, chars); softRender(); }
    }, () => setSync('local'));
    db.doc('combat/main').onSnapshot(s => { const v = s.exists && s.data(); if (v && !s.metadata.hasPendingWrites) { if (applyDoc('combat/main', v)) softRender(); } else if (!v && canWrite && combat.list.length) saveCombat(); }, () => {});
    db.doc('texts/custom').onSnapshot(s => { const v = s.exists && s.data(); if (v && v.map && JSON.stringify(v.map) !== JSON.stringify(texts)) { texts = clone(v.map); lsSet(LS_TEXT, texts); softRender(); } }, () => {});
    db.doc('party/main').onSnapshot(s => { const v = s.exists && s.data(); if (v && !s.metadata.hasPendingWrites) { party.notes = v.notes || ''; party.loot = v.loot || ''; party.coins = v.coins || party.coins; lsSet(LS_PARTY, party); softRender(); } else if (!v && canWrite && (party.notes || party.loot)) saveParty(); }, () => {});
    ['quests','npcs','log'].forEach(coll => db.collection(coll).onSnapshot(s => {
      const items = s.docs.map(d => Object.assign({}, d.data(), {id: d.id}));
      if (!items.length && party[coll].length && canWrite) { party[coll].forEach(it => saveItem(coll, it)); return; }
      party[coll] = items; lsSet(LS_PARTY, party); softRender();
    }, () => {}));
  } catch(e){ setSync('local'); }
}
// re-render without trampling something the viewer is typing into
function softRender(){ const a = document.activeElement; if (a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT') && !a.closest('#scrim')) return; render(); }

// ---------- text lookup ----------
function textFor(key, fallback, own){ const t = texts[key]; return t ? {h:t.h, mine:true} : {h:fallback, own:!!own}; }
function plainToHtml(t){ return String(t).trim().split(/\n{2,}/).map(p => '<p>' + esc(p).replace(/\n/g,'<br>') + '</p>').join(''); }
function provenance(t, url, key){
  let h = '';
  if (t.mine) h = `<p class="own">Your own text. <button class="btn sm ghost" data-act="cleartext" data-key="${esc(key)}">Remove</button></p>`;
  else if (t.own) h = `<p class="own">Summary.${url ? ` <a href="${url}" target="_blank" rel="noopener">Full text on 5e.tools</a>` : ''}</p>`;
  else if (url) h = `<p class="note"><a href="${url}" target="_blank" rel="noopener">Open on 5e.tools</a></p>`;
  if (!t.mine && key) h += `<p><button class="btn sm ghost" data-act="edittext" data-key="${esc(key)}">Use your own text</button></p>`;
  return h;
}

// ---------- link context: what grants what, what modifies what ----------
function grantLink(c, entry){
  if (!entry) return '';
  const s = entry.src;
  if (s === 'sub') { const f = (R.subclasses[c.sub] || []).find(x => /Spells$/.test(x.n)); return f ? lk('sf', f.n, `${c.subName}: ${f.n}`) : esc(c.subName); }
  if (s === 'tome') return lk('opt', 'pact of the tome', 'Pact of the Tome (Book of Shadows)');
  if (s === 'mark') return lk('feat', 'mark of warding', 'Mark of Warding');
  if (s === 'mi') return lk('feat', 'magic initiate', 'Magic Initiate');
  if (s === 'arcanum') return lk('cf', 'Mystic Arcanum', `Mystic Arcanum (${ord(entry.arc)})`);
  return esc(c.cls + ' spell list');
}
function modifiersOf(c, k){
  const out = [];
  (c.invocations || []).forEach(n => { if (TARGET_INV.includes(n.toLowerCase()) && c.invTargets[n] === k) out.push(lk('opt', n.toLowerCase(), n)); });
  const sp = R.spells[k];
  if (c.sub === 'Celestial' && c.level >= 6 && sp && /(Radiant|Fire) damage/.test(sp.h)) out.push(lk('sf','Radiant Soul','Radiant Soul'));
  if (c.sub === 'Aberrant' && c.level >= 6 && sp && sp.l > 0 && spellList(c).some(s => s.k === k && s.src === 'sub')) out.push(lk('sf','Psionic Sorcery','Psionic Sorcery'));
  if (c.cls === 'Sorcerer') out.push(...c.metamagic.map(n => lk('opt', n.toLowerCase(), n)));
  return out;
}
function invContext(c, name){
  const n = name.toLowerCase();
  if (TARGET_INV.includes(n)) {
    const t = c.invTargets[name];
    const opts = spellList(c).filter(s => R.spells[s.k].l === 0 && /damage/i.test(R.spells[s.k].h));
    return `<div class="callout">Applies to: ${t && R.spells[t] ? lk('spell', t, R.spells[t].n) : 'nothing chosen'}
      <div class="field" style="margin:6px 0 0"><label for="it-${esc(n.replace(/\s/g,'-'))}">Change cantrip</label><select id="it-${esc(n.replace(/\s/g,'-'))}" data-invtarget="${esc(name)}">${opts.map(s => `<option value="${esc(s.k)}" ${s.k === t ? 'selected' : ''}>${esc(R.spells[s.k].n)}</option>`).join('')}</select></div></div>`;
  }
  if (n === 'pact of the tome') {
    const t = spellList(c).filter(s => s.src === 'tome');
    return `<div class="callout">Your Book of Shadows: ${t.map(s => lk('spell', s.k, R.spells[s.k].n)).join(', ') || 'empty'} <button class="btn sm" data-addspells="tome">Change</button></div>`;
  }
  return '';
}
function featContext(c, name){
  if (name === 'Magic Initiate') { const t = spellList(c).filter(s => s.src === 'mi'); return `<div class="callout">Your picks: ${t.map(s => lk('spell', s.k, R.spells[s.k].n)).join(', ')}</div>`; }
  if (name === 'Mark of Warding') { const t = spellList(c).filter(s => s.src === 'mark'); return `<div class="callout">Always prepared: ${t.map(s => lk('spell', s.k, R.spells[s.k].n)).join(', ')}</div>`; }
  return '';
}

// ---------- rendering ----------
const ICON = {
 combat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20 14 10M14 10l3-6 3 3-6 3M4 20l-1 1M7 17l2 2"/></svg>',
 spells:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l1.8 4.6L18.5 9l-4.7 1.6L12 15l-1.8-4.4L5.5 9l4.7-1.4z"/><path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg>',
 features:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 4h11l3 3v13H5z"/><path d="M8 10h8M8 14h8M8 18h5"/></svg>',
 skills:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 8v8M8.5 10l7 4M15.5 10l-7 4"/></svg>',
 notes:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h7M9 8h3"/></svg>'
};
const TABS = [['combat','Combat'],['spells','Spells'],['features','Features'],['skills','Abilities'],['notes','Details']];

function render(){
  // keep focus and cursor in whatever field the viewer is in, so a re-render never steals their typing
  const ae = document.activeElement, keep = ae && ae.id && !ae.closest('#scrim') && /INPUT|TEXTAREA|SELECT/.test(ae.tagName) ? {id: ae.id, s: ae.selectionStart, e: ae.selectionEnd} : null;
  renderInner();
  if (keep) { const n = document.getElementById(keep.id); if (n) { n.focus({preventScroll:true}); try { if (keep.s != null) n.setSelectionRange(keep.s, keep.e); } catch(_){} } }
}
function renderInner(){
  if (!PAGES.includes(ui.cur)) ui.cur = 'party';
  const isInit = ui.cur === 'init', isParty = ui.cur === 'party' || isInit;
  const c = isParty ? null : chars[ui.cur];
  document.body.dataset.c = ui.cur;
  const app = document.getElementById('app');
  const bar = PCS.map(id => `<button class="pc" data-go="${id}" aria-current="${id === ui.cur}">${esc(chars[id].name)}</button>`).join('') + `<button class="pc" data-go="party" aria-current="${ui.cur === 'party'}">Party</button><button class="pc" data-go="init" aria-current="${isInit}">Initiative${inFight() ? ' <i class="live" aria-label="in progress"></i>' : ''}</button><button class="pc dicechip" data-dice aria-label="Dice tray">Dice</button>`;
  let main;
  if (isInit) main = renderInit();
  else if (isParty) main = renderParty();
  else {
    const tab = ui.tab[ui.cur] || 'combat';
    main = renderHero(c) + renderVitals(c) + ({combat:renderCombat, spells:renderSpells, features:renderFeatures, skills:renderSkills, notes:renderNotes}[tab])(c);
  }
  app.innerHTML = `${installBanner()}<nav class="party" aria-label="Party">${bar}</nav><main>${main}</main>
   <div style="height:24px"></div>`;
  setSync(syncState);
  const tb = document.getElementById('tabs');
  if (isParty) tb.hidden = true;
  else { tb.hidden = false; const tab = ui.tab[ui.cur] || 'combat'; tb.innerHTML = `<div class="in">${TABS.map(([k,n]) => `<button data-tab="${k}" aria-current="${k === tab}">${ICON[k]}${n}</button>`).join('')}</div>`; }
  lsSet(LS_UI, ui);
}
const portraitUrls = {};
function avatar(c, size){
  const p = c.portrait, u = p && portraitUrls[p];
  if (p && !u && BE) BE.url(p).then(x => { portraitUrls[p] = x; softRender(); }).catch(() => {});
  const ini = esc((c.name || '?').slice(0,1));
  return `<button class="avatar ${size}" data-portrait="${esc(c.id)}" aria-label="Portrait of ${esc(c.name)}">${u ? `<img src="${u}" alt="">` : `<span>${ini}</span>`}</button>`;
}
// ---------- install-as-app banner (hosted version only) ----------
let installEvt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; softRender(); });
window.addEventListener('appinstalled', () => { installEvt = null; ui.noInstall = true; lsSet(LS_UI, ui); softRender(); });
const isStandalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function installBanner(){
  if (!BE || ui.noInstall || isStandalone()) return '';
  const how = installEvt ? 'Install it like an app: it opens full-screen and stays signed in.'
    : isIOS() ? 'Install it like an app: tap the Share button, then Add to Home Screen.'
    : 'Install it like an app: open your browser menu and choose Install app or Add to Home screen.';
  return `<div class="installbar" role="region" aria-label="Install the app"><span class="main">${how}</span>${installEvt ? '<button class="btn sm pri" data-install>Install</button>' : ''}<button class="xs" data-noinstall aria-label="Dismiss">×</button></div>`;
}
const syncChip = () => `<span class="sync" data-s="${syncState}"><i></i><span></span></span>`;
function renderHero(c){
  return `<header class="hero"><div class="who">${avatar(c, 'lg')}<h1>${esc(c.name)}</h1></div>
   <div class="lvl"><span class="n">${c.level}</span><small>Level</small></div>
   <div class="sub"><b>${esc(c.sub)} ${esc(c.cls)}</b> · ${esc(c.species)} · ${esc(c.bg)} ${syncChip()}${c.aka ? `<br><span class="note">Also: ${esc(c.aka)}</span>` : ''}</div>
   <div class="herobtns">
    <button class="btn pri" data-act="levelup" ${c.level >= 20 ? 'disabled' : ''}>${c.level >= 20 ? 'Level 20 reached' : 'Level up to ' + (c.level + 1)}</button>
    <button class="btn" data-act="rest-short">Short rest</button><button class="btn" data-act="rest-long">Long rest</button>
   </div></header>`;
}
function renderVitals(c){
  const d = D(c), pct = Math.max(0, Math.min(100, c.hp / c.hpMax * 100));
  const ac = c.ac2 && used(c,'armorOn') ? c.ac2 : c.ac;
  return `<section class="vitals">
    <div class="vt hpbox" data-act="hp" role="button" tabindex="0"><span class="k">Hit points</span><span class="v">${c.hp}<small> / ${c.hpMax}${c.temp ? ` +${c.temp}` : ''}</small></span><span class="bar ${pct <= 25 ? 'crit' : pct <= 50 ? 'low' : ''}"><i style="width:${pct}%"></i></span></div>
    <div class="vt" ${c.ac2 ? 'data-act="armor" role="button" tabindex="0"' : ''}><div class="k">AC</div><div class="v">${ac}</div><div class="s">${c.ac2 ? (used(c,'armorOn') ? esc(c.ac2Label || 'Alternative') : 'tap: ' + esc((c.ac2Label || 'alt').split(' ')[0])) : ''}</div></div>
    <div class="vt" data-roll="init" role="button" tabindex="0"><div class="k">Init</div><div class="v">${sgn(d.init)}</div><div class="s">${c.initAdv ? 'Advantage' : 'tap to roll'}</div></div>
    <div class="vt"><div class="k">Prof</div><div class="v">${sgn(d.pb)}</div><div class="s">bonus</div></div>
   </section>
   <section class="mini"><div class="vt"><div class="k">Speed</div><div class="v" style="font-size:15px">${esc(c.speed)}${c.exhaustion ? `<span class="s" style="display:block">−${c.exhaustion * 5} ft</span>` : ''}</div></div>
   <div class="vt"><div class="k">Passive Perc.</div><div class="v">${d.passive}</div></div>
   <div class="vt" data-act="insp" role="button" tabindex="0"><div class="k">Heroic Insp.</div><div class="v">${used(c,'insp') ? '★' : '☆'}</div></div></section>
   ${statusStrip(c)}
   ${c.hp <= 0 ? renderDeath(c) : ''}`;
}
// ---------- active effects, defences ----------
const inFight = () => combat.round > 0 && combat.list.some(e => !e.standby);
function roundsOf(dur){ const m = String(dur || '').match(/(\d+)\s*(round|minute)/i); if (!m) return 0; return /round/i.test(m[2]) ? +m[1] : +m[1] * 10; }
function untilFor(dur){ const n = roundsOf(dur); return inFight() && n && n <= 100 ? combat.round + n - 1 : null; }
const untilTxt = u => u == null ? '' : combat.round > u ? ' (time is up)' : ` (to round ${u})`;
function addEffect(c, e){ const ex = e.k && c.effects.find(x => x.k === e.k); if (ex) { if (e.mm) ex.mm = e.mm; else delete ex.mm; const u2 = untilFor(e.dur); if (u2 != null) ex.until = u2; return; } e.id = uid(); const u = untilFor(e.dur); if (u != null) e.until = u; delete e.dur; c.effects.push(e); }
// everything currently running on a character, for the sheet and the DM's overview
function activeList(c){
  const d = D(c), out = [];
  if (c.ac2 && used(c,'armorOn')) out.push({n: c.ac2Label || 'Alternative AC', note: `AC ${c.ac2}`, k: /mage armor/i.test(c.ac2Label || '') ? 'mage armor' : '', rm:'armor'});
  if (d.innate) out.push({n:'Innate Sorcery', note:`spell save DC ${d.dc}, Advantage on spell attacks`, ref:'cf|Innate Sorcery', rm:'innate', until: c.used.innateUntil});
  c.effects.forEach(e => out.push({n: e.n, note: e.note || '', k: e.k || '', rm: e.id, until: e.until, mm: e.mm}));
  return out;
}
const effLink = (x) => (x.k && R.spells[x.k] ? lk('spell', x.k, x.n) : x.ref ? lk(x.ref.split('|')[0], x.ref.split('|').slice(1).join('|'), x.n) : esc(x.n)) + esc(mmTag(x.mm));
const splitList = v => String(v || '').split(/[,;\n]+/).map(x => x.trim()).filter(Boolean);
function defences(c){
  const L = c.level, out = {res:[], imm:[], cimm:[], adv:[], senses:[], other:[]};
  const add = (k, t, src) => out[k].push({t, src});
  if (c.sub === 'Celestial' && L >= 6) add('res', 'Radiant', lk('sf','Radiant Soul','Radiant Soul'));
  if (c.sub === 'Aberrant' && L >= 6) { add('res', 'Psychic', lk('sf','Psychic Defenses','Psychic Defenses')); add('adv', 'Saves to avoid or end Charmed and Frightened', lk('sf','Psychic Defenses','Psychic Defenses')); }
  if (c.species === 'Tabaxi') add('senses', 'Darkvision 60 ft', lk('species','Darkvision','Darkvision'));
  if (hasInv(c, "Devil's Sight")) add('senses', 'Sees normally in magical and nonmagical Darkness, 120 ft', lk('opt',"devil's sight","Devil's Sight"));
  if (hasInv(c, 'Witch Sight')) add('senses', 'Sees through illusions and shapechangers, 30 ft', lk('opt','witch sight','Witch Sight'));
  if (c.cls === 'Rogue' && L >= 5) add('other', 'Reaction: halve an attack\'s damage', lk('cf','Uncanny Dodge','Uncanny Dodge'));
  if (c.cls === 'Rogue' && L >= 7) add('other', 'Dex saves for half: no damage on a success', lk('cf','Evasion','Evasion'));
  if (c.cls === 'Rogue' && L >= 18) add('other', 'Attacks never have Advantage against them', lk('cf','Elusive','Elusive'));
  if (c.sub === 'Celestial' && L >= 10) add('other', 'Temporary HP after each rest', lk('sf','Celestial Resilience','Celestial Resilience'));
  splitList(c.resist).forEach(t => add('res', t)); splitList(c.immune).forEach(t => add('imm', t)); splitList(c.condImmune).forEach(t => add('cimm', t));
  splitList(c.senses).forEach(t => add('senses', t)); splitList(c.defNotes).forEach(t => add('other', t));
  return out;
}
const defTxt = arr => arr.map(x => x.src ? `${esc(x.t)} <span class="m">(${x.src})</span>` : esc(x.t)).join(', ');
function statusStrip(c){
  const bits = [];
  if (c.conc && R.spells[c.conc]) bits.push(`<span class="stat conc">Concentrating: ${lk('spell', c.conc, R.spells[c.conc].n)}${esc(mmTag(c.concMm))}${esc(untilTxt(c.concUntil))} <button class="xs" data-act="dropconc" aria-label="Drop concentration">Drop</button></span>`);
  activeList(c).forEach(x => bits.push(`<span class="stat act"><span>${effLink(x)}${x.note ? ` <span class="m">${esc(x.note)}</span>` : ''}${esc(untilTxt(x.until))}</span> <button class="xs" data-uneff="${esc(x.rm)}" aria-label="End ${esc(x.n)}">End</button></span>`));
  c.conditions.forEach(k => { const g = R.gloss['cond|' + k]; if (g) bits.push(`<span class="stat">${lk('cond', k, g.n)} <button class="xs" data-uncond="${esc(k)}" aria-label="Remove ${esc(g.n)}">×</button></span>`); });
  if (c.exhaustion) bits.push(`<span class="stat">${lk('cond','exhaustion','Exhaustion')} ${c.exhaustion}: −${c.exhaustion * 2} to d20 tests</span>`);
  return bits.length ? `<div class="stats">${bits.join('')}</div>` : '';
}
function endEffect(c, rm){
  if (rm === 'armor') c.used.armorOn = 0;
  else if (rm === 'innate') { c.used.innateOn = 0; delete c.used.innateUntil; }
  else c.effects = c.effects.filter(e => e.id !== rm);
}
function toggleInnate(c){
  if (used(c,'innateOn')) { endEffect(c, 'innate'); commit(c); toast('Innate Sorcery ends'); return; }
  if (used(c,'innate') < 2) c.used.innate = used(c,'innate') + 1;
  else if (c.level >= 7 && spLeft(c) >= 2) { c.used.sp = used(c,'sp') + 2; toast('Sorcery Incarnate: 2 Sorcery Points spent'); }
  else { toast(c.level >= 7 ? 'No uses or Sorcery Points left' : 'No uses left. They come back on a Long Rest.'); return; }
  c.used.innateOn = 1; const u = untilFor('1 minute'); if (u != null) c.used.innateUntil = u;
  commit(c); toast(`Innate Sorcery active: spell save DC ${D(c).dc}, Advantage on spell attacks`);
}
// Font of Magic: Sorcery Points into spell slots and back again
function fontDrawer(c){
  const r = row(c), left = spLeft(c), slots = slotsOf(c);
  const make = FONT.map(([lv, cost, minL]) => c.level < minL ? '' :
    `<button class="btn ${left >= cost ? '' : 'dim'}" data-mkslot="${lv}" ${left >= cost ? '' : 'disabled'}>${ord(lv)}-level slot <span class="m">${cost} points</span></button>`).join('');
  const brk = slots.filter(s => s.left).map(s => `<button class="btn" data-brkslot="${s.lv}" ${left >= r.sp ? 'disabled' : ''}>Spend a ${ord(s.lv)}-level slot <span class="m">${left >= r.sp ? 'points full' : `+${Math.min(s.lv, r.sp - left)} point${Math.min(s.lv, r.sp - left) === 1 ? '' : 's'}`}</span></button>`).join('');
  const made = slots.filter(s => s.x).map(s => `${s.x} × ${ord(s.lv)}`).join(', ');
  const body = `<div class="fontsp"><span class="big">${left}</span><span>of ${r.sp} Sorcery Points left</span></div>
    ${made ? `<p class="note">Created slots ready to use: <b>${made}</b>. They vanish on a Long Rest.</p>` : ''}
    <h4>Create a spell slot <span class="m">${lk('rule','bonus action','Bonus Action')}</span></h4>
    <div class="fontgrid">${make || '<p class="note">You can create slots from Sorcerer level 2.</p>'}</div>
    <h4>Turn a spell slot into points <span class="m">no action</span></h4>
    <div class="fontgrid">${brk || '<p class="note">No spell slots left to convert.</p>'}</div>
    ${left >= r.sp && slots.some(s => s.left) ? '<p class="note">You are at your maximum, so a slot would give no points.</p>' : ''}
    <p class="note">Slots you create stack on top of your normal ones and show as outlined pips on the Spells tab. ${lk('cf','Font of Magic','Font of Magic rules')}</p>`;
  openDrawer('Font of Magic', body, '', el => el.addEventListener('click', e => {
    const mk = e.target.closest('[data-mkslot]'), bk = e.target.closest('[data-brkslot]');
    if (mk) { const [lv, cost] = FONT[+mk.dataset.mkslot - 1]; if (spLeft(c) < cost) return; c.used.sp = used(c,'sp') + cost; c.used['x'+lv] = used(c,'x'+lv) + 1; commit(c); fontDrawer(c); toast(`${ord(lv)}-level slot created for ${cost} Sorcery Points`); }
    if (bk) { const lv = +bk.dataset.brkslot, s = slotsOf(c).find(x => x.lv === lv); if (!s || !s.left) return;
      if (s.max - used(c,'s'+lv) > 0) c.used['s'+lv] = used(c,'s'+lv) + 1; else c.used['x'+lv] = s.x - 1;
      const gain = Math.min(lv, r.sp - spLeft(c)); c.used.sp = Math.max(0, used(c,'sp') - gain); commit(c); fontDrawer(c); toast(`${ord(lv)}-level slot spent: +${gain} Sorcery Point${gain === 1 ? '' : 's'}`); }
  }), () => fontDrawer(c));
}
function effectDrawer(c){
  const sug = ['Dodging','Hidden','Bless','Haste','Bardic Inspiration','Guidance','Help (Advantage)','Heroism','Shield of Faith'];
  openDrawer('Add an effect', `<p class="note">For anything running on ${esc(c.name)} that the table should see: a buff from someone else, a disguise, a feature you switched on. Spells you cast from this app are added for you.</p>
    <div class="field"><label for="ef-n">Effect</label><input id="ef-n" list="ef-sug" placeholder="Bless, Hidden, Rage…"><datalist id="ef-sug">${sug.map(x => `<option value="${esc(x)}">`).join('')}</datalist></div>
    <div class="field"><label for="ef-note">Detail (optional)</label><input id="ef-note" placeholder="+1d4 to attacks and saves"></div>
    ${inFight() ? '<label class="pick" style="border:0"><input type="checkbox" id="ef-min"><div class="main">Lasts 1 minute (10 rounds) from now</div></label>' : ''}
    <div class="chips">${sug.map(x => `<button class="chip" data-sug="${esc(x)}">${esc(x)}</button>`).join(' ')}</div>`,
    '<button class="btn pri" data-ok>Add</button>', el => {
      setTimeout(() => el.querySelector('#ef-n').focus(), 50);
      el.addEventListener('click', e => {
        const sg = e.target.closest('[data-sug]'); if (sg) { el.querySelector('#ef-n').value = sg.dataset.sug; return; }
        if (!e.target.closest('[data-ok]')) return;
        const n = el.querySelector('#ef-n').value.trim(); if (!n) { toast('Give the effect a name'); return; }
        const k = R.spells[n.toLowerCase()] ? n.toLowerCase() : '';
        const m = el.querySelector('#ef-min');
        addEffect(c, {n, note: el.querySelector('#ef-note').value.trim(), k, dur: m && m.checked ? '1 minute' : ''});
        commit(c); closeDrawer(); toast(n + ' added');
      });
    });
}
function renderDeath(c){
  const pips = (id,n) => Array.from({length:3}, (_,i) => `<button class="pip" data-pip="${id}" data-i="${i}" data-used="${i < n ? 0 : 1}" aria-label="${id} ${i+1}"></button>`).join('');
  return `<div class="card" style="padding:10px 12px;margin-bottom:12px"><div class="dsave"><b>${lk('rule','death saving throw','Death saves')}</b>
   <span class="s">Successes <span class="pips">${pips('dS', used(c,'dS'))}</span></span>
   <span class="f">Failures <span class="pips">${pips('dF', used(c,'dF'))}</span></span>
   <button class="btn sm" data-roll="death">Roll</button></div></div>`;
}
function atkCalc(c, a){
  const d = D(c);
  const abm = a.ab === 'spell' ? d.cm : (a.ab ? d.m[a.ab] : 0);
  let hit = '', hitMod = null, dmg = '', expr = '', extra = '';
  if (a.kind === 'atk') { hitMod = d.pb + abm + (a.magic || 0); hit = sgn(hitMod); }
  if (a.kind === 'save') hit = `DC ${a.ab === 'spell' || a.sp ? d.dc : 8 + d.pb + abm} ${a.save}`;
  if (a.die === 'sneak') { const n = cl(c).table[c.level-1].sa; dmg = expr = `${n}d6`; if (c.sub === 'Assassin') extra = ` · +${c.level} in round 1`; }
  else {
    let [n, f] = a.die.split('d'); n = +n;
    let flat = 0; const fm = f.match(/^(\d+)([+-]\d+)?$/); if (fm) { f = fm[1]; flat = +(fm[2] || 0); }
    if (a.scale === 'cantrip') n = n * d.tier;
    const plus = (a.addMod ? abm : 0) + flat;
    expr = `${n}d${f}${plus ? (plus > 0 ? '+' + plus : plus) : ''}`;
    dmg = expr;
    if (a.scale === 'beams') { const agon = c.invTargets['Agonizing Blast'] === a.sp ? d.cm : 0; expr = `1d${f}${agon ? '+' + agon : ''}`; dmg = `${d.tier} × ${expr}`; }
  }
  let rng = a.rng || (a.sp && R.spells[a.sp] ? R.spells[a.sp].r : '');
  if (a.sp && c.invTargets['Eldritch Spear'] === a.sp) rng = `${(parseInt(R.spells[a.sp].r, 10) || 120) + 30 * c.level} ft`;
  const adv = a.kind === 'atk' && a.ab === 'spell' && d.innate;
  return {hit, hitMod, dmg, expr, extra: extra + (adv ? ' · Advantage' : ''), rng, adv, beams: a.scale === 'beams' ? d.tier : 1};
}
function atkRows(c){
  return (c.attacks || []).map((a,i) => {
    const x = atkCalc(c, a);
    return `<button class="row tap" data-atk="${i}"><div class="main"><div class="t">${esc(a.n)}</div><div class="m">${esc(x.rng)}${x.rng ? ' · ' : ''}${esc(a.type)}${esc(x.extra)}</div></div>
     <div class="r"><div class="big">${esc(x.hit)}</div><div class="m">${esc(x.dmg)}</div></div></button>`;
  }).join('');
}
function resRows(c){
  return resources(c).map(r => {
    const left = Math.max(0, r.max - used(c, r.id));
    const ctl = r.pips
      ? `<div class="pips">${Array.from({length:r.max}, (_,i) => `<button class="pip" data-res="${r.id}" data-i="${i}" data-used="${i < left ? 0 : 1}" aria-label="${esc(r.n)} ${i+1}"></button>`).join('')}</div>`
      : `<div class="counter"><button data-cnt="${r.id}" data-d="1" aria-label="Spend one">−</button><b>${left}/${r.max}</b><button data-cnt="${r.id}" data-d="-1" aria-label="Regain one">+</button></div>`;
    const [ty, ...rest] = (r.ref || '').split('|');
    return `<div class="res"><div class="main"><div class="t">${r.ref ? lk(ty, rest.join('|'), r.n) : esc(r.n)}</div><div class="m">${esc(r.sub)}${r.roll === 'heal' ? ` <button class="btn sm" data-roll="heal">Roll</button>` : ''}${r.btn ? ` <button class="btn sm ${r.btn[0] === 'innate' && used(c,'innateOn') ? 'pri' : ''}" data-act="${r.btn[0]}">${r.btn[1]}</button>` : ''}</div></div>${ctl}</div>`;
  }).join('');
}
function quickActions(c){
  const L = c.level, q = [], sl = spellList(c);
  const sp = k => sl.some(s => s.k === k) ? lk('spell', k, R.spells[k].n) : '';
  const BA = lk('rule','bonus action','Bonus Action'), RE = lk('rule','reaction','Reaction');
  if (c.cls === 'Rogue') {
    q.push([BA, `${lk('cf','Cunning Action','Cunning Action')}: ${lk('act','dash','Dash')}, ${lk('act','disengage','Disengage')} or ${lk('act','hide','Hide')}`]);
    if (L >= 3) q.push([BA, `${lk('cf','Steady Aim','Steady Aim')}: ${lk('rule','advantage','Advantage')} on your next attack this turn if you haven't moved`]);
    if (L >= 5) q.push([RE, `${lk('cf','Uncanny Dodge','Uncanny Dodge')}: halve the damage of an attack that hits you`]);
    if (L >= 5) q.push(['On Sneak Attack', `${lk('cf','Cunning Strike','Cunning Strike')}: ${lk('cf','Poison (Cost: 1d6)','Poison')} (1d6), ${lk('cf','Trip (Cost: 1d6)','Trip')} (1d6), ${lk('cf','Withdraw (Cost: 1d6)','Withdraw')} (1d6)${L >= 14 ? `, ${lk('cf','Daze (Cost: 2d6)','Daze')} (2d6), ${lk('cf','Knock Out (Cost: 6d6)','Knock Out')} (6d6), ${lk('cf','Obscure (Cost: 3d6)','Obscure')} (3d6)` : ''}. Save DC ${8 + D(c).pb + D(c).m.dex}`]);
    if (L >= 7) q.push(['Passive', `${lk('cf','Evasion','Evasion')} and ${lk('cf','Reliable Talent','Reliable Talent')}`]);
  }
  if (c.cls === 'Warlock') {
    if (c.sub === 'Celestial') q.push([BA, `${lk('sf','Healing Light','Healing Light')}: spend d6s from the pool, 60 ft`]);
    if (sp('hex')) q.push([BA, `${sp('hex')}: +1d6 Necrotic on your hits, move it with a Bonus Action`]);
  }
  if (c.cls === 'Sorcerer') {
    q.push([BA, `${lk('cf','Innate Sorcery','Innate Sorcery')} (2 per Long Rest)`]);
    if (c.sub === 'Aberrant') q.push([BA, `${lk('sf','Telepathic Speech','Telepathic Speech')}, 30 ft`]);
    if (sp('shield')) q.push([RE, `${sp('shield')}: +5 AC until your next turn`]);
    q.push([BA, `${lk('cf','Font of Magic','Font of Magic')}: convert spell slots and Sorcery Points`]);
  }
  if (sp('counterspell')) q.push([RE, `${sp('counterspell')}, 60 ft`]);
  if (c.species === 'Changeling') q.push([lk('rule','action','Action'), `${lk('species','Shapechanger','Shapechanger')}: change appearance and voice`]);
  q.push(['Anyone', ['dodge','help','ready','search','study','influence','utilize'].map(k => R.gloss['act|' + k] ? lk('act', k, R.gloss['act|' + k].n) : '').filter(Boolean).join(', ')]);
  return `<h2 class="sec">Other options</h2><div class="card list">${q.map(([k,t]) => `<div class="row"><div class="main"><div class="m">${k}</div><div>${t}</div></div></div>`).join('')}</div>`;
}
function rollStrip(){
  if (!rolls.length) return '';
  const r = rolls[0];
  return `<div class="rollstrip" data-act="rolllog" role="button" tabindex="0"><span class="rv ${r.nat === 20 ? 'n20' : r.nat === 1 ? 'n1' : ''}">${esc(r.total)}</span><span class="main"><b>${esc(r.label)}</b><br><span class="m">${esc(r.detail)}</span></span><span class="m">History</span></div>`;
}
function turnBar(c){
  if (!inFight() || !combat.turn) return '';
  const cur = combat.list.find(e => e.id === combat.turn); if (!cur) return '';
  const nx = nextEntry(1), mine = cur.pc === (c && c.id), next = nx && c && nx.pc === c.id && !mine;
  return `<div class="turnbar ${mine ? 'mine' : next ? 'next' : ''}" data-go="init" role="button" tabindex="0"><span class="rnd">Round ${combat.round}</span><span class="main">${mine ? '<b>Your turn</b>' : `<b>${esc(eName(cur))}</b>'s turn`}${next ? ' · you are next' : nx && !mine ? ` · then ${esc(eName(nx))}` : ''}</span><span class="m">Tracker ›</span></div>`;
}
function renderCombat(c){
  const act = activeList(c);
  return `${turnBar(c)}${rollStrip()}<h2 class="sec">Attacks <span class="aside">tap to roll <button class="btn sm" data-act="editattacks">Edit</button></span></h2><div class="card list">${atkRows(c)}</div>
   <h2 class="sec">Conditions <span class="aside"><button class="btn sm" data-act="addcond">Add or remove</button></span></h2>
   <div class="card list">${c.conditions.length ? `<div class="row"><div class="main">${c.conditions.map(k => R.gloss['cond|'+k] ? lk('cond', k, R.gloss['cond|'+k].n) : '').join(', ')}</div></div>` : '<div class="row"><div class="main note">No conditions.</div></div>'}
   <div class="res"><div class="main"><div class="t">${lk('cond','exhaustion','Exhaustion')}</div><div class="m">Each level: −2 to d20 tests and −5 ft Speed. Level 6 is death.</div></div><div class="counter"><button data-exh="-1" aria-label="Lower exhaustion">−</button><b>${c.exhaustion}</b><button data-exh="1" aria-label="Raise exhaustion">+</button></div></div></div>
   <h2 class="sec">Active effects <span class="aside"><button class="btn sm" data-act="addeff">Add</button></span></h2>
   <div class="card list">${c.conc && R.spells[c.conc] ? `<div class="row"><div class="main"><div class="m">Concentrating${esc(untilTxt(c.concUntil))}</div>${lk('spell', c.conc, R.spells[c.conc].n)}${esc(mmTag(c.concMm))}</div><button class="btn sm" data-act="dropconc">Drop</button></div>` : ''}${act.map(x => `<div class="row"><div class="main"><div>${effLink(x)}</div>${x.note || x.until != null ? `<div class="m">${esc(x.note)}${esc(untilTxt(x.until))}</div>` : ''}</div><button class="btn sm" data-uneff="${esc(x.rm)}">End</button></div>`).join('')}${!act.length && !c.conc ? '<div class="row"><div class="main note">Nothing running. Spells you cast here appear automatically.</div></div>' : ''}</div>
   ${quickActions(c)}
   <h2 class="sec">Resources <span class="aside">tap a pip to spend or regain</span></h2><div class="card list">${resRows(c)}</div>`;
}
const srcChip = s => s.src === 'class' ? '' : `<span class="chip fill">${esc(SRC_LABEL[s.src] || s.src)}</span>`;
function spellRows(c){
  const list = spellList(c), f = ui.filter[ui.cur] || 'all', q = (ui.q[ui.cur] || '').toLowerCase();
  let shown = list.slice();
  if (f === 'prep') shown = shown.filter(s => !s.off);
  else if (f !== 'all') shown = shown.filter(s => String(R.spells[s.k].l) === f);
  if (q) shown = shown.filter(s => R.spells[s.k].n.toLowerCase().includes(q));
  shown.sort((a,b) => R.spells[a.k].l - R.spells[b.k].l || R.spells[a.k].n.localeCompare(R.spells[b.k].n));
  return shown.map(s => {
    const sp = R.spells[s.k];
    const tags = [sp.conc ? '<span class="chip">C</span>' : '', sp.rit ? '<span class="chip">R</span>' : '', /Bonus/.test(sp.t) ? '<span class="chip">BA</span>' : '', /Reaction/.test(sp.t) ? '<span class="chip">Reaction</span>' : '', srcChip(s), s.off ? '<span class="chip">not prepared</span>' : '', c.conc === s.k ? '<span class="chip acc">concentrating</span>' : ''].join(' ');
    return `<button class="row tap ${s.off ? 'off' : ''}" data-sp="${esc(s.k)}"><span class="lv ${sp.l ? '' : 'c'}">${sp.l || 'C'}</span><div class="main"><div class="t">${esc(sp.n)}</div><div class="m">${esc(sp.t.split(',')[0])} · ${esc(sp.r)} ${tags}</div></div></button>`;
  }).join('') || '<div class="row"><div class="main note">No spells match.</div></div>';
}
function renderSpells(c){
  const d = D(c), list = spellList(c), f = ui.filter[ui.cur] || 'all';
  const r = row(c), slots = slotsOf(c);
  const head = `<div class="spellhead"><div class="vt ${d.innate ? 'boost' : ''}"><div class="k">${lk('rule','difficulty class','Save DC')}</div><div class="v">${d.dc}</div>${d.innate ? `<div class="s">Innate +1 (was ${d.baseDc})</div>` : ''}</div><div class="vt ${d.innate ? 'boost' : ''}"><div class="k">${lk('rule','spell attack','Spell attack')}</div><div class="v">${sgn(d.atk)}</div>${d.innate ? '<div class="s">with Advantage</div>' : ''}</div><div class="vt"><div class="k">Ability</div><div class="v" style="font-size:18px">${c.castAb.toUpperCase()} ${sgn(d.cm)}</div></div></div>
    ${c.cls === 'Sorcerer' ? `<div class="innatebar ${d.innate ? 'on' : ''}"><div class="main"><b>${lk('cf','Innate Sorcery','Innate Sorcery')}</b> <span class="m">${d.innate ? `active${esc(untilTxt(c.used.innateUntil))}: DC ${d.dc}, Advantage on spell attacks` : `${2 - used(c,'innate')} of 2 uses left${c.level >= 7 ? ', or 2 Sorcery Points' : ''}`}</span></div><button class="btn sm ${d.innate ? '' : 'pri'}" data-act="innate" aria-pressed="${d.innate}">${d.innate ? 'End' : 'Activate'}</button></div>` : ''}`;
  let slotHtml = '';
  if (c.cls === 'Warlock') slotHtml = `<div class="slotrow"><span class="lbl">${lk('cf','Pact Magic','Pact')} ${ord(r.sl)}</span>${pipsFor(c,'pact',r.slots)}</div>`;
  if (slots.length) slotHtml = slots.map(s => `<div class="slotrow"><span class="lbl">${ord(s.lv)}</span>${pipsFor(c,'s'+s.lv,s.max, s.x)}</div>`).join('');
  if (c.cls === 'Sorcerer' && r.sp) slotHtml += `<div class="slotrow"><span class="lbl">${lk('cf','Font of Magic','Points')}</span><div class="counter"><button data-cnt="sp" data-d="1" aria-label="Spend one">−</button><b>${r.sp - used(c,'sp')}/${r.sp}</b><button data-cnt="sp" data-d="-1" aria-label="Regain one">+</button></div><button class="btn sm pri" data-act="font" style="margin-left:auto">Convert</button></div>`;
  const levels = [...new Set(list.map(s => R.spells[s.k].l))].sort((a,b) => a-b);
  const fl = [['all','All'],['prep','Ready'],...levels.map(l => [String(l), l === 0 ? 'Cantrips' : ord(l)])];
  const warn = checks(c).filter(x => ['can','prep','over'].includes(x.k)).map(x => `<div class="warnbox"><div class="main">${esc(x.msg)}</div>${x.k !== 'over' ? `<button class="btn sm" data-fix="${x.k}">Choose</button>` : ''}</div>`).join('');
  const n = counts(c);
  const addBtns = c.cls === 'Rogue' ? `<button class="btn sm" data-addspells="mi">Change Magic Initiate spells</button>` :
    `<button class="btn sm" data-addspells="class">Add or swap spells</button>${hasInv(c,'Pact of the Tome') ? ' <button class="btn sm" data-addspells="tome">Book of Shadows</button>' : ''}`;
  return `${statusStrip(c) ? '' : ''}<h2 class="sec">Spellcasting</h2>${head}${slotHtml ? `<div class="card list" style="margin-bottom:6px">${slotHtml}</div>` : ''}
   ${warn}
   <h2 class="sec">Spells <span class="aside">${c.cls === 'Rogue' ? '' : `${n.can} cantrips · ${n.prep} prepared`}</span></h2>
   <div class="btnrow">${addBtns}</div>
   <input class="search" id="spq" type="search" placeholder="Search your spells" aria-label="Search your spells" value="${esc(ui.q[ui.cur] || '')}">
   <div class="filters" role="group" aria-label="Filter spells">${fl.map(([k,l]) => `<button data-filter="${k}" aria-pressed="${k === f}">${l}</button>`).join('')}</div>
   <div class="card list" style="margin-top:8px" id="splist">${spellRows(c)}</div>`;
}
function pipsFor(c,id,max,extra){
  const left = Math.max(0, max - used(c,id));
  return `<div class="pips">${Array.from({length:max}, (_,i) => `<button class="pip" data-res="${id}" data-i="${i}" data-used="${i < left ? 0 : 1}" aria-label="slot ${i+1}"></button>`).join('')}${Array.from({length:extra || 0}, (_,i) => `<button class="pip x" data-xslot="${id.slice(1)}" aria-label="Created slot ${i+1}, tap to spend" title="Created with Font of Magic"></button>`).join('')}</div>`;
}
function featBlock(key, name, sub, h, own, url, extra){
  const t = textFor(key, h, own);
  return `<details class="feat"><summary><div class="main"><div class="t">${esc(name)}</div>${sub ? `<div class="m">${esc(sub)}</div>` : ''}</div></summary>
   <div class="body rt">${extra || ''}${t.h}${provenance(t, url, key)}</div></details>`;
}
function renderFeatures(c){
  const L = c.level, C = cl(c);
  let h = checks(c).filter(x => ['inv','meta','mastery'].includes(x.k)).map(x => `<div class="warnbox"><div class="main">${esc(x.msg)}</div><button class="btn sm" data-fix="${x.k}">Choose</button></div>`).join('');
  h += `<h2 class="sec">${esc(c.cls)} <span class="aside">class features to level ${L}</span></h2><div class="card">` +
    C.feats.filter(f => f.lv <= L).map(f => featBlock(`cf:${c.cls}:${f.lv}:${f.n}`, f.n, `Level ${f.lv}`, f.h, false, C.u)).join('') + '</div>';
  const sf = (R.subclasses[c.sub] || []).filter(f => f.lv <= L);
  if (sf.length) h += `<h2 class="sec">${esc(c.subName)}</h2><div class="card">` + sf.map(f => featBlock(`sf:${c.sub}:${f.n}`, f.n, `Level ${f.lv}`, f.h, true, C.u)).join('') + '</div>';
  if (c.cls === 'Warlock') {
    h += `<h2 class="sec">Eldritch Invocations <span class="aside">${c.invocations.length} of ${row(c).inv} <button class="btn sm" data-act="swapinv">Swap</button></span></h2><div class="card">` +
      c.invocations.map(n => { const v = R.invocations.find(x => x.n.toLowerCase() === n.toLowerCase()); return v ? featBlock('inv:' + v.n, v.n, v.lv > 1 ? `Level ${v.lv}+` : '', v.h, false, v.u, invContext(c, v.n)) : ''; }).join('') + '</div>';
  }
  if (c.cls === 'Sorcerer') {
    h += `<h2 class="sec">Metamagic <span class="aside">${c.metamagic.length} of ${metaMax(L)}${c.metamagic.length ? ' <button class="btn sm" data-act="swapmeta">Swap</button>' : ''}</span></h2><div class="card">` +
      (c.metamagic.length ? c.metamagic.map(n => { const v = R.metamagic.find(x => x.n === n); return v ? featBlock('mm:' + v.n, v.n, '', v.h, false, v.u) : ''; }).join('') : '<div class="row"><div class="main note">None chosen yet.</div></div>') + '</div>';
  }
  if (c.cls === 'Rogue') {
    h += `<h2 class="sec">${lk('cf','Weapon Mastery','Weapon Mastery')} <span class="aside"><button class="btn sm" data-fix="mastery">Change</button></span></h2><div class="card list">` +
      (c.masteries.length ? c.masteries.map(w => { const x = R.weapons.find(y => y.n === w); return x ? `<div class="row"><div class="main"><div class="t">${lk('weapon', x.n, x.n)}</div><div class="m">${esc(x.d)} ${esc(x.t)} · ${esc(x.p.join(', '))}</div></div><div class="r">${lk('mast', x.m.toLowerCase(), x.m)}</div></div>` : ''; }).join('') : '<div class="row"><div class="main note">None chosen.</div></div>') +
      `<div class="row"><div class="main"><div class="m">${lk('cf','Expertise','Expertise')}</div>${esc(c.expertise.map(skillName).join(', '))}</div></div></div>`;
  }
  const sp = R.species[c.species] || [];
  h += `<h2 class="sec">${esc(c.species)} <span class="aside">species${c.speciesNote ? ' · ' + esc(c.speciesNote) : ''}</span></h2><div class="card">` +
    sp.map(t => featBlock(`sp:${c.species}:${t.n}`, t.n, '', t.h, c.species !== 'Human', c.species === 'Human' ? 'https://5e.tools/races.html#human_xphb' : `https://5e.tools/races.html#${c.species.toLowerCase()}_mpmm`)).join('') + '</div>';
  h += `<h2 class="sec">Feats & background</h2><div class="card">` + c.feats.map(f => {
      const v = R.feats.find(x => x.n === f.n);
      const body = v && v.h ? v.h : (R.extraFeats[f.n] || '<p>No text stored. Use your own text to add it.</p>');
      const own = v ? !!v.own : !!R.extraFeats[f.n];
      const url = v ? v.u : (f.n === 'Mark of Warding' ? 'https://5e.tools/feats.html#mark%20of%20warding_efa' : '');
      return featBlock('feat:' + f.n, f.n, f.note || '', body, own, url, featContext(c, f.n));
    }).join('') + (c.bg === 'Folk Hero' ? featBlock('bg:rustic', 'Rustic Hospitality', 'Folk Hero background', R.extraFeats['Rustic Hospitality'], true, 'https://5e.tools/backgrounds.html#folk%20hero_phb') : '') + '</div>';
  h += `<h2 class="sec">Proficiencies</h2><div class="card list">` + [['Armour',c.armour],['Weapons',c.weapons],['Tools',c.tools],['Languages',c.languages]].map(([k,v]) => `<div class="row"><div class="main"><div class="m">${k}</div>${esc(v)}</div></div>`).join('') + '</div>';
  return h;
}
function renderSkills(c){
  const d = D(c), edit = !!ui.edit;
  const ab = AB.map(a => {
    const sv = d.m[a] + (c.saves.includes(a) ? d.pb : 0);
    return `<div class="ab"><div class="k">${a.toUpperCase()}</div><div class="mod" ${edit ? '' : `data-roll="check:${a}" role="button" tabindex="0"`}>${sgn(d.m[a])}</div>
     <div class="sc">${edit ? `<input type="number" inputmode="numeric" id="ab-${a}" data-abin="${a}" value="${c.ab[a]}" min="1" max="30">` : c.ab[a]}</div>
     <div class="sv ${c.saves.includes(a) ? 'p' : ''}" ${edit ? `data-savetog="${a}"` : `data-roll="save:${a}"`} role="button" tabindex="0">Save ${sgn(sv)}</div></div>`;
  }).join('');
  const sk = SKILLS.map(([k,n,a]) => {
    const p = c.skills[k] || 0;
    return `<div class="row" ${edit ? `data-skilltog="${k}"` : `data-roll="skill:${k}"`} role="button" tabindex="0" style="cursor:pointer"><span class="dot ${p === 2 ? 'e' : p ? 'p' : ''}"></span><div class="main">${n} <span class="m">${a.toUpperCase()}</span></div><div class="r"><b>${sgn(d.skills[k])}</b></div></div>`;
  }).join('');
  return `${rollStrip()}<h2 class="sec">Abilities <span class="aside"><button class="btn sm ${edit ? 'pri' : ''}" data-act="toggleedit">${edit ? 'Done' : 'Edit'}</button></span></h2>
    <div class="abil">${ab}</div>
    <p class="note">${edit ? 'Tap a save to toggle proficiency. Tap a skill to cycle none, proficient, expertise.' : 'Tap a modifier, save or skill to roll it.'}</p>
    <h2 class="sec">Skills <span class="aside">${lk('rule','passive perception','Passive Perception')} ${d.passive}</span></h2><div class="card list">${sk}</div>`;
}
function renderNotes(c){
  const t = (k,l,rows) => `<div class="field"><label for="n-${k}">${l}</label><textarea id="n-${k}" data-field="${k}" ${rows ? `style="min-height:${rows}px"` : ''}>${esc(c[k] || '')}</textarea></div>`;
  const inp = (k, l, type, ph) => `<div class="field"><label for="d-${k}">${l}</label><input id="d-${k}" ${type === 'number' ? 'type="number" inputmode="numeric"' : ''} data-field="${k}" value="${esc(c[k] ?? '')}" ${ph ? `placeholder="${esc(ph)}"` : ''}></div>`;
  return `<h2 class="sec">Character details <span class="aside">changes save as you type</span></h2>
   <div class="grid2">${inp('name','Name')}${inp('aka','Other names or aliases','', 'Disguises, titles…')}${inp('age','Age')}${inp('alignment','Alignment')}${inp('species','Species')}${inp('bg','Background')}${inp('size','Size')}${inp('speed','Speed')}</div>
   <h2 class="sec">Combat numbers</h2>
   <div class="grid2">${inp('hpMax','HP maximum','number')}${inp('ac','Armour Class','number')}${inp('acNote','What gives that AC','', 'Studded leather, shield…')}${inp('ac2','Alternative AC (optional)','number')}${inp('ac2Label','Name of the alternative','', 'Mage Armor, Shield of Faith…')}${inp('initMisc','Extra Initiative bonus','number')}</div>
   <label class="pick" style="border:0"><input type="checkbox" data-check="initAdv" ${c.initAdv ? 'checked' : ''}><div class="main">Advantage on Initiative</div></label>
   <h2 class="sec">Defences and senses</h2>
   ${(() => { const df = defences(c), auto = ['res','adv','senses','other'].flatMap(k => df[k].filter(x => x.src).map(x => `${esc(x.t)} (${x.src})`)); return auto.length ? `<div class="callout">From your features: ${auto.join('; ')}</div>` : ''; })()}
   <div class="grid2">${inp('resist','Damage resistances','', 'Fire, Poison…')}${inp('immune','Damage immunities','', 'Poison…')}${inp('condImmune','Condition immunities','', 'Charmed, Poisoned…')}${inp('senses','Senses','', 'Darkvision 60 ft')}</div>
   ${inp('defNotes','Other defences','', 'Advantage on saves against being Frightened…')}
   <p class="note">Separate entries with commas. These show on the Party page for the DM.</p>
   <h2 class="sec">Attacks <span class="aside"><button class="btn sm" data-act="editattacks">Edit attacks</button></span></h2>
   <h2 class="sec">Proficiencies</h2>
   <div class="grid2">${inp('armour','Armour training')}${inp('weapons','Weapons')}${inp('tools','Tools')}${inp('languages','Languages')}</div>
   <h2 class="sec">Equipment</h2>${t('equipment','Carried')}
   <div class="coins">${['cp','sp','ep','gp','pp'].map(k => `<div class="field"><label for="co-${k}">${k.toUpperCase()}</label><input id="co-${k}" type="number" inputmode="numeric" data-coin="${k}" value="${c.coins[k] || 0}"></div>`).join('')}</div>
   <h2 class="sec">Character</h2>${t('appearance','Appearance',60)}${t('backstory','Backstory and personality',60)}${t('notes','Personal notes',140)}
   <p class="note">Notes for the whole group go on the ${'<button class="btn sm" data-go="party">Party</button>'} page.</p>
   <h2 class="sec">Your own rules text</h2>
   <p class="note">Paste wording from your own books to replace any summary. One entry per block: the name, a colon, then the text, with a blank line between entries. Names can be a spell (for example "Hunger of Hadar") or a feature as it appears in this app (for example "Healing Light").</p>
   <div class="field"><label for="bulk">Bulk paste</label><textarea id="bulk" placeholder="Hunger of Hadar: You open a gateway…&#10;&#10;Healing Light: You gain the ability…"></textarea></div>
   <button class="btn" data-act="bulkimport">Import text</button> <span class="note">${Object.keys(texts).length} custom entr${Object.keys(texts).length === 1 ? 'y' : 'ies'} saved</span>
   <h2 class="sec">History & backup</h2>
   <div class="btnrow">
    <button class="btn" data-act="undo" ${c.history.length ? '' : 'disabled'}>Undo last level up${c.history.length ? ` (back to ${c.history[c.history.length-1].level})` : ''}</button>
    <button class="btn" data-act="export">Copy backup</button><button class="btn" data-act="import">Restore backup</button>
    <button class="btn danger" data-act="reset">Reset to scanned sheet</button>${BE ? '<button class="btn" data-act="signout">Sign out on this device</button>' : ''}</div>`;
}

// ---------- party page ----------
function renderParty(){
  const m = chars.mule, mp = Math.max(0, Math.min(100, m.hp / m.hpMax * 100));
  const members = PCS.map(id => memberCard(chars[id])).join('');
  const quests = party.quests.slice().sort((a,b) => (a.done - b.done) || (b.created || 0) - (a.created || 0));
  const log = party.log.slice().sort((a,b) => (b.created || 0) - (a.created || 0));
  const npcs = party.npcs.slice().sort((a,b) => (a.n || '').localeCompare(b.n || ''));
  return `<header class="hero"><h1>The Party</h1><div class="sub">Shared with everyone who can edit this page ${syncChip()}</div></header>
   ${turnBar(null)}
   <h2 class="sec">At a glance <span class="aside"><button class="btn sm" data-go="init">Initiative</button></span></h2>
   <div class="members">${members}</div>
   ${rolls.length ? `<h2 class="sec">Recent rolls <span class="aside"><button class="btn sm" data-dice>Dice tray</button></span></h2><div class="card list">${rolls.slice(0,6).map(r => `<div class="row"><span class="rv sm ${r.nat === 20 ? 'n20' : r.nat === 1 ? 'n1' : ''}">${esc(r.total)}</span><div class="main"><b>${esc(r.label)}</b> <span class="m">${esc(r.who)} · ${esc(r.at)}</span><br><span class="m">${esc(r.detail)}</span></div></div>`).join('')}</div>` : ''}
   <h2 class="sec">Quests <span class="aside">${quests.filter(q => !q.done).length} open</span></h2>
   <form class="addrow" data-add="quests"><input id="add-quests" placeholder="New quest or task" aria-label="New quest"><button class="btn pri">Add</button></form>
   <div class="card list">${quests.map(q => `<div class="row"><input type="checkbox" class="chk" data-qdone="${esc(q.id)}" ${q.done ? 'checked' : ''} aria-label="Done"><button class="main tapt ${q.done ? 'done' : ''}" data-edit="quests|${esc(q.id)}">${esc(q.t)}${q.note ? `<span class="m" style="display:block">${esc(q.note)}</span>` : ''}</button></div>`).join('') || '<div class="row"><div class="main note">No quests yet.</div></div>'}</div>
   <h2 class="sec">Session log</h2>
   <form class="addrow" data-add="log"><input id="add-log" placeholder="What happened this session" aria-label="New log entry"><button class="btn pri">Add</button></form>
   <div class="card list">${log.map(e => `<button class="row tap" data-edit="log|${esc(e.id)}"><div class="main"><div class="m">${esc(e.date || '')}</div><div class="pre">${esc(e.t)}</div></div></button>`).join('') || '<div class="row"><div class="main note">No entries yet.</div></div>'}</div>
   <h2 class="sec">People & places</h2>
   <form class="addrow" data-add="npcs"><input id="add-npcs" placeholder="A person or place" aria-label="New person or place"><button class="btn pri">Add</button></form>
   <div class="card list">${npcs.map(e => `<button class="row tap" data-edit="npcs|${esc(e.id)}"><div class="main"><div class="t">${esc(e.n)}</div>${e.note ? `<div class="m pre">${esc(e.note)}</div>` : ''}</div></button>`).join('') || '<div class="row"><div class="main note">Nobody yet.</div></div>'}</div>
   <h2 class="sec">Party loot</h2>
   <div class="coins">${['cp','sp','ep','gp','pp'].map(k => `<div class="field"><label for="pc-${k}">${k.toUpperCase()}</label><input id="pc-${k}" type="number" inputmode="numeric" data-pcoin="${k}" value="${party.coins[k] || 0}"></div>`).join('')}</div>
   <div class="field"><label for="p-loot">Shared items</label><textarea id="p-loot" data-pfield="loot">${esc(party.loot)}</textarea></div>
   <h2 class="sec">Party notes</h2>
   <div class="field"><label for="p-notes">Notes everyone can read and edit</label><textarea id="p-notes" data-pfield="notes" style="min-height:180px">${esc(party.notes)}</textarea></div>
   <h2 class="sec">${esc(m.name)} <span class="aside">the party's ride</span></h2>
   <div class="card list">
    <div class="res" data-act="hp" role="button" tabindex="0" style="cursor:pointer"><div class="main"><div class="t">Hit points</div><span class="bar ${mp <= 25 ? 'crit' : mp <= 50 ? 'low' : ''}"><i style="width:${mp}%"></i></span></div><b class="big">${m.hp}/${m.hpMax}</b></div>
    <div class="row"><div class="main"><div class="m">AC · Speed · Size</div>${m.ac} · ${esc(m.speed)} · ${esc(m.size)}</div></div>
    <div class="row"><div class="main"><div class="m">Sleeps</div>${esc(m.sleeps)}</div></div>
    <div class="row"><div class="main"><div class="m">Special</div>${esc(m.special)}</div><button class="btn sm" data-act="mule-rest">Digested a boat</button></div></div>
   <div class="field" style="margin-top:10px"><label for="m-cargo">Mule's cargo</label><textarea id="m-cargo" data-mfield="cargo">${esc(m.cargo)}</textarea></div>
   <div class="field"><label for="m-notes">Mule notes</label><textarea id="m-notes" data-mfield="notes">${esc(m.notes)}</textarea></div>`;
}
// the DM's view of one character: numbers, what is running, what they shrug off
function resSummary(c){
  const r = row(c), out = [];
  if (c.cls === 'Warlock') out.push(`Pact ${r.slots - used(c,'pact')}/${r.slots} (${ord(r.sl)})`);
  if (c.cls === 'Sorcerer') { const sl = slotsOf(c); if (sl.length) out.push('Slots ' + sl.map(s => `${ord(s.lv)} ${s.left}${s.x ? ` (${s.x} made)` : ''}`).join(', ')); if (r.sp) out.push(`Sorcery Points ${spLeft(c)}/${r.sp}`); }
  if (c.sub === 'Celestial' && c.level >= 3) out.push(`Healing Light ${1 + c.level - used(c,'heal')}d6`);
  if (c.cls === 'Rogue') out.push(`Sneak Attack ${r.sa}d6${c.level >= 5 ? `, Cunning Strike DC ${8 + D(c).pb + D(c).m.dex}` : ''}`);
  out.push(`Hit Dice ${c.level - used(c,'hd')}/${c.level}`);
  return out.join(' · ');
}
function memberCard(c){
  const d = D(c), pct = Math.max(0, Math.min(100, c.hp / c.hpMax * 100)), df = defences(c), act = activeList(c);
  const lines = [];
  const L = (k, v) => { if (v) lines.push(`<div class="ml"><span class="mk">${k}</span><span class="mv">${v}</span></div>`); };
  if (c.hp <= 0) L('Dying', `Death saves: ${used(c,'dS')} successes, ${used(c,'dF')} failures`);
  L('Concentrating', c.conc && R.spells[c.conc] ? lk('spell', c.conc, R.spells[c.conc].n) + esc(mmTag(c.concMm)) + esc(untilTxt(c.concUntil)) : '');
  L('Active', act.map(x => effLink(x) + (x.note ? ` <span class="m">(${esc(x.note)})</span>` : '') + esc(untilTxt(x.until))).join(', '));
  L('Conditions', c.conditions.map(k => R.gloss['cond|'+k] ? lk('cond', k, R.gloss['cond|'+k].n) : '').filter(Boolean).concat(c.exhaustion ? [`${lk('cond','exhaustion','Exhaustion')} ${c.exhaustion}`] : []).join(', '));
  L('Resistant', defTxt(df.res)); L('Immune', defTxt(df.imm)); L('Can\'t be', defTxt(df.cimm));
  L('Advantage', defTxt(df.adv)); L('Senses', defTxt(df.senses)); L('Defences', defTxt(df.other));
  L('Resources', esc(resSummary(c)));
  const ac = c.ac2 && used(c,'armorOn') ? c.ac2 : c.ac;
  const caster = (c.spells || []).length > 0;
  return `<div class="member" data-mc="${c.id}" data-ctx="${c.id}">
    <button class="mhead" data-go="${c.id}">${avatar(c, 'sm').replace('<button', '<span').replace('</button>', '</span>').replace(/data-portrait="[^"]*"/, '')}<span class="main"><span class="mn">${esc(c.name)}</span><span class="m">Level ${c.level} ${esc(c.sub)} ${esc(c.cls)} · ${esc(c.species)}</span></span>${used(c,'insp') ? '<span class="insp" title="Heroic Inspiration">★</span>' : ''}<span class="m">Sheet ›</span></button>
    <div class="mhp"><span><b>${c.hp}</b>/${c.hpMax} HP${c.temp ? ` <span class="m">+${c.temp} temp</span>` : ''}</span><span class="bar ${pct <= 25 ? 'crit' : pct <= 50 ? 'low' : ''}"><i style="width:${pct}%"></i></span></div>
    <div class="mgrid"><div><span>AC</span><b>${ac}</b></div><div><span>Init</span><b>${sgn(d.init)}${c.initAdv ? '<small>adv</small>' : ''}</b></div><div><span>Speed</span><b class="sm">${esc(String(c.speed).split(',')[0])}</b></div>${caster ? `<div class="${d.innate ? 'boost' : ''}"><span>Spell DC</span><b>${d.dc}</b></div>` : `<div><span>Strike DC</span><b>${8 + d.pb + d.m.dex}</b></div>`}</div>
    <div class="mgrid"><div><span>Passive Perc.</span><b>${d.passive}</b></div><div><span>Passive Inv.</span><b>${d.pInv}</b></div><div><span>Passive Insight</span><b>${d.pIns}</b></div><div><span>Saves</span><b class="sm">${c.saves.map(a => a.toUpperCase()).join(' ')}</b></div></div>
    ${lines.join('')}
  </div>`;
}
// ---------- initiative tracker ----------
const eName = e => e.pc && chars[e.pc] ? chars[e.pc].name : (e.n || 'Creature');
const eMod = e => e.pc && chars[e.pc] ? D(chars[e.pc]).init : (e.mod || 0);
const eAdv = e => e.pc && chars[e.pc] ? !!chars[e.pc].initAdv : !!e.adv;
const fighting = () => combat.list.filter(e => !e.standby);
const takesTurn = e => !e.standby && e.init != null && !(e.down && !e.pc);
function nextEntry(dir){
  const order = combat.list.filter(takesTurn); if (!order.length) return null;
  const i = order.findIndex(e => e.id === combat.turn);
  if (i < 0) return order[0];
  return order[(i + dir + order.length) % order.length];
}
function rollInit(e){
  const a = d20(), b = d20(), pick = eAdv(e) ? Math.max(a,b) : a;
  e.init = pick + eMod(e); e.nat = pick;
  return `${eName(e)}: ${e.init}${eAdv(e) ? ` (Advantage ${a}, ${b})` : ` (d20 ${a} ${sgn(eMod(e))})`}`;
}
function sortCombat(){
  combat.list.sort((x, y) => (x.standby - y.standby) || ((y.init ?? -99) - (x.init ?? -99)) || (eMod(y) - eMod(x)) || ((y.pc ? 1 : 0) - (x.pc ? 1 : 0)) || eName(x).localeCompare(eName(y)));
}
function ensureParty(){ PCS.forEach(id => { const e = combat.list.find(x => x.pc === id); if (!e) combat.list.push({id: uid(), pc: id, kind: 'pc', init: null, conds: []}); else e.standby = false; }); }
function uniqueName(base){
  const names = new Set(combat.list.map(eName));
  if (!names.has(base) && !names.has(base + ' 1')) return base;
  let i = 2; while (names.has(`${base} ${i}`)) i++; return `${base} ${i}`;
}
function addCreatures(mod, value){
  const ia = ui.ia, n = Math.max(1, Math.min(20, parseInt(ia.c, 10) || 1)), ally = !!ia.ally;
  const base = (ia.n || '').trim() || (ally ? 'Ally' : 'Enemy');
  const hp = parseInt(ia.hp, 10) || null, ac = parseInt(ia.ac, 10) || null;
  const out = [];
  for (let i = 0; i < n; i++) {
    const nm = n > 1 ? uniqueName(`${base} ${i + 1}`) : uniqueName(base);
    const e = {id: uid(), n: nm, kind: ally ? 'ally' : 'enemy', mod: mod || 0, init: null, conds: [], note: ''};
    if (hp) { e.hp = hp; e.max = hp; } if (ac) e.ac = ac;
    if (value != null) e.init = value; else rollInit(e);
    combat.list.push(e); out.push(`${e.n} ${e.init}`);
  }
  ui.ia.n = ''; ui.ia.c = 1; ui.ia.v = ''; ui.ia.hp = ''; ui.ia.ac = '';
  saveCombat(); render(); toast('Added: ' + out.join(', '));
}
function nextTurn(dir){
  const order = combat.list.filter(takesTurn);
  if (!order.length) { toast('Give everyone an initiative first'); return; }
  const i = order.findIndex(e => e.id === combat.turn);
  if (dir > 0) {
    if (i < 0 || combat.round < 1) { combat.round = Math.max(1, combat.round); combat.turn = order[0].id; }
    else if (i === order.length - 1) {
      combat.round++; combat.turn = order[0].id;
      const over = PCS.map(id => chars[id]).flatMap(c => activeList(c).filter(x => x.until === combat.round - 1).map(x => `${c.name}'s ${x.n}`).concat(c.concUntil === combat.round - 1 && R.spells[c.conc] ? [`${c.name}'s ${R.spells[c.conc].n}`] : []));
      toast(`Round ${combat.round}${over.length ? `. Time is up: ${over.join(', ')}` : ''}`);
    }
    else combat.turn = order[i + 1].id;
  } else {
    if (i <= 0) { if (combat.round > 1) { combat.round--; combat.turn = order[order.length - 1].id; } }
    else combat.turn = order[i - 1].id;
  }
  saveCombat(); render();
}
function newCombat(){
  combat.list = combat.list.filter(e => e.kind !== 'enemy').map(e => Object.assign({}, e, {init: null, nat: null, conds: [], down: false, standby: e.kind === 'ally'}));
  ensureParty(); combat.round = 0; combat.turn = null;
  saveCombat(); render(); toast('New combat. Enemies cleared, allies on standby.');
}
function setPcInit(id, total){
  const e = combat.list.find(x => x.pc === id && !x.standby); if (!e) return;
  if (e.init != null && combat.round > 0) return;
  e.init = total; saveCombat();
}
function initRow(e){
  const c = e.pc ? chars[e.pc] : null, cur = e.id === combat.turn && combat.round > 0;
  const sub = [];
  if (c) {
    sub.push(`HP ${c.hp}/${c.hpMax}${c.temp ? ` +${c.temp}` : ''}`, `AC ${c.ac2 && used(c,'armorOn') ? c.ac2 : c.ac}`);
    if (c.conc && R.spells[c.conc]) sub.push('Conc: ' + esc(R.spells[c.conc].n) + esc(mmTag(c.concMm)));
    c.conditions.forEach(k => { const g = R.gloss['cond|'+k]; if (g) sub.push(esc(g.n)); });
  } else {
    if (e.ac) sub.push(`AC ${e.ac}`);
    (e.conds || []).forEach(k => { const g = R.gloss['cond|'+k]; if (g) sub.push(esc(g.n)); });
    if (e.note) sub.push(esc(e.note));
  }
  const kind = e.pc ? 'pc' : e.kind;
  const down = c ? c.hp <= 0 : e.down;
  const ini = e.init == null
    ? `<div class="iset"><input class="ini" type="number" inputmode="numeric" id="iv-${e.id}" data-iniv="${e.id}" placeholder="–" aria-label="Initiative for ${esc(eName(e))}"><button class="xs" data-iroll="${e.id}" aria-label="Roll initiative for ${esc(eName(e))}">Roll</button></div>`
    : `<button class="ival" data-iopen="${e.id}" aria-label="Initiative ${e.init}">${e.init}</button>`;
  return `<div class="irow" data-k="${kind}" ${e.pc ? `data-mc="${e.pc}"` : ''} data-cur="${cur}" data-down="${!!down}">
    ${ini}<button class="main" data-iopen="${e.id}"><span class="t">${cur ? '<span class="now">▶</span> ' : ''}${esc(eName(e))}${kind === 'ally' ? ' <span class="chip ally">ally</span>' : ''}${down ? ' <span class="chip">down</span>' : ''}</span>${sub.length ? `<span class="m">${sub.join(' · ')}</span>` : ''}</button>
    ${!c && e.max ? `<button class="ihp" data-ihp="${e.id}" aria-label="Hit points for ${esc(eName(e))}"><b>${e.hp}</b><small>/${e.max}</small></button>` : ''}
  </div>`;
}
function renderInit(){
  const act = combat.list.filter(e => !e.standby), stand = combat.list.filter(e => e.standby);
  const missing = act.filter(e => e.init == null).length;
  const cur = combat.list.find(e => e.id === combat.turn);
  const mods = [-4,-3,-2,-1,0,1,2,3,4,5,6,7,8];
  const ia = ui.ia;
  return `<header class="hero"><h1>Initiative</h1><div class="sub">${combat.round > 0 ? `<b>Round ${combat.round}</b>${cur ? ` · ${esc(eName(cur))}'s turn` : ''}` : 'Not started'} ${syncChip()}</div></header>
   <div class="ictl"><button class="btn" data-iprev ${combat.round > 0 ? '' : 'disabled'} aria-label="Previous turn">‹ Back</button><button class="btn pri big" data-inext>${combat.round > 0 ? 'Next turn ›' : 'Start combat ›'}</button></div>
   <div class="btnrow"><button class="btn sm" data-isort>Sort</button>${missing ? `<button class="btn sm" data-irollall>Roll the ${missing} missing</button>` : ''}<button class="btn sm" data-iparty>Add the party</button><button class="btn sm danger" data-inew>New combat</button></div>
   ${missing ? `<p class="note">${missing} still need${missing === 1 ? 's' : ''} an initiative. Players can roll from their own sheet (it fills in here), type a real roll in the box, or tap Roll.</p>` : ''}
   <div class="ilist">${act.map(initRow).join('') || '<div class="card"><div class="row"><div class="main note">Nobody in this fight yet. Add the party, then add creatures below.</div></div></div>'}</div>
   <h2 class="sec">Add creatures</h2>
   <div class="card iadd">
    <div class="grid2"><div class="field"><label for="ia-n">Name (optional)</label><input id="ia-n" data-ia="n" value="${esc(ia.n)}" placeholder="Goblin"></div>
     <div class="field"><label for="ia-c">How many</label><input id="ia-c" data-ia="c" type="number" inputmode="numeric" min="1" max="20" value="${esc(ia.c)}"></div>
     <div class="field"><label for="ia-hp">HP (optional)</label><input id="ia-hp" data-ia="hp" type="number" inputmode="numeric" value="${esc(ia.hp)}"></div>
     <div class="field"><label for="ia-ac">AC (optional)</label><input id="ia-ac" data-ia="ac" type="number" inputmode="numeric" value="${esc(ia.ac)}"></div></div>
    <label class="pick allytick" style="border:0"><input type="checkbox" id="ia-ally" data-ia="ally" ${ia.ally ? 'checked' : ''}><div class="main">Ally <span class="m">shows green and stays for the next combat</span></div></label>
    <div class="m" style="margin:6px 0 4px">Tap the Dexterity modifier to roll and add</div>
    <div class="qgrid">${mods.map(m => `<button class="btn" data-qadd="${m}">${m < 0 ? '−' + Math.abs(m) : '+' + m}</button>`).join('')}</div>
    <div class="addrow" style="margin-top:10px"><input id="ia-v" data-ia="v" type="number" inputmode="numeric" placeholder="Or type an initiative you rolled" aria-label="Initiative value" value="${esc(ia.v)}"><button class="btn pri" data-iaddv>Add</button></div>
    <div class="btnrow" style="margin:8px 0 0"><button class="btn sm" data-ilair>Lair action (count 20)</button></div>
   </div>
   ${stand.length ? `<details class="standby"><summary>Allies standing by (${stand.length})</summary><div class="card list">${stand.map(e => `<div class="row"><div class="main"><div class="t">${esc(eName(e))}</div><div class="m">Dex ${sgn(e.mod || 0)}${e.max ? ` · HP ${e.hp}/${e.max}` : ''}${e.ac ? ` · AC ${e.ac}` : ''}</div></div><button class="btn sm pri" data-ijoin="${e.id}">Join</button><button class="btn sm ghost" data-irm="${e.id}" aria-label="Remove ${esc(eName(e))}">Remove</button></div>`).join('')}</div></details>` : ''}
   <p class="note" style="margin-top:12px">Everyone sees the same tracker. Enemy rolls made here stay off the shared roll log.</p>`;
}
function initDrawer(id){
  const e = combat.list.find(x => x.id === id); if (!e) return;
  const c = e.pc ? chars[e.pc] : null;
  const conds = e.conds || [];
  const body = `${c ? `<p class="note">${esc(c.name)}'s HP, AC and conditions come from their sheet. <button class="btn sm" data-gopc="${c.id}">Open sheet</button></p>` : `
    <div class="field"><label for="ie-n">Name</label><input id="ie-n" value="${esc(e.n || '')}"></div>`}
    <div class="grid2"><div class="field"><label for="ie-i">Initiative</label><input id="ie-i" type="number" inputmode="numeric" value="${e.init ?? ''}"></div>
    ${c ? '' : `<div class="field"><label for="ie-m">Dex modifier</label><input id="ie-m" type="number" inputmode="numeric" value="${e.mod || 0}"></div>
    <div class="field"><label for="ie-hp">HP now</label><input id="ie-hp" type="number" inputmode="numeric" value="${e.hp ?? ''}"></div>
    <div class="field"><label for="ie-max">HP max</label><input id="ie-max" type="number" inputmode="numeric" value="${e.max ?? ''}"></div>
    <div class="field"><label for="ie-ac">AC</label><input id="ie-ac" type="number" inputmode="numeric" value="${e.ac ?? ''}"></div>`}</div>
    ${c ? '' : `<div class="seg" role="group" aria-label="Side"><button data-iekind="enemy" aria-pressed="${e.kind === 'enemy'}">Enemy</button><button data-iekind="ally" aria-pressed="${e.kind === 'ally'}">Ally</button></div>
    <label class="pick" style="border:0"><input type="checkbox" id="ie-down" ${e.down ? 'checked' : ''}><div class="main">Defeated <span class="m">greyed out and skipped</span></div></label>
    <div class="field"><label for="ie-note">Note</label><input id="ie-note" value="${esc(e.note || '')}" placeholder="Bloodied, fleeing, has the key…"></div>
    <div class="m" style="margin:8px 0 4px">Conditions</div><div class="chips">${CONDS.filter(k => R.gloss['cond|'+k]).map(k => `<button class="chip ${conds.includes(k) ? 'on' : ''}" data-iecond="${k}" aria-pressed="${conds.includes(k)}">${esc(R.gloss['cond|'+k].n)}</button>`).join(' ')}</div>`}
    <div class="btnrow" style="margin-top:10px"><button class="btn sm" data-ieroll>Re-roll initiative</button>${combat.round > 0 ? '<button class="btn sm" data-ieturn>Make it their turn</button>' : ''}</div>`;
  let kind = e.kind; const cs = new Set(conds);
  openDrawer(esc(eName(e)), body, '<button class="btn danger" data-iedel>Remove</button><button class="btn pri" data-iesave>Save</button>', el => el.addEventListener('click', ev => {
    const t = ev.target, g = k => el.querySelector('#' + k);
    const gp = t.closest('[data-gopc]'); if (gp) { closeDrawer(); ui.cur = gp.dataset.gopc; render(); window.scrollTo(0,0); return; }
    const kb = t.closest('[data-iekind]'); if (kb) { kind = kb.dataset.iekind; el.querySelectorAll('[data-iekind]').forEach(b => b.setAttribute('aria-pressed', b === kb)); return; }
    const cb = t.closest('[data-iecond]'); if (cb) { const k = cb.dataset.iecond; if (cs.has(k)) cs.delete(k); else cs.add(k); cb.classList.toggle('on', cs.has(k)); cb.setAttribute('aria-pressed', cs.has(k)); return; }
    if (t.closest('[data-ieroll]')) { const msg = rollInit(e); saveCombat(); closeDrawer(); render(); toast(msg); return; }
    if (t.closest('[data-ieturn]')) { combat.turn = e.id; saveCombat(); closeDrawer(); render(); return; }
    const del = t.closest('[data-iedel]'); if (del) { if (!del.dataset.sure) { del.dataset.sure = '1'; del.textContent = 'Tap again to remove'; return; } if (combat.turn === e.id) { const nx = nextEntry(1); combat.turn = nx && nx.id !== e.id ? nx.id : null; } combat.list = combat.list.filter(x => x.id !== e.id); saveCombat(); closeDrawer(); render(); return; }
    if (t.closest('[data-iesave]')) {
      const iv = g('ie-i').value.trim(); e.init = iv === '' ? null : parseInt(iv, 10);
      if (!c) {
        e.n = g('ie-n').value.trim() || e.n; e.mod = parseInt(g('ie-m').value, 10) || 0;
        const num = k => { const v = parseInt(g(k).value, 10); return isNaN(v) ? null : v; };
        e.max = num('ie-max'); e.hp = num('ie-hp'); if (e.max == null) { delete e.max; delete e.hp; } else if (e.hp == null) e.hp = e.max;
        const ac = num('ie-ac'); if (ac == null) delete e.ac; else e.ac = ac;
        e.kind = kind; e.down = g('ie-down').checked; e.note = g('ie-note').value.trim(); e.conds = [...cs];
      }
      saveCombat(); closeDrawer(); render(); toast('Saved');
    }
  }));
}
function initHpDrawer(id){
  const e = combat.list.find(x => x.id === id); if (!e) return;
  openDrawer(`${esc(eName(e))}: ${e.hp}/${e.max} HP`, '<input class="numin" id="ihn" type="number" inputmode="numeric" min="0" placeholder="0" aria-label="Amount"><div class="hpctl"><button class="btn danger" data-h="dmg">Damage</button><button class="btn pri" data-h="heal">Heal</button></div>', '', el => {
    const inp = el.querySelector('#ihn'); setTimeout(() => inp.focus(), 50);
    el.addEventListener('click', ev => { const b = ev.target.closest('[data-h]'); if (!b) return; const n = Math.max(0, parseInt(inp.value || '0', 10));
      if (b.dataset.h === 'dmg') e.hp = Math.max(0, e.hp - n); else e.hp = Math.min(e.max, e.hp + n);
      const was = e.down; e.down = e.hp <= 0;
      saveCombat(); closeDrawer(); render(); if (e.down && !was) toast(`${eName(e)} is down`); });
  });
}
function editItem(coll, id){
  const it = party[coll].find(x => x.id === id); if (!it) return;
  const fields = coll === 'quests' ? [['t','Quest','input'],['note','Notes','textarea']] : coll === 'log' ? [['date','Date','input'],['t','Entry','textarea']] : [['n','Name','input'],['note','Notes','textarea']];
  openDrawer(coll === 'quests' ? 'Quest' : coll === 'log' ? 'Log entry' : 'Person or place',
    fields.map(([k,l,tg]) => `<div class="field"><label for="ei-${k}">${l}</label>${tg === 'input' ? `<input id="ei-${k}" value="${esc(it[k] || '')}">` : `<textarea id="ei-${k}">${esc(it[k] || '')}</textarea>`}</div>`).join(''),
    `<button class="btn danger" data-del>Delete</button><button class="btn pri" data-ok>Save</button>`, el => {
      el.addEventListener('click', e => {
        if (e.target.closest('[data-ok]')) { fields.forEach(([k]) => it[k] = el.querySelector('#ei-' + k).value); saveItem(coll, it); closeDrawer(); render(); }
        const del = e.target.closest('[data-del]');
        if (del) { if (del.dataset.sure) { party[coll] = party[coll].filter(x => x.id !== id); deleteItem(coll, id); closeDrawer(); render(); toast('Deleted'); } else { del.dataset.sure = '1'; del.textContent = 'Tap again to delete'; } }
      });
    });
}

// ---------- drawers with back navigation ----------
let navStack = [], curReopen = null;
function openDrawer(title, body, foot, onBind, reopen){
  const s = document.getElementById('scrim'); if (s) s.remove();
  curReopen = reopen || null;
  const el = document.createElement('div');
  el.className = 'scrim'; el.id = 'scrim';
  el.innerHTML = `<div class="drawer" role="dialog" aria-modal="true" aria-label="${esc(String(title).replace(/<[^>]+>/g,''))}"><div class="hd">${navStack.length ? '<button class="x back" data-back-nav aria-label="Back">‹</button>' : ''}<h3>${title}</h3><button class="x" data-close aria-label="Close">×</button></div><div class="bd rt">${body}</div>${foot ? `<div class="ft">${foot}</div>` : ''}</div>`;
  el.addEventListener('click', e => {
    if (e.target === el || e.target.closest('[data-close]')) { closeDrawer(); return; }
    if (e.target.closest('[data-back-nav]')) { const fn = navStack.pop(); if (fn) fn(); }
  });
  document.body.appendChild(el);
  if (onBind) onBind(el);
  return el;
}
function closeDrawer(){ const s = document.getElementById('scrim'); if (s) s.remove(); navStack = []; curReopen = null; ctxOverride = null; }
function toast(msg){ document.querySelectorAll('.toast').forEach(t => t.remove()); const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role','status'); t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2800); }
const ctxChar = () => (ctxOverride && chars[ctxOverride]) ? chars[ctxOverride] : (PCS.includes(ui.cur) ? chars[ui.cur] : null);

function openEntity(ty, key){
  const c = ctxChar();
  const back = () => openEntity(ty, key);
  if (ty === 'spell') return spellDrawer(key, c);
  if (['cond','act','rule','sense','skill','mast'].includes(ty)) return glossDrawer(ty, key);
  if (ty === 'opt') {
    const v = R.invocations.find(x => x.n.toLowerCase() === key) || R.metamagic.find(x => x.n.toLowerCase() === key);
    if (!v) return;
    const isInv = R.invocations.includes(v), tk = (isInv ? 'inv:' : 'mm:') + v.n;
    const extra = c && isInv && hasInv(c, v.n) ? invContext(c, v.n) : '';
    const t = textFor(tk, v.h, false);
    return openDrawer(esc(v.n), (isInv ? `<p class="note">Eldritch Invocation${v.lv > 1 ? `, Warlock level ${v.lv}+` : ''}${v.pact ? `, needs ${lk('opt', v.pact.toLowerCase(), v.pact)}` : ''}</p>` : '<p class="note">Metamagic</p>') + extra + t.h + provenance(t, v.u, tk), '', null, back);
  }
  if (ty === 'feat') {
    const v = R.feats.find(x => x.n.toLowerCase() === key);
    const name = v ? v.n : key.replace(/\b\w/g, m => m.toUpperCase());
    const body = v && v.h ? v.h : (R.extraFeats[name] || `<p class="note">Not in the free SRD.</p>`);
    const t = textFor('feat:' + name, body, v ? !!v.own : !!R.extraFeats[name]);
    const url = v ? v.u : (key === 'mark of warding' ? 'https://5e.tools/feats.html#mark%20of%20warding_efa' : `https://5e.tools/feats.html#${encodeURIComponent(key)}_xphb`);
    return openDrawer(esc(name), (v && v.pre ? `<p class="note">Prerequisite: ${esc(v.pre)}</p>` : '') + (c && hasFeat(c, name) ? featContext(c, name) : '') + t.h + provenance(t, url, 'feat:' + name), '', null, back);
  }
  if (ty === 'cf' && c) {
    const f = cl(c).feats.find(x => x.n === key); if (!f) return;
    const tk = `cf:${c.cls}:${f.lv}:${f.n}`, t = textFor(tk, f.h, false);
    return openDrawer(esc(f.n), `<p class="note">${esc(c.cls)} feature, level ${f.lv}</p>` + t.h + provenance(t, cl(c).u, tk), '', null, back);
  }
  if (ty === 'sf' && c) {
    const f = (R.subclasses[c.sub] || []).find(x => x.n === key); if (!f) return;
    const tk = `sf:${c.sub}:${f.n}`, t = textFor(tk, f.h, true);
    return openDrawer(esc(f.n), `<p class="note">${esc(c.subName)}, level ${f.lv}</p>` + t.h + provenance(t, cl(c).u, tk), '', null, back);
  }
  if (ty === 'species' && c) {
    const f = (R.species[c.species] || []).find(x => x.n === key); if (!f) return;
    const tk = `sp:${c.species}:${f.n}`, t = textFor(tk, f.h, c.species !== 'Human');
    return openDrawer(esc(f.n), `<p class="note">${esc(c.species)} trait</p>` + t.h + provenance(t, '', tk), '', null, back);
  }
  if (ty === 'weapon') {
    const w = R.weapons.find(x => x.n === key); if (!w) return;
    const mastered = c && c.masteries.includes(w.n);
    return openDrawer(esc(w.n), `<div class="meta"><div><span>Damage</span>${esc(w.d)} ${esc(w.t)}</div><div><span>Category</span>${w.cat === 'simple' ? 'Simple' : 'Martial'}</div><div style="grid-column:1/-1"><span>Properties</span>${esc(w.p.join(', ') || 'None')}</div><div style="grid-column:1/-1"><span>Mastery</span>${lk('mast', w.m.toLowerCase(), w.m)}${c ? (mastered ? ' (you have mastered this weapon)' : ' (not mastered)') : ''}</div></div>`, '', null, back);
  }
}
function glossDrawer(ty, key){
  const g = R.gloss[ty + '|' + key]; if (!g) return;
  const label = {cond:'Condition', act:'Action', rule:'Rules glossary', sense:'Sense', skill:'Skill', mast:'Weapon Mastery property'}[ty];
  openDrawer(esc(g.n), `<p class="note">${label}</p>${g.h}<p class="note"><a href="${g.u}" target="_blank" rel="noopener">Open on 5e.tools</a></p>`, '', null, () => glossDrawer(ty, key));
}

function spellDrawer(k, c){
  const sp = R.spells[k]; if (!sp) return;
  const entry = c ? spellList(c).find(s => s.k === k) : null;
  const d = c ? D(c) : null;
  const t = textFor('spell:' + k, sp.h + (sp.hl || ''), sp.own);
  let callout = '';
  if (c && d) {
    const bits = [];
    if (/saving throw/i.test(sp.h)) bits.push(`Your spell save DC: <b>${d.dc}</b>${d.innate ? ' (Innate Sorcery +1)' : ''}`);
    if (/spell attack|attack roll/i.test(sp.h)) bits.push(`Your spell attack: <b>${sgn(d.atk)}</b>${d.innate ? ' with Advantage (Innate Sorcery)' : ''}`);
    if (sp.l === 0 && /Cantrip Upgrade|level 5|levels 5/i.test((sp.hl || '') + sp.h)) bits.push(`Cantrip strength at level ${c.level}: <b>×${d.tier}</b> dice`);
    if (k === 'eldritch blast') bits.push(`Beams: <b>${d.tier}</b>${c.invTargets['Agonizing Blast'] === k ? `, each +${d.cm}` : ''}${c.invTargets['Eldritch Spear'] === k ? `, range ${120 + 30 * c.level} ft` : ''}${c.invTargets['Repelling Blast'] === k ? ', push 10 ft per hit' : ''}`);
    const mods = modifiersOf(c, k);
    if (mods.length) bits.push(`Modified by: ${mods.join(', ')}`);
    if (entry) bits.push(`Granted by: ${grantLink(c, entry)}${entry.always ? ', always prepared' : ''}`);
    if (bits.length) callout = `<div class="callout">${bits.join('<br>')}</div>`;
  }
  const meta = `<div class="meta"><div><span>Level</span>${sp.l ? ord(sp.l) + ' ' + sp.sc : sp.sc + ' cantrip'}</div><div><span>Casting time</span>${esc(sp.t)}${sp.rit ? ' or ' + lk('rule','ritual','Ritual') : ''}</div>
    <div><span>Range</span>${esc(sp.r)}</div><div><span>Duration</span>${sp.conc ? 'Concentration, ' + esc(sp.d.replace(/^Up to/,'up to')) : esc(sp.d)}</div>
    <div style="grid-column:1/-1"><span>Components</span>${esc(sp.c)}</div><div style="grid-column:1/-1"><span>Spell lists</span>${esc(sp.cls.join(', ') || 'None')}${sp.mark ? ', Mark of Warding' : ''}</div></div>`;
  const btns = [];
  if (c && entry) {
    if (sp.l > 0) {
      if (entry.src === 'arcanum') btns.push(`<button class="btn pri" data-cast="arc${entry.arc}">Cast (Arcanum)</button>`);
      else if (c.cls === 'Warlock' && entry.src !== 'mi') btns.push(`<button class="btn pri" data-cast="pact">Cast with Pact slot</button>`);
      else if (c.cls === 'Sorcerer') slotsOf(c).filter(s => s.lv >= sp.l).forEach(s => btns.push(`<button class="btn ${s.lv === sp.l ? 'pri' : ''}" data-cast="s${s.lv}" ${s.left ? '' : 'disabled'}>${ord(s.lv)} slot (${s.left} left)</button>`));
      if (entry.src === 'mi') btns.push(`<button class="btn pri" data-cast="mi">Cast free (Magic Initiate)</button>`);
      if (entry.src === 'mark') { const id = {alarm:'m_alarm','mage armor':'m_armor','arcane lock':'m_lock'}[k]; if (id) btns.push(`<button class="btn" data-cast="${id}">Cast free (Mark)</button>`); }
      if (sp.rit) btns.push(`<button class="btn" data-cast="ritual">Cast as Ritual (+10 min)</button>`);
      if (c.sub === 'Aberrant' && c.level >= 6 && entry.src === 'sub') btns.push(`<button class="btn" data-cast="sp:${sp.l}">Spend ${sp.l} Sorcery Point${sp.l>1?'s':''}</button>`);
    } else if (sp.conc) btns.push(`<button class="btn pri" data-cast="cantrip">Cast</button>`);
    if (c.cls === 'Sorcerer') Object.entries(META).forEach(([mm, m]) => {
      if (!c.metamagic.includes(mm) || (m.save && !/saving throw/i.test(sp.h))) return;
      let slot = 'cantrip', note = 'no slot';
      if (sp.l > 0) { const s = slotsOf(c).find(x => x.lv >= sp.l && x.left); if (!s) return; slot = 's' + s.lv; note = ord(s.lv) + ' slot'; }
      btns.push(`<button class="btn ${spLeft(c) >= m.cost ? 'pri' : ''}" data-cast="${slot}" data-mm="${esc(mm)}" ${spLeft(c) >= m.cost ? '' : 'disabled'}>Cast with ${m.short}<span class="m"> ${m.cost} SP, ${note}</span></button>`);
    });
    if (entry.src === 'class' && sp.l > 0 && c.cls === 'Sorcerer') btns.push(`<button class="btn ghost" data-toggleprep="${esc(k)}">${entry.off ? 'Mark prepared' : 'Mark not prepared'}</button>`);
    if (!entry.always) btns.push(`<button class="btn ghost danger" data-removesp="${esc(k)}">Remove</button>`);
  }
  openDrawer(esc(sp.n), callout + meta + t.h + provenance(t, sp.u, 'spell:' + k), btns.join(''), el => {
    el.addEventListener('click', e => {
      const cb = e.target.closest('[data-cast]');
      if (cb && c) {
        const id = cb.dataset.cast, mm = cb.dataset.mm || '', mc = mm && META[mm] ? META[mm].cost : 0;
        if (mc && spLeft(c) < mc) { toast('Not enough Sorcery Points'); return; }
        if (id.startsWith('sp:')) { const n = +id.slice(3); if (row(c).sp - used(c,'sp') < n) { toast('Not enough Sorcery Points'); return; } c.used.sp = used(c,'sp') + n; }
        else if (/^s\d$/.test(id) && c.cls === 'Sorcerer') { const lv = +id.slice(1), s = slotsOf(c).find(x => x.lv === lv); if (!s || !s.left) { toast('No slots of that level left.'); return; } if (s.max - used(c,id) > 0) c.used[id] = used(c,id) + 1; else c.used['x'+lv] = s.x - 1; }
        else if (id !== 'ritual' && id !== 'cantrip') { const max = slotMax(c, id); if (used(c,id) >= max) { toast('No uses left. Rest to recover them.'); return; } c.used[id] = used(c,id) + 1; }
        if (mc) c.used.sp = used(c,'sp') + mc;
        let msg = `Cast ${sp.n}${mm ? ' with ' + META[mm].short + ` (${mc} Sorcery Point${mc > 1 ? 's' : ''})` : ''}`;
        if (sp.conc) { if (c.conc && c.conc !== k && R.spells[c.conc]) msg += `. ${R.spells[c.conc].n} ends`; c.conc = k; if (mm) c.concMm = mm; else delete c.concMm; const u = untilFor(sp.d); if (u != null) c.concUntil = u; else delete c.concUntil; msg += '. Concentrating'; }
        else if (sp.l > 0 && !/^Instantaneous/i.test(sp.d)) {
          if (k === 'mage armor' && c.ac2 && /mage armor/i.test(c.ac2Label || '')) { c.used.armorOn = 1; msg += `. AC ${c.ac2}`; }
          else addEffect(c, {n: sp.n, k, dur: sp.d, mm});
        }
        commit(c); closeDrawer(); toast(msg); return;
      }
      const tp = e.target.closest('[data-toggleprep]');
      if (tp && c) { const s = c.spells.find(x => x.k === tp.dataset.toggleprep); if (s) { if (s.off) delete s.off; else s.off = true; commit(c); closeDrawer(); } return; }
      const rm = e.target.closest('[data-removesp]');
      if (rm && c) { if (!rm.dataset.sure) { rm.dataset.sure = '1'; rm.textContent = 'Tap again to remove'; return; } c.spells = c.spells.filter(x => x.k !== rm.dataset.removesp); if (c.conc === rm.dataset.removesp) { c.conc = null; delete c.concMm; delete c.concUntil; } commit(c); closeDrawer(); toast(`${sp.n} removed`); }
    });
  }, () => spellDrawer(k, c));
}
function commit(c){ save(c.id); render(); }

function hpDrawer(c){
  const body = `<input class="numin" id="hpn" type="number" inputmode="numeric" min="0" placeholder="0" aria-label="Amount">
   <div class="hpctl"><button class="btn danger" data-h="dmg">Damage</button><button class="btn pri" data-h="heal">Heal</button><button class="btn" data-h="temp">Set temp HP</button></div>
   <p class="note" style="margin-top:12px">Damage comes off ${lk('rule','temporary hit points','Temporary Hit Points')} first. Healing stops at the maximum (${c.hpMax}).</p>
   ${c.kind === 'pc' ? `<div style="margin-top:10px"><button class="btn" data-h="hd">Spend a Hit Die (d${cl(c).hd} ${sgn(D(c).m.con)})</button> <span class="note">${c.level - used(c,'hd')} left</span></div>` : ''}`;
  openDrawer('Hit points: ' + esc(c.name), body, '', el => {
    const inp = el.querySelector('#hpn'); setTimeout(() => inp.focus(), 50);
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-h]'); if (!b) return;
      const n = Math.max(0, parseInt(inp.value || '0', 10));
      let msg = '';
      if (b.dataset.h === 'dmg') { let x = n; const t = Math.min(c.temp || 0, x); c.temp = (c.temp || 0) - t; x -= t; c.hp = Math.max(0, c.hp - x);
        if (c.conc && R.spells[c.conc] && n > 0) { const dc = Math.min(30, Math.max(10, Math.floor(n / 2))); const sv = D(c).m.con + (c.saves.includes('con') ? D(c).pb : 0); msg = `Concentration save for ${R.spells[c.conc].n}: DC ${dc}, Con ${sgn(sv)}`; } }
      if (b.dataset.h === 'heal') { if (c.hp <= 0 && n > 0) { c.used.dS = 0; c.used.dF = 0; } c.hp = Math.min(c.hpMax, c.hp + n); }
      if (b.dataset.h === 'temp') c.temp = n;
      if (b.dataset.h === 'hd') {
        if (used(c,'hd') >= c.level) { toast('No Hit Dice left.'); return; }
        const roll = 1 + Math.floor(Math.random() * cl(c).hd), gain = Math.max(0, roll + D(c).m.con);
        c.used.hd = used(c,'hd') + 1; c.hp = Math.min(c.hpMax, c.hp + gain); msg = `Hit Die: rolled ${roll} ${sgn(D(c).m.con)}, +${gain} HP`;
      }
      commit(c); closeDrawer(); if (msg) toast(msg);
    });
  });
}
function textEditor(key, title){
  const cur = texts[key];
  openDrawer('Your text: ' + esc(title), `<p class="note">Paste the wording from your own copy. It replaces the summary everywhere in the app and is shared with the party.</p><div class="field"><label for="tx">Text</label><textarea id="tx" style="min-height:220px"></textarea></div>`,
    `<button class="btn pri" data-savetext>Save</button>`, el => {
      const ta = el.querySelector('#tx'); ta.value = cur ? cur.raw || '' : '';
      el.addEventListener('click', e => { if (e.target.closest('[data-savetext]')) { const v = ta.value.trim(); if (v) texts[key] = {raw:v, h:plainToHtml(v)}; else delete texts[key]; saveTexts(); closeDrawer(); render(); toast('Saved'); } });
    });
}
function keyForName(name){
  const n = name.trim().toLowerCase();
  if (R.spells[n]) return 'spell:' + n;
  for (const [sub, fs] of Object.entries(R.subclasses)) for (const f of fs) if (f.n.toLowerCase() === n) return `sf:${sub}:${f.n}`;
  for (const [sp, ts] of Object.entries(R.species)) for (const t of ts) if (t.n.toLowerCase() === n) return `sp:${sp}:${t.n}`;
  const ft = R.feats.find(f => f.n.toLowerCase() === n); if (ft) return 'feat:' + ft.n;
  if (n === 'mark of warding') return 'feat:Mark of Warding';
  if (n === 'rustic hospitality') return 'bg:rustic';
  return null;
}

// ---------- dice ----------
const d20 = () => 1 + Math.floor(Math.random() * 20);
function rollExpr(expr, crit){
  let total = 0; const parts = [];
  expr.replace(/\s/g,'').split(/(?=[+-])/).forEach(term => {
    const m = term.match(/^([+-]?)(\d*)d(\d+)$/);
    if (m) { const sign = m[1] === '-' ? -1 : 1; let n = +(m[2] || 1); if (crit) n *= 2; const rs = Array.from({length:n}, () => 1 + Math.floor(Math.random() * +m[3])); total += sign * rs.reduce((a,b) => a+b, 0); parts.push(`[${rs.join(',')}]`); }
    else if (term) { total += +term; parts.push(term); }
  });
  return {total, detail: parts.join(' ')};
}
function pushRoll(r, keepOpen){ const c = ctxChar(); const x = Object.assign({who: c ? c.name : 'Party', at: new Date().toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'})}, r); rolls.unshift(x); rolls = rolls.slice(0, 40); if (BE && BE.online) BE.addRoll(x).catch(() => {}); if (!keepOpen) render(); toast(`${r.label}: ${r.total}${r.nat === 20 ? ' (natural 20)' : r.nat === 1 ? ' (natural 1)' : ''}`); }
function rollD20(label, m, mode, c){
  const a = d20(), b = d20(), pen = c ? D(c).ex : 0;
  const pick = mode === 'adv' ? Math.max(a,b) : mode === 'dis' ? Math.min(a,b) : a;
  if (label === 'Initiative' && c) setPcInit(c.id, pick + m - pen);
  pushRoll({label, total: pick + m - pen, nat: pick, detail: `${mode === 'adv' ? `Advantage (${a}, ${b})` : mode === 'dis' ? `Disadvantage (${a}, ${b})` : `d20 ${a}`} ${sgn(m)}${pen ? ` −${pen} exhaustion` : ''}`});
}
function rollMenu(label, m, c, presetAdv){
  openDrawer(esc(label), `<p class="big" style="text-align:center;margin:6px 0 12px">${sgn(m)}${c && D(c).ex ? ` <span class="note">(−${D(c).ex} exhaustion)</span>` : ''}</p>`,
    `<button class="btn" data-rm="dis">Disadvantage</button><button class="btn ${presetAdv ? '' : 'pri'}" data-rm="norm">Roll</button><button class="btn ${presetAdv ? 'pri' : ''}" data-rm="adv">Advantage</button>`,
    el => el.addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (!b) return; closeDrawer(); rollD20(label, m, b.dataset.rm, c); }));
}
function attackDrawer(c, i){
  const a = c.attacks[i], x = atkCalc(c, a);
  const [rty, ...rk] = (a.ref || '').split('|'), rkey = rk.join('|');
  const read = a.sp && R.spells[a.sp] ? lk('spell', a.sp, `Read ${R.spells[a.sp].n}`) : a.ref ? lk(rty, rkey, 'Read ' + rkey) : '';
  let mastery = '';
  if (rty === 'weapon') { const w = R.weapons.find(y => y.n === rkey); if (w) mastery = `<br>Mastery: ${lk('mast', w.m.toLowerCase(), w.m)}${c.masteries.includes(w.n) ? '' : ' (not mastered)'}`; }
  const mods = a.sp ? modifiersOf(c, a.sp) : [];
  const body = `<div class="meta"><div><span>${a.kind === 'save' ? 'Save' : 'To hit'}</span>${esc(x.hit || 'Automatic')}</div><div><span>Damage</span>${esc(x.dmg)} ${esc(a.type)}</div><div style="grid-column:1/-1"><span>Range</span>${esc(x.rng || '—')}</div></div>
    ${a.note ? `<p>${esc(a.note)}</p>` : ''}${read || mastery || mods.length ? `<div class="callout">${read}${mastery}${mods.length ? `<br>Modified by: ${mods.join(', ')}` : ''}</div>` : ''}`;
  const foot = (x.hitMod !== null ? `<button class="btn" data-ar="dis">Attack (Dis)</button><button class="btn ${x.adv ? '' : 'pri'}" data-ar="norm">Attack</button><button class="btn ${x.adv ? 'pri' : ''}" data-ar="adv">Attack (Adv)</button>` : '') +
    `<button class="btn" data-ar="dmg">Damage</button>${x.hitMod !== null ? '<button class="btn" data-ar="crit">Critical damage</button>' : ''}`;
  openDrawer(esc(a.n), body, foot, el => el.addEventListener('click', e => {
    const b = e.target.closest('[data-ar]'); if (!b) return;
    const m = b.dataset.ar; closeDrawer();
    if (m === 'dmg' || m === 'crit') {
      if (x.beams > 1) { const rs = Array.from({length:x.beams}, () => rollExpr(x.expr, m === 'crit')); pushRoll({label:`${a.n} damage (${x.beams} beams)`, total: rs.map(r => r.total).join(' / '), detail: rs.map(r => r.detail).join(' | ') + ' ' + a.type}); }
      else { const r = rollExpr(x.expr, m === 'crit'); pushRoll({label:`${a.n} ${m === 'crit' ? 'critical ' : ''}damage`, total:r.total, detail:`${x.expr}${m === 'crit' ? ' (dice doubled)' : ''}: ${r.detail} ${a.type}`}); }
    } else rollD20(`${a.n} attack`, x.hitMod, m, c);
  }), () => attackDrawer(c, i));
}

// ---------- attack editor ----------
function attacksDrawer(c){
  const rows = (c.attacks || []).map((a,i) => { const x = atkCalc(c, a); return `<div class="row"><div class="main"><div class="t">${esc(a.n)}</div><div class="m">${esc(x.hit || 'Automatic')} · ${esc(x.dmg)} ${esc(a.type || '')}</div></div><button class="btn sm" data-editatk="${i}">Edit</button></div>`; }).join('');
  openDrawer('Attacks: ' + esc(c.name), `<div class="card list">${rows || '<div class="row"><div class="main note">No attacks yet.</div></div>'}</div>`, '<button class="btn pri" data-newatk>Add attack</button>', el => el.addEventListener('click', e => {
    const ed = e.target.closest('[data-editatk]'); if (ed) { attackForm(c, +ed.dataset.editatk); return; }
    if (e.target.closest('[data-newatk]')) attackForm(c, -1);
  }), () => attacksDrawer(c));
}
function attackForm(c, i){
  const a = i >= 0 ? clone(c.attacks[i]) : {n:'', kind:'atk', ab:'str', die:'1d6', addMod:true, type:'', rng:'', note:''};
  const sel = (id, opts, v) => `<select id="${id}">${opts.map(([val,l]) => `<option value="${val}" ${String(v ?? '') === val ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  const spellOpts = [['','None']].concat(spellList(c).map(s => [s.k, R.spells[s.k].n]));
  const body = `<div class="field"><label for="af-n">Name</label><input id="af-n" value="${esc(a.n)}"></div>
    <div class="grid2"><div class="field"><label for="af-kind">How it lands</label>${sel('af-kind', [['atk','Attack roll'],['save','Saving throw'],['auto','Hits automatically']], a.kind)}</div>
    <div class="field"><label for="af-ab">Ability</label>${sel('af-ab', [['spell','Spellcasting'],['str','Strength'],['dex','Dexterity'],['con','Constitution'],['int','Intelligence'],['wis','Wisdom'],['cha','Charisma'],['','None']], a.ab)}</div>
    <div class="field"><label for="af-save">Save (if a save)</label>${sel('af-save', [['',''],['Str','Strength'],['Dex','Dexterity'],['Con','Constitution'],['Int','Intelligence'],['Wis','Wisdom'],['Cha','Charisma']], a.save)}</div>
    <div class="field"><label for="af-magic">Magic bonus to hit</label><input id="af-magic" type="number" inputmode="numeric" value="${a.magic || 0}"></div>
    <div class="field"><label for="af-die">Damage dice</label><input id="af-die" value="${esc(a.die === 'sneak' ? 'sneak' : a.die)}" placeholder="1d8"></div>
    <div class="field"><label for="af-type">Damage type</label><input id="af-type" value="${esc(a.type || '')}" placeholder="Slashing"></div>
    <div class="field"><label for="af-scale">Scaling</label>${sel('af-scale', [['','None'],['cantrip','Cantrip (more dice at 5, 11, 17)'],['beams','Beams (Eldritch Blast)']], a.scale)}</div>
    <div class="field"><label for="af-rng">Range</label><input id="af-rng" value="${esc(a.rng || '')}" placeholder="5 ft"></div></div>
    <label class="pick" style="border:0"><input type="checkbox" id="af-mod" ${a.addMod ? 'checked' : ''}><div class="main">Add the ability modifier to damage</div></label>
    <div class="field"><label for="af-sp">Linked spell</label>${sel('af-sp', spellOpts, a.sp)}</div>
    <div class="field"><label for="af-note">Notes</label><textarea id="af-note" style="min-height:70px">${esc(a.note || '')}</textarea></div>
    <p class="note">Damage dice can include a flat bonus, for example 1d4+1. Use "sneak" for Sneak Attack dice.</p>`;
  openDrawer(i >= 0 ? 'Edit attack' : 'New attack', body, `${i >= 0 ? '<button class="btn danger" data-delatk>Delete</button>' : ''}<button class="btn pri" data-saveatk>Save</button>`, el => el.addEventListener('click', e => {
    const g = id => el.querySelector('#' + id);
    if (e.target.closest('[data-saveatk]')) {
      const die = g('af-die').value.trim() || '1d4';
      if (die !== 'sneak' && !/^\d+d\d+([+-]\d+)?$/.test(die)) { toast('Damage dice should look like 1d8 or 2d6+1'); return; }
      Object.assign(a, {n: g('af-n').value.trim() || 'Attack', kind: g('af-kind').value, ab: g('af-ab').value, save: g('af-save').value, magic: parseInt(g('af-magic').value,10) || 0, die, type: g('af-type').value.trim(), scale: g('af-scale').value, rng: g('af-rng').value.trim(), addMod: g('af-mod').checked, sp: g('af-sp').value, note: g('af-note').value});
      ['save','scale','sp','rng'].forEach(k => { if (!a[k]) delete a[k]; }); if (!a.magic) delete a.magic;
      c.attacks = c.attacks || []; if (i >= 0) c.attacks[i] = a; else c.attacks.push(a);
      save(c.id); render(); navStack = []; attacksDrawer(c); toast('Attack saved'); return;
    }
    const d = e.target.closest('[data-delatk]');
    if (d) { if (!d.dataset.sure) { d.dataset.sure = '1'; d.textContent = 'Tap again to delete'; return; } c.attacks.splice(i, 1); save(c.id); render(); navStack = []; attacksDrawer(c); toast('Attack deleted'); }
  }));
}

// ---------- dice tray: for big batches of dice ----------
const tray = {pool:{4:0,6:0,8:0,10:0,12:0,20:0,100:0}, mod:0, mode:'sum', adv:'norm', label:'', last:null};
function trayExpr(){ const parts = Object.entries(tray.pool).filter(([,n]) => n).map(([f,n]) => `${n}d${f}`); return parts.join(' + ') + (tray.mod ? (tray.mod > 0 ? ' + ' : ' − ') + Math.abs(tray.mod) : ''); }
function rollTray(){
  const groups = Object.entries(tray.pool).filter(([,n]) => n);
  if (!groups.length) { toast('Add some dice first'); return; }
  const d20only = groups.length === 1 && groups[0][0] === '20';
  const one = f => 1 + Math.floor(Math.random() * f);
  const label = tray.label || trayExpr();
  if (tray.mode === 'each') {
    const out = [];
    groups.forEach(([f,n]) => { for (let i = 0; i < n; i++) {
      let v = one(+f), note = '';
      if (+f === 20 && tray.adv !== 'norm') { const b = one(20); note = `(${v},${b})`; v = tray.adv === 'adv' ? Math.max(v,b) : Math.min(v,b); }
      out.push({f, v, t: v + tray.mod, note});
    } });
    tray.last = {label, total: out.map(o => o.t).join(', '), detail: out.map(o => `d${o.f}${o.note} ${o.v}${tray.mod ? sgn(tray.mod) : ''}`).join(' · '), list: out};
    pushRoll({label: label + ' (each)', total: tray.last.total, detail: tray.last.detail, nat: d20only && out.length === 1 ? out[0].v : null}, true);
  } else {
    let sum = 0; const det = [];
    groups.forEach(([f,n]) => { const rs = Array.from({length:n}, () => one(+f)); sum += rs.reduce((a,b) => a+b, 0); det.push(`${n}d${f} [${rs.join(', ')}]`); });
    const total = sum + tray.mod;
    tray.last = {label, total, detail: det.join(' + ') + (tray.mod ? ` ${sgn(tray.mod)}` : '')};
    pushRoll({label, total, detail: tray.last.detail}, true);
  }
  diceTray();
}
function diceTray(){
  const dice = [4,6,8,10,12,20,100];
  const hasD20 = tray.pool[20] > 0;
  const body = `<div class="dicegrid">${dice.map(f => `<div class="die"><button class="dbtn" data-addd="${f}" aria-label="Add a d${f}">d${f}</button><span class="dn">${tray.pool[f] ? '×' + tray.pool[f] : ''}</span>${tray.pool[f] ? `<button class="xs" data-subd="${f}" aria-label="Remove a d${f}">−</button>` : ''}</div>`).join('')}</div>
    <div class="res" style="padding:10px 0"><div class="main"><div class="t">Modifier</div><div class="m">${tray.mode === 'each' ? 'Added to every die' : 'Added once to the total'}</div></div><div class="counter"><button data-tmod="-1" aria-label="Lower modifier">−</button><b>${sgn(tray.mod)}</b><button data-tmod="1" aria-label="Raise modifier">+</button></div></div>
    <div class="seg" role="group" style="margin-bottom:8px"><button data-tmode="sum" aria-pressed="${tray.mode === 'sum'}">Add together</button><button data-tmode="each" aria-pressed="${tray.mode === 'each'}">Each separately</button></div>
    ${hasD20 && tray.mode === 'each' ? `<div class="seg" role="group" style="margin-bottom:8px"><button data-tadv="dis" aria-pressed="${tray.adv === 'dis'}">Disadvantage</button><button data-tadv="norm" aria-pressed="${tray.adv === 'norm'}">Normal</button><button data-tadv="adv" aria-pressed="${tray.adv === 'adv'}">Advantage</button></div>` : ''}
    <div class="field"><label for="tlabel">What is it for (optional)</label><input id="tlabel" value="${esc(tray.label)}" placeholder="Fireball, goblin attacks…"></div>
    <p class="big" style="text-align:center;margin:4px 0">${esc(trayExpr() || 'No dice yet')}</p>
    ${tray.last ? `<div class="callout"><b>${esc(tray.last.label)}</b><br><span class="rv" style="display:inline-block;min-width:0">${esc(tray.last.total)}</span><br><span class="m">${esc(tray.last.detail)}</span></div>` : ''}
    <p class="note">${BE ? 'Rolls are shared live with the party.' : 'Rolls show in this browser only.'}</p>`;
  openDrawer('Dice tray', body, `<button class="btn" data-tclear>Clear</button><button class="btn pri" data-troll>Roll</button>`, el => {
    el.addEventListener('click', e => {
      const a = e.target.closest('[data-addd]'); if (a) { tray.pool[a.dataset.addd]++; tray.last = null; diceTray(); return; }
      const s = e.target.closest('[data-subd]'); if (s) { tray.pool[s.dataset.subd] = Math.max(0, tray.pool[s.dataset.subd] - 1); diceTray(); return; }
      const m = e.target.closest('[data-tmod]'); if (m) { tray.mod += +m.dataset.tmod; diceTray(); return; }
      const md = e.target.closest('[data-tmode]'); if (md) { tray.mode = md.dataset.tmode; diceTray(); return; }
      const ad = e.target.closest('[data-tadv]'); if (ad) { tray.adv = ad.dataset.tadv; diceTray(); return; }
      if (e.target.closest('[data-tclear]')) { Object.keys(tray.pool).forEach(k => tray.pool[k] = 0); tray.mod = 0; tray.label = ''; tray.last = null; diceTray(); return; }
      if (e.target.closest('[data-troll]')) rollTray();
    });
    el.querySelector('#tlabel').addEventListener('input', e => { tray.label = e.target.value; });
  });
}
// ---------- portraits ----------
function portraitDrawer(c){
  if (!c) return;
  const u = c.portrait && portraitUrls[c.portrait];
  if (!BE) { openDrawer('Portrait', '<p>Portrait upload works on the hosted website version of the app.</p>', ''); return; }
  openDrawer('Portrait: ' + esc(c.name), `${u ? `<img class="bigportrait" src="${u}" alt="Portrait of ${esc(c.name)}">` : '<p class="note">No portrait yet.</p>'}
    <div class="field"><label for="pfile">Choose a picture</label><input id="pfile" type="file" accept="image/*"></div><p class="note" id="pmsg">It is resized on your phone before upload and shared with the party.</p>`,
    `${c.portrait ? '<button class="btn danger" data-prm>Remove</button>' : ''}`, el => {
      el.querySelector('#pfile').addEventListener('change', async e => {
        const f = e.target.files && e.target.files[0]; if (!f) return;
        const msg = el.querySelector('#pmsg'); msg.textContent = 'Uploading…';
        try {
          const blob = await shrink(f, 640);
          const old = c.portrait, path = `${c.id}/${Date.now()}.jpg`;
          await BE.upload(path, blob);
          portraitUrls[path] = URL.createObjectURL(blob);
          c.portrait = path; commit(c); closeDrawer(); toast('Portrait updated');
          if (old) BE.remove(old).catch(() => {});
        } catch(err){ msg.textContent = 'Upload failed. Try a smaller picture or check your connection.'; }
      });
      el.addEventListener('click', e => { if (e.target.closest('[data-prm]')) { const old = c.portrait; c.portrait = null; commit(c); closeDrawer(); if (old) BE.remove(old).catch(() => {}); } });
    });
}
async function shrink(file, max){
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
  cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
  return await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.85));
}

// ---------- pickers ----------
function picker(opts){
  const {title, intro, items, need, onDone, allowFewer} = opts;
  const sel = new Set(opts._sel || []);
  let q = '';
  const draw = el => {
    const shown = items.filter(it => !q || (it.label + ' ' + (it.sub || '')).toLowerCase().includes(q));
    el.querySelector('#plist').innerHTML = shown.map(it => `<label class="pick"><input type="checkbox" data-id="${esc(it.id)}" ${sel.has(it.id) ? 'checked' : ''}><div class="main"><div class="t">${esc(it.label)}</div>${it.sub ? `<div class="note">${esc(it.sub)}</div>` : ''}</div>${it.link ? `<button type="button" class="info" data-l="${esc(it.link)}" aria-label="Read ${esc(it.label)}">i</button>` : ''}</label>`).join('') || '<p class="note">Nothing matches.</p>';
    el.querySelector('#pcount').textContent = allowFewer ? `${sel.size} chosen (up to ${need})` : `${sel.size} of ${need} chosen`;
    el.querySelector('[data-pdone]').disabled = !(sel.size === need || (allowFewer && sel.size <= need));
  };
  const self = () => picker(Object.assign({}, opts, {_sel:[...sel]}));
  openDrawer(esc(title), `${intro ? `<p class="note">${intro}</p>` : ''}<input class="search" id="psearch" type="search" placeholder="Search" aria-label="Search"><div id="plist"></div>`,
    `<span class="note" id="pcount" style="align-self:center"></span><button class="btn pri" data-pdone>Done</button>`, el => {
      el.querySelector('#psearch').addEventListener('input', e => { q = e.target.value.toLowerCase(); draw(el); });
      el.addEventListener('change', e => { const cb = e.target.closest('input[data-id]'); if (!cb) return; if (cb.checked) { if (sel.size >= need) { cb.checked = false; toast(`Choose up to ${need}`); return; } sel.add(cb.dataset.id); } else sel.delete(cb.dataset.id); draw(el); });
      el.addEventListener('click', e => { if (e.target.closest('[data-pdone]')) { const out = [...sel]; const after = opts.after; closeDrawer(); onDone(out); if (after) after(); } });
      draw(el);
    }, self);
}
function spellItems(c, filterFn, keep){
  const have = new Set(spellList(c).map(s => s.k));
  return Object.entries(R.spells).filter(([k,s]) => filterFn(k,s) && (!have.has(k) || (keep && keep.has(k))))
    .sort((a,b) => a[1].l - b[1].l || a[1].n.localeCompare(b[1].n))
    .map(([k,s]) => ({id:k, label:s.n, sub:`${s.l ? ord(s.l) : 'Cantrip'} · ${s.sc} · ${s.t.split(',')[0]}${s.conc ? ' · C' : ''}${s.rit ? ' · Ritual' : ''}${s.mark && !s.cls.includes(c.cls) ? ' · Mark of Warding' : ''}`, link:'spell|' + k}));
}
const onClassList = (c, k, s) => s.cls.includes(c.cls) || (c.cls === 'Sorcerer' && hasFeat(c,'Mark of Warding') && s.mark);
function invItems(c, L, keep){
  return R.invocations.filter(v => v.lv <= L && (v.rep || !hasInv(c, v.n) || (keep && keep.has(v.n))) && (!v.pact || hasInv(c, v.pact)))
    .map(v => ({id:v.n, label:v.n, sub:(v.lv > 1 ? `Level ${v.lv}+` : 'Any level') + (v.pact ? ` · needs ${v.pact}` : ''), link:'opt|' + v.n.toLowerCase()}));
}
function fix(c, k){
  const r = row(c), n = counts(c), ml = maxSpellLevel(c);
  if (k === 'can') picker({title:'Choose cantrips', items:spellItems(c,(kk,s) => s.l === 0 && onClassList(c,kk,s)), need:r.can - n.can, onDone:ks => { ks.forEach(x => c.spells.push({k:x, src:'class'})); commit(c); }});
  if (k === 'prep') picker({title:'Choose spells', items:spellItems(c,(kk,s) => s.l > 0 && s.l <= ml && onClassList(c,kk,s)), need:r.prep - n.prep, onDone:ks => { ks.forEach(x => c.spells.push({k:x, src:'class'})); commit(c); }});
  if (k === 'inv') picker({title:'Choose invocations', items:invItems(c, c.level), need:r.inv - c.invocations.length, onDone:ks => { c.invocations.push(...ks); normalise(c); commit(c); }});
  if (k === 'meta') picker({title:'Choose Metamagic', items:R.metamagic.filter(m => !c.metamagic.includes(m.n)).map(m => ({id:m.n, label:m.n, link:'opt|' + m.n.toLowerCase()})), need:metaMax(c.level) - c.metamagic.length, onDone:ks => { c.metamagic.push(...ks); commit(c); }});
  if (k === 'mastery') picker({title:'Weapon Mastery', intro:'Rogues master two kinds of weapon: Simple weapons, or Martial weapons with the Finesse or Light property. You can change one choice after each Long Rest.',
    items:R.weapons.filter(w => w.cat === 'simple' || w.p.includes('Finesse') || w.p.includes('Light')).map(w => ({id:w.n, label:`${w.n} (${w.m})`, sub:`${w.d} ${w.t} · ${w.p.join(', ')}`, link:'weapon|' + w.n})),
    _sel:c.masteries, need:2, allowFewer:true, onDone:ks => { c.masteries = ks; commit(c); }});
}
function addSpells(c, mode){
  const r = row(c);
  let items, need, title, intro;
  const current = new Set((c.spells || []).filter(s => s.src === mode).map(s => s.k));
  if (mode === 'class') {
    const ml = maxSpellLevel(c);
    items = spellItems(c, (k,s) => s.l <= ml && onClassList(c,k,s), current);
    need = r.can + r.prep + (c.spells || []).filter(s => s.src === 'class' && s.off).length;
    title = `${c.cls} spells`; intro = `Tick the cantrips and spells you know. At level ${c.level} the table allows ${r.can} cantrips and ${r.prep} prepared spells.`;
  }
  if (mode === 'tome') { items = spellItems(c, (k,s) => s.l === 0 || (s.l === 1 && s.rit), current); need = 5; title = 'Book of Shadows'; intro = 'Three cantrips and two level 1 Ritual spells, from any class. You can change them whenever you conjure the book.'; }
  if (mode === 'mi') { items = spellItems(c, (k,s) => (s.l <= 1 && s.cls.includes('Cleric')) || current.has(k), current); need = 3; title = 'Magic Initiate (Cleric)'; intro = 'Two Cleric cantrips and one level 1 Cleric spell. When you gain a level you can replace one of them.'; }
  picker({title, intro, items, need, allowFewer:true, _sel:[...current], onDone:ks => {
    const keepOff = new Set((c.spells || []).filter(s => s.src === mode && s.off).map(s => s.k));
    c.spells = (c.spells || []).filter(s => s.src !== mode).concat(ks.map(k => keepOff.has(k) ? {k, src:mode, off:true} : {k, src:mode}));
    commit(c); toast('Spell list updated');
  }});
}

// ---------- level up ----------
function levelUp(c){
  const L1 = c.level + 1, C = cl(c), r0 = row(c), r1 = C.table[L1 - 1];
  const plan = {hpMode:'avg', asi:null, picks:{}};
  const steps = ['hp','features'];
  if (C.asi.includes(L1) || L1 === C.boon) steps.push('asi');
  if (c.cls === 'Warlock' && r1.inv > r0.inv) steps.push('inv');
  if ((c.cls === 'Warlock' || c.cls === 'Sorcerer') && r1.can > r0.can) steps.push('can');
  if ((c.cls === 'Warlock' || c.cls === 'Sorcerer') && r1.prep > r0.prep) steps.push('prep');
  if (c.cls === 'Warlock' && [11,13,15,17].includes(L1)) steps.push('arcanum');
  if (c.cls === 'Sorcerer' && metaMax(L1) > metaMax(c.level)) steps.push('meta');
  if (c.cls === 'Rogue' && L1 === 6) steps.push('expertise');
  steps.push('confirm');
  let i = 0;
  const conM = mod(c.ab.con), hdAvg = C.hd / 2 + 1;
  const NEED = {inv: (r1.inv || 0) - (r0.inv || 0), can: (r1.can || 0) - (r0.can || 0), prep: (r1.prep || 0) - (r0.prep || 0), arcanum:1, meta: metaMax(L1) - metaMax(c.level), expertise:2};
  const STEPNAME = {hp:'Hit points',features:'New features',asi:L1 === C.boon ? 'Epic Boon' : 'Ability scores',inv:'Invocations',can:'Cantrips',prep:'Spells',arcanum:'Mystic Arcanum',meta:'Metamagic',expertise:'Expertise',confirm:'Confirm'};
  const incFor = a => !plan.asi ? 0 : plan.asi.mode === 'asi' ? (plan.asi.inc[a] || 0) : (plan.asi.featAb === a ? 1 : 0);
  const featChosen = n => plan.asi && plan.asi.mode === 'feat' && plan.asi.feat === n;
  const hpGain = () => Math.max(1, (plan.hpMode === 'avg' ? hdAvg : (plan.roll || 0)) + mod(c.ab.con + incFor('con'))) + (c.tough || featChosen('Tough') ? 2 : 0);
  const conRetro = () => (mod(c.ab.con + incFor('con')) - conM) * c.level + (featChosen('Tough') ? 2 * c.level : 0);
  const show = () => {
    const s = steps[i];
    const bar = `<div class="steps">${steps.map((_,j) => `<i class="${j <= i ? 'on' : ''}"></i>`).join('')}</div>`;
    let body = '', ok = true;
    if (s === 'hp') {
      const avg = hdAvg + conM + (c.tough ? 2 : 0);
      body = `<p>${lk('rule','hit point dice','Hit Die')}: d${C.hd}, Constitution ${sgn(conM)}${c.tough ? `, ${lk('feat','tough','Tough')} +2` : ''}.</p>
       <div class="seg" role="group"><button data-mode="avg" aria-pressed="${plan.hpMode === 'avg'}">Take average (+${avg})</button><button data-mode="roll" aria-pressed="${plan.hpMode === 'roll'}">Roll or enter</button></div>
       ${plan.hpMode === 'roll' ? `<div class="field" style="margin-top:10px"><label for="hproll">Die result (1 to ${C.hd})</label><input id="hproll" type="number" inputmode="numeric" min="1" max="${C.hd}" value="${plan.roll || ''}"></div><button class="btn sm" data-rolldie>Roll d${C.hd}</button>` : ''}
       <p class="note" style="margin-top:10px">New maximum: <b id="newmax">${c.hpMax + hpGain()}</b> (was ${c.hpMax})</p>`;
      ok = plan.hpMode === 'avg' || (plan.roll >= 1 && plan.roll <= C.hd);
    }
    if (s === 'features') {
      const nf = C.feats.filter(f => f.lv === L1), sf = (R.subclasses[c.sub] || []).filter(f => f.lv === L1);
      const auto = [];
      if (pbOf(L1) > pbOf(c.level)) auto.push(`${lk('rule','proficiency','Proficiency Bonus')} rises to ${sgn(pbOf(L1))}`);
      if (tierOf(L1) > tierOf(c.level)) auto.push(lk('rule','cantrip','Cantrips') + ' get stronger' + (spellList(c).some(x => x.k === 'eldritch blast') ? ` (${lk('spell','eldritch blast','Eldritch Blast')}: ${tierOf(L1)} beams)` : ''));
      if (c.cls === 'Warlock') { if (r1.slots > r0.slots) auto.push(`Pact slots: ${r1.slots}`); if (r1.sl > r0.sl) auto.push(`Pact slots become ${ord(r1.sl)} level`); }
      if (c.cls === 'Sorcerer') { r1.slots.forEach((n,j) => { if (n > r0.slots[j]) auto.push(`${ord(j+1)}-level slots: ${n}`); }); if (r1.sp > r0.sp) auto.push(`Sorcery Points: ${r1.sp}`); }
      if (c.cls === 'Rogue' && r1.sa > r0.sa) auto.push(`${lk('cf','Sneak Attack','Sneak Attack')}: ${r1.sa}d6`);
      const ss = R.subSpells[c.sub]; if (ss && ss[L1]) auto.push('Always prepared now: ' + ss[L1].map(k => lk('spell', k, R.spells[k].n)).join(', '));
      if (c.sub === 'Celestial') auto.push(`${lk('sf','Healing Light','Healing Light')} pool: ${L1 + 1}d6`);
      body = (auto.length ? `<div class="callout">${auto.join('<br>')}</div>` : '') +
        (nf.length || sf.length ? '<div class="card">' + nf.map(f => featBlock(`cf:${c.cls}:${f.lv}:${f.n}`, f.n, c.cls, f.h, false, C.u)).join('') + sf.map(f => featBlock(`sf:${c.sub}:${f.n}`, f.n, c.subName, f.h, true, C.u)).join('') + '</div>' : '<p class="note">No new named features at this level.</p>');
    }
    if (s === 'asi') {
      const boon = L1 === C.boon, a = plan.asi || {mode: boon ? 'feat' : 'asi', inc:{}};
      plan.asi = a;
      const tot = Object.values(a.inc).reduce((x,y) => x + y, 0), cap = boon ? 30 : 20;
      const f = a.feat ? R.feats.find(x => x.n === a.feat) : null;
      body = `<p>${boon ? 'Epic Boon: choose a boon feat. It also raises one ability by 1, up to 30.' : 'Ability Score Improvement: +2 to one score or +1 to two (maximum 20), or take a feat instead.'}</p>
       ${boon ? '' : `<div class="seg" role="group"><button data-amode="asi" aria-pressed="${a.mode === 'asi'}">Raise scores</button><button data-amode="feat" aria-pressed="${a.mode === 'feat'}">Take a feat</button></div>`}
       ${a.mode === 'feat' ? `<div class="field" style="margin-top:10px"><label for="featsel">Feat</label><select id="featsel"><option value="">Choose…</option>${R.feats.filter(x => boon ? x.cat === 'EB' : (x.cat === 'G' && x.n !== 'Ability Score Improvement') || x.cat === 'O').map(x => `<option ${a.feat === x.n ? 'selected' : ''}>${esc(x.n)}</option>`).join('')}</select></div>
         ${f ? `${f.pre ? `<p class="note">Prerequisite: ${esc(f.pre)}</p>` : ''}${f.ab && f.ab.length ? `<div class="field"><label for="featab">Ability +1</label><select id="featab">${f.ab.map(x => `<option value="${x}" ${a.featAb === x ? 'selected' : ''}>${ABN[x]} (${c.ab[x]})</option>`).join('')}</select></div>` : ''}<div class="rt">${f.h || `<p class="note">Not in the free SRD. <a href="${f.u}" target="_blank" rel="noopener">Full text on 5e.tools</a></p>`}</div>` : ''}` : ''}
       ${a.mode === 'asi' ? `<div class="card list" style="margin-top:10px">${AB.map(x => `<div class="row"><div class="main">${ABN[x]} <span class="m">${c.ab[x]}${a.inc[x] ? ' → ' + (c.ab[x] + a.inc[x]) : ''}</span></div><div class="counter"><button data-inc="${x}" data-d="-1" aria-label="Lower">−</button><b>+${a.inc[x] || 0}</b><button data-inc="${x}" data-d="1" aria-label="Raise" ${tot >= 2 || c.ab[x] + (a.inc[x] || 0) >= cap ? 'disabled' : ''}>+</button></div></div>`).join('')}</div><p class="note">${2 - tot} point${2 - tot === 1 ? '' : 's'} left</p>` : ''}`;
      ok = a.mode === 'asi' ? tot === 2 : !!a.feat;
    }
    if (['inv','can','prep','arcanum','meta','expertise'].includes(s)) {
      const label = {inv:'Eldritch Invocations', can:'Cantrips', prep:'Prepared spells', arcanum:`Mystic Arcanum (${ord({11:6,13:7,15:8,17:9}[L1])}-level spell)`, meta:'Metamagic', expertise:'Expertise'}[s];
      const got = plan.picks[s] || [];
      const names = got.map(x => s === 'expertise' ? esc(skillName(x)) : (s === 'inv' || s === 'meta') ? lk('opt', x.toLowerCase(), x) : (R.spells[x] ? lk('spell', x, R.spells[x].n) : esc(x)));
      body = `<p>Choose <b>${NEED[s]}</b>: ${label.toLowerCase()}.</p><div class="card list" style="margin-bottom:10px">${names.length ? names.map(n => `<div class="row"><div class="main">${n}</div></div>`).join('') : '<div class="row"><div class="main note">Nothing chosen yet.</div></div>'}</div><button class="btn" data-pickstep="${s}">${names.length ? 'Change choices' : 'Choose'}</button>`;
      if (['prep','can','inv'].includes(s)) body += `<p class="note" style="margin-top:10px">You can also swap one existing ${s === 'inv' ? 'invocation' : 'spell'} at level-up, from the Features or Spells tab afterwards.</p>`;
      ok = got.length === NEED[s];
    }
    if (s === 'confirm') {
      const lines = [`Level ${c.level} → <b>${L1}</b>`, `HP maximum ${c.hpMax} → <b>${c.hpMax + hpGain() + conRetro()}</b>`];
      if (plan.asi) lines.push(plan.asi.mode === 'asi' ? 'Scores: ' + Object.entries(plan.asi.inc).filter(([,v]) => v).map(([k,v]) => `${ABN[k]} +${v}`).join(', ') : `Feat: ${esc(plan.asi.feat)}${plan.asi.featAb ? ` (${ABN[plan.asi.featAb]} +1)` : ''}`);
      for (const [k,v] of Object.entries(plan.picks)) if (v.length) lines.push(`${STEPNAME[k]}: ${v.map(x => k === 'expertise' ? skillName(x) : (R.spells[x] ? R.spells[x].n : x)).map(esc).join(', ')}`);
      body = `<div class="card list">${lines.map(l => `<div class="row"><div class="main">${l}</div></div>`).join('')}</div><p class="note" style="margin-top:10px">You can undo this from the Gear tab.</p>`;
    }
    const foot = `${i > 0 ? '<button class="btn" data-back>Back</button>' : ''}<button class="btn pri" data-next ${ok ? '' : 'disabled'}>${s === 'confirm' ? `Become level ${L1}` : 'Next'}</button>`;
    openDrawer(`Level ${L1}: ${STEPNAME[s]}`, bar + body, foot, bind, show);
  };
  function bind(el){
    el.addEventListener('click', e => {
      const t = e.target;
      if (t.closest('[data-mode]')) { plan.hpMode = t.closest('[data-mode]').dataset.mode; show(); return; }
      if (t.closest('[data-rolldie]')) { plan.roll = 1 + Math.floor(Math.random() * C.hd); show(); return; }
      if (t.closest('[data-amode]')) { plan.asi.mode = t.closest('[data-amode]').dataset.amode; show(); return; }
      const inc = t.closest('[data-inc]'); if (inc) { const a = inc.dataset.inc; plan.asi.inc[a] = Math.max(0, (plan.asi.inc[a] || 0) + (+inc.dataset.d)); show(); return; }
      const ps = t.closest('[data-pickstep]'); if (ps) { pickStep(ps.dataset.pickstep); return; }
      if (t.closest('[data-back]')) { i--; show(); return; }
      if (t.closest('[data-next]')) { if (steps[i] === 'confirm') { apply(); return; } i++; show(); return; }
    });
    el.addEventListener('input', e => {
      if (e.target.id === 'hproll') { plan.roll = parseInt(e.target.value, 10) || 0; el.querySelector('[data-next]').disabled = !(plan.roll >= 1 && plan.roll <= C.hd); el.querySelector('#newmax').textContent = c.hpMax + hpGain(); }
    });
    el.addEventListener('change', e => {
      if (e.target.id === 'featsel') { plan.asi.feat = e.target.value; const f = R.feats.find(x => x.n === plan.asi.feat); plan.asi.featAb = f && f.ab && f.ab.length ? f.ab[0] : null; show(); }
      if (e.target.id === 'featab') { plan.asi.featAb = e.target.value; show(); }
    });
  }
  function pickStep(s){
    const ml = maxSpellLevel(c, r1);
    const exclude = new Set(Object.entries(plan.picks).filter(([k]) => k !== s).flatMap(([,v]) => v));
    let items;
    if (s === 'inv') items = invItems(c, L1).filter(x => !exclude.has(x.id));
    if (s === 'can') items = spellItems(c, (k,sp) => sp.l === 0 && onClassList(c,k,sp) && !exclude.has(k));
    if (s === 'prep') items = spellItems(c, (k,sp) => sp.l > 0 && sp.l <= ml && onClassList(c,k,sp) && !exclude.has(k));
    if (s === 'arcanum') { const al = {11:6,13:7,15:8,17:9}[L1]; items = spellItems(c, (k,sp) => sp.l === al && sp.cls.includes('Warlock')); }
    if (s === 'meta') items = R.metamagic.filter(m => !c.metamagic.includes(m.n)).map(m => ({id:m.n, label:m.n, link:'opt|' + m.n.toLowerCase()}));
    if (s === 'expertise') items = SKILLS.filter(([k]) => c.skills[k] === 1).map(([k,n]) => ({id:k, label:n, link:'skill|' + n.toLowerCase()})).concat(c.expertise.includes('thieves') ? [] : [{id:'thieves', label:"Thieves' Tools"}]);
    navStack.push(show);
    picker({title:'Choose: ' + STEPNAME[s], items, need:NEED[s], _sel:plan.picks[s], onDone:ks => { plan.picks[s] = ks; }, after: show});
  }
  function apply(){
    const snap = clone(c); delete snap.history;
    c.history = (c.history || []).concat([snap]).slice(-5);
    const gain = hpGain(), retro = conRetro();
    if (plan.asi) {
      if (plan.asi.mode === 'asi') for (const [k,v] of Object.entries(plan.asi.inc)) c.ab[k] = Math.min(20, c.ab[k] + v);
      else { const cap = L1 === C.boon ? 30 : 20; if (plan.asi.featAb) c.ab[plan.asi.featAb] = Math.min(cap, c.ab[plan.asi.featAb] + 1); c.feats.push({n:plan.asi.feat, note:`Level ${L1}`}); if (plan.asi.feat === 'Tough') c.tough = true; if (plan.asi.feat === 'Resilient' && plan.asi.featAb && !c.saves.includes(plan.asi.featAb)) c.saves.push(plan.asi.featAb); }
    }
    c.level = L1; c.hpMax += gain + retro; c.hp += gain + retro;
    const p = plan.picks;
    (p.inv || []).forEach(x => c.invocations.push(x));
    (p.can || []).forEach(x => c.spells.push({k:x, src:'class'}));
    (p.prep || []).forEach(x => c.spells.push({k:x, src:'class'}));
    if (p.arcanum && p.arcanum[0]) c.arcanum[{11:6,13:7,15:8,17:9}[L1]] = p.arcanum[0];
    (p.meta || []).forEach(x => c.metamagic.push(x));
    (p.expertise || []).forEach(x => { if (x !== 'thieves') c.skills[x] = 2; c.expertise.push(x); });
    normalise(c); commit(c); closeDrawer(); toast(`${c.name} is now level ${L1}`);
  }
  show();
}

// ---------- events ----------
// Links work everywhere, drawers included, and remember where you came from.
document.addEventListener('click', e => {
  const a = e.target.closest('a.lk, button.info[data-l]');
  if (a) {
    e.preventDefault(); e.stopPropagation();
    const [ty, ...rest] = a.dataset.l.split('|');
    if (document.getElementById('scrim') && curReopen) navStack.push(curReopen);
    const hold = a.closest('[data-ctx]'); if (hold && !a.closest('#scrim')) ctxOverride = hold.dataset.ctx;
    openEntity(ty, rest.join('|'));
    return;
  }
  const b = e.target.closest('[data-act="edittext"],[data-act="cleartext"]');
  if (b) {
    e.preventDefault(); e.stopPropagation();
    const key = b.dataset.key;
    if (b.dataset.act === 'edittext') textEditor(key, key.split(':').pop());
    else { delete texts[key]; saveTexts(); closeDrawer(); render(); toast('Your text removed'); }
    return;
  }
  const ib = e.target.closest('[data-install]');
  if (ib && installEvt) { e.preventDefault(); e.stopPropagation(); installEvt.prompt(); installEvt.userChoice.finally(() => { installEvt = null; render(); }); return; }
  const nb = e.target.closest('[data-noinstall]');
  if (nb) { e.preventDefault(); e.stopPropagation(); ui.noInstall = true; lsSet(LS_UI, ui); render(); return; }
  const dz = e.target.closest('[data-dice]');
  if (dz) { e.preventDefault(); e.stopPropagation(); diceTray(); return; }
  const pt = e.target.closest('[data-portrait]');
  if (pt && !e.target.closest('#scrim')) { e.preventDefault(); e.stopPropagation(); portraitDrawer(chars[pt.dataset.portrait]); return; }
  const so = e.target.closest('[data-act="signout"]');
  if (so && BE) { e.preventDefault(); e.stopPropagation(); BE.signOut(); return; }
  const as = e.target.closest('[data-addspells]');
  if (as && ctxChar()) { e.preventDefault(); e.stopPropagation(); addSpells(ctxChar(), as.dataset.addspells); return; }
  const go = e.target.closest('#scrim') ? null : e.target.closest('[data-go]');
  if (go) { e.preventDefault(); e.stopPropagation(); ui.cur = go.dataset.go; try { history.replaceState(null, '', '#' + ui.cur); } catch(_){} render(); window.scrollTo(0,0); }
}, true);
document.addEventListener('change', e => {
  const s = e.target.closest('[data-invtarget]'); if (!s) return;
  const c = ctxChar(); if (!c) return;
  c.invTargets[s.dataset.invtarget] = s.value; save(c.id);
  if (document.getElementById('scrim') && curReopen) { const fn = curReopen; render(); fn(); } else render();
  toast(`${s.dataset.invtarget} now applies to ${R.spells[s.value].n}`);
}, true);

document.addEventListener('click', e => {
  const t = e.target;
  if (t.closest('#scrim')) return;
  if (ui.cur === 'init') {
    if (t.closest('[data-inext]')) { if (combat.round < 1) { sortCombat(); } nextTurn(1); return; }
    if (t.closest('[data-iprev]')) { nextTurn(-1); return; }
    if (t.closest('[data-isort]')) { sortCombat(); saveCombat(); render(); toast('Sorted'); return; }
    if (t.closest('[data-iparty]')) { ensureParty(); saveCombat(); render(); return; }
    if (t.closest('[data-irollall]')) { const msgs = combat.list.filter(e => !e.standby && e.init == null).map(rollInit); saveCombat(); render(); toast(msgs.join(', ')); return; }
    const nw = t.closest('[data-inew]'); if (nw) { if (!nw.dataset.sure) { nw.dataset.sure = '1'; nw.textContent = 'Tap again: clear enemies'; setTimeout(() => { if (nw.isConnected) { delete nw.dataset.sure; nw.textContent = 'New combat'; } }, 4000); return; } newCombat(); return; }
    const ir = t.closest('[data-iroll]'); if (ir) { const e = combat.list.find(x => x.id === ir.dataset.iroll); if (e) { const msg = rollInit(e); saveCombat(); render(); toast(msg); } return; }
    const io = t.closest('[data-iopen]'); if (io) { initDrawer(io.dataset.iopen); return; }
    const ih = t.closest('[data-ihp]'); if (ih) { initHpDrawer(ih.dataset.ihp); return; }
    const qa = t.closest('[data-qadd]'); if (qa) { addCreatures(+qa.dataset.qadd, null); return; }
    if (t.closest('[data-iaddv]')) { const v = parseInt(ui.ia.v, 10); if (isNaN(v)) { toast('Type the initiative first'); return; } addCreatures(0, v); return; }
    if (t.closest('[data-ilair]')) { combat.list.push({id: uid(), n: uniqueName('Lair action'), kind: 'enemy', mod: -99, init: 20, conds: [], note: 'Loses ties'}); saveCombat(); render(); return; }
    const jn = t.closest('[data-ijoin]'); if (jn) { const e = combat.list.find(x => x.id === jn.dataset.ijoin); if (e) { e.standby = false; const msg = rollInit(e); saveCombat(); render(); toast(msg); } return; }
    const rm = t.closest('[data-irm]'); if (rm) { if (!rm.dataset.sure) { rm.dataset.sure = '1'; rm.textContent = 'Sure?'; return; } combat.list = combat.list.filter(x => x.id !== rm.dataset.irm); saveCombat(); render(); return; }
    return;
  }
  if (ui.cur === 'party') {
    const qd = t.closest('[data-qdone]'); if (qd) { const q = party.quests.find(x => x.id === qd.dataset.qdone); if (q) { q.done = qd.checked; saveItem('quests', q); render(); } return; }
    const ed = t.closest('[data-edit]'); if (ed) { const [coll, id] = ed.dataset.edit.split('|'); editItem(coll, id); return; }
    const act = t.closest('[data-act]');
    if (act && act.dataset.act === 'hp') hpDrawer(chars.mule);
    if (act && act.dataset.act === 'mule-rest') { chars.mule.hp = chars.mule.hpMax; save('mule'); render(); toast('Mule is rested'); }
    return;
  }
  const c = chars[ui.cur];
  const tab = t.closest('[data-tab]'); if (tab) { ui.tab[ui.cur] = tab.dataset.tab; render(); window.scrollTo(0,0); return; }
  const fl = t.closest('[data-filter]'); if (fl) { ui.filter[ui.cur] = fl.dataset.filter; render(); return; }
  const sp = t.closest('[data-sp]'); if (sp) { spellDrawer(sp.dataset.sp, c); return; }
  const fx = t.closest('[data-fix]'); if (fx) { fix(c, fx.dataset.fix); return; }
  const rl = t.closest('[data-roll]');
  if (rl) {
    const [kind, k] = rl.dataset.roll.split(':'), d = D(c);
    if (kind === 'init') rollMenu('Initiative', d.init, c, c.initAdv);
    if (kind === 'check') rollMenu(`${ABN[k]} check`, d.m[k], c);
    if (kind === 'save') rollMenu(`${ABN[k]} save`, d.m[k] + (c.saves.includes(k) ? d.pb : 0), c);
    if (kind === 'skill') rollMenu(skillName(k), d.skills[k], c);
    if (kind === 'death') { const r = d20(); if (r === 20) { c.hp = 1; c.used.dS = 0; c.used.dF = 0; } else if (r === 1) c.used.dF = Math.min(3, used(c,'dF') + 2); else if (r >= 10) c.used.dS = Math.min(3, used(c,'dS') + 1); else c.used.dF = Math.min(3, used(c,'dF') + 1); save(c.id); pushRoll({label:'Death save', total:r, nat:r, detail: r === 20 ? 'Natural 20: back up with 1 HP' : r === 1 ? 'Natural 1: two failures' : r >= 10 ? 'Success' : 'Failure'}); }
    if (kind === 'heal') { const max = Math.max(1, d.cm), left = 1 + c.level - used(c,'heal'), n = Math.min(max, left); if (n <= 0) { toast('Healing Light pool is empty'); return; } const r = rollExpr(`${n}d6`); c.used.heal = used(c,'heal') + n; save(c.id); pushRoll({label:`Healing Light (${n}d6)`, total:r.total, detail:r.detail + ' HP restored'}); }
    return;
  }
  const pip = t.closest('[data-res]');
  if (pip) { const id = pip.dataset.res, idx = +pip.dataset.i, max = slotMax(c, id), left = max - used(c,id); c.used[id] = Math.max(0, Math.min(max, used(c,id) + (idx < left ? 1 : -1))); commit(c); return; }
  const dp = t.closest('[data-pip]'); if (dp) { const id = dp.dataset.pip, idx = +dp.dataset.i; c.used[id] = used(c,id) > idx ? idx : idx + 1; if (used(c,'dS') >= 3) toast('Stable at 0 HP'); if (used(c,'dF') >= 3) toast('Three failures'); commit(c); return; }
  const cnt = t.closest('[data-cnt]'); if (cnt) { const id = cnt.dataset.cnt, max = id === 'sp' ? row(c).sp : slotMax(c, id); c.used[id] = Math.max(0, Math.min(max, used(c,id) + (+cnt.dataset.d))); commit(c); return; }
  const ex = t.closest('[data-exh]'); if (ex) { c.exhaustion = Math.max(0, Math.min(6, c.exhaustion + (+ex.dataset.exh))); commit(c); return; }
  const uc = t.closest('[data-uncond]'); if (uc) { c.conditions = c.conditions.filter(x => x !== uc.dataset.uncond); commit(c); return; }
  const ue = t.closest('[data-uneff]'); if (ue) { endEffect(c, ue.dataset.uneff); commit(c); return; }
  const xs = t.closest('[data-xslot]'); if (xs) { const k = 'x' + xs.dataset.xslot; c.used[k] = Math.max(0, used(c,k) - 1); commit(c); toast('Created slot spent'); return; }
  const atk = t.closest('[data-atk]'); if (atk) { attackDrawer(c, +atk.dataset.atk); return; }
  const sv = t.closest('[data-savetog]'); if (sv) { const a = sv.dataset.savetog; c.saves = c.saves.includes(a) ? c.saves.filter(x => x !== a) : c.saves.concat(a); commit(c); return; }
  const sk = t.closest('[data-skilltog]'); if (sk) { const k = sk.dataset.skilltog; c.skills[k] = ((c.skills[k] || 0) + 1) % 3; if (!c.skills[k]) delete c.skills[k]; commit(c); return; }
  const act = t.closest('[data-act]'); if (!act) return;
  const A = act.dataset.act;
  if (A === 'hp') hpDrawer(c);
  if (A === 'editattacks') attacksDrawer(c);
  if (A === 'font') fontDrawer(c);
  if (A === 'innate') toggleInnate(c);
  if (A === 'addeff') effectDrawer(c);
  if (A === 'armor') { c.used.armorOn = used(c,'armorOn') ? 0 : 1; commit(c); }
  if (A === 'insp') { c.used.insp = used(c,'insp') ? 0 : 1; commit(c); }
  if (A === 'dropconc') { const n = c.conc && R.spells[c.conc] ? R.spells[c.conc].n : ''; c.conc = null; delete c.concUntil; delete c.concMm; commit(c); toast(`${n} ends`); }
  if (A === 'addcond') picker({title:'Conditions', items: CONDS.filter(k => R.gloss['cond|'+k]).map(k => ({id:k, label:R.gloss['cond|'+k].n, link:'cond|' + k})), need:CONDS.length, allowFewer:true, _sel:c.conditions, onDone:ks => { c.conditions = ks; commit(c); }});
  if (A === 'swapinv') picker({title:'Eldritch Invocations', intro:'Tick the invocations you have. When you gain a Warlock level you can replace one.', items:invItems(c, c.level, new Set(c.invocations)), need:row(c).inv, allowFewer:true, _sel:c.invocations, onDone:ks => { c.invocations = ks; normalise(c); commit(c); }});
  if (A === 'swapmeta') picker({title:'Metamagic', intro:'When you gain a Sorcerer level you can replace one option.', items:R.metamagic.map(m => ({id:m.n, label:m.n, link:'opt|' + m.n.toLowerCase()})), need:metaMax(c.level), allowFewer:true, _sel:c.metamagic, onDone:ks => { c.metamagic = ks; commit(c); }});
  if (A === 'rolllog') openDrawer('Roll history', rolls.map(r => `<div class="row"><span class="rv sm ${r.nat === 20 ? 'n20' : r.nat === 1 ? 'n1' : ''}">${esc(r.total)}</span><div class="main"><b>${esc(r.label)}</b> <span class="m">${esc(r.who)} · ${esc(r.at)}</span><br><span class="m">${esc(r.detail)}</span></div></div>`).join(''), '<button class="btn" data-clearrolls>Clear</button>', el => el.addEventListener('click', e => { if (e.target.closest('[data-clearrolls]')) { rolls = []; closeDrawer(); render(); } }));
  if (A === 'levelup') levelUp(c);
  if (A === 'rest-short') restDrawer(c, 'short');
  if (A === 'rest-long') restDrawer(c, 'long');
  if (A === 'toggleedit') { ui.edit = !ui.edit; render(); }
  if (A === 'bulkimport') { const v = document.getElementById('bulk').value; let ok = 0; const miss = [];
    v.split(/\n\s*\n(?=[^\n:]{2,60}:)/).forEach(block => { const m = block.match(/^\s*([^\n:]{2,60}):\s*([\s\S]+)$/); if (!m) return; const key = keyForName(m[1]); if (key) { texts[key] = {raw:m[2].trim(), h:plainToHtml(m[2])}; ok++; } else miss.push(m[1].trim()); });
    saveTexts(); render(); toast(`Imported ${ok}${miss.length ? `, not matched: ${miss.slice(0,4).join(', ')}` : ''}`); }
  if (A === 'undo') { const prev = c.history.pop(); prev.history = c.history; normalise(prev); chars[c.id] = prev; save(c.id); render(); toast(`Back to level ${prev.level}`); }
  if (A === 'export') { const s = JSON.stringify({chars, texts, party}); try { navigator.clipboard.writeText(s).then(() => toast('Backup copied'), () => showCopy(s)); } catch(_) { showCopy(s); } }
  if (A === 'import') openDrawer('Restore backup', '<div class="field"><label for="imp">Paste a backup</label><textarea id="imp"></textarea></div>', '<button class="btn pri" data-ok>Restore</button>', el => el.addEventListener('click', ev => { if (!ev.target.closest('[data-ok]')) return; try { const o = JSON.parse(el.querySelector('#imp').value); if (o.chars) for (const id of ORDER) if (o.chars[id]) { chars[id] = o.chars[id]; normalise(chars[id]); save(id); } if (o.texts) { texts = o.texts; saveTexts(); } if (o.party) { party = Object.assign(party, o.party); saveParty(); ['quests','npcs','log'].forEach(coll => party[coll].forEach(it => saveItem(coll, it))); } closeDrawer(); render(); toast('Restored'); } catch(_) { toast('That is not a valid backup.'); } }));
  if (A === 'reset') openDrawer('Reset ' + esc(c.name) + '?', '<p>This puts the sheet back to the 9 October scan, level 5. Level-ups, spent resources and notes for this character are lost. Other characters and the Party page are not affected.</p>', '<button class="btn danger" data-ok>Reset this character</button>', el => el.addEventListener('click', ev => { if (ev.target.closest('[data-ok]')) { chars[c.id] = normalised(SHEETS[c.id]); save(c.id); closeDrawer(); render(); toast('Reset'); } }));
});
function showCopy(s){ openDrawer('Copy this backup', `<textarea style="min-height:240px;width:100%" readonly>${esc(s)}</textarea>`, '', el => { const ta = el.querySelector('textarea'); ta.focus(); ta.select(); }); }
function restDrawer(c, kind){
  const res = resources(c);
  const back = res.filter(r => r.rest === 'short' || kind === 'long').map(r => r.n);
  const body = kind === 'long'
    ? `<p>Regain all Hit Points and Hit Dice, reset death saves and temporary HP, end concentration and active effects, remove one level of Exhaustion, and recover:</p><p>${esc(back.join(', '))}${c.cls === 'Sorcerer' ? ', all spell slots (any created with Font of Magic vanish)' : ''}.</p>${c.species === 'Human' ? `<p>${lk('species','Resourceful','Resourceful')}: you gain Heroic Inspiration.</p>` : ''}<p class="note">${lk('rule','long rest','Long Rest rules')}</p>`
    : `<p>Recover: ${esc(back.join(', ') || 'nothing automatic')}.</p><p class="note">Spend Hit Dice from the Hit Points panel.${c.cls === 'Sorcerer' && c.level >= 5 ? ' Sorcerous Restoration: regain up to ' + Math.floor(c.level/2) + ' Sorcery Points once per Long Rest.' : ''} ${lk('rule','short rest','Short Rest rules')}</p>`;
  const foot = `<button class="btn pri" data-ok>Take ${kind} rest</button>${kind === 'short' && c.cls === 'Sorcerer' && c.level >= 5 && !used(c,'restore') ? `<button class="btn" data-restore>Rest + Sorcerous Restoration</button>` : ''}`;
  openDrawer(kind === 'long' ? 'Long rest' : 'Short rest', body, foot, el => el.addEventListener('click', e => {
    const restore = e.target.closest('[data-restore]');
    if (!e.target.closest('[data-ok]') && !restore) return;
    if (kind === 'long') { c.used = {armorOn: used(c,'armorOn')}; c.effects = []; delete c.concUntil; delete c.concMm; c.hp = c.hpMax; c.temp = 0; c.conc = null; c.exhaustion = Math.max(0, c.exhaustion - 1); if (c.species === 'Human') c.used.insp = 1; }
    else { res.filter(r => r.rest === 'short').forEach(r => delete c.used[r.id]); if (restore) { c.used.sp = Math.max(0, used(c,'sp') - Math.floor(c.level/2)); c.used.restore = 1; } }
    commit(c); closeDrawer(); toast(kind === 'long' ? 'Long rest taken' : 'Short rest taken');
  }), () => restDrawer(c, kind));
}
document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-add]'); if (!f) return;
  e.preventDefault();
  const coll = f.dataset.add, inp = f.querySelector('input'), v = inp.value.trim(); if (!v) return;
  const it = {id: uid(), created: Date.now()};
  if (coll === 'quests') Object.assign(it, {t:v, done:false, note:''});
  if (coll === 'log') Object.assign(it, {t:v, date:today()});
  if (coll === 'npcs') Object.assign(it, {n:v, note:''});
  party[coll].push(it); saveItem(coll, it); inp.value = ''; render();
  const again = document.getElementById('add-' + coll); if (again) again.focus();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeDrawer();
  if (e.key === 'Enter' && e.target.matches('[data-iniv]')) { e.preventDefault(); e.target.blur(); }
  if (e.key === 'Enter' && e.target.id === 'ia-v') { e.preventDefault(); const b = document.querySelector('[data-iaddv]'); if (b) b.click(); }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"]')) { e.preventDefault(); e.target.click(); }
});
let inputTimer;
document.addEventListener('input', e => {
  const t = e.target;
  if (t.closest('#scrim')) return;
  if (t.id === 'spq') { ui.q[ui.cur] = t.value; const c = ctxChar(); const box = document.getElementById('splist'); if (c && box) box.innerHTML = spellRows(c); lsSet(LS_UI, ui); return; }
  if (t.dataset.ia) { ui.ia[t.dataset.ia] = t.type === 'checkbox' ? t.checked : t.value; lsSet(LS_UI, ui); return; }
  if (t.dataset.pfield) { party[t.dataset.pfield] = t.value; saveParty(); return; }
  if (t.dataset.pcoin) { party.coins[t.dataset.pcoin] = parseInt(t.value,10) || 0; saveParty(); return; }
  if (t.dataset.mfield) { chars.mule[t.dataset.mfield] = t.value; lsSet(LS_KEY, chars); clearTimeout(inputTimer); inputTimer = setTimeout(() => save('mule'), 600); return; }
  const c = ctxChar(); if (!c) return;
  if (t.dataset.field) { const f = t.dataset.field; if (['hpMax','ac','initMisc'].includes(f)) c[f] = parseInt(t.value,10) || 0; else if (f === 'ac2') { const v = parseInt(t.value,10); if (v) c.ac2 = v; else delete c.ac2; } else c[f] = t.value; }
  else if (t.dataset.coin) c.coins[t.dataset.coin] = parseInt(t.value,10) || 0;
  else if (t.dataset.abin) { const v = parseInt(t.value,10); if (v >= 1 && v <= 30) c.ab[t.dataset.abin] = v; }
  else return;
  lsSet(LS_KEY, chars);
  clearTimeout(inputTimer); inputTimer = setTimeout(() => save(c.id), 600);
});
document.addEventListener('change', e => {
  if (e.target.closest('#scrim')) return;
  if (e.target.dataset.check) { const c = ctxChar(); if (c) { c[e.target.dataset.check] = e.target.checked; commit(c); } return; }
  if (e.target.dataset.ia) { ui.ia[e.target.dataset.ia] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; lsSet(LS_UI, ui); return; }
  if (e.target.dataset.iniv) { const en = combat.list.find(x => x.id === e.target.dataset.iniv), v = parseInt(e.target.value, 10); if (en && !isNaN(v)) { en.init = v; saveCombat(); render(); } return; }
  if (e.target.dataset.abin || e.target.dataset.field) pendingRender = true;
});
// Re-render after editing only once the viewer has left the form, so moving between fields never loses a tap.
let pendingRender = false;
document.addEventListener('focusout', e => {
  if (!pendingRender || e.target.closest('#scrim')) return;
  const next = e.relatedTarget;
  if (next && /INPUT|TEXTAREA|SELECT/.test(next.tagName)) return;
  setTimeout(() => { const a = document.activeElement; if (pendingRender && !(a && /INPUT|TEXTAREA|SELECT/.test(a.tagName))) { pendingRender = false; render(); } }, 0);
});
window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (PAGES.includes(h)) { ui.cur = h; render(); } else if (h === 'mule') { ui.cur = 'party'; render(); } });

function start(){ render(); connect(); if (BE && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {}); }
if (BE && BE.boot) { window.startApp = start; BE.boot(); } else start();
})();
