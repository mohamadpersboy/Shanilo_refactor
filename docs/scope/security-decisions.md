# Security Decisions

مبنا: `docs/legacy/security.md` (S1..S19) و یافته جدید Phase 0.5 (S20). هیچ Secret واقعی در این سند نیست.

## دسته‌ها

- **Must fix before production**: قبل از اولین استقرار Production باید حل شود.
- **Must not carry**: نباید به معماری جدید منتقل شود.
- **Needs redesign**: هدف می‌ماند. رفتار طراحی مجدد می‌شود.
- **Needs investigation**: شاهد کافی نیست.

## جدول

| ID | یافته | دسته | تصمیم | Critical |
|---|---|---|---|---|
| S1 | Credential Mellat در Repository | Must fix before production + Must not carry | Credential فعلی «افشاشده» است. Rotate توسط مالک. Secret فقط در محیط. | Critical |
| S2 | مقدار SMS.ir در `.env.example` | Must fix before production + Needs investigation | معتبر بودن UNKNOWN (U36). Rotate. `.env.example` فقط Placeholder. | Critical |
| S3 | `GET /api/orders` بدون Auth | Must not carry | Endpoint عمومی سفارش وجود ندارد. | Critical |
| S4 | `GET /download?path=` | Must not carry | دانلود فقط با مجوز. بدون مسیر دلخواه. | Critical |
| S5 | OTP بدون اتصال به موبایل | Needs redesign | OTP وابسته به موبایل/درخواست. منقضی. یک‌بارمصرف. | — |
| S6 | Throttle ورود کار نمی‌کند | Must fix before production | محدودیت تلاش ورود. | — |
| S7 | کد فراموشی متن ساده، 5 رقم | Must not carry | کد Hash شده. | — |
| S8 | Callback پرداخت بدون Idempotency/Lock | Must fix before production | یک پرداخت = یک اثر مالی. | Critical |
| S9 | Impersonation بدون Log | Needs redesign | هر استفاده Log دارد. (DEFER، F06) | — |
| S10 | رمز ضعیف Admin در Seeder | Must not carry | رمز Admin Seed نمی‌شود. | Critical |
| S11 | Rule Validation از Client | Must not carry | Rule فقط سمت server. | — |
| S12 | Stored XSS (Announcement) | Needs redesign | محتوای کاربر Escape می‌شود. HTML ذخیره نمی‌شود. | — |
| S13 | `products/{id}/get` | Must not carry | حذف (REMOVE F97). | Critical |
| S14 | Cart `updateCount` بدون مالکیت | Needs redesign | چک مالکیت روی هر شیء. | — |
| S15 | Admin Prefix از ENV | Must not carry | آدرس مخفی کنترل دسترسی نیست. | — |
| S16 | Callback بانک CSRF مستثنا | Needs investigation | هویت Callback با Verify بانک (U11). | — |
| S17 | `dd(config())` | Must not carry | Debug dump وجود ندارد. | — |
| S18 | Cart `updateField` | Must not carry | فیلد قیمت از Client نمی‌آید. | — |
| S19 | ارسال پستی و `dd` | Must not carry | ارسال پستی DEFER. | — |
| S20 | `getProductByKey` پوشه `app/Http` را حذف می‌کند (جدید) | Must fix before production + Needs investigation | حذف کامل. بررسی Production: آیا `storage/logs/key.txt` وجود دارد؟ آیا اجرا شده؟ | Critical |
| S21 | Admin و User یک Guard/جدول (C13) | Needs redesign | جداسازی نقش و نشست. | — |
| S22 | Authorization فقط Route-level | Needs redesign | Object-level اجباری. | — |
| S23 | 357 مورد `{!! !!}` | Needs redesign | خروجی Escape می‌شود. | — |
| S24 | `new $className()` از DB (A3) | Must not carry | روش پرداخت از فهرست ثابت و مجاز. | — |
| S25 | Hash رمز UNKNOWN (U10) | Needs investigation | الگوریتم Hash قوی. Legacy بررسی. | — |
| S26 | `HttpsProtocol` فعال؟ (U37) | Needs investigation | سیستم جدید فقط HTTPS. | — |
| S27 | 9 مورد SQL خام (security.md) | Needs investigation | در سیستم جدید وجود ندارد (MongoDB). بررسی فقط برای رفتار. | — |
| S28 | Upload: MIME/Size فقط برای تصویر محصول؛ پیام بدون Validation | Needs redesign | Validation نوع و حجم برای همه Uploadها. | — |
| S29 | Laravel 5.5/PHP 7 بدون پشتیبانی | Must not carry | Legacy فقط مرجع است. | — |

S21..S29 از بخش‌های دیگر `docs/legacy` (authentication، authorization، current-problems) گرفته شده‌اند. شماره‌ها مخصوص این سند هستند.

## شمارش

| مورد | تعداد |
|---|---|
| کل تصمیم امنیتی | 29 |
| Critical | 8 |
| Must fix before production | 5 |
| Must not carry | 13 |
| Needs redesign | 8 |
| Needs investigation | 6 |

یک ردیف می‌تواند دو دسته داشته باشد. پس مجموع دسته‌ها از «کل» بیشتر است. Critical = تأییدشده (CONFIRMED) و اثر مالی، نشت داده یا حذف کد.
