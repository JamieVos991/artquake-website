// Aantal makers: een artiest kan een band of duo zijn. In het dashboard vul je
// per artiest in uit hoeveel mensen die bestaat (leeg = 1). Het totaal op de site
// telt dus mensen, niet profielen; belangrijk voor o.a. de gemeente.
export function makersVan(artiest) {
	const n = Math.floor(Number(artiest.aantalMakers));
	return n >= 1 ? n : 1;
}

export function telMakers(artiesten) {
	return artiesten.reduce((totaal, a) => totaal + makersVan(a), 0);
}
