import { base } from "$app/paths";
import { SITE_DOMEIN, nietIndexeren } from "$lib/data/site.js";

// robots.txt wordt bij het bouwen gemaakt (art-quake.com/robots.txt).
export const prerender = true;

export function GET() {
	const regels = [
		"User-agent: *",
		"Allow: /",
		...nietIndexeren.map((pad) => `Disallow: ${base}${pad}`),
		"",
		`Sitemap: ${SITE_DOMEIN}${base}/sitemap.xml`,
		"",
	];
	return new Response(regels.join("\n"), {
		headers: { "Content-Type": "text/plain" },
	});
}
