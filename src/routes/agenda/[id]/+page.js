import { error } from "@sveltejs/kit";
import { haalCollectieOp, haalDocumentOp } from "$lib/publiekeData.js";

// Elke activiteit die bij het bouwen bestaat, krijgt een eigen pagina (goed voor
// Google). Een activiteit die later in het dashboard wordt toegevoegd, werkt ook:
// de server stuurt die via 404.html naar de site, die de pagina dan zelf laadt.
export const prerender = true;

export async function entries() {
	try {
		const items = await haalCollectieOp("agenda");
		return items.map((a) => ({ id: a.id }));
	} catch {
		return [];
	}
}

export async function load({ params }) {
	const item = await haalDocumentOp("agenda", params.id).catch(() => null);
	if (!item) error(404, "Deze activiteit bestaat niet (meer)");
	return { item };
}
