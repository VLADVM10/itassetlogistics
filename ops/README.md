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

## Rollback

Revert the bad commit on `main` (GitHub → commit → Revert, or `git revert`); the workflow builds
the previous state and the server picks it up. The SQLite journal and `config.php` are never
touched by a deploy.

## Test a release without git

```
RELEASE_DIR=/path/to/release SITE_DIR=$HOME/itassetlogistics-app/_testsite ./pull-deploy.sh
```
