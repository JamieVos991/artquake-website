// Het domein, zonder slash aan het eind. Wordt gebruikt voor sitemap.xml,
// robots.txt en de deelvoorbeelden (og:url).
export const SITE_DOMEIN = "https://art-quake.com";

// De Cloudflare Worker die de mail verstuurt (zie worker/README.md)
export const MAIL_API = "https://artquake-mail.artquake.workers.dev";

// Pagina's die niet in zoekmachines horen (alleen voor de crew)
export const nietIndexeren = ["/login", "/dashboard", "/reserveren", "/annuleren", "/styleguide"];
