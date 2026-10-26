<script>
  import { base } from "$app/paths";
  import { fade, fly } from "svelte/transition";
  import { cubicIn, cubicOut } from "svelte/easing";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { haalCollectieOp } from "$lib/publiekeData.js";
  import { isCrewBrowser, markeerCrewBrowser } from "$lib/crew.js";
  import { navigatie, crewPaginas } from "$lib/data/navigatie.js";
  import { agendaPoster } from "$lib/data/agendaPosters.js";
  import dansFoto from "$lib/assets/fotos/hero/meiden-die-dansen.avif";
  import zingFoto from "$lib/assets/fotos/hero/zangeres-met-gitaar.avif";
  import optredenFoto from "$lib/assets/fotos/hero/optreden.avif";
  import zingenFoto from "$lib/assets/fotos/hero/meiden-die-zingen.avif";
  import tekenFoto from "$lib/assets/fotos/hero/meid-die-tekent.avif";
  import schrijfFoto from "$lib/assets/fotos/hero/meid-die-schrijft.avif";
  import interieurFoto from "$lib/assets/fotos/hero/interieur-tekening.avif";
  import pandFoto from "$lib/assets/fotos/pand/artquake-pand-voorkant.avif";

  const fotos = {
    dans: dansFoto,
    interieur: interieurFoto,
    optreden: optredenFoto,
    zingen: zingenFoto,
    teken: tekenFoto,
    pand: pandFoto,
    schrijf: schrijfFoto,
    zing: zingFoto,
  };
  // wie is ingelogd, ziet Reserveren en Dashboard in plaats van Login en kan uitloggen
  // Firebase (inloggen) wordt alleen geladen in een browser waar de crew al
  // eens heeft ingelogd, en pas als de pagina klaar is met laden
  let ingelogd = $state(false);
  onMount(() => {
    if (!isCrewBrowser()) return;
    let stop;
    const laad = async () => {
      const [{ auth }, { onAuthStateChanged }] = await Promise.all([
        import("$lib/firebaseApp.js"),
        import("firebase/auth"),
      ]);
      stop = onAuthStateChanged(auth, (user) => {
        ingelogd = !!user;
        if (!user) markeerCrewBrowser(false);
      });
    };
    const idle = window.requestIdleCallback ?? ((cb) => setTimeout(cb, 1500));
    idle(() => laad().catch(() => {}));
    return () => stop?.();
  });

  const items = $derived(
    navigatie
      // ingelogd: Login wordt Reserveren + Dashboard (reserveren is alleen voor de crew)
      .flatMap((it) =>
        ingelogd && it.href === "/login"
          ? [
              { label: "Reserveren", href: "/reserveren", info: "OEFENRUIMTE · STUDIO · ATELIER", foto: "pand" },
              { ...it, label: "Dashboard", href: "/dashboard" },
            ]
          : [it]
      )
      .concat(
        ingelogd
          ? [{ label: "Uitloggen", uitloggen: true, info: "TOT DE VOLGENDE KEER", foto: "interieur" }]
          : []
      )
      .map((it) => ({
        ...it,
        label: it.label.toUpperCase(),
        foto: fotos[it.foto],
      }))
  );

  async function uitloggen() {
    open = false;
    // eerst weg van een pagina die login vereist, dan pas uitloggen
    await goto(base || "/");
    const [{ auth }, { signOut }] = await Promise.all([
      import("$lib/firebaseApp.js"),
      import("firebase/auth"),
    ]);
    await signOut(auth);
    markeerCrewBrowser(false);
    ingelogd = false;
  }

  let open = $state(false);

  // menu schuift van rechts het scherm in; zonder beweging bij reduced motion
  function schuif(node, { uit = false } = {}) {
    const rustig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (rustig) return fade(node, { duration: 0 });
    return fly(node, {
      x: window.innerWidth,
      opacity: 1,
      duration: uit ? 320 : 520,
      easing: uit ? cubicIn : cubicOut,
    });
  }
  let hoverIndex = $state(-1);
  let agenda = $state([]);
  let agendaGeladen = $state(false);
  let knopEl = $state();

  const huidigeIndex = $derived(
    items.findIndex((it) => {
      if (!it.href || it.href.includes("#")) return false;
      const pad = page.url.pathname.replace(/\/$/, "");
      if (it.href === "/") return pad === base;
      return pad.startsWith(`${base}${it.href}`);
    })
  );
  const actieveIndex = $derived(hoverIndex >= 0 ? hoverIndex : Math.max(huidigeIndex, 0));

  // De posters worden al opgehaald als de pagina klaar is met laden (niet pas bij
  // openen). Anders staan er bij de eerste keer openen even lege kaders die daarna
  // verspringen naar de posters of naar "Binnenkort nieuwe posters".
  let agendaBezig = null;
  function laadAgenda() {
    agendaBezig ??= haalAgendaOp();
    return agendaBezig;
  }
  onMount(() => {
    const idle = window.requestIdleCallback ?? ((cb) => setTimeout(cb, 1500));
    idle(async () => {
      await laadAgenda();
      // de posterafbeeldingen alvast in de cache, zodat ze niet pas bij openen inladen
      for (const ev of agenda) new Image().src = agendaPoster(ev);
    });
  });
  async function haalAgendaOp() {
    try {
      const n = new Date();
      const vandaag = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
      agenda = (await haalCollectieOp("agenda"))
        // alleen komende activiteiten waarvoor een poster is gekozen
        .filter((a) => a.date && a.date >= vandaag && agendaPoster(a))
        .sort((a, b) => `${a.date}${a.startTime ?? ""}`.localeCompare(`${b.date}${b.startTime ?? ""}`))
        .slice(0, 4);
    } catch {
      agenda = [];
    }
    agendaGeladen = true;
  }

  function openMenu() {
    open = true;
    hoverIndex = -1;
    laadAgenda();
  }

  // Na sluiten (knop, Escape, klik ernaast) gaat de focus terug naar de
  // menuknop. Dat kan pas als de uitschuif-animatie klaar is: tot dan is de
  // dialog nog modaal en is de rest van de pagina niet te bereiken.
  let focusTerug = false;
  function sluitMenu() {
    focusTerug = true;
    open = false;
  }
  function naUitschuiven(e) {
    // eerst de modale stand opheffen, anders is de knop nog onbereikbaar
    e.currentTarget.close?.();
    if (focusTerug) knopEl?.focus();
    focusTerug = false;
  }

  function korteDatum(d) {
    const [, m, dag] = d.split("-");
    return `${dag}.${m}`;
  }

  let menuEl = $state();

  // Het menu is een echte <dialog>. showModal() regelt de rest: de pagina
  // erachter is onbereikbaar, de focus gaat naar het eerste menu-item en blijft
  // in het menu, en Escape sluit (via het cancel-event hieronder).
  $effect(() => {
    if (!open || !menuEl) return;
    if (!menuEl.open) menuEl.showModal();
    const vorige = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = vorige;
    };
  });

  // Escape: zelf sluiten, zodat de uitschuif-animatie nog kan spelen
  function onCancel(e) {
    e.preventDefault();
    sluitMenu();
  }

  // klik op de donkere achtergrond (::backdrop) komt binnen op de dialog zelf
  function onDialogKlik(e) {
    if (e.target === menuEl) sluitMenu();
  }

  // sluit het menu na navigatie
  $effect(() => {
    page.url.href;
    open = false;
  });
</script>

  <button
    bind:this={knopEl}
    type="button"
    class="menu-knop"
    aria-label="Menu openen"
    aria-expanded={open}
    aria-controls="hoofdmenu"
    onclick={openMenu}
  >
    <span></span><span></span><span></span>
  </button>

  {#if open}
    <dialog
      bind:this={menuEl}
      class="menu"
      id="hoofdmenu"
      aria-label="Menu"
      oncancel={onCancel}
      onclick={onDialogKlik}
      onoutroend={naUitschuiven}
      in:schuif
      out:schuif={{ uit: true }}
    >
      <nav class="menu-links" aria-label="Hoofdmenu">
        <span class="menu-pad" aria-hidden="true">/MENU</span>
        <ol class="menu-lijst" onmouseleave={() => (hoverIndex = -1)}>
          {#each items as it, i}
            <li
              class="menu-item"
              style:--i={i}
              class:is-huidig={i === huidigeIndex}
              class:is-actief={i === hoverIndex}
            >
              {#if it.uitloggen}
                <button
                  type="button"
                  onmouseenter={() => (hoverIndex = i)}
                  onfocus={() => (hoverIndex = i)}
                  onclick={uitloggen}
                >
                  <span class="menu-nr">{String(i + 1).padStart(2, "0")}</span>
                  <span class="menu-label">{it.label}</span>
                </button>
              {:else}
                <!-- autofocus: de dialog zet de focus bij openen op het eerste menu-item -->
                <!-- svelte-ignore a11y_autofocus -->
                <a
                  href="{base}{it.href}"
                  data-sveltekit-reload={crewPaginas.includes(it.href) || undefined}
                  autofocus={i === 0}
                  onmouseenter={() => (hoverIndex = i)}
                  onfocus={() => (hoverIndex = i)}
                  onclick={() => (open = false)}
                  aria-current={i === huidigeIndex ? "page" : undefined}
                >
                  <span class="menu-nr">{String(i + 1).padStart(2, "0")}</span>
                  <span class="menu-label">{it.label}</span>
                </a>
              {/if}
            </li>
          {/each}
        </ol>
        <figure class="menu-foto" aria-hidden="true">
          <span class="menu-foto-kader">
            {#each items as it, i}
              <img src={it.foto} alt="" class:zichtbaar={i === actieveIndex} />
            {/each}
          </span>
          <figcaption>{items[actieveIndex].info}</figcaption>
        </figure>
      </nav>

      <aside class="menu-rechts" aria-label="Komende activiteiten">
        <header class="menu-rechts-kop">
          <p>BINNENKORT · ALLES GRATIS</p>
          <h2>OP DE POSTER</h2>
        </header>
        <!-- de eerstvolgende activiteiten met een poster, als posters aan de muur -->
        <ol class="menu-posters">
          {#if !agendaGeladen}
            {#each Array(4) as _}
              <li class="menu-poster menu-poster-skel" aria-hidden="true"></li>
            {/each}
          {:else if agenda.length === 0}
            <li class="menu-leeg">Binnenkort nieuwe posters.</li>
          {:else}
            {#each agenda as ev (ev.id)}
              <li class="menu-poster">
                <a href="{base}/agenda/{ev.id}" onclick={() => (open = false)}>
                  <img src={agendaPoster(ev)} alt="" loading="lazy" />
                  <span class="menu-poster-datum">{korteDatum(ev.date)}</span>
                  <span class="menu-visueel-verborgen">{ev.band}</span>
                </a>
              </li>
            {/each}
          {/if}
        </ol>
      </aside>

      <button type="button" class="menu-sluit" aria-label="Menu sluiten" onclick={sluitMenu}>
        <span></span><span></span>
      </button>
    </dialog>
  {/if}

<style>
  /* knop */
  .menu-knop {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 90;
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
    cursor: pointer;
    transition: transform 0.12s;
  }
  .menu-knop:hover {
    transform: translate(-2px, -2px);
  }
  .menu-knop span {
    display: block;
    height: 3px;
    background: var(--color-bg);
  }
  .menu-knop span:nth-child(2) {
    width: 70%;
  }

  /* overlay */
  /* de donkere laag achter het menu (hoort bij <dialog>) */
  .menu::backdrop {
    background: color-mix(in srgb, var(--color-bg) 85%, transparent);
    backdrop-filter: blur(3px);
  }
  .menu {
    position: fixed;
    inset: clamp(0px, 3vw, 40px);
    z-index: 100;
    /* standaardopmaak van <dialog> in de browser uitzetten */
    width: auto;
    height: auto;
    max-width: none;
    max-height: none;
    margin: 0;
    padding: 0;
    color: inherit;
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
    --foto-b: clamp(150px, 15vw, 230px);
    --foto-r: clamp(24px, 3vw, 48px);
    overflow: hidden;
    background: var(--color-bg);
    border: 4px solid var(--color-bg);
    border-radius: 18px;
    box-shadow: 10px 10px 0 var(--color-primary);
  }
  /* items, foto en agenda schuiven na elkaar in */
  @keyframes menu-item-in {
    from {
      opacity: 0;
      transform: translateX(80px);
    }
  }
  @keyframes menu-fade {
    from {
      opacity: 0;
    }
  }
  .menu-item {
    animation: menu-item-in 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both;
    animation-delay: calc(0.22s + var(--i) * 0.055s);
  }
  .menu-foto {
    animation: menu-fade 0.4s ease-out 0.55s both;
  }
  .menu-rechts > * {
    animation: menu-item-in 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) 0.35s both;
  }
  .menu-rechts > .menu-posters {
    animation-delay: 0.45s;
  }
  @media (prefers-reduced-motion: reduce) {
    .menu-item,
    .menu-foto,
    .menu-rechts > * {
      animation: none;
    }
  }

  /* links: genummerde lijst */
  .menu-links {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 56px 0;
    color: var(--color-fg);
    overflow-y: auto;
  }
  .menu-pad {
    position: absolute;
    top: 28px;
    left: 32px;
    color: var(--color-accent);
    font: 400 12px/1 var(--font-mono);
    letter-spacing: 0.1em;
    writing-mode: vertical-rl;
    transform: rotate(180deg);
  }
  .menu-lijst {
    position: relative;
    z-index: 1;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .menu-item a,
  .menu-item button {
    position: relative;
    display: grid;
    grid-template-columns: 56px 1fr;
    align-items: center;
    column-gap: 14px;
    padding: 2px calc(var(--foto-b) + var(--foto-r) + 32px) 2px clamp(24px, 5vw, 72px);
    color: inherit;
    text-decoration: none;
    outline: none;
  }
  /* Uitloggen is een knop, maar ziet eruit als de andere menu-items */
  .menu-item button {
    width: 100%;
    border: 0;
    background: none;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .menu-nr {
    align-self: start;
    padding-top: 0.55em;
    font: 700 15px/1 var(--font-mono);
    letter-spacing: 0.04em;
  }
  .menu-label {
    position: relative;
    font-weight: 900;
    font-size: clamp(30px, 3.8vw, 58px);
    line-height: 1;
    letter-spacing: -0.03em;
  }
  /* huidige pagina: geel/oranje met doorgestreepte lijn */
  .menu-item.is-huidig .menu-nr,
  .menu-item.is-huidig .menu-label {
    color: var(--color-accent);
  }
  .menu-item.is-huidig .menu-label::after {
    content: "";
    position: absolute;
    left: -0.4em;
    right: -0.9em;
    top: 52%;
    height: 2px;
    background: var(--color-accent);
  }

  /* hover: band over de volle breedte */
  .menu-item.is-actief a,
  .menu-item.is-actief button {
    background: var(--color-accent);
    color: var(--color-bg);
  }
  .menu-item.is-actief .menu-nr,
  .menu-item.is-actief .menu-label {
    color: var(--color-bg);
  }
  .menu-item.is-actief .menu-label::after {
    background: var(--color-bg);
  }
  .menu-item a:focus-visible,
  .menu-item button:focus-visible {
    outline: 3px solid var(--color-primary-light);
    outline-offset: -3px;
  }

  .menu-foto {
    position: absolute;
    right: var(--foto-r);
    top: 50%;
    z-index: 2;
    width: var(--foto-b);
    margin: 0;
    transform: translateY(-50%);
    pointer-events: none;
  }
  .menu-foto-kader {
    position: relative;
    display: block;
    aspect-ratio: 4 / 5;
    border: 3px solid var(--color-fg);
    box-shadow: 8px 8px 0 var(--color-primary);
    background: var(--color-bg);
    overflow: hidden;
    transform: rotate(2deg);
  }
  .menu-foto figcaption {
    margin-top: 20px;
    color: var(--color-accent);
    font: 400 11px/1.4 var(--font-mono);
    letter-spacing: 0.08em;
  }
  .menu-foto img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transition: opacity 0.2s;
  }
  .menu-foto img.zichtbaar {
    opacity: 1;
  }

  /* rechts: agenda */
  .menu-rechts {
    display: flex;
    flex-direction: column;
    padding: 72px clamp(24px, 3vw, 40px) 32px;
    background: var(--color-fg);
    color: var(--color-bg);
    overflow-y: auto;
  }
  /* overal dezelfde ruimte (16px): label, titel, lijn en wat eronder staat */
  .menu-rechts-kop {
    padding-bottom: 16px;
    border-bottom: 1px solid var(--color-bg);
  }
  .menu-rechts-kop p {
    margin: 0 0 16px;
    font: 700 11px/1 var(--font-mono);
    letter-spacing: 0.14em;
    color: var(--color-primary);
  }
  .menu-rechts-kop h2 {
    margin: 0;
    font-weight: 900;
    font-stretch: 110%;
    font-size: clamp(22px, 2.2vw, 32px);
    letter-spacing: -0.01em;
  }

  /* posterwand: twee kolommen staande posters, om en om iets scheef */
  .menu-posters {
    display: grid;
    align-items: start;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 22px 18px;
    margin: 16px 0 0;
    padding: 0 8px 8px 0;
    list-style: none;
  }
  .menu-poster {
    --schuin: -1.5deg;
    --schaduw: var(--color-primary);
    transform: rotate(var(--schuin));
    transition: transform 0.15s;
  }
  .menu-poster:nth-child(even) {
    --schuin: 1.5deg;
    --schaduw: var(--color-accent);
  }
  .menu-poster:hover,
  .menu-poster:focus-within {
    transform: rotate(0) scale(1.03);
  }
  /* elke poster helemaal zichtbaar, in zijn eigen verhouding */
  .menu-poster a {
    position: relative;
    display: block;
    overflow: hidden;
    background: var(--color-bg);
    border: 3px solid var(--color-bg);
    box-shadow: 6px 6px 0 var(--schaduw);
    text-decoration: none;
  }
  .menu-poster a:focus-visible {
    outline: 3px solid var(--color-bg);
    outline-offset: 4px;
  }
  .menu-poster img {
    display: block;
    width: 100%;
    height: auto;
  }
  .menu-poster-datum {
    position: absolute;
    top: 8px;
    left: 8px;
    padding: 5px 8px;
    background: var(--color-accent);
    color: var(--color-bg);
    font: 700 12px/1 var(--font-mono);
    letter-spacing: 0.06em;
  }
  .menu-visueel-verborgen {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
  .menu-poster-skel {
    aspect-ratio: 3 / 4;
    background: color-mix(in srgb, var(--color-bg) 8%, transparent);
  }
  .menu-leeg {
    grid-column: 1 / -1;
    padding: 0;
    font: 400 13px/1.5 var(--font-mono);
  }
  @media (prefers-reduced-motion: reduce) {
    .menu-poster,
    .menu-poster:hover,
    .menu-poster:focus-within {
      transition: none;
      transform: rotate(var(--schuin));
    }
  }

  /* sluitknop */
  .menu-sluit {
    position: absolute;
    top: 16px;
    right: 16px;
    z-index: 3;
    width: 44px;
    height: 44px;
    background: var(--color-bg);
    border: 2px solid var(--color-bg);
    border-radius: 50%;
    cursor: pointer;
  }
  .menu-sluit span {
    position: absolute;
    left: 10px;
    right: 10px;
    top: 50%;
    height: 2px;
    /* halve dikte omhoog, zodat het kruis precies in het midden staat */
    margin-top: -1px;
    background: var(--color-fg);
    transform: rotate(45deg);
  }
  .menu-sluit span + span {
    transform: rotate(-45deg);
  }
  .menu-sluit:hover {
    background: var(--color-primary);
    border-color: var(--color-primary);
  }

  @media (max-width: 900px) {
    .menu {
      inset: 0;
      border-radius: 0;
      box-shadow: none;
      grid-template-columns: 1fr;
      grid-template-rows: auto auto;
      overflow-y: auto;
    }
    .menu-links {
      padding: 80px 0 40px;
      overflow: visible;
    }
    .menu-foto {
      display: none;
    }
    .menu-item a,
    .menu-item button {
      grid-template-columns: 40px 1fr;
      padding-right: 24px;
    }
    .menu-rechts {
      padding-top: 32px;
      overflow: visible;
    }
    .menu-sluit {
      background: var(--color-accent);
      border-color: var(--color-accent);
    }
    .menu-sluit span {
      background: var(--color-bg);
    }
  }

  @media (max-width: 640px) {
    .menu-knop {
      top: 14px;
      right: 14px;
      width: 48px;
      height: 48px;
      padding: 0 11px;
    }
  }
</style>
