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
| `open-decisions.md` | تصمیم‌های لازم از کاربر، خطاهای مستندات Phase 0، Feature جدید احتمالی |

## برچسب مبنا

`EVIDENCE-BASED` از کد Legacy. `USER-DECISION` تصمیم صریح کاربر (در این Phase صفر). `OPEN` نیاز به تصمیم کاربر. `UNKNOWN` شاهد ناکافی.

## Final Scope Summary

| مورد | تعداد |
|---|---|
| Total Features | 97 |
| KEEP | 21 |
| REDESIGN | 33 |
| DEFER | 18 |
| REMOVE | 10 |
| MIGRATION-ONLY | 1 |
| UNKNOWN | 14 |
| Featureهای MVP | 42 |
| Featureهای Post-MVP | 24 |
| Featureهای Optional | 4 |
| Featureهای با اولویت Unknown | 16 |
| Domain در MVP | 23 |
| Domain در Post-MVP | 7 |
| Domain در Future | 0 |
| Domain در Unknown | 5 |
| Open Decisions (نیاز به کاربر) | 15 |
| Migration Decisions (ردیف طبقه‌بندی گروه + داده مشخص) | 22 + 18 |
| Critical Security Decisions | 8 (از 29) |
| Business Rules | 45 |
| Legacy Bug ≠ Rule | 21 |
| Contradictions | 16: 5 evidence، 6 business، 5 open |
| Unknowns | 38: 10 resolved، 6 still unknown، 10 not relevant، 7 user decision، 5 production investigation |
