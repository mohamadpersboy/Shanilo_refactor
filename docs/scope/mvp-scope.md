# MVP Scope

## 1. زنجیره اصلی

```
User → Auth → Browse → Product → Cart → Checkout → Payment → Order → Seller Fulfillment → Customer Order Status
```

| مرحله | Feature (ID در `feature-decisions.md`) |
|---|---|
| User | F01، F02، F09، F10 |
| Auth | F03، F04، F05، F07 |
| Browse | F13، F14، F20، F26، F56، F86 |
| Product | F15، F16، F17، F18، F19 |
| Cart | F29، F30 |
| Checkout | F10، F25، F31، F32، F33 |
| Payment | F43، F44 |
| Order | F37، F38 |
| Seller Fulfillment | F08، F24، F27، F28 |
| Customer Order Status | F39، F40، F41 |

فهرست کامل MVP (42 Feature) با ستون Priority در `feature-decisions.md` است. در تعارض، `feature-decisions.md` معتبر است. Featureهای پشتیبان در بخش 2 هستند.

## 2. Featureهای پشتیبان MVP

Authorization، Admin (تأیید محصول، دسته، برند، Slider)، Shop (ساخت و مدیریت)، Geography، Shipping، Media (تصویر)، SMS (OTP و وضعیت سفارش)، Wallet (دفتر)، SEO، Scheduler پاکسازی، Admin روش‌های پرداخت/ارسال.

ID: F07، F50، F76، F77، F84، F86، F87، F90.

## 3. Gapهای زنجیره

| # | Gap | توضیح | وضعیت |
|---|---|---|---|
| G1 | سمت فروشنده | زنجیره از «User» شروع می‌شود. بدون ساخت Shop و محصول چیزی برای خرید نیست. | در MVP اضافه شد. |
| G2 | تأیید محصول | محصول بدون تأیید Admin دیده نمی‌شود. | در MVP اضافه شد. |
| G3 | داده پایه | دسته، برند، استان، شهر، روش پرداخت/ارسال باید وجود داشته باشد. | Seed یا Migration. Phase 3/15. |
| G4 | تسویه فروشنده | زنجیره آن را ندارد. فروشنده پول فروش را از سیستم نمی‌گیرد. | OD-03. |
| G5 | لغو و برگشت وجه | فروشنده یا مشتری لغو می‌کند. مقصد پول مشخص نیست. | OD-01. |
| G6 | جستجوی محصول | Legacy ندارد. مرور فقط با دسته/فیلتر. | PNF-01. |
| G7 | صفحه قوانین | ثبت‌نام «agreement» می‌خواهد. CMS UNKNOWN. | OD-13. |
| G8 | نتیجه نامعلوم بانک | Callback نرسید یا دیر رسید. | Payment Expired، UNKNOWN (U11). OD-12. |
| G9 | ارتباط مشتری و فروشنده | Order وضعیت «تماس» دارد. کانال تماس در MVP نیست. | OD-04. |
| G10 | بازگشت کالا | بعد از Received چیزی نیست. | PNF-02. |
| G11 | Admin در مشکل Order | Admin فقط مشاهده می‌کند. | PNF-03. |

## 4. MVP نیست

پیام‌رسانی، Follow/Block، Comment، Favorite، Credit (OD-01)، تسویه (OD-03)، جایگاه پولی، CMS، Advertisement، Timeline، Comparison، ارسال پستی، Export.
