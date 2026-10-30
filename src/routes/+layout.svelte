<script>
  import '$lib/styles/stylesheet.css';
  import logo from '$lib/assets/artquake-logo.avif';
  import { base } from '$app/paths';
  import { MAIL_API, TURNSTILE_SITEKEY } from '$lib/data/site.js';
  import HamburgerMenu from '$lib/components/HamburgerMenu.svelte';
  import { diensten } from '$lib/data/diensten.js';
  import { navigatie, crewPaginas } from '$lib/data/navigatie.js';
  import { bewaarInvoer } from '$lib/bewaardeInvoer.svelte.js';

  let { children } = $props();

  let ctaNaam = $state('');
  let ctaEmail = $state('');
  let ctaTelefoon = $state('');
  let ctaBericht = $state('');
  // honeypot tegen spam: mensen zien dit veld niet, bots vullen het wel in
  let ctaHoney = $state('');
  let ctaVersturen = $state(false);
  let ctaVerstuurd = $state(false);
  let ctaFout = $state('');

  // Spamcontrole (Cloudflare Turnstile). Het vakje laadt zodra het formulier in
  // beeld komt. Op de crewpagina's en /annuleren pas als iemand het formulier
  // gebruikt: daar draait anders geen script van buiten (zie app.html).
  let ctaForm = $state();
  let ctaControle = $state();
  let ctaToken = $state('');
  let controleId;
  let controleGeladen = false;

  function laadControle() {
    if (controleGeladen) return;
    controleGeladen = true;
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => {
      controleId = window.turnstile.render(ctaControle, {
        sitekey: TURNSTILE_SITEKEY,
        size: 'flexible',
        language: 'nl',
        theme: 'dark',
        callback: (token) => (ctaToken = token),
        'expired-callback': () => (ctaToken = ''),
        'error-callback': () => (ctaToken = ''),
      });
    };
    document.head.appendChild(script);
  }

  $effect(() => {
    const kijker = new IntersectionObserver(
      ([form]) => {
        const stil = [...crewPaginas, '/annuleren'].some((pad) => location.pathname.startsWith(base + pad));
        if (form.isIntersecting && !stil) {
          laadControle();
          kijker.disconnect();
        }
      },
      { rootMargin: '300px' }
    );
    kijker.observe(ctaForm);
    return () => kijker.disconnect();
  });

  // knop "naar boven" (alleen op een telefoon): verschijnt na een stukje scrollen
  let scrollY = $state(0);
  function naarBoven() {
    const rustig = matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: rustig ? 'auto' : 'smooth' });
  }

  // half getypt bericht blijft staan na verversen (het verborgen spamveld niet)
  bewaarInvoer(
    'contact',
    () => ({ naam: ctaNaam, email: ctaEmail, telefoon: ctaTelefoon, bericht: ctaBericht }),
    (x) => {
      ctaNaam = x.naam ?? '';
      ctaEmail = x.email ?? '';
      ctaTelefoon = x.telefoon ?? '';
      ctaBericht = x.bericht ?? '';
    }
  );

  async function verstuurContact(e) {
    e.preventDefault();
    ctaFout = '';
    // een bot heeft het verborgen veld ingevuld: doe alsof het gelukt is
    // en verstuur niets
    if (ctaHoney) {
      ctaVerstuurd = true;
      return;
    }
    if (!ctaToken) {
      ctaFout = 'De spamcontrole is nog bezig. Probeer het zo nog eens.';
      return;
    }
    ctaVersturen = true;
    try {
      // De mail-API verstuurt de mail (zie worker/). Die accepteert alleen
      // art-quake.com: lokaal (npm run dev) lukt versturen dus niet.
      const res = await fetch(`${MAIL_API}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          naam: ctaNaam,
          email: ctaEmail,
          telefoon: ctaTelefoon,
          bericht: ctaBericht,
          turnstile: ctaToken,
          // het bericht wordt weggegooid als _honey is ingevuld
          _honey: ctaHoney,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.success !== true) throw new Error(data.message || 'Versturen mislukt');
      ctaNaam = '';
      ctaEmail = '';
      ctaTelefoon = '';
      ctaBericht = '';
      ctaVerstuurd = true;
    } catch (err) {
      ctaFout = 'Versturen mislukt. Probeer het later opnieuw of mail ons direct.';
    } finally {
      ctaVersturen = false;
      // een token werkt maar één keer
      ctaToken = '';
      window.turnstile?.reset(controleId);
    }
  }
</script>

<!-- alleen zichtbaar als je met de Tab-toets begint: springt over het menu heen -->
<a class="skip-link" href="#inhoud">Naar de inhoud</a>

<svelte:window bind:scrollY />

<HamburgerMenu />

<main id="inhoud" tabindex="-1">
  {@render children()}
</main>

<section class="cta" id="doe-mee" aria-label="Contact">
  <span class="cta-blob" aria-hidden="true"></span>
  <hgroup class="cta-copy">
    <h2 class="cta-title">VRAAG HET<br />GEWOON.<br />SERIEUS.</h2>
    <p class="cta-text">
      Een vraag, een idee of gewoon interesse? Stuur ons een berichtje, we
      reageren zo snel mogelijk.
    </p>
  </hgroup>
  <form class="cta-form" bind:this={ctaForm} onsubmit={verstuurContact} onfocusin={laadControle}>
    <p class="cta-form-label">CONTACT</p>
    <label class="cta-field-label">
      <span class="cta-veld-naam">Naam</span>
      <input class="cta-field" type="text" name="naam" autocomplete="name" bind:value={ctaNaam} required />
    </label>
    <label class="cta-field-label">
      <span class="cta-veld-naam">E-mail</span>
      <input class="cta-field" type="email" name="email" placeholder="naam@voorbeeld.nl" autocomplete="email" bind:value={ctaEmail} required />
    </label>
    <label class="cta-field-label">
      <span class="cta-veld-naam">Telefoonnummer</span>
      <!-- haakjes en streepje met \ ervoor: de browser leest het patroon strenger dan PHP -->
      <input
        class="cta-field"
        type="tel"
        name="telefoon"
        placeholder="06 12345678"
        autocomplete="tel"
        inputmode="tel"
        maxlength="30"
        pattern="[0-9 +\(\)\-.]{'{'}6,30{'}'}"
        title="Alleen cijfers, spaties en + - ( )"
        bind:value={ctaTelefoon}
        required
      />
    </label>
    <label class="cta-field-label">
      <span class="cta-veld-naam">Je vraag of bericht</span>
      <textarea class="cta-field cta-textarea" name="bericht" rows="3" bind:value={ctaBericht} required></textarea>
    </label>
    <!-- honeypot: onzichtbaar en niet bereikbaar met tab, alleen bots vullen dit in -->
    <label class="cta-honey" aria-hidden="true">
      Laat dit veld leeg
      <input type="text" name="_honey" tabindex="-1" autocomplete="off" bind:value={ctaHoney} />
    </label>

    <div class="cta-controle" bind:this={ctaControle}></div>

    <!-- staat altijd op de pagina, zodat een schermlezer de melding voorleest
         zodra die verschijnt -->
    <div class="cta-meldingen" role="status" aria-live="polite">
      {#if ctaFout}
        <p class="cta-feedback cta-feedback-error">{ctaFout}</p>
      {/if}
      {#if ctaVerstuurd}
        <p class="cta-feedback">Bedankt! Je bericht is verstuurd. We reageren zo snel mogelijk.</p>
      {/if}
    </div>

    <button type="submit" class="cta-submit" disabled={ctaVersturen}>
      {#if ctaVersturen}
        BEZIG…<span class="cta-spinner" aria-hidden="true"></span>
      {:else}
        VERSTUUR
      {/if}
    </button>
  </form>
</section>

<footer class="footer">
  <img class="footer-brand" src={logo} alt="Artquake, creative space" width="406" height="270" />
  <p class="footer-tag">
    Culturele organisatie voor en door jonge makers.<br />Jongerenkunst ·
    Talentontwikkeling · Community.
  </p>
  <nav class="footer-col" aria-label="Doen">
    <h3 class="footer-heading heading-orange">DOEN</h3>
    <ul>
      {#each navigatie.filter((n) => n.href !== "/") as n}
        <li><a href="{base}{n.href}" data-sveltekit-reload={crewPaginas.includes(n.href) || undefined}>{n.label}</a></li>
      {/each}
    </ul>
  </nav>
  <nav class="footer-col" aria-label="Wat we doen">
    <h3 class="footer-heading heading-lilac">WAT WE DOEN</h3>
    <ul>
      {#each diensten as d}
        <li>
          {#if d.pand}
            <a href="{base}/#pand">Oefenruimtes, studio's, atelier en zaal</a>
          {:else}
            <a href="{base}/diensten/{d.slug}">{d.heading}</a>
          {/if}
        </li>
      {/each}
    </ul>
  </nav>
  <!-- eigen label: "Contact" is al het contactblok erboven (#doe-mee) -->
  <section class="footer-col" aria-label="Contactgegevens">
    <h3 class="footer-heading heading-cream" id="footer-contact">CONTACT</h3>
    <address>
      <ul>
        <li><a href="mailto:info@art-quake.com">info@art-quake.com</a></li>
        <li><a href="https://api.whatsapp.com/send?phone=31640129447">+31 6 401 29 447</a></li>
        <li>Sara de Bronovoland 7<br />Heerhugowaard</li>
      </ul>
    </address>
  </section>
  <nav class="footer-col" aria-label="Socials">
    <h3 class="footer-heading heading-orange">SOCIALS</h3>
    <ul>
      <li><a href="https://www.instagram.com/artquake.westfriesland/" target="_blank" rel="noopener">Instagram</a></li>
      <li><a href="https://www.youtube.com/channel/UCOcpcYV4ybeHuJND7ZhQURQ" target="_blank" rel="noopener">YouTube</a></li>
      <li><a href="https://www.tiktok.com/@artquake_westfriesland" target="_blank" rel="noopener">TikTok</a></li>
      <li><a href="https://www.facebook.com/artquake.westfriesland/" target="_blank" rel="noopener">Facebook</a></li>
    </ul>
  </nav>
  <p class="footer-bottom">
    <span>© 2026 ARTQUAKE · KVK 80065384</span>
    <span class="footer-legal">
      <a href="{base}/privacybeleid">Privacybeleid</a>
      <a href="{base}/algemene-voorwaarden">Algemene voorwaarden</a>
    </span>
    <span>MADE LOUD IN NL BY <a href="https://lychees.studio">LYCHEES.STUDIO</a></span>
  </p>
</footer>

<button
  type="button"
  class="naar-boven"
  class:is-zichtbaar={scrollY > 600}
  aria-label="Naar boven"
  tabindex={scrollY > 600 ? 0 : -1}
  onclick={naarBoven}
>
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 19V6M5 12l7-7 7 7" /></svg>
</button>

<style>
  /* zelfde knop als het menu (oranje vierkant), rechtsonder; alleen op een telefoon */
  .naar-boven {
    display: none;
  }
  @media (max-width: 640px) {
    .naar-boven {
      position: fixed;
      right: 14px;
      bottom: 18px;
      z-index: 80;
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      padding: 0;
      background: var(--color-accent);
      border: 3px solid var(--color-bg);
      box-shadow: 4px 4px 0 var(--color-bg);
      color: var(--color-bg);
      cursor: pointer;
      opacity: 0;
      visibility: hidden;
      transform: translateY(12px);
      transition:
        opacity 0.2s,
        transform 0.2s,
        visibility 0.2s;
    }
    .naar-boven.is-zichtbaar {
      opacity: 1;
      visibility: visible;
      transform: none;
    }
    .naar-boven:focus-visible {
      outline: 3px solid var(--color-primary);
      outline-offset: 3px;
    }
    .naar-boven svg {
      width: 22px;
      height: 22px;
      fill: none;
      stroke: currentColor;
      stroke-width: 3;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  }
  @media (max-width: 640px) and (prefers-reduced-motion: reduce) {
    .naar-boven {
      transition: none;
    }
  }

  .skip-link {
    position: fixed;
    top: 12px;
    left: 12px;
    z-index: 100;
    padding: 12px 20px;
    background: var(--color-accent);
    color: var(--color-bg);
    font: 700 14px/1 var(--font-mono);
    letter-spacing: 0.08em;
    text-decoration: none;
    transform: translateY(-200%);
  }
  .skip-link:focus {
    transform: none;
    outline: 3px solid var(--color-fg);
  }
  #inhoud {
    display: block;
  }
  #inhoud:focus {
    outline: none;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  /* cta */
  .cta {
    position: relative;
    background: var(--color-accent);
    color: var(--color-bg);
    padding: 74px var(--rand);
    border-bottom: 4px solid var(--color-bg);
    overflow: hidden;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 380px);
    gap: clamp(20px, 3vw, 50px);
    align-items: center;
  }
  .cta-blob {
    position: absolute;
    right: -60px;
    top: -60px;
    width: 320px;
    height: 320px;
    border-radius: 160px;
    background: var(--color-primary);
  }
  .cta-copy {
    position: relative;
    margin: 0;
  }
  .cta-title {
    margin: 0 0 18px;
    font-weight: 900;
    font-stretch: 125%;
    font-size: clamp(48px, 7vw, 104px);
    line-height: 0.84;
    letter-spacing: -0.035em;
  }
  .cta-text {
    margin: 0;
    max-width: 560px;
    font: 400 14px/1.6 var(--font-mono);
  }
  .cta-form {
    position: relative;
    background: var(--color-bg);
    color: var(--color-fg);
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    border: 3px solid var(--color-bg);
    box-shadow: 12px 12px 0 var(--color-primary);
  }
  .cta-form-label {
    margin: 0;
    font: 700 11px/1 var(--font-mono);
    letter-spacing: 0.14em;
    color: var(--color-accent);
  }
  .cta-field-label {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  /* zichtbaar label boven het veld, blijft staan tijdens het typen */
  .cta-veld-naam {
    font: 700 11px/1 var(--font-mono);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--color-gray-300);
  }
  /* buiten beeld i.p.v. display:none, omdat sommige bots verborgen velden overslaan */
  .cta-honey {
    position: absolute;
    left: -9999px;
    width: 1px;
    height: 1px;
    overflow: hidden;
  }
  .cta-field {
    width: 100%;
    box-sizing: border-box;
    background: var(--color-gray-800);
    border: none;
    padding: 14px;
    font: 400 13px/1 var(--font-mono);
    color: var(--color-fg);
  }
  .cta-field::placeholder {
    color: var(--color-gray-300);
  }
  .cta-textarea {
    font-family: var(--font-mono);
    line-height: 1.5;
    resize: vertical;
  }
  .cta-submit {
    background: var(--color-primary);
    color: var(--color-fg);
    padding: 16px;
    text-align: center;
    border-radius: 26px;
    font: 800 18px/1 var(--font-display);
    border: none;
    cursor: pointer;
  }
  .cta-submit:hover:not(:disabled) {
    background: var(--color-primary-dark);
  }
  .cta-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  /* draaiend rondje naast BEZIG…: versturen kan even duren */
  .cta-spinner {
    display: inline-block;
    width: 1em;
    height: 1em;
    margin-left: 10px;
    vertical-align: -0.15em;
    border: 3px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: cta-draai 0.8s linear infinite;
  }
  @keyframes cta-draai {
    to {
      transform: rotate(360deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .cta-spinner {
      animation-duration: 2.4s;
    }
  }
  /* leeg: geen extra witruimte in het formulier, maar niet verbergen
     (een verborgen meldingsvak wordt niet voorgelezen) */
  /* vaste hoogte: het formulier springt niet als het vakje laadt */
  .cta-controle {
    min-height: 65px;
  }
  .cta-meldingen:empty {
    margin-bottom: -20px;
  }
  .cta-feedback {
    margin: 0;
    font: 700 12px/1.5 var(--font-mono);
    color: var(--color-primary-light);
  }
  .cta-feedback-error {
    color: var(--color-accent);
  }

  /* footer */
  .footer {
    background: var(--color-bg);
    color: var(--color-fg);
    padding: 56px var(--rand) 34px;
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) repeat(4, minmax(0, 1fr));
    gap: clamp(35px, 3vw, 36px);
    font: 400 12px/1.9 var(--font-mono);
  }
  .footer-brand {
    grid-column: 1;
    display: block;
    margin: 0 0 12px;
    height: 112px;
    width: auto;
  }
  .footer-tag {
    grid-column: 1;
    margin: 0;
    color: var(--color-muted);
  }
  .footer-col ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  /* <address> is standaard cursief */
  .footer-col address {
    font-style: normal;
  }
  /* ruimer tikgebied (min. 24px hoog) zodat links op telefoon goed te raken zijn */
  .footer-col a {
    display: inline-block;
    padding: 4px 0;
    color: inherit;
    text-decoration: none;
  }
  .footer-col a:hover {
    text-decoration: underline;
  }
  .footer-heading {
    margin: 0 0 4px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.12em;
  }
  .heading-orange { color: var(--color-accent); }
  .heading-lilac  { color: var(--color-primary-light); }
  .heading-cream  { color: var(--color-fg); }
  .footer-bottom {
    grid-column: 1 / -1;
    margin: 34px 0 0;
    padding-top: 16px;
    border-top: 2px solid var(--color-gray-800);
    display: flex;
    justify-content: space-between;
    /* de links hebben ruimte boven en onder (groter tikvlak); zo staat alles op één lijn */
    align-items: center;
    font: 700 11px/1 var(--font-mono);
    letter-spacing: 0.14em;
    color: var(--color-gray-300);
  }
  .footer-legal {
    display: flex;
    gap: 20px;
    /* net als de rest van de regel in hoofdletters; kleine letters lijken lager te staan */
    text-transform: uppercase;
  }
  .footer-bottom a {
    display: inline-block;
    padding: 7px 0;
    color: inherit;
    text-decoration: underline;
  }
  .footer-bottom a:hover { opacity: 0.7; }

  @media (max-width: 860px) {
    .cta {
      grid-template-columns: 1fr;
      padding: 56px 40px;
    }
    .cta-blob {
      width: 220px;
      height: 220px;
      right: -40px;
      top: -40px;
    }
    .cta-form {
      max-width: 560px;
    }
    .footer { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .footer-brand, .footer-tag { grid-column: 1 / -1; }
  }

  @media (max-width: 640px) {
    .cta {
      padding: 48px 20px;
      gap: 32px;
    }
    .cta-blob {
      width: 140px;
      height: 140px;
      right: -24px;
      top: -24px;
      border-radius: 70px;
    }
    .cta-form {
      max-width: none;
      padding: 18px;
      box-shadow: 6px 6px 0 var(--color-primary);
    }
    .cta-submit {
      padding: 14px;
      font-size: 16px;
    }
    /* 16px: anders zoomt iOS in zodra je in een veld tikt */
    .cta-field {
      font-size: 16px;
    }
    /* onderaan ruimte voor de naar-boven-knop, die anders over de laatste regel valt */
    .footer { padding: 56px 20px 84px; grid-template-columns: 1fr; }
    .footer-brand, .footer-tag, .footer-col { grid-column: 1; }
    .footer-brand { height: 84px; }
    /* de regel zonder link krijgt dezelfde ruimte als de links, dan zijn alle gaten gelijk */
    .footer-bottom { flex-direction: column; gap: 0; }
    .footer-bottom > span:first-child { padding: 7px 0; }
  }
</style>
