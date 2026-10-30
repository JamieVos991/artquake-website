// Het domein, zonder slash aan het eind. Wordt gebruikt voor sitemap.xml,
// robots.txt en de deelvoorbeelden (og:url).
export const SITE_DOMEIN = "https://art-quake.com";

// De Cloudflare Worker die de mail verstuurt (zie worker/README.md)
export const MAIL_API = "https://artquake-mail.artquake.workers.dev";

// Openbare sleutel van Cloudflare Turnstile (spamcontrole op het contactformulier)
export const TURNSTILE_SITEKEY = "0x4AAAAAAFsmDTcyDRbogtOW";

// Pagina's die niet in zoekmachines horen (alleen voor de crew)
export const nietIndexeren = ["/login", "/dashboard", "/reserveren", "/annuleren", "/styleguide"];
