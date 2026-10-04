# State Machine Decisions

مبنا: `docs/legacy/state-machines.md`. فقط WHAT. نام‌های وضعیت نام کسب‌وکار است، نه نام Schema.
برچسب: EVIDENCE-BASED، OPEN، UNKNOWN.

## 1. User

| مورد | مقدار |
|---|---|
| Legacy states | `confirm` 0/1 (تأیید موبایل)، `status` 1/0 (فعال/مسدود) |
| New states | PendingVerification، Active، Blocked |
| Removed | ترکیب دو ستون |
| Added | PendingVerification (جایگزین `temporary_users`) |
| Allowed | PendingVerification→Active (کد صحیح). Active→Blocked (Admin). Blocked→Active (Admin). |
| Forbidden | PendingVerification→Blocked بدون Admin. ورود در PendingVerification و Blocked. |
| Terminal | ندارد. حذف حساب: UNKNOWN (Legacy مسیر حذف حساب ندارد). |
| Basis | EVIDENCE-BASED |

## 2. Product

| مورد | مقدار |
|---|---|
| Legacy states | `display` 0 (در انتظار) / 1 (نمایش). ستون `status` بلااستفاده (C1). |
| New states | PendingApproval، Published |
| Removed | ستون `status` |
| Added | Rejected (OPEN، OD-05)، Archived (حذف نرم توسط فروشنده) |
| Allowed | ساخت→PendingApproval. PendingApproval→Published (Admin). Published→PendingApproval (تصویر جدید). Published/PendingApproval→Archived (مالک). |
| Forbidden | انتشار توسط فروشنده. نمایش عمومی PendingApproval و Archived. |
| Terminal | Archived (محصولات داخل Orderها Snapshot دارند) |
| Basis | EVIDENCE-BASED. Rejected: OPEN |

## 3. Cart

| مورد | مقدار |
|---|---|
| Legacy states | ندارد. Cart با `transmit` حذف می‌شود (قبل از پرداخت). |
| New states | Active، Converted، Expired |
| Removed | حذف Cart قبل از پرداخت |
| Added | Converted (بعد از پرداخت موفق)، Expired |
| Allowed | Active→Converted (پرداخت موفق). Active→Expired (مدت بی‌استفاده). |
| Forbidden | تغییر Cart در Converted و Expired. |
| Terminal | Converted، Expired |
| Rule | پرداخت ناموفق یا رها شده Cart را از بین نمی‌برد (B3). |
| Basis | EVIDENCE-BASED. مدت انقضا: OPEN (Phase 11) |

## 4. Order

| مورد | مقدار |
|---|---|
| Legacy states | 0 کنسل، 1 ثبت شده، 2 تایید شده، 3 تماس فروشگاه و مشتری، 4 ارسال سفارش، 5 دریافت سفارش |
| New states | PendingPayment، Registered، Confirmed، InContact، Shipped، Received، Cancelled |
| Removed | کد 6 (فقط پیام بود) |
| Added | PendingPayment |
| Cancel reason | Cancelled دلیل دارد: PaymentFailed، PaymentExpired، ByCustomer، BySeller |
| Basis | EVIDENCE-BASED |

| Transition | چه کسی | شرط |
|---|---|---|
| PendingPayment→Registered | سیستم | پرداخت موفق |
| PendingPayment→Cancelled | سیستم/مشتری | پرداخت ناموفق، انقضا یا انصراف. بدون اثر روی موجودی. |
| Registered→Confirmed | فروشنده | |
| Confirmed→InContact | مشتری یا فروشنده | |
| InContact→Shipped | فروشنده | |
| Shipped→Received | مشتری | |
| Registered→Cancelled، Confirmed→Cancelled | مشتری یا فروشنده | یک بار. موجودی برمی‌گردد. برگشت وجه ثبت می‌شود. |

- Forbidden: پرش مرحله. بازگشت به مرحله قبل. تغییر از Received یا Cancelled. لغو از InContact، Shipped، Received (Legacy: لغو فقط `status<3`). تغییر توسط غیرمالک.
- Terminal: Received، Cancelled.
- Admin: Legacy اقدام Admin برای تغییر وضعیت Order ندارد. Admin فقط مشاهده می‌کند. Override: UNKNOWN (Potential New Feature PNF-03).
- بازگشت کالا بعد از Received: Legacy ندارد. UNKNOWN (PNF-02).

## 5. Payment

| مورد | مقدار |
|---|---|
| Legacy states | pending، successful، unsuccessful |
| New states | Pending، Succeeded، Failed، Expired |
| Added | Expired (پاسخ بانک نرسید) |
| Allowed | Pending→Succeeded، Pending→Failed، Pending→Expired |
| Forbidden | تغییر Succeeded و Failed. Succeeded دوم برای همان Payment. |
| Terminal | Succeeded، Failed. Expired: UNKNOWN (آیا بانک بعد از انقضا می‌تواند موفق اعلام کند؟ U11، نیاز به بررسی قرارداد بانک). |
| Refund | در بانک نیست (B6). برگشت وجه یک ورودی دفتر است (OD-01). |
| Credit payment | فوری Succeeded. وابسته به OD-01. |
| Basis | EVIDENCE-BASED. Expired: UNKNOWN |

## 6. Wallet / Settlement

| مورد | مقدار |
|---|---|
| Wallet Legacy | بدون وضعیت. تراکنش `add` / `sub`. |
| Wallet New | ورودی دفتر نامتغیر (Credit/Debit). موجودی دو بخش دارد: Held و Available (دوره نگهداری: OD-03). |
| Settlement (Checkout) Legacy | pending→done / denied. Admin هر وضعیت را به هر وضعیت می‌برد. |
| Settlement New | Pending، Done، Denied. Pending→Done، Pending→Denied. Done و Denied نهایی. |
| Added | Cancelled by requester: UNKNOWN (Legacy ندارد). |
| Forbidden | تغییر Done/Denied. مبلغ بیش از Available. دو درخواست Pending برای یک Wallet. |
| Terminal | Done، Denied |
| Credit (کاربر) | RequestCheckoutCredit: pending→done/reject. وابسته به OD-01. |
| Basis | EVIDENCE-BASED. Credit: OPEN |

## 7. Shop

| مورد | مقدار |
|---|---|
| Legacy states | `display` 1 (پیش‌فرض). تأیید Admin وجود ندارد. تغییر `display` توسط Admin: UNKNOWN (U17). |
| New states | Active، Suspended |
| Added | PendingApproval (OPEN، OD-05) |
| Allowed | Active→Suspended (Admin). Suspended→Active (Admin). |
| Forbidden | فروش در Suspended. محصولات Suspended در نمایش عمومی. |
| Terminal | ندارد |
| Basis | PendingApproval: OPEN. Suspended: UNKNOWN (مسیر Legacy پیدا نشد) |

## 8. Shipment / Delivery

Legacy موجودیت جدا ندارد. وضعیت‌های InContact، Shipped، Received در Order هستند. در MVP موجودیت جدا اضافه نمی‌شود. کد رهگیری ارسال: Legacy ندارد (فقط `tracking_code` تسویه). UNKNOWN. Basis: EVIDENCE-BASED.

## 9. Comment

| مورد | مقدار |
|---|---|
| Legacy states | pending، confirmed، denied. Front فقط confirmed می‌سازد (C7). |
| New states | Published، Pending، Rejected، Deleted |
| Allowed | Pending→Published/Rejected (Admin). حذف توسط مالک نظر. |
| Initial state | OPEN (OD-09) |
| Terminal | Rejected، Deleted |
| Basis | OPEN |

## 10. Message

| مورد | مقدار |
|---|---|
| Legacy | `is_read` 0/1 (در Admin و Front MessageController به‌روز می‌شود، U25 resolved) |
| New states | Sent، Read |
| Allowed | Sent→Read (گیرنده) |
| Forbidden | Read→Sent. خواندن توسط غیرگیرنده. |
| Terminal | Read |
| Basis | EVIDENCE-BASED. نوع و ادغام سیستم‌های پیام: OPEN (OD-04) |

## 11. Advertisement

Legacy فقط ثبت درخواست دارد. وضعیت، پرداخت و نمایش پیدا نشد (U22). هیچ State Machine تعریف نمی‌شود. UNKNOWN.

## 12. Promotion (جایگاه صفحه اول)

Legacy: Active تا `expires_at`. New: Active، Expired. Active→Expired خودکار. Post-MVP. Basis: EVIDENCE-BASED. قیمت: OD-08.
