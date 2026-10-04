# Relationship Map

Source: متدهای relation در Modelها و Migrationها. مواردی که فقط در Trait/Relation (`UserRelation`) هستند، از روی استفاده در کد استنباط شدند و علامت `(use)` دارند.

## User

```
User
 ├── hasMany   shops            (use: $user->shops)
 ├── hasMany   orders           (use)
 ├── hasMany   addresses        (use)
 ├── hasMany   bankCarts        (use)
 ├── hasMany   articles         (use)
 ├── hasMany   announcements    (use)
 ├── belongsToMany favoriteCategories (ProductCategory)  (use: sync)
 ├── belongsToMany blockings    (User، self-reference)   (use: attach/detach)
 ├── morphMany following / followers  (Follower)         (use)
 ├── hasMany   requestCheckoutCredit                     (use)
 └── belongsToMany roles / permissions (ACL)
```

## Shop

```
Shop
 ├── belongsTo   user
 ├── belongsTo   city
 ├── hasMany     products          (فقط visible)
 ├── hasOne      wallet            (One-to-One، ساخت در created)
 ├── hasMany     orders
 ├── belongsToMany cities          (pivot city_shop + price)
 ├── belongsToMany sendTypes       (send_type_shop)
 ├── belongsToMany productCategories
 ├── morphMany   comments
 └── morphMany   followers / notifyLists
```

## Catalog

```
Product
 ├── belongsTo   shop (withTrashed)
 ├── belongsTo   brand
 ├── hasMany     details (ProductDetail)
 ├── hasMany     properties (ProductProperty → details ProductPropertyDetail)
 ├── belongsToMany productCategories           (Many-to-Many)
 ├── belongsToMany productCategoryTechnicalSpecifications (pivot value)
 ├── morphMany   comments
 └── morphMany   attachments (تصاویر)

ProductDetail
 ├── belongsTo product (withTrashed), color
 ├── hasOne   specialSuggestion, specialSell
 ├── morphMany notifyLists
 └── hasMany  userSuggestions

ProductCategory  ── Self-reference (Baum nested set، سطح 1..3)
```

## Cart → Order

```
Cart ── hasMany CartDetail (به ازای هر Shop)
CartDetail ── hasMany CartDetailProduct ── belongsTo ProductDetail
CartDetail ── belongsTo shop, address, sendType, payType
        │  transmit()  (کپی + حذف CartDetail)
        ▼
Order ── belongsTo shop, user, address, sendType
      ├── hasMany   details (OrderDetail → ProductDetail)
      ├── morphOne  payment            (Polymorphic، One-to-One)
      └── hasMany   walletTransactions
```

## Wallet

```
Wallet ── belongsTo shop
       ├── hasMany walletTransactions ── belongsTo order
       └── hasMany checkouts ── belongsTo bank_cart
```

## Promotion

```
SpecialSuggestion ── belongsTo productDetail ── hasOne firstPageSpecialSuggestion ── morphOne payment
SpecialSell       ── belongsTo productDetail ── hasOne firstPageSpecialSell       ── morphOne payment
FirstPage*        ── belongsTo plan
```

## Social و Messaging

```
Comment ── morphTo commentable (Shop | Product)
        ├── belongsTo user
        ├── belongsTo parent   (Self-reference)
        └── hasMany  answers
Message ── belongsTo sender (User)، receiver (User)، shop
        ├── belongsTo parent   (Self-reference، Thread)
        └── hasMany  children
Follower ── morphTo followable (User | Shop)
Favorite / Comparison ── hasMany details ── belongsTo ProductDetail   (کلید: Cookie)
```

## انواع

- One-to-One: Shop↔Wallet، Order↔Payment، ProductDetail↔SpecialSell.
- One-to-Many: بیشتر روابط.
- Many-to-Many: Product↔Category، Shop↔City، Shop↔SendType، User↔Role، User↔User (block).
- Polymorphic: Payment.payable، Comment.commentable، Follower.followable، NotifyList.notifiable، Attachment، ViolationReport (`HasReports`).
- Self-reference: ProductCategory، Comment، Message، User (block).

## FK در Database

بیشتر جدول‌ها FK با `cascade` دارند (حدود 82 مورد). جدول‌های بدون FK: `credit_log`, `requests_checkout_credit`, `msg` و جزئیات.
