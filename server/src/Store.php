<?php
declare(strict_types=1);

namespace ItAssetLogistics;

use PDO;

/**
 * SQLite journal outside the web root (spec section 9): every request with its email status,
 * and short-lived IP hashes for the rate limit. The IP itself is never stored.
 */
final class Store
{
    private PDO $db;

    public function __construct(string $file)
    {
        $dir = dirname($file);
        if (!is_dir($dir)) {
            mkdir($dir, 0700, true);
        }
        $new = !is_file($file);
        $this->db = new PDO('sqlite:' . $file, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        $this->db->exec('PRAGMA busy_timeout = 5000');
        if ($new) {
            @chmod($file, 0600);
        }
        $this->db->exec(
            'CREATE TABLE IF NOT EXISTS requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                lang TEXT NOT NULL,
                page TEXT NOT NULL,
                name TEXT NOT NULL,
                company TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT NOT NULL,
                message TEXT NOT NULL,
                mail_status TEXT NOT NULL DEFAULT \'pending\',
                mail_error TEXT
            );
            CREATE TABLE IF NOT EXISTS hits (ip_hash TEXT NOT NULL, at INTEGER NOT NULL);
            CREATE INDEX IF NOT EXISTS hits_ip_at ON hits (ip_hash, at);'
        );
    }

    /** Records one attempt; false when the IP already made `$max` attempts within `$window` seconds. */
    public function hit(string $ipHash, int $now, int $window, int $max): bool
    {
        $this->db->exec('BEGIN IMMEDIATE');
        try {
            $this->db->prepare('DELETE FROM hits WHERE at <= ?')->execute([$now - $window]);
            $count = $this->db->prepare('SELECT COUNT(*) FROM hits WHERE ip_hash = ?');
            $count->execute([$ipHash]);
            if ((int) $count->fetchColumn() >= $max) {
                $this->db->exec('COMMIT');
                return false;
            }
            $this->db->prepare('INSERT INTO hits (ip_hash, at) VALUES (?, ?)')->execute([$ipHash, $now]);
            $this->db->exec('COMMIT');
            return true;
        } catch (\Throwable $e) {
            $this->db->exec('ROLLBACK');
            throw $e;
        }
    }

    /** @param array<string, string> $fields */
    public function insert(array $fields, \DateTimeImmutable $now): int
    {
        $this->db->prepare(
            'INSERT INTO requests (created_at, lang, page, name, company, email, phone, message)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $now->format('Y-m-d\TH:i:s\Z'),
            $fields['lang'], $fields['page'], $fields['name'], $fields['company'],
            $fields['email'], $fields['phone'], $fields['message'],
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function markMail(int $id, string $status, ?string $error = null): void
    {
        $this->db->prepare('UPDATE requests SET mail_status = ?, mail_error = ? WHERE id = ?')
            ->execute([$status, $error === null ? null : mb_substr($error, 0, 500), $id]);
    }

    /** Deletes requests older than the retention term (instead of a separate cron job). */
    public function purge(\DateTimeImmutable $now, int $months): void
    {
        if ($months < 1) {
            return;
        }
        $before = $now->modify('-' . $months . ' months')->format('Y-m-d\TH:i:s\Z');
        $this->db->prepare('DELETE FROM requests WHERE created_at < ?')->execute([$before]);
    }
}
