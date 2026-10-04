# External Services

Secret واقعی ننوشته شده. فقط نام ENV و محل.

## Mellat (درگاه پرداخت)

- Service: `tohidplus/mellat`
- Purpose: پرداخت Order، شارژ Credit، خرید پلن صفحه اول.
- Entry point: `app/Http/Helpers/Payment/MellatPayment.php`، `CreditController@store/verify`.
- Credentials: **داخل `config/mellat.php` به‌صورت ثابت نوشته شده** (terminalId، username، password). ENV استفاده نمی‌شود. مقدار را اینجا نمی‌نویسیم. `security.md`.
- Config: `convertToRial=true` (کد مبلغ را تومان→ریال می‌کند؛ در `CreditController::verify` تقسیم بر 10).
- Callback URL: `payment/verifyOrder`، `profile/credit/verify`، `profile/firstPageSpecial*/verify`. هر 4 از CSRF مستثنا هستند.
- Failure behavior: در Redirect ناموفق، پیام خطا. در Verify ناموفق: Payment `unsuccessful`.
- Retry / Timeout: ندارد (تنظیم صریح پیدا نشد).
- Duplicate callback: UNKNOWN (رفتار پکیج).

## Zarrinpal، AsanPardakht

- `tohidplus/zarrinpal` در composer هست. استفاده در کد پیدا نشد.
- `AsanPardakhtPayment` (61 خط) وجود دارد. استفاده واقعی UNKNOWN. وضعیت `pay_types` در DB معلوم نیست.

## SMS.ir

- Service: `phplusir/smsir`
- Purpose: OTP ثبت‌نام/ورود/فراموشی، اعلان وضعیت سفارش.
- Entry point: `Smsir::ultraFastSend(params, templateId, mobile)`. فایل‌ها: `RegisterController`, `FrontLoginController`, `ForgotPasswordController`, `helpers_general.php::sendConfirmationSMS`, `SendOrderStatusNotification`, Route `resend-sms`.
- Templates (ID ثابت در کد): 31278 (OTP ثبت‌نام/ورود)، 31279 (فراموشی)، 31281/31282/31340/31355/31357 (وضعیت سفارش).
- ENV: `SMSIR-API-KEY`, `SMSIR-SECRET-KEY`, `SMSIR-LINE-NUMBER`. در `.env.example` **مقدار غیر خالی** دارند. `security.md`.
- Failure behavior: Exception مدیریت نمی‌شود (بدون try/catch دیده نشد).
- Retry/Timeout: ندارد.
- Queue: همه SMSها Synchronous هستند (Listenerها `ShouldQueue` نیستند).
- `Smsir::send` برای پیام‌های متنی کامنت شده است. فقط قالب‌های Template فعالند.

## سایر SMS

`leadthread/laravel-sms` (`config/sms.php`: درایور، Plivo/Twilio) و `twilio/sdk`. استفاده در کد پیدا نشد (فقط `use Plivo\Message` در `CreditController`). ENV: `SMS_DRIVER`, `PLIVO_*`, `TWILIO_*`.

## Mail

- SMTP از ENV (`MAIL_*`). کلاس‌های Mail: EmailConfirmation، EmailNewsletter، ShopShare، EmailArticleShare، EmailNewsShare، EmailVideoShare، EmailUser، EmailFromAdmin، EmailRequest.
- Notification `CustomPasswordReset` (Email بازیابی رمز؛ جریان فعلی با SMS است). مصرف واقعی Mail UNKNOWN.
- `Smsir` و Mail هر دو Synchronous.

## Pusher / Broadcast

- ENV: `BROADCAST_DRIVER`, `PUSHER_APP_ID/KEY/SECRET`. Channel `App.User.{id}` در `routes/channels.php`.
- Event `MessageSent` ممکن است Broadcast شود. UNKNOWN (آیا `ShouldBroadcast`).

## Post API (محاسبه پست)

- `app/Http/Helpers/PostApi.php` فقط الگوریتم محلی بسته‌بندی وزن + جدول `config/post-plans.php` است. تماس HTTP ندارد.
- شامل `dd(config())`. `current-problems.md`.

## Redis

ENV: `REDIS_*`. استفاده واقعی (Cache/Session/Queue) از ENV می‌آید. UNKNOWN.

## نقشه / مکان

Route `get-position/{type}/{id?}` و ستون `latlong` در `addresses`. سرویس نقشه (Neshan/Google/...) در کد Backend پیدا نشد. در JS بررسی نشد. UNKNOWN.

## Captcha

`mews/captcha`. Route `refresh-captcha` (با ورودی `State` که با Closure ناسازگار است).

## Analytics / Meta

Meta تگ‌های `yn-tag` و `enamad` در `begin.blade.php`. اسکریپت Analytics در Blade بررسی نشد.

## Cloudinary

استفاده نمی‌شود. فقط inventory: `media.md`.
