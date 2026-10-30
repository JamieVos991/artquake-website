// Mail-API van art-quake.com, draait als Cloudflare Worker en verstuurt via Resend.
//   POST /contact      contactformulier, mail naar info@art-quake.com
//   POST /reservering  reserveringsmails, alleen voor ingelogde crew
// De sleutel van Resend staat als geheim in Cloudflare (RESEND_API_KEY), niet in de code.
import bevestiging from "../../email-templates/bevestiging.html";
import gewijzigd from "../../email-templates/gewijzigd.html";
import verificatiecode from "../../email-templates/verificatiecode.html";
import verwijderd from "../../email-templates/verwijderd.html";

const FIREBASE_PROJECT = "artquake-6fceb";
const ONTVANGER = "info@art-quake.com";
const AFZENDER = "info@art-quake.com"; // eigen domein, anders belandt het in spam
const HERKOMST = ["https://art-quake.com", "https://www.art-quake.com"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TEMPLATES = { code: verificatiecode, bevestigd: bevestiging, gewijzigd, verwijderd };

// fout met een statuscode voor de bezoeker
class Afwijzing extends Error {
	constructor(status, melding) {
		super(melding);
		this.status = status;
	}
}

function antwoord(status, gelukt, melding, herkomst) {
	return new Response(JSON.stringify({ success: gelukt, message: melding ?? "" }), {
		status,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"X-Content-Type-Options": "nosniff",
			"Access-Control-Allow-Origin": herkomst,
			Vary: "Origin",
		},
	});
}

// enters zouden in een onderwerp of naam niet thuishoren
const eenRegel = (tekst) => String(tekst ?? "").replace(/[\r\n]+/g, " ").trim();

const ontsnap = (tekst) =>
	String(tekst)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;");

async function verstuur(env, mail) {
	const res = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
		body: JSON.stringify(mail),
	});
	if (!res.ok) {
		console.error("Resend", res.status, await res.text());
		throw new Afwijzing(500, "Versturen mislukt");
	}
}

async function contact(invoer, request, env) {
	// verborgen veld ingevuld: een bot. Doe alsof het gelukt is.
	if (String(invoer._honey ?? "").trim() !== "") return;

	const ip = request.headers.get("CF-Connecting-IP") ?? "onbekend";
	if (!(await env.LIMIET_CONTACT.limit({ key: ip })).success) {
		throw new Afwijzing(429, "Te veel berichten, probeer het later opnieuw");
	}

	const naam = eenRegel(invoer.naam);
	const email = String(invoer.email ?? "").trim();
	const telefoon = String(invoer.telefoon ?? "").trim();
	const bericht = String(invoer.bericht ?? "").trim();
	if (naam === "" || naam.length > 120) throw new Afwijzing(422, "Vul je naam in");
	if (!EMAIL.test(email) || email.length > 200) throw new Afwijzing(422, "Vul een geldig e-mailadres in");
	if (bericht === "" || bericht.length > 5000) throw new Afwijzing(422, "Vul een bericht in");
	if (!/^[0-9 +()\-.]{6,30}$/.test(telefoon)) throw new Afwijzing(422, "Vul een geldig telefoonnummer in");

	await verstuur(env, {
		from: `Artquake website <${AFZENDER}>`,
		to: [ONTVANGER],
		reply_to: email, // op Beantwoorden klikken gaat naar de bezoeker
		subject: `Nieuw bericht via art-quake.com van ${naam}`,
		text: `Naam: ${naam}\nE-mail: ${email}\nTelefoon: ${telefoon}\n\n${bericht}\n\n--\nVerstuurd via het contactformulier op art-quake.com`,
	});
}

// Alleen crew: de site stuurt het Firebase-inlogbewijs (ID-token) mee, en
// Firestore beslist of dat echt is en bij een beheerder hoort.
async function controleerCrew(invoer, env) {
	const token = String(invoer.token ?? "");
	if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) throw new Afwijzing(401, "Niet ingelogd");
	let uid = "";
	try {
		const inhoud = JSON.parse(atob(token.split(".")[1].replaceAll("-", "+").replaceAll("_", "/")));
		uid = String(inhoud.user_id ?? inhoud.sub ?? "");
	} catch {
		// uid blijft leeg en wordt hieronder afgewezen
	}
	if (!/^[A-Za-z0-9]{10,128}$/.test(uid)) throw new Afwijzing(401, "Niet ingelogd");

	const res = await fetch(
		`https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/beheerders/${encodeURIComponent(uid)}`,
		{ headers: { Authorization: `Bearer ${token}` } }
	);
	if (res.status !== 200) throw new Afwijzing(403, "Geen toegang");

	if (!(await env.LIMIET_CREW.limit({ key: uid })).success) {
		throw new Afwijzing(429, "Te veel mails, probeer het later opnieuw");
	}
}

async function reservering(invoer, env) {
	await controleerCrew(invoer, env);

	const soort = String(invoer.soort ?? "");
	const naam = eenRegel(invoer.naam);
	const email = String(invoer.email ?? "").trim();
	if (!Object.hasOwn(TEMPLATES, soort)) throw new Afwijzing(422, "Onbekende soort");
	if (naam === "" || naam.length > 120) throw new Afwijzing(422, "Naam ontbreekt");
	if (!EMAIL.test(email) || email.length > 200) throw new Afwijzing(422, "Ongeldig e-mailadres");

	const waarden = { naam, email };
	let onderwerp;
	if (soort === "code") {
		const code = String(invoer.code ?? "");
		if (!/^\d{6}$/.test(code)) throw new Afwijzing(422, "Ongeldige code");
		waarden.code = code;
		onderwerp = `Je verificatiecode: ${code}`;
	} else {
		const studio = String(invoer.studio ?? "");
		const datum = String(invoer.datum ?? "");
		const starttijd = String(invoer.starttijd ?? "");
		const eindtijd = String(invoer.eindtijd ?? "");
		if (!["Oefenruimte", "Opnamestudio", "Dansstudio", "Atelier"].includes(studio)) throw new Afwijzing(422, "Onbekende ruimte");
		if (!/^[\p{L}\d ,.]{6,60}$/u.test(datum)) throw new Afwijzing(422, "Ongeldige datum");
		if (!/^\d{2}:\d{2}$/.test(starttijd) || !/^\d{2}:\d{2}$/.test(eindtijd)) throw new Afwijzing(422, "Ongeldige tijd");
		Object.assign(waarden, { studio, datum, starttijd, eindtijd });

		// link om zelf te annuleren (pagina /annuleren); alleen bij bevestigd en
		// gewijzigd, en alleen met een geldig document-ID en annuleercode
		const id = String(invoer.id ?? "");
		const annuleerCode = String(invoer.annuleerCode ?? "");
		if (soort !== "verwijderd" && /^[A-Za-z0-9]{20}$/.test(id) && /^[a-f0-9]{32}$/.test(annuleerCode)) {
			waarden.annuleerlink = `https://art-quake.com/annuleren#${id}.${annuleerCode}`;
		}
		// het bevestigingstemplate is gedeeld en krijgt kop en tekst als variabelen
		if (soort === "bevestigd") {
			Object.assign(waarden, {
				onderwerp: "Reservering bevestigd",
				label: "GELUKT",
				titel: "Reservering bevestigd.",
				intro: "je reservering staat vast:",
			});
		}
		onderwerp = {
			bevestigd: `Reservering bevestigd: ${studio}`,
			gewijzigd: `Je reservering is gewijzigd: ${studio}`,
			verwijderd: `Je reservering is verwijderd: ${studio}`,
		}[soort];
	}

	// uitlegcommentaar bovenaan weg; het annuleerstuk alleen tonen als er een link is
	let html = TEMPLATES[soort].replace(/^\s*<!--[\s\S]*?-->\s*/, "").trim();
	html = waarden.annuleerlink
		? html.replaceAll("<!--annuleren-->", "").replaceAll("<!--/annuleren-->", "")
		: html.replace(/<!--annuleren-->[\s\S]*?<!--\/annuleren-->/g, "");
	for (const [sleutel, waarde] of Object.entries(waarden)) {
		html = html.replaceAll(`{{${sleutel}}}`, ontsnap(waarde));
	}

	await verstuur(env, {
		from: `Artquake <${AFZENDER}>`,
		to: [email],
		reply_to: AFZENDER,
		subject: onderwerp,
		html: `<!doctype html><html lang="nl"><head><meta charset="utf-8"></head><body style="margin:0">${html}</body></html>`,
	});
}

export default {
	async fetch(request, env) {
		const herkomst = request.headers.get("Origin") ?? "";
		// alleen vanaf de eigen site
		if (!HERKOMST.includes(herkomst)) return antwoord(403, false, "Niet toegestaan", HERKOMST[0]);

		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 204,
				headers: {
					"Access-Control-Allow-Origin": herkomst,
					"Access-Control-Allow-Methods": "POST",
					"Access-Control-Allow-Headers": "Content-Type",
					"Access-Control-Max-Age": "86400",
					Vary: "Origin",
				},
			});
		}
		if (request.method !== "POST") return antwoord(405, false, "Alleen POST", herkomst);

		const route = new URL(request.url).pathname;
		if (route !== "/contact" && route !== "/reservering") return antwoord(404, false, "Niet gevonden", herkomst);

		let invoer;
		try {
			invoer = await request.json();
		} catch {
			invoer = null;
		}
		if (invoer === null || typeof invoer !== "object") return antwoord(400, false, "Ongeldige invoer", herkomst);

		try {
			await (route === "/contact" ? contact(invoer, request, env) : reservering(invoer, env));
			return antwoord(200, true, "", herkomst);
		} catch (fout) {
			if (fout instanceof Afwijzing) return antwoord(fout.status, false, fout.message, herkomst);
			console.error(fout);
			return antwoord(500, false, "Versturen mislukt", herkomst);
		}
	},
};
