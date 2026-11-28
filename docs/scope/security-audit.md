# Security Audit — Production Readiness (S1..S29)

تاریخ: 2026-11-28. Branch: `security/production-readiness`. مبنا: `main` در commit `85218a6`.

## یافته اصلی

این repository فقط پایه Next.js است. Route کسب‌وکار، Auth، OTP، Cart، Order، Upload و Seeder ندارد. تنها Route: `/api/health`. بیشتر یافته‌های S1..S29 به کد Legacy لاراول (`mohamadpersboy/shanilo`) مربوط‌اند. آن کد در این repository نیست و اصلاح نشد.

## وضعیت هر مورد

| گروه | موارد | معنی |
|---|---|---|
| A. در بازنویسی وجود ندارد + تست محافظ | S3 S4 S10 S11 S12 S13 S14 S15 S17 S18 S19 S20 S22 S23 S24 S27 S28 (17) | کد آسیب‌پذیر در این repo نیست. تست `tests/security-guard.test.ts` از بازگشت آن جلوگیری می‌کند. |
| A2. فقط Legacy | S29 (1) | Legacy مرجع است. |
| B. در این PR تغییر یا بررسی شد | S1 S2 S26 (3) | اسکن Secret، تست `.env.example`، Header امنیتی. |
| C. Deferred به فاز بعد (Feature هنوز نیست) | S5 S6 S7 S8 S9 S16 S21 S25 (8) | بدون کد قابل اصلاح نیست. باید همراه Feature پیاده شود. |

جمع: 17 + 1 + 3 + 8 = 29.

از قبل اصلاح‌شده توسط فازهای قبلی (Phase 1..3): Logger با Redaction، خطاهای مالی بدون جزئیات داخلی، `server-only`، ENV فقط Server، Money با Integer، Idempotency Contract، Transaction Helper.

## تغییرات این PR

- `next.config.ts`: Header امنیتی پایه (`nosniff`، `X-Frame-Options: DENY`، `Referrer-Policy`، `Permissions-Policy`، `COOP`) و HSTS فقط در Production (S26).
- `src/lib/logger/redact.ts`: حذف Bearer token و GitHub token داخل متن آزاد.
- `tests/security-guard.test.ts` (15 تست): ممنوعیت `dangerouslySetInnerHTML`، `eval`، `new Function`، `dd()`، `$where`، `child_process` در کد برنامه؛ فهرست Route بررسی‌شده (Route جدید بدون بازبینی، تست را fail می‌کند)؛ بدون Server Action بازبینی‌نشده؛ `.env.example` فقط Placeholder؛ الگوی Secret در کد و docs؛ Redaction؛ Header.

## نتیجه اسکن Secret (مقادیر چاپ نشد)

- Working tree و تمام 27 commit قابل دسترس: هیچ Token، Private Key یا Credential واقعی نیست.
- سه Match فقط URI ساختگی در تست‌ها هستند (`secret-host.internal` و مشابه).
- فایل `.env` یا Key در تاریخچه نیست. `.env.example` فقط Placeholder دارد.

## ریسک باقی‌مانده و تصمیم مالک

1. Repository Legacy: طبق `CLAUDE.md` عمومی است و تاریخچه آن Credential باطل‌شده Mellat و SMS.ir را دارد. در این مأموریت دسترسی به آن نبود و اسکن نشد. پیشنهاد: Private یا Archive کردن. حذف تاریخچه تصمیم مالک است.
2. S20: بررسی سرور Production Legacy (`storage/logs/key.txt`، حذف شدن `app/Http`) نیاز به دسترسی Production دارد. انجام نشد.
3. HTTPS و TLS (S26): Redirect و Certificate در Reverse Proxy روی VPS تنظیم می‌شود. روش Deploy هنوز OPEN است.
4. CSP: عمداً اضافه نشد. فهرست Script و Asset (Cloudinary، Gateway) هنوز نیست. Phase 6/7.
5. Idempotency پرداخت (S8): فقط Contract وجود دارد. اعمال واقعی با Persistence و `operation_records` همراه Checkout/Payment (PAY-08) پیاده می‌شود. تا آن زمان Payment به Production وصل نشود.
6. Auth، OTP، Rate Limit، Hash کد فراموشی (S5 S6 S7 S25): Phase 4. Rate Limit توزیع‌شده به Store مشترک نیاز دارد. نوع Store تصمیم مالک است.
7. `test:integration` در محیط Claude اجرا نشد (`MONGODB_TEST_URI` نبود). مالک باید آن را اجرا کند.
