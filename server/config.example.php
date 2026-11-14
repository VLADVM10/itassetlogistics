<?php
/*
 * Copy to config.php in /_private/ on the server and fill in. config.php is never committed.
 * Secrets (Turnstile secret key, SMTP password) are entered on the server only.
 */
return [
    // The form is accepted only from these origins (spec section 9).
    'allowed_origins' => ['https://itassetlogistics.com', 'https://www.itassetlogistics.com'],

    // Cloudflare Turnstile secret key: the pair of TURNSTILE_SITE_KEY in src/lib/env.ts.
    'turnstile_secret' => '',
    // Tokens must be issued for these hostnames. Leave empty only with Cloudflare's test keys
    // (they report the hostname "example.com").
    'turnstile_hostnames' => ['itassetlogistics.com', 'www.itassetlogistics.com'],

    // Where requests are sent. Never taken from the form.
    'recipient' => '',

    // Domain mailbox the website sends from.
    'smtp' => [
        'host' => '',
        'port' => 465,
        'secure' => 'ssl',          // 'ssl' (port 465) or 'tls' (STARTTLS, port 587)
        'username' => '',
        'password' => '',
        'from' => '',               // usually the same as username
        'from_name' => 'IT Asset Logistics website',
    ],
    // 'smtp' in production. 'file' saves each email to data/outbox/ instead of sending: tests only.
    'mail_transport' => 'smtp',

    // Random string (e.g. `openssl rand -hex 32`); makes stored IP hashes useless elsewhere.
    'ip_salt' => '',
    // At most `max` requests from one IP per `window` seconds (spec: 5 per 10 minutes).
    'rate_limit' => ['max' => 5, 'window' => 600],
    // Requests older than this are deleted from the journal (spec section 9; client to confirm).
    'retention_months' => 24,
];
