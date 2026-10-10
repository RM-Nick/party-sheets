import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
rules=open('rules.json').read().replace('</','<\\/')
css=open('app.css').read()
icon_svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='%23191c22'/><path d='M32 8 54 20v24L32 56 10 44V20z' fill='none' stroke='%23e0a83a' stroke-width='4'/></svg>"
html=f'''<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Party Sheets</title>
<meta name="robots" content="noindex,nofollow">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Party Sheets"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#111318">
<link rel="icon" href="data:image/svg+xml,{icon_svg}">
<link rel="apple-touch-icon" href="icon.png">
<link rel="manifest" href="manifest.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alegreya+Sans:ital,wght@0,400;0,500;0,700;1,400&family=IM+Fell+English+SC&display=swap">
<style>:root{{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}body{{margin:0}}[hidden]{{display:none!important}}
{css}</style></head><body>
<div class="wrap" id="app"><p class="note" style="padding-top:20vh;text-align:center">Loading…</p></div>
<nav class="tabs" id="tabs" aria-label="Sections" hidden></nav>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>
<script>window.RULES={rules};</script>
<script>{open('chars.js').read()}</script>
<script>{open('backend_supabase.js').read()}</script>
<script>{open('app.js').read()}</script>
</body></html>'''
open('site/index.html','w').write(html)
t=html.replace('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>','<script>'+open('mock_supabase.js').read()+'</script>')
open('out/site_test.html','w').write(t)
print(len(html))
