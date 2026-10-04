# Current Problems

فقط شناسایی. هیچ‌کدام اصلاح نشده‌اند.
علامت: `CONFIRMED` (در کد دیده شد)، `PLAUSIBLE` (احتمالی، اجرا نشده).

## Architecture

- A1 CONFIRMED: Service/Repository Layer نیست. منطق در Controller، Model، Helper، Listener و Blade پخش است.
- A2 CONFIRMED: Order/Payment در Model (`transmit`, `confirm`, `disconfirm`) و Listener (برگشت پول) پخش شده‌اند.
- A3 CONFIRMED: پرداخت با `new $className()` از DB (Class Name در جدول).
- A4 CONFIRMED: Cart/Favorite/Comparison با Cookie و Facade (حالت Global).
- A5 CONFIRMED: JSON با HTML رندرشده (`'view' => ...`) به‌جای داده.
- A6 CONFIRMED: `SendType id == 1` ثابت عددی در 3 جا.

## Business / Correctness

- B1 CONFIRMED: `Order::disconfirm` موجودی را **کم** می‌کند (`count -= qty`) به‌جای اضافه کردن. بعد از Cancel موجودی کالا دوباره کاهش می‌یابد. Source: `Order.php::disconfirm`.
- B2 CONFIRMED: `canUpdateStatus(0)` فقط `status < 3` را چک می‌کند. Order کنسل‌شده (0) دوباره قابل Cancel است. PLAUSIBLE: Cancel دوباره → `disconfirm` دوباره (تا وقتی `add` وجود دارد) → `credit += total` دوباره (Double Refund) و `CreditLog` تکراری.
- B3 CONFIRMED: Order با `status=1` قبل از پرداخت ساخته می‌شود. «ثبت شده» با «پرداخت‌شده» یکی نیست. Orderهای پرداخت‌نشده در لیست Order می‌مانند. و Cart حذف شده است.
- B4 CONFIRMED: موجودی هنگام Cart/Order/Payment بررسی نمی‌شود (فقط `updateCount`). `count` می‌تواند منفی شود.
- B5 CONFIRMED: Cancel `CreditLog` می‌سازد حتی وقتی `users.credit` واقعاً افزایش نمی‌یابد (اگر `add` وجود ندارد). لاگ و موجودی ناسازگار.
- B6 CONFIRMED: برگشت پول Cancel فقط به Credit داخلی است. Refund بانکی نیست.
- B7 CONFIRMED: `MellatPayment::payFirstPageSpecialSell` مبلغ ثابت `100` می‌فرستد، `payFirstPageSpecialSuggestion` مبلغ `plan.price`.
- B8 CONFIRMED: `tax` همیشه 0 (`TAX=0`) ولی در فرمول و Migration حضور دارد.
- B9 PLAUSIBLE: Credit کاربر ممکن است هنگام `RequestCheckoutCredit done` منفی شود (بررسی مجدد موجودی نیست).
- B10 CONFIRMED: دو سیستم تسویه موازی (Shop Wallet `Checkout` و `RequestCheckoutCredit`) و یک سیستم قدیمی (`check_outs`).
- B11 CONFIRMED: `PostApi::price` شامل `dd(config())`. ارسال پستی (غیر از SendType 1) اجرا را متوقف می‌کند.
- B12 CONFIRMED: `CartAuth` به Route `front.cart.cart1` Redirect می‌کند که ثبت نشده است. `CartController` گروه `middelware` (غلط املایی) دارد.
- B13 CONFIRMED: `PurePriceTrait` و `ProductDetail::getPurePriceAttribute` دو الگوریتم گردکردن متفاوت.
- B14 CONFIRMED: `Order::confirm` و `Mellat::verify` بدون Lock/Idempotency (`security.md S8`).
- B15 CONFIRMED: `Admin Export` کلید وضعیت `denined` (غلط املایی) می‌خواند.

## Security

`security.md` را ببین (S1..S19).

## Performance

- P1 CONFIRMED: `Product::$with = ['comments','shop']` در همه Queryها (Eager Load همه نظرها).
- P2 CONFIRMED: `Product::getRateAttribute` یک Query در هر دسترسی (N+1 در لیست).
- P3 CONFIRMED: `Cart::count()` چند `fresh()` و Query در هر درخواست (Header).
- P4 CONFIRMED: `ProductController@index` دو Query (`get` برای صفحه و `get` برای `hasMorePage`).
- P5 CONFIRMED: `SearchController` فقط `LIKE '%..%'`.
- P6 CONFIRMED: `Cart::has` با `whereHas` تو در تو.
- P7 PLAUSIBLE: View Composerهای Admin Sidebar چند `count` در هر صفحه.

## Maintainability / Duplicate Logic

- M1 CONFIRMED: سه+ سیستم پیام (`messages`، `msg`، `product_messages`، `tickets`، `conversations`).
- M2 CONFIRMED: دو Controller پیام در Front (`Specific/MessageController`, `Profile/MessageController`) + `MsgController`.
- M3 CONFIRMED: Controllerهای Profile Product/Shop/Order بزرگ و چندمنظوره.
- M4 CONFIRMED: Modelهای Base/Specific تکراری: `Base/Payment` و `Specific/Payment`، `Base/Article` و `Specific/Article`، `Base/Announcement` و `Specific/Announcement`، `Base/Slider` و `Slider` ریشه.
- M5 CONFIRMED: `use function foo\func;` در چند فایل (import بیهوده).
- M6 CONFIRMED: Event `ProductAdded` و Listener دارد ولی Dispatch نمی‌شود.
- M7 CONFIRMED: Routeهای کامنت‌شده زیاد. کد کامنت‌شده در Listener و Controller.
- M8 CONFIRMED: Locale/نام مختلف: `Nottification` (غلط املایی در نام Listener).
- M9 CONFIRMED: مقدار ثابت SMS Template در Listener.

## Database

- D1 CONFIRMED: پول در `credit_log` Double، `requests_checkout_credit` Float، `check_outs` String، بقیه Integer.
- D2 CONFIRMED: `credit_log`, `requests_checkout_credit`, `msg` بدون FK.
- D3 CONFIRMED: `users.id` Integer ولی `role_user.user_id` BigInt (Migration تبدیل).
- D4 CONFIRMED: بیش از 80 FK با Cascade (حذف زنجیره‌ای). با Soft Delete ترکیب نامطمئن.
- D5 CONFIRMED: جدول `follows` و `followers` هر دو وجود دارند.
- D6 CONFIRMED: `orders.status` عدد بدون Enum/جدول.
- D7 CONFIRMED: `users.hashed` برای OTP (md5).

## UI / Frontend

- U1 CONFIRMED: دو نسخه jQuery در Assets.
- U2 CONFIRMED: Vue در `package.json` بدون استفاده مشخص.
- U3 CONFIRMED: 357 `{!! !!}`.
- U4 CONFIRMED: Laravel Mix 0.8 / bootstrap-sass 3 (قدیمی).
- U5 CONFIRMED: Sidebar Admin داخل `routes/views`.

## Testing

- T1 CONFIRMED: فقط دو تست Example. `testing.md`.

## SEO

- E1 CONFIRMED: `meta description` خالی. بدون Canonical/OpenGraph/Structured Data/sitemap.xml/robots.txt.
- E2 CONFIRMED: چندین URL فارسی و ناسازگار با Slug.

## Developer Experience

- X1 CONFIRMED: `vendor`/`.env` نیست. پروژه اجرا نشد. PHP 7.0–7.2 لازم است (تأییدنشده).
- X2 CONFIRMED: Script `lint/test` ندارد.
- X3 CONFIRMED: غلط املایی در نام کلاس: `SendNewMessageNottification`.
- X4 CONFIRMED: Credential در Config و `.env.example` (`security.md`).
