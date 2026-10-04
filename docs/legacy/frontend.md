# Frontend

Source: `resources/views`, `assets/front`, `assets/admin`, `package.json`, `webpack.mix.js`.

## ساختار

| بخش | مسیر | نکته |
|---|---|---|
| Front | `resources/views/front/{master,pages,partial,plugins}` | Blade |
| Admin | `resources/views/admin/{pages,partial,forms,layouts,specific,...}` | Blade، DataTables |
| Auth/Email/Error | `resources/views/{auth,emails,errors}` | — |
| دیگر | `home.blade.php`, `shop.blade.php`, `layouts`, `vendor` | |
| Sidebar Admin | `routes/views/admin/partial/sidebar.blade.php` (852 خط) | View داخل `routes/` است |

421 فایل Blade. 357 مورد `{!! !!}` (خروجی بدون Escape).

## JavaScript

- حدود 27 فایل JS غیر Plugin. jQuery 1.11/2.2.4 (دو نسخه)، jQuery Form، jQuery Validate، BlockUI، SweetAlert، Toastr، `jquery.pjax.js`.
- `spatie/laravel-pjax` در Backend. ناوبری PJAX.
- فایل‌های اصلی: `master.js`, `global.js`, `functions.js`, `Atlasweb.js`, `atlasweb.ctrl.js`, `response.js`, `all_form_validate.js`, `newjs.js`.
- Vue و `vue-router` در `package.json` هستند. Frontend از jQuery استفاده می‌کند. استفاده Vue UNKNOWN.
- Laravel Mix 0.8 + Sass. `mix-manifest.json` در ریشه.

## الگوی AJAX

- فرم‌ها با jQuery Form ارسال می‌شوند. پاسخ JSON با کلیدهای قراردادی:
  - `url` → Redirect.
  - `view` → HTML برای درج در صفحه.
  - `header/message/type` → Toast.
  - `deletedItem` → حذف المان با Selector.
  - `text/addClass/removeClass` → تغییر ظاهر دکمه (Toggle).
  - `errors` (422) → خطای فیلد.
- Session Flash با `setSession(...)` برای نمایش Toast بعد از Redirect.
- Business behavior مهم داخل JS: بررسی `single-field-validation` (Rule از Client)، انتخاب شهر/State، مراحل Cart.

## صفحات اصلی (نمونه)

| URL | View | هدف |
|---|---|---|
| `/` | `front.pages.home.index` | صفحه اصلی: دسته‌ها، پیشنهاد ویژه، فروش ویژه، فروشگاه‌های برتر، Sliderها |
| `/products` | `front.pages.product.index` | آرشیو. فیلتر با Query String. «بیشتر» با `limit`. |
| `products/detail/{id}/{slug?}` | `front.pages.product.show` | جزئیات و نظرها |
| `cart/step1..6` | `front.pages.cart.step*` | Checkout |
| `payment/result/{order}` | `front.pages.payment.result` | نتیجه |
| `profile/*` | `front.pages.profile.*` | داشبورد کاربر/فروشنده |
| `shop-page/*`, `user-page/*` | — | صفحه عمومی Shop/User |
| `/timeline` ... | — | Timeline شبکه اجتماعی |

## فیلتر محصول

`ProductDetail::filter()` (Trait `HasFilter`): کلیدهای `shop, state, city, brand, plan, hasDiscount, category, orderByPrice, orderByRate, search` از Query String. هر کدام به متد `filterBy*` نگاشت می‌شود. پیاده‌سازی هر متد بررسی نشد.

## رفتار UI

- Pagination: Offset/Limit با `hasMorePage` (دکمه «بیشتر»).
- جستجوی سراسری: AJAX به `/search` (کاربر و Shop فقط).
- Empty state / Loading: UNKNOWN (در JS بررسی نشد).
- Confirmation: SweetAlert.

## SEO

- `<title>` از `$pageTitle`. `<meta name="description" content="">` **خالی**.
- Canonical، OpenGraph، Twitter، Structured Data: پیدا نشد.
- Sitemap: صفحه HTML «نقشه سایت» هست. فایل `sitemap.xml` و `robots.txt` پیدا نشد.
- URL: Slug با `str_slug($product->title)` ساخته می‌شود. رفتار آن روی عنوان فارسی بررسی نشد (UNKNOWN). بعضی URLها فارسی هستند (`/مقالات`).
- Slug فقط تزئینی است. Route با `{productDetail}` (ID) پیدا می‌شود، نه با Slug.
- Redirect: `/@{uid}` به صفحه User/Shop.

## RTL

صفحات فارسی. Carbon Locale `fa`. تاریخ با `morilog/jalali` و `jdf.php`.
