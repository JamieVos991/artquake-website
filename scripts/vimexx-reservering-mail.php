<?php
// Reserveringsmails van art-quake.com (verificatiecode, bevestigd, gewijzigd,
// verwijderd), verstuurd door de mailserver van Vimexx.
// Wordt door npm run build als reservering-mail.php in build-vimexx/
// gezet; de templates uit email-templates/ worden er dan ingeplakt (zie
// scripts/build-vimexx.js, daar staat __TEMPLATES__ voor vervangen).
//
// Alleen ingelogde crew mag mail laten versturen: de site stuurt het
// Firebase-inlogbewijs (ID-token) mee, en dit script vraagt aan Firestore of dat bewijs
// geldig is en bij een beheerder hoort. Zo kan niemand anders de server
// gebruiken om mail te sturen.

const FIREBASE_PROJECT = 'artquake-6fceb';
const AFZENDER = 'info@art-quake.com';
const MAX_PER_KWARTIER = 40; // per crewlid, tegen per ongeluk eindeloos versturen

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function antwoord(int $status, bool $gelukt, string $melding = ''): void {
	http_response_code($status);
	echo json_encode(['success' => $gelukt, 'message' => $melding]);
	exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') antwoord(405, false, 'Alleen POST');
$herkomst = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($herkomst !== '' && !preg_match('#^https://(www\.)?art-quake\.com$#', $herkomst)) {
	antwoord(403, false, 'Niet toegestaan');
}

$invoer = json_decode(file_get_contents('php://input'), true);
if (!is_array($invoer)) antwoord(400, false, 'Ongeldige invoer');

// ── inlogbewijs controleren ──
// staat in de invoer (niet in een Authorization-kop: die laat niet elke
// Apache-instelling door naar PHP)
$token = (string)($invoer['token'] ?? '');
if (!preg_match('/^[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+$/', $token)) {
	antwoord(401, false, 'Niet ingelogd');
}
// de uid uit het bewijs halen; of het echt is, beslist Firestore hieronder
$inhoud = json_decode(base64_decode(strtr(explode('.', $token)[1], '-_', '+/')), true);
$uid = is_array($inhoud) ? (string)($inhoud['user_id'] ?? $inhoud['sub'] ?? '') : '';
if (!preg_match('/^[A-Za-z0-9]{10,128}$/', $uid)) antwoord(401, false, 'Niet ingelogd');

// Al eerder goedgekeurd? Dan niet opnieuw vragen (scheelt tijd).
$cache = sys_get_temp_dir() . '/artquake-crew-' . hash('sha256', $token);
if (!is_file($cache) || filemtime($cache) < time() - 600) {
	$url = 'https://firestore.googleapis.com/v1/projects/' . FIREBASE_PROJECT
		. '/databases/(default)/documents/beheerders/' . rawurlencode($uid);
	$ch = curl_init($url);
	curl_setopt_array($ch, [
		CURLOPT_RETURNTRANSFER => true,
		CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token],
		CURLOPT_TIMEOUT => 8,
	]);
	curl_exec($ch);
	$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
	curl_close($ch);
	if ($status !== 200) antwoord(403, false, 'Geen toegang');
	@touch($cache);
}

// ── limiet per crewlid ──
$teller = sys_get_temp_dir() . '/artquake-resmail-' . md5($uid);
$tijden = array_filter(
	array_map('intval', @file($teller, FILE_IGNORE_NEW_LINES) ?: []),
	fn($t) => $t > time() - 15 * 60
);
if (count($tijden) >= MAX_PER_KWARTIER) antwoord(429, false, 'Te veel mails, probeer het later opnieuw');
$tijden[] = time();
@file_put_contents($teller, implode("\n", $tijden));

// ── invoer ──
$soort = (string)($invoer['soort'] ?? '');
$naam = trim(preg_replace('/[\r\n]+/', ' ', (string)($invoer['naam'] ?? '')));
$email = trim((string)($invoer['email'] ?? ''));
if (!in_array($soort, ['code', 'bevestigd', 'gewijzigd', 'verwijderd'], true)) antwoord(422, false, 'Onbekende soort');
if ($naam === '' || mb_strlen($naam) > 120) antwoord(422, false, 'Naam ontbreekt');
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $email)) antwoord(422, false, 'Ongeldig e-mailadres');

$waarden = ['naam' => $naam, 'email' => $email];
if ($soort === 'code') {
	$code = (string)($invoer['code'] ?? '');
	if (!preg_match('/^\d{6}$/', $code)) antwoord(422, false, 'Ongeldige code');
	$waarden['code'] = $code;
	$onderwerp = "Je verificatiecode: $code";
} else {
	$studio = (string)($invoer['studio'] ?? '');
	$datum = (string)($invoer['datum'] ?? '');
	$start = (string)($invoer['starttijd'] ?? '');
	$eind = (string)($invoer['eindtijd'] ?? '');
	if (!in_array($studio, ['Oefenruimte', 'Opnamestudio', 'Dansstudio', 'Atelier'], true)) antwoord(422, false, 'Onbekende ruimte');
	if (!preg_match('/^[\p{L}\d ,.]{6,60}$/u', $datum)) antwoord(422, false, 'Ongeldige datum');
	if (!preg_match('/^\d{2}:\d{2}$/', $start) || !preg_match('/^\d{2}:\d{2}$/', $eind)) antwoord(422, false, 'Ongeldige tijd');
	$waarden += ['studio' => $studio, 'datum' => $datum, 'starttijd' => $start, 'eindtijd' => $eind];
	// link om zelf te annuleren (pagina /annuleren); alleen bij bevestigd en
	// gewijzigd, en alleen met een geldig document-ID en annuleercode
	$id = (string)($invoer['id'] ?? '');
	$annuleerCode = (string)($invoer['annuleerCode'] ?? '');
	if (in_array($soort, ['bevestigd', 'gewijzigd'], true)
		&& preg_match('/^[A-Za-z0-9]{20}$/', $id) && preg_match('/^[a-f0-9]{32}$/', $annuleerCode)) {
		$waarden['annuleerlink'] = "https://art-quake.com/annuleren#$id.$annuleerCode";
	}
	// het bevestigingstemplate is gedeeld en krijgt kop en tekst als variabelen
	if ($soort === 'bevestigd') {
		$waarden += [
			'onderwerp' => 'Reservering bevestigd',
			'label' => 'GELUKT',
			'titel' => 'Reservering bevestigd.',
			'intro' => 'je reservering staat vast:',
		];
	}
	$onderwerp = [
		'bevestigd' => "Reservering bevestigd: $studio",
		'gewijzigd' => "Je reservering is gewijzigd: $studio",
		'verwijderd' => "Je reservering is verwijderd: $studio",
	][$soort];
}

// ── mail opbouwen ──
$TEMPLATES = __TEMPLATES__;
$html = $TEMPLATES[$soort];
// het annuleerstuk alleen tonen als er een link is
$html = isset($waarden['annuleerlink'])
	? str_replace(['<!--annuleren-->', '<!--/annuleren-->'], '', $html)
	: preg_replace('#<!--annuleren-->.*?<!--/annuleren-->#s', '', $html);
foreach ($waarden as $sleutel => $waarde) {
	$html = str_replace('{{' . $sleutel . '}}', htmlspecialchars($waarde, ENT_QUOTES, 'UTF-8'), $html);
}
$html = '<!doctype html><html lang="nl"><head><meta charset="utf-8"></head><body style="margin:0">' . $html . '</body></html>';

$koppen = implode("\r\n", [
	'From: Artquake <' . AFZENDER . '>',
	'Reply-To: ' . AFZENDER,
	'MIME-Version: 1.0',
	'Content-Type: text/html; charset=UTF-8',
	'Content-Transfer-Encoding: base64',
]);
$gelukt = mail(
	$email,
	'=?UTF-8?B?' . base64_encode($onderwerp) . '?=',
	chunk_split(base64_encode($html)),
	$koppen,
	'-f' . AFZENDER
);
if (!$gelukt) antwoord(500, false, 'Versturen mislukt');
antwoord(200, true);
