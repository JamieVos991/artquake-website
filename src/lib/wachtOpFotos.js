// Laadt foto's alvast in en is klaar zodra ze allemaal binnen zijn (of mislukt).
// Zo kan een skelet blijven staan tot de kaarten er compleet uitzien, in plaats
// van eerst lege fotovlakken te tonen. Bij een heel trage verbinding niet
// eindeloos wachten: na maxMs gaat het toch door.
export function wachtOpFotos(urls, maxMs = 8000) {
	const fotos = urls.filter(Boolean).map(
		(url) =>
			new Promise((klaar) => {
				const img = new Image();
				img.onload = img.onerror = () => klaar();
				img.src = url;
			})
	);
	const tijd = new Promise((klaar) => setTimeout(klaar, maxMs));
	return Promise.race([Promise.all(fotos), tijd]);
}
