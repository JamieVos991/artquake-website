import { base } from "$app/paths";

// Het domein, zonder pad en zonder slash aan het eind. Wordt gebruikt voor
// sitemap.xml, robots.txt en de deelvoorbeelden (og:url). Volgt vanzelf de build:
// met pad (/artquake-website) is het GitHub Pages, zonder pad art-quake.com
// (zie svelte.config.js).
export const SITE_DOMEIN = base ? "https://jamievos991.github.io" : "https://art-quake.com";

// Pagina's die niet in zoekmachines horen (alleen voor de crew)
export const nietIndexeren = ["/login", "/dashboard", "/reserveren", "/styleguide"];
