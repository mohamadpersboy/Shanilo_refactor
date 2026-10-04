# Business Rules

هر Rule از کد واقعی استخراج شده است. پول به **تومان** و Integer است (`showPrice(..., 'تومان')`).

## قیمت

**Rule: قیمت نهایی محصول**
- Source: `ProductDetail::getPurePriceAttribute`, `helpers_general.php` (`subPercent`, `roundPrice`)
- Trigger: هر نمایش قیمت، Cart، Order.
- Condition: `price`، `discount` (درصد، عدد صحیح).
- Action: `pure_price = roundPrice(price - price*discount/100)`.
- `roundPrice`: اگر ≥ 100000 به نزدیک‌ترین 1000 (از 500 به بالا رو به بالا). اگر < 100000 به نزدیک‌ترین 100 (از 50 به بالا رو به بالا).
- Exceptions: `PurePriceTrait` پیاده‌سازی دیگری دارد (گرد کردن به 500/1000). چون Model متد خودش را دارد، Trait اثر ندارد. `contradictions.md`.

**Rule: قیمت Order**
- Source: `CartDetail::total`, `CartDetail::transmit`
- `total = Σ(pure_price × count) + tax + transport_price`.
- `tax = roundPrice(subPercent(total محصولات, TAX))` و `TAX = 0`. پس مالیات همیشه 0 است.
- `order_details.price` = قیمت **بدون** تخفیف. `discount` جدا ذخیره می‌شود.
- `payments.price = total` (سمت Cart، لحظه ساخت Order).

## Cart

**Rule: افزودن به Cart**
- Source: `CartController@toggle`, `Cart::add`
- Trigger: POST toggle.
- Condition: اگر آیتم هست، حذف می‌شود (Toggle). اگر نیست، Property ها اعتبارسنجی می‌شوند (`required|in:` بر اساس ProductProperty). Middleware `shop.middleware` اجرا می‌شود (محتوای آن بررسی نشد).
- Action: `CartDetail` به ازای هر Shop (اولی ساخته می‌شود). `CartDetailProduct` با `properties` (JSON).
- Exceptions: موجودی و `display` بررسی **نمی‌شوند** در افزودن.

**Rule: تغییر تعداد**
- Source: `CartController@updateCount`
- Condition: `count` بین 1 و `productDetail.count` (موجودی فعلی).

**Rule: مراحل ۶‌گانه**
- Source: `CartController@step1..6`
- Step3 نیاز به Cart غیرخالی و Shop غیر از Shop کاربر. در صورت خرید از Shop خودش، CartDetail حذف می‌شود.
- Step4 نیاز به `address_id`. Step5/6 نیاز به `send_type_id`.
- ارسال: `SendType` با `id==1` یعنی ارسال خود فروشگاه. قیمت از pivot `city_shop.price`. اگر فروشگاه به شهر آدرس سرویس ندهد، خطای 422.
- غیر از `id==1`: ارسال پستی. کالای با وزن > 50 مجاز نیست. قیمت با `CartDetail::calculateTransportPrice` و `PostApi`.
- Exceptions: `PostApi::price` شامل `dd(config())` است. هر محاسبه پستی متوقف می‌شود. `current-problems.md`.

**Rule: انقضای Cart**
- Cookie `cart` حدود 2,628,000 دقیقه (≈5 سال). حذف خودکار DB وجود ندارد (Scheduler خالی).
- Cart با ورود کاربر به User متصل نمی‌شود. فقط `cart_id` در Cookie.

## Order

**Rule: ثبت Order**
- Source: `CartDetail::transmit`
- Trigger: شروع پرداخت (قبل از رفتن به بانک).
- Action (Transaction): ساخت Order (`status` پیش‌فرض DB = 1)، OrderDetailها، Payment (`pending`)، حذف CartDetail.
- Exceptions: بررسی موجودی در این مرحله وجود ندارد.

**Rule: تأیید Order (کم کردن موجودی)**
- Source: `Order::confirm`
- Trigger: پرداخت موفق (Mellat verify) یا پرداخت Credit.
- Action (Transaction): برای هر قلم `count -= qty`, `product.sell_count += qty`. ثبت `WalletTransaction` نوع `add` برای Wallet فروشگاه با مبلغ `calculateCheckoutPrice()`.
- Exceptions: بررسی منفی شدن موجودی نیست. `count` می‌تواند منفی شود (ستون signed).

**Rule: مبلغ تسویه فروشنده**
- Source: `Order::calculateCheckoutPrice`
- `roundPrice(subPercent(productsPrice - transport, ADMIN_CHECKOUT_PERCENT, true)) + transport`.
- `transport` فقط وقتی `send_type_id==1` است.
- `ADMIN_CHECKOUT_PERCENT` در `.env.example` برابر 0 است.

**Rule: برگشت Order (Cancel)**
- Source: `Order::disconfirm`, `SendOrderStatusNotification::handle`
- Trigger: وضعیت 0 و `hasAddedWalletTransaction()`.
- Action (Transaction): برای هر قلم `count -= qty` (**کم می‌کند، اضافه نمی‌کند**) و `sell_count -= qty`. `WalletTransaction` نوع `sub`. `users.credit += order.total`.
- Exceptions: `current-problems.md`.

**Rule: Credit بعد از Cancel**
- Source: `OrderController@updateStatus`
- هر Cancel یک `CreditLog` (`increase`) می‌سازد (نوع `customer cancel` یا `shop cancel`).
- افزایش واقعی `users.credit` در Listener و فقط اگر تراکنش `add` وجود دارد.

**Rule: تغییر وضعیت**
- جزئیات در `state-machines.md`.

## Payment

**Rule: درگاه**
- Source: `Mellat*`, `CreditPayment`, `PaymentController`
- `pay_types.class_name` کلاس پرداخت را مشخص می‌کند. `type` ∈ `online`, `home`, `credit`.
- پرداخت Credit: اگر `users.credit >= total` در Transaction: `transmit`، `confirm`، Payment `successful`، `credit -= total`، CreditLog `payment`.
- پرداخت Mellat: Verify موفق → `confirm`, `successful`, `ref_id`. ناموفق → `unsuccessful`, `order.status=0`.
- `home` (پرداخت در محل): `class_name` و رفتار پیدا نشد. UNKNOWN.

**Rule: شارژ Credit**
- Source: `CreditController@store/verify`
- مبلغ بین 10000 و 10000000. Verify: `credit += log.amount/10` (`convertToRial=true`).

## Wallet فروشگاه

**Rule: موجودی Wallet**
- Source: `Wallet::getTotalAttribute`, `getRemoveableAttribute`
- `total = Σadd - Σsub - Σ(checkouts done)`.
- `removeable = total - (add - sub تراکنش‌های 3 روز اخیر که Order وضعیت 1..4 دارد)`.
- یعنی پول Order تا 3 روز یا تا وضعیت 5/0 قابل برداشت نیست.

**Rule: درخواست تسویه فروشنده**
- Source: `Profile/CheckoutController`, `Admin/Specific/CheckoutController`
- مبلغ ≥ 10000 و ≤ `removeable`. یک درخواست `pending` برای هر Wallet.
- Admin وضعیت را به `done` یا `denied` می‌برد. `tracking_code` فقط با `done` ذخیره می‌شود.
- ثبت `done` از Wallet کم می‌کند (از `checkouts()->done()`)، نه از `wallet_transactions`.

## Credit کاربر

**Rule: درخواست برداشت Credit**
- Source: `CreditController@requestCredit`, `RequestCheckoutCredit::boot`
- یک درخواست در حال بررسی برای هر کاربر. مبلغ ≤ `credit`.
- Admin وضعیت را `done` می‌کند. Hook: `credit -= price` و CreditLog `request checkout`.
- Admin نمی‌تواند درخواست `done` را دوباره تغییر دهد.
- Exceptions: بررسی منفی‌نشدن `credit` هنگام `done` وجود ندارد (مبلغ ممکن است بعد از ثبت درخواست خرج شده باشد).

## Product / Shop

**Rule: تأیید محصول**
- محصول جدید `display=0`. Admin `display` را تغییر می‌دهد (`Admin/ProductController@update`).
- Gallery جدید → `display=0` (تأیید مجدد). ویرایش متن/قیمت: `display` تغییر نمی‌کند (بررسی `update` Controller کامل نشد).

**Rule: نمایش**
- `show`: محصول باید `display=1` باشد. `ProductDetail::isConfirmed()` فقط `product.display` را می‌خواند.
- شمارش بازدید: یک Cookie ۱۵ دقیقه‌ای برای هر Product.

**Rule: ProductDetail شاخص**
- یک Detail `index=1` است. `setAsIndex` بقیه را 0 می‌کند.

**Rule: Event موجودی/تخفیف**
- موجودی از 0 به مثبت → `ProductCountChanged`. تغییر `discount` → `ProductHasOff`.
- Listener برای هر `notify_lists` یک `announcements` می‌سازد.

**Rule: حذف**
- `APP_SOFT_DELETES` در env: اگر تنظیم باشد Soft Delete، وگرنه `forceDelete` (ProductDetail).
- حذف Product → حذف ProductDetailها (Soft). حذف ProductDetail → حذف SpecialSell/Suggestion.

## Social

**Rule: نظر**
- Source: `CommentController@store`, `canComment`
- ورود لازم. نظر دهنده نباید صاحب Shop/Product باشد. هر کاربر یک نظر روی هر آیتم.
- `rate` 1..5. نظر مستقیم `confirmed`. پاسخ: `rate=0`.
- حذف: فقط صاحب نظر.
- Rate Product: `ceil(avg(rate))` از نظرهای Parent و confirmed.

**Rule: Follow/Block**
- کاربر خودش را نمی‌تواند Follow/Block کند. Follow ایجاد Announcement می‌سازد.
- Block: ارسال پیام به بلاک‌کننده → `abort(404)` (`inBlockList`).

**Rule: Report**
- هر کاربر یک گزارش برای هر آیتم (`isReportedByAuth`).

## Promotion

**Rule: جایگاه صفحه اول**
- Source: `FirstPageSpecialSellController`, `AddableToFirstPage`, `MellatPayment`, `CreditPayment`
- مالک Product از Plan می‌خرد. `expires_at = now + plan.amount × plan.func`.
- اگر قبلاً در صفحه اول است، 422.
- Payment با `payable` = رکورد FirstPage.

## Auth

- جزئیات `authentication.md`.

## Message

**Rule: ارسال پیام**
- `receiver_sid` باید با `receiver_id` همخوان باشد (`check_hash`). اگر گیرنده فرستنده را Block کرده، 404.
- فایل در Disk `public/message` ذخیره می‌شود.
- Event `MessageSent` → Announcement برای گیرنده.
