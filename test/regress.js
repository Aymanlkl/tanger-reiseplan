// Konsolidierter Regressionstest ueber alle Features, gegen das echte App-Skript.
const fs = require('fs');
const src = fs.readFileSync('/Users/aymaneloukili/Downloads/Tanger/index.html', 'utf8');
const code = src.slice(src.lastIndexOf('<script>') + 8, src.lastIndexOf('</script>'));
let PASS = 0, FAIL = 0;
const ok = (n, c, x) => { c ? PASS++ : FAIL++; console.log(`  ${c ? 'OK   ' : 'FEHLT'} ${n}${x && !c ? '  -> ' + x : ''}`) };

const store = {}, log = { strip: [], now: [] };
let ACTIVE_TILE = 0, STRIP_SCROLL = 0;
function El(sel) {
  const e = { sel, innerHTML: '', textContent: '', value: '', hidden: false, disabled: false, className: '',
    style: {}, dataset: {}, scrollWidth: 564, clientWidth: 360, offsetWidth: 90, offsetLeft: 12, scrollLeft: 0,
    classList: { _s: new Set(), add(c){this._s.add(c)}, remove(c){this._s.delete(c)},
      toggle(c,v){ v===undefined ? (this._s.has(c)?this._s.delete(c):this._s.add(c)) : (v?this._s.add(c):this._s.delete(c)) },
      contains(c){return this._s.has(c)} },
    getBoundingClientRect: () => ({left:0,top:0,width:360,height:60}), setAttribute(){},
    scrollTo(){}, scrollIntoView(o){ if(sel.includes('now-row')) log.now.push(o) },
    addEventListener(){}, remove(){}, appendChild(){} };
  if (sel === '#strip') {
    e.getBoundingClientRect = () => ({left:0,top:0,width:360,height:70});
    e.scrollTo = o => { log.strip.push(o); STRIP_SCROLL = o.left };
    Object.defineProperty(e, 'scrollLeft', {get:()=>STRIP_SCROLL, set:v=>{STRIP_SCROLL=v; log.strip.push({left:v,behavior:'auto'})}});
  }
  if (sel === '#strip .dtile.on')
    e.getBoundingClientRect = () => ({left: 20 + ACTIVE_TILE*59 - STRIP_SCROLL, top:0, width:52, height:53});
  return e;
}
const els = {}; const get = s => (els[s] || (els[s] = El(s)));
global.document = { querySelector: get, querySelectorAll: s => {
    if (s === '#tabs button') return [get('t1'),get('t2'),get('t3'),get('t4')];
    if (s === '#p-tage .ttl') return (els['#p-tage'].innerHTML.match(/class="ttl" data-d="(\d+)"/g)||[])
      .map(x => { const e = El('ttl'); e.dataset.d = x.match(/data-d="(\d+)"/)[1]; return e });
    return [] }, createElement: El, addEventListener(){} };
global.window = { addEventListener(){}, scrollTo(){}, matchMedia:()=>({matches:false}), location:{origin:'x'} };
global.window.Notification = global.Notification = { permission:'default', requestPermission:()=>Promise.resolve('granted') };
global.navigator = { userAgent:'node' };
global.localStorage = { getItem: k=>store[k]||null, setItem:(k,v)=>store[k]=v };
global.requestAnimationFrame = f=>f(); global.setTimeout = f=>f(); global.clearTimeout = ()=>{};
global.IntersectionObserver = class { observe(){} }; global.Response = class { constructor(b){this.b=b} };
const drawn = { markers: [], tiles: null, polyline: null };
global.L = { map: () => ({ remove(){}, fitBounds(){}, setView(){},
    getBounds:()=>({getWest:()=>-5.94,getEast:()=>-5.76,getNorth:()=>35.80,getSouth:()=>35.75}),
    getZoom:()=>13, invalidateSize(){} }),
  tileLayer: u => { drawn.tiles = u; return {addTo(){}} },
  polyline: ll => { drawn.polyline = ll; return {addTo(){}} },
  marker: ll => { drawn.markers.push(ll); return {addTo(){return {on(){}}}} },
  divIcon: o=>o, latLngBounds: l=>({pad:()=>l}) };

try { eval(code); } catch (e) { console.log('LAUFZEITFEHLER:', e.message); process.exit(1) }
setImmediate(() => { try { run() } catch (e) { console.log('FEHLER:', e.message, e.stack); process.exit(1) } });

function run() {
const idxOf = (d, t) => TRIP[d].items.findIndex(i => i.h === t);

console.log('\nDatenintegritaet');
  let loc=0, coord=0, info=0, hours=0, rail=0, eat=0;
  TRIP.forEach(d => d.items.forEach(i => { if(i.loc){loc++; if(i.loc.lat){coord++; if(i.info)info++}}
    if(i.hours)hours++; if(i.rail)rail++; if(i.eat)eat++ }));
  ok('88 Orte, 87 mit Koordinaten', loc===88 && coord===87, `${loc}/${coord}`);
  ok('jeder Ort mit Koordinaten beschrieben',
     !TRIP.some(d=>d.items.some(i=>i.loc&&i.loc.lat&&!i.info)), `${info}`);
  ok('hours 8 · rail 4 · eat 25', hours===8&&rail===4&&eat===25, `${hours}/${rail}/${eat}`);
  ok('hoechstens 2 Restaurants pro Tag',
     TRIP.every(d => d.items.filter(i=>i.eat&&!i.snack).length<=2),
     TRIP.map(d=>d.items.filter(i=>i.eat&&!i.snack).length).join(','));
  ok('kein Hammam, kein Einkaufen mehr', !/Hammam|Souvenir/.test(src));
  ok('Vorbereitung liegt nachts',
     ['Zugtickets offline speichern','Ryanair-Check-in für morgen','Taxi für 06:15 Uhr bestellen','Packen und früh schlafen']
       .every(h => TRIP.some(d => d.items.some(i => i.h===h && i.t >= '22:00'))));
  ok('Zug Rabat: echte Zeiten aus Dossier KVDYJH',
     TRIP[5].items.some(i=>i.h==='Ankunft Rabat Agdal' && i.t==='09:22')
     && TRIP[5].items.some(i=>i.h==='Rückzug ab Rabat Agdal' && i.t==='20:56')
     && TRIP[5].items.some(i=>i.h==='Ankunft Tanger' && i.t==='22:17'));
  ok('Rabat: Abendessen vor der Rueckfahrt statt in Tanger',
     TRIP[5].items.some(i=>i.h==='Frühes Abendessen in Rabat')
     && !TRIP[5].items.some(i=>i.h==='Sushi Pro'));
  ok('Bahnhofs-Taxi mit Puffer vor dem Zug',
     (()=>{const t=TRIP[5].items.find(i=>i.h==='Taxi zum Bahnhof Rabat Agdal');
           return t && t.t<'20:56' && t.t>='20:00';})());
  ok('Asilah hat 9 Stopps in der Altstadt',
     ['Wandbilder-Rundgang & Galerie Monassilah','Palais Rassouni','Tour Al Qamra & Bab el Bahr',
      'Fort Antonio da Fonseca','Bab Al Kasbah & Borj Al Kasabah'].every(h => TRIP[4].items.some(i=>i.h===h))
     && !TRIP[4].items.some(i=>i.h==='Paradise Beach'));
  ok('Tag 7 fuehrt ans Mittelmeer, nicht mehr nach Achakkar',
     !TRIP[6].items.some(i=>/Achakkar/.test(i.h))
     && ['Ksar es-Seghir — Portugiesische Festung','Belyounech — Baden unter dem Jbel Mousa','Späte Mahlzeit in Dalia']
          .every(h => TRIP[6].items.some(i => i.h===h)));
  ok('Belyounech-Warnung steht am Tag',
     (TRIP[6].notes||[]).some(n => n.k==='warn' && /keine Lokale/.test(n.t)));
  ok('Rabat hat 12 Stopps',
     TRIP[5].items.length===18 && !TRIP[5].items.some(i=>i.h==='Museum Mohammed VI'));
  ok('Rabat: alles mit Tuer liegt vor 18:00',
     TRIP[5].items.filter(i=>i.hours).every(i=>i.t<'18:00'));
  ok('alle 8 Wunsch-Restaurants gesetzt',
     ['Cappero Resto','99grill','Napolitano','La Boca Negra','Puerto Marina','Sushi Pro','Rio do Texas','Sardinen vom Grill']
       .every(n => TRIP.some(d => d.items.some(i => i.h===n))));
  ok('alle 15 Sehenswuerdigkeiten drin (ausser Donabo)', [
      'Villa Harris','Perdicaris','Kasbah-Museum','Dar Niaba','Marina Bay','Café Hafa',
      'Borj Dar El Baroud','Merkala','Signpost','La Fuga','Le Mirage','Dar Chams','Rmilat','Bab Bhar'
    ].every(w => TRIP.some(d => d.items.some(i => (i.h+'|'+((i.loc||{}).q||'')).includes(w)))));
  ok('Zeiten je Tag aufsteigend', TRIP.every(d => d.items.every((i,n) => n===0 || i.t >= d.items[n-1].t)));
  ok('Hotelfruehstueck an 6 Tagen', TRIP.filter(d => d.items.some(i => i.h==='Frühstück im Hotel')).length===6);

console.log('\nitem(): alle Felder werden durchgereicht');
  const roh = TRIP[2].items[idxOf(2,'Cap Spartel')];
  const zus = eval(`item(2,${idxOf(2,'Cap Spartel')})`);
  ok('keine Felder verloren', Object.keys(roh).every(k => zus[k] !== undefined),
     Object.keys(roh).filter(k => zus[k]===undefined).join(','));
  ok('info durchgereicht', !!zus.info);
  ok('hours durchgereicht', !!zus.hours);

console.log('\nKarte');
  const erwartet = [7,14,9,9,14,15,8,10,1];
  let mapOk = true;
  TRIP.forEach((d,i) => { drawn.markers.length=0; eval('active='+i+';renderDay();');
    const h = els['#p-tage'].innerHTML;
    if (drawn.markers.length!==erwartet[i] || h.indexOf('id="map"')>h.indexOf('<ul class="tl">')) mapOk=false });
  ok('alle 9 Tage: Marker korrekt, Karte ueber der Timeline', mapOk);
  ok('OSM-Kacheln', /openstreetmap/.test(drawn.tiles||''));
  const urls = eval('active=0;renderDay();tileUrls()');
  ok('Kachel-URLs, Deckel 160', urls.length>0 && urls.length<=160 && /^https:\/\/tile\.openstreetmap\.org\//.test(urls[0]), `${urls.length}`);

console.log('\nDokumentenablage');
  ok('Pfad wird sauber kodiert',
     eval('docPath("Zug Ticket.pdf")')==='docs/Zug%20Ticket.pdf');
  ok('ohne Cache-API sauberer Hinweis statt Absturz',
     /keine Dateien offline ablegen|Noch nichts hinterlegt/.test(els['#docs'].innerHTML),
     els['#docs'].innerHTML.slice(0,60));
  ok('Dateien landen nicht im Repo',
     !require('fs').readdirSync('/Users/aymaneloukili/Downloads/Tanger').some(f=>/\.pdf$/i.test(f)));

console.log('\nMaps-Links');
  ok('eigener Link hat Vorrang',
     eval('mapHref({q:"x",url:"https://maps.app.goo.gl/ABC"})')==='https://maps.app.goo.gl/ABC');
  ok('sonst Namenssuche',
     eval('mapHref({q:"Cap Spartel"})').startsWith('https://www.google.com/maps/search/'));
  ok('2 Lokale mit eigenem Link',
     TRIP.reduce((a,d)=>a+d.items.filter(i=>i.loc&&i.loc.url).length,0)===2);

console.log('\nDetail-Sheet');
  eval(`openSheet(2,${idxOf(2,'Parc Perdicaris · Rmilat')});`);
  const sh = els['#sheet'].innerHTML;
  ok('Beschreibung, Maps-Link, Ort', /Pinien- und Eukalyptuswald/.test(sh)
     && /google\.com\/maps\/search/.test(sh) && /<b>Ort<\/b>/.test(sh));
  eval('closeSheet();');
  ok('schliesst', els['#sheet'].hidden===true);

console.log('\nOeffnungszeiten');
  let warnfrei = true;
  TRIP.forEach((_,i) => { eval('active='+i+';renderDay();');
    if (/note warn small/.test(els['#p-tage'].innerHTML)) warnfrei=false });
  ok('an den Reisedaten warnungsfrei', warnfrei);
  ok('Dienstag warnt', /Am Di geschlossen/.test(
     eval(`hoursMsg({date:"2026-09-08"},{t:"17:15",hours:{days:[0,1,3,4,5,6],from:"10:00",to:"18:00"}})`)));
  // Schlusszeit nach Mitternacht darf nicht faelschlich warnen
  const A=[0,1,2,3,4,5,6];
  ok('bis 01:00 -> 21:00 ist offen',
     eval(`hoursMsg({date:"2026-09-08"},{t:"21:00",hours:{days:[${A}],from:"12:00",to:"01:00"}})`)==='');
  ok('bis 01:00 -> 00:30 ist offen',
     eval(`hoursMsg({date:"2026-09-08"},{t:"00:30",hours:{days:[${A}],from:"12:00",to:"01:00"}})`)==='');
  ok('bis 01:00 -> 09:00 warnt',
     /Geöffnet von 12:00 bis 01:00/.test(eval(`hoursMsg({date:"2026-09-08"},{t:"09:00",hours:{days:[${A}],from:"12:00",to:"01:00"}})`)));

console.log('\nFahrplan');
  eval('active=5;renderDay();');
  ok('ONCF-Link mit Strecke und Datum', /oncf-voyages\.ma/.test(els['#p-tage'].innerHTML)
     && /Tanger Ville → Rabat Agdal/.test(els['#p-tage'].innerHTML) && /Mo 07\.09\./.test(els['#p-tage'].innerHTML));

console.log('\nBustarif gemischt');
  // 2 Personen, 1 marokkanischer Ausweis -> 80 + 130
  eval("people=2;busMA=1;renderCosts();");
  ok('1 von 2 ermaessigt -> 210 MAD', /210/.test(els['#tblT'].innerHTML) && /1× 80 \+ 1× 130/.test(els['#tblT'].innerHTML),
     (els['#tblT'].innerHTML.match(/1× 80[^<]*/)||[''])[0]);
  eval("busMA=2;renderCosts();");
  ok('beide ermaessigt -> 160 MAD', /2× 80 \+ 0× 130/.test(els['#tblT'].innerHTML));
  eval("busMA=0;renderCosts();");
  ok('keiner ermaessigt -> 260 MAD', /0× 80 \+ 2× 130/.test(els['#tblT'].innerHTML));
  eval("people=2;busMA=4;renderCosts();");
  ok('mehr Ausweise als Personen wird gedeckelt', /2× 80 \+ 0× 130/.test(els['#tblT'].innerHTML));
  eval("busMA=1;renderCosts();");

console.log('\nKostenmodell');
  ok('Essensbudget passt zu den geplanten Lokalen', /withFood\?220\*people\*9/.test(src));
  ok('kein Hammam-Posten mehr', !COSTS_E.some(c=>/Hammam/.test(c.n)));
  ok('kein Paradise-Beach-Taxi mehr', !COSTS_T.some(c=>/Paradise/.test(c.n)));
  ok('Mietwagen statt Achakkar-Taxi',
     COSTS_T.some(c=>/Mietwagen/.test(c.n)) && !COSTS_T.some(c=>/Achakkar/.test(c.n)));
  ok('Al Boraq mit gebuchtem Preis', COSTS_T.some(c=>/Boraq/.test(c.n) && c.v===219 && /gebucht/.test(c.d||'')));
  ok('Rabat-Museen statt Museum Mohammed VI', COSTS_E.some(c=>/Museen in Rabat/.test(c.n)));
  ok('kein unbelegtes kostenlos bei Museen mit Eintritt',
     !TRIP.some(d=>d.items.some(i=>i.f && /Musée|Museum|Fondation|Palais Rassouni/.test(i.h))));
  ok('Zug-Chips zeigen nicht mehr die alte Schaetzung', !/115–172 MAD/.test(src));

console.log('\nAusgaben');
  eval("SPENT={t0:150};EST={t:{t0:175,t1:275},e:{}};updateCmp();");
  ok('unter Budget', els['#cmpT'].className.includes('under') && /−25 MAD/.test(els['#cmpT'].innerHTML));
  eval("SPENT={t0:300};updateCmp();");
  ok('ueber Budget', els['#cmpT'].className.includes('over') && /\+125 MAD/.test(els['#cmpT'].innerHTML));
  eval("SPENT={};");

console.log('\nNotizen');
  eval("RN={'1_11':{r:4,t:'Toller Minztee'}};active=1;renderDay();");   // Tag 2, Café Hafa
  const d2 = els['#p-tage'].innerHTML;
  ok('Bewertung und Text erhalten', /class="notebtn has"/.test(d2)
     && (d2.match(/class="star on"/g)||[]).length===4 && /Toller Minztee/.test(d2));
  eval("RN={};");

console.log('\nBearbeitungsmodus');
  eval('EDIT=true;active=0;renderDay();');
  const ed = els['#p-tage'].innerHTML;
  ok('Felder editierbar', (ed.match(/class="ed-t"/g)||[]).length===11 && (ed.match(/class="ed-p"/g)||[]).length===11);
  eval("EDIT=false;setOv(0,0,'h','Landung — verspätet');renderDay();");
  ok('Override sichtbar, TRIP unangetastet', /Landung — verspätet/.test(els['#p-tage'].innerHTML)
     && TRIP[0].items[0].h==='Landung in Tanger');
  eval("setOv(0,0,'h','Landung in Tanger');");
  ok('Ruecksetzen leert Override', (store['tng_overrides']||'{}')==='{}');

console.log('\nTageskachel-Autoscroll');
  log.strip.length=0;
  for (let i=1;i<6;i++){ ACTIVE_TILE=i; eval('goDay('+i+');') }
  ok('zentriert bei Pfeilnavigation', log.strip.length===5 && Math.abs(log.strip[4].left-161)<2,
     JSON.stringify(log.strip[4]));
  log.strip.length=0; ACTIVE_TILE=0; eval('goDay(0);');
  ok('Anfang auf 0 geklemmt', log.strip[0].left===0);
  log.strip.length=0; ACTIVE_TILE=8; eval('goDay(8);');
  ok('Ende auf Maximum geklemmt', log.strip[0].left===204);

console.log('\nJetzt-Zeile');
  eval(`today=function(){return "2026-09-04"};`);
  const RD = Date;
  global.Date = class extends RD { constructor(...a){ super(...a.length?a:['2026-09-04T14:30:00']) } };
  global.Date.now = () => new RD('2026-09-04T14:30:00').getTime();
  eval('active=2;');
  ok('laufender Punkt erkannt', eval('currentNowIdx()')===7, `${eval('currentNowIdx()')}`);
  log.now.length=0; eval('wantNowScroll=true;renderDay();');
  ok('springt zur Jetzt-Zeile', log.now.length===1);
  log.now.length=0; eval('goDay(3);goDay(2);');
  ok('Tageswechsel springt nicht', log.now.length===0);
  global.Date = RD;

console.log('\nGlocke');
  ['default','granted','denied'].forEach(p => {
    eval(`Notification.permission="${p}";renderBell();`);
    const b = els['#bell'];
    const soll = p==='default' ? b.className==='bell' && /class="dot"/.test(b.innerHTML)
      : p==='granted' ? b.className==='bell on' && !/class="dot"/.test(b.innerHTML)
      : b.className==='bell off' && /M3 3l18 18/.test(b.innerHTML);
    ok(`Zustand ${p}`, soll, b.className);
  });

console.log(`\n${PASS} bestanden, ${FAIL} fehlgeschlagen`);
process.exit(FAIL ? 1 : 0);
}
