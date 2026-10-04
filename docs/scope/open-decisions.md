# Open Decisions

فقط تصمیم‌هایی که از Legacy و Master Prompt جواب ندارند و کاربر باید بگوید. هیچ تصمیم «باز» پنهان در سندهای دیگر نیست. هر OD در `feature-decisions.md` و `business-rule-decisions.md` ارجاع شده است.

## 1. Decisions Required From User (15)

### OD-01 — مدل پول و مقصد برگشت وجه

- **Context:** Legacy دو استخر پول دارد: Wallet فروشگاه و `users.credit`. لغو سفارش وجه را به Credit کاربر می‌دهد.
- **Evidence:** C9، B6، BR-19، BR-23.
- **Options:**
  1. یک دفتر برای همه، برگشت وجه به موجودی داخلی کاربر.
  2. دفتر Wallet فروشنده جدا از موجودی مشتری. برگشت وجه به موجودی داخلی (مثل Legacy).
  3. برگشت وجه به کارت بانکی. بدون موجودی داخلی مشتری.
- **Consequences:** گزینه 3 Credit (F47–F49) را حذف می‌کند و فرایند بانکی لازم دارد. گزینه 1 و 2 Credit را نگه می‌دارند.
- **Affected domains:** Wallet، Credit، Payment، Order
- **Needed before:** Phase 2 و Phase 12

### OD-02 — کمیسیون پلتفرم

- **Context:** `ADMIN_CHECKOUT_PERCENT=0` در `.env.example`. مقدار Production نامعلوم.
- **Evidence:** BR-17.
- **Options:**
  1. صفر درصد مثل Legacy.
  2. درصد ثابت که مالک می‌دهد.
  3. درصد به ازای دسته.
- **Consequences:** بر مبلغ Wallet فروشنده اثر دارد.
- **Affected domains:** Wallet، Order
- **Needed before:** Phase 12

### OD-03 — تسویه در MVP و دوره نگهداری وجه

- **Context:** Legacy ۳ روز نگهداری دارد و حداقل برداشت 10,000. تسویه در زنجیره MVP نیست.
- **Evidence:** BR-25، BR-26، G4.
- **Options:**
  1. تسویه در MVP. مقدار ۳ روز و حداقل مثل Legacy.
  2. تسویه بعد از MVP. پرداخت به فروشنده خارج از سیستم.
  3. تسویه در MVP با مقدار جدید.
- **Consequences:** گزینه 2 فروشنده را در MVP بدون ابزار برداشت می‌گذارد.
- **Affected domains:** Wallet، Admin
- **Needed before:** Phase 12

### OD-04 — Social، Messaging، Timeline

- **Context:** Legacy چهار سیستم پیام، Follow/Block و Timeline (فقط Route) دارد.
- **Evidence:** C8، U20، U23.
- **Options:**
  1. Messaging و Follow/Block در Post-MVP. Timeline حذف.
  2. فقط Messaging. Follow/Block و Timeline حذف.
  3. همه Post-MVP.
- **Consequences:** هر انتخاب Phase 13 را تعیین می‌کند.
- **Affected domains:** Social، Messaging
- **Needed before:** Phase 13

### OD-05 — سیاست تأیید فروشگاه و ویرایش محصول

- **Context:** Legacy فروشگاه را بدون تأیید نمایش می‌دهد (`display=1`). ویرایش متن/قیمت محصول `display` را تغییر نمی‌دهد (تأییدنشده). رد کردن محصول در Legacy نیست.
- **Evidence:** BR-01، BR-03، F24، F19.
- **Options:**
  1. فروشگاه تأییدشده توسط Admin. ویرایش مهم محصول تأیید مجدد.
  2. فروشگاه فوری. ویرایش مهم محصول تأیید مجدد.
  3. فروشگاه فوری. ویرایش بدون تأیید مجدد (مثل Legacy).
- **Consequences:** اثر روی کنترل کیفیت و بار Admin. وضعیت Rejected برای محصول در همین تصمیم.
- **Affected domains:** Shop، Product، Admin
- **Needed before:** Phase 8 و Phase 10

### OD-06 — ارسال پستی

- **Context:** `PostApi` خراب است. وزن > 50 ممنوع. سرویس پست نامعلوم.
- **Evidence:** B11، BR-12.
- **Options:**
  1. فقط ارسال فروشگاه.
  2. ارسال پستی بعد از MVP با سرویس مشخص.
- **Consequences:** گزینه 1 فروشگاه‌ها را به ارسال خودشان محدود می‌کند.
- **Affected domains:** Shipping
- **Needed before:** Phase 11

### OD-07 — مالیات

- **Context:** `tax` همیشه 0.
- **Evidence:** BR-05.
- **Options:**
  1. بدون مالیات.
  2. مالیات با درصد مشخص.
- **Consequences:** گزینه 2 فرمول مبلغ را تغییر می‌دهد.
- **Affected domains:** Checkout، Order
- **Needed before:** Phase 2 (Money)

### OD-08 — جایگاه پولی صفحه اول و Advertisement

- **Context:** Plan و جایگاه پولی هست. قیمت فروش ویژه متناقض (100). Advertisement فقط ثبت درخواست.
- **Evidence:** C4، U22، U24.
- **Options:**
  1. جایگاه پولی را نگه دار (قیمت از مالک).
  2. هر دو را حذف.
  3. بعد از MVP دوباره بررسی.
- **Consequences:** گزینه 2 ردیف‌های F55 را به REMOVE تبدیل می‌کند.
- **Affected domains:** Promotion، Advertisement
- **Needed before:** Phase 13

### OD-09 — قواعد نظر

- **Context:** نظر در Front مستقیم `confirmed` است. صف `pending` پر نمی‌شود.
- **Evidence:** C7، BR-29.
- **Options:**
  1. نظر پیش از نمایش تأیید می‌شود.
  2. نظر فوری. Admin بعداً رد می‌کند.
  3. فقط خریدار واقعی نظر دهد، تأیید بعدی.
- **Consequences:** بر وضعیت اولیه Comment اثر دارد.
- **Affected domains:** Comment
- **Needed before:** Phase 13

### OD-10 — داده Production و دسترسی

- **Context:** نامعلوم است که Production فعال است و داده دارد.
- **Evidence:** U4، U5، U30.
- **Options:**
  1. داده Production موجود است. دسترسی به DB و فایل‌ها داده می‌شود.
  2. داده‌ای نیست. Migration لازم نیست.
  3. داده هست ولی بعداً دسترسی داده می‌شود.
- **Consequences:** گزینه 2 Phase 15 را حذف می‌کند. گزینه 1 و 3 داده Migration را فعال می‌کنند.
- **Affected domains:** همه
- **Needed before:** Phase 3 و Phase 15

### OD-11 — قاعده گردکردن قیمت

- **Context:** دو الگوریتم. Model فعال: به 100 (زیر 100000) یا 1000.
- **Evidence:** C5، BR-04.
- **Options:**
  1. قاعده Model فعال.
  2. بدون گردکردن.
  3. قاعده Trait (500/1000).
- **Consequences:** بر قیمت و مبلغ پرداخت اثر دارد.
- **Affected domains:** Product، Checkout
- **Needed before:** Phase 2 (Money)

### OD-12 — پرداخت در محل و درگاه‌های دیگر

- **Context:** `home` و AsanPardakht در DB نامعلوم.
- **Evidence:** U12، U13.
- **Options:**
  1. فقط Mellat.
  2. Mellat + پرداخت در محل.
  3. Mellat + درگاه دیگر (نام مشخص).
- **Consequences:** گزینه 2 جریان Order و Wallet را تغییر می‌دهد.
- **Affected domains:** Payment
- **Needed before:** Phase 12

### OD-13 — Featureهای UNKNOWN

- **Context:** CMS، قوانین، Comparison، نقشه، Broadcast، Analytics، Tag/Factor/Inventory، Admin Developer.
- **Evidence:** unknowns U20، U21، U27–U29، U34.
- **Options:**
  1. مالک برای هر کدام «نگه دار/حذف» اعلام کند.
  2. تصمیم هر مورد در Phase مربوط با بررسی Production.
- **Consequences:** بدون جواب، این Featureها در MVP نیستند.
- **Affected domains:** CMS، Geography، Infra
- **Needed before:** Phase 13

### OD-14 — تأیید فهرست REMOVE

- **Context:** Master Prompt و Operating Rules حذف Feature بدون تأیید را ممنوع می‌کنند. این فهرست فقط کد مرده، تکراری یا مخرب است.
- **Evidence:** `feature-decisions.md`.
- **Options:**
  1. فهرست را تأیید کن.
  2. موارد مشخص را از REMOVE به DEFER ببر.
- **Consequences:** تا تأیید، هیچ‌چیز حذف یا پیاده نمی‌شود. فهرست:
  - F45 Zarrinpal
  - F61 جدول `follows` (بدون استفاده)
  - F68 Musonza Chat و `conversations`
  - F82 ماژول‌های بقایای Template: Calendar، Week، Member، Education
  - F89 ویدیو و صوت (`createVideo`، `createMusic`، ffmpeg)
  - F93 Modelهای تکراری Base/*
  - F94 SMS Providerهای بلااستفاده (leadthread، Twilio، Plivo)
  - F95 Event `ProductAdded`
  - F96 Vue، vue-router، HTML minify
  - F97 مسیر `products/{id}/get` و `getProductByKey`
- **Affected domains:** همه
- **Needed before:** Phase 1

### OD-15 — Credential افشاشده

- **Context:** Credential بانک و مقدار SMS.ir در Repository بود. معتبر بودن نامعلوم.
- **Evidence:** S1، S2، U36.
- **Options:**
  1. مالک Credential را Rotate می‌کند.
  2. مالک تأیید می‌کند که معتبر نیستند.
- **Consequences:** Production با Credential افشاشده ریسک مالی دارد. فقط مالک می‌تواند Rotate کند.
- **Affected domains:** Payment، Notification
- **Needed before:** قبل از Production

## 2. Legacy documentation issues

`docs/legacy` عمداً تغییر نکرد.

| Legacy documentation issue | Evidence | Required follow-up |
|---|---|---|
| `business-rules.md` و `current-problems.md` (B4) می‌گویند موجودی در Cart چک نمی‌شود. | `app/Http/Middleware/Shop/CartMiddleware.php`: 403 برای AJAX `toggle` وقتی کالا نیست و `productDetail->count <= 0`. `StepCheckExistsProductMiddleware`: آیتم با `count <= 0` در Step 1..6 حذف می‌شود. پرداخت و `confirm` هنوز چک ندارند. | اصلاح متن در سند Legacy. تصمیم این Phase: BR-09. |
| `admin.md`، `unknowns.md` (U19)، `feature-classification.md` (D) می‌گویند Route مدیریت `pay_types`/`send_types` پیدا نشد. | `routes/admin/base.php` خطوط ~277–289: `send_type` resource و Routeهای کمکی. `pay_type` تحت `protect_alias`. | اصلاح سندها. |
| `security.md` (S13) و `feature-classification.md` (D) هدف `products/{id}/get` را نامعلوم می‌دانند. | `app/Helpers/helpers_general.php:253` (`getProductByKey`): `File::deleteDirectory(base_path('app/Http'))` پشت مقایسه Hash با `storage/logs/key.txt`. | اصلاح S13. ثبت S20. بررسی Production: آیا `key.txt` وجود دارد؟ |
| `unknowns.md` (U14) می‌گوید ID=1 نامعلوم است ولی `business-rules.md` آن را «ارسال فروشگاه» می‌داند. | `Order.php:143`، `CartDetail.php:84`. | هماهنگ‌سازی سندها. |

## 3. Potential New Features

بدون تأیید کاربر پیاده نمی‌شوند.

| ID | Feature | دلیل ثبت |
|---|---|---|
| PNF-01 | جستجوی محصول | Legacy فقط User/Shop را جستجو می‌کند. مرور MVP فقط دسته/فیلتر. |
| PNF-02 | بازگشت کالا بعد از دریافت | بعد از `Received` فرایندی نیست. |
| PNF-03 | مداخله Admin در وضعیت Order | Legacy Admin فقط مشاهده می‌کند. |
| PNF-04 | گزارش فروش برای فروشنده | فروشنده فقط لیست Order دارد. |
| PNF-05 | حذف حساب و خروجی داده کاربر | Legacy ندارد. |
