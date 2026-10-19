import { describe, it, expect } from 'vitest';
import { canAll, canAny, getAllowedNavItems, NAV_ITEMS, PERMISSIONS } from './registry';

describe('Permissions Registry normalization tests', () => {
  it('should grant access if the user has the canonical dot-notation permission', () => {
    const ctx = {
      permissions: ['crm.leads.view', 'crm.settings.users.view'],
      isSuperuser: false,
      isSystemAdmin: false,
    };
    expect(canAll(['crm.leads.view'], ctx)).toBe(true);
    expect(canAll(['crm.settings.users.view'], ctx)).toBe(true);
    expect(canAny(['crm.leads.view', 'crm.leads.create'], ctx)).toBe(true);
  });

  it('should grant access if the user has the normalized underscore-notation permission but frontend checks canonical', () => {
    const ctx = {
      permissions: ['crm_leads.view', 'crm_settings_users.view'],
      isSuperuser: false,
      isSystemAdmin: false,
    };
    expect(canAll(['crm.leads.view'], ctx)).toBe(true);
    expect(canAll(['crm.settings.users.view'], ctx)).toBe(true);
    expect(canAny(['crm.leads.view', 'crm.leads.create'], ctx)).toBe(true);
  });

  it('should deny access if the user does not have the permission in either format', () => {
    const ctx = {
      permissions: ['crm_leads.view'],
      isSuperuser: false,
      isSystemAdmin: false,
    };
    expect(canAll(['crm.leads.create'], ctx)).toBe(false);
    expect(canAll(['crm.settings.users.view'], ctx)).toBe(false);
  });

  it('should not expand view into create/edit/delete lead permissions', () => {
    const ctx = {
      permissions: ['crm.leads.view'],
      isSuperuser: false,
      isSystemAdmin: false,
    };

    expect(canAll(['crm.leads.view'], ctx)).toBe(true);
    expect(canAll(['crm.leads.create'], ctx)).toBe(false);
    expect(canAll(['crm.leads.edit'], ctx)).toBe(false);
    expect(canAll(['crm.leads.assign'], ctx)).toBe(false);
    expect(canAll(['crm.leads.convert'], ctx)).toBe(false);
  });

  it('never lets an admin flag or invented "crm.admin" stand in for a permission', () => {
    // The tenant session carries no superuser/system-admin flag; only the
    // permission list the backend returns decides what the UI offers.
    expect(canAll(['users.view'], { permissions: [], isSuperuser: true })).toBe(false);
    expect(canAll(['users.view'], { permissions: [], isSystemAdmin: true })).toBe(false);
    expect(canAll(['users.view'], { permissions: ['crm.admin'] })).toBe(false);
  });

  it('matches backend keys exactly: manage never implies create, view never implies manage', () => {
    const ctx = { permissions: ['rbac_roles.manage', 'employees.view', 'branches.manage'] };
    expect(canAll(['rbac_roles.manage'], ctx)).toBe(true);
    expect(canAll(['rbac_roles.create'], ctx)).toBe(false);
    expect(canAll(['employees.manage'], ctx)).toBe(false);
    expect(canAll(['branches.create'], ctx)).toBe(false);
    expect(canAll([PERMISSIONS.ROLE_CREATE], ctx)).toBe(false);
    expect(canAll([PERMISSIONS.ROLE_EDIT], ctx)).toBe(true);
  });

  it('maps user and role administration constants to backend keys', () => {
    expect(PERMISSIONS.USER_VIEW).toBe('users.view');
    expect(PERMISSIONS.USER_CREATE).toBe('users.manage');
    expect(PERMISSIONS.EMPLOYEE_VIEW).toBe('employees.view');
    expect(PERMISSIONS.EMPLOYEE_MANAGE).toBe('employees.manage');
    expect(PERMISSIONS.USER_ASSIGN_ROLE).toBe('users.assign_role');
    expect(PERMISSIONS.ROLE_VIEW).toBe('rbac_roles.view');
    expect(PERMISSIONS.ROLE_CREATE).toBe('rbac_roles.create');
    expect(PERMISSIONS.ROLE_EDIT).toBe('rbac_roles.manage');
    expect(PERMISSIONS.AUDIT_VIEW).toBe('audit_logs.view');
  });

  it('uses the backend communication permission for email and SMS actions', () => {
    const ctx = {
      permissions: ['communications.conversations.send'],
      isSuperuser: false,
      isSystemAdmin: false,
    };
    expect(canAll([PERMISSIONS.COMMUNICATIONS_EMAIL_SEND], ctx)).toBe(true);
    expect(canAll([PERMISSIONS.COMMUNICATIONS_SMS_SEND], ctx)).toBe(true);
  });

  it('should not show the Leads nav item when the user only has lead actions', () => {
    const ctx = {
      permissions: ['crm_leads.create', 'crm_leads.edit', 'crm_leads.assign'],
      isSuperuser: false,
      isSystemAdmin: false,
    };

    const nav = getAllowedNavItems(NAV_ITEMS, ctx).map((item) => item.path);
    expect(nav).not.toContain('/leads');
  });
});
