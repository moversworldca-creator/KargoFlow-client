/**
 * Fallback draft estimate factory and cache.
 * When backend estimate endpoints are unmounted or unavailable, this provides
 * a client-side mock/draft estimate so users can create, configure, and inspect
 * estimates without disruption.
 */

const DRAFT_ESTIMATE_STORAGE_PREFIX = 'crm_draft_estimate_';

export const buildDefaultDraftEstimate = (opportunityId, overrides = {}) => {
  const oppId = opportunityId || 'draft';
  const now = new Date().toISOString();
  return {
    id: `draft-${oppId}`,
    opportunity: Number(oppId) || oppId,
    opportunity_id: Number(oppId) || oppId,
    estimate_number: `EST-${oppId}-1`,
    status: 'draft',
    method: 'manual',
    pricing_mode: 'hourly',
    crew_size: 2,
    truck_count: 1,
    estimated_hours: '0',
    travel_time_hours: '0',
    hourly_rate: '0',
    flat_rate_amount: '0',
    rooms_summary: '',
    special_items_notes: '',
    packing_notes: '',
    access_notes: '',
    has_stairs: false,
    has_elevator: false,
    long_carry_distance: '0',
    minimum_charge_override: '0',
    markup_amount: '0',
    sales_tax_pct: '0',
    tax_exempt: false,
    discount_amount: '0',
    charges: [],
    subtotal: '0.00',
    tax_amount: '0.00',
    grand_total: '0.00',
    deposit_required: '0.00',
    created_at: now,
    updated_at: now,
    ...overrides,
  };
};

export const getStoredDraftEstimate = (opportunityId) => {
  if (!opportunityId) return null;
  try {
    const raw = sessionStorage.getItem(`${DRAFT_ESTIMATE_STORAGE_PREFIX}${opportunityId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setStoredDraftEstimate = (opportunityId, estimate) => {
  if (!opportunityId || !estimate) return;
  try {
    sessionStorage.setItem(`${DRAFT_ESTIMATE_STORAGE_PREFIX}${opportunityId}`, JSON.stringify(estimate));
  } catch {
    // SessionStorage may be restricted; ignore
  }
};
