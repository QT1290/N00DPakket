# N00DPakket

Een eenvoudige app om de houdbaarheid van je noodpakket bij te houden. Je voegt items toe met aantal en houdbaarheidsdatum, en de app laat zien wat verlopen is en wat binnen 3 weken over datum gaat.

- **Privé:** je lijst staat alleen in de browser van jouw telefoon of computer. Iemand anders die de site opent, ziet een lege app.
- **Werkt offline** en kan als app op je beginscherm.
- **Optioneel e-mail:** GitHub mailt je als er iets bijna verloopt, zonder namen van items te tonen.

## 1. De app online zetten (GitHub Pages)

1. Ga in deze repository naar **Settings → Pages**.
2. Kies bij *Source* **Deploy from a branch**, branch **main**, map **/ (root)**, en klik **Save**.
3. Na een minuut staat de app op `https://qt1290.github.io/n00dpakket/`.
4. Open die link op je telefoon en zet hem op je beginscherm:
   - iPhone (Safari): Delen → **Zet op beginscherm**. Doe dit zeker op iPhone: anders kan Safari je lijst wissen als je de app 7 dagen niet opent.
   - Android (Chrome): menu ⋮ → **App installeren** of **Toevoegen aan startscherm**.

## 2. Je huidige voorraad importeren

Open de app, tik op **Back-up terugzetten** en kies het bestand `noodpakket-backup.json` dat je van Claude hebt gekregen. Dit bestand hoort **niet** in deze repository, want die is openbaar.

Maak daarna af en toe een back-up via ⚙︎ → **Back-up downloaden**.

## 3. E-mailherinneringen (optioneel)

Hoe het werkt: de app zet een **versleutelde** kopie van je lijst in `data/voorraad.enc.json`. Elke maandagochtend (en meteen na elke wijziging) ontsleutelt GitHub die kopie met jouw wachtwoord. Verloopt er iets binnen 3 weken, of is er iets verlopen, dan maakt GitHub een issue aan en krijg je daarvan een e-mail. In dat issue staan alleen aantallen, geen namen of datums. Je krijgt pas een nieuwe e-mail als er iets verandert.

**a. Kies een wachtwoord** van minstens 10 tekens en zet het als secret in GitHub:
Settings → Secrets and variables → Actions → **New repository secret**
- Name: `NOODPAKKET_WACHTWOORD`
- Secret: je wachtwoord

**b. Maak een token** zodat de app de versleutelde kopie mag opslaan:
1. Ga naar [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new).
2. Naam: `Noodpakket-app`. Vervaldatum: bijvoorbeeld 1 jaar.
3. Repository access: **Only select repositories** → `N00Dpakket`.
4. Permissions → Repository permissions → **Contents: Read and write**.
5. Klik **Generate token** en kopieer hem.

**c. Zet het aan in de app:** ⚙︎ → vink **E-mailherinneringen aan** aan, plak de token, vul hetzelfde wachtwoord in en tik **Opslaan en nu versturen**.

**d. Controleer je e-mailmeldingen:** in [github.com/settings/notifications](https://github.com/settings/notifications) moet bij *Participating, @mentions and custom* de optie **Email** aan staan. Met de GitHub-app op je telefoon krijg je ook een pushmelding.

Testen kan via **Actions → Noodpakket-herinnering → Run workflow**.

> Let op: de token en het wachtwoord staan alleen op jouw apparaat. Vergeet je het wachtwoord, kies dan een nieuw en vul het op beide plekken opnieuw in.

## Bestanden

| Bestand | Wat |
| --- | --- |
| `index.html`, `css/`, `js/` | De app |
| `js/kluis.js` | Versleuteling (AES-GCM, gedeeld door app en controle) |
| `js/datum.js` | Wanneer iets "verlopen" of "binnenkort" is |
| `scripts/controleer.mjs` | De wekelijkse controle |
| `.github/workflows/herinnering.yml` | Wanneer de controle draait |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline werken en op het beginscherm zetten |
