<script>
  import { onDestroy, onMount } from "svelte";
  import { base } from "$app/paths";
  import { goto } from "$app/navigation";
  import { onAuthStateChanged } from "firebase/auth";
  import {
    collection,
    addDoc,
    deleteDoc,
    doc,
    getDoc,
    onSnapshot,
    query,
    where,
    serverTimestamp,
  } from "firebase/firestore";
  import { db, auth } from "$lib/firebase.js";
  import { stuurReserveringMail, stuurVerificatiecode, mailActief, nieuweAnnuleerCode } from "$lib/reserveringMail.js";

  // alleen op art-quake.com gaan er mails uit (verificatiecode en bevestiging)
  const mailAan = mailActief();

  // Reserveren is tijdelijk alleen voor ingelogde crew: wie niet is
  // ingelogd gaat naar de inlogpagina en komt daarna hier terug.
  let ingelogd = $state(false);
  onMount(() =>
    onAuthStateChanged(auth, (user) => {
      ingelogd = !!user;
      if (!user) goto(`${base}/login?next=/reserveren`, { replaceState: true });
    })
  );

  const CODE_GELDIG_MINUTEN = 15;
  const MAX_CODE_POGINGEN = 5;

  function genereerCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }


  const studios = [
    { id: "oefen", label: "OEFEN\nRUIMTE", bg: "purple" },
    { id: "opname", label: "OPNAME\nSTUDIO", bg: "dark" },
    { id: "dans", label: "DANS\nSTUDIO", bg: "orange" },
    { id: "atelier", label: "ATELIER", bg: "white" },
  ];

  const OPEN_TIJD = "09:00";
  const SLUIT_TIJD = "21:00";

  function vandaagAlsDatum() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function nuAlsTijd() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  function genereerTijdslots() {
    const slots = [];
    const [openUur, openMin] = OPEN_TIJD.split(":").map(Number);
    const [sluitUur, sluitMin] = SLUIT_TIJD.split(":").map(Number);
    for (
      let m = openUur * 60 + openMin;
      m <= sluitUur * 60 + sluitMin;
      m += 30
    ) {
      slots.push(
        `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
      );
    }
    return slots;
  }

  const minDatum = vandaagAlsDatum();
  const alleTijdslots = genereerTijdslots();
  // De sluitingstijd zelf is geen geldige starttijd: er zou dan geen ruimte
  // meer over zijn voor een eindtijd binnen de openingstijden.
  const alleStarttijden = alleTijdslots.filter((t) => t !== SLUIT_TIJD);

  const totaalStappen = mailAan ? 4 : 3;

  let step = $state(1); // 1=studio, 2=gegevens, 3=datum, 4=code
  let selectedStudio = $state(null);
  let naam = $state("");
  let email = $state("");
  let datum = $state("");
  let starttijd = $state("");
  let eindtijd = $state("");
  let done = $state(false);
  let dir = $state(1); // 1 = forward, -1 = backward
  let submitting = $state(false);
  let error = $state("");
  let gemaakteReservering = $state(null); // { id, studio, naam, datum, starttijd, eindtijd }
  let annuleerBezig = $state(false);
  let geannuleerd = $state(false);

  let pendingId = $state(null);
  let codeInvoer = $state("");
  let codeFout = $state("");
  let codePogingen = $state(0);
  let codeVersturen = $state(false);
  let codeNetVerstuurd = $state(false);

  // Bestaande reserveringen voor de gekozen studio, zodat een tijdvak dat al
  // bezet is niet nogmaals gekozen kan worden.
  let bestaandeReserveringen = $state([]);
  let unsubscribeReserveringen;

  $effect(() => {
    unsubscribeReserveringen?.();
    bestaandeReserveringen = [];
    if (!selectedStudio) return;
    unsubscribeReserveringen = onSnapshot(
      query(
        collection(db, "reserveringen"),
        where("studio", "==", selectedStudio)
      ),
      (snapshot) => {
        bestaandeReserveringen = snapshot.docs.map((d) => d.data());
      }
    );
  });

  onDestroy(() => unsubscribeReserveringen?.());

  let bezetteTijdvakken = $derived(
    bestaandeReserveringen
      .filter((r) => r.datum === datum && r.starttijd && r.eindtijd && !r.geannuleerd)
      .map((r) => ({ start: r.starttijd, eind: r.eindtijd }))
  );

  function valtInBezetVak(tijd) {
    return bezetteTijdvakken.some((v) => tijd >= v.start && tijd < v.eind);
  }

  function volgendeBezetStart(vanaf) {
    const starts = bezetteTijdvakken
      .map((v) => v.start)
      .filter((s) => s > vanaf)
      .sort();
    return starts[0] ?? SLUIT_TIJD;
  }

  // Op vandaag zijn tijden die al voorbij zijn niet meer te kiezen, en
  // tijden die al bezet zijn voor deze studio + datum vallen ook af.
  let beschikbareStarttijden = $derived(
    (datum === minDatum
      ? alleStarttijden.filter((t) => t > nuAlsTijd())
      : alleStarttijden
    ).filter((t) => !valtInBezetVak(t))
  );

  let beschikbareEindtijden = $derived(
    starttijd
      ? alleTijdslots.filter(
          (t) => t > starttijd && t <= volgendeBezetStart(starttijd)
        )
      : []
  );

  $effect(() => {
    if (starttijd && !beschikbareStarttijden.includes(starttijd))
      starttijd = "";
  });
  $effect(() => {
    if (eindtijd && !beschikbareEindtijden.includes(eindtijd)) eindtijd = "";
  });

  function pickStudio(id) {
    selectedStudio = id;
    dir = 1;
    step = 2;
  }

  function next() {
    dir = 1;
    step++;
  }
  function back() {
    dir = -1;
    step--;
  }

  function checkTijdGeldig() {
    if (datum < minDatum)
      return "Kies een datum die niet in het verleden ligt.";
    if (!beschikbareStarttijden.includes(starttijd))
      return "Kies een geldige, nog beschikbare starttijd.";
    if (!beschikbareEindtijden.includes(eindtijd))
      return "Kies een geldige, nog beschikbare eindtijd.";
    if (
      bezetteTijdvakken.some((v) => starttijd < v.eind && eindtijd > v.start)
    ) {
      return "Dit tijdvak is inmiddels al gereserveerd. Kies een andere tijd.";
    }
    return "";
  }

  async function maakReserveringAan() {
    // Eerst vastleggen wat er geboekt wordt. Zodra de reservering is opgeslagen
    // telt het tijdvak als bezet en wist het formulier de gekozen tijden; zonder
    // deze kopie stonden die dan leeg in de bevestiging en de mail.
    const gegevens = {
      studio: selectedStudio,
      naam,
      email,
      datum,
      starttijd,
      eindtijd,
    };
    const annuleerCode = nieuweAnnuleerCode();
    const ref = await addDoc(collection(db, "reserveringen"), {
      ...gegevens,
      annuleerCode,
      aangemaaktOp: serverTimestamp(),
    });
    gemaakteReservering = { id: ref.id, annuleerCode, ...gegevens };
    geannuleerd = false;
    done = true;
    // De reservering zelf staat al vast in Firebase; als alleen de mail
    // mislukt laten we de gebruiker dat niet merken.
    stuurReserveringMail(gemaakteReservering, "bevestigd");
  }

  async function submit(e) {
    e.preventDefault();
    error = "";

    const tijdFout = checkTijdGeldig();
    if (tijdFout) {
      error = tijdFout;
      return;
    }

    submitting = true;
    try {
      if (!mailAan) {
        await maakReserveringAan();
      } else {
        const code = genereerCode();
        const ref = await addDoc(collection(db, "reserveringen_pending"), {
          studio: selectedStudio,
          naam,
          email,
          datum,
          starttijd,
          eindtijd,
          code,
          aangemaaktOp: serverTimestamp(),
        });
        await stuurVerificatiecode(email, naam, code);
        pendingId = ref.id;
        codeInvoer = "";
        codeFout = "";
        codePogingen = 0;
        dir = 1;
        step = 4;
      }
    } catch (err) {
      error = "Reserveren mislukt. Probeer het opnieuw.";
    } finally {
      submitting = false;
    }
  }

  async function verifieerCode(e) {
    e.preventDefault();
    codeFout = "";

    if (!/^\d{6}$/.test(codeInvoer)) {
      codeFout = "Vul de 6-cijferige code in.";
      return;
    }

    submitting = true;
    try {
      const pendingSnap = await getDoc(
        doc(db, "reserveringen_pending", pendingId)
      );
      if (!pendingSnap.exists()) {
        codeFout = "Deze verificatie is verlopen. Vraag een nieuwe code aan.";
        return;
      }
      const pending = pendingSnap.data();
      const aangemaakt = pending.aangemaaktOp?.toDate?.();
      if (
        aangemaakt &&
        Date.now() - aangemaakt.getTime() > CODE_GELDIG_MINUTEN * 60 * 1000
      ) {
        codeFout = "Deze code is verlopen. Vraag een nieuwe aan.";
        return;
      }
      if (pending.code !== codeInvoer) {
        codePogingen += 1;
        codeFout =
          codePogingen >= MAX_CODE_POGINGEN
            ? "Te vaak fout. Vraag een nieuwe code aan."
            : "Onjuiste code. Probeer het nog eens.";
        return;
      }

      // Nog even checken of het tijdvak niet net door iemand anders is
      // bezet tijdens het invullen van de code.
      const tijdFout = checkTijdGeldig();
      if (tijdFout) {
        error = tijdFout;
        step = 3;
        return;
      }

      await maakReserveringAan();
      deleteDoc(doc(db, "reserveringen_pending", pendingId)).catch(() => {});
      pendingId = null;
    } catch (err) {
      codeFout = "Verifiëren mislukt. Probeer het opnieuw.";
    } finally {
      submitting = false;
    }
  }

  async function codeOpnieuwVersturen() {
    codeVersturen = true;
    codeFout = "";
    try {
      if (pendingId) {
        deleteDoc(doc(db, "reserveringen_pending", pendingId)).catch(() => {});
      }
      const code = genereerCode();
      const ref = await addDoc(collection(db, "reserveringen_pending"), {
        studio: selectedStudio,
        naam,
        email,
        datum,
        starttijd,
        eindtijd,
        code,
        aangemaaktOp: serverTimestamp(),
      });
      await stuurVerificatiecode(email, naam, code);
      pendingId = ref.id;
      codeInvoer = "";
      codePogingen = 0;
      codeNetVerstuurd = true;
      setTimeout(() => {
        codeNetVerstuurd = false;
      }, 4000);
    } catch (err) {
      codeFout = "Versturen van een nieuwe code mislukt. Probeer het opnieuw.";
    } finally {
      codeVersturen = false;
    }
  }

  function terugNaarDatum() {
    if (pendingId)
      deleteDoc(doc(db, "reserveringen_pending", pendingId)).catch(() => {});
    pendingId = null;
    codeInvoer = "";
    codeFout = "";
    dir = -1;
    step = 3;
  }

  async function annuleerReservering() {
    if (!gemaakteReservering) return;
    annuleerBezig = true;
    try {
      await deleteDoc(doc(db, "reserveringen", gemaakteReservering.id));
      geannuleerd = true;
    } catch (err) {
      error =
        err?.code === "permission-denied"
          ? "Zelf annuleren kan alleen nog binnen 5 minuten na het boeken. Neem contact met ons op om te annuleren."
          : "Annuleren mislukt. Probeer het opnieuw.";
    } finally {
      annuleerBezig = false;
    }
  }

  const progress = $derived((step / totaalStappen) * 100);
  const studioObj = $derived(studios.find((s) => s.id === selectedStudio));
</script>

<svelte:head>
  <title>Reserveren | Artquake</title>
  <meta name="robots" content="noindex" />
</svelte:head>

{#if !ingelogd}
  <div class="shell auth-gate">
    <p>Bezig met controleren…</p>
  </div>
{:else}
<div class="shell">
  <!-- Progress bar -->
  <div class="progress-track">
    <div class="progress-fill" style="width:{progress}%"></div>
  </div>

  {#if done}
    <!-- ── Bevestiging ── -->
    <div class="confirm">
      {#if geannuleerd}
        <p class="confirm-tag">GEANNULEERD</p>
        <h1 class="confirm-title">RESERVERING<br />INGETROKKEN.</h1>
        <p class="confirm-text">
          Je reservering is verwijderd. Tot een andere keer!
        </p>
      {:else}
        <p class="confirm-tag">GELUKT</p>
        <h1 class="confirm-title">RESERVERING<br />ONTVANGEN.</h1>
        <p class="confirm-text">
          {#if mailAan}
            We sturen je een bevestiging op <strong>{email}</strong>. Tot dan!
          {:else}
            Je reservering staat vast. Tot dan!
          {/if}
        </p>
        <button
          class="cancel-link"
          type="button"
          disabled={annuleerBezig}
          onclick={annuleerReservering}
        >
          {#if annuleerBezig}
            <span class="spinner"></span> BEZIG…
          {:else}
            Toch niet meer nodig? Annuleer deze reservering
          {/if}
        </button>
        {#if error}
          <p class="field-error">{error}</p>
        {/if}
      {/if}
    </div>
  {:else if step === 1}
    <!-- ── Stap 1: Studio kiezen ── -->
    <div class="layout">
      <div class="left">
        <p class="eyebrow">STAP 1 / {totaalStappen}</p>
        <h1 class="headline">
          <em>KIES</em><br />JOUW<br /><mark>STUDIO</mark>
        </h1>
        <p class="sub">
          Welke ruimte past bij jou? Klik op een studio om verder te gaan.
        </p>
      </div>
      <ul class="studios">
        {#each studios as s}
          <li>
            <button type="button" class="studio bg-{s.bg}" onclick={() => pickStudio(s.id)}>
              <span class="studio-name">
                {#each s.label.split("\n") as line, i}{#if i > 0}<br
                    />{/if}{line}{/each}
              </span>
            </button>
          </li>
        {/each}
      </ul>
    </div>
  {:else if step === 2}
    <!-- ── Stap 2: Gegevens ── -->
    <div class="step-screen">
      <div class="step-inner">
        <p class="eyebrow">
          STAP 2 / {totaalStappen} · {studioObj?.label.replace("\n", " ")}
        </p>
        <h1 class="step-title">WIE<br /><em>BEN JE?</em></h1>
        <form
          class="step-form"
          onsubmit={(e) => {
            e.preventDefault();
            next();
          }}
        >
          <label class="lbl">
            <span>NAAM <b>*</b></span>
            <input
              class="inp"
              type="text"
              placeholder="voor- en achternaam"
              bind:value={naam}
              autocomplete="name"
              required
            />
          </label>
          <label class="lbl">
            <span>E-MAIL <b>*</b></span>
            <input
              class="inp"
              type="email"
              placeholder="jij@voorbeeld.nl"
              bind:value={email}
              autocomplete="email"
              required
            />
          </label>
          <div class="step-nav">
            <button type="button" class="btn-back" onclick={back}>TERUG</button>
            <button type="submit" class="btn-next">VOLGENDE</button>
          </div>
        </form>
      </div>
    </div>
  {:else if step === 3}
    <!-- ── Stap 3: Datum & Tijd ── -->
    <div class="step-screen">
      <div class="step-inner">
        <p class="eyebrow">
          STAP 3 / {totaalStappen} · {studioObj?.label.replace("\n", " ")}
        </p>
        <h1 class="step-title">WANNEER<br /><em>KOM JE?</em></h1>
        <form class="step-form" onsubmit={submit}>
          <label class="lbl">
            <span>DATUM <b>*</b></span>
            <input
              class="inp"
              type="date"
              bind:value={datum}
              min={minDatum}
              required
              onclick={(e) => e.currentTarget.showPicker?.()}
            />
          </label>
          <div class="time-row">
            <label class="lbl">
              <span>STARTTIJD <b>*</b></span>
              <select
                class="inp"
                bind:value={starttijd}
                disabled={!datum}
                required
              >
                <option value="" disabled>Kies een tijd</option>
                {#each alleStarttijden as t}
                  {@const beschikbaar = beschikbareStarttijden.includes(t)}
                  <option value={t} disabled={!beschikbaar}
                    >{t}{beschikbaar ? "" : " (Gereserveerd)"}</option
                  >
                {/each}
              </select>
            </label>
            <label class="lbl">
              <span>EINDTIJD <b>*</b></span>
              <select
                class="inp"
                bind:value={eindtijd}
                disabled={!starttijd}
                required
              >
                <option value="" disabled>Kies een tijd</option>
                {#each beschikbareEindtijden as t}
                  <option value={t}>{t}</option>
                {/each}
              </select>
            </label>
          </div>
          {#if datum && beschikbareStarttijden.length === 0}
            <p class="field-hint">
              Voor deze datum is deze studio volgeboekt. Kies een andere datum.
            </p>
          {:else}
            <p class="field-hint">
              Openingstijden: {OPEN_TIJD}–{SLUIT_TIJD}, per half uur te boeken.
              Bezette tijden staan grijs.
            </p>
          {/if}
          {#if error}
            <p class="field-error">{error}</p>
          {/if}
          <div class="step-nav">
            <button type="button" class="btn-back" onclick={back}>TERUG</button>
            <button type="submit" class="btn-next" disabled={submitting}>
              {#if submitting}
                <span class="spinner"></span> BEZIG…
              {:else if mailAan}
                VERSTUUR CODE
              {:else}
                RESERVEER NU
              {/if}
            </button>
          </div>
        </form>
      </div>
    </div>
  {:else if step === 4}
    <!-- ── Stap 4: Code verifiëren ── -->
    <div class="step-screen">
      <div class="step-inner">
        <p class="eyebrow">
          STAP 4 / {totaalStappen} · {studioObj?.label.replace("\n", " ")}
        </p>
        <h1 class="step-title">
          CHECK<br /><em>JE <span style="white-space: nowrap">E-MAIL.</span></em>
        </h1>
        <p class="sub code-sub">
          We stuurden een 6-cijferige code naar <strong>{email}</strong>. Vul 'm
          hieronder in om je reservering te bevestigen.
        </p>
        <form class="step-form" onsubmit={verifieerCode}>
          <label class="lbl">
            <span>VERIFICATIECODE <b>*</b></span>
            <input
              class="inp code-inp"
              type="text"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="6"
              placeholder="000000"
              bind:value={codeInvoer}
              disabled={codePogingen >= MAX_CODE_POGINGEN}
              required
            />
          </label>
          {#if codeFout}
            <p class="field-error">{codeFout}</p>
          {/if}
          {#if codeNetVerstuurd}
            <p class="field-hint">Nieuwe code verstuurd. Check je inbox.</p>
          {/if}
          <div class="step-nav">
            <button type="button" class="btn-back" onclick={terugNaarDatum}
              >ANDERE TIJD</button
            >
            <button
              type="submit"
              class="btn-next"
              disabled={submitting || codePogingen >= MAX_CODE_POGINGEN}
            >
              {#if submitting}
                <span class="spinner"></span> BEZIG…
              {:else}
                BEVESTIGEN
              {/if}
            </button>
          </div>
          <button
            class="cancel-link"
            type="button"
            disabled={codeVersturen}
            onclick={codeOpnieuwVersturen}
          >
            {#if codeVersturen}
              <span class="spinner"></span> BEZIG…
            {:else}
              Geen code ontvangen? Opnieuw versturen
            {/if}
          </button>
        </form>
      </div>
    </div>
  {/if}
</div>
{/if}

<style>
  .auth-gate {
    align-items: center;
    justify-content: center;
    color: var(--color-muted);
    font: 700 12px/1.5 var(--font-mono);
    letter-spacing: 0.1em;
  }
  .shell {
    min-height: 100vh;
    background: var(--color-bg);
    color: var(--color-fg);
    display: flex;
    flex-direction: column;
  }

  /* Progress */
  .progress-track {
    height: 5px;
    background: var(--color-gray-900);
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(
      90deg,
      var(--color-accent),
      var(--color-primary)
    );
    transition: width 0.4s ease;
  }

  /* ── Step 1: two-column ── */
  .layout {
    flex: 1;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    max-width: 1200px;
    width: 100%;
    margin: 0 auto;
  }

  .left {
    padding: 80px 48px 80px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    border-right: 2px solid var(--color-gray-900);
  }

  .eyebrow {
    margin: 0 0 20px;
    font: 700 10px/1 var(--font-mono);
    letter-spacing: 0.2em;
    color: var(--color-accent);
  }

  .headline {
    margin: 0 0 24px;
    font-family: var(--font-display);
    font-weight: 900;
    font-size: clamp(52px, 7vw, 104px);
    line-height: 0.88;
    letter-spacing: -0.03em;
    text-transform: uppercase;
    font-style: normal;
  }
  .headline em {
    color: var(--color-accent);
    font-style: normal;
  }
  .headline mark {
    background: var(--color-accent);
    color: var(--color-bg);
    padding: 0 8px;
  }

  .sub {
    margin: 0;
    font: 400 13px/1.65 var(--font-mono);
    color: var(--color-muted);
    max-width: 360px;
  }
  .code-sub {
    max-width: 460px;
    margin-bottom: 28px;
  }
  .code-sub strong {
    color: var(--color-fg);
  }
  .code-inp {
    font-size: 28px;
    letter-spacing: 0.5em;
    text-align: center;
  }

  /* Studio cards */
  .studios {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 3px;
    background: var(--color-gray-950);
    border-left: 3px solid var(--color-gray-950);
    /* lijn onderaan, zodat de donkere dansstudio niet overloopt in de pagina */
    border-bottom: 3px solid color-mix(in srgb, var(--color-fg) 35%, transparent);
  }

  .studios > li {
    display: flex;
  }
  .studio {
    flex: 1;
    width: 100%;
    padding: 28px 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    cursor: pointer;
    min-height: 200px;
    border: 0;
    text-align: left;
    font: inherit;
    outline: none;
    transition:
      filter 0.12s,
      transform 0.12s;
    position: relative;
  }
  .studio:hover {
    filter: brightness(1.1);
  }
  .studio:focus-visible {
    box-shadow: inset 0 0 0 3px var(--color-fg);
  }

  .bg-orange {
    background: var(--color-accent);
    color: var(--color-bg);
  }
  .bg-dark {
    background: var(--color-gray-900);
    color: var(--color-fg);
  }
  .bg-purple {
    background: var(--color-primary);
    color: var(--color-fg);
  }
  .bg-white {
    background: var(--color-fg);
    color: var(--color-bg);
  }

  .studio-name {
    margin: 0;
    font:
      900 clamp(26px, 3.2vw, 44px) / 0.9 var(--font-display),
      sans-serif;
    letter-spacing: -0.02em;
    text-transform: uppercase;
    flex: 1;
    display: flex;
    align-items: flex-end;
  }


  /* ── Steps 2 & 3 ── */
  .step-screen {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 60px 24px;
  }

  .step-inner {
    width: 100%;
    max-width: 520px;
  }

  .step-title {
    margin: 0 0 40px;
    font-family: var(--font-display);
    font-weight: 900;
    font-size: clamp(52px, 8vw, 96px);
    line-height: 0.88;
    letter-spacing: -0.03em;
    text-transform: uppercase;
    font-style: normal;
  }
  .step-title em {
    color: var(--color-accent);
    font-style: normal;
  }

  .step-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .lbl {
    display: flex;
    flex-direction: column;
    gap: 10px;
    font:
      700 12px/1 var(--font-display),
      sans-serif;
    letter-spacing: 0.1em;
  }
  .lbl b {
    color: var(--color-accent);
    font-weight: 700;
  }

  .inp {
    background: var(--color-gray-900);
    border: 1.5px solid var(--color-gray-700);
    border-radius: 4px;
    color: var(--color-fg);
    font:
      400 16px/1 var(--font-display),
      sans-serif;
    padding: 16px 18px;
    outline: none;
    transition: border-color 0.12s;
    width: 100%;
    box-sizing: border-box;
  }
  .inp::placeholder {
    color: var(--color-gray-600);
  }
  .inp:focus {
    border-color: var(--color-primary);
  }
  select.inp {
    appearance: none;
    -webkit-appearance: none;
    padding-right: 44px;
    background-repeat: no-repeat;
    background-position: right 18px center;
    background-size: 14px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14' fill='none' stroke='%23f4f1ea' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M2 5l5 5 5-5'/%3E%3C/svg%3E");
  }
  select.inp:disabled {
    opacity: 0.5;
  }
  .inp:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .time-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .step-nav {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-top: 8px;
  }

  .field-error {
    margin: -6px 0 0;
    font: 700 12px/1.5 var(--font-mono);
    color: var(--color-accent);
  }

  .field-hint {
    margin: -6px 0 0;
    font: 400 12px/1.5 var(--font-mono);
    color: var(--color-muted);
  }

  .btn-next {
    background: var(--color-primary);
    color: var(--color-fg);
    border: none;
    border-radius: 4px;
    font:
      800 16px/1 var(--font-display),
      sans-serif;
    letter-spacing: 0.08em;
    padding: 18px 32px;
    cursor: pointer;
    text-transform: uppercase;
    transition: background 0.15s;
    flex: 1;
  }
  .btn-next:hover {
    background: var(--color-primary-dark);
  }

  .btn-back {
    background: var(--color-accent);
    border: none;
    border-radius: 4px;
    color: var(--color-bg);
    font: 700 12px/1 var(--font-mono);
    letter-spacing: 0.1em;
    cursor: pointer;
    padding: 18px 22px;
    transition: background 0.12s;
  }
  .btn-back:hover {
    background: var(--color-fg);
  }

  /* ── Bevestiging ── */
  .confirm {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 60px 24px;
    gap: 20px;
  }
  .confirm-tag {
    margin: 0;
    font: 700 11px/1 var(--font-mono);
    letter-spacing: 0.2em;
    color: var(--color-accent);
  }
  .confirm-title {
    margin: 0;
    font:
      900 clamp(52px, 9vw, 120px) / 0.88 var(--font-display),
      sans-serif;
    letter-spacing: -0.03em;
    text-transform: uppercase;
  }
  .confirm-text {
    margin: 0;
    font: 400 14px/1.65 var(--font-mono);
    color: var(--color-muted);
    max-width: 420px;
  }
  .confirm-text strong {
    color: var(--color-fg);
  }
  .spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    margin-right: 2px;
    vertical-align: -2px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation: none;
    }
  }

  .cancel-link {
    background: none;
    border: none;
    margin-top: 4px;
    padding: 0;
    font: 700 12px/1.5 var(--font-mono);
    text-decoration: underline;
    color: var(--color-muted);
    cursor: pointer;
  }
  .cancel-link:hover:not(:disabled) {
    color: var(--color-fg);
  }
  .cancel-link:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* ── Responsive ── */
  @media (max-width: 860px) {
    .layout {
      grid-template-columns: 1fr;
    }
    .left {
      border-right: none;
      border-bottom: 2px solid var(--color-gray-900);
      padding: 48px 28px;
      justify-content: flex-start;
    }
    .studios {
      border-left: none;
      min-height: 480px;
    }
  }

  @media (max-width: 480px) {
    .studios {
      grid-template-columns: 1fr;
    }
    .left {
      padding: 36px 20px;
    }
    .step-screen {
      padding: 40px 20px;
    }
    .time-row {
      grid-template-columns: 1fr;
    }
  }
</style>
