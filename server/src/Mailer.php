<?php
declare(strict_types=1);

namespace ItAssetLogistics;

use PHPMailer\PHPMailer\PHPMailer;

/**
 * The request email (spec section 9): to the address from config.php, from the domain mailbox,
 * Reply-To the applicant. Plain text and simple HTML; no secrets or request headers.
 */
final class Mailer
{
    private const LANG = ['en' => 'EN', 'uk' => 'UA'];
    private const PAGE = ['home' => 'Home', 'contact' => 'Contact'];
    private const LABELS = ['name' => 'Name', 'company' => 'Company', 'email' => 'Email', 'phone' => 'Phone', 'message' => 'Message'];

    /** @param array<string, mixed> $config */
    public function __construct(private array $config, private string $appDir)
    {
    }

    /** @param array<string, string> $fields */
    public function send(int $id, array $fields, string $lang, string $page, \DateTimeImmutable $at): void
    {
        $smtp = (array) ($this->config['smtp'] ?? []);
        $recipient = (string) ($this->config['recipient'] ?? '');
        $from = (string) ($smtp['from'] ?? '');
        if ($recipient === '' || $from === '') {
            throw new \RuntimeException('recipient or sender not configured');
        }

        $mail = new PHPMailer(true);
        $mail->CharSet = PHPMailer::CHARSET_UTF8;
        $mail->setFrom($from, (string) ($smtp['from_name'] ?? ''));
        $mail->addAddress($recipient);
        $mail->addReplyTo($fields['email'], $fields['name']);
        $mail->Subject = sprintf(
            '[IT Asset Logistics] New request — %s (%s, %s)',
            $fields['company'],
            self::LANG[$lang],
            self::PAGE[$page],
        );

        $kyiv = $at->setTimezone(new \DateTimeZone('Europe/Kyiv'))->format('Y-m-d H:i') . ' (Kyiv)';
        $meta = ['Language' => self::LANG[$lang], 'Page' => self::PAGE[$page], 'Received' => $kyiv, 'Journal ID' => (string) $id];
        $mail->isHTML(true);
        $mail->Body = $this->html($fields, $meta);
        $mail->AltBody = $this->text($fields, $meta);

        if (($this->config['mail_transport'] ?? 'smtp') === 'file') {
            $this->saveToOutbox($mail, $id);
            return;
        }

        $mail->isSMTP();
        $mail->Host = (string) ($smtp['host'] ?? '');
        $mail->Port = (int) ($smtp['port'] ?? 465);
        $mail->SMTPSecure = ($smtp['secure'] ?? 'ssl') === 'tls' ? PHPMailer::ENCRYPTION_STARTTLS : PHPMailer::ENCRYPTION_SMTPS;
        $mail->SMTPAuth = ($smtp['username'] ?? '') !== '';
        $mail->Username = (string) ($smtp['username'] ?? '');
        $mail->Password = (string) ($smtp['password'] ?? '');
        $mail->Timeout = 10;
        if ($mail->Host === '') {
            throw new \RuntimeException('SMTP host not configured');
        }
        $mail->send();
    }

    /**
     * @param array<string, string> $fields
     * @param array<string, string> $meta
     */
    private function text(array $fields, array $meta): string
    {
        $lines = ['New request from the website.', ''];
        foreach (self::LABELS as $key => $label) {
            if ($key === 'message') {
                continue;
            }
            $lines[] = $label . ': ' . ($fields[$key] !== '' ? $fields[$key] : '—');
        }
        $lines[] = '';
        $lines[] = 'Message:';
        $lines[] = $fields['message'];
        $lines[] = '';
        foreach ($meta as $label => $value) {
            $lines[] = $label . ': ' . $value;
        }
        return implode("\n", $lines) . "\n";
    }

    /**
     * @param array<string, string> $fields
     * @param array<string, string> $meta
     */
    private function html(array $fields, array $meta): string
    {
        $e = static fn (string $s): string => htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $row = static fn (string $label, string $value): string =>
            '<tr><th align="left" valign="top" style="padding:6px 16px 6px 0;color:#5C6B7E;font-weight:600">' . $label
            . '</th><td style="padding:6px 0">' . $value . '</td></tr>';

        $rows = '';
        foreach (self::LABELS as $key => $label) {
            $value = $fields[$key] !== '' ? $e($fields[$key]) : '—';
            if ($key === 'email') {
                $value = '<a href="mailto:' . $e($fields['email']) . '">' . $value . '</a>';
            }
            if ($key === 'message') {
                $value = nl2br($value, false);
            }
            $rows .= $row($label, $value);
        }
        $metaRows = '';
        foreach ($meta as $label => $value) {
            $metaRows .= $row($e($label), $e($value));
        }

        return '<!doctype html><html><body style="font-family:Arial,sans-serif;font-size:14px;color:#0D1B2A">'
            . '<p>New request from the website.</p>'
            . '<table cellpadding="0" cellspacing="0">' . $rows . '</table>'
            . '<hr style="border:0;border-top:1px solid #E3E8EE;margin:16px 0">'
            . '<table cellpadding="0" cellspacing="0" style="font-size:13px">' . $metaRows . '</table>'
            . '</body></html>';
    }

    private function saveToOutbox(PHPMailer $mail, int $id): void
    {
        $dir = $this->appDir . '/data/outbox';
        if (!is_dir($dir)) {
            mkdir($dir, 0700, true);
        }
        $mail->preSend();
        file_put_contents($dir . '/request-' . $id . '.eml', $mail->getSentMIMEMessage());
    }
}
