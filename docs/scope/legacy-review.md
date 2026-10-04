# Legacy Review: Contradictions و Unknowns

مرجع: `docs/legacy/contradictions.md` (16) و `docs/legacy/unknowns.md` (38). `docs/legacy` تغییر نکرد.

## 1. Contradictions (16)

دسته‌ها: Resolved by evidence، Resolved by business decision، Still open، Not relevant.

| ID | موضوع | وضعیت | توضیح |
|---|---|---|---|
| C1 | دو سازوکار تأیید محصول | **Resolved by evidence** | `display` فعال است. `status` بلااستفاده. سیستم جدید یک مدل وضعیت دارد. Rejected: OD-05. |
| C2 | Order «ثبت‌شده» قبل/بعد پرداخت | **Resolved by business decision** | وضعیت PendingPayment اضافه می‌شود (state-machine-decisions §4). |
| C3 | Cancel موجودی را کم می‌کند | **Resolved by evidence** | `-=` باگ است. لغو موجودی را برمی‌گرداند (BR-18، Bug #1). |
| C4 | مبلغ پلن Sell: 100 در برابر `plan->price` | **Still open** | OD-08. |
| C5 | دو الگوریتم گردکردن | **Still open** | OD-11. |
| C6 | `CartAuth` و غلط املایی `middelware` | **Resolved by business decision** | Checkout ورود می‌خواهد. |
| C7 | نظر `pending` در برابر `confirmed` | **Still open** | OD-09. |
| C8 | چهار سیستم پیام | **Resolved by business decision** | یک سیستم پیام. دامنه ویژگی: OD-04. |
| C9 | سه نمایش پول | **Still open** | OD-01. |
| C10 | واحد پول Mellat (`/10`) | **Still open** | نیاز به کد پکیج/قرارداد بانک. Phase 2 (Money) و Phase 12. |
| C11 | `denined` در Export | **Resolved by evidence** | غلط املایی. Export DEFER. کلید وضعیت مشترک. |
| C12 | SMS: Controller غیرفعال، Listener فعال | **Resolved by evidence** | Listener فعال است. متن در Phase 13. |
| C13 | Admin و User یک جدول | **Resolved by business decision** | جداسازی (S21). |
| C14 | `uid` یکتا فقط در Validation | **Resolved by business decision** | یکتایی بین User و Shop در سطح داده تضمین می‌شود (BR-36). |
| C15 | کد 6 فقط در پیام | **Resolved by evidence** | در State Machine نیست. |
| C16 | ffmpeg در `composer.json` | **Resolved by business decision** | ffmpeg REMOVE (F89). |

| وضعیت | تعداد |
|---|---|
| Resolved by evidence | 5 |
| Resolved by business decision | 6 |
| Still open | 5 |
| Not relevant | 0 |

«Resolved by business decision» یعنی در Phase 0.5 از شاهد Legacy نتیجه گرفته شد و در `business-rule-decisions.md` یا `state-machine-decisions.md` ثبت شد. هیچ‌کدام تصمیم صریح کاربر (`USER-DECISION`) نیست.

## 2. Unknowns (38)

دسته‌ها: Resolved، Still Unknown، Not relevant، Requires user decision، Requires production investigation.

| ID | موضوع | وضعیت | توضیح |
|---|---|---|---|
| U1 | اجرا نشد | **Not relevant** | تصمیم Scope به اجرای Legacy نیاز ندارد. |
| U2 | نسخه PHP Production | **Not relevant** | سیستم جدید PHP ندارد. |
| U3 | Driver Cache/Session/Queue | **Not relevant** | جایگزین در Phase 2. |
| U4 | Production فعال و داده واقعی؟ | **Requires user decision** | OD-10. |
| U5 | Schema واقعی در برابر Migration | **Requires production investigation** | فقط اگر Migration لازم باشد. |
| U6 | Shop Scopeها و ShopRequest | **Resolved** | قواعد ShopRequest پیدا شد (title≤120، uid، city، email، background، send_types، zip_code). Scopeها Not relevant. |
| U7 | `ProductDetail::filterBy*` | **Not relevant** | Phase 8 فیلترها را از UI می‌گیرد. Legacy مرجع. |
| U8 | `shop.middleware` و `check.exists.product` | **Resolved** | CartMiddleware: 403 AJAX وقتی موجودی ≤ 0. StepCheckExists: حذف آیتم با موجودی ≤ 0. پرداخت بدون چک موجودی. |
| U9 | `TemporaryUser::transmit` | **Still Unknown** | داده با `toArray()` + `confirm=1` کپی می‌شود. Hash رمز نامعلوم. |
| U10 | Mutator رمز | **Requires production investigation** | قالب Hash در DB. برای Migration رمز. |
| U11 | Mellat Callback تکراری | **Requires production investigation** | کد پکیج `tohidplus/mellat` در دسترس نیست. |
| U12 | پرداخت در محل | **Requires user decision** | OD-12. |
| U13 | مقدار `pay_types`/`send_types` | **Requires production investigation** | DB. |
| U14 | SendType id=1 | **Resolved** | id=1 ارسال فروشگاه است (Order.php:143، CartDetail.php:84). مقدار سایر شناسه‌ها: DB. |
| U15 | `sendMessageToSeller` فعال | **Not relevant** | متن پیام در Phase 13. |
| U16 | مسیر Comment به pending/denied | **Resolved** | Admin `CommentController@update` فیلدها را مستقیم به‌روز می‌کند. |
| U17 | اثر Admin روی Order و Shop | **Resolved** | Admin اقدام تغییر Order/Shop ندارد (Update پیدا نشد). تغییر `display` Shop توسط Admin: Still Unknown. |
| U18 | `products/{id}/get` | **Resolved** | کد مخرب. REMOVE. |
| U19 | مدیریت `pay_types`/`send_types` | **Resolved** | Routeها در `routes/admin/base.php` هستند. |
| U20 | Comparison، Timeline، ShopPage، UserPage | **Requires user decision** | OD-04، OD-13. |
| U21 | CMS | **Requires user decision** | OD-13. |
| U22 | Advertisement | **Requires user decision** | OD-08. |
| U23 | ProductMessage، Msg، Ticket | **Requires user decision** | OD-04. |
| U24 | مقادیر Plan | **Requires production investigation** | DB. وابسته به OD-08. |
| U25 | `is_read` | **Resolved** | در Admin و Front MessageController به 1 می‌رود. |
| U26 | پاکسازی خودکار | **Resolved** | Scheduler خالی است. پاکسازی وجود ندارد. نیاز جدید: F90. |
| U27 | Broadcast/Pusher | **Still Unknown** | OD-13. |
| U28 | سرویس نقشه | **Still Unknown** | OD-13. |
| U29 | Analytics | **Still Unknown** | OD-13. |
| U30 | `Attachment::delete` فایل فیزیکی | **Still Unknown** | Phase 5 و Phase 15. |
| U31 | JS مراحل Cart | **Not relevant** | UI بازنویسی می‌شود. |
| U32 | استفاده Vue | **Resolved** | استفاده‌ای پیدا نشد. REMOVE (F96). |
| U33 | صفحات Empty/Error/Loading | **Not relevant** | Phase 6. |
| U34 | Viewهای Admin Developer | **Still Unknown** | OD-13. |
| U35 | Query در Blade | **Not relevant** | Blade حذف می‌شود. |
| U36 | Credential هنوز معتبر؟ | **Requires user decision** | OD-15. |
| U37 | `HttpsProtocol` | **Not relevant** | فقط HTTPS (S26). |
| U38 | Throttle واقعی OTP | **Not relevant** | سیستم جدید محدودیت تعریف می‌کند (S5، S6). |

| وضعیت | تعداد |
|---|---|
| Resolved | 10 |
| Still Unknown | 6 |
| Not relevant | 10 |
| Requires user decision | 7 |
| Requires production investigation | 5 |
