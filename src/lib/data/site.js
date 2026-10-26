// Het domein waarop de site draait, zonder pad en zonder slash aan het eind.
// Wordt gebruikt voor sitemap.xml, robots.txt en de deelvoorbeelden (og:url).
// Verandert het domein, pas dan ook static/CNAME aan.
export const SITE_DOMEIN = "https://art-quake.com";

// Pagina's die niet in zoekmachines horen (alleen voor de crew)
export const nietIndexeren = ["/login", "/dashboard", "/reserveren", "/styleguide"];
