# مستندات Legacy — Shanilo (Phase 0)

این پوشه خروجی Phase 0 است: شناخت رفتار واقعی پروژه Legacy.
این مستندات فقط **تحلیل** هستند. هیچ کدی تغییر نکرده است.

## مبنا

| مورد | مقدار |
|---|---|
| Repository | `mohamadpersboy/shanilo` |
| Branch | `main` |
| Commit مبنا | `8ed53e4` |
| روش | خواندن کد (Static Reading) |
| اجرای پروژه | انجام نشد. `vendor` و `.env` وجود ندارند. |

## قوانین خواندن مستندات

- هر نتیجه یک `Source:` دارد. مسیر فایل و نام متد را ببین.
- `UNKNOWN` یعنی شواهد کافی نیست. حدس نزده‌ایم.
- `PLAUSIBLE` یعنی از روی کد ممکن است، ولی اجرا نشده.
- مقدار Secret در هیچ سندی نوشته نشده. فقط نام فایل یا نام ENV آمده است.
- Phase 0 تصمیم معماری یا طراحی Schema جدید ندارد.

## فهرست اسناد

| سند | محتوا |
|---|---|
| [system-inventory.md](system-inventory.md) | Stack و شمارش فایل‌ها |
| [architecture.md](architecture.md) | معماری واقعی Legacy |
| [domains.md](domains.md) | Domainها با ساختار گزارش |
| [routes.md](routes.md) | Routeها و رفتار Routeهای مهم |
| [models.md](models.md) | Modelهای اصلی |
| [database.md](database.md) | جدول‌ها و Migrationها |
| [relationships.md](relationships.md) | Relationها |
| [business-rules.md](business-rules.md) | Ruleهای کسب‌وکار |
| [state-machines.md](state-machines.md) | چرخه حیات Entityها |
| [authentication.md](authentication.md) | ورود، ثبت‌نام، بازیابی رمز |
| [authorization.md](authorization.md) | نقش، Permission، بررسی مالکیت |
| [media.md](media.md) | آپلود و ذخیره فایل |
| [external-services.md](external-services.md) | سرویس‌های بیرونی |
| [frontend.md](frontend.md) | Viewها و JavaScript |
| [admin.md](admin.md) | پنل مدیریت |
| [testing.md](testing.md) | وضعیت Test |
| [dependencies.md](dependencies.md) | وابستگی‌ها |
| [security.md](security.md) | وضعیت امنیت فعلی |
| [critical-flows.md](critical-flows.md) | Flowهای end-to-end |
| [cross-domain-dependencies.md](cross-domain-dependencies.md) | وابستگی Domainها |
| [current-problems.md](current-problems.md) | مشکلات فعلی |
| [feature-classification.md](feature-classification.md) | گروه A/B/C/D |
| [unknowns.md](unknowns.md) | موارد نامعلوم |
| [contradictions.md](contradictions.md) | تناقض‌ها |

## پوشش تحلیل

عمیق خوانده شد:
Auth، Cart، Checkout، Payment، Order، Wallet، Credit، Product، ProductDetail، Shop (ایجاد)، Comment، Message، Event/Listener، Middleware، Gate، Helperهای مالی، Media (Trait)، Admin (Checkout/Credit/Product/Order).

نمونه‌برداری شد (مرور سطحی):
Article، News، FAQ، Guide، Gallery، Newsletter، Advertisement، Comparison، Timeline، ShopPage، UserPage، Admin CRUD عمومی، Viewها، JavaScript.

بخش‌های نمونه‌برداری‌شده در `unknowns.md` علامت دارند.
