import { describe, expect, it } from 'vitest';
import {
  getRecordDetailPath,
  getRecordEstimateTabPath,
  getRecordDetailTabPath,
  getEstimateTabFromSegment,
  getLegacyRecordEstimateTabPath,
  getRecordTabLabelFromSegment,
  getSalesListTabFromSegment,
  getSalesListTabPath,
} from './recordRoutes';

describe('recordRoutes', () => {
  it('builds canonical record detail and workspace tab routes', () => {
    expect(getRecordDetailPath('lead', { sales_number: '00030', id: 30 })).toBe('/crm/lead/30');
    expect(getRecordDetailPath('opportunity', { sales_number: '00017', id: 17 })).toBe('/crm/opportunity/17');
    expect(getRecordDetailTabPath('opportunity', { id: 17 }, 'Sales')).toBe('/crm/opportunity/17/sales');
    expect(getRecordDetailTabPath('opportunity', { id: 17 }, 'Estimate')).toBe('/crm/opportunity/17/estimate');
    expect(getRecordEstimateTabPath('opportunity', { id: 17 }, 'route')).toBe('/crm/opportunity/17/estimate/route');
    expect(getLegacyRecordEstimateTabPath('opportunity', 17, 'payments')).toBe('/sales/17/estimate/payments');
    expect(getRecordTabLabelFromSegment('estimate')).toBe('Estimate');
    expect(getRecordTabLabelFromSegment('files-and-photos')).toBe('Files & Photos');
  });

  it('builds shareable lead table tab routes', () => {
    expect(getSalesListTabPath('dashboard')).toBe('/leads/table/dashboard');
    expect(getSalesListTabPath('leads')).toBe('/leads/table/pipeline');
    expect(getSalesListTabPath('follow-up')).toBe('/leads/table/follow-up');
    expect(getSalesListTabFromSegment('pipeline')).toBe('leads');
    expect(getSalesListTabFromSegment('tasks')).toBe('follow-up');
  });

  it('resolves estimate page tab route aliases', () => {
    expect(getEstimateTabFromSegment('charges')).toBe('charges');
    expect(getEstimateTabFromSegment('pricing')).toBe('charges');
    expect(getEstimateTabFromSegment('route-logistics')).toBe('route');
    expect(getEstimateTabFromSegment('items')).toBe('inventory');
    expect(getEstimateTabFromSegment('docs')).toBe('documents');
    expect(getEstimateTabFromSegment('payment')).toBe('payments');
  });
});
