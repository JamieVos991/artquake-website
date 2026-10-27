// Openbare gegevens (agenda en artiesten) lezen zonder de Firebase-SDK.
// De SDK is ruim een halve megabyte JavaScript; voor alleen lezen is een
// gewone fetch naar de Firestore REST-API genoeg. De Firestore-regels staan
// lezen van deze collecties voor iedereen toe. Het dashboard en reserveren
// gebruiken wel de SDK (schrijven, inloggen, live bijwerken).
const PROJECT = "artquake-6fceb";
const BASIS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

// Firestore REST geeft elk veld als { stringValue: "…" }, { integerValue: "3" } enz.
function waarde(v) {
	if ("stringValue" in v) return v.stringValue;
	if ("integerValue" in v) return Number(v.integerValue);
	if ("doubleValue" in v) return v.doubleValue;
	if ("booleanValue" in v) return v.booleanValue;
	if ("timestampValue" in v) return v.timestampValue;
	if ("nullValue" in v) return null;
	if ("arrayValue" in v) return (v.arrayValue.values ?? []).map(waarde);
	if ("mapValue" in v) return velden(v.mapValue.fields ?? {});
	return undefined;
}

function velden(f) {
	return Object.fromEntries(Object.entries(f).map(([k, v]) => [k, waarde(v)]));
}

// Vragen de pagina en het menu tegelijk dezelfde collectie op (de homepage
// en het menu allebei de agenda), dan gaat er maar één verzoek uit. Het
// resultaat blijft een paar minuten bewaard; daarna weer vers ophalen.
const BEWAAR_MS = 5 * 60 * 1000;
const opgehaald = new Map();

// Haalt alle documenten van een collectie op als [{ id, ...velden }].
export function haalCollectieOp(naam) {
	const bewaard = opgehaald.get(naam);
	if (bewaard && Date.now() - bewaard.tijd < BEWAAR_MS) return bewaard.belofte;
	const belofte = haalCollectieVers(naam);
	opgehaald.set(naam, { belofte, tijd: Date.now() });
	belofte.catch(() => opgehaald.delete(naam));
	return belofte;
}

async function haalCollectieVers(naam) {
	const docs = [];
	let pagina = "";
	do {
		const url = `${BASIS}/${naam}?pageSize=300${pagina ? `&pageToken=${pagina}` : ""}`;
		const res = await fetch(url);
		if (!res.ok) throw new Error(`${naam} laden mislukt (${res.status})`);
		const data = await res.json();
		for (const d of data.documents ?? []) {
			docs.push({ id: d.name.split("/").pop(), ...velden(d.fields ?? {}) });
		}
		pagina = data.nextPageToken ?? "";
	} while (pagina);
	return docs;
}

// Haalt één document op als { id, ...velden }, of null als het niet bestaat.
export async function haalDocumentOp(naam, id) {
	const res = await fetch(`${BASIS}/${naam}/${encodeURIComponent(id)}`);
	if (res.status === 404) return null;
	if (!res.ok) throw new Error(`${naam}/${id} laden mislukt (${res.status})`);
	const d = await res.json();
	return { id, ...velden(d.fields ?? {}) };
}
