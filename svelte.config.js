import adapter from '@sveltejs/adapter-static';

// Twee plekken voor dezelfde site:
// - npm run build         -> build/         voor jamievos991.github.io/artquake-website
// - npm run build:vimexx  -> build-vimexx/  voor art-quake.com (hosting bij Vimexx)
const eigenDomein = process.env.ARTQUAKE_DOMEIN === 'eigen';

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
			pages: eigenDomein ? 'build-vimexx' : 'build',
			assets: eigenDomein ? 'build-vimexx' : 'build',
			fallback: '404.html'
		}),
		prerender: {
			// De pagina's van activiteiten (/agenda/[id]) worden bij het bouwen uit
			// Firestore gehaald. Lukt dat even niet, dan niet de hele build laten
			// mislukken: die pagina's werken dan via 404.html (zie agenda/[id]/+page.js).
			handleUnseenRoutes: 'ignore'
		},
		paths: {
			// op art-quake.com staat de site in de hoofdmap, op GitHub Pages onder
			// /artquake-website (lokaal altijd zonder pad)
			base: process.env.NODE_ENV === 'production' && !eigenDomein ? '/artquake-website' : ''
		}
	}
};

export default config;
