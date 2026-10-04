# Domain Scope

مبنا: `feature-decisions.md`. هر Domain یک وضعیت دارد: MVP (دست‌کم یک Feature در MVP)، Post-MVP، Future، Unknown. Technology انتخاب نمی‌شود.

## 1. وضعیت Domainها

| Domain | وضعیت | یادداشت |
|---|---|---|
| Identity | MVP | ثبت‌نام و تأیید موبایل |
| Auth | MVP | ورود، بازیابی رمز، جداسازی Admin |
| Authorization | MVP | Role، Permission، مالکیت شیء |
| User Profile | MVP | پروفایل، آدرس. حساب بانکی Post-MVP |
| Catalog | MVP | مرور و فیلتر |
| Category | MVP | سه‌سطحی |
| Brand | MVP | |
| Product | MVP | تأیید Admin |
| Product Detail | MVP | Variant: رنگ، قیمت، تخفیف، موجودی، وزن |
| Shop | MVP | سیاست تأیید: OD-05 |
| Seller | MVP | مالک Shop. مدیریت محصول و سفارش |
| Cart | MVP | چند فروشگاهی |
| Checkout | MVP | آدرس، ارسال، پرداخت. مالیات: OD-07 |
| Order | MVP | |
| Payment | MVP | Mellat. Callback Idempotent |
| Wallet | MVP | دفتر کل. تسویه Post-MVP (OD-03) |
| Credit | Unknown | OD-01 |
| Promotion | MVP | Slider و صفحه اصلی. جایگاه پولی Post-MVP (OD-08) |
| Social | Post-MVP | OD-04 |
| Comment | Post-MVP | OD-09 |
| Favorite | Post-MVP | |
| Following | Post-MVP | OD-04 |
| Timeline | Unknown | فقط Route دارد |
| Messaging | Post-MVP | OD-04 |
| Notification | MVP | SMS (OTP و وضعیت سفارش). اعلان داخلی Post-MVP |
| CMS | Unknown | شاهد ناکافی. OD-13 |
| Advertisement | Unknown | شاهد ناکافی. OD-08 |
| Geography | MVP | استان، شهر |
| Shipping | MVP | ارسال Shop. پستی Post-MVP (OD-06) |
| Admin | MVP | مجموعه کمینه |
| Reporting | Post-MVP | گزارش تخلف |
| Search | Post-MVP | کاربر/Shop. محصول: PNF-01 |
| Comparison | Unknown | فقط Route/Cookie |
| Media | MVP | تصویر |
| SEO | MVP | Legacy ندارد. صفحات عمومی |

| وضعیت | تعداد Domain |
|---|---|
| MVP | 23 |
| Post-MVP | 7 |
| Future | 0 |
| Unknown | 5 |
| جمع | 35 |

Future صفر است چون هیچ Domain کامل فقط از «Potential New Feature» تشکیل نشده است.

Domainهای اضافه Legacy که در فهرست بالا نیستند: Plan/FirstPage (در Promotion)، Announcement (در Notification)، Block/Report (در Social/Reporting)، Short link (در CMS). Domain جدید ساخته نشد.

## 2. Core Marketplace

شامل: Identity، Auth، Catalog، Product، Shop، Seller، Cart، Checkout، Order، Payment، Wallet، Shipping، Geography، Admin. همه MVP. Marketplace چند فروشگاهی است (هر Order یک Shop). مشتری و فروشنده نقش‌های همان User هستند. فروشنده کسی است که Shop دارد.

## 3. Social

| سؤال | تصمیم | مبنا |
|---|---|---|
| پیام‌رسانی در MVP هست؟ | خیر. Post-MVP. | جریان MVP به پیام نیاز ندارد. Legacy وضعیت «تماس فروشگاه و مشتری» دارد. تماس خارج از سیستم است. OD-04. |
| Timeline لازم است؟ | UNKNOWN. | Legacy فقط Route دارد (U20). |
| Follow/Block | Post-MVP. | وابسته به OD-04. |
| Comment، Favorite | Post-MVP. | Legacy فعال. در جریان MVP نیست. |
| چهار سیستم پیام | یک سیستم واحد در سیستم جدید. | C8. |

## 4. CMS

شواهد ضعیف است (U21). Route فعال وجود دارد. محتوا و کاربرد بررسی نشد. همه UNKNOWN. فقط Gap ثبت شد: Legacy ثبت‌نام «agreement» می‌خواهد. پس صفحه قوانین لازم است. محتوا و مدیریت آن UNKNOWN. OD-13.

## 5. Advertisement

Legacy فقط ثبت درخواست دارد. پرداخت و نمایش پیدا نشد. Scope تعریف نمی‌شود. UNKNOWN. چیزی اختراع نمی‌شود. OD-08.

## 6. Payment

- درگاه فعال: Mellat. Zarrinpal حذف. AsanPardakht UNKNOWN.
- Callback باید Idempotent باشد. مبلغ Callback با Order برابر است.
- Order «در انتظار پرداخت» انقضا دارد.
- مشکل‌های Legacy (S1، S8، S16، B14، C10) منتقل نمی‌شوند.
- پرداخت در محل UNKNOWN. OD-12.

## 7. Wallet / Credit

| موضوع | تصمیم |
|---|---|
| ادغام Wallet و Credit | OPEN. OD-01. |
| Ledger | لازم است. هر تغییر پول یک ورودی نامتغیر دارد. موجودی از دفتر می‌آید. (C9، B5) |
| Refund | لازم است. مقصد: OD-01. بازگشت به بانک در Legacy نیست. |
| Settlement | لازم است. فروشنده درخواست می‌دهد. Admin تأیید یا رد می‌کند. در MVP یا بعد: OD-03. |
| Hold period | در Legacy هست (۳ روز). مقدار نهایی: OD-03. |
| Commission | درصد قابل تنظیم. مقدار: OD-02. |

## 8. Shop / Seller

Shop ساخت و ویرایش، شهرهای سرویس و هزینه ارسال هر شهر، صفحه عمومی، مدیریت محصول و سفارش. `uid` بین User و Shop یکتاست. سیاست تأیید Shop: OD-05. حساب بانکی فروشنده برای تسویه Post-MVP.

## 9. Admin

MVP کمینه: کاربر (مشاهده، مسدود)، فروشگاه، تأیید محصول، دسته، برند، Slider، Order (مشاهده)، روش‌های پرداخت/ارسال. Post-MVP: تسویه، Credit، Export، Audit Log. Admin جدا از مشتری است (C13).

## 10. SEO

Legacy ندارد (E1). سیستم جدید برای صفحه محصول، فروشگاه و دسته: عنوان و توضیح، canonical، OpenGraph، sitemap، robots. URL پایدار و خوانا. تصمیم HOW (Slug و ...) در Phase 2/7.

## 11. Search

Legacy فقط User و Shop را جستجو می‌کند. محصول جستجو نمی‌شود. MVP مرور با دسته و فیلتر دارد. جستجوی محصول: PNF-01. Technology انتخاب نمی‌شود.

## 12. Media

انواع: تصویر (محصول، پس‌زمینه Shop، آواتار، Slider). فایل پیوست پیام (Post-MVP، نوع مجاز UNKNOWN). ویدیو و صوت حذف (REMOVE). فرمت و حجم مجاز در Phase 5.

## 13. Geography / Shipping

استان و شهر برای آدرس و سرویس Shop. ارسال Shop در MVP. ارسال پستی: OD-06. قیمت ارسال هر شهر را فروشنده تعیین می‌کند. وزن Variant ذخیره می‌شود (برای ارسال پستی آینده).
