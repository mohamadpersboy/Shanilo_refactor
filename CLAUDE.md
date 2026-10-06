# CLAUDE.md — Shanilo

این فایل وضعیت واقعی پروژه و قوانین کار را نگه می‌دارد.
قبل از هر کار، این فایل را بخوان.
بعد از هر تغییر مهم، این فایل را به‌روز کن.

---

## 1. زبان و سبک

- تمام پاسخ‌ها فارسی باشند.
- از ASD-STE100 استفاده کن: جمله کوتاه، دستور مستقیم، واژه ساده.
- گزارش‌ها ساختار مشخص داشته باشند.
- نتیجه هر عملیات واضح باشد.

---

## 2. وضعیت فعلی

| مورد | مقدار |
|---|---|
| Repository | `mohamadpersboy/Shanilo_refactor` |
| Repository Legacy (مرجع) | `mohamadpersboy/shanilo` (کد Legacy Laravel 5.5) |
| Branch | `main` |
| Current Phase | Phase 2 (Owner Approval M-01..M-13 ثبت شد، `docs/scope/open-decisions.md` DR-05). 2A، 2B، 2C و 2D کامل شد. منتظر تأیید برای 2E. ترتیب: 2A→2B→2C→2D→2E با توقف بعد از هر مرحله. |
| محتوای repository | `CLAUDE.md`، `docs/`، و پایه Next.js (`app/`، `src/lib/`، `tests/`). کد Legacy در این repository نیست. |
| کد Next.js | پایه: Shell، `/api/health`، لایه ENV، Errors، Logger. Phase 2A: `src/lib/money` (Money، Currency، Integer arithmetic). Phase 2B: `src/lib/money/rounding.ts` (RoundingPolicy). Phase 2C: `tax.ts`، `pricing.ts`، `snapshot.ts` (TaxPolicy، PriceCalculation، FinancialSnapshot). Phase 2D: `financial-errors.ts`، `idempotency.ts`. Feature کسب‌وکار وجود ندارد. |
| Tests / Build | Scriptها: `lint`, `typecheck`, `test`, `build`. نسخه‌ها: Next 16.3.8، React 19.3.0، TypeScript 6.0.3، ESLint 9.39.5، Vitest 5.0.3. |
| Open Decisions | 15 مورد: 3 DECIDED (OD-01 B، OD-07 B، OD-11 A)، 12 باز. ZarinPal DECIDED. رکوردها: `docs/scope/open-decisions.md` بخش 0. گزارش قدیمی: `docs/scope/open-decisions-review.md` |

**هشدار امنیتی:** repository Legacy (`mohamadpersboy/shanilo`) در عمل public است و Credential بانک داخل آن است. جزئیات در `docs/scope/open-decisions-review.md` (OD-15). مالک باید Repository را private کند و Credential را Rotate کند.

---

## 3. پروژه Legacy (واقعیت‌های بررسی‌شده)

- Framework: `laravel/framework 5.5.*`.
- نسخه PHP در `composer.json`: `>=5.6.4`.
- فایل `.env` وجود ندارد. فقط `.env.example` هست.
- پوشه `vendor` وجود ندارد.
- Frontend Legacy: `assets/admin` و `assets/front`، Laravel Mix، Bootstrap/Sass.
- Viewها: Blade در `resources/views` (`admin`, `auth`, `front`, `emails`, `errors`).
- پکیج‌های مهم در `composer.json`:
  - ACL: `kodeine/laravel-acl`
  - پیام‌رسانی: `musonza/chat`
  - Activity log: `spatie/laravel-activitylog`
  - درگاه پرداخت: `tohidplus/mellat`, `tohidplus/zarrinpal`
  - SMS: `phplusir/smsir`, `leadthread/laravel-sms`, `twilio/sdk`
  - تاریخ شمسی: `morilog/jalali`
- `pbmedia/laravel-ffmpeg` هنوز در `composer.json` هست. Binaryهای ffmpeg حذف شده‌اند. (بخش «مسائل شناخته‌شده» را ببین.)

Legacy فقط منبع شناخت Behavior است. معماری Legacy را کپی نکن.

---

## 4. تاریخچه پاک‌سازی (قبل از اولین commit)

- حجم پروژه از حدود 256 MB به حدود 71 MB رسید.
- حذف شد: `.git` قدیمی، `.DS_Store`, `.psd`, `.map`, zip اضافه، پوشه‌های demo/sample/docs داخل pluginها، pluginهای بدون reference، اسکریپت‌های demo بدون reference در `assets/admin/_js/pages`.
- حذف شد با تأیید کاربر: `ffmpeg`, `ffprobe`, `ckeditor`, `ckfinder` در `assets/admin/_plugins`.
- دلیل حذف ffmpeg: توابع `createVideo` و `createMusic` در `AttachmentTrait` هیچ‌جا صدا زده نمی‌شوند.
- دلیل حذف ckeditor: هیچ view از `data-ckeditor` استفاده نمی‌کند.
- پروژه بعد از پاک‌سازی اجرا نشد. بررسی فقط با خواندن کد انجام شد.

---

## 5. هدف نهایی

بازنویسی کامل (Rewrite، نه Translation) با این stack:

- Next.js 16 (App Router)
- React
- TypeScript
- Tailwind CSS 4
- MongoDB
- Cloudinary

معماری هدف:

```
UI → Server/Client Component → Server Action / Route Handler → Service → Repository → MongoDB
```

Business logic فقط در Service Layer. Database access فقط در Repository Layer.
Secretها فقط server-side.

---

## 6. Roadmap (طبق Master Prompt)

Phase 0 Legacy Reverse Engineering → 0.5 Scope Decisions → 1 Foundation → 2 Architecture & Domain → 3 MongoDB → 4 Auth → 5 Cloudinary → 6 Design System → 7 Storefront → 8 Products → 9 User Dashboard → 10 Shop/Seller → 11 Cart/Checkout/Orders → 12 Payment/Wallet → 13 Social/Messaging/CMS → 14 Admin → 15 Data Migration → 16 Final Verification.

- بعد از هر Phase متوقف شو. Phase بعدی را خودکار شروع نکن.
- کار لازم و خارج از roadmap را به‌عنوان Phase N.5 گزارش کن و تأیید بگیر.

---

## 7. قوانین Workflow

```
READ → UNDERSTAND → INSPECT → PLAN → IMPLEMENT → TEST → UPDATE CLAUDE.md
→ LINT → TYPECHECK → TEST → BUILD → COMMIT → PUSH → VERIFY → REPORT
```

- روی `main` کار کن. Branch جدید نساز، مگر کاربر بگوید.
- Claude خودش commit و push می‌کند.
- Commit email همیشه `persboy.dev@gmail.com`. قبل از commit با `git config user.email` بررسی کن.
- Commit کوچک و منطقی باشد. Message واضح داشته باشد (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).
- قبل از Push اجرا کن: `lint`, `typecheck`, `test`, `build`. اگر یکی fail شد، Push نکن.
- نام scriptها را از `package.json` بخوان. در پروژه Next.js آینده، scriptها باید `lint`, `typecheck`, `test`, `build` باشند.
- بعد از Push، commit را روی remote بررسی کن.
- موفقیت را فقط وقتی گزارش کن که واقعاً انجام شده باشد.

---

## 8. قوانین مهم

- حدس نزن (Do Not Guess). Business rule، Payment، Permission، Order state و Financial rule را حدس نزن. بنویس: Unknown / Evidence needed / Question.
- Feature را بدون گزارش و تأیید حذف نکن.
- Feature جدید را بدون گزارش و تأیید اضافه نکن.
- Model، Service، Utility تکراری نساز. اول بررسی کن.
- Test، Lint یا Type error را پنهان نکن. `any`, `@ts-ignore` فقط با دلیل ثبت‌شده.
- تغییر معماری بدون تأیید ممنوع است. اول گزارش بده: Conflict / Impact / Options / Recommendation.
- داده Production را حذف یا reset نکن.
- Money با float ذخیره نشود. Convention: `Money = {amount: integer, currency: TOMAN}`، `Number.isSafeInteger`. Tax Rate = Integer Basis Points. نوع BSON در Phase 3 تصمیم می‌شود (DR-05).
- Terminology مالی: Checkout = ثبت سفارش مشتری. Settlement = Seller Payable→Seller Wallet. Payout = Wallet→Bank. Checkout را برای برداشت فروشنده استفاده نکن. Payment موفق مستقیم Wallet را افزایش نمی‌دهد.
- Authorization در سمت server. Object-level authorization اجباری است.
- Validation در سمت server.
- Migration داده در پایان پروژه انجام شود. Idempotent و قابل verify باشد.

### اولویت دستورها

1. دستور صریح فعلی کاربر
2. وضعیت واقعی repository
3. CLAUDE.md
4. تصمیم‌های معماری تأییدشده
5. Master Prompt
6. مشخصات Phase فعلی
7. قراردادهای کد موجود

اگر conflict بود، گزارش بده.

---

## 9. امنیت و Secret

- GitHub token را هرگز در کد، `.env`، commit، log یا پاسخ ننویس.
- `.env` و `.env.local` را commit نکن. فقط `.env.example` با placeholder.
- مقدارهای مورد انتظار (فقط نام): `MONGODB_URI`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- Secret را در client bundle، log یا پیام خطا نشان نده.

---

## 10. مسائل شناخته‌شده

- TypeScript 7 و ESLint 10 با `eslint-config-next@16.3.8` سازگار نیستند (peer: `typescript-eslint` نیاز به TS زیر 6.1 و ESLint حداکثر 9 دارد). به همین دلیل TS 6.0.3 و ESLint 9.39.5 pin شده‌اند. بعد از سازگار شدن `eslint-config-next` دوباره بررسی کن.
- `npm audit`: 5 هشدار high در زنجیره Dev (`braces` ← `eslint-config-next`). فقط Dev است. در Runtime تولید نیست. بعد از نسخه جدید `eslint-config-next` دوباره بررسی کن.
- ZarinPal: تصمیم نهایی Mellat + ZarinPal (DR-04). F45 = REDESIGN. تعارض حل شد. ENV فقط Config است. هیچ Provider پیاده نشده.
- نام ENV پیامک `SMSIR_*` است. Master Prompt در مثال `SMS_IR_*` دارد. نام نهایی با تأیید مالک.

- `pbmedia/laravel-ffmpeg` هنوز در `composer.json` است. اگر Legacy اجرا شود، `createVideo` و `createMusic` بدون ffmpeg کار نمی‌کنند. این توابع فعلاً استفاده نمی‌شوند.
- Legacy روی PHP جدید اجرا نمی‌شود. برای اجرا PHP 7.0 تا 7.2 لازم است. این مورد با اجرای واقعی تأیید نشده.
- پروژه Legacy بعد از پاک‌سازی اجرا و تست نشده است.

---

## 11. TODO

- [x] Phase 1.5: تصمیم‌های OD-01 (B)، OD-07 (B)، OD-11 (A)، ZarinPal ثبت و اسناد هماهنگ شد.
- [x] Phase 2 Decision Review: M-01..M-13 توسط مالک تأیید شد. Currency = TOMAN. Phase 2 Readiness: READY.
- [x] Documentation Alignment با Owner Approval.
- [x] Phase 2A (`src/lib/money`: Money، Currency، Integer arithmetic، Safe-integer validation، Tests).
- [x] Phase 2D (Financial Errors، Idempotency Types). Phase 2D completed. جزئیات در بخش 15.
- [x] Phase 2C (TaxPolicy، PriceCalculation، FinancialSnapshot). Phase 2C completed. جزئیات در بخش 14.
- [x] Phase 2B (RoundingPolicy). Phase 2B RoundingPolicy completed. جزئیات در بخش 13. 2E بعد از تأیید.

- [x] Phase 0: Legacy Reverse Engineering (`docs/legacy/`، 25 سند).
- [x] Phase 0.5: Scope & Feature Decisions (`docs/scope/`، 12 سند).
- [x] تصمیم `pbmedia/laravel-ffmpeg`: REMOVE (کد مرده). منتظر تأیید کاربر (OD-14).
- [x] Phase 1: Foundation (Next.js، ENV، Errors، Logger، Health، README).
- [ ] پاسخ کاربر به Open Decisions (`docs/scope/open-decisions.md`، 15 مورد).
- [ ] Master Prompt و Operating Rules را در `docs/` نگه‌داری کن (در صورت تأیید کاربر).

## 12. مستندات تصمیم

- `docs/legacy/`: شناخت Legacy (Phase 0). تغییر نمی‌کند.
- `docs/scope/`: تصمیم Scope (Phase 0.5). شروع از `docs/scope/README.md`.
- تصمیم‌های `OPEN` و `UNKNOWN` را حدس نزن. به `open-decisions.md` رجوع کن.
- Feature با تصمیم REMOVE تا تأیید کاربر (OD-14) حذف یا پیاده نمی‌شود.

## 13. RoundingPolicy (Phase 2B)

Phase 2B RoundingPolicy completed. فایل: `src/lib/money/rounding.ts`. Export از `src/lib/money`.

Rule (منبع حقیقت: ثابت‌های `SMALL_AMOUNT_THRESHOLD`، `SMALL_STEP`، `LARGE_STEP`):

```
< 100,000 TOMAN  → nearest 100 TOMAN
>= 100,000 TOMAN → nearest 1,000 TOMAN
Half-Up
Integer arithmetic
```

- Step از مبلغ قبل از Rounding انتخاب می‌شود. `99,950 → 100,000` (step 100). `100,499 → 100,000` و `100,500 → 101,000` (step 1,000).
- API: `RoundingPolicy { readonly version: string; round(amount: Money): Money }`. نسخه Policy فعلی `legacy-v1` است (`LEGACY_ROUNDING_POLICY_VERSION`، در 2C اضافه شد). `legacyRoundingPolicy`، `roundMoney(amount, policy = legacyRoundingPolicy)`.
- API قبلی:، `legacyRoundingPolicy`، `roundMoney(amount, policy = legacyRoundingPolicy)`.
- فقط `%`، `+`، `-` روی Safe Integer. بدون تقسیم، بدون float، بدون `toFixed`.
- Currency حفظ می‌شود. فقط TOMAN وجود دارد. ورودی دوباره با `money()` اعتبارسنجی می‌شود.
- Overflow: اگر نتیجه از Safe Integer خارج شود، `MoneyError` با کد `MONEY_OVERFLOW`. Error جدید نیست.
- مبلغ منفی (تصمیم فنی 2B، نه قاعده Legacy): Legacy فقط برای قیمت غیرمنفی استفاده می‌شد و نتیجه منفی در آن قابل اتکا نیست. Policy قرینه است: `round(-x) = -round(x)`. Step از `|amount|` انتخاب می‌شود. Tie از صفر دور می‌شود (`-12,350 → -12,400`). `Money` همچنان مقدار منفی را می‌پذیرد.
- Legacy: `roundPrice` در `app/Helpers/helpers_general.php`، فعال از `ProductDetail::getPurePriceAttribute` (OD-11 A). `PurePriceTrait` (500/1000) فعال نیست. خروجی Policy با اجرای واقعی تابع PHP روی 0 تا 300,000 و چند مقدار بزرگ‌تر یکسان بود.
- Phase 2B تصمیم جدیدی درباره BSON، Tax rate، Settlement rounding، Refund یا Payment نگرفت. نقاط اعمال Rounding (M-04) در 2C پیاده شدند.

## 14. TaxPolicy، PriceCalculation، FinancialSnapshot (Phase 2C)

Phase 2C completed. فایل‌ها: `src/lib/money/tax.ts`، `pricing.ts`، `snapshot.ts`. فقط Domain Contract خالص. بدون Product، Order، Cart، Payment، Refund، Credit، Wallet، Payable، Settlement، MongoDB، BSON، API، UI، ENV.

**Tax Rate هنوز OPEN است.** هیچ نرخ و هیچ مقدار پیش‌فرض `enabled` در کد نیست (OD-07 B). Caller نرخ را می‌دهد. نرخ Legacy (`TAX = 0`) فقط Evidence تاریخی است. نرخ‌هایی مثل 1000 در تست‌ها فقط داده تست هستند.

- `TaxPolicy = { enabled, rateBps }`. Rate = Integer Basis Points (1000 = 10%). `taxPolicy(enabled, rateBps)` نامعتبر را reject می‌کند: `rateBps` باید integer و بین 0 تا 10000 باشد. `enabled = false` یعنی tax = 0 (rate اعتبارسنجی و نگه‌داری می‌شود).
- Tax: `taxRaw = floor(subtotal × rateBps / 10000)` با BigInt داخلی (فقط داخل تابع). سپس `RoundingPolicy.round(taxRaw)`. همان Policy قیمت. Floor قبل از Rounding نتیجه را عوض نمی‌کند، چون Tieها integer هستند. Subtotal منفی reject می‌شود.
- Line (M-04): `unit = floor(price × (100 − discountPercent) / 100)`، `finalUnitPrice = round(unit)`، `lineTotal = finalUnitPrice × quantity`. `discountPercent` = integer 0 تا 100 (مثل Legacy). `quantity` = integer مثبت. Overflow با `MONEY_OVERFLOW`.
- Price: `subtotal = Σ lineTotal` (بدون Rounding مجدد). `total = subtotal + tax + shipping` (بدون Rounding مجدد). Shipping یک Money مستقل است و گرد نمی‌شود.
- Discount (اصلاح 2C): FinancialSnapshot.discount represents the actual discount before rounding. Rounding differences are not represented as discount. `discount = Σ(unitPrice × quantity) − Σ(discountedUnitPrice × quantity)` که `discountedUnitPrice = floor(unitPrice × (100 − percent) / 100)` قبل از Rounding است (`PriceLine.discountedUnitPrice`). همیشه `discount >= 0`. سه مقدار جدا هستند: gross، discount و roundedFinal (`finalUnitPrice`). `subtotal` ممکن است به دلیل Rounding با `gross − discount` برابر نباشد و این عمداً مجاز است. Tax و Shipping وارد discount نمی‌شوند. `createFinancialSnapshot` مقدار discount را دوباره از `unitPrice` و `discountPercent` بررسی می‌کند.
- Error: فقط `MoneyError`. ورودی نامعتبر (rate، quantity، percent، مقدار منفی) با `MONEY_INVALID_AMOUNT` می‌آید. Phase 2D ممکن است آن را زیر Financial Errors دسته‌بندی کند.
- `FinancialSnapshot` (immutable، عمیقاً frozen، فقط مقدار): `currency`، `lines[]` (`unitPrice`، `discountPercent`، `finalUnitPrice`، `quantity`، `lineTotal`)، `subtotal`، `discount`، `tax`، `shipping`، `total`، `paidAmount`، `policy` (`taxEnabled`، `taxRateBps`، `roundingPolicyVersion`، `currency`). `createFinancialSnapshot(calculation, paidAmount = 0)` کپی می‌کند و سازگاری را دوباره چک می‌کند. `paidAmount` بین 0 و `total` است.
- `paymentAmount(snapshot) = snapshot.total` (M-06).
- `refundedAmount` در Snapshot نیست. آن State قابل تغییر مالی است و طراحی Refund در Phaseهای بعد می‌آید. Seller Payable، Wallet و Settlement در Phase 12 هستند. Payment موفق Wallet را مستقیم افزایش نمی‌دهد.
- Settlement Rounding (Phase 12)، Zero-price after Rounding (Phase 8) و نوع BSON (Phase 3) تصمیم گرفته نشدند.
- Legacy: `Cart::getTaxAttribute` = `roundPrice(subPercent(total, TAX=0))`. `CartDetail::total` = Σ `pure_price × count` + tax + transport. Shipping در Legacy گرد می‌شود (`roundPrice`). در Shanilo جدید Shipping گرد نمی‌شود (M-04). این یک تغییر آگاهانه است.

## 15. Financial Errors و Idempotency Types (Phase 2D)

Phase 2D completed. فقط Type، Error و Pure Helper. بدون Persistence، MongoDB، Transaction، Service، Provider، API، ENV.

**Financial Errors** (`src/lib/money/financial-errors.ts`):

- `FinancialError extends AppError`. `MoneyError` حالا از `FinancialError` ارث می‌برد. نام، `moneyCode`، Codeهای قبلی و status 500 آن تغییر نکرد. Hierarchy تکراری ساخته نشد.
- `message` پیام عمومی و ثابت هر کلاس است. جزئیات داخلی فقط در `internalDetail` است و نباید در Response بیاید. `toErrorResponse` فقط `code` و `message` را برمی‌گرداند.
- Codeها (stable، در `FINANCIAL_ERROR_CODES`): `FINANCIAL_STATE_CONFLICT` (409)، `FINANCIAL_INSUFFICIENT_FUNDS` (422)، `FINANCIAL_OPERATION_CONFLICT` (409)، `IDEMPOTENCY_CONFLICT` (409). Status فقط راهنمای Mapping آینده است. Domain به HTTP وابسته نیست.
- Invalid Financial Input قبلاً با `MoneyError` پوشش داده شده (`MONEY_INVALID_AMOUNT`، `MONEY_OVERFLOW`، `MONEY_CURRENCY_MISMATCH`، `MONEY_INVALID_CURRENCY`). تکرار نشد. ورودی نامعتبر Operation ID یا Hash با `ValidationError` (400) رد می‌شود.
- State Conflict و Insufficient Funds فقط Contract هستند. State machine، Credit و Wallet ساخته نشد.
- Operation Conflict (دو Operation با هم تعارض دارند) از Idempotency Conflict (همان ID با Payload دیگر) جداست.

**Idempotency** (`src/lib/money/idempotency.ts`):

- `BusinessOperationId` و `OperationPayloadHash`: String مبهم (opaque) و Branded. غیرخالی، بدون Whitespace-only، حداکثر 255 کاراکتر (حد فنی). UUID لازم نیست. مقدار بدون تغییر نگه داشته می‌شود و با String equality مقایسه می‌شود. با `OrderId`، `PaymentId`، `RefundId`، `SettlementId`، `PayoutId` یکی نیست.
- `OperationStatus` = `PENDING | SUCCEEDED | FAILED` (Lifecycle). `FAILED` Terminal فرض نشده. Retry Policy مال Service آینده است.
- `IdempotencyRecord` = `{operationId, payloadHash, status}`. `IdempotentOperation<TPayload>` = `{operationId, payloadHash, payload}`. هر دو frozen.
- `IdempotencyOutcome` (نتیجه Request، جدا از Status): `NEW` (Record نیست)، `IN_PROGRESS` (همان ID و Hash، Status = PENDING)، `REPLAYED` (همان ID و Hash، Status = SUCCEEDED یا FAILED. دوباره اجرا نکن. `record.status` را ببین)، `CONFLICT` (همان ID، Hash دیگر).
- `classifyIdempotentRequest(request, existing?)` تابع خالص است. `assertNoIdempotencyConflict` برای CONFLICT خطای `IDEMPOTENCY_CONFLICT` می‌اندازد.
- Hash محاسبه نمی‌شود و Payload مقایسه عمیق نمی‌شود.
- هنوز OPEN: Operation ID دقیق Settlement و Payment (`settlement:{orderId}` فرض نمی‌شود)، Storage Model در MongoDB، Schema و Index برای Idempotency، Retention/TTL، Retry Policy، Keyهای مخصوص Gateway، Provider پرداخت. Atomic State Transition و Transaction در Phase 3 و بعد از آن طراحی می‌شوند (M-12، M-13).

## 16. Next Phase

Phase 2E — PaymentProvider Contracts (منتظر دستور کاربر). به 2E خودکار وارد نشو. جزئیات: `docs/scope/open-decisions.md` بخش DR-05 و «Phase 2 Readiness Review». اگر Conflict جدید پیدا شد، قبل از تغییر معماری Decision Review بده.
