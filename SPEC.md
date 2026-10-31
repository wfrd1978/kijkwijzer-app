# SPEC — Kijkwijzer (app voor anderen)

Deze app is gestart als kopie van de eigen Kijkwijzer van de eigenaar (oktober 2026), met alles wat daar getest en goed bevonden was. Hieronder wat de app doet.

## Films en series

- **Mijn lijst** met de tabbladen Wil ik zien en Gezien, met per tabblad een korte uitleg. Bij Wil ik zien een knop ✓ Gezien, waarna de app meteen om sterren vraagt; bij Gezien tik je de sterren direct in de lijst aan.
- **Zoeken en toevoegen** met één zoekveld: eerst wat al op je lijst staat (op titel, acteur of notitie), daarna nieuwe titels en acteurs van TMDB. Bij toevoegen kies je + Wil ik zien of ✓ Al gezien.
- **Titelpagina**: bovenaan je eigen dingen (status, sterren, kijkdatum, notitie, voortgang bij series), daarna waar je hem in Nederland kunt kijken, trailer en acteurs. Samen kijken: een uitnodiging delen.
- **Ontdekken** (eigen scherm): trending, bij jouw diensten, en tips op basis van wat je 4 of 5 sterren gaf.
- **Mijn diensten**: per streamingdienst Abonnement, Tonen of Verbergen.

## Vandaag en Deze week

- **Vandaag**: verder kijken (series met voortgang), nieuwe afleveringen, sport vandaag, Vanavond op de NPO (met voorkeuren voor genres en omroepen), Nieuw voor jou (elke dag een recent verschenen titel bij jouw diensten, in jouw smaak). Wie niets met sport heeft, zet in Instellingen bij Weergave 'Sport op Vandaag' uit; op die plek staan dan drie kijktips bij jouw diensten, goed gewaardeerd en in jouw genres, met de waardering in sterren.
- **Deze week**: maandag tot en met zondag, per dag een kaart met sport, nieuwe afleveringen en wat van je lijst op NPO komt. Staat Sport op Vandaag uit, dan staat er geen sport in de week, maar elke avond twee tv-tips (op je genres en omroepen). Onderaan **Daarna**: nieuwe afleveringen en seizoenen van series op je lijst na deze week, tot twee maanden vooruit (volgens TMDB).
- **Vandaag** begint met Vanavond op de NPO.

## Sport

- **Voetbal**: schema van je clubs en competities (football-data.org), aangevuld met bekers en Europa League (TheSportsDB), met het precieze ESPN-kanaal bij de Eredivisie, en de volgende interland van Oranje.
- **Formule 1** en **wielrennen**, met zenders.

## Instellingen

Wat ik heb en volg (diensten, voetbal, tv-tips, sportzenders), backup maken en terugzetten, weergave (donker, licht, 's avonds donker, zoals de telefoon), en de TMDB-sleutel. Standaard gebruikt de app de gedeelde sleutel, zodat nieuwe gebruikers meteen kunnen beginnen; wie wil, vult onder 'Liever je eigen sleutel?' een eigen sleutel in (met uitleg in vier stappen). Haal je die weer weg, dan gebruikt de app weer de gedeelde.

## Welkom, je naam en Instellingen

De eerste keer (lege lijst) opent de app met een paar korte stappen: je voornaam, je streamingdiensten, sport (Sport op Vandaag, sportzenders, voetbal), tv-tips en licht of donker. Met de gedeelde sleutel is er geen sleutelstap; zonder vraagt de app om een eigen sleutel. Overslaan kan altijd, en wie een backup heeft, zet die meteen terug. In Instellingen staat 'Welkomststappen opnieuw doorlopen'. Je naam staat alleen op de telefoon en in je backup en komt terug als 'Goedemiddag, …' onder de kop Vandaag. Instellingen is ingedeeld in rustige kaarten (je naam, Kijken, Sport, Backup, Weergave, Sleutel & over), met per keuze één regel en de uitleg in de opengeklapte regel.

## Eenvoudiger welkom en updates

De welkomststappen stellen alleen de hoofdvragen, elk met een korte uitleg waarom: je naam; welke streamingdiensten je hebt (knoppen om aan te tikken, uit een vaste lijst van twintig); 'Volg je sport?' (Ja of Nee); alleen bij Ja: waar je sport kijkt, met een voetbalclub als optie; en wat je graag op tv ziet. Hele competities, omroepen en licht of donker staan alleen in Instellingen. In de eerste vragen staan zeventien diensten: MUBI, Hayu en CineMember staan alleen in Instellingen.

**Geen sport.** Wie 'Nee' zegt op 'Volg je sport?' (of in Instellingen bij Sport 'Sport volgen' uitzet), ziet nergens meer sport: geen Sport-knop onderin, niets op Vandaag en in Deze week, en de app haalt ook niets meer op over sport. Alleen in Instellingen blijven de sportkeuzes staan; zet je Sport volgen aan, dan komt alles meteen terug. Instellingen toont dezelfde vaste lijst van twintig streamingdiensten.

Het adres van de app blijft altijd https://wfrd1978.github.io/kijkwijzer-app/; elke verbetering komt onder dat adres. Opent iemand de app (of komt hij terug in beeld) en staat er een nieuwe versie klaar, dan laadt de app die meteen zelf, zolang er nog niets is aangetikt. Is iemand al bezig, dan verschijnt de knop 'Nieuwe versie klaar', zodat er nooit iets halverwege wegvalt.

## Backup

Automatisch bewaren in iCloud of Google Drive kan een webapp niet: hij mag op de achtergrond niets naar je cloud sturen, en er is bewust geen eigen server. Daarom maakt de app het backupbestand al klaar zodra je Instellingen opent; één tik op Backup maken opent meteen het deelmenu. Kies Bewaar in Bestanden (iCloud Drive of Google Drive) of de Drive-app; de telefoon onthoudt de map. Na 14 dagen herinnert de app je eraan.

## Volgende week

Volgende week (31 oktober 2026): bovenaan Deze week twee knoppen, Deze week en Volgende week. Volgende week toont maandag tot en met zondag van de week erna, met dezelfde onderdelen (sport, nieuwe afleveringen, NPO; in de gedeelde app zonder sport de tv-tips, zolang de NPO-gids zo ver vooruit loopt).

## Europees voetbal

Europa League en Conference League (31 oktober 2026): ook als hele competitie te kiezen (Instellingen → Sport → Hele competities). Football-data heeft ze niet gratis; GitHub haalt ze elke nacht bij TheSportsDB op (de ronde van de eerstvolgende wedstrijd en de ronde daarna) en zet ze in voetbal.json. Geeft TheSportsDB een ronde niet compleet (de gratis versie geeft hooguit 50 wedstrijden per ronde, en voorrondes tellen mee), dan het programma van OpenLigaDB (gratis en open), met Duitse clubnamen omgezet naar de gangbare namen en zonder logo's. Een wedstrijd van een van je clubs staat er één keer in. Zender: Ziggo Sport (onder voorbehoud).

## Controles

Controle 31 oktober 2026 (onafhankelijk, vier controleurs): geen hoge of middelgrote risico's in beveiliging en privacy; de gedeelde sleutel komt alleen nog uit een afgeschermd geheim. Gerepareerd: nieuwe afleveringen worden in één ronde tegelijk opgehaald en na elke serie bewaard; de controle op een nieuwe versie wacht op internet (ook op een trage verbinding); Ontdekken toont bij een storing meteen een melding; na vegen en Ongedaan maken kloppen de lijst en de tellers, ook na wisselen van tabblad; een net gewijzigde instelling (ook je naam) zit altijd in de backup (dan eventueel met één tik extra); de tekst bij Sport volgen verandert mee. Opgeruimd: oude CSS (oude weekopmaak, oude dienstenlijst, oude kopjes) en een ongebruikte functie.

## Werklijst

(Nog leeg. Wensen van de eigenaar of van gebruikers komen hier.)
