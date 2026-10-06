import { describe, it, expect } from 'vitest';
import { getInventoryPhotoRequestSpecs } from './EstimateView';

describe('getInventoryPhotoRequestSpecs', () => {
  it('loads inventory photos from all inventory category variants across all linked targets', () => {
    const specs = getInventoryPhotoRequestSpecs({
      estimateId: 11,
      opportunityId: 22,
      leadId: 33,
    });

    expect(specs).toEqual([
      { target_type: 'estimates.estimate', target_id: '11', category: 'descriptive-inventory' },
      { target_type: 'estimates.estimate', target_id: '11', category: 'inventory-photos' },
      { target_type: 'estimates.estimate', target_id: '11', category: 'inventory' },
      { target_type: 'sales.opportunity', target_id: '22', category: 'descriptive-inventory' },
      { target_type: 'sales.opportunity', target_id: '22', category: 'inventory-photos' },
      { target_type: 'sales.opportunity', target_id: '22', category: 'inventory' },
      { target_type: 'leads.lead', target_id: '33', category: 'descriptive-inventory' },
      { target_type: 'leads.lead', target_id: '33', category: 'inventory-photos' },
      { target_type: 'leads.lead', target_id: '33', category: 'inventory' },
    ]);
  });

  it('omits missing targets', () => {
    expect(getInventoryPhotoRequestSpecs({ opportunityId: 22 })).toEqual([
      { target_type: 'sales.opportunity', target_id: '22', category: 'descriptive-inventory' },
      { target_type: 'sales.opportunity', target_id: '22', category: 'inventory-photos' },
      { target_type: 'sales.opportunity', target_id: '22', category: 'inventory' },
    ]);
  });
});
