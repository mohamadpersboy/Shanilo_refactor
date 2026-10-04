# Cross-Domain Dependencies

فقط روابط واقعی از کد.

## نقشه

```
Order
 ├── User            (خریدار: orders.user_id)
 ├── Shop            (فروشنده: orders.shop_id) → Shop.user (مالک)
 ├── Address         (orders.address_id)
 ├── SendType        (orders.send_type_id) → هزینه ارسال: Shop↔City pivot
 ├── Payment         (morphOne) → PayType → کلاس درگاه
 ├── OrderDetail → ProductDetail → Product → Shop
 ├── WalletTransaction → Wallet → Shop
 ├── CreditLog / User.credit  (در Cancel)
 └── Notification    (Event OrderStatusChanged → Announcement + SMS)

Cart
 ├── Cookie (نه User)
 ├── CartDetail → Shop، Address، SendType، PayType
 └── CartDetailProduct → ProductDetail (قیمت زنده)

Product
 ├── Shop، Brand، ProductCategory (3 سطح)، TechnicalSpecification
 ├── ProductDetail → Color، موجودی، قیمت، تخفیف
 ├── Comment (Polymorphic) → User
 ├── Attachment (تصاویر)
 └── NotifyList → Announcement (Event موجودی/تخفیف)

Shop
 ├── User (مالک)
 ├── Wallet (One-to-One)
 ├── City (سرویس‌دهی با قیمت)، SendType
 ├── Follower، Comment
 └── Order

Payment
 ├── Order
 ├── FirstPageSpecialSuggestion / FirstPageSpecialSell → Plan
 └── (Credit شارژ: فقط CreditLog؛ Payment نمی‌سازد)

Wallet / Credit
 ├── Shop Wallet ← Order::confirm (add) / disconfirm (sub)
 ├── Checkout (Shop Wallet → BankCart)
 └── User.credit ← شارژ، Cancel؛ → خرید با Credit، RequestCheckoutCredit

Messaging
 ├── User↔User (Block-list)
 ├── Shop (shop_id در Message)
 └── Announcement (Event MessageSent)

Promotion
 ├── ProductDetail → SpecialSuggestion/SpecialSell
 ├── Plan → FirstPage*
 └── PayType (Mellat | Credit)
```

## اتصال‌های پنهان

| وابستگی | Source |
|---|---|
| ساخت Shop ← Wallet | `Shop::boot` |
| حذف Shop ← حذف Product ← حذف ProductDetail ← حذف SpecialSell/Suggestion | `boot` هر Model |
| حذف ProductDetail ← انتخاب شاخص جدید | `ProductDetail::boot` |
| Cancel Order ← Wallet + موجودی + Credit کاربر | `SendOrderStatusNotification` (Listener) |
| `RequestCheckoutCredit` done ← `users.credit` | `RequestCheckoutCredit::boot` |
| `ADMIN_CHECKOUT_PERCENT` (env) ← مبلغ فروشنده | `Order::calculateCheckoutPrice` |
| SendType `id==1` (ثابت عددی) ← City pivot price | `CartController`, `CartDetail`, `Order` |
| `pay_types.class_name` ← کلاس PHP | `PaymentController`, `*Controller@store` |
| View Composer ← شمارنده‌های Dashboard | `AppServiceProvider` |

## جهت وابستگی (خلاصه)

- Order به همه چیز وابسته است. هیچ Domain به Order وابستگی برگشتی ندارد جز Wallet و Notification.
- Payment عمومی است (Order + Promotion) ولی Credit شارژ جدا است.
- Cart وابسته به Cookie و Catalog و Shop است. به Auth فقط از Step 3 به بعد.
