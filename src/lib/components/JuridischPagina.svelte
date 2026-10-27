<script>
  import { base } from "$app/paths";
  import logo from "$lib/assets/artquake-logo.avif";
  import DeelVoorbeeld from "$lib/components/DeelVoorbeeld.svelte";

  let { titel, bijgewerkt, beschrijving, children } = $props();
</script>

<svelte:head>
  <title>{titel} | Artquake</title>
  {#if beschrijving}
    <meta name="description" content={beschrijving} />
  {/if}
</svelte:head>

<DeelVoorbeeld titel="{titel} | Artquake" beschrijving={beschrijving ?? "Artquake, creative space in Heerhugowaard"} />

<header class="jp-header">
  <a class="jp-brand" href={base || "/"}>
    <img class="jp-logo" src={logo} alt="Artquake, naar home" width="406" height="270" />
  </a>
</header>

<section class="jp-intro">
  <span class="jp-label">JURIDISCH</span>
  <h1 class="jp-titel">{titel}</h1>
</section>

<article class="jp-body">
  {@render children()}
  <p class="jp-bijgewerkt">Laatst bijgewerkt: {bijgewerkt}</p>
</article>

<style>
  .jp-header {
    /* logo even groot en op dezelfde plek als op de homepage */
    padding: 40px 30px;
    background: var(--color-bg);
  }
  .jp-brand {
    display: inline-block;
  }
  .jp-logo {
    height: 120px;
    width: auto;
    display: block;
  }
  .jp-intro {
    padding: 40px 40px 64px;
    background: var(--color-primary);
    color: var(--color-fg);
  }
  .jp-label {
    display: block;
    margin-bottom: 18px;
    font: 700 13px/1 var(--font-mono);
    letter-spacing: 0.16em;
  }
  .jp-titel {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 900;
    font-stretch: 118%;
    font-size: clamp(26px, 8.4vw, 92px);
    line-height: 0.9;
    letter-spacing: -0.03em;
    text-transform: uppercase;
    overflow-wrap: break-word;
  }
  .jp-body {
    padding: 56px 40px 96px;
    background: var(--color-bg);
    color: var(--color-fg);
    font: 400 15px/1.7 var(--font-mono);
  }
  .jp-body :global(> *) {
    max-width: 720px;
  }
  .jp-body :global(h2) {
    margin: 44px 0 12px;
    color: var(--color-accent);
    font-family: var(--font-display);
    font-weight: 900;
    font-stretch: 110%;
    font-size: 24px;
    line-height: 1.1;
  }
  .jp-body :global(p) {
    margin: 0 0 16px;
  }
  .jp-body :global(ul) {
    margin: 0 0 16px;
    padding-left: 22px;
  }
  .jp-body :global(li) {
    margin-bottom: 6px;
  }
  .jp-body :global(a) {
    color: var(--color-primary-light);
  }
  .jp-bijgewerkt {
    margin-top: 48px !important;
    color: var(--color-muted);
    font-size: 13px;
  }

  @media (max-width: 640px) {
    .jp-intro,
    .jp-body {
      padding-left: 20px;
      padding-right: 20px;
    }
    .jp-header {
      padding: 28px 16px;
    }
    .jp-logo {
      height: 92px;
    }
  }
</style>
