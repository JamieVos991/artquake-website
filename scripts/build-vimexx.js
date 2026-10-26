// Bouwt de site voor art-quake.com (hosting bij Vimexx) in build-vimexx/.
// Upload daarna de inhoud van die map naar public_html (zie README).
import { spawnSync } from "node:child_process";
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";

const uit = spawnSync(process.execPath, ["node_modules/vite/bin/vite.js", "build"], { stdio: "inherit" });
if (uit.status !== 0) process.exit(uit.status ?? 1);

// Apache-instellingen: nette adressen zonder .html, 404-pagina en https
copyFileSync("scripts/vimexx.htaccess", "build-vimexx/.htaccess");
// contactformulier: de server van Vimexx verstuurt de mail zelf
copyFileSync("scripts/vimexx-contact.php", "build-vimexx/contact.php");

// reserveringsmails: de templates uit email-templates/ in het PHP-bestand
// plakken (zonder de uitlegcommentaar bovenaan), zodat ze niet los op de
// server staan
const templates = {
	code: "verificatiecode.html",
	bevestigd: "bevestiging.html",
	gewijzigd: "gewijzigd.html",
	verwijderd: "verwijderd.html",
};
const phpArray =
	"[\n" +
	Object.entries(templates)
		.map(([soort, bestand]) => {
			const html = readFileSync(`email-templates/${bestand}`, "utf8").replace(/^\s*<!--[\s\S]*?-->\s*/, "").trim();
			if (/^\s*HTML\s*$/m.test(html)) throw new Error(`${bestand} bevat een regel "HTML"`);
			return `\t'${soort}' => <<<'HTML'\n${html}\nHTML,`;
		})
		.join("\n") +
	"\n]";
const php = readFileSync("scripts/vimexx-reservering-mail.php", "utf8");
if (!php.includes("__TEMPLATES__;")) throw new Error("__TEMPLATES__ niet gevonden in vimexx-reservering-mail.php");
writeFileSync("build-vimexx/reservering-mail.php", php.replace("__TEMPLATES__;", () => phpArray + ";"));

console.log("\nKlaar: upload de inhoud van build-vimexx/ naar public_html.");
