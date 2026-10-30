# CLAUDE.md — Kijkwijzer (app voor anderen)

Lees dit bestand en SPEC.md aan het begin van elke sessie.

## Wat dit is

Kijkwijzer is een rustige mobiele webapp om films, series en sport bij te houden: snel toevoegen, zien waar je iets kunt kijken, en je eigen oordeel bewaren. Deze repository (`kijkwijzer-app`) is de versie die de eigenaar deelt met familie en vrienden. Ieder gebruikt de app op zijn eigen telefoon; alles wat iemand invult, blijft daar.

**Woordgebruik:** de eigenaar spreekt van **"de gedeelde app"** (deze repository) en **"mijn eigen app"** (`kijkwijzer`). Standaard wordt er in mijn eigen app ontwikkeld; deze gedeelde app wordt alleen aangepast als de eigenaar daar specifiek om vraagt.

De eigenaar heeft daarnaast een eigen Kijkwijzer (repository `kijkwijzer`, op /kijkwijzer/) die los hiervan wordt ontwikkeld en als proeftuin dient. Verbeteringen van daar komen hier alleen als de eigenaar daarom vraagt. De eigenaar is geen programmeur. Eenvoud gaat boven features.

Adres: https://wfrd1978.github.io/kijkwijzer-app/

## Gekozen techniek (en waarom, in gewoon Nederlands)

| Onderdeel | Keuze | Waarom |
|---|---|---|
| Soort app | Webapp die je op je beginscherm zet (PWA) | Werkt als een app, zonder App Store |
| Bouwgereedschap | Vite + gewoon JavaScript, geen framework | Weinig onderdelen, makkelijk te volgen |
| Opslag | IndexedDB op de telefoon via Dexie.js (database `kijkwijzer-app`) | Werkt offline; gegevens blijven bij de gebruiker |
| Backup | JSON-bestand via het deelmenu | Gratis, de gebruiker houdt zijn eigen gegevens |
| Film- en seriegegevens | TMDB; ieder vraagt een eigen gratis sleutel aan (uitleg in Instellingen) | Beste gratis bron, met Nederlandse streaminginformatie |
| Online zetten | GitHub Pages via GitHub Actions, bij elke push en elke nacht | Gratis; geen server nodig |
| Voetbalschema | football-data.org, nachtelijks opgehaald door GitHub (`scripts/voetbal.mjs`), sleutel als GitHub-geheim `FOOTBALL_DATA_KEY` | De app mag football-data niet zelf aanroepen |
| Bekers en Europa League | TheSportsDB, vanuit de app, per club de eerstvolgende wedstrijd | Gratis aanvulling op football-data |
| ESPN-kanaal Eredivisie, NPO-gids | Nachtelijks opgehaald door GitHub (`scripts/espn.mjs`, `scripts/npo.mjs`) | Openbare pagina's; niet vanuit de app op te halen |

Geen betaalde diensten, geen eigen server en geen sleutels in de code.

## Opslag gescheiden van de andere app (belangrijk)

Deze app staat op hetzelfde webadres (wfrd1978.github.io) als de eigen app van de eigenaar, en een browser deelt de opslag per webadres. Daarom:
- eigen database `kijkwijzer-app`, en een voorvoegsel `app:` voor alles in localStorage (`src/opslag.js`, als eerste geladen in `src/main.js`; ook `public/thema.js` leest `app:weergave`);
- eigen service worker en cachenamen (`kijkwijzer-app-v*`, `posters-app-v*`) die alleen eigen opslag opruimen;
- nooit sleutels zonder voorvoegsel, de database `kijkwijzer` of cachenamen van de andere app aanraken.

## Werkafspraken

1. **Kleine stappen.** Eén stap = één zichtbaar resultaat dat de eigenaar op de telefoon kan testen. Begin met één zin: wat we bouwen en hoe je het test.
2. **De eigenaar test zelf.** Geef na elke stap het adres en een korte testinstructie (maximaal drie handelingen).
3. **Git-commit na elke werkende stap**, met een duidelijk Nederlands bericht.
4. **Uitleg in gewoon Nederlands.** Licht keuzes kort toe. Vraag bij twijfel.
5. **Data is heilig.** Andere mensen gebruiken deze app. Nooit iets aan de opslag of backup veranderen zonder de eigenaar te waarschuwen; zorg dat oude backups blijven werken en dat bestaande lijsten bij een nieuwe versie behouden blijven.
6. **Spec bijhouden.** Verandert er iets aan de plannen, werk dan SPEC.md bij in dezelfde commit.
7. **Privacy.** Noem nergens de naam, het mailadres of andere persoonsgegevens van de eigenaar of van gebruikers: niet in code, documentatie, commitberichten of de app zelf. Commits gaan op naam van het GitHub-account met het `noreply`-adres van GitHub.
8. **Voor iedereen begrijpelijk.** De app moet zichzelf uitleggen aan iemand die hem voor het eerst opent, zonder hulp van de eigenaar.
