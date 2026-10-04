# Unknowns

هیچ مورد با حدس پر نشده است. هر مورد: چه چیزی نامعلوم است و چه شواهدی لازم است.

## اجرا و محیط

- U1 UNKNOWN: Legacy اجرا نشد. `vendor`، `.env`، دیتابیس در دسترس نیست. Evidence needed: اجرای `composer install` و اتصال DB (در Phase جدا و با تأیید).
- U2 UNKNOWN: نسخه PHP واقعی Production.
- U3 UNKNOWN: Driver واقعی Cache/Session/Queue/Broadcast (`.env`).
- U4 UNKNOWN: آیا Production هنوز فعال است و کاربر/سفارش واقعی دارد. Evidence needed: DB یا تأیید مالک.
- U5 UNKNOWN: Schema واقعی DB در مقابل Migrationها (تغییر دستی؟).

## Domain

- U6 UNKNOWN: محتوای `Shop` Scopeها (`orderByFollowers`, `orderByRate`) و `ShopRequest`.
- U7 UNKNOWN: `ProductDetail::filterBy*` (هر فیلتر دقیقاً چه می‌کند).
- U8 UNKNOWN: Middleware `shop.middleware` (`CartMiddleware`) و `check.exists.product` چه می‌کنند.
- U9 UNKNOWN: `TemporaryUser::transmit` (رمز Hash می‌شود؟ چه فیلدی کپی می‌شود؟).
- U10 UNKNOWN: Mutator رمز در `UserMutator`.
- U11 UNKNOWN: رفتار `Mellat::verify` در Callback تکراری (پکیج `tohidplus/mellat`). Evidence needed: کد پکیج.
- U12 UNKNOWN: «پرداخت در محل» (`pay_types.type=home`).
- U13 UNKNOWN: مقدار واقعی `pay_types` و `send_types` در DB (آیا `class_name` برای Credit/Mellat/AsanPardakht).
- U14 UNKNOWN: ID `SendType` برابر 1 چیست («ارسال فروشگاه») و ID دیگر چیست.
- U15 UNKNOWN: نسخه فعال `SendOrderStatusNotification::sendMessageToSeller` (فقط بخشی خوانده شد).
- U16 UNKNOWN: چه کسی/چگونه Comment به `pending/denied` می‌رود. مسیر Admin.
- U17 UNKNOWN: اثر Admin روی Order (تغییر وضعیت از Admin؟) و Shop (تأیید `display`؟).
- U18 UNKNOWN: `products/{id}/get` و `getProductByKey`.
- U19 UNKNOWN: Route/UI مدیریت `pay_types`, `send_types`.
- U20 UNKNOWN: `Comparison`، `Timeline`، `ShopPage`، `UserPage` (فقط Route خوانده شد).
- U21 UNKNOWN: Article، News، FAQ، Guide، Policy، Gallery، Page، Newsletter (CMS) — عمیق بررسی نشد.
- U22 UNKNOWN: Advertisement: پرداخت و نمایش آگهی.
- U23 UNKNOWN: ProductMessage، `Msg`، `Ticket` جریان کامل و ارتباط با `messages`.
- U24 UNKNOWN: Plan: مقادیر `func` و `amount` (`Day`, `Month`?). از DB.
- U25 UNKNOWN: `is_read` کجا به 1 می‌رود.
- U26 UNKNOWN: حذف خودکار Cart قدیمی، پلن منقضی و OTP منقضی (Scheduler خالی).
- U27 UNKNOWN: آیا Broadcast (Pusher) واقعاً استفاده می‌شود.
- U28 UNKNOWN: سرویس نقشه در Frontend.
- U29 UNKNOWN: Analytics (اسکریپت‌ها) در Blade.
- U30 UNKNOWN: `Attachment::delete` فایل فیزیکی را پاک می‌کند؟

## Frontend

- U31 UNKNOWN: JS مراحل Cart (Validation Client، محاسبه قیمت).
- U32 UNKNOWN: استفاده Vue.
- U33 UNKNOWN: صفحات Empty/Error/Loading.
- U34 UNKNOWN: Viewهای Admin Developer.
- U35 UNKNOWN: Blade: Queryهای داخل View.

## Security

- U36 UNKNOWN: آیا Credential بانک و SMS داخل Repository هنوز معتبرند (Rotate شده‌اند؟).
- U37 UNKNOWN: `HttpsProtocol` در Kernel فعال است؟
- U38 UNKNOWN: Throttle واقعی روی OTP/Resend.

## پوشش تحلیل

بررسی عمیق: Auth، Cart، Checkout، Payment، Order، Wallet، Credit، Product، Shop (ایجاد)، Comment، Message (ارسال)، Event/Listener، Gate/Helper، Admin (Checkout/Credit/Product).
نمونه‌برداری: بقیه Controllerهای Admin/CMS، Viewها و JavaScript.
