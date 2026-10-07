# Shanilo

بازنویسی Shanilo با Next.js 16 (App Router)، React 19، TypeScript، Tailwind CSS 4، MongoDB و Cloudinary. Production: Next.js و MongoDB روی VPS با Ubuntu 24.04. Development MongoDB: Atlas. Vercel Production Target نیست.

وضعیت: Phase 1 (Foundation). فقط پایه پروژه وجود دارد. هیچ Feature کسب‌وکار پیاده نشده.

## اجرای محلی

```bash
npm install
cp .env.example .env.local   # در Phase 1 هیچ مقداری لازم نیست
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
| `MONGODB_URI` | بله | Phase 3 |
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
tests/               تست‌های پایه
docs/                مستندات Legacy و Scope
```

## Vercel (فقط Preview یا استفاده موقت. Production Target نیست)

- Framework: Next.js. Build: `npm run build`. Node: 22 یا بالاتر.
- ENV را در Project Settings ← Environment Variables بگذار.
- Phase 1 هیچ ENV اجباری ندارد. Deploy بدون ENV باید Build شود.

## Health

`GET /api/health` ← `{"status":"ok"}`. هیچ ENV یا اطلاعات داخلی نشان نمی‌دهد.
