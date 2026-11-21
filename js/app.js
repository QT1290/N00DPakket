import { dagenTot, status, STANDAARD_DAGEN } from "./datum.js";
import { versleutel } from "./kluis.js";
import { KITS, NIVEAUS, CATEGORIEEN, checklist, score, volgendeStappen, plekVan } from "./klaar.js";
import { BLADEN, ICONEN, KOELKAST_UUR, VRIEZER_UUR } from "./gids.js";

/* ---------- Opslag (alleen op dit apparaat) ---------- */

const OPSLAG = "noodpakket.v1";
const SYNC = "noodpakket.sync";
const HINT = "noodpakket.hint-weg";
const UI = "noodpakket.ui";
const STROOM = "noodpakket.stroom";
const SYNC_PAD = "data/voorraad.enc.json";

function lees(sleutel, standaard) {
  try {
    const t = localStorage.getItem(sleutel);
    return t ? JSON.parse(t) : standaard;
  } catch {
    return standaard;
  }
}
function schrijf(sleutel, waarde) {
  try {
    localStorage.setItem(sleutel, JSON.stringify(waarde));
    return true;
  } catch {
    toast("Opslaan op dit apparaat lukte niet. Maak een back-up.");
    return false;
  }
}

const leegHuis = () => ({ volwassenen: 1, kinderen: 0, huisdieren: 0 });
function vulAan(s) {
  s.items ||= [];
  s.instellingen ||= { dagen: STANDAARD_DAGEN };
  s.huishouden ||= leegHuis();
  s.afgevinkt ||= {};
  s.plan ||= {};
  return s;
}

let staat = vulAan(lees(OPSLAG, null) || {});
let sync = lees(SYNC, { aan: false, repo: "", token: "", wachtwoord: "" });
// Wat je laatst bekeek: pakket, niveau en tabblad. Alleen voor het gemak.
const ui = Object.assign({ kit: "thuis", niveau: 0, tab: "voorraad", alleenOpen: false }, lees(UI, {}));
if (!KITS.some((k) => k.id === ui.kit)) ui.kit = "thuis";
const bewaarUi = () => { try { localStorage.setItem(UI, JSON.stringify(ui)); } catch {} };
let stroom = lees(STROOM, null);

const filter = { categorie: "Alles", status: null, zoek: "" };
const kitItems = () => staat.items.filter((i) => plekVan(i) === ui.kit);
const kitNaam = (id = ui.kit) => KITS.find((k) => k.id === id).naam;

function bewaar({ synchroniseer = true } = {}) {
  schrijf(OPSLAG, staat);
  render();
  if (synchroniseer) planSync();
}

function nieuwId() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/* ---------- Hulpjes ---------- */

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dagen = () => Number(staat.instellingen.dagen) || STANDAARD_DAGEN;

const datumFmt = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" });
function mooieDatum(iso) {
  const [j, m, d] = iso.split("-").map(Number);
  return datumFmt.format(new Date(j, m - 1, d));
}

function teller(item) {
  const n = dagenTot(item.houdbaar);
  if (n === null) return { n: "—", l: "geen datum" };
  if (n < 0) {
    const a = -n;
    return a > 60 ? { n: Math.round(a / 30.4), l: "mnd verlopen" } : { n: a, l: a === 1 ? "dag verlopen" : "dgn verlopen" };
  }
  if (n === 0) return { n: "0", l: "vandaag" };
  if (n > 99) return { n: Math.round(n / 30.4), l: "maanden" };
  return { n, l: n === 1 ? "dag" : "dagen" };
}

let toastTimer;
function toast(tekst, actie) {
  const el = $("#toast");
  el.innerHTML = `<span>${esc(tekst)}</span>`;
  if (actie) {
    const b = document.createElement("button");
    b.textContent = actie.label;
    b.onclick = () => { actie.doe(); el.classList.remove("toon"); };
    el.append(b);
  }
  el.classList.add("toon");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("toon"), actie ? 6000 : 3000);
}

/* ---------- Weergave ---------- */

const ICOON = {
  vervang: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M3 21v-5h5"/></svg>',
  op: '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
  bewerk: '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  kar: '<svg viewBox="0 0 24 24"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/></svg>',
};

function renderStatus() {
  const d = dagen();
  const telling = { bad: 0, warn: 0, ok: 0 };
  const items = kitItems();
  for (const it of items) if (!it.teKopen) telling[status(it, d)] = (telling[status(it, d)] || 0) + 1;
  const kopen = items.filter((i) => i.teKopen).length;

  let msg;
  if (!items.length) msg = ui.kit === "thuis" ? "Nog niets in je noodpakket." : `Nog niets in je ${kitNaam().toLowerCase()}.`;
  else if (telling.bad && telling.warn) msg = `<strong>${telling.bad}</strong> verlopen en <strong>${telling.warn}</strong> binnenkort over datum.`;
  else if (telling.bad) msg = `<strong>${telling.bad}</strong> ${telling.bad === 1 ? "item is" : "items zijn"} verlopen. Tijd om te vervangen.`;
  else if (telling.warn) msg = `<strong>${telling.warn}</strong> ${telling.warn === 1 ? "item verloopt" : "items verlopen"} binnen ${d} dagen.`;
  else msg = "Alles is in orde. Goed bezig!";
  if (kopen) msg += ` ${kopen} op je boodschappenlijst.`;

  const stat = (s, n, l) =>
    `<button class="stat ${s}" data-status="${s}" aria-pressed="${filter.status === s}"><span class="n">${n}</span><span class="l">${l}</span></button>`;
  $("#status").innerHTML = `
    <p class="status-msg">${msg}</p>
    <div class="status-grid">
      ${stat("bad", telling.bad, "Verlopen")}
      ${stat("warn", telling.warn, "Binnenkort")}
      ${stat("ok", telling.ok, "In orde")}
    </div>`;
}

function renderChips() {
  const alle = kitItems();
  const aanwezig = CATEGORIEEN.filter((c) => alle.some((i) => i.categorie === c));
  const extra = [...new Set(alle.map((i) => i.categorie))].filter((c) => c && !CATEGORIEEN.includes(c));
  const lijst = ["Alles", ...aanwezig, ...extra];
  if (!lijst.includes(filter.categorie)) filter.categorie = "Alles";
  $("#chips").innerHTML = lijst
    .map((c) => {
      const n = c === "Alles" ? alle.length : alle.filter((i) => i.categorie === c).length;
      return `<button class="chip" role="tab" data-cat="${esc(c)}" aria-selected="${filter.categorie === c}">${esc(c)}<span class="c">${n}</span></button>`;
    })
    .join("");
}

function itemHtml(it) {
  const s = it.teKopen ? "none" : status(it, dagen());
  const t = teller(it);
  const meta = [
    `<span>${esc(it.categorie)}</span>`,
    it.inhoud ? `<span class="tag">${esc(it.inhoud)}</span>` : "",
    it.houdbaar ? `<span>tht ${mooieDatum(it.houdbaar)}</span>` : "",
  ].join("");

  const acties = it.teKopen
    ? `<button class="mini" data-actie="gekocht">${ICOON.kar} Gekocht</button>
`
    : `<span class="qty" aria-label="Aantal">
         <button data-actie="min" aria-label="Eén minder">−</button>
         <span>${it.aantal}×</span>
         <button data-actie="plus" aria-label="Eén meer">+</button>
       </span>
       ${s === "bad" || s === "warn" ? `<button class="mini strong" data-actie="vervang">${ICOON.vervang} Vervangen</button>` : ""}
       <button class="mini" data-actie="op">${ICOON.op} Opgebruikt</button>`;

  return `
    <article class="item s-${s}${it.teKopen ? " kopen" : ""}" data-id="${esc(it.id)}">
      <h3 class="item-naam"><button class="naam-btn" data-actie="bewerk" title="Bewerken">${esc(it.naam)} ${ICOON.bewerk}</button></h3>
      ${it.teKopen ? `<div class="teller"><span class="n">${ICOON.kar.replace("<svg", '<svg width="22" height="22"')}</span><span class="l">kopen</span></div>`
                   : `<div class="teller"><span class="n">${t.n}</span><span class="l">${t.l}</span></div>`}
      <div class="item-meta">${meta}</div>
      ${it.notitie ? `<p class="item-note">${esc(it.notitie)}</p>` : ""}
      <div class="item-acties">${acties}</div>
    </article>`;
}

function renderLijst() {
  const d = dagen();
  const zoek = filter.zoek.trim().toLowerCase();
  const alle = kitItems();
  let items = alle.filter(
    (i) =>
      (filter.categorie === "Alles" || i.categorie === filter.categorie) &&
      (!zoek || `${i.naam} ${i.notitie || ""} ${i.categorie}`.toLowerCase().includes(zoek)) &&
      (!filter.status || (!i.teKopen && status(i, d) === filter.status))
  );

  items.sort((a, b) => {
    if (!a.houdbaar && !b.houdbaar) return a.naam.localeCompare(b.naam, "nl");
    if (!a.houdbaar) return 1;
    if (!b.houdbaar) return -1;
    return a.houdbaar.localeCompare(b.houdbaar);
  });

  const groepen = [
    ["Verlopen", (i) => !i.teKopen && status(i, d) === "bad"],
    [`Binnen ${d} dagen`, (i) => !i.teKopen && status(i, d) === "warn"],
    ["In orde", (i) => !i.teKopen && status(i, d) === "ok"],
    ["Zonder houdbaarheidsdatum", (i) => !i.teKopen && status(i, d) === "none"],
    ["Nog kopen", (i) => i.teKopen],
  ];

  const leeg = alle.length === 0;
  $("#leeg").hidden = !leeg;
  if (leeg) {
    const thuisLeeg = ui.kit === "thuis" && !staat.items.length;
    $("#leeg-titel").textContent = ui.kit === "thuis" ? "Je noodpakket is nog leeg" : `Je ${kitNaam().toLowerCase()} is nog leeg`;
    $("#leeg-tekst").textContent = thuisLeeg
      ? "Voeg je eerste item toe, of zet een back-up terug via de instellingen."
      : `Voeg toe wat in je ${kitNaam().toLowerCase()} zit. Kijk bij Klaar? wat erin hoort.`;
    $("#leeg-import").hidden = !thuisLeeg;
  }
  if (leeg) { $("#lijst").innerHTML = ""; return; }

  let html = "";
  for (const [titel, past] of groepen) {
    const g = items.filter(past);
    if (!g.length) continue;
    html += `<div class="groep"><h2>${titel}</h2><span class="lijn"></span></div>${g.map(itemHtml).join("")}`;
  }
  $("#lijst").innerHTML = html || `<p class="geen-resultaat">Niets gevonden.</p>`;
}

function renderKitSwitch() {
  const html = KITS.map(
    (k) => `<button role="tab" data-kit="${k.id}" aria-selected="${ui.kit === k.id}">${KIT_ICOON[k.id]}<span>${esc(k.kort)}</span></button>`
  ).join("");
  for (const el of document.querySelectorAll(".kit-switch")) el.innerHTML = html;
}

function render() {
  renderKitSwitch();
  renderStatus();
  renderChips();
  renderLijst();
  renderKlaar();
  $("#naam-suggesties").innerHTML = [...new Set(staat.items.map((i) => i.naam))].map((n) => `<option value="${esc(n)}">`).join("");
}

/* ---------- Item formulier ---------- */

const dlgItem = $("#dlg-item");
const formItem = $("#form-item");
let bewerkId = null;

formItem.elements.categorie.innerHTML = CATEGORIEEN.map((c) => `<option>${esc(c)}</option>`).join("");
formItem.elements.plek.innerHTML = KITS.map((k) => `<option value="${k.id}">${esc(k.naam)}</option>`).join("");

function openItem(item = null, opties = {}) {
  bewerkId = item?.id ?? null;
  const f = formItem.elements;
  $("#item-titel").textContent = item ? (opties.titel || "Item bewerken") : opties.titel || "Item toevoegen";
  f.naam.value = item?.naam ?? opties.naam ?? "";
  if (item?.categorie && ![...f.categorie.options].some((o) => o.value === item.categorie)) {
    f.categorie.add(new Option(item.categorie));
  }
  if (!item && opties.categorie) f.categorie.value = opties.categorie;
  else f.categorie.value = item?.categorie ?? (filter.categorie !== "Alles" ? filter.categorie : "Eten");
  f.plek.value = item ? plekVan(item) : opties.plek || ui.kit;
  f.aantal.value = item?.aantal ?? 1;
  f.inhoud.value = item?.inhoud ?? opties.inhoud ?? "";
  f.houdbaar.value = opties.leegDatum ? "" : item?.houdbaar ?? "";
  f.notitie.value = item?.notitie ?? "";
  f.teKopen.checked = opties.gekocht ? false : !!item?.teKopen;
  $("#btn-verwijder").hidden = !item;
  dlgItem.showModal();
  if (!item && !f.naam.value) f.naam.focus();
  else if (opties.leegDatum) f.houdbaar.focus();
}

formItem.addEventListener("submit", (e) => {
  e.preventDefault();
  const f = formItem.elements;
  const data = {
    naam: f.naam.value.trim(),
    categorie: f.categorie.value,
    plek: f.plek.value,
    aantal: Math.max(0, parseInt(f.aantal.value, 10) || 0),
    inhoud: f.inhoud.value.trim(),
    houdbaar: f.houdbaar.value || null,
    notitie: f.notitie.value.trim(),
    teKopen: f.teKopen.checked,
  };
  if (!data.naam) return;
  if (bewerkId) {
    Object.assign(staat.items.find((i) => i.id === bewerkId), data);
    toast("Opgeslagen");
  } else {
    staat.items.push({ id: nieuwId(), toegevoegd: new Date().toISOString().slice(0, 10), ...data });
    toast(data.plek === ui.kit ? `${data.naam} toegevoegd` : `${data.naam} toegevoegd aan ${kitNaam(data.plek).toLowerCase()}`);
  }
  dlgItem.close();
  bewaar();
});

formItem.addEventListener("click", (e) => {
  const stap = e.target.closest("[data-stap]");
  if (stap) {
    const inp = formItem.elements.aantal;
    inp.value = Math.max(0, (parseInt(inp.value, 10) || 0) + Number(stap.dataset.stap));
  }
});

$("#btn-verwijder").addEventListener("click", () => {
  const id = bewerkId;
  dlgItem.close();
  verwijder(id);
});

function verwijder(id) {
  const idx = staat.items.findIndex((i) => i.id === id);
  if (idx < 0) return;
  const [weg] = staat.items.splice(idx, 1);
  bewaar();
  toast(`${weg.naam} verwijderd`, {
    label: "Ongedaan maken",
    doe: () => { staat.items.splice(idx, 0, weg); bewaar(); },
  });
}

/* ---------- Vervangen ---------- */

const dlgVervang = $("#dlg-vervang");
const formVervang = $("#form-vervang");
let vervangId = null;

function openVervang(item) {
  vervangId = item.id;
  $("#vervang-tekst").textContent = `Nieuwe ${item.naam} gekocht? Vul de datum van de nieuwe verpakking in.`;
  formVervang.elements.houdbaar.value = "";
  dlgVervang.showModal();
  formVervang.elements.houdbaar.focus();
}

formVervang.addEventListener("submit", (e) => {
  e.preventDefault();
  const it = staat.items.find((i) => i.id === vervangId);
  if (!it) return dlgVervang.close();
  it.houdbaar = formVervang.elements.houdbaar.value;
  dlgVervang.close();
  bewaar();
  toast(`${it.naam} vervangen`);
});

/* ---------- Lijst-interactie ---------- */

$("#lijst").addEventListener("click", (e) => {
  const knop = e.target.closest("[data-actie]");
  const kaart = e.target.closest(".item");
  if (!kaart) return;
  const it = staat.items.find((i) => i.id === kaart.dataset.id);
  if (!it) return;
  if (!knop) {
    if (e.target.closest(".item-naam")) openItem(it);
    return;
  }
  switch (knop.dataset.actie) {
    case "plus": it.aantal++; bewaar(); break;
    case "min":
      if (it.aantal <= 1) verwijder(it.id);
      else { it.aantal--; bewaar(); }
      break;
    case "vervang": openVervang(it); break;
    case "op": verwijder(it.id); break;
    case "bewerk": openItem(it); break;
    case "gekocht": openItem(it, { gekocht: true, leegDatum: true, titel: "Gekocht: datum invullen" }); break;
  }
});

$("#status").addEventListener("click", (e) => {
  const b = e.target.closest("[data-status]");
  if (!b) return;
  filter.status = filter.status === b.dataset.status ? null : b.dataset.status;
  render();
});

$("#chips").addEventListener("click", (e) => {
  const b = e.target.closest("[data-cat]");
  if (!b) return;
  filter.categorie = b.dataset.cat;
  render();
});

$("#zoek").addEventListener("input", (e) => { filter.zoek = e.target.value; renderLijst(); });
$("#btn-nieuw").addEventListener("click", () => openItem());
$("#leeg").addEventListener("click", (e) => {
  const a = e.target.closest("[data-actie]")?.dataset.actie;
  if (a === "nieuw") openItem();
  if (a === "importeer") $("#import-bestand").click();
});

// Sluitknoppen en klikken buiten een dialoog
for (const dlg of document.querySelectorAll("dialog")) {
  dlg.addEventListener("click", (e) => {
    if (e.target.closest("[data-sluit]") || e.target === dlg) dlg.close();
  });
}

/* ---------- Instellingen, back-up ---------- */

const dlgSet = $("#dlg-instellingen");

$("#btn-instellingen").addEventListener("click", () => {
  $("#set-dagen").value = dagen();
  $("#sync-aan").checked = sync.aan;
  $("#sync-repo").value = sync.repo || raadRepo();
  $("#sync-token").value = sync.token || "";
  $("#sync-wachtwoord").value = sync.wachtwoord || "";
  $("#sync-velden").dataset.uit = String(!sync.aan);
  $("#set-huis-tekst").textContent = huisTekst();
  toonSyncStatus();
  dlgSet.showModal();
});

$("#set-dagen").addEventListener("change", (e) => {
  const n = parseInt(e.target.value, 10);
  if (n >= 1 && n <= 365) { staat.instellingen.dagen = n; bewaar(); }
});

$("#btn-export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({ app: "noodpakket", versie: 1, ...staat }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `noodpakket-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
});

$("#btn-import").addEventListener("click", () => $("#import-bestand").click());

$("#import-bestand").addEventListener("change", async (e) => {
  const bestand = e.target.files[0];
  e.target.value = "";
  if (!bestand) return;
  try {
    const data = JSON.parse(await bestand.text());
    if (!Array.isArray(data.items)) throw new Error("geen items");
    const items = data.items
      .filter((i) => i && i.naam)
      .map((i) => ({
        id: i.id || nieuwId(),
        naam: String(i.naam),
        categorie: i.categorie || "Overig",
        ...(KITS.some((k) => k.id === i.plek) ? { plek: i.plek } : {}),
        aantal: Number.isFinite(+i.aantal) ? +i.aantal : 1,
        inhoud: i.inhoud || "",
        houdbaar: /^\d{4}-\d{2}-\d{2}$/.test(i.houdbaar || "") ? i.houdbaar : null,
        notitie: i.notitie || "",
        teKopen: !!i.teKopen,
        toegevoegd: i.toegevoegd || new Date().toISOString().slice(0, 10),
      }));
    if (staat.items.length && !confirm(`Je huidige lijst (${staat.items.length} items) vervangen door de back-up (${items.length} items)?`)) return;
    staat.items = items;
    if (data.instellingen?.dagen) staat.instellingen.dagen = data.instellingen.dagen;
    if (data.huishouden) staat.huishouden = { ...leegHuis(), ...data.huishouden };
    if (data.afgevinkt && typeof data.afgevinkt === "object") staat.afgevinkt = data.afgevinkt;
    if (data.plan && typeof data.plan === "object") { staat.plan = data.plan; vulPlan(); }
    bewaar();
    dlgSet.close();
    toast(`${items.length} items teruggezet`);
  } catch {
    toast("Dit bestand is geen geldige back-up.");
  }
});

$("#btn-wis").addEventListener("click", () => {
  if (!confirm("Weet je het zeker? Alle items en instellingen op dit apparaat worden gewist.")) return;
  staat = vulAan({});
  stroom = null;
  try { localStorage.removeItem(STROOM); } catch {}
  vulPlan();
  sync = { aan: false, repo: "", token: "", wachtwoord: "" };
  try { localStorage.removeItem(SYNC); } catch {}
  bewaar({ synchroniseer: false });
  dlgSet.close();
  toast("Alles gewist");
});

/* ---------- E-mailherinneringen: versleutelde kopie naar GitHub ---------- */

function raadRepo() {
  const m = location.hostname.match(/^([^.]+)\.github\.io$/i);
  const pad = location.pathname.split("/").filter(Boolean)[0];
  return m && pad ? `${m[1]}/${pad}` : "";
}

function toonSyncStatus() {
  const el = $("#sync-status");
  if (!sync.aan) el.textContent = "";
  else if (sync.fout) el.textContent = `Laatste poging mislukt: ${sync.fout}`;
  else if (sync.laatste) el.textContent = `Laatst verstuurd: ${new Date(sync.laatste).toLocaleString("nl-NL")}`;
  else el.textContent = "Nog niet verstuurd.";
}

$("#sync-aan").addEventListener("change", (e) => {
  sync.aan = e.target.checked;
  $("#sync-velden").dataset.uit = String(!sync.aan);
  schrijf(SYNC, sync);
  toonSyncStatus();
});

$("#btn-sync").addEventListener("click", async () => {
  sync.repo = $("#sync-repo").value.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");
  sync.token = $("#sync-token").value.trim();
  sync.wachtwoord = $("#sync-wachtwoord").value;
  if (!/^[\w.-]+\/[\w.-]+$/.test(sync.repo)) return toast("Vul de repository in als gebruikersnaam/repo.");
  if (!sync.token) return toast("Vul je GitHub-token in.");
  if (sync.wachtwoord.length < 10) return toast("Kies een wachtwoord van minstens 10 tekens.");
  schrijf(SYNC, sync);
  const knop = $("#btn-sync");
  knop.disabled = true;
  knop.textContent = "Bezig…";
  const ok = await verstuur();
  knop.disabled = false;
  knop.textContent = "Opslaan en nu versturen";
  toast(ok ? "Versleutelde kopie verstuurd" : "Versturen mislukt, zie instellingen");
});

let syncTimer;
function planSync() {
  if (!sync.aan || !sync.token || !sync.wachtwoord) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(verstuur, 2500);
}

async function verstuur() {
  const api = `https://api.github.com/repos/${sync.repo}/contents/${SYNC_PAD}`;
  const kop = {
    Authorization: `Bearer ${sync.token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  try {
    const pakket = await versleutel(
      { items: staat.items.map(({ id, naam, houdbaar, teKopen }) => ({ id, naam, houdbaar, teKopen })), dagen: dagen() },
      sync.wachtwoord
    );
    const inhoud = btoa(JSON.stringify(pakket, null, 2) + "\n");

    let sha;
    const huidig = await fetch(`${api}?t=${Date.now()}`, { headers: kop, cache: "no-store" });
    if (huidig.ok) sha = (await huidig.json()).sha;
    else if (huidig.status !== 404) throw new Error(await foutTekst(huidig));

    const res = await fetch(api, {
      method: "PUT",
      headers: kop,
      body: JSON.stringify({ message: "Versleutelde voorraad bijgewerkt", content: inhoud, sha }),
    });
    if (!res.ok) throw new Error(await foutTekst(res));
    sync.laatste = Date.now();
    delete sync.fout;
    schrijf(SYNC, sync);
    toonSyncStatus();
    return true;
  } catch (err) {
    sync.fout = err.message || "onbekende fout";
    schrijf(SYNC, sync);
    toonSyncStatus();
    return false;
  }
}

async function foutTekst(res) {
  if (res.status === 401) return "token ongeldig of verlopen";
  if (res.status === 403) return "token heeft geen schrijfrechten op deze repository";
  if (res.status === 404) return "repository niet gevonden (of token heeft er geen toegang toe)";
  try { return (await res.json()).message || `fout ${res.status}`; } catch { return `fout ${res.status}`; }
}

/* ---------- Pakketten: thuis, vluchttas, auto ---------- */

const KIT_ICOON = {
  thuis: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z"/></svg>',
  tas: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1Z"/><path d="M9 5V3h6v2M9 13h6"/></svg>',
  auto: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17H3v-5l2-5h14l2 5v5h-2"/><path d="M3 12h18"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/></svg>',
};

document.addEventListener("click", (e) => {
  const b = e.target.closest(".kit-switch [data-kit]");
  if (!b) return;
  ui.kit = b.dataset.kit;
  filter.categorie = "Alles";
  filter.status = null;
  bewaarUi();
  render();
});

/* ---------- Klaar? Checklist, score en volgende stappen ---------- */

const huis = () => staat.huishouden;
function huisTekst() {
  const h = huis();
  const delen = [`${h.volwassenen} ${h.volwassenen == 1 ? "volwassene" : "volwassenen"}`];
  if (+h.kinderen) delen.push(`${h.kinderen} ${h.kinderen == 1 ? "kind" : "kinderen"}`);
  if (+h.huisdieren) delen.push(`${h.huisdieren} ${h.huisdieren == 1 ? "huisdier" : "huisdieren"}`);
  return delen.join(", ");
}
const personen = () => (+huis().volwassenen || 1) + (+huis().kinderen || 0);

function regelsVoor(kit = ui.kit, niveau = ui.niveau) {
  return checklist({ kit, niveau, items: staat.items, huis: huis(), afgevinkt: staat.afgevinkt, plan: staat.plan, waarschuwDagen: dagen() });
}

const V = { klaar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>' };

function ring(pct) {
  const r = 26, omtrek = 2 * Math.PI * r;
  return `<svg class="ring" viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="32" r="${r}" class="ring-bg"/>
    <circle cx="32" cy="32" r="${r}" class="ring-fg" stroke-dasharray="${omtrek}" stroke-dashoffset="${omtrek * (1 - pct / 100)}"/>
  </svg><span class="ring-n">${pct}%</span>`;
}

function renderKlaar() {
  const kit = ui.kit;
  const thuis = kit === "thuis";

  // Niveaukaarten (alleen thuis)
  $("#niveaus").hidden = !thuis;
  if (thuis) {
    $("#niveaus").innerHTML = NIVEAUS.map((n, i) => {
      const p = score(regelsVoor("thuis", i));
      return `<button role="tab" class="niveau" data-niveau="${i}" aria-selected="${ui.niveau === i}">
        <span class="niveau-naam">${n.naam}</span>
        <span class="niveau-pct">${p}%${p === 100 ? V.klaar : ""}</span>
        <span class="balk"><span style="width:${p}%"></span></span>
      </button>`;
    }).join("");
  }

  const regels = regelsVoor();
  const pct = score(regels);
  const klaar = regels.filter((r) => r.klaar).length;
  const essOpen = regels.filter((r) => r.ess && !r.klaar).length;
  const titel = thuis ? NIVEAUS[ui.niveau].titel : kit === "tas" ? "Je vluchttas" : "Je noodkit voor de auto";

  $("#score").innerHTML = `
    <div class="score-tekst">
      <p class="overline">Hoe klaar ben je</p>
      <h2>${esc(titel)}</h2>
      <p><button class="link-btn inline" id="btn-huis">${esc(personen() === 1 ? "1 persoon" : `${personen()} personen`)}${+huis().huisdieren ? ` + ${huis().huisdieren} ${huis().huisdieren == 1 ? "dier" : "dieren"}` : ""}</button>
         <span class="muted"> · ${klaar} van ${regels.length} onderdelen</span></p>
      <p class="score-sub">${essOpen ? `${essOpen} ${essOpen === 1 ? "essentieel onderdeel ontbreekt" : "essentiële onderdelen ontbreken"} nog` : "Alle essentiële spullen zijn er"}</p>
    </div>
    <div class="score-ring" title="Essentiële spullen tellen dubbel mee">${ring(pct)}<span class="ring-l">score</span></div>`;

  // Volgende stappen
  const stappen = volgendeStappen(regels);
  const open = regels.length - klaar;
  $("#stappen").hidden = !stappen.length;
  $("#stappen").innerHTML = stappen.length ? `
    <div class="kaart-kop"><h3>Volgende stappen</h3><span class="muted">${stappen.length} ${stappen.length === 1 ? "suggestie" : "suggesties"}</span></div>
    <ol class="stappen">${stappen.map((r, i) => `
      <li><button class="stap" data-regel="${r.id}">
        <span class="stap-n">${i + 1}</span>
        <span class="stap-t"><span>${esc(r.naam)}</span>${r.ess ? `<small>Essentieel, telt dubbel in de score</small>` : r.uitleg ? `<small>${esc(r.uitleg)}</small>` : ""}</span>
        ${ICONEN.pijl}
      </button></li>`).join("")}
    </ol>
    ${open > stappen.length ? `<button class="link-btn" id="btn-alle-open">Bekijk alle ${open} ontbrekende onderdelen</button>` : ""}` : "";

  renderBinnenkort();
  renderChecklist(regels);
}

function renderBinnenkort() {
  const d = dagen();
  const met = kitItems().filter((i) => i.houdbaar && !i.teKopen).sort((a, b) => a.houdbaar.localeCompare(b.houdbaar));
  const el = $("#binnenkort");
  el.hidden = !met.length;
  if (!met.length) return (el.innerHTML = "");
  const urgent = met.filter((i) => status(i, d) !== "ok");
  const toon = urgent.length >= 3 ? urgent.slice(0, 5) : met.slice(0, Math.max(3, urgent.length));
  const maand = new Intl.DateTimeFormat("nl-NL", { month: "long", year: "numeric" });
  const regel = (i) => {
    const s = status(i, d);
    const [j, m] = i.houdbaar.split("-").map(Number);
    const wanneer = maand.format(new Date(j, m - 1, 1));
    const tekst = s === "bad" ? `Verlopen · ${wanneer} · vervang het` : s === "warn" ? `Verloopt binnenkort · ${mooieDatum(i.houdbaar)}` : `Goed tot ${wanneer}`;
    const ic = s === "bad" ? ICONEN.let_op : s === "warn" ? ICONEN.klok : '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';
    return `<li><button class="komt s-${s}" data-id="${esc(i.id)}">${ic}<span><span>${esc(i.naam)}${i.aantal > 1 ? ` <span class="muted">${i.aantal}×</span>` : ""}</span><small>${tekst}</small></span>${ICONEN.pijl}</button></li>`;
  };
  const rest = met.length - toon.length;
  el.innerHTML = `
    <div class="kaart-kop"><h3>Binnenkort</h3></div>
    <p class="muted kaart-sub">Vervang op tijd, dan gaat er niets verloren.</p>
    <ul class="komt-lijst">${toon.map(regel).join("")}</ul>
    ${rest > 0 ? `<button class="link-btn" data-naar="voorraad">+ nog ${rest} ${rest === 1 ? "datum" : "datums"} in je voorraad</button>` : ""}`;
}

function renderChecklist(regels) {
  const groepen = [...new Set(regels.map((r) => r.groep))];
  const open = regels.filter((r) => !r.klaar).length;
  let html = `
    <div class="kaart-kop checklist-kop"><h3>Checklist</h3><span class="muted">${open ? `${open} te gaan` : "Compleet!"}</span></div>
    <div class="chips" role="tablist">
      <button class="chip" role="tab" data-open="0" aria-selected="${!ui.alleenOpen}">Alles</button>
      <button class="chip" role="tab" data-open="1" aria-selected="${ui.alleenOpen}">Nog te doen</button>
    </div>`;
  for (const g of groepen) {
    const inGroep = regels.filter((r) => r.groep === g);
    const zichtbaar = ui.alleenOpen ? inGroep.filter((r) => !r.klaar) : inGroep;
    const p = score(inGroep);
    const nogOpen = inGroep.filter((r) => !r.klaar).length;
    html += `<section class="kaart cl-groep">
      <div class="cl-kop"><div><h4>${esc(g)}</h4><small class="muted">${nogOpen ? `${nogOpen} ${nogOpen === 1 ? "onderdeel" : "onderdelen"} te gaan` : "Compleet"}</small></div>
        <span class="cl-pct">${p === 100 ? V.klaar : `${p}%`}</span></div>
      <span class="balk"><span style="width:${p}%"></span></span>
      ${zichtbaar.length ? `<ul class="cl">${zichtbaar.map((r) => `
        <li class="${r.klaar ? "klaar" : ""}">
          <label class="cl-regel">
            <input type="checkbox" data-vink="${r.id}" ${r.klaar ? "checked" : ""} ${r.auto ? "disabled" : ""}>
            <span class="cl-t">
              <span>${esc(r.naam)}${r.ess ? ' <span class="ess" title="Essentieel: telt dubbel">essentieel</span>' : ""}</span>
              ${r.uitleg ? `<small>${esc(r.uitleg)}</small>` : ""}
              ${r.voortgang !== null && !r.auto ? `<span class="balk dun"><span style="width:${Math.round(r.voortgang * 100)}%"></span></span>` : ""}
              ${r.bron ? `<small class="${r.auto ? "bron-ok" : ""}">${esc(r.bron)}</small>` : ""}
            </span>
          </label>
          ${!r.auto && r.nieuw ? `<button class="mini" data-regel="${r.id}" aria-label="Toevoegen aan voorraad">+ Voorraad</button>` : ""}
        </li>`).join("")}</ul>` : ""}
    </section>`;
  }
  html += `<p class="muted voetnoot">Een vinkje dat je niet kunt uitzetten betekent dat de app het in je voorraad heeft gevonden. Verlopen spullen tellen niet mee. Essentiële spullen tellen dubbel in de score.</p>`;
  $("#checklist").innerHTML = html;
}

function regelActie(id) {
  const r = regelsVoor().find((x) => x.id === id);
  if (!r) return;
  if (!r.nieuw) return toonTab("plan");
  openItem(null, { titel: "Toevoegen aan voorraad", naam: r.nieuw.naam, categorie: r.nieuw.categorie, inhoud: r.nieuw.inhoud, plek: ui.kit });
}

$('[data-view="klaar"]').addEventListener("click", (e) => {
  const t = e.target;
  const niveau = t.closest("[data-niveau]");
  if (niveau) { ui.niveau = +niveau.dataset.niveau; bewaarUi(); return renderKlaar(); }
  const regel = t.closest("[data-regel]");
  if (regel) return regelActie(regel.dataset.regel);
  const komt = t.closest(".komt");
  if (komt) { const it = staat.items.find((i) => i.id === komt.dataset.id); if (it) openItem(it); return; }
  const o = t.closest("[data-open]");
  if (o) { ui.alleenOpen = o.dataset.open === "1"; bewaarUi(); return renderKlaar(); }
  if (t.closest("#btn-alle-open")) {
    ui.alleenOpen = true; bewaarUi(); renderKlaar();
    $("#checklist").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (t.closest("#btn-huis")) return openHuis();
  if (t.closest('[data-naar="voorraad"]')) return toonTab("voorraad");
});

$("#checklist").addEventListener("change", (e) => {
  const cb = e.target.closest("[data-vink]");
  if (!cb) return;
  const sleutel = `${ui.kit}:${cb.dataset.vink}`;
  if (cb.checked) staat.afgevinkt[sleutel] = true;
  else delete staat.afgevinkt[sleutel];
  bewaar({ synchroniseer: false });
});

/* ---------- Huishouden ---------- */

const dlgHuis = $("#dlg-huis");
const formHuis = $("#form-huis");
function openHuis() {
  for (const k of ["volwassenen", "kinderen", "huisdieren"]) formHuis.elements[k].value = huis()[k] ?? 0;
  dlgHuis.showModal();
}
formHuis.addEventListener("click", (e) => {
  const b = e.target.closest("[data-stap]");
  if (!b) return;
  const inp = formHuis.elements[b.dataset.voor];
  inp.value = Math.min(20, Math.max(+inp.min, (parseInt(inp.value, 10) || 0) + Number(b.dataset.stap)));
});
formHuis.addEventListener("submit", (e) => {
  e.preventDefault();
  const f = formHuis.elements;
  const getal = (n, min) => Math.min(20, Math.max(min, parseInt(f[n].value, 10) || 0));
  staat.huishouden = { volwassenen: getal("volwassenen", 1), kinderen: getal("kinderen", 0), huisdieren: getal("huisdieren", 0) };
  dlgHuis.close();
  $("#set-huis-tekst").textContent = huisTekst();
  bewaar({ synchroniseer: false });
});
$("#btn-set-huis").addEventListener("click", openHuis);

/* ---------- Stroomstoring: gids en koelkasttimer ---------- */

const tijdFmt = new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit" });
const dagTijdFmt = new Intl.DateTimeFormat("nl-NL", { weekday: "short", hour: "2-digit", minute: "2-digit" });
function tot(ms) {
  const d = new Date(ms);
  return new Date().toDateString() === d.toDateString() ? tijdFmt.format(d) : dagTijdFmt.format(d);
}
function bewaarStroom() {
  try { stroom ? localStorage.setItem(STROOM, JSON.stringify(stroom)) : localStorage.removeItem(STROOM); } catch {}
}

function aftelKaart(icoon, naam, uren, extra = "") {
  const eind = stroom.start + uren * 3600000;
  const over = eind - Date.now();
  const verstreken = Math.min(1, Math.max(0, 1 - over / (uren * 3600000)));
  const h = Math.floor(Math.max(0, over) / 3600000);
  const m = Math.floor((Math.max(0, over) % 3600000) / 60000);
  const voorbij = over <= 0;
  return `<div class="aftel${voorbij ? " voorbij" : ""}">
    <p class="aftel-kop">${icoon}<span>${naam}</span></p>
    ${voorbij
      ? `<p class="aftel-tijd klein">Langer dan ${uren} uur zonder stroom</p><p class="aftel-sub">Lees <button class="link-btn inline" data-blad="koelkast">Koelkast en vriezer</button> voor wat je weggooit.</p>`
      : `<p class="aftel-tijd">${h}<small>u</small> ${String(m).padStart(2, "0")}<small>min</small></p><p class="aftel-sub">Veilig tot ${tot(eind)}</p>`}
    <span class="balk"><span style="width:${Math.round(verstreken * 100)}%"></span></span>
    ${extra}
  </div>`;
}

function renderTimer() {
  const el = $("#timer");
  if (!stroom) {
    el.innerHTML = `
      <p class="timer-kop">${ICONEN.klok}<strong>Koelkasttimer</strong></p>
      <p class="muted">Start de timer als de stroom uitvalt. Je ziet dan hoe lang je koelkast (${KOELKAST_UUR} uur) en vriezer (${VRIEZER_UUR.half} tot ${VRIEZER_UUR.vol} uur) nog koud blijven. De timer loopt door als je de app sluit.</p>
      <div class="knoppen">
        <button class="btn primary" data-start="0">Stroom is nu uitgevallen</button>
      </div>
      <p class="muted klein-label">Al eerder uitgevallen?</p>
      <div class="knoppen">${[1, 2, 3].map((u) => `<button class="mini" data-start="${u}">${ICONEN.klok} ${u} uur geleden</button>`).join("")}</div>`;
    return;
  }
  const vol = stroom.vriezer !== "half";
  el.innerHTML = `
    <p class="timer-kop">${ICONEN.stekker}<span>Stroom uit sinds <strong>${tot(stroom.start)}</strong></span></p>
    ${aftelKaart(ICONEN.koelkast, "Koelkast", KOELKAST_UUR)}
    ${aftelKaart(ICONEN.vriezer, "Vriezer", vol ? VRIEZER_UUR.vol : VRIEZER_UUR.half, `
      <p class="muted klein-label">Hoe vol is je vriezer?</p>
      <div class="segment" role="radiogroup">
        <button role="radio" data-vriezer="vol" aria-checked="${vol}">Vol · ${VRIEZER_UUR.vol} u</button>
        <button role="radio" data-vriezer="half" aria-checked="${!vol}">Halfvol · ${VRIEZER_UUR.half} u</button>
      </div>`)}
    <p class="muted klein-label">Ging de stroom eerder uit?</p>
    <div class="knoppen">${[1, 2, 3].map((u) => `<button class="mini" data-start="${u}">${ICONEN.klok} ${u} uur geleden</button>`).join("")}</div>
    <p class="tip">${ICONEN.koelkast}<span>Houd de deuren dicht: elke keer openen laat de kou ontsnappen.</span></p>
    <button class="btn stroom-terug" data-stop>Stroom is terug</button>`;
}

function renderBladen() {
  $("#bladen").innerHTML = BLADEN.map((b) => `
    <button class="blad-knop" data-blad="${b.id}">
      <span class="blad-ic">${ICONEN[b.icoon]}</span>
      <span class="blad-t"><strong>${esc(b.titel)}</strong>${b.veilig ? `<span class="veilig">${ICONEN.let_op} Veiligheid</span>` : ""}<small>${esc(b.kort)}</small></span>
      ${ICONEN.pijl}
    </button>`).join("");
}

function openBlad(id) {
  const b = BLADEN.find((x) => x.id === id);
  if (!b) return;
  $("#blad-titel").textContent = b.titel;
  $("#blad-inhoud").innerHTML = b.html;
  $("#dlg-blad").showModal();
}

$('[data-view="stroom"]').addEventListener("click", (e) => {
  const t = e.target;
  const blad = t.closest("[data-blad]");
  if (blad) return openBlad(blad.dataset.blad);
  const start = t.closest("[data-start]");
  if (start) {
    stroom = { start: Date.now() - Number(start.dataset.start) * 3600000, vriezer: stroom?.vriezer || "vol" };
    bewaarStroom();
    return renderTimer();
  }
  const vr = t.closest("[data-vriezer]");
  if (vr && stroom) { stroom.vriezer = vr.dataset.vriezer; bewaarStroom(); return renderTimer(); }
  if (t.closest("[data-stop]")) {
    stroom = null;
    bewaarStroom();
    renderTimer();
    toast("Fijn dat de stroom terug is. Kijk wat je kunt houden.", { label: "Lees blad", doe: () => openBlad("terug") });
  }
});

setInterval(() => { if (stroom && ui.tab === "stroom" && !document.hidden) renderTimer(); }, 20000);
document.addEventListener("visibilitychange", () => { if (!document.hidden && ui.tab === "stroom") renderTimer(); });

/* ---------- Gezinsplan ---------- */

const formPlan = $("#form-plan");
function vulPlan() {
  for (const el of formPlan.elements) if (el.name) el.value = staat.plan[el.name] || "";
}
let planTimer;
formPlan.addEventListener("input", (e) => {
  if (!e.target.name) return;
  staat.plan[e.target.name] = e.target.value;
  clearTimeout(planTimer);
  planTimer = setTimeout(() => schrijf(OPSLAG, staat), 400);
});
formPlan.addEventListener("change", () => { clearTimeout(planTimer); schrijf(OPSLAG, staat); });
formPlan.addEventListener("submit", (e) => e.preventDefault());

function printHtml() {
  const p = staat.plan;
  const rij = (label, waarde) => (waarde || "").trim() ? `<tr><th>${esc(label)}</th><td>${esc(waarde).replace(/\n/g, "<br>")}</td></tr>` : "";
  const planRijen = [
    rij("Afspreekplek dicht bij huis", p.plekDichtbij),
    rij("Afspreekplek buiten de buurt", p.plekVerder),
    rij("Kinderen ophalen", p.kinderen),
    rij("Huisdieren", p.huisdieren),
    rij("Buren om naar om te kijken", p.buren),
    rij("Vluchttas pakken", p.tas),
    rij("Contactpersoon buiten de regio", p.contactBuiten),
    rij("Belangrijke nummers", p.contacten),
    rij("Medisch", p.medisch),
    rij("Verder", p.overig),
  ].join("");

  const d = dagen();
  const pakketten = KITS.map((k) => {
    const regels = regelsVoor(k.id, k.id === "thuis" ? ui.niveau : 0);
    const items = staat.items.filter((i) => plekVan(i) === k.id && !i.teKopen)
      .sort((a, b) => (a.houdbaar || "9999").localeCompare(b.houdbaar || "9999") || a.naam.localeCompare(b.naam, "nl"));
    if (!items.length && !regels.some((r) => r.klaar)) return "";
    return `<section class="p-kit">
      <h2>${esc(k.naam)}${k.id === "thuis" ? ` · ${NIVEAUS[ui.niveau].naam}` : ""} <span>${score(regels)}%</span></h2>
      <ul class="p-check">${regels.map((r) => `<li>${r.klaar ? "☑" : "☐"} ${esc(r.naam)}${r.ess ? " *" : ""}</li>`).join("")}</ul>
      ${items.length ? `<table class="p-items"><thead><tr><th>Item</th><th>Aantal</th><th>Houdbaar tot</th></tr></thead><tbody>
        ${items.map((i) => `<tr class="${status(i, d) === "bad" ? "p-bad" : ""}"><td>${esc(i.naam)}${i.inhoud ? ` (${esc(i.inhoud)})` : ""}</td><td>${i.aantal}</td><td>${i.houdbaar ? mooieDatum(i.houdbaar) + (status(i, d) === "bad" ? " (verlopen)" : "") : "–"}</td></tr>`).join("")}
      </tbody></table>` : ""}
    </section>`;
  }).join("");

  return `
    <h1>Gezinsplan en noodpakket</h1>
    <p class="p-datum">Geprint op ${datumFmt.format(new Date())} · ${esc(huisTekst())}</p>
    <div class="p-nood"><div><strong>112</strong> Spoed: politie, brandweer, ambulance</div><div><strong>0900-8844</strong> Politie, geen spoed</div><div><strong>0800-9009</strong> Storing gas of stroom</div></div>
    ${planRijen ? `<table class="p-plan">${planRijen}</table>` : `<p>Nog geen gezinsplan ingevuld.</p>`}
    <p class="p-radio">Bij een ramp of grote storing: zet de radio op NPO Radio 1 of je regionale omroep.</p>
    ${pakketten}
    <p class="p-voet">* = essentieel. Leg deze print bij je noodpakket en vernieuw hem als er iets verandert.</p>`;
}

$("#btn-print").addEventListener("click", () => {
  schrijf(OPSLAG, staat);
  $("#print").innerHTML = printHtml();
  window.print();
});

/* ---------- Tabbladen ---------- */

function toonTab(tab) {
  ui.tab = tab;
  bewaarUi();
  for (const v of document.querySelectorAll(".view")) v.hidden = v.dataset.view !== tab;
  for (const b of document.querySelectorAll(".tabbar [data-tab]")) {
    if (b.dataset.tab === tab) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  }
  $("#btn-nieuw").hidden = tab !== "voorraad";
  if (tab === "stroom") renderTimer();
  if (tab === "klaar") renderKlaar();
  window.scrollTo(0, 0);
}
$(".tabbar").addEventListener("click", (e) => {
  const b = e.target.closest("[data-tab]");
  if (b) toonTab(b.dataset.tab);
});

renderBladen();
vulPlan();

/* ---------- Beginscherm-tip en offline ---------- */

const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
if (!standalone && !lees(HINT, false) && /iphone|ipad|ipod/i.test(navigator.userAgent)) $("#install-hint").hidden = false;
$("#btn-hint-weg").addEventListener("click", () => { schrijf(HINT, true); $("#install-hint").hidden = true; });

if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

// Vraag de browser om de opslag niet op te ruimen.
navigator.storage?.persist?.().catch(() => {});

render();
toonTab(["voorraad", "klaar", "stroom", "plan"].includes(ui.tab) ? ui.tab : "voorraad");
