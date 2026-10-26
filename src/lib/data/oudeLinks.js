// Adressen van de oude WordPress-site op art-quake.com en waar ze nu naartoe gaan.
// Zo komen oude links (Google, Instagram, posters met een QR-code) niet op een
// foutpagina uit.

// /contact/ -> /#doe-mee, enz.
export const oudePaginas = {
	agenda: "/#agenda",
	contact: "/#doe-mee",
	"over-ons": "/#crew",
	impressie: "/#pand",
};

// /artiesten/naam/ -> /artiesten#naam. Bijna altijd is het oude stukje gelijk aan
// het nieuwe; hier alleen de uitzonderingen.
export const oudeArtiestSlugs = {
	"the-border-2": "the-border",
	marenne: "marenne-de-boer",
};
