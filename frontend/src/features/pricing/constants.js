// Codes the tariff configuration accepts (KargoFlow_Domain/tenant/tariffs/config.py).
// Used only to offer valid choices; the backend validates every value again.
export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const WEEKDAY_LABELS = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
export const DEFAULT_PERIOD = 'default';

export const LABOR_PRICING_TYPES = [['hourly', 'Hourly'], ['flat_plus_hourly', 'Flat Rate Plus Hourly']];
export const PACKING_PRICING_TYPES = [...LABOR_PRICING_TYPES, ['cwt', 'By hundredweight (CWT)'], ['per_container', 'Pack By Container']];

export const BINDING_TYPES = [['not_set', 'Not set (new opportunities are Non-Binding)'], ['binding', 'Binding'], ['non_binding', 'Non-Binding']];

export const DISTANCE_RATE_TYPES = [
  ['weight_cwt', 'Weight — per 100 lbs'], ['volume_cuft', 'Volume — per cubic foot'],
  ['flat_weight', 'Flat by Weight'], ['flat_volume', 'Flat by Volume'],
];

// FEE-01..08: the shared fee pricing methods.
export const FEE_METHODS = [
  ['drive_time', 'Drive Time'], ['flat', 'Flat Fee'], ['flat_two_factor', 'Flat Fee Two Factor'],
  ['mileage_table', 'Mileage Table'], ['per_item_cwt', 'Per Item (CWT)'], ['per_item_flat', 'Per Item (Flat)'],
  ['per_mile', 'Per Mile'], ['percentage', 'Percentage'],
];
export const ROUTE_BASES = [['portion', 'Portion (selected legs)'], ['radius', 'Radius (office to furthest point)']];
export const ROUTE_PORTIONS = [
  ['office_to_origin', 'Office → origin'], ['origin_to_destination', 'Origin → destination (incl. stops)'],
  ['destination_to_office', 'Destination → office'],
];
export const FEE_FACTORS = [
  ['hours', 'Hours'], ['stops', 'Stops'], ['articles', 'Articles'], ['stairs', 'Stairs'], ['long_carry', 'Long carry'],
  ['elevators', 'Elevators'], ['trucks', 'Trucks'], ['crew', 'Crew members'], ['items', 'Items'],
];
export const PERCENTAGE_BASES = [
  ['hourly_labor', 'Hourly Labor'], ['transportation', 'Transportation'], ['packing', 'Packing'],
  ['job_subtotal', 'Job Subtotal (excluding taxes / tips)'], ['storage_in_transit', 'Storage in Transit'],
];
export const MILEAGE_TABLE_UNITS = [['currency', 'Dollar amount'], ['minutes', 'Minutes at the hourly crew rate']];
export const PER_MILE_BILLING = [['overage', 'Overage miles (beyond included)'], ['actual', 'Actual miles (all miles)']];

// The tariff screens that hold fees, with the options SmartMoving documents for each.
export const FEE_SECTIONS = {
  trip_travel: { title: 'Trip and Travel Fees', options: [['bill_per_truck', 'Bill per truck'], ['editable_on_job', 'Name and description editable on the job']] },
  fuel_surcharges: { title: 'Fuel Surcharge', options: [['editable_on_job', 'Name and description editable on the job']] },
  shuttle_fees: { title: 'Shuttle Fees', options: [['editable_on_job', 'Name and description editable on the job']] },
  storage_in_transit: { title: 'Storage In Transit', options: [['editable_on_job', 'Name and description editable on the job']] },
  additional_services: { title: 'Additional Services', options: [['pay_to_crew', 'Pay to Crew'], ['pay_to_salespeople', 'Pay to Salespeople'], ['editable_on_job', 'Name and description editable on the job']] },
};
export const BUILT_IN_FEES = [['double_drive_time', 'Double Drive Time'], ['include_travel_time_in_estimated_time', 'Include Travel Time in Estimated Time']];

export const VALUATION_TYPES = [
  ['released_value', 'Released Value Protection'], ['full_value', 'Full Value'], ['actual_cash_value', 'Actual Cash Value'],
  ['replacement_cost', 'Replacement Cost'], ['other', 'Other'],
];
export const VALUATION_PRICING = [['released_value', 'Released Value (rate per pound / article)'], ['flat_matrix', 'Flat Rate (declared value × deductible)'], ['cost_per_value', 'Cost Per Value']];
export const COST_PER_VALUE_UNITS = [['1', 'per $1'], ['100', 'per $100'], ['1000', 'per $1,000']];
export const VALUATION_ROUNDING = [['none', 'No rounding'], ['up_to_dollar', 'Round up to the dollar'], ['nearest_dollar', 'Round to the nearest dollar']];

export const RULE_MODES = [['always', 'ALWAYS'], ['any', 'If ANY conditions match'], ['all', 'If ALL conditions match']];
export const DEFAULT_KINDS = [['hourly_moving', 'Hourly moving'], ['distance', 'Distance'], ['packing', 'Packing'], ['valuation', 'Valuation']];
export const NTE_METHODS = [['percentage', 'Percentage above the estimate'], ['amount', 'Fixed amount']];
export const CONDITION_FIELDS = [
  ['opportunity_type', 'Opportunity type', 'ids'], ['branch', 'Branch', 'ids'], ['period', 'Pricing period', 'keys'],
  ['weekday', 'Day of the week', 'weekdays'], ['origin_state', 'Origin state', 'texts'],
  ['destination_state', 'Destination state', 'texts'], ['distance_miles', 'Distance (miles)', 'number'],
  ['weight_lbs', 'Weight (lbs)', 'number'], ['volume_cuft', 'Volume (cu ft)', 'number'],
];
export const ABILITY_UNITS = [['cuft_per_hour', 'Cubic feet per hour'], ['lbs_per_hour', 'Pounds per hour']];

export const STORAGE_METHODS = {
  sit: [['cwt', 'By CWT'], ['container', 'By Container'], ['flat', 'By Flat Rate']],
  permanent: [['cwt', 'By CWT'], ['container', 'By Container'], ['flat', 'By Flat Rate']],
  handling: [['cwt', 'By CWT'], ['container', 'By Container'], ['hour', 'By Hour']],
  valuation: [['cwt', 'By CWT'], ['flat', 'By Flat Rate']],
};
