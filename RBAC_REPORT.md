# RBAC Report

Date: 2026-08-01

## Summary

The RBAC system is now canonical-only in source code.

- Backend permission registry contains 66 canonical permissions.
- Backend permission registry also includes opportunity-specific permissions:
  - `crm.opportunities.view`
  - `crm.opportunities.create`
  - `crm.opportunities.edit`
- Legacy alias handling has been removed from backend and frontend source.
- Source scans no longer show stale legacy permission strings.
- Remaining legacy hits are limited to `.git/logs`, which are not part of the working tree.

## Canonical Permission Groups

### CRM

- `crm.dashboard.view`
- `crm.payments.view`
- `crm.leads.view`
- `crm.leads.create`
- `crm.leads.edit`
- `crm.leads.assign`
- `crm.leads.change_branch`
- `crm.leads.convert`
- `crm.leads.import`
- `crm.leads.export`
- `crm.leads.delete`
- `crm.pipeline.view`
- `crm.pipeline.change_stage`
- `crm.pipeline.override_rules`
- `crm.opportunities.view`
- `crm.opportunities.create`
- `crm.opportunities.edit`
- `crm.communications.email.send`
- `crm.communications.sms.send`
- `crm.communications.call.log`
- `crm.communications.history.view`
- `crm.tasks.view`
- `crm.tasks.create`
- `crm.tasks.edit`
- `crm.tasks.complete_own`
- `crm.tasks.complete_team`
- `crm.estimates.view`
- `crm.estimates.create`
- `crm.estimates.edit`
- `crm.estimates.override_price`
- `crm.estimates.apply_discount`
- `crm.estimates.approve_discount`
- `crm.bookings.view`
- `crm.bookings.update`
- `crm.bookings.assign_crew`
- `crm.bookings.assign_truck`
- `crm.bookings.confirm`
- `crm.bookings.confirm_without_deposit`
- `crm.reports.view`
- `crm.audit.view`
- `crm.settings.status_codes.view`
- `crm.settings.status_codes.manage`

### Workspace Settings

- `crm.admin`
- `crm.settings.company.view`
- `crm.settings.company.manage`
- `crm.settings.branches.view`
- `crm.settings.branches.manage`
- `crm.settings.users.view`
- `crm.settings.users.manage`
- `crm.settings.roles.view`
- `crm.settings.roles.manage`
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
- `crm.settings.automations.view`
- `crm.settings.automations.manage`
- `crm.settings.integrations.view`
- `crm.settings.integrations.manage`
- `crm.settings.documents.view`
- `crm.settings.documents.manage`
- `crm.settings.audit.view`

### Files

- `crm.files.view`
- `crm.files.create`
- `crm.files.delete`
- `crm.files.share`

## Cleanup Completed

- Removed backend legacy registry aliases and compatibility resolution.
- Removed frontend legacy alias fallbacks.
- Normalized seed scripts to canonical permission names.
- Updated tests to use canonical permission names.
- Removed stale `frontend/dist` artifacts from the repo.

## Notes

- The repo still contains `.git/logs` entries with historical legacy strings.
- Those are git metadata only and do not affect runtime behavior.
