// Waar staat de site? Dit is de enige schakelaar.
// false: jamievos991.github.io/artquake-website (nu)
// true:  art-quake.com. Zet dit pas op true als art-quake.com in de DNS naar
//        GitHub Pages wijst en bij GitHub onder Settings > Pages als custom domain staat.
export const EIGEN_DOMEIN = false;

// Het domein, zonder pad en zonder slash aan het eind. Wordt gebruikt voor
// sitemap.xml, robots.txt en de deelvoorbeelden (og:url).
export const SITE_DOMEIN = EIGEN_DOMEIN ? "https://art-quake.com" : "https://jamievos991.github.io";

// Het pad op dat domein (paths.base in svelte.config.js)
export const SITE_PAD = EIGEN_DOMEIN ? "" : "/artquake-website";

// Pagina's die niet in zoekmachines horen (alleen voor de crew)
export const nietIndexeren = ["/login", "/dashboard", "/reserveren", "/styleguide"];
