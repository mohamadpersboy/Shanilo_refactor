# File / Media System

Source: `app/Traits/AttachmentTrait.php`, `config/filesystems.php`, `config/uploader.php`، `Front/Specific/Profile/ProductController`, `Front/Specific/MessageController`, `DownloadController`.

## ذخیره‌سازی فعلی

| نوع | محل | روش |
|---|---|---|
| تصویر Model (Product، Shop، User، Article، ...) | `files/uploads/<md5(table)>/<md5(id)>/<fileName>` نسبت به ریشه وب | `AttachmentTrait::createImage` |
| فایل پیوست پیام | Disk `public`، مسیر `message/...` (`storage/app/public/message`) | `$request->file('file')->store('message','public')` |
| فایل‌های Admin (FineUploader) | بر اساس `config/uploader.php` | `optimus/fineuploader-server` (جزئیات بررسی نشد) |
| S3 | Disk `s3` تعریف شده. استفاده پیدا نشد. | `config/filesystems.php` |

ثابت‌ها (`define` داخل Trait): `PATH_TO_UPLOAD='files/uploads/'`, `PATH_FOR_DEFAULT`, `SITE_NAME='shanilo'`.

## Metadata

جدول `attachments` (Polymorphic `attachmentable`): `title`, `slug` (`main`, `gallery`, `attachment`, ...), `mime`, `file_name`, `size`, `size_format` (KB/MB)، `group_name`.
مسیر کامل از `md5(table)` و `md5(id)` و `file_name` ساخته می‌شود. ID Model در URL فایل Hash شده است.

## نام‌گذاری

`shanilo-<4 کاراکتر تصادفی>-<نام اصلی با حذف کاراکتر غیر [a-zA-Z0-9.] → '0'>`.
اگر فایل موجود باشد، پیشوند عدد تصادفی.

## پردازش

- Intervention Image: `Image::make($file)`.
- Crop اختیاری (`cropper`: `x,y,w,h` از Client).
- Watermark اختیاری (`assets/front/_images/logo/watermark.png`، یک‌سوم عرض).
- ذخیره با کیفیت پیش‌فرض 90.
- Thumbnail: لیست `'عرض/ارتفاع'`؛ `0` یعنی نسبت حفظ شود. اندازه‌ها از ثابت `THUMBNAIL_SIZES` هر Controller.
- تغییر فرمت: تصویر با همان مسیر ذخیره می‌شود (بدون تبدیل صریح فرمت).

## Validation

- Product: `pic` اجباری، `mimes:jpg,jpeg,png`، حداکثر 5120 KB.
- Gallery: `pic` اجباری، `mimes:jpeg,jpg,png,gif`.
- `product_sid` با `check_hash` اعتبارسنجی می‌شود.
- پیام: فایل `file` بدون Validation (در `store` پیدا نشد). PLAUSIBLE.

## Delete / Replace

- حذف Model: `bootAttachmentTrait` همه Attachmentها را `delete()` می‌کند. حذف فایل فیزیکی در Model `Attachment` است (بررسی نشد). UNKNOWN.
- جایگزینی: حذف و آپلود دوباره (Gallery: `destroyGalleryImage`).
- Admin: `DELETE /delete-file` (`DeleteController@deleteFile`).

## Permission / Public-Private

- فایل‌های `files/uploads/**`: عمومی (داخل مسیر وب).
- فایل پیام: Disk `public`. Route `GET /download?path=` بدون Auth هر فایل Disk `public` را برمی‌گرداند. فایل‌های خصوصی پیام عملاً عمومی‌اند، اگر مسیرشان معلوم شود. `security.md`.
- ویدیو/صوت: `createVideo/createMusic` در Trait هست و استفاده نمی‌شود (طبق `CLAUDE.md`). `ffmpeg` حذف شده.

## Migration Consideration

- فایل‌ها روی دیسک سرور هستند. DB فقط `file_name` و Metadata دارد.
- مسیر را از `md5(table)/md5(id)` می‌توان بازسازی کرد. جدول‌ها باید با نام واقعی مطابق باشند.
- Cloudinary در Phase 5 است. این سند فقط inventory است.

## UNKNOWN

- محتوای واقعی `files/` روی سرور Production. در Repository نیست.
- `Attachment::delete` و Model `SiteContentImage`.
