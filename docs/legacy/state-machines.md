# State Machines

## Order (`orders.status`، عدد صحیح)

Source: `Order::statuses()`, Migration `create_orders_table`, `Order::canUpdateStatus`, `OrderController@updateStatus`.

| کد | عنوان (کد) | معنی Migration |
|---|---|---|
| 0 | کنسل | canceled |
| 1 | ثبت شده | order registered (**default DB**) |
| 2 | تایید شده | order confirmed |
| 3 | تماس فروشگاه و مشتری | contact between seller and customer |
| 4 | ارسال سفارش | sent |
| 5 | دریافت سفارش | received |

```
 (ساخت Order، status=1، payment=pending)
        │
        ├─ پرداخت ناموفق ─────────────► 0   (verifyOrder: failure)
        │
        ▼ پرداخت موفق (status هنوز 1)
        1 ──فروشنده──► 2 ──فروشنده یا مشتری──► 3 ──فروشنده──► 4 ──مشتری──► 5
        │              │                        │
        └──── کنسل (هر طرف) از status < 3 ──────┘
```

### قاعده `canUpdateStatus($status)`

- `$status == 0`: مجاز اگر `order.status < 3`. (شامل خود 0 هم هست.)
- غیر از 0: `statuses = (user_id == auth id) ? [3, 5] : [2, 3, 4]`. و `order.status + 1 == $status`.
- یعنی مشتری فقط 3 و 5. فروشنده 2، 3، 4. هر مرحله باید پشت سر هم باشد.
- «مشتری» با `order.user_id == auth()->id()` تشخیص داده می‌شود. «فروشنده» هر کاربر دیگری که از `checkIfOrderBelongsToUser` رد شود (مالک Shop).

### نکات

- Order قبل از پرداخت با `status=1` ساخته می‌شود. «ثبت شده» به معنی «پرداخت‌شده» نیست. Middleware `check.order.status` برای `updateStatus` وضعیت Payment را چک می‌کند.
- موجودی فقط در `confirm()` کم می‌شود (پرداخت موفق). پس شکست پرداخت نیاز به برگشت موجودی ندارد.
- Cancel از 1 تا 2 مجاز است. Cancel در وضعیت 3 مجاز نیست. Cancel در وضعیت 0 دوباره مجاز است (`0 < 3`). `current-problems.md`.
- کد 6 فقط در پیام SMS/Announcement وجود دارد («کنسل و پول برگشت»). در DB ذخیره نمی‌شود.

### اثر هر وضعیت

| وضعیت | چه کسی | Database | Notification |
|---|---|---|---|
| 1 | سیستم (`transmit`) | Order، OrderDetail، Payment `pending` | بعد از پرداخت موفق: Announcement+SMS مشتری، Announcement فروشنده |
| 2 | فروشنده | `status=2` | Announcement+SMS مشتری |
| 3 | مشتری یا فروشنده | `status=3` | (پیام مشتری خالی) |
| 4 | فروشنده | `status=4` | Announcement+SMS مشتری |
| 5 | مشتری | `status=5` | (پیام مشتری خالی)، پیام فروشنده «دریافت تأیید شد» (طبق کد کامنت‌شده؛ نسخه فعال کامل خوانده نشد) |
| 0 | هر طرف | CreditLog؛ در Listener: `disconfirm` (اگر `add` وجود دارد) | Announcement+SMS |

نسخه فعال `sendMessageToSeller` کامل خوانده نشد. UNKNOWN.

## Payment (`payments.status`)

Source: Migration، `MellatPayment`، `CreditPayment`.

```
pending ──verify موفق──► successful
   │
   └──verify ناموفق──► unsuccessful
```

- Credit: Payment مستقیم `successful` (بدون `pending`).
- Payment `successful` برگشت‌پذیر نیست. Refund به بانک وجود ندارد.
- Callback تکراری: بررسی وضعیت قبلی وجود ندارد. UNKNOWN (رفتار `Mellat::verify` در پکیج).

## Checkout (تسویه فروشنده، `checkouts.status`)

```
pending ──Admin──► done
   └─────Admin──► denied
```

- Admin می‌تواند هر وضعیت را به هر وضعیت دیگر بدهد (محدودیت در کد نیست). ثابت‌نبودن: `done` را بعداً می‌توان تغییر داد.
- Export Admin کلید `denined` (غلط املایی) را برای متن وضعیت می‌خواند، ولی مقدار DB `denied` است. `contradictions.md`.

## RequestCheckoutCredit (تسویه Credit کاربر)

```
pending ──Admin──► done   (قفل: بعد از done قابل تغییر نیست)
   └─────Admin──► reject
```

Source: `Admin/Specific/CreditController@update`.

## Comment (`comments.status`)

`pending | confirmed | denied`. Front مستقیم `confirmed` می‌گذارد. جایی که `pending` یا `denied` ست شود در Front پیدا نشد. مسیر Admin (`comment` resource) بررسی نشد. UNKNOWN.

## Product

- `display`: 0 (در انتظار) ← Admin → 1 (نمایش).
- Gallery جدید: 1 → 0.
- ستون `status` (`pending`/`confirmed`) در Migration هست ولی تغییر آن در کد دیده نشد.

## User

- `confirm`: 0 → 1 با کد SMS.
- `status`: 1 فعال، 0 مسدود (توسط Admin؛ مسیر دقیق Admin بررسی نشد).

## FirstPage Promotion

- `expires_at` مبنای فعال بودن (`remaining` scope). حذف خودکار منقضی‌ها بررسی نشد.

## Message

- `is_read`: 0 → 1 (جای تغییر در `show` Controller؛ بررسی نشد). UNKNOWN.
