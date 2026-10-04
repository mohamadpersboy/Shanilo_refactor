# Inventory سیستم

## Stack

| مورد | مقدار | Source |
|---|---|---|
| Framework | Laravel 5.5.* | `composer.json` |
| Language | PHP (`>=5.6.4` در composer) | `composer.json` |
| Runtime واقعی | UNKNOWN. فقط PHP 7.0–7.2 حدس مستند است و تأیید نشده. | `CLAUDE.md` |
| Frontend | Blade + jQuery (+ pjax) | `resources/views`, `assets/front/_js` |
| Vue | در `package.json` هست. استفاده در Frontend پیدا نشد. | `package.json` |
| CSS | Bootstrap (Sass)، Laravel Mix 0.8 | `package.json`, `webpack.mix.js` |
| Database | MySQL (اتصال `mysql` در Migration) | `database/migrations/base/*bigint_user_keys*` |
| Auth | Session، Guard `web` و `admins` (هر دو روی Model `User`) | `config/auth.php` |
| ACL | `kodeine/laravel-acl` | `config/acl.php` |
| Storage | دیسک محلی + Disk `public`؛ `s3` تعریف شده | `config/filesystems.php`, `AttachmentTrait` |
| Queue | `QUEUE_DRIVER` در env. Job پیدا نشد. | `.env.example` |
| Cache/Session | از env | `.env.example` |
| Mail | SMTP از env. کلاس‌های Mail وجود دارند. | `app/Mail` |
| SMS | `phplusir/smsir` | `app/Helpers/helpers_general.php` |
| Payment | Mellat (`tohidplus/mellat`) | `app/Http/Helpers/Payment` |
| Realtime | Pusher/Broadcast تعریف شده. مصرف واقعی UNKNOWN. | `config/broadcasting.php` |
| Search | `LIKE` روی MySQL | `SearchController` |
| Build | Laravel Mix | `webpack.mix.js` |
| Testing | PHPUnit ~6 | `phpunit.xml` |

## شمارش فایل‌ها

| دسته | تعداد تقریبی | مسیر |
|---|---|---|
| فایل PHP در `app` | 406 | `app/` |
| Controller | 152 (Admin 83، Front 67، ریشه 2) | `app/Http/Controllers` |
| Model | 108 | `app/Models` |
| Form Request | 46 | `app/Http/Requests` |
| Migration | 132 | `database/migrations` (`base/`, `specific/`, ریشه) |
| Seeder | 1 | `database/seeds` |
| Factory | 0 | — |
| Blade View | 421 | `resources/views` |
| Middleware | 16 | `app/Http/Middleware` |
| Trait | 12 (+ Traitهای Model) | `app/Traits`, `app/Models/ModelTrait` |
| Helper | 14 | `app/Helpers` |
| Event / Listener | 6 / 6 | `app/Events`, `app/Listeners` |
| Notification | 1 (`CustomPasswordReset`) | `app/Notifications` |
| Mail | 9 | `app/Mail` |
| Job | 0 | — |
| Observer | 0 (Hook در `boot()` Modelها) | — |
| Policy | 0 (فقط یک Gate) | `app/Providers/GateProvider.php` |
| Console Command | 1 (`CustomMigrate`) | `app/Console/Commands` |
| Scheduler | خالی | `app/Console/Kernel.php` |
| Test | 2 فایل Example | `tests/` |
| Service/Repository Layer | وجود ندارد | — |

## Routeها (تعداد `Route::` تقریبی)

| فایل | تعداد |
|---|---|
| `routes/front/base.php` | 66 |
| `routes/front/specific.php` | 145 |
| `routes/front.php` | 2 |
| `routes/admin/base.php` | 144 |
| `routes/admin/specific.php` | 52 |
| `routes/api.php` | 1 |

## حجم

حدود 71 MB بدون `.git` و بدون `vendor`.
