// Hoofdnavigatie: gebruikt door het hamburgermenu en de footer.
// Reserveren staat hier niet in: dat is alleen voor de crew en verschijnt in het
// menu (boven Dashboard) zodra je bent ingelogd, zie HamburgerMenu.svelte.
export const navigatie = [
	{ label: "Home", href: "/", info: "JONG TALENT LAAT ZICH ZIEN EN HOREN", foto: "dans" },
	{ label: "Wat we doen", href: "/#services", info: "PODIUM · WORKSHOPS · COACHING", foto: "teken" },
	{ label: "Agenda", href: "/#agenda", info: "OPTREDENS · EXPOSITIES · EVENTS", foto: "zingen" },
	{ label: "Het pand", href: "/#pand", info: "HOOR HET VAN DEWI ZELF", foto: "pand" },
	{ label: "Artiesten", href: "/artiesten", info: "JONG TALENT · MAKERS VAN NU", foto: "optreden" },
	{ label: "Contact", href: "/#doe-mee", info: "VRAAG HET GEWOON. SERIEUS.", foto: "schrijf" },
	{ label: "Login", href: "/login", info: "VOOR CREW EN BEHEERDERS", foto: "zing" },
];

// De crewpagina's laden helemaal opnieuw (data-sveltekit-reload), zodat het
// Plausible-script van de openbare pagina's daar niet meedraait (zie app.html).
export const crewPaginas = ["/login", "/reserveren", "/dashboard"];
