# RBAC Module Coverage

## Dashboard

- `crm.dashboard.view`
- Main enforcement: `backend/apps/sales/api/endpoints/dashboard.py`

## Payments

- `crm.payments.view`
- Main enforcement: `backend/apps/sales/api/endpoints/dashboard.py`

## Leads

- `crm.leads.view`
- `crm.leads.create`
- `crm.leads.edit`
- `crm.leads.assign`
- `crm.leads.change_branch`
- `crm.leads.convert`
- `crm.leads.import`
- `crm.leads.export`
- `crm.leads.delete`
- Main enforcement: `backend/apps/leads/api/views.py`, `backend/apps/leads/api/serializers.py`

## Pipeline

- `crm.pipeline.view`
- `crm.pipeline.change_stage`
- `crm.pipeline.override_rules`

## Opportunities

- `crm.opportunities.view`
- `crm.opportunities.create`
- `crm.opportunities.edit`
- Main enforcement: `backend/apps/sales/api/endpoints/opportunities.py`, `backend/apps/sales/api/endpoints/timeline.py`, `backend/apps/sales/api/endpoints/history.py`, `backend/apps/sales/api/endpoints/movers.py`

## Pipeline

- `crm.pipeline.view`
- `crm.pipeline.change_stage`
- `crm.pipeline.override_rules`
- Main enforcement: legacy compatibility only; core opportunity access now uses the opportunity permissions above.

## Communications

- `crm.communications.email.send`
- `crm.communications.sms.send`
- `crm.communications.call.log`
- `crm.communications.history.view`
- Main enforcement: `backend/apps/sales/api/endpoints/activities.py`, `backend/apps/leads/api/views.py`

## Tasks

- `crm.tasks.view`
- `crm.tasks.create`
- `crm.tasks.edit`
- `crm.tasks.complete_own`
- `crm.tasks.complete_team`
- Main enforcement: `backend/apps/sales/api/endpoints/activities.py`

## Estimates

- `crm.estimates.view`
- `crm.estimates.create`
- `crm.estimates.edit`
- `crm.estimates.override_price`
- `crm.estimates.apply_discount`
- `crm.estimates.approve_discount`
- Main enforcement: `backend/apps/estimates/api/views.py`, `backend/apps/leads/api/serializers.py`

## Bookings

- `crm.bookings.view`
- `crm.bookings.update`
- `crm.bookings.assign_crew`
- `crm.bookings.assign_truck`
- `crm.bookings.confirm`
- `crm.bookings.confirm_without_deposit`
- Main enforcement: `backend/apps/jobs/api/views.py`, `backend/apps/accounting/api/views.py`

## Reports

- `crm.reports.view`
- Main enforcement: `backend/apps/sales/api/endpoints/dashboard.py`

## Audit

- `crm.audit.view`
- Main enforcement: `backend/apps/core/api/views.py`

## Settings

- `crm.settings.status_codes.view`
- `crm.settings.status_codes.manage`
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
- Main enforcement: `backend/apps/core/api/views.py`, `backend/apps/accounts/api/views.py`, `backend/apps/automations/api/views.py`, `backend/apps/integrations/api/endpoints/*`, `backend/apps/documents/api/views.py`, `backend/apps/leads/api/views.py`

## Files

- `crm.files.view`
- `crm.files.create`
- `crm.files.delete`
- `crm.files.share`
- Main enforcement: `backend/apps/files/api/views.py`

## Admin

- `crm.admin`
- `crm.change_move_size`
- Main enforcement: `backend/apps/leads/api/serializers.py`, `backend/apps/leads/api/views.py`, `backend/apps/accounts/services/authorization_service.py`
