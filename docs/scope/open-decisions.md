# Open Decisions

فقط تصمیم‌هایی که از Legacy و Master Prompt جواب ندارند و کاربر باید بگوید. هیچ تصمیم «باز» پنهان در سندهای دیگر نیست. هر OD در `feature-decisions.md` و `business-rule-decisions.md` ارجاع شده است.

## 0. Final Decisions (Phase 1.5، 2026-10-05)

مالک این 4 تصمیم را تأیید کرد. وضعیت آنها `DECIDED` است. تصمیم‌ها فقط ثبت شدند. هیچ Model، Service، Schema یا کد ساخته نشد. طراحی در Phase 2 است.

| تصمیم | وضعیت |
|---|---|
| OD-01 Credit مشتری و Wallet فروشنده | DECIDED: Option B |
| OD-07 مالیات | DECIDED: Option B |
| OD-11 گردکردن قیمت | DECIDED: Option A |
| ZarinPal (حل تعارض F45، OD-12، OD-14) | DECIDED: Mellat + ZarinPal |

### DR-01 — OD-01: Customer Credit و Seller Wallet

- **Decision:** Customer Credit و Seller Wallet دو حساب مالی مستقل‌اند. مشتری: Credit Account و Credit Transactions. فروشنده: Wallet Account و Wallet Transactions. Refund داخلی در MVP به Credit مشتری برمی‌گردد (Order Cancel ← Refund ← Customer Credit). Refund مستقیم بانکی در MVP لازم نیست.
- **Option:** B
- **Reason (بیان مالک):** پول مشتری و فروشنده نباید در یک موجودی ادغام شود. معماری نباید افزودن Refund Provider در آینده را خراب کند.
- **Legacy Evidence:** `users.credit` (Credit مشتری). `Wallet` و `WalletTransaction` (دفتر `add`/`sub` فروشگاه). `Order::disconfirm`: `credit += order.total`. C9، BR-19.
- **New Shanilo Impact:** F39 به Credit مشتری برمی‌گردد. Domain Credit از Unknown به MVP می‌رود (حساب و دفتر برای دریافت Refund). F47 (پرداخت با Credit)، F48 (شارژ)، F49 (برداشت) تصمیم نشده‌اند و حکم این تصمیم نیستند.
- **Implementation Phase:** طراحی: Phase 2. Schema: Phase 3. Refund و Wallet: Phase 11 و 12.

### DR-02 — OD-07: Tax

- **Decision:** Shanilo جدید مالیات را درصدی و قابل تنظیم پشتیبانی می‌کند. مفهوم: `TaxPolicy` با `enabled` و `rate`. مالیات در Business Logic Hard-code نمی‌شود. نرخ فعلی تعیین نشد. مالک/حسابداری بعداً نرخ را می‌دهد.
- **Option:** B
- **Reason (بیان مالک):** مالیات نباید Hard-code باشد. Legacy فقط Evidence است، نه تصمیم نهایی.
- **Legacy Evidence:** `TAX = 0` ثابت. `Order.tax`. BR-05. BR-13: مجموع Order شامل مالیات است.
- **New Shanilo Impact:** F36 از DEFER به REDESIGN می‌رود. سازوکار در MVP (Order Total مالیات دارد). نرخ و مقدار `enabled`: تصمیم نشده.
- **Implementation Phase:** طراحی Money: Phase 2. محاسبه Checkout: Phase 11.

### DR-03 — OD-11: Price Rounding

- **Decision:** الگوریتم فعال Legacy حفظ می‌شود. قیمت < 100000: گرد به نزدیک‌ترین 100. قیمت ≥ 100000: گرد به نزدیک‌ترین 1000. الگوریتم قدیمی Trait (500/1000) انتخاب نمی‌شود.
- **Option:** A
- **Reason (بیان مالک):** رفتار واقعی Model فعال Legacy حفظ شود. Rounding یک Domain Rule مشخص باشد. در Controller یا UI پخش نشود. در چند Helper تکرار نشود. دو الگوریتم همزمان نباشد.
- **Legacy Evidence:** `ProductDetail::getPurePriceAttribute` ← `roundPrice` (helpers_general). Model بر `PurePriceTrait` غالب است. C5، BR-04.
- **New Shanilo Impact:** F18، BR-04. محل Rule را Phase 2 تعیین می‌کند.
- **Implementation Phase:** Phase 2 (محل Rule). Phase 8 (قیمت محصول). Phase 11 (Checkout).

### DR-04 — ZarinPal

- **Decision:** درگاه‌های Shanilo جدید: Mellat + ZarinPal. معماری: `PaymentService ← PaymentProvider ← (MellatProvider، ZarinPalProvider)`. Provider در Order Business Logic نمی‌آید. Order به یک Provider وابسته نیست. Provider فقط Integration با Gateway است. Business Rule (Order، Payment State، Amount، Refund، Idempotency) در Domain/Application می‌ماند. کد Legacy ZarinPal منتقل نمی‌شود. Integration و Contract جدید ساخته می‌شود.
- **Option:** Mellat + ZarinPal
- **Reason (بیان مالک):** Master Prompt §19 و Operating Rules §36 هر دو Provider را حداقل مورد نیاز می‌دانند.
- **Legacy Evidence:** `tohidplus/zarrinpal` فقط در `composer.json`. در `app`، `routes`، `config` و `resources` هیچ استفاده‌ای نیست.
- **New Shanilo Impact:** F45 از REMOVE به REDESIGN رفت. F43 (Mellat) KEEP می‌ماند. OD-14 یک مورد کمتر دارد (9 مورد). OD-12 فقط درباره COD و Providerهای قدیمی دیگر است.
- **Implementation Phase:** Contract: Phase 2. Provider: Phase 12. ENV از Phase 1 در `.env.example` هست.

وضعیت پرداخت: Mellat = confirmed. ZarinPal = confirmed. COD/Home = still open (OD-12). AsanPardakht = still unknown (OD-12).

### DR-05 — Phase 2 Owner Approval (M-01..M-13)

مالک M-01 تا M-13 را تأیید کرد. هیچ Model، Service، Schema یا Provider ساخته نشد. فقط Domain Contract در `src/lib/money` و Phase 2B تا 2E ساخته می‌شود.

| کد | تصمیم |
|---|---|
| M-01 Currency | `TOMAN`. تبدیل Toman→Rial فقط داخل Provider Currency Adapter. |
| M-02 Money Representation | `Money = {amount: integer, currency: TOMAN}`. در TypeScript: `number` + `Number.isSafeInteger()`. نوع BSON در Phase 3 تصمیم و تست می‌شود (Int32، Long یا گزینه دیگر). Repository از ذخیره Float جلوگیری می‌کند. |
| M-03 Rounding Algorithm | الگوریتم فعال Legacy (OD-11 A). با Integer Arithmetic دقیق. |
| M-04 Rounding Points | قیمت واحد بعد از تخفیف: `roundPrice`. جمع قلم = قیمت واحد گرد‌شده × تعداد. Subtotal = جمع قلم‌ها. Tax = `roundPrice(subtotal × rateBps / 10000)`. Shipping گرد نمی‌شود. Total = subtotal + tax + shipping بدون گرد مجدد. |
| M-05 Tax Policy | `rate` = Integer Basis Points (1000 = 10%). بدون Float. بدون Admin UI. بدون Tax Engine. نرخ Legacy = 0 تاریخی. نرخ آینده حدس زده نمی‌شود. |
| M-06 Payment Amount | `paymentAmount = order.total`. |
| M-07 Customer Credit | حساب و دفتر مستقل از Seller Wallet (OD-01 B). |
| M-08 Refund | MVP: فقط لغو کامل سفارش. `refundAmount = paidAmount`. مقصد: Customer Credit. Refund جزئی، درصدی، Per-line و Allocation پیچیده: OUT OF MVP. مبلغ از قیمت فعلی Product محاسبه نمی‌شود. |
| M-09 Seller Wallet | Ledger مستقل. Payment موفق Wallet را مستقیم افزایش نمی‌دهد. |
| M-10 Seller Settlement | Seller Payable یک Domain Concept مستقل است (Option B). Settlement = انتقال Payable→Wallet. Customer Refund مستقیم Seller Wallet را تغییر نمی‌دهد. Cancel/Refund، Payable را باطل یا اصلاح می‌کند. |
| M-11 Financial Snapshot | Order تاریخی است. Snapshot: currency، subtotal، discount، tax، shipping، total، paidAmount. هر قلم: unitPrice، discountPercent، finalUnitPrice، quantity، lineTotal. Policy: نرخ Tax و `enabled`، نسخه RoundingPolicy، currency. |
| M-12 Transaction Boundary | فقط عملیات چندسندی Transaction می‌خواهند: Confirm Payment، Refund، Settlement، Payout. اول Single-Document Atomicity بررسی شود. هیچ HTTP، Gateway یا SMS call داخل Transaction نباشد. مرز نهایی: Phase 3. |
| M-13 Idempotency | Key از Business Operation ID می‌آید. Unique Constraint + Conditional State Transition. Callback تکراری اثر مالی دوم ندارد. `settlement:{orderId}` فرض نمی‌شود. |

**جریان مالی:** Customer Payment → Order Financials → Seller Payable → Settlement → Seller Wallet.

**Terminology (نهایی):**

| اصطلاح | معنی |
|---|---|
| Checkout | ثبت سفارش مشتری. |
| Settlement | تسویه Seller Payable و انتقال به Seller Wallet. |
| Payout | برداشت موجودی Seller Wallet توسط فروشنده (Wallet→Bank). |

واژه Checkout برای برداشت فروشنده استفاده نمی‌شود. جدول Legacy `checkouts` و `CheckoutController` همان Payout جدید هستند. Legacy که Wallet را زودتر تغییر می‌دهد فقط Evidence است.

**Deferred:** Settlement Rounding → Phase 12. Zero-price After Rounding → Phase 8.

**ترتیب اجرا:** 2A Money + Currency → 2B RoundingPolicy → 2C TaxPolicy + PriceCalculation + FinancialSnapshot Types → 2D Financial Errors + Idempotency Types → 2E PaymentProvider Contracts. بعد از هر مرحله توقف و گزارش. Business Feature جدید در 2A تا 2E اضافه نمی‌شود.

**وضعیت اجرا:** 2A، 2B و 2C کامل شد. 2D و 2E منتظر تأیید. در 2C نرخ Tax (`rateBps`) تعیین نشد و OPEN ماند. Snapshot شامل `refundedAmount` نیست. Settlement و Payable در Phase 12 هستند. جزئیات: `CLAUDE.md` بخش 14.

### Requirements برای Phase 2 (فقط ثبت، بدون Implementation)

1. **Money Model حداقل مفاهیم:** `Money`، `Currency`، `RoundingPolicy`، `TaxPolicy`، `PriceCalculation`.
2. **Order تاریخی:** Order با تغییر قیمت فعلی Product تغییر نمی‌کند. Phase 2 حداقل این مفاهیم را برای Order در نظر می‌گیرد: `unitPrice`، `discount`، `finalUnitPrice`، `quantity`، `tax`، `shipping`، `total`، `currency`.
3. **Idempotency:** Legacy مشکل Refund دوباره، Callback تکراری، Confirm تکراری و تغییر دوباره وضعیت مالی داشت (BR Bug #2، #6). Phase 2 Idempotency عملیات مالی را طراحی می‌کند.
4. **Transaction Boundary:** منطق مالی Legacy بین Model، Controller و Listener پخش است. Phase 2 مرز Transaction را برای این موارد تعیین می‌کند: Create Order، Confirm Payment، Cancel Order، Refund، Seller Wallet Transaction، Customer Credit Transaction، Seller Settlement.
5. **Provider Boundary:** بالا در DR-04.

### Phase 2 Readiness Review (به‌روز شده بعد از Owner Approval)

Blockerهای Money که حل شدند: جهت Wallet/Credit (OD-01)، مدل Tax (OD-07)، Rounding (OD-11)، Providerهای پرداخت (ZarinPal)، واحد Currency (M-01)، نمایش Money (M-02)، نقاط اعمال Rounding (M-04)، مبلغ Refund (M-08)، Seller Payable (M-09/M-10)، اصول Transaction و Idempotency (M-12، M-13).

باقی‌مانده:

| مورد | وضعیت | Blocks Phase 2؟ |
|---|---|---|
| BSON Storage Type برای Money (Int32، Long یا گزینه دیگر) | تصمیم در Phase 3 با تست | خیر. |
| مرز نهایی Transaction هر عملیات مالی | تصمیم در Phase 3 (Schema و Repository) | خیر. |
| Operation ID و Idempotency Key برای Settlement | بعد از طراحی Payable مشخص می‌شود. `settlement:{orderId}` فرض نمی‌شود. | خیر. |
| Settlement Rounding | Phase 12 (وابسته به Commission و Seller Financial Rules) | خیر. |
| Zero-price After Rounding | Phase 8 (Product Pricing). تا آن زمان رفتار Legacy فقط Evidence است. | خیر. |
| Commission (OD-02) | باز | خیر. قبل از طراحی Settlement. |
| Settlement، Hold period و Payout (OD-03) | باز | خیر. قبل از طراحی Payable→Wallet. |
| COD (OD-12) | باز | خیر. روش پرداخت قابل توسعه باشد. |
| F47، F48، F49 (پرداخت، شارژ، برداشت با Credit) | تصمیم نشده | خیر. قبل از نهایی شدن انواع Credit Transaction. |
| نرخ Tax و `enabled` | تصمیم نشده. نرخ Legacy فقط 0 تاریخی است. نرخ آینده حدس زده نمی‌شود. | خیر. |
| واحد Log بانک Mellat (C10) | UNKNOWN. | خیر. Phase 12/15. |
| واحد ZarinPal | UNVERIFIED. از مستندات رسمی در Phase 12 تأیید شود. | خیر. |

**Phase 2 Readiness: READY.** Phase 2A تا 2E طبق ترتیب تأییدشده اجرا می‌شود (بخش DR-05).

## 1. Decisions Required From User (15 کل: 3 DECIDED، 12 باز)

### OD-01 — مدل پول و مقصد برگشت وجه

- **Status: DECIDED — Option B (Phase 1.5).** رکورد: DR-01. متن زیر Evidence و گزینه‌های اولیه است.
- **Supplement (Phase 2):** Seller Payable مفهومی مستقل بین Payment و Seller Wallet است (DR-05، M-10). Refund مشتری به Customer Credit می‌رود و Seller Wallet را مستقیم تغییر نمی‌دهد.

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

- **Terminology (Phase 2):** «Settlement» = Payable→Wallet. «Payout» = Wallet→Bank. واژه «تسویه» در متن Legacy این OD برداشت فروشنده (Payout) را هم شامل می‌شد. Settlement Rounding به Phase 12 رفته است.

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

- **Status: DECIDED — Option B (Phase 1.5).** رکورد: DR-02. متن زیر Evidence و گزینه‌های اولیه است.

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

- **Status: DECIDED — Option A (Phase 1.5).** رکورد: DR-03. متن زیر Evidence و گزینه‌های اولیه است.
- **Supplement (Phase 2):** نقاط اعمال Rounding در M-04 (DR-05) تثبیت شد. Zero-price After Rounding در Phase 8 بررسی می‌شود.

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

- **Scope (Phase 1.5):** Mellat و ZarinPal تأیید شده‌اند (DR-04). این OD فقط برای COD/Home و Providerهای قدیمی دیگر باز است. Mellat = confirmed. ZarinPal = confirmed. COD/Home = still open. AsanPardakht = still unknown.
- **Context:** `home` و AsanPardakht در DB نامعلوم.
- **Evidence:** U12، U13.
- **Options:**
  1. بدون پرداخت در محل و بدون Provider قدیمی دیگر. فقط Mellat + ZarinPal.
  2. Mellat + ZarinPal + پرداخت در محل.
  3. Mellat + ZarinPal + درگاه قدیمی دیگر (نام مشخص).
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
- **Update (Phase 1.5):** F45 از فهرست خارج شد. ZarinPal در Shanilo جدید وجود دارد (DR-04). فهرست 9 مورد دارد. وضعیت تأیید مالک برای این 9 مورد هنوز باز است. نکته: Evidence نشان می‌دهد F68 و F82 در Legacy Route و Controller فعال دارند و F93 هنوز جاهایی استفاده می‌شود (`open-decisions-review.md`). این سه مورد به تصمیم مالک نیاز دارند.
- **Consequences:** تا تأیید، هیچ‌چیز حذف یا پیاده نمی‌شود. فهرست:
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
- **Needed before:** قبل از حذف یا پیاده‌سازی هر مورد. (متن قبلی «Phase 1» گذشته است. Phase 1 به دستور صریح مالک بدون این تصمیم اجرا شد و هیچ Feature حذف یا پیاده نکرد.)

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
