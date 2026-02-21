# Nabd Syria - Master Product/Engineering Plan

## 1) Target
- Build a high-trust medical directory that is fast in emergencies, easy to manage, and resilient with growing traffic/data.
- Keep current stack stable while introducing production-grade architecture incrementally.

## 2) Product Pillars
- Trust: verified records, update ownership, and visible freshness.
- Emergency-first UX: fastest path to nearest critical options.
- Data quality: automatic warnings for missing/weak records.
- Governance: role-based access + full audit history.
- Scale: predictable performance with larger datasets.

## 3) Proposed Architecture (Incremental)
- Frontend: current static web app + Capacitor Android.
- Backend: Supabase Postgres + Realtime + Edge Functions.
- Caching: localStorage for instant render + server truth on sync.
- Observability: event metrics (search, call click, map click, emergency mode usage).

## 4) Data Model Evolution (Recommended)
- `places`:
  - add `verified` boolean default false
  - add `verified_by` text nullable
  - add `verified_at` timestamptz nullable
  - add `updated_by` text nullable
  - add `updated_at` timestamptz default now()
  - add `quality_score` smallint default 0
- `specialties`:
  - `id`, `name`, `is_active`
- `place_specialties`:
  - `place_id`, `specialty_id` (many-to-many)
- `audit_logs`:
  - actor, action, table_name, row_id, payload, created_at

## 5) Execution Phases
- Phase A (done now):
  - specialty filtering
  - compact card fixes
  - emergency mode quick workflow
  - data quality indicator (read-side)
- Phase B:
  - DB migrations for trust + audit + specialty normalization
  - admin verification workflow
  - stronger permissions by role/action
- Phase C:
  - analytics dashboard
  - SLA alerts for stale/unverified records
  - SEO/social share meta enhancement
- Phase D:
  - global-ready localization
  - performance optimization for large datasets
  - progressive web/offline intelligence

## 6) UI Standards
- Card content: strict line clamps, no overflow, no placeholder noise.
- Dark mode: every badge/button/state has explicit dark token.
- Emergency mode: one tap, minimal cognitive load, call-first actions.
- Admin: validation first, then save; warnings visible before submit.

## 7) Quality Gates
- No change ships without:
  - syntax check
  - mobile + desktop visual check
  - data integrity check (duplicate and missing critical fields)
  - fallback behavior when network/db unavailable

## 8) Rollback Strategy
- Git restore tag and backup branch before major batches.
- Keep migrations reversible (`down` scripts for schema changes).
- Feature flags for high-risk features.

