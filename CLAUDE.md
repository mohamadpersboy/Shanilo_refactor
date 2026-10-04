# CLAUDE.md — Shanilo

این فایل وضعیت واقعی پروژه و قوانین کار را نگه می‌دارد.
قبل از هر کار، این فایل را بخوان.
بعد از هر تغییر مهم، این فایل را به‌روز کن.

---

## 1. زبان و سبک

- تمام پاسخ‌ها فارسی باشند.
- از ASD-STE100 استفاده کن: جمله کوتاه، دستور مستقیم، واژه ساده.
- گزارش‌ها ساختار مشخص داشته باشند.
- نتیجه هر عملیات واضح باشد.

---

## 2. وضعیت فعلی

| مورد | مقدار |
|---|---|
| Repository | `mohamadpersboy/Shanilo_refactor` |
| Repository Legacy (مرجع) | `mohamadpersboy/shanilo` (کد Legacy Laravel 5.5) |
| Branch | `main` |
| Current Phase | Phase 1 (Foundation) کامل شد. Phase 2 هنوز شروع نشده. |
| محتوای repository | `CLAUDE.md`، `docs/`، و پایه Next.js (`app/`، `src/lib/`، `tests/`). کد Legacy در این repository نیست. |
| کد Next.js | فقط پایه: Shell، `/api/health`، لایه ENV، Errors، Logger. Feature کسب‌وکار وجود ندارد. |
| Tests / Build | Scriptها: `lint`, `typecheck`, `test`, `build`. نسخه‌ها: Next 16.3.8، React 19.3.0، TypeScript 6.0.3، ESLint 9.39.5، Vitest 5.0.3. |
| Open Decisions | 15 مورد. منتظر پاسخ مالک. گزارش: `docs/scope/open-decisions-review.md` |

**هشدار امنیتی:** repository Legacy (`mohamadpersboy/shanilo`) در عمل public است و Credential بانک داخل آن است. جزئیات در `docs/scope/open-decisions-review.md` (OD-15). مالک باید Repository را private کند و Credential را Rotate کند.

---

## 3. پروژه Legacy (واقعیت‌های بررسی‌شده)

- Framework: `laravel/framework 5.5.*`.
- نسخه PHP در `composer.json`: `>=5.6.4`.
- فایل `.env` وجود ندارد. فقط `.env.example` هست.
- پوشه `vendor` وجود ندارد.
- Frontend Legacy: `assets/admin` و `assets/front`، Laravel Mix، Bootstrap/Sass.
- Viewها: Blade در `resources/views` (`admin`, `auth`, `front`, `emails`, `errors`).
- پکیج‌های مهم در `composer.json`:
  - ACL: `kodeine/laravel-acl`
  - پیام‌رسانی: `musonza/chat`
  - Activity log: `spatie/laravel-activitylog`
  - درگاه پرداخت: `tohidplus/mellat`, `tohidplus/zarrinpal`
  - SMS: `phplusir/smsir`, `leadthread/laravel-sms`, `twilio/sdk`
  - تاریخ شمسی: `morilog/jalali`
- `pbmedia/laravel-ffmpeg` هنوز در `composer.json` هست. Binaryهای ffmpeg حذف شده‌اند. (بخش «مسائل شناخته‌شده» را ببین.)

Legacy فقط منبع شناخت Behavior است. معماری Legacy را کپی نکن.

---

## 4. تاریخچه پاک‌سازی (قبل از اولین commit)

- حجم پروژه از حدود 256 MB به حدود 71 MB رسید.
- حذف شد: `.git` قدیمی، `.DS_Store`, `.psd`, `.map`, zip اضافه، پوشه‌های demo/sample/docs داخل pluginها، pluginهای بدون reference، اسکریپت‌های demo بدون reference در `assets/admin/_js/pages`.
- حذف شد با تأیید کاربر: `ffmpeg`, `ffprobe`, `ckeditor`, `ckfinder` در `assets/admin/_plugins`.
- دلیل حذف ffmpeg: توابع `createVideo` و `createMusic` در `AttachmentTrait` هیچ‌جا صدا زده نمی‌شوند.
- دلیل حذف ckeditor: هیچ view از `data-ckeditor` استفاده نمی‌کند.
- پروژه بعد از پاک‌سازی اجرا نشد. بررسی فقط با خواندن کد انجام شد.

---

## 5. هدف نهایی

بازنویسی کامل (Rewrite، نه Translation) با این stack:

- Next.js 16 (App Router)
- React
- TypeScript
- Tailwind CSS 4
- MongoDB
- Cloudinary

معماری هدف:

```
UI → Server/Client Component → Server Action / Route Handler → Service → Repository → MongoDB
```

Business logic فقط در Service Layer. Database access فقط در Repository Layer.
Secretها فقط server-side.

---

## 6. Roadmap (طبق Master Prompt)

Phase 0 Legacy Reverse Engineering → 0.5 Scope Decisions → 1 Foundation → 2 Architecture & Domain → 3 MongoDB → 4 Auth → 5 Cloudinary → 6 Design System → 7 Storefront → 8 Products → 9 User Dashboard → 10 Shop/Seller → 11 Cart/Checkout/Orders → 12 Payment/Wallet → 13 Social/Messaging/CMS → 14 Admin → 15 Data Migration → 16 Final Verification.

- بعد از هر Phase متوقف شو. Phase بعدی را خودکار شروع نکن.
- کار لازم و خارج از roadmap را به‌عنوان Phase N.5 گزارش کن و تأیید بگیر.

---

## 7. قوانین Workflow

```
READ → UNDERSTAND → INSPECT → PLAN → IMPLEMENT → TEST → UPDATE CLAUDE.md
→ LINT → TYPECHECK → TEST → BUILD → COMMIT → PUSH → VERIFY → REPORT
```

- روی `main` کار کن. Branch جدید نساز، مگر کاربر بگوید.
- Claude خودش commit و push می‌کند.
- Commit email همیشه `persboy.dev@gmail.com`. قبل از commit با `git config user.email` بررسی کن.
- Commit کوچک و منطقی باشد. Message واضح داشته باشد (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).
- قبل از Push اجرا کن: `lint`, `typecheck`, `test`, `build`. اگر یکی fail شد، Push نکن.
- نام scriptها را از `package.json` بخوان. در پروژه Next.js آینده، scriptها باید `lint`, `typecheck`, `test`, `build` باشند.
- بعد از Push، commit را روی remote بررسی کن.
- موفقیت را فقط وقتی گزارش کن که واقعاً انجام شده باشد.

---

## 8. قوانین مهم

- حدس نزن (Do Not Guess). Business rule، Payment، Permission، Order state و Financial rule را حدس نزن. بنویس: Unknown / Evidence needed / Question.
- Feature را بدون گزارش و تأیید حذف نکن.
- Feature جدید را بدون گزارش و تأیید اضافه نکن.
- Model، Service، Utility تکراری نساز. اول بررسی کن.
- Test، Lint یا Type error را پنهان نکن. `any`, `@ts-ignore` فقط با دلیل ثبت‌شده.
- تغییر معماری بدون تأیید ممنوع است. اول گزارش بده: Conflict / Impact / Options / Recommendation.
- داده Production را حذف یا reset نکن.
- Money با float ذخیره نشود. Convention پول قبل از پیاده‌سازی مشخص شود.
- Authorization در سمت server. Object-level authorization اجباری است.
- Validation در سمت server.
- Migration داده در پایان پروژه انجام شود. Idempotent و قابل verify باشد.

### اولویت دستورها

1. دستور صریح فعلی کاربر
2. وضعیت واقعی repository
3. CLAUDE.md
4. تصمیم‌های معماری تأییدشده
5. Master Prompt
6. مشخصات Phase فعلی
7. قراردادهای کد موجود

اگر conflict بود، گزارش بده.

---

## 9. امنیت و Secret

- GitHub token را هرگز در کد، `.env`، commit، log یا پاسخ ننویس.
- `.env` و `.env.local` را commit نکن. فقط `.env.example` با placeholder.
- مقدارهای مورد انتظار (فقط نام): `MONGODB_URI`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- Secret را در client bundle، log یا پیام خطا نشان نده.

---

## 10. مسائل شناخته‌شده

- TypeScript 7 و ESLint 10 با `eslint-config-next@16.3.8` سازگار نیستند (peer: `typescript-eslint` نیاز به TS زیر 6.1 و ESLint حداکثر 9 دارد). به همین دلیل TS 6.0.3 و ESLint 9.39.5 pin شده‌اند. بعد از سازگار شدن `eslint-config-next` دوباره بررسی کن.
- `npm audit`: 5 هشدار high در زنجیره Dev (`braces` ← `eslint-config-next`). فقط Dev است. در Runtime تولید نیست. بعد از نسخه جدید `eslint-config-next` دوباره بررسی کن.
- ZarinPal در ENV Phase 1 هست (دستور صریح مالک). OD-14/F45 آن را REMOVE ثبت کرده. این تعارض هنوز حل نشده. ENV فقط Config است. هیچ Provider پیاده نشده.
- نام ENV پیامک `SMSIR_*` است. Master Prompt در مثال `SMS_IR_*` دارد. نام نهایی با تأیید مالک.

- `pbmedia/laravel-ffmpeg` هنوز در `composer.json` است. اگر Legacy اجرا شود، `createVideo` و `createMusic` بدون ffmpeg کار نمی‌کنند. این توابع فعلاً استفاده نمی‌شوند.
- Legacy روی PHP جدید اجرا نمی‌شود. برای اجرا PHP 7.0 تا 7.2 لازم است. این مورد با اجرای واقعی تأیید نشده.
- پروژه Legacy بعد از پاک‌سازی اجرا و تست نشده است.

---

## 11. TODO

- [x] Phase 0: Legacy Reverse Engineering (`docs/legacy/`، 25 سند).
- [x] Phase 0.5: Scope & Feature Decisions (`docs/scope/`، 12 سند).
- [x] تصمیم `pbmedia/laravel-ffmpeg`: REMOVE (کد مرده). منتظر تأیید کاربر (OD-14).
- [x] Phase 1: Foundation (Next.js، ENV، Errors، Logger، Health، README).
- [ ] پاسخ کاربر به Open Decisions (`docs/scope/open-decisions.md`، 15 مورد).
- [ ] Master Prompt و Operating Rules را در `docs/` نگه‌داری کن (در صورت تأیید کاربر).

## 12. مستندات تصمیم

- `docs/legacy/`: شناخت Legacy (Phase 0). تغییر نمی‌کند.
- `docs/scope/`: تصمیم Scope (Phase 0.5). شروع از `docs/scope/README.md`.
- تصمیم‌های `OPEN` و `UNKNOWN` را حدس نزن. به `open-decisions.md` رجوع کن.
- Feature با تصمیم REMOVE تا تأیید کاربر (OD-14) حذف یا پیاده نمی‌شود.

## 13. Next Phase

Phase 2 — Architecture & Domain. منتظر دستور کاربر. خودکار شروع نکن.
