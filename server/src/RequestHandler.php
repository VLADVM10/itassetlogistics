<?php
declare(strict_types=1);

namespace ItAssetLogistics;

/**
 * POST /api/request.php, in the order of spec section 9:
 * method, Origin, rate limit, honeypot → Turnstile → field validation → journal → email → 200.
 *
 * Responses: 200 {"ok":true} only when the request is saved and the email is accepted by SMTP;
 * 422 {"ok":false,"errors":{field:code}}; 400 anti-spam or malformed; 403 foreign origin;
 * 405 not POST; 413 too large; 429 rate limit; 500 internal (incl. mail failure).
 */
final class RequestHandler
{
    private const MAX_BODY = 65536;
    private const LANGS = ['en', 'uk'];
    private const PAGES = ['home', 'contact'];

    /** @param array<string, mixed> $config */
    public function __construct(private array $config, private string $appDir)
    {
    }

    public function handle(): void
    {
        header('Cache-Control: no-store');
        header('X-Content-Type-Options: nosniff');

        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
            header('Allow: POST');
            $this->respond(405);
        }

        $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
        if (!in_array($origin, (array) ($this->config['allowed_origins'] ?? []), true)) {
            $this->respond(403);
        }

        if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > self::MAX_BODY) {
            $this->respond(413);
        }

        $input = $this->readInput();
        if ($input === null) {
            $this->respond(400);
        }

        $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
        $store = new Store($this->appDir . '/data/requests.sqlite');
        $limit = (array) ($this->config['rate_limit'] ?? []);
        $window = (int) ($limit['window'] ?? 600);
        $ipHash = hash_hmac('sha256', $ip, (string) ($this->config['ip_salt'] ?? ''));
        if (!$store->hit($ipHash, time(), $window, (int) ($limit['max'] ?? 5))) {
            header('Retry-After: ' . $window);
            $this->respond(429);
        }

        // Honeypot: the hidden `website` field is empty for people.
        if (trim($this->str($input, 'website')) !== '') {
            $this->respond(400);
        }

        $lang = $this->str($input, 'lang');
        $page = $this->str($input, 'page');
        if (!in_array($lang, self::LANGS, true) || !in_array($page, self::PAGES, true)) {
            $this->respond(400);
        }

        $turnstile = new Turnstile(
            (string) ($this->config['turnstile_secret'] ?? ''),
            (array) ($this->config['turnstile_hostnames'] ?? []),
        );
        if (!$turnstile->verify($this->str($input, 'cf-turnstile-response'), $ip)) {
            $this->respond(400);
        }

        [$fields, $errors] = Validator::validate($input);
        if ($errors !== []) {
            $this->respond(422, ['errors' => $errors]);
        }

        $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        $id = $store->insert($fields + ['lang' => $lang, 'page' => $page], $now);

        try {
            (new Mailer($this->config, $this->appDir))->send($id, $fields, $lang, $page, $now);
            $store->markMail($id, 'sent');
        } catch (\Throwable $e) {
            $store->markMail($id, 'failed', $e->getMessage());
            error_log('request #' . $id . ': email not sent: ' . $e->getMessage());
            $this->respond(500);
        }

        $store->purge($now, (int) ($this->config['retention_months'] ?? 24));
        $this->respond(200);
    }

    /** @return array<string, mixed>|null */
    private function readInput(): ?array
    {
        $type = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
        if (str_starts_with($type, 'application/json')) {
            $data = json_decode((string) file_get_contents('php://input', false, null, 0, self::MAX_BODY), true, 4);
            return is_array($data) ? $data : null;
        }
        if (str_starts_with($type, 'multipart/form-data') || str_starts_with($type, 'application/x-www-form-urlencoded')) {
            return $_POST;
        }
        return null;
    }

    /** @param array<string, mixed> $input */
    private function str(array $input, string $key): string
    {
        $value = $input[$key] ?? '';
        return is_string($value) ? $value : '';
    }

    /** @param array<string, mixed> $extra */
    private function respond(int $status, array $extra = []): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $status === 200] + $extra, JSON_UNESCAPED_UNICODE);
        exit;
    }
}
