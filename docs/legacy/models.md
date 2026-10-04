# Model Inventory

108 فایل Model در `app/Models`. ساختار پوشه‌ها:
`Base/` (49)، `Specific/` (≈40)، `Advertisement/` (6)، ریشه (Msg، MsgDetail، ProductMessage، RequestCheckoutCredit، ShortLink، Slider، SocialNetwork)، `ModelTrait/` (Mutator/Relation/Scope برای User، BankCart، RequestCheckoutCredit).

فقط Modelهای حیاتی در اینجا آمده‌اند. Source هر مورد: فایل Model.

## الگوهای مشترک

- `position` + `display` تقریباً در همه جدول‌ها (Sortable + `VisibilityTrait`).
- `VisibilityTrait::scopeVisible`: `display=1` (برای Product: `products.display=1`).
- `AttachmentTrait`: رابطه Polymorphic `attachments` و حذف خودکار فایل‌ها.
- `HasReports`: گزارش تخلف.
- Primary key همه: `id` auto-increment (int). `users.id` به `bigint` تغییر داده نشده؛ فقط `role_user.user_id` (Migration `bigint_user_keys`).

## User (`users`)

- Fields: name، family، email (unique، nullable)، uid (unique)، password، mobile (unique، nullable)، phone، address، description، credit (unsigned int، default 0)، national_code، confirm (int، 0)، hashed، status (bool، 1)، show_info، session_id، role_id (default 3)، birth_date، remember_token.
- Traits: `Notifiable, HasRole (ACL), AttachmentTrait, UserRelation, UserScope, UserMutator`.
- `$appends`: `username`, `full_name`. `$withCount`: `shops`.
- Business logic: `credit` موجودی کاربر (تومان، عدد صحیح). تغییر مستقیم در `CreditPayment`, `CreditController::verify`, `Order::disconfirm`, `RequestCheckoutCredit` Hook.
- Soft delete: ندارد.

## Shop (`shops`)

- Fields: title، user_id، city_id، uid (unique)، phone، address، zip_code، work_time، email، description، position، display.
- `boot`: `created` → `wallet()->create()`. `deleting` → حذف محصولات.
- Soft delete: دارد (Migration `add_soft_deletes_to_shops`).
- Relation: `products()` فقط محصولات `visible`.

## Product (`products`)

- Fields: shop_id، brand_id، title، sell_count، views، description، position، `status` (enum pending/confirmed، Migration)، display.
- `$with = ['comments','shop']` (Eager در همه Queryها).
- `boot`: `deleting` → حذف ProductDetailها.
- Accessors: `rate` (میانگین نظر `confirmed`)، `latest_category` (سطح ۳)، `indexed_product`.
- Soft delete: دارد.
- نکته: `scopeConfirmed` از ستون `status` استفاده می‌کند، ولی تأیید در کد با `display` انجام می‌شود.

## ProductDetail (`product_details`)

- Fields: product_id، color_id، feature، price، discount (٪)، count (int signed)، weight، index، position، display.
- `$with = ['product','color']`.
- Accessor `pure_price`: `roundPrice(price - price*discount/100)`.
- `boot`: `deleting` → حذف SpecialSell/SpecialSuggestion. `deleted` → اولین «برادر» `index=1` می‌شود.
- Soft delete: دارد.

## Order (`orders`)

- Fields: shop_id، user_id، address_id، send_type_id، tax، total، show_as_customer، transport_price، seen، status (int، default 1)، position، display.
- Relations: payment (`morphOne`)، details، walletTransactions.
- Methods: `confirm()`, `disconfirm()`, `canUpdateStatus()`, `calculateCheckoutPrice()`.
- Soft delete: دارد.
- جزئیات منطق: `business-rules.md`, `state-machines.md`.

## OrderDetail (`order_details`)

- Fields: order_id، product_detail_id، price (قیمت اصلی بدون تخفیف)، discount، count، properties (text).

## Payment (`payments`)

- Fields: pay_type_id، payable (morph)، transaction_id، tracking_code، ref_id، price (int)، status enum (`pending`, `successful`, `unsuccessful`).
- Payable: Order، FirstPageSpecialSuggestion، FirstPageSpecialSell.

## CartDetail (`cart_details`)

- یک ردیف برای هر Shop داخل Cart.
- Fields: cart_id، shop_id، address_id، send_type_id، pay_type_id، show_as_customer، transport_price.
- `$with=['details']`. `const TAX=0`.
- `total()`، `calculateTransportPrice()`، `transmit()` (ساخت Order).

## Wallet / WalletTransaction / Checkout

- Wallet: `shop_id`. Accessor `total`، `removeable`، `checkouting`.
- WalletTransaction: `type` (`add`/`sub`)، `price`، `source`، `destination` (رشته نام)، `order_id`. `ALLOW_CHECKOUT_AFTER_DAYS=3`.
- Checkout: `wallet_id`، `bank_cart_id`، `price`، `status` (`done`, `pending`, `denied`)، `tracking_code`.

## CreditLog (`credit_log`)

- `price` (double)، `status` (`increase`/`decrease`)، `type` (`charge`, `request checkout`, `payment`, `shop cancel`, `customer cancel`)، `user_id` (بدون FK).

## RequestCheckoutCredit (`requests_checkout_credit`)

- بدون timestamps. `status`: `pending`, `done`, `reject`.
- Hook `updated`: وقتی `status` به `done` برود، `users.credit` کم و CreditLog ثبت می‌شود.

## Comment (`comments`)

- Polymorphic `commentable` (Shop یا Product). `parent_id` برای پاسخ (Self-reference). `status` enum (pending/confirmed/denied، Migration default `pending`).
- Mutator `setRateAttribute`: مقدار خالی را به 1 تبدیل می‌کند.

## Message (`messages`)

- `parent_id` (Thread)، `user_id` (فرستنده)، `receiver_id`، `shop_id`، `message`، `upload_file`، `is_read`.

## Modelهای دیگر (خلاصه)

Brand، Color، ProductCategory (درختی)، TechnicalSpecification، ProductProperty/Detail، SpecialSell/Suggestion، FirstPage*، Plan، Follower، Favorite/Detail، Comparison/Detail، NotifyList، Announcement، ViolationReport، BankCart، Address، TemporaryUser، PasswordResetMobile، SendType، PayType، State/City/Country، Article، News، Page، Faq، Guide، Policy، Slider، Setting، Ticket، Msg/MsgDetail، ProductMessage، ShortLink، Ad*.

برای این‌ها فقط وجود تأیید شد. جزئیات Field در `database.md`.
