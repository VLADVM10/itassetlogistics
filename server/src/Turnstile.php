<?php
declare(strict_types=1);

namespace ItAssetLogistics;

/** Server-side check of the Cloudflare Turnstile token (siteverify). */
final class Turnstile
{
    private const URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

    /** @param list<string> $hostnames */
    public function __construct(private string $secret, private array $hostnames)
    {
    }

    public function verify(string $token, string $ip): bool
    {
        if ($this->secret === '' || $token === '' || strlen($token) > 2048) {
            return false;
        }
        $curl = curl_init(self::URL);
        curl_setopt_array($curl, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query(['secret' => $this->secret, 'response' => $token, 'remoteip' => $ip]),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 4,
            CURLOPT_TIMEOUT => 6,
        ]);
        $body = curl_exec($curl);
        $error = curl_error($curl);
        curl_close($curl);
        if (!is_string($body)) {
            error_log('turnstile: ' . $error);
            return false;
        }
        $result = json_decode($body, true);
        if (!is_array($result) || ($result['success'] ?? false) !== true) {
            return false;
        }
        return $this->hostnames === [] || in_array($result['hostname'] ?? '', $this->hostnames, true);
    }
}
