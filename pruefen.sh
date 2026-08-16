#!/bin/sh
# Bricht ab, statt nur zu melden — genau daran ist v47 vorbeigerutscht.
set -e
cd /Users/aymaneloukili/Downloads/Tanger
python3 - <<'PY'
import html.parser,sys
src=open('index.html',encoding='utf-8').read()
V=('br','img','meta','link','input','path','rect','circle','use','i')
class P(html.parser.HTMLParser):
    def __init__(s):super().__init__();s.st=[];s.err=[]
    def handle_starttag(s,t,a):
        if t not in V:s.st.append(t)
    def handle_endtag(s,t):
        if t in V:return
        if not s.st or s.st[-1]!=t:s.err.append((t,s.st[-3:]))
        else:s.st.pop()
p=P();p.feed(src)
if p.err or p.st:
    print('HTML NICHT wohlgeformt:',p.err[:3],'offen:',p.st[:3]);sys.exit(1)
print('HTML wohlgeformt')
PY
node -e "var fs=require('fs'),s=fs.readFileSync('index.html','utf8');fs.writeFileSync('/tmp/chk.js',s.slice(s.lastIndexOf('<script>')+8,s.lastIndexOf('</script>')))"
node --check /tmp/chk.js && echo "JS syntaktisch ok"
node test/regress.js
