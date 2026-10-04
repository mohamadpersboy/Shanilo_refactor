# Database Inventory

DB: MySQL. 132 فایل Migration. `Schema::defaultStringLength(191)`.
پوشه‌ها: `database/migrations/base` (عمومی/CMS)، `specific` (فروشگاه)، ریشه (۲۰۲۰–۲۰۲۱).
بارگذاری چند مسیر با پکیج `nscreed/laravel-migration-paths` و Command `CustomMigrate`.

آمار: حدود 82 Foreign Key با `onDelete('cascade')`. فقط 16 Migration `change/drop` دارند. 9 فایل `softDeletes` (شامل جدول‌های Product، ProductDetail، Order، Shop، ProductCategory، BankCart، Conversation، Ticket، home_sliders).

## جدول‌های مالی و سفارش

| Table | Columns مهم | Nullable/Default | FK / Cascade |
|---|---|---|---|
| `users` | id، name، family، email (unique)، uid (unique)، password، mobile (unique)، credit (unsigned int، 0)، confirm (0)، hashed، status (1)، role_id (3)، session_id | email، mobile، name، family nullable | — |
| `shops` | id، title، user_id، city_id، uid (unique)، phone، address(1023)، display (1) | — | user_id، city_id |
| `products` | id، shop_id، title، sell_count (0)، views (0)، description (text، NOT NULL)، status enum، display (1) | — | shop_id |
| `product_details` | product_id، color_id، feature، price (unsigned)، discount (0)، count (int، 1)، weight (int)، index (0) | feature nullable | product_id، color_id |
| `carts` | id، timestamps | — | — |
| `cart_details` | cart_id، shop_id، address_id، send_type_id، pay_type_id، transport_price (0)، show_as_customer (1) | address/send/pay nullable | همه FK |
| `cart_detail_products` | cart_detail_id، product_detail_id، count (1)، properties text | properties nullable | FK |
| `orders` | shop_id، user_id، address_id، send_type_id، tax (0)، total، transport_price، seen (0)، status int (**default 1**) | — | FK به shop/user/address/send_type |
| `order_details` | order_id، product_detail_id، price، discount (0)، count (1)، properties | discount/properties nullable | FK |
| `payments` | pay_type_id، `payable_id/type` (morph)، transaction_id، tracking_code، ref_id، price (int)، status enum | ids nullable | pay_type_id |
| `pay_types` | title، description، icon، type enum (`online`,`home`,`credit`)، price_max | — | — |
| `send_types` | title، description، price، free_from | — | — |
| `wallets` | shop_id | — | shop_id |
| `wallet_transactions` | wallet_id، order_id، type enum (`sub`,`add`)، source، destination، price (unsigned int) | — | wallet_id، order_id |
| `checkouts` | wallet_id، bank_cart_id، price (unsigned int)، status enum (`done`,`pending`,`denied`)، tracking_code | tracking_code nullable | wallet_id، bank_cart_id |
| `credit_log` | price **double(15,2)**، status string، type string، user_id **integer بدون FK** | — | ندارد |
| `requests_checkout_credit` | user_id (int)، bank_cart_id (int)، price **float(15,2)**، tracking_code، request_at، done_at، status enum (`pending`,`done`,`reject`) | — | ندارد |
| `check_outs` (قدیمی) | price **string**، price_check_out string، pay_type، pay_status، user_bank_id، user_id | — | FK به `user_banks`، `users` |
| `plans` | title، func، amount، price (int) | — | — |

**نکته پولی:** قیمت‌ها Integer هستند (واحد تومان طبق `showPrice(...,'تومان')`)، ولی `credit_log.price` و `requests_checkout_credit.price` Float/Double هستند. و `check_outs.price` رشته است. `contradictions.md`.

## جدول‌های اجتماعی و پیام

| Table | نکته |
|---|---|
| `comments` | morph `commentable`، `parent_id` FK، `rate` unsigned، status enum default `pending` |
| `followers` | `user_id` + morph `followable`. بدون Unique |
| `follows` (قدیمی؟) | UNKNOWN. وجود دارد. استفاده پیدا نشد. |
| `block_lists` | نام دقیق ستون‌ها بررسی نشد. UNKNOWN. |
| `favorites`, `favorite_details` | `favorite_id` (Cookie)، `product_detail_id` |
| `comparisons`, `comparison_details` | مانند Favorite |
| `notify_lists` | morph `notifiable` + `user_id` |
| `announcement` | پیام HTML برای کاربر |
| `messages` | Thread با `parent_id`; `is_read` |
| `msg`، جدول جزئیات | `subject`، `sender_id`، `receiver_id`، `is_ticket`; جزئیات با `creator_id`, `msg_id`, `file` |
| `product_message` | پیام درباره محصول (Migration ۲۰۲۱) |
| `tickets` | قدیمی با SoftDeletes |
| `conversations`, `conversation_user` | Chat (musonza/chat) |
| `violation_reports` | گزارش تخلف |

## CMS و تنظیمات

`articles`, `article_categories`, `news`, `news_news`, `pages`, `page_items`, `faqs`, `guides`, `policies`, `about_uses`, `picture_galleries`, `video_galleries`, `newsletters`, `settings`, `site_routes`, `site_content_images`, `home_sliders` (۲۰۲۰)، `social_networks` (۲۰۲۰)، `short_links` (۲۰۲۰)، `calendars`, `weeks`, `members`, `member_categories`, `education`, `factors`, `notices`, `notifications`, `my_notifications`, `contacts`, `contact_uses`.

## ACL و Activity

`roles`, `permissions`, `permission_role`, `permission_user`, `role_user`, `activity_log` (spatie).

## جغرافیا

`countries`, `states`, `cities`, `city_shop` (pivot با `price`), `city_send_type`, `city_pay_type`, `send_type_shop`.

## تبلیغات

`advertisements`, `ad_plans`, `ad_times`, `ad_details`, `ad_sections`, `ad_plan_ad_section`, `ad_requests`.

## Migration History (مهم)

| سال | رویداد |
|---|---|
| 2014–2017 | Base: users، roles، comments، addresses، pay_types، send_types، check_outs |
| 2018-08 | Specific: shops، products، product_details، carts، orders، payments، wallets، checkouts، plans، messages |
| 2018-08-08 | `add_soft_deletes_*` برای 6 جدول |
| 2020-09 | `short_links`، `requests_checkout_credit` |
| 2020-11 | `credit_log` |
| 2020-12 | `home_sliders`، `social_networks`، `add_follower_*`، `change_description_in_products`، `add_is_active_to_articles` |
| 2021-01 | `product_message`، `msg`، `add_status/shop_id/show_msg_to_msg` |

**Schema فعلی در مقابل Migration اولیه:** بعضی ستون‌ها فقط با Migrationهای بعدی اضافه شده‌اند.
- `products.brand_id`: Migration `add_brand_id_column_to_products_table`.
- `messages.upload_file`: Migration `add_upload_file_to_messages`.
- `Message::$fillable` شامل `subject` است، ولی Migration ساخت `messages` این ستون را ندارد. Migration `add_column_message_to_messages` ممکن است آن را اضافه کند. این مورد بررسی نشد (UNKNOWN).
- `Product::scopeConfirmed` ستون `status` را می‌خواند. ولی کد تأیید محصول را با `display` انجام می‌دهد (`contradictions.md`).

تطبیق Schema واقعی با دیتابیس زنده **UNKNOWN** است، چون دیتابیس در دسترس نیست.

## Migration Consideration (فقط ثبت)

- Status سفارش عدد است (0..5).
- `payments.payable` Polymorphic است.
- ID در UI گاهی با Hash همراه است (`*_sid`).
- `users.credit` و `wallet_transactions` منبع‌های جدای پول هستند.
