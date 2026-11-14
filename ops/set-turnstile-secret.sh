#!/bin/sh
# Writes the Cloudflare Turnstile secret key into /_private/config.php, limits tokens to the site's
# hostnames and asks Cloudflare whether the secret is valid (with a dummy token: nothing is sent
# from the form). The secret is typed here, never shown and never passed on the command line.
#
#   ssh -t itassetlogistics ~/itassetlogistics-app/set-turnstile-secret.sh
#
# Run it only after the site key of the same widget is live (TURNSTILE_SITE_KEY in src/lib/env.ts).
set -eu
APP=/var/www/ch8218ab46/www/itassetlogistics.com/_private
cd "$APP"
# the CLI default here is PHP 7.4; the site and its vendor/ need 8.1 (same as ops/pull-deploy.sh)
PHP=/opt/alt/php81/usr/bin/php

printf 'Secret Key віджета Turnstile (символи не відображаються): '
stty -echo
read -r SECRET
stty echo
printf '\n'
[ -n "$SECRET" ] || { echo 'Порожній ключ, нічого не змінено.'; exit 1; }

SECRET="$SECRET" $PHP -r '
  $r = json_decode((string) file_get_contents("https://challenges.cloudflare.com/turnstile/v0/siteverify", false,
    stream_context_create(["http" => ["method" => "POST", "timeout" => 15, "ignore_errors" => true,
      "header" => "Content-Type: application/x-www-form-urlencoded",
      "content" => http_build_query(["secret" => getenv("SECRET"), "response" => "dummy-token"])]])), true);
  $codes = $r["error-codes"] ?? [];
  if (in_array("invalid-input-secret", $codes, true)) { echo "Cloudflare не прийняв цей ключ. Нічого не змінено.\n"; exit(2); }
  if (!is_array($r)) { echo "Не вдалося зв’язатися з Cloudflare. Нічого не змінено.\n"; exit(3); }
'

cp -p config.php "config.php.bak-$(date +%Y%m%d-%H%M%S)"
SECRET="$SECRET" $PHP -r '
  $f = "config.php";
  $s = file_get_contents($f);
  $s = preg_replace("/(\"turnstile_secret\"\s*=>\s*)\"[^\"]*\"/", "\${1}" . var_export(getenv("SECRET"), true), $s, 1, $a);
  $s = preg_replace("/(\"turnstile_hostnames\"\s*=>\s*)\[[^\]]*\]/", "\${1}[\"itassetlogistics.com\", \"www.itassetlogistics.com\"]", $s, 1, $b);
  if ($a !== 1 || $b !== 1) { fwrite(STDERR, "У config.php не знайдено рядки turnstile_secret / turnstile_hostnames.\n"); exit(1); }
  file_put_contents($f, $s);
'
unset SECRET
$PHP -l config.php >/dev/null
echo 'Готово: ключ збережено, Cloudflare його прийняв. Форма тепер перевіряє справжню капчу.'
