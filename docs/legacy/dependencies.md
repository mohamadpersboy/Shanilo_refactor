# Dependencies

Source: `composer.json`, `package.json`. در این Phase هیچ Dependency تغییر نمی‌کند.
«Used where» فقط وقتی نوشته شده که در کد دیده شده است. در غیر این صورت `UNKNOWN`.

## Composer (require)

| Package | Purpose | Used where | Critical | Replacement needed (در آینده) |
|---|---|---|---|---|
| `laravel/framework 5.5.*` | Framework | همه | بله | کل Stack عوض می‌شود |
| `kodeine/laravel-acl` | نقش/Permission | Middleware `acl`، `User` (`HasRole`) | بله (Admin) | بله |
| `baum/baum` | درخت دسته‌ها | `ProductCategory` (سطح 1..3) | بله | بله |
| `rutorika/sortable` | ترتیب `position` | Modelها (`SortableTrait`)، Route `sort` | متوسط | بله |
| `morilog/jalali` + `app/Helpers/jdf.php` | تاریخ شمسی | `CreditLog`، `ShowDate` | بله | بله |
| `tohidplus/mellat` | درگاه بانک ملت | `MellatPayment`, `CreditController` | بله | بله |
| `tohidplus/zarrinpal` | درگاه زرین‌پال | UNKNOWN (استفاده نشد) | خیر؟ | — |
| `phplusir/smsir` | SMS | OTP و اعلان سفارش | بله | بله |
| `leadthread/laravel-sms`, `twilio/sdk` | SMS جایگزین | UNKNOWN | خیر؟ | — |
| `intervention/image` | پردازش تصویر | `AttachmentTrait` | بله | بله (Cloudinary Phase 5) |
| `optimus/fineuploader-server` | آپلود Admin | `app/Helpers/fineuploader.php` | متوسط | UNKNOWN |
| `pbmedia/laravel-ffmpeg` | ویدیو/صوت | `AttachmentTrait` (توابع بلااستفاده) | خیر | حذف (تصمیم Phase 0.5) |
| `musonza/chat` 2.0.1 | چت | `Admin/ChatController`، جدول‌های Conversation | UNKNOWN | UNKNOWN |
| `spatie/laravel-activitylog` | Log فعالیت | Admin (`logactivity`) | متوسط | بله |
| `spatie/laravel-pjax` | ناوبری PJAX | Front | متوسط | خیر (UI عوض می‌شود) |
| `yajra/laravel-datatables-oracle 8.0` | جدول Admin | Admin DataTable | بله (Admin) | بله |
| `srk-grid/gridview` | Grid | `app/Grid` | UNKNOWN | UNKNOWN |
| `phpoffice/phpspreadsheet` | Excel | Export Admin (`Excel::create` API پکیج `maatwebsite/excel`، که فقط در `composer.lock` به‌صورت غیرمستقیم هست) | متوسط | بله |
| `laravelcollective/html` | Form | Blade | کم | خیر |
| `htmlmin/htmlmin` | Minify HTML | Middleware کامنت‌شده | کم | خیر |
| `mews/captcha` | Captcha | Route `refresh-captcha` | کم | UNKNOWN |
| `milon/barcode` | Barcode | UNKNOWN | UNKNOWN | UNKNOWN |
| `nscreed/laravel-migration-paths` | چند مسیر Migration | `config/laravel-migration-paths.php` | کم | خیر |
| `barryvdh/laravel-ide-helper` | IDE | Dev | خیر | خیر |
| `doctrine/dbal` | `->change()` در Migration | Migrationها | کم | خیر |
| `guzzlehttp/guzzle` | HTTP | UNKNOWN | UNKNOWN | UNKNOWN |

## Composer (dev)

`fzaninotto/faker`, `mockery/mockery 0.9`, `phpunit/phpunit ~6`, `filp/whoops`.

## Autoload

`app/Helpers/helpers.php`, `fineuploader.php`, `jdf.php` (Files). `database` (Classmap).

## NPM

| Package | Note |
|---|---|
| `laravel-mix ^0.8.3`, `cross-env`, `webpack` (از Mix) | Build قدیمی |
| `bootstrap-sass ^3.3.7` | CSS |
| `jquery`, `lodash`, `axios ^0.15.3` | JS |
| `vue ^2`, `vue-router ^2`, `vue-bootstrap-pagination` | استفاده UNKNOWN |
| `eslint*` | Lint |

Scripts: `dev`, `watch`, `watch-poll`, `hot`, `production`. اسکریپت `lint/test` ندارد.

## نکات

- بسیاری از Packageها قدیمی و رها‌شده هستند (Laravel 5.5 پایان پشتیبانی).
- `composer.lock` وجود دارد (شامل `maatwebsite/excel`، `plivo/plivo-php` به‌عنوان Dependency غیرمستقیم).
- `vendor` در Repository نیست. اجرای `composer install` انجام نشد.
