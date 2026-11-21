// Checklists per pakket en de score "hoe klaar ben je".
// Puur rekenwerk: geen DOM, zodat het los te testen is.

import { status } from "./datum.js?v=3";

export const KITS = [
  { id: "thuis", naam: "Thuis", kort: "Thuis" },
  { id: "tas", naam: "Vluchttas", kort: "Vluchttas" },
  { id: "auto", naam: "Auto", kort: "Auto" },
];

export const NIVEAUS = [
  { dagen: 3, naam: "72 uur", titel: "Je noodpakket voor 72 uur" },
  { dagen: 7, naam: "1 week", titel: "Je voorraad voor 1 week" },
  { dagen: 14, naam: "2 weken", titel: "Je voorraad voor 2 weken" },
];

export const CATEGORIEEN = ["Water", "Eten", "Hygiëne & medicatie", "Licht & vuur", "Gereedschap", "Documenten", "Overig"];

const nl = (n) => n.toLocaleString("nl-NL", { maximumFractionDigits: 1 });
const pers = (c) => (c.P === 1 ? "1 persoon" : `${c.P} personen`);

// Checklistregels. `vanaf` = vanaf welk niveau (0 = 72 uur) de regel meetelt.
// `zoek` = woorden waarmee de app het item in je voorraad herkent.
// `nieuw` = hoe het item heet als je het vanuit de checklist toevoegt.
const THUIS = [
  // Water en eten
  { id: "water", groep: "Water en eten", naam: "Drinkwater", ess: true, soort: "water",
    nodig: (c) => 3 * c.P * c.dagen + 0.5 * c.H * c.dagen,
    uitleg: (c) => `3 liter per persoon per dag${c.H ? ", plus water voor je huisdieren" : ""}`,
    nieuw: { naam: "Water (fles)", categorie: "Water", inhoud: "1,5L" } },
  { id: "eten", groep: "Water en eten", naam: "Houdbaar eten dat je zonder koken kunt eten", ess: true, soort: "eten",
    uitleg: (c) => `Voor ${c.dagen} dagen, ${pers(c)}. Telt als klaar bij ongeveer één verpakking per persoon per dag.`,
    nieuw: { naam: "", categorie: "Eten" } },
  { id: "blikopener", groep: "Water en eten", naam: "Blikopener of multitool", zoek: ["blikopener", "multitool", "leatherman", "zakmes"],
    nieuw: { naam: "Blikopener", categorie: "Gereedschap" } },
  { id: "dierenvoer", groep: "Water en eten", naam: "Voer voor je huisdieren", ess: true, als: (c) => c.H > 0,
    zoek: ["dierenvoer", "hondenvoer", "kattenvoer", "brokken", "voer"], nieuw: { naam: "Dierenvoer", categorie: "Eten" } },
  { id: "kindereten", groep: "Water en eten", naam: "Vertrouwd eten en drinken voor de kinderen", als: (c) => c.K > 0,
    zoek: ["baby", "kinder", "knijpfruit", "flesvoeding"], nieuw: { naam: "", categorie: "Eten" } },
  { id: "filter", groep: "Water en eten", naam: "Waterfilter of zuiveringstabletten (laatste redmiddel)", vanaf: 1,
    zoek: ["lifestraw", "waterfilter", "filter", "zuivering", "aquatab"], nieuw: { naam: "Waterfilter", categorie: "Water" } },
  { id: "koken", groep: "Water en eten", naam: "Campingbrander (alleen buiten of in een goed geventileerde ruimte)", vanaf: 1,
    zoek: ["brander", "kooktoestel", "gaspatroon", "gasbus", "kooker"], nieuw: { naam: "Campingbrander", categorie: "Licht & vuur" } },

  // Stroom en informatie
  { id: "radio", groep: "Stroom en informatie", naam: "Radio op batterijen of met opwinder", ess: true,
    zoek: ["radio"], nieuw: { naam: "Radio op batterijen", categorie: "Gereedschap" } },
  { id: "zaklamp", groep: "Stroom en informatie", naam: "Zaklamp of hoofdlamp", ess: true,
    zoek: ["zaklamp", "hoofdlamp", "lantaarn", "lamp"], nieuw: { naam: "Zaklamp", categorie: "Licht & vuur" } },
  { id: "batterijen", groep: "Stroom en informatie", naam: "Reservebatterijen", zoek: ["batterij"],
    nieuw: { naam: "Batterijen", categorie: "Licht & vuur" } },
  { id: "powerbank", groep: "Stroom en informatie", naam: "Opgeladen powerbank en kabel", zoek: ["powerbank", "accupack"],
    nieuw: { naam: "Powerbank", categorie: "Gereedschap" } },

  // Licht en warmte
  { id: "vuur", groep: "Licht en warmte", naam: "Lucifers of aansteker", zoek: ["lucifer", "aansteker"],
    nieuw: { naam: "Lucifers", categorie: "Licht & vuur" } },
  { id: "kaarsen", groep: "Licht en warmte", naam: "Kaarsen of waxinelichtjes", zoek: ["kaars", "waxine"],
    nieuw: { naam: "Waxinelichtjes", categorie: "Licht & vuur" } },
  { id: "dekens", groep: "Licht en warmte", naam: "Warme dekens of slaapzakken", uitleg: (c) => `Eén per persoon: ${c.P}`,
    zoek: ["deken", "slaapzak"], nieuw: { naam: "Deken", categorie: "Overig" } },
  { id: "kleding", groep: "Licht en warmte", naam: "Warme kleding, muts en sokken", vanaf: 1, zoek: ["muts", "thermo", "sokken"],
    nieuw: { naam: "Warme kleding", categorie: "Overig" } },

  // Hygiëne en gezondheid
  { id: "ehbo", groep: "Hygiëne en gezondheid", naam: "EHBO-set", ess: true, zoek: ["ehbo", "verbandtrommel"],
    nieuw: { naam: "EHBO-set", categorie: "Hygiëne & medicatie" } },
  { id: "medicijnen", groep: "Hygiëne en gezondheid", naam: "Je dagelijkse medicijnen", ess: true,
    uitleg: (c) => `Genoeg voor ${c.dagen} dagen, als iemand in huis ze gebruikt`, zoek: ["medicijn", "medicatie"],
    nieuw: { naam: "Medicijnen", categorie: "Hygiëne & medicatie" } },
  { id: "pijnstillers", groep: "Hygiëne en gezondheid", naam: "Pijnstillers", zoek: ["paracetamol", "ibuprofen", "pijnstiller"],
    nieuw: { naam: "Paracetamol", categorie: "Hygiëne & medicatie" } },
  { id: "wc", groep: "Hygiëne en gezondheid", naam: "Toiletpapier en tissues", zoek: ["wc-rol", "wc rol", "toiletpapier", "tissue"],
    nieuw: { naam: "WC-rol", categorie: "Hygiëne & medicatie" } },
  { id: "noodtoilet", groep: "Hygiëne en gezondheid", naam: "Vuilniszakken en kattenbakkorrels of zaagsel (noodtoilet)", vanaf: 1,
    ess: (c) => c.niveau >= 1, zoek: ["vuilniszak", "kattenbak", "zaagsel", "noodtoilet"],
    nieuw: { naam: "Vuilniszakken", categorie: "Hygiëne & medicatie" } },
  { id: "zeep", groep: "Hygiëne en gezondheid", naam: "Zeep of handgel", zoek: ["zeep", "handgel", "desinfect"],
    nieuw: { naam: "Handgel", categorie: "Hygiëne & medicatie" } },

  // Documenten en geld
  { id: "geld", groep: "Documenten en geld", naam: "Contant geld in kleine biljetten", ess: true, zoek: ["contant", "geld", "cash"],
    nieuw: { naam: "Contant geld", categorie: "Documenten" } },
  { id: "documenten", groep: "Documenten en geld", naam: "Kopieën van belangrijke documenten", soortCat: "Documenten",
    zoek: ["kopie", "paspoort", "document", "polis"], nieuw: { naam: "Kopie paspoort", categorie: "Documenten" } },
  { id: "nummers", groep: "Documenten en geld", naam: "Belangrijke telefoonnummers op papier", soort: "plan",
    uitleg: () => "Vul je gezinsplan in en print het", nieuw: null },

  // Gereedschap
  { id: "fluit", groep: "Gereedschap", naam: "Fluitje", zoek: ["fluit"], nieuw: { naam: "Fluit", categorie: "Gereedschap" } },
  { id: "tape", groep: "Gereedschap", naam: "Ducttape en touw", zoek: ["tape", "touw"], nieuw: { naam: "Ducttape", categorie: "Gereedschap" } },
];

const TAS = [
  { id: "water", groep: "Water en eten", naam: "Water om mee te nemen", ess: true, soort: "water", dagen: 1,
    nodig: (c) => 1.5 * c.P, uitleg: () => "Minstens 1,5 liter per persoon", nieuw: { naam: "Water (fles)", categorie: "Water", inhoud: "1,5L" } },
  { id: "eten", groep: "Water en eten", naam: "Energierepen of ander licht eten", ess: true, soort: "eten", dagen: 3,
    uitleg: () => "Voor 72 uur", nieuw: { naam: "Energierepen", categorie: "Eten" } },
  { id: "filter", groep: "Water en eten", naam: "Waterfilter of zuiveringstabletten", zoek: ["lifestraw", "waterfilter", "filter", "zuivering"],
    nieuw: { naam: "Waterfilter", categorie: "Water" } },
  { id: "medicijnen", groep: "Gezondheid", naam: "Persoonlijke medicijnen", ess: true, zoek: ["medicijn", "medicatie"],
    nieuw: { naam: "Medicijnen", categorie: "Hygiëne & medicatie" } },
  { id: "ehbo", groep: "Gezondheid", naam: "Kleine EHBO-set", ess: true, zoek: ["ehbo", "pleister"],
    nieuw: { naam: "EHBO-set", categorie: "Hygiëne & medicatie" } },
  { id: "hygiene", groep: "Gezondheid", naam: "Tandenborstel, tandpasta en handgel", zoek: ["tandenborstel", "tandpasta", "handgel", "zeep"],
    nieuw: { naam: "Tandpasta", categorie: "Hygiëne & medicatie" } },
  { id: "zaklamp", groep: "Licht en stroom", naam: "Zaklamp en reservebatterijen", ess: true, zoek: ["zaklamp", "hoofdlamp"],
    nieuw: { naam: "Zaklamp", categorie: "Licht & vuur" } },
  { id: "radio", groep: "Licht en stroom", naam: "Kleine radio op batterijen", ess: true, zoek: ["radio"],
    nieuw: { naam: "Radio op batterijen", categorie: "Gereedschap" } },
  { id: "powerbank", groep: "Licht en stroom", naam: "Powerbank en telefoonkabel", zoek: ["powerbank", "oplader", "kabel"],
    nieuw: { naam: "Powerbank", categorie: "Gereedschap" } },
  { id: "documenten", groep: "Papieren en geld", naam: "Kopieën van paspoort en verzekeringen", ess: true, soortCat: "Documenten",
    zoek: ["kopie", "paspoort", "document"], nieuw: { naam: "Kopie paspoort", categorie: "Documenten" } },
  { id: "geld", groep: "Papieren en geld", naam: "Contant geld", zoek: ["contant", "geld", "cash"], nieuw: { naam: "Contant geld", categorie: "Documenten" } },
  { id: "nummers", groep: "Papieren en geld", naam: "Gezinsplan met telefoonnummers", soort: "plan", nieuw: null },
  { id: "nooddeken", groep: "Warm en droog", naam: "Nooddeken", zoek: ["nooddeken", "isolatiedeken", "deken"],
    nieuw: { naam: "Nooddeken", categorie: "Overig" } },
  { id: "poncho", groep: "Warm en droog", naam: "Regenponcho", zoek: ["poncho", "regenjas"], nieuw: { naam: "Regenponcho", categorie: "Overig" } },
  { id: "kleding", groep: "Warm en droog", naam: "Set warme kleding en sokken", zoek: ["kleding", "sokken", "muts"],
    nieuw: { naam: "Warme kleding", categorie: "Overig" } },
  { id: "fluit", groep: "Gereedschap", naam: "Fluitje", zoek: ["fluit"], nieuw: { naam: "Fluit", categorie: "Gereedschap" } },
  { id: "multitool", groep: "Gereedschap", naam: "Multitool of zakmes", zoek: ["multitool", "leatherman", "zakmes"],
    nieuw: { naam: "Multitool", categorie: "Gereedschap" } },
  { id: "mondkapje", groep: "Gereedschap", naam: "Mondkapjes", zoek: ["mondkapje"], nieuw: { naam: "Mondkapje", categorie: "Hygiëne & medicatie" } },
];

const AUTO = [
  { id: "driehoek", groep: "Veiligheid", naam: "Gevarendriehoek en veiligheidshesjes", ess: true, zoek: ["driehoek", "hesje", "vest"],
    nieuw: { naam: "Gevarendriehoek", categorie: "Gereedschap" } },
  { id: "ehbo", groep: "Veiligheid", naam: "EHBO-set", ess: true, zoek: ["ehbo", "verbandtrommel"], nieuw: { naam: "EHBO-set", categorie: "Hygiëne & medicatie" } },
  { id: "zaklamp", groep: "Veiligheid", naam: "Zaklamp", ess: true, zoek: ["zaklamp", "hoofdlamp"], nieuw: { naam: "Zaklamp", categorie: "Licht & vuur" } },
  { id: "nooddeken", groep: "Warm blijven", naam: "Nooddekens", ess: true, uitleg: (c) => `Eén per persoon: ${c.P}`,
    zoek: ["nooddeken", "isolatiedeken"], nieuw: { naam: "Nooddeken", categorie: "Overig" } },
  { id: "deken", groep: "Warm blijven", naam: "Warme deken", zoek: ["deken", "plaid"], nieuw: { naam: "Deken", categorie: "Overig" } },
  { id: "water", groep: "Eten en drinken", naam: "Water", soort: "water", dagen: 1, nodig: (c) => 1.5 * c.P,
    uitleg: () => "1,5 liter per persoon, vervang het elk jaar", nieuw: { naam: "Water (fles)", categorie: "Water", inhoud: "1,5L" } },
  { id: "eten", groep: "Eten en drinken", naam: "Energierepen", soort: "eten", dagen: 1, nieuw: { naam: "Energierepen", categorie: "Eten" } },
  { id: "lader", groep: "Onderweg", naam: "Autolader of powerbank voor je telefoon", zoek: ["lader", "powerbank", "kabel"],
    nieuw: { naam: "Autolader", categorie: "Gereedschap" } },
  { id: "startkabels", groep: "Onderweg", naam: "Startkabels", zoek: ["startkabel"], nieuw: { naam: "Startkabels", categorie: "Gereedschap" } },
  { id: "krabber", groep: "Onderweg", naam: "IJskrabber en handschoenen", zoek: ["krabber", "handschoen"], nieuw: { naam: "IJskrabber", categorie: "Gereedschap" } },
  { id: "kaart", groep: "Onderweg", naam: "Papieren wegenkaart", zoek: ["kaart", "atlas"], nieuw: { naam: "Wegenkaart", categorie: "Documenten" } },
  { id: "geld", groep: "Onderweg", naam: "Wat contant geld", zoek: ["contant", "geld"], nieuw: { naam: "Contant geld", categorie: "Documenten" } },
];

const LIJSTEN = { thuis: THUIS, tas: TAS, auto: AUTO };

// Liters uit een inhoud als "1,5L", "500 ml" of "33cl".
export function liters(inhoud) {
  const m = String(inhoud || "").replace(",", ".").match(/(\d+(?:\.\d+)?)\s*(ml|cl|l)\b/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  return { ml: n / 1000, cl: n / 100, l: n }[m[2].toLowerCase()];
}

export const plekVan = (item) => item.plek || "thuis";

// Bruikbare voorraad in een pakket: niet op de boodschappenlijst, niet verlopen.
function bruikbaar(items, kit, dagen) {
  return items.filter((i) => plekVan(i) === kit && !i.teKopen && i.aantal > 0 && status(i, dagen) !== "bad");
}

function context(huis, niveau, regel) {
  const V = Math.max(1, +huis.volwassenen || 1);
  const K = Math.max(0, +huis.kinderen || 0);
  const H = Math.max(0, +huis.huisdieren || 0);
  const dagen = regel?.dagen ?? NIVEAUS[niveau]?.dagen ?? 3;
  return { V, K, H, P: V + K, dagen, niveau };
}

// Alle regels voor een pakket en niveau, met of ze klaar zijn en waarom.
export function checklist({ kit, niveau = 0, items, huis, afgevinkt = {}, plan = {}, waarschuwDagen = 21 }) {
  const voorraad = bruikbaar(items, kit, waarschuwDagen);
  const lvl = kit === "thuis" ? niveau : 0;
  const regels = [];
  for (const r of LIJSTEN[kit] || []) {
    if ((r.vanaf || 0) > lvl) continue;
    const c = context(huis, lvl, r);
    if (r.als && !r.als(c)) continue;
    const ess = typeof r.ess === "function" ? r.ess(c) : !!r.ess;
    let auto = false;
    let bron = "";
    let voortgang = null;

    if (r.soort === "water") {
      const nodig = r.nodig(c);
      const heb = voorraad.filter((i) => i.categorie === "Water").reduce((s, i) => s + i.aantal * liters(i.inhoud), 0);
      auto = heb >= nodig - 0.01;
      voortgang = Math.min(1, heb / nodig);
      bron = `${nl(heb)} van ${nl(nodig)} liter`;
    } else if (r.soort === "eten") {
      const nodig = c.P * c.dagen;
      const heb = voorraad.filter((i) => i.categorie === "Eten").reduce((s, i) => s + i.aantal, 0);
      auto = heb >= nodig;
      voortgang = Math.min(1, heb / nodig);
      bron = `${heb} van ongeveer ${nodig} verpakkingen`;
    } else if (r.soort === "plan") {
      auto = !!(plan.contacten || "").trim();
      bron = auto ? "Staat in je gezinsplan" : "";
    } else {
      const gevonden = voorraad.find(
        (i) => (r.zoek || []).some((w) => i.naam.toLowerCase().includes(w)) || (r.soortCat && i.categorie === r.soortCat)
      );
      if (gevonden) { auto = true; bron = `In voorraad: ${gevonden.naam}`; }
    }

    const handmatig = !!afgevinkt[`${kit}:${r.id}`];
    regels.push({
      id: r.id, groep: r.groep, naam: r.naam, ess,
      uitleg: r.uitleg ? r.uitleg(c) : "",
      auto, handmatig, klaar: auto || handmatig, bron, voortgang, nieuw: r.nieuw,
    });
  }
  return regels;
}

// Score: essentiële spullen tellen dubbel.
export function score(regels) {
  let tot = 0, heb = 0;
  for (const r of regels) {
    const w = r.ess ? 2 : 1;
    tot += w;
    if (r.klaar) heb += w;
  }
  return tot ? Math.round((heb / tot) * 100) : 0;
}

// Volgende stappen: eerst wat essentieel is, dan de rest in lijstvolgorde.
export function volgendeStappen(regels, n = 3) {
  const open = regels.filter((r) => !r.klaar);
  return [...open.filter((r) => r.ess), ...open.filter((r) => !r.ess)].slice(0, n);
}
