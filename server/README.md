# Request form handler

`POST /api/request.php` (spec section 9). The site's only PHP entry point is
`public/api/request.php`; everything in this folder is deployed to **`/_private/`** in the site
folder.

## Why `/_private/` and not outside the web root

Cityhost limits PHP with `open_basedir` to the site folder (`~/www/itassetlogistics.com/`), so
the code, config and journal cannot sit outside it. Instead the folder is closed twice:

1. **Permissions:** directories `700`, files `600` (PHP runs as the account user). nginx, which
   serves static files itself, cannot read them.
2. **`.htaccess`:** `Require all denied` for everything Apache handles.

Cityhost's nginx serves `.txt`, `.html`, `.css`, `.js` and images without looking at
`.htaccess`, so this folder must never contain such files.

## Layout on the server

```
~/www/itassetlogistics.com/
  api/request.php            public entry (from public/api/)
  _private/                  this folder — 700
    .htaccess                644
    config.php               600, secrets, created on the server only (template: config.example.php)
    src/  vendor/  composer.json  composer.lock
    data/requests.sqlite     journal (created on first request)
    logs/php-error.log       PHP errors (display_errors is off)
~/itassetlogistics-app/.tools/composer.phar
```

## Deploy

1. Upload `server/` (without `config.php`, `data/`, `logs/`) to `_private/`.
2. Install dependencies: `cd ~/www/itassetlogistics.com/_private && /opt/alt/php81/usr/bin/php ~/itassetlogistics-app/.tools/composer.phar install --no-dev`
3. Set permissions: `find _private -type d -exec chmod 700 {} +`, `find _private -type f -exec chmod 600 {} +`,
   `chmod 644 _private/.htaccess`.
4. Check: `/_private/config.php`, `/_private/composer.json`, `/_private/data/requests.sqlite` answer
   **403**; `GET /api/request.php` answers **405**.

The static deploy must never delete or overwrite `_private/` (exclude it from any `--delete`).

## config.php

See `config.example.php`. Fill in on the server: Turnstile secret and hostnames, recipient,
SMTP mailbox of the domain. `mail_transport: 'file'` saves emails to `data/outbox/` for tests only.

## Responses

| Status | When | Form shows |
| --- | --- | --- |
| 200 `{"ok":true}` | saved to the journal and accepted by SMTP | thanks |
| 422 `{"ok":false,"errors":{field:code}}` | field rules failed | field errors |
| 400 | no/invalid Turnstile token, honeypot filled, malformed body | failure |
| 403 / 405 / 413 | foreign Origin / not POST / body over 64 KB | failure |
| 429 | over 5 requests per IP in 10 minutes (`Retry-After`) | failure |
| 500 | mail not sent (the request stays in the journal as `failed`) or internal error | failure |

The IP is stored only as an HMAC hash and only for the rate limit window. Requests older
than `retention_months` (24) are deleted on each new request.
