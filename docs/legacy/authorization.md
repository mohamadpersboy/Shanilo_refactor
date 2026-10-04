# Authorization

Source: `Kernel.php`, `GateProvider`, `helpers_general.php`, `routes/admin/*`, `config/acl.php`.

## لایه‌ها

| لایه | ابزار |
|---|---|
| Role / Permission (Admin) | `kodeine/laravel-acl` — Middleware `acl` |
| Route Group Admin | `protect_alias` (Permission بر اساس نام) و `is` (نقش) |
| Gate | `edit-product-owner` (مالک Shop بودن). استفاده در Controller پیدا نشد. |
| Helperهای Front | `canEditShop`, `canEditProduct`, `canComment`, `canFollowOrBlock`, `inBlockList`, `inFollowingList` |
| Policy | ندارند |
| Model | بررسی مالکیت در Controller |

## نقش‌ها

- `roles`: `atlas-administrator` (id 1)، `administrator` (id 2) از Seeder. کاربران عادی `role_id=3` (پیش‌فرض).
- Admin Routeهای `role`, `admin`: `is: administrator|atlas-administrator`.
- `permission`: فقط `atlas-administrator`.
- بقیه Routeهای Admin: `protect_alias` (Permission نام‌گذاری‌شده). نگاشت نقش→Permission در DB است. **UNKNOWN** (محتوای DB موجود نیست).
- `most_permissive_wins = false`.

## Front: چه کسی چه کاری می‌تواند

| عمل | قانون | Source |
|---|---|---|
| ویرایش Shop | `Auth::id() == shop.user_id` | `canEditShop` |
| ویرایش Product/Detail/Gallery | Shop محصول باید متعلق به کاربر باشد | `canEditProduct` |
| ساخت Product | `shop_id` باید یکی از Shopهای کاربر باشد | `ProductRequest` |
| نظر | وارد، غیر مالک، فقط یک نظر | `canComment` |
| حذف نظر | فقط صاحب نظر | `Comment::isCommentedByAuth` |
| دیدن Order | خریدار یا مالک Shop (`404` در غیر این صورت) | `OrderController::checkIfOrderBelongsToUser` |
| دیدن نتیجه پرداخت | فقط خریدار (`user_id`) | `PaymentController::checkIfOrderBelongsToUser` |
| تغییر وضعیت Order | فقط مجموعه انتقال‌های مجاز (`state-machines.md`) | `canUpdateStatus` |
| استفاده از Cart | `cart_detail.cart_id == Cart::get()->id` | `CartController::checkIfCartBelongsToUser` |
| تسویه Wallet | Wallet و BankCart متعلق به کاربر | `CheckoutController::validator` |
| ارسال پیام | Block-list فرستنده | `MessageController@store` |
| Follow/Block | `auth()->id() != target` | `canFollowOrBlock` |

## نقاط بدون بررسی مالکیت/Auth (از روی کد)

- `POST cart/update-count/{cartDetailProduct}`: بررسی مالکیت `cartDetailProduct` در `updateCount` دیده نشد. PLAUSIBLE.
- `PATCH cart/update-show-as-customer`: مالکیت چک می‌شود.
- `GET /download?path=`: بدون Auth. هر فایل در Disk `public` قابل دانلود است.
- `GET /api/orders`: بدون Auth.
- `GET products/{id}/get`: بدون Auth. وابسته به فایل `storage/logs/key.txt`.
- `POST single-field-validation`: Rule را Client می‌فرستد (`$request->get('rules')`). PLAUSIBLE: اجرای Ruleهای دلخواه، مثل `exists`.
- Routeهای `DataTable` در Admin بیرون گروه `protect_alias` هستند. UNKNOWN: اثر واقعی.
- Order `show` برای مالک Shop: `update(['seen'=>1])` روی GET.

## نکات Cart/Auth

- گروه `['middelware' => ['auth','cart-auth']]` با غلط املایی `middelware`. Middleware اعمال نمی‌شود. Step2..6 فقط با بررسی مالکیت Cart محافظت می‌شوند. Step3 به `\Auth::user()->addresses` نیاز دارد. برای مهمان خطا می‌دهد (PLAUSIBLE).
- `CartAuth` Redirect به `front.cart.cart1` می‌کند. چنین Route ای ثبت نشده است.

## Admin Impersonation

`UserController@loginAs` و `ProductController@show` (Admin). بدون Log، فقط user id=1 مستثنا.

## Object-level Authorization (خلاصه)

اکثر Routeهای Front مالکیت را دستی چک می‌کنند. چک مرکزی (Policy) وجود ندارد. هر Route جدید باید دستی چک شود.
