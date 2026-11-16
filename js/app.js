import { dagenTot, status, STANDAARD_DAGEN } from "./datum.js";
import { versleutel } from "./kluis.js";

/* ---------- Opslag (alleen op dit apparaat) ---------- */

const OPSLAG = "noodpakket.v1";
const SYNC = "noodpakket.sync";
const HINT = "noodpakket.hint-weg";
const SYNC_PAD = "data/voorraad.enc.json";

const CATEGORIEEN = ["Water", "Eten", "Hygiëne & medicatie", "Licht & vuur", "Gereedschap", "Documenten", "Overig"];

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

let staat = lees(OPSLAG, null) || { items: [], instellingen: { dagen: STANDAARD_DAGEN } };
staat.instellingen ||= { dagen: STANDAARD_DAGEN };
let sync = lees(SYNC, { aan: false, repo: "", token: "", wachtwoord: "" });

const filter = { categorie: "Alles", status: null, zoek: "" };

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
  for (const it of staat.items) if (!it.teKopen) telling[status(it, d)] = (telling[status(it, d)] || 0) + 1;
  const kopen = staat.items.filter((i) => i.teKopen).length;

  let msg;
  if (!staat.items.length) msg = "Nog niets in je noodpakket.";
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
  const aanwezig = CATEGORIEEN.filter((c) => staat.items.some((i) => i.categorie === c));
  const extra = [...new Set(staat.items.map((i) => i.categorie))].filter((c) => c && !CATEGORIEEN.includes(c));
  const lijst = ["Alles", ...aanwezig, ...extra];
  if (!lijst.includes(filter.categorie)) filter.categorie = "Alles";
  $("#chips").innerHTML = lijst
    .map((c) => {
      const n = c === "Alles" ? staat.items.length : staat.items.filter((i) => i.categorie === c).length;
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
  let items = staat.items.filter(
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

  const leeg = staat.items.length === 0;
  $("#leeg").hidden = !leeg;
  if (leeg) { $("#lijst").innerHTML = ""; return; }

  let html = "";
  for (const [titel, past] of groepen) {
    const g = items.filter(past);
    if (!g.length) continue;
    html += `<div class="groep"><h2>${titel}</h2><span class="lijn"></span></div>${g.map(itemHtml).join("")}`;
  }
  $("#lijst").innerHTML = html || `<p class="geen-resultaat">Niets gevonden.</p>`;
}

function render() {
  renderStatus();
  renderChips();
  renderLijst();
  $("#naam-suggesties").innerHTML = [...new Set(staat.items.map((i) => i.naam))].map((n) => `<option value="${esc(n)}">`).join("");
}

/* ---------- Item formulier ---------- */

const dlgItem = $("#dlg-item");
const formItem = $("#form-item");
let bewerkId = null;

formItem.elements.categorie.innerHTML = CATEGORIEEN.map((c) => `<option>${esc(c)}</option>`).join("");

function openItem(item = null, opties = {}) {
  bewerkId = item?.id ?? null;
  const f = formItem.elements;
  $("#item-titel").textContent = item ? (opties.titel || "Item bewerken") : "Item toevoegen";
  f.naam.value = item?.naam ?? "";
  if (item?.categorie && ![...f.categorie.options].some((o) => o.value === item.categorie)) {
    f.categorie.add(new Option(item.categorie));
  }
  f.categorie.value = item?.categorie ?? (filter.categorie !== "Alles" ? filter.categorie : "Eten");
  f.aantal.value = item?.aantal ?? 1;
  f.inhoud.value = item?.inhoud ?? "";
  f.houdbaar.value = opties.leegDatum ? "" : item?.houdbaar ?? "";
  f.notitie.value = item?.notitie ?? "";
  f.teKopen.checked = opties.gekocht ? false : !!item?.teKopen;
  $("#btn-verwijder").hidden = !item;
  dlgItem.showModal();
  if (!item) f.naam.focus();
  else if (opties.leegDatum) f.houdbaar.focus();
}

formItem.addEventListener("submit", (e) => {
  e.preventDefault();
  const f = formItem.elements;
  const data = {
    naam: f.naam.value.trim(),
    categorie: f.categorie.value,
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
    toast(`${data.naam} toegevoegd`);
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
    bewaar();
    dlgSet.close();
    toast(`${items.length} items teruggezet`);
  } catch {
    toast("Dit bestand is geen geldige back-up.");
  }
});

$("#btn-wis").addEventListener("click", () => {
  if (!confirm("Weet je het zeker? Alle items en instellingen op dit apparaat worden gewist.")) return;
  staat = { items: [], instellingen: { dagen: STANDAARD_DAGEN } };
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
