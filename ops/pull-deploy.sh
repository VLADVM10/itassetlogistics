#!/bin/bash
# Pull deploy for itassetlogistics.com (spec section 12; see ops/README.md).
# Runs from cron every minute on Cityhost. When the `deploy` branch (built and checked by
# .github/workflows/deploy.yml) has a new release, it updates the PHP handler in _private/
# and the static site, then runs a smoke test. Touches nothing outside the site folder and
# ~/itassetlogistics-app/.
#
# Test without git: RELEASE_DIR=/path/to/release SITE_DIR=/path/to/test-copy ./pull-deploy.sh
set -euo pipefail
umask 022

REPO_URL="https://github.com/VLADVM10/itassetlogistics.git"
APP="$HOME/itassetlogistics-app"
SITE="${SITE_DIR:-$HOME/www/itassetlogistics.com}"
SRC="${RELEASE_DIR:-$APP/release}"
PHP=/opt/alt/php81/usr/bin/php
COMPOSER="$APP/.tools/composer.phar"
DOMAIN="https://itassetlogistics.com"
LOG="$APP/deploy.log"

log() { printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$LOG"; }
fail() { log "FAILED: $*"; exit 1; }

# one run at a time
exec 9>"$APP/.deploy.lock"
flock -n 9 || exit 0

# the target must be one of this project's site folders, never another site on the account
case "$(realpath "$SITE")" in
  "$HOME/www/itassetlogistics.com" | "$APP"/_test*) ;;
  *) fail "refusing to deploy to $SITE" ;;
esac

# ---- fetch the release ----
if [ -z "${RELEASE_DIR:-}" ]; then
  if [ ! -d "$SRC/.git" ]; then
    git clone -q --depth 1 --branch deploy "$REPO_URL" "$SRC"
  fi
  git -C "$SRC" fetch -q --depth 1 origin deploy
  NEW="$(git -C "$SRC" rev-parse FETCH_HEAD)"
  CUR="$(cat "$APP/.deployed" 2>/dev/null || true)"
  [ "$NEW" = "$CUR" ] && exit 0
  git -C "$SRC" reset -q --hard FETCH_HEAD
  git -C "$SRC" clean -q -f -d
else
  NEW="manual:$(head -n1 "$SRC/RELEASE" 2>/dev/null || echo unknown)"
fi
SOURCE_SHA="$(head -n1 "$SRC/RELEASE" 2>/dev/null || echo unknown)"
log "release ${SOURCE_SHA:0:7} → $SITE"

# ---- sanity: never publish an incomplete release ----
for f in site/index.html site/404.html site/uk/index.html site/api/request.php site/admin/index.html \
         server/src/run.php server/.htaccess server/composer.lock; do
  [ -s "$SRC/$f" ] || fail "release has no $f"
done
for f in $(find "$SRC/server" -type f \( -iname '*.txt' -o -iname '*.htm*' -o -iname '*.css' -o -iname '*.js' \)); do
  fail "static-type file in server/ would be public: $f"
done

# ---- PHP handler → _private/ (config.php, data, logs and vendor stay) ----
mkdir -p "$SITE/_private"
chmod 700 "$SITE/_private"
rsync -a --delete --exclude /config.php --exclude /data/ --exclude /logs/ --exclude /vendor/ --exclude /.lock-installed \
  "$SRC/server/" "$SITE/_private/"
LOCK_HASH="$(sha256sum "$SITE/_private/composer.lock" | cut -d' ' -f1)"
if [ ! -d "$SITE/_private/vendor" ] || [ "$LOCK_HASH" != "$(cat "$SITE/_private/.lock-installed" 2>/dev/null || true)" ]; then
  (cd "$SITE/_private" && "$PHP" "$COMPOSER" install --no-dev --no-interaction --no-progress -q) || fail "composer install"
  echo "$LOCK_HASH" > "$SITE/_private/.lock-installed"
  log "composer install done"
fi
find "$SITE/_private" -type d -exec chmod 700 {} +
find "$SITE/_private" -type f -exec chmod 600 {} +
chmod 644 "$SITE/_private/.htaccess"

# ---- static site (the handler folder and ACME challenges are kept) ----
rsync -a --delete --exclude /_private/ --exclude /.well-known/ "$SRC/site/" "$SITE/"
find "$SITE" -path "$SITE/_private" -prune -o -type d -exec chmod 755 {} +
find "$SITE" -path "$SITE/_private" -prune -o -type f -exec chmod 644 {} +

# ---- smoke test (production folder only) ----
if [ "$(realpath "$SITE")" = "$HOME/www/itassetlogistics.com" ]; then
  code() { curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$@"; }
  for p in / /uk/ /contact/; do
    [ "$(code "$DOMAIN$p")" = 200 ] || fail "smoke: $p is not 200"
  done
  [ "$(code "$DOMAIN/api/request.php")" = 405 ] || fail "smoke: GET /api/request.php is not 405"
  [ "$(code "$DOMAIN/_private/config.php")" = 403 ] || fail "smoke: /_private/config.php is not 403"
fi

[ -z "${RELEASE_DIR:-}" ] && echo "$NEW" > "$APP/.deployed"
log "done ${SOURCE_SHA:0:7}"
