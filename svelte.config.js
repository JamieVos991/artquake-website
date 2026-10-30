import adapter from '@sveltejs/adapter-static';

// npm run build bouwt de site voor art-quake.com (GitHub Pages) in build/,
// zie .github/workflows/deploy.yml.

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// runes-modus voor het hele project (niet voor libraries in node_modules)
		runes: ({ filename }) =>
			filename.split(/[/\\]/).includes('node_modules') ? undefined : true
	},
	kit: {
		// statische site; onbekende pagina's krijgen 404.html (dat pikt GitHub Pages zelf op)
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: '404.html'
		}),
		// CSS in de HTML zelf i.p.v. losse bestanden: de browser hoeft niet eerst
		// op die bestanden te wachten voordat hij iets laat zien (zie PERF.md)
		inlineStyleThreshold: Infinity,
		prerender: {
			// De pagina's van activiteiten (/agenda/[id]) worden bij het bouwen uit
			// Firestore gehaald. Lukt dat even niet, dan niet de hele build laten
			// mislukken: die pagina's werken dan via 404.html (zie agenda/[id]/+page.js).
			handleUnseenRoutes: 'ignore'
		}
	}
};

export default config;
