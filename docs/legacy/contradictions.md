# Contradictions

حل نشده‌اند. فقط ثبت. هر مورد: Conflict، Source A، Source B، Observed difference، Possible explanation، Decision required.

## C1 — دو سازوکار تأیید محصول

- Source A: `Product::scopeConfirmed` + Migration (`products.status` enum `pending/confirmed`).
- Source B: `ProductController@store` (`display=0`)، `Admin/ProductController@update` (`display`)، `VisibilityTrait`.
- Observed difference: تأیید با `display` انجام می‌شود. ستون `status` در کد Front/Admin تغییر نمی‌کند.
- Possible explanation: ستون قدیمی جایگزین شده.
- Decision required: کدام مدل تأیید در سیستم جدید.

## C2 — وضعیت پیش‌فرض Order در مقابل پرداخت

- Source A: Migration `orders.status default 1` («ثبت شده»).
- Source B: `MellatPayment::verifyOrder` فقط Payment را `successful` می‌کند و `status` را 1 می‌گذارد.
- Observed difference: «ثبت شده» هم قبل و هم بعد از پرداخت 1 است. فقط `payments.status` تفاوت را نشان می‌دهد.
- Decision required: تعریف وضعیت Pending Payment.

## C3 — Cancel و موجودی

- Source A: `Order::confirm` موجودی را کم می‌کند.
- Source B: `Order::disconfirm` باز هم موجودی را **کم** می‌کند (`count -= ...`).
- Observed difference: Cancel باید برگشت موجودی باشد (متن Wallet `sub` و `sell_count -=`)، ولی موجودی کم می‌شود.
- Possible explanation: خطای تایپی (`-=` به‌جای `+=`).
- Decision required: رفتار صحیح برگشت موجودی.

## C4 — مبلغ پلن صفحه اول

- Source A: `MellatPayment::payFirstPageSpecialSuggestion` → `Mellat::set($plan->price)`.
- Source B: `MellatPayment::payFirstPageSpecialSell` → `Mellat::set(100)`.
- Observed difference: Sell مبلغ ثابت 100 می‌فرستد. Credit آن را با `plan->price` کم می‌کند.
- Possible explanation: مبلغ تست باقی مانده.
- Decision required: قیمت صحیح پلن «فروش ویژه».

## C5 — دو الگوریتم قیمت

- Source A: `ProductDetail::getPurePriceAttribute` (`roundPrice`: 100 یا 1000).
- Source B: `PurePriceTrait::getPurePriceAttribute` (گرد به 500/1000).
- Observed difference: Model از نسخه خودش استفاده می‌کند. Trait اثر ندارد.
- Decision required: قاعده گردکردن.

## C6 — Cart Middleware

- Source A: گروه Route `['middelware' => ['auth','cart-auth']]` در `routes/front/specific.php`.
- Source B: `CartController::step3` استفاده از `\Auth::user()->addresses`.
- Observed difference: Middleware به‌خاطر غلط املایی اعمال نمی‌شود. `CartAuth` هم به Route نامعتبر Redirect می‌کند.
- Decision required: نیاز به ورود برای Step 3+.

## C7 — وضعیت نظر

- Source A: Migration `comments.status default 'pending'` و Admin Sidebar شمارنده `pending`.
- Source B: `CommentController@store/reply` همیشه `confirmed`.
- Observed difference: صف تأیید نظر از Front پر نمی‌شود.
- Decision required: نظر قبل از نمایش تأیید می‌شود یا نه.

## C8 — سیستم‌های پیام

- Source A: `messages` (Message، Thread، Front/Admin).
- Source B: `msg` + جزئیات (Msg، تیکت ۲۰۲۱).
- Source C: `product_message`، `tickets`، `conversations` (Musonza).
- Observed difference: ۴ ساختار برای پیام/تیکت. Route و Controller جدا.
- Decision required: کدام‌ها فعال و لازم‌اند.

## C9 — دو سیستم تسویه / پول

- Source A: `Wallet` + `Checkout` (فروشگاه، Integer).
- Source B: `users.credit` + `RequestCheckoutCredit` (کاربر، Float).
- Source C: `check_outs` (قدیمی، String).
- Observed difference: سه نمایش پول. Cancel به `users.credit` می‌رود. فروش به Wallet.
- Decision required: Convention پول و مدل موجودی (قبل از طراحی Schema).

## C10 — واحد پول Mellat

- Source A: `config/mellat.php` `convertToRial=true`.
- Source B: `CreditController::verify` → `credit += amount/10`. `Order` مبلغ Payment را مستقیم می‌خواند.
- Observed difference: Credit بعد از Verify تقسیم بر 10 می‌شود. سفارش از `payments.price` جدا اعتبارسنجی نمی‌شود.
- Possible explanation: `$log->amount` ریال است.
- Decision required: تأیید واحد در Log درگاه. (Evidence: کد پکیج.)

## C11 — Export وضعیت تسویه

- Source A: Migration `checkouts.status enum('done','pending','denied')`.
- Source B: `Admin/CheckoutController::export` کلید `denined`.
- Observed difference: غلط املایی. وضعیت `denied` در Export خطا می‌دهد (PLAUSIBLE: کلید ناموجود).

## C12 — SMS: متن در مقابل Template

- Source A: `OrderController::sendMobileConfirmationSMS` (متن، `Smsir::send` کامنت).
- Source B: Listener `SendOrderStatusNotification` (Template ID ثابت).
- Observed difference: Controller تابع غیرفعال را صدا می‌زند. Listener SMS واقعی می‌فرستد.
- Decision required: متن و قالب SMS سفارش.

## C13 — Admin و Guard

- Source A: `config/auth.php` Guard `admins` → Provider `admins` → `User`.
- Source B: Front `web` → `users` → `User`.
- Observed difference: هر دو یک جدول. Admin با نقش تشخیص داده می‌شود. Admin Login (`Auth::login`) و Impersonation Session کاربر Front را عوض می‌کند.
- Decision required: جداسازی Admin/User.

## C14 — `uid` یکتایی

- Source A: Register `unique:users,uid|unique:shops,uid`.
- Source B: Migration: `users.uid` و `shops.uid` هر کدام `unique` ولی بین دو جدول قید DB نیست.
- Observed difference: یکتایی بین‌جدولی فقط در Validation است (Race ممکن).

## C15 — نمای وضعیت Order 6

- Source A: `Order::statuses()` فقط 0..5.
- Source B: Listener پیام کد 6 («کنسل و پول برگشت»).
- Observed difference: 6 فقط برای پیام است، در DB نیست.

## C16 — مستندات Legacy در مقابل CLAUDE.md

- Source A: `CLAUDE.md` «ffmpeg حذف شد، `composer.json` هنوز دارد».
- Source B: `composer.json` شامل `pbmedia/laravel-ffmpeg` و `config/laravel-ffmpeg.php`.
- Observed difference: همان‌طور که CLAUDE.md می‌گوید. فقط ثبت. Decision: Phase 0.5.
