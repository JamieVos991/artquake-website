export const diensten = [
	{
		slug: "talent-night",
		id: "01",
		title: "TALENT\nNIGHT",
		heading: "Talent Night",
		// video: src/lib/assets/videos/diensten/<slug>.mp4 (geen bestand = geen video)
		videoLabel: "AFTERMOVIE",
		videoNaast: true,
		// de eerste seconden zijn zwart: de video begint hier (in seconden)
		videoStart: 4,
		// recap van de laatste editie, boven de aftermovie:
		// videos/actueel/<bestand>.mp4 met poster fotos/actueel/<bestand>.webp
		recap: {
			bestand: "talent-night-10-oktober-2026",
			label: "LAATSTE EDITIE",
			titel: "Talent Night 10 oktober 2026",
			// staand, zoals een Instagram-reel
			verhouding: "9 / 16",
		},
		// verhouding = breedte / hoogte van de uitsnede in de galerij
		galerij: [
			{ foto: "band-op-het-podium", titel: "Podiumbeeld", verhouding: "4 / 3" },
			{ foto: "gitariste-lieke", titel: "Gitariste Lieke", verhouding: "3 / 4" },
			{ foto: "feest-in-de-zaal", titel: "Publiek", verhouding: "4 / 5" },
			{ foto: "singer-songwriter", titel: "Singer/Songwriter Emily", verhouding: "4 / 5" },
			{ foto: "band-unbound", titel: "Band Unbound", verhouding: "4 / 3" },
			{ foto: "theater", titel: "Muziektheater Woordenschatjes", verhouding: "3 / 4" },
			{ foto: "zingend-publiek", titel: "Sfeer", verhouding: "1 / 1" },
			{ foto: "dansduo", titel: "Dans", verhouding: "4 / 5" },
			{ foto: "de-kevers", titel: "De Kevers", verhouding: "9 / 10" },
		],
		bg: "purple",
		big: true,
		intro: "Het podium voor opkomend talent",
		// metaBeschrijving: de tekst die Google onder de link laat zien
		metaBeschrijving:
			"Talent Night: 5 keer per jaar in poppodium B3 in Sint Pancras. Jonge artiesten op één podium voor publiek, vrienden en scouts. Dé uitgaansavond voor jongeren.",
		// een lege regel (\n\n) begint een nieuwe alinea
		text: "5 Keer per jaar Talent Night in poppodium B3 in Sint Pancras. Op zo'n avond staan meerdere artiesten kort achter elkaar op hetzelfde podium, voor een zaal vol publiek, vrienden, familie en scouts. Het is dé plek om ervaring op te doen, uitgedaagd en gezien te worden!\n\nTegelijkertijd is Talent Night dé uitgaansavond voor en door jongeren uit Dijk & Waard en omgeving. Voor liefhebbers van live-muziek, dansen en feesten!",
	},
	{
		slug: "exposities",
		id: "02",
		title: "EXPO\nSITIES",
		heading: "Exposities",
		// videoNaast: de video staat kleiner, rechts naast de tekst
		videoNaast: true,
		// foto's in src/lib/assets/fotos/diensten/exposities
		galerij: [
			{ foto: "publiek-bij-de-opening", titel: "Publiek bij de opening", verhouding: "5 / 4" },
			{ foto: "de-exposerende-makers", titel: "De exposerende makers", verhouding: "5 / 4" },
			{ foto: "bezoekers-bij-schilderijen", titel: "Bezoekers bij de schilderijen", verhouding: "5 / 4" },
			{ foto: "opening", titel: "Opening", verhouding: "5 / 4" },
			{ foto: "kunstmarkt", titel: "Kunstmarkt", verhouding: "1 / 1" },
			{ foto: "uitleg-bij-eigen-werk", titel: "Uitleg bij eigen werk", verhouding: "4 / 5" },
			{ foto: "kunstenares-bij-haar-werk", titel: "Kunstenares bij haar werk", verhouding: "1 / 1" },
			{ foto: "live-muziek-tussen-het-werk", titel: "Live muziek tussen het werk", verhouding: "1 / 1" },
			{ foto: "de-expositiegang", titel: "De expositiegang", verhouding: "4 / 5" },
			{ foto: "expositie-op-straat", titel: "Expositie op straat", verhouding: "1 / 1" },
		],
		bg: "cream",
		intro: "Visuele kunst in de hoofdrol",
		metaBeschrijving:
			"Exposities van Artquake: jonge makers laten hun schilderijen, fotografie, keramiek en meer zien aan publiek. Wij regelen de locatie, opbouw en promotie.",
		text: "Bij Artquake Visuele kunst draait het om kunst maken, samen ons werk laten zien op markten of exposities, en leren praten over je werk in een fijne omgeving.\n\nHet is een plek waar je jouw talent voor schilderen, fotografie, tekenen, textiel, keramiek en schrijven kunt ontdekken, samen met andere jonge kunstliefhebbers.\n\nVan schilderijen tot fotografie en installaties: op onze exposities laat je je werk zien aan een publiek dat er speciaal voor komt. Wij regelen de locatie, de opbouw en de promotie, zodat jij je kunt richten op je werk.",
	},
	{
		slug: "jam-sessies",
		id: "03",
		title: "JAM\nSESSIES",
		heading: "Jamsessies",
		videoNaast: true,
		// foto's in src/lib/assets/fotos/diensten/jam-sessies
		galerij: [
			{ foto: "samen-op-het-podium", titel: "Samen op het podium", verhouding: "5 / 4" },
			{ foto: "gitaar-en-drums", titel: "Gitaar en drums", verhouding: "5 / 4" },
			{ foto: "keys-en-zang", titel: "Keys en zang", verhouding: "5 / 4" },
			{ foto: "zang-en-saxofoon", titel: "Zang en saxofoon", verhouding: "5 / 4" },
			{ foto: "gitarist", titel: "Gitarist", verhouding: "1 / 1" },
			{ foto: "zang-en-gitaar", titel: "Zang en gitaar", verhouding: "4 / 5" },
			{ foto: "zang-en-keys", titel: "Zang en keys", verhouding: "1 / 1" },
			{ foto: "elektrische-gitaar", titel: "Elektrische gitaar", verhouding: "1 / 1" },
			{ foto: "akoestische-gitaar", titel: "Akoestische gitaar", verhouding: "4 / 5" },
			{ foto: "zangeres", titel: "Zangeres", verhouding: "1 / 1" },
		],
		bg: "cream",
		outline: true,
		intro: "Samen muziek maken, zonder script",
		metaBeschrijving:
			"Jamsessies bij Artquake in Heerhugowaard: geen setlist, geen druk. Muzikanten van elk niveau spelen samen, experimenteren en ontmoeten elkaar.",
		text: "Geen setlist, geen druk. Gewoon instappen en meespelen. Op onze jamsessies komen muzikanten van verschillende niveaus en genres samen om te experimenteren en elkaar te ontmoeten.\n\nOf je nu voor het eerst met anderen speelt of al jaren op het podium staat: iedereen is welkom. Neem je instrument mee, of kom luisteren en ontdek met wie het klikt.\n\nUit een jam kan zomaar iets nieuws ontstaan: een band, een samenwerking of gewoon een goede avond.",
	},
	{
		slug: "foto-shoots",
		id: "04",
		title: "FOTO\nSHOOTS",
		heading: "Fotoshoots",
		// fotoshoots gaan op afspraak, dus geen verwijzing naar de agenda
		geenAgenda: true,
		// foto's in src/lib/assets/fotos/diensten/foto-shoots
		galerij: [
			{ foto: "fotografe-corine-de-ruiter", titel: "Fotografe Corine de Ruiter", verhouding: "1 / 1" },
			{ foto: "fiene-schellevis", titel: "Fiene Schellevis", verhouding: "2 / 3" },
			{ foto: "mayra-smilda", titel: "Mayra Smilda", verhouding: "9 / 16" },
			{ foto: "britt-visser-paarse-stof", titel: "Britt Visser", verhouding: "2 / 3" },
			{ foto: "britt-visser-rode-stof", titel: "Britt Visser", verhouding: "3 / 4" },
			{ foto: "fotograaf-thomas-smit", titel: "Fotograaf Thomas Smit", verhouding: "2 / 3" },
			{ foto: "fotoshoot-red-velvet", titel: "Fotoshoot Red Velvet", verhouding: "16 / 9" },
			{ foto: "fotoshoot-julie-veerman", titel: "Fotoshoot Julie Veerman", verhouding: "16 / 9" },
			{ foto: "luminosity", titel: "Luminosity", verhouding: "3 / 2" },
			{ foto: "red-velvet", titel: "Red Velvet", verhouding: "3 / 2" },
			{ foto: "julie-veerman", titel: "Julie Veerman", verhouding: "2 / 3" },
			{ foto: "keuzestress", titel: "Keuzestress", verhouding: "3 / 2" },
			{ foto: "lisa-feenstra", titel: "Lisa Feenstra", verhouding: "2 / 3" },
			{ foto: "jens-dijkstra", titel: "Jens Dijkstra", verhouding: "2 / 3" },
			{ foto: "lara-zangeres-van-extra", titel: "Lara, zangeres van de band Extra", verhouding: "3 / 2" },
		],
		videoNaast: true,
		bg: "purple",
		wide: true,
		intro: "Beeld waarmee je jezelf laat zien",
		metaBeschrijving:
			"Fotoshoots in de eigen fotostudio van Artquake: samen met een fotograaf maak je beeld voor je social media, profiel of affiche, dat je direct kunt gebruiken.",
		text: "Goede foto's zijn onmisbaar voor een artiest: voor social media, je profiel of een affiche. Tijdens onze fotoshoots werk je samen met een fotograaf aan beeld dat past bij wie je bent en waar je naartoe wilt.\n\nIn het Artquake pand hebben we een eigen fotostudio. Samen bedenk je de stijl, en je gaat naar huis met foto's die je direct kunt gebruiken.",
	},
	{
		slug: "workshops-en-masterclasses",
		id: "05",
		title: "WORKSHOPS\nEN MASTERCLASSES",
		heading: "Workshops & Masterclasses",
		videoNaast: true,
		// foto's in src/lib/assets/fotos/diensten/workshops-en-masterclasses
		galerij: [
			{ foto: "collage", titel: "Collage", verhouding: "7 / 5" },
			{ foto: "moderne-dans", titel: "Moderne dans", verhouding: "7 / 5" },
			{ foto: "maak-je-eigen-tas-aan-de-naaimachines", titel: "Maak je eigen tas", verhouding: "7 / 5" },
			{ foto: "looping", titel: "Looping", verhouding: "7 / 5" },
			{ foto: "maak-je-eigen-tas-samen-naaien", titel: "Maak je eigen tas", verhouding: "7 / 5" },
			{ foto: "songwriting", titel: "Songwriting", verhouding: "1 / 1" },
			{ foto: "hoe-richt-je-een-expositie-in", titel: "Hoe richt je een expositie in", verhouding: "4 / 3" },
			{ foto: "ecoline-met-de-klas", titel: "Ecoline met de klas", verhouding: "1 / 1" },
			{ foto: "muziekproductie", titel: "Muziekproductie", verhouding: "4 / 3" },
			{ foto: "paspoppen-beschilderen", titel: "Paspoppen beschilderen", verhouding: "1 / 1" },
			{ foto: "maak-je-eigen-schilderij", titel: "Maak je eigen schilderij", verhouding: "4 / 3" },
			{ foto: "maak-je-eigen-kleding", titel: "Maak je eigen kleding", verhouding: "1 / 1" },
			{ foto: "schilderen-met-de-klas", titel: "Schilderen met de klas", verhouding: "4 / 3" },
		],
		bg: "orange",
		wide: true,
		long: true,
		intro: "Leren van professionals uit het vak",
		metaBeschrijving:
			"Workshops en masterclasses bij Artquake: ervaren professionals delen hun kennis over muziek, kunst en performance. Je gaat naar huis met concrete handvatten.",
		text: "In onze workshops en masterclasses delen ervaren professionals hun kennis op het gebied van muziek, kunst, performance en meer.\n\nIn een workshop ga je zelf aan de slag. In een masterclass kijk je mee met iemand die er zijn of haar vak van heeft gemaakt. Van techniek tot presentatie: je gaat naar huis met concrete handvatten om verder te groeien.",
	},
	{
		slug: "coaching",
		id: "06",
		title: "COACHING",
		heading: "Coaching",
		// foto's in src/lib/assets/fotos/diensten/coaching
		galerij: [
			{ foto: "samen-spelen-iron-dragons", titel: "Samen spelen, Iron Dragons", verhouding: "16 / 9" },
			{ foto: "coaching-van-emre", titel: "Coaching van Emre", verhouding: "16 / 9" },
			{ foto: "gitarist-iron-dragons", titel: "Gitarist, Iron Dragons", verhouding: "9 / 16" },
			{ foto: "eindpresentatie-iron-dragons", titel: "Eindpresentatie Iron Dragons", verhouding: "3 / 2" },
			{ foto: "zangeressen-iron-dragons", titel: "Zangeressen, Iron Dragons", verhouding: "3 / 2" },
			{ foto: "gitaristen-iron-dragons", titel: "Gitaristen, Iron Dragons", verhouding: "2 / 3" },
			{ foto: "solo", titel: "Solo", verhouding: "2 / 3" },
			{ foto: "trots", titel: "Trots", verhouding: "2 / 3" },
			{ foto: "coaching-van-rose-marin", titel: "Coaching van Rose Marin", verhouding: "5 / 4" },
			{ foto: "coaching-door-kiki-balje", titel: "Coaching door Kiki Balje", verhouding: "5 / 4" },
		],
		videoNaast: true,
		bg: "cream",
		// coaching gaat in overleg, dus geen verwijzing naar de agenda
		geenAgenda: true,
		intro: "Begeleiding op maat, voor makers, bands en dansgroepen",
		metaBeschrijving:
			"Coaching bij Artquake: persoonlijke begeleiding voor jonge makers, bands en dansgroepen. Van artistieke ontwikkeling tot zelfvertrouwen op het podium.",
		text: "Iedere maker heeft andere doelen en andere twijfels. Wij helpen je om je eigen pad te vinden, of dat nu gaat over artistieke ontwikkeling, zelfvertrouwen op het podium of het uitstippelen van de volgende stap.\n\nDat kan in een persoonlijk traject, maar ook samen: we coachen bands en dansgroepen. Van samen leren repeteren en een set opbouwen tot staan als één geheel op het podium.\n\nJe hoeft daarvoor niet al ver te zijn. Zo begeleidt onder andere Emre ook bands die nog helemaal aan het begin staan (zie het filmpje).\n\nJe werkt samen met een coach uit onze crew. Samen kijk je waar je nu staat, waar je naartoe wilt en wat daarvoor nodig is.",
	},
	{
		slug: "in-opdracht",
		id: "07",
		title: "IN\nOPDRACHT",
		heading: "In opdracht",
		videoNaast: true,
		// foto's in src/lib/assets/fotos/diensten/in-opdracht
		galerij: [
			{ foto: "bevrijdingsfestival-dijk-en-waard", titel: "Bevrijdingsfestival Dijk & Waard", verhouding: "3 / 2" },
			{ foto: "t-kruis-bruist", titel: "'t Kruis Bruist", verhouding: "4 / 5" },
			{ foto: "cultuurmakersfestival", titel: "Cultuurmakersfestival", verhouding: "3 / 2" },
			{ foto: "promotie-winkelcentrum", titel: "Promotie winkelcentrum", verhouding: "7 / 5" },
			{ foto: "streekmarkt-danseres", titel: "Streekmarkt 2024", verhouding: "1 / 1" },
			{ foto: "opening-expositie", titel: "Opening expositie", verhouding: "7 / 5" },
			{ foto: "rotary-club", titel: "Rotary Club", verhouding: "5 / 4" },
			{ foto: "opening-expositie-artfarm", titel: "Opening expositie Artfarm", verhouding: "2 / 3" },
			{ foto: "bevrijdingsdag-alkmaar", titel: "Bevrijdingsdag Alkmaar", verhouding: "7 / 5" },
			{ foto: "streetpaintingfestival-stoepschilderen", titel: "Streetpaintingfestival", verhouding: "3 / 2" },
			{ foto: "gat-in-de-dijk-zangeres-met-gitaar", titel: "Gat in de Dijk Festival", verhouding: "4 / 3" },
			{ foto: "prachtkerst-alkmaar", titel: "Prachtkerst Alkmaar", verhouding: "4 / 3" },
			{ foto: "streekmarkt-duo-gitaar-en-zang", titel: "Streekmarkt 2023", verhouding: "4 / 5" },
			{ foto: "cultuur-op-de-planken", titel: "Cultuur op de Planken", verhouding: "3 / 2" },
			{ foto: "promotie-middenwaard", titel: "Promotie Middenwaard", verhouding: "3 / 2" },
			{ foto: "wonderlicht-zaanstad", titel: "Wonderlicht Zaanstad", verhouding: "7 / 5" },
			{ foto: "gat-in-de-dijk-gitariste-bij-de-koeien", titel: "Gat in de Dijk Festival", verhouding: "4 / 3" },
			{ foto: "streekmarkt-zangeres-bij-zonnebloemen", titel: "Streekmarkt 2022", verhouding: "3 / 2" },
			{ foto: "promotie-dijkwachtershuis", titel: "Promotie Dijkwachtershuis", verhouding: "7 / 5" },
			{ foto: "streetpaintingfestival-zang-en-keys", titel: "Streetpaintingfestival", verhouding: "3 / 2" },
		],
		bg: "purple",
		// opdrachten gaan in overleg, dus geen verwijzing naar de agenda
		geenAgenda: true,
		intro: "Onze makers voor jouw bedrijf, organisatie of event",
		metaBeschrijving:
			"Boek jonge makers van Artquake voor je bedrijf, school of event: optredens, workshops, visuele kunst of een creatieve invulling op maat.",
		text: "Bedrijven, scholen, gemeenten en organisatoren van events kunnen bij Artquake terecht voor optredens, workshops, visuele kunst of een creatieve invulling op maat.\n\nZo krijgen onze makers betaalde opdrachten en een breder podium, en krijg jij als opdrachtgever een uniek en verzorgd resultaat.\n\nVertel ons wat je zoekt, dan denken we mee over wie of wat daarbij past.",
	},
	{
		slug: "oefenruimtes-studios-atelier-en-zaal",
		id: "08",
		title: "OEFENRUIMTES\nSTUDIO'S\nATELIER EN ZAAL",
		heading: "Hoor het van Dewi zelf!",
		bg: "dark",
		outline: true,
		full: true,
		pand: true,
		intro: "Dewi leidt je rond door het Artquake pand 🩷",
	},
];

export function vindDienst(slug) {
	return diensten.find((d) => d.slug === slug);
}
