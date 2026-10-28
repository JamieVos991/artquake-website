<script>
  import { onMount, tick } from "svelte";
  import DeelVoorbeeld from "$lib/components/DeelVoorbeeld.svelte";
  import { base } from "$app/paths";
  import logo from "$lib/assets/artquake-logo.avif";
  import { haalCollectieOp } from "$lib/publiekeData.js";
  import { artiestFotoPositie, artiestFotoZoom } from "$lib/data/fotoPosities.js";
  import { socialsVan } from "$lib/data/socials.js";
  import { artiestSlug, vindArtiestBijSlug } from "$lib/data/artiestLink.js";
  import { afterNavigate, replaceState } from "$app/navigation";
  import { bewaarInvoer } from "$lib/bewaardeInvoer.svelte.js";
  import { artiestZichtbaar } from "$lib/data/artiestZichtbaar.js";

  const bgVolgorde = ["dark", "purple", "orange", "cream"];

  // kleur van het PODIUM/EXPO-label, passend bij de kleur van de kaart
  const badgeVolgorde = {
    dark: "orange",
    purple: "cream",
    orange: "dark",
    cream: "purple",
  };

  const stapGrootte = 10;
  const filters = ["ALLE", "EXPO", "PODIUM"];

  let artiesten = $state([]);
  let geladen = $state(false);
  let zichtbaarAantal = $state(stapGrootte);
  let actieveFilter = $state("ALLE");
  let zoekterm = $state("");
  let zoekVeld = $state();

  let gefilterdeArtiesten = $derived.by(() => {
    const zoek = zoekterm.trim().toLowerCase();
    return artiesten.filter(
      (a) =>
        (actieveFilter === "ALLE" ||
          (a.type ?? "").toUpperCase() === actieveFilter) &&
        // zoekt in naam en omschrijving (bv. "band" of "singer-songwriter")
        (!zoek ||
          a.naam.toLowerCase().includes(zoek) ||
          (a.beschrijving ?? "").toLowerCase().includes(zoek))
    );
  });
  let getoondeArtiesten = $derived(gefilterdeArtiesten.slice(0, zichtbaarAantal));

  // zoekterm en filter blijven staan na verversen
  bewaarInvoer(
    "artiesten-zoeken",
    () => ({ zoekterm, actieveFilter }),
    (x) => {
      zoekterm = x.zoekterm ?? "";
      if (filters.includes(x.actieveFilter)) actieveFilter = x.actieveFilter;
    }
  );

  function kiesFilter(f) {
    actieveFilter = f;
    zichtbaarAantal = stapGrootte;
  }

  // popup met meer over de artiest (native <dialog>: Escape sluit, focus blijft erin)
  let dialoog = $state();
  let gekozen = $state(null);
  let opener = null;
  const alineas = (tekst) =>
    (tekst ?? "").split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
  let gekozenSocials = $derived(gekozen ? socialsVan(gekozen) : []);

  // knop "kopieer link": de eigen link van de artiest (/artiesten#naam)
  let linkGekopieerd = $state(false);
  let kopieerTimer;
  async function kopieerArtiestLink() {
    const link = `${location.origin}${base}/artiesten#${artiestSlug(gekozen)}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // oudere browsers of geen toestemming: via een tijdelijk tekstveld
      const veld = Object.assign(document.createElement("textarea"), { value: link });
      dialoog.append(veld);
      veld.select();
      document.execCommand("copy");
      veld.remove();
    }
    linkGekopieerd = true;
    clearTimeout(kopieerTimer);
    kopieerTimer = setTimeout(() => (linkGekopieerd = false), 2000);
  }

  async function openArtiest(a, e) {
    opener = e?.currentTarget ?? null;
    gekozen = a;
    await tick();
    if (!dialoog.open) dialoog.showModal();
    // eigen link in de adresbalk, bv. /artiesten#leech (zonder extra stap in de geschiedenis)
    replaceState(`#${artiestSlug(a)}`, {});
  }
  function sluitArtiest() {
    dialoog.close();
    naSluiten();
  }
  // via de knop/achtergrond (hierboven) en via Escape (close-event);
  // kan dus twee keer lopen, de tweede keer doet niets
  function naSluiten() {
    opener?.focus();
    opener = null;
    if (location.hash) replaceState(location.pathname + location.search, {});
  }

  // Binnenkomen via een link met #naam: popup van die artiest openen
  // zodra de artiesten geladen zijn.
  let wachtendeHash = "";
  function openUitHash(hash) {
    const a = vindArtiestBijSlug(artiesten, hash);
    if (a) openArtiest(a);
  }
  afterNavigate(({ to }) => {
    const hash = to?.url.hash ?? "";
    if (!hash) return;
    if (geladen) openUitHash(hash);
    else wachtendeHash = hash;
  });

  function laadMeer() {
    zichtbaarAantal += stapGrootte;
  }

  onMount(() => {
    haalCollectieOp("artiesten")
      .then((docs) => {
        artiesten = docs.filter(artiestZichtbaar).sort(() => Math.random() - 0.5);
        if (wachtendeHash) openUitHash(wachtendeHash);
      })
      .catch(() => {})
      .finally(() => (geladen = true));
  });
</script>

<svelte:head>
  <title>Artiesten | Artquake</title>
  <meta
    name="description"
    content="Ontdek de jonge makers van Artquake: bands, singer-songwriters, dansers, DJ's en beeldend kunstenaars uit Dijk & Waard en omgeving. Ook te boeken voor je event."
  />
</svelte:head>

<DeelVoorbeeld
  titel="Artiesten | Artquake"
  beschrijving="Ontdek de jonge makers van Artquake: bands, singer-songwriters, dansers, DJ's en beeldend kunstenaars uit Dijk & Waard en omgeving. Ook te boeken voor je event."
  afbeelding="artiesten"
/>

<header class="ap-header">
  <a class="ap-brand" href={base || "/"}>
    <img class="ap-logo" src={logo} alt="Artquake, naar home" width="406" height="270" />
  </a>
</header>

<section class="ap-intro">
  <h1 class="ap-title">JONG TALENT<br /><em>AAN HET WOORD.</em></h1>
</section>

<section class="ap-section" aria-label="Alle artiesten">
  <header class="ap-section-head">
    <h2 class="ap-section-eyebrow">ALLE ARTIESTEN</h2>
    <span class="ap-section-rule"></span>
    <!-- geen zichtbaar aantal; schermlezers horen wel hoeveel resultaten er zijn na zoeken of filteren -->
    <span class="ap-visueel-verborgen" aria-live="polite"
      >{gefilterdeArtiesten.length} {gefilterdeArtiesten.length === 1 ? "resultaat" : "resultaten"}</span
    >
  </header>

  <div class="ap-balk">
    <fieldset class="ap-filters">
      <legend class="ap-visueel-verborgen">Filter op categorie</legend>
      {#each filters as f}
        <button
          type="button"
          class="ap-filter"
          class:is-active={actieveFilter === f}
          aria-pressed={actieveFilter === f}
          onclick={() => kiesFilter(f)}
        >
          {f}
        </button>
      {/each}
    </fieldset>

    <search class="ap-zoek">
      <label class="ap-visueel-verborgen" for="artiest-zoek">Zoek een artiest</label>
      <svg class="ap-zoek-icoon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="M15.5 15.5 21 21" />
      </svg>
      <input
        id="artiest-zoek"
        type="search"
        placeholder="ZOEK EEN ARTIEST"
        autocomplete="off"
        bind:this={zoekVeld}
        bind:value={zoekterm}
        oninput={() => (zichtbaarAantal = stapGrootte)}
      />
      {#if zoekterm}
        <button
          type="button"
          class="ap-zoek-wis"
          aria-label="Zoekopdracht wissen"
          onclick={() => {
            zoekterm = "";
            zichtbaarAantal = stapGrootte;
            zoekVeld?.focus();
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      {/if}
    </search>
  </div>

  {#if !geladen}
    <ul class="ap-grid" aria-hidden="true">
      {#each Array(6) as _, i}
        <li class="ap-card ap-skel-card">
          <div class="ap-skel ap-skel-photo"></div>
          <div class="ap-skel ap-skel-line ap-skel-name"></div>
          <div class="ap-skel ap-skel-line ap-skel-desc"></div>
        </li>
      {/each}
    </ul>
  {:else if artiesten.length === 0}
    <p class="ap-empty">Binnenkort meer artiesten.</p>
  {:else if gefilterdeArtiesten.length === 0}
    <p class="ap-empty">
      {zoekterm.trim()
        ? `Geen artiesten gevonden voor "${zoekterm.trim()}".`
        : "Geen artiesten in deze categorie."}
    </p>
  {:else}
    <ul class="ap-grid">
      {#each getoondeArtiesten as a, i (a.id)}
        {@const bg = bgVolgorde[i % bgVolgorde.length]}
        <li class="ap-card ap-card-klik bg-{bg}">
          <figure class="ap-photo">
            {#if a.imageUrl}
              <img
                class="ap-img"
                src={a.imageUrl}
                alt=""
                loading="lazy"
                style:object-position={artiestFotoPositie(a)}
                style:transform={artiestFotoZoom(a)}
              />
            {:else}
              <figcaption>[ ARTIESTFOTO<br />1200×1500 ]</figcaption>
            {/if}
            {#if a.type}
              <span class="ap-badge badge-{badgeVolgorde[bg]}">{a.type}</span>
            {/if}
          </figure>
          <h3 class="ap-name" style:--tekens={a.naam.length}>
            <!-- de knop ligt (onzichtbaar) over de hele kaart -->
            <button type="button" class="ap-open" aria-haspopup="dialog" onclick={(e) => openArtiest(a, e)}
              >{a.naam}</button
            >
          </h3>
          {#if a.beschrijving}
            <p class="ap-desc">{a.beschrijving}</p>
          {/if}
        </li>
      {/each}
    </ul>

    {#if zichtbaarAantal < gefilterdeArtiesten.length}
      <button class="ap-load-more" type="button" onclick={laadMeer}
        >LAAD MEER</button
      >
    {/if}
  {/if}
</section>

<dialog
  class="ap-dialoog"
  bind:this={dialoog}
  aria-labelledby="ap-dialoog-naam"
  onclose={naSluiten}
  onclick={(e) => e.target === dialoog && sluitArtiest()}
>
  {#if gekozen}
    <div class="ap-dialoog-binnen">
      <button type="button" class="ap-sluit" aria-label="Sluiten" onclick={sluitArtiest}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
      <!-- links: foto met de socials eronder; blijft staan als de tekst lang is -->
      <div class="ap-dialoog-zij">
        <figure class="ap-dialoog-foto">
          {#if gekozen.imageUrl}
            <img
              src={gekozen.imageUrl}
              alt=""
              style:object-position={artiestFotoPositie(gekozen)}
              style:transform={artiestFotoZoom(gekozen)}
            />
          {/if}
        </figure>
        <div class="ap-dialoog-volg">
          {#if gekozenSocials.length}
            <h3 class="ap-dialoog-kop">VOLG {gekozen.naam.toUpperCase()}</h3>
          {/if}
          <!-- socials en de kopieerknop op één rij -->
          <div class="ap-volg-rij">
          {#if gekozenSocials.length}
            <ul class="ap-socials">
              {#each gekozenSocials as x}
                <li>
                  <a href={x.href} target="_blank" rel="noopener noreferrer" title={x.label}>
                    <svg viewBox="0 0 24 24" class:ap-icoon-lijn={x.lijn} aria-hidden="true" focusable="false"
                      ><path d={x.icoon} /></svg
                    >
                    <span class="ap-visueel-verborgen">{x.label} (opent in een nieuw tabblad)</span>
                  </a>
                </li>
              {/each}
            </ul>
          {/if}
          <button type="button" class="ap-kopieer" onclick={kopieerArtiestLink}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              {#if linkGekopieerd}
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              {:else}
                <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2" />
                <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2" />
              {/if}
            </svg>
            <span aria-live="polite">{linkGekopieerd ? "LINK GEKOPIEERD" : "KOPIEER LINK"}</span>
          </button>
          </div>
        </div>
      </div>
      <div class="ap-dialoog-tekst">
        <h2 class="ap-dialoog-naam" id="ap-dialoog-naam" style:--tekens={gekozen.naam.length}>{gekozen.naam}</h2>
        {#if gekozen.beschrijving}
          <p class="ap-dialoog-soort">{gekozen.beschrijving}</p>
        {/if}
        {#each alineas(gekozen.bio) as alinea}
          <p class="ap-dialoog-bio">{alinea}</p>
        {:else}
          <p class="ap-dialoog-bio">Meer over {gekozen.naam} volgt binnenkort.</p>
        {/each}
      </div>
    </div>
  {/if}
</dialog>

<style>
  /* header */
  .ap-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    /* logo even groot en op dezelfde plek als op de homepage */
    padding: 40px 30px;
    background: var(--color-bg);
  }
  .ap-brand {
    display: block;
  }
  .ap-logo {
    height: 120px;
    width: auto;
    display: block;
  }
  /* intro */
  .ap-intro {
    background: var(--color-bg);
    color: var(--color-fg);
    padding: 20px 40px 64px;
  }
  .ap-title {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 900;
    font-stretch: 110%;
    font-size: clamp(44px, 7vw, 92px);
    line-height: 0.9;
    letter-spacing: -0.03em;
    text-transform: uppercase;
  }
  .ap-title em {
    color: var(--color-primary-light);
    font-style: normal;
  }

  /* section */
  .ap-section {
    background: var(--color-fg);
    padding: 48px 40px 72px;
  }
  .ap-section-head {
    display: flex;
    align-items: baseline;
    gap: 16px;
    padding: 0 8px 26px;
    color: var(--color-bg);
  }
  .ap-section-eyebrow {
    margin: 0;
    font: 700 12px/1 var(--font-mono);
    letter-spacing: 0.16em;
    color: var(--color-primary);
  }
  .ap-section-rule {
    flex: 1;
    height: 2px;
    background: var(--color-bg);
  }

  /* fieldset zonder de standaard rand en ruimte van de browser */
  /* filters links, zoeken rechts; op een smal scherm onder elkaar */
  .ap-balk {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 14px 24px;
    padding: 0 8px 32px;
  }
  .ap-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    min-width: 0;
    margin: 0;
    border: 0;
    padding: 0;
  }
  .ap-filter {
    padding: 10px 22px;
    border: 1.5px solid var(--color-bg);
    border-radius: 26px;
    background: transparent;
    color: var(--color-bg);
    font: 700 12px/1 var(--font-mono);
    letter-spacing: 0.1em;
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s;
  }
  .ap-filter:hover {
    opacity: 0.75;
  }
  .ap-filter.is-active {
    background: var(--color-bg);
    color: var(--color-fg);
  }
  /* zoekveld: zwarte pil met oranje vergrootglas, paarse schaduw bij focus */
  .ap-zoek {
    position: relative;
    display: flex;
    align-items: center;
    flex: 1 1 260px;
    max-width: 380px;
  }
  .ap-zoek-icoon {
    position: absolute;
    left: 18px;
    width: 18px;
    height: 18px;
    fill: none;
    stroke: var(--color-accent);
    stroke-width: 2.5;
    stroke-linecap: round;
    pointer-events: none;
  }
  .ap-zoek input {
    width: 100%;
    height: 48px;
    padding: 0 48px 0 48px;
    border: 2px solid var(--color-bg);
    border-radius: 26px;
    background: var(--color-bg);
    color: var(--color-fg);
    font: 700 13px/1 var(--font-mono);
    letter-spacing: 0.08em;
    transition: box-shadow 0.15s;
  }
  .ap-zoek input::placeholder {
    color: var(--color-gray-300);
  }
  /* het eigen wis-kruisje van de browser; we hebben een eigen knop */
  .ap-zoek input::-webkit-search-cancel-button {
    appearance: none;
  }
  .ap-zoek input:focus {
    outline: none;
    box-shadow: 5px 5px 0 var(--color-primary);
  }
  .ap-zoek-wis {
    position: absolute;
    right: 8px;
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: var(--color-accent);
    cursor: pointer;
  }
  .ap-zoek-wis svg {
    width: 16px;
    height: 16px;
    fill: none;
    stroke: var(--color-bg);
    stroke-width: 2.5;
    stroke-linecap: round;
  }
  .ap-zoek-wis:hover {
    background: var(--color-fg);
  }
  .ap-zoek-wis:focus-visible {
    outline: 2px solid var(--color-fg);
    outline-offset: 2px;
  }
  .ap-visueel-verborgen {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  .ap-empty {
    padding: 40px 8px;
    text-align: center;
    font: 400 14px/1.6 var(--font-mono);
    color: var(--color-bg);
    opacity: 0.7;
  }

  /* grid */
  .ap-grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 18px;
  }
  .ap-card {
    /* de naam schaalt mee met de breedte van de kaart (cqi) */
    container-type: inline-size;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .ap-card.bg-cream {
    border: 1px solid var(--color-bg);
  }
  .bg-dark {
    background: var(--color-bg);
    color: var(--color-fg);
  }
  .bg-cream {
    background: var(--color-fg);
    color: var(--color-bg);
  }
  .bg-orange {
    background: var(--color-accent);
    color: var(--color-bg);
  }
  .bg-purple {
    background: var(--color-primary);
    color: var(--color-fg);
  }

  .ap-photo {
    position: relative;
    height: 280px;
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: repeating-linear-gradient(
      45deg,
      color-mix(in srgb, var(--color-bg) 16%, transparent) 0 12px,
      color-mix(in srgb, var(--color-bg) 6%, transparent) 12px 24px
    );
    overflow: hidden;
  }
  .bg-dark .ap-photo {
    background: repeating-linear-gradient(
      45deg,
      var(--color-gray-800) 0 12px,
      var(--color-gray-900) 12px 24px
    );
  }
  .bg-purple .ap-photo {
    background: repeating-linear-gradient(
      45deg,
      color-mix(in srgb, var(--color-bg) 22%, transparent) 0 12px,
      color-mix(in srgb, var(--color-bg) 8%, transparent) 12px 24px
    );
  }
  .ap-img,
  .ap-dialoog-foto img {
    transform-origin: 50% 100%;
  }
  .ap-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .ap-photo figcaption {
    font: 400 11px/1.4 var(--font-mono);
    text-align: center;
    letter-spacing: 0.08em;
    padding: 0 12px;
  }

  .ap-badge {
    position: absolute;
    top: 12px;
    left: 12px;
    padding: 6px 12px;
    font: 700 11px/1 var(--font-mono);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    border-radius: 4px;
  }
  .badge-dark {
    background: var(--color-bg);
    color: var(--color-fg);
  }
  .badge-cream {
    background: var(--color-fg);
    color: var(--color-bg);
  }
  .badge-orange {
    background: var(--color-accent);
    color: var(--color-bg);
  }
  .badge-purple {
    background: var(--color-primary);
    color: var(--color-fg);
  }

  .ap-name {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 900;
    font-stretch: 110%;
    /* past de hele naam op 1 regel: één teken is ongeveer 0,78em breed.
       Korte namen 26px, lange kleiner, nooit kleiner dan 16px. */
    font-size: clamp(16px, calc(100cqi / (var(--tekens, 12) * 0.78)), 26px);
    line-height: 1.1;
    /* extra ruimte zodat voor- en achternaam niet als één woord lezen */
    word-spacing: 0.3em;
    text-transform: uppercase;
    overflow-wrap: break-word;
  }
  .ap-desc {
    /* dichter onder de naam: de kaart heeft 10px tussenruimte, hier 4px */
    margin: -6px 0 0;
    font: 400 13px/1.5 var(--font-mono);
  }
  /* klikbare kaart: de knop in de naam ligt over de hele kaart */
  .ap-card-klik {
    position: relative;
    transition:
      transform 0.15s,
      box-shadow 0.15s;
  }
  .ap-card-klik:hover,
  .ap-card-klik:has(.ap-open:focus-visible) {
    transform: translate(-3px, -3px);
    box-shadow: 6px 6px 0 var(--color-bg);
  }
  .ap-card-klik.bg-dark:hover,
  .ap-card-klik.bg-dark:has(.ap-open:focus-visible) {
    box-shadow: 6px 6px 0 var(--color-primary);
  }
  .ap-card-klik:has(.ap-open:focus-visible) {
    outline: 3px solid var(--color-accent);
    outline-offset: 3px;
  }
  .ap-open {
    all: unset;
    cursor: pointer;
  }
  .ap-open::after {
    content: "";
    position: absolute;
    inset: 0;
  }
  @media (prefers-reduced-motion: reduce) {
    .ap-card-klik {
      transition: none;
    }
    .ap-card-klik:hover,
    .ap-card-klik:has(.ap-open:focus-visible) {
      transform: none;
    }
  }

  /* popup */
  :global(html:has(.ap-dialoog[open])) {
    overflow: hidden;
  }
  .ap-dialoog {
    width: min(940px, calc(100% - 32px));
    max-width: none;
    max-height: calc(100dvh - 48px);
    padding: 0;
    border: 3px solid var(--color-bg);
    background: var(--color-fg);
    color: var(--color-bg);
    box-shadow: 14px 14px 0 var(--color-primary);
    overflow: auto;
  }
  .ap-dialoog::backdrop {
    background: color-mix(in srgb, var(--color-bg) 80%, transparent);
  }
  .ap-dialoog[open] {
    animation: ap-in 0.2s ease-out;
  }
  @keyframes ap-in {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .ap-dialoog[open] {
      animation: none;
    }
  }
  .ap-dialoog-binnen {
    position: relative;
    display: grid;
    /* foto smal links, tekst krijgt de meeste ruimte */
    grid-template-columns: minmax(0, 320px) minmax(0, 1fr);
    align-items: start;
  }
  /* linkerkolom schuift mee tot bovenaan en blijft dan staan (de popup scrolt zelf) */
  .ap-dialoog-zij {
    position: sticky;
    top: 0;
    display: flex;
    flex-direction: column;
    gap: 28px;
    padding: 32px 0 32px 32px;
  }
  .ap-dialoog-volg {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .ap-sluit {
    position: absolute;
    top: 14px;
    right: 14px;
    z-index: 2;
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    padding: 0;
    /* alleen het kruisje, zonder vlak eromheen (de knop blijft 48px groot om op te tikken) */
    background: none;
    border: 0;
    color: var(--color-bg);
    cursor: pointer;
  }
  .ap-sluit:hover {
    color: var(--color-primary);
  }
  .ap-sluit:focus-visible {
    outline: 3px solid var(--color-accent);
    outline-offset: -3px;
  }
  .ap-sluit svg {
    width: 26px;
    height: 26px;
    fill: none;
    stroke: currentColor;
    stroke-width: 3;
    stroke-linecap: round;
  }
  .ap-dialoog-foto {
    position: relative;
    /* ingelijst: kleiner dan de tekstkolom, dus los met rand en schaduw */
    margin: 0 8px 8px 0;
    aspect-ratio: 4 / 5;
    background: var(--color-bg);
    border: 3px solid var(--color-bg);
    box-shadow: 8px 8px 0 var(--color-accent);
    overflow: hidden;
  }
  .ap-dialoog-foto img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  /* overal dezelfde ruimte tussen titels en teksten (alleen gap, geen marges) */
  .ap-dialoog-tekst {
    container-type: inline-size;
    display: flex;
    flex-direction: column;
    gap: 16px;
    /* boven ruimte voor het kruisje */
    padding: 76px 44px 44px;
  }
  .ap-dialoog-naam {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 900;
    font-stretch: 110%;
    font-size: clamp(22px, calc(100cqi / (var(--tekens, 12) * 0.78)), 44px);
    line-height: 1;
    word-spacing: 0.3em;
    text-transform: uppercase;
    overflow-wrap: break-word;
  }
  .ap-dialoog-soort {
    margin: 0 0 8px;
    color: var(--color-primary);
    font: 700 14px/1.4 var(--font-mono);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .ap-dialoog-bio {
    margin: 0;
    font: 400 16px/1.65 var(--font-mono);
  }
  .ap-dialoog-kop {
    margin: 0;
    font: 700 12px/1 var(--font-mono);
    letter-spacing: 0.16em;
    color: var(--color-primary);
  }
  .ap-socials {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  /* ronde knop met alleen het icoon; de naam staat er onzichtbaar bij voor schermlezers */
  .ap-socials a {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    border: 2px solid var(--color-bg);
    border-radius: 50%;
    color: var(--color-bg);
  }
  .ap-socials a:hover {
    background: var(--color-bg);
    color: var(--color-fg);
  }
  .ap-socials a:focus-visible {
    outline: 3px solid var(--color-accent);
    outline-offset: 2px;
  }
  .ap-socials svg {
    width: 22px;
    height: 22px;
    fill: currentColor;
  }
  .ap-volg-rij {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }
  /* zelfde rand als de socials, maar met tekst erbij */
  .ap-kopieer {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-height: 48px;
    padding: 0 18px 0 14px;
    background: none;
    border: 2px solid var(--color-bg);
    border-radius: 999px;
    color: var(--color-bg);
    font: 700 12px/1 var(--font-mono);
    letter-spacing: 0.14em;
    cursor: pointer;
  }
  .ap-kopieer:hover {
    background: var(--color-bg);
    color: var(--color-fg);
  }
  .ap-kopieer:focus-visible {
    outline: 3px solid var(--color-accent);
    outline-offset: 2px;
  }
  .ap-kopieer svg {
    width: 20px;
    height: 20px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .ap-socials svg.ap-icoon-lijn {
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
  }

  .ap-load-more {
    display: block;
    margin: 36px auto 0;
    padding: 14px 32px;
    background: var(--color-bg);
    color: var(--color-fg);
    border: none;
    border-radius: 26px;
    font: 800 14px/1 var(--font-display);
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .ap-load-more:hover {
    opacity: 0.8;
  }

  /* skeleton loader */
  .ap-skel-card {
    background: var(--color-gray-900);
    cursor: default;
  }
  .ap-skel {
    background: linear-gradient(90deg, var(--color-gray-800) 25%, var(--color-gray-700) 37%, var(--color-gray-800) 63%);
    background-size: 400% 100%;
    border-radius: 4px;
    animation: ap-shimmer 1.4s ease infinite;
  }
  .ap-skel-photo {
    height: 280px;
  }
  .ap-skel-line {
    height: 14px;
  }
  .ap-skel-name {
    width: 60%;
    height: 22px;
  }
  .ap-skel-desc {
    width: 85%;
  }
  @keyframes ap-shimmer {
    0% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0 50%;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .ap-skel {
      animation: none;
    }
  }

  /* responsive */
  @media (max-width: 640px) {
    .ap-intro,
    .ap-section {
      padding-left: 20px;
      padding-right: 20px;
    }
    .ap-header {
      padding: 28px 16px;
    }
    .ap-logo {
      height: 92px;
    }
    .ap-grid {
      grid-template-columns: 1fr;
    }
    .ap-zoek {
      flex-basis: 100%;
      max-width: none;
    }
  }
  /* popup onder elkaar: foto boven, tekst eronder */
  @media (max-width: 720px) {
    .ap-dialoog-binnen {
      grid-template-columns: 1fr;
    }
    /* de linkerkolom valt weg: foto bovenaan, socials onder de tekst */
    .ap-dialoog-zij {
      display: contents;
    }
    .ap-dialoog-volg {
      order: 1;
      padding: 0 20px 28px;
    }
    /* ingelijst met ruimte eromheen, net als op een groot scherm */
    .ap-dialoog-foto {
      aspect-ratio: 4 / 3;
      max-height: 36dvh;
      min-height: 0;
      width: auto;
      margin: 20px 26px 0 20px;
      box-shadow: 6px 6px 0 var(--color-accent);
    }
    .ap-dialoog-tekst {
      padding: 24px 20px 28px;
    }
    /* hier ligt het kruisje op de foto: zelfde oranje vierkant als het menu,
       zodat het op elke foto goed te zien is */
    .ap-sluit {
      /* binnen de rand van de ingelijste foto */
      top: 30px;
      right: 38px;
      background: var(--color-accent);
      border: 3px solid var(--color-bg);
      box-shadow: 4px 4px 0 var(--color-bg);
      color: var(--color-bg);
    }
    .ap-sluit:hover {
      color: var(--color-bg);
    }
    .ap-sluit svg {
      width: 22px;
      height: 22px;
    }
  }
</style>
