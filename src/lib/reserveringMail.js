import { auth } from "$lib/firebaseApp.js";

// Reserveringsmails verstuurt de eigen server op art-quake.com
// (reservering-mail.php, zie scripts/vimexx-reservering-mail.php). Lokaal
// (npm run dev) draait geen PHP: daar gaan er geen mails uit en slaat het
// boekingsformulier de verificatiecode over.
export const mailActief = () => typeof location !== "undefined" && location.hostname.endsWith("art-quake.com");

// De server mailt alleen voor ingelogde crew: het inlogbewijs gaat mee.
async function mailViaServer(gegevens) {
	const token = await auth.currentUser?.getIdToken();
	if (!token) throw new Error("Niet ingelogd");
	const res = await fetch("/reservering-mail.php", {
		method: "POST",
		headers: { "Content-Type": "application/json", Accept: "application/json" },
		body: JSON.stringify({ ...gegevens, token }),
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok || data.success !== true) throw new Error(data.message || "Versturen mislukt");
}

// Mail met de 6-cijferige code; gooit een fout als het niet lukt.
export async function stuurVerificatiecode(naar, naam, code) {
	if (!mailActief()) throw new Error("Mail versturen kan alleen op art-quake.com");
	await mailViaServer({ soort: "code", naam, email: naar, code });
}

// Geheime code waarmee iemand via de link in de mail zelf kan annuleren
// (zie /annuleren en magZelfAnnuleren in firestore.rules).
export function nieuweAnnuleerCode() {
	return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
}

export const studioNamen = {
	oefen: "Oefenruimte",
	opname: "Opnamestudio",
	dans: "Dansstudio",
	atelier: "Atelier",
};

// Soorten mail: "bevestigd", "gewijzigd" en "verwijderd"; de server heeft
// per soort een eigen template (zie de map email-templates). Met id en
// annuleerCode in de reservering krijgen "bevestigd" en "gewijzigd" een link
// om zelf te annuleren.
// Stuurt de mail en geeft terug of dat gelukt is (true/false). Gooit nooit,
// zodat een mislukte mail de reservering zelf niet in de weg zit.
export async function stuurReserveringMail(reservering, soort = "bevestigd") {
	if (!reservering.email || !mailActief()) return false;
	try {
		await mailViaServer({
			soort,
			naam: reservering.naam,
			email: reservering.email,
			studio: studioNamen[reservering.studio] ?? reservering.studio,
			datum: new Date(`${reservering.datum}T00:00`).toLocaleDateString("nl-NL", {
				weekday: "long",
				day: "numeric",
				month: "long",
				year: "numeric",
			}),
			starttijd: reservering.starttijd,
			eindtijd: reservering.eindtijd,
			id: reservering.id,
			annuleerCode: reservering.annuleerCode,
		});
		return true;
	} catch {
		return false;
	}
}
