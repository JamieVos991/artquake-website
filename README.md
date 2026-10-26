# Artquake

Website van Stichting Villa Artquake in Heerhugowaard: jong talent laat zich zien en horen.
Live op https://art-quake.com

Gebouwd met SvelteKit (Svelte 5) als statische site op GitHub Pages, met Firebase voor de
gegevens en de inlog van de crew.

## Starten

```sh
npm install
npm run dev
```

Op Windows in PowerShell: `npm.cmd` in plaats van `npm` als scripts geblokkeerd zijn.
Zie je een wijziging niet terug? Stop de dev-server (`Ctrl + C`) en start hem opnieuw.

## Live zetten

Elke push naar `master` wordt door GitHub Actions gebouwd en op GitHub Pages gezet
(`.github/workflows/deploy.yml`). Na 1 à 2 minuten staat de nieuwe versie online.

## Waar staat wat

| Map / bestand | Inhoud |
|---|---|
| `src/routes/+page.svelte` | Homepage |
| `src/routes/+layout.svelte` | Menu, contactformulier en footer op elke pagina |
| `src/routes/diensten/[slug]` | Dienstpagina's (Talent Night, Coaching, …) |
| `src/routes/artiesten` | Alle artiesten |
| `src/routes/dashboard` | Beheer van agenda, artiesten en reserveringen (alleen crew) |
| `src/routes/reserveren` | Reserveren van ruimtes (nu alleen crew) |
| `src/lib/data/diensten.js` | Teksten, video's en foto's van de diensten |
| `src/lib/data/site.js` | Domein voor sitemap en robots.txt |
| `src/lib/publiekeData.js` | Agenda en artiesten lezen zonder de Firebase-SDK |
| `src/lib/firebase.js` | Firebase voor de crewpagina's |
| `src/lib/email-config.js` | EmailJS voor reserveringsmails |
| `email-templates/` | HTML voor de EmailJS-templates |
| `firestore.rules`, `storage.rules` | Beveiligingsregels van Firebase |

## Beheerders

Alleen accounts waarvan de UID als document in de Firestore-collectie `beheerders` staat,
kunnen iets wijzigen. Nieuw crewlid: account maken in de Firebase-console
(Authentication > Users > Add user), UID kopiëren en een document met die UID als
Document ID toevoegen aan `beheerders`.

## Media

Alles staat in `src/lib/assets/`. Namen: kleine letters, woorden met streepjes, geen spaties.

```
fotos/
  hero/                  wisselende foto's bovenaan de homepage (en in het menu)
  crew/                  één foto per crewlid, bijv. mado.avif
  pand/                  foto van het pand
  diensten/<slug>/       galerijfoto's van een dienstpagina, bijv. diensten/exposities/
videos/
  diensten/<slug>.mp4            video op de dienstpagina
  diensten/preview/<slug>.mp4    korte clip voor het blok op de homepage
  pand/dewi-rondleiding.mp4
```

- Foto's als AVIF (max 1200 px). De volgorde, titel en verhouding van galerijfoto's
  staan in `src/lib/data/diensten.js` (zonder `.avif`).
- Een dienst krijgt vanzelf een video als er een bestand met de slug als naam staat.
  Maak er ook een preview-clip (8 seconden, zonder geluid) met dezelfde naam bij,
  anders laadt het blok op de homepage de hele video.
- Originele (grote) bestanden horen niet in het project.
