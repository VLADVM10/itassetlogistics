<?php
/*
 * Wires the request handler: error logging outside the web root, config, autoload.
 * Included from public/api/request.php.
 */
declare(strict_types=1);

namespace ItAssetLogistics;

// Runs only through public/api/request.php, never when this file itself is requested.
if (!defined('ITAL_ENTRY')) {
    http_response_code(404);
    exit;
}

$appDir = dirname(__DIR__);

ini_set('display_errors', '0');
ini_set('log_errors', '1');
if (!is_dir($appDir . '/logs')) {
    @mkdir($appDir . '/logs', 0700, true);
}
ini_set('error_log', $appDir . '/logs/php-error.log');

try {
    require $appDir . '/vendor/autoload.php';
    $config = require $appDir . '/config.php';
    (new RequestHandler($config, $appDir))->handle();
} catch (\Throwable $e) {
    error_log('request handler: ' . $e::class . ': ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
    }
    echo '{"ok":false}';
}
