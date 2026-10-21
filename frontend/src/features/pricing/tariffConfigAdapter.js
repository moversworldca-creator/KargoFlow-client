/**
 * tariffConfigAdapter.js
 * Bridges the backend Pricing Catalog & Revision persistence model with the
 * SmartMoving-parity Tariff Configuration domain model.
 */

export const DEFAULT_PERIOD = {
  id: 'default',
  name: 'Default (All Dates)',
  is_default: true,
  is_active: true,
  priority: 1,
  date_type: 'all',
  start_date: '',
  end_date: '',
};

export const DEFAULT_WEEKDAY_MINIMUMS = {
  mon: '3',
  tue: '3',
  wed: '3',
  thu: '3',
  fri: '3',
  sat: '4',
  sun: '4',
};

export const WEEKDAY_KEYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

export const TRUCK_OPTIONS = [
  { key: 'labor_only', label: 'Labor Only (0 Trucks)' },
  { key: '1_truck', label: '1 Truck' },
  { key: '2_trucks', label: '2 Trucks' },
  { key: '3_trucks', label: '3 Trucks' },
];

export const CREW_SIZES = [1, 2, 3, 4, 5, 6];

export const DEFAULT_BULKY_CATEGORIES = [
  'Pianos & Organs',
  'Safes & Vaults',
  'Pool Tables',
  'Exercise & Fitness Equipment',
  'Appliances',
  'Other Oversized Articles',
];

export const DEFAULT_BULKY_ITEMS = [
  { id: 'b1', name: 'Upright Piano', category: 'Pianos & Organs', default_price: '150.00' },
  { id: 'b2', name: 'Grand Piano', category: 'Pianos & Organs', default_price: '250.00' },
  { id: 'b3', name: 'Gun Safe (<300 lbs)', category: 'Safes & Vaults', default_price: '125.00' },
  { id: 'b4', name: 'Commercial Safe (300+ lbs)', category: 'Safes & Vaults', default_price: '250.00' },
  { id: 'b5', name: 'Standard Slate Pool Table', category: 'Pool Tables', default_price: '200.00' },
  { id: 'b6', name: 'Treadmill / Elliptical', category: 'Exercise & Fitness Equipment', default_price: '75.00' },
];

export const DEFAULT_MATERIALS = [
  {
    id: 'mat_box_sm',
    name: 'Small Box (1.5 cu ft)',
    description: 'Book / heavy item box',
    unit_price: '3.50',
    cost: '1.20',
    pack_time_minutes: '5',
    unpack_time_minutes: '3',
    editable_rate: true,
    is_container: true,
    cp_code: 'SM1',
    pbo_code: 'SM0',
    container_volume_cuft: '1.5',
    container_weight_lbs: '40',
  },
  {
    id: 'mat_box_med',
    name: 'Medium Box (3.0 cu ft)',
    description: 'Standard household goods box',
    unit_price: '4.50',
    cost: '1.80',
    pack_time_minutes: '8',
    unpack_time_minutes: '4',
    editable_rate: true,
    is_container: true,
    cp_code: 'MD1',
    pbo_code: 'MD0',
    container_volume_cuft: '3.0',
    container_weight_lbs: '50',
  },
  {
    id: 'mat_box_lg',
    name: 'Large Box (4.5 cu ft)',
    description: 'Linens, bedding, lightweight items',
    unit_price: '5.50',
    cost: '2.40',
    pack_time_minutes: '10',
    unpack_time_minutes: '5',
    editable_rate: true,
    is_container: true,
    cp_code: 'LG1',
    pbo_code: 'LG0',
    container_volume_cuft: '4.5',
    container_weight_lbs: '60',
  },
  {
    id: 'mat_wardrobe',
    name: 'Wardrobe Box with Bar',
    description: 'Hanging clothing container',
    unit_price: '18.00',
    cost: '7.50',
    pack_time_minutes: '6',
    unpack_time_minutes: '3',
    editable_rate: true,
    is_container: true,
    cp_code: 'WR1',
    pbo_code: 'WR0',
    container_volume_cuft: '12.0',
    container_weight_lbs: '80',
  },
  {
    id: 'mat_tape',
    name: 'Packing Tape (Roll)',
    description: 'Standard acrylic packing tape',
    unit_price: '4.00',
    cost: '1.50',
    pack_time_minutes: '0',
    unpack_time_minutes: '0',
    editable_rate: true,
    is_container: false,
    cp_code: '',
    pbo_code: '',
    container_volume_cuft: '',
    container_weight_lbs: '',
  },
];

export const INITIAL_TARIFF_CONFIG = {
  common: {
    volume_to_weight_ratio: '7.00',
    applies_to_opportunity_types: 'all', // "all" | "local" | "intrastate" | "interstate"
    minimum_booking_amount: '150.00',
    default_binding_type: 'not_set', // "binding" | "non_binding" | "not_set"
  },
  periods: [DEFAULT_PERIOD],
  hourly_moving: {
    is_enabled: true,
    pricing_model: 'hourly', // "hourly" | "flat_plus_hourly"
    flat_base_hours: '3',
    flat_base_amount: '450.00',
    vary_by_trucks: true,
    minimum_hours: { ...DEFAULT_WEEKDAY_MINIMUMS },
    additional_mover_rate: '45.00',
    additional_truck_rate: '50.00',
    rates: {
      default: {
        '1_truck': {
          '2': { mon: '150.00', tue: '150.00', wed: '150.00', thu: '150.00', fri: '165.00', sat: '180.00', sun: '180.00' },
          '3': { mon: '195.00', tue: '195.00', wed: '195.00', thu: '195.00', fri: '215.00', sat: '235.00', sun: '235.00' },
          '4': { mon: '240.00', tue: '240.00', wed: '240.00', thu: '240.00', fri: '265.00', sat: '290.00', sun: '290.00' },
        },
      },
    },
  },
  materials: DEFAULT_MATERIALS,
  packing_rates: {
    is_enabled: true,
    pricing_model: 'hourly', // "hourly" | "flat_plus_hourly" | "cwt" | "per_container"
    flat_base_hours: '2',
    flat_base_amount: '200.00',
    minimum_hours: { mon: '2', tue: '2', wed: '2', thu: '2', fri: '2', sat: '3', sun: '3' },
    rates: {
      default: {
        '2': { mon: '120.00', tue: '120.00', wed: '120.00', thu: '120.00', fri: '130.00', sat: '140.00', sun: '140.00' },
        '3': { mon: '160.00', tue: '160.00', wed: '160.00', thu: '160.00', fri: '175.00', sat: '190.00', sun: '190.00' },
      },
    },
    cwt_options: [
      { id: 'cwt_full', name: 'Full Household Pack', rate_per_cwt: '32.00' },
      { id: 'cwt_partial', name: 'Partial / Breakables Pack', rate_per_cwt: '22.00' },
      { id: 'cwt_room', name: 'Single Room Pack', rate_per_cwt: '15.00' },
    ],
    container_rates: {
      default: {
        mat_box_sm: { item_rate: '3.50', pack_rate: '4.50', unpack_rate: '2.50' },
        mat_box_med: { item_rate: '4.50', pack_rate: '6.50', unpack_rate: '3.50' },
        mat_box_lg: { item_rate: '5.50', pack_rate: '8.50', unpack_rate: '4.50' },
        mat_wardrobe: { item_rate: '18.00', pack_rate: '7.00', unpack_rate: '3.50' },
      },
    },
  },
  distance_rates: [
    {
      id: 'dist_interstate',
      name: 'Standard Distance Schedule',
      rate_type: 'weight_cwt', // "weight_cwt" | "volume_cuft" | "flat_weight" | "flat_volume"
      auto_scale_pct: '0',
      enable_breakpoints: true,
      overage_per_cwt: '2.50',
      overage_per_mile: '1.75',
      mileage_bands: ['0 - 50', '51 - 100', '101 - 200', '201 - 500', '501+'],
      weight_bands: ['1,000 lbs', '2,500 lbs', '5,000 lbs', '8,000 lbs', '10,000+ lbs'],
      matrix: {
        '0': { '0': '25.00', '1': '22.00', '2': '19.50', '3': '17.00', '4': '15.00' },
        '1': { '0': '32.00', '1': '28.00', '2': '25.00', '3': '22.00', '4': '19.50' },
        '2': { '0': '45.00', '1': '40.00', '2': '36.00', '3': '32.00', '4': '28.00' },
        '3': { '0': '75.00', '1': '68.00', '2': '62.00', '3': '56.00', '4': '50.00' },
        '4': { '0': '110.00', '1': '98.00', '2': '88.00', '3': '80.00', '4': '72.00' },
      },
    },
  ],
  trip_and_travel: [
    {
      id: 'tt_standard',
      name: 'Travel Charge',
      calculation_method: 'drive_time', // "drive_time" | "flat_fee" | "mileage_table" | "per_mile"
      route_basis: 'radius', // "radius" | "portion"
      mileage_unit: 'minutes', // "minutes" | "currency"
      included_miles: '15',
      minimum_cost: '50.00',
      rate_per_mile: '2.50',
      actual_vs_overage: 'overage',
      bill_per_truck: true,
      editable_on_job: true,
    },
  ],
  fuel_surcharges: [
    {
      id: 'fuel_default',
      name: 'Fuel Surcharge',
      calculation_method: 'percentage', // "percentage" | "per_mile" | "flat_fee"
      percentage: '6.5',
      percentage_base: 'hourly_labor', // "hourly_labor" | "job_subtotal" | "transportation" | "packing" | "sit"
      editable_on_job: false,
    },
  ],
  shuttle_fees: [
    {
      id: 'shuttle_default',
      name: 'Shuttle Service Fee',
      calculation_method: 'flat_fee', // "flat_fee" | "per_item_flat" | "per_item_cwt"
      amount: '200.00',
      first_item_amount: '',
      additional_item_amount: '',
      editable_on_job: true,
    },
  ],
  additional_services: [
    {
      id: 'srv_stairs',
      name: 'Flight of Stairs (3+ flights)',
      calculation_method: 'per_item_flat',
      amount: '50.00',
      pay_to_crew: true,
      pay_to_salespeople: false,
      editable_on_job: true,
    },
    {
      id: 'srv_long_carry',
      name: 'Long Carry (>75 ft)',
      calculation_method: 'flat_fee',
      amount: '75.00',
      pay_to_crew: true,
      pay_to_salespeople: false,
      editable_on_job: true,
    },
  ],
  bulky_items: {
    categories: DEFAULT_BULKY_CATEGORIES,
    items: DEFAULT_BULKY_ITEMS,
  },
  storage_in_transit: [
    {
      id: 'sit_standard',
      name: 'SIT Storage Fee',
      calculation_method: 'per_item_cwt', // "cwt" | "per_container" | "flat_fee"
      rate: '2.75',
      billing_cycle: 'monthly',
      editable_on_job: true,
    },
  ],
  valuation: {
    rvp_rate_per_lb: '0.60',
    rvp_customer_price: '0.00',
    options: [
      {
        id: 'val_fvp',
        name: 'Full Value Protection ($0 Deductible)',
        valuation_type: 'full_value',
        pricing_type: 'cost_per_value',
        cost_per_hundred: '1.25',
        min_charge: '75.00',
        default_value_per_lb: '6.00',
        max_declared_value: '200000.00',
        description: 'Full Value Protection covers the repair, replacement, or current cash settlement of items.',
      },
      {
        id: 'val_fvp_ded',
        name: 'Full Value Protection ($250 Deductible)',
        valuation_type: 'full_value',
        pricing_type: 'cost_per_value',
        cost_per_hundred: '0.95',
        min_charge: '50.00',
        default_value_per_lb: '6.00',
        max_declared_value: '200000.00',
        description: 'Full Value Protection with customer $250 deductible per occurrence.',
      },
    ],
  },
  not_to_exceed: [
    {
      id: 'nte_standard',
      name: 'Standard NTE Cap',
      is_enabled: true,
      condition_mode: 'always',
      method: 'percentage', // "amount" | "percentage"
      value: '10.0',
      rounding: '10',
    },
  ],
  pricing_method_defaults: [
    {
      id: 'pmd_local',
      name: 'Local Moves -> Hourly',
      is_enabled: true,
      service_type: 'moving',
      condition_mode: 'always',
      default_method: 'hourly',
    },
  ],
  auto_pricing_rules: [
    {
      id: 'apr_ddt',
      name: 'California Double Drive Time',
      is_enabled: true,
      condition_mode: 'all',
      fees_to_apply: ['double_drive_time'],
    },
  ],
  auto_pricing_engine: {
    max_hours_per_job: '8.0',
    crew_ability_unit: 'cuft_per_hour', // "cuft_per_hour" | "lbs_per_hour"
    crew_ability: {
      '2': '150',
      '3': '225',
      '4': '300',
      '5': '375',
    },
    crew_required_thresholds: [
      { max_volume: 500, min_crew: 2 },
      { max_volume: 1000, min_crew: 3 },
      { max_volume: 1800, min_crew: 4 },
      { max_volume: 3000, min_crew: 5 },
    ],
    trucks_required_thresholds: [
      { max_volume: 1200, trucks: 1 },
      { max_volume: 2400, trucks: 2 },
      { max_volume: 3600, trucks: 3 },
    ],
    auto_add_resources: true,
    additional_mover_rate: '45.00',
    additional_truck_rate: '50.00',
  },
};

/**
 * Normalizes raw revision configuration or initializes it from defaults & existing revision content.
 */
export function extractTariffConfig(revision, tariff) {
  const rawConfig = revision?.configuration || {};

  // Merge with defaults
  const config = {
    common: {
      ...INITIAL_TARIFF_CONFIG.common,
      ...(rawConfig.common || {}),
      name: tariff?.name || '',
      description: tariff?.description || '',
      branch_id: tariff?.branch_id || null,
      branch_ids: Array.isArray(tariff?.branch_ids) ? tariff.branch_ids : [],
    },
    periods: Array.isArray(rawConfig.periods) && rawConfig.periods.length > 0
      ? rawConfig.periods
      : INITIAL_TARIFF_CONFIG.periods,
    hourly_moving: {
      ...INITIAL_TARIFF_CONFIG.hourly_moving,
      ...(rawConfig.hourly_moving || {}),
      minimum_hours: {
        ...INITIAL_TARIFF_CONFIG.hourly_moving.minimum_hours,
        ...(rawConfig.hourly_moving?.minimum_hours || {}),
      },
      rates: rawConfig.hourly_moving?.rates || INITIAL_TARIFF_CONFIG.hourly_moving.rates,
    },
    materials: Array.isArray(rawConfig.materials) && rawConfig.materials.length > 0
      ? rawConfig.materials
      : INITIAL_TARIFF_CONFIG.materials,
    packing_rates: {
      ...INITIAL_TARIFF_CONFIG.packing_rates,
      ...(rawConfig.packing_rates || {}),
      minimum_hours: {
        ...INITIAL_TARIFF_CONFIG.packing_rates.minimum_hours,
        ...(rawConfig.packing_rates?.minimum_hours || {}),
      },
      rates: rawConfig.packing_rates?.rates || INITIAL_TARIFF_CONFIG.packing_rates.rates,
      container_rates: rawConfig.packing_rates?.container_rates || INITIAL_TARIFF_CONFIG.packing_rates.container_rates,
    },
    distance_rates: Array.isArray(rawConfig.distance_rates) && rawConfig.distance_rates.length > 0
      ? rawConfig.distance_rates
      : INITIAL_TARIFF_CONFIG.distance_rates,
    trip_and_travel: Array.isArray(rawConfig.trip_and_travel) && rawConfig.trip_and_travel.length > 0
      ? rawConfig.trip_and_travel
      : INITIAL_TARIFF_CONFIG.trip_and_travel,
    fuel_surcharges: Array.isArray(rawConfig.fuel_surcharges) && rawConfig.fuel_surcharges.length > 0
      ? rawConfig.fuel_surcharges
      : INITIAL_TARIFF_CONFIG.fuel_surcharges,
    shuttle_fees: Array.isArray(rawConfig.shuttle_fees) && rawConfig.shuttle_fees.length > 0
      ? rawConfig.shuttle_fees
      : INITIAL_TARIFF_CONFIG.shuttle_fees,
    additional_services: Array.isArray(rawConfig.additional_services) && rawConfig.additional_services.length > 0
      ? rawConfig.additional_services
      : INITIAL_TARIFF_CONFIG.additional_services,
    bulky_items: {
      categories: Array.isArray(rawConfig.bulky_items?.categories) && rawConfig.bulky_items.categories.length > 0
        ? rawConfig.bulky_items.categories
        : INITIAL_TARIFF_CONFIG.bulky_items.categories,
      items: Array.isArray(rawConfig.bulky_items?.items) && rawConfig.bulky_items.items.length > 0
        ? rawConfig.bulky_items.items
        : INITIAL_TARIFF_CONFIG.bulky_items.items,
    },
    storage_in_transit: Array.isArray(rawConfig.storage_in_transit) && rawConfig.storage_in_transit.length > 0
      ? rawConfig.storage_in_transit
      : INITIAL_TARIFF_CONFIG.storage_in_transit,
    valuation: {
      ...INITIAL_TARIFF_CONFIG.valuation,
      ...(rawConfig.valuation || {}),
      options: Array.isArray(rawConfig.valuation?.options) && rawConfig.valuation.options.length > 0
        ? rawConfig.valuation.options
        : INITIAL_TARIFF_CONFIG.valuation.options,
    },
    not_to_exceed: Array.isArray(rawConfig.not_to_exceed) && rawConfig.not_to_exceed.length > 0
      ? rawConfig.not_to_exceed
      : INITIAL_TARIFF_CONFIG.not_to_exceed,
    pricing_method_defaults: Array.isArray(rawConfig.pricing_method_defaults) && rawConfig.pricing_method_defaults.length > 0
      ? rawConfig.pricing_method_defaults
      : INITIAL_TARIFF_CONFIG.pricing_method_defaults,
    auto_pricing_rules: Array.isArray(rawConfig.auto_pricing_rules) && rawConfig.auto_pricing_rules.length > 0
      ? rawConfig.auto_pricing_rules
      : INITIAL_TARIFF_CONFIG.auto_pricing_rules,
    auto_pricing_engine: {
      ...INITIAL_TARIFF_CONFIG.auto_pricing_engine,
      ...(rawConfig.auto_pricing_engine || {}),
    },
  };

  // If revision content has existing crew rate table cells, ensure they are seeded into hourly_moving.rates
  if (revision?.content?.rate_tables) {
    const crewTable = revision.content.rate_tables.find((t) => t.table_key === 'crew_rates' || t.result_unit === 'per_hour');
    if (crewTable && Array.isArray(crewTable.cells) && crewTable.cells.length > 0) {
      const activePeriod = 'default';
      if (!config.hourly_moving.rates[activePeriod]) config.hourly_moving.rates[activePeriod] = {};

      crewTable.cells.forEach((cell) => {
        const crew = String(cell.coordinates?.crew_size || '2');
        const truck = cell.coordinates?.truck_count ? `${cell.coordinates.truck_count}_truck${cell.coordinates.truck_count > 1 ? 's' : ''}` : '1_truck';
        const rate = String(cell.amount || '');

        if (!config.hourly_moving.rates[activePeriod][truck]) {
          config.hourly_moving.rates[activePeriod][truck] = {};
        }
        if (!config.hourly_moving.rates[activePeriod][truck][crew]) {
          config.hourly_moving.rates[activePeriod][truck][crew] = {};
        }
        WEEKDAY_KEYS.forEach((day) => {
          if (!config.hourly_moving.rates[activePeriod][truck][crew][day.key]) {
            config.hourly_moving.rates[activePeriod][truck][crew][day.key] = rate;
          }
        });
      });
    }
  }

  return config;
}

/**
 * Prepares the payload for saving a revision configuration to the backend.
 */
export function prepareRevisionPayload(config) {
  // Strip transient UI fields before sending to backend
  const { common, ...rest } = config;
  return {
    configuration: {
      common: {
        volume_to_weight_ratio: common.volume_to_weight_ratio,
        applies_to_opportunity_types: common.applies_to_opportunity_types,
        minimum_booking_amount: common.minimum_booking_amount,
        default_binding_type: common.default_binding_type,
      },
      ...rest,
    },
  };
}
