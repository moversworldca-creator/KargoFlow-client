// Stable codes accepted by the Pricing Engine (KargoFlow_Domain.tenant.pricing.enums).
// Used only to offer valid choices; the backend validates every value again.
export const PRICING_METHODS = ['hourly', 'flat', 'weight', 'volume', 'distance', 'hybrid'];
export const TARIFF_STATES = ['active', 'inactive', 'archived'];
export const REVISION_STATES = ['draft', 'validated', 'pending_approval', 'approved', 'scheduled', 'published', 'retired', 'rejected'];
export const METHOD_HELP = {
  hourly: 'Best for local moves priced by crew and truck hours.',
  flat: 'One fixed price for a defined service.',
  weight: 'Common for long-distance moves, priced by pounds or CWT.',
  volume: 'Priced by cubic feet or cubic meters of goods.',
  distance: 'Priced by miles or kilometers, bands or zones.',
  hybrid: 'Combines several pricing methods (for example labor plus line-haul by weight).',
};
export const RULE_TYPES = ['labor', 'transportation', 'travel', 'packing', 'material', 'storage', 'fuel', 'minimum',
  'surcharge', 'discount', 'valuation', 'accessorial', 'tax', 'deposit', 'custom'];
export const CALCULATION_TYPES = ['flat', 'hourly', 'quantity', 'distance', 'weight', 'volume', 'percentage', 'formula'];
export const ALLOWED_PHASES = {
  labor: ['base', 'quantity_rate'], transportation: ['base', 'quantity_rate'], travel: ['base', 'quantity_rate'],
  packing: ['base', 'quantity_rate', 'accessorial'], material: ['base', 'quantity_rate', 'accessorial'],
  storage: ['base', 'quantity_rate'], fuel: ['quantity_rate', 'surcharge'],
  valuation: ['base', 'quantity_rate', 'accessorial', 'surcharge'], accessorial: ['quantity_rate', 'accessorial'],
  surcharge: ['surcharge'], custom: ['base', 'quantity_rate', 'accessorial', 'surcharge'], minimum: ['minimum'],
  discount: ['discount_credit'], tax: ['tax_classification'], deposit: ['deposit'],
};
export const PRICING_MODELS_BY_TYPE = {
  hourly: ['', 'crew_size', 'crew_skill', 'hybrid', 'hourly', 'drive_time'],
  distance: ['', 'per_mile', 'per_km', 'distance_band', 'zone_to_zone', 'matrix', 'mileage', 'round_trip_mileage', 'zone', 'radius', 'distance_based'],
  weight: ['', 'per_lb', 'per_kg', 'per_cwt', 'weight_band', 'breakpoint', 'minimum_weight'],
  volume: ['', 'per_cu_ft', 'per_cubic_meter', 'volume_band', 'volume_matrix', 'minimum_volume'],
  quantity: ['', 'item_catalog', 'per_room', 'per_item', 'package'],
  flat: ['', 'flat', 'minimum_charge', 'rule_based', 'service_specific', 'customer_specific'],
  percentage: ['', 'percentage', 'indexed', 'declared_value', 'coverage_tier'],
  formula: [''],
};
export const PERCENTAGE_BASES = ['labor', 'transportation', 'packing', 'materials', 'selected_categories',
  'pre_discount_subtotal', 'post_discount_subtotal', 'taxable_subtotal'];
export const CHARGE_SCOPES = ['job', 'estimate'];
export const ALLOCATION_METHODS = ['estimate_only', 'equal', 'job_subtotal', 'labor_subtotal', 'weight', 'volume', 'manual_authorized'];
export const TAX_CLASSIFICATIONS = ['taxable', 'non_taxable', 'conditionally_taxable'];
export const STACKING_BEHAVIORS = ['stackable', 'exclusive', 'first_match', 'highest_value', 'lowest_value', 'replace_previous'];
export const COST_CATEGORIES = ['', 'crew', 'truck', 'fuel', 'materials', 'equipment', 'third_party', 'other_direct'];
export const DIMENSION_TYPES = ['number', 'text', 'date', 'boolean', 'crew_size', 'crew_skill', 'truck_count', 'distance',
  'weight', 'volume', 'service_type', 'zone'];
export const NUMERIC_DIMENSION_TYPES = ['number', 'crew_size', 'truck_count', 'distance', 'weight', 'volume'];
export const RANGE_DIMENSION_TYPES = ['number', 'distance', 'weight', 'volume'];
export const RESULT_TYPES = ['money', 'number', 'percentage', 'text'];
export const CONSTRAINT_TYPES = ['fixed_price', 'not_to_exceed', 'minimum', 'range'];
export const OVERRIDE_TYPES = ['rate_override', 'quantity_override', 'line_total_override', 'fixed_charge_override', 'charge_exclusion'];
export const RECALCULATION_POLICIES = ['preserve', 'requires_review', 'remove_with_explicit_confirmation'];
export const ROUNDING_METHODS = ['half_up', 'half_even', 'up', 'down'];
export const EFFECTIVE_DATE_BASES = ['job_service_date', 'estimate_created_date', 'estimate_sent_date', 'booking_date',
  'contract_date', 'explicit'];
export const EXTERNAL_FAILURE_POLICIES = ['fail_closed', 'use_approved_cache', 'require_manual_input'];
export const MARGIN_ACTIONS = ['warn', 'require_approval', 'block'];
export const REVISION_WORKFLOWS = ['full', 'simplified'];
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const UNITS = {
  distance: ['mile', 'kilometer'], weight: ['lb', 'kg', 'cwt'], volume: ['cu_ft', 'cubic_meter'],
};
// Variables a formula or condition may read (KargoFlow_Domain.tenant.pricing.inputs.STATIC_VARIABLES).
export const FORMULA_VARIABLES = ['labor_hours', 'billable_hours', 'travel_hours', 'drive_time_hours', 'crew_size',
  'truck_count', 'distance_miles', 'distance_km', 'weight_lb', 'weight_kg', 'weight_cwt', 'volume_cu_ft',
  'volume_cubic_meter', 'stops', 'extra_stops', 'declared_value', 'deductible', 'coverage_tier', 'is_weekend',
  'weekday', 'month', 'day_of_month', 'service_type', 'move_size', 'job_count', 'subtotal', 'pre_discount_subtotal',
  'post_discount_subtotal', 'taxable_subtotal', 'materials.<item>', 'items.<item>', 'packing.<item>',
  'accessorials.<key>', 'flags.<flag>', 'skills.<code>', 'external.<key>'];
export const FORMULA_FUNCTIONS = ['min(a, b)', 'max(a, b)', 'round(x, 2)', 'ceil(x)', 'floor(x)', 'abs(x)',
  'clamp(x, lo, hi)', 'if(cond, a, b)', 'lookup("table", "dimension", value)', 'convert(x, "minute", "hour")'];
