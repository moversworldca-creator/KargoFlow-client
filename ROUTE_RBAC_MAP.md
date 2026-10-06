# Route RBAC Map

## Public
- `/login` — authentication entrypoint
- `/portal/estimate` — public customer estimate portal
- `/portal/inventory` — public customer inventory portal
- `/portal/contracts/:token` — public contract portal
- `/intake` — public lead intake
- `/__playwright__/estimate-view` — test harness route
- `/__playwright__/document-templates` — test harness route

## Authenticated Only
- `/profile` — self-service account page

## RBAC Enforced
- `/dashboard` — `crm.dashboard.view`
- `/leads*` — lead permissions
- `/sales*` — lead or opportunity permissions depending on the route; detail pages and sales operations now require opportunity-specific permissions where applicable
- `/payments` — payment gateway permission
- `/jobs*` — booking permissions
- `/analytics` — `crm.reports.view`
- `/fleet` — `crm.settings.fleet.view`
- `/communication` — `crm.communications.history.view`
- `/marketing` — `crm.communications.email.send`
- `/automation*` — automation and template permissions
- `/crm/activities` — lead/opportunity/communications permissions
- `/settings*` — settings permissions

## Notes
- The major app routes are wrapped in frontend `PermissionRoute` checks.
- Backend APIs behind those pages also enforce their own permissions.
- Opportunity routes now use `crm.opportunities.view`, `crm.opportunities.create`, and `crm.opportunities.edit` instead of reusing pipeline permissions.
- Public portal routes remain intentionally open and are protected by token/signature or provider verification where applicable.
