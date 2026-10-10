import re, html, urllib.parse
LINKS={}
TAG=re.compile(r'\{@(\w+)\s([^{}]*?)\}')
ABIL={'str':'Strength','dex':'Dexterity','con':'Constitution','int':'Intelligence','wis':'Wisdom','cha':'Charisma'}
def tag_repl(m, plain=False):
    t, body = m.group(1), m.group(2)
    p = body.split('|')
    if t in ('b','bold'): return p[0] if plain else f'<b>{p[0]}</b>'
    if t in ('i','italic'): return p[0] if plain else f'<i>{p[0]}</i>'
    if t=='hit': return f'+{p[0]}' if not p[0].startswith('-') else p[0]
    if t=='dc': return f'DC {p[0]}'
    if t=='scaledamage' or t=='scaledice': return p[-1]
    if t=='quickref':
        disp=p[4] if len(p)>4 and p[4] else p[0]
        if not plain and p[0].lower() in LINKS.get('rule',()): return f'<a class="lk" data-l="rule|{html.escape(p[0].lower())}">{disp}</a>'
        return disp
    if t=='filter': return p[0]
    if t=='chance': return p[1] if len(p)>1 and p[1] else p[0]+' percent'
    if t=='recharge': return '(Recharge '+(p[0] or '6')+'-6)'
    if t=='actSave': return ABIL.get(p[0],p[0])+' Saving Throw:'
    if t=='actSaveFail': return 'Failure:'
    if t=='actSaveSuccess': return 'Success:'
    if t=='actSaveSuccessOrFail': return 'Failure or Success:'
    if t=='atk' or t=='atkr': return {'mw':'Melee Weapon Attack:','rw':'Ranged Weapon Attack:','ms':'Melee Spell Attack:','rs':'Ranged Spell Attack:','m':'Melee Attack Roll:','r':'Ranged Attack Roll:','mw,rw':'Melee or Ranged Weapon Attack:'}.get(p[0],'Attack:')
    if t=='h': return 'Hit: '
    if t=='note': return p[0]
    LT={'spell':'spell','condition':'cond','status':'cond','action':'act','variantrule':'rule','sense':'sense','skill':'skill','feat':'feat','optfeature':'opt','itemMastery':'mast','itemMastery':'mast'}
    if t in LT and not plain:
        name=p[2] if len(p)>2 and p[2] else p[0]
        if t=='variantrule' and name==p[0]: name=re.sub(r'\s*\[.*?\]','',name)
        key=p[0].lower().strip(); ty=LT[t]
        if key in LINKS.get(ty,()): return f'<a class="lk" data-l="{ty}|{html.escape(key)}">{name}</a>'
        if ty=='spell':
            src=(p[1] if len(p)>1 and p[1] else 'xphb').lower()
            return f'<a href="https://5e.tools/spells.html#{urllib.parse.quote(key+"_"+src)}" target="_blank" rel="noopener">{name}</a>'
        return name
    if len(p)>2 and p[2]: return p[2]
    return p[0]
def txt(s, plain=False):
    prev=None
    while prev!=s:
        prev=s; s=TAG.sub(lambda m: tag_repl(m,plain), s)
    return s
def ent(e, plain=False, depth=0):
    if e is None: return ''
    if isinstance(e,str): return (txt(e,plain)+'\n') if plain else f'<p>{txt(e)}</p>'
    if isinstance(e,list): return ''.join(ent(x,plain,depth) for x in e)
    t=e.get('type')
    name=e.get('name')
    inner=''
    if t in ('entries','inset','insetReadaloud','section','variant','variantInner','quote',None) or 'entries' in e and t not in ('list','table','item','itemSub'):
        body=ent(e.get('entries',[]),plain,depth+1)
        if name:
            if plain: return f'{txt(name,True)}. {body}'
            # inline header into first paragraph
            if body.startswith('<p>'): return f'<p><b><i>{txt(name)}.</i></b> '+body[3:]
            return f'<p><b><i>{txt(name)}.</i></b></p>'+body
        return body
    if t=='list':
        items=e.get('items',[])
        if plain: return ''.join('- '+ent(i,True,depth+1) for i in items)
        return '<ul>'+''.join('<li>'+ent(i,False,depth+1).replace('<p>','').replace('</p>',' ').strip()+'</li>' for i in items)+'</ul>'
    if t in ('item','itemSub','itemSpell'):
        b = ent(e.get('entry') or e.get('entries',[]),plain,depth+1)
        if plain: return f'{txt(name or "",True)} {b}'
        return f'<b>{txt(name or "")}</b> '+b.replace('<p>','').replace('</p>',' ')
    if t=='table':
        if plain:
            out=(e.get('caption','')+'\n')
            out+=' | '.join(txt(str(c),True) for c in e.get('colLabels',[]))+'\n'
            for r in e.get('rows',[]):
                out+=' | '.join(cell(c,True) for c in r)+'\n'
            return out
        out='<div class="tw"><table>'
        if e.get('caption'): out+=f'<caption>{txt(e["caption"])}</caption>'
        if e.get('colLabels'): out+='<tr>'+''.join(f'<th>{txt(str(c))}</th>' for c in e['colLabels'])+'</tr>'
        for r in e.get('rows',[]):
            if isinstance(r,dict): r=r.get('row',[])
            out+='<tr>'+''.join(f'<td>{cell(c)}</td>' for c in r)+'</tr>'
        return out+'</table></div>'
    if t in ('refClassFeature','refSubclassFeature','refOptionalfeature'):
        return ''
    if t=='options':
        return ent(e.get('entries',[]),plain,depth)
    if t=='abilityDc': return f'<p><b>Spell save DC</b> = 8 + proficiency bonus + {ABIL.get(e["attributes"][0])} modifier</p>'
    if t=='abilityAttackMod': return f'<p><b>Spell attack modifier</b> = proficiency bonus + {ABIL.get(e["attributes"][0])} modifier</p>'
    if 'entries' in e: return ent(e['entries'],plain,depth)
    if 'entry' in e: return ent(e['entry'],plain,depth)
    return ''
def cell(c,plain=False):
    if isinstance(c,(str,int,float)): return txt(str(c),plain)
    if isinstance(c,dict):
        if c.get('type')=='cell':
            r=c.get('roll',{})
            if 'exact' in r: return str(r['exact'])
            if 'min' in r: return f"{r['min']}-{r['max']}"
            return txt(str(c.get('entry','')),plain)
        return ent(c,plain).replace('<p>','').replace('</p>','')
    return str(c)
