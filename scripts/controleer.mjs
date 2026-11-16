// Wekelijkse controle (GitHub Actions): ontsleutelt de voorraad en maakt een issue aan
// als er items binnenkort verlopen. GitHub stuurt je daar automatisch een e-mail over.
// In het issue staan bewust GEEN namen of datums: de repository is openbaar.

import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { ontsleutel } from "../js/kluis.js";
import { status, STANDAARD_DAGEN } from "../js/datum.js";

const BESTAND = "data/voorraad.enc.json";
const LABEL = "noodpakket-herinnering";
const { GITHUB_TOKEN, GITHUB_REPOSITORY, NOODPAKKET_WACHTWOORD, EIGENAAR, APP_URL } = process.env;

async function gh(pad, opties = {}) {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}${pad}`, {
    ...opties,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(opties.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!res.ok && !(opties.mag ?? []).includes(res.status)) {
    throw new Error(`GitHub API ${opties.method || "GET"} ${pad}: ${res.status} ${await res.text()}`);
  }
  return res.status === 204 ? null : res.json();
}

let pakket;
try {
  pakket = JSON.parse(await readFile(BESTAND, "utf8"));
} catch {
  console.log(`Nog geen ${BESTAND}. Zet e-mailherinneringen aan in de app.`);
  process.exit(0);
}
if (!NOODPAKKET_WACHTWOORD) {
  console.error("Het secret NOODPAKKET_WACHTWOORD ontbreekt. Zie de README.");
  process.exit(1);
}

let data;
try {
  data = await ontsleutel(pakket, NOODPAKKET_WACHTWOORD);
} catch {
  console.error("Ontsleutelen mislukt: het wachtwoord in de app en het secret NOODPAKKET_WACHTWOORD zijn niet gelijk.");
  process.exit(1);
}

// Controleer in Nederlandse tijd.
const nu = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Amsterdam" }));
const dagen = Number(data.dagen) || STANDAARD_DAGEN;
const actief = (data.items || []).filter((i) => !i.teKopen && i.houdbaar);
const verlopen = actief.filter((i) => status(i, dagen, nu) === "bad");
const binnenkort = actief.filter((i) => status(i, dagen, nu) === "warn");
const aandacht = [...verlopen, ...binnenkort];

// Vingerafdruk van welke items aandacht nodig hebben, zodat je niet elke week dezelfde mail krijgt.
const vingerafdruk = createHash("sha256")
  .update(aandacht.map((i) => `${i.id}:${i.houdbaar}`).sort().join("|"))
  .digest("hex")
  .slice(0, 16);
const merk = `<!-- noodpakket:${vingerafdruk} -->`;
const leesMerk = (tekst) => (tekst || "").match(/<!-- noodpakket:([0-9a-f]+) -->/)?.[1];

console.log(`Verlopen: ${verlopen.length}, binnen ${dagen} dagen: ${binnenkort.length}.`);

const issues = await gh(`/issues?labels=${LABEL}&state=all&sort=created&direction=desc&per_page=10`);
const open = issues.find((i) => i.state === "open" && !i.pull_request);
const laatste = issues.find((i) => !i.pull_request);

if (!aandacht.length) {
  if (open) {
    await gh(`/issues/${open.number}/comments`, { method: "POST", body: JSON.stringify({ body: "Alles is weer in orde. Dit issue wordt gesloten." }) });
    await gh(`/issues/${open.number}`, { method: "PATCH", body: JSON.stringify({ state: "closed", state_reason: "completed" }) });
    console.log(`Issue #${open.number} gesloten.`);
  }
  process.exit(0);
}

const delen = [];
if (verlopen.length) delen.push(`**${verlopen.length}** ${verlopen.length === 1 ? "item is" : "items zijn"} verlopen`);
if (binnenkort.length) delen.push(`**${binnenkort.length}** ${binnenkort.length === 1 ? "item verloopt" : "items verlopen"} binnen ${dagen} dagen`);
const link = APP_URL ? `[Open de app](${APP_URL})` : "Open de app";
const tekst = `${EIGENAAR ? `@${EIGENAAR} ` : ""}${delen.join(" en ")} in je noodpakket.

${link} om te zien welke. Gebruik ze op en vervang ze. Als alles weer in orde is, sluit dit issue zichzelf.

${merk}`;

if (open) {
  if (leesMerk(open.body) === vingerafdruk) {
    console.log(`Niets nieuws sinds issue #${open.number}.`);
    process.exit(0);
  }
  await gh(`/issues/${open.number}/comments`, { method: "POST", body: JSON.stringify({ body: tekst }) });
  await gh(`/issues/${open.number}`, { method: "PATCH", body: JSON.stringify({ body: tekst }) });
  console.log(`Issue #${open.number} bijgewerkt.`);
  process.exit(0);
}

if (laatste && leesMerk(laatste.body) === vingerafdruk) {
  console.log(`Je hebt issue #${laatste.number} al gesloten voor precies deze items. Geen nieuwe melding.`);
  process.exit(0);
}

await gh(`/labels`, { method: "POST", body: JSON.stringify({ name: LABEL, color: "e8792b", description: "Herinnering uit de noodpakket-app" }), mag: [422] });
const nieuw = await gh(`/issues`, {
  method: "POST",
  body: JSON.stringify({
    title: "Noodpakket: tijd om items te vervangen",
    body: tekst,
    labels: [LABEL],
    ...(EIGENAAR ? { assignees: [EIGENAAR] } : {}),
  }),
});
console.log(`Issue #${nieuw.number} aangemaakt.`);
