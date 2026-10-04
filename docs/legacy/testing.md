# Testing

Source: `tests/`, `phpunit.xml`.

## وضعیت

| دسته | فایل | محتوا |
|---|---|---|
| Unit | `tests/Unit/ExampleTest.php` | نمونه پیش‌فرض Laravel |
| Feature | `tests/Feature/ExampleTest.php` | `GET /` باید 200 باشد |
| Base | `tests/TestCase.php`, `CreatesApplication.php` | زیرساخت |
| Integration / Browser / API | — | وجود ندارد |
| Factory | — | وجود ندارد |

PHPUnit ~6، Mockery 0.9، Faker. `vendor` نیست. تست‌ها اجرا نشدند (Phase 0 فقط تحلیل است).

## چه چیزی تست شده؟

فقط اینکه صفحه اصلی بالا می‌آید (و آن هم احتمالاً نیاز به دیتابیس دارد). Business logic هیچ تستی ندارد.

## Business Logic حیاتی بدون تست

- محاسبه قیمت (`roundPrice`, `pure_price`, `total`, `calculateCheckoutPrice`).
- `CartDetail::transmit`، `Order::confirm`، `Order::disconfirm`.
- Payment Callback (Mellat) و پرداخت Credit.
- `canUpdateStatus` و Cancel.
- Wallet (`total`, `removeable`) و تسویه.
- OTP/ثبت‌نام/فراموشی رمز.
- Authorization مالکیت.
- هزینه ارسال (`PostApi`، Cityprice).

## نتیجه برای Migration

هیچ Test به‌عنوان Specification رفتار قدیمی در دسترس نیست. رفتار فقط از کد استخراج می‌شود. برای Phaseهای بعد باید Characterization Test جدا تعریف شود (تصمیم بعدی، نه الان).
