import { redirect } from "@sveltejs/kit";
import { base } from "$app/paths";
import { oudeArtiestSlugs } from "$lib/data/oudeLinks.js";

// Oude artiestpagina's (art-quake.com/artiesten/leech/) openen de popup op de
// artiestenpagina (/artiesten#leech). Niet vooraf gebouwd: een map artiesten/
// naast artiesten.html kan op GitHub Pages /artiesten zelf breken. Deze adressen
// lopen daarom via 404.html, waarna de site zelf doorstuurt.
export const prerender = false;
export const trailingSlash = "ignore";

export function load({ params }) {
	const slug = oudeArtiestSlugs[params.slug] ?? params.slug;
	redirect(308, `${base}/artiesten#${slug}`);
}
