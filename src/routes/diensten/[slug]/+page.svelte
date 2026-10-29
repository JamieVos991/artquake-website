<script>
  import { onMount } from "svelte";
  import { base } from "$app/paths";
  import DeelVoorbeeld from "$lib/components/DeelVoorbeeld.svelte";

  let { data } = $props();
  // $derived: bij doorklikken van de ene naar de andere dienstpagina hergebruikt
  // SvelteKit deze pagina; zo volgt de inhoud de nieuwe dienst mee
  const dienst = $derived(data.dienst);

  const videos = import.meta.glob("../../../lib/assets/videos/diensten/*.mp4", {
    eager: true,
    import: "default",
  });
  // de video heet zoals de slug; geen bestand = geen video
  const video = $derived.by(() => {
    const bestand = videos[`../../../lib/assets/videos/diensten/${dienst.slug}.mp4`];
    return bestand && dienst.videoStart ? `${bestand}#t=${dienst.videoStart}` : bestand;
  });
  // stilstaand beeld uit de video, zodat er niet eerst een zwart vlak staat
  // tot de video geladen is (lib/assets/fotos/diensten/video-posters/<slug>.webp)
  const videoPosters = import.meta.glob("../../../lib/assets/fotos/diensten/video-posters/*.webp", {
    eager: true,
    import: "default",
  });
  // na op play drukken duurt het even tot de video binnen is: dan een draaiend rondje
  let videoLaadt = $state(false);
  const videoPoster = $derived(videoPosters[`../../../lib/assets/fotos/diensten/video-posters/${dienst.slug}.webp`]);

  // recap van de laatste editie: videos/actueel/<bestand>.mp4, poster fotos/actueel/<bestand>.webp
  const recapVideos = import.meta.glob("../../../lib/assets/videos/actueel/*.mp4", {
    eager: true,
    import: "default",
  });
  const recapPosters = import.meta.glob("../../../lib/assets/fotos/actueel/*.webp", {
    eager: true,
    import: "default",
  });
  const recapVideo = $derived(
    dienst.recap ? recapVideos[`../../../lib/assets/videos/actueel/${dienst.recap.bestand}.mp4`] : undefined
  );
  const recapPoster = $derived(
    dienst.recap ? recapPosters[`../../../lib/assets/fotos/actueel/${dienst.recap.bestand}.webp`] : undefined
  );
  let recapLaadt = $state(false);

  // galerijfoto's staan in een map met dezelfde naam als de slug,
  // bijv. fotos/diensten/talent-night/
  const galerijFotos = import.meta.glob(
    "../../../lib/assets/fotos/diensten/*/*.avif",
    { eager: true, import: "default" }
  );
  // 480 px brede versies in klein/ (zelfde naam), voor telefoons en kleine
  // kolommen; de grote foto (max 1200 px) alleen voor scherpe brede schermen
  const galerijKlein = import.meta.glob(
    "../../../lib/assets/fotos/diensten/*/klein/*.avif",
    { eager: true, import: "default" }
  );
  const galerij = $derived(
    (dienst.galerij ?? []).map((g, i) => {
      const src = galerijFotos[`../../../lib/assets/fotos/diensten/${dienst.slug}/${g.foto}.avif`];
      const klein = galerijKlein[`../../../lib/assets/fotos/diensten/${dienst.slug}/klein/${g.foto}.avif`];
      return { ...g, i, src, srcset: klein ? `${klein} 480w, ${src} 1200w` : undefined };
    })
  );

  // Collage: de foto's worden verdeeld over kolommen (steeds op de kortste),
  // en elke kolom rekt op tot de hoogste. Zo eindigt de onderkant precies recht.
  // Telefoon 2 kolommen, groter 3.
  let aantalKolommen = $state(3);
  onMount(() => {
    const smal = window.matchMedia("(max-width: 640px)");
    const zet = () => (aantalKolommen = smal.matches ? 2 : 3);
    zet();
    smal.addEventListener("change", zet);
    return () => smal.removeEventListener("change", zet);
  });
  // hoogte per breedte, bv. "4 / 5" geeft 1,25
  const hoogte = (verhouding) => {
    const [b, h] = verhouding.split("/").map(Number);
    return h / b;
  };
  const RUIMTE = 0.08; // ruimte tussen twee foto's, als deel van de kolombreedte
  const kolomHoogte = (fotos) =>
    fotos.reduce((som, g) => som + hoogte(g.verhouding), 0) + RUIMTE * Math.max(0, fotos.length - 1);
  const spreiding = (lijst) => {
    const h = lijst.map(kolomHoogte);
    return Math.max(...h) - Math.min(...h);
  };
  const kolommen = $derived.by(() => {
    // 1. hoogste foto's eerst, steeds in de kortste kolom
    const lijst = Array.from({ length: aantalKolommen }, () => []);
    for (const g of [...galerij].sort((a, b) => hoogte(b.verhouding) - hoogte(a.verhouding))) {
      lijst.reduce((min, k) => (kolomHoogte(k) < kolomHoogte(min) ? k : min)).push(g);
    }
    // 2. foto's tussen kolommen ruilen of verplaatsen zolang het verschil kleiner wordt
    let beter = true;
    while (beter) {
      beter = false;
      for (let a = 0; a < lijst.length; a++) {
        for (let b = 0; b < lijst.length; b++) {
          if (a === b) continue;
          for (let i = 0; i < lijst[a].length; i++) {
            // verplaatsen van a naar b
            const nu = spreiding(lijst);
            const [g] = lijst[a].splice(i, 1);
            lijst[b].push(g);
            if (lijst[a].length && spreiding(lijst) < nu - 0.001) {
              beter = true;
              break;
            }
            lijst[b].pop();
            lijst[a].splice(i, 0, g);
            // ruilen met elke foto in b
            for (let j = 0; j < lijst[b].length; j++) {
              [lijst[a][i], lijst[b][j]] = [lijst[b][j], lijst[a][i]];
              if (spreiding(lijst) < nu - 0.001) {
                beter = true;
                break;
              }
              [lijst[a][i], lijst[b][j]] = [lijst[b][j], lijst[a][i]];
            }
            if (beter) break;
          }
          if (beter) break;
        }
        if (beter) break;
      }
    }
    // 3. binnen een kolom de oorspronkelijke volgorde aanhouden
    return lijst.map((k) => k.sort((x, y) => x.i - y.i));
  });
</script>

<svelte:head>
  <title>{dienst.heading} | Artquake</title>
  <meta name="description" content={dienst.metaBeschrijving ?? dienst.intro} />
</svelte:head>

<DeelVoorbeeld
  titel="{dienst.heading} | Artquake"
  beschrijving={dienst.metaBeschrijving ?? dienst.intro}
  afbeelding={dienst.slug}
  afbeeldingAlt={dienst.heading}
/>

<section class="dp-intro bg-{dienst.bg}">
  <a class="dp-terug" href="{base}/#services" aria-label="Terug naar wat we doen">
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 12H6M12 5l-7 7 7 7" /></svg>
  </a>
  <span class="dp-id">{dienst.id}</span>
  <h1 class="dp-title">{dienst.heading}</h1>
  <p class="dp-tagline">{dienst.intro}</p>
</section>

<section
  class="dp-body"
  class:dp-body-video={video}
  class:dp-body-naast={video && dienst.videoNaast}  class:dp-body-galerij={galerij.length}
>
  {#if video}
    <figure class="dp-video">
      <figcaption>{dienst.videoLabel ?? "VIDEO"}</figcaption>
      <!-- svelte-ignore a11y_media_has_caption -->
      <video
        src={video}
        poster={videoPoster}
        controls
        playsinline
        preload="metadata"
        onplay={() => (videoLaadt = true)}
        onwaiting={() => (videoLaadt = true)}
        onplaying={() => (videoLaadt = false)}
        onpause={() => (videoLaadt = false)}
        onerror={() => (videoLaadt = false)}
      ></video>
      {#if videoLaadt}
        <span class="dp-video-laadt" role="status">
          <span class="dp-spinner" aria-hidden="true"></span>
          <span class="dp-visueel-verborgen">Video laden…</span>
        </span>
      {/if}
    </figure>
  {/if}
  <div class="dp-body-tekst">
    {#each dienst.text.split("\n\n") as alinea}
      <p class="dp-text">{alinea}</p>
    {/each}
    {#if !dienst.geenAgenda}
      <p class="dp-text dp-agenda">
        Houd de <a href="{base}/#agenda">agenda</a> in de gaten voor de
        eerstvolgende data.
      </p>
    {/if}
    <a class="dp-cta" href="{base}/#doe-mee">DOE MEE</a>
  </div>
</section>

{#if recapVideo}
  <!-- laatste editie, onder de uitleg: tekst links, staande recapvideo rechts -->
  <section class="dp-recap" aria-labelledby="dp-recap-titel">
    <div class="dp-recap-tekst">
      <span class="dp-recap-label">{dienst.recap.label}</span>
      <h2 class="dp-recap-titel" id="dp-recap-titel">{dienst.recap.titel}</h2>
    </div>
    <figure class="dp-video dp-recap-video" style:--verhouding={dienst.recap.verhouding ?? "16 / 9"}>
      <!-- svelte-ignore a11y_media_has_caption -->
      <video
        src={recapVideo}
        poster={recapPoster}
        controls
        playsinline
        preload={recapPoster ? "none" : "metadata"}
        aria-label="Recap van {dienst.recap.titel}"
        onplay={() => (recapLaadt = true)}
        onwaiting={() => (recapLaadt = true)}
        onplaying={() => (recapLaadt = false)}
        onpause={() => (recapLaadt = false)}
        onerror={() => (recapLaadt = false)}
      ></video>
      {#if recapLaadt}
        <span class="dp-video-laadt" role="status">
          <span class="dp-spinner" aria-hidden="true"></span>
          <span class="dp-visueel-verborgen">Video laden…</span>
        </span>
      {/if}
    </figure>
  </section>
{/if}

{#if galerij.length}
  <section class="dp-galerij" aria-label="Foto's van {dienst.heading}">
    <h2 class="dp-galerij-kop">IN BEELD</h2>
    <div class="dp-collage" style:--kolommen={aantalKolommen}>
      {#each kolommen as kolom}
        <ul class="dp-kolom">
          {#each kolom as g (g.foto)}
            <li
              class="dp-collage-item dp-schaduw-{g.i % 3}"
              style:aspect-ratio={g.verhouding}
              style:flex-grow={hoogte(g.verhouding)}
            >
              <img
                src={g.src}
                srcset={g.srcset}
                sizes="(max-width: 640px) 50vw, 33vw"
                alt={g.titel}
                loading="lazy"
              />
              <!-- de alt-tekst zegt het al; zonder aria-hidden leest een schermlezer het twee keer -->
              <span class="dp-galerij-titel" aria-hidden="true">{g.titel}</span>
            </li>
          {/each}
        </ul>
      {/each}
    </div>
  </section>
{/if}

<style>
  /* terugknop: zelfde oranje vierkant als het menu, linksboven op dezelfde
     hoogte, net als bij de agenda */
  .dp-terug {
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 2;
    display: grid;
    place-items: center;
    width: 56px;
    height: 56px;
    background: var(--color-accent);
    border: 3px solid var(--color-bg);
    box-shadow: 4px 4px 0 var(--color-bg);
    color: var(--color-bg);
    transition: transform 0.12s;
  }
  .dp-terug:hover {
    transform: translate(-2px, -2px);
  }
  .dp-terug:focus-visible {
    outline: 3px solid var(--color-accent);
    outline-offset: 3px;
  }
  .dp-terug svg {
    width: 26px;
    height: 26px;
    fill: none;
    stroke: currentColor;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  @media (prefers-reduced-motion: reduce) {
    .dp-terug {
      transition: none;
    }
  }
  /* geen logobalk, net als bij de agenda: bovenin staan alleen de terugknop
     en de menuknop */
  .dp-intro {
    position: relative;
    padding: 108px var(--rand) 64px;
    border-bottom: 4px solid var(--color-bg);
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
  .dp-id {
    display: block;
    font: 700 13px/1 var(--font-mono);
    letter-spacing: 0.16em;
    margin-bottom: 18px;
  }
  .dp-title {
    margin: 0 0 18px;
    font-family: var(--font-display);
    font-weight: 900;
    font-stretch: 118%;
    font-size: clamp(26px, 8.4vw, 92px);
    overflow-wrap: break-word;
    line-height: 0.9;
    letter-spacing: -0.03em;
    text-transform: uppercase;
  }
  .dp-tagline {
    margin: 0;
    max-width: 640px;
    font: 400 16px/1.5 var(--font-mono);
  }

  .dp-body {
    background: var(--color-bg);
    color: var(--color-fg);
    padding: 56px var(--rand) 96px;
  }
  /* volgt er een fotogalerij, dan minder ruimte onder de knop */
  .dp-body-galerij {
    padding-bottom: 44px;
  }
  .dp-text {
    max-width: 680px;
    margin: 0 0 40px;
    font: 400 15px/1.7 var(--font-mono);
    opacity: 0.9;
  }
  .dp-agenda a {
    color: var(--color-accent);
    font-weight: 700;
  }
  .dp-agenda a:hover {
    text-decoration: none;
  }
  .dp-cta {
    display: inline-block;
    padding: 14px 32px;
    background: var(--color-fg);
    color: var(--color-bg);
    border-radius: 26px;
    font: 800 14px/1 var(--font-display);
    letter-spacing: 0.04em;
    text-decoration: none;
    transition: opacity 0.15s;
  }
  .dp-cta:hover {
    opacity: 0.8;
  }

  /* met video: eerst de video over de volle breedte, daaronder de tekst */
  .dp-body-video .dp-video {
    max-width: 980px;
    margin: 0 12px 60px 0;
  }
  .dp-text + .dp-text {
    margin-top: -20px;
  }
  /* video kleiner, rechts naast de tekst */
  .dp-body-naast {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
    gap: 64px;
    align-items: center;
  }
  .dp-body-naast .dp-video {
    order: 2;
    max-width: none;
    margin: 0 12px 12px 0;
  }
  .dp-body-naast .dp-body-tekst > :last-child {
    margin-bottom: 0;
  }
  @media (max-width: 900px) {
    .dp-body-naast {
      grid-template-columns: 1fr;
      gap: 48px;
    }
  }
  .dp-video {
    position: relative;
  }
  .dp-video video {
    display: block;
    width: 100%;
    aspect-ratio: 16 / 9;
    background: var(--color-bg);
    box-shadow: 12px 12px 0 var(--color-primary);
  }
  /* laadrondje midden op de video, de bediening eronder blijft klikbaar */
  .dp-video-laadt {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    aspect-ratio: 16 / 9;
    display: grid;
    place-items: center;
    pointer-events: none;
  }
  .dp-spinner {
    width: 56px;
    height: 56px;
    border: 5px solid var(--color-accent);
    border-right-color: transparent;
    border-radius: 50%;
    filter: drop-shadow(0 0 6px rgb(0 0 0 / 0.6));
    animation: dp-draai 0.8s linear infinite;
  }
  @keyframes dp-draai {
    to {
      transform: rotate(360deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .dp-spinner {
      animation-duration: 2.4s;
    }
  }
  .dp-visueel-verborgen {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  /* laatste editie: tekst links, staande video rechts (max. 380px breed) */
  .dp-recap {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 380px);
    gap: 64px;
    align-items: center;
    /* staat onder de uitleg (die al 44px onderruimte heeft) en boven de galerij */
    padding: 40px var(--rand) 88px;
    background: var(--color-bg);
    color: var(--color-fg);
  }
  .dp-recap-label {
    display: block;
    margin-bottom: 18px;
    color: var(--color-accent);
    font: 700 12px/1 var(--font-mono);
    letter-spacing: 0.16em;
  }
  .dp-recap-titel {
    margin: 0;
    font-weight: 900;
    font-stretch: 118%;
    font-size: clamp(30px, 4.4vw, 64px);
    line-height: 0.92;
    letter-spacing: -0.02em;
    text-transform: uppercase;
  }
  .dp-recap-video {
    margin: 0 12px 12px 0;
  }
  .dp-recap-video video {
    aspect-ratio: var(--verhouding);
    object-fit: cover;
    box-shadow: 12px 12px 0 var(--color-accent);
  }
  .dp-recap-video .dp-video-laadt {
    top: 0;
    aspect-ratio: auto;
  }
  @media (max-width: 900px) {
    .dp-recap {
      grid-template-columns: 1fr;
      gap: 40px;
      padding-top: 32px;
      padding-bottom: 72px;
    }
    .dp-recap-video {
      width: min(100%, 360px);
    }
  }
  @media (max-width: 640px) {
    .dp-recap {
      padding-left: 20px;
      padding-right: 20px;
    }
  }
  .dp-video figcaption {
    margin-bottom: 28px;
    color: var(--color-accent);
    font: 700 12px/1 var(--font-mono);
    letter-spacing: 0.16em;
  }

  .dp-galerij {
    background: var(--color-bg);
    color: var(--color-fg);
    padding: 0 var(--rand) 96px;
  }
  .dp-galerij-kop {
    margin: 0 0 28px;
    color: var(--color-accent);
    font: 700 12px/1 var(--font-mono);
    letter-spacing: 0.16em;
  }
  /* Pinterest-indeling: kolommen met foto's van wisselende hoogte */
  /* kolommen even hoog (grid stretch); in een kolom groeien de foto's mee,
     zodat de onderkant van alle kolommen precies gelijk ligt */
  .dp-collage {
    --tussenruimte: 30px;
    display: grid;
    grid-template-columns: repeat(var(--kolommen, 3), minmax(0, 1fr));
    gap: var(--tussenruimte);
    padding: 0 10px 0 0;
  }
  .dp-kolom {
    display: flex;
    flex-direction: column;
    gap: var(--tussenruimte);
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .dp-collage-item {
    --schaduw: 10px;
    position: relative;
    /* flex-grow staat per foto in de HTML: naar verhouding van de hoogte */
    flex-shrink: 1;
    flex-basis: auto;
    min-height: 0;
    margin: 0;
    background: var(--color-gray-900);
    box-shadow: var(--schaduw) var(--schaduw) 0 var(--color-primary);
  }
  .dp-schaduw-1 {
    box-shadow: var(--schaduw) var(--schaduw) 0 var(--color-accent);
  }
  .dp-schaduw-2 {
    box-shadow: var(--schaduw) var(--schaduw) 0 var(--color-fg);
  }
  .dp-collage-item img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .dp-galerij-titel {
    position: absolute;
    left: 0;
    bottom: 0;
    max-width: 100%;
    box-sizing: border-box;
    overflow-wrap: anywhere;
    padding: 8px 12px;
    background: var(--color-bg);
    font: 700 11px/1 var(--font-mono);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  @media (max-width: 640px) {
    .dp-galerij {
      padding-left: 20px;
      padding-right: 20px;
    }
    .dp-collage {
      --tussenruimte: 18px;
      padding-right: 6px;
    }
    .dp-collage-item {
      --schaduw: 6px;
    }
    .dp-galerij-titel {
      padding: 6px 9px;
      font-size: 9px;
    }
    .dp-intro,
    .dp-body {
      padding-left: 20px;
      padding-right: 20px;
    }
    .dp-intro {
      padding-top: 88px;
    }
    .dp-terug {
      top: 14px;
      left: 14px;
      width: 48px;
      height: 48px;
    }
    .dp-terug svg {
      width: 22px;
      height: 22px;
    }
  }
</style>
