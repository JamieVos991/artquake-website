import { error } from "@sveltejs/kit";
import { base } from "$app/paths";
import { oudePaginas } from "$lib/data/oudeLinks.js";

// Pagina's van de oude site (art-quake.com/contact/ enz.) sturen door naar de
// juiste plek op de homepage. Bij het bouwen wordt per oud adres een kleine
// pagina gemaakt die meteen doorstuurt; met slash erachter, zoals de oude links.
// (Geen redirect() hier: bij het bouwen zou die van "/#doe-mee" een eigen
// bestand maken.)
export const prerender = true;
export const trailingSlash = "always";

export function entries() {
	return Object.keys(oudePaginas).map((oudePagina) => ({ oudePagina }));
}

export function load({ params }) {
	const doel = oudePaginas[params.oudePagina];
	if (!doel) error(404, "Deze pagina bestaat niet");
	return { doel: `${base}${doel}` };
}
