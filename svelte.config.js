import adapter from '@sveltejs/adapter-static';
import { SITE_PAD } from './src/lib/data/site.js';

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
			// het pad waarop de site staat; wisselen kan in src/lib/data/site.js
			// (lokaal altijd zonder pad)
			base: process.env.NODE_ENV === 'production' ? SITE_PAD : ''
		}
	}
};

export default config;
