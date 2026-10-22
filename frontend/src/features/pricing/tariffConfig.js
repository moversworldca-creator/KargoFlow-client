// The tariff configuration as the backend stores it (one section per screen;
// see KargoFlow_Domain/tenant/tariffs/config.py). These helpers only shape what
// the editor shows and sends; the backend validates and rates.
import { DEFAULT_PERIOD } from './constants';

export const SECTIONS = [
  'periods', 'hourly_moving', 'materials', 'packing', 'distance_rates', 'trip_travel', 'fuel_surcharges', 'shuttle_fees',
  'storage_in_transit', 'additional_services', 'bulky_items', 'valuation', 'pricing_method_defaults',
  'auto_pricing_rules', 'not_to_exceed', 'auto_pricing_engine',
];
// Sections that reference others are saved after what they reference.
const SAVE_ORDER = [...SECTIONS];

export function emptyConfiguration() {
  return {
    periods: [], hourly_moving: { is_enabled: true, vary_by_trucks: false, periods: {} }, materials: [],
    packing: { is_enabled: true, cwt_options: [], periods: {} }, distance_rates: [], trip_travel: [],
    fuel_surcharges: [], shuttle_fees: [], storage_in_transit: [], additional_services: [],
    bulky_items: { categories: [], items: [] }, valuation: { options: [] }, pricing_method_defaults: [],
    auto_pricing_rules: [], not_to_exceed: [],
    auto_pricing_engine: { max_hours_per_job: null, ability_unit: 'cuft_per_hour', crew_ability: {}, minimum_crew: 1,
      crew_required: [], trucks_required: [], auto_add_resources: {} },
  };
}

export const withDefaults = (configuration) => ({ ...emptyConfiguration(), ...(configuration || {}) });

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Sections whose value differs from what was loaded, in a safe save order. */
export function changedSections(current, initial) {
  return SAVE_ORDER.filter((section) => !same(current[section], initial[section]));
}

/** The Default period followed by the custom periods, in their priority order. */
export function periodOptions(configuration) {
  return [{ id: DEFAULT_PERIOD, name: 'Default' }, ...(configuration.periods || []).map((p) => ({ id: p.id, name: p.name || p.id }))];
}

/** A short stable id for a new row, unique among ``taken``. */
export function newId(label, taken = []) {
  const base = String(label || 'item').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'item';
  const used = new Set(taken);
  let id = base;
  for (let n = 2; used.has(id); n += 1) id = `${base}_${n}`;
  return id;
}

/** Immutable set at a path: setIn(obj, ['a', 'b'], 1). */
export function setIn(target, path, value) {
  if (!path.length) return value;
  const [head, ...rest] = path;
  const source = target && typeof target === 'object' ? target : {};
  const copy = Array.isArray(source) ? [...source] : { ...source };
  copy[head] = setIn(source[head], rest, value);
  return copy;
}

export function getIn(target, path) {
  return path.reduce((node, key) => (node == null ? undefined : node[key]), target);
}

/** Moves list[from] to position ``to``. */
export function move(list, from, to) {
  if (to < 0 || to >= list.length || from === to) return list;
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

/** Labor matrix row keys: "crew" or "crew:trucks"; sorted by crew then trucks. */
export const rowKey = (crew, trucks, varyByTrucks) => (varyByTrucks ? `${crew}:${trucks}` : String(crew));
export function parseRowKey(key) {
  const [crew, trucks] = String(key).split(':');
  return { crew: Number(crew), trucks: trucks === undefined ? null : Number(trucks) };
}
export function sortRowKeys(keys) {
  return [...keys].sort((a, b) => {
    const x = parseRowKey(a); const y = parseRowKey(b);
    return x.crew - y.crew || (x.trucks ?? 0) - (y.trucks ?? 0);
  });
}
export function rowLabel(key) {
  const { crew, trucks } = parseRowKey(key);
  const movers = `${crew} mover${crew === 1 ? '' : 's'}`;
  if (trucks === null) return movers;
  return trucks === 0 ? `${movers}, labor only` : `${movers} + ${trucks} truck${trucks === 1 ? '' : 's'}`;
}
