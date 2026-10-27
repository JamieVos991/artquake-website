<script>
  import { base } from "$app/paths";
  import logo from "$lib/assets/artquake-logo.avif";
  import voorbeeldFoto from "$lib/assets/fotos/hero/optreden.avif";
  import { artiestSocials } from "$lib/data/socials.js";
  import { agendaKleur, agendaTekstKleur, agendaContrast } from "$lib/data/agendaKleur.js";

  // voorbeeldregels voor de agenda: de kleur hoort bij het type
  const voorbeeldAgenda = [
    { type: "Workshop", datum: "05.11", naam: "Workshop muziekproductie" },
    { type: "Optredens", datum: "07.11", naam: "Artquake in het Alkmaars Bierhuis" },
    { type: "Open entree", datum: "25.10", naam: "Jamsessie / Open podium" },
    { type: "Expositie", datum: "14.12", naam: "Groepsexpositie" },
  ];

  // Kleuren komen uit src/lib/styles/stylesheet.css
  const kleurGroepen = [
    {
      naam: "Zwart",
      rol: "Achtergrond, tekst op licht",
      tinten: [
        { hex: "#0B0B0B", token: "--color-bg" },
        { hex: "#111111", token: "--color-gray-950" },
        { hex: "#1B1B1B", token: "--color-gray-900" },
        { hex: "#242424", token: "--color-gray-800" },
        { hex: "#2E2E2E", token: "--color-gray-700" },
      ],
    },
    {
      naam: "Crème",
      rol: "Tekst op donker, lichte vlakken",
      tinten: [{ hex: "#F4F1EA", token: "--color-fg" }],
    },
    {
      naam: "Paars",
      rol: "Hoofdkleur, knoppen, accenten",
      tinten: [
        { hex: "#4A0BA0", token: "--color-primary-dark" },
        { hex: "#8A19E8", token: "--color-primary" },
        { hex: "#B57BF5", token: "--color-primary-light" },
      ],
    },
    {
      naam: "Oranje",
      rol: "Accent, labels, markering",
      tinten: [{ hex: "#F2A81C", token: "--color-accent" }],
    },
    {
      naam: "Grijs",
      rol: "Bijschriften, minder belangrijke tekst",
      tinten: [
        { hex: "#3A3A3A", token: "--color-gray-600" },
        { hex: "#4A4A4A", token: "--color-gray-500" },
        { hex: "#6B6B6B", token: "--color-gray-400" },
        { hex: "#8D8D8D", token: "--color-gray-300" },
        { hex: "#9A9A9A", token: "--color-muted" },
      ],
    },
    {
      naam: "Meldingen",
      rol: "Fout en gelukt in het dashboard",
      tinten: [
        { hex: "#C0392B", token: "--color-error" },
        { hex: "#2F7D4F", token: "--color-success" },
      ],
    },
  ];

  const koppen = [
    { naam: "Hero", spec: "Archivo 900 · 46–132px", klasse: "t-hero", tekst: "Jong talent" },
    { naam: "Paginatitel", spec: "Archivo 900 · 26–92px", klasse: "t-pagina", tekst: "Talent Night" },
    { naam: "Sectiekop", spec: "Archivo 900 · 34–64px", klasse: "t-sectie", tekst: "Samen werken we hard" },
    { naam: "Bloktitel", spec: "Archivo 900 · 40px", klasse: "t-blok", tekst: "Jam sessies" },
    { naam: "Naam", spec: "Archivo 900 · 19–24px", klasse: "t-naam", tekst: "Mado de Vries" },
    { naam: "Label", spec: "Space Mono 700 · 12px · 0,16em", klasse: "t-label", tekst: "WAT WE DOEN" },
  ];
</script>

<svelte:head>
  <title>Styleguide | Artquake</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<header class="sg-header">
  <a href={base || "/"}><img src={logo} alt="Artquake, naar home" width="406" height="270" /></a>
</header>

<div class="sg">
  <h1 class="sg-titel">Styleguide</h1>
  <p class="sg-intro">
    De huisstijl van de Artquake website: kleuren, typografie, knoppen en
    vaste onderdelen, zoals ze nu op de site staan.
  </p>

  <!-- 01 kleuren -->
  <section class="sg-sectie">
    <h2 class="sg-kop"><span>01</span> Kleuren</h2>
    <ul class="sg-kleuren">
      {#each kleurGroepen as g}
        <li class="sg-kleur">
          <div class="sg-staal">
            {#each g.tinten as t}
              <span style:background={t.hex}></span>
            {/each}
          </div>
          <div class="sg-kleur-info">
            <strong>{g.naam}</strong>
            {#each g.tinten as t}
              <span class="sg-hex">{t.token} · {t.hex}</span>
            {/each}
            <span class="sg-rol">{g.rol}</span>
          </div>
        </li>
      {/each}
    </ul>
  </section>

  <!-- 02 typografie -->
  <section class="sg-sectie">
    <h2 class="sg-kop"><span>02</span> Typografie</h2>
    <div class="sg-typo">
      <div>
        <h3 class="sg-subkop">Titels en koppen</h3>
        <ul class="sg-koppen">
          {#each koppen as k}
            <li>
              <p class={k.klasse}>{k.tekst}</p>
              <span class="sg-spec">{k.naam} · {k.spec}</span>
            </li>
          {/each}
        </ul>
      </div>
      <div>
        <h3 class="sg-subkop">Lopende tekst</h3>
        <p class="t-body">
          Artquake biedt oefenruimtes, organiseert optredens, exposities,
          events, workshops, masterclasses, lessen, coaching en promotie.
        </p>
        <span class="sg-spec">Space Mono 400 · 15px · regelhoogte 1,7</span>
        <p class="t-klein">
          Kleine tekst voor bijschriften en toelichting.
        </p>
        <span class="sg-spec">Space Mono 400 · 13px · regelhoogte 1,6</span>
        <p class="t-body sg-inline">
          <strong>Vet</strong> · <a href="#top">Link</a>
        </p>

        <h3 class="sg-subkop sg-subkop-ruim">Markering in koppen</h3>
        <p class="t-sectie sg-markering">
          Een <span class="m-paars">podium</span>, een
          <span class="m-donkerpaars">netwerk</span> en een
          <span class="m-blok">duw</span>
        </p>
        <span class="sg-spec">Paars woord · donkerpaars woord · oranje blok</span>
      </div>
    </div>
  </section>

  <!-- 03 knoppen -->
  <section class="sg-sectie">
    <h2 class="sg-kop"><span>03</span> Knoppen</h2>
    <div class="sg-knoppen">
      <div class="sg-knop-kolom sg-op-donker">
        <h3 class="sg-subkop">Hoofdknop (paars)</h3>
        <span class="k-paars">Normaal</span>
        <span class="k-paars is-hover">Hover</span>
        <span class="k-paars is-uit">Uitgeschakeld</span>
        <span class="sg-spec">Archivo 800 · 18px · ronding 26px</span>
      </div>
      <div class="sg-knop-kolom sg-op-donker">
        <h3 class="sg-subkop">Tweede knop (crème)</h3>
        <span class="k-creme">Doe mee</span>
        <span class="k-creme is-hover">Hover</span>
        <span class="sg-spec">Archivo 800 · 14px · ronding 26px</span>
      </div>
      <div class="sg-knop-kolom">
        <h3 class="sg-subkop">Overig</h3>
        <span class="k-menu" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="sg-spec">Menuknop · 56px · oranje met zwarte schaduw</span>
        <span class="k-rond" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
        </span>
        <span class="sg-spec">Bladerknop · 52px · rond</span>
        <span class="k-link">Bekijk alle makers</span>
        <span class="sg-spec">Tekstlink · Space Mono 700 · 12px · paarse streep</span>
      </div>
    </div>
  </section>

  <!-- 04 onderdelen -->
  <section class="sg-sectie">
    <h2 class="sg-kop"><span>04</span> Vaste onderdelen</h2>
    <div class="sg-onderdelen">
      <div>
        <h3 class="sg-subkop">Gekleurd vlak achter beeld</h3>
        <div class="sg-vlakken">
          <span class="o-vlak o-paars"></span>
          <span class="o-vlak o-oranje"></span>
          <span class="o-vlak o-creme"></span>
        </div>
        <span class="sg-spec">10–14px naar rechtsonder · paars, oranje of crème</span>
      </div>
      <div>
        <h3 class="sg-subkop">Blokken</h3>
        <div class="sg-blokken">
          <span class="o-blok o-blok-paars">01<b>Blok</b></span>
          <span class="o-blok o-blok-oranje">02<b>Blok</b></span>
          <span class="o-blok o-blok-creme">03<b>Blok</b></span>
        </div>
        <span class="sg-spec">Rechte hoeken · nummer in Space Mono · titel in Archivo 900</span>
      </div>
      <div>
        <h3 class="sg-subkop">Ruimte en lijnen</h3>
        <ul class="sg-maten">
          <li><i style:width="8px"></i>8px</li>
          <li><i style:width="14px"></i>14px</li>
          <li><i style:width="22px"></i>22px</li>
          <li><i style:width="40px"></i>40px</li>
          <li><i style:width="64px"></i>64px</li>
        </ul>
        <span class="sg-spec">Scheidingslijn tussen secties: 4px</span>
      </div>
    </div>
  </section>

  <!-- 05 iconen -->
  <section class="sg-sectie">
    <h2 class="sg-kop"><span>05</span> Iconen en icoonknoppen</h2>
    <div class="sg-iconen">
      <div>
        <span class="k-menu" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="sg-spec">Menu · 56px, mobiel 48px</span>
      </div>
      <div>
        <span class="k-vierkant" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M19 12H6M12 5l-7 7 7 7" /></svg>
        </span>
        <span class="sg-spec">Terug · zelfde knop als het menu</span>
      </div>
      <div>
        <span class="k-vierkant k-vierkant-creme" aria-hidden="true">
          <svg viewBox="0 0 24 24" class="vlak"><rect x="5.5" y="4.5" width="4.5" height="15" /><rect x="14" y="4.5" width="4.5" height="15" /></svg>
        </span>
        <span class="sg-spec">Pauze (hero) · crème</span>
      </div>
      <div>
        <span class="k-kruis" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </span>
        <span class="sg-spec">Sluiten (popup) · alleen het kruisje, klikvlak 48px</span>
      </div>
    </div>
    <h3 class="sg-subkop sg-subkop-ruim">Socials</h3>
    <ul class="sg-socials">
      {#each artiestSocials as x}
        <li>
          <span class="k-social" aria-hidden="true">
            <svg viewBox="0 0 24 24" class:lijn={x.lijn}><path d={x.icoon} /></svg>
          </span>
          <span class="sg-spec">{x.label}</span>
        </li>
      {/each}
    </ul>
    <span class="sg-spec">
      Rond · 48px · zwarte rand · hover: zwart vlak met crème icoon · merkiconen van Simple Icons (CC0)
    </span>
    <span class="sg-spec">Geen emoji's: iconen zijn altijd SVG in de tekstkleur.</span>
  </section>

  <!-- 06 agenda en posters -->
  <section class="sg-sectie">
    <h2 class="sg-kop"><span>06</span> Agenda en posters</h2>
    <h3 class="sg-subkop">Agendaregel</h3>
    <ul class="sg-agenda">
      {#each voorbeeldAgenda as ev}
        {@const kleur = agendaKleur(ev)}
        <li class="o-agenda" style:background={kleur} style:color={agendaTekstKleur(kleur)}>
          <img src={voorbeeldFoto} alt="" />
          <span class="o-agenda-datum">{ev.datum}</span>
          <strong>{ev.naam}</strong>
          <span class="o-agenda-contrast">{ev.type} · {agendaContrast(ev).toFixed(1).replace(".", ",")} : 1</span>
        </li>
      {/each}
    </ul>
    <span class="sg-spec">
      Foto, datum en titel; de rest staat op de pagina van de activiteit · de kleur hoort bij het type
      (in het dashboard aan te passen) · tekst wordt zwart of crème
    </span>
    <span class="sg-spec">
      Contrast tekst/achtergrond minimaal 4,5 : 1 (WCAG); het dashboard waarschuwt bij een te lage waarde
    </span>

    <div class="sg-onderdelen sg-onderdelen-ruim">
      <div>
        <h3 class="sg-subkop">Poster in het menu</h3>
        <div class="o-poster">
          <span class="o-poster-datum">07.11</span>
          <img src={voorbeeldFoto} alt="" />
        </div>
        <span class="sg-spec">Iets scheef (±1,5°) · harde schaduw paars of oranje · oranje datumsticker</span>
      </div>
      <div>
        <h3 class="sg-subkop">3D-effect</h3>
        <figure class="o-3d"><img src={voorbeeldFoto} alt="" /></figure>
        <span class="sg-spec">Zwarte rand 3px · harde schaduw 12px · oranje als de achtergrond donker kan zijn</span>
      </div>
      <div>
        <h3 class="sg-subkop">Prijs</h3>
        <span class="o-prijs">Gratis</span>
        <span class="sg-spec">Gevuld zwart blok · Archivo 800 · alle activiteiten van Artquake zijn gratis</span>
      </div>
    </div>
  </section>
</div>

<style>
  /* logo even groot en op dezelfde plek als op de homepage */
  .sg-header {
    padding: 40px 30px;
    background: var(--color-bg);
  }
  .sg-header img {
    display: block;
    height: 120px;
    width: auto;
  }

  .sg {
    padding: 64px 40px 96px;
    background: var(--color-fg);
    color: var(--color-bg);
    border-bottom: 4px solid var(--color-bg);
  }
  .sg > * {
    max-width: 1080px;
    margin-left: auto;
    margin-right: auto;
  }
  .sg-titel {
    margin-top: 0;
    margin-bottom: 12px;
    font-weight: 900;
    font-stretch: 118%;
    font-size: clamp(34px, 5vw, 64px);
    line-height: 0.95;
    letter-spacing: -0.03em;
    text-transform: uppercase;
  }
  .sg-intro {
    margin-top: 0;
    margin-bottom: 0;
    font: 400 15px/1.7 var(--font-mono);
  }
  .sg-intro,
  .sg-titel {
    max-width: 1080px;
  }

  .sg-sectie {
    margin-top: 72px;
  }
  .sg-kop {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin: 0 0 28px;
    padding-bottom: 14px;
    border-bottom: 1px solid color-mix(in srgb, var(--color-bg) 20%, transparent);
    font-weight: 500;
    font-size: 26px;
  }
  .sg-kop span {
    font: 400 12px/1 var(--font-mono);
    color: var(--color-muted);
  }
  .sg-subkop {
    margin: 0 0 18px;
    font-weight: 600;
    font-size: 15px;
  }
  .sg-subkop-ruim {
    margin-top: 40px;
  }
  .sg-spec {
    display: block;
    margin-top: 6px;
    font: 400 11px/1.4 var(--font-mono);
    color: var(--color-gray-400);
  }

  /* kleuren */
  .sg-kleuren {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 16px;
  }
  .sg-kleur {
    background: var(--color-white);
  }
  .sg-staal {
    display: flex;
    height: 96px;
  }
  .sg-staal span {
    flex: 1;
  }
  .sg-kleur-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 14px 16px 16px;
  }
  .sg-kleur-info strong {
    font-size: 15px;
  }
  .sg-hex {
    font: 400 11px/1.4 var(--font-mono);
    color: var(--color-gray-400);
  }
  .sg-rol {
    font-size: 12px;
    color: var(--color-gray-400);
  }

  /* typografie */
  .sg-typo {
    display: grid;
    grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
    gap: 56px;
  }
  .sg-koppen {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 22px;
  }
  .sg-koppen p {
    margin: 0;
    text-transform: uppercase;
  }
  .t-hero {
    font-weight: 900;
    font-stretch: 125%;
    font-size: clamp(46px, 9vw, 132px);
    line-height: 0.86;
    letter-spacing: -0.035em;
  }
  .t-pagina {
    font-weight: 900;
    font-stretch: 118%;
    font-size: clamp(26px, 8.4vw, 92px);
    line-height: 0.9;
    letter-spacing: -0.03em;
  }
  .t-sectie {
    font-weight: 900;
    font-stretch: 115%;
    font-size: clamp(34px, 4.6vw, 64px);
    line-height: 0.92;
    letter-spacing: -0.03em;
  }
  .t-blok {
    font-weight: 900;
    font-stretch: 118%;
    font-size: 40px;
    line-height: 0.9;
  }
  .t-naam {
    font-weight: 900;
    font-stretch: 110%;
    font-size: clamp(19px, 1.6vw, 24px);
    line-height: 1.05;
    text-transform: none !important;
  }
  .t-label {
    font: 700 12px/1 var(--font-mono);
    letter-spacing: 0.16em;
  }
  .t-body {
    margin: 0;
    font: 400 15px/1.7 var(--font-mono);
  }
  .t-klein {
    margin: 22px 0 0;
    font: 400 13px/1.6 var(--font-mono);
  }
  .sg-inline {
    margin-top: 22px;
  }
  .sg-inline a {
    color: var(--color-primary);
  }
  .sg-markering {
    margin: 0;
    font-size: clamp(24px, 2.6vw, 34px);
    line-height: 1.05;
    text-transform: uppercase;
  }
  .m-paars {
    color: var(--color-primary);
  }
  .m-donkerpaars {
    color: var(--color-primary-dark);
  }
  .m-blok {
    background: var(--color-accent);
    padding: 0 8px;
  }

  /* knoppen */
  .sg-knoppen {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }
  .sg-knop-kolom {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
    padding: 24px;
    background: var(--color-white);
  }
  .sg-op-donker {
    background: var(--color-bg);
    color: var(--color-fg);
  }
  .sg-op-donker .sg-spec {
    color: var(--color-muted);
  }
  .sg-knop-kolom .sg-subkop {
    margin-bottom: 4px;
  }
  .k-paars {
    align-self: stretch;
    padding: 16px;
    border-radius: 26px;
    background: var(--color-primary);
    color: var(--color-fg);
    text-align: center;
    font: 800 18px/1 var(--font-display);
  }
  .k-paars.is-hover {
    background: var(--color-primary-dark);
  }
  .k-paars.is-uit {
    opacity: 0.6;
  }
  .k-creme {
    padding: 14px 32px;
    border-radius: 26px;
    background: var(--color-fg);
    color: var(--color-bg);
    font: 800 14px/1 var(--font-display);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .k-creme.is-hover {
    opacity: 0.8;
  }
  .k-menu {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
    width: 56px;
    height: 56px;
    padding: 0 14px;
    background: var(--color-accent);
    border: 3px solid var(--color-bg);
    box-shadow: 4px 4px 0 var(--color-bg);
  }
  .k-menu i {
    display: block;
    height: 3px;
    background: var(--color-bg);
  }
  .k-menu i:nth-child(2) {
    width: 70%;
  }
  .k-rond {
    display: grid;
    place-items: center;
    width: 52px;
    height: 52px;
    margin-top: 10px;
    border-radius: 50%;
    background: var(--color-accent);
  }
  .k-rond svg {
    width: 22px;
    height: 22px;
    fill: none;
    stroke: var(--color-bg);
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .k-link {
    margin-top: 10px;
    padding-bottom: 3px;
    border-bottom: 2px solid var(--color-primary);
    font: 700 12px/1 var(--font-mono);
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  /* onderdelen */
  .sg-onderdelen {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 40px;
  }
  .sg-vlakken,
  .sg-blokken {
    display: flex;
    gap: 22px;
    margin-bottom: 20px;
  }
  .o-vlak {
    flex: 1;
    aspect-ratio: 4 / 5;
    background: var(--color-gray-900);
    box-shadow: 10px 10px 0 var(--color-primary);
  }
  .o-oranje {
    box-shadow: 10px 10px 0 var(--color-accent);
  }
  .o-creme {
    box-shadow: 10px 10px 0 var(--color-fg);
    outline: 1px solid color-mix(in srgb, var(--color-bg) 12%, transparent);
  }
  .sg-blokken {
    gap: 10px;
  }
  .o-blok {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    aspect-ratio: 1;
    padding: 12px;
    font: 700 11px/1 var(--font-mono);
    letter-spacing: 0.14em;
  }
  .o-blok b {
    font: 900 20px/0.9 var(--font-display);
    letter-spacing: 0;
    text-transform: uppercase;
  }
  .o-blok-paars {
    background: var(--color-primary);
    color: var(--color-fg);
  }
  .o-blok-oranje {
    background: var(--color-accent);
  }
  .o-blok-creme {
    background: var(--color-fg);
    outline: 1px solid color-mix(in srgb, var(--color-bg) 12%, transparent);
  }
  .sg-maten {
    list-style: none;
    margin: 0 0 20px;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    font: 400 12px/1 var(--font-mono);
  }
  .sg-maten li {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .sg-maten i {
    display: block;
    height: 14px;
    background: var(--color-primary);
  }

  /* iconen */
  .sg-iconen {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 28px;
  }
  .k-vierkant {
    display: grid;
    place-items: center;
    width: 56px;
    height: 56px;
    background: var(--color-accent);
    border: 3px solid var(--color-bg);
    box-shadow: 4px 4px 0 var(--color-bg);
  }
  .k-vierkant-creme {
    background: var(--color-fg);
  }
  .k-vierkant svg,
  .k-kruis svg {
    width: 26px;
    height: 26px;
    fill: none;
    stroke: var(--color-bg);
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .k-vierkant svg.vlak {
    fill: var(--color-bg);
    stroke: none;
  }
  .k-kruis {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
  }
  .sg-socials {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
    margin: 0 0 12px;
    padding: 0;
    list-style: none;
  }
  .sg-socials li {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .k-social {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    border: 2px solid var(--color-bg);
    border-radius: 50%;
  }
  .k-social svg {
    width: 22px;
    height: 22px;
    fill: var(--color-bg);
  }
  .k-social svg.lijn {
    fill: none;
    stroke: var(--color-bg);
    stroke-width: 2;
    stroke-linecap: round;
  }

  /* agenda en posters */
  .sg-agenda {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0 0 12px;
    padding: 0;
    list-style: none;
  }
  .o-agenda {
    display: grid;
    grid-template-columns: 64px 80px minmax(0, 1fr) auto;
    align-items: center;
    gap: 18px;
    padding: 10px 18px 10px 10px;
  }
  .o-agenda img {
    width: 64px;
    height: 64px;
    object-fit: cover;
  }
  .o-agenda-datum {
    font: 700 26px/1 var(--font-display);
  }
  .o-agenda strong {
    font-weight: 900;
    font-stretch: 110%;
    font-size: 22px;
    line-height: 1;
  }
  .o-agenda-contrast {
    font: 700 11px/1 var(--font-mono);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .sg-onderdelen-ruim {
    margin-top: 48px;
  }
  .o-poster {
    position: relative;
    width: 150px;
    margin-bottom: 20px;
    border: 3px solid var(--color-bg);
    box-shadow: 6px 6px 0 var(--color-primary);
    transform: rotate(-1.5deg);
  }
  .o-poster img {
    display: block;
    width: 100%;
    aspect-ratio: 3 / 4;
    object-fit: cover;
  }
  .o-poster-datum {
    position: absolute;
    top: 8px;
    left: 8px;
    padding: 5px 8px;
    background: var(--color-accent);
    font: 700 12px/1 var(--font-mono);
    letter-spacing: 0.06em;
  }
  .o-3d {
    width: 200px;
    margin: 0 12px 24px 0;
    border: 3px solid var(--color-bg);
    box-shadow: 12px 12px 0 var(--color-accent);
  }
  .o-3d img {
    display: block;
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
  }
  .o-prijs {
    display: inline-block;
    margin-bottom: 14px;
    padding: 12px 18px;
    background: var(--color-bg);
    color: var(--color-fg);
    font: 800 20px/1 var(--font-display);
    text-transform: uppercase;
  }

  @media (max-width: 900px) {
    .sg-typo,
    .sg-knoppen,
    .sg-onderdelen {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 640px) {
    .sg-header,
    .sg {
      padding-left: 20px;
      padding-right: 20px;
    }
    .sg-header {
      padding: 28px 16px;
    }
    .sg-header img {
      height: 92px;
    }
    .o-agenda {
      grid-template-columns: 64px minmax(0, 1fr);
    }
    .o-agenda img {
      grid-row: span 3;
    }
  }
</style>
