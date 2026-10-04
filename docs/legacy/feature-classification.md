# Legacy Feature Classification

مبنا: شواهد Repository. بدون حدس. این طبقه‌بندی ورودی Phase 0.5 است، نه تصمیم.

- **A** — واضحاً لازم / رفتار فعال
- **B** — موجود ولی نیاز به بررسی
- **C** — Legacy / مشکوک
- **D** — نامعلوم / شواهد ناکافی

## A — Clearly required / active

| Feature | Evidence |
|---|---|
| ثبت‌نام و ورود با موبایل + OTP | `RegisterController`, `FrontLoginController`, Route فعال |
| فراموشی رمز با SMS | `ForgotPasswordController`, Route فعال |
| پروفایل، آدرس، کارت بانکی | Route `profile/*` |
| Shop (ساخت، ویرایش، شهرهای سرویس، ارسال) | `Profile/ShopController` |
| Product + ProductDetail (دسته ۳ سطحی، برند، مشخصات، Property، رنگ، قیمت، تخفیف، موجودی، وزن) | Controller + Migration |
| آرشیو و جزئیات محصول با فیلتر | `ProductController@index/show` |
| Cart چند فروشگاهی (Cookie) و Checkout ۶ مرحله‌ای | `CartController` |
| پرداخت آنلاین Mellat | `MellatPayment` + Callback Route |
| پرداخت با Credit کاربر | `CreditPayment` |
| شارژ Credit | `CreditController` |
| Order و چرخه وضعیت ۰..۵ | `Order`, `OrderController` |
| Wallet فروشگاه و تسویه (Checkout) | `Wallet`, `CheckoutController` (Front + Admin) |
| تسویه Credit کاربر | `RequestCheckoutCredit`, Admin `CreditController` |
| Announcement داخلی + SMS وضعیت سفارش | Listener `SendOrderStatusNotification` |
| نظر و امتیاز (Shop و Product) | `CommentController` |
| Follow و Block | `UserPageController`, `ShopPageController` |
| Favorite | `FavoriteController` |
| پیام کاربر به کاربر/فروشگاه | `Front/Specific/MessageController`, `Profile/MessageController` |
| پیشنهاد/فروش ویژه + پلن صفحه اول (پولی) | `Profile/FirstPage*Controller`, `Plan` |
| صفحه اصلی (Slider، دسته، ویژه، فروشگاه‌های برتر) | `HomeController@index` |
| گزارش تخلف | `ReportController`, Admin `ViolationReport` |
| Admin: CRUD، DataTable، ACL | `routes/admin/*` |
| Admin: تأیید محصول | `Admin/ProductController@update` |

## B — Existing but needs review

| Feature | چرا |
|---|---|
| NotifyList (اعلان موجود شدن/تخفیف) | Event فعال. اثر UI بررسی نشد. |
| Comparison (مقایسه) | Route دارد. جزئیات و استفاده بررسی نشد. |
| Timeline | Route دارد. منطق بررسی نشد. |
| Share محصول با دوستان | `ShareController`، Event `UserSuggestedAProduct` |
| Article کاربر (در Profile) + Article Admin | دو جا. بررسی نشد. |
| Advertisement (درخواست تبلیغ) | فقط ثبت درخواست. پرداخت و نمایش پیدا نشد. |
| Tickets / Msg (پشتیبانی) | سیستم ۲۰۲۱. با `messages` هم‌پوشانی دارد. |
| ProductMessage (پیام درباره محصول) | Migration ۲۰۲۱، Route Front/Admin |
| Search (کاربر/Shop فقط) | محصول جستجو نمی‌شود. |
| Short link | Route `short_link`. |
| ShopPage (clients, specialSells...) | بررسی نشد. |
| Newsletter، News، FAQ، Guide، Policy، AboutUs، Gallery، Page | CMS. Route فعال. جزئیات بررسی نشد. |
| ارسال پستی (`PostApi` + `post-plans`) | کد خراب (`dd`). نیاز به تصمیم. |
| `show_as_customer` (نمایش به‌عنوان مشتری) | Route و ستون هست. |
| Impersonation Admin | فعال. Log ندارد. |
| Export Excel | Admin |

## C — Legacy / questionable

| Feature | چرا |
|---|---|
| `check_outs` + `user_banks` + `Base/CheckOut` | سیستم تسویه قدیمی ۲۰۱۷. فقط یک Relation در `UserBank`. |
| `Base/Payment`, `Base/Article`, `Base/Announcement`, `Slider` ریشه | Modelهای تکراری |
| Zarrinpal، AsanPardakht | پکیج/کلاس هست، استفاده نشده |
| `leadthread/laravel-sms`, Twilio, Plivo | استفاده نشده |
| Musonza Chat + `ChatController` + `conversations` | سیستم چت موازی |
| `pbmedia/laravel-ffmpeg` + `createVideo/createMusic` | بلااستفاده (طبق `CLAUDE.md`) |
| Event `ProductAdded` | Dispatch نمی‌شود |
| `Tag`, `Calendar`, `Week`, `Member`, `Education`, `Factor`, `Inventory` | Model/Admin Route هست. کاربرد در Marketplace روشن نیست (از Template Admin اولیه) |
| Vue / vue-router | بدون استفاده مشخص |
| Pusher / Broadcast | تعریف شده. استفاده معلوم نیست |
| HTML Minify | Middleware کامنت شده |

## D — Unknown / insufficient evidence

| مورد | UNKNOWN |
|---|---|
| `products/{id}/get` + `storage/logs/key.txt` | هدف نامعلوم |
| پرداخت در محل (`pay_types.type='home'`) | کلاس و رفتار پیدا نشد |
| Admin: مدیریت `pay_types`/`send_types` | Route پیدا نشد |
| `follows` Table | وجود دارد. استفاده پیدا نشد |
| `block_lists` ساختار | بررسی نشد |
| Mail کلاس‌ها (Share) | مصرف واقعی پیدا نشد |
| `views/admin/developer` | محتوا بررسی نشد |
| سرویس نقشه / `latlong` / `get-position` | نامعلوم |
| Cache/Queue/Session Driver واقعی | از `.env` (نیست) |
| داده‌های Production، فایل‌های `files/` | در Repository نیست |
| Permissionهای واقعی ACL | در DB |
| AsanPardakht در `pay_types` فعال است؟ | DB |
