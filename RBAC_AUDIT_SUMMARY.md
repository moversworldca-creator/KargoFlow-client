# RBAC Audit Summary

Date: 2026-08-01

## Outcome

- The permission registry is complete for the current application code.
- Live scans found `0` missing permission references.
- Source code is canonical-only; legacy aliases were removed from backend and frontend source.
- Public routes are limited to expected surfaces such as login, inbound webhooks, and signed portal links.

## Registry

- Canonical permissions in backend registry: `66`
- Opportunity RBAC is now separated from lead RBAC via:
  - `crm.opportunities.view`
  - `crm.opportunities.create`
  - `crm.opportunities.edit`
- Canonical permissions are grouped across:
  - `admin`
  - `audit`
  - `bookings`
  - `communications`
  - `dashboard`
  - `estimates`
  - `files`
  - `leads`
  - `payments`
  - `pipeline`
  - `reports`
  - `settings`
  - `tasks`

### Settings Split Additions

- `crm.settings.fleet.view`
- `crm.settings.fleet.manage`
- `crm.settings.catalog.view`
- `crm.settings.catalog.manage`
- `crm.settings.portal_templates.view`
- `crm.settings.portal_templates.manage`
- `crm.settings.customer_portals.view`
- `crm.settings.customer_portals.manage`
- `crm.settings.communication_templates.view`
- `crm.settings.communication_templates.manage`
- `crm.settings.discounts.view`
- `crm.settings.discounts.manage`

## Hardening Completed

- Removed legacy alias handling from backend registry.
- Removed frontend alias fallbacks.
- Normalized seed scripts to canonical permission names.
- Added RBAC to sensitive payment endpoints.
- Split opportunity access from pipeline access in sales endpoints.
- Updated tests to canonical permission names.
- Removed stale `frontend/dist` build artifacts.

## Public Surfaces

### Intentional public

- `backend/apps/accounts/api/views.py` — login
- `backend/apps/leads/api/views.py` — inbound lead intake
- `backend/apps/estimates/api/views.py` — public estimate portal flows
- `backend/apps/documents/api/views.py` — public contract portal flows
- `backend/apps/payments/api/endpoints/webhooks.py` — provider webhooks
- `backend/apps/integrations/api/inbound_views.py` — inbound email/SMS callbacks

### Token or signature protected

- Public estimate approval and PDF download flows
- Public contract signing and PDF download flows
- Public payment checkout and portal download flows
- Payment webhook handlers

## Notes

- The only remaining legacy permission strings are in `.git/logs`, which are history metadata.
- No active source files rely on legacy permission aliases.
