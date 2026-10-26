import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// runes-modus voor het hele project (niet voor libraries in node_modules)
		runes: ({ filename }) =>
			filename.split(/[/\\]/).includes('node_modules') ? undefined : true
	},
	kit: {
		// statische site voor GitHub Pages; onbekende pagina's krijgen 404.html
		adapter: adapter({
			fallback: '404.html'
		}),
		prerender: {
			// De pagina's van activiteiten (/agenda/[id]) worden bij het bouwen uit
			// Firestore gehaald. Lukt dat even niet, dan niet de hele build laten
			// mislukken: die pagina's werken dan via 404.html (zie agenda/[id]/+page.js).
			handleUnseenRoutes: 'ignore'
		},
		paths: {
			// de site staat in de hoofdmap van art-quake.com, dus geen pad ervoor
			// (zie ook src/lib/data/site.js en static/CNAME)
			base: ''
		}
	}
};

export default config;
