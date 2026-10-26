<?php
// Contactformulier van art-quake.com: stuurt het bericht direct via de mailserver
// van Vimexx naar info@art-quake.com. Wordt door npm run build:vimexx als
// contact.php in build-vimexx/ gezet. (Op GitHub Pages werkt PHP niet; daar
// gebruikt de site FormSubmit.)

const ONTVANGER = 'info@art-quake.com';
const AFZENDER = 'info@art-quake.com'; // eigen domein, anders belandt het in spam
const MAX_PER_KWARTIER = 5; // per bezoeker (IP-adres), tegen spam

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function antwoord(int $status, bool $gelukt, string $melding = ''): void {
	http_response_code($status);
	echo json_encode(['success' => $gelukt, 'message' => $melding]);
	exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') antwoord(405, false, 'Alleen POST');

// alleen vanaf de eigen site
$herkomst = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($herkomst !== '' && !preg_match('#^https://(www\.)?art-quake\.com$#', $herkomst)) {
	antwoord(403, false, 'Niet toegestaan');
}

$invoer = json_decode(file_get_contents('php://input'), true);
if (!is_array($invoer)) antwoord(400, false, 'Ongeldige invoer');

// verborgen veld ingevuld: een bot. Doe alsof het gelukt is.
if (trim((string)($invoer['_honey'] ?? '')) !== '') antwoord(200, true);

$naam = trim((string)($invoer['naam'] ?? ''));
$email = trim((string)($invoer['email'] ?? ''));
$telefoon = trim((string)($invoer['telefoon'] ?? ''));
$bericht = trim((string)($invoer['bericht'] ?? ''));

// enters in naam en e-mail zouden extra mailkoppen kunnen toevoegen
$naam = preg_replace('/[\r\n]+/', ' ', $naam);
if ($naam === '' || mb_strlen($naam) > 120) antwoord(422, false, 'Vul je naam in');
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $email)) {
	antwoord(422, false, 'Vul een geldig e-mailadres in');
}
if ($bericht === '' || mb_strlen($bericht) > 5000) antwoord(422, false, 'Vul een bericht in');
// telefoon: alleen cijfers, spaties, + - ( ) en .
if (!preg_match('/^[0-9 +()\-.]{6,30}$/', $telefoon)) {
	antwoord(422, false, 'Vul een geldig telefoonnummer in');
}

// eenvoudige limiet per IP-adres, bijgehouden in de tijdelijke map van de server
$ip = $_SERVER['REMOTE_ADDR'] ?? 'onbekend';
$teller = sys_get_temp_dir() . '/artquake-contact-' . md5($ip);
$tijden = array_filter(
	array_map('intval', @file($teller, FILE_IGNORE_NEW_LINES) ?: []),
	fn($t) => $t > time() - 15 * 60
);
if (count($tijden) >= MAX_PER_KWARTIER) antwoord(429, false, 'Te veel berichten, probeer het later opnieuw');
$tijden[] = time();
@file_put_contents($teller, implode("\n", $tijden));

$onderwerp = '=?UTF-8?B?' . base64_encode("Nieuw bericht via art-quake.com van $naam") . '?=';
$tekst = "Naam: $naam\nE-mail: $email\nTelefoon: $telefoon\n\n$bericht\n\n--\nVerstuurd via het contactformulier op art-quake.com";
$koppen = implode("\r\n", [
	'From: Artquake website <' . AFZENDER . '>',
	'Reply-To: ' . $email, // op Beantwoorden klikken gaat naar de bezoeker
	'MIME-Version: 1.0',
	'Content-Type: text/plain; charset=UTF-8',
	'Content-Transfer-Encoding: 8bit',
]);

$gelukt = mail(ONTVANGER, $onderwerp, $tekst, $koppen, '-f' . AFZENDER);
if (!$gelukt) antwoord(500, false, 'Versturen mislukt');
antwoord(200, true);
