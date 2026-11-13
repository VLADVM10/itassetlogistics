#!/bin/sh
# Writes the mailbox password for the request form into /_private/config.php and checks that the
# SMTP server accepts it (log in only, no email is sent). The password is typed here, never shown,
# never passed on the command line and never stored anywhere else.
#
#   ssh -t itassetlogistics ~/itassetlogistics-app/set-smtp-password.sh
set -eu
APP=/var/www/ch8218ab46/www/itassetlogistics.com/_private
cd "$APP"

printf 'Пароль від скриньки %s (символи не відображаються): ' \
  "$(php -r '$c = require "config.php"; echo $c["smtp"]["username"];')"
stty -echo
read -r PW
stty echo
printf '\n'
[ -n "$PW" ] || { echo 'Порожній пароль, нічого не змінено.'; exit 1; }

cp -p config.php "config.php.bak-$(date +%Y%m%d-%H%M%S)"
PW="$PW" php -r '
  $f = "config.php";
  $s = file_get_contents($f);
  $s = preg_replace("/(\"password\"\s*=>\s*)\"[^\"]*\"/", "\${1}" . var_export(getenv("PW"), true), $s, 1, $n);
  if ($n !== 1) { fwrite(STDERR, "У config.php не знайдено рядок password.\n"); exit(1); }
  file_put_contents($f, $s);
'
unset PW
php -l config.php >/dev/null

php -r '
  require "vendor/autoload.php";
  $c = (require "config.php")["smtp"];
  $m = new PHPMailer\PHPMailer\PHPMailer(true);
  $m->isSMTP();
  $m->Host = $c["host"]; $m->Port = $c["port"]; $m->SMTPSecure = $c["secure"];
  $m->SMTPAuth = true; $m->Username = $c["username"]; $m->Password = $c["password"];
  try { $m->smtpConnect(); $m->smtpClose(); echo "Готово: пароль збережено, SMTP-сервер його прийняв.\n"; }
  catch (Throwable $e) { echo "Пароль збережено, але SMTP-сервер його не прийняв: ", $m->ErrorInfo, "\n"; exit(2); }
'
