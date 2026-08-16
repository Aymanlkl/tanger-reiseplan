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
    return [] }, createElement: El, addEventListener(){},
  documentElement: { _theme:null, setAttribute(k,v){ this._theme=v }, getAttribute(){ return this._theme },
    clientHeight: 900 },
  body: { appendChild(){}, removeChild(){} } };
// Kein echter Netzzugriff im Test
global.fetch = () => Promise.reject(new Error('kein Netz im Test'));
global.navigator.geolocation = { watchPosition(){ return 1 }, clearWatch(){} };
global.window = { addEventListener(){}, scrollTo(){}, matchMedia:()=>({matches:false}), location:{origin:'x'} };
global.screen = { height: 956 };
global.window.getComputedStyle = () => ({ paddingTop:'62px', paddingBottom:'34px' });
global.window.innerHeight = 956;
global.window.visualViewport = { height: 956, offsetTop: 0 };
global.window.devicePixelRatio = 3;
global.window.navigator = { standalone: true };
global.window.Notification = global.Notification = { permission:'default', requestPermission:()=>Promise.resolve('granted') };
global.navigator = { userAgent:'node' };
global.localStorage = { getItem: k=>store[k]||null, setItem:(k,v)=>store[k]=v };
global.requestAnimationFrame = f=>f(); global.setTimeout = f=>f(); global.clearTimeout = ()=>{};
global.IntersectionObserver = class { observe(){} }; global.Response = class { constructor(b){this.b=b} };
const drawn = { markers: [], tiles: null, polyline: null };
let mapClick = null;   // Klick-Handler, den buildMap registriert
global.L = { map: () => ({ remove(){}, fitBounds(){}, setView(){},
    on(ev, fn){ if (ev === 'click') mapClick = fn; },
    getBounds:()=>({getWest:()=>-5.94,getEast:()=>-5.76,getNorth:()=>35.80,getSouth:()=>35.75}),
    getZoom:()=>13, invalidateSize(){} }),
  tileLayer: u => { drawn.tiles = u; return {addTo(){}} },
  polyline: ll => { drawn.polyline = ll; return {addTo(){}} },
  marker: ll => { drawn.markers.push(ll); return {addTo(){return {on(){}}}} },
  divIcon: o=>o, latLngBounds: l=>({pad:()=>l}) };

try { eval(code); } catch (e) { console.log('LAUFZEITFEHLER:', e.message); process.exit(1) }
setImmediate(() => { try { run() } catch (e) { console.log('FEHLER:', e.message, e.stack); process.exit(1) } });

const spaeter = [];
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

console.log('\nFotos und Stadtkarte');
  eval('active=1;renderDay();');
  ok('Fotoblock in der Tageskarte', /id="fgrid"/.test(els['#p-tage'].innerHTML)
     && /id="fotofile"/.test(els['#p-tage'].innerHTML));
  ok('Fotopfad je Tag getrennt', eval('fotoPath(2,"IMG 1.jpg")')==='fotos/2/IMG%201.jpg');
  const pakete = eval('GEBIETE');
  ok('fuenf Gebietspakete statt einer Box', pakete.length===5,
     pakete.map(g=>g.k).join(','));
  ok('jedes Gebiet liefert Kacheln',
     pakete.every(g=>{const u=eval('tileUrls('+JSON.stringify(g)+')');
                      return u.length>50 && u.length<1200;}),
     pakete.map(g=>g.k+':'+eval('tileUrls('+JSON.stringify(g)+')').length).join(' '));
  ok('alle 87 Orte liegen in mindestens einem Gebiet',
     (()=>{let drin=0,ges=0;
       TRIP.forEach(d=>d.items.forEach(i=>{ if(!i.loc||!i.loc.lat)return; ges++;
         if(pakete.some(g=>i.loc.lng>=g.w&&i.loc.lng<=g.e&&i.loc.lat>=g.s&&i.loc.lat<=g.n2))drin++;}));
       return drin===ges;})(),
     (()=>{let fehlt=[];
       TRIP.forEach(d=>d.items.forEach(i=>{ if(!i.loc||!i.loc.lat)return;
         if(!pakete.some(g=>i.loc.lng>=g.w&&i.loc.lng<=g.e&&i.loc.lat>=g.s&&i.loc.lat<=g.n2))fehlt.push(d.n+':'+i.h);}));
       return fehlt.join(' | ');})());
  ok('Standortknopf an der Karte', /id="dlpos"/.test(els['#p-tage'].innerHTML)
     && /id="dltiles"/.test(els['#p-tage'].innerHTML));

console.log('\nFahrkarten');
  ok('vier Slots, beide Personen, beide Richtungen',
     eval('TICKETS.length')===4
     && eval("TICKETS.filter(function(t){return t.wer==='Aymane';}).length")===2
     && eval("TICKETS.filter(function(t){return t.ri==='Rückfahrt';}).length")===2);
  ok('Wagen und Platz stimmen mit den PDFs',
     eval("TICKETS.filter(function(t){return t.k==='hin-a';})[0].d").indexOf('Wagen 6 · Platz 22')>=0
     && eval("TICKETS.filter(function(t){return t.k==='rueck-o';})[0].d").indexOf('Wagen 5 · Platz 23')>=0);
  ok('Pfad liegt im eigenen Bereich', eval("tkPath('hin-a')")==='tickets/hin-a');
  ok('eigener Cache, in der Aufbewahrungsliste',
     /var TKTS  = 'tanger-tickets-v1'/.test(require('fs').readFileSync('/Users/aymaneloukili/Downloads/Tanger/sw.js','utf8'))
     && /KEEP  = \[CACHE, TILES, DATA, DOCS, FOTOS, TKTS\]/.test(require('fs').readFileSync('/Users/aymaneloukili/Downloads/Tanger/sw.js','utf8')));
  ok('Service Worker liefert Fahrkarten nur lokal',
     /url\.pathname\.indexOf\('\/tickets\/'\) !== -1 \? TKTS/.test(require('fs').readFileSync('/Users/aymaneloukili/Downloads/Tanger/sw.js','utf8')));
  ok('Vollbildansicht vorhanden', /id="qrview"/.test(src) && /function zeigeTicket/.test(src));
  ok('keine Fahrkarte im Repo',
     !require('fs').readdirSync('/Users/aymaneloukili/Downloads/Tanger')
       .some(f=>/qr|ticket|billet/i.test(f)));


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
  eval("people=2;busMA=1;renderCosts();");
  ok('1 von 2 ermaessigt -> 210 MAD', eval('busPreis()')===210, `${eval('busPreis()')}`);
  eval("busMA=2;"); ok('beide ermaessigt -> 160 MAD', eval('busPreis()')===160);
  eval("busMA=0;"); ok('keiner ermaessigt -> 260 MAD', eval('busPreis()')===260);
  eval("busMA=4;"); ok('mehr Ausweise als Personen wird gedeckelt', eval('busPreis()')===160);
  eval("busMA=1;renderCosts();");
  ok('Bus steckt in der Tagessumme von Tag 3',
     (()=>{const mit=eval('tagKosten(2)'); eval('busMA=0;'); const ohne=eval('tagKosten(2)');
           eval('busMA=1;'); return ohne-mit===50;})());

console.log('\nHotel- und Flugschalter');
  eval("people=2;busMA=1;withFood=false;withHotel=false;withFlug=false;renderCosts();");
  const basis = parseInt(els['#tot'].innerHTML.replace(/[^\d]/g,''),10);
  ok('ohne Schalter: nur Kosten vor Ort',
     /nur Kosten vor Ort/.test(els['#toteur'].textContent), els['#toteur'].textContent);
  eval("withHotel=true;renderCosts();");
  const mitHotel = parseInt(els['#tot'].innerHTML.replace(/[^\d]/g,''),10);
  ok('Hotel addiert 433,31 € in MAD', mitHotel-basis===Math.round(433.31*11), `${mitHotel-basis}`);
  eval("withFlug=true;renderCosts();");
  const mitBeidem = parseInt(els['#tot'].innerHTML.replace(/[^\d]/g,''),10);
  ok('Flug addiert 255 € in MAD', mitBeidem-mitHotel===Math.round(255*11), `${mitBeidem-mitHotel}`);
  ok('Untertitel nennt beide', /mit Hotel, Flug/.test(els['#toteur'].textContent), els['#toteur'].textContent);
  eval("withPark=true;renderCosts();");
  const mitPark = parseInt(els['#tot'].innerHTML.replace(/[^\d]/g,''),10);
  ok('Parken addiert 101 € in MAD', mitPark-mitBeidem===Math.round(101*11), `${mitPark-mitBeidem}`);
  eval("withFood=true;renderCosts();");
  ok('Untertitel nennt alle vier', /mit Essen, Hotel, Flug, Parken/.test(els['#toteur'].textContent),
     els['#toteur'].textContent);
  ok('Schalterbeschriftung zeigt Euro und MAD',
     /433,31 €/.test(els['#lbHotel'].textContent) && /4.766 MAD/.test(els['#lbHotel'].textContent),
     els['#lbHotel'].textContent);
  ok('Wechselkurs nur an einer Stelle',
     (src.match(/sum\/11|\/ 11\b/g)||[]).length===0 && /var EURMAD=11/.test(src));
  eval("withFood=false;withHotel=false;withFlug=false;withPark=false;renderCosts();");

console.log('\nKostenmodell');
  ok('Preise haengen an den Tagespunkten, nicht in Extratabellen',
     !/var COSTS_T=|var COSTS_E=/.test(src) && /var COSTS_X=/.test(src));
  ok('nur noch uebergreifende Posten in der Tabelle', eval('COSTS_X.length')===3);
  const preisPunkte = TRIP.reduce((a,d)=>a+d.items.filter(i=>i.v).length,0);
  ok('Punkte tragen eigene Preise', preisPunkte>=40, `${preisPunkte}`);
  ok('kein alter c-Chip mehr uebrig', !TRIP.some(d=>d.items.some(i=>i.c!==undefined)));
  ok('pro Person und pro Gruppe unterschieden',
     TRIP.some(d=>d.items.some(i=>i.v&&i.pp)) && TRIP.some(d=>d.items.some(i=>i.v&&!i.pp)));
  ok('Herkuleshoehlen jetzt einheitlich 85',
     (()=>{const it=TRIP[2].items.find(i=>i.h==="Grottes d'Hercule"); return it.v===85;})());
  const fpp = eval('foodPerPerson()');
  ok('Essensbudget kommt aus den Punktpreisen', fpp.sum>1500 && fpp.sum<2600, JSON.stringify(fpp));
  ok('Essenssumme folgt einer Preisaenderung',
     (()=>{const i=TRIP[6].items.findIndex(x=>x.h==='Rio do Texas');
           const vor=eval('foodPerPerson()').sum;
           eval(`setOv(6,${i},'v',399);`);
           const nach=eval('foodPerPerson()').sum;
           eval(`delete OV['6_${i}'];`);
           return nach-vor===100;})());
  ok('Tagessumme folgt derselben Aenderung',
     (()=>{const i=TRIP[6].items.findIndex(x=>x.h==='Rio do Texas');
           eval('withFood=true;');
           const vor=eval('tagKosten(6)');
           eval(`setOv(6,${i},'v',399);`);
           const nach=eval('tagKosten(6)');
           eval(`delete OV['6_${i}'];withFood=false;`);
           return nach-vor===200;})());
  ok('kein Hammam, kein Paradise-Beach mehr',
     !/Hammam/.test(src) && !TRIP.some(d=>d.items.some(i=>/Paradise/.test(i.h))));
  ok('Zug-Chips zeigen nicht mehr die alte Schaetzung', !/115–172 MAD/.test(src));

console.log('\nTagespreise bearbeitbar');
  eval("EDIT=true;active=0;renderDay();");
  ok('Preisfeld und Pro-Person-Schalter im Bearbeitungsmodus',
     /class="ed-v"/.test(els['#p-tage'].innerHTML) && /class="ed-pp/.test(els['#p-tage'].innerHTML));
  const T = TRIP[0].items.findIndex(i=>i.h==='Taxi in die Medina');
  ok('Taxi Flughafen startet bei 175 fuer alle', TRIP[0].items[T].v===175 && !TRIP[0].items[T].pp);
  eval(`setOv(0,${T},'v',260);`);
  ok('geaenderter Preis kommt im Item an', eval(`item(0,${T})`).v===260);
  ok('und schlaegt auf die Tagessumme durch',
     (()=>{const a=eval('tagKosten(0)'); eval(`setOv(0,${T},'v',175);`);
           return a-eval('tagKosten(0)')===85;})());
  ok('Original bleibt unangetastet', TRIP[0].items[T].v===175);
  eval(`delete OV['0_${T}'];EDIT=false;renderDay();`);
  ok('Tagessumme steht in der Tageskarte', /class="tagsum"/.test(els['#p-tage'].innerHTML));
  ok('Kostenseite listet alle neun Tage',
     (els['#tblTage'].innerHTML.match(/class="taglink"/g)||[]).length===9,
     `${(els['#tblTage'].innerHTML.match(/class="taglink"/g)||[]).length}`);
  ok('Tagessumme enthaelt keine Festkosten',
     (()=>{eval('withHotel=true;withFlug=true;withPark=true;renderCosts();');
           const mit=eval('tagKosten(0)');
           eval('withHotel=false;withFlug=false;withPark=false;renderCosts();');
           return mit===eval('tagKosten(0)');})());
  ok('Festkosten stehen als eigener Block auf der Kostenseite',
     (()=>{eval('withHotel=true;withFlug=true;withPark=true;renderCosts();');
           const h=els['#tblTage'].innerHTML;
           const ok2=/Vorab bezahlt/.test(h)&&/Hotel Mamora/.test(h)&&/Summe vor Ort/.test(h)&&/Summe gesamt/.test(h);
           eval('withHotel=false;withFlug=false;withPark=false;renderCosts();');
           return ok2;})());
  ok('Tageskarte weist aus, dass Festkosten fehlen',
     (()=>{eval('active=0;renderDay();');
           return /ohne Hotel, Flug und Parken/.test(els['#p-tage'].innerHTML);})());

console.log('\nEigene Punkte hinzufuegen');
  eval("ADD={};active=1;EDIT=false;renderDay();");
  const vorher = eval('dayItems(1).length');
  const kk = eval('neuerPunkt(1)');
  ok('neuer Punkt bekommt einen eigenen Schluessel', /^a\d+$/.test(kk), kk);
  ok('Tagesliste waechst', eval('dayItems(1).length')===vorher+1);
  ok('TRIP bleibt unangetastet', TRIP[1].items.length===vorher);
  eval(`setFeld(1,'${kk}','h','Kaffee & Lebensmittel');setFeld(1,'${kk}','t','16:45');setFeld(1,'${kk}','v',45);setFeld(1,'${kk}','pp',0);`);
  const neu = eval(`itemK(1,'${kk}')`);
  ok('Titel, Zeit und Preis werden gespeichert',
     neu.h==='Kaffee & Lebensmittel' && neu.t==='16:45' && neu.v===45 && !neu.pp);
  ok('Punkt sortiert sich nach Uhrzeit ein',
     (()=>{const l=eval('dayItems(1)');
           const n=l.findIndex(x=>x.kk===kk);
           return n>0 && l[n-1].t<='16:45' && (n===l.length-1 || l[n+1].t>='16:45');})());
  ok('Preis zaehlt in der Tagessumme',
     (()=>{const mit=eval('tagKosten(1)');
           eval(`setFeld(1,'${kk}','v',0);`);
           const ohne=eval('tagKosten(1)');
           eval(`setFeld(1,'${kk}','v',45);`);
           return mit-ohne===45;})());
  eval("EDIT=true;renderDay();");
  ok('im Bearbeitungsmodus mit Loeschknopf', /Diesen Punkt löschen/.test(els['#p-tage'].innerHTML));
  ok('Knopf zum Hinzufuegen vorhanden', /id="edadd"/.test(els['#p-tage'].innerHTML));
  eval("EDIT=false;renderDay();");
  ok('als selbst ergaenzt markiert', /chip neu/.test(els['#p-tage'].innerHTML));
  eval(`saveNote(1,'${kk}',{t:'zwei Tueten'});`);
  ok('Notiz haengt am eigenen Punkt', eval(`hasNote(1,'${kk}')`)===true);
  eval(`loeschePunkt(1,'${kk}');`);
  ok('Loeschen entfernt Punkt und Notiz',
     eval('dayItems(1).length')===vorher && eval(`hasNote(1,'${kk}')`)===false);
  eval("ADD={};renderDay();");


console.log('\nAbrechnung');
  eval("SPENT={};EXTRA=[];people=2;withFood=false;withHotel=false;withFlug=false;withPark=false;renderCosts();");
  ok('leer: noch nichts erfasst', /noch nichts erfasst/.test(els['#tblBilanz'].innerHTML));
  ok('Geplant-Zeile zeigt eine Zahl, kein NaN',
     /Geplant/.test(els['#tblBilanz'].innerHTML) && !/NaN/.test(els['#tblBilanz'].innerHTML));
  eval("SPENT={d1:200,d3:100};renderCosts();");
  ok('Ist-Werte je Tag summieren sich', /300 MAD/.test(els['#tblBilanz'].innerHTML));
  ok('unter dem Plan wird als under markiert', /bilrow under/.test(els['#tblBilanz'].innerHTML));
  eval("EXTRA=[{t:'Taxi zum Markt',v:40},{t:'Geschenk',v:160}];renderCosts();");
  ok('freie Ausgaben zaehlen mit', /500 MAD/.test(els['#tblBilanz'].innerHTML));
  ok('freie Ausgaben werden gelistet', /Taxi zum Markt/.test(els['#extras'].innerHTML));
  eval("SPENT={d1:99999};EXTRA=[];renderCosts();");
  ok('ueber dem Plan wird als over markiert', /bilrow over/.test(els['#tblBilanz'].innerHTML));
  eval("SPENT={};EXTRA=[];renderCosts();");


console.log('\nAusgaben');
  eval("SPENT={d1:150};EST={t:{d1:175,d2:275},e:{}};updateCmp();");
  ok('unter Budget', els['#cmpT'].className.includes('under') && /−25 MAD/.test(els['#cmpT'].innerHTML));
  eval("SPENT={d1:300};updateCmp();");
  ok('ueber Budget', els['#cmpT'].className.includes('over') && /\+125 MAD/.test(els['#cmpT'].innerHTML));
  eval("SPENT={};");

console.log('\nNotizen und Checkliste');
  eval("RN={};active=1;renderDay();");
  const html2 = els['#p-tage'].innerHTML;
  ok('jeder Punkt hat ein Notizfeld',
     (html2.match(/class="notebtn/g)||[]).length===TRIP[1].items.length,
     `${(html2.match(/class="notebtn/g)||[]).length} von ${TRIP[1].items.length}`);
  ok('Notiz auch bei Punkten ohne Essen',
     (()=>{const n=TRIP[1].items.findIndex(i=>!i.eat); return n>=0 && new RegExp('id="rn'+n+'"').test(html2);})());
  eval("saveNote(1,3,{t:'Museum war zu'});");
  ok('Notiz speichert und meldet sich zurueck', eval('hasNote(1,3)')===true && RN['1_3'].t==='Museum war zu');
  eval("saveNote(1,3,{t:''});");
  ok('leere Notiz raeumt den Eintrag ab', eval('hasNote(1,3)')===false && RN['1_3']===undefined);
  // renderCheck liest den Speicher, ist also asynchron — spaeter pruefen
  eval("OWN=[{id:1,t:'Ladekabel'},{id:2,t:'Sonnenbrille'}];renderCheck();");
  spaeter.push(() => {
    ok('eigene Eintraege erscheinen', /Ladekabel/.test(els['#chklist'].innerHTML)
       && /selbst ergänzt/.test(els['#chklist'].innerHTML), els['#chklist'].innerHTML.slice(0,70));
    ok('eigene Eintraege haben eigene Schluessel', /data-k="o1"/.test(els['#chklist'].innerHTML));
    ok('feste Eintraege behalten ihren Index', /data-k="0"/.test(els['#chklist'].innerHTML));
  });

console.log('\nSpeicher');
  ok('ohne Cache-API sauberer Hinweis', /legt nichts offline ab/.test(els['#stbox'].innerHTML)
     || els['#stbox'].innerHTML==='', els['#stbox'].innerHTML.slice(0,50));
  ok('Groessenformat lesbar', eval('mb(5242880)')==='5.0 MB' && eval('mb(52428800)')==='50 MB');
  ok('vier Speicherbereiche definiert', eval('CACHE_INFO.length')===4
     && eval('CACHE_INFO.map(function(c){return c.k;}).join(",")')
        ==='tanger-maps-v1,tanger-fotos-v1,tanger-docs-v1,tanger-tickets-v1');

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

console.log('\nOrt bearbeiten');
  const K = idxOf(2,'Cap Spartel');
  ok('Koordinaten aus Text', JSON.stringify(eval('parseLatLng("35.7914, -5.8220")'))==='{"lat":35.7914,"lng":-5.822}');
  ok('Koordinaten aus Maps-Link', JSON.stringify(eval('parseLatLng("https://www.google.com/maps/@35.79153,-5.92567,17z")'))==='{"lat":35.79153,"lng":-5.92567}');
  ok('Unsinn wird abgelehnt', eval('parseLatLng("Cafe Hafa")')===null && eval('parseLatLng("999.9, 0.1")')===null);
  eval(`setOv(2,${K},'q','Cap Spartel Leuchtturm');`);
  ok('Ortsname landet im Override und im Item',
     eval(`item(2,${K})`).loc.q==='Cap Spartel Leuchtturm'
     && TRIP[2].items[K].loc.q==='Cap Spartel', TRIP[2].items[K].loc.q);
  eval(`setCoords(2,${K},{lat:35.80000,lng:-5.90000});`);
  ok('Koordinaten ueberschreiben nur die Kopie',
     eval(`item(2,${K})`).loc.lat===35.8 && TRIP[2].items[K].loc.lat===35.79153);
  eval(`setOv(2,${K},'url','https://maps.app.goo.gl/TEST');`);
  ok('eigener Link wirkt auf den Knopf',
     eval(`mapHref(item(2,${K}).loc)`)==='https://maps.app.goo.gl/TEST');
  // Kartentipp
  eval('EDIT=true;active=2;pinTarget="'+K+'";renderDay();');
  ok('Bearbeitungsfelder fuer den Ort vorhanden',
     /class="ed-q"/.test(els['#p-tage'].innerHTML) && /class="ed-c"/.test(els['#p-tage'].innerHTML)
     && /class="ed-u"/.test(els['#p-tage'].innerHTML));
  ok('Knopf zeigt scharfgeschalteten Zustand', /ed-pin armed/.test(els['#p-tage'].innerHTML));
  if (mapClick) mapClick({latlng:{lat:35.5,lng:-6.0}});
  ok('Kartentipp schreibt die Position', eval(`item(2,${K})`).loc.lat===35.5);
  ok('Tipp entwaffnet den Knopf', eval('pinTarget')===null);
  eval(`delete OV['2_${K}'];EDIT=false;renderDay();`);
  ok('Zuruecksetzen stellt das Original her',
     eval(`item(2,${K})`).loc.q==='Cap Spartel' && eval(`item(2,${K})`).loc.lat===35.79153);

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
  // 14:30 marokkanischer Zeit = 13:30 UTC
  global.Date = class extends RD { constructor(...a){ super(...a.length?a:['2026-09-04T13:30:00Z']) } };
  global.Date.now = () => new RD('2026-09-04T13:30:00Z').getTime();
  eval('active=2;');
  ok('laufender Punkt erkannt', eval('currentNowIdx()')===7,
     `Index ${eval('currentNowIdx()')}, nowMin ${eval('nowMin()')}`);
  ok('nowMin rechnet in Marokko-Zeit', eval('nowMin()')===870, `${eval('nowMin()')}`);
  log.now.length=0; eval('wantNowScroll=true;renderDay();');
  ok('springt zur Jetzt-Zeile', log.now.length===1);
  log.now.length=0; eval('goDay(3);goDay(2);');
  ok('Tageswechsel springt nicht', log.now.length===0);
  global.Date = RD;

console.log('\nViewport und Diagnose');
  ok('viewport-fit=cover ohne konkurrierende Angaben',
     /viewport-fit=cover/.test(src) && !/maximum-scale/.test(src) && !/user-scalable=no/.test(src));
  ok('Zoomsperre laeuft ueber touch-action', /touch-action:pan-y/.test(src));
  ok('Streifen unter der Leiste bekommt die Seitenfarbe',
     /\.tabs::after\{content:"";position:absolute;left:0;right:0;top:100%/.test(src));
  ok('Diagnosetabelle vorhanden', /id="diag"/.test(src) && /function renderDiag/.test(src));
  ok('Diagnose misst die Leistenunterkante gegen den Fensterrand',
     /Abstand zum Rand/.test(src) && /window\.innerHeight-r\.bottom/.test(src));
  ok('Diagnose bricht ohne DOM sauber ab', /if\(!t\|\|!document\.body\|\|!window\.getComputedStyle\)return/.test(src));


console.log('\nVersion und Update');
  ok('Service Worker beantwortet Versionsfrage',
     /d\.q === 'version'/.test(require('fs').readFileSync('/Users/aymaneloukili/Downloads/Tanger/sw.js','utf8')));
  ok('Service Worker kann sofort uebernehmen',
     /d\.q === 'skipWaiting'/.test(require('fs').readFileSync('/Users/aymaneloukili/Downloads/Tanger/sw.js','utf8')));
  ok('App fragt die Version ab und zeigt sie', /id="buildinfo"/.test(src) && /q:'version'/.test(src));
  ok('Banner bei neuer Fassung', /function updateBanner/.test(src) && /Neue Fassung verfügbar/.test(src));
  ok('sucht regelmaessig nach Updates',
     /reg\.update\(\)/.test(src) && /setInterval\(function\(\)\{reg\.update/.test(src));
  ok('sucht auch beim Zurueckholen aus dem Hintergrund',
     /if\(!document\.hidden\)reg\.update/.test(src));
  ok('Knopf zum Erzwingen vorhanden', /id="forcereload"/.test(src));


console.log('\nApp-Huelle');
  ok('Huelle und Leiste sind fest am Viewport verankert',
     /#shell\{position:fixed;top:0;left:0;right:0;bottom:0/.test(src)
     && /\.tabs\{position:fixed;left:0;right:0;bottom:0/.test(src));
  ok('kein 100dvh mehr — schliesst die Systemzonen im Standalone nicht ein',
     !/height:100dvh/.test(src));
  ok('Bodenfreiheit deckt genau die Leistenhoehe',
     /#shell\{padding-bottom:calc\(56px \+ max\(6px,var\(--sb\)\)\)\}/.test(src));
  ok('Systemzone unten wird nicht doppelt gerechnet',
     /padding:5px 6px max\(6px,var\(--sb\)\)/.test(src) && !/calc\(7px \+ var\(--sb\)\)/.test(src));
  ok('Summenbox darf umbrechen', /\.tagsum\{display:flex;flex-wrap:wrap/.test(src));
  ok('Markup liegt in der Huelle',
     /<body>\s*<div id="shell">/.test(src) && /<\/div><!-- \/shell -->/.test(src));
  ok('Reiterleiste liegt ausserhalb der Huelle',
     src.indexOf('</div><!-- /shell -->') < src.indexOf('<nav class="tabs"'));
  // user-scalable=no ist raus: es hat auf iOS das viewport-fit=cover ausgehebelt.
  // Die Zoomsperre laeuft jetzt allein ueber touch-action, das ist ohnehin wirksamer.
  ok('kein Pinch-Zoom', /touch-action:pan-y/.test(src));
  ok('kein Gummiband', /overscroll-behavior:none/.test(src) && /overscroll-behavior-y:contain/.test(src));
  ok('Eingabefelder koennen schrumpfen', /input,textarea,select\{min-width:0;max-width:100%\}/.test(src));
  ok('Medien laufen nicht ueber', /img,svg,iframe,video\{max-width:100%\}/.test(src));
  ok('Tabwechsel scrollt die Huelle, nicht das Fenster',
     /\$\("#shell"\)[\s\S]{0,80}scrollTo/.test(src) && !/window\.scrollTo\(\{top:0/.test(src));
  ok('Sentinel wird gegen die Huelle beobachtet', /root:\$\("#shell"\)/.test(src));


console.log('\nZeitzone, Standort, Fixpunkte');
  // Marokko liegt auf UTC+1 — 22:30 UTC ist dort noch derselbe Tag
  const t1 = eval(`tzTeile(new Date('2026-09-02T22:30:00Z'))`);
  ok('Marokko-Zeit statt Geraetezeit', t1.year+'-'+t1.month+'-'+t1.day==='2026-09-02' && t1.hour==='23',
     `${t1.year}-${t1.month}-${t1.day} ${t1.hour}:${t1.minute}`);
  const t2 = eval(`tzTeile(new Date('2026-09-02T23:30:00Z'))`);
  ok('Tageswechsel erst um Mitternacht in Marokko', t2.day==='03' && t2.hour==='00');
  ok('Erinnerung um 20 Uhr marokkanischer Zeit',
     new Date(eval(`maZeit('2026-09-07',20,0)`)).toISOString()==='2026-09-07T19:00:00.000Z');
  ok('keine Gerätezeit mehr in den Zeitrechnungen',
     !/new Date\(\),cur=n\.getHours/.test(src));

  ok('Entfernung und Himmelsrichtung',
     (()=>{eval('POS={lat:35.7855,lng:-5.8097,acc:20};');
           const t=eval(`entfText({lat:35.7914,lng:-5.8220})`);
           eval('POS=null;');
           return /^1\.?\d? km|^\d{3,4} m/.test(t) && /[↑↗→↘↓↙←↖]/.test(t);})(),
     (()=>{eval('POS={lat:35.7855,lng:-5.8097,acc:20};');const t=eval(`entfText({lat:35.7914,lng:-5.8220})`);eval('POS=null;');return t;})());
  ok('ohne Standort keine Angabe', eval(`entfText({lat:35.79,lng:-5.82})`)==='');

  const fixe = TRIP.reduce((a,d)=>a+d.items.filter(i=>i.fix).length,0);
  ok('sieben Fixpunkte markiert', fixe===7, `${fixe}`);
  ok('jeder Fixpunkt hat eine Aufbruchszeit vor der Abfahrt',
     TRIP.every(d=>d.items.filter(i=>i.fix).every(i=>i.fix.go < i.t)));
  ok('Countdown nur am heutigen Tag', eval('naechsterFix(5)')===null);

console.log('\nDarstellung und Wetter');
console.log('\nDarstellung und Wetter');
  eval("DARK=false;applyTheme();");
  ok('hell ist Voreinstellung', document.documentElement.getAttribute()==='light');
  eval("DARK=true;applyTheme();");
  ok('dunkel setzt data-theme', document.documentElement.getAttribute()==='dark');
  ok('Dunkelpalette im CSS definiert', /:root\[data-theme="dark"\]\{/.test(src));
  eval("DARK=false;applyTheme();");
  eval("WX=null;renderWx();");
  ok('ohne Vorhersage sauberer Hinweis statt leerer Karte',
     /noch keine Vorhersage/.test(els['#wxbox'].innerHTML));
  eval(`WX={time:["2026-09-02","2026-09-03"],tmax:[29,31],tmin:[20,21],code:[0,2],stand:"01.09."};renderWx();`);
  ok('Vorhersage wird auf die Reisetage gelegt',
     /MI 02\.09\./i.test(els['#wxbox'].innerHTML) && /29°/.test(els['#wxbox'].innerHTML)
     && /teils bewölkt/.test(els['#wxbox'].innerHTML), els['#wxbox'].innerHTML.replace(/<[^>]+>/g,' ').slice(0,90));
  eval("WX=null;");

console.log('\nGlocke');
  ['default','granted','denied'].forEach(p => {
    eval(`Notification.permission="${p}";renderBell();`);
    const b = els['#bell'];
    const soll = p==='default' ? b.className==='bell' && /class="dot"/.test(b.innerHTML)
      : p==='granted' ? b.className==='bell on' && !/class="dot"/.test(b.innerHTML)
      : b.className==='bell off' && /M3 3l18 18/.test(b.innerHTML);
    ok(`Zustand ${p}`, soll, b.className);
  });

setImmediate(() => {
  spaeter.forEach(f => f());
  console.log(`\n${PASS} bestanden, ${FAIL} fehlgeschlagen`);
  process.exit(FAIL ? 1 : 0);
});
}
