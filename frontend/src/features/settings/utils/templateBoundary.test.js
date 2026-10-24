import { describe, expect, it } from 'vitest';
import { getTenantTemplateKind, getTenantTemplateMode, getTenantTemplateRoute } from './templateBoundary';
import { isBuilderDocumentMode, isTemplateForMode } from '../../../../../shared/template-builder/core/templateBoundary';

describe('Tenant template boundaries', () => {
  it.each([
    [{ kind: 'invoice', subtype: 'deposit' }, 'invoice', 'invoice'],
    [{ kind: 'estimate_portal', subtype: 'hourly' }, 'estimate_portal', 'estimate'],
    [{ kind: 'document', subtype: 'cc_authorization' }, 'document', 'cc_auth'],
    [{ kind: 'document', subtype: 'bol' }, 'document', 'bol'],
    [{ template_type: 'invoice', scope_type: 'invoice' }, 'invoice', 'invoice'],
    [{ source_type: 'estimate', template_type: 'moving' }, 'estimate_portal', 'estimate'],
    [{ channel: 'sms' }, 'communication', 'sms'],
  ])('classifies native and legacy records consistently', (template, kind, mode) => {
    expect(getTenantTemplateKind(template)).toBe(kind);
    expect(getTenantTemplateMode(template)).toBe(mode);
    expect(getTenantTemplateRoute('/documents/document-templates', kind, 7)).toMatch(/\/7\/builder$/);
  });
  it('rejects unsupported kinds and channels', () => {
    expect(() => getTenantTemplateKind({ kind: 'unknown' })).toThrow();
    expect(() => getTenantTemplateMode({ kind: 'communication', subtype: 'contract' })).toThrow();
  });
  it('blocks saved templates and imports from a different mode or without type metadata', () => {
    expect(isBuilderDocumentMode('contract')).toBe(true);
    expect(isBuilderDocumentMode('invoice')).toBe(true);
    expect(isBuilderDocumentMode('email')).toBe(false);
    expect(isBuilderDocumentMode('sms')).toBe(false);
    expect(isTemplateForMode({ mode: 'estimate_portal' }, 'estimate')).toBe(true);
    expect(isTemplateForMode({ mode: 'invoice' }, 'invoice')).toBe(true);
    expect(isTemplateForMode({ mode: 'estimate' }, 'invoice')).toBe(false);
    expect(isTemplateForMode({ mode: 'contract' }, 'invoice')).toBe(false);
    expect(isTemplateForMode({}, 'invoice')).toBe(false);
  });
});
