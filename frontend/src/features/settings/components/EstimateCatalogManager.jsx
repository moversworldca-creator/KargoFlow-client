import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2, X, Calculator, ChevronDown, ChevronLeft, Clock, Users, Package, Truck } from 'lucide-react';
import { PrimaryBtn, GhostBtn } from '../../../shared/ui/RedesignAtoms';

import Card from '../../../shared/ui/Card';
import {
  createEstimateCatalogItem,
  deactivateEstimateCatalogItem,
  getBranches,
  getEstimateCatalogItems,
  updateEstimateCatalogItem,
} from '../../../services/api';
import { useAuth } from '../../auth/context/AuthContext';
import { computeChargeTotal, parseDurationToHours } from '../../crm/utils/chargeMath';

const FormInput = ({ label, helperText = '', icon: IconComp, prefix, suffix, as = 'input', children, ...props }) => {
  const Comp = as;
  const isTextArea = as === 'textarea';
  return (
    <div className="space-y-1.5 text-left w-full font-bold">
      {label ? <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">{label}</label> : null}
      <div className={`relative font-bold text-black w-full ${isTextArea ? '' : 'flex rounded-xl border border-border/80 bg-subtle/50 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all overflow-hidden h-11'}`}>
        {isTextArea ? (
          <textarea
            className={`w-full px-4 py-2.5 bg-subtle/50 border border-border/80 rounded-xl text-sm font-bold text-black focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-black/50 min-h-[120px] resize-none ${props.className || ''}`}
            {...props}
          />
        ) : (
          <>
            {prefix && (
              <div className="flex items-center justify-center px-3 bg-slate-100 border-r border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                {prefix}
              </div>
            )}
            {IconComp && (
              <div className="flex items-center justify-center pl-3.5 pr-2 text-black/60 shrink-0">
                <IconComp size={16} />
              </div>
            )}
            <Comp
              className={`w-full px-3 py-2 bg-transparent text-sm font-bold text-black focus:outline-none placeholder:text-black/50 ${as === 'select' ? 'pr-10 appearance-none cursor-pointer' : ''} ${props.type === 'number' ? 'no-spinner' : ''} ${props.className || ''}`}
              {...props}
            >
              {children}
            </Comp>
            {as === 'select' && (
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-black/60">
                <ChevronDown size={16} />
              </div>
            )}
            {suffix && (
              <div className="flex items-center justify-center px-3 bg-slate-100 border-l border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                {suffix}
              </div>
            )}
          </>
        )}
      </div>
      {helperText ? <p className="text-[11px] font-semibold leading-relaxed text-red-600">{helperText}</p> : null}
    </div>
  );
};

const ChargeFormSection = ({ title, description, children }) => (
  <section className="space-y-4 rounded-2xl border border-ink-100 bg-ink-50/30 p-5 text-left w-full">
    <div>
      <h4 className="text-sm font-black text-heading">{title}</h4>
      {description ? <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">{description}</p> : null}
    </div>
    <div className="space-y-4">{children}</div>
  </section>
);

const CHARGE_CATEGORY_OPTIONS = [
  ['moving_labor', 'Moving Labor'],
  ['transportation', 'Transportation'],
  ['materials', 'Materials'],
  ['trip_and_travel', 'Trip and Travel'],
  ['valuation', 'Valuation'],
  ['storage_in_transit', 'Storage in Transit'],
  ['packing', 'Packing'],
  ['additional_services', 'Additional Services'],
  ['fuel_surcharge', 'Fuel Surcharge'],
  ['discount', 'Discount'],
  ['bulky_item', 'Bulky Item'],
  ['shuttle_fees', 'Shuttle Fees'],
  ['other', 'Other'],
];

const CATEGORY_FORM_SCHEMAS = {
  moving_labor: {
    version: 1,
    presets: [
      { key: 'hourly', label: 'Hourly', mode: 'hourly' },
      { key: 'flat_plus_hourly', label: 'Flat Rate Plus Hourly', mode: 'flat_plus_hourly' },
    ],
  },
  transportation: {
    version: 1,
    presets: [
      { key: 'flat_truck', label: 'Flat Per Truck', mode: 'flat_truck' },
      { key: 'mileage', label: 'Mileage', mode: 'mileage' },
    ],
  },
  packing: {
    version: 1,
    presets: [
      { key: 'hourly_labor', label: 'Hourly', mode: 'hourly_labor' },
      { key: 'flat_plus_hourly', label: 'Flat Rate Plus Hourly', mode: 'flat_plus_hourly' },
      { key: 'by_container', label: 'By Container', mode: 'unit' },
      { key: 'by_cwt', label: 'By Cwt', mode: 'weight' },
    ],
  },
  trip_and_travel: {
    version: 1,
    presets: [
      { key: 'per_mile', label: 'Per Mile', mode: 'mileage' },
      { key: 'flat_fee', label: 'Flat Fee', mode: 'flat' },
      { key: 'per_item_flat', label: 'Per Item (Flat)', mode: 'unit' },
      { key: 'per_item_cwt', label: 'Per Item (Cwt)', mode: 'unit' },
      { key: 'percentage', label: 'Percentage', mode: 'percentage' },
    ],
  },
  additional_services: {
    version: 1,
    presets: [
      { key: 'stairs_fee', label: 'Stairs fee (Each flight)', mode: 'unit' },
      { key: 'per_mile_charge', label: 'Per Mile Charge', mode: 'mileage' },
      { key: 'additional_mover', label: 'Additional Mover', mode: 'unit' },
      { key: 'origin_surcharge', label: 'Origin Surcharge', mode: 'flat' },
      { key: 'destination_surcharge', label: 'Destination Surcharge', mode: 'flat' },
    ],
  },
  valuation: {
    version: 1,
    presets: [
      { key: 'rate', label: 'Rate', mode: 'unit' },
    ],
  },
  fuel_surcharge: {
    version: 1,
    presets: [
      { key: 'per_mile', label: 'Per Mile', mode: 'mileage' },
      { key: 'flat_fee', label: 'Flat Fee', mode: 'flat' },
      { key: 'per_item_flat', label: 'Per Item (Flat)', mode: 'unit' },
      { key: 'per_item_cwt', label: 'Per Item (Cwt)', mode: 'unit' },
      { key: 'percentage', label: 'Percentage', mode: 'percentage' },
    ],
  },
};

const LEGACY_CHARGE_CATEGORY_ALIASES = {
  accessorial: 'additional_services',
  fuel: 'fuel_surcharge',
  misc: 'other',
  miscellaneous: 'other',
  truck: 'transportation',
  trip_travel: 'trip_and_travel',
};

const normalizeChargeCategory = (value) => {
  const raw = String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
  if (!raw) return 'other';
  return LEGACY_CHARGE_CATEGORY_ALIASES[raw] || raw;
};

const buildPricingRuleV2 = ({ category, selectedPreset, categoryDefaults, form }) => {
  const normalizedCategory = normalizeChargeCategory(category);
  if (normalizedCategory === 'moving_labor') {
    if (categoryDefaults?.mode === 'hourly') {
      return {
        engine: 'v2',
        category: normalizedCategory,
        mode: 'hourly',
        inputs: ['crew', 'labor_hours', 'hourly_rate'],
        defaults: {
          crew: Number(form.crew || 2),
          labor_hours: Number(form.default_quantity || 0),
          hourly_rate: Number(form.hourly_rate_override || form.default_unit_price || 0),
        },
        display: { rate_label: '{crew} crew x {labor_hours} hrs @ ${hourly_rate}/hr' },
        flags: { taxable: !!form.taxable, commissionable: true },
      };
    }
    if (categoryDefaults?.mode === 'flat_plus_hourly') {
      return {
        engine: 'v2',
        category: normalizedCategory,
        mode: 'flat_plus_hourly',
        inputs: ['crew', 'trucks', 'labor_hours', 'flat_rate', 'included_hours', 'additional_hourly_rate'],
        defaults: {
          crew: Number(form.crew || 2),
          trucks: Number(form.trucks || 1),
          labor_hours: Number(form.default_quantity || 0),
          flat_rate: Number(form.flat_rate || form.default_unit_price || 0),
          included_hours: String(form.included_hours || '0h').replace(/h$/i, ''),
          additional_hourly_rate: Number(form.additional_hourly_rate || 0),
        },
        display: {
          rate_label: '${flat_rate} for first {included_hours}h plus {extra_hours}h @ ${additional_hourly_rate}/hr ({trucks} trucks, {crew} crew)'
        },
        flags: { taxable: !!form.taxable, commissionable: true },
      };
    }
  }

  if (normalizedCategory === 'transportation' && selectedPreset?.mode) {
    if (selectedPreset.mode === 'flat_truck') {
      return {
        engine: 'v2',
        category: normalizedCategory,
        mode: 'flat_truck',
        inputs: ['trucks', 'flat_rate_per_truck'],
        defaults: {
          trucks: Number(form.default_quantity || 0),
          flat_rate_per_truck: Number(form.default_unit_price || 0),
        },
        display: { rate_label: '{trucks} @ ${flat_rate_per_truck}' },
        flags: { taxable: !!form.taxable, commissionable: true },
      };
    }
    if (selectedPreset.mode === 'mileage') {
      return {
        engine: 'v2',
        category: normalizedCategory,
        mode: 'mileage',
        inputs: ['mileage', 'rate_per_mile', 'included_miles', 'minimum_charge'],
        defaults: {
          mileage: Number(form.mileage || 0),
          rate_per_mile: Number(form.cost_per_mile || form.default_unit_price || 0),
          included_miles: Number(form.included_miles || 0),
          minimum_charge: Number(form.min_cost || 0),
        },
        display: { rate_label: '{mileage} miles @ ${rate_per_mile}/mile' },
        flags: { taxable: !!form.taxable, commissionable: true },
      };
    }
  }

  if (normalizedCategory === 'packing' && selectedPreset?.mode) {
    if (selectedPreset.mode === 'hourly_labor') {
      return {
        engine: 'v2',
        category: normalizedCategory,
        mode: 'hourly_labor',
        inputs: ['packers', 'hours', 'hourly_rate'],
        defaults: {
          packers: Number(form.crew || 1),
          hours: Number(form.default_quantity || 0),
          hourly_rate: Number(form.default_unit_price || 0),
        },
        display: { rate_label: '{packers} packers x {hours} hrs @ ${hourly_rate}/hr' },
        flags: { taxable: !!form.taxable, commissionable: true },
      };
    }
    if (selectedPreset.mode === 'flat_plus_hourly') {
      return {
        engine: 'v2',
        category: normalizedCategory,
        mode: 'flat_plus_hourly',
        inputs: ['crew', 'labor_hours', 'flat_rate', 'included_hours', 'additional_hourly_rate'],
        defaults: {
          crew: Number(form.crew || 1),
          labor_hours: Number(form.default_quantity || 0),
          flat_rate: Number(form.flat_rate || 0),
          included_hours: String(form.included_hours || '0h').replace(/h$/i, ''),
          additional_hourly_rate: Number(form.additional_hourly_rate || 0),
        },
        display: {
          rate_label: '${flat_rate} flat rate (includes {included_hours}h) + additional hours @ ${additional_hourly_rate}/hr per packer ({crew} crew)',
        },
        flags: { taxable: !!form.taxable, commissionable: true },
      };
    }
    if (selectedPreset.mode === 'unit') {
      return {
        engine: 'v2',
        category: normalizedCategory,
        mode: 'unit',
        inputs: ['quantity', 'unit_price'],
        defaults: {
          quantity: Number(form.default_quantity || 0),
          unit_price: Number(form.default_unit_price || 0),
        },
        display: { rate_label: '{quantity} @ ${unit_price}' },
        flags: { taxable: !!form.taxable, commissionable: false },
      };
    }
    if (selectedPreset.mode === 'weight') {
      return {
        engine: 'v2',
        category: normalizedCategory,
        mode: 'weight',
        inputs: ['weight_lbs', 'rate_per_cwt'],
        defaults: {
          weight_lbs: Number(form.weight || 0),
          rate_per_cwt: Number(form.default_unit_price || 0),
        },
        display: { rate_label: '{weight_lbs} lbs / 100 @ ${rate_per_cwt}/cwt' },
        flags: { taxable: !!form.taxable, commissionable: false },
      };
    }
  }

  if (['trip_and_travel', 'additional_services', 'fuel_surcharge'].includes(normalizedCategory) && selectedPreset?.mode) {
    if (selectedPreset.mode === 'mileage') {
      const inputs = normalizedCategory === 'fuel_surcharge'
        ? ['mileage', 'cost_per_mile', 'included_miles', 'min_cost', 'trucks']
        : ['mileage', 'cost_per_mile', 'included_miles', 'min_cost'];
      return {
        engine: 'v2',
        category: normalizedCategory,
        mode: 'mileage',
        inputs,
        defaults: {
          mileage: Number(form.mileage || 0),
          cost_per_mile: Number(form.cost_per_mile || form.default_unit_price || 0),
          included_miles: Number(form.included_miles || 0),
          min_cost: Number(form.min_cost || 0),
          ...(normalizedCategory === 'fuel_surcharge' ? { trucks: Number(form.trucks || 1) } : {}),
        },
        display: normalizedCategory === 'fuel_surcharge'
          ? { rate_label: '{trucks} trucks x {mileage} miles @ ${cost_per_mile}/mile' }
          : { rate_label: '{mileage} miles @ ${cost_per_mile}/mile' },
        flags: { taxable: !!form.taxable, commissionable: false },
      };
    }
    if (selectedPreset.mode === 'flat') {
      return {
        engine: 'v2',
        category: normalizedCategory,
        mode: 'flat',
        inputs: ['amount'],
        defaults: { amount: Number(form.default_unit_price || 0) },
        display: { rate_label: '1 @ ${amount}' },
        flags: { taxable: !!form.taxable, commissionable: false },
      };
    }
    if (selectedPreset.mode === 'unit') {
      return {
        engine: 'v2',
        category: normalizedCategory,
        mode: 'unit',
        inputs: ['quantity', 'unit_price'],
        defaults: {
          quantity: Number(form.default_quantity || 0),
          unit_price: Number(form.default_unit_price || 0),
        },
        display: { rate_label: '{quantity} @ ${unit_price}' },
        flags: { taxable: !!form.taxable, commissionable: false },
      };
    }
    if (selectedPreset.mode === 'percentage') {
      return {
        engine: 'v2',
        category: normalizedCategory,
        mode: 'percentage',
        inputs: ['base_amount', 'percentage_rate'],
        defaults: {
          base_amount: Number(form.default_quantity || 0),
          percentage_rate: Number(form.percentage_rate || form.default_unit_price || 0),
        },
        display: { rate_label: '{percentage_rate}% of ${base_amount}' },
        flags: { taxable: !!form.taxable, commissionable: false },
      };
    }
  }

  if (['valuation'].includes(normalizedCategory)) {
    return {
      engine: 'v2',
      category: normalizedCategory,
      mode: 'unit',
      inputs: ['quantity', 'unit_price'],
      defaults: {
        quantity: Number(form.default_quantity || 0),
        unit_price: Number(form.default_unit_price || 0),
      },
      display: { rate_label: '{quantity} @ ${unit_price}' },
      flags: { taxable: !!form.taxable, commissionable: false },
    };
  }

  return null;
};

const emptyForm = {
  id: null,
  branch: '',
  code: '',
  name: '',
  description: '',
  item_type: 'labor',
  category: 'other',
  unit: 'each',
  default_quantity: '1.000',
  default_unit_price: '0.00',
  taxable: true,
  is_active: true,
  is_customer_visible: true,
  is_optional_by_default: false,
  display_order: 0,
  currency: 'USD',
  pricing_model: 'fixed',
  cost_per_unit: '0.00',
  tax_rate: '0',
  category_preset_key: '',
  moving_labor_mode: 'hourly',
  trucks: '1',
  crew: '2',
  labor_time_display: '30m',
  travel_time_display: '0h',
  minimum_time_display: '0h',
  hourly_rate_override: '0',
  flat_rate: '0',
  included_hours: '0h',
  additional_hourly_rate: '0',
  mileage_calc_method: 'by_segment',
  mileage_bill_mode: 'actual',
  office_to_origin_enabled: true,
  origin_to_destination_enabled: true,
  destination_to_office_enabled: true,
  mileage: '',
  cost_per_mile: '',
  min_cost: '',
  included_miles: '',
  cogs: '',
  percentage_rate: '',
  advanced_open: false,
  weight: '7000',
  metadata: {},
};

const extractRows = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

export default function EstimateCatalogManager({ branchId }) {
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [activeBranchId, setActiveBranchId] = useState(() => String(branchId || user?.branch_id || ''));

  useEffect(() => {
    if (branchId) {
      setActiveBranchId(String(branchId));
    }
  }, [branchId]);

  const activeRows = useMemo(() => rows.filter((r) => r.is_active), [rows]);
  const selectedPreset = useMemo(
    () => {
      const presets = CATEGORY_FORM_SCHEMAS[form.category]?.presets || [];
      return presets.find((p) => String(p.key) === String(form.category_preset_key || '')) || presets[0] || null;
    },
    [form.category, form.category_preset_key]
  );

  const previewTotal = useMemo(() => {
    const category = normalizeChargeCategory(form.category);
    const quantity = Number(form.default_quantity || 1);
    const unitPrice = Number(form.default_unit_price || 0);
    const previewForm = {
      category,
      category_preset_key: form.category_preset_key,
      moving_labor_mode: form.moving_labor_mode,
      quantity: Number.isFinite(quantity) ? quantity : 1,
      unit_price: Number.isFinite(unitPrice) ? unitPrice : 0,
      total_price: Number.isFinite(unitPrice) ? unitPrice : 0,
      labor_time_display: form.labor_time_display,
      travel_time_display: form.travel_time_display,
      minimum_time_display: form.minimum_time_display,
      trucks: form.trucks,
      crew: form.crew,
      hourly_rate_override: form.hourly_rate_override,
      flat_rate: form.flat_rate,
      included_hours: form.included_hours,
      additional_hourly_rate: form.additional_hourly_rate,
      mileage_calc_method: form.mileage_calc_method,
      mileage_bill_mode: form.mileage_bill_mode,
      office_to_origin_enabled: form.office_to_origin_enabled,
      origin_to_destination_enabled: form.origin_to_destination_enabled,
      destination_to_office_enabled: form.destination_to_office_enabled,
      mileage: form.mileage,
      cost_per_mile: form.cost_per_mile,
      min_cost: form.min_cost,
      included_miles: form.included_miles,
      cogs: form.cogs,
      percentage_rate: form.percentage_rate,
      weight: form.weight,
    };
    const context = { distanceMiles: 0, durationHours: 0, crewSize: Number(form.crew || 0), hourlyRate: Number(form.default_unit_price || 0), estimatedHours: 0, travelHours: 0, transportationBase: 0, laborBase: 0 };
    const value = computeChargeTotal(previewForm, context, { presetMode: selectedPreset?.mode || '' });
    return Number.isFinite(Number(value)) ? Number(value) : 0;
  }, [form, selectedPreset?.mode]);

  const renderPresetDrivenCategoryForm = () => {
    if (!selectedPreset) {
      return (
        <ChargeFormSection title="Pricing Configurations">
          <FormInput
            label="Preset"
            as="select"
            value={form.category_preset_key}
            onChange={(e) => setForm((p) => ({ ...p, category_preset_key: e.target.value }))}
          >
            <option value="">Choose preset...</option>
            {(CATEGORY_FORM_SCHEMAS[form.category]?.presets || []).map((preset) => (
              <option key={preset.key} value={preset.key}>{preset.label}</option>
            ))}
          </FormInput>
        </ChargeFormSection>
      );
    }

    return (
      <ChargeFormSection title="Pricing Configurations">
        <FormInput
          label="Preset"
          as="select"
          value={form.category_preset_key}
          onChange={(e) => setForm((p) => ({ ...p, category_preset_key: e.target.value }))}
        >
          {(CATEGORY_FORM_SCHEMAS[form.category]?.presets || []).map((preset) => (
            <option key={preset.key} value={preset.key}>{preset.label}</option>
          ))}
        </FormInput>

        {selectedPreset.mode === 'mileage' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Mileage Calculation Method"
                as="select"
                value={form.mileage_calc_method}
                onChange={(e) => setForm((p) => ({ ...p, mileage_calc_method: e.target.value }))}
              >
                <option value="by_segment">By Segment</option>
                <option value="total_route">Total Route</option>
              </FormInput>
              <FormInput
                label="Mileage To Be Billed"
                as="select"
                value={form.mileage_bill_mode}
                onChange={(e) => setForm((p) => ({ ...p, mileage_bill_mode: e.target.value }))}
              >
                <option value="actual">Actual</option>
                <option value="custom">Custom</option>
              </FormInput>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {(form.category === 'fuel_surcharge' || form.category === 'transportation') && (
                <FormInput
                  label="Trucks"
                  type="number"
                  value={form.trucks}
                  onChange={(e) => setForm((p) => ({ ...p, trucks: e.target.value }))}
                  suffix={<Truck size={16} />}
                />
              )}
              {form.category === 'transportation' && (
                <FormInput
                  label="Crew"
                  type="number"
                  value={form.crew}
                  onChange={(e) => setForm((p) => ({ ...p, crew: e.target.value }))}
                  suffix={<Users size={16} />}
                />
              )}
              <FormInput
                label="Mileage"
                type="number"
                value={form.mileage}
                onChange={(e) => setForm((p) => ({ ...p, mileage: e.target.value }))}
                suffix="mi"
              />
              <FormInput
                label="Cost per Mile"
                type="number"
                value={form.cost_per_mile}
                onChange={(e) => setForm((p) => ({ ...p, cost_per_mile: e.target.value }))}
                prefix="$"
              />
              <FormInput
                label="Min Cost"
                type="number"
                value={form.min_cost}
                onChange={(e) => setForm((p) => ({ ...p, min_cost: e.target.value }))}
                prefix="$"
              />
              <FormInput
                label="Included Miles"
                type="number"
                value={form.included_miles}
                onChange={(e) => setForm((p) => ({ ...p, included_miles: e.target.value }))}
                suffix="mi"
              />
            </div>
            <div className="space-y-2 pt-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={!!form.office_to_origin_enabled} onChange={(e) => setForm((p) => ({ ...p, office_to_origin_enabled: e.target.checked }))} className="rounded text-blue-600 focus:ring-blue-500/20" /> Office to Origin
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={!!form.origin_to_destination_enabled} onChange={(e) => setForm((p) => ({ ...p, origin_to_destination_enabled: e.target.checked }))} className="rounded text-blue-600 focus:ring-blue-500/20" /> Origin to Destination
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={!!form.destination_to_office_enabled} onChange={(e) => setForm((p) => ({ ...p, destination_to_office_enabled: e.target.checked }))} className="rounded text-blue-600 focus:ring-blue-500/20" /> Destination to Office
              </label>
            </div>
            <FormInput
              label="Cost of Goods"
              type="number"
              value={form.cogs}
              onChange={(e) => setForm((p) => ({ ...p, cogs: e.target.value }))}
              prefix="$"
            />
          </>
        ) : selectedPreset.mode === 'flat_truck' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Number of Trucks"
                type="number"
                value={form.default_quantity}
                onChange={(e) => setForm((p) => ({ ...p, default_quantity: e.target.value }))}
                suffix={<Truck size={16} />}
              />
              <FormInput
                label="Number of Crew"
                type="number"
                value={form.crew}
                onChange={(e) => setForm((p) => ({ ...p, crew: e.target.value }))}
                suffix={<Users size={16} />}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Duration"
                value={form.labor_time_display}
                onChange={(e) => setForm((p) => ({ ...p, labor_time_display: e.target.value }))}
                suffix={<Clock size={16} />}
              />
              <FormInput
                label="Flat Fee per Truck"
                type="number"
                value={form.default_unit_price}
                onChange={(e) => setForm((p) => ({ ...p, default_unit_price: e.target.value }))}
                prefix="$"
              />
            </div>
          </div>
        ) : selectedPreset.mode === 'percentage' ? (
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Base Amount"
              type="number"
              value={form.default_quantity}
              onChange={(e) => setForm((p) => ({ ...p, default_quantity: e.target.value }))}
              prefix="$"
            />
            <FormInput
              label="Percentage"
              type="number"
              value={form.percentage_rate}
              onChange={(e) => setForm((p) => ({ ...p, percentage_rate: e.target.value }))}
              suffix="%"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Qty"
              type="number"
              value={form.default_quantity}
              onChange={(e) => setForm((p) => ({ ...p, default_quantity: e.target.value }))}
            />
            <FormInput
              label={selectedPreset.mode === 'flat' ? 'Flat Fee' : 'Rate'}
              type="number"
              value={form.default_unit_price}
              onChange={(e) => setForm((p) => ({ ...p, default_unit_price: e.target.value }))}
              prefix="$"
            />
          </div>
        )}
      </ChargeFormSection>
    );
  };

  const renderCategoryFields = () => {
    if (form.category === 'moving_labor') {
      return (
        <ChargeFormSection title="Pricing Configurations">
          <div className="space-y-1.5 w-full">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Pricing Type</label>
            <div className="grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1 gap-1">
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, moving_labor_mode: 'hourly' }))}
                className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${form.moving_labor_mode === 'hourly' ? 'bg-brand text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
              >
                Hourly only
              </button>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, moving_labor_mode: 'flat_plus_hourly' }))}
                className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${form.moving_labor_mode === 'flat_plus_hourly' ? 'bg-brand text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
              >
                Fixed price + extra hours
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormInput
              label="Trucks"
              type="number"
              value={form.trucks}
              onChange={(e) => setForm((p) => ({ ...p, trucks: e.target.value }))}
              suffix={<Truck size={16} />}
            />
            <FormInput
              label="Crew"
              type="number"
              value={form.crew}
              onChange={(e) => setForm((p) => ({ ...p, crew: e.target.value }))}
              suffix={<Users size={16} />}
            />
            <FormInput
              label={form.moving_labor_mode === 'flat_plus_hourly' ? 'Extra Hour Rate' : 'Hourly Rate'}
              type="number"
              value={form.moving_labor_mode === 'flat_plus_hourly' ? form.additional_hourly_rate : form.hourly_rate_override}
              onChange={(e) => setForm((p) => (p.moving_labor_mode === 'flat_plus_hourly' ? { ...p, additional_hourly_rate: e.target.value } : { ...p, hourly_rate_override: e.target.value }))}
              prefix="$"
            />
          </div>
          {form.moving_labor_mode === 'flat_plus_hourly' && (
            <div className="grid grid-cols-2 gap-3">
              <FormInput
                label="Fixed Price"
                type="number"
                value={form.flat_rate}
                onChange={(e) => setForm((p) => ({ ...p, flat_rate: e.target.value }))}
                prefix="$"
              />
              <FormInput
                label="Included Hours"
                value={form.included_hours}
                onChange={(e) => setForm((p) => ({ ...p, included_hours: e.target.value }))}
                suffix={<Clock size={16} />}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label={form.moving_labor_mode === 'flat_plus_hourly' ? 'Total Labor Time' : 'Billable Hours'}
              value={form.labor_time_display}
              onChange={(e) => setForm((p) => ({ ...p, labor_time_display: e.target.value }))}
              suffix={<Clock size={16} />}
            />
            <FormInput
              label="Travel Time"
              value={form.travel_time_display}
              onChange={(e) => setForm((p) => ({ ...p, travel_time_display: e.target.value }))}
              suffix={<Clock size={16} />}
            />
          </div>
          {form.moving_labor_mode === 'hourly' && (
            <FormInput
              label="Minimum Time"
              value={form.minimum_time_display}
              onChange={(e) => setForm((p) => ({ ...p, minimum_time_display: e.target.value }))}
              suffix={<Clock size={16} />}
            />
          )}
        </ChargeFormSection>
      );
    }
    if (form.category === 'packing') {
      const selectedPresetKey = form.category_preset_key || 'hourly_labor';
      return (
        <ChargeFormSection title="Pricing Configurations">
          <FormInput
            label="Preset"
            as="select"
            value={form.category_preset_key}
            onChange={(e) => {
              const nextPresetKey = e.target.value;
              setForm((p) => ({
                ...p,
                category_preset_key: nextPresetKey,
                ...(nextPresetKey === 'hourly_labor' ? { default_unit_price: '60.00' } : {}),
                ...(nextPresetKey === 'flat_plus_hourly' ? { flat_rate: '500.00', included_hours: '4h', additional_hourly_rate: '65.00', crew: '2', labor_time_display: '6h' } : {}),
                ...(nextPresetKey === 'by_container' ? { default_quantity: '10', default_unit_price: '10.00' } : {}),
                ...(nextPresetKey === 'by_cwt' ? { weight: '7000', default_unit_price: '12.00' } : {}),
              }));
            }}
          >
            {(CATEGORY_FORM_SCHEMAS[form.category]?.presets || []).map((preset) => (
              <option key={preset.key} value={preset.key}>
                {preset.label}
              </option>
            ))}
          </FormInput>

          {selectedPresetKey === 'hourly_labor' && (
            <div className="grid grid-cols-3 gap-3">
              <FormInput
                label="Packers"
                type="number"
                value={form.crew}
                onChange={(e) => setForm((p) => ({ ...p, crew: e.target.value }))}
                suffix={<Users size={16} />}
              />
              <FormInput
                label="Hours"
                value={form.labor_time_display}
                onChange={(e) => setForm((p) => ({ ...p, labor_time_display: e.target.value }))}
                suffix={<Clock size={16} />}
              />
              <FormInput
                label="Hourly Rate"
                type="number"
                value={form.default_unit_price}
                onChange={(e) => setForm((p) => ({ ...p, default_unit_price: e.target.value }))}
                prefix="$"
              />
            </div>
          )}

          {selectedPresetKey === 'flat_plus_hourly' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <FormInput
                  label="Flat Rate"
                  type="number"
                  value={form.flat_rate}
                  onChange={(e) => setForm((p) => ({ ...p, flat_rate: e.target.value }))}
                  prefix="$"
                />
                <FormInput
                  label="Included Hours"
                  value={form.included_hours}
                  onChange={(e) => setForm((p) => ({ ...p, included_hours: e.target.value }))}
                  suffix="h"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <FormInput
                  label="Total Hours"
                  value={form.labor_time_display}
                  onChange={(e) => setForm((p) => ({ ...p, labor_time_display: e.target.value }))}
                  suffix={<Clock size={16} />}
                />
                <FormInput
                  label="Addl Hourly Rate"
                  type="number"
                  value={form.additional_hourly_rate}
                  onChange={(e) => setForm((p) => ({ ...p, additional_hourly_rate: e.target.value }))}
                  prefix="$"
                />
                <FormInput
                  label="Packers"
                  type="number"
                  value={form.crew}
                  onChange={(e) => setForm((p) => ({ ...p, crew: e.target.value }))}
                  suffix={<Users size={16} />}
                />
              </div>
            </>
          )}

          {selectedPresetKey === 'by_container' && (
            <div className="grid grid-cols-2 gap-3">
              <FormInput
                label="Containers"
                type="number"
                value={form.default_quantity}
                onChange={(e) => setForm((p) => ({ ...p, default_quantity: e.target.value }))}
                suffix="qty"
              />
              <FormInput
                label="Price per Container"
                type="number"
                value={form.default_unit_price}
                onChange={(e) => setForm((p) => ({ ...p, default_unit_price: e.target.value }))}
                prefix="$"
              />
            </div>
          )}

          {selectedPresetKey === 'by_cwt' && (
            <div className="grid grid-cols-2 gap-3">
              <FormInput
                label="Weight (lbs)"
                type="number"
                value={form.weight}
                onChange={(e) => setForm((p) => ({ ...p, weight: e.target.value }))}
                suffix="lb"
              />
              <FormInput
                label="Price per Cwt"
                type="number"
                value={form.default_unit_price}
                onChange={(e) => setForm((p) => ({ ...p, default_unit_price: e.target.value }))}
                prefix="$"
              />
            </div>
          )}
        </ChargeFormSection>
      );
    }
    if (['transportation', 'trip_and_travel', 'additional_services', 'fuel_surcharge'].includes(form.category)) {
      return renderPresetDrivenCategoryForm();
    }
    if (form.category === 'valuation') {
      return (
        <ChargeFormSection title="Pricing Configurations">
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Quantity"
              type="number"
              value={form.default_quantity}
              onChange={(e) => setForm((p) => ({ ...p, default_quantity: e.target.value }))}
            />
            <FormInput
              label="Rate"
              type="number"
              value={form.default_unit_price}
              onChange={(e) => setForm((p) => ({ ...p, default_unit_price: e.target.value }))}
              prefix="$"
            />
          </div>
        </ChargeFormSection>
      );
    }
    return (
      <ChargeFormSection title="Pricing Configurations">
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Quantity"
            type="number"
            value={form.default_quantity}
            onChange={(e) => setForm((p) => ({ ...p, default_quantity: e.target.value }))}
          />
          <FormInput
            label="Rate"
            type="number"
            value={form.default_unit_price}
            onChange={(e) => setForm((p) => ({ ...p, default_unit_price: e.target.value }))}
          />
        </div>
      </ChargeFormSection>
    );
  };

  const loadBranches = async () => {
    try {
      const resp = await getBranches();
      const next = extractRows(resp);
      setBranches(next);
      const defaultBranchId = branchId || user?.branch_id || next[0]?.id || '';
      setActiveBranchId(String(defaultBranchId || ''));
    } catch {
      setBranches([]);
      setActiveBranchId(String(branchId || user?.branch_id || ''));
    }
  };

  const load = async ({ clearMessage = true } = {}) => {
    if (!activeBranchId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    if (clearMessage) setMessage(null);
    try {
      const resp = await getEstimateCatalogItems({
        include_inactive: includeInactive ? 1 : 0,
        branch: activeBranchId,
      });
      setRows(extractRows(resp));
    } catch {
      setMessage({ type: 'error', text: 'Failed to load catalog items.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeInactive, activeBranchId]);

  const openNew = () => {
    setForm({ ...emptyForm, branch: activeBranchId || '' });
    setErrors({});
    setOpen(true);
  };

  const onEdit = (row) => {
    const schema = row?.category_form_schema || row?.metadata?.category_form_schema || CATEGORY_FORM_SCHEMAS[row?.category] || null;
    const defaults = row?.metadata?.category_defaults || {};
    setForm({
      ...emptyForm,
      ...row,
      branch: row.branch || '',
      code: row.code || '',
      description: row.description || '',
      unit: row.unit || 'each',
      category: row.category || 'other',
      metadata: row.metadata || {},
      currency: row?.metadata?.currency || 'USD',
      pricing_model: row?.metadata?.pricing_model || 'fixed',
      cost_per_unit: row?.metadata?.cost_per_unit ?? '0.00',
      tax_rate: row?.metadata?.tax_rate ?? '0',
      category_preset_key: String(defaults?.preset_key || schema?.presets?.[0]?.key || ''),
      moving_labor_mode: defaults?.mode === 'flat_plus_hourly' ? 'flat_plus_hourly' : 'hourly',
      trucks: String(defaults?.trucks ?? '1'),
      crew: String(defaults?.crew ?? '2'),
      labor_time_display: String(defaults?.labor_time_display ?? '30m'),
      travel_time_display: String(defaults?.travel_time_display ?? '0h'),
      minimum_time_display: String(defaults?.minimum_time_display ?? '0h'),
      hourly_rate_override: String(defaults?.hourly_rate ?? row?.default_unit_price ?? '0'),
      flat_rate: String(defaults?.flat_rate ?? row?.default_unit_price ?? '0'),
      included_hours: String(defaults?.included_hours ?? '0h'),
      additional_hourly_rate: String(defaults?.additional_hourly_rate ?? row?.default_unit_price ?? '0'),
      mileage_calc_method: String(defaults?.mileage_calc_method ?? 'by_segment'),
      mileage_bill_mode: String(defaults?.mileage_bill_mode ?? 'actual'),
      office_to_origin_enabled: defaults?.office_to_origin_enabled !== false,
      origin_to_destination_enabled: defaults?.origin_to_destination_enabled !== false,
      destination_to_office_enabled: defaults?.destination_to_office_enabled !== false,
      mileage: String(defaults?.mileage ?? ''),
      cost_per_mile: String(defaults?.cost_per_mile ?? ''),
      min_cost: String(defaults?.min_cost ?? ''),
      included_miles: String(defaults?.included_miles ?? ''),
      cogs: String(defaults?.cogs ?? ''),
      percentage_rate: String(defaults?.percentage_rate ?? ''),
      weight: String(defaults?.weight_lbs ?? defaults?.weight ?? '7000'),
    });
    setErrors({});
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setForm(emptyForm);
    setErrors({});
  };

  const validate = () => {
    const nextErrors = {};
    if (!String(form.branch || '').trim()) nextErrors.branch = 'Branch is required.';
    const name = String(form.name || '').trim();
    if (!name) nextErrors.name = 'Name is required.';

    const price = Number(form.default_unit_price);
    if (Number.isNaN(price)) nextErrors.default_unit_price = 'Price must be a number.';
    else if (price < 0) nextErrors.default_unit_price = 'Price cannot be negative.';

    const cost = Number(form.cost_per_unit);
    if (Number.isNaN(cost)) nextErrors.cost_per_unit = 'Cost must be a number.';
    else if (cost < 0) nextErrors.cost_per_unit = 'Cost cannot be negative.';

    const taxRate = Number(form.tax_rate);
    if (Number.isNaN(taxRate)) nextErrors.tax_rate = 'Tax rate must be a number.';
    else if (taxRate < 0 || taxRate > 100) nextErrors.tax_rate = 'Tax rate must be between 0 and 100.';

    if (form.pricing_model === 'unit') {
      const qty = Number(form.default_quantity);
      if (Number.isNaN(qty)) nextErrors.default_quantity = 'Default quantity must be a number.';
      else if (qty <= 0) nextErrors.default_quantity = 'Default quantity must be greater than 0.';
    }

    if (form.category === 'valuation') {
      const qty = Number(form.default_quantity);
      if (Number.isNaN(qty)) nextErrors.default_quantity = 'Quantity must be a number.';
      else if (qty <= 0) nextErrors.default_quantity = 'Quantity must be greater than 0.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    setMessage(null);
    try {
      const categorySchema = CATEGORY_FORM_SCHEMAS[form.category] || null;
      const selectedPreset = categorySchema?.presets?.find((p) => String(p.key) === String(form.category_preset_key || '')) || null;
      const baseDefaults = {
        preset_key: selectedPreset?.key || '',
        mode: form.category === 'moving_labor' ? form.moving_labor_mode : (selectedPreset?.mode || ''),
      };
      const categoryDefaults = form.category === 'moving_labor'
        ? {
            ...baseDefaults,
            trucks: Number(form.trucks || 1),
            crew: Number(form.crew || 2),
            labor_time_display: form.labor_time_display || '30m',
            travel_time_display: form.travel_time_display || '0h',
            minimum_time_display: form.minimum_time_display || '0h',
            hourly_rate: Number(form.hourly_rate_override || 0),
            flat_rate: Number(form.flat_rate || 0),
            included_hours: form.included_hours || '0h',
            additional_hourly_rate: Number(form.additional_hourly_rate || 0),
          }
        : (form.category === 'trip_and_travel' || form.category === 'additional_services' || form.category === 'transportation' || form.category === 'fuel_surcharge')
          ? {
              ...baseDefaults,
              mileage_calc_method: form.mileage_calc_method,
              mileage_bill_mode: form.mileage_bill_mode,
              office_to_origin_enabled: !!form.office_to_origin_enabled,
              origin_to_destination_enabled: !!form.origin_to_destination_enabled,
              destination_to_office_enabled: !!form.destination_to_office_enabled,
              mileage: Number(form.mileage || 0),
              cost_per_mile: Number(form.cost_per_mile || 0),
              min_cost: Number(form.min_cost || 0),
              included_miles: Number(form.included_miles || 0),
              cogs: Number(form.cogs || 0),
              percentage_rate: Number(form.percentage_rate || 0),
              trucks: Number(form.trucks || 1),
              crew: Number(form.crew || 2),
              labor_time_display: form.labor_time_display || '30m',
              flat_rate: Number(form.flat_rate || 0),
              weight: Number(form.weight || 7000),
            }
        : form.category === 'packing'
          ? {
              ...baseDefaults,
              crew: Number(form.crew || 1),
              labor_time_display: form.labor_time_display || '4h',
              hourly_rate: Number(form.default_unit_price || 0),
              flat_rate: Number(form.flat_rate || 0),
              included_hours: form.included_hours || '0h',
              additional_hourly_rate: Number(form.additional_hourly_rate || 0),
              weight: Number(form.weight || 7000),
            }
        : form.category === 'valuation'
          ? {
              ...baseDefaults,
              quantity: Number(form.default_quantity || 0),
              unit_price: Number(form.default_unit_price || 0),
            }
          : baseDefaults;

      const pricingRule = buildPricingRuleV2({
        category: form.category,
        selectedPreset,
        categoryDefaults,
        form,
      });

      const derivedQty = form.category === 'packing'
        ? (form.category_preset_key === 'hourly_labor' || form.category_preset_key === 'flat_plus_hourly'
            ? String(parseDurationToHours(form.labor_time_display || '0h', 0))
            : form.category_preset_key === 'by_cwt'
              ? '1'
              : form.default_quantity)
        : form.default_quantity;

      const derivedPrice = form.category === 'packing' && form.category_preset_key === 'flat_plus_hourly'
        ? form.flat_rate
        : form.default_unit_price;

      const payload = {
        branch: Number(form.branch),
        code: form.code || null,
        name: form.name,
        description: form.description || '',
        item_type: form.item_type,
        category: form.category || '',
        unit: form.unit || '',
        default_quantity: derivedQty,
        default_unit_price: derivedPrice,
        taxable: !!form.taxable,
        is_active: !!form.is_active,
        is_customer_visible: !!form.is_customer_visible,
        is_optional_by_default: !!form.is_optional_by_default,
        display_order: Number(form.display_order || 0),
        metadata: {
          ...(form.metadata || {}),
          currency: form.currency || 'USD',
          pricing_model: form.pricing_model || 'fixed',
          cost_per_unit: form.cost_per_unit || '0.00',
          tax_rate: form.tax_rate || '0',
          ...(categorySchema ? {
            category_form_schema: categorySchema,
            category_defaults: categoryDefaults,
          } : {}),
          ...(pricingRule ? { pricing_rule: pricingRule } : {}),
        },
      };

      if (form.id) {
        await updateEstimateCatalogItem(form.id, payload);
        setMessage({ type: 'success', text: 'Catalog item updated.' });
      } else {
        await createEstimateCatalogItem(payload);
        setMessage({ type: 'success', text: 'Catalog item created.' });
      }
      closeModal();
      await load({ clearMessage: false });
    } catch {
      setMessage({ type: 'error', text: 'Failed to save catalog item.' });
    } finally {
      setLoading(false);
    }
  };

  const onDeactivate = async (id) => {
    setLoading(true);
    setMessage(null);
    try {
      await deactivateEstimateCatalogItem(id);
      setMessage({ type: 'success', text: 'Catalog item deactivated.' });
      await load({ clearMessage: false });
    } catch {
      setMessage({ type: 'error', text: 'Failed to deactivate catalog item.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-bold text-heading">Products &amp; services</div>
            <div className="text-sm text-body">Branch-specific catalog items used to build estimate packages.</div>
          </div>
          <div className="flex items-center gap-3">
            {!branchId && (
              <select
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-heading outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={activeBranchId}
                onChange={(e) => setActiveBranchId(e.target.value)}
                disabled={loading || !branches.length}
              >
                <option value="">{branches.length ? 'Select branch…' : 'No branches'}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
            <label className="text-sm text-body flex items-center gap-2">
              <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
              Include inactive
            </label>
            <button
              onClick={openNew}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              disabled={loading || !activeBranchId}
            >
              <Plus size={16} />
              Add product
            </button>
          </div>
        </div>

        {message ? (
          <div
            className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
              message.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {message.text}
          </div>
        ) : null}
      </Card>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-0 md:p-4 animate-in fade-in duration-200">
          <div className="relative w-full h-full md:h-auto max-h-screen md:max-h-[calc(100vh-4rem)] md:max-w-5xl rounded-none md:rounded-[2rem] border-0 md:border border-ink-100 bg-white shadow-2xl overflow-hidden flex flex-col transition-all duration-300">
            <div className="flex items-center justify-between gap-4 px-5 md:px-8 py-4 md:py-5 border-b border-ink-100 bg-gradient-to-r from-brand-tint/20 to-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Calculator size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-heading font-black text-heading leading-tight">
                    {form.id ? 'Edit Catalog Product' : 'Add Catalog Product'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-2 rounded-full text-ink-400 hover:text-heading hover:bg-page transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:h-full">
                
                {/* Left Form Column */}
                <div className="lg:col-span-7 p-5 md:p-8 space-y-5 md:space-y-6 lg:border-r border-ink-100 lg:overflow-y-auto lg:h-full">
                  
                  {/* Basic Details */}
                  <ChargeFormSection title="Basic Information">
                    <FormInput
                      label="Product/Service Name *"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. 2 Movers & 1 Truck"
                      helperText={errors.name}
                      className={errors.name ? 'border-red-300 focus:border-red-400 focus:ring-red-100 font-bold' : 'font-bold'}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormInput
                        label="Charge Type"
                        as="select"
                        value={form.category}
                        onChange={(e) => {
                          const nextCategory = normalizeChargeCategory(e.target.value);
                          const nextPreset = CATEGORY_FORM_SCHEMAS[nextCategory]?.presets?.[0]?.key || '';
                          setForm((p) => ({ ...p, category: nextCategory, category_preset_key: nextPreset }));
                        }}
                      >
                        {CHARGE_CATEGORY_OPTIONS.map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </FormInput>
                      
                      <FormInput
                        label="Item Type"
                        as="select"
                        value={form.item_type}
                        onChange={(e) => setForm((p) => ({ ...p, item_type: e.target.value }))}
                      >
                        <option value="labor">Labor</option>
                        <option value="truck_travel">Truck/Travel</option>
                        <option value="materials">Materials</option>
                        <option value="accessorial">Accessorials</option>
                        <option value="weight">Weight-Based</option>
                        <option value="valuation">Valuation</option>
                        <option value="custom">Custom</option>
                      </FormInput>
                    </div>
                  </ChargeFormSection>

                  {/* Pricing Configurations */}
                  {renderCategoryFields()}

                  {/* Description / Notes */}
                  <FormInput
                    label="Description / Notes"
                    as="textarea"
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Enter a brief description for this service..."
                  />

                  {/* Advanced Settings Toggle */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, advanced_open: !p.advanced_open }))}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                    >
                      {form.advanced_open ? 'Hide Advanced Options' : 'Show Advanced Options'}
                    </button>

                    {form.advanced_open && (
                      <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormInput
                            label="Unique Code"
                            value={form.code}
                            onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                            placeholder="e.g. LBR-HOURLY"
                          />
                          <FormInput
                            label="Unit Description"
                            value={form.unit}
                            onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                            placeholder="e.g. each, hr, mile"
                          />
                        </div>
                        <FormInput
                          label="Display Order"
                          type="number"
                          value={form.display_order}
                          onChange={(e) => setForm((p) => ({ ...p, display_order: e.target.value }))}
                        />
                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <label className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 cursor-pointer transition-all ${form.taxable ? 'border-brand bg-brand/5 shadow-sm' : 'border-ink-100 bg-[#eef6ff]/10 hover:bg-[#eef6ff]/20'}`}>
                            <input
                              type="checkbox"
                              checked={Boolean(form.taxable)}
                              onChange={(e) => setForm((p) => ({ ...p, taxable: e.target.checked }))}
                              className="mt-1 h-4.5 w-4.5 rounded border-slate-300 text-brand focus:ring-brand cursor-pointer"
                            />
                            <div className="min-w-0 text-left">
                              <div className="text-[10px] font-black uppercase tracking-widest text-brand">Taxable</div>
                              <div className="text-xs font-bold text-slate-700">Include in tax calculations</div>
                            </div>
                          </label>
                          <label className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 cursor-pointer transition-all ${form.is_customer_visible ? 'border-brand bg-brand/5 shadow-sm' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'}`}>
                            <input
                              type="checkbox"
                              checked={Boolean(form.is_customer_visible)}
                              onChange={(e) => setForm((p) => ({ ...p, is_customer_visible: e.target.checked }))}
                              className="mt-1 h-4.5 w-4.5 rounded border-slate-300 text-brand focus:ring-brand cursor-pointer"
                            />
                            <div className="min-w-0 text-left">
                              <div className="text-[10px] font-black uppercase tracking-widest text-brand">Customer Visible</div>
                              <div className="text-xs font-bold text-slate-700">Show to customers in portal</div>
                            </div>
                          </label>
                          <label className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 cursor-pointer transition-all ${form.is_optional_by_default ? 'border-brand bg-brand/5 shadow-sm' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'}`}>
                            <input
                              type="checkbox"
                              checked={Boolean(form.is_optional_by_default)}
                              onChange={(e) => setForm((p) => ({ ...p, is_optional_by_default: e.target.checked }))}
                              className="mt-1 h-4.5 w-4.5 rounded border-slate-300 text-brand focus:ring-brand cursor-pointer"
                            />
                            <div className="min-w-0 text-left">
                              <div className="text-[10px] font-black uppercase tracking-widest text-brand">Optional By Default</div>
                              <div className="text-xs font-bold text-slate-700">Optional in estimate package</div>
                            </div>
                          </label>
                          <label className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 cursor-pointer transition-all ${form.is_active ? 'border-brand bg-brand/5 shadow-sm' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'}`}>
                            <input
                              type="checkbox"
                              checked={Boolean(form.is_active)}
                              onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                              className="mt-1 h-4.5 w-4.5 rounded border-slate-300 text-brand focus:ring-brand cursor-pointer"
                            />
                            <div className="min-w-0 text-left">
                              <div className="text-[10px] font-black uppercase tracking-widest text-brand">Active</div>
                              <div className="text-xs font-bold text-slate-700">Available for estimate creation</div>
                            </div>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Summary Column */}
                <div className="lg:col-span-5 p-5 md:p-8 bg-slate-50/50 lg:overflow-y-auto lg:h-full flex flex-col justify-between border-t lg:border-t-0 border-ink-100">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Calculation & Rule Preview</h4>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">
                        This preview calculates the default total cost of this item as it would appear initially on a new estimate.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-blue-50/40 p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-blue-100/50 pb-3">
                        <div className="text-[10px] font-black uppercase tracking-widest text-blue-700">Preview Total</div>
                        <span className="text-xs font-bold text-blue-600 bg-blue-100/40 px-2 py-0.5 rounded-full capitalize">
                          {form.category.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-3xl font-black text-blue-900 font-mono tracking-tight">
                          ${previewTotal.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium leading-none">
                          Initial estimated charge amount
                        </div>
                      </div>

                      {/* Display breakdown info based on category */}
                      <div className="text-xs text-blue-800 space-y-2 pt-2 border-t border-blue-100/30">
                        {form.category === 'moving_labor' && (
                          <div className="space-y-1">
                            <div className="flex justify-between font-semibold">
                              <span>Crew Size:</span>
                              <span>{form.crew} movers</span>
                            </div>
                            <div className="flex justify-between font-semibold">
                              <span>Trucks:</span>
                              <span>{form.trucks} trucks</span>
                            </div>
                            <div className="flex justify-between font-semibold">
                              <span>Rate Mode:</span>
                              <span className="capitalize">{form.moving_labor_mode.replace(/_/g, ' ')}</span>
                            </div>
                            <div className="flex justify-between font-semibold">
                              <span>Rate:</span>
                              <span>${form.moving_labor_mode === 'flat_plus_hourly' ? form.additional_hourly_rate : form.hourly_rate_override}/hr</span>
                            </div>
                          </div>
                        )}
                        {form.category === 'packing' && (
                          <div className="space-y-1">
                            {selectedPreset?.key === 'hourly_labor' && (
                              <>
                                <div className="flex justify-between font-semibold">
                                  <span>Packers:</span>
                                  <span>{form.crew}</span>
                                </div>
                                <div className="flex justify-between font-semibold">
                                  <span>Hours:</span>
                                  <span>{form.labor_time_display}</span>
                                </div>
                                <div className="flex justify-between font-semibold">
                                  <span>Hourly Rate:</span>
                                  <span>${form.default_unit_price}/hr</span>
                                </div>
                              </>
                            )}
                            {selectedPreset?.key === 'flat_plus_hourly' && (
                              <>
                                <div className="flex justify-between font-semibold">
                                  <span>Flat Rate:</span>
                                  <span>${form.flat_rate}</span>
                                </div>
                                <div className="flex justify-between font-semibold">
                                  <span>Included Hours:</span>
                                  <span>{form.included_hours}</span>
                                </div>
                                <div className="flex justify-between font-semibold">
                                  <span>Total Hours:</span>
                                  <span>{form.labor_time_display}</span>
                                </div>
                                <div className="flex justify-between font-semibold">
                                  <span>Addl Hourly Rate:</span>
                                  <span>${form.additional_hourly_rate}/hr</span>
                                </div>
                                <div className="flex justify-between font-semibold">
                                  <span>Packers:</span>
                                  <span>{form.crew}</span>
                                </div>
                              </>
                            )}
                            {selectedPreset?.key === 'by_container' && (
                              <>
                                <div className="flex justify-between font-semibold">
                                  <span>Containers:</span>
                                  <span>{form.default_quantity}</span>
                                </div>
                                <div className="flex justify-between font-semibold">
                                  <span>Price per Container:</span>
                                  <span>${form.default_unit_price}</span>
                                </div>
                              </>
                            )}
                            {selectedPreset?.key === 'by_cwt' && (
                              <>
                                <div className="flex justify-between font-semibold">
                                  <span>Weight:</span>
                                  <span>{form.weight} lbs</span>
                                </div>
                                <div className="flex justify-between font-semibold">
                                  <span>Price per Cwt:</span>
                                  <span>${form.default_unit_price}</span>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                        {form.category === 'valuation' && (
                          <div className="space-y-1">
                            <div className="flex justify-between font-semibold">
                              <span>Quantity:</span>
                              <span>{form.default_quantity}</span>
                            </div>
                            <div className="flex justify-between font-semibold">
                              <span>Rate:</span>
                              <span>${form.default_unit_price}</span>
                            </div>
                          </div>
                        )}
                        {form.category !== 'moving_labor' && form.category !== 'packing' && form.category !== 'valuation' && (
                          <div className="space-y-1">
                            <div className="flex justify-between font-semibold">
                              <span>Default Qty:</span>
                              <span>{form.default_quantity}</span>
                            </div>
                            <div className="flex justify-between font-semibold">
                              <span>Default Unit Price:</span>
                              <span>${form.default_unit_price}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="hidden lg:block pt-6 text-[10px] text-slate-400 font-medium">
                    * Items will be instantiated using these defaults when selected in the estimate creation workflow.
                  </div>
                </div>

              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-ink-100 shrink-0 bg-slate-50/50">
              <GhostBtn onClick={closeModal}>Cancel</GhostBtn>
              <PrimaryBtn
                onClick={onSubmit}
                disabled={loading || !form.name}
                loading={loading}
                icon="save"
              >
                {form.id ? 'Save Product' : 'Add Product'}
              </PrimaryBtn>
            </div>
          </div>
        </div>
      ) : null}

      <Card className="p-6">
        <div className="text-base font-bold text-heading">Catalog Items</div>
        <div className="mt-4 grid grid-cols-1 gap-3">
          {loading ? <div className="text-sm text-body">Loading…</div> : null}
          {(includeInactive ? rows : activeRows).map((row) => (
            <div key={row.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white hover:bg-slate-50/50 p-4 transition-all duration-200 shadow-sm hover:shadow group">
              <div>
                <div className="text-sm font-bold text-heading group-hover:text-blue-600 transition-colors">
                  {row.code ? `${row.code} — ` : ''}{row.name}
                  {!row.is_active ? <span className="ml-2 text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">(inactive)</span> : null}
                </div>
                <div className="text-xs text-slate-500 mt-1 font-medium">
                  {row.item_type} • {row.category || 'other'} • {row.unit || 'each'} • qty {row.default_quantity} • ${row.default_unit_price}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => onEdit(row)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer shadow-sm">
                  Edit
                </button>
                {row.is_active ? (
                  <button
                    onClick={() => onDeactivate(row.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-100 bg-red-50/50 px-3.5 py-2 text-xs font-bold text-red-700 hover:bg-red-50 hover:border-red-200 transition-all cursor-pointer"
                  >
                    <Trash2 size={14} />
                    Deactivate
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
