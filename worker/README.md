# Mail-API (Cloudflare Worker)

Verstuurt het contactformulier en de reserveringsmails via Resend. De site roept deze
Worker aan op het adres `MAIL_API` in `src/lib/data/site.js`. De mailteksten staan in
`email-templates/` en worden bij het live zetten meegebundeld.

## Live zetten

Vanuit deze map, na een wijziging hier of in `email-templates/`:

```sh
npx wrangler login
npx wrangler deploy
```

De eerste keer ook de geheime sleutels instellen (je plakt ze zelf in de terminal):

```sh
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put TURNSTILE_SECRET
```

## Testen

Lokaal draaien kan met `npx wrangler dev --var RESEND_API_KEY:nep`: de controles werken dan,
alleen het echte versturen mislukt.
