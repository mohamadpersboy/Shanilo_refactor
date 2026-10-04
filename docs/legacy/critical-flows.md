# Critical Flows

هر Flow از کد دنبال شده است. Flowهای بدون شواهد کافی علامت `UNKNOWN` دارند.

## 1. ثبت‌نام

```
POST /register
 → Validation (name, family, email, uid, password, mobile, agreement)
 → rand(6 رقم)، hashed = md5(code)
 → TemporaryUser::create، SMS 31278، Session tmp_id
 → POST /confirm (code)
 → exist_hashed (users | temporary_users)
 → User موجود؟ confirm=1 : TemporaryUser::transmit() (ساخت User)
 → Auth::login → /confirmed (انتخاب دسته‌های موردعلاقه)
```
`TemporaryUser::transmit` بررسی نشد. UNKNOWN (کپی فیلد، Hash رمز).

## 2. ورود

```
POST /login-auth (mobile, password)
 → Lockout check
 → attemptLogin
    status=0 → logout + پیام
    confirm=0 → کد جدید + SMS + Redirect تأیید
    موفق → regenerate، destroy session قبلی، ذخیره session_id
 → JSON { url: back() }
```

## 3. مرور محصول

```
GET /products (فیلتر Query String)
 → ProductDetail::filter() + display=1 + product visible + index=1
 → ترتیب created_at desc، limit 12 (قابل تغییر با limit)
GET products/detail/{id}
 → product.display باید 1 باشد (وگرنه 404)
 → Cookie ۱۵ دقیقه‌ای → views++
 → نظرهای Parent و confirmed
```

## 4. ساخت محصول

```
POST profile/product (auth)
 → ProductRequest (title≤60، shop_id ∈ shopهای کاربر، brand، category_1..3، description یا مشخصات فنی، pic)
 → display=0
 → Transaction: Product::create، مشخصات فنی، دسته‌ها، Properties، createImage(main + thumbnails)
 → پیام «پس از تایید مدیر نمایش داده می‌شود»
Admin: update display=1
```
ProductDetail (قیمت/موجودی) جدا ثبت می‌شود: `profile/productDetail/{product}`. محصول بدون ProductDetail قابل خرید نیست (UNKNOWN: آیا نمایش داده می‌شود).

## 5. Cart

```
POST cart/{productDetail}/toggle (middleware shop.middleware)
 → اگر در Cart: remove
 → وگرنه validator Properties، Cart::add → CartDetail(per shop) + CartDetailProduct
POST cart/update-count → count ≤ موجودی
```

## 6. Checkout (6 مرحله)

```
step1 سبد → step2 ورود → step3 آدرس → step4 نحوه ارسال → step5 بازبینی → step6 نحوه پرداخت → /payment/pay/{cartDetail}
```
- مراحل 2..6 میان‌افزار `auth/cart-auth` ندارند (typo).
- `updateField` ذخیره می‌کند: `address_id`, `send_type_id` (+ `transport_price`)، `pay_type_id`.
- `field` و `value` از Client می‌آید. فهرست مجاز فیلد (Whitelist) وجود ندارد (`$request->get('field') => value`)، فقط `$fillable` مدل محافظ است. PLAUSIBLE.

## 7. Payment و Order (آنلاین)

```
GET payment/pay/{cartDetail}
 → pay_type_id موجود؟ مالکیت Cart
 → new {pay_types.class_name}()->payOrder
MellatPayment::payOrder
 → CartDetail::transmit  [Transaction: Order(status=1)، OrderDetail، Payment(pending)، delete CartDetail]
 → Mellat::set(price, order_id) → Redirect بانک
Callback POST payment/verifyOrder (CSRF مستثنا)
 → موفق: Order::confirm [Transaction: stock -=، sell_count +=، WalletTransaction add]
         Payment successful + ref_id
         Event OrderStatusChanged → Announcement + SMS (مشتری، فروشنده)
         Redirect payment/result/{order}
 → ناموفق: Payment unsuccessful، Order.status=0
```

### پرداخت با Credit

```
CreditPayment::payOrder
 → credit >= total؟
 → Transaction: transmit، confirm، Payment successful، credit -= total، CreditLog payment
 → Event OrderStatusChanged
```

### حالت «پرداخت در محل» (`type=home`)
Class و رفتار پیدا نشد. UNKNOWN.

## 8. چرخه Order

```
فروشنده: 2 → 3 → 4    مشتری: 3 و 5    کنسل: هر طرف، status<3
PATCH profile/order/{order}/updateStatus
 → check.order.status (payment باید successful)
 → canUpdateStatus
 → Transaction: CreditLog (برای هر Cancel)، order.update، Event، (SMS تابع غیرفعال)
Listener SendOrderStatusNotification:
 → status=0 && add وجود دارد → Order::disconfirm [stock -=!، sell_count -=، WalletTransaction sub، user.credit += total]
 → Announcement + SMS
```

## 9. ساخت Shop

```
POST profile/shop (ShopRequest)
 → beginTransaction
 → Shop::create → boot: Wallet::create
 → sync cities (پیش‌فرض: همه شهرها)
 → background image (اختیاری)
 → attach send_types
 → commit
```

## 10. Review

```
POST comment/{shop|product}/{id}/store (auth)
 → comment، rate 1..5
 → canComment (غیر مالک، یک نظر)
 → status=confirmed
```

## 11. Favorite

```
POST favorite/toggle/{productDetail}
 → Cookie favorite (session cookie) → favorites + favorite_details
```
مهمان هم می‌تواند. با ورود به User وصل نمی‌شود. UNKNOWN: Merge بعد از ورود.

## 12. Messaging

```
POST message (auth)
 → Validation (subject، receiver_id + receiver_sid، message، shop_id اختیاری)
 → Block-list
 → Message::create (Thread با parent_id)
 → file → Disk public/message
 → Event MessageSent → Announcement به گیرنده
```
در Profile: `profile/messages` (`MessageController` دیگر) و تیکت. دو Controller پیام Front (`Specific/MessageController`، `Profile/MessageController`) و `MsgController` وجود دارد. `contradictions.md`.

## 13. Notification

```
ProductCountChanged / ProductHasOff / UserSuggestedAProduct / MessageSent / OrderStatusChanged
 → Listener (Synchronous) → announcements (HTML) + SMS (فقط سفارش)
ProductAdded → Listener دارد، Event Dispatch نمی‌شود (Dead)
```

## 14. شارژ Credit

```
POST profile/credit (price 10000..10000000) → Mellat
POST profile/credit/verify → credit += amount/10 → CreditLog charge
```
`users.credit` فقط مبلغ را اضافه می‌کند و Duplicate Callback را بررسی نمی‌کند. (PLAUSIBLE)

## 15. تسویه

```
فروشنده: POST profile/checkout → Checkout pending
Admin: update → done (tracking_code) / denied
کاربر: POST profile/credit/request_checkout → RequestCheckoutCredit pending
Admin: update → done → Hook: credit -= price + CreditLog
```

## 16. Admin Moderation

```
Product: Admin DataTable → update(display)
Comment/Report: Admin Resource
```
جزئیات Order/Shop Moderation در Admin: UNKNOWN.
