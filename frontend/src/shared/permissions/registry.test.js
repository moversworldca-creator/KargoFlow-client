import { describe, it, expect } from 'vitest';
import { canAll, canAny, getAllowedNavItems, NAV_ITEMS } from './registry';

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

  it('should grant access to superusers and system admins automatically', () => {
    const superuserCtx = { permissions: [], isSuperuser: true };
    const systemAdminCtx = { permissions: [], isSystemAdmin: true };
    expect(canAll(['crm.settings.users.view'], superuserCtx)).toBe(true);
    expect(canAll(['crm.settings.users.view'], systemAdminCtx)).toBe(true);
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
