# Post-MVP Scope

بدون رتبه‌بندی ذهنی. گروه‌بندی فقط بر اساس معیار نوشته‌شده. ترتیب جدول ترتیب اولویت نیست.

| گروه | معیار |
|---|---|
| Post-MVP | Feature در Legacy فعال یا لازم است و در MVP نیست. |
| Future | Feature در Legacy نیست. فقط به‌صورت «Potential New Feature» ثبت شده. |
| Optional | Convenience. نبودن آن مانع هیچ جریان اصلی نیست. |
| Unknown | شاهد ناکافی. تصمیم یا بررسی لازم است. |

## Post-MVP (24)

| ID | Domain | Feature | Decision | Basis |
|---|---|---|---|---|
| F06 | Auth | Impersonation / `show_as_customer` | DEFER | EVIDENCE-BASED |
| F11 | User Profile | کارت/حساب بانکی کاربر (`user_banks`) | REDESIGN | OPEN |
| F12 | User Profile | صفحه عمومی کاربر (UserPage) | DEFER | OPEN |
| F22 | Product | آگاه‌سازی موجود شدن / تخفیف (NotifyList) | DEFER | EVIDENCE-BASED |
| F23 | Search | جستجوی کاربر/فروشگاه | DEFER | EVIDENCE-BASED |
| F34 | Shipping | ارسال پستی (`PostApi`، `post-plans`) | DEFER | OPEN |
| F36 | Checkout | مالیات (`tax`) | DEFER | OPEN |
| F42 | Notification | اعلان داخلی (Announcement) | KEEP | EVIDENCE-BASED |
| F48 | Credit | شارژ Credit کاربر | DEFER | OPEN |
| F49 | Credit | برداشت Credit کاربر (`requests_checkout_credit`) | DEFER | OPEN |
| F51 | Wallet | درخواست تسویه فروشنده (Checkout) | REDESIGN | OPEN |
| F52 | Wallet | دوره نگهداری وجه (۳ روز) | REDESIGN | OPEN |
| F55 | Promotion | جایگاه پولی صفحه اول و Plan (پیشنهاد/فروش ویژه) | DEFER | OPEN |
| F57 | Social | نظر و امتیاز (محصول و فروشگاه) | REDESIGN | OPEN |
| F58 | Social | Favorite | KEEP | EVIDENCE-BASED |
| F59 | Social | Follow (کاربر و فروشگاه) | DEFER | OPEN |
| F60 | Social | Block | DEFER | OPEN |
| F65 | Messaging | پیام مستقیم (`messages`/Thread) | REDESIGN | OPEN |
| F66 | Messaging | تیکت و پشتیبانی (`msg`, `tickets`) | DEFER | OPEN |
| F67 | Messaging | پیام درباره محصول (`product_message`) | DEFER | EVIDENCE-BASED |
| F69 | Reporting | گزارش تخلف | KEEP | EVIDENCE-BASED |
| F78 | Admin | تأیید تسویه و Credit | REDESIGN | OPEN |
| F80 | Admin | Audit Log (spatie activitylog) | REDESIGN | EVIDENCE-BASED |
| F88 | Media | پیوست پیام (فایل) | DEFER | UNKNOWN |

## Optional (4)

| ID | Domain | Feature | Decision | Basis |
|---|---|---|---|---|
| F21 | Product | شمارنده بازدید و محصول پربازدید | DEFER | EVIDENCE-BASED |
| F62 | Social | اشتراک محصول با دوستان (Share) | DEFER | EVIDENCE-BASED |
| F74 | CMS | Short link | DEFER | EVIDENCE-BASED |
| F79 | Admin | Export Excel | DEFER | EVIDENCE-BASED |

## Future

| ID | Feature | منبع |
|---|---|---|
| PNF-01 | جستجوی محصول | `open-decisions.md` |
| PNF-02 | بازگشت کالا بعد از دریافت | `open-decisions.md` |
| PNF-03 | مداخله Admin در Order | `open-decisions.md` |
| PNF-04 | گزارش فروش برای فروشنده | `open-decisions.md` |
| PNF-05 | حذف حساب و خروجی داده کاربر | `open-decisions.md` |

هیچ‌کدام بدون تأیید کاربر وارد scope نمی‌شوند.

## Unknown (16)

| ID | Domain | Feature | Decision | Basis |
|---|---|---|---|---|
| F35 | Shipping | پرداخت در محل (`pay_types.type=home`) | UNKNOWN | UNKNOWN |
| F46 | Payment | AsanPardakht | UNKNOWN | UNKNOWN |
| F47 | Payment | پرداخت با Credit | REDESIGN | OPEN |
| F53 | Wallet | کمیسیون پلتفرم | REDESIGN | OPEN |
| F63 | Social | Timeline | UNKNOWN | UNKNOWN |
| F64 | Social | Comparison (مقایسه) | UNKNOWN | UNKNOWN |
| F70 | CMS | صفحات ثابت (AboutUs، Policy، FAQ، Guide) | UNKNOWN | UNKNOWN |
| F71 | CMS | مقاله و خبر (Article، News) | UNKNOWN | UNKNOWN |
| F72 | CMS | گالری و Page | UNKNOWN | UNKNOWN |
| F73 | CMS | Newsletter | UNKNOWN | UNKNOWN |
| F75 | Advertisement | درخواست تبلیغ | UNKNOWN | UNKNOWN |
| F81 | Admin | نمای Developer | UNKNOWN | UNKNOWN |
| F83 | Admin | Tag، Factor، Inventory | UNKNOWN | UNKNOWN |
| F85 | Geography | نقشه، `latlong`، `get-position` | UNKNOWN | UNKNOWN |
| F91 | Infra | Broadcast / Pusher | UNKNOWN | UNKNOWN |
| F92 | Infra | Analytics | UNKNOWN | UNKNOWN |
