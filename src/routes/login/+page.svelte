<script>
  import { base } from "$app/paths";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
  import { auth } from "$lib/firebaseApp.js";
  import { markeerCrewBrowser } from "$lib/crew.js";

  let email = $state("");
  let password = $state("");
  let showPassword = $state(false);
  let loading = $state(false);
  let error = $state("");

  // na inloggen terug naar de pagina waar je vandaan kwam (alleen eigen paden),
  // anders naar het dashboard
  function gaVerder() {
    markeerCrewBrowser(true);
    const next = new URLSearchParams(window.location.search).get("next");
    const veilig = next && next.startsWith("/") && !next.startsWith("//");
    goto(`${base}${veilig ? next : "/dashboard"}`, { replaceState: true });
  }

  // wie al is ingelogd hoeft de inlogpagina niet te zien
  onMount(() =>
    onAuthStateChanged(auth, (user) => {
      if (user) gaVerder();
    })
  );

  async function handleSubmit(e) {
    e.preventDefault();
    error = "";
    loading = true;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      gaVerder();
    } catch (err) {
      error = "Inloggen mislukt. Controleer je e-mail en wachtwoord.";
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Inloggen | Artquake Admin</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="scene">
  <div class="bg-text" aria-hidden="true">
    <span>JONG TALENT</span>
    <span>MAAKT LAWAAI</span>
  </div>

  <div class="card-wrap">
    <div class="card">
      <div class="card-top-bar">
        <span class="bar-orange"></span>
        <span class="bar-cream"></span>
      </div>

      <div class="card-inner">
        <div class="card-header"></div>

        <h1 class="card-title">INLOGGEN</h1>

        <form onsubmit={handleSubmit}>
          <div class="field">
            <label class="field-label" for="email">E-MAIL</label>
            <input
              id="email"
              class="field-input"
              type="email"
              placeholder="naam@art-quake.com"
              bind:value={email}
              autocomplete="email"
              required
            />
          </div>

          <div class="field">
            <label class="field-label" for="password">WACHTWOORD</label>
            <div class="password-wrap">
              <input
                id="password"
                class="field-input"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••"
                bind:value={password}
                autocomplete="current-password"
                required
              />
              <button
                type="button"
                class="toggle-btn"
                onclick={() => (showPassword = !showPassword)}
              >
                {showPassword ? "VERBERG" : "TOON"}
              </button>
            </div>
          </div>

          {#if error}
            <p class="field-error">{error}</p>
          {/if}

          <button class="submit-btn" type="submit" disabled={loading}>
            {#if loading}
              BEZIG…
            {:else}
              INLOGGEN
            {/if}
          </button>
        </form>
      </div>

      <div class="card-side-bar"></div>
    </div>
  </div>
</div>

<style>
  .scene {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg);
    position: relative;
    overflow: hidden;
  }

  /* big background text */
  .bg-text {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0;
    pointer-events: none;
    user-select: none;
  }
  .bg-text span {
    display: block;
    font-family: var(--font-display);
    font-weight: 900;
    font-size: clamp(80px, 14vw, 180px);
    line-height: 0.9;
    text-transform: uppercase;
    color: transparent;
    -webkit-text-stroke: 1px var(--color-gray-800);
    letter-spacing: -2px;
    padding: 0 40px;
  }
  .bg-text span:last-child {
    color: var(--color-gray-900);
    -webkit-text-stroke: 0;
  }

  /* card */
  .card-wrap {
    position: relative;
    z-index: 1;
    width: min(460px, calc(100% - 40px));
  }

  .card {
    position: relative;
    width: min(420px, 100%);
    background: var(--color-gray-950);
    border: var(--border-width) solid var(--color-primary);
    border-top: none;
    box-shadow:
      0 0 0 var(--border-width) var(--color-primary),
      8px 8px 0 0 var(--color-accent);
  }

  .card-top-bar {
    display: flex;
    height: 6px;
  }
  .bar-orange {
    flex: 2;
    background: var(--color-accent);
  }
  .bar-cream {
    flex: 3;
    background: var(--color-fg);
  }

  .card-inner {
    padding: 28px 28px 32px;
  }

  /* header row */
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  /* title */
  .card-title {
    font-family: var(--font-display);
    font-weight: 900;
    font-size: clamp(32px, 10vw, 48px);
    line-height: 1;
    letter-spacing: -1px;
    color: var(--color-fg);
    margin: 0 0 28px;
    text-transform: uppercase;
  }

  /* form */
  .field {
    margin-bottom: 18px;
  }
  .field-label {
    display: block;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 2px;
    color: var(--color-muted);
    margin-bottom: 8px;
  }
  .field-input {
    width: 100%;
    background: var(--color-gray-900);
    border: 1.5px solid var(--color-gray-700);
    border-radius: 6px;
    color: var(--color-fg);
    font-family: var(--font-display);
    font-size: 15px;
    padding: 12px 14px;
    outline: none;
    transition: border-color 0.15s;
  }
  .field-input::placeholder {
    color: var(--color-gray-500);
  }
  .field-input:focus {
    border-color: var(--color-primary);
  }

  .password-wrap {
    position: relative;
  }
  .password-wrap .field-input {
    padding-right: 80px;
  }
  .toggle-btn {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: var(--color-accent);
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 1.5px;
    cursor: pointer;
    /* tikgebied van minstens 24px hoog, zonder dat de knop groter oogt */
    min-height: 32px;
    padding: 0 4px;
  }
  .toggle-btn:hover {
    color: var(--color-fg);
  }

  .field-error {
    margin: -8px 0 16px;
    font: 700 12px/1.5 var(--font-mono);
    color: var(--color-accent);
  }

  .submit-btn {
    width: 100%;
    background: var(--color-primary);
    color: var(--color-fg);
    border: none;
    border-radius: 6px;
    font: 800 18px/1 var(--font-display);
    letter-spacing: 2px;
    padding: 16px;
    cursor: pointer;
    margin-top: 8px;
    transition:
      background 0.15s,
      transform 0.1s;
    text-transform: uppercase;
  }
  .submit-btn:hover:not(:disabled) {
    background: var(--color-primary-dark);
  }
  .submit-btn:active:not(:disabled) {
    transform: translateY(1px);
  }
  .submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
