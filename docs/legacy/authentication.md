# Authentication

Source: `Front/Auth/*`, `config/auth.php`, `AppServiceProvider`, `Middleware/CheckIfAuthenticated`, `CheckIfUserConfirmed`.

## روش‌ها

| مورد | رفتار |
|---|---|
| Login | `mobile` + `password` (`username()` = `mobile`). Throttle پیش‌فرض Laravel. |
| Registration | فرم → `temporary_users` + SMS → تأیید کد → ساخت User |
| Password reset | موبایل + SMS (`password_reset_mobiles`). Email قدیمی کامنت شده. |
| Email verification | وجود ندارد. Email اجباری و یکتا است ولی تأیید نمی‌شود. |
| Phone verification | کد SMS (6 رقم برای ثبت‌نام، 5 رقم برای فراموشی) |
| Session | Driver از env. Session قبلی کاربر با هر ورود destroy می‌شود (`users.session_id`). |
| Token / API | Guard `api` (token) تعریف شده. استفاده واقعی پیدا نشد. |
| Remember me | `remember_token` وجود دارد. در Controller استفاده سفارشی پیدا نشد. |
| Logout | `POST /logout`: logout + flush + regenerate. |
| Expiration | کد فراموشی: 15 دقیقه. کد ثبت‌نام: انقضا ندارد. |

## Guardها

- `web` → Provider `users` → `User`.
- `admins` → Provider `admins` → **همان** `User` (جدول `users`).
- Admin و کاربر عادی یک جدول‌اند. تمایز با نقش (`role_id` و ACL).
- Admin Login مجزا: `admin.login`, `auth.admin:admins`.

## جریان ثبت‌نام

1. `POST /register`: Validation (`name`, `family` ≤ 60؛ `email` یکتا؛ `uid` فقط `[A-Za-z0-9_-]` و یکتا در `users` و `shops`؛ `password` ≥ 6 + تأیید؛ `mobile` یکتا و `mobile` Rule؛ `agreement`).
2. `rand(100000, 999999)` → `hashed = md5(code)`.
3. SMS با قالب 31278 (`Smsir::ultraFastSend`) به موبایل.
4. `TemporaryUser::create($request->all())` (شامل `random` و `hashed`). Session: `tmp_id`.
5. `POST /confirm` با `code`: Rule `exist_hashed:{table},hashed`. `table = users` اگر ورود کرده، وگرنه `temporary_users`.
6. اگر `User` با `hashed = md5(code)` وجود دارد → `confirm=1`. وگرنه `TemporaryUser::where('hashed', md5(code))->first()->transmit()` (ساخت User).
7. `Auth::login($user)` و Redirect به `/confirmed` (انتخاب دسته‌های موردعلاقه).

**نکته مهم:** مرحله 6 کد را **با موبایل یا Session** مطابقت نمی‌دهد. فقط با `md5(code)`. PLAUSIBLE: کسی که کدی را حدس بزند که برای کاربر دیگری ساخته شده، با آن Login می‌شود. `security.md`. اجرا نشده.

## جریان ورود

1. `validateLogin`: `mobile`, `password`.
2. `hasTooManyLoginAttempts` → Lockout.
3. `attemptLogin`:
   - `status == 0` → logout + پیام «مسدود».
   - `confirm == 0` → کد جدید، SMS، logout، Redirect به تأیید موبایل.
   - وگرنه `sendLoginResponse` (regenerate، destroy Session قبلی، ذخیره `session_id`).
4. شکست: JSON 422 با پیام. **`incrementLoginAttempts` بعد از `return` قرار دارد و اجرا نمی‌شود.** پس Throttle Login عملاً شمارنده ندارد.

## جریان فراموشی رمز

1. `POST /password/mobile`: `mobile` باید در `users` باشد.
2. کد 5 رقمی (`rand(10000, 99999)`) به‌صورت **متن ساده** در `password_reset_mobiles.code` + `token = bcrypt(code)`. SMS قالب 31279. انقضا 15 دقیقه.
3. `POST /password/mobile/confirm`: `check_hash` با `hashed` (در Session) و `exists:password_reset_mobiles`. بررسی انقضا با `expired_at`.
4. Session `pass_reset_mobile = id`.
5. `POST /password/reset`: `id` باید با `sid` (`check_hash`) همخوان باشد. `password ≥ 6`. رمز کاربر با `mobile` رکورد به‌روز می‌شود.

UNKNOWN: Hash شدن `password` در `update` (Mutator در `UserMutator`).
UNKNOWN: Session Binding کامل در مرحله 3 (کد از Request خوانده می‌شود).

## Middleware

| Middleware | رفتار |
|---|---|
| `auth` (`CheckIfAuthenticated`) | مهمان → Redirect به صفحه اصلی با پیام. `confirm==0` → SMS و Redirect به تأیید موبایل. |
| `confirmed` | همان بررسی `confirm==0` برای وارد شده‌ها. روی تقریباً همه Routeهای Front. |
| `guest` | Redirect اگر وارد شده. |
| `front.login` | خالی. |

## حساب‌های Seeder

`DatabaseSeeder` یک کاربر `role_id=1` با رمز ضعیف و ثابت می‌سازد. مقدار در Source. در این سند ننوشتیم. `security.md`.

## Impersonation

Admin می‌تواند با `loginAs` (`UserController`) و `Admin/ProductController@show` به‌عنوان هر Shop Owner وارد شود (`Auth::login`). فقط `user->id == 1` محافظت شده است. لاگ این کار پیدا نشد (Activity log جدا بررسی نشد).
