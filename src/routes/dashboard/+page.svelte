<script>
  import { onMount, onDestroy } from "svelte";
  import { base } from "$app/paths";
  import { goto } from "$app/navigation";
  import {
    collection,
    addDoc,
    deleteDoc,
    updateDoc,
    doc,
    onSnapshot,
    serverTimestamp,
  } from "firebase/firestore";
  import { onAuthStateChanged } from "firebase/auth";
  import { db, auth } from "$lib/firebase.js";
  import { markeerCrewBrowser } from "$lib/crew.js";
  import { uploadFoto, verwijderFoto } from "$lib/fotoUpload.js";
  import { locatieSuggesties, standaardLocatie, standaardPrijs } from "$lib/data/agendaTekst.js";
  import { agendaPoster } from "$lib/data/agendaPosters.js";
  import { stuurReserveringMail, studioNamen } from "$lib/reserveringMail.js";
  import { artiestFotoPositie } from "$lib/data/fotoPosities.js";
  import { artiestSocials } from "$lib/data/socials.js";
  import { agendaFotoUitsneden, agendaFotoPositie } from "$lib/data/agendaFoto.js";
  import { agendaKleur, agendaContrast, standaardAgendaKleur } from "$lib/data/agendaKleur.js";
  import { bewaarInvoer } from "$lib/bewaardeInvoer.svelte.js";
  import { artiestZichtbaar } from "$lib/data/artiestZichtbaar.js";
  import { makersVan, telMakers } from "$lib/data/makers.js";
  let authGecontroleerd = $state(false);
  let ingelogdeGebruiker = $state(null);
  // uitloggen gaat via het menu

  // matcht het bestaande schema van de 'agenda'-collectie (band, place, date,
  // startTime, endTime, type, imageUrl) zodat het compatibel blijft met de
  // reeds aanwezige data uit het oude admin-systeem.
  const typeSuggesties = [
    "Open entree",
    "Optredens",
    "Expositie",
    "Workshop",
    "Besloten",
  ];
  // oranje = automatisch: de website kiest dan een kleur op basis van het type
  const standaardKleur = standaardAgendaKleur;

  let band = $state("");
  // korte zin onder de titel op de pagina van de activiteit
  let ondertitel = $state("");
  let place = $state(standaardLocatie);
  let type = $state("");
  let kleur = $state(standaardKleur);
  // contrast tussen de gekozen kleur en de tekst die de website erop zet (WCAG: minimaal 4,5)
  const kleurContrast = $derived(agendaContrast({ kleur, type }));
  let date = $state("");
  let startTime = $state("");
  let endTime = $state("");
  let prijs = $state(standaardPrijs);
  let imageUrl = $state("");
  // poster van de activiteit; komt vaak later dan de aankondiging
  let posterUrl = $state("");
  let fotoUitsnede = $state("");
  let beschrijving = $state("");
  let submitting = $state(false);
  let error = $state("");
  let success = $state(false);

  let agendaItems = $state([]);
  let agendaGeladen = $state(false);
  let reserveringen = $state([]);
  let reserveringenGeladen = $state(false);
  let unsubscribeAgenda;
  let unsubscribeReserveringen;
  let unsubscribeArtiesten;

  function studioLabel(id) {
    return studios.find((s) => s.id === id)?.label ?? id ?? "–";
  }

  function formatDatum(iso) {
    if (!iso) return "–";
    const [j, m, d] = iso.split("-");
    return `${d}-${m}-${j}`;
  }

  function reserveringIsAfgelopen(r) {
    if (!r.datum || !r.eindtijd) return false;
    return new Date(`${r.datum}T${r.eindtijd}`) < new Date();
  }

  function isDezeWeek(datumStr) {
    if (!datumStr) return false;
    const datum = new Date(`${datumStr}T00:00:00`);
    const nu = new Date();
    const dag = (nu.getDay() + 6) % 7; // maandag = 0
    const maandag = new Date(nu);
    maandag.setHours(0, 0, 0, 0);
    maandag.setDate(nu.getDate() - dag);
    const zondag = new Date(maandag);
    zondag.setDate(maandag.getDate() + 6);
    zondag.setHours(23, 59, 59, 999);
    return datum >= maandag && datum <= zondag;
  }

  let verwijderBezig = $state(null);

  async function verwijderReservering(r) {
    const naam = r.naam || "deze reservering";
    const metMail = r.email ? `\n\n${r.email} krijgt een mail dat de reservering is verwijderd.` : "";
    if (
      !confirm(
        `Reservering van ${naam} (${formatDatum(r.datum)}, ${r.starttijd}–${r.eindtijd}) verwijderen?${metMail}`
      )
    )
      return;
    verwijderBezig = r.id;
    try {
      await deleteDoc(doc(db, "reserveringen", r.id));
      if (reserveringBewerkId === r.id) leegReserveringFormulier();
      if (r.email && !(await stuurReserveringMail(r, "verwijderd"))) {
        alert(`De reservering is verwijderd, maar de mail naar ${r.email} kon niet worden verstuurd.`);
      }
    } catch (err) {
      alert("Verwijderen mislukt. Probeer het opnieuw.");
    } finally {
      verwijderBezig = null;
    }
  }

  // ── reservering bewerken ──
  // zelfde tijden als het boekingsformulier: elk half uur van 09:00 tot 21:00
  const reserveringTijden = Array.from({ length: 25 }, (_, i) => {
    const m = 9 * 60 + i * 30;
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  });

  let reserveringBewerkId = $state(null);
  let rStudio = $state("");
  let rNaam = $state("");
  let rEmail = $state("");
  let rDatum = $state("");
  let rStart = $state("");
  let rEind = $state("");
  let reserveringOpslaan = $state(false);
  let reserveringFout = $state("");
  let reserveringGelukt = $state("");

  function leegReserveringFormulier() {
    reserveringBewerkId = null;
    rStudio = rNaam = rEmail = rDatum = rStart = rEind = "";
  }

  function bewerkReservering(r) {
    reserveringBewerkId = r.id;
    rStudio = r.studio ?? "";
    rNaam = r.naam ?? "";
    rEmail = r.email ?? "";
    rDatum = r.datum ?? "";
    rStart = r.starttijd ?? "";
    rEind = r.eindtijd ?? "";
    reserveringFout = "";
    reserveringGelukt = "";
    // het formulier verschijnt pas na deze klik, dus even wachten
    setTimeout(() =>
      document
        .getElementById("reservering-formulier")
        ?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  }

  function annuleerReserveringBewerken() {
    leegReserveringFormulier();
    reserveringFout = "";
    reserveringGelukt = "";
  }

  async function slaReserveringOp(e) {
    e.preventDefault();
    reserveringFout = "";
    reserveringGelukt = "";
    if (rEind <= rStart) {
      reserveringFout = "De eindtijd moet na de begintijd liggen.";
      return;
    }
    const overlap = reserveringen.find(
      (r) =>
        r.id !== reserveringBewerkId &&
        r.studio === rStudio &&
        r.datum === rDatum &&
        rStart < r.eindtijd &&
        rEind > r.starttijd
    );
    if (overlap) {
      reserveringFout = `Deze ruimte is dan al gereserveerd door ${overlap.naam ?? "iemand anders"} (${overlap.starttijd}–${overlap.eindtijd}).`;
      return;
    }
    reserveringOpslaan = true;
    const velden = {
      studio: rStudio,
      naam: rNaam.trim(),
      email: rEmail.trim(),
      datum: rDatum,
      starttijd: rStart,
      eindtijd: rEind,
    };
    try {
      await updateDoc(doc(db, "reserveringen", reserveringBewerkId), {
        ...velden,
        gewijzigdOp: serverTimestamp(),
      });
      const gemaild = await stuurReserveringMail(velden, "gewijzigd");
      reserveringGelukt = gemaild
        ? `Opgeslagen. ${velden.email} heeft een mail met de nieuwe gegevens gekregen.`
        : "Opgeslagen, maar de mail kon niet worden verstuurd.";
      leegReserveringFormulier();
    } catch (err) {
      reserveringFout = "Opslaan mislukt. Probeer het opnieuw.";
    } finally {
      reserveringOpslaan = false;
    }
  }

  // ── oude activiteiten opruimen ──
  // Activiteiten die langer dan BEWAAR_MAANDEN voorbij zijn, worden verwijderd,
  // met hun foto en poster in Storage. Er is geen eigen server, dus dit gebeurt
  // zodra iemand van de crew het dashboard opent.
  const BEWAAR_MAANDEN = 3;
  function opruimGrens() {
    const d = new Date();
    d.setMonth(d.getMonth() - BEWAAR_MAANDEN);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  const opgeruimd = new Set();
  async function ruimOudeActiviteitenOp() {
    const grens = opruimGrens();
    for (const item of agendaItems) {
      if (!item.date || item.date >= grens || opgeruimd.has(item.id)) continue;
      opgeruimd.add(item.id);
      // niet opruimen wat iemand op dit moment aan het bewerken is
      if (bewerkId === item.id) continue;
      try {
        await deleteDoc(doc(db, "agenda", item.id));
        ruimFotoOp(item.imageUrl, item.id);
        ruimFotoOp(item.posterUrl, item.id);
      } catch {
        // lukt het nu niet, dan de volgende keer
        opgeruimd.delete(item.id);
      }
    }
  }

  // ── foto's opruimen in Firebase Storage ──
  // Verwijdert een foto, tenzij een ander agenda-item of een artiest hem nog gebruikt.
  function ruimFotoOp(url, eigenId) {
    if (!url) return;
    const nogInGebruik = [...agendaItems, ...artiesten].some(
      (x) => x.id !== eigenId && (x.imageUrl === url || x.posterUrl === url)
    );
    if (!nogInGebruik) verwijderFoto(url);
  }
  // Foto's die in het formulier zijn geüpload maar (nog) niet opgeslagen.
  // Bij annuleren gaan ze weg; bij opslaan alleen de foto's die niet gekozen zijn.
  const agendaUploads = new Set();
  const artiestUploads = new Set();
  function ruimUploadsOp(uploads, behalve = "") {
    for (const url of uploads) if (url !== behalve) verwijderFoto(url);
    uploads.clear();
  }

  // ── posters (eigen blok) ──
  // per komende activiteit direct een poster kiezen, vervangen of weghalen
  let komendeActiviteiten = $derived(
    agendaItems.filter((a) => a.date && a.date >= vandaagAlsDatum())
  );
  let aantalMetPoster = $derived(komendeActiviteiten.filter((a) => agendaPoster(a)).length);
  let posterBezigId = $state(null);
  let posterBezigVoortgang = $state(null);
  let posterMelding = $state("");

  async function kiesPosterVoor(a, e) {
    const bestand = e.currentTarget.files?.[0];
    e.currentTarget.value = "";
    if (!bestand) return;
    posterMelding = "";
    posterBezigId = a.id;
    const oud = a.posterUrl;
    try {
      const url = await uploadFoto(bestand, "agenda-images", (p) => (posterBezigVoortgang = p));
      await updateDoc(doc(db, "agenda", a.id), { posterUrl: url });
      if (oud && oud !== url) ruimFotoOp(oud, a.id);
      posterMelding = `Poster van "${a.band}" is opgeslagen.`;
    } catch (err) {
      posterMelding = err.message || "Opslaan mislukt. Probeer het opnieuw.";
    } finally {
      posterBezigId = null;
      posterBezigVoortgang = null;
    }
  }

  async function haalPosterWeg(a) {
    if (!confirm(`Poster van "${a.band}" weghalen?`)) return;
    posterMelding = "";
    posterBezigId = a.id;
    const oud = a.posterUrl;
    try {
      await updateDoc(doc(db, "agenda", a.id), { posterUrl: "" });
      ruimFotoOp(oud, a.id);
      posterMelding = `Poster van "${a.band}" is weggehaald.`;
    } catch {
      posterMelding = "Weghalen mislukt. Probeer het opnieuw.";
    } finally {
      posterBezigId = null;
    }
  }

  async function verwijderAgendaItem(a) {
    if (!confirm(`"${a.band ?? "Dit agenda item"}" op ${formatDatum(a.date)} verwijderen?`))
      return;
    verwijderBezig = a.id;
    try {
      await deleteDoc(doc(db, "agenda", a.id));
      ruimFotoOp(a.imageUrl, a.id);
      ruimFotoOp(a.posterUrl, a.id);
      // wie dit item aan het bewerken was, krijgt weer een leeg formulier
      if (bewerkId === a.id) {
        ruimUploadsOp(agendaUploads);
        leegFormulier();
      }
    } catch (err) {
      alert("Verwijderen mislukt. Probeer het opnieuw.");
    } finally {
      verwijderBezig = null;
    }
  }

  function startDataSubscripties() {
    unsubscribeArtiesten = onSnapshot(
      collection(db, "artiesten"),
      (snapshot) => {
        artiesten = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.naam ?? "").localeCompare(b.naam ?? ""));
        artiestenGeladen = true;
      },
      () => {
        artiestenGeladen = true;
      }
    );
    unsubscribeAgenda = onSnapshot(
      collection(db, "agenda"),
      (snapshot) => {
        agendaItems = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) =>
            `${a.date ?? ""}${a.startTime ?? ""}`.localeCompare(
              `${b.date ?? ""}${b.startTime ?? ""}`
            )
          );
        agendaGeladen = true;
        ruimOudeActiviteitenOp();
      },
      () => {
        agendaGeladen = true;
      }
    );

    unsubscribeReserveringen = onSnapshot(
      collection(db, "reserveringen"),
      (snapshot) => {
        reserveringen = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) =>
            `${b.datum ?? ""}${b.starttijd ?? ""}`.localeCompare(
              `${a.datum ?? ""}${a.starttijd ?? ""}`
            )
          );
        reserveringenGeladen = true;
      },
      () => {
        reserveringenGeladen = true;
      }
    );
  }

  function stopDataSubscripties() {
    unsubscribeAgenda?.();
    unsubscribeReserveringen?.();
    unsubscribeArtiesten?.();
    artiesten = [];
    artiestenGeladen = false;
    agendaItems = [];
    reserveringen = [];
    agendaGeladen = false;
    reserveringenGeladen = false;
  }

  let unsubscribeAuth;

  onMount(() => {
    unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      ingelogdeGebruiker = user;
      authGecontroleerd = true;
      stopDataSubscripties();
      if (user) {
        markeerCrewBrowser(true);
        startDataSubscripties();
      } else {
        goto(`${base}/login`);
      }
    });
  });

  onDestroy(() => {
    unsubscribeAuth?.();
    stopDataSubscripties();
  });

  // id van het agenda-item dat in het formulier wordt bewerkt (null = nieuw)
  let bewerkId = $state(null);
  let succesTekst = $state("");

  function leegFormulier() {
    bewerkId = null;
    band = "";
    ondertitel = "";
    place = standaardLocatie;
    type = "";
    kleur = standaardKleur;
    date = "";
    startTime = "";
    endTime = "";
    prijs = standaardPrijs;
    imageUrl = "";
    posterUrl = "";
    fotoUitsnede = "";
    beschrijving = "";
  }

  function bewerkAgendaItem(a) {
    ruimUploadsOp(agendaUploads);
    bewerkId = a.id;
    band = a.band ?? "";
    ondertitel = a.ondertitel ?? "";
    place = a.place ?? "";
    type = a.type ?? "";
    kleur = a.kleur || standaardKleur;
    date = a.date ?? "";
    startTime = a.startTime ?? "";
    endTime = a.endTime ?? "";
    prijs = a.prijs ?? "";
    imageUrl = a.imageUrl ?? "";
    posterUrl = a.posterUrl ?? "";
    fotoUitsnede = a.fotoUitsnede ?? "";
    beschrijving = a.beschrijving ?? "";
    error = "";
    success = false;
    document
      .getElementById("agenda-formulier")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function annuleerBewerken() {
    ruimUploadsOp(agendaUploads);
    leegFormulier();
    error = "";
    success = false;
  }

  // ── foto uploaden naar Firebase Storage ──
  let uploadVoortgang = $state(null); // null = geen upload bezig, anders 0–100
  let uploadFout = $state("");

  // ── artiesten ──
  const artiestTypes = ["Podium", "Expo"];
  // uitsnede van de artiestfoto op de website (object-position)
  const artiestUitsneden = [
    { waarde: "50% 20%", label: "Boven" },
    { waarde: "50% 50%", label: "Midden" },
    { waarde: "50% 80%", label: "Onder" },
  ];

  let artiesten = $state([]);
  let artiestenGeladen = $state(false);
  let artiestZoek = $state("");
  let actieveArtiesten = $derived(artiesten.filter(artiestZichtbaar).length);
  let actieveMakers = $derived(telMakers(artiesten.filter(artiestZichtbaar)));
  let aantalPodium = $derived(artiesten.filter((a) => a.type === "Podium").length);
  let gefilterdeArtiesten = $derived(
    artiesten.filter((a) =>
      (a.naam ?? "").toLowerCase().includes(artiestZoek.trim().toLowerCase())
    )
  );

  let artiestBewerkId = $state(null);
  let aNaam = $state("");
  let aType = $state("Podium");
  let aBeschrijving = $state("");
  let aBio = $state("");
  // { instagram: "", tiktok: "", ... }: één veld per social
  let aSocials = $state(Object.fromEntries(artiestSocials.map((x) => [x.veld, ""])));
  let aImageUrl = $state("");
  let aFotoPositie = $state("");
  // uit hoeveel mensen de artiest bestaat (band, duo); telt mee in het totaal op de site
  let aAantalMakers = $state(1);
  // inactief: staat niet op de website, maar blijft in het dashboard bewaard
  let aInactief = $state(false);
  let artiestOpslaan = $state(false);
  let artiestFout = $state("");
  let artiestGelukt = $state("");
  let artiestUploadVoortgang = $state(null);

  function leegArtiestFormulier() {
    artiestBewerkId = null;
    aNaam = "";
    aType = "Podium";
    aBeschrijving = "";
    aBio = "";
    for (const x of artiestSocials) aSocials[x.veld] = "";
    aImageUrl = "";
    aFotoPositie = "";
    aAantalMakers = 1;
    aInactief = false;
  }

  function bewerkArtiest(a) {
    ruimUploadsOp(artiestUploads);
    artiestBewerkId = a.id;
    aNaam = a.naam ?? "";
    aType = a.type || "Podium";
    aBeschrijving = a.beschrijving ?? "";
    aBio = a.bio ?? "";
    for (const x of artiestSocials) aSocials[x.veld] = a[x.veld] ?? "";
    aImageUrl = a.imageUrl ?? "";
    aFotoPositie = a.fotoPositie ?? "";
    aAantalMakers = makersVan(a);
    aInactief = !!a.inactief;
    artiestFout = "";
    artiestGelukt = "";
    document
      .getElementById("artiest-formulier")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function annuleerArtiest() {
    ruimUploadsOp(artiestUploads);
    leegArtiestFormulier();
    artiestFout = "";
    artiestGelukt = "";
  }

  // ── formulieren bewaren bij verversen ──
  // Ook welk item je aan het bewerken was, en welke foto's al zijn geüpload maar
  // nog niet opgeslagen (die worden anders bij annuleren niet opgeruimd).
  bewaarInvoer(
    "dashboard-agenda",
    () => ({
      bewerkId, band, ondertitel, place, type, kleur, date, startTime, endTime,
      prijs, imageUrl, posterUrl, fotoUitsnede, beschrijving,
      uploads: [...agendaUploads],
    }),
    (x) => {
      ({ bewerkId, band, ondertitel, place, type, kleur, date, startTime, endTime,
        prijs, imageUrl, posterUrl, fotoUitsnede, beschrijving } = x);
      for (const url of x.uploads ?? []) agendaUploads.add(url);
    }
  );
  bewaarInvoer(
    "dashboard-artiest",
    () => ({
      artiestBewerkId, aNaam, aType, aBeschrijving, aBio, aImageUrl, aFotoPositie, aInactief,
      aAantalMakers,
      aSocials: { ...aSocials },
      uploads: [...artiestUploads],
    }),
    (x) => {
      ({ artiestBewerkId, aNaam, aType, aBeschrijving, aBio, aImageUrl, aFotoPositie } = x);
      aInactief = !!x.aInactief;
      aAantalMakers = x.aAantalMakers ?? 1;
      for (const s of artiestSocials) aSocials[s.veld] = x.aSocials?.[s.veld] ?? "";
      for (const url of x.uploads ?? []) artiestUploads.add(url);
    }
  );

  async function kiesArtiestFoto(e) {
    const bestand = e.currentTarget.files?.[0];
    e.currentTarget.value = "";
    if (!bestand) return;
    artiestFout = "";
    try {
      aImageUrl = await uploadFoto(bestand, "artiesten-images", (p) => (artiestUploadVoortgang = p));
      artiestUploads.add(aImageUrl);
    } catch (err) {
      artiestFout = err.message;
    } finally {
      artiestUploadVoortgang = null;
    }
  }

  async function slaArtiestOp(e) {
    e.preventDefault();
    artiestFout = "";
    artiestGelukt = "";
    artiestOpslaan = true;
    const velden = {
      naam: aNaam.trim(),
      type: aType,
      beschrijving: aBeschrijving.trim(),
      bio: aBio.trim(),
      ...Object.fromEntries(artiestSocials.map((x) => [x.veld, aSocials[x.veld].trim()])),
      imageUrl: aImageUrl,
      fotoPositie: aFotoPositie,
      aantalMakers: makersVan({ aantalMakers: aAantalMakers }),
      inactief: aInactief,
    };
    const oudeFoto = artiestBewerkId ? artiesten.find((x) => x.id === artiestBewerkId)?.imageUrl : "";
    const id = artiestBewerkId;
    try {
      if (artiestBewerkId) {
        await updateDoc(doc(db, "artiesten", artiestBewerkId), velden);
        artiestGelukt = `${velden.naam} is opgeslagen.`;
      } else {
        await addDoc(collection(db, "artiesten"), velden);
        artiestGelukt = `${velden.naam} is toegevoegd.`;
      }
      if (oudeFoto && oudeFoto !== velden.imageUrl) ruimFotoOp(oudeFoto, id);
      ruimUploadsOp(artiestUploads, velden.imageUrl);
      leegArtiestFormulier();
    } catch (err) {
      artiestFout = "Opslaan mislukt. Probeer het opnieuw.";
    } finally {
      artiestOpslaan = false;
    }
  }

  async function zetWeerActief(a) {
    // zonder foto kan een artiest niet op de website: open het formulier om er een toe te voegen
    if (!a.imageUrl) {
      bewerkArtiest(a);
      aInactief = false;
      // de melding staat in het formulier, daar scrolt bewerkArtiest naartoe
      artiestFout = `${a.naam} heeft nog geen foto. Voeg er een toe en sla op, dan staat ${a.naam} weer op de website.`;
      return;
    }
    verwijderBezig = a.id;
    try {
      await updateDoc(doc(db, "artiesten", a.id), { inactief: false });
      if (artiestBewerkId === a.id) aInactief = false;
    } catch {
      alert("Lukte niet. Probeer het opnieuw.");
    } finally {
      verwijderBezig = null;
    }
  }

  async function verwijderArtiest(a) {
    if (!confirm(`${a.naam ?? "Deze artiest"} van de website verwijderen?`)) return;
    verwijderBezig = a.id;
    try {
      await deleteDoc(doc(db, "artiesten", a.id));
      ruimFotoOp(a.imageUrl, a.id);
      if (artiestBewerkId === a.id) {
        ruimUploadsOp(artiestUploads);
        leegArtiestFormulier();
      }
    } catch (err) {
      alert("Verwijderen mislukt. Probeer het opnieuw.");
    } finally {
      verwijderBezig = null;
    }
  }

  async function kiesAgendaFoto(e) {
    const bestand = e.currentTarget.files?.[0];
    e.currentTarget.value = "";
    if (!bestand) return;
    uploadFout = "";
    try {
      imageUrl = await uploadFoto(bestand, "agenda-images", (p) => (uploadVoortgang = p));
      agendaUploads.add(imageUrl);
    } catch (err) {
      uploadFout = err.message;
    } finally {
      uploadVoortgang = null;
    }
  }

  let posterVoortgang = $state(null);
  async function kiesAgendaPoster(e) {
    const bestand = e.currentTarget.files?.[0];
    e.currentTarget.value = "";
    if (!bestand) return;
    uploadFout = "";
    try {
      posterUrl = await uploadFoto(bestand, "agenda-images", (p) => (posterVoortgang = p));
      agendaUploads.add(posterUrl);
    } catch (err) {
      uploadFout = err.message;
    } finally {
      posterVoortgang = null;
    }
  }

  async function addAgendaItem(e) {
    e.preventDefault();
    error = "";
    success = false;
    submitting = true;
    const velden = {
      band,
      ondertitel: ondertitel.trim(),
      place,
      type,
      kleur,
      date,
      startTime,
      endTime,
      prijs,
      imageUrl,
      posterUrl,
      fotoUitsnede,
      beschrijving,
    };
    // de foto die nu in de agenda staat (vóór het opslaan, de lijst wordt direct bijgewerkt)
    const oudItem = bewerkId ? agendaItems.find((x) => x.id === bewerkId) : null;
    const oudeFoto = oudItem?.imageUrl ?? "";
    const oudePoster = oudItem?.posterUrl ?? "";
    const id = bewerkId;
    try {
      if (bewerkId) {
        await updateDoc(doc(db, "agenda", bewerkId), {
          ...velden,
          gewijzigdOp: serverTimestamp(),
        });
        succesTekst = "Agenda item is opgeslagen.";
      } else {
        await addDoc(collection(db, "agenda"), {
          ...velden,
          createdAt: serverTimestamp(),
        });
        succesTekst = "Agenda item is toegevoegd.";
      }
      // vervangen of weggehaalde foto en niet gekozen uploads opruimen
      if (oudeFoto && oudeFoto !== imageUrl) ruimFotoOp(oudeFoto, id);
      if (oudePoster && oudePoster !== posterUrl) ruimFotoOp(oudePoster, id);
      for (const url of agendaUploads) if (url !== imageUrl && url !== posterUrl) verwijderFoto(url);
      agendaUploads.clear();
      leegFormulier();
      success = true;
    } catch (err) {
      error = "Opslaan mislukt. Probeer het opnieuw.";
    } finally {
      submitting = false;
    }
  }

  const studios = [
    { id: "oefen", label: "OEFENRUIMTE", bg: "orange" },
    { id: "opname", label: "OPNAMESTUDIO", bg: "dark" },
    { id: "dans", label: "DANSSTUDIO", bg: "dark" },
    { id: "atelier", label: "ATELIER", bg: "purple" },
  ];

  function vandaagAlsDatum() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  let dezeWeek = $derived(reserveringen.filter((r) => isDezeWeek(r.datum)));
  let dezeWeekGeweest = $derived(dezeWeek.filter(reserveringIsAfgelopen).length);
  // eerst wat nog komt (vroegste bovenaan), daarna wat al geweest is
  let reserveringenOpVolgorde = $derived([
    ...reserveringen.filter((r) => !reserveringIsAfgelopen(r)).reverse(),
    ...reserveringen.filter(reserveringIsAfgelopen),
  ]);
  let reserveringZoek = $state("");
  let gezochteReserveringen = $derived(
    reserveringenOpVolgorde.filter((r) =>
      (r.naam ?? "").toLowerCase().includes(reserveringZoek.trim().toLowerCase())
    )
  );
  let komendeReserveringen = $derived(
    reserveringen.filter((r) => !reserveringIsAfgelopen(r)).length
  );
  let komendeAgenda = $derived(
    agendaItems.filter((a) => a.date && a.date >= vandaagAlsDatum()).length
  );

  bewaarInvoer(
    "dashboard-zoeken",
    () => ({ reserveringZoek, artiestZoek }),
    (x) => ({ reserveringZoek = "", artiestZoek = "" } = x)
  );

  // Een teruggezet formulier kan horen bij een item dat inmiddels weg is
  // (verwijderd of opgeruimd): dan wordt het een nieuw item.
  $effect(() => {
    if (agendaGeladen && bewerkId && !agendaItems.some((a) => a.id === bewerkId)) bewerkId = null;
  });
  $effect(() => {
    if (artiestenGeladen && artiestBewerkId && !artiesten.some((a) => a.id === artiestBewerkId))
      artiestBewerkId = null;
  });

  function initialen(naam) {
    return (naam ?? "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("");
  }
</script>

<svelte:head>
  <title>Dashboard | Artquake Admin</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<!-- skeletons: grijze vlakken in de vorm van wat er komt, zolang het laadt -->
{#snippet skeletLijst(aantal)}
  <ul class="db-lijst" aria-hidden="true">
    {#each Array(aantal) as _}
      <li class="db-regel db-skel-regel">
        <span class="db-skel db-skel-rond"></span>
        <span class="db-skel-tekst">
          <span class="db-skel db-skel-lijn"></span>
          <span class="db-skel db-skel-lijn db-skel-kort"></span>
        </span>
        <span class="db-skel db-skel-knop"></span>
      </li>
    {/each}
  </ul>
  <p class="db-visueel-verborgen" role="status">Laden…</p>
{/snippet}
{#snippet skeletKop()}
  <span class="db-skel db-skel-kop" aria-hidden="true"></span>
{/snippet}

{#if !authGecontroleerd}
  <!-- nog niet bekend of je bent ingelogd: alvast de vorm van het overzicht -->
  <div class="db" aria-busy="true">
    <div class="db-paneel">
      <div class="db-kop">
        <span class="db-skel db-skel-titel" aria-hidden="true"></span>
      </div>
      <div class="db-kaarten" aria-hidden="true">
        {#each ["oranje", "donker", "paars", "licht"] as kleur}
          <div class="db-kaart db-kaart-{kleur}">
            <span class="db-skel db-skel-label"></span>
            {@render skeletKop()}
            <span class="db-skel db-skel-lijn"></span>
          </div>
        {/each}
      </div>
      <p class="db-visueel-verborgen" role="status">Laden…</p>
    </div>
  </div>
{:else if !ingelogdeGebruiker}
  <div class="auth-gate">
    <p>Je wordt doorgestuurd naar de inlogpagina…</p>
  </div>
{:else}
  <div class="db">
    <div class="db-paneel" id="overzicht">
      <div class="db-kop">
        <h1>Overzicht</h1>
      </div>

      <!-- kaarten: reserveringen (deze week en altijd), artiesten en agenda -->
      <section class="db-kaarten" aria-label="Statistieken">
        <article class="db-kaart db-kaart-oranje">
          <span class="db-label db-label-donker">Deze week</span>
          {#if reserveringenGeladen}
            <h2>{dezeWeek.length} {dezeWeek.length === 1 ? "reservering" : "reserveringen"}</h2>
          {:else}
            {@render skeletKop()}
          {/if}
          <div class="db-voortgang">
            <p><span>Al geweest</span><span>{dezeWeekGeweest}/{dezeWeek.length}</span></p>
            <div class="db-balk"><i style:width="{dezeWeek.length ? (dezeWeekGeweest / dezeWeek.length) * 100 : 0}%"></i></div>
          </div>
        </article>

        <article class="db-kaart db-kaart-donker">
          <span class="db-label db-label-oranje">Altijd</span>
          {#if reserveringenGeladen}
            <h2>{reserveringen.length} {reserveringen.length === 1 ? "reservering" : "reserveringen"} in totaal</h2>
          {:else}
            {@render skeletKop()}
          {/if}
          <div class="db-voortgang">
            <p><span>Nog te komen</span><span>{komendeReserveringen}/{reserveringen.length}</span></p>
            <div class="db-balk"><i style:width="{reserveringen.length ? (komendeReserveringen / reserveringen.length) * 100 : 0}%"></i></div>
          </div>
        </article>

        <article class="db-kaart db-kaart-paars">
          <span class="db-label db-label-donker">Artiesten</span>
          {#if artiestenGeladen}
            <h2>{actieveMakers} makers op de website</h2>
          {:else}
            {@render skeletKop()}
          {/if}
          <div class="db-voortgang">
            <p><span>Podium · Expo</span><span>{aantalPodium} · {artiesten.length - aantalPodium}</span></p>
            <div class="db-balk"><i style:width="{artiesten.length ? (aantalPodium / artiesten.length) * 100 : 0}%"></i></div>
          </div>
        </article>

        <article class="db-kaart db-kaart-licht">
          <span class="db-label db-label-donker">Agenda</span>
          {#if agendaGeladen}
            <h2>{komendeAgenda} {komendeAgenda === 1 ? "activiteit" : "activiteiten"} op komst</h2>
          {:else}
            {@render skeletKop()}
          {/if}
        </article>
      </section>

      <!-- reserveringen -->
      <div class="db-rij" class:db-rij-enkel={!reserveringBewerkId} class:db-rij-agenda={reserveringBewerkId}>
        <section class="db-blok" id="reserveringen">
          <header class="db-blok-kop">
            <h2>Reserveringen</h2>
            <span class="db-blok-info">{komendeReserveringen} nog te komen</span>
            <a class="db-verwijder db-top-knop" href="{base}/reserveren">Nieuwe reservering</a>
          </header>
          {#if !reserveringenGeladen}
            {@render skeletLijst(4)}
          {:else if reserveringen.length === 0}
            <p class="db-leeg">Nog geen reserveringen binnengekomen.</p>
          {:else}
            {#if reserveringGelukt}
              <p class="db-gelukt db-melding">{reserveringGelukt}</p>
            {/if}
            <input
              class="db-zoek"
              type="search"
              placeholder="zoek op naam"
              aria-label="Zoek een reservering op naam"
              bind:value={reserveringZoek}
            />
            {#if gezochteReserveringen.length === 0}
              <p class="db-leeg">Geen reserveringen gevonden voor "{reserveringZoek.trim()}".</p>
            {:else}
            <div class="db-lijst-kop" aria-hidden="true">
              <span>Wie en waar</span><span>Datum</span><span>Tijd</span><span></span><span></span>
            </div>
            <ul class="db-lijst">
              {#each gezochteReserveringen as r (r.id)}
                {@const geweest = reserveringIsAfgelopen(r)}
                <li class="db-regel" class:is-geweest={geweest} class:is-bewerkt={reserveringBewerkId === r.id}>
                  <span class="db-regel-wie">
                    <span>
                      <strong>{r.naam ?? "–"}</strong>
                      <span>{studioLabel(r.studio)}{geweest ? " · afgelopen" : ""}</span>
                    </span>
                  </span>
                  <span class="db-regel-datum">{formatDatum(r.datum)}</span>
                  <span class="db-regel-tijd"
                    >{r.starttijd ?? "–"}{r.eindtijd ? `–${r.eindtijd}` : ""}</span
                  >
                  <button
                    type="button"
                    class="db-verwijder db-bewerk"
                    onclick={() => bewerkReservering(r)}
                    aria-label="Reservering van {r.naam ?? 'onbekend'} bewerken"
                  >
                    Bewerk
                  </button>
                  <button
                    type="button"
                    class="db-verwijder"
                    disabled={verwijderBezig === r.id}
                    onclick={() => verwijderReservering(r)}
                    aria-label="Reservering van {r.naam ?? 'onbekend'} verwijderen"
                  >
                    {verwijderBezig === r.id ? "…" : "Verwijder"}
                  </button>
                </li>
              {/each}
            </ul>
            {/if}
          {/if}
        </section>

        {#if reserveringBewerkId}
          <section class="db-blok db-formulier-blok" id="reservering-formulier">
            <header class="db-blok-kop">
              <h2>Reservering bewerken</h2>
            </header>
            <form class="db-formulier" onsubmit={slaReserveringOp}>
              <label class="db-veld">
                <span>Ruimte *</span>
                <select bind:value={rStudio} required>
                  {#each Object.entries(studioNamen) as [id, naam]}
                    <option value={id}>{naam}</option>
                  {/each}
                </select>
              </label>
              <label class="db-veld">
                <span>Naam *</span>
                <input type="text" bind:value={rNaam} required />
              </label>
              <label class="db-veld">
                <span>E-mail *</span>
                <input type="email" bind:value={rEmail} required />
              </label>
              <div class="db-veld-rij">
                <label class="db-veld">
                  <span>Datum *</span>
                  <input type="date" bind:value={rDatum} required />
                </label>
                <label class="db-veld">
                  <span>Begin *</span>
                  <select bind:value={rStart} required>
                    {#each reserveringTijden.slice(0, -1) as t}
                      <option value={t}>{t}</option>
                    {/each}
                  </select>
                </label>
                <label class="db-veld">
                  <span>Eind *</span>
                  <select bind:value={rEind} required>
                    {#each reserveringTijden.slice(1) as t}
                      <option value={t}>{t}</option>
                    {/each}
                  </select>
                </label>
              </div>
              <p class="db-hint">Na opslaan krijgt de huurder een mail met de nieuwe gegevens.</p>

              {#if reserveringFout}
                <p class="db-fout">{reserveringFout}</p>
              {/if}

              <button class="db-knop db-knop-breed" type="submit" disabled={reserveringOpslaan}>
                {reserveringOpslaan ? "Bezig…" : "Opslaan en mailen"}
              </button>
              <button
                class="db-verwijder db-annuleer"
                type="button"
                disabled={reserveringOpslaan}
                onclick={annuleerReserveringBewerken}
              >
                Annuleren
              </button>
            </form>
          </section>
        {/if}
      </div>

      <!-- agenda -->
      <div class="db-rij db-rij-agenda" id="agenda">
        <section class="db-blok">
          <header class="db-blok-kop">
            <h2>Agenda</h2>
            <span class="db-blok-info">{komendeAgenda} op komst</span>
          </header>
          <p class="db-uitleg">
            Activiteiten worden {BEWAAR_MAANDEN} maanden na de datum automatisch verwijderd, met foto en poster.
          </p>
          {#if !agendaGeladen}
            {@render skeletLijst(4)}
          {:else if agendaItems.length === 0}
            <p class="db-leeg">Geen evenementen op komst.</p>
          {:else}
            <div class="db-lijst-kop db-lijst-kop-agenda" aria-hidden="true">
              <span>Wat en waar</span><span>Datum</span><span>Tijd</span><span></span><span></span>
            </div>
            <ul class="db-lijst">
              {#each agendaItems as a (a.id)}
                <li class="db-regel db-regel-agenda" class:is-bewerkt={bewerkId === a.id}>
                  <span class="db-regel-wie">
                    {#if a.imageUrl}
                      <img
                        class="db-avatar db-avatar-klein"
                        src={a.imageUrl}
                        alt=""
                        style:object-position={agendaFotoPositie(a)}
                      />
                    {:else}
                      <span class="db-avatar db-avatar-klein" style:background={agendaKleur(a)}></span>
                    {/if}
                    <span>
                      <strong>{a.band ?? "–"}</strong>
                      <span
                        >{a.place ?? "–"}{a.type ? ` · ${a.type}` : ""}{agendaPoster(a)
                          ? " · met poster"
                          : ""}</span
                      >
                    </span>
                  </span>
                  <span class="db-regel-datum">{formatDatum(a.date)}</span>
                  <span class="db-regel-tijd"
                    >{a.startTime ?? "–"}{a.endTime ? `–${a.endTime}` : ""}</span
                  >
                  <button
                    type="button"
                    class="db-verwijder db-bewerk"
                    onclick={() => bewerkAgendaItem(a)}
                    aria-label="{a.band ?? 'Agenda item'} bewerken"
                  >
                    Bewerk
                  </button>
                  <button
                    type="button"
                    class="db-verwijder"
                    disabled={verwijderBezig === a.id}
                    onclick={() => verwijderAgendaItem(a)}
                    aria-label="{a.band ?? 'Agenda item'} verwijderen"
                  >
                    {verwijderBezig === a.id ? "…" : "Verwijder"}
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        </section>

        <section class="db-blok db-formulier-blok" id="agenda-formulier">
          <header class="db-blok-kop">
            <h2>{bewerkId ? "Agenda item bewerken" : "Agenda item toevoegen"}</h2>
          </header>
          <form class="db-formulier" onsubmit={addAgendaItem}>
            <label class="db-veld">
              <span>Naam *</span>
              <input type="text" placeholder="bijv. The Wombats" bind:value={band} required />
            </label>
            <label class="db-veld">
              <span>Ondertitel</span>
              <input
                type="text"
                placeholder="korte zin op de pagina van de activiteit, bv. Vier acts op één podium (optioneel)"
                bind:value={ondertitel}
              />
            </label>
            <label class="db-veld">
              <span>Locatie</span>
              <input type="text" list="locatie-suggesties" placeholder="bijv. Alkmaars Bierhuis, Alkmaar" bind:value={place} />
              <datalist id="locatie-suggesties">
                {#each locatieSuggesties as l}
                  <option value={l}></option>
                {/each}
              </datalist>
            </label>
            <div class="db-veld-rij">
              <label class="db-veld">
                <span>Datum *</span>
                <input type="date" bind:value={date} required />
              </label>
              <label class="db-veld">
                <span>Start</span>
                <input type="time" bind:value={startTime} />
              </label>
              <label class="db-veld">
                <span>Eind</span>
                <input type="time" bind:value={endTime} />
              </label>
            </div>
            <div class="db-veld-rij db-veld-rij-type">
              <label class="db-veld">
                <span>Type</span>
                <input type="text" list="type-suggesties" placeholder="bijv. Open entree" bind:value={type} />
                <datalist id="type-suggesties">
                  {#each typeSuggesties as t}
                    <option value={t}></option>
                  {/each}
                </datalist>
              </label>
              <label class="db-veld db-veld-kleur">
                <span title="Laat je hem oranje, dan kiest de website een kleur bij het type">Kleur</span>
                <input
                  type="color"
                  bind:value={kleur}
                  title="Oranje = automatisch, op basis van het type"
                />
              </label>
            </div>
            {#if kleurContrast < 4.5}
              <p class="db-waarschuwing" role="status">
                Met deze kleur is de tekst op de website slecht te lezen (contrast
                {kleurContrast.toFixed(1).replace(".", ",")} : 1, minimaal 4,5 : 1). Kies een iets lichtere of
                donkerdere kleur.
              </p>
            {/if}
            <label class="db-veld">
              <span>Prijs</span>
              <input type="text" list="prijs-suggesties" placeholder="bijv. Gratis of € 5,-" bind:value={prijs} />
              <datalist id="prijs-suggesties">
                <option value="Gratis"></option>
              </datalist>
            </label>
            <fieldset class="db-veld">
              <legend>Foto</legend>
              <div class="db-foto-upload">
                {#if imageUrl}
                  <img class="db-foto-voorbeeld" src={imageUrl} alt="" />
                {/if}
                <label class="db-verwijder db-foto-kies" class:is-bezig={uploadVoortgang !== null}>
                  {#if uploadVoortgang !== null}
                    Uploaden… {uploadVoortgang}%
                  {:else}
                    {imageUrl ? "Andere foto kiezen" : "Foto kiezen"}
                  {/if}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadVoortgang !== null}
                    onchange={kiesAgendaFoto}
                  />
                </label>
                {#if imageUrl && uploadVoortgang === null}
                  <button type="button" class="db-verwijder" onclick={() => (imageUrl = "")}>
                    Foto weghalen
                  </button>
                {/if}
              </div>
              {#if uploadFout}
                <p class="db-fout">{uploadFout}</p>
              {/if}
            </fieldset>
            {#if imageUrl}
              <fieldset class="db-veld">
                <legend>Welk deel van de foto?</legend>
                <div class="db-uitsnede">
                  {#each agendaFotoUitsneden as u}
                    <label class="db-uitsnede-optie">
                      <input type="radio" name="fotoUitsnede" value={u.waarde} bind:group={fotoUitsnede} />
                      <img src={imageUrl} alt="" style:object-position={u.positie} />
                      <span>{u.label}</span>
                    </label>
                  {/each}
                </div>
              </fieldset>
            {/if}
            <label class="db-veld">
              <span>Beschrijving</span>
              <textarea
                placeholder="verschijnt in de popup op de website, bv. wie er optreden of wie de workshop geeft (optioneel); een lege regel begint een nieuwe alinea"
                rows="4"
                bind:value={beschrijving}
              ></textarea>
            </label>
            <fieldset class="db-veld">
              <legend>Poster (optioneel, kan ook later)</legend>
              <div class="db-foto-upload">
                {#if posterUrl}
                  <img class="db-foto-voorbeeld db-poster-voorbeeld" src={posterUrl} alt="" />
                {/if}
                <label class="db-verwijder db-foto-kies" class:is-bezig={posterVoortgang !== null}>
                  {#if posterVoortgang !== null}
                    Uploaden… {posterVoortgang}%
                  {:else}
                    {posterUrl ? "Andere poster kiezen" : "Poster kiezen"}
                  {/if}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={posterVoortgang !== null}
                    onchange={kiesAgendaPoster}
                  />
                </label>
                {#if posterUrl && posterVoortgang === null}
                  <button type="button" class="db-verwijder" onclick={() => (posterUrl = "")}>
                    Poster weghalen
                  </button>
                {/if}
              </div>
            </fieldset>

            {#if error}
              <p class="db-fout">{error}</p>
            {/if}
            {#if success}
              <p class="db-gelukt">{succesTekst}</p>
            {/if}

            <button class="db-knop db-knop-breed" type="submit" disabled={submitting || uploadVoortgang !== null || posterVoortgang !== null}>
              {submitting ? "Bezig…" : bewerkId ? "Opslaan" : "Toevoegen"}
            </button>
            {#if bewerkId}
              <button
                class="db-verwijder db-annuleer"
                type="button"
                disabled={submitting}
                onclick={annuleerBewerken}
              >
                Annuleren
              </button>
            {/if}
          </form>
        </section>
      </div>

      <!-- posters: per komende activiteit -->
      <section class="db-blok db-posters-blok" id="posters">
        <header class="db-blok-kop">
          <h2>Posters</h2>
          <span class="db-blok-info"
            >{aantalMetPoster} van {komendeActiviteiten.length} komende activiteiten hebben een poster</span
          >
        </header>
        {#if posterMelding}
          <p class="db-gelukt db-melding" role="status">{posterMelding}</p>
        {/if}
        {#if !agendaGeladen}
          <ul class="db-posters" aria-hidden="true">
            {#each Array(4) as _}
              <li class="db-poster">
                <span class="db-skel db-skel-poster"></span>
                <span class="db-skel db-skel-lijn db-skel-kort"></span>
                <span class="db-skel db-skel-lijn"></span>
              </li>
            {/each}
          </ul>
          <p class="db-visueel-verborgen" role="status">Laden…</p>
        {:else if komendeActiviteiten.length === 0}
          <p class="db-leeg">Er staan geen komende activiteiten in de agenda.</p>
        {:else}
          <ul class="db-posters">
            {#each komendeActiviteiten as a (a.id)}
              {@const poster = agendaPoster(a)}
              {@const bezig = posterBezigId === a.id}
              <li class="db-poster">
                <div class="db-poster-beeld" class:db-poster-leeg={!poster}>
                  {#if poster}
                    <img src={poster} alt="Poster van {a.band}" loading="lazy" />
                  {:else}
                    <span>Nog geen poster</span>
                  {/if}
                </div>
                <p class="db-poster-naam">
                  <span>{formatDatum(a.date)}</span>
                  <strong>{a.band ?? "–"}</strong>
                </p>
                <div class="db-poster-knoppen">
                  <label class="db-verwijder db-foto-kies" class:is-bezig={bezig}>
                    {#if bezig && posterBezigVoortgang !== null}
                      Uploaden… {posterBezigVoortgang}%
                    {:else}
                      {poster ? "Vervangen" : "Poster kiezen"}
                    {/if}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={posterBezigId !== null}
                      onchange={(e) => kiesPosterVoor(a, e)}
                    />
                  </label>
                  {#if poster}
                    <button
                      type="button"
                      class="db-verwijder"
                      disabled={posterBezigId !== null}
                      onclick={() => haalPosterWeg(a)}
                    >
                      Weghalen
                    </button>
                  {/if}
                </div>
              </li>
            {/each}
          </ul>
        {/if}
      </section>

      <!-- artiesten -->
      <div class="db-rij db-rij-agenda" id="artiesten">
        <section class="db-blok">
          <header class="db-blok-kop">
            <h2>Artiesten</h2>
            <span class="db-blok-info">
              {actieveArtiesten} op de website, {actieveMakers} makers{artiesten.length > actieveArtiesten
                ? `, ${artiesten.length - actieveArtiesten} inactief`
                : ""}
            </span>
          </header>
          <input
            class="db-zoek"
            type="search"
            placeholder="zoek een artiest"
            aria-label="Zoek een artiest"
            bind:value={artiestZoek}
          />
          {#if !artiestenGeladen}
            {@render skeletLijst(6)}
          {:else if gefilterdeArtiesten.length === 0}
            <p class="db-leeg">Geen artiesten gevonden.</p>
          {:else}
            <ul class="db-lijst">
              {#each gefilterdeArtiesten as a (a.id)}
                <li
                  class="db-regel db-regel-artiest"
                  class:is-bewerkt={artiestBewerkId === a.id}
                  class:is-inactief={!artiestZichtbaar(a)}
                >
                  <span class="db-regel-wie">
                    {#if a.imageUrl}
                      <img
                        class="db-avatar db-avatar-klein"
                        src={a.imageUrl}
                        alt=""
                        loading="lazy"
                        style:object-position={artiestFotoPositie(a)}
                      />
                    {:else}
                      <span class="db-avatar db-avatar-klein">{initialen(a.naam)}</span>
                    {/if}
                    <span>
                      <strong>{a.naam ?? "–"}</strong>
                      <span>
                        {[a.type, a.beschrijving, makersVan(a) > 1 ? `${makersVan(a)} makers` : ""].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </span>
                  <button
                    type="button"
                    class="db-verwijder db-bewerk"
                    onclick={() => bewerkArtiest(a)}
                    aria-label="{a.naam ?? 'Artiest'} bewerken"
                  >
                    Bewerk
                  </button>
                  {#if !artiestZichtbaar(a)}
                    <!-- niet op de website; klikken zet de artiest weer terug (zonder foto: eerst een foto) -->
                    <button
                      type="button"
                      class="db-verwijder db-inactief-knop"
                      disabled={verwijderBezig === a.id}
                      onclick={() => zetWeerActief(a)}
                      aria-label="{a.naam ?? 'Artiest'} is inactief, weer op de website zetten"
                      title={a.imageUrl ? "Klik om weer op de website te zetten" : "Geen foto: voeg een foto toe"}
                    >
                      {verwijderBezig === a.id ? "…" : "Inactief"}
                    </button>
                  {:else}
                    <button
                      type="button"
                      class="db-verwijder"
                      disabled={verwijderBezig === a.id}
                      onclick={() => verwijderArtiest(a)}
                      aria-label="{a.naam ?? 'Artiest'} verwijderen"
                    >
                      {verwijderBezig === a.id ? "…" : "Verwijder"}
                    </button>
                  {/if}
                </li>
              {/each}
            </ul>
          {/if}
        </section>

        <section class="db-blok db-formulier-blok" id="artiest-formulier">
          <header class="db-blok-kop">
            <h2>{artiestBewerkId ? "Artiest bewerken" : "Artiest toevoegen"}</h2>
          </header>
          <form class="db-formulier" onsubmit={slaArtiestOp}>
            <label class="db-veld">
              <span>Naam *</span>
              <input type="text" placeholder="bijv. Leech" bind:value={aNaam} required />
            </label>
            <div class="db-veld-rij db-veld-rij-artiest">
              <label class="db-veld">
                <span>Omschrijving</span>
                <input type="text" placeholder="bijv. Band of Singer-songwriter" bind:value={aBeschrijving} />
              </label>
              <label class="db-veld db-veld-type">
                <span>Type</span>
                <select bind:value={aType}>
                  {#each artiestTypes as t}
                    <option value={t}>{t}</option>
                  {/each}
                </select>
              </label>
              <label class="db-veld db-veld-type">
                <span>Aantal makers</span>
                <input type="number" min="1" step="1" inputmode="numeric" bind:value={aAantalMakers} />
              </label>
            </div>
            <p class="db-uitleg">Bij een band of duo: uit hoeveel mensen bestaat de groep? Telt mee in het aantal makers op de site.</p>
            <label class="db-veld">
              <span>Over de artiest</span>
              <textarea
                rows="5"
                placeholder="verschijnt in de popup op de artiestenpagina (optioneel); een lege regel begint een nieuwe alinea"
                bind:value={aBio}
              ></textarea>
            </label>
            <fieldset class="db-veld">
              <legend>Socials (optioneel, plak de hele link)</legend>
              <div class="db-socials">
                {#each artiestSocials as x}
                  <label class="db-veld">
                    <span>{x.label}</span>
                    <input type="url" placeholder={x.voorbeeld} bind:value={aSocials[x.veld]} />
                  </label>
                {/each}
              </div>
            </fieldset>
            <fieldset class="db-veld">
              <legend>Foto</legend>
              <div class="db-foto-upload">
                {#if aImageUrl}
                  <img class="db-foto-voorbeeld" src={aImageUrl} alt="" />
                {/if}
                <label class="db-verwijder db-foto-kies" class:is-bezig={artiestUploadVoortgang !== null}>
                  {#if artiestUploadVoortgang !== null}
                    Uploaden… {artiestUploadVoortgang}%
                  {:else}
                    {aImageUrl ? "Andere foto kiezen" : "Foto kiezen"}
                  {/if}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={artiestUploadVoortgang !== null}
                    onchange={kiesArtiestFoto}
                  />
                </label>
                {#if aImageUrl && artiestUploadVoortgang === null}
                  <button type="button" class="db-verwijder" onclick={() => (aImageUrl = "")}>
                    Foto weghalen
                  </button>
                {/if}
              </div>
            </fieldset>
            {#if aImageUrl}
              <fieldset class="db-veld">
                <legend>Welk deel van de foto?</legend>
                <div class="db-uitsnede">
                  {#each artiestUitsneden as u}
                    <label class="db-uitsnede-optie">
                      <input type="radio" name="artiestUitsnede" value={u.waarde} bind:group={aFotoPositie} />
                      <img class="db-uitsnede-artiest" src={aImageUrl} alt="" style:object-position={u.waarde} />
                      <span>{u.label}</span>
                    </label>
                  {/each}
                </div>
              </fieldset>
            {/if}

            <label class="db-vinkje">
              <input type="checkbox" bind:checked={aInactief} />
              <span>Inactief: niet op de website tonen</span>
            </label>
            {#if !aImageUrl}
              <p class="db-uitleg">Zonder foto staat een artiest niet op de website.</p>
            {/if}

            {#if artiestFout}
              <p class="db-fout">{artiestFout}</p>
            {/if}
            {#if artiestGelukt}
              <p class="db-gelukt">{artiestGelukt}</p>
            {/if}

            <button
              class="db-knop db-knop-breed"
              type="submit"
              disabled={artiestOpslaan || artiestUploadVoortgang !== null}
            >
              {artiestOpslaan ? "Bezig…" : artiestBewerkId ? "Opslaan" : "Toevoegen"}
            </button>
            {#if artiestBewerkId}
              <button
                class="db-verwijder db-annuleer"
                type="button"
                disabled={artiestOpslaan}
                onclick={annuleerArtiest}
              >
                Annuleren
              </button>
            {/if}
          </form>
        </section>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Dashboard in de stijl van de homepage: donkere achtergrond, zware
     Archivo-koppen in hoofdletters, Space Mono-labels, effen merkkleuren
     en harde verschoven schaduwen (zoals de crewkaarten en het
     contactformulier). */

  /* skeleton loader: kleur volgt de tekstkleur, dus werkt op elke achtergrond */
  .db-skel {
    display: block;
    border-radius: 4px;
    background: linear-gradient(
      90deg,
      color-mix(in srgb, currentColor 10%, transparent) 25%,
      color-mix(in srgb, currentColor 20%, transparent) 37%,
      color-mix(in srgb, currentColor 10%, transparent) 63%
    );
    background-size: 400% 100%;
    animation: db-shimmer 1.4s ease infinite;
  }
  @keyframes db-shimmer {
    0% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0 50%;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .db-skel {
      animation: none;
    }
  }
  .db-skel-titel {
    width: min(70%, 620px);
    height: clamp(32px, 10vw, 110px);
    color: var(--color-fg);
  }
  .db-skel-label {
    width: 96px;
    height: 26px;
  }
  .db-skel-kop {
    width: 80%;
    height: 30px;
  }
  .db-skel-lijn {
    width: 100%;
    height: 12px;
  }
  .db-skel-kort {
    width: 55%;
  }
  .db-regel.db-skel-regel {
    grid-template-columns: 40px minmax(0, 1fr) 72px;
  }
  .db-skel-rond {
    width: 40px;
    height: 40px;
    border-radius: 50%;
  }
  .db-skel-tekst {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .db-skel-knop {
    height: 30px;
  }
  .db-skel-poster {
    aspect-ratio: 3 / 4;
  }
  .db-visueel-verborgen {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
  .auth-gate {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg);
    color: var(--color-muted);
    font: 700 12px/1.5 var(--font-mono);
    letter-spacing: 0.1em;
  }

  .db {
    --db-rand: var(--color-bg);
    --db-zacht: color-mix(in srgb, var(--color-bg) 65%, transparent);
    --db-schaduw: 10px;
    min-height: 100vh;
    padding: 40px 40px 64px;
    background: var(--color-bg);
    font-family: var(--font-display);
    color: var(--color-fg);
  }

  /* paneel */
  .db-paneel {
    max-width: 1400px;
    margin: 0 auto;
    scroll-margin-top: 14px;
  }
  .db-avatar {
    flex: none;
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border: 2px solid var(--color-bg);
    background: var(--color-accent);
    color: var(--color-bg);
    font-weight: 900;
    font-size: 13px;
    object-fit: cover;
  }
  .db-avatar-klein {
    width: 40px;
    height: 40px;
    font-size: 12px;
    background: var(--color-primary);
    color: var(--color-fg);
  }

  .db-kop {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    /* ruime witruimte boven en onder de paginatitel */
    margin: 32px 0 64px;
    /* ruimte voor de menuknop rechtsboven */
    padding-right: 64px;
    container-type: inline-size;
  }
  .db-kop h1 {
    margin: 0;
    font-weight: 900;
    font-stretch: 125%;
    /* zo groot als past naast de menuknop */
    font-size: clamp(32px, 15cqi, 140px);
    line-height: 0.85;
    letter-spacing: -0.035em;
    text-transform: uppercase;
    color: var(--color-fg);
    text-shadow: 6px 6px 0 var(--color-primary);
  }

  /* gekleurde kaarten */
  .db-kaarten {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 28px;
    margin-bottom: 40px;
  }
  .db-kaart {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 22px;
  }
  .db-kaart-oranje {
    background: var(--color-accent);
    color: var(--color-bg);
    box-shadow: var(--db-schaduw) var(--db-schaduw) 0 var(--color-primary);
  }
  .db-kaart-paars {
    background: var(--color-primary);
    color: var(--color-fg);
    box-shadow: var(--db-schaduw) var(--db-schaduw) 0 var(--color-accent);
  }
  .db-kaart-licht {
    background: var(--color-fg);
    color: var(--color-bg);
    box-shadow: var(--db-schaduw) var(--db-schaduw) 0 var(--color-primary);
  }
  /* donkere kaart met crème rand, zoals de omlijnde blokken op de homepage */
  .db-kaart-donker {
    background: var(--color-bg);
    color: var(--color-fg);
    border: 3px solid var(--color-fg);
    box-shadow: var(--db-schaduw) var(--db-schaduw) 0 var(--color-accent);
  }
  .db-kaart h2 {
    margin: 0;
    font-weight: 900;
    font-stretch: 118%;
    font-size: clamp(22px, 2vw, 30px);
    line-height: 0.95;
    letter-spacing: -0.02em;
    text-transform: uppercase;
  }
  .db-label {
    padding: 7px 10px;
    font: 700 11px/1 var(--font-mono);
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }
  .db-label-donker {
    background: var(--color-bg);
    color: var(--color-fg);
  }
  .db-label-oranje {
    background: var(--color-accent);
    color: var(--color-bg);
  }
  .db-voortgang {
    align-self: stretch;
  }
  .db-voortgang p {
    display: flex;
    justify-content: space-between;
    margin: 0 0 8px;
    font: 700 11px/1.2 var(--font-mono);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    opacity: 0.85;
  }
  .db-balk {
    height: 8px;
    background: color-mix(in srgb, currentColor 22%, transparent);
    overflow: hidden;
  }
  .db-balk i {
    display: block;
    height: 100%;
    background: currentColor;
    transition: width 0.4s ease;
  }
  .db-knop {
    align-self: flex-end;
    padding: 12px 20px;
    border: 0;
    background: var(--color-bg);
    color: var(--color-fg);
    font: 700 12px/1 var(--font-mono);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    text-decoration: none;
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s;
  }
  .db-knop:hover:not(:disabled) {
    background: var(--color-fg);
    color: var(--color-bg);
  }
  .db-knop:disabled {
    opacity: 0.6;
    cursor: default;
  }
  /* de grote knop in een formulier, zoals VERSTUUR op de homepage */
  .db-knop-breed {
    align-self: stretch;
    padding: 16px 18px;
    text-align: center;
    background: var(--color-primary);
    color: var(--color-fg);
    font: 800 18px/1 var(--font-display);
    letter-spacing: 0.02em;
  }
  .db-knop-breed:hover:not(:disabled) {
    background: var(--color-primary-dark);
    color: var(--color-fg);
  }

  /* blokken */
  .db-rij {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
    gap: 28px;
    margin-bottom: 40px;
    scroll-margin-top: 14px;
  }
  .db-rij-agenda {
    grid-template-columns: minmax(0, 1.200fr) minmax(0, 1fr);
  }
  .db-rij-enkel {
    grid-template-columns: minmax(0, 1fr);
  }
  /* kleine knoppen bovenin en in de kop van een blok */
  .db-top-knop {
    justify-self: auto;
    text-decoration: none;
    white-space: nowrap;
  }
  .db-top-knop:hover:not(:disabled) {
    background: var(--color-bg);
    border-color: var(--color-bg);
    color: var(--color-fg);
  }
  .db-blok {
    min-width: 0;
    padding: 24px;
    background: var(--color-fg);
    color: var(--color-bg);
    box-shadow: var(--db-schaduw) var(--db-schaduw) 0 var(--color-primary);
    scroll-margin-top: 14px;
  }
  .db-formulier-blok {
    box-shadow: var(--db-schaduw) var(--db-schaduw) 0 var(--color-accent);
  }
  .db-blok-kop {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px 14px;
    margin-bottom: 18px;
    padding-bottom: 14px;
    border-bottom: 3px solid var(--color-bg);
  }
  .db-blok-kop h2 {
    margin: 0;
    font-weight: 900;
    font-stretch: 118%;
    font-size: clamp(26px, 2.4vw, 34px);
    line-height: 0.9;
    letter-spacing: -0.02em;
    text-transform: uppercase;
  }
  .db-uitleg {
    margin: -6px 0 16px;
    color: var(--db-zacht);
    font: 400 13px/1.5 var(--font-mono);
  }
  .db-blok-info {
    margin-right: auto;
    color: var(--color-primary);
    font: 700 11px/1 var(--font-mono);
    letter-spacing: 0.16em;
    text-transform: uppercase;
    text-decoration: none;
  }
  .db-leeg {
    margin: 0;
    padding: 18px 0;
    font: 400 13px/1.6 var(--font-mono);
    color: var(--db-zacht);
  }

  .db-lijst-kop,
  .db-regel {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 96px 110px 64px 84px;
    align-items: center;
    gap: 12px;
  }
  .db-lijst-kop-agenda,
  .db-regel-agenda {
    grid-template-columns: minmax(0, 1fr) 96px 110px 64px 84px;
  }
  .db-regel.is-bewerkt {
    background: var(--color-accent);
  }
  .db-regel-artiest {
    grid-template-columns: minmax(0, 1fr) 64px 84px;
  }
  /* inactieve artiest: staat niet op de website, daarom wat vager */
  .db-regel.is-inactief .db-regel-wie {
    opacity: 0.55;
  }
  .db-verwijder.db-inactief-knop {
    background: var(--color-bg);
    color: var(--color-fg);
  }
  .db-verwijder.db-inactief-knop:hover:not(:disabled) {
    background: var(--color-accent);
    color: var(--color-bg);
  }
  .db-vinkje {
    display: flex;
    align-items: center;
    gap: 10px;
    font: 400 16px/1.3 var(--font-mono);
    cursor: pointer;
  }
  .db-vinkje input {
    width: 20px;
    height: 20px;
    margin: 0;
    accent-color: var(--color-bg);
  }
  .db-zoek {
    width: 100%;
    max-width: 280px;
    box-sizing: border-box;
    margin-bottom: 12px;
    padding: 11px 14px;
    border: 2px solid var(--color-bg);
    background: var(--color-white);
    color: var(--color-bg);
    font: 400 13px/1.2 var(--font-mono);
  }
  .db-zoek::placeholder {
    color: var(--color-gray-300);
  }
  .db-zoek:focus {
    outline: 3px solid var(--color-primary);
    outline-offset: 0;
  }
  /* artiestfoto's staan op de website bijna vierkant */
  .db-uitsnede-optie img.db-uitsnede-artiest {
    aspect-ratio: 1 / 1;
  }
  .db-bewerk:hover:not(:disabled) {
    background: var(--color-bg);
    border-color: var(--color-bg);
    color: var(--color-fg);
  }
  .db-foto-upload {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }
  .db-foto-voorbeeld {
    width: 112px;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    border: 2px solid var(--color-bg);
  }
  /* poster helemaal tonen (vaak staand) */
  .db-poster-voorbeeld {
    width: 80px;
    aspect-ratio: auto;
    object-fit: contain;
  }
  .db-foto-kies {
    position: relative;
    overflow: hidden;
  }
  .db-foto-kies:hover,
  .db-foto-kies:focus-within {
    background: var(--color-bg);
    border-color: var(--color-bg);
    color: var(--color-fg);
  }
  .db-foto-kies.is-bezig {
    cursor: progress;
    opacity: 0.7;
  }
  /* het echte bestandsveld ligt onzichtbaar over de knop */
  /* posters: raster van staande kaarten */
  .db-posters-blok {
    margin-bottom: 40px;
  }
  .db-posters {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 22px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  /* telefoon: altijd twee posters naast elkaar */
  @media (max-width: 560px) {
    .db-posters {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 22px 14px;
    }
  }
  .db-poster {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .db-poster-beeld {
    display: grid;
    place-items: center;
    aspect-ratio: 3 / 4;
    overflow: hidden;
    border: 2px solid var(--color-bg);
    background: var(--color-bg);
  }
  .db-poster-beeld img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: 50% 0;
  }
  .db-poster-leeg {
    background: transparent;
    border-style: dashed;
    color: var(--db-zacht);
    font: 700 11px/1.3 var(--font-mono);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .db-poster-naam {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin: 0;
    font: 400 12px/1.3 var(--font-mono);
    color: var(--db-zacht);
  }
  .db-poster-naam strong {
    color: var(--color-bg);
    font: 800 14px/1.2 var(--font-display);
  }
  .db-poster-knoppen {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: auto;
  }
  .db-foto-kies input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }
  .db-uitsnede {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }
  .db-uitsnede-optie {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font: 700 11px/1 var(--font-mono);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
  }
  .db-uitsnede-optie input {
    position: absolute;
    opacity: 0;
  }
  .db-uitsnede-optie img {
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    border: 3px solid transparent;
  }
  .db-uitsnede-optie input:checked + img {
    border-color: var(--color-primary);
  }
  .db-uitsnede-optie input:focus-visible + img {
    outline: 2px solid var(--color-bg);
    outline-offset: 2px;
  }
  .db-annuleer {
    align-self: center;
    padding: 10px 18px;
  }
  .db-annuleer:hover:not(:disabled) {
    background: var(--color-bg);
    border-color: var(--color-bg);
    color: var(--color-fg);
  }
  .db-lijst-kop {
    padding-bottom: 10px;
    font: 700 11px/1 var(--font-mono);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--db-zacht);
  }
  .db-lijst {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 440px;
    overflow-y: auto;
  }
  .db-regel {
    padding: 12px 8px;
    border-top: 2px solid color-mix(in srgb, var(--color-bg) 16%, transparent);
    font-size: 14px;
  }
  .db-regel.is-geweest {
    opacity: 0.45;
  }
  .db-regel-wie {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }
  .db-regel-wie > span:last-child {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
    font: 400 12px/1.3 var(--font-mono);
    color: var(--db-zacht);
  }
  .db-regel-wie strong {
    color: var(--color-bg);
    font: 800 16px/1.1 var(--font-display);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .db-regel-datum,
  .db-regel-tijd {
    font: 700 13px/1.2 var(--font-mono);
  }
  .db-verwijder {
    justify-self: end;
    padding: 8px 10px;
    border: 2px solid var(--color-bg);
    background: transparent;
    color: var(--color-bg);
    font: 700 11px/1 var(--font-mono);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s;
  }
  .db-verwijder:hover:not(:disabled) {
    background: var(--color-error);
    border-color: var(--color-error);
    color: var(--color-white);
  }

  /* formulier */
  .db-formulier {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .db-veld {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
    color: var(--color-bg);
    font: 700 11px/1.2 var(--font-mono);
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  /* fieldset/legend zonder de standaard rand en ruimte van de browser */
  fieldset.db-veld {
    margin: 0;
    padding: 0;
    border: 0;
  }
  .db-veld legend {
    padding: 0;
    margin-bottom: 6px;
  }
  .db-socials {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
  }
  .db-veld input,
  .db-veld select,
  .db-veld textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 12px 14px;
    border: 2px solid var(--color-bg);
    background: var(--color-white);
    color: var(--color-bg);
    font: 400 14px/1.3 var(--font-mono);
    letter-spacing: 0;
    text-transform: none;
  }
  .db-veld input::placeholder,
  .db-veld textarea::placeholder {
    color: var(--color-gray-300);
  }
  .db-veld input:focus,
  .db-veld select:focus,
  .db-veld textarea:focus {
    outline: 3px solid var(--color-primary);
    outline-offset: 0;
  }
  .db-veld textarea {
    resize: vertical;
  }
  .db-veld-rij {
    display: grid;
    grid-template-columns: 1.300fr 1fr 1fr;
    gap: 10px;
  }
  .db-veld-rij-type {
    grid-template-columns: 1fr 72px;
  }
  .db-veld-rij-artiest {
    grid-template-columns: 1fr 120px 120px;
  }
  .db-veld-kleur input {
    height: 46px;
    padding: 4px;
  }
  .db-fout,
  .db-gelukt {
    margin: 0;
    font: 700 12px/1.5 var(--font-mono);
  }
  .db-fout {
    color: var(--color-error);
  }
  .db-waarschuwing {
    margin: 0;
    padding: 10px 12px;
    border-left: 4px solid var(--color-error);
    background: color-mix(in srgb, var(--color-error) 10%, transparent);
    font: 400 13px/1.5 var(--font-mono);
  }
  .db-melding {
    margin-bottom: 12px;
  }
  .db-hint {
    margin: 0;
    font: 400 12px/1.5 var(--font-mono);
    color: var(--db-zacht);
  }
  .db-gelukt {
    color: var(--color-success);
  }

  /* vier kaarten passen niet naast elkaar op een kleiner scherm */
  @media (max-width: 1200px) {
    .db-kaarten {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 1000px) {
    .db-rij,
    .db-rij-agenda {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 560px) {
    .db-kaarten {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 700px) {
    .db {
      --db-schaduw: 6px;
      padding: 20px 20px 48px;
    }
    .db-kop {
      margin: 36px 0 48px;
    }
    .db-kaarten,
    .db-rij {
      gap: 22px;
      margin-bottom: 28px;
    }
    .db-blok {
      padding: 18px;
    }
    .db-lijst-kop {
      display: none;
    }
    .db-regel,
    .db-regel-agenda,
    .db-regel-artiest {
      grid-template-columns: minmax(0, 1fr) auto;
      row-gap: 6px;
    }
    .db-regel-wie {
      grid-column: 1 / -1;
    }
    .db-regel-datum {
      color: var(--db-zacht);
    }
    .db-verwijder {
      grid-column: 1 / -1;
      justify-self: start;
    }
    .db-veld-rij {
      grid-template-columns: 1fr 1fr;
    }
    .db-veld-rij > :first-child {
      grid-column: 1 / -1;
    }
    .db-veld-rij-type > :first-child {
      grid-column: auto;
    }
    .db-veld-rij-type {
      grid-template-columns: 1fr 72px;
    }
  }
</style>
