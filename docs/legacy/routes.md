# Route Inventory

Prefix Admin از env `ADMIN_ROUTE` می‌آید. Source: `routes/admin/base.php`.
`routes/api.php` با prefix `/api` و middleware `api` (`throttle:60,1`).

## گروه‌بندی کلی

| گروه | فایل | Middleware |
|---|---|---|
| Front عمومی | `routes/front/base.php` | `front.login`, `confirmed` |
| Front تخصصی | `routes/front/specific.php` | `front.login`, `confirmed` + `auth` برای بخش‌ها |
| Front اضافی | `routes/front.php` | بدون Middleware اضافه (ShortLink، creditlog) |
| Auth | `routes/front/base.php` | `guest` برای ورود/ثبت‌نام |
| Admin | `routes/admin/*.php` | `admin.login`, `auth.admin:admins`, `acl` |
| API | `routes/api.php` | `api` |

`front.login` فعلاً خالی است (کد داخل Middleware کامنت شده).

## جدول Routeهای مهم

| Domain | Method + URL | Controller@Action | Auth | Side effects |
|---|---|---|---|---|
| Auth | POST `/register` | `RegisterController@register` | guest | ساخت `temporary_users`، SMS |
| Auth | POST `/confirm` | `RegisterController@confirm` | ندارد (خارج از گروه `guest`) | ساخت User، `Auth::login` |
| Auth | POST `/login-auth` | `FrontLoginController@login` | guest | destroy Session قبلی |
| Auth | POST `/password/mobile` | `ForgotPasswordController@sendResetMobile` | guest | SMS، `password_reset_mobiles` |
| Auth | POST `/password/reset` | `ResetPasswordController@reset` | guest | تغییر رمز |
| Cart | GET `cart/step1..6` | `CartController@stepN` | مبهم | — |
| Cart | POST `cart/{productDetail}/toggle` | `CartController@toggle` | `shop.middleware` | ساخت CartDetail/Product |
| Cart | POST `cart/update-count/{cartDetailProduct}` | `updateCount` | ندارد | — |
| Cart | PATCH `cart/{cartDetail}/updateField` | `updateField` | (typo) | تغییر Address/SendType/PayType |
| Payment | GET `payment/pay/{cartDetail}` | `PaymentController@pay` | ندارد | ساخت Order |
| Payment | ANY `payment/verifyOrder` | `verifyOrder` | CSRF exempt | تأیید Order |
| Payment | GET `payment/result/{order}` | `result` | مالکیت | — |
| Order | PATCH `profile/order/{order}/updateStatus` | `OrderController@updateStatus` | `auth` + `check.order.status` | CreditLog، SMS |
| Credit | POST `profile/credit` | `CreditController@store` | `auth` | Redirect به Mellat |
| Credit | POST `profile/credit/verify` | `verify` | CSRF exempt | افزایش `users.credit` |
| Credit | POST `profile/credit/request_checkout` | `requestCredit` | `auth` | `requests_checkout_credit` |
| Wallet | POST `profile/checkout` | `CheckoutController@store` | `auth` | `checkouts` |
| Product | POST `profile/product` | `ProductController@store` | `auth` | ساخت Product با `display=0` |
| Product | PATCH `profile/productDetail/{id}` | `ProductDetailController@update` | `auth` + مالکیت | Event |
| Promotion | POST `profile/firstPageSpecialSell` | `store` | `auth` | Redirect پرداخت |
| Comment | POST `comment/{object}/{id}/store` | `CommentController@store` | `auth` | — |
| Message | POST `message` | `MessageController@store` | `auth` | Event `MessageSent` |
| Social | POST `user-page/toggleFollow/{user}` | `toggleFollow` | `auth` | Announcement |
| Search | GET `/search` | `SearchController@index` | — | — |
| Misc | POST `single-field-validation` | Closure | — | Validation با Rule از Client |
| Misc | GET `download?path=` | `DownloadController@download` | ندارد | دانلود از Disk `public` |
| Misc | GET `products/{id}/get` | `ProductController@getByKey` | ندارد | مبهم |
| API | GET `/api/orders` | Closure | **ندارد** | همه Orderها با User برمی‌گردد |

## Routeهای Admin

مدیریت: User، Role، Permission، Admin، Article، News، Policy، FAQ، Guide، Gallery، Newsletter، Bank، Education، Comment، Slider، Member، Color، Ticket، Chat، ContactUs، Calendar، Week، Factor، Inventory، Page، Country، Ad*، Order، Payment، Message، Product، Shop، FirstPage*، ViolationReport، Checkout، Credit، Brand، Plan، State، City، ProductCategory، TechnicalSpecification.

Routeهای DataTable با `POST /{entity}/DataTable` هستند و **بیرون** از گروه `protect_alias` قرار دارند (در `base.php` و `specific.php`). تأثیر Permission روی آن‌ها UNKNOWN است.

## رفتار Routeهای مهم

### POST `payment/pay` → `PaymentController@pay`
1. اگر `pay_type_id` ندارد، به `step6` برمی‌گردد.
2. مالکیت Cart را چک می‌کند (`cart_id`).
3. `new $className()` از `pay_types.class_name`.
4. `payOrder($cartDetail)`.
5. در Exception: `setSession` با آرایه ناقص (کلید `message` ندارد).

### `MellatPayment::payOrder`
1. `CartDetail::transmit()` در Transaction: Order (`status=1`)، OrderDetail، Payment (`pending`)، حذف CartDetail.
2. `Mellat::set(price, order_id)` و Redirect به بانک.
3. شکست Redirect: Cart قبلاً حذف شده. Order با `pending` می‌ماند.

### `MellatPayment::verifyOrder`
- موفق: `Order::confirm()`، `payment.status=successful`، `ref_id`، Event `OrderStatusChanged`.
- ناموفق: `payment.status=unsuccessful`، `order.status=0`.
- بررسی تکراری‌بودن Callback وجود ندارد.

### PATCH `profile/order/{order}/updateStatus`
- Middleware `check.order.status`: Payment باید `successful` باشد.
- `canUpdateStatus`. جزئیات در `state-machines.md`.
- در Transaction: CreditLog، `order.update`، Event.

### POST `profile/credit` و `verify`
- مبلغ: عدد، حداقل 10000، حداکثر 10000000.
- Verify: `users.credit += amount/10` و CreditLog `charge`.

### POST `profile/checkout`
- `wallet_id` و `bank_cart_id` باید متعلق به کاربر باشند.
- مبلغ حداقل 10000 و ≤ `wallet.removeable`.
- فقط یک درخواست `pending` برای هر Wallet.
