<?php
declare(strict_types=1);

namespace ItAssetLogistics;

/**
 * Field rules of spec section 9. The browser applies the same rules (src/scripts/form.ts);
 * keep both in sync. Error codes match `form.errors` in the site settings.
 */
final class Validator
{
    /** @var array<string, array{required: bool, min?: int, max: int, line: bool, type?: string}> */
    public const RULES = [
        'name' => ['required' => true, 'min' => 2, 'max' => 100, 'line' => true],
        'company' => ['required' => true, 'min' => 2, 'max' => 150, 'line' => true],
        'email' => ['required' => true, 'max' => 254, 'line' => true, 'type' => 'email'],
        'phone' => ['required' => false, 'max' => 32, 'line' => true, 'type' => 'phone'],
        'message' => ['required' => true, 'min' => 10, 'max' => 5000, 'line' => false],
    ];

    /** Phone: digits, +, spaces, brackets and hyphens, with at least 5 digits. */
    private const PHONE = '/^(?=(?:\D*\d){5})[0-9+ ()\-]+$/';

    /**
     * @param array<string, mixed> $input
     * @return array{0: array<string, string>, 1: array<string, string>} [clean fields, errors]
     */
    public static function validate(array $input): array
    {
        $fields = [];
        $errors = [];
        foreach (self::RULES as $key => $rule) {
            $value = self::normalize($input[$key] ?? '', $rule['line']);
            $fields[$key] = $value;
            $length = mb_strlen($value, 'UTF-8');

            if ($value === '') {
                if ($rule['required']) {
                    $errors[$key] = 'required';
                }
                continue;
            }
            if ($length > $rule['max']) {
                $errors[$key] = 'too_long';
            } elseif (isset($rule['min']) && $length < $rule['min']) {
                $errors[$key] = 'too_short';
            } elseif (($rule['type'] ?? '') === 'email' && filter_var($value, FILTER_VALIDATE_EMAIL) === false) {
                $errors[$key] = 'email';
            } elseif (($rule['type'] ?? '') === 'phone' && !preg_match(self::PHONE, $value)) {
                $errors[$key] = 'phone';
            }
        }
        return [$fields, $errors];
    }

    /**
     * Trim, drop control and invisible formatting characters; single-line fields lose line breaks
     * (no header injection through name, company or email).
     */
    public static function normalize(mixed $value, bool $line): string
    {
        if (!is_string($value)) {
            return '';
        }
        if (!mb_check_encoding($value, 'UTF-8')) {
            $value = mb_convert_encoding($value, 'UTF-8', 'UTF-8');
        }
        $value = str_replace(["\r\n", "\r"], "\n", $value);
        if ($line) {
            $value = (string) preg_replace('/[\t\n\v\f ]+/u', ' ', $value);
        }
        $value = (string) preg_replace(
            '/[\x{0000}-\x{0008}\x{000B}-\x{001F}\x{007F}-\x{009F}\x{200B}-\x{200F}\x{2028}\x{2029}\x{202A}-\x{202E}\x{2066}-\x{2069}\x{FEFF}]/u',
            '',
            $value,
        );
        return trim($value);
    }
}
