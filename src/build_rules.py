import json, sys, os, urllib.parse, html as H
sys.path.insert(0, os.path.dirname(__file__))
from render import ent, txt
import summaries as SUM
import render as RD
import re

D = os.path.join(os.path.dirname(__file__), '..', 'data5e')
def load(f): return json.load(open(os.path.join(D, f)))

SCHOOL = {'A':'Abjuration','C':'Conjuration','D':'Divination','E':'Enchantment','V':'Evocation','I':'Illusion','N':'Necromancy','T':'Transmutation'}
def url(page, name, src): return f"https://5e.tools/{page}.html#" + urllib.parse.quote(f"{name.lower()}_{src.lower()}")

def time_s(t):
    t=t[0]; u={'action':'Action','bonus':'Bonus Action','reaction':'Reaction','minute':'minute','hour':'hour'}.get(t['unit'],t['unit'])
    if t['unit'] in ('minute','hour'): u = u + ('s' if t['number']>1 else '')
    s = (f"{t['number']} {u}" if t['unit'] in ('minute','hour') else u)
    if t.get('condition'): s += ', ' + txt(t['condition'], True)
    return s
def range_s(r):
    t=r['type']; d=r.get('distance',{})
    if t=='special': return 'Special'
    if d.get('type')=='self': return 'Self'
    if d.get('type')=='touch': return 'Touch'
    if d.get('type')=='sight': return 'Sight'
    if d.get('type')=='unlimited': return 'Unlimited'
    amt=d.get('amount'); unit={'feet':'ft','miles':'miles','mile':'mile'}.get(d.get('type'),d.get('type'))
    if t=='point': return f"{amt} {unit}"
    shape={'radius':'radius','sphere':'Sphere','cone':'Cone','line':'Line','cube':'Cube','emanation':'Emanation','cylinder':'Cylinder','hemisphere':'Hemisphere'}.get(t,t)
    return f"Self ({amt}-{unit} {shape})"
def comp_s(c):
    out=[]
    if c.get('v'): out.append('V')
    if c.get('s'): out.append('S')
    m=c.get('m')
    if m: out.append('M (' + (m if isinstance(m,str) else m.get('text','')) + ')')
    return ', '.join(out)
def dur_s(ds):
    d=ds[0]
    if d['type']=='instant': return 'Instantaneous'
    if d['type']=='permanent': return 'Until dispelled' + (' or triggered' if 'trigger' in d.get('ends',[]) else '')
    if d['type']=='special': return 'Special'
    x=d['duration']; u=x['type']; a=x.get('amount',1)
    u={'round':'round','minute':'minute','hour':'hour','day':'day'}.get(u,u)
    s=f"{a} {u}{'s' if a!=1 else ''}"
    if x.get('upTo') or d.get('concentration'): s='Up to '+s
    return s

lk = load('gendata-spell-source-lookup.json')
mark = {'armor of agathys','sanctuary','knock',"nystul's magic aura",'glyph of warding','magic circle',"leomund's secret chest","mordenkainen's faithful hound",'antilife shell','alarm','mage armor','arcane lock'}
def classes(n, src='xphb'):
    return sorted(lk.get(src,{}).get(n,{}).get('class',{}).get('XPHB',{}).keys())

spells = {}
def add_spell(s, cls_override=None):
    k = s['name'].lower()
    cls = cls_override if cls_override is not None else classes(k)
    srd = bool(s.get('srd52')) and s['source']=='XPHB'
    rec = {
        'n': s['name'], 'l': s['level'], 'sc': SCHOOL.get(s['school'], s['school']),
        't': time_s(s['time']), 'r': range_s(s['range']), 'c': comp_s(s.get('components',{})),
        'd': dur_s(s['duration']), 'conc': any(d.get('concentration') for d in s['duration']),
        'rit': bool(s.get('meta',{}).get('ritual')), 'cls': cls, 'src': s['source'],
        'u': url('spells', s['name'], s['source']), 'srd': srd,
    }
    if srd:
        rec['h'] = ent(s['entries'])
        hl = ent(s.get('entriesHigherLevel', []))
        if hl: rec['hl'] = hl
    else:
        rec['h'] = para(SUM.SPELLS[k])
        if k in SUM.SPELLS_HL: rec['hl'] = para(SUM.SPELLS_HL[k])
        rec['own'] = True
    if k in mark: rec['mark'] = True
    spells[k] = rec

SUBX={'light','sacred flame','aid','cure wounds','guiding bolt','lesser restoration','daylight','revivify','guardian of faith','wall of fire','greater restoration','summon celestial','mind sliver','arms of hadar','calm emotions','detect thoughts','dissonant whispers','hunger of hadar','sending',"evard's black tentacles",'summon aberration',"rary's telepathic bond",'telekinesis'}
PENDING=[]
for s in load('spells-xphb.json')['spell']:
    k = s['name'].lower(); c = classes(k)
    rit = s.get('meta',{}).get('ritual')
    if 'Warlock' in c or 'Sorcerer' in c or k in mark or s['level']==0 or (s['level']==1 and rit) or ('Cleric' in c and s['level']<=1) or k=='charm person' or k in SUBX:
        PENDING.append((s,None))
for s in load('spells-xge.json')['spell']:
    if s['name']=='Mold Earth': PENDING.append((s, ['Druid','Sorcerer','Wizard']))
for s in load('spells-ggr.json')['spell']:
    if s['name']=='Encode Thoughts': PENDING.append((s, []))

# ---- glossary (all SRD 5.2) and link targets
G = {}
def gl(ty, items):
    for a in items:
        if a.get('source')!='XPHB' or not a.get('srd52'): continue
        nm = a['name']; G[f"{ty}|{nm.lower()}"] = {'n': re.sub(r'\s*\[.*?\]','',nm), 'h': None, '_e': a.get('entries',[]), 'u': url({'cond':'conditionsdiseases','act':'actions','rule':'variantrules','sense':'senses','skill':'skills','mast':'items'}[ty], nm, 'xphb')}
cd = load('conditionsdiseases.json')
gl('cond', cd['condition']); gl('cond', cd.get('status',[]))
gl('act', load('actions.json')['action'])
gl('rule', load('variantrules.json')['variantrule'])
gl('sense', load('senses.json')['sense'])
gl('skill', load('skills.json')['skill'])
gl('mast', load('items-base.json')['itemMastery'])
RD.LINKS.update({'spell': {s['name'].lower() for s,_ in PENDING}})
for k in G:
    ty, key = k.split('|',1); RD.LINKS.setdefault(ty, set()).add(key)
_opt = load('optionalfeatures.json')['optionalfeature']
RD.LINKS['opt'] = {o['name'].lower() for o in _opt if o['source']=='XPHB' and ('EI' in o['featureType'] or 'MM' in o['featureType'])}
RD.LINKS['feat'] = {f['name'].lower() for f in load('feats.json')['feat'] if f['source']=='XPHB'} | {'mark of warding'}
for k,v in G.items(): v['h'] = ent(v.pop('_e'))

# own-words summaries get the same links, by matching names I wrote
SPN = {s['name']: s['name'].lower() for s,_ in PENDING}
AUTO = {**{n: ('spell', k) for n,k in SPN.items()}}
for k,v in G.items():
    ty, key = k.split('|',1)
    if ty in ('cond','sense'): AUTO[v['n']] = (ty, key)
for n in ['Difficult Terrain','Temporary Hit Points','Hit Point Dice','Bonus Action','Reaction','Resistance','Advantage','Disadvantage','Long Rest','Short Rest','Total Cover','Cover','Emanation','Sphere','Cube','Cylinder','Teleportation','Telepathy','Heroic Inspiration','Unarmed Strike','Speed','Initiative','Saving Throw','Death Saving Throw','Hit Points','Ritual','Concentration']:
    if f"rule|{n.lower()}" in G: AUTO[n] = ('rule', n.lower())
for n in ['Dash','Disengage','Dodge','Hide','Magic action','Help','Search','Study','Influence','Utilize']:
    key = n.split()[0].lower()
    if f"act|{key}" in G: AUTO[n] = ('act', key)
for n in ['Mage Armor','Alarm']: pass
_ALT = re.compile(r'(?<![\w-])(' + '|'.join(re.escape(n) for n in sorted(AUTO, key=len, reverse=True)) + r')(?![\w-])')
def autolink(text):
    t = H.escape(text)
    def sub(m):
        nm = H.unescape(m.group(1)); ty, key = AUTO[nm]
        return f'<a class="lk" data-l="{ty}|{H.escape(key)}">{m.group(1)}</a>'
    return _ALT.sub(sub, t)
def para(text): return '<p>' + autolink(text) + '</p>'
for s, ov in PENDING: add_spell(s, ov)

# ---- classes
def feats_for(cfile, skip=()):
    d = load(cfile)
    cl = [x for x in d['class'] if x['source']=='XPHB'][0]
    feats = []
    for f in d['classFeature']:
        if f['source']!='XPHB' or f['name'] in skip: continue
        if f['name'] in ('Subclass Feature',): continue
        feats.append({'lv': f['level'], 'n': f['name'], 'h': ent(f['entries'])})
    return cl, feats

classes_out = {}
cl, fw = feats_for('class-warlock.json', skip=('Eldritch Invocation Options',))
rows = cl['classTableGroups'][0]['rows']
classes_out['Warlock'] = {'hd': 8, 'saves': ['wis','cha'], 'feats': fw,
    'table': [{'inv': r[0], 'can': r[1], 'prep': r[2], 'slots': r[3], 'sl': r[4]} for r in rows],
    'asi': [4,8,12,16], 'boon': 19, 'u': 'https://5e.tools/classes.html#warlock_xphb'}
cl, fs = feats_for('class-sorcerer.json', skip=('Metamagic Options',))
g = cl['classTableGroups']
classes_out['Sorcerer'] = {'hd': 6, 'saves': ['con','cha'], 'feats': fs,
    'table': [{'sp': g[0]['rows'][i][0], 'can': g[1]['rows'][i][0], 'prep': g[1]['rows'][i][1], 'slots': (g[2].get('rows') or g[2].get('rowsSpellProgression'))[i]} for i in range(20)],
    'asi': [4,8,12,16], 'boon': 19, 'meta': {'2':2,'10':4,'17':6}, 'u': 'https://5e.tools/classes.html#sorcerer_xphb'}
cl, fr = feats_for('class-rogue.json')
classes_out['Rogue'] = {'hd': 8, 'saves': ['dex','int'], 'feats': fr,
    'table': [{'sa': r[0]['toRoll'][0]['number']} for r in cl['classTableGroups'][0]['rows']],
    'asi': [4,8,10,12,16], 'boon': 19, 'u': 'https://5e.tools/classes.html#rogue_xphb'}

subs = {k: [{'lv': lv, 'n': n, 'h': para(t), 'own': True} for (lv,n,t) in v] for k,v in SUM.SUBCLASS.items()}
sub_spells = {
 'Celestial': {'1': ['light','sacred flame'], '3': ['aid','cure wounds','guiding bolt','lesser restoration'], '5': ['daylight','revivify'], '7': ['guardian of faith','wall of fire'], '9': ['greater restoration','summon celestial']},
 'Aberrant': {'3': ['mind sliver','arms of hadar','calm emotions','detect thoughts','dissonant whispers'], '5': ['hunger of hadar','sending'], '7': ["evard's black tentacles",'summon aberration'], '9': ["rary's telepathic bond",'telekinesis']},
}
for ss in sub_spells.values():
    for lst in ss.values():
        for k in lst: assert k in spells, k

# ---- invocations & metamagic
inv, mm = [], []
for o in load('optionalfeatures.json')['optionalfeature']:
    if o['source']!='XPHB': continue
    ft = o['featureType']
    if 'EI' in ft:
        lv = 1; pact = None; needEB=False
        for p in o.get('prerequisite', []):
            if 'level' in p: lv = p['level']['level'] if isinstance(p['level'],dict) else p['level']
            if 'optionalfeature' in p: pact = p['optionalfeature'][0].split('|')[0].title()
            if 'spell' in p: needEB=True
        inv.append({'n': o['name'], 'lv': lv, 'pact': pact, 'cantrip': needEB, 'rep': bool(o.get('repeatable')), 'h': ent(o['entries']), 'u': url('optionalfeatures', o['name'], 'xphb')})
    if 'MM' in ft:
        mm.append({'n': o['name'], 'h': ent(o['entries']), 'u': url('optionalfeatures', o['name'], 'xphb')})
inv.sort(key=lambda x:(x['lv'],x['n']))

# ---- feats (XPHB general + epic boons); SRD text when available
feats = []
for f in load('feats.json')['feat']:
    if f['source']!='XPHB' or f.get('category') not in ('G','EB','O'): continue
    pre = ''
    for p in f.get('prerequisite', []):
        if 'level' in p: pre = f"Level {p['level'] if isinstance(p['level'],int) else p['level'].get('level')}+"
    rec = {'n': f['name'], 'cat': f['category'], 'pre': pre, 'u': url('feats', f['name'], 'xphb')}
    ab = f.get('ability')
    if ab:
        a = ab[0]
        if 'choose' in a: rec['ab'] = a['choose'].get('from', [])
        else: rec['ab'] = [k for k in a if k in ('str','dex','con','int','wis','cha')]
    if f.get('srd52'): rec['h'] = ent(f['entries'])
    elif f['name'] in SUM.FEATS: rec['h'] = para(SUM.FEATS[f['name']]); rec['own']=True
    feats.append(rec)
feats.sort(key=lambda x:(x['cat'],x['n']))

out = {'spells': spells, 'classes': classes_out, 'subclasses': subs, 'subSpells': sub_spells,
       'invocations': inv, 'metamagic': mm, 'feats': feats,
       'species': {k: [{'n': n, 'h': para(t)} for n,t in v] for k,v in SUM.SPECIES.items()},
       'extraFeats': {k: para(v) for k,v in SUM.FEATS.items()}, 'gloss': G}
hum=[x for x in load('races.json')['race'] if x['name']=='Human' and x['source']=='XPHB'][0]
out['species']['Human']=[{'n': e['name'], 'h': ent(e['entries'])} for e in hum['entries'] if isinstance(e,dict) and e.get('name')]
DT={'S':'Slashing','P':'Piercing','B':'Bludgeoning'}
PR={'2H':'Two-Handed','A':'Ammunition','F':'Finesse','H':'Heavy','L':'Light','LD':'Loading','R':'Reach','T':'Thrown','V':'Versatile'}
out['weapons']=[{'n':x['name'],'cat':x['weaponCategory'],'m':x['mastery'][0].split('|')[0],'p':[PR.get((q if isinstance(q,str) else q.get('uid','')).split('|')[0],'') for q in (x.get('property') or [])],'d':x.get('dmg1',''),'t':DT.get(x.get('dmgType'),'')}
  for x in load('items-base.json')['baseitem'] if x.get('source')=='XPHB' and x.get('weaponCategory') and x.get('mastery')]
s = json.dumps(out, separators=(',',':'), ensure_ascii=False)
open(os.path.join(os.path.dirname(__file__), 'rules.json'), 'w').write(s)
print('spells', len(spells), 'inv', len(inv), 'mm', len(mm), 'feats', len(feats), 'bytes', len(s))
