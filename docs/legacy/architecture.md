# معماری واقعی Legacy

## جریان درخواست

```
Request
 → Route (routes/*.php)
 → Middleware (Kernel: web, auth, confirmed, ...)
 → Controller (+ FormRequest یا $this->validate)
 → Model (Eloquent) + Helper + Trait
 → MySQL
 → Blade View  یا  JSON { view: "<html>" }
```

**Service Layer وجود ندارد. Repository Layer وجود ندارد.**
Source: نبود پوشه `app/Services` و `app/Repositories`.

## Business Logic کجاست؟

| محل | مثال | Source |
|---|---|---|
| Controller | Cart، تغییر وضعیت Order، Credit | `CartController`, `OrderController` |
| Model | ثبت Order، تأیید/برگشت Order | `CartDetail::transmit`, `Order::confirm/disconfirm` |
| Helper کلاس | Payment، Cart، Favorite، Comparison | `app/Http/Helpers/*` |
| Helper تابع | قیمت، Permission، Announcement | `app/Helpers/helpers_general.php` |
| Listener | کنسل شدن Order و برگشت پول | `SendOrderStatusNotification` |
| Model `boot()` | Wallet هنگام ساخت Shop، حذف زنجیره‌ای | `Shop::boot`, `Product::boot` |
| Model Event | کم کردن Credit هنگام تسویه | `RequestCheckoutCredit::boot` |
| Blade View | بعضی منطق نمایش و Query | UNKNOWN. عمیق بررسی نشد. |

## Validation

- Form Request: 46 فایل در `app/Http/Requests/{Admin,Front}`.
- `$this->validate()` داخل Controller: Cart، Credit، Checkout، Comment، Message، Register.
- Validatorهای سفارشی در `AppServiceProvider`: `check_hash`، `mobile`، `iban`، `national_code`، `farsi_date`، `exist_hashed`.
- قید دیتابیس: Foreign Key و `unique`. جزئیات در `database.md`.

## Authorization

- Middleware `auth` (کلاس سفارشی `CheckIfAuthenticated`) و `confirmed`.
- بررسی مالکیت داخل Controller با Helper: `canEditShop`, `canEditProduct`, `canComment`, `inBlockList`.
- یک Gate: `edit-product-owner` (در Controller دیده نشد که استفاده شود. UNKNOWN).
- Admin: Middleware `acl` با `protect_alias` و `is`.
- جزئیات: `authorization.md`.

## Query

داخل Controller، Model، Scope و Trait پخش شده‌اند.
فقط 9 مورد SQL خام (`DB::raw`, `whereRaw`, ...) پیدا شد.

## Transaction

`\DB::transaction` در این نقاط:
`CartDetail::transmit`، `Order::confirm`، `Order::disconfirm`، `CreditPayment::payOrder`، `OrderController::updateStatus`، `ProductController::store`، `ProductController::uploadGalleryImage`، `ProductPropertyDetail` (UNKNOWN)، `ShopController::store` (با `beginTransaction`).

**نکته:** `MellatPayment::verifyOrder` تراکنش خارجی ندارد. فقط `Order::confirm` داخلی دارد.
هیچ Lock (`lockForUpdate`) پیدا نشد.

## Serviceهای بیرونی

از داخل Controller، Listener و Helper مستقیم صدا زده می‌شوند.
مثال: `Smsir::ultraFastSend` داخل `RegisterController`, `FrontLoginController`, `helpers_general.php`, Listener.
جزئیات: `external-services.md`.

## UI و Backend

- Frontend بیشتر Server-rendered است.
- بسیاری از Actionها JSON برمی‌گردانند که شامل HTML رندرشده است (`'view' => View::make(...)->render()`).
- jQuery این HTML را در صفحه می‌گذارد.
- جزئیات: `frontend.md`.

## الگوهای تکراری

- هر Model دو ستون `position` و `display` دارد (Sortable + Visibility).
- `display=1` یعنی نمایش. Scope `visible()` این را اعمال می‌کند.
- Cart، Favorite، Comparison با Cookie شناسایی می‌شوند (نه با User).
- ID در فرم‌ها با `*_sid` (Hash) همراه می‌شود و با `check_hash` اعتبارسنجی می‌شود.
