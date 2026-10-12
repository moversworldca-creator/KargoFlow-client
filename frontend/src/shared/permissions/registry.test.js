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

  it('should contain all 97 settings permissions in SETTINGS_PERMISSIONS_LIST', async () => {
    const { SETTINGS_PERMISSIONS_LIST, FEATURE_PERMISSION_CATALOG } = await import('./registry');
    expect(SETTINGS_PERMISSIONS_LIST).toHaveLength(97);
    
    // Check every single permission exists in the catalog with module and label
    for (const perm of SETTINGS_PERMISSIONS_LIST) {
      const entry = FEATURE_PERMISSION_CATALOG[perm];
      expect(entry, `Permission "${perm}" should exist in FEATURE_PERMISSION_CATALOG`).toBeDefined();
      expect(entry.label, `Permission "${perm}" should have a non-empty label`).toBeTruthy();
      expect(entry.module, `Permission "${perm}" should have a non-empty module`).toBeTruthy();
      expect(entry.action, `Permission "${perm}" should have a valid action category`).toBeTruthy();
    }
  });

  it('should grant access via wildcard * permission', async () => {
    const { canAll, canAny } = await import('./registry');
    const wildcardCtx = {
      permissions: ['*'],
      isSuperuser: false,
      isSystemAdmin: false,
    };
    expect(canAll(['template_library.create', 'opportunities.book_without_acceptance'], wildcardCtx)).toBe(true);
    expect(canAny(['crew_photos.view'], wildcardCtx)).toBe(true);
  });

  it('should resolve bidirectional permission aliases between canonical and legacy keys', async () => {
    const { canAll } = await import('./registry');
    // User has canonical 'leads.view', checks 'crm.leads.view'
    expect(canAll(['crm.leads.view'], { permissions: ['leads.view'] })).toBe(true);
    // User has legacy 'crm.leads.view', checks canonical 'leads.view'
    expect(canAll(['leads.view'], { permissions: ['crm.leads.view'] })).toBe(true);
    // User has 'rbac_roles.view', checks 'crm.settings.roles.view'
    expect(canAll(['crm.settings.roles.view'], { permissions: ['rbac_roles.view'] })).toBe(true);
  });

  it('should include Settings in allowed nav items for users with settings permissions or admin flags', () => {
    expect(NAV_ITEMS.some((item) => item.path === '/settings')).toBe(true);

    const settingsViewNav = getAllowedNavItems(NAV_ITEMS, { permissions: ['settings.view'] }).map((i) => i.path);
    expect(settingsViewNav).toContain('/settings');

    const rbacRolesNav = getAllowedNavItems(NAV_ITEMS, { permissions: ['rbac_roles.view'] }).map((i) => i.path);
    expect(rbacRolesNav).toContain('/settings');

    const wildcardNav = getAllowedNavItems(NAV_ITEMS, { permissions: ['*'] }).map((i) => i.path);
    expect(wildcardNav).toContain('/settings');

    const adminNav = getAllowedNavItems(NAV_ITEMS, { permissions: [], isCompanyAdmin: true }).map((i) => i.path);
    expect(adminNav).toContain('/settings');
  });
});
