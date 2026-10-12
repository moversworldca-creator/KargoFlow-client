import { describe, it, expect, vi } from 'vitest';
import { extractRolePerms } from './RolesPermissions';
import { SETTINGS_PERMISSIONS_LIST, FEATURE_PERMISSION_CATALOG } from '../../../shared/permissions/registry';

describe('RolesPermissions component and helpers', () => {
  it('extracts permissions from permissions_details array of objects', () => {
    const role = {
      id: 1,
      name: 'Estimator',
      permissions_details: [
        { id: 1, codename: 'leads.view' },
        { id: 2, codename: 'opportunities.view' },
      ],
    };
    expect(extractRolePerms(role)).toEqual(['leads.view', 'opportunities.view']);
  });

  it('extracts permissions from permissions array of strings', () => {
    const role = {
      id: 2,
      name: 'Manager',
      permissions: ['crew_photos.view', 'rbac_roles.view'],
    };
    expect(extractRolePerms(role)).toEqual(['crew_photos.view', 'rbac_roles.view']);
  });

  it('handles null/undefined gracefully', () => {
    expect(extractRolePerms(null)).toEqual([]);
    expect(extractRolePerms({})).toEqual([]);
  });

  it('covers all 97 permissions without duplicates', () => {
    expect(SETTINGS_PERMISSIONS_LIST).toHaveLength(97);
    const unique = new Set(SETTINGS_PERMISSIONS_LIST);
    expect(unique.size).toBe(97);
  });

  it('assigns every of the 97 permissions to a coherent logical module', () => {
    const validModules = new Set([
      'Audit Logs',
      'Branches',
      'Catalog',
      'Companies',
      'Compensation',
      'Crew',
      'Customers',
      'Employees',
      'Entitlements',
      'Estimates',
      'Leads',
      'Opportunities',
      'Payments',
      'Pipeline',
      'Reports',
      'Roles & Permissions',
      'Settings',
      'System & Admin',
      'Tasks',
      'Team & Users',
      'Template Library',
      'CRM',
    ]);

    for (const code of SETTINGS_PERMISSIONS_LIST) {
      const def = FEATURE_PERMISSION_CATALOG[code];
      expect(def).toBeDefined();
      expect(validModules.has(def.module), `Module "${def.module}" for "${code}" should be in validModules`).toBe(true);
    }
  });

  it('automatically grants all 97 permissions to Admin and system roles', () => {
    const adminRole = { id: 1, name: 'Admin', is_system_role: true, permissions: [] };
    const perms = extractRolePerms(adminRole);
    expect(perms).toHaveLength(97);
    for (const p of SETTINGS_PERMISSIONS_LIST) {
      expect(perms).toContain(p);
    }

    const wildcardRole = { id: 2, name: 'Custom Role', permissions: ['*'] };
    const wildcardPerms = extractRolePerms(wildcardRole);
    expect(wildcardPerms.length).toBeGreaterThanOrEqual(97);
    for (const p of SETTINGS_PERMISSIONS_LIST) {
      expect(wildcardPerms).toContain(p);
    }
  });
});
