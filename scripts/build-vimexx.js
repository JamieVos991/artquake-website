// Bouwt de site voor art-quake.com (hosting bij Vimexx) in build-vimexx/.
// Upload daarna de inhoud van die map naar public_html (zie README).
import { spawnSync } from "node:child_process";
import { copyFileSync } from "node:fs";

const uit = spawnSync("vite", ["build"], {
	stdio: "inherit",
	shell: true,
	env: { ...process.env, ARTQUAKE_DOMEIN: "eigen" },
});
if (uit.status !== 0) process.exit(uit.status ?? 1);

// Apache-instellingen: nette adressen zonder .html, 404-pagina en https
copyFileSync("scripts/vimexx.htaccess", "build-vimexx/.htaccess");
console.log("\nKlaar: upload de inhoud van build-vimexx/ naar public_html.");
