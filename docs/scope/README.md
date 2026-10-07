# Phase 0.5 — Scope & Feature Decisions

این پوشه WHAT را تعیین می‌کند. HOW (معماری، Schema، Technology) در Phase 2 به بعد است. هیچ کد تغییر نکرده. `docs/legacy` تغییر نکرده.

## فهرست سندها

| سند | محتوا |
|---|---|
| `feature-decisions.md` | Feature Decision Matrix (97 ردیف) |
| `business-rule-decisions.md` | جدول «Legacy Bug ≠ Business Rule» و Business Rules |
| `state-machine-decisions.md` | State Machine هر Domain |
| `domain-scope.md` | وضعیت 35 Domain و Scope هر حوزه |
| `mvp-scope.md` | زنجیره MVP و Gapها |
| `post-mvp-scope.md` | Post-MVP، Future، Optional، Unknown |
| `feature-dependencies.md` | گراف وابستگی |
| `data-migration-scope.md` | طبقه‌بندی داده Migration |
| `security-decisions.md` | تصمیم‌های امنیتی |
| `legacy-review.md` | بازبینی 16 Contradiction و 38 Unknown |
| `open-decisions.md` | تصمیم‌های نهایی Phase 1.5 و Phase 2 (DR-01..DR-05)، تصمیم‌های باز، خطاهای مستندات Phase 0، Feature جدید احتمالی، آمادگی Phase 2 |
| `phase-3-scope-lock.md` | تصمیم‌های Owner قبل از Phase 3 (DB-01، PAY-01..PAY-07، U11)، موارد OPEN، محدوده Phase 3، Transaction، تعارض‌های اسناد |

## برچسب مبنا

`EVIDENCE-BASED` از کد Legacy. `USER-DECISION` تصمیم صریح کاربر (4 ردیف: F18، F36، F39، F45 — Phase 1.5). `OPEN` نیاز به تصمیم کاربر. `UNKNOWN` شاهد ناکافی.

## Final Scope Summary

| مورد | تعداد |
|---|---|
| Total Features | 97 |
| KEEP | 21 |
| REDESIGN | 35 |
| DEFER | 17 |
| REMOVE | 9 |
| MIGRATION-ONLY | 1 |
| UNKNOWN | 14 |
| Featureهای MVP | 44 |
| Featureهای Post-MVP | 23 |
| Featureهای Optional | 4 |
| Featureهای با اولویت Unknown | 16 |
| Domain در MVP | 24 |
| Domain در Post-MVP | 7 |
| Domain در Future | 0 |
| Domain در Unknown | 4 |
| Open Decisions (کل 15) | 12 باز، 3 DECIDED (OD-01، OD-07، OD-11) |
| Migration Decisions (ردیف طبقه‌بندی گروه + داده مشخص) | 22 + 18 |
| Critical Security Decisions | 8 (از 29) |
| Business Rules | 45 |
| Legacy Bug ≠ Rule | 21 |
| Contradictions | 16: 5 evidence، 8 business، 3 open |
| Unknowns | 38: 10 resolved، 6 still unknown، 10 not relevant، 7 user decision، 5 production investigation |
