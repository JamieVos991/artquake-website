<script>
  import { base } from "$app/paths";
  import { page } from "$app/state";
  import logo from "$lib/assets/artquake-logo.avif";

  const status = $derived(String(page.status || 404));
  const nietGevonden = $derived(page.status === 404);
</script>

<svelte:head>
  <title>{status} | Artquake</title>
</svelte:head>

<div class="fout">
  <a class="fout-brand" href={base || "/"}>
    <img src={logo} alt="Artquake, naar home" width="406" height="270" />
  </a>

  <div class="fout-midden">
    <h1 class="fout-titel">{status}</h1>
    <p class="fout-tekst">
      {nietGevonden
        ? "Deze pagina bestaat niet (meer)."
        : "Er ging iets mis aan onze kant. Probeer het zo nog een keer."}
    </p>
    <a class="fout-knop" href={base || "/"}>NAAR HOME</a>
  </div>
</div>

<style>
  .fout {
    position: relative;
    display: grid;
    place-items: center;
    min-height: 100vh;
    min-height: 100svh;
    background: var(--color-bg);
    color: var(--color-fg);
    border-bottom: 4px solid var(--color-fg);
  }
  .fout-brand {
    position: absolute;
    top: 0;
    left: 0;
    /* logo even groot en op dezelfde plek als op de homepage */
    padding: 40px 30px;
  }
  .fout-brand img {
    display: block;
    height: 120px;
    width: auto;
  }

  .fout-midden {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 120px 20px;
    text-align: center;
  }
  /* zelfde stijl als de koppen op de homepage */
  .fout-titel {
    margin: 0 0 24px;
    font-weight: 900;
    font-stretch: 125%;
    font-size: clamp(96px, 20vw, 260px);
    line-height: 0.85;
    letter-spacing: -0.04em;
    text-shadow: 10px 10px 0 var(--color-primary);
  }
  .fout-tekst {
    margin: 0 0 36px;
    max-width: 420px;
    font: 400 15px/1.6 var(--font-mono);
  }
  /* zelfde knop als DOE MEE op de dienstpagina's */
  .fout-knop {
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
  .fout-knop:hover {
    opacity: 0.8;
  }

  @media (max-width: 640px) {
    .fout-brand {
      padding: 28px 16px;
    }
    .fout-brand img {
      height: 92px;
    }
    .fout-titel {
      text-shadow: 6px 6px 0 var(--color-primary);
    }
  }
</style>
