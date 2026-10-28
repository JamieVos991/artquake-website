<script>
  import { base } from "$app/paths";
  import DeelVoorbeeld from "$lib/components/DeelVoorbeeld.svelte";
  import { haalDocumentOp } from "$lib/publiekeData.js";
  import { agendaKleur, agendaTekstKleur } from "$lib/data/agendaKleur.js";
  import { agendaPrijs, agendaType, langeDatum } from "$lib/data/agendaTekst.js";
  import { agendaFotoPositie } from "$lib/data/agendaFoto.js";

  let { data } = $props();

  // De pagina kan bij het bouwen zijn gemaakt; daarna kan het item in het
  // dashboard zijn aangepast. Daarom bij het openen altijd de nieuwste versie ophalen.
  // Bestaat het item niet meer (verwijderd, of automatisch opgeruimd), dan een melding.
  let vers = $state(null);
  let wegId = $state(null);
  const item = $derived(vers?.id === data.item.id ? vers : data.item);
  const weg = $derived(wegId === data.item.id);
  $effect(() => {
    const id = data.item.id;
    haalDocumentOp("agenda", id)
      .then((nieuw) => {
        if (nieuw) vers = nieuw;
        else wegId = id;
      })
      .catch(() => {});
  });

  const kleur = $derived(agendaKleur(item));
  const tijd = $derived(
    item.startTime ? `${item.startTime}${item.endTime ? ` – ${item.endTime}` : ""}` : ""
  );
  const alineas = $derived(
    (item.beschrijving ?? "").split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean)
  );
  const datumMetDag = $derived(
    item.date
      ? new Date(`${item.date}T12:00:00`).toLocaleDateString("nl-NL", {
          weekday: "short",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : ""
  );
  const korteDatum = $derived(item.date ? item.date.split("-").reverse().slice(0, 2).join(".") : "");
</script>

<svelte:head>
  <title>{weg ? "Bestaat niet (meer)" : item.band} | Artquake</title>
  <meta
    name="description"
    content={[item.ondertitel, langeDatum(item.date), item.place, agendaPrijs(item)].filter(Boolean).join(" · ")}
  />
</svelte:head>

<DeelVoorbeeld
  titel="{item.band} | Artquake"
  beschrijving={[item.ondertitel, langeDatum(item.date), item.place, agendaPrijs(item)].filter(Boolean).join(" · ")}
/>

<!-- kop: datum en titel groot, in de kleur van het item, met de foto ernaast -->
{#if weg}
  <section class="ac-kop ac-weg">
    <a class="ac-terug" href="{base}/#agenda" aria-label="Terug naar de agenda">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 12H6M12 5l-7 7 7 7" /></svg>
    </a>
    <div class="ac-kop-tekst">
      <h1 class="ac-titel">Deze activiteit bestaat niet (meer).</h1>
      <a class="ac-weg-link" href="{base}/#agenda">Bekijk wat er nu op de agenda staat</a>
    </div>
  </section>
{:else}
<section
  class="ac-kop"
  style:background={kleur}
  style:color={agendaTekstKleur(kleur)}
>
  <div class="ac-kop-tekst">
    <a class="ac-terug" href="{base}/#agenda" aria-label="Terug naar de agenda">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 12H6M12 5l-7 7 7 7" /></svg>
    </a>
    <p class="ac-datum"><time datetime={item.date}>{korteDatum}</time></p>
    <h1 class="ac-titel">{item.band}</h1>
  </div>
  {#if item.imageUrl}
    <figure class="ac-foto">
      <img src={item.imageUrl} alt="" style:object-position={agendaFotoPositie(item)} />
    </figure>
  {/if}
</section>

<section class="ac-info" aria-label="Over deze activiteit">
  <!-- boven: ondertitel links, prijs rechts -->
  <div class="ac-boven">
    {#if item.ondertitel}<p class="ac-lead">{item.ondertitel}</p>{/if}
    <span class="ac-prijs">{agendaPrijs(item)}</span>
  </div>

  <div class="ac-midden">
    <!-- de gegevens twee aan twee -->
    <dl class="ac-gegevens">
      <div>
        <dt>Tijd</dt>
        <dd>{tijd || "Volgt nog"}</dd>
      </div>
      <div>
        <dt>Datum</dt>
        <dd>{datumMetDag}</dd>
      </div>
      {#if item.place}
        <div class="ac-locatie">
          <dt>Locatie</dt>
          <dd>{item.place}</dd>
        </div>
      {/if}
      {#if agendaType(item)}
        <div>
          <dt>Type</dt>
          <dd>{agendaType(item)}</dd>
        </div>
      {/if}
      <!-- alleen op een telefoon: daar staat de prijs hier in plaats van rechtsboven -->
      <div class="ac-kosten">
        <dt>Kosten</dt>
        <dd>{agendaPrijs(item)}</dd>
      </div>
    </dl>

    <div class="ac-tekst">
      {#each alineas as alinea}
        <p>{alinea}</p>
      {:else}
        <p>Meer informatie volgt binnenkort. Vragen? Neem gerust contact met ons op.</p>
      {/each}
    </div>
  </div>
</section>
{/if}

<style>

  .ac-kop {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 420px);
    align-items: end;
    gap: 40px;
    /* geen logobalk: bovenin staan de terugknop (links) en de menuknop (rechts) */
    padding: 108px var(--rand) 48px;
    border-bottom: 4px solid var(--color-bg);
  }
  .ac-kop-tekst {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
  }
  /* knop terug: pil met pijltje, vult zich bij hover in de tekstkleur */
  /* zelfde knop als het hamburgermenu (oranje vierkant), links op dezelfde hoogte */
  .ac-terug {
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
  .ac-terug:hover {
    transform: translate(-2px, -2px);
  }
  .ac-terug:focus-visible {
    outline: 3px solid var(--color-accent);
    outline-offset: 3px;
  }
  .ac-terug svg {
    width: 26px;
    height: 26px;
    fill: none;
    stroke: currentColor;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  @media (prefers-reduced-motion: reduce) {
    .ac-terug {
      transition: none;
    }
  }
  /* activiteit bestaat niet meer */
  .ac-weg {
    grid-template-columns: 1fr;
    min-height: 60vh;
    background: var(--color-fg);
    color: var(--color-bg);
  }
  .ac-weg-link {
    align-self: flex-start;
    margin-top: 12px;
    color: inherit;
    font: 400 16px/1.5 var(--font-mono);
    text-underline-offset: 4px;
  }
  .ac-datum {
    margin: 0;
    font-weight: 900;
    font-stretch: 110%;
    font-size: clamp(40px, 6vw, 84px);
    line-height: 0.9;
  }
  .ac-titel {
    margin: 0;
    font-weight: 900;
    font-stretch: 110%;
    font-size: clamp(36px, 6.4vw, 104px);
    line-height: 0.9;
    letter-spacing: -0.02em;
    text-transform: uppercase;
    hyphens: auto;
    overflow-wrap: break-word;
  }
  /* 3D-effect zoals de knoppen: harde verschoven schaduw, oranje zodat hij op
     elke kleur kopvlak te zien is (ook op zwart); met de muis erop komt hij omhoog */
  .ac-foto {
    margin: 0 12px 12px 0;
    aspect-ratio: 4 / 3;
    border: 3px solid var(--color-bg);
    box-shadow: 12px 12px 0 var(--color-accent);
    overflow: hidden;
    background: var(--color-bg);
    transition:
      transform 0.15s,
      box-shadow 0.15s;
  }
  .ac-foto:hover {
    transform: translate(-4px, -4px);
    box-shadow: 16px 16px 0 var(--color-accent);
  }
  @media (prefers-reduced-motion: reduce) {
    .ac-foto {
      transition: none;
    }
    .ac-foto:hover {
      transform: none;
      box-shadow: 12px 12px 0 var(--color-accent);
    }
  }
  .ac-foto img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .ac-info {
    display: flex;
    flex-direction: column;
    gap: 64px;
    padding: 48px var(--rand) 80px;
    background: var(--color-fg);
    color: var(--color-bg);
  }
  .ac-boven {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
  }
  .ac-lead {
    margin: 0;
    max-width: 30ch;
    font-family: var(--font-display);
    font-weight: 400;
    font-size: clamp(26px, 3vw, 44px);
    line-height: 1.1;
  }
  /* prijs als gevuld blok rechts, ook als er geen ondertitel is */
  .ac-prijs {
    margin-left: auto;
    padding: 12px 18px;
    background: var(--color-bg);
    color: var(--color-fg);
    font: 800 20px/1 var(--font-display);
    letter-spacing: 0.02em;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .ac-kosten {
    display: none;
  }
  .ac-midden {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: start;
    gap: 48px 64px;
  }
  .ac-gegevens {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 40px 32px;
    margin: 0;
  }
  .ac-gegevens dt {
    margin-bottom: 4px;
    font: 400 16px/1.3 var(--font-mono);
  }
  .ac-gegevens dd {
    margin: 0;
    font-weight: 800;
    font-size: 24px;
    line-height: 1.2;
  }
  .ac-tekst {
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-width: 62ch;
  }
  .ac-tekst p {
    margin: 0;
    font: 400 16px/1.65 var(--font-mono);
  }

  @media (max-width: 860px) {
    .ac-midden {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 760px) {
    .ac-kop {
      grid-template-columns: 1fr;
      gap: 28px;
    }
    .ac-info {
      gap: 40px;
    }
  }
  @media (max-width: 640px) {
    .ac-kop {
      padding: 88px 20px 36px;
    }
    /* locatie is vaak lang: op een telefoon over de hele breedte, onderaan */
    .ac-locatie {
      grid-column: 1 / -1;
      order: 1;
    }
    .ac-gegevens {
      gap: 28px 20px;
    }
    .ac-gegevens dd {
      font-size: 20px;
    }
    /* prijs als gewone categorie naast Type; het blok rechtsboven valt weg */
    .ac-prijs {
      display: none;
    }
    .ac-boven:not(:has(.ac-lead)) {
      display: none;
    }
    .ac-kosten {
      display: block;
    }
    /* menuknop op een telefoon: 14px van boven, 48px hoog */
    .ac-terug {
      top: 14px;
      left: 14px;
      width: 48px;
      height: 48px;
    }
    .ac-terug svg {
      width: 22px;
      height: 22px;
    }
    .ac-info {
      padding: 40px 20px 56px;
    }
    .ac-titel {
      hyphens: manual;
    }
  }
</style>
