// Stroomstoringsgids: korte, praktische bladen. Alles staat in de app, dus werkt offline.

export const KOELKAST_UUR = 4;
export const VRIEZER_UUR = { vol: 48, half: 24 };

export const BLADEN = [
  {
    id: "eerste-uur",
    icoon: "klok",
    titel: "Het eerste uur",
    kort: "Wat je meteen doet, rustig en op volgorde.",
    html: `
      <ol>
        <li><strong>Kijk of de buren ook zonder stroom zitten.</strong> Alleen jij? Kijk dan in de meterkast of de hoofdschakelaar of een groep is uitgeschakeld.</li>
        <li><strong>Start de koelkasttimer</strong> hierboven en houd koelkast en vriezer dicht.</li>
        <li><strong>Pak je zaklamp</strong>, niet meteen kaarsen.</li>
        <li><strong>Zet de radio aan.</strong> NPO Radio 1 en je regionale omroep zijn de rampenzenders en geven informatie bij grote storingen.</li>
        <li><strong>Zet gevoelige apparaten uit</strong> (computer, tv, oven), zodat ze geen piek krijgen als de stroom terugkomt. Laat één lamp aan, dan merk je het meteen.</li>
        <li><strong>Spaar je telefoon.</strong> Zet de energiebesparing aan en bel alleen als het nodig is. Bij gevaar: 112.</li>
      </ol>
      <p class="tip">Storing melden of opzoeken: het landelijk storingsnummer is <strong>0800-9009</strong> (gratis).</p>
      <p>Denk ook aan buren die alleen wonen, slecht ter been zijn of afhankelijk zijn van apparatuur. Je gezinsplan helpt je herinneren wie.</p>`,
  },
  {
    id: "koelkast",
    icoon: "koelkast",
    titel: "Koelkast en vriezer",
    kort: "Hoe lang je eten koel blijft en wat je weggooit.",
    html: `
      <ul>
        <li><strong>Houd de deuren dicht.</strong> Een dichte koelkast blijft ongeveer <strong>4 uur</strong> koel genoeg.</li>
        <li>Een <strong>volle vriezer</strong> houdt het ongeveer <strong>48 uur</strong>, een <strong>halfvolle</strong> ongeveer <strong>24 uur</strong>.</li>
        <li>Eet eerst wat in de koelkast ligt, daarna pas uit de vriezer, en pas daarna je houdbare voorraad.</li>
      </ul>
      <h4>Na de storing</h4>
      <ul>
        <li>Koelkast langer dan 4 uur zonder stroom: gooi <strong>vlees, vis, zuivel, eieren, gekookte restjes en gesneden fruit</strong> weg.</li>
        <li>Diepvries met nog ijskristallen of kouder dan 4 °C: mag je weer invriezen.</li>
        <li>Helemaal ontdooid: vlees en vis meteen goed gaar maken en opeten, of weggooien. Niet opnieuw invriezen.</li>
        <li><strong>Twijfel? Weggooien.</strong> Ruiken of proeven is geen goede test.</li>
      </ul>
      <p class="tip">Tip voor nu al: vul lege ruimte in de vriezer met flessen water. Een volle vriezer blijft langer koud, en je hebt meteen extra koelelementen.</p>`,
  },
  {
    id: "water",
    icoon: "druppel",
    titel: "Drinkwater",
    kort: "Veilig water om te drinken, koken en wassen.",
    html: `
      <ul>
        <li>Reken op <strong>3 liter per persoon per dag</strong>: om te drinken en om eten klaar te maken.</li>
        <li>Het kraanwater blijft bij een storing meestal nog een tijd werken. Vul meteen <strong>flessen, pannen en de badkuip</strong> (badwater is voor de wc en wassen, niet om te drinken).</li>
        <li>In een hoog gebouw kan de pomp uitvallen. Dan droogt het water op de bovenste verdiepingen het eerst op.</li>
        <li>Geeft het waterbedrijf een <strong>kookadvies</strong>? Laat water minstens 1 minuut flink koken voor je het drinkt, ook voor tandenpoetsen.</li>
        <li>Waterfilter of tabletten zijn het laatste redmiddel, voor als er echt geen schoon water meer is.</li>
      </ul>`,
  },
  {
    id: "koolmonoxide",
    icoon: "wind",
    titel: "Koolmonoxide",
    veilig: true,
    kort: "Het onzichtbare gevaar van aggregaten en noodverwarming.",
    html: `
      <p class="alarm"><strong>Koolmonoxide (CO) zie, ruik en proef je niet. Het kan binnen korte tijd dodelijk zijn.</strong></p>
      <ul>
        <li><strong>Nooit binnen gebruiken:</strong> aggregaat, barbecue, campingbrander, terrasverwarmer of gaskachel zonder afvoer. Ook niet in de garage, schuur of met een raam open.</li>
        <li>Koken op een brander? Alleen buiten of bij een wijd open raam en deur, en nooit onbeheerd.</li>
        <li>Hang een <strong>CO-melder op batterijen</strong> op. Die werkt ook als de stroom uit is.</li>
      </ul>
      <h4>Klachten?</h4>
      <p>Hoofdpijn, misselijkheid, duizeligheid of sufheid, vaak bij meerdere mensen tegelijk: <strong>zet ramen en deuren open, ga naar buiten en bel 112.</strong></p>`,
  },
  {
    id: "licht",
    icoon: "lamp",
    titel: "Veilig licht",
    kort: "Licht maken zonder brand te riskeren.",
    html: `
      <ul>
        <li>Gebruik eerst een <strong>zaklamp of hoofdlamp</strong>. Een hoofdlamp houdt je handen vrij.</li>
        <li>Kaarsen: in een stevige houder, op een vlakke ondergrond, ver van gordijnen en papier.</li>
        <li>Waxinelichtjes worden aan de onderkant heet. Zet ze op een schoteltje, niet direct op hout of plastic.</li>
        <li><strong>Nooit onbeheerd</strong> laten branden, en altijd uit voor je gaat slapen of de kamer verlaat.</li>
        <li>Buiten bereik van kinderen en huisdieren.</li>
        <li>Een glazen pot of fles water vóór een zaklamp verspreidt het licht over de hele kamer.</li>
      </ul>`,
  },
  {
    id: "warm",
    icoon: "thermo",
    titel: "Warm (of koel) blijven",
    kort: "Zonder verwarming of airco de dag door.",
    html: `
      <h4>Als het koud is</h4>
      <ul>
        <li>Ga met z'n allen in <strong>één kamer</strong> zitten, doe de deuren dicht en 's avonds de gordijnen.</li>
        <li>Kleed je in <strong>laagjes</strong>, met muts en sokken. Wol en fleece houden warm, ook als ze vochtig zijn.</li>
        <li>Kruip samen onder dekens of in een slaapzak. Warm drinken uit een thermosfles helpt.</li>
        <li>Let extra op baby's, ouderen en zieken: zij koelen sneller af.</li>
      </ul>
      <h4>Als het warm is</h4>
      <ul>
        <li>Houd overdag ramen, gordijnen en zonwering dicht. Zet ze 's nachts open als het buiten koeler is.</li>
        <li>Drink genoeg, ook als je geen dorst hebt, en blijf uit de zon.</li>
      </ul>`,
  },
  {
    id: "terug",
    icoon: "stekker",
    titel: "Als de stroom terug is",
    kort: "Rustig weer opstarten en je voorraad aanvullen.",
    html: `
      <ul>
        <li>Zet apparaten <strong>één voor één</strong> weer aan, niet allemaal tegelijk.</li>
        <li>Stop de koelkasttimer en kijk in het blad <em>Koelkast en vriezer</em> wat je kunt houden.</li>
        <li>Laad telefoons, powerbanks en oplaadbare lampen weer op.</li>
        <li>Wat heb je gebruikt? Zet het op de boodschappenlijst in je voorraad, zodat je pakket weer compleet is.</li>
      </ul>`,
  },
];

export const ICONEN = {
  klok: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  koelkast: '<svg viewBox="0 0 24 24"><rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M5 10h14M9 6v2M9 13v3"/></svg>',
  vriezer: '<svg viewBox="0 0 24 24"><path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7"/><path d="m9 4 3 2 3-2M9 20l3-2 3 2"/></svg>',
  druppel: '<svg viewBox="0 0 24 24"><path d="M12 2.5S5 10 5 14.5a7 7 0 0 0 14 0C19 10 12 2.5 12 2.5Z"/></svg>',
  wind: '<svg viewBox="0 0 24 24"><path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/></svg>',
  lamp: '<svg viewBox="0 0 24 24"><path d="M9 2h6v4l2 3v12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V9l2-3Z"/><path d="M12 12v4"/></svg>',
  thermo: '<svg viewBox="0 0 24 24"><path d="M14 14.8V4a2 2 0 1 0-4 0v10.8a4 4 0 1 0 4 0Z"/><path d="M12 9v7"/></svg>',
  stekker: '<svg viewBox="0 0 24 24"><path d="M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0Z"/><path d="M12 17v5"/></svg>',
  pijl: '<svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>',
  let_op: '<svg viewBox="0 0 24 24"><path d="M12 3 2 20h20Z"/><path d="M12 10v4M12 17v.5"/></svg>',
};
