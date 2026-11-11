# Налаштування Cloudflare для itassetlogistics.com

Ці налаштування робить власник акаунта Cloudflare (у них потрібен вхід у панель). Вони закривають
те, чого не можна зробити на Cityhost: nginx хостингу сам віддає HTML, CSS, JS і картинки, тому
`.htaccess` не бачить цих запитів (ні заголовків, ні редиректів). Сам `.htaccess` уже робить
редиректи старих адрес, слеш у кінці адреси і 404 потрібною мовою.

Порядок важливий: спершу сертифікат на Cityhost, потім режим SSL.

## 1. SSL/TLS

1. **Cityhost → Сайти → itassetlogistics.com → SSL:** випустити безкоштовний сертифікат
   Let's Encrypt для `itassetlogistics.com` і `www.itassetlogistics.com`.
2. **Cloudflare → SSL/TLS → Overview:** режим **Full (strict)**.
3. **SSL/TLS → Edge Certificates:**
   - **Always Use HTTPS:** On (http → https для всіх адрес).
   - **Minimum TLS Version:** TLS 1.2.
   - **HTTP Strict Transport Security (HSTS):** Enable; Max Age **12 months**; Include subdomains:
     Off; Preload: Off; **No-Sniff header: On**.

## 2. www → основний домен

**Rules → Redirect Rules → Create rule** (або шаблон «Redirect from WWW to Root»):

- If: `Hostname` equals `www.itassetlogistics.com`
- Then: Dynamic redirect, expression `concat("https://itassetlogistics.com", http.request.uri.path)`,
  status **301**, **Preserve query string** увімкнено.

## 3. Заголовки безпеки

**Rules → Transform Rules → Modify Response Header → Create rule.** Два правила, кожне з дією
**Set static** для кожного заголовка.

### Правило «Security headers — site»

If (Edit expression):

```
(http.host eq "itassetlogistics.com" and not starts_with(http.request.uri.path, "/admin/"))
```

| Header | Value |
| --- | --- |
| Content-Security-Policy | `default-src 'self'; script-src 'self' 'sha256-/x7W7R75k8Roq0WaVRQX9blP4OufE5xbAdzklGxsgpw=' https://challenges.cloudflare.com; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src https://challenges.cloudflare.com; form-action 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; upgrade-insecure-requests` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Permissions-Policy | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` |
| X-Frame-Options | `DENY` |
| X-Content-Type-Options | `nosniff` |

### Правило «Security headers — admin»

If:

```
(http.host eq "itassetlogistics.com" and starts_with(http.request.uri.path, "/admin/"))
```

| Header | Value |
| --- | --- |
| Content-Security-Policy | `default-src 'self'; script-src 'self' https://unpkg.com; style-src 'self' 'unsafe-inline'; font-src 'self' https://cdn.jsdelivr.net; img-src 'self' blob: data: https://*.githubusercontent.com; media-src blob:; frame-src blob:; worker-src blob:; manifest-src blob:; connect-src 'self' blob: data: https://unpkg.com https://api.github.com https://www.githubstatus.com https://*.workers.dev; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| X-Frame-Options | `DENY` |
| X-Content-Type-Options | `nosniff` |
| X-Robots-Tag | `noindex, nofollow` |

Ці політики дублюють `<meta http-equiv="Content-Security-Policy">` у сторінках
(`src/layouts/Base.astro`, `public/admin/index.html`). Якщо змінюється одна, змінюйте й другу.

## 4. Кеш

**Caching → Cache Rules → Create rule.**

### «Static assets — 1 year»

- If: `URI Path` starts with `/_astro/`
- Cache eligibility: Eligible for cache
- Edge TTL: Ignore cache-control header, **1 year**
- Browser TTL: Override origin, **1 year**

(Імена файлів у `/_astro/` містять хеш, тому новий реліз ніколи не потрапить під старий кеш.)

### «HTML — 2 minutes at the edge»

- If (Edit expression):
  `(http.host eq "itassetlogistics.com" and not starts_with(http.request.uri.path, "/_astro/") and not starts_with(http.request.uri.path, "/api/") and not starts_with(http.request.uri.path, "/admin/") and not starts_with(http.request.uri.path, "/_private/"))`
- Cache eligibility: Eligible for cache
- Edge TTL: Ignore cache-control header, **2 minutes**
- Browser TTL: **Respect origin** (браузер щоразу перевіряє HTML)

Це прибирає ~0,4 с очікування сервера на кожній сторінці (LCP < 2 с). Правка з адмінки
з'являється на сайті не пізніше ніж за ~3–4 хвилини.

## 5. Вимкнути те, що вставляє сторонній код у сторінки

- **Analytics & Logs → Web Analytics:** вимкнути для itassetlogistics.com (за ТЗ аналітики на
  старті немає; скрипт `static.cloudflareinsights.com` блокується CSP і дає помилку в консолі).
- **Scrape Shield → Email Address Obfuscation:** Off (вставляє свій скрипт і змінює `mailto:`).
- **Speed → Optimization → Rocket Loader:** Off.

## 6. Cityhost

- **Захист адмін-сторінок / від ботів** для itassetlogistics.com: вимкнути. Інакше на `/admin/`
  показується сторінка Cityhost з Google reCAPTCHA (HTTP 423).

## Перевірка

```
curl -sI https://itassetlogistics.com/ | grep -iE "strict-transport|content-security|x-frame|referrer|permissions"
curl -sI http://itassetlogistics.com/contact/        # 301 → https
curl -sI https://www.itassetlogistics.com/contact/   # 301 → https://itassetlogistics.com/contact/
```

Та https://securityheaders.com/?q=itassetlogistics.com (ціль: A або A+).
