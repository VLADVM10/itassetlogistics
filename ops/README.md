# Deploy: GitHub → Cityhost (pull model)

Every push to `main`, from a developer or from the admin, publishes the site in 1–3 minutes:

1. **GitHub Actions** (`.github/workflows/deploy.yml`): `npm ci` → `npm run check` (types, Zod
   content schemas, EN/UA structure, admin config) → `npm run build` → `scripts/verify-build.mjs`
   (14 pages + 404s, hreflang pairs, internal links). The checked release (`site/` = dist,
   `server/` = PHP handler) is force-pushed as one commit to the **`deploy`** branch. Any failed
   step publishes nothing.
2. **Cityhost cron** runs `~/itassetlogistics-app/pull-deploy.sh` (this folder) every minute.
   When `deploy` has a new commit it syncs `server/` → `_private/` (keeps `config.php`, `data/`,
   `logs/`, `vendor/`; runs `composer install` when `composer.lock` changes), syncs `site/` → the
   site folder with `--delete` (keeps `_private/` and `.well-known/`), fixes permissions and runs
   a smoke test (`/`, `/uk/`, `/contact/` → 200, `GET /api/request.php` → 405,
   `/_private/config.php` → 403).

Why pull: Cityhost lets SSH in only from listed IP addresses, so GitHub runners cannot connect.
The server pulls instead, and no hosting credentials are stored in GitHub. The script refuses any
target other than `~/www/itassetlogistics.com` (about 18 other sites live on the account).

## On the server

```
~/itassetlogistics-app/
  pull-deploy.sh      copy of ops/pull-deploy.sh (700)
  release/            checkout of the deploy branch
  .deployed           last published deploy commit
  deploy.log          one line per step; FAILED lines name the reason
  .tools/composer.phar
```

Cron line (Cityhost panel → CRON, or `crontab -e`):

```
* * * * * $HOME/itassetlogistics-app/pull-deploy.sh >/dev/null 2>&1
```

Manual run: `~/itassetlogistics-app/pull-deploy.sh`; force a re-deploy of the same release:
`rm ~/itassetlogistics-app/.deployed`.

If the repository becomes private, give the server a read-only deploy key (GitHub → Settings →
Deploy keys) and change `REPO_URL` to `git@github.com:VLADVM10/itassetlogistics.git`.

## Request form: mailbox password

`/_private/config.php` sends requests to `info@itassetlogistics.com` through
`mx1.cityhost.com.ua:465` (SSL) as that mailbox. Only the password is secret. To set or change it
(typed into the terminal, not shown; the script then logs in to SMTP without sending anything):

```
ssh -t itassetlogistics ~/itassetlogistics-app/set-smtp-password.sh
```

The script is `ops/set-smtp-password.sh`; copy it to `~/itassetlogistics-app/` if it is missing.
Each run keeps a backup `config.php.bak-<date>` next to config.php.

## Request form: Turnstile secret

The site key is public and lives in `src/lib/env.ts`; the secret key of the same widget goes only
into config.php. After the site key is live, run (the script checks the key with Cloudflare first,
then also limits tokens to itassetlogistics.com / www):

```
ssh -t itassetlogistics ~/itassetlogistics-app/set-turnstile-secret.sh
```

If the secret was ever shown anywhere else (chat, email), rotate it first: Cloudflare → Turnstile →
the widget → Settings → **Rotate Secret Key**.

## Google Analytics 4

Off until `GA_MEASUREMENT_ID` in `src/lib/env.ts` holds the measurement ID (`G-…`). Then every page
gets a consent banner (texts: admin → settings → «Банер згоди на cookie»), GA loads only after
«Accept», the footer gets «Cookie settings», and the CSP allows the Google hosts. A successful
request form sends the GA event `generate_lead` (mark it as a key event in GA → Admin → Events).
When switching it on, update section 7 of the Privacy Policy (both languages).

## Admin sign-in (GitHub OAuth)

The admin's "Sign in with GitHub" goes through the `sveltia-cms-auth` Worker
(<https://github.com/sveltia/sveltia-cms-auth>, unchanged code) on the Cloudflare account
skladovka.ua: <https://sveltia-cms-auth.skladovka-ua.workers.dev> (`AUTH_URL` in
`scripts/cms/build-config.mjs`). Worker variables: `ALLOWED_DOMAINS = itassetlogistics.com`
(in its `wrangler.toml`), secrets `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` from the GitHub
OAuth App whose callback URL is the Worker URL + `/callback`. To change a secret:
`npx wrangler secret put GITHUB_CLIENT_SECRET` in a checkout of that repository. Editors need
write access to this repository (Settings → Collaborators).

## Rollback

Revert the bad commit on `main` (GitHub → commit → Revert, or `git revert`); the workflow builds
the previous state and the server picks it up. The SQLite journal and `config.php` are never
touched by a deploy.

## Test a release without git

```
RELEASE_DIR=/path/to/release SITE_DIR=$HOME/itassetlogistics-app/_testsite ./pull-deploy.sh
```
