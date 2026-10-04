# Feature Decision Matrix

منبع: `docs/legacy/*`، Master Prompt، Operating Rules. این سند فقط **WHAT** را تعیین می‌کند. HOW در Phase 2 به بعد است.

## تعریف Decision

| Decision | معنی |
|---|---|
| KEEP | رفتار کسب‌وکار بدون تغییر مهم در سیستم جدید می‌ماند. |
| REDESIGN | هدف کسب‌وکار می‌ماند. رفتار یا ساختار تغییر می‌کند. |
| DEFER | در سیستم جدید لازم است. نه در MVP. |
| REMOVE | در سیستم جدید نمی‌آید. فقط برای کد مرده، تکراری یا مخرب با شاهد. |
| MIGRATION-ONLY | Feature نمی‌آید. داده تاریخی فقط خوانده یا منتقل می‌شود. |
| UNKNOWN | شاهد برای تصمیم کافی نیست. |

هر ردیف یک برچسب مبنا دارد: `EVIDENCE-BASED` (از کد Legacy)، `USER-DECISION` (کاربر صریحاً گفته)، `OPEN` (تصمیم کاربر لازم است)، `UNKNOWN` (شاهد ناکافی). این Phase هیچ `USER-DECISION` جدیدی ندارد.

## معیار ارزیابی

برای هر Feature این معیارها بررسی شد: اهمیت کسب‌وکار، ارزش کاربر، وابستگی، ریسک امنیتی، هزینه نگه‌داری، پیچیدگی، هزینه Migration، تناسب با معماری هدف.

## قانون REMOVE

REMOVE فقط وقتی استفاده می‌شود که کد استفاده نمی‌شود، تکراری است یا مخرب است، و شاهد در Repository هست. Feature رو به کاربر با شاهد ناکافی DEFER یا UNKNOWN می‌گیرد، نه REMOVE. فهرست REMOVE برای تأیید کاربر در `OD-14` ثبت شده است.

## Matrix

ستون «Priority»: `MVP`، `Post-MVP`، `Optional`، `Unknown` (وابسته به تصمیم باز)، `—` (بدون اولویت).

| ID | Domain | Feature | Legacy Evidence | Decision | New Version Behavior | Reason | Dependencies | Priority | Basis |
|---|---|---|---|---|---|---|---|---|---|
| F01 | Identity | ثبت‌نام با موبایل و کد OTP | RegisterController، Route فعال (A) | **KEEP** | کاربر با موبایل ثبت‌نام می‌کند. کد یک‌بارمصرف و منقضی‌شونده موبایل را تأیید می‌کند. | هسته ورود به سیستم. ارزش کاربر بالا. | SMS | MVP | EVIDENCE-BASED |
| F02 | Identity | مرحله موقت ثبت‌نام (`temporary_users`) | TemporaryUser::transmit (کپی داده + confirm=1) | **REDESIGN** | کاربر تا تأیید موبایل «تأییدنشده» می‌ماند. رکورد کاربر نهایی فقط بعد از تأیید فعال می‌شود. | جدول جدا فقط جزئیات پیاده‌سازی است. قاعده کسب‌وکار «تأیید قبل از فعال‌سازی» حفظ می‌شود. | Identity.Registration | MVP | EVIDENCE-BASED |
| F03 | Auth | ورود با موبایل و رمز | FrontLoginController (A) | **KEEP** | ورود با موبایل و رمز. کاربر مسدود وارد نمی‌شود. | هسته ورود. | Identity | MVP | EVIDENCE-BASED |
| F04 | Auth | بازیابی رمز با SMS | ForgotPasswordController (A) | **KEEP** | کد SMS یک‌بارمصرف رمز را بازنشانی می‌کند. | کاربر بدون آن قفل می‌شود. | SMS | MVP | EVIDENCE-BASED |
| F05 | Auth | جداسازی ورود Admin از ورود مشتری | C13: Guard admins و web روی یک جدول | **REDESIGN** | Admin نشست جدا و نقش جدا دارد. ورود Admin نشست مشتری را عوض نمی‌کند. | خطر امنیتی. قاعده نقش حفظ می‌شود. | Authorization | MVP | EVIDENCE-BASED |
| F06 | Auth | Impersonation / `show_as_customer` | Route و ستون. بدون Log (B) | **DEFER** | هر ورود به‌جای کاربر Log دارد و دلیل ثبت می‌شود. زمان‌بندی: بعد از MVP. | ابزار پشتیبانی. ریسک امنیتی بالا. برای MVP ضروری نیست. | Admin.AuditLog | Post-MVP | EVIDENCE-BASED |
| F07 | Authorization | نقش و مجوز (ACL kodeine) | Config ACL، `protect_alias` (A) | **REDESIGN** | Role و Permission سمت server. چک مالکیت روی هر شیء (سفارش، فروشگاه، پیام). | Legacy فقط Route را چک می‌کند. مالکیت جدا چک می‌شود. | Identity | MVP | EVIDENCE-BASED |
| F08 | Authorization | مالک فروشگاه = فروشنده | checkIfOrderBelongsToUser | **KEEP** | فروشنده کاربری است که Shop دارد. فقط به Orderهای Shop خود دسترسی دارد. | قاعده روشن Legacy. | Shop | MVP | EVIDENCE-BASED |
| F09 | User Profile | ویرایش پروفایل | Route profile/* (A) | **KEEP** | کاربر نام، تصویر و اطلاعات خود را ویرایش می‌کند. | — | Identity | MVP | EVIDENCE-BASED |
| F10 | User Profile | آدرس‌های کاربر | `addresses`، Step4 Checkout (A) | **KEEP** | چند آدرس با استان و شهر. آدرس در Order Snapshot می‌شود. | Checkout به آدرس نیاز دارد. | Geography | MVP | EVIDENCE-BASED |
| F11 | User Profile | کارت/حساب بانکی کاربر (`user_banks`) | Route profile/*، `UserBank` | **REDESIGN** | حساب مقصد برداشت وجه برای فروشنده و (در صورت تصمیم OD-01) کاربر. فقط وقتی Wallet/Credit برداشت دارد فعال می‌شود. | هدف کسب‌وکار فقط تسویه است. ثبت Legacy فقط مبنای رفتار. | Wallet | Post-MVP | OPEN |
| F12 | User Profile | صفحه عمومی کاربر (UserPage) | Route (A: Follow/Block). جزئیات بررسی نشد | **DEFER** | — | Social. وابسته به تصمیم OD-04. | Social | Post-MVP | OPEN |
| F13 | Catalog | دسته‌بندی سه‌سطحی | Models/Migration (A) | **KEEP** | درخت سه‌سطحی. Admin مدیریت می‌کند. | هسته مرور. | — | MVP | EVIDENCE-BASED |
| F14 | Catalog | برند | Model Brand (A) | **KEEP** | Admin مدیریت می‌کند. محصول یک برند دارد. | — | — | MVP | EVIDENCE-BASED |
| F15 | Product | محصول (Product) | ProductController، Migration (A) | **KEEP** | عنوان، توضیح، دسته، برند، مشخصات، تصاویر. مالک Shop. | هسته. | Shop,Catalog | MVP | EVIDENCE-BASED |
| F16 | Product | نوع/رنگ محصول (ProductDetail) | price، discount، count، weight، color، index | **REDESIGN** | هر محصول چند Variant دارد: رنگ، قیمت، تخفیف درصدی، موجودی، وزن. یک Variant «اصلی» است. | محتوای کسب‌وکار حفظ می‌شود.  موجودی منفی ممنوع. | Product | MVP | EVIDENCE-BASED |
| F17 | Product | مشخصات و Propertyهای قابل انتخاب | ProductProperty، Cart property validation (A) | **KEEP** | مشخصات نمایشی و ویژگی‌های انتخابی (مثل سایز) در Cart ثبت می‌شود. | — | Product | MVP | EVIDENCE-BASED |
| F18 | Product | قاعده قیمت نهایی و گردکردن | C5: دو الگوریتم. ProductDetail فعال | **REDESIGN** | قیمت نهایی = قیمت - تخفیف درصدی. قاعده گردکردن (۱۰۰/۱۰۰۰ تومان): OD-11. | دو نسخه متناقض. نسخه Model فعال است. | Money convention | MVP | OPEN |
| F19 | Product | تأیید محصول توسط Admin | C1: `display` فعال. `status` بلااستفاده | **REDESIGN** | محصول جدید «در انتظار تأیید» است. فقط Admin آن را منتشر می‌کند. یک مدل وضعیت واحد. | Legacy فعال (`display=0`). ستون `status` حذف می‌شود. | Admin | MVP | EVIDENCE-BASED |
| F20 | Product | آرشیو و فیلتر محصول | ProductController@index (A) | **KEEP** | لیست با فیلتر دسته، برند، قیمت. صفحه‌بندی. | هسته مرور. جزئیات `filterBy*` در U7 نامعلوم است. | Catalog | MVP | EVIDENCE-BASED |
| F21 | Product | شمارنده بازدید و محصول پربازدید | Cookie ۱۵ دقیقه‌ای | **DEFER** | — | ارزش پایین برای MVP. | Product | Optional | EVIDENCE-BASED |
| F22 | Product | آگاه‌سازی موجود شدن / تخفیف (NotifyList) | Events ProductCountChanged/ProductHasOff (B) | **DEFER** | کاربر محصول را دنبال می‌کند و اعلان می‌گیرد. | Event فعال. وابسته به Notification. | Notification | Post-MVP | EVIDENCE-BASED |
| F23 | Search | جستجوی کاربر/فروشگاه | SearchController: فقط User/Shop (B) | **DEFER** | — | Legacy محصول را جستجو نمی‌کند. جستجوی محصول: Potential New Feature PNF-01. | Catalog | Post-MVP | EVIDENCE-BASED |
| F24 | Shop | ساخت و ویرایش فروشگاه | Profile/ShopController، ShopRequest (A) | **REDESIGN** | فروشگاه عنوان، uid یکتا (بین کاربر و فروشگاه)، شهر، ایمیل، پس‌زمینه، ارسال، کد پستی دارد. سیاست تأیید فروشگاه در OD-05. | Legacy: فروشگاه فوری نمایش داده می‌شود (`display=1`). | Identity | MVP | OPEN |
| F25 | Shop | شهرهای سرویس و روش ارسال فروشگاه | `city_shop.price`، `send_types` (A) | **REDESIGN** | فروشنده شهرها و قیمت ارسال هر شهر را تعیین می‌کند. | Checkout به آن نیاز دارد. | Geography,Shipping | MVP | EVIDENCE-BASED |
| F26 | Shop | صفحه عمومی فروشگاه | ShopPageController (A/B) | **KEEP** | نام، محصولات، نظرها. بخش‌های اضافه (clients, specialSells) UNKNOWN. | — | Shop,Product | MVP | UNKNOWN |
| F27 | Shop | مدیریت محصول توسط فروشنده | Profile/ProductController (A) | **KEEP** | افزودن/ویرایش/حذف. تصویر جدید تأیید مجدد می‌خواهد. | — | Product | MVP | EVIDENCE-BASED |
| F28 | Seller | مدیریت سفارش توسط فروشنده | Profile/OrderController@updateStatus (A) | **REDESIGN** | فروشنده فقط Orderهای Shop خود را با ترتیب مجاز جلو می‌برد. | Legacy ترتیب مجاز را دارد. باگ‌ها اصلاح می‌شوند. | Order | MVP | EVIDENCE-BASED |
| F29 | Cart | سبد خرید چند فروشگاهی | Cart/CartDetail per shop (A) | **REDESIGN** | سبد به ازای Shop تقسیم می‌شود. هر Shop یک Order جدا می‌شود. Guest سبد دارد. Checkout ورود می‌خواهد. | Legacy Cookie و Guest دارد. نیاز به ورود در Step3 از نیت کد مشخص است (C6). | Product | MVP | EVIDENCE-BASED |
| F30 | Cart | بررسی موجودی در Cart | CartMiddleware، StepCheckExists (resolved U8) | **REDESIGN** | موجودی در افزودن، در Checkout و هنگام پرداخت بررسی می‌شود. | Legacy فقط در Cart بررسی می‌کند. نه در پرداخت. | Product | MVP | EVIDENCE-BASED |
| F31 | Checkout | مراحل Checkout (آدرس، ارسال، پرداخت، مرور) | CartController step1..6 (A) | **REDESIGN** | اطلاعات لازم: آدرس، روش ارسال، روش پرداخت، تأیید نهایی. تعداد مراحل UI تصمیم Phase 6/11 است. | محتوای کسب‌وکار حفظ. تعداد مراحل تصمیم UI است. | Cart,Address,Shipping,Payment | MVP | EVIDENCE-BASED |
| F32 | Checkout | منع خرید از فروشگاه خود | Step3: CartDetail حذف می‌شود | **KEEP** | مالک Shop از Shop خود خرید نمی‌کند. | قاعده Legacy فعال. | Cart | MVP | EVIDENCE-BASED |
| F33 | Shipping | ارسال توسط فروشگاه (SendType 1) | Order.php:143، CartDetail.php:84 | **REDESIGN** | هزینه از شهر مقصد فروشگاه. بدون عدد ثابت ۱ در کد. | شناسه عددی ثابت مشکل است. رفتار حفظ می‌شود. | Shop,Geography | MVP | EVIDENCE-BASED |
| F34 | Shipping | ارسال پستی (`PostApi`، `post-plans`) | C: `dd(config())` در `PostApi::price` (B11) | **DEFER** | — | کد قابل اجرا نیست. نیاز کسب‌وکار در OD-06. | Shipping | Post-MVP | OPEN |
| F35 | Shipping | پرداخت در محل (`pay_types.type=home`) | U12: کلاس پیدا نشد | **UNKNOWN** | — | شاهد ناکافی. OD-12. | Payment | Unknown | UNKNOWN |
| F36 | Checkout | مالیات (`tax`) | TAX=0 ثابت (B8) | **DEFER** | مالیات صفر محاسبه می‌شود. نیاز قانونی در OD-07. | Legacy هیچ‌وقت مالیات نمی‌گیرد. | Money | Post-MVP | OPEN |
| F37 | Order | ایجاد Order | CartDetail::transmit (A) | **REDESIGN** | Order با وضعیت «در انتظار پرداخت» ساخته می‌شود. بعد از پرداخت موفق «ثبت‌شده» می‌شود. Snapshot قیمت، آدرس، محصول. | C2/B3: «ثبت‌شده» قبل و بعد از پرداخت یکی است. | Payment | MVP | EVIDENCE-BASED |
| F38 | Order | وضعیت Order و گذارها | state-machines.md | **REDESIGN** | ترتیب مجاز Legacy حفظ می‌شود. وضعیت جدید «در انتظار پرداخت» اضافه می‌شود. | state-machine-decisions.md | Order | MVP | EVIDENCE-BASED |
| F39 | Order | لغو Order و برگشت وجه | Order::disconfirm (B1،B2،B5،B6) | **REDESIGN** | لغو قبل از «تماس/ارسال» مجاز. یک بار. موجودی برمی‌گردد. مبلغ به مقصد تعیین‌شده برمی‌گردد. | باگ‌های Legacy ≠ قاعده. مقصد برگشت وجه OD-01. | Payment,Wallet | MVP | OPEN |
| F40 | Order | تاریخچه و وضعیت سفارش مشتری | Profile/OrderController (A) | **KEEP** | مشتری فهرست و جزئیات سفارش و وضعیت را می‌بیند. | — | Order | MVP | EVIDENCE-BASED |
| F41 | Notification | SMS وضعیت سفارش | Listener SendOrderStatusNotification (A، C12) | **REDESIGN** | SMS برای تأیید، ارسال، لغو. متن در Phase 13 تعیین می‌شود. | C12: دو مسیر متناقض. | SMS | MVP | EVIDENCE-BASED |
| F42 | Notification | اعلان داخلی (Announcement) | Announcement model (A) | **KEEP** | اعلان داخل سایت برای کاربر و فروشنده. | — | Notification | Post-MVP | EVIDENCE-BASED |
| F43 | Payment | درگاه Mellat | MellatPayment، Callback Route (A) | **KEEP** | پرداخت آنلاین ریالی با Mellat. شناسه مرجع ذخیره می‌شود. | تنها درگاه فعال. | Order | MVP | EVIDENCE-BASED |
| F44 | Payment | تأیید Callback پرداخت | S8، U11، B14 | **REDESIGN** | Callback تکراری فقط یک بار اثر دارد. مبلغ با Order مقایسه می‌شود. | امنیت و صحت مالی. | Payment | MVP | EVIDENCE-BASED |
| F45 | Payment | Zarrinpal | پکیج هست. استفاده نشده (C) | **REMOVE** | — | کد مرده. | — | — | EVIDENCE-BASED |
| F46 | Payment | AsanPardakht | کلاس هست. وضعیت در DB نامعلوم (U13) | **UNKNOWN** | — | نیاز به بررسی DB Production. | Payment | Unknown | UNKNOWN |
| F47 | Payment | پرداخت با Credit | CreditPayment (A) | **REDESIGN** | پرداخت از موجودی کاربر. وجود آن وابسته به OD-01. | دو استخر پول (C9). | Wallet/Credit | Unknown | OPEN |
| F48 | Credit | شارژ Credit کاربر | CreditController@store/verify (A، C10) | **DEFER** | — | وابسته به OD-01. | Payment | Post-MVP | OPEN |
| F49 | Credit | برداشت Credit کاربر (`requests_checkout_credit`) | Admin CreditController (A) | **DEFER** | — | وابسته به OD-01. | Credit | Post-MVP | OPEN |
| F50 | Wallet | دفتر کل Wallet فروشگاه | Wallet، WalletTransaction (A) | **REDESIGN** | هر فروش و برگشت یک ورودی دفتر دارد. موجودی از دفتر محاسبه می‌شود. | C9: سه نمایش پول. | Order,Money | MVP | EVIDENCE-BASED |
| F51 | Wallet | درخواست تسویه فروشنده (Checkout) | Profile/CheckoutController (A) | **REDESIGN** | فروشنده درخواست برداشت می‌دهد. Admin تأیید یا رد می‌کند. وضعیت نهایی تغییرنکردنی. | Legacy اجازه تغییر `done` را می‌دهد. | Wallet | Post-MVP | OPEN |
| F52 | Wallet | دوره نگهداری وجه (۳ روز) | Wallet::getRemoveableAttribute | **REDESIGN** | وجه Order تا پایان دوره یا وضعیت «دریافت» قابل برداشت نیست. مقدار در OD-03. | قاعده فعال. مقدار نیاز به تأیید. | Wallet | Post-MVP | OPEN |
| F53 | Wallet | کمیسیون پلتفرم | ADMIN_CHECKOUT_PERCENT=0 (.env.example) | **REDESIGN** | درصد کمیسیون قابل تنظیم. مقدار اولیه در OD-02. | مقدار Production نامعلوم. | Wallet | Unknown | OPEN |
| F54 | Wallet | سیستم تسویه قدیمی (`check_outs`، `Base/CheckOut`) | C: Model قدیمی ۲۰۱۷ | **MIGRATION-ONLY** | فقط داده تاریخی خوانده می‌شود. | جایگزین توسط Wallet. | Migration | — | EVIDENCE-BASED |
| F55 | Promotion | جایگاه پولی صفحه اول و Plan (پیشنهاد/فروش ویژه) | FirstPage*Controller، Plan، C4 | **DEFER** | — | قیمت متناقض (C4). مدل کسب‌وکار در OD-08. | Payment | Post-MVP | OPEN |
| F56 | Promotion | اسلایدر و بخش‌های صفحه اصلی | HomeController@index (A) | **KEEP** | Slider، دسته‌ها، فروشگاه‌های برتر. Admin مدیریت می‌کند. | — | Catalog,Admin | MVP | EVIDENCE-BASED |
| F57 | Social | نظر و امتیاز (محصول و فروشگاه) | CommentController (A، C7) | **REDESIGN** | هر کاربر وارد (غیر از مالک) یک نظر برای هر شیء. امتیاز 1..5. سیاست تأیید نظر: OD-09. | C7: نظر مستقیم `confirmed` است. | Product,Shop | Post-MVP | OPEN |
| F58 | Social | Favorite | FavoriteController (A) | **KEEP** | علاقه‌مندی محصول. | — | Product | Post-MVP | EVIDENCE-BASED |
| F59 | Social | Follow (کاربر و فروشگاه) | UserPageController، ShopPageController (A) | **DEFER** | — | وابسته به OD-04. | Social | Post-MVP | OPEN |
| F60 | Social | Block | `inBlockList` در پیام (A) | **DEFER** | — | وابسته به Messaging. | Messaging | Post-MVP | OPEN |
| F61 | Social | جدول `follows` (بدون استفاده) | D5: جدول وجود دارد. Model استفاده نمی‌شود | **REMOVE** | — | استفاده پیدا نشد. `followers` فعال است. | — | — | EVIDENCE-BASED |
| F62 | Social | اشتراک محصول با دوستان (Share) | ShareController، UserSuggestedAProduct (B) | **DEFER** | — | ارزش MVP پایین. | Notification | Optional | EVIDENCE-BASED |
| F63 | Social | Timeline | Route فقط. منطق بررسی نشد (U20) | **UNKNOWN** | — | شاهد ناکافی. | Social | Unknown | UNKNOWN |
| F64 | Social | Comparison (مقایسه) | Route فقط. Cookie (U20) | **UNKNOWN** | — | شاهد ناکافی. | Product | Unknown | UNKNOWN |
| F65 | Messaging | پیام مستقیم (`messages`/Thread) | Specific/MessageController (A، C8) | **REDESIGN** | یک سیستم پیام واحد کاربر↔کاربر/فروشگاه. Block فرستنده را محدود می‌کند. | C8: چهار سیستم. | Identity | Post-MVP | OPEN |
| F66 | Messaging | تیکت و پشتیبانی (`msg`, `tickets`) | MsgController، Migration ۲۰۲۱ (B، C8) | **DEFER** | — | ادغام با Messaging. نیاز در OD-04. | Messaging | Post-MVP | OPEN |
| F67 | Messaging | پیام درباره محصول (`product_message`) | Route Front/Admin (B) | **DEFER** | — | ادغام با Messaging. | Messaging | Post-MVP | EVIDENCE-BASED |
| F68 | Messaging | Musonza Chat و `conversations` | ChatController (C) | **REMOVE** | — | چت موازی تکراری. استفاده فعال پیدا نشد. | — | — | EVIDENCE-BASED |
| F69 | Reporting | گزارش تخلف | ReportController (A) | **KEEP** | هر کاربر یک گزارش برای هر شیء. Admin بررسی می‌کند. | — | Admin | Post-MVP | EVIDENCE-BASED |
| F70 | CMS | صفحات ثابت (AboutUs، Policy، FAQ، Guide) | Route فعال. جزئیات بررسی نشد (U21) | **UNKNOWN** | — | شاهد ناکافی. | Admin | Unknown | UNKNOWN |
| F71 | CMS | مقاله و خبر (Article، News) | دو Article: Admin و Profile (B) | **UNKNOWN** | — | شاهد ناکافی. | Admin | Unknown | UNKNOWN |
| F72 | CMS | گالری و Page | (U21) | **UNKNOWN** | — | شاهد ناکافی. | Media | Unknown | UNKNOWN |
| F73 | CMS | Newsletter | (U21) | **UNKNOWN** | — | شاهد ناکافی. | Notification | Unknown | UNKNOWN |
| F74 | CMS | Short link | Route `short_link` (B) | **DEFER** | — | ارزش MVP پایین. | — | Optional | EVIDENCE-BASED |
| F75 | Advertisement | درخواست تبلیغ | فقط ثبت درخواست. پرداخت/نمایش پیدا نشد (U22) | **UNKNOWN** | — | شاهد ناکافی. چیزی اختراع نمی‌شود. | — | Unknown | UNKNOWN |
| F76 | Admin | داشبورد و CRUD پایه Admin | routes/admin/* (A) | **REDESIGN** | Admin کاربر، فروشگاه، محصول، Order (مشاهده)، دسته، برند، Slider را مدیریت می‌کند. مجموعه کمینه برای MVP. | — | Authorization | MVP | EVIDENCE-BASED |
| F77 | Admin | مدیریت `pay_types` و `send_types` | routes/admin/base.php ~277-289 (resolved U19) | **REDESIGN** | Admin روش‌های پرداخت و ارسال را فعال/غیرفعال می‌کند. بدون نام کلاس در DB. | A3: `new $className()` از DB. | Payment,Shipping | MVP | EVIDENCE-BASED |
| F78 | Admin | تأیید تسویه و Credit | Admin Checkout/Credit (A) | **REDESIGN** | Admin درخواست‌ها را تأیید یا رد می‌کند. وضعیت نهایی تغییرنکردنی. | — | Wallet | Post-MVP | OPEN |
| F79 | Admin | Export Excel | Admin (B، C11) | **DEFER** | — | Convenience. | Admin | Optional | EVIDENCE-BASED |
| F80 | Admin | Audit Log (spatie activitylog) | composer، استفاده فعال بررسی نشد | **REDESIGN** | اقدام Admin روی پول، سفارش، کاربر ثبت می‌شود. | — | Admin | Post-MVP | EVIDENCE-BASED |
| F81 | Admin | نمای Developer | views/admin/developer (U34) | **UNKNOWN** | — | محتوا بررسی نشد. | — | Unknown | UNKNOWN |
| F82 | Admin | ماژول‌های بقایای Template: Calendar، Week، Member، Education | (C) بدون ارتباط Marketplace | **REMOVE** | — | بقایای Template. | — | — | EVIDENCE-BASED |
| F83 | Admin | Tag، Factor، Inventory | (C) کاربرد روشن نیست | **UNKNOWN** | — | ممکن است داده Production داشته باشند. | — | Unknown | UNKNOWN |
| F84 | Geography | استان و شهر | `provinces`/`cities`، ShopRequest (A) | **KEEP** | فهرست استان و شهر برای آدرس و سرویس فروشگاه. | — | — | MVP | EVIDENCE-BASED |
| F85 | Geography | نقشه، `latlong`، `get-position` | (U28) | **UNKNOWN** | — | سرویس نقشه نامعلوم. | — | Unknown | UNKNOWN |
| F86 | SEO | متای صفحه، URL پایدار، sitemap، robots، canonical، OpenGraph | E1: خالی. بدون sitemap/robots | **REDESIGN** | صفحات عمومی محصول، فروشگاه و دسته عنوان و توضیح منحصربه‌فرد، canonical و sitemap دارند. URL پایدار. | Legacy فاقد SEO است. | Catalog | MVP | EVIDENCE-BASED |
| F87 | Media | تصاویر (محصول، فروشگاه، آواتار، اسلایدر) | AttachmentTrait، Intervention Image (A) | **REDESIGN** | فقط تصویر. فرمت و حجم مجاز محدود. بدون اجرای فایل. | نوع رسانه فقط تصویر است. | Product,Shop | MVP | EVIDENCE-BASED |
| F88 | Media | پیوست پیام (فایل) | Disk `public/message` | **DEFER** | — | نوع فایل مجاز نامعلوم. | Messaging | Post-MVP | UNKNOWN |
| F89 | Media | ویدیو و صوت (`createVideo`، `createMusic`، ffmpeg) | C16: هیچ‌جا صدا زده نمی‌شود | **REMOVE** | — | کد مرده. ffmpeg حذف شده. | — | — | EVIDENCE-BASED |
| F90 | Infra | Scheduler پاکسازی (OTP، سبد، پلن، سفارش پرداخت‌نشده) | U26: Scheduler خالی | **REDESIGN** | OTP منقضی و سفارش پرداخت‌نشده منقضی می‌شود. | بدون پاکسازی داده بی‌پایان رشد می‌کند. | Order,Identity | MVP | EVIDENCE-BASED |
| F91 | Infra | Broadcast / Pusher | تعریف شده. استفاده نامعلوم (U27) | **UNKNOWN** | — | شاهد ناکافی. | — | Unknown | UNKNOWN |
| F92 | Infra | Analytics | (U29) | **UNKNOWN** | — | اسکریپت‌ها بررسی نشد. | — | Unknown | UNKNOWN |
| F93 | Infra | Modelهای تکراری Base/* | M4 | **REMOVE** | — | تکرار. | — | — | EVIDENCE-BASED |
| F94 | Infra | SMS Providerهای بلااستفاده (leadthread، Twilio، Plivo) | (C) | **REMOVE** | — | کد مرده. | — | — | EVIDENCE-BASED |
| F95 | Infra | Event `ProductAdded` | M6: Dispatch نمی‌شود | **REMOVE** | — | کد مرده. | — | — | EVIDENCE-BASED |
| F96 | Infra | Vue، vue-router، HTML minify | (C) | **REMOVE** | — | بدون استفاده. | — | — | EVIDENCE-BASED |
| F97 | Security | مسیر `products/{id}/get` و `getProductByKey` | helpers_general.php:253: `File::deleteDirectory(base_path('app/Http'))` | **REMOVE** | — | کد مخرب. اجرای آن پوشه کد را پاک می‌کند. | — | — | EVIDENCE-BASED |

## شمارش

| Decision | تعداد |
|---|---|
| Total Features | 97 |
| KEEP | 21 |
| REDESIGN | 33 |
| DEFER | 18 |
| REMOVE | 10 |
| MIGRATION-ONLY | 1 |
| UNKNOWN | 14 |

| Priority | تعداد |
|---|---|
| MVP | 42 |
| Post-MVP | 24 |
| Optional | 4 |
| Unknown | 16 |
| — | 11 |

| Basis | تعداد |
|---|---|
| EVIDENCE-BASED | 61 |
| OPEN | 20 |
| UNKNOWN | 16 |
| USER-DECISION | 0 |
