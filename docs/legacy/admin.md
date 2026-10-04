# Admin

Source: `routes/admin/base.php` (144 Route)، `routes/admin/specific.php` (52 Route)، `app/Http/Controllers/Admin` (83 فایل)، `Middleware/Admin/LoginAdmin`.

## ورود و Middleware

- Prefix: env `ADMIN_ROUTE`.
- Middleware: `admin.login`, `auth.admin:admins`, `acl`.
- Guard `admins` روی همان جدول `users` است.
- Permission: `protect_alias` برای هر Resource. نقش‌ها: `atlas-administrator`, `administrator`. جزئیات `authorization.md`.

## گروه‌ها

### Base (عمومی/CMS)

User، Role، Permission، Admin، LogActivity، AboutUs، ContactUs/Contact، Article، ArticleCategory، News، Policy، FAQ، Guide، PictureGallery، VideoGallery، Newsletter، Bank، Education، Comment، Slider، Member، Color، Ticket، Chat، Calendar، Week، Factor، Inventory، Page، PageItem، Country، Ad* (Plan، Time، Section، Detail، Request)، Advertisement، SiteContentImage.

### Specific (فروشگاه)

Order، Payment، Product، Shop، ProductCategory، TechnicalSpecification، Brand، Plan، State، City، Message، ProductMessage، FirstPageSpecialSuggestion، FirstPageSpecialSell، ViolationReport، Checkout، Credit (تسویه Credit کاربر)، Article (کاربران)، Slider، SocialNetwork.

## CRUD و گزارش

- هر Entity: Resource + `POST /{entity}/DataTable` (yajra DataTables 8.0، Server-side).
- Export Excel: `user/excel`, `order/export`, `checkout/export` (phpspreadsheet/maatwebsite).
- Admin Sidebar شمارنده‌ها: ContactUs خوانده‌نشده، پیام‌های بدون گیرنده، AdRequest وضعیت 1، نظرهای `pending`، ViolationReport دیده‌نشده (`AppServiceProvider` View Composer).

## Moderation

| مورد | رفتار | Source |
|---|---|---|
| Product | Admin `display` را تغییر می‌دهد (`update` فقط `display`). | `Admin/Specific/ProductController@update` |
| Product «show» | Admin به‌عنوان صاحب Shop وارد می‌شود و صفحه ویرایش را باز می‌کند. | `ProductController@show` |
| Comment | Resource `comment` وجود دارد. Front نظر را مستقیم `confirmed` می‌کند، پس صف `pending` عملاً از Front پر نمی‌شود. | `CommentController` (Front) |
| ViolationReport | Resource با شمارنده «دیده‌نشده». | admin routes |
| Order | Resource + `showAsUser/showAsSeller`. تغییر وضعیت توسط Admin بررسی نشد. UNKNOWN. | |
| Shop | Resource. تأیید `display` بررسی نشد. UNKNOWN. | |

## تسویه‌ها

- **Checkout (فروشگاه):** Admin وضعیت `done/pending/denied` و `tracking_code` را می‌گذارد. Validator در `CheckoutController::validator` (جزئیات بررسی نشد).
- **Credit (کاربر):** `Admin/Specific/CreditController@update`. `status` اجباری. `tracking_code` اگر `done`. بعد از `done` قفل. با `done` Hook Model اعتبار کاربر را کم می‌کند.
- هیچ‌کدام تراکنش واقعی بانکی نمی‌زنند. Admin دستی پرداخت و کد را ثبت می‌کند.

## Impersonation

`user/{user}/loginAs` و Product show. `Auth::login` با Guard `web`.

## Settings و Dev

- `settings` (Model Setting، Helper `helpers_setting.php`).
- `views/admin/developer`: ابزار توسعه‌دهنده (محتوا بررسی نشد). UNKNOWN.
- Activity Log (spatie): `logactivity`. `AtlasLogActivityTrait` روی Modelها (کدام Modelها بررسی نشد).

## نکته سازگاری

هیچ کنترل «ساخت Plan/Role جدید» از Front نیست. Admin تنها منبع Plan (قیمت پلن صفحه اول)، PayType (اینجا Route ندارد؛ فقط Seeder یا DB دستی. UNKNOWN)، SendType.

## UNKNOWN

- Route و UI مدیریت `pay_types` و `send_types` در Admin پیدا نشد.
- Permissionهای واقعی نقش‌ها (DB).
- رفتار DataTable خارج از `protect_alias`.
