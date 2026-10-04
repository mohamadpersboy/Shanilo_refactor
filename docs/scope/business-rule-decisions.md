# Business Rule Decisions

مبنا: `docs/legacy/business-rules.md`، `current-problems.md`، `security.md`. این سند WHAT را تعیین می‌کند. HOW در Phase 2 به بعد.

## 1. Legacy Bug ≠ Business Rule

Legacy رفتار = آنچه کد می‌کند. هیچ‌کدام از موارد زیر قاعده کسب‌وکار نیست.

| # | Legacy behavior | New behavior | Reason | Basis |
|---|---|---|---|---|
| 1 | `Order::disconfirm` موجودی را دوباره **کم** می‌کند (`count -= qty`). | لغو Order موجودی را یک بار برمی‌گرداند (`+= qty`). `sell_count` کم می‌شود. | C3/B1. متن Wallet و `sell_count -=` هدف «برگشت» را نشان می‌دهد. | EVIDENCE-BASED |
| 2 | لغو دوباره: `canUpdateStatus(0)` برای `status=0` هم مجاز است. برگشت وجه دوباره ممکن است. | لغو فقط از وضعیت‌های مجاز. وضعیت لغوشده نهایی است. درخواست دوم خطا می‌دهد و اثر مالی ندارد. | B2/B5. برگشت وجه دوگانه ضرر مالی است. | EVIDENCE-BASED |
| 3 | `GET /api/orders` همه Orderها و داده کاربر را بدون Auth می‌دهد. | هیچ endpoint عمومی سفارش وجود ندارد. هر سفارش فقط برای مشتری، فروشنده همان Shop و Admin قابل دیدن است. | S3. نشت داده شخصی. | EVIDENCE-BASED |
| 4 | `GET /download?path=` هر فایل Disk عمومی را می‌دهد. | فایل پیام فقط برای فرستنده و گیرنده قابل دریافت است. مسیر دلخواه وجود ندارد. | S4. | EVIDENCE-BASED |
| 5 | تأیید OTP ثبت‌نام با `md5(code)` بدون اتصال به موبایل/نشست. کد انقضا ندارد. | کد به یک موبایل/درخواست مشخص وصل است. منقضی می‌شود. یک‌بارمصرف است. تعداد تلاش محدود است. | S5، S7. ورود با حدس کد ممکن است. | EVIDENCE-BASED |
| 6 | Callback پرداخت بدون Idempotency/Lock. Callback تکراری `confirm` را تکرار می‌کند. | هر پرداخت یک بار «موفق» می‌شود. Callback تکراری اثر جدید ندارد. مبلغ بانک با مبلغ Order برابر است. | S8، B14، U11. | EVIDENCE-BASED |
| 7 | `CartController@updateField`: `field` و `value` دلخواه از Client. | کاربر فقط فیلدهای مجاز (مثل تعداد، آدرس خود) را تغییر می‌دهد. قیمت و هزینه ارسال را server محاسبه می‌کند. | S18. | EVIDENCE-BASED |
| 8 | `PostApi::price` شامل `dd(config())`. ارسال پستی خراب است. | ارسال پستی تا تصمیم OD-06 وجود ندارد. هیچ Debug dump در Production نیست. | B11، S17، S19. | EVIDENCE-BASED |
| 9 | Credential بانک در `config/mellat.php`، مقدار SMS در `.env.example`، رمز Seeder ثابت. | هیچ Secret در Repository نیست. Credential فعلی «افشاشده» محسوب می‌شود. | S1، S2، S10. | EVIDENCE-BASED |
| 10 | `POST single-field-validation`: Rule از Client. | Validation Rule فقط سمت server تعریف می‌شود. | S11. | EVIDENCE-BASED |
| 11 | Throttle ورود کار نمی‌کند (`incrementLoginAttempts` بعد از `return`). | تلاش ناموفق ورود شمارش می‌شود. بعد از حد مشخص قفل موقت. | S6. مقدار حد در Phase 4. | EVIDENCE-BASED |
| 12 | `Order` قبل از پرداخت با `status=1` ساخته می‌شود (مثل «ثبت‌شده»). | وضعیت «در انتظار پرداخت» جدا است. | C2/B3. | EVIDENCE-BASED |
| 13 | `count` می‌تواند منفی شود. موجودی در پرداخت چک نمی‌شود. | فروش بیش از موجودی ممنوع. بررسی در افزودن، Checkout و پرداخت. | B4. | EVIDENCE-BASED |
| 14 | `RequestCheckoutCredit done`: بدون بررسی مجدد موجودی. | تأیید برداشت فقط وقتی موجودی کافی است. | B9. | EVIDENCE-BASED |
| 15 | Checkout تسویه: Admin هر وضعیت را به هر وضعیت دیگر می‌برد. | `done` و `denied` نهایی‌اند. | State machine Checkout. | EVIDENCE-BASED |
| 16 | `Wallet::removeable` نیاز به بازبینی. اثر مبلغ Credit و Cancel روی Wallet (دو استخر). | یک مدل واحد پول (OD-01). | C9. | OPEN |
| 17 | Mellat Credit: `credit += amount/10`. واحد Log بانک تأیید نشده. | واحد پول در Phase 2 تعریف می‌شود. | C10. | UNKNOWN |
| 18 | `MellatPayment::payFirstPageSpecialSell` مبلغ ثابت 100. | قیمت پلن فقط از Plan می‌آید. | C4. قیمت صحیح در OD-08. | OPEN |
| 19 | Admin Export کلید `denined`. | کلید وضعیت از یک تعریف مشترک می‌آید. | C11. | EVIDENCE-BASED |
| 20 | Cart `CartAuth` به Route ناموجود. `middelware` غلط املایی. | Checkout ورود می‌خواهد. | C6، B12. | EVIDENCE-BASED |
| 21 | `getProductByKey` پوشه `app/Http` را پاک می‌کند. | وجود ندارد. | S13 (resolved در Phase 0.5). | EVIDENCE-BASED |

## 2. Business Rules

نتیجه: Preserve / Change / Remove / Unknown.

| # | Legacy Rule | Evidence | New Decision | New Rule | Reason |
|---|---|---|---|---|---|
| BR-01 | محصول جدید `display=0`. Admin منتشر می‌کند. | business-rules «تأیید محصول» | Preserve | محصول جدید در انتظار تأیید است. فقط Admin منتشر می‌کند. | کنترل کیفیت Marketplace. |
| BR-02 | Gallery جدید → تأیید مجدد. | همان | Preserve | تصویر جدید محصول تأیید مجدد می‌خواهد. | رفتار Legacy. |
| BR-03 | ویرایش متن/قیمت `display` را تغییر نمی‌دهد. | «بررسی Controller کامل نشد» | Unknown | تصمیم: OD-05 (سیاست تأیید). | شاهد ناکافی. |
| BR-04 | قیمت نهایی = قیمت - درصد تخفیف، سپس گرد. | ProductDetail | Change | قیمت نهایی از Money convention. قاعده گردکردن: OD-11. | C5 و Float ممنوع. |
| BR-05 | `tax` همیشه 0. | TAX=0 | Unknown | OD-07. | نیاز قانونی نامعلوم. |
| BR-06 | Cart به ازای Shop تقسیم می‌شود. | CartDetail | Preserve | هر Shop یک Order جدا. | مدل Marketplace. |
| BR-07 | Toggle: افزودن دوباره = حذف. | CartController@toggle | Change | افزودن و حذف دو عمل جدا. | UX و خطا. تصمیم UI. |
| BR-08 | تعداد بین 1 و موجودی فعلی. | updateCount | Preserve | همان. | رفتار درست. |
| BR-09 | کالا با `count<=0` در مراحل Cart حذف/رد می‌شود. | CartMiddleware، StepCheckExists | Preserve | همان در Cart. اضافه: بررسی هنگام پرداخت. | Doc legacy اشتباه بود. |
| BR-10 | خرید از Shop خود ممنوع. | Step3 | Preserve | همان. | رفتار فعال. |
| BR-11 | ارسال Shop (id=1): قیمت از `city_shop`. شهر خارج سرویس = 422. | CartDetail | Preserve | فروشگاه شهر مقصد را سرویس نمی‌دهد → خرید ممکن نیست. | رفتار فعال. |
| BR-12 | ارسال پستی: وزن > 50 ممنوع. | business-rules | Unknown | OD-06. | کد خراب. |
| BR-13 | مجموع Order = Σ(قیمت نهایی × تعداد) + مالیات + ارسال. | CartDetail::total | Preserve | همان فرمول. | رفتار فعال. |
| BR-14 | `order_details.price` قیمت بدون تخفیف + `discount` جدا. | transmit | Change | Order Snapshot کامل: قیمت، تخفیف، قیمت نهایی، عنوان، Variant، آدرس. | تغییر محصول بعدی Order قدیمی را عوض نکند. |
| BR-15 | Order قبل از پرداخت ساخته می‌شود. | transmit | Change | Order «در انتظار پرداخت» با انقضا. | C2. |
| BR-16 | موجودی در پرداخت موفق کم می‌شود. | Order::confirm | Preserve | همان زمان. با کنترل بیش‌فروشی. | رفتار درست Legacy. |
| BR-17 | پرداخت موفق → Wallet فروشگاه `add` با `calculateCheckoutPrice`. | Order::confirm | Preserve | هر فروش ورودی دفتر Wallet دارد. مبلغ = فروش - کمیسیون + هزینه ارسال Shop. | رفتار فعال. مقدار کمیسیون OD-02. |
| BR-18 | Cancel مجاز تا قبل از وضعیت 3. | canUpdateStatus | Preserve | لغو تا قبل از «تماس/ارسال». یک بار. | رفتار فعال. |
| BR-19 | Cancel: وجه به `users.credit`. | Listener | Unknown | مقصد برگشت: OD-01. | دو استخر پول. |
| BR-20 | ترتیب وضعیت: 2،3،4،5 پشت سر هم. مشتری 3 و 5. فروشنده 2،3،4. | canUpdateStatus | Preserve | همان. | رفتار فعال. |
| BR-21 | هر Cancel `CreditLog` می‌سازد. | OrderController | Change | هر برگشت وجه یک ورودی دفتر دارد. بدون ورودی بی‌اثر. | B5. |
| BR-22 | Mellat Verify موفق → `successful`. ناموفق → `unsuccessful` و Order لغو. | MellatPayment | Preserve | همان. | رفتار فعال. |
| BR-23 | پرداخت Credit: موجودی ≥ مبلغ. | CreditPayment | Unknown | OD-01. | |
| BR-24 | شارژ Credit بین 10,000 و 10,000,000. | CreditController | Unknown | OD-01. | |
| BR-25 | `removeable = total - مبلغ ۳ روز اخیر با Order 1..4`. | Wallet | Unknown | OD-03. | مقدار و قاعده نیاز به تأیید. |
| BR-26 | درخواست تسویه: ≥ 10,000 و ≤ `removeable`. یک `pending` برای هر Wallet. | Profile/CheckoutController | Preserve | همان. حداقل مبلغ قابل تأیید در OD-03. | رفتار فعال. |
| BR-27 | Credit: یک درخواست برداشت فعال برای هر کاربر. | RequestCheckoutCredit | Unknown | OD-01. | |
| BR-28 | نظر: ورود لازم. مالک نظر نمی‌دهد. یک نظر برای هر شیء. | canComment | Preserve | همان. | رفتار فعال. |
| BR-29 | نظر مستقیم `confirmed`. | CommentController | Unknown | OD-09. | C7. |
| BR-30 | پاسخ نظر `rate=0`. حذف فقط مالک نظر. | CommentController | Preserve | همان. | |
| BR-31 | امتیاز محصول = `ceil(avg(rate))` از نظرهای `confirmed`. | Product::getRate | Change | میانگین با دقت اعشاری ذخیره شود. نمایش گرد. | `ceil` اطلاعات را از دست می‌دهد. جزئیات Phase 8. |
| BR-32 | Follow/Block: به خود ممنوع. Block → پیام 404. | UserPageController | Preserve (Post-MVP) | همان. | |
| BR-33 | گزارش تخلف: یک گزارش برای هر کاربر/شیء. | ReportController | Preserve (Post-MVP) | همان. | |
| BR-34 | جایگاه صفحه اول: `expires_at = now + amount × func`. تکرار = 422. | AddableToFirstPage | Unknown | OD-08. | |
| BR-35 | پیام: `receiver_sid` باید با `receiver_id` همخوان باشد. | MessageController | Remove | حذف مکانیزم hash/sid. مالکیت و دسترسی سمت server. | جزئیات پیاده‌سازی. |
| BR-36 | ثبت‌نام: `uid` یکتا بین User و Shop. | RegisterController | Preserve | همان. یکتایی در سطح داده تضمین می‌شود. | C14. |
| BR-37 | رمز حداقل 6 کاراکتر. | RegisterController | Change | حداقل رمز در Phase 4. | امنیت. |
| BR-38 | کد ثبت‌نام 6 رقم بدون انقضا. کد فراموشی 5 رقم، 15 دقیقه. | authentication.md | Change | هر دو کد منقضی می‌شوند. طول و مدت در Phase 4. | S5، S7. |
| BR-39 | کاربر `status=0` مسدود: ورود ممنوع. | FrontLoginController | Preserve | همان. | |
| BR-40 | یک نشست فعال برای هر کاربر (`session_id`). | authentication.md | Unknown | نیاز کسب‌وکار روشن نیست. OD-13. | |
| BR-41 | Email اجباری و یکتا. بدون تأیید. | authentication.md | Unknown | اجباری بودن Email در Phase 4. | شاهد کافی برای نیاز نیست. |
| BR-42 | ProductDetail: فقط یک `index=1`. | setAsIndex | Preserve | همان. | |
| BR-43 | NotifyList: موجودی 0→مثبت و تغییر تخفیف اعلان می‌دهد. | Events | Preserve (Post-MVP) | همان. | |
| BR-44 | Soft Delete بسته به `APP_SOFT_DELETES`. | business-rules | Change | Order و مالی هرگز حذف فیزیکی نمی‌شوند. | ثبات مالی. |
| BR-45 | ذخیره آدرس در Order (Snapshot یا ارجاع) در Legacy بررسی نشد. | Order/Address (بررسی نشد) | Change | Snapshot آدرس. | |
