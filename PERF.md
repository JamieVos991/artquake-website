# Snelheid

Logboek van snelheidsverbeteringen, ook van wat niet hielp, zodat een idee
dat niets opleverde niet opnieuw geprobeerd wordt.

## Hoe gemeten

Lighthouse 12.6.1, mobiel (gesimuleerd 4G en trage telefoon), tegen de
gebouwde site (`npm run build`) op een lokale server met gzip. Oud en nieuw om
en om gemeten in dezelfde ronde, want de absolute getallen schommelen per
ronde met hoe druk de computer is. Video-bytes telt Lighthouse niet mee in het
totaal; die staan apart.

Doelen (Core Web Vitals): LCP ≤ 2,5 s, CLS ≤ 0,1.

## Oktober 2026

| Idee | Voor → na | Besluit | Waarom |
|---|---|---|---|
| Hero-foto's één voor één laden i.p.v. alle 7 meteen | Home 1.054 → 694 KB; LCP 3,76 → 3,77 s | gehouden | LCP veranderde niet (bandbreedte was dus niet de oorzaak), maar 360 KB minder bij openen op een telefoon |
| Pand-video `preload="none"` + poster | ~1 MB video bij openen → 8,5 KB poster | gehouden | Video start toch pas als hij in beeld komt |
| Staande uitsnede van hero-foto's voor telefoons + kleiner logo (46 → 27 KB) | Home LCP 3,76 → 3,09 s, score 85 → 90 | gehouden | De LCP-foto ging van 172 naar 58 KB |
| Galerijfoto's diensten: 480 px versie via `srcset` | Exposities 1.512 → 575 KB, LCP 2,75 → 2,38 s | gehouden | Telefoons toonden 156 px brede foto's uit bestanden van 1200 px |
| Reserveren: eerst alleen inlogcheck, Firestore pas daarna; niet-crew meteen naar login | Reserveren LCP 5,07 → 2,77 s, score 74 → 94 | gehouden | Pagina wachtte op de hele Firebase-SDK voordat er iets verscheen |
| Reserveren: alleen reserveringen van gekozen studio + dag ophalen | niet gemeten (data groeit) | gehouden | Haalde alle reserveringen van een studio ooit op |
| Dashboard: reserveringen vanaf 3 maanden terug | niet gemeten (data groeit) | gehouden | Elke reservering ooit telde bij elk openen als read |
| Agenda op homepage één keer ophalen (pagina en menu delen) | 2 → 1 verzoek | gehouden | Dubbel verzoek |
| Eerste hero-wissel pas na 8 s i.p.v. 3 s | Home Speed Index 4,5 → 3,1 s (3×), score ~0,80 | gehouden | De overvloeier van 1,5 s op 3 s telde als "pagina nog niet klaar" |
| `requestIdleCallback` voor volgende hero-foto met `timeout: 1000` | n.v.t. (bug) | gehouden | Zonder timeout kwam idle soms nooit en bleef de hero 3 s leeg |
| CSS in de HTML (`inlineStyleThreshold: Infinity`) | Home FCP 2,8 → 1,9 s, LCP 4,4 → 2,7 s, SI 3,1 → 1,9 s, score 0,80 → 0,95 (3×) | gehouden | De hero-foto was na 0,6 s binnen maar wachtte op twee CSS-bestanden; index.html wordt 81 KB (ongezipt) |

Eindmeting (om en om, 3× per pagina, mediaan LCP):

| Pagina | Oud | Nieuw |
|---|---|---|
| Home | 5,50 s, 1.054 KB | 4,47 s, 500 KB |
| Diensten/exposities | 2,76 s, 1.512 KB | 2,38 s, 575 KB |
| Reserveren (niet ingelogd) | 5,07 s | 2,77 s |

## Nog open

- Home: FCP blijft ~2,8 s. Lighthouse rekent de ~24 kleine JS-bestanden en de
  Google Fonts mee als werk vóór de eerste weergave. Mogelijke volgende stap:
  fonts zelf hosten.
- Crew-foto's (tot 1000 px, getoond als 220×364) en de pand-foto (147 KB):
  kleinere versies leveren naar schatting weinig op; niet gedaan.
