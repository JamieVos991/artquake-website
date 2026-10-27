<script>
  import { base } from "$app/paths";
  import { onMount } from "svelte";
  import logo from "$lib/assets/artquake-logo.avif";
  import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
  import { db } from "$lib/firebase.js";

  // Annuleren via de link in de bevestigingsmail: /annuleren#<id>.<code>.
  // Het stuk na # gaat niet naar de server of naar Plausible. Annuleren gebeurt
  // pas na een klik (niet bij het openen), zodat een virusscanner die links in
  // mails opent niets annuleert. Of de code klopt, controleert Firestore
  // (zie magZelfAnnuleren in firestore.rules).
  let id = $state("");
  let code = $state("");
  let stand = $state("laden"); // laden | vraag | bezig | klaar | ongeldig | fout

  onMount(() => {
    const m = location.hash.match(/^#([A-Za-z0-9]{20})\.([a-f0-9]{32})$/);
    if (!m) {
      stand = "ongeldig";
      return;
    }
    [, id, code] = m;
    stand = "vraag";
  });

  async function annuleer() {
    stand = "bezig";
    try {
      await updateDoc(doc(db, "reserveringen", id), {
        geannuleerd: true,
        geannuleerdOp: serverTimestamp(),
        bevestigCode: code,
      });
      stand = "klaar";
    } catch (err) {
      // permission-denied: verkeerde code, al geannuleerd of al verwijderd
      stand = err?.code === "permission-denied" || err?.code === "not-found" ? "ongeldig" : "fout";
    }
  }
</script>

<svelte:head>
  <title>Reservering annuleren | Artquake</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="an">
  <a class="an-brand" href={base || "/"}>
    <img src={logo} alt="Artquake, naar home" width="406" height="270" />
  </a>

  <div class="an-midden">
    {#if stand === "klaar"}
      <h1 class="an-titel">GEANNULEERD.</h1>
      <p class="an-tekst">Je reservering is geannuleerd. Tot een andere keer!</p>
      <a class="an-knop" href={base || "/"}>NAAR HOME</a>
    {:else if stand === "ongeldig"}
      <h1 class="an-titel">OEPS.</h1>
      <p class="an-tekst">
        Deze link werkt niet (meer). Misschien is de reservering al geannuleerd of gewijzigd; gebruik
        dan de link uit de nieuwste mail. Lukt het niet? Mail naar
        <a href="mailto:info@art-quake.com">info@art-quake.com</a>.
      </p>
      <a class="an-knop" href={base || "/"}>NAAR HOME</a>
    {:else if stand === "fout"}
      <h1 class="an-titel">OEPS.</h1>
      <p class="an-tekst">Annuleren lukte niet. Controleer je verbinding en probeer het opnieuw.</p>
      <button class="an-knop" type="button" onclick={annuleer}>OPNIEUW PROBEREN</button>
    {:else if stand !== "laden"}
      <h1 class="an-titel">ANNULEREN?</h1>
      <p class="an-tekst">
        Weet je zeker dat je je reservering bij Artquake wilt annuleren? Daarna is het tijdvak weer vrij
        voor anderen.
      </p>
      <button class="an-knop" type="button" disabled={stand === "bezig"} onclick={annuleer}>
        {stand === "bezig" ? "BEZIG…" : "JA, ANNULEER"}
      </button>
    {/if}
  </div>
</div>

<style>
  /* zelfde opzet als de foutpagina (+error.svelte) */
  .an {
    position: relative;
    display: grid;
    place-items: center;
    min-height: 100vh;
    min-height: 100svh;
    background: var(--color-bg);
    color: var(--color-fg);
    border-bottom: 4px solid var(--color-fg);
  }
  .an-brand {
    position: absolute;
    top: 0;
    left: 0;
    padding: 40px 30px;
  }
  .an-brand img {
    display: block;
    height: 120px;
    width: auto;
  }

  .an-midden {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 180px 20px 120px;
    text-align: center;
  }
  .an-titel {
    margin: 0 0 24px;
    font-weight: 900;
    font-stretch: 125%;
    font-size: clamp(48px, 10vw, 120px);
    line-height: 0.9;
    letter-spacing: -0.04em;
    text-shadow: 8px 8px 0 var(--color-primary);
  }
  .an-tekst {
    margin: 0 0 36px;
    max-width: 440px;
    font: 400 15px/1.6 var(--font-mono);
  }
  .an-tekst a {
    color: inherit;
  }
  .an-knop {
    display: inline-block;
    padding: 14px 32px;
    border: 0;
    background: var(--color-fg);
    color: var(--color-bg);
    border-radius: 26px;
    font: 800 14px/1 var(--font-display);
    letter-spacing: 0.04em;
    text-decoration: none;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .an-knop:hover:not(:disabled) {
    opacity: 0.8;
  }
  .an-knop:disabled {
    opacity: 0.6;
    cursor: wait;
  }

  @media (max-width: 640px) {
    .an-brand {
      padding: 28px 16px;
    }
    .an-brand img {
      height: 92px;
    }
    .an-midden {
      padding-top: 150px;
    }
    .an-titel {
      text-shadow: 5px 5px 0 var(--color-primary);
    }
  }
</style>
