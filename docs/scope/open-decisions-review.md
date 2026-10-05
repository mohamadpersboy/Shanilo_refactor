# Open Decisions Review

> **سند تاریخی (2026-10-04).** تصمیم‌های بعدی در `open-decisions.md` (DR-01..DR-05) ثبت شده‌اند. در تعارض، `open-decisions.md` معتبر است.

تاریخ: 2026-10-04. نوع کار: READ → INSPECT → ANALYZE → RECOMMEND → REPORT. هیچ کدی تغییر نکرد. هیچ Secret در این سند نیست. فقط وضعیت `SECRET PRESENT` / `PLACEHOLDER` / `NOT FOUND` ثبت شده است.

مبنا: repository Legacy `mohamadpersboy/shanilo`، commit `53100cd`، branch `main`. Legacy اجرا نشد. همه یافته‌ها از خواندن کد و `grep` آمده‌اند. تصمیم‌ها هنوز ثبت نشده‌اند. مالک تصمیم می‌گیرد.

## Repository State

| مورد | مقدار |
|---|---|
| Repository Legacy | `mohamadpersboy/shanilo` / `main` |
| Commit | `53100cd` (4 commit. `.git` قدیمی قبل از import حذف شده بود.) |
| محتوا | Legacy Laravel 5.5. بدون `vendor`، بدون `.env`، بدون Next.js. |
| Master Prompt و Operating Rules | در Project هستند، نه در Repository. |

**هشدار فوری:** Repository Legacy در عمل public است. `CLAUDE.md` قبلی می‌گفت `private`. Clone بدون Credential موفق شد. فایل `config/mellat.php` با Credential بانک از اولین commit داخل آن است.

> **به‌روزرسانی Phase 1.5 (2026-10-05):** این گزارش تاریخی است. OD-01 (B)، OD-07 (B)، OD-11 (A) و ZarinPal (Mellat + ZarinPal) تصمیم شدند. رکوردها در `open-decisions.md` بخش 0 هستند. توصیه «F45 REMOVE» و «OD-12: فقط Mellat» در این گزارش منسوخ است. F45 اکنون REDESIGN است. فهرست OD-14 اکنون 9 مورد دارد.

## Executive Summary

1. هیچ Blocker فنی برای Phase 1 نیست. دو کار فوری امنیتی مستقل از Phase هست: OD-15 و F97 (`getProductByKey`).
2. OD-01، OD-07 و OD-11 باید قبل از Phase 2 جواب بگیرند.
3. OD-10 قبل از Phase 3 لازم است. داده‌های مرجع (استان، شهر، رنگ، `pay_types`) در Migrationها نیستند.
4. چند سند Phase 0/0.5 با کد اختلاف دارد (بخش‌های OD-04، OD-05، OD-09، OD-14، OD-15).
5. سه یافته امنیتی جدید در `Profile/ProductController@update`: بدون بررسی مالکیت، `display` از Client، `shop_id` از Client.

## OD-01 — مدل پول

### Evidence
`Order.php:104-125` (`disconfirm`)، `CreditPayment.php`، `Wallet.php`، `Profile/CreditController.php`. `users.credit` و `orders.total` از نوع unsigned int هستند. `credit_log` از نوع double است. `requests_checkout_credit` از نوع float است. `check_outs` از نوع string است.

### Legacy Behavior
- Wallet فروشگاه یک دفتر `add`/`sub` است. موجودی از جمع آن محاسبه می‌شود.
- Credit مشتری یک عدد روی `users.credit` است.
- لغو Order: `credit += order.total`. از Wallet فقط `calculateCheckoutPrice()` کم می‌شود. این دو مبلغ برابر نیستند. اگر کمیسیون صفر نباشد، اختلاف را پلتفرم می‌دهد.
- با کمیسیون صفر هم اختلاف ممکن است. `roundPrice` دوباره روی جمع محصولات اعمال می‌شود. مثال: جمع 100,500 تومان به 101,000 گرد می‌شود. این را با دست از کد درآوردم و اجرا نکردم.

### Options
1. یک دفتر برای همه.
2. Wallet فروشنده جدا از Credit مشتری (مثل Legacy).
3. برگشت وجه به کارت.

### Analysis
- گزینه 3 یک قاعده بانکی جدید می‌سازد. Legacy Refund بانکی ندارد (B6).
- گزینه 1 پول فروشگاه و پول مشتری را یکی می‌کند. یک کاربر می‌تواند چند فروشگاه داشته باشد. برای Escrow و Hold در Marketplace آینده مناسب نیست.
- گزینه 2 به Legacy نزدیک است. دو دفتر append-only با یک Money convention.
- **تناقض در اسناد:** `mvp-scope.md` Credit را از MVP بیرون می‌گذارد. ولی F39 (لغو و Refund) در MVP است. اگر Refund به Credit برود و پرداخت با Credit (F47) در MVP نباشد، مشتری وجه برگشتی را نمی‌تواند خرج کند.

### Recommendation
گزینه 2. دو دفتر append-only، هر ورودی با `orderId`، کلید Idempotency و Snapshot. با گزینه 1 یا 2، F47 هم باید وارد MVP شود. تصمیم با مالک است.

### Status
`DECIDE BEFORE PHASE 2`

## OD-02 — کمیسیون پلتفرم

### Evidence
`Order.php:144`: `env('ADMIN_CHECKOUT_PERCENT')` بدون مقدار پیش‌فرض. `.env.example:51`: مقدار 0. `subPercent` مقدار را به int تبدیل می‌کند.

### Legacy Behavior
درصد فقط روی قیمت کالا اعمال می‌شود. هزینه ارسال کامل به فروشنده می‌رسد.

### Analysis
- صفر درصد Business Rule نیست. فقط مقدار Configuration در `.env.example` است.
- مقدار Production **UNKNOWN**. `.env` Production نیست.
- مبلغ سابقه مالی در `WalletTransaction.price` ذخیره شده است. Migration به مقدار قدیمی نیاز ندارد.

### Recommendation
درصد قابل تنظیم (F53). مقدار اولیه را مالک می‌گوید. درصد هر فروش داخل Order Snapshot ثبت شود.

### Status
`DECIDE BEFORE PHASE 12`

## OD-03 — تسویه فروشنده

### Evidence
`WalletTransaction.php:11` (`ALLOW_CHECKOUT_AFTER_DAYS = 3`)، `WalletTransaction.php:40-46` (scope `waitForCheckout`)، `Profile/CheckoutController.php` (`min:10000`، یک درخواست `pending` برای هر Wallet، `price ≤ removeable`).

### Legacy Behavior
- پول Order بسته می‌ماند اگر دو شرط برقرار باشد: کمتر از 3 روز گذشته و وضعیت Order بین 1 تا 4.
- بعد از 3 روز پول آزاد می‌شود، حتی اگر کالا هنوز نرسیده (وضعیت 4).
- وضعیت 5 (دریافت) پول را فوراً آزاد می‌کند.

### Options
1. تسویه در MVP با مقدارهای Legacy.
2. تسویه بعد از MVP، پرداخت خارج از سیستم.
3. تسویه در MVP با مقدار جدید.

### Analysis
- گزینه 2 فروشنده را بدون ابزار برداشت می‌گذارد. دفتر Wallet (F50) باز هم در MVP هست.
- Phase 2 و 3 باید ورودی دفتر را append-only با `orderId` و `createdAt` نگه دارند. آن‌گاه Hold بعداً از همین فیلدها محاسبه می‌شود.
- Phase 12 و 14 به انتخاب گزینه بستگی دارند. Phase 11 فقط ثبت ورودی دفتر را لازم دارد.

### Recommendation
گزینه 1. BR-26 قبلاً Preserve است و Legacy آن را Feature فعال می‌داند.

### Status
`DECIDE BEFORE PHASE 12`

## OD-04 — Social / Messaging / Timeline

### Evidence
`TimelineController.php`، `UserPageController.php`، `Front/Specific/MessageController.php`، `Admin/Base/ChatController.php`، `routes/front/specific.php`.

### Legacy Behavior

| Feature | وضعیت | Evidence |
|---|---|---|
| Follow (`followers`) | فعال | `User::followers/following`، `toggleFollow` |
| Block | فعال | `toggleBlock`. فقط روی پیام و Share اثر دارد. |
| Messaging (`messages`) | فعال | `Front/Specific/MessageController` |
| Timeline | فعال، منطق واقعی | محصول، پیشنهاد ویژه، پیشنهاد دوستان، فروش ویژه و مقاله از فروشگاه/کاربران دنبال‌شده |
| `follows` (جدول) | کد مرده | `Base/Follow` هیچ استفاده‌ای ندارد |
| Musonza Chat | فقط Admin | بخش OD-14 |

### Analysis
- **اختلاف با سند:** `feature-decisions.md` (F63) می‌گوید Timeline «فقط Route» است. این درست نیست.
- Timeline به Follow، به پیشنهاد/فروش ویژه (OD-08) و به Article وابسته است.
- گزینه 1 و 2 Timeline را حذف می‌کنند. دلیل حذف پیچیدگی است، نه کد مرده.
- ضعف امنیتی Messaging: فایل پیوست بدون Validation روی Disk public ذخیره می‌شود. `GET /download` (S4) هر فایل را می‌دهد.

### Recommendation
گزینه 3. همه Post-MVP. چیزی حذف نشود. Timeline در گروه Follow قرار گیرد.

### Status
`DECIDE BEFORE PHASE 13`

## OD-05 — تأیید فروشگاه و محصول

### Evidence
`Profile/ProductController.php` (`store`، `update`، `uploadGalleryImage`)، `Profile/ProductDetailController.php` (`update`)، `Admin/Specific/ProductController.php:53`، `Product.php:22-32` (`$fillable`)، `Admin/Specific/ShopController.php`، `ShopGrid.php`.

### Legacy Behavior
- `store` همیشه `display=0` می‌گذارد.
- Admin فقط `display` را 0/1 می‌کند. حالت Rejected نیست.
- Shop: تأیید Admin ندارد. در `Admin/Specific/ShopController` و `ShopGrid` هیچ تغییر `display` پیدا نشد. این یافته U17 را بسته می‌کند.
- ویرایش متن، قیمت و موجودی (`ProductDetail`) `display` را تغییر نمی‌دهد. BR-03 که «Unknown» بود، الان Evidence دارد.
- فقط آپلود Gallery `display=0` می‌کند. تغییر عکس اصلی تأیید مجدد نمی‌خواهد. BR-02 اشتباه نوشته شده.

### Analysis (امنیت Marketplace)
- **ثغره: دور زدن تأیید Admin.** `update()` همه فیلدها را با `$product->update($request->all())` می‌نویسد. `display` در `$fillable` است. `ProductRequest` فیلد اضافه را رد نمی‌کند. فروشنده با `display=1` در PATCH محصول را خودش منتشر می‌کند. `sell_count` و `views` هم قابل جعل هستند.
- **ثغره: بدون بررسی مالکیت.** `update()` برخلاف `edit/destroy` فراخوانی `canEditProduct` ندارد. `ProductRequest` فقط `shop_id` درخواست را با فروشگاه‌های کاربر مقایسه می‌کند، نه با Product مسیر. هر کاربر ورودشده می‌تواند Product دیگری را ویرایش کند و آن را به فروشگاه خود منتقل کند. این‌ها را از خواندن کد درآوردم و اجرا نکردم.
- Phase 8 و 10 باید این دو مورد را با تست امنیتی پوشش دهند: Whitelist فیلد و Object-level authorization.

### Options
1. فروشگاه با تأیید Admin، ویرایش مهم با تأیید مجدد.
2. فروشگاه فوری، ویرایش مهم با تأیید مجدد.
3. فروشگاه فوری، ویرایش بدون تأیید مجدد (Legacy).

### Recommendation
گزینه 2. رفتار فروشگاه مثل Legacy می‌ماند. محصول تأیید می‌شود (BR-01). با گزینه 3 فروشنده بعد از تأیید می‌تواند عنوان، توضیح و عکس را عوض کند. مالک باید «ویرایش مهم» را تعریف کند.

### Status
`DECIDE BEFORE PHASE 8`

## OD-06 — ارسال پستی

### Evidence
`PostApi.php:36`: `dd(config())` قبل از `return`. `CartDetail.php:84-94`: مسیر `PostApi` وقتی `sendType->id != 1`.

### Legacy Behavior
مسیر پستی هیچ‌وقت خروجی نمی‌دهد. `PostApi` تماس HTTP ندارد. الگوریتم وزن و جدول محلی است.

### Analysis
MVP قبلاً فقط ارسال فروشگاه دارد (F33). ID عددی 1 نباید در کد جدید بماند.

### Recommendation
گزینه 1. ارسال پستی بعد از MVP.

### Status
`CAN DEFER` — تا قبل از Phase 11.

## OD-07 — مالیات

### Evidence
`CartDetail.php:13`: `const TAX=0`.

### Analysis
مالیات همیشه 0 است. نیاز قانونی از کد معلوم نمی‌شود. این سؤال حقوقی و حسابداری است. فرمول BR-13 باید در Phase 2 نهایی شود.

### Recommendation
از حسابدار بپرسید. بدون جواب، گزینه 1 (بدون مالیات) با فیلد `tax` صریح و صفر.

### Status
`DECIDE BEFORE PHASE 2`

## OD-08 — جایگاه پولی و Advertisement

### Evidence
`MellatPayment`: `Mellat::set($plan->price)` در یک مسیر و `Mellat::set(100)` در مسیر دیگر. `CreditPayment.php:67-85`: هر دو مسیر `$plan->price` را از Credit کم می‌کنند. `routes/front/base.php:88-98`، `AdvertisementController`.

### Legacy Behavior
«فروش ویژه» با Mellat مبلغ ثابت 100 می‌دهد. با Credit مبلغ `plan.price` می‌دهد. Advertisement فقط ثبت درخواست است (U22).

### Recommendation
گزینه 3. بعد از MVP دوباره بررسی شود. چیزی حذف نشود. قیمت را مالک بدهد.

### Status
`DECIDE BEFORE PHASE 13`

## OD-09 — قواعد نظر

### Evidence
`Front/Specific/CommentController.php` (`store` و `reply` با `confirmed`)، `Profile/CommentController.php:50` (`update` با `status='pending'`)، `Admin/Base/SwitchController.php`.

### Legacy Behavior
- نظر جدید و پاسخ فوراً `confirmed` می‌شوند.
- **ویرایش نظر آن را به `pending` برمی‌گرداند.** پس صف `pending` در Legacy پر می‌شود. سند و U16 این را ثبت نکرده‌اند.
- Admin می‌تواند هر نظر را `pending` یا `confirmed` کند.
- مخفی بودن نظر `pending` در صفحه محصول بررسی نشد.

### Recommendation
گزینه 2. نزدیک‌ترین به Legacy. گزینه 3 (فقط خریدار) قاعده جدید است.

### Status
`DECIDE BEFORE PHASE 13`

## OD-10 — داده Production

### Evidence
هیچ DB dump یا `.sql` نیست. Migrationها `insert` ندارند. `DatabaseSeeder` فقط یک Admin می‌سازد. Migration `requests_checkout_credit` مقدار `auto_increment = 13990001` دارد. آخرین Migration مال سال 2021 است. این فقط نشانه ضعیف استفاده واقعی است.

### Analysis
حتی اگر داده کاربر نباشد، داده مرجع (استان، شهر، رنگ، `pay_types`، `send_types`، مشخصات فنی) فقط در DB واقعی است. U5 و U10 فقط با DB حل می‌شوند.

### Recommendation
اول از مالک بپرسید.

### Status
`PRODUCTION EVIDENCE REQUIRED`

## OD-11 — گردکردن قیمت

### Evidence
`ProductDetail.php:116-120` (`getPurePriceAttribute`)، `helpers_general.php:259-275` (`roundPrice`)، `ProductDetail.php:18` (`use PurePriceTrait`).

### Legacy Behavior
متد Model بر متد Trait غالب است. قاعده Model فعال است. با آن، قیمت زیر 50 تومان به صفر می‌رسد (از خواندن کد). گرد دوباره روی جمع محصولات اختلاف می‌سازد (OD-01).

### Recommendation
گزینه 1. گرد فقط یک بار روی قیمت هر قلم. Total دوباره گرد نشود. قیمت صفر خطای Validation باشد. اختلاف با Legacy تا 500 تومان در سهم فروشنده ممکن است.

### Status
`DECIDE BEFORE PHASE 2`

## OD-12 — پرداخت در محل و درگاه‌ها

### Evidence
`pay_types.type` شامل `home` است. پوشه `app/Http/Helpers/Payment`: Mellat، AsanPardakht، Credit و دو فایل پایه. کلاس `home` نیست. `PaymentController::pay` کلاس را از DB می‌خواند. `tohidplus/zarrinpal` هیچ استفاده‌ای ندارد.

### Analysis
پرداخت در محل در کد پیاده نشده است. وجود ردیف در DB معلوم نیست. AsanPardakht کلاس دارد. فعال بودن آن در DB معلوم نیست.

### Recommendation
گزینه 1. فقط Mellat (F43). **منسوخ (Phase 1.5):** Mellat + ZarinPal تأیید شد. COD و Providerهای قدیمی باز مانده‌اند.

### Status
`DECIDE BEFORE PHASE 12`

## OD-13 — Featureهای UNKNOWN

### Analysis
- U28 (نقشه) تا حدی حل شد. در 5 view کلیدی با شکل Google API Key پیدا شد. سرویس نقشه احتمالاً Google Maps است.
- CMS: ثبت‌نام `agreement` می‌خواهد. متن قوانین باید در Phase 4 و 7 موجود باشد (G7).
- بقیه با DB و مالک روشن می‌شوند.

### Recommendation
گزینه 2. هر مورد در Phase خودش با Evidence Production. فقط قوانین سایت زودتر لازم است.

### Status
`PRODUCTION EVIDENCE REQUIRED`

## OD-14 — فهرست REMOVE

| Feature | Evidence | Dead code؟ | Recommendation |
|---|---|---|---|
| F45 ZarinPal | فقط در `composer.json` (Legacy) | کد Legacy بله | **منسوخ.** Phase 1.5: REDESIGN. ZarinPal در Shanilo جدید وجود دارد (Master Prompt §19). |
| F61 `follows` | `Base/Follow` بدون استفاده. فقط Migration. | بله | REMOVE. با `followers` اشتباه نشود. |
| F68 Musonza Chat | `Admin/Base/ChatController` (148 خط)، Route، لینک sidebar، View، Provider در `config/app.php` | نه | PRODUCTION EVIDENCE REQUIRED. در OD-04 تصمیم بگیرید. |
| F82 Calendar/Week/Member/Education | Route، Controller و sidebar دارند. ارتباط با Marketplace ندارند. | فنی نه | REMOVE از Scope جدید با تأیید مالک. جدول‌ها را در DB بررسی کنید. |
| F89 ffmpeg | `createVideo/createMusic` بدون Caller. Provider و Alias هنوز در `config/app.php`. | بله | REMOVE. حذف از Legacy لازم نیست. |
| F93 `Base/*` | `Base/Payment` در Admin Inventory/Statistic/Factor و Front HomeController. `Base/Announcement` در Listener فعال. `Base/Article` و `Base/Slider` هم استفاده می‌شوند. | نه | «تکراری» درست است، «بلااستفاده» غلط. در Rewrite منتقل نشوند. به F83 وصل هستند. |
| F94 SMS Provider | فقط `use Plivo\Message` بلااستفاده و `config/sms.php` | بله | REMOVE |
| F95 `ProductAdded` | Import در `ProductDetailController`. هیچ `event(new ProductAdded)` نیست. | بله | REMOVE |
| F96 Vue | `app.js` بسته را می‌سازد. در views هیچ ارجاع یا syntax Vue پیدا نشد. | بله (با `grep`) | REMOVE |
| F97 `getProductByKey` | بخش زیر | مخرب | REMOVE فوری |

**بررسی ویژه F97:**
- مسیر: `GET products/{id}/get` (`routes/front/specific.php:146`). بدون Auth.
- `ProductController@getByKey` (خط 65-68) شرط `Hash::check($id, File::get(storage/logs/key.txt))` را چک می‌کند.
- اگر درست بود، `getProductByKey` اجرا می‌شود (`helpers_general.php:253-256`) و `File::deleteDirectory(base_path('app/Http'))` را اجرا می‌کند.
- کسی که کلید را دارد، می‌تواند از راه دور Controllerها، Middlewareها و Helperهای Legacy را روی سرور پاک کند.
- `key.txt` در Git نیست. اگر فایل روی سرور نباشد، `File::get` خطا می‌دهد و چیزی پاک نمی‌شود.
- در `app/routes/config/bootstrap/database` الگوی مخرب دیگری پیدا نشد. `views`، `public` و `vendor` اسکن نشدند.
- اگر Legacy روی سرور فعال است، بررسی کنید: وجود `storage/logs/key.txt`، دارنده کلید، log وب‌سرور برای `/products/*/get`، سلامت `app/Http`.
- پیشنهاد: Route را روی وب‌سرور ببندید. `key.txt` را پاک کنید. Backup بگیرید.

**اختلاف:** `open-decisions.md` حذف F68 و F93 را «کد مرده/تکراری» می‌داند. Evidence این دو را کامل پشتیبانی نمی‌کند. پیشنهاد: 7 مورد روشن تأیید شود. F68، F82 و F93 تا Evidence بیشتر نگه داشته شوند.

### Status
`DECIDE NOW`

## OD-15 — Credential افشاشده

| Credential | مکان | نتیجه |
|---|---|---|
| Mellat (`terminalId`، `username`، `password`) | `config/mellat.php` | SECRET PRESENT. از اولین commit هست. |
| رمز Admin در Seeder | `database/seeds/DatabaseSeeder.php` | SECRET PRESENT |
| SMS.ir (`SMSIR-*`) | `.env.example` | PLACEHOLDER (روش حدسی: مقدار شامل واژه‌هایی مثل «your» و «key» است) |
| SMTP (`MAIL_USERNAME`، `MAIL_PASSWORD`) | `.env.example`، خط‌های کامنت‌شده | SECRET PRESENT (مشکوک). مقدار placeholder نیست. در سندهای قبلی نیست. |
| Google Maps API Key | 5 فایل Blade | SECRET PRESENT (شکل `AIza…`). در سندهای قبلی نیست. |
| Pusher، DB، `APP_KEY` | `.env.example` | NOT FOUND (خالی یا placeholder) |
| GitHub Token | Project instructions در claude.ai | SECRET PRESENT. در Repository نیست. |

- ریسک Production: Credential بانک در Repository public است. فقط مالک می‌تواند Rotate کند.
- محدودیت: Git history فقط 4 commit دارد. تاریخچه قدیمی Legacy بررسی نشد.

### Status
`DECIDE NOW`

## Dependency Map

```
OD-15 ── (مستقل از Phase) ── Repository public + Credential
OD-14 ── F97 فوری (امنیت). بقیه قبل از Phase اجرای هر Feature.

OD-01 ──┬── Phase 2 (Money / Domain)
        ├── Phase 11 (لغو و Refund)
        └── Phase 12
OD-07 ──── Phase 2 (فرمول مبلغ)
OD-11 ──── Phase 2 (Money)

OD-10 ──┬── Phase 3 (Schema و داده مرجع)
        └── Phase 15

OD-05 ──┬── Phase 8 (وضعیت محصول)
        └── Phase 10 (وضعیت فروشگاه)

OD-02 ──┬── Phase 12
OD-03 ──┤   (دفتر append-only از Phase 2/3)
OD-12 ──┘

OD-06 ──── Phase 11 (CAN DEFER)
OD-04, OD-08, OD-09, OD-13 ──── Phase 13
```

## Blocking Decisions

| Decision | Recommendation | Status | Blocking Phase |
|---|---|---|---|
| OD-01 | گزینه 2 + F47 در MVP | **DECIDED: B (Phase 1.5).** F47 تصمیم نشده. | — |
| OD-02 | درصد قابل تنظیم. مقدار با مالک. | DECIDE BEFORE PHASE 12 | Phase 12 |
| OD-03 | گزینه 1 | DECIDE BEFORE PHASE 12 | Phase 12 |
| OD-04 | گزینه 3 | DECIDE BEFORE PHASE 13 | Phase 13 |
| OD-05 | گزینه 2 | DECIDE BEFORE PHASE 8 | Phase 8 |
| OD-06 | گزینه 1 | CAN DEFER | Phase 11 |
| OD-07 | سؤال از حسابدار | **DECIDED: B (Phase 1.5).** نرخ نامشخص. | — |
| OD-08 | گزینه 3 | DECIDE BEFORE PHASE 13 | Phase 13 |
| OD-09 | گزینه 2 | DECIDE BEFORE PHASE 13 | Phase 13 |
| OD-10 | بپرسید: DB هست؟ | PRODUCTION EVIDENCE REQUIRED | Phase 3 |
| OD-11 | گزینه 1 | **DECIDED: A (Phase 1.5).** | — |
| OD-12 | منسوخ. فقط COD/Provider قدیمی باز است. | DECIDE BEFORE PHASE 12 | Phase 12 |
| OD-13 | گزینه 2 | PRODUCTION EVIDENCE REQUIRED | Phase 13 |
| OD-14 | 6 مورد تأیید (F45 خارج شد). F68/F82/F93 نگه‌داشته. | DECIDE (قبل از حذف هر مورد) | — |
| OD-15 | Rotate + private کردن | DECIDE NOW | قبل از Production |

## Questions For User

تصمیم‌ها ثبت نشده‌اند. پاسخ مالک لازم است.

```
1) Repo: Private / فعلاً Public
2) Mellat: معتبر / نامعتبر / نمی‌دانم
3) Legacy Server: فعال / غیرفعال / نمی‌دانم
4) OD-01: A / B / C       (A: یک دفتر. B: Wallet فروشنده + Credit مشتری. C: Refund به کارت)
5) OD-07: A / B + درصد    (A: بدون مالیات. B: با مالیات)
6) OD-11: A / B / C       (A: قاعده فعال Legacy. B: بدون گردکردن. C: قاعده Trait)
7) OD-10: A / B / C       (A: DB و فایل‌ها هست. B: داده‌ای نیست. C: بعداً)
8) OD-05: A / B / C       (A: فروشگاه با تأیید Admin. B: فروشگاه فوری + ویرایش مهم با تأیید مجدد. C: مثل Legacy)
9) OD-14: 6 مورد (F61، F89، F94، F95، F96، F97) تأیید / نه. (F45 خارج شد: Phase 1.5) F68، F82، F93 فعلاً نگه‌داشته شود: بله / نه
```

سؤال‌های بعدی (Phase 12 و 13): OD-02، OD-03، OD-12، OD-04، OD-08، OD-09، OD-13.

## Recommended Next Step

1. Repository Legacy را private کنید. Credential Mellat را Rotate کنید. `key.txt` را روی سرور بررسی کنید.
2. به سؤال‌های 1 تا 9 جواب بدهید.
3. بعد از جواب، Decision Record نوشته می‌شود و Scope دقیق Phase 1 تعیین می‌شود.
4. Phase 1 خودکار شروع نمی‌شود.
