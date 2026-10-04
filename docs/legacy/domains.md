# Domainها

Domainها از Routeها، Controllerها و Modelهای واقعی استخراج شده‌اند.
Shanilo یک **Marketplace چند فروشنده‌ای** با جنبه اجتماعی است (Follow، Message، Comment، Timeline).

فهرست Domainها:
Identity، Catalog، Shop، Cart، Order، Payment، Wallet/Credit، Promotion، Social، Messaging، Notification، CMS، Advertisement، Geography، Admin.

---

## Domain: Identity (User / Auth)

**Purpose:** ثبت‌نام با موبایل، ورود، پروفایل، آدرس، کارت بانکی.

**Main entities:** User، TemporaryUser، PasswordResetMobile، Address، BankCart، Role/Permission.

**Main routes:** `/ورود-به-سایت`, `/login-auth`, `/register`, `/تایید-شماره-همراه`, `/password/mobile*`, `profile/*`, `profile/address`, `profile/bankCart`.

**Main controllers:** `Front/Auth/*`, `Front/Specific/Profile/ProfileController`, `AddressController`, `BankCartController`, `PasswordController`.

**Main database tables:** `users`, `temporary_users`, `password_reset_mobiles`, `addresses`, `bank_carts`, `roles`, `permissions`, `role_user`, `permission_user`.

**Main services:** ندارد. Helper `sendConfirmationSMS`.

**Main business rules:**
- ورود با `mobile` + password.
- حساب `status=0` مسدود است.
- حساب `confirm=0` باید با SMS فعال شود.
- هر کاربر فقط یک Session فعال دارد (Session قبلی destroy می‌شود).
- `uid` یکتا بین `users` و `shops` است.

**Authentication:** Session. جزئیات در `authentication.md`.

**Authorization:** نقش پیش‌فرض `role_id=3`. نقش 1 و 2 ادمین هستند (در Search حذف می‌شوند).

**External dependencies:** SMS.ir.

**Important side effects:** ارسال SMS در ثبت‌نام، ورود حساب تأییدنشده، فراموشی رمز.

**Known problems:** `current-problems.md` (OTP، Throttle).

**Dependencies on other domains:** Messaging، Shop، Order، Wallet/Credit.

**Questions / Unknowns:** Mutator رمز عبور (Hash). `ChangeMobileRequest` جریان تغییر موبایل. `UserMutator` عمیق خوانده نشد.

---

## Domain: Catalog (Product)

**Purpose:** محصول، زیرمحصول (Variant رنگی)، دسته، برند، مشخصات فنی، Property.

**Main entities:** Product، ProductDetail، ProductCategory (درختی، `baum/baum`)، Brand، Color، TechnicalSpecification، ProductProperty، ProductPropertyDetail.

**Main routes:** `products`, `products/detail/{productDetail}/{slug?}`, `profile/product*`, `profile/productDetail*`, `profile/productPropertyDetail*`.

**Main controllers:** `Front/Specific/ProductController`, `Profile/ProductController`, `Profile/ProductDetailController`, Admin `ProductController`.

**Main database tables:** `products`, `product_details`, `product_categories`, `product_product_category`, `brands`, `colors`, `technical_specifications`, `product_category_technical_specifications`, `product_product_category_technical_specification`, `product_properties`, `product_property_details`.

**Main services:** ندارد. Trait `HasFilter`, `VisibilityTrait`, `PurePriceTrait`.

**Main business rules:**
- محصول جدید با `display=0` ساخته می‌شود. نمایش بعد از تأیید Admin.
- قیمت، تخفیف، موجودی، وزن روی `ProductDetail` هستند (نه `Product`).
- هر Product یک ProductDetail شاخص (`index=1`) دارد.
- محصول باید دسته سطح ۱، ۲، ۳ و برند داشته باشد.
- تصویر اصلی اجباری است (jpg/jpeg/png، حداکثر 5120 KB).
- نیاز به یکی از «توضیح» یا «مشخصات فنی».
- آپلود تصویر Gallery، `display` محصول را دوباره 0 می‌کند.
- فقط مالک Shop حق ویرایش دارد (`canEditProduct`).

**Authentication:** `auth` برای مدیریت. مشاهده عمومی.

**Authorization:** مالکیت Shop.

**External dependencies:** Intervention Image.

**Important side effects:** Event `ProductCountChanged` (موجود شدن)، `ProductHasOff` (تغییر تخفیف). Announcement برای NotifyList.

**Known problems:** دو سازوکار تأیید (`display` و `status`). دو پیاده‌سازی `pure_price`.

**Dependencies on other domains:** Shop، Cart، Order، Social، Notification.

**Questions / Unknowns:** `products/{id}/get` (`getByKey`) هدف ندارد و مشکوک است.

---

## Domain: Shop (Seller)

**Purpose:** فروشگاه کاربر، شهرهای سرویس‌دهی، روش‌های ارسال.

**Main entities:** Shop، Wallet (هنگام ساخت Shop)، ارتباط `city_shop`، `send_type_shop`، `product_category_shop`.

**Main routes:** `profile/shop*`, `shop-page/*`, `shops`.

**Main controllers:** `Profile/ShopController`, `ShopPageController`, `ShopController`.

**Main database tables:** `shops`, `wallets`, `city_shop`, `send_type_shop`, `product_category_shop`.

**Main business rules:**
- ساخت Shop به‌طور خودکار یک Wallet می‌سازد (`Shop::boot`).
- حذف Shop همه محصولاتش را حذف می‌کند.
- پیش‌فرض شهرها: اگر انتخاب نشود، همه شهرهای دارای State.
- فروشنده نمی‌تواند از Shop خودش خرید کند.
- `display` پیش‌فرض Shop برابر 1 است (بدون تأیید Admin، طبق Migration).

**Authorization:** مالکیت (`canEditShop`).

**Known problems:** `Shop::store` از `beginTransaction/commit` بدون `rollBack` استفاده می‌کند.

**Dependencies:** Catalog، Order، Wallet، Social، Geography.

**Questions / Unknowns:** `ShopRequest` قواعد کامل. `Shop` accessor/scopeهای `orderByFollowers`, `orderByRate`.

---

## Domain: Cart

**Purpose:** سبد خرید و مراحل Checkout (۶ مرحله).

**Main entities:** Cart، CartDetail (یک ردیف به ازای هر Shop)، CartDetailProduct.

**Main routes:** `cart/step1..step6`, `cart/{productDetail}/toggle`, `cart/update-count/*`.

**Main controllers:** `Front/Specific/CartController`.

**Main database tables:** `carts`, `cart_details`, `cart_detail_products`.

**Main services:** `app/Http/Helpers/Cart/Cart.php` (Facade `Cart`).

**Main business rules:** `business-rules.md` بخش Cart.

**Authentication:** سبد با Cookie `cart` (حدود ۵ سال). مراحل ۲ به بعد باید `auth` باشند، ولی Middleware اعمال نمی‌شود (typo). `contradictions.md`.

**Known problems:** `current-problems.md`.

**Dependencies:** Catalog، Shop، Identity (Address)، Order.

---

## Domain: Order

**Purpose:** سفارش، وضعیت، پیگیری.

**Main entities:** Order، OrderDetail.

**Main routes:** `profile/order/{type}/index`, `profile/order/{order}/show`, `.../updateStatus`, `payment/result/{order}`.

**Main controllers:** `Profile/OrderController`, `PaymentController`, Admin `OrderController`.

**Main database tables:** `orders`, `order_details`.

**Main business rules:** `state-machines.md`, `business-rules.md`.

**External dependencies:** SMS.ir (قالب‌های ثابت).

**Important side effects:** کاهش موجودی، ثبت تراکنش Wallet، Announcement، SMS، CreditLog.

**Known problems:** `current-problems.md`.

---

## Domain: Payment

**Purpose:** پرداخت سفارش، شارژ Credit، خرید پلن تبلیغ صفحه اول.

**Main entities:** Payment (Polymorphic: `payable`)، PayType، Plan.

**Main database tables:** `payments`, `pay_types`, `plans`.

**Main services:** `Http/Helpers/Payment/{MellatPayment, AsanPardakhtPayment, CreditPayment}` + Interface.

**Main business rules:** `critical-flows.md`.

**External dependencies:** Mellat. AsanPardakht (پیاده‌سازی 61 خط، استفاده UNKNOWN).

**Known problems:** Credential در Config، Callback بدون Idempotency.

---

## Domain: Wallet / Credit

**Purpose:** دو موجودی جدا: Wallet فروشگاه و Credit کاربر.

**Main entities:** Wallet، WalletTransaction، Checkout (تسویه فروشگاه)، User.credit، CreditLog، RequestCheckoutCredit (تسویه Credit).

**Main database tables:** `wallets`, `wallet_transactions`, `checkouts`, `credit_log`, `requests_checkout_credit`, `users.credit`, `check_outs` (قدیمی).

**Main business rules:** `business-rules.md` بخش Wallet/Credit.

**Known problems:** نبود Lock، دو سیستم تسویه موازی.

---

## Domain: Promotion

**Purpose:** SpecialSuggestion، SpecialSell، جایگاه ویژه صفحه اصلی (پولی).

**Main entities:** SpecialSuggestion، SpecialSell، FirstPageSpecialSuggestion، FirstPageSpecialSell، Plan.

**Main routes:** `profile/specialSuggestion*`, `profile/specialSells*`, `profile/firstPageSpecial*`, `/پیشنهادات-ویژه`, `/فروش-ویژه`.

**Main business rules:**
- مالک محصول، آن را «ویژه» می‌کند.
- برای صفحه اول، Plan می‌خرد. مدت: `Carbon::now()->add{plan.func}(plan.amount)`.
- پرداخت با Mellat یا Credit.
- محصولی که در صفحه اول است، Plan دیگر نمی‌گیرد.

**Known problems:** `payFirstPageSpecialSell` در Mellat مبلغ ثابت `100` می‌فرستد (نه `plan.price`). `contradictions.md`.

---

## Domain: Social

**Purpose:** Follow، Block، Comment/Rate، Report، Favorite، Comparison، NotifyList، Share.

**Main entities:** Follower (Polymorphic)، block list، Comment (Polymorphic)، ViolationReport، Favorite، Comparison، NotifyList.

**Main business rules:**
- نظر دهنده نمی‌تواند صاحب Shop باشد. هر کاربر یک نظر.
- Favorite و Comparison با Cookie برای مهمان هم کار می‌کنند.
- Block: پیام به کاربر بلاک‌کننده ممکن نیست.

**Known problems:** نظر از Front مستقیم `confirmed` می‌شود.

---

## Domain: Messaging

**Purpose:** پیام کاربر به کاربر/فروشگاه، تیکت پشتیبانی.

**Main entities:** Message، Msg/MsgDetail، ProductMessage، Ticket، Conversation (musonza).

**Main database tables:** `messages`, `msg`, `msg_details` (UNKNOWN نام دقیق)، `product_messages`, `tickets`, `conversations`, `conversation_user`.

**Known problems:** حداقل ۳ سیستم پیام موازی. `contradictions.md`.

---

## Domain: Notification

**Purpose:** Announcement داخلی (HTML ذخیره‌شده)، SMS.

**Main entities:** Announcement.

**Main business rules:** Listenerها Announcement می‌سازند. `ProductAdded` تعریف شده ولی Dispatch نمی‌شود.

---

## Domain: CMS

**Purpose:** Article (کاربر و Admin)، News، Page، FAQ، Guide، Policy، AboutUs، Gallery، Slider، Newsletter، Setting.

**Main controllers:** `Front/Base/*`, Admin `Base/*`.

**Questions / Unknowns:** عمیق بررسی نشد. `unknowns.md`.

---

## Domain: Advertisement

**Purpose:** درخواست تبلیغ (Plan، Time، Detail). ثبت `AdRequest` (حتی بدون ورود).

**Main tables:** `advertisements`, `ad_plans`, `ad_times`, `ad_details`, `ad_sections`, `ad_requests`.

**Questions / Unknowns:** پرداخت تبلیغ پیدا نشد. فقط ثبت درخواست.

---

## Domain: Geography

**Purpose:** State، City، Country.

**Main tables:** `states`, `cities`, `countries`.

---

## Domain: Admin

**Purpose:** مدیریت کامل. `admin.md`.
