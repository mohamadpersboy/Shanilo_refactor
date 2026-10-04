# Security Inventory

فقط وضعیت فعلی. Redesign نمی‌کنیم. Secret ننوشته شده.
وضعیت `CONFIRMED` یعنی در کد دیده شد. `PLAUSIBLE` یعنی از روی کد ممکن است ولی اجرا نشده.

## مکانیزم‌های موجود

| مورد | وضعیت |
|---|---|
| CSRF | Middleware `VerifyCsrfToken` فعال. 4 Route پرداخت مستثنا (Callback بانک). Meta `csrf-token` در Layout. |
| Validation | Form Request و `validate()`. پوشش ناهمگون. |
| Rate limiting | فقط `throttle:60,1` روی گروه `api`. Login: شمارنده کار نمی‌کند. |
| SQL Injection | بیشتر Eloquent/Binding. 9 مورد SQL خام (بررسی نشد). `LIKE` با Binding. |
| XSS | Blade `{{ }}` Escape می‌کند. 357 مورد `{!! !!}` بدون Escape. Announcement HTML ذخیره‌شده. |
| Session | Session تک‌دستگاهی (destroy قبلی). Regenerate در Login. |
| File validation | MIME/Size برای تصویر محصول. پیام: بدون Validation. |
| Password | حداقل 6 کاراکتر. Hashing: UNKNOWN (Mutator) |
| Authorization | دستی در Controller. بدون Policy. |
| HTTPS | Middleware `HttpsProtocol` (فعال‌بودن بررسی نشد). |

## یافته‌ها

### S1 — CONFIRMED: Credential درگاه در Repository
- Source: `config/mellat.php`
- terminalId، username، password بانک به‌صورت ثابت در کد.
- ریسک: هر کس به Repository دسترسی دارد، به اطلاعات درگاه دسترسی دارد.
- یادداشت Migration: بعد از تصمیم، Credential باید Rotate شود (خارج از Phase 0).

### S2 — CONFIRMED: مقدار SMS.ir در `.env.example`
- Source: `.env.example` (`SMSIR-API-KEY`, `SMSIR-SECRET-KEY`, `SMSIR-LINE-NUMBER` غیر خالی).
- ریسک: کلید واقعی ممکن است در Git باشد (واقعی‌بودن UNKNOWN).

### S3 — CONFIRMED: API بدون Auth
- Source: `routes/api.php`
- `GET /api/orders` همه Orderها را با اطلاعات User برمی‌گرداند. بدون Auth.

### S4 — CONFIRMED: دانلود بدون Auth
- Source: `routes/front/specific.php`, `DownloadController`
- `GET /download?path=...` هر فایل Disk `public` را می‌دهد. پیوست پیام‌ها همان‌جاست.

### S5 — PLAUSIBLE: تأیید موبایل با کد، بدون اتصال به کاربر
- Source: `RegisterController@confirm`
- کد 6 رقمی (`md5` بدون Salt). جستجو: `User::where('hashed', md5(code))`. سپس `Auth::login`.
- حدس کد دیگری که کاربر دیگری دارد، ممکن است Login به‌عنوان او شود. بدون محدودیت تلاش.

### S6 — CONFIRMED: Throttle Login ناکارآمد
- Source: `FrontLoginController@login`
- `incrementLoginAttempts` بعد از `return` است. شمارنده بالا نمی‌رود.

### S7 — CONFIRMED: کد فراموشی رمز 5 رقمی و متن ساده
- Source: `ForgotPasswordController@sendResetMobile`
- `rand(10000, 99999)` و ذخیره `code` در DB بدون Hash.

### S8 — CONFIRMED: Callback پرداخت بدون Idempotency و بدون Lock
- Source: `MellatPayment::verifyOrder`, `Order::confirm`
- هیچ بررسی «قبلاً تأیید شده»، `lockForUpdate` یا `unique` روی تراکنش نیست.
- Credit: `credit >= total` بدون Lock. دو درخواست هم‌زمان ممکن است هر دو پاس شوند (PLAUSIBLE).

### S9 — CONFIRMED: Impersonation بدون Log
- Source: `Admin/Base/UserController@loginAs`, `Admin/Specific/ProductController@show`

### S10 — CONFIRMED: رمز ضعیف Admin در Seeder
- Source: `database/seeds/DatabaseSeeder.php`
- رمز ثابت 6 کاراکتری برای کاربر `role_id=1`.

### S11 — PLAUSIBLE: Rule از Client
- Source: `POST single-field-validation`
- `$request->get('rules')` به‌عنوان Rule Validator استفاده می‌شود (مثلاً `exists:...`). ریسک: Rule دلخواه اجرا می‌شود.

### S12 — PLAUSIBLE: Stored XSS از Announcement
- Source: `announcementMessage`, Listener پیشنهاد محصول
- HTML شامل نام کاربر (`getUsersFullName`) در `announcements.message` ذخیره و بدون Escape نمایش داده می‌شود (نمایش بررسی نشد).

### S13 — CONFIRMED: `products/{id}/get`
- Source: `Front/Specific/ProductController@getByKey`
- بدون Auth. وابسته به `storage/logs/key.txt` و `getProductByKey`. هدف مشخص نیست. در فهرست D قرار گرفت.

### S14 — PLAUSIBLE: Cart updateCount بدون مالکیت
- Source: `CartController@updateCount`
- `CartDetailProduct` از Route Model Binding می‌آید. چک `cart_id` دیده نشد.

### S15 — CONFIRMED: Admin Prefix از ENV
- Source: `routes/admin/base.php`
- آدرس Admin مخفی‌سازی است، نه کنترل دسترسی.

### S16 — CONFIRMED: CSRF مستثنا برای Callback
- لازم است (بانک POST می‌کند). هویت Callback باید با امضای بانک/Verify بررسی شود. در `Mellat::verify` (پکیج) انجام می‌شود. UNKNOWN.

### S17 — CONFIRMED: Debug Statement
- Source: `PostApi::price` → `dd(config())`. می‌تواند Config (شامل Secret) را در پاسخ چاپ کند، اگر مسیر اجرا شود.

## وابستگی‌های قدیمی

Laravel 5.5 و PHP 7.x پایان پشتیبانی امنیتی دارند. Packageها قدیمی‌اند.

### S18 — PLAUSIBLE: Cart `updateField` بدون Whitelist
- Source: `CartController@updateField`, `CartDetail::$fillable`
- `field` و `value` از Client می‌آید و مستقیم `update([$field => $value])` می‌شود.
- `$fillable` شامل `transport_price`, `tax`, `cart_id`, `shop_id`, `address_id`, `pay_type_id` است.
- سناریو: `field=transport_price`, `value=0` هزینه ارسال را صفر می‌کند. `total()` همین مقدار را می‌خواند.
- `address_id` هم به مالکیت کاربر چک نمی‌شود (IDOR روی آدرس).
- اجرا نشده.

### S19 — PLAUSIBLE: ارسال پستی هنگام قطع Cart
- `send_type_id != 1` مسیر `PostApi` را اجرا می‌کند که `dd(config())` دارد (`S17`). یعنی کاربر می‌تواند با انتخاب ارسال پستی Config را در پاسخ ببیند، اگر `APP_DEBUG`/Handler چاپ را اجازه دهد. اجرا نشده.
