<script>
  import { onMount } from "svelte";
  import logo from "$lib/assets/artquake-logo.avif";
  import { base } from "$app/paths";
  import PandSectie from "$lib/components/PandSectie.svelte";
  import { agendaPoster } from "$lib/data/agendaPosters.js";
  import { artiestZichtbaar } from "$lib/data/artiestZichtbaar.js";
  import DeelVoorbeeld from "$lib/components/DeelVoorbeeld.svelte";
  import { haalCollectieOp } from "$lib/publiekeData.js";
  import { diensten } from "$lib/data/diensten.js";
  import { artiestFotoPositie, artiestFotoZoom } from "$lib/data/fotoPosities.js";
  import { artiestSlug } from "$lib/data/artiestLink.js";
  import { agendaFotoPositie } from "$lib/data/agendaFoto.js";
  import { agendaKleur, agendaTekstKleur } from "$lib/data/agendaKleur.js";

  // De blokken tonen een korte preview-clip (8 sec, klein, zonder geluid) i.p.v.
  // de hele video; die staat op de dienstpagina zelf. Geen clip? Dan de video.
  // Video's heten zoals de slug van de dienst: videos/diensten/<slug>.mp4
  const dienstVideos = import.meta.glob("../lib/assets/videos/diensten/*.mp4", {
    eager: true,
    import: "default",
  });
  const previewClips = import.meta.glob("../lib/assets/videos/diensten/preview/*.mp4", {
    eager: true,
    import: "default",
  });
  const services = diensten.map((d) => ({
    ...d,
    video:
      previewClips[`../lib/assets/videos/diensten/preview/${d.slug}.mp4`] ??
      dienstVideos[`../lib/assets/videos/diensten/${d.slug}.mp4`],
  }));

  // video in een blok: speelt alleen terwijl je erop staat
  function speelVideo(e) {
    e.currentTarget.querySelector("video")?.play().catch(() => {});
  }
  function pauzeerVideo(e) {
    e.currentTarget.querySelector("video")?.pause();
  }

  // Op een telefoon kun je niet hoveren: daar speelt de video zodra het blok
  // door het midden van het scherm scrolt, en stopt hij als je verder scrolt.
  // Niet bij "minder beweging" (prefers-reduced-motion).
  function speelInBeeld(node) {
    if (!window.matchMedia("(hover: none)").matches) return;
    const rustig = window.matchMedia("(prefers-reduced-motion: reduce)");
    const video = node.querySelector("video");
    const observer = new IntersectionObserver(
      ([entry]) => {
        // elke keer opnieuw kijken: de instelling kan veranderd zijn
        const speel = entry.isIntersecting && !rustig.matches;
        node.classList.toggle("is-in-beeld", speel);
        if (speel) video?.play().catch(() => {});
        else video?.pause();
      },
      // alleen de strook in het midden van het scherm telt
      { rootMargin: "-35% 0px -35% 0px" }
    );
    observer.observe(node);
    return { destroy: () => observer.disconnect() };
  }
  const speelInBeeldAlsVideo = (node, heeftVideo) =>
    heeftVideo ? speelInBeeld(node) : undefined;

  let agendaItems = $state([]);
  let agendaGeladen = $state(false);
  // eerst 5 activiteiten, met "Laad meer" telkens 5 erbij (zoals bij de artiesten)
  const agendaStap = 5;
  let agendaAantal = $state(agendaStap);
  let uitgelichteArtiesten = $state([]);
  let artiestenGeladen = $state(false);

  function kiesWillekeurig(lijst, aantal) {
    const shuffled = [...lijst].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, aantal);
  }

  function vandaagAlsDatum() {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  }

  onMount(() => {
    haalCollectieOp("agenda")
      .then((docs) => {
        const vandaag = vandaagAlsDatum();
        agendaItems = docs
          .filter((a) => a.date && a.date >= vandaag)
          .sort((a, b) =>
            `${a.date}${a.startTime ?? ""}`.localeCompare(
              `${b.date}${b.startTime ?? ""}`
            )
          );
      })
      .catch(() => {})
      .finally(() => (agendaGeladen = true));

    haalCollectieOp("artiesten")
      .then((docs) => {
        const alleArtiesten = docs.filter(artiestZichtbaar);
        uitgelichteArtiesten = kiesWillekeurig(alleArtiesten, 3);
      })
      .catch(() => {})
      .finally(() => (artiestenGeladen = true));
  });

  function formatAgendaDatum(d) {
    if (!d) return "";
    const [, m, day] = d.split("-");
    return `${day}.${m}`;
  }

  const heroModules = import.meta.glob("../lib/assets/fotos/hero/*.{avif,webp,jpg,jpeg}", {
    eager: true,
    import: "default",
  });
  const heroImages = Object.values(heroModules);
  // Staande uitsneden voor telefoons (hero/mobiel/, zelfde bestandsnaam). Op
  // een staand scherm valt van een liggende foto toch alleen het midden te
  // zien; de uitsnede is even scherp maar een stuk kleiner. Zonder uitsnede
  // krijgt de telefoon gewoon de grote foto.
  const heroMobielModules = import.meta.glob("../lib/assets/fotos/hero/mobiel/*.{avif,webp,jpg,jpeg}", {
    eager: true,
    import: "default",
  });
  const heroMobiel = Object.fromEntries(
    heroImages.map((src, i) => {
      const naam = Object.keys(heroModules)[i].split("/").pop();
      const mobiel = Object.entries(heroMobielModules).find(([pad]) => pad.endsWith(`/${naam}`));
      return [src, mobiel?.[1]];
    })
  );
  const MOBIEL_SCHERM = "(max-aspect-ratio: 3/4)";
  // uitsnede per hero-foto (object-position); zonder regel hier: midden
  const heroPosities = {
    // bovenaan (hele hoofd op brede schermen) en iets naar links, zodat ze
    // op een smal telefoonscherm in beeld staat
    "zangeres-met-gitaar": "28% top",
  };
  const heroPositie = (src) =>
    Object.entries(heroPosities).find(([naam]) => src.includes(naam))?.[1];
  const firstHeroImage = heroImages[0];

  let heroIndex = $state(0);
  let heroRevealed = $state(heroImages.length > 0 ? 1 : 0);

  // Steeds alleen de foto die nu staat en de volgende in de pagina zetten,
  // zodat ze niet allemaal tegelijk met de eerste foto binnenkomen (dat
  // vertraagt de eerste foto op een trage verbinding). De volgende laadt
  // tijdens de 3 seconden dat de huidige in beeld is.
  $effect(() => {
    if (!heroWisselt) return;
    const nodig = Math.min(heroImages.length, heroIndex + 2);
    if (nodig <= heroRevealed) return;
    const idle = window.requestIdleCallback ?? ((cb) => setTimeout(cb, 200));
    const cancelIdle = window.cancelIdleCallback ?? clearTimeout;
    // timeout: op een drukke pagina komt "idle" soms nooit, en dan bleef de
    // hero leeg zodra hij naar een foto wisselde die er nog niet was
    const id = idle(
      () => {
        heroRevealed = Math.max(heroRevealed, nodig);
      },
      { timeout: 1000 },
    );
    return () => cancelIdle(id);
  });

  // De foto's wisselen vanzelf; met de knop zet je dat stil (WCAG 2.2.2).
  // Wie minder beweging wil (systeeminstelling) krijgt geen wissel en geen knop.
  let heroPauze = $state(false);
  let heroWisselt = $state(false);
  onMount(() => {
    heroWisselt =
      heroImages.length > 1 &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  // De eerste foto blijft langer staan (8 s): een wissel tijdens het laden
  // telt bij Lighthouse als "pagina nog niet klaar" (Speed Index), en zo
  // heeft de bezoeker ook rustig tijd om de kop te lezen.
  let heroEersteWissel = true;
  $effect(() => {
    if (!heroWisselt || heroPauze) return;
    const volgende = (heroIndex + 1) % heroImages.length; // na elke wissel opnieuw
    const id = setTimeout(
      () => {
        heroEersteWissel = false;
        heroIndex = volgende;
      },
      heroEersteWissel ? 8000 : 3000,
    );
    return () => clearTimeout(id);
  });

  const ticks = [
    "OPTREDENS",
    "EXPOSITIES",
    "EVENTS",
    "WORKSHOPS",
    "MASTERCLASSES",
    "COACHING",
    "PROMOTIE",
  ];

  const talentBgVolgorde = ["dark", "cream", "purple"];

  const crewBgVolgorde = ["purple", "orange", "cream"];

  function schudCrewKleuren(aantal, kolommen = 3) {
    const kleuren = [];
    for (let i = 0; i < aantal; i++) {
      const verboden = new Set();
      if (i > 0) verboden.add(kleuren[i - 1]);
      if (i >= kolommen) verboden.add(kleuren[i - kolommen]);
      const opties = crewBgVolgorde.filter((k) => !verboden.has(k));
      kleuren.push(opties[Math.floor(Math.random() * opties.length)]);
    }
    return kleuren;
  }

  const crewFotos = import.meta.glob("../lib/assets/fotos/crew/*.avif", {
    eager: true,
    import: "default",
  });
  const crewFoto = (naam) =>
    crewFotos[`../lib/assets/fotos/crew/${naam}.avif`];

  const crewRuw = [
    {
      name: "Mado de Vries",
      fotoPositie: "70% 50%",
      role: "Oprichtster",
      imageUrl: crewFoto("mado"),
    },
    {
      name: "Nikki",
      fotoPositie: "25%",
      role: "Organisatie",
      imageUrl: "https://firebasestorage.googleapis.com/v0/b/artquake-6fceb.firebasestorage.app/o/crew-images%2Fnikki-hardaway.jpg?alt=media&token=b668c580-9754-4e66-9e9c-0c5da1215bb5",
    },
    {
      name: "Jasmijn",
      fotoPositie: "31%",
      role: "Organisatie",
      imageUrl: crewFoto("jasmijn"),
    },
    {
      name: "Jens",
      fotoPositie: "30%",
      role: "Organisatie",
      imageUrl: "https://firebasestorage.googleapis.com/v0/b/artquake-6fceb.firebasestorage.app/o/crew-images%2Fjens-dijkstra.jpeg?alt=media&token=2e0a0c72-a15f-4ae8-896b-8310f44025e9",
    },
    {
      name: "Britt",
      fotoPositie: "43%",
      role: "Coach / Docent",
      imageUrl: crewFoto("britt"),
    },
    {
      name: "Nina",
      fotoPositie: "18%",
      role: "Organisatie",
      imageUrl: crewFoto("nina"),
    },
    {
      name: "Franka",
      fotoPositie: "30%",
      role: "Organisatie",
      imageUrl: crewFoto("franka"),
    },
    {
      name: "Dewi",
      fotoPositie: "16%",
      role: "Organisatie / Coach",
      imageUrl: crewFoto("dewi"),
    },
    {
      name: "Chris",
      fotoPositie: "29%",
      role: "Presentator",
      imageUrl: crewFoto("chris"),
    },
    {
      name: "Eline",
      fotoPositie: "10%",
      role: "Organisatie / Docent",
      imageUrl: crewFoto("eline"),
    },
    {
      name: "Mike",
      fotoPositie: "8%",
      role: "Organisatie / Fotograaf",
      imageUrl: crewFoto("mike"),
    },
    {
      name: "Mikey",
      fotoPositie: "31%",
      role: "Organisatie",
      imageUrl: crewFoto("mikey"),
    },
    {
      name: "Santi",
      fotoPositie: "10%",
      role: "Organisatie",
      imageUrl: crewFoto("santi"),
    },
    {
      name: "Thomas",
      fotoPositie: "2%",
      role: "Fotograaf",
      imageUrl: crewFoto("thomas"),
    },
    {
      name: "Emre",
      fotoPositie: "95%",
      role: "Coach / Docent",
      imageUrl: crewFoto("emre"),
    },
    {
      name: "Moon",
      fotoPositie: "10%",
      role: "Organisatie / Docent",
      imageUrl:
        "https://firebasestorage.googleapis.com/v0/b/artquake-6fceb.firebasestorage.app/o/artiesten-images%2Fmoon-smit.jpeg?alt=media&token=aae5035f-6a11-4239-8149-088053037bec",
    },
  ];
  let crewLijst = $state();
  let crewBegin = $state(true);
  let crewEind = $state(false);

  function crewScrollStatus() {
    if (!crewLijst) return;
    crewBegin = crewLijst.scrollLeft <= 4;
    crewEind =
      crewLijst.scrollLeft + crewLijst.clientWidth >= crewLijst.scrollWidth - 4;
  }

  function crewBlader(richting) {
    if (!crewLijst) return;
    const kaart = crewLijst.querySelector(".crew-card");
    const stap = kaart ? kaart.getBoundingClientRect().width + 28 : 280;
    const aantal = Math.max(1, Math.floor(crewLijst.clientWidth / stap) - 1);
    const rustig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    crewLijst.scrollBy({
      left: richting * stap * aantal,
      behavior: rustig ? "auto" : "smooth",
    });
  }

  const crewKleuren = schudCrewKleuren(crewRuw.length, 4);
  const crew = crewRuw.map((c, i) => {
    const bg = crewKleuren[i];
    return { ...c, bg, roleColor: bg === "cream" ? "purple" : undefined };
  });
</script>

<svelte:head>
  <title>Artquake | Jong talent laat zich zien en horen</title>
  <meta
    name="description"
    content="Artquake in Heerhugowaard geeft jonge makers een podium en een netwerk: Talent Night, exposities, jamsessies, workshops, coaching en gratis oefenruimtes."
  />
  {#if firstHeroImage && heroMobiel[firstHeroImage]}
    <link
      rel="preload"
      as="image"
      href={heroMobiel[firstHeroImage]}
      media={MOBIEL_SCHERM}
      fetchpriority="high"
    />
    <link
      rel="preload"
      as="image"
      href={firstHeroImage}
      media="not all and {MOBIEL_SCHERM}"
      fetchpriority="high"
    />
  {:else if firstHeroImage}
    <link rel="preload" as="image" href={firstHeroImage} fetchpriority="high" />
  {/if}
</svelte:head>

<DeelVoorbeeld
  titel="Artquake | Jong talent laat zich zien en horen"
  beschrijving="Artquake in Heerhugowaard geeft jonge makers een podium en een netwerk: Talent Night, exposities, jamsessies, workshops, coaching en gratis oefenruimtes."
/>

<header class="hero-shell">
  <a class="brand" href={base}>
    <img class="brand-logo" src={logo} alt="Artquake, naar home" width="406" height="270" />
  </a>

  <section class="hero" id="hero" aria-label="Introductie">
    <figure class="hero-image">
      {#each heroImages as src, i}
        {#if i < heroRevealed}
          <picture>
            {#if heroMobiel[src]}
              <source media={MOBIEL_SCHERM} srcset={heroMobiel[src]} />
            {/if}
            <img
              class="hero-photo"
              class:active={i === heroIndex}
              {src}
              alt=""
              style:object-position={heroPositie(src)}
              loading={i === 0 ? "eager" : "lazy"}
              fetchpriority={i === 0 ? "high" : undefined}
            />
          </picture>
        {/if}
      {/each}
      {#if heroImages.length === 0}
        <figcaption>Drop hero foto: publiek / artiest, 2400×1600</figcaption>
      {/if}
    </figure>
    {#if heroWisselt}
      <button
        type="button"
        class="hero-pauze"
        aria-label={heroPauze ? "Foto's laten wisselen" : "Foto's pauzeren"}
        onclick={() => (heroPauze = !heroPauze)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          {#if heroPauze}
            <path d="M7 4.5v15l12.5-7.5z" />
          {:else}
            <rect x="5.5" y="4.5" width="4.5" height="15" />
            <rect x="14" y="4.5" width="4.5" height="15" />
          {/if}
        </svg>
      </button>
    {/if}
    <h1 class="hero-copy">
      <span class="hero-line hero-line-orange">JONG TALENT</span>
      <span class="hero-line hero-line-cream">LAAT ZICH ZIEN EN HOREN</span>
    </h1>
  </section>
</header>

<div class="page-main">
  <div class="stripe-bar" aria-hidden="true">
    <span class="stripe stripe-orange"></span>
    <span class="stripe stripe-purple"></span>
    <span class="stripe stripe-cream"></span>
    <span class="stripe stripe-dark"></span>
    <span class="stripe stripe-orange"></span>
    <span class="stripe stripe-purple"></span>
  </div>

  <section class="mission" aria-label="Missie">
    <h2 class="mission-title">
      WIJ GEVEN JONGE MAKERS EEN <span class="hl-purple">PODIUM</span>, EEN
      <span class="hl-purple-dark">NETWERK</span> EN EEN FLINKE
      <span class="hl-orange-block">DUW</span>.
    </h2>
    <aside class="mission-side">
      <p>
        Artquake biedt oefenruimtes, organiseert optredens, exposities, events,
        workshops, masterclasses, lessen, coaching en promotie. Alles wat je
        nodig hebt om jezelf verder te ontwikkelen, behalve slaap.
      </p>    </aside>
  </section>

  <section class="services" id="services" aria-label="Wat we doen">
    <header class="section-head">
      <h2 class="section-eyebrow eyebrow-orange">WAT WE DOEN</h2>
      <span class="section-rule"></span>
    </header>
    <ul class="services-grid">
      {#each services as s}
        <li
          class="service-card bg-{s.bg}"
          class:service-big={s.big}
          class:service-wide={s.wide}
          class:service-outline={s.outline}
          class:service-long={s.long}
          class:service-full={s.full}
          class:service-met-video={s.video}
          onmouseenter={s.video ? speelVideo : undefined}
          onmouseleave={s.video ? pauzeerVideo : undefined}
          onfocusin={s.video ? speelVideo : undefined}
          onfocusout={s.video ? pauzeerVideo : undefined}
          use:speelInBeeldAlsVideo={s.video}
        >
          {#if s.video}
            <video
              class="service-video"
              src={s.video}
              muted
              loop
              playsinline
              preload="none"
              aria-hidden="true"
              tabindex="-1"
            ></video>
          {/if}
          <span class="service-id">{s.id}</span>
          <h3 class="service-title">
            <a class="service-link" href={s.pand ? "#pand" : `${base}/diensten/${s.slug}`}>
              {#each s.title.split("\n") as line, i}{#if i > 0}<br />{/if}{line}{/each}
            </a>
          </h3>
        </li>
      {/each}
    </ul>
  </section>

  <section class="agenda" id="agenda" aria-label="Agenda">
    <header class="agenda-head">
      <h2 class="agenda-title">AGENDA</h2>
    </header>
    <ol class="agenda-list">
      {#if !agendaGeladen}
        {#each Array(3) as _}
          <li class="agenda-row skel-row" aria-hidden="true">
            <span class="skel agenda-foto"></span>
            <span class="skel skel-date"></span>
            <span class="skel skel-name"></span>
          </li>
        {/each}
      {:else if agendaItems.length === 0}
        <li class="agenda-empty">Binnenkort meer agenda items.</li>
      {:else}
        {#each agendaItems.slice(0, agendaAantal) as ev (ev.id)}
          {@const kleur = agendaKleur(ev)}
          <li
            class="agenda-row"
            style:background={kleur}
            style:color={agendaTekstKleur(kleur)}
          >
            <!-- nog geen foto maar wel een poster: dan de poster als plaatje -->
            {#if ev.imageUrl || agendaPoster(ev)}
              <img
                class="agenda-foto"
                src={ev.imageUrl || agendaPoster(ev)}
                alt=""
                loading="lazy"
                style:object-position={agendaFotoPositie(ev)}
              />
            {:else}
              <span class="agenda-foto agenda-foto-leeg" aria-hidden="true"></span>
            {/if}
            <time class="agenda-date" datetime={ev.date}
              >{formatAgendaDatum(ev.date)}</time
            >
            <h3 class="agenda-name">
              <!-- de link ligt over de hele regel; alle info staat op de eigen pagina -->
              <a class="agenda-link" href="{base}/agenda/{ev.id}">{ev.band}</a>
            </h3>
          </li>
        {/each}
      {/if}
    </ol>
    {#if agendaGeladen && agendaAantal < agendaItems.length}
      <button class="agenda-meer" type="button" onclick={() => (agendaAantal += agendaStap)}
        >LAAD MEER</button
      >
    {/if}
  </section>

  <section class="talent" id="talent" aria-label="Makers van nu">
    <header class="section-head section-head-dark">
      <h2 class="section-eyebrow eyebrow-purple">MAKERS VAN NU</h2>
      <span class="section-rule section-rule-dark"></span>
    </header>
    <ul class="talent-grid">
      {#if !artiestenGeladen}
        {#each Array(3) as _}
          <li class="talent-card skel-card" aria-hidden="true">
            <div class="skel skel-photo"></div>
            <div class="skel skel-talent-name"></div>
          </li>
        {/each}
      {:else}
        {#each uitgelichteArtiesten as t, i (t.id)}
          <li
            class="talent-card talent-card-klik bg-{talentBgVolgorde[
              i % talentBgVolgorde.length
            ]}"
          >
            <figure class="talent-photo">
              {#if t.imageUrl}
                <img
                  class="talent-img"
                  src={t.imageUrl}
                  alt=""
                  loading="lazy"
                  style:object-position={artiestFotoPositie(t)}
                  style:transform={artiestFotoZoom(t)}
                />
              {:else}
                <figcaption>[ ARTIESTFOTO<br />1200×1500 ]</figcaption>
              {/if}
            </figure>
            <hgroup class="talent-meta">
              <h3 class="talent-name">
                <!-- de link ligt over de hele kaart en opent de popup op de artiestenpagina -->
                <a class="talent-link" href="{base}/artiesten#{artiestSlug(t)}">{t.naam}</a>
              </h3>
            </hgroup>
          </li>
        {/each}
      {/if}
    </ul>
    <a class="talent-more" href="{base}/artiesten">BEKIJK ALLE MAKERS</a>
  </section>

  <section class="crew" id="crew" aria-label="De crew">
    <header class="section-head">
      <h2 class="section-eyebrow eyebrow-orange">DE CREW</h2>
      <span class="section-rule"></span>
    </header>
    <div class="crew-kop">
      <h3 class="crew-title">
        SAMEN WERKEN WE <span class="hl-purple">HARD</span>, ZODAT MAKERS
        ALLEEN MAAR HOEVEN TE
        <span class="hl-orange-block">MAKEN</span>.
      </h3>
      <div class="crew-nav">
        <button
          type="button"
          class="crew-nav-knop"
          aria-label="Vorige crewleden"
          disabled={crewBegin}
          onclick={() => crewBlader(-1)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <button
          type="button"
          class="crew-nav-knop"
          aria-label="Volgende crewleden"
          disabled={crewEind}
          onclick={() => crewBlader(1)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
    <ul
      class="crew-grid"
      bind:this={crewLijst}
      onscroll={crewScrollStatus}
    >
      <li class="crew-card crew-intro">
        <p class="crew-intro-getal">{crew.length}</p>
        <p class="crew-intro-kop">CREWLEDEN</p>
        <p class="crew-intro-tekst">
          Bestuursleden, organisatoren, coaches, docenten, fotografen en een
          presentator. Samen
          houden zij Artquake draaiende.
        </p>
      </li>
      {#each crew as c}
        <li class="crew-card crew-schaduw-{c.bg}">
          {#if c.imageUrl}
            <img
              class="crew-img"
              src={c.imageUrl}
              alt=""
              loading="lazy"
              style:object-position={c.fotoPositie?.includes(" ")
                ? c.fotoPositie
                : `center ${c.fotoPositie ?? "center"}`}
            />
          {:else}
            <p class="crew-geen-foto">Foto volgt</p>
          {/if}
          <hgroup class="crew-meta">
            <h4 class="crew-name">{c.name}</h4>
            <p class="crew-role">{c.role}</p>
          </hgroup>
        </li>
      {/each}
    </ul>
  </section>

  <section class="video-section" id="pand" aria-label="Het Artquake pand">
    <header class="section-head">
      <h2 class="section-eyebrow eyebrow-lila">HET ARTQUAKE PAND</h2>
      <span class="section-rule"></span>
    </header>
    <h3 class="video-title">
      HOOR HET VAN <span class="hl-orange-block">DEWI</span> ZELF!
    </h3>
    <p class="video-sub">Dewi leidt je rond door het Artquake pand 🩷</p>
    <PandSectie />
  </section>
</div>

<style>
  :global(.page-main) {
    background: var(--color-bg);
    display: block;
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

  /* scroll-driven reveal animations */
  @keyframes aq-rise {
    from {
      transform: translateY(60px) rotate(-1.1deg);
    }
    to {
      transform: translateY(0) rotate(0);
    }
  }
  @keyframes aq-left {
    from {
      transform: translateX(-90px) rotate(2deg);
    }
    to {
      transform: translateX(0) rotate(0);
    }
  }
  @keyframes aq-right {
    from {
      transform: translateX(90px) rotate(-2deg);
    }
    to {
      transform: translateX(0) rotate(0);
    }
  }
  @keyframes aq-pop {
    from {
      transform: scale(0.86) rotate(-4deg);
    }
    to {
      transform: scale(1) rotate(0);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .mission,
    .services-grid,
    .agenda-list,
    .talent-grid,
    .crew-grid,
    .video-title,
    .video-sub {
      animation: none !important;
    }
  }

  /* hero always fills the viewport; nav floats on top of it */
  .hero-shell {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100vh;
    /* svh i.p.v. dvh: blijft gelijk als de adresbalk op een telefoon
       in- en uitschuift, anders springt de pagina tijdens het scrollen */
    height: 100svh;
  }

  /* brand */
  .brand {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 5;
    display: flex;
    align-items: center;
    text-decoration: none;
    padding: 40px max(30px, var(--rand) - 10px);
  }
  .brand-logo {
    height: 120px;
    width: auto;
    display: block;
  }

  /* hero */
  .hero {
    position: relative;
    flex: 1 1 auto;
    min-height: 280px;
    background: var(--color-bg);
    border-bottom: 4px solid var(--color-fg);
    overflow: hidden;
  }
  .hero-image {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-gray-950);
  }
  .hero-photo {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transition: opacity 1.5s ease;
  }
  .hero-photo.active {
    opacity: 1;
  }
  .hero-image figcaption {
    color: var(--color-gray-400);
    font: 400 12px/1.4 var(--font-mono);
    text-align: center;
  }
  @media (prefers-reduced-motion: reduce) {
    .hero-photo {
      transition: none;
    }
  }
  .hero-image::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--color-bg) 55%, transparent) 0%,
        color-mix(in srgb, var(--color-bg) 15%, transparent) 34%,
        color-mix(in srgb, var(--color-bg) 82%, transparent) 100%
      ),
      radial-gradient(
        120% 80% at 70% 20%,
        color-mix(in srgb, var(--color-primary) 22%, transparent),
        transparent 60%
      );
  }
  /* links naast de menuknop (die staat op 20px van rechts en is 56px breed) */
  .hero-pauze {
    position: absolute;
    top: 20px;
    right: 88px;
    z-index: 5;
    display: grid;
    place-items: center;
    width: 56px;
    height: 56px;
    padding: 0;
    background: var(--color-fg);
    color: var(--color-bg);
    border: 3px solid var(--color-bg);
    box-shadow: 4px 4px 0 var(--color-bg);
    cursor: pointer;
    transition: transform 0.12s;
  }
  .hero-pauze:hover {
    transform: translate(-2px, -2px);
  }
  .hero-pauze svg {
    width: 26px;
    height: 26px;
    fill: currentColor;
  }
  @media (max-width: 640px) {
    .hero-pauze {
      top: 14px;
      right: 72px;
      width: 48px;
      height: 48px;
    }
    .hero-pauze svg {
      width: 22px;
      height: 22px;
    }
  }
  .hero-copy {
    position: absolute;
    left: var(--rand);
    right: 40px;
    bottom: 52px;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .hero-line {
    font-weight: 900;
    font-stretch: 125%;
    font-size: clamp(46px, 9vw, 132px);
    line-height: 0.86;
    letter-spacing: -0.035em;
  }
  .hero-line-orange {
    color: var(--color-accent);
    text-shadow: 9px 9px 0 var(--color-bg);
  }
  .hero-line-cream {
    color: var(--color-fg);
    text-shadow: 9px 9px 0 var(--color-primary);
  }

  /* stripe bar */
  .stripe-bar {
    margin: 0;
    display: flex;
    height: 74px;
    border-bottom: 4px solid var(--color-fg);
  }
  .stripe {
    flex: 1;
  }
  .stripe-orange {
    background: var(--color-accent);
  }
  .stripe-purple {
    background: var(--color-primary);
  }
  .stripe-cream {
    background: var(--color-fg);
  }
  .stripe-dark {
    background: var(--color-bg);
  }
  /* wie in het systeem "minder contrast" aanzet, krijgt een rustige,
     effen oranje balk in plaats van de vele kleuren */
  @media (prefers-contrast: less) {
    .stripe {
      background: var(--color-accent);
    }
  }

  /* mission */
  .mission {
    background: var(--color-fg);
    color: var(--color-bg);
    padding: clamp(36px, 5vw, 70px) max(clamp(16px, 4vw, 60px), var(--rand));
    border-bottom: 4px solid var(--color-bg);
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: clamp(24px, 3vw, 40px);
    animation: aq-rise linear both;
    animation-timeline: view();
    animation-range: entry 0% cover 32%;
  }
  .mission-title {
    margin: 0;
    font-weight: 900;
    font-stretch: 118%;
    font-size: clamp(40px, 6.4vw, 92px);
    line-height: 0.9;
    letter-spacing: -0.03em;
    text-wrap: balance;
  }
  .hl-purple {
    color: var(--color-primary);
  }
  .hl-purple-dark {
    color: var(--color-primary-dark);
  }
  /* altijd donkere letters op oranje: crème op oranje is niet goed leesbaar */
  .hl-orange-block {
    background: var(--color-accent);
    color: var(--color-bg);
    padding: 0 8px;
  }
  .mission-side {
    display: flex;
    flex-direction: column;
    gap: 18px;
    font: 400 13px/1.6 var(--font-mono);
    margin: 0;
    max-width: 480px;
  }
  .mission-side p {
    margin: 0;
  }

  /* section head */
  .section-head {
    display: flex;
    align-items: baseline;
    gap: 16px;
    padding: 0 20px 26px;
    color: var(--color-fg);
  }
  .section-head-dark {
    padding: 0 8px 26px;
    color: var(--color-bg);
  }
  .section-eyebrow {
    margin: 0;
    font: 700 12px/1 var(--font-mono);
    letter-spacing: 0.16em;
  }
  .eyebrow-orange {
    color: var(--color-accent);
  }
  .eyebrow-purple {
    color: var(--color-primary);
  }
  /* lichtpaars voor kleine tekst op zwart: donkerpaars is daar te donker */
  .eyebrow-lila {
    color: var(--color-primary-light);
  }
  .section-rule {
    flex: 1;
    height: 2px;
    background: var(--color-gray-800);
  }
  .section-rule-dark {
    background: var(--color-bg);
  }

  /* services grid */
  .services {
    background: var(--color-bg);
    padding: 64px var(--rand);
    border-bottom: 4px solid var(--color-fg);
    overflow-x: clip;
  }
  .services-grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    grid-auto-rows: minmax(150px, 190px);
    gap: 14px;
    animation: aq-pop linear both;
    animation-timeline: view();
    animation-range: cover 0px cover 260px;
  }
  .service-card {
    /* de titel schaalt mee met de breedte van het blok (cqi) */
    container-type: inline-size;
    position: relative;
    display: flex;
    padding: 20px;
    flex-direction: column;
    justify-content: space-between;
    transition: opacity 0.15s;
  }
  .service-card:hover {
    opacity: 0.9;
  }
  /* eigen laag: video en verloop liggen achter de tekst (z-index -1),
     zodat de titel-link over het hele blok kan liggen */
  .service-met-video {
    overflow: hidden;
    isolation: isolate;
    transition:
      opacity 0.15s,
      background-color 0.3s;
  }
  /* .is-in-beeld zet speelInBeeld() op een telefoon, als vervanger van hover.
     De achtergrond wordt zwart, zodat de blokkleur niet doorschemert terwijl
     de video laadt of langs de randen. */
  .service-met-video:hover,
  .service-met-video:focus-within,
  .service-met-video:global(.is-in-beeld) {
    opacity: 1;
    background-color: var(--color-bg);
  }
  /* 1px groter dan het blok aan elke kant: door afronding bleef er anders
     soms een haarlijntje van de blokkleur zichtbaar */
  .service-video {
    position: absolute;
    z-index: -1;
    inset: -1px;
    width: calc(100% + 2px);
    height: calc(100% + 2px);
    object-fit: cover;
    opacity: 0;
    transition: opacity 0.3s;
  }
  /* donker verloop zodat de titel leesbaar blijft op de video */
  .service-met-video::after {
    content: "";
    position: absolute;
    z-index: -1;
    inset: 0;
    background: linear-gradient(transparent 35%, color-mix(in srgb, var(--color-bg) 80%, transparent));
    opacity: 0;
    transition: opacity 0.3s;
    pointer-events: none;
  }
  .service-met-video:hover .service-video,
  .service-met-video:focus-within .service-video,
  .service-met-video:global(.is-in-beeld) .service-video,
  .service-met-video:hover::after,
  .service-met-video:focus-within::after,
  .service-met-video:global(.is-in-beeld)::after {
    opacity: 1;
  }
  .service-met-video .service-id,
  .service-met-video .service-title {
    transition: color 0.3s;
  }
  /* op de video is lichte tekst nodig, ook in de lichte blokken */
  .service-met-video:hover .service-id,
  .service-met-video:hover .service-title,
  .service-met-video:focus-within .service-id,
  .service-met-video:focus-within .service-title,
  .service-met-video:global(.is-in-beeld) .service-id,
  .service-met-video:global(.is-in-beeld) .service-title {
    color: var(--color-fg);
  }
  /* de titel is de link; ::after rekt hem uit over het hele blok */
  .service-link {
    color: inherit;
    text-decoration: none;
    outline: none;
  }
  .service-link::after {
    content: "";
    position: absolute;
    inset: 0;
  }
  .service-card:has(.service-link:focus-visible) {
    outline: 3px solid var(--color-primary-light);
    outline-offset: 3px;
  }
  .service-big {
    grid-column: span 2;
    grid-row: span 2;
    /* padding: 26px; */
  }
  .service-wide {
    grid-column: span 2;
    min-width: 0;
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
  }
  .service-wide .service-title {
    min-width: 0;
  }
  .service-wide.service-long {
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-end;
    gap: 6px;
  }
  .service-full {
    grid-column: 1 / -1;
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
  }
  .service-full .service-title {
    font-stretch: 125%;
    font-size: clamp(32px, 4.4vw, 56px);
    line-height: 0.9;
    text-align: right;
  }
  /* rand als schaduw aan de binnenkant i.p.v. border: een border blijft
     altijd zichtbaar om de video heen, deze schaduw valt eronder */
  .service-outline {
    box-shadow: inset 0 0 0 3px var(--color-fg);
  }
  .service-id {
    font: 700 12px/1 var(--font-mono);
    letter-spacing: 0.14em;
  }
  .service-title {
    margin: 0;
    font-weight: 900;
    font-stretch: 118%;
    /* het langste woord (COACHING, OPDRACHT) is ruim 6x de lettergrootte breed;
       zo past het altijd heel in het blok en breekt het niet midden in het woord */
    font-size: clamp(24px, 15.5cqi, 40px);
    line-height: 0.9;
    overflow-wrap: break-word;
  }
  .service-big .service-title {
    font-size: clamp(48px, 6.6vw, 96px);
    line-height: 0.85;
  }
  .service-wide .service-title {
    font-weight: 900;
    font-stretch: 125%;
    font-size: 56px;
    line-height: 0.85;
  }
  .service-long .service-title {
    font-stretch: 100%;
    font-size: 32px;
    line-height: 1.05;
  }
  .service-card:not(.service-wide).service-long .service-title {
    font-size: 24px;
    line-height: 1.15;
  }

  /* agenda */
  .agenda {
    background: var(--color-accent);
    color: var(--color-bg);
    padding: 60px var(--rand);
    border-bottom: 4px solid var(--color-bg);
    overflow-x: clip;
  }
  /* zelfde knop als "Laad meer" op de artiestenpagina */
  .agenda-meer {
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
  .agenda-meer:hover {
    opacity: 0.8;
  }
  .agenda-meer:focus-visible {
    outline: 3px solid var(--color-bg);
    outline-offset: 3px;
  }
  .agenda-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 20px;
    padding: 0 8px 28px;
  }
  .agenda-title {
    margin: 0;
    font-weight: 900;
    font-stretch: 125%;
    font-size: clamp(38px, 5.2vw, 76px);
    line-height: 0.85;
    letter-spacing: -0.03em;
  }
  .agenda-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    animation: aq-left linear both;
    animation-timeline: view();
    animation-range: cover 0px cover 260px;
  }
  .agenda-row {
    position: relative;
    display: grid;
    /* foto, datum en titel; alle andere info staat op de pagina van de activiteit */
    grid-template-columns: 88px 90px minmax(0, 1fr);
    gap: 20px;
    align-items: center;
    padding: 14px 22px 14px 14px;
    transition: transform 0.15s;
  }
  .agenda-row:not(.skel-row):hover,
  .agenda-row:has(.agenda-link:focus-visible) {
    transform: translateX(6px);
  }
  .agenda-row:has(.agenda-link:focus-visible) {
    outline: 3px solid var(--color-bg);
    outline-offset: 3px;
  }
  .agenda-link {
    color: inherit;
    text-decoration: none;
  }
  .agenda-link:focus-visible {
    outline: none;
  }
  /* de hele regel is klikbaar */
  .agenda-link::after {
    content: "";
    position: absolute;
    inset: 0;
  }
  @media (prefers-reduced-motion: reduce) {
    .agenda-row {
      transition: none;
    }
    .agenda-row:not(.skel-row):hover,
    .agenda-row:has(.agenda-link:focus-visible) {
      transform: none;
    }
  }
  .agenda-foto {
    display: block;
    width: 88px;
    height: 88px;
    object-fit: cover;
  }
  .agenda-foto-leeg {
    background: currentColor;
    opacity: 0.12;
  }
  .agenda-date {
    font: 700 30px/1 var(--font-display);
  }
  .agenda-name {
    margin: 0;
    font-weight: 900;
    font-stretch: 110%;
    font-size: clamp(20px, 2.4vw, 34px);
    line-height: 1;
    /* lange woorden (muziekproductie) afbreken in plaats van over de tijd heen lopen */
    hyphens: auto;
    overflow-wrap: break-word;
  }
  .agenda-empty {
    padding: 32px 22px;
    text-align: center;
    font: 400 14px/1.6 var(--font-mono);
    opacity: 0.85;
  }

  /* skeleton loaders */
  .skel {
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--color-bg) 14%, transparent) 25%,
      color-mix(in srgb, var(--color-bg) 5%, transparent) 37%,
      color-mix(in srgb, var(--color-bg) 14%, transparent) 63%
    );
    background-size: 400% 100%;
    border-radius: 4px;
    animation: skel-shimmer 1.4s ease infinite;
  }
  .skel-row {
    background: color-mix(in srgb, var(--color-bg) 6%, transparent);
  }
  .skel-date {
    height: 26px;
    width: 70px;
  }
  .skel-name {
    height: 20px;
    width: 60%;
  }
  .skel-card {
    background: var(--color-gray-950);
    cursor: default;
  }
  .skel-photo {
    height: 280px;
  }
  .skel-talent-name {
    height: 26px;
    width: 55%;
  }
  @keyframes skel-shimmer {
    0% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0 50%;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .skel {
      animation: none;
    }
  }

  /* talent */
  /* zelfde knop als LAAD MEER op de artiestenpagina */
  .talent-more {
    display: block;
    width: fit-content;
    margin: 36px auto 0;
    padding: 14px 32px;
    background: var(--color-bg);
    color: var(--color-fg);
    border-radius: 26px;
    font: 800 14px/1 var(--font-display);
    letter-spacing: 0.04em;
    text-decoration: none;
    transition: opacity 0.15s;
  }
  .talent-more:hover {
    opacity: 0.8;
  }

  /* talent */
  .talent {
    background: var(--color-fg);
    padding: 64px var(--rand);
    border-bottom: 4px solid var(--color-bg);
    overflow-x: clip;
  }
  .talent-grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
    animation: aq-right linear both;
    animation-timeline: view();
    animation-range: cover 0px cover 260px;
  }
  .talent-card {
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .talent-card.bg-cream {
    border: 1px solid var(--color-bg);
  }
  .talent-card-klik {
    position: relative;
    transition:
      transform 0.15s,
      box-shadow 0.15s;
  }
  .talent-card-klik:hover,
  .talent-card-klik:has(.talent-link:focus-visible) {
    transform: translate(-3px, -3px);
    box-shadow: 6px 6px 0 var(--color-bg);
  }
  .talent-card-klik:has(.talent-link:focus-visible) {
    outline: 3px solid var(--color-accent);
    outline-offset: 3px;
  }
  .talent-link {
    color: inherit;
    text-decoration: none;
  }
  .talent-link:focus-visible {
    outline: none;
  }
  .talent-link::after {
    content: "";
    position: absolute;
    inset: 0;
  }
  @media (prefers-reduced-motion: reduce) {
    .talent-card-klik {
      transition: none;
    }
    .talent-card-klik:hover,
    .talent-card-klik:has(.talent-link:focus-visible) {
      transform: none;
    }
  }
  .talent-photo {
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
  .talent-img {
    transform-origin: 50% 100%;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .talent-photo figcaption {
    font: 400 11px/1.4 var(--font-mono);
    text-align: center;
    letter-spacing: 0.08em;
  }
  .bg-dark .talent-photo {
    background: repeating-linear-gradient(
      45deg,
      var(--color-gray-800) 0 12px,
      var(--color-gray-900) 12px 24px
    );
  }
  .bg-purple .talent-photo {
    background: repeating-linear-gradient(
      45deg,
      color-mix(in srgb, var(--color-bg) 22%, transparent) 0 12px,
      color-mix(in srgb, var(--color-bg) 8%, transparent) 12px 24px
    );
  }
  .talent-meta {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin: 0;
  }
  .talent-name {
    margin: 0;
    font-weight: 900;
    font-stretch: 110%;
    font-size: 30px;
    word-spacing: 0.3em;
  }

  /* crew */
  .crew {
    background: var(--color-bg);
    padding: 64px var(--rand);
    border-bottom: 4px solid var(--color-fg);
  }
  .crew-kop {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
    margin: 0 0 30px 8px;
  }
  .crew-title {
    margin: 0;
    max-width: 1080px;
    font-weight: 900;
    font-stretch: 115%;
    font-size: clamp(34px, 4.6vw, 64px);
    line-height: 0.92;
    letter-spacing: -0.03em;
    color: var(--color-fg);
    text-wrap: balance;
  }
  .crew-nav {
    flex: none;
    display: flex;
    gap: 10px;
  }
  .crew-nav-knop {
    display: grid;
    place-items: center;
    width: 52px;
    height: 52px;
    background: var(--color-accent);
    border: 0;
    border-radius: 50%;
    cursor: pointer;
    transition: background 0.15s;
  }
  .crew-nav-knop svg {
    width: 22px;
    height: 22px;
    fill: none;
    stroke: var(--color-bg);
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .crew-nav-knop:hover:not(:disabled) {
    background: var(--color-fg);
  }
  .crew-nav-knop:disabled {
    opacity: 0.35;
    cursor: default;
  }
  .crew-grid {
    list-style: none;
    /* loopt door tot de rand van het scherm; de eerste kaart staat gelijk met de
       kop (100cqw = breedte van <main>, zie stylesheet.css) */
    --crew-rand: max(40px, (100cqw - 1760px) / 2);
    margin: 0 calc(-1 * var(--crew-rand));
    padding: 0 var(--crew-rand) 16px;
    display: flex;
    gap: 28px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scroll-padding: 0 var(--crew-rand);
    scrollbar-width: none;
    animation: aq-pop linear both;
    animation-timeline: view();
    animation-range: cover 0px cover 260px;
  }
  .crew-grid::-webkit-scrollbar {
    display: none;
  }
  .crew-card {
    position: relative;
    flex: none;
    width: clamp(220px, 21vw, 290px);
    aspect-ratio: 5 / 7;
    overflow: hidden;
    scroll-snap-align: start;
    background: var(--color-gray-900);
    box-shadow: 10px 10px 0 var(--color-fg);
  }
  .crew-schaduw-purple {
    box-shadow: 10px 10px 0 var(--color-primary);
  }
  .crew-schaduw-orange {
    box-shadow: 10px 10px 0 var(--color-accent);
  }
  .crew-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .crew-geen-foto {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    margin: 0;
    color: var(--color-muted);
    font: 400 16px/1.4 var(--font-mono);
  }
  .crew-meta {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    margin: 0;
    padding: 70px 14px 20px;
    background: linear-gradient(transparent, color-mix(in srgb, var(--color-bg) 92%, transparent) 62%);
    color: var(--color-fg);
    text-align: center;
  }
  .crew-name {
    margin: 0;
    font-weight: 900;
    font-stretch: 110%;
    font-size: clamp(19px, 1.6vw, 24px);
    line-height: 1.05;
  }
  .crew-role {
    margin: 0;
    color: var(--color-accent);
    font: 700 16px/1.2 var(--font-mono);
    letter-spacing: 0.06em;
  }
  /* iets breder dan de andere kaarten, zodat de tekst op 16px past */
  .crew-intro {
    width: clamp(260px, 24vw, 320px);
    display: flex;
    flex-direction: column;
    padding: 22px;
    background: var(--color-primary);
    color: var(--color-fg);
  }
  .crew-intro p {
    margin: 0;
  }
  .crew-intro-getal {
    font-weight: 900;
    font-stretch: 118%;
    font-size: clamp(72px, 7vw, 104px);
    line-height: 0.85;
    letter-spacing: -0.04em;
  }
  .crew-intro-kop {
    margin-top: 8px !important;
    font-weight: 900;
    font-stretch: 110%;
    font-size: 20px;
  }
  .crew-intro-tekst {
    margin-top: auto !important;
    font: 400 16px/1.4 var(--font-mono);
  }

  /* video */
  .video-section {
    background: var(--color-bg);
    padding: 64px var(--rand);
    border-bottom: 4px solid var(--color-fg);
    overflow-x: clip;
  }
  .video-title {
    margin: 0 0 14px 8px;
    max-width: 900px;
    font-weight: 900;
    font-stretch: 115%;
    font-size: clamp(34px, 4.6vw, 64px);
    line-height: 0.92;
    letter-spacing: -0.03em;
    color: var(--color-fg);
    text-wrap: balance;
    animation: aq-rise linear both;
    animation-timeline: view();
    animation-range: entry 0% cover 32%;
  }
  .video-sub {
    margin: 0 0 36px 8px;
    color: var(--color-fg);
    font: 400 16px/1.5 var(--font-mono);
  }

  /* tablet */
  @media (max-width: 860px) {
    .services-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .service-big {
      grid-column: span 2;
    }
    .service-wide:not(.service-big) {
      grid-column: span 1;
      flex-direction: column;
      align-items: flex-start;
      justify-content: flex-end;
    }
    .service-wide:not(.service-big) .service-title {
      font-size: clamp(22px, 8vw, 40px);
      font-stretch: 110%;
    }
    .agenda-row {
      grid-template-columns: 88px minmax(0, 1fr);
      row-gap: 6px;
    }
    /* foto links, datum en titel ernaast onder elkaar */
    .agenda-foto {
      grid-row: span 2;
    }
    .talent-grid {
      grid-template-columns: 1fr;
    }
  }

  /* phone */
  @media (max-width: 640px) {
    .brand {
      padding: 28px 16px;
    }
    .brand-logo {
      height: 92px;
    }

    .hero {
      min-height: 320px;
    }
    .hero-copy {
      left: 20px;
      right: 20px;
      bottom: 28px;
      gap: 2px;
    }
    .hero-line {
      font-size: clamp(34px, 13vw, 64px);
    }

    .mission,
  .services,
  .agenda,
  .talent,
  .crew,
  .video-section {
      padding-left: 20px;
      padding-right: 20px;
    }

    .services-grid {
      grid-template-columns: 1fr;
      grid-auto-rows: auto;
    }
    .crew-kop {
      flex-direction: column;
      align-items: flex-start;
      margin-left: 0;
    }
    .crew-grid {
      margin: 0 -20px;
      padding: 0 20px 16px;
      scroll-padding: 0 20px;
    }
    .crew-card {
      width: 68vw;
    }
    .crew-intro {
      width: 76vw;
    }
    .service-big,
    .service-wide,
    .service-full {
      grid-column: span 1;
    }
    .service-full {
      flex-direction: column;
      align-items: flex-start;
    }
    .service-full .service-title {
      text-align: left;
    }

    .service-card {
      min-height: 130px;
      gap: 11px;
    }

    .agenda-list {
      gap: 20px;
    }
    /* telefoon: een kaart met de foto over de volle breedte bovenaan,
       daaronder de datum en de titel */
    .agenda-row {
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas:
        "foto"
        "datum"
        "naam";
      align-items: start;
      gap: 6px;
      padding: 0 0 20px;
      overflow: hidden;
    }
    .agenda-row > :not(.agenda-foto) {
      margin-left: 18px;
      margin-right: 18px;
    }
    .agenda-foto {
      grid-area: foto;
      width: 100%;
      height: auto;
      aspect-ratio: 16 / 9;
      margin-bottom: 10px;
    }
    .agenda-foto-leeg {
      display: none;
    }
    /* zonder foto begint de kaart met wat ruimte boven de datum */
    .agenda-foto-leeg + .agenda-date {
      margin-top: 18px;
    }
    .agenda-date {
      grid-area: datum;
      font-size: 26px;
    }
    .agenda-name {
      grid-area: naam;
      font-size: 24px;
      line-height: 1.05;
      /* genoeg ruimte op een telefoon: woorden heel laten */
      hyphens: manual;
    }
  }
</style>
