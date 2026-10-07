# Owner Decisions و Phase 3 Scope Lock

تاریخ: 2026-10-07. وضعیت: فقط تصمیم و محدوده. هیچ کدی نوشته نشد. Phase 3 هنوز شروع نشده و منتظر تأیید Owner است.

این سند فقط تصمیم‌های جدید را ثبت می‌کند. تصمیم‌های قبلی (DR-01..DR-05، M-01..M-13) دوباره تعریف نمی‌شوند. جدول DECIDED و OPEN کامل: `open-decisions.md` بخش DR-06.

---

## 1. تصمیم‌های قطعی Owner (DECIDED)

### DB-01 — محیط‌های MongoDB
- Development: MongoDB Atlas.
- Production: MongoDB روی VPS با Ubuntu 24.04.
- Production برای Transaction چندسندی از Replica Set استفاده می‌کند. Replica Set تک‌عضوی قابل قبول است.
- تنظیمات اتصال هر محیط مستقل است. متغیر استاندارد: `MONGODB_URI` (از Phase 1 در `src/lib/env/schema.ts` و `.env.example` هست).
- URI و رمز عبور در کد و Git نمی‌آیند.
- Production با احراز هویت و دسترسی شبکه محدود اجرا می‌شود.
- Atlas و Production از نظر عملیاتی یکسان فرض نمی‌شوند.

### DB-02 — Production Application
- Production Application: Next.js روی همان VPS با Ubuntu 24.04.
- Vercel دیگر Production Target نیست. Vercel فقط برای Preview، Development یا استفاده موقت می‌ماند.

### DB-03 — MongoDB Data Layer
- Mongoose. انتخاب بین Mongoose و Native Driver بسته شد. Phase 3 دوباره آن را مطرح نمی‌کند.

### PAY-01 — مدل Payment
- هر `Payment` = یک تعامل مستقل با درگاه. Retry = Payment جدید برای همان Order.
- بدون Entity `PaymentAttempt`.
- حداکثر یک Payment با وضعیت `PENDING` برای هر Order. این محدودیت در Repository و Concurrency هم اعمال می‌شود، نه فقط در Service.

### PAY-02 — پرداخت ترکیبی (Product Decision = DECIDED)
- مشتری بخشی از مبلغ Order را از Customer Credit و باقی را از درگاه می‌پردازد. مثال: 1,000,000 = 300,000 Credit + 700,000 درگاه (تومان).
- Customer Credit از Seller Wallet مستقل است. مبالغ تومان و Integer-safe هستند.
- مبلغ درگاه از مبلغ باقی‌مانده و از داده معتبر ذخیره‌شده سمت سرور می‌آید.
- Credit دوبار کسر نمی‌شود. پرداخت بانکی دوبار تأیید یا ثبت نمی‌شود.
- اگر نتیجه درگاه نامشخص باشد، بدون بررسی ناموفق فرض نمی‌شود و Credit آزاد نمی‌شود.
- این یک جریان مالی واحد است، نه پرداخت دوگانه ساده.
- **DEFERRED به طراحی Checkout/Payment:** State Machine دقیق، Transaction Boundary، Idempotency Persistence، Credit Reservation/Debit/Release، رفتار Crash، رفتار Gateway Pending/Unknown، Refund. هیچ‌کدام در Phase 3 طراحی یا پیاده نمی‌شود.
- جایگاه F47 در Feature Matrix: بخش الف (ترکیبی) DECIDED. بخش ب (پرداخت کامل فقط با Credit)، F48 (شارژ) و F49 (برداشت) OPEN باقی می‌مانند.

### PAY-03 — `Order.currentPaymentId`
- فعلاً اضافه نمی‌شود. هنگام طراحی Order/Payment Integration دوباره بررسی می‌شود.

### PAY-05 — سوابق مالی
- Idempotency مالی TTL خودکار ندارد. Retention، Archive و Delete بعداً تعیین می‌شود. حذف سوابق نباید اجرای دوباره عملیات مالی را ممکن کند.

### PAY-07 — Seller Payable
- فعلاً در Transaction تأیید Payment نیست. Seller Payable، Settlement و Wallet قبل از مرز نهایی Transaction بررسی می‌شوند.

### PAY-08 — `operation_records`
- در Phase 3 ساخته نمی‌شود.
- همراه اولین Consumer واقعی طراحی و پیاده می‌شود. Consumer اولیه: Checkout/Payment. طبق Roadmap Phase 11 (Cart/Checkout/Orders) یا Phase 12 (Payment/Wallet/Financial). فاز دقیق در Analysis همان فاز تعیین می‌شود. تصمیم جدیدی درباره آن ثبت نشد.
- Phase 3 فقط زیرساخت لازم برای آینده را آماده می‌کند (بخش 3).

### U11 — پرداخت دیرهنگام
- اگر Payment منقضی‌شده بعداً از درگاه موفق اعلام شد: نادیده گرفته نشود و بدون بررسی «موفق» عادی اعلام نشود. وضعیت مغایرت و Reconciliation باید طراحی شود. رفتار دقیق OPEN است.

---

## 2. موارد OPEN و DEFERRED

| # | موضوع | وضعیت | چه چیزی را مسدود می‌کند |
|---|---|---|---|
| O-01 | نسخه دقیق MongoDB روی Production | OPEN | Transaction Helper و تست Production |
| O-01b | نام Replica Set، Backup، Monitoring، Firewall، جزئیات Authentication روی VPS | OPEN | استقرار Production (خارج از Phase 3) |
| O-03 | Seller Payable، Settlement، Wallet | OPEN | مرز Transaction تأیید Payment |
| O-04 | آزادسازی یا بازگرداندن Credit بعد از شکست درگاه | OPEN | طراحی Checkout/Payment |
| O-05 | پرداخت دیرهنگام (U11): انتقال وضعیت، Reconciliation، رسیدگی دستی | OPEN | State machine Payment |
| O-06 | Retention، Archive و Delete سوابق Idempotency | OPEN | طراحی `operation_records` |
| O-07 | `Order.currentPaymentId` | بازبینی بعداً | Order/Payment Integration |
| O-08 | جایگاه پرداخت ترکیبی در MVP یا Post-MVP | OPEN | Scope Phase 11 و 12 |
| O-10 | داده Production و دسترسی (OD-10) | OPEN | Seed و داده مرجع |
| O-11 | نوع BSON دقیق برای Money (M-02) | OPEN | تصمیم با تست در Phase 3 |
| O-12 | State Machine دقیق پرداخت ترکیبی | DEFERRED به Checkout/Payment | — |
| O-13 | مرز Transaction هر عملیات مالی | DEFERRED به فاز همان عملیات | — |

حل‌شده: O-02 (Vercel یا VPS) → DB-02. O-09 (Mongoose یا Native Driver) → DB-03.

---

## 3. محدوده Phase 3 (نیاز به تأیید Owner برای شروع)

Phase 3 فقط زیرساخت مشترک Data Layer است. هیچ قاعده Business برای Payment یا Order نمی‌گذارد.

### داخل Phase 3
1. اتصال MongoDB.
2. Mongoose Data Layer (`src/lib/db/`).
3. Repository foundation (قرارداد و الگوی دسترسی به داده، طبق `Service → Repository → MongoDB`). Repository Business Decision نمی‌گیرد.
4. بررسی و تصمیم نمایش Money در BSON، بدون float/double. گزینه‌ها: Int32، Int64/Long، Double با اعتبار Safe Integer، Decimal128. انتخاب با تست.
5. زیرساخت Transaction (بخش 5).
6. تست‌های واقعی Transaction روی MongoDB سازگار (Replica Set).
7. مدیریت خطای اتصال و قطع ارتباط. پیام عمومی بدون URI و جزئیات داخلی.
8. پیش‌نیازهای Index و Migration.
9. آماده‌سازی زیرساخت برای آینده بدون ساخت `operation_records`: نگاشت خطای Duplicate Key، قرارداد Transaction، قرارداد Money، مکانیزم ساخت Index.

### خارج از Phase 3
Payment Schema، Payment Repository، Order Schema، Order Repository، Payment Provider Registry، Mellat، ZarinPal، Callback، Verification، Reconciliation، پرداخت ترکیبی، Customer Credit، Refund، Seller Payable، Settlement، `operation_records`، و تغییر Contractهای تثبیت‌شده Phase 2 بدون تأیید.

Phase 3 نباید Schema یا Collection «تصادفی» بسازد (Master Prompt بخش 41).

---

## 4. MongoDB: Atlas و Production

| مورد | Development (Atlas) | Production (VPS Ubuntu 24.04) |
|---|---|---|
| Replica Set | Atlas خوشه‌ها را Replica Set می‌سازد | Replica Set باید ساخته شود. نام و جزئیات OPEN |
| نسخه | OPEN | OPEN |
| احراز هویت و شبکه | مدیریت Atlas | باید فعال و محدود باشد. جزئیات OPEN |
| Backup و Monitoring | مدیریت Atlas | OPEN |

- هیچ سرور یا دیتابیسی نصب یا پیکربندی نشد.
- ادعای پشتیبانی یک نسخه خاص ثبت نشد. Evidence مستند رسمی: MongoDB 8.0 Community رسماً Ubuntu 24.04 را روی x86_64 پشتیبانی می‌کند. این Evidence تصمیم نسخه نیست. انتخاب نسخه OPEN است (O-01).

---

## 5. Transaction (الزامات)

- طبق مستند رسمی MongoDB: Transaction چندسندی روی Replica Set (حداقل `featureCompatibilityVersion` 4.0) و Sharded Cluster (حداقل 4.2) کار می‌کند. روی Standalone کار نمی‌کند. موتور ذخیره‌سازی WiredTiger لازم است. زمان پیش‌فرض اجرای Transaction: 60 ثانیه.
- تست Transaction روی Atlas یا MongoDB محلی با Replica Set تک‌عضوی. Mock برای اثبات Atomicity کافی نیست. Standalone باید خطای واضح بدهد (تست منفی).
- بدون پشتیبانی Transaction: Helper **Fail Closed** است. خطای عمومی می‌دهد. عملیات چندسندی را بدون Transaction اجرا نمی‌کند. ادعای موفقیت یا Atomicity نمی‌کند.
- هیچ HTTP، Gateway یا SMS call داخل Transaction نیست (M-12).
- مرز Transaction هر عملیات مالی در فاز همان عملیات تعیین می‌شود. زیرساخت Phase 3 قاعده Business نمی‌گذارد.
- Abstraction نهایی Transaction Helper با Owner در Implementation Prompt تأیید می‌شود.

---

## 6. تعارض‌های اسناد

**اصلاح‌شده:**
- `README.md` (خط 3، 30 و بخش Vercel) و `.env.example` (کامنت خط 2): Vercel را Production Target می‌نامیدند. اصلاح شد: Production = VPS. Vercel فقط Preview/استفاده موقت.
- `feature-decisions.md`، `post-mvp-scope.md`، `mvp-scope.md`، `domain-scope.md`، `business-rule-decisions.md`، `state-machine-decisions.md`، `open-decisions.md`: «پرداخت با Credit تصمیم نشده» به تفکیک F47 الف (DECIDED) و ب (OPEN) اصلاح شد.
- `open-decisions.md` (M-12 و جدول Readiness): «مرز نهایی Transaction در Phase 3» با یادداشت DR-06 هماهنگ شد.

**باقی‌مانده (بدون تغییر، فقط گزارش):**
- Master Prompt و CLAUDE PROJECT OPERATING RULES (Project Doc): در مرحله Final Documentation Alignment با DB-01 تا DB-03 هماهنگ شدند. Production = VPS. Vercel فقط Preview یا استفاده موقت. تعارضی باقی نمانده. روش Deploy روی VPS (CI/CD، Process Manager، Reverse Proxy، HTTPS، Rollback) هنوز OPEN است.
- `open-decisions-review.md`: گزارش قدیمی Phase 1.5 است. «F47 تصمیم نشده» در آن (خط 50، 53، 354) عمداً تغییر نکرد.
- `feature-dependencies.md` و `open-decisions.md` خط OD-01 Option 3: درباره F48/F49 هستند و درست باقی ماندند.

---

## 7. ریسک‌ها

| Risk | Severity | یادداشت |
|---|---|---|
| Production بدون Replica Set → عملیات چندسندی مالی ناامن | بالا | Fail Closed. O-01 قبل از Phase 11 و 12 بسته شود. |
| فرض یکسان بودن Atlas و Production | متوسط | تست روی هر دو محیط. |
| روش Deploy روی VPS تصمیم نشده | متوسط | CI/CD، Process Manager، Reverse Proxy، HTTPS و Rollback OPEN هستند. حدس نزن. |
| پرداخت ترکیبی: Crash بین کسر Credit و نتیجه درگاه | بالا | طراحی Checkout/Payment. |
| `operation_records` با Schema زودهنگام | متوسط | PAY-08: بعد از Consumer. |
| حذف سوابق Idempotency و اجرای دوباره | بالا | PAY-05: بدون TTL. |
| BSON Double برای Money | متوسط | فقط Safe Integer. تصمیم با تست. |
| امنیت VPS: Firewall، Authentication، Backup | بالا | خارج از Phase 3. OPEN. |

---

## 8. گام بعدی (برای تأیید Owner)
1. تأیید این سند.
2. تصمیم درباره Master Prompt و Operating Rules (اصلاح Vercel).
3. نوشتن Phase 3 Implementation Prompt.
