# Shanilo

بازنویسی Shanilo با Next.js 16 (App Router)، React 19، TypeScript، Tailwind CSS 4، MongoDB و Cloudinary. Production: Next.js و MongoDB روی VPS با Ubuntu 24.04. Development MongoDB: Atlas. Vercel Production Target نیست.

وضعیت: Phase 3 (MongoDB Data Layer) In Progress. Phase 0، 0.5، 1 و 2 Complete. Feature کسب‌وکار پیاده نشده است. مرجع وضعیت رسمی Phase، Stepها و CI: `CLAUDE.md` بخش 2. نسخه‌ها: `package.json`.

## اجرای محلی

```bash
npm install
cp .env.example .env.local   # برای dev و build مقدار اجباری نیست. اتصال دیتابیس به MONGODB_URI نیاز دارد
npm run dev                  # http://localhost:3000
```

نیاز: Node.js `>=22.12`.

## Scriptها

| Script | کار |
|---|---|
| `npm run lint` | ESLint |
| `npm run typecheck` | `next typegen` و `tsc --noEmit` |
| `npm test` | Vitest |
| `npm run build` | Build تولید |
| `npm run test:integration` | تست واقعی MongoDB. فقط `MONGODB_TEST_URI` (Replica Set آزمایشی). در `npm test` و CI نیست |
| `npm run smoke:health` | Smoke test بعد از `npm run build`. در CI نیست |

## ENV

- `.env.example` قرارداد کامل ENV است. فقط Placeholder دارد.
- `.env.local` را commit نکن. Git آن را نادیده می‌گیرد.
- Production (VPS): همان نام‌ها را در محیط اجرای Application روی VPS تنظیم کن. Development: `.env.local` با Atlas. اگر Vercel برای Preview یا استفاده موقت به کار رود، همان نام‌ها را فقط آنجا تنظیم کن.
- Secret فقط سمت server خوانده می‌شود: `src/lib/env/server.ts` (دارای `server-only`).
- فقط `NEXT_PUBLIC_*` به client می‌رسد: `src/lib/env/public.ts`.
- هر گروه ENV فقط وقتی لازم است Validate می‌شود. نبودن Provider اختیاری، Build یا Startup را متوقف نمی‌کند.
- خطای ENV فقط نام متغیر را نشان می‌دهد، نه مقدار.
- ENV جدید را همیشه به `.env.example` اضافه کن.

| ENV | Secret؟ | لازم از |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | خیر | اختیاری |
| `LOG_LEVEL` | خیر | اختیاری (پیش‌فرض `info`) |
| `MONGODB_URI` | بله | Phase 3. باید با `mongodb://` یا `mongodb+srv://` شروع شود |
| `MONGODB_TEST_URI` | بله | فقط Integration Test. برای Build و اجرای عادی لازم نیست. باید با `MONGODB_URI` فرق کند |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | بله | Phase 5 |
| `MELLAT_TERMINAL_ID` / `_USERNAME` / `_PASSWORD` | بله | Phase 12 |
| `ZARINPAL_MERCHANT_ID` | بله | Phase 12 |
| `SMSIR_API_KEY` / `SMSIR_LINE_NUMBER` | بله | Phase 4 |
| `SMTP_HOST` / `_PORT` / `_USER` / `_PASSWORD` / `_FROM` | بله | اختیاری. همه یا هیچ |

## ساختار

```
app/                 Route، Layout، Error page، /api/health
src/lib/env/         Validation ENV (schema، server، public)
src/lib/errors/      خطاهای نوع‌دار
src/lib/logger/      Logger ساخت‌یافته و Redaction
src/lib/money/       Money، Rounding، Tax، Pricing، Snapshot، Financial Errors، Idempotency (Contract)
src/lib/payment/     PaymentProvider و PaymentService (Contract)
src/lib/db/          اتصال MongoDB (Mongoose) و Transaction Helper
tests/               تست‌های Unit
tests-integration/   تست واقعی MongoDB
scripts/             Smoke test
docs/                مستندات Legacy و Scope
```

## Vercel (فقط Preview یا استفاده موقت. Production Target نیست)

- Framework: Next.js. Build: `npm run build`. Node: 22 یا بالاتر.
- ENV را در Project Settings ← Environment Variables بگذار.
- Build و `/api/health` ENV اجباری ندارند. Deploy بدون ENV باید Build شود. `MONGODB_URI` فقط وقتی لازم است که کد اتصال دیتابیس اجرا شود.

## Health

`GET /api/health` ← `{"status":"ok"}`. هیچ ENV یا اطلاعات داخلی نشان نمی‌دهد.
