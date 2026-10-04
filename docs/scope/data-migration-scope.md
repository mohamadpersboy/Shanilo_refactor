# Data Migration Scope

Migration در Phase 15 انجام می‌شود. این سند فقط **چه داده‌ای** را مشخص می‌کند. کد Migration، ابزار و Schema در این Phase نیست.

## 0. پیش‌شرط

U4: آیا Production داده واقعی دارد؟ UNKNOWN. تا OD-10 جواب نگیرد، همه ردیف «MUST MIGRATE» شرطی‌اند: «اگر داده Production وجود دارد».

قوانین (از Operating Rules): Migration Idempotent باشد. قابل Verify باشد. داده Production حذف یا Reset نشود. Legacy فقط خوانده شود.

## 1. طبقه‌بندی گروه داده

| گروه | طبقه | یادداشت |
|---|---|---|
| کاربران (نام، موبایل، ایمیل، `uid`، وضعیت، نقش) | MUST MIGRATE | هویت مشتری و فروشنده. |
| آدرس‌های کاربر | MUST MIGRATE | |
| فروشگاه‌ها و شهرهای سرویس/قیمت ارسال | MUST MIGRATE | |
| دسته، برند، استان، شهر | MUST MIGRATE | داده مرجع. |
| محصول، Variant، مشخصات، Propertyها | MUST MIGRATE | |
| تصاویر محصول و Shop (`files/uploads/...`) | MUST MIGRATE | فایل‌ها در Repository نیستند (U30، D). نیاز به دسترسی. |
| سفارش، جزئیات سفارش، پرداخت | MUST MIGRATE | سابقه مالی. فقط خواندنی. |
| تراکنش Wallet، تسویه (`checkouts`) | MUST MIGRATE | سابقه مالی. |
| نظر و امتیاز (`confirmed`) | SHOULD MIGRATE | UGC. |
| Favorite، Follow (`followers`) | SHOULD MIGRATE | وابسته به OD-04. |
| گزارش تخلف | OPTIONAL | |
| Slider و محتوای صفحه اصلی | SHOULD MIGRATE | |
| Plan و جایگاه فعال صفحه اول | OPTIONAL | وابسته به OD-08. |
| NotifyList | OPTIONAL | |
| پیام‌ها (`messages`) | UNKNOWN | وابسته به OD-04. |
| `msg`، `tickets`، `product_message`، `conversations` | UNKNOWN | محتوا بررسی نشد. |
| CMS (مقاله، خبر، FAQ، قوانین، گالری، Newsletter) | UNKNOWN | OD-13. قوانین احتمالاً لازم است. |
| Tag، Factor، Inventory | UNKNOWN | OD-13. |
| `check_outs`، `user_banks` | SHOULD MIGRATE (فقط خواندنی) | MIGRATION-ONLY. |
| `users.credit`، `credit_log`، `requests_checkout_credit` | UNKNOWN | وابسته به OD-01. |
| Activity log | OPTIONAL | |
| Announcement (اعلان داخلی) | DO NOT MIGRATE | گذرا. |

## 2. داده‌های مشخص

| داده | تصمیم | دلیل |
|---|---|---|
| رمز عبور کاربران | UNKNOWN | قالب Hash نامعلوم (U9، U10). اگر قابل استفاده نبود: Rebuild (کاربر با SMS رمز جدید می‌گذارد). |
| Session | Discard | گذرا. |
| OTP (`users.hashed`، `random`، `password_reset_mobiles`) | Discard | md5 و متن ساده. |
| `temporary_users` | Discard | ثبت‌نام ناتمام. |
| Payment Callback خام (اگر ذخیره شده) | Unknown | وجود آن بررسی نشد. رکورد `payments` Migrate. |
| Payment `pending` | Transform | به Cancelled/Expired تبدیل شود. |
| Payment `unsuccessful` | Migrate | سابقه. |
| Cart و CartDetail (Checkout موقت) | Discard | گذرا. |
| Cache، Queue، Log فایل | Discard | |
| جدول‌های Deprecated و تکراری (`Base/*`) | Discard | بدون داده معتبر. اگر داده دارند، بررسی در Phase 15. |
| `check_outs` | Migrate (فقط خواندنی) | سابقه مالی. |
| Orderهای وضعیت ناسازگار (لغو دوباره، موجودی منفی) | Transform | گزارش مغایرت. موجودی منفی به 0 با ثبت گزارش. مبلغ مالی دستکاری نشود. |
| سابقه مالی (Order، Payment، Wallet، Checkout) | Migrate | بدون تغییر مبلغ. جمع‌ها بعد از Migration با Legacy مقایسه شود. |
| UGC: نظر `confirmed` | Migrate | |
| UGC: نظر `pending`/`denied` | Transform | وضعیت متناظر (OD-09). |
| UGC: پیام‌ها | Unknown | OD-04. |
| Seeder رمز Admin | Discard | Admin جدید ساخته می‌شود. |
| `follows` (جدول بی‌استفاده) | Discard | |

## 3. Verify (WHAT)

بعد از Migration: تعداد رکورد هر گروه برابر باشد. جمع مبلغ Orderها و Wallet برابر باشد. هر Order فروشنده و مشتری معتبر دارد. هر محصول Shop معتبر دارد. هر فایل تصویر یافت شود یا در گزارش بیاید.
