<script>
  import dewiUitlegVideo from "$lib/assets/videos/pand/dewi-rondleiding.mp4";
  import pandFoto from "$lib/assets/fotos/pand/artquake-pand-voorkant.avif";
  // eerste beeld van de video: getoond tot de video in beeld komt en start,
  // zodat de pagina bij openen niets van de video hoeft te laden
  import dewiPoster from "$lib/assets/fotos/pand/dewi-rondleiding-poster.avif";

  // Stops op het pad (coördinaten in het SVG-raster van 1160×1280).
  // kant: op welk stuk van het pad de stop ligt, bepaalt de richting van het label.
  const stops = [
    { naam: "Creatieve huiskamer", x: 280, y: 90, kant: "rij" },
    { naam: "Oefenruimte voor muziek", x: 610, y: 90, kant: "rij" },
    { naam: "Zaal met podium, licht en geluid", x: 560, y: 650, kant: "rij" },
    { naam: "Atelier", x: 330, y: 650, kant: "rij" },
    { naam: "Opnamestudio", x: 100, y: 820, kant: "zij" },
    { naam: "Fotostudio", x: 330, y: 1210, kant: "rij" },
    { naam: "Dansstudio", x: 640, y: 1210, kant: "rij" },
  ];
  const nr = (i) => String(i + 1).padStart(2, "0");

  const pad =
    "M 150 90 H 970 Q 1060 90 1060 180 V 560 Q 1060 650 970 650 H 190 Q 100 650 100 740 V 1120 Q 100 1210 190 1210 H 1010";

  // smalle versie van het bord (SVG-raster van 360×1380)
  const stopsMobiel = [
    { x: 110, y: 44, kant: "rij" },
    { x: 326, y: 118, kant: "zij" },
    { x: 34, y: 522, kant: "zij" },
    { x: 100, y: 860, kant: "rij" },
    { x: 326, y: 932, kant: "zij" },
    { x: 118, y: 1160, kant: "rij" },
    { x: 96, y: 1320, kant: "rij" },
  ];
  const padMobiel =
    "M 60 44 H 276 Q 326 44 326 94 V 400 Q 326 450 276 450 H 84 Q 34 450 34 500 V 810 Q 34 860 84 860 H 276 Q 326 860 326 910 V 1110 Q 326 1160 276 1160 H 84 Q 34 1160 34 1210 V 1270 Q 34 1320 84 1320 H 290";

  let videoEl = $state();
  let videoMuted = $state(true);

  function toggleVideoMute() {
    if (!videoEl) return;
    videoEl.muted = !videoEl.muted;
    videoMuted = videoEl.muted;
  }

  $effect(() => {
    if (!videoEl) return;
    const rustig = window.matchMedia("(prefers-reduced-motion: reduce)");

    // speelt vanzelf als hij in beeld komt, behalve bij "minder beweging";
    // dat wordt elke keer opnieuw bekeken, de instelling kan veranderd zijn.
    // Zelf op play drukken kan altijd.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !rustig.matches) {
          videoEl.play().catch(() => {});
        } else if (!entry.isIntersecting) {
          videoEl.pause();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(videoEl);
    return () => observer.disconnect();
  });
</script>

<!-- op smalle schermen staat de intro boven het bord -->
<div class="route-tekst route-intro-mobiel">
  <h4 class="route-kop">LOOP MET DEWI MEE</h4>
  <p>
    In het Artquake pand vind je zeven ruimtes. Dewi laat ze je één voor één
    zien: volg de route.
  </p>
</div>

<div class="route">
  <!-- het bord op smalle schermen -->
  <svg class="route-bord bord-mobiel" viewBox="0 0 360 1380" aria-hidden="true">
    <path class="pad-rand" d={padMobiel} />
    <path class="pad-baan" d={padMobiel} />
    <path class="pad-vakjes" d={padMobiel} />
    <g transform="translate(58 44) rotate(-8)">
      <rect class="vlag vlag-start" x="-34" y="-27" width="68" height="54" />
      <text class="vlag-tekst" y="5">START</text>
    </g>
    {#each stopsMobiel as s, i}
      <!-- elke tekst twee keer: eerst een crème rand, daarbovenop de letters -->
      {#each ["rand", "letters"] as laag}
        {#if s.kant === "rij"}
          <text class="stop-label" class:laag-rand={laag === "rand"} x={s.x + 20} y={s.y + 4}
            >{stops[i].naam.toUpperCase()}</text
          >
        {:else}
          <text
            class="stop-label" class:laag-rand={laag === "rand"}
            transform="translate({s.x - 4} {s.y + 20}) rotate(90)"
            >{stops[i].naam.toUpperCase()}</text
          >
        {/if}
        <text class="stop-nr" class:laag-rand={laag === "rand"} x={s.x} y={s.y + 7}>{nr(i)}</text>
      {/each}
    {/each}
  </svg>

  <!-- het bord: alleen op brede schermen -->
  <svg class="route-bord bord-breed" viewBox="0 0 1160 1280" aria-hidden="true">
    <path class="pad-rand" d={pad} />
    <path class="pad-baan" d={pad} />
    <path class="pad-vakjes" d={pad} />

    <!-- start en finish -->
    <g transform="translate(150 90) rotate(-8)">
      <rect class="vlag vlag-start" x="-62" y="-40" width="124" height="80" />
      <text class="vlag-tekst" y="7">START</text>
    </g>

    {#each stops as s, i}
      {#each ["rand", "letters"] as laag}
        {#if s.kant === "rij"}
          <text class="stop-label" class:laag-rand={laag === "rand"} x={s.x + 46} y={s.y + 5}
            >{s.naam.toUpperCase()}</text
          >
        {:else}
          <text
            class="stop-label" class:laag-rand={laag === "rand"}
            transform="translate({s.x - 5} {s.y + 46}) rotate(90)"
            >{s.naam.toUpperCase()}</text
          >
        {/if}
        <text class="stop-nr" class:laag-rand={laag === "rand"} x={s.x} y={s.y + 11}>{nr(i)}</text>
      {/each}
    {/each}
  </svg>

  <!-- bocht 1: het filmpje -->
  <div class="route-vak route-vak-1">
    <figure class="route-media route-video">
      <video
        bind:this={videoEl}
        class="route-player"
        controls
        muted
        playsinline
        preload="none"
        poster={dewiPoster}
      >
        <source src={dewiUitlegVideo} type="video/mp4" />
        Je browser ondersteunt deze video niet.
      </video>
      <button
        type="button"
        class="route-unmute"
        aria-pressed={!videoMuted}
        onclick={toggleVideoMute}
      >
        {videoMuted ? "GELUID AAN" : "DEMPEN"}
      </button>
    </figure>
    <div class="route-tekst route-intro-breed">
      <h4 class="route-kop">LOOP MET DEWI MEE</h4>
      <p>
        In het Artquake pand vind je zeven ruimtes. Dewi laat ze je één voor
        één zien: volg de route.
      </p>
    </div>
  </div>

  <!-- de finish-vlag ligt boven de foto en de tekst -->
  <svg class="route-bord route-bord-boven bord-mobiel" viewBox="0 0 360 1380" aria-hidden="true">
    <g transform="translate(286 1320) rotate(6)">
      <rect class="vlag vlag-finish" x="-58" y="-27" width="116" height="54" />
      <text class="vlag-tekst vlag-tekst-licht" y="5">OP AFSPRAAK</text>
    </g>
  </svg>
  <svg class="route-bord route-bord-boven bord-breed" viewBox="0 0 1160 1280" aria-hidden="true">
    <g transform="translate(1000 1210) rotate(6)">
      <rect class="vlag vlag-finish" x="-96" y="-40" width="192" height="80" />
      <text class="vlag-tekst vlag-tekst-licht" y="7">OP AFSPRAAK</text>
    </g>
  </svg>

  <!-- bocht 2: gratis, adres en de foto -->
  <div class="route-vak route-vak-2">
    <div class="route-tekst">
      <h4 class="route-kop route-kop-oranje">GRATIS VOOR JONGE MAKERS</h4>
      <p>
        Jonge artiesten en kunstenaars mogen gratis gebruikmaken van deze
        ruimtes.
        Neem contact met ons op
        voor meer info of om een afspraak te maken.
      </p>
      <p>
        Je vindt ons op
        <strong class="route-adres">Sara de Bronovoland 7 in Heerhugowaard</strong>.
      </p>
    </div>
    <figure class="route-media route-foto">
      <img src={pandFoto} alt="De voorkant van het Artquake pand" loading="lazy" />
    </figure>
  </div>
</div>

<style>
  .route {
    position: relative;
    max-width: 1160px;
    margin: 0 auto;
    aspect-ratio: 1160 / 1280;
    color: var(--color-fg);
  }

  /* bord */
  .route-bord {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  .route-bord-boven {
    z-index: 2;
    pointer-events: none;
  }
  .route-bord path {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .pad-rand {
    stroke: var(--color-primary);
    stroke-width: 74;
    transform: translate(7px, 9px);
  }
  .pad-baan {
    stroke: var(--color-fg);
    stroke-width: 62;
  }
  .pad-vakjes {
    stroke: var(--color-bg);
    stroke-width: 62;
    stroke-dasharray: 2 88;
    stroke-linecap: butt !important;
    opacity: 0.55;
  }
  .vlag {
    stroke: var(--color-bg);
    stroke-width: 4;
  }
  .vlag-start {
    fill: var(--color-accent);
  }
  .vlag-finish {
    fill: var(--color-primary);
  }
  .vlag-tekst {
    fill: var(--color-bg);
    text-anchor: middle;
    font-family: var(--font-display);
    font-weight: 900;
    font-size: 22px;
  }
  .vlag-tekst-licht {
    fill: var(--color-fg);
  }
  /* Geen paint-order, text-transform of letter-spacing op SVG-tekst:
     WebKit (Safari en alle iPhone-browsers) tekent die verkeerd. */
  .stop-nr {
    fill: var(--color-primary);
    text-anchor: middle;
    font-family: var(--font-display);
    font-weight: 900;
    font-size: 30px;
  }
  .stop-label {
    fill: var(--color-bg);
    font-family: var(--font-display);
    font-weight: 900;
    font-size: 17px;
  }
  /* crème rand rond de letters, zodat ze loskomen van de streepjes op de baan */
  .laag-rand {
    fill: var(--color-fg);
    stroke: var(--color-fg);
    stroke-width: 10px;
    stroke-linejoin: round;
  }

  /* inhoud in de bochten */
  .route-vak {
    position: absolute;
    z-index: 1;
    left: 14%;
    right: 14%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: clamp(24px, 4vw, 56px);
  }
  .route-vak-1 {
    top: 11.5%;
    height: 34.5%;
  }
  .route-vak-2 {
    top: 55.5%;
    height: 34.5%;
  }
  .route-media {
    position: relative;
    flex: none;
    height: 100%;
    aspect-ratio: 480 / 848;
    margin: 0;
    background: var(--color-bg);
  }
  .route-video {
    box-shadow: 12px 12px 0 var(--color-primary);
  }
  .route-foto {
    box-shadow: 12px 12px 0 var(--color-accent);
  }
  .route-player,
  .route-foto img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  /* rechtsboven in de hoek, vrij van de videobediening onderin */
  .route-unmute {
    position: absolute;
    top: 10px;
    right: 10px;
    padding: 9px 14px;
    background: var(--color-bg);
    color: var(--color-fg);
    border: 2px solid var(--color-fg);
    border-radius: 20px;
    font: 700 11px/1 var(--font-mono);
    letter-spacing: 0.08em;
    cursor: pointer;
  }
  .route-unmute:hover {
    background: var(--color-primary);
    border-color: var(--color-primary);
  }
  .route-tekst {
    max-width: 380px;
    font: 400 15px/1.6 var(--font-mono);
  }
  .route-tekst p {
    margin: 0 0 20px;
  }
  .route-kop {
    margin: 0 0 14px;
    color: var(--color-primary-light);
    font-family: var(--font-display);
    font-weight: 900;
    font-stretch: 115%;
    font-size: clamp(20px, 2vw, 26px);
    line-height: 1;
  }
  .route-kop-oranje {
    color: var(--color-accent);
  }
  .route-adres {
    display: inline;
    font-style: normal;
    font-weight: 700;
  }

  .bord-mobiel,
  .route-intro-mobiel {
    display: none;
  }

  /* smal scherm: een eigen, smal bord dat naar beneden slingert */
  @media (max-width: 900px) {
    .route-intro-mobiel {
      display: block;
      max-width: 420px;
      margin: 0 auto 28px;
      color: var(--color-fg);
    }
    .route-intro-breed,
    .bord-breed {
      display: none;
    }
    .bord-mobiel {
      display: block;
    }
    .route {
      max-width: 420px;
      aspect-ratio: 360 / 1380;
    }

    .bord-mobiel .pad-rand {
      stroke-width: 52;
      transform: translate(4px, 6px);
    }
    .bord-mobiel .pad-baan,
    .bord-mobiel .pad-vakjes {
      stroke-width: 44;
    }
    .bord-mobiel .pad-vakjes {
      stroke-dasharray: 1.5 58;
    }
    .bord-mobiel .vlag {
      stroke-width: 3;
    }
    .bord-mobiel .vlag-tekst {
      font-size: 14px;
    }
    .bord-mobiel .stop-nr {
      font-size: 19px;
    }
    .bord-mobiel .stop-label {
      font-size: 10.5px;
    }
    .bord-mobiel .laag-rand {
      stroke-width: 6px;
    }

    /* de vakken lossen op: elk onderdeel krijgt zijn eigen bocht */
    .route-vak {
      display: contents;
    }
    .route-media {
      position: absolute;
      z-index: 1;
      height: 20.1%;
    }
    .route-video {
      left: 20.4%;
      top: 8.05%;
      box-shadow: 8px 8px 0 var(--color-primary);
    }
    .route-foto {
      left: 35.8%;
      top: 37.6%;
      box-shadow: 8px 8px 0 var(--color-accent);
    }
    .route-vak-2 .route-tekst {
      position: absolute;
      z-index: 1;
      left: 4%;
      top: 73.4%;
      transform: translateY(-50%);
      width: 76%;
      max-width: none;
      font-size: 12.5px;
      line-height: 1.5;
    }
    .route-vak-2 .route-tekst p {
      margin-bottom: 10px;
    }
    .route-vak-2 .route-tekst p:last-child {
      margin-bottom: 0;
    }
    .route-vak-2 .route-kop {
      margin-bottom: 8px;
      font-size: 18px;
    }
    .route-unmute {
      top: 6px;
      right: 6px;
      padding: 7px 10px;
      font-size: 10px;
    }
  }
</style>
