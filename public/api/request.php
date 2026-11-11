<?php
/*
 * Request form endpoint: POST /api/request.php (spec section 9).
 * The code, config.php with the secrets, the SQLite journal and the logs live in /_private/
 * next to the site files: Cityhost's open_basedir keeps PHP inside the site folder, so they
 * cannot sit outside it. /_private/.htaccess denies every web request to that folder.
 * See server/README.md. ITAL_APP_DIR overrides the path for local tests.
 */
declare(strict_types=1);

ini_set('display_errors', '0');

const ITAL_ENTRY = true;

$appDir = getenv('ITAL_APP_DIR') ?: dirname(__DIR__) . '/_private';

if (!is_file($appDir . '/src/run.php')) {
    error_log('request.php: app folder not found');
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo '{"ok":false}';
    exit;
}

require $appDir . '/src/run.php';
