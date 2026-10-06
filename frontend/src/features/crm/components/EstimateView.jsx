import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    Edit2,
    FileText,
    Calendar,
    User,
    Mail,
    Save,
    FileCheck,
    CreditCard,
    ClipboardList,
    Send,
    Clock,
    CheckCircle,
    Lock,
    Package,
    MapPin,
    Trash2,
    Building2,
    Hash,
    Calculator,
    Loader2,
    Copy,
    ExternalLink,
    RefreshCw,
    RotateCcw,
    AlertCircle,
    GripVertical,
    X,
    MessageSquare,
    ChevronDown,
    Map as MapIcon,
    Check,
    Globe,
    Truck,
    Users,
    ChevronLeft,
    ChevronRight,
    Fuel,
} from 'lucide-react';
import { Icon, PrimaryBtn, GhostBtn } from '../../../shared/ui/RedesignAtoms';
import AddressAutocomplete from '../../../shared/ui/AddressAutocomplete';
import {
    EstimateHeader, SummaryBento, EstimateTabs, ChargesTab, RouteTab, InventoryTab
} from './RedesignEstimateComponents';
import PaymentsPanel from './PaymentsPanel';
import api, {
    addEstimateCharge,
    applyEstimatePackage,
    createContract,
    createSalesActivity,
    createPaymentRequest,
    createEstimate,
    createRefund,
    deleteEstimateCharge,
    getContracts,
    getEstimates,
    getDocumentTemplates,
    getEstimateDiscountPresets,
    getEstimatePackages,
    getEstimateCatalogItems,
    getEstimatePortalInventory,
    getEstimatePortalTemplates,
    getBranches,
    getPaymentGateways,
    getPaymentRequests,
    getPayments,
    getRefunds,
    getJobs,
    getJobAccountingSummary,
    clearContractSignature,
    createEstimateManualPayment,
    updateEstimateManualPayment,
    deleteEstimateManualPayment,
    getPublicContractPortal,
    getOpportunityAvailability,
    markEstimateInventoryReviewed,
    createPaymentRequestAndSend,
    recalculateEstimate,
    regenerateOpportunityDocuments,
    requestEstimateInventory,
    requestEstimatePortal,
    resendEstimate,
    sendEstimate,
    sendContractForSignature,
    previewDocumentTemplate,
    clearEstimateSignatures,
    createCustomer,
    createOpportunityStop,
    deleteOpportunityStop,
    updateCustomer,
    updateEstimate,
    updateEstimateCharge,
    updateEstimateManualDetails,
    updateLead,
    updateOpportunity,
    updateOpportunityStop,
    listFiles,
    updateEstimatePortalInventory,
    uploadFile,
} from '../../../services/api';
import {
  computeChargeTotal,
  formatHoursAsCompactDuration,
  normalizeNumber,
  parseDurationToHours,
} from '../utils/chargeMath';
import { getPortalBaseUrl } from '../../../shared/utils/portalBaseUrl';

const Card = ({ children, className = '', noPadding = false }) => (
    <div className={`bg-card rounded-3xl border border-border/60 overflow-hidden ${noPadding ? '' : 'p-4 md:p-6'} ${className}`}>
        {children}
    </div>
);

const FormInput = ({ label, helperText = '', icon: IconComp, as = 'input', children, ...props }) => {
    const Comp = as;
    return (
        <div className="space-y-1.5">
            {label ? <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">{label}</label> : null}
            <div className="relative">
                {IconComp ? <IconComp size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black" /> : null}
                <Comp
                    className={`w-full ${IconComp ? 'pl-10' : 'px-4'} ${as === 'select' ? 'pr-10 appearance-none' : ''} py-2.5 bg-subtle/50 border border-border/80 rounded-xl text-sm font-bold text-black focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-black/50 ${as === 'textarea' ? 'min-h-[120px] resize-none' : ''} ${props.type === 'number' ? 'no-spinner' : ''} ${props.className || ''}`}
                    aria-label={props['aria-label'] || label || undefined}
                    {...props}
                >
                    {children}
                </Comp>
                {as === 'select' && (
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-black/60">
                        <ChevronDown size={16} />
                    </div>
                )}
            </div>
            {helperText ? <p className="text-[11px] font-medium leading-relaxed text-slate-500">{helperText}</p> : null}
        </div>
    );
};

const ChargeFormSection = ({ title, description, children }) => (
    <section className="space-y-4 rounded-2xl border border-ink-100 bg-ink-50/30 p-5">
        <div>
            <h4 className="text-sm font-black text-heading">{title}</h4>
            {description ? <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">{description}</p> : null}
        </div>
        {children}
    </section>
);

const ComputedTotalField = ({ label = 'Total', value = '0', helperText = '' }) => (
    <div className="space-y-1.5">
        <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">{label}</label>
        <div className="rounded-2xl border border-brand/15 bg-gradient-to-br from-[#eef6ff] via-white to-[#f8fbff] p-4 shadow-sm">
            <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                    <Calculator size={18} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Auto-calculated</div>
                    <div className="mt-1 flex items-baseline gap-1 overflow-hidden">
                        <span className="text-xs font-semibold text-slate-400">$</span>
                        <span className="truncate font-mono text-2xl font-black tracking-tight text-slate-900">
                            {Number(value || 0).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </span>
                    </div>
                </div>
            </div>
            {helperText ? <p className="mt-3 text-[11px] leading-relaxed text-slate-500">{helperText}</p> : null}
        </div>
    </div>
);

const money = (value) => {
    const amount = Number(value || 0);
    return Number.isFinite(amount)
        ? amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
        : '$0.00';
};

const moneyWithCurrency = (value, currency = 'USD') => {
    const amount = Number(value || 0);
    const safeCurrency = String(currency || 'USD').toUpperCase();
    return Number.isFinite(amount)
        ? amount.toLocaleString(undefined, { style: 'currency', currency: safeCurrency })
        : `${safeCurrency} 0.00`;
};

const normalizeWholeNumberInput = (value, fallback = '0') => {
  const raw = String(value ?? '').trim();
  if (raw === '') return '';
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return String(Math.max(0, Math.round(n)));
};

const normalizeDecimalInput = (value, fallback = '0') => {
  const raw = String(value ?? '').trim();
  if (raw === '') return '';
  const normalized = raw.replace(/[^0-9.+-]/g, '');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return fallback;
  const safeValue = Math.min(Math.max(0, parsed), 9999999999.99);
  // Match backend DecimalField(max_digits=12, decimal_places=2).
  return safeValue.toFixed(2);
};

const formatDateTime = (value) => {
    const d = value ? new Date(value) : null;
    if (!d || Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString();
};

const formatTimeLabel = (value) => {
    if (!value) return '';
    const text = String(value).trim();
    if (!text) return '';
    const parts = text.split(':');
    if (parts.length < 2) return text;
    let hours = Number(parts[0]);
    const minutes = parts[1];
    if (!Number.isFinite(hours)) return text;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours || 12;
    return `${hours}:${minutes} ${ampm}`;
};

const formatSchedulingWindow = (job) => {
    const start = formatTimeLabel(job?.arrival_window_start);
    const end = formatTimeLabel(job?.arrival_window_end);
    if (start && end) return `${start} - ${end}`;
    if (start) return `From ${start}`;
    if (end) return `Until ${end}`;
    return '';
};

const formatTimeInputValue = (value) => {
    const text = String(value || '').trim();
    if (!text) return '';
    const match = text.match(/^(\d{2}:\d{2})/);
    if (match) return match[1];
    const parts = text.split(':');
    if (parts.length >= 2 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
        return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }
    return '';
};

const formatSchedulerDate = (dateStr, options = { month: 'short', day: 'numeric' }) => {
    if (!dateStr) return '';
    const [year, month, day] = String(dateStr).slice(0, 10).split('-').map(Number);
    if (!year || !month || !day) return dateStr;
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', options);
};

const formatTimeAMPM = (timeStr) => {
    if (!timeStr) return '';
    const parts = String(timeStr).split(':');
    if (parts.length < 2) return String(timeStr);
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    if (!Number.isFinite(hours)) return String(timeStr);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours || 12;
    return `${hours}:${minutes} ${ampm}`;
};

const getOffsetDateStr = (dateStr, daysOffset) => {
    if (!dateStr) return '';
    const [year, month, day] = String(dateStr).slice(0, 10).split('-').map(Number);
    if (!year || !month || !day) return dateStr;
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + daysOffset);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const blankManualFields = {
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
};

const blankCharge = {
    name: '',
    category: 'other',
    category_preset_key: '',
    moving_labor_mode: 'hourly',
    trucks: '1',
    crew: '2',
    weight: '7000',
    labor_hours: '',
    labor_time_display: '30m',
    origin_to_destination_display: '0h',
    travel_time_display: '0h',
    handicap_origin_display: '0h',
    handicap_stops_display: '0h',
    handicap_destination_display: '0h',
    minimum_time_display: '0h',
    hourly_rate_override: '',
    flat_rate: '',
    included_hours: '',
    additional_hourly_rate: '',
    description: '',
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
    discount_mode: 'percent',
    discount_percent: '',
    discount_amount_input: '',
    quantity: '1',
    unit: 'flat',
    unit_price: '0',
    total_price: '0',
    taxable: true,
    quick_discount: '0',
    is_subtotal_overridden: false,
    subtotal_override: '',
};

const CHARGE_MODEL_FIELDS = new Set([
    'category',
    'name',
    'description',
    'calculation_type',
    'quantity',
    'unit_price',
    'total_price',
    'taxable',
    'commissionable',
    'sort_order',
    'metadata',
    'tax_rate',
    'taxable_amount',
    'tax_amount',
    'total_before_tax',
    'total_after_tax',
    'source_snapshot',
    'source_catalog_item',
    'is_manual_override',
]);

const pickChargeModelFields = (form) => {
    const source = form && typeof form === 'object' ? form : {};
    return Object.entries(source).reduce((acc, [key, value]) => {
        if (CHARGE_MODEL_FIELDS.has(key)) acc[key] = value;
        return acc;
    }, {});
};

const renderFuelSurchargeModalContent = (formState, setFormState, isEditing, onClose, onSave, chargeContext, catalogItems, isSaving) => {
    const category = normalizeChargeCategory(formState.category);
    const categorySchema = getCategoryFormSchemaFromCatalog(category, catalogItems);
    const presets = categorySchema?.presets || [];
    const preset = presets.find((p) => String(p.key) === String(formState.category_preset_key || ''));

    if (!preset) {
        return (
            <div className="relative w-full h-full md:h-auto max-h-screen md:max-h-[calc(100vh-4rem)] md:max-w-2xl rounded-none md:rounded-[2rem] border-0 md:border border-ink-100 bg-white shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between gap-4 px-5 md:px-8 py-4 md:py-5 border-b border-ink-100 bg-gradient-to-r from-brand-tint/20 to-white shrink-0">
                    <div className="flex items-center gap-3">
                        {!isEditing && (
                            <button
                                type="button"
                                onClick={() => setFormState(p => ({ ...p, category: 'other' }))}
                                className="p-1.5 rounded-full text-slate-500 hover:text-heading hover:bg-page transition-colors cursor-pointer"
                                aria-label="Back"
                            >
                                <ChevronLeft size={20} />
                            </button>
                        )}
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Fuel size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-heading font-black text-heading leading-tight">
                                {isEditing ? 'Edit' : 'Add'} Fuel Surcharge
                            </h3>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-full text-ink-400 hover:text-heading hover:bg-page transition-colors cursor-pointer"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Preset List */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-white py-2">
                    {presets.map((p) => (
                        <button
                            key={p.key}
                            type="button"
                            onClick={() => {
                                setFormState(prev => ({
                                    ...prev,
                                    category_preset_key: p.key,
                                    name: prev.name && prev.name !== 'Percentage' && prev.name !== 'Flat Rate' && prev.name !== 'Mileage' ? prev.name : 'Fuel Surcharge',
                                    ...(p.mode === 'percentage' && (!prev.quantity || Number(prev.quantity) === 0 || Number(prev.quantity) === 1) ? { quantity: String(chargeContext?.estimateTotal || 0) } : {}),
                                }));
                            }}
                            className="w-full text-left px-8 py-5 hover:bg-slate-50 text-slate-700 font-semibold transition-all text-sm focus:outline-none cursor-pointer"
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // Calculate subtotal and final values
    const subtotal = computeChargeTotal(formState, chargeContext, { presetMode: preset.mode });
    const isPercent = formState.discount_mode !== 'amount';
    const discountVal = isPercent
        ? subtotal * (normalizeNumber(formState.discount_percent, 0) / 100)
        : normalizeNumber(formState.discount_amount_input, 0);
    const finalTotal = Math.max(0, subtotal - discountVal);

    return (
        <div className="relative w-full h-full md:h-auto max-h-screen md:max-h-[calc(100vh-4rem)] md:max-w-5xl rounded-none md:rounded-[2rem] border-0 md:border border-ink-100 bg-white shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 px-5 md:px-8 py-4 md:py-5 border-b border-ink-100 bg-gradient-to-r from-brand-tint/20 to-white shrink-0">
                <div className="flex items-center gap-3">
                    {!isEditing && (
                        <button
                            type="button"
                            onClick={() => setFormState(p => ({ ...p, category_preset_key: '' }))}
                            className="p-1.5 rounded-full text-slate-500 hover:text-heading hover:bg-page transition-colors cursor-pointer"
                            aria-label="Back"
                        >
                            <ChevronLeft size={20} />
                        </button>
                    )}
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Fuel size={20} />
                    </div>
                    <div>
                        <h3 className="text-xl font-heading font-black text-heading leading-tight">
                            {isEditing ? 'Edit' : 'Add'} Fuel Surcharge
                        </h3>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-full text-ink-400 hover:text-heading hover:bg-page transition-colors cursor-pointer"
                    aria-label="Close"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Scrollable Grid Layout */}
            <div className="flex-1 overflow-y-auto min-h-0 bg-white">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:h-full">
                    {/* Left Form Column */}
                    <div className="lg:col-span-7 p-5 md:p-8 space-y-5 md:space-y-6 lg:border-r border-ink-100 lg:overflow-y-auto lg:h-full">
                        {/* Charge Details Section */}
                        <ChargeFormSection title="Charge Details">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormInput
                                    label="Name *"
                                    value={formState.name}
                                    onChange={(e) => setFormState(p => ({ ...p, name: e.target.value }))}
                                    placeholder="e.g. Fuel Surcharge"
                                />

                            </div>
                            <FormInput
                                label="Description"
                                as="textarea"
                                value={formState.description}
                                onChange={(e) => setFormState(p => ({ ...p, description: e.target.value }))}
                                placeholder="Optional description for this charge..."
                            />
                        </ChargeFormSection>

                        {/* Surcharge Calculations Section */}
                        <ChargeFormSection title="Surcharge Calculations">
                            {preset.mode === 'mileage' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Number of Trucks *</label>
                                            <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={formState.trucks}
                                                    onChange={(e) => setFormState(p => ({ ...p, trucks: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                                <div className="flex items-center justify-center px-3 bg-slate-100 border-l border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                    <Truck size={16} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Mileage *</label>
                                            <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={formState.mileage}
                                                    onChange={(e) => setFormState(p => ({ ...p, mileage: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                                <div className="flex items-center justify-center px-3 bg-slate-100 border-l border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                    mi
                                                </div>
                                            </div>
                                            <p className="text-[11px] font-medium leading-relaxed text-slate-500">Includes origin to destination</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Cost per Mile *</label>
                                            <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <div className="flex items-center justify-center px-3 bg-slate-100 border-r border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                    $
                                                </div>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={formState.cost_per_mile}
                                                    onChange={(e) => setFormState(p => ({ ...p, cost_per_mile: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Min Cost *</label>
                                            <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <div className="flex items-center justify-center px-3 bg-slate-100 border-r border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                    $
                                                </div>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={formState.min_cost}
                                                    onChange={(e) => setFormState(p => ({ ...p, min_cost: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Included Miles *</label>
                                            <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <input
                                                    type="number"
                                                    value={formState.included_miles}
                                                    onChange={(e) => setFormState(p => ({ ...p, included_miles: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                                <div className="flex items-center justify-center px-3 bg-slate-100 border-l border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                    mi
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {preset.mode === 'flat' && (
                                <div className="space-y-1.5">
                                    <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Flat Fee *</label>
                                    <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                        <div className="flex items-center justify-center px-3 bg-slate-100 border-r border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                            $
                                        </div>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formState.unit_price}
                                            onChange={(e) => setFormState(p => ({ ...p, unit_price: e.target.value }))}
                                            className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                        />
                                    </div>
                                </div>
                            )}

                            {preset.mode === 'unit' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormInput
                                        label="Quantity *"
                                        type="number"
                                        value={formState.quantity}
                                        onChange={(e) => setFormState(p => ({ ...p, quantity: e.target.value }))}
                                    />
                                    <div className="space-y-1.5">
                                        <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Rate per Item *</label>
                                        <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                            <div className="flex items-center justify-center px-3 bg-slate-100 border-r border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                $
                                            </div>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={formState.unit_price}
                                                onChange={(e) => setFormState(p => ({ ...p, unit_price: e.target.value }))}
                                                className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {preset.mode === 'percentage' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Base Amount *</label>
                                        <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                            <div className="flex items-center justify-center px-3 bg-slate-100 border-r border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                $
                                            </div>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={formState.quantity}
                                                onChange={(e) => setFormState(p => ({ ...p, quantity: e.target.value }))}
                                                className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Percentage *</label>
                                        <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                            <input
                                                type="number"
                                                step="any"
                                                value={formState.percentage_rate}
                                                onChange={(e) => setFormState(p => ({ ...p, percentage_rate: e.target.value }))}
                                                className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                            />
                                            <div className="flex items-center justify-center px-3 bg-slate-100 border-l border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                %
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </ChargeFormSection>
                    </div>

                    {/* Right Summary Column */}
                    <div className="lg:col-span-5 p-5 md:p-8 bg-slate-50/50 lg:overflow-y-auto lg:h-full flex flex-col justify-between">
                        {/* Adjustments */}
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-3">
                                    <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Discount</label>
                                    <button
                                        type="button"
                                        onClick={() => setFormState(p => ({
                                            ...p,
                                            discount_mode: isPercent ? 'amount' : 'percent',
                                            discount_percent: '',
                                            discount_amount_input: '',
                                        }))}
                                        className="rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-xs font-extrabold text-brand hover:bg-brand/10 hover:text-brand-dark transition-colors focus:outline-none cursor-pointer"
                                    >
                                        {isPercent ? 'Switch to amount' : 'Switch to percent'}
                                    </button>
                                </div>
                                {isPercent ? (
                                    <div className="space-y-1.5">
                                        <div className="flex h-11 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                inputMode="decimal"
                                                value={formState.discount_percent}
                                                onChange={(e) => setFormState(p => ({ ...p, discount_percent: e.target.value }))}
                                                placeholder="Percent off"
                                                className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                            />
                                            <div className="flex items-center justify-center px-3 bg-slate-100 border-l border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                %
                                            </div>
                                        </div>
                                        <p className="text-[11px] font-medium text-slate-500">Use decimals if needed. The backend keeps cents.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        <div className="flex h-11 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                                            <div className="flex items-center justify-center px-3 bg-slate-100 border-r border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                $
                                            </div>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                inputMode="decimal"
                                                value={formState.discount_amount_input}
                                                onChange={(e) => setFormState(p => ({ ...p, discount_amount_input: e.target.value }))}
                                                placeholder="Discount amount"
                                                className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                            />
                                        </div>
                                        <p className="text-[11px] font-medium text-slate-500">Applied as a flat dollar amount before tax.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Pricing Summary Component */}
                        <div className="mt-6">
                            <ChargePricingSummary
                                form={{
                                    ...formState,
                                    mode: preset.mode,
                                }}
                                context={chargeContext}
                                catalogItems={catalogItems}
                                subtotal={subtotal}
                                discount={discountVal}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-5 md:p-6 bg-slate-50 border-t border-ink-100 shrink-0 rounded-b-none md:rounded-b-[2rem]">
                <GhostBtn onClick={onClose}>Cancel</GhostBtn>
                <PrimaryBtn onClick={onSave} disabled={isSaving || finalTotal <= 0}>
                    {isSaving ? 'Saving...' : (isEditing ? 'Save Changes' : '+ Add New')}
                </PrimaryBtn>
            </div>
        </div>
    );
};

const renderTransportationModalContent = (formState, setFormState, isEditing, onClose, onSave, chargeContext, catalogItems, inventorySummary, isSaving) => {
    const category = normalizeChargeCategory(formState.category);
    const categorySchema = getCategoryFormSchemaFromCatalog(category, catalogItems);
    const presets = categorySchema?.presets || [];
    const preset = presets.find((p) => String(p.key) === String(formState.category_preset_key || ''));

    if (!preset) {
        return (
            <div className="relative w-full h-full md:h-auto max-h-screen md:max-h-[calc(100vh-4rem)] md:max-w-2xl rounded-none md:rounded-[2rem] border-0 md:border border-ink-100 bg-white shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between gap-4 px-5 md:px-8 py-4 md:py-5 border-b border-ink-100 bg-gradient-to-r from-brand-tint/20 to-white shrink-0">
                    <div className="flex items-center gap-3">
                        {!isEditing && (
                            <button
                                type="button"
                                onClick={() => setFormState(p => ({ ...p, category: 'other' }))}
                                className="p-1.5 rounded-full text-slate-500 hover:text-heading hover:bg-page transition-colors cursor-pointer"
                                aria-label="Back"
                            >
                                <ChevronLeft size={20} />
                            </button>
                        )}
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Truck size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-heading font-black text-heading leading-tight">
                                {isEditing ? 'Edit' : 'Add'} Transportation
                            </h3>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-full text-ink-400 hover:text-heading hover:bg-page transition-colors cursor-pointer"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Preset List */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-white py-2">
                    {presets.map((p) => (
                        <button
                            key={p.key}
                            type="button"
                            onClick={() => {
                                setFormState(prev => ({
                                    ...prev,
                                    category_preset_key: p.key,
                                    name: prev.name || (p.key === 'mileage' ? 'Distance Charge' : 'Flat Transportation'),
                                    unit_price: p.key === 'flat_truck' ? '2200' : '0',
                                    cost_per_mile: p.key === 'mileage' ? '1.10' : '0',
                                    mileage: p.key === 'mileage' ? String(chargeContext?.distanceMiles || '53.65') : '',
                                    quantity: p.key === 'flat_truck' ? '1' : '1',
                                    trucks: '1',
                                    crew: '2',
                                    labor_time_display: p.key === 'mileage' ? '8h' : '0h',
                                    weight: String(inventorySummary?.totalWeightLbs || '7000'),
                                    min_cost: p.key === 'mileage' ? '0' : '',
                                    included_miles: p.key === 'mileage' ? '0' : '',
                                    source_catalog_item: '',
                                }));
                            }}
                            className="w-full text-left px-8 py-5 hover:bg-slate-50 text-slate-700 font-semibold transition-all text-sm focus:outline-none cursor-pointer"
                        >
                            {p.label === 'Flat Per Truck' ? 'Flat Rate' : p.label === 'Mileage' ? 'Distance Rate' : p.label}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    const subtotal = formState.is_subtotal_overridden
        ? Number(formState.subtotal_override || 0)
        : computeChargeTotal(formState, chargeContext, { presetMode: preset.mode });

    const isPercent = formState.discount_mode !== 'amount';
    const discountVal = isPercent
        ? subtotal * (normalizeNumber(formState.discount_percent, 0) / 100)
        : normalizeNumber(formState.discount_amount_input, 0);
    const finalTotal = Math.max(0, subtotal - discountVal);

    const isMileage = preset.mode === 'mileage';
    const transCatalogItems = catalogItems.filter(item => {
        if (normalizeChargeCategory(item.category) !== 'transportation') return false;
        const nameLower = (item.name || '').toLowerCase();
        const unitLower = (item.unit || '').toLowerCase();
        const isMileageItem = unitLower === 'mi' || unitLower === 'mile' || nameLower.includes('mile') || nameLower.includes('distance');
        return isMileage ? isMileageItem : !isMileageItem;
    });

    return (
        <div className="relative w-full h-full md:h-auto max-h-screen md:max-h-[calc(100vh-4rem)] md:max-w-5xl rounded-none md:rounded-[2rem] border-0 md:border border-ink-100 bg-white shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 px-5 md:px-8 py-4 md:py-5 border-b border-ink-100 bg-gradient-to-r from-brand-tint/20 to-white shrink-0">
                <div className="flex items-center gap-3">
                    {!isEditing && (
                        <button
                            type="button"
                            onClick={() => setFormState(p => ({ ...p, category_preset_key: '' }))}
                            className="p-1.5 rounded-full text-slate-500 hover:text-heading hover:bg-page transition-colors cursor-pointer"
                            aria-label="Back"
                        >
                            <ChevronLeft size={20} />
                        </button>
                    )}
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Truck size={20} />
                    </div>
                    <div>
                        <h3 className="text-xl font-heading font-black text-heading leading-tight">
                            {isEditing ? 'Edit' : 'Add'} Transportation - {preset.mode === 'mileage' ? 'Distance Rate' : 'Flat Rate'}
                        </h3>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-full text-ink-400 hover:text-heading hover:bg-page transition-colors cursor-pointer"
                    aria-label="Close"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Scrollable Grid Layout */}
            <div className="flex-1 overflow-y-auto min-h-0 bg-white">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:h-full">
                    {/* Left Form Column */}
                    <div className="lg:col-span-7 p-5 md:p-8 space-y-5 md:space-y-6 lg:border-r border-ink-100 lg:overflow-y-auto lg:h-full">
                        {/* Charge Details Section */}
                        <ChargeFormSection title="Charge Details">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormInput
                                    label="Name *"
                                    value={formState.name}
                                    onChange={(e) => setFormState(p => ({ ...p, name: e.target.value }))}
                                    placeholder={preset.mode === 'mileage' ? "e.g. Distance Charge" : "e.g. Flat Transportation"}
                                />
                                <div className="space-y-1.5">
                                    <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Rate *</label>
                                    <div className="relative">
                                        <select
                                            value={formState.source_catalog_item || ''}
                                            onChange={(e) => {
                                                const selected = transCatalogItems.find(item => String(item.id) === String(e.target.value));
                                                setFormState(p => {
                                                    const priceStr = selected ? String(selected.default_unit_price ?? selected.unit_price ?? 0) : '0';
                                                    if (preset.mode === 'mileage') {
                                                        return {
                                                            ...p,
                                                            source_catalog_item: e.target.value,
                                                            name: selected ? selected.name : p.name,
                                                            cost_per_mile: selected ? priceStr : p.cost_per_mile,
                                                        };
                                                    } else {
                                                        return {
                                                            ...p,
                                                            source_catalog_item: e.target.value,
                                                            name: selected ? selected.name : p.name,
                                                            unit_price: selected ? priceStr : p.unit_price,
                                                        };
                                                    }
                                                });
                                            }}
                                            className="w-full px-4 pr-10 py-2.5 bg-subtle/50 border border-border/80 rounded-xl text-sm font-bold text-black focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none h-11"
                                        >
                                            <option value="">Rate</option>
                                            {transCatalogItems.map(item => (
                                                <option key={item.id} value={item.id}>{item.name}</option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-black/60">
                                            <ChevronDown size={16} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <FormInput
                                label="Description"
                                as="textarea"
                                value={formState.description}
                                onChange={(e) => setFormState(p => ({ ...p, description: e.target.value }))}
                                placeholder="Optional description for this charge..."
                            />
                        </ChargeFormSection>

                        {/* Transportation Calculations Section */}
                        <ChargeFormSection title="Transportation Calculations">
                            {preset.mode === 'mileage' ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Weight *</label>
                                            <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <input
                                                    type="number"
                                                    value={formState.weight}
                                                    onChange={(e) => setFormState(p => ({ ...p, weight: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                                <div className="flex items-center justify-center px-3 bg-slate-100 border-l border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                    lb
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Distance *</label>
                                            <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={formState.mileage}
                                                    onChange={(e) => setFormState(p => ({ ...p, mileage: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                                <div className="flex items-center justify-center px-3 bg-slate-100 border-l border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                    mi
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Number of Trucks *</label>
                                            <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={formState.trucks}
                                                    onChange={(e) => setFormState(p => ({ ...p, trucks: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                                <div className="flex items-center justify-center px-3 bg-slate-100 border-l border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                    <Truck size={16} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Number of Crew *</label>
                                            <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={formState.crew}
                                                    onChange={(e) => setFormState(p => ({ ...p, crew: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                                <div className="flex items-center justify-center px-3 bg-slate-100 border-l border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                    <Users size={16} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Duration *</label>
                                            <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <input
                                                    type="text"
                                                    value={formState.labor_time_display}
                                                    onChange={(e) => setFormState(p => ({ ...p, labor_time_display: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                                <div className="flex items-center justify-center px-3 bg-slate-100 border-l border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                    <Clock size={16} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Rate per Mile *</label>
                                            <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <div className="flex items-center justify-center px-3 bg-slate-100 border-r border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                    $
                                                </div>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={formState.cost_per_mile}
                                                    onChange={(e) => setFormState(p => ({ ...p, cost_per_mile: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Min Cost *</label>
                                            <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <div className="flex items-center justify-center px-3 bg-slate-100 border-r border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                    $
                                                </div>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={formState.min_cost}
                                                    onChange={(e) => setFormState(p => ({ ...p, min_cost: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Included Miles *</label>
                                            <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <input
                                                    type="number"
                                                    value={formState.included_miles}
                                                    onChange={(e) => setFormState(p => ({ ...p, included_miles: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                                <div className="flex items-center justify-center px-3 bg-slate-100 border-l border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                    mi
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Number of Trucks *</label>
                                            <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={preset.mode === 'flat_truck' ? formState.quantity : formState.trucks}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setFormState(p => preset.mode === 'flat_truck' ? ({ ...p, quantity: val }) : ({ ...p, trucks: val }));
                                                    }}
                                                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                                <div className="flex items-center justify-center px-3 bg-slate-100 border-l border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                    <Truck size={16} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Number of Crew *</label>
                                            <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={formState.crew}
                                                    onChange={(e) => setFormState(p => ({ ...p, crew: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                                <div className="flex items-center justify-center px-3 bg-slate-100 border-l border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                    <Users size={16} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Duration *</label>
                                            <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <input
                                                    type="text"
                                                    value={formState.labor_time_display}
                                                    onChange={(e) => setFormState(p => ({ ...p, labor_time_display: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                                <div className="flex items-center justify-center px-3 bg-slate-100 border-l border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                    <Clock size={16} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Amount *</label>
                                            <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <div className="flex items-center justify-center px-3 bg-slate-100 border-r border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                    $
                                                </div>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    placeholder="Flat rate amount"
                                                    value={formState.unit_price}
                                                    onChange={(e) => setFormState(p => ({ ...p, unit_price: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </ChargeFormSection>
                    </div>

                    {/* Right Summary Column */}
                    <div className="lg:col-span-5 p-5 md:p-8 bg-slate-50/50 lg:overflow-y-auto lg:h-full flex flex-col justify-between">
                        {/* Adjustments */}
                        <div className="space-y-5">
                            {/* Subtotal Override */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Subtotal</label>
                                    <button
                                        type="button"
                                        onClick={() => setFormState(p => ({
                                            ...p,
                                            is_subtotal_overridden: !p.is_subtotal_overridden,
                                            subtotal_override: p.is_subtotal_overridden ? '' : String(subtotal)
                                        }))}
                                        className="text-xs font-extrabold text-brand hover:text-brand-dark transition-colors focus:outline-none cursor-pointer"
                                    >
                                        {formState.is_subtotal_overridden ? 'Use Calc' : 'Override'}
                                    </button>
                                </div>
                                {formState.is_subtotal_overridden ? (
                                    <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                        <div className="flex items-center justify-center px-3 bg-slate-100 border-r border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                            $
                                        </div>
                                        <input
                                            type="number"
                                            value={formState.subtotal_override}
                                            onChange={(e) => setFormState(p => ({ ...p, subtotal_override: e.target.value }))}
                                            className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between h-11 px-4 rounded-xl border border-slate-200 bg-slate-100 text-sm font-bold text-slate-700">
                                        <span>Calculated Subtotal</span>
                                        <span>${subtotal.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Discount */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-3">
                                    <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Discount</label>
                                    <button
                                        type="button"
                                        onClick={() => setFormState(p => ({
                                            ...p,
                                            discount_mode: isPercent ? 'amount' : 'percent',
                                            discount_percent: '',
                                            discount_amount_input: '',
                                        }))}
                                        className="rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-xs font-extrabold text-brand hover:bg-brand/10 hover:text-brand-dark transition-colors focus:outline-none cursor-pointer"
                                    >
                                        {isPercent ? 'Switch to amount' : 'Switch to percent'}
                                    </button>
                                </div>
                                {isPercent ? (
                                    <div className="space-y-1.5">
                                        <div className="flex h-11 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                inputMode="decimal"
                                                value={formState.discount_percent}
                                                onChange={(e) => setFormState(p => ({ ...p, discount_percent: e.target.value }))}
                                                placeholder="Percent off"
                                                className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                            />
                                            <div className="flex items-center justify-center px-3 bg-slate-100 border-l border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                %
                                            </div>
                                        </div>
                                        <p className="text-[11px] font-medium text-slate-500">Use decimals if needed. The backend keeps cents.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        <div className="flex h-11 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                                            <div className="flex items-center justify-center px-3 bg-slate-100 border-r border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                $
                                            </div>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                inputMode="decimal"
                                                value={formState.discount_amount_input}
                                                onChange={(e) => setFormState(p => ({ ...p, discount_amount_input: e.target.value }))}
                                                placeholder="Discount amount"
                                                className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                            />
                                        </div>
                                        <p className="text-[11px] font-medium text-slate-500">Applied as a flat dollar amount before tax.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Pricing Summary Component */}
                        <div className="mt-6">
                            <ChargePricingSummary
                                form={{
                                    ...formState,
                                    mode: preset.mode,
                                }}
                                context={chargeContext}
                                catalogItems={catalogItems}
                                subtotal={subtotal}
                                discount={discountVal}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 p-5 md:p-6 bg-slate-50 border-t border-ink-100 shrink-0 rounded-b-none md:rounded-b-[2rem]">
                <GhostBtn onClick={onClose}>Cancel</GhostBtn>
                <PrimaryBtn onClick={onSave} disabled={isSaving} loading={isSaving}>
                    {isEditing ? 'Save Changes' : '+ Add New'}
                </PrimaryBtn>
            </div>
        </div>
    );
};

const renderPackingModalContent = (formState, setFormState, isEditing, onClose, onSave, chargeContext, catalogItems, inventorySummary, isSaving) => {
    const category = normalizeChargeCategory(formState.category);
    const categorySchema = getCategoryFormSchemaFromCatalog(category, catalogItems);
    const presets = categorySchema?.presets || [];
    const preset = presets.find((p) => String(p.key) === String(formState.category_preset_key || ''));

    if (!preset) {
        return (
            <div className="relative w-full h-full md:h-auto max-h-screen md:max-h-[calc(100vh-4rem)] md:max-w-2xl rounded-none md:rounded-[2rem] border-0 md:border border-ink-100 bg-white shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between gap-4 px-5 md:px-8 py-4 md:py-5 border-b border-ink-100 bg-gradient-to-r from-brand-tint/20 to-white shrink-0">
                    <div className="flex items-center gap-3">
                        {!isEditing && (
                            <button
                                type="button"
                                onClick={() => setFormState(p => ({ ...p, category: 'other' }))}
                                className="p-1.5 rounded-full text-slate-500 hover:text-heading hover:bg-page transition-colors cursor-pointer"
                                aria-label="Back"
                            >
                                <ChevronLeft size={20} />
                            </button>
                        )}
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Package size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-heading font-black text-heading leading-tight">
                                {isEditing ? 'Edit' : 'Add'} Packing
                            </h3>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-full text-ink-400 hover:text-heading hover:bg-page transition-colors cursor-pointer"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Preset List */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-white py-2">
                    {presets.map((p) => (
                        <button
                            key={p.key}
                            type="button"
                            onClick={() => {
                                setFormState(prev => ({
                                    ...prev,
                                    category_preset_key: p.key,
                                    name: prev.name || (p.key === 'hourly_labor' ? 'Packing Labor' : p.key === 'flat_plus_hourly' ? 'Flat Packing Plus Hourly' : p.key === 'by_container' ? 'Container Packing' : 'Cwt Packing'),
                                    unit_price: p.key === 'hourly_labor' ? '60.00' : '0.00',
                                    flat_rate: p.key === 'flat_plus_hourly' ? '500.00' : '0.00',
                                    included_hours: p.key === 'flat_plus_hourly' ? '4' : '0',
                                    additional_hourly_rate: p.key === 'flat_plus_hourly' ? '65.00' : '0.00',
                                    quantity: p.key === 'by_container' ? '10' : '1',
                                    crew: '2',
                                    labor_time_display: p.key === 'hourly_labor' ? '4h' : p.key === 'flat_plus_hourly' ? '6h' : '0h',
                                    weight: String(inventorySummary?.totalWeightLbs || '7000'),
                                    source_catalog_item: '',
                                }));
                            }}
                            className="w-full text-left px-8 py-5 hover:bg-slate-50 text-slate-700 font-semibold transition-all text-sm focus:outline-none cursor-pointer"
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    const subtotal = formState.is_subtotal_overridden
        ? Number(formState.subtotal_override || 0)
        : computeChargeTotal(formState, chargeContext, { presetMode: preset.mode });

    const isPercent = formState.discount_mode !== 'amount';
    const discountVal = isPercent
        ? subtotal * (normalizeNumber(formState.discount_percent, 0) / 100)
        : normalizeNumber(formState.discount_amount_input, 0);
    const finalTotal = Math.max(0, subtotal - discountVal);

    const packingCatalogItems = catalogItems.filter(item => normalizeChargeCategory(item.category) === 'packing');

    return (
        <div className="relative w-full h-full md:h-auto max-h-screen md:max-h-[calc(100vh-4rem)] md:max-w-5xl rounded-none md:rounded-[2rem] border-0 md:border border-ink-100 bg-white shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 px-5 md:px-8 py-4 md:py-5 border-b border-ink-100 bg-gradient-to-r from-brand-tint/20 to-white shrink-0">
                <div className="flex items-center gap-3">
                    {!isEditing && (
                        <button
                            type="button"
                            onClick={() => setFormState(p => ({ ...p, category_preset_key: '' }))}
                            className="p-1.5 rounded-full text-slate-500 hover:text-heading hover:bg-page transition-colors cursor-pointer"
                            aria-label="Back"
                        >
                            <ChevronLeft size={20} />
                        </button>
                    )}
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Package size={20} />
                    </div>
                    <div>
                        <h3 className="text-xl font-heading font-black text-heading leading-tight">
                            {isEditing ? 'Edit' : 'Add'} Packing - {preset.label}
                        </h3>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-full text-ink-400 hover:text-heading hover:bg-page transition-colors cursor-pointer"
                    aria-label="Close"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Scrollable Grid Layout */}
            <div className="flex-1 overflow-y-auto min-h-0 bg-white">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:h-full">
                    {/* Left Form Column */}
                    <div className="lg:col-span-7 p-5 md:p-8 space-y-5 md:space-y-6 lg:border-r border-ink-100 lg:overflow-y-auto lg:h-full">
                        {/* Charge Details Section */}
                        <ChargeFormSection title="Charge Details">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormInput
                                    label="Name *"
                                    value={formState.name}
                                    onChange={(e) => setFormState(p => ({ ...p, name: e.target.value }))}
                                    placeholder="e.g. Container Packing"
                                />
                                <div className="space-y-1.5">
                                    <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Rate Preset *</label>
                                    <div className="relative">
                                        <select
                                            value={formState.source_catalog_item || ''}
                                            onChange={(e) => {
                                                const selected = packingCatalogItems.find(item => String(item.id) === String(e.target.value));
                                                setFormState(p => {
                                                    const priceStr = selected ? String(selected.default_unit_price ?? selected.unit_price ?? 0) : '0';
                                                    return {
                                                        ...p,
                                                        source_catalog_item: e.target.value,
                                                        name: selected ? selected.name : p.name,
                                                        ...(preset.key === 'hourly_labor' ? { unit_price: priceStr } : {}),
                                                        ...(preset.key === 'flat_plus_hourly' ? { flat_rate: priceStr } : {}),
                                                        ...(preset.key === 'by_container' ? { unit_price: priceStr } : {}),
                                                        ...(preset.key === 'by_cwt' ? { unit_price: priceStr } : {}),
                                                    };
                                                });
                                            }}
                                            className="w-full px-4 pr-10 py-2.5 bg-subtle/50 border border-border/80 rounded-xl text-sm font-bold text-black focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none h-11"
                                        >
                                            <option value="">Choose Catalog Rate</option>
                                            {packingCatalogItems.map(item => (
                                                <option key={item.id} value={item.id}>{item.name}</option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-black/60">
                                            <ChevronDown size={16} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <FormInput
                                label="Description"
                                as="textarea"
                                value={formState.description}
                                onChange={(e) => setFormState(p => ({ ...p, description: e.target.value }))}
                                placeholder="Optional description for this charge..."
                            />
                        </ChargeFormSection>

                        {/* Packing Calculations Section */}
                        <ChargeFormSection title="Packing Calculations">
                            {preset.key === 'hourly_labor' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Packers *</label>
                                            <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={formState.crew}
                                                    onChange={(e) => setFormState(p => ({ ...p, crew: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                                <div className="flex items-center justify-center px-3 bg-slate-100 border-l border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                    <Users size={16} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Duration *</label>
                                            <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <input
                                                    type="text"
                                                    value={formState.labor_time_display}
                                                    onChange={(e) => setFormState(p => ({ ...p, labor_time_display: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                                <div className="flex items-center justify-center px-3 bg-slate-100 border-l border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                    <Clock size={16} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Hourly Rate *</label>
                                            <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <div className="flex items-center justify-center px-3 bg-slate-100 border-r border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                    $
                                                </div>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={formState.unit_price}
                                                    onChange={(e) => setFormState(p => ({ ...p, unit_price: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {preset.key === 'flat_plus_hourly' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Flat Rate *</label>
                                            <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <div className="flex items-center justify-center px-3 bg-slate-100 border-r border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                    $
                                                </div>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={formState.flat_rate}
                                                    onChange={(e) => setFormState(p => ({ ...p, flat_rate: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Included Hours *</label>
                                            <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <input
                                                    type="number"
                                                    value={formState.included_hours}
                                                    onChange={(e) => setFormState(p => ({ ...p, included_hours: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                                <div className="flex items-center justify-center px-3 bg-slate-100 border-l border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                    h
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Total Hours *</label>
                                            <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <input
                                                    type="text"
                                                    value={formState.labor_time_display}
                                                    onChange={(e) => setFormState(p => ({ ...p, labor_time_display: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                                <div className="flex items-center justify-center px-3 bg-slate-100 border-l border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                    <Clock size={16} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Addl Hourly Rate *</label>
                                            <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <div className="flex items-center justify-center px-3 bg-slate-100 border-r border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                    $
                                                </div>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={formState.additional_hourly_rate}
                                                    onChange={(e) => setFormState(p => ({ ...p, additional_hourly_rate: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Packers *</label>
                                            <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={formState.crew}
                                                    onChange={(e) => setFormState(p => ({ ...p, crew: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                                <div className="flex items-center justify-center px-3 bg-slate-100 border-l border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                    <Users size={16} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {preset.key === 'by_container' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Containers *</label>
                                            <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={formState.quantity}
                                                    onChange={(e) => setFormState(p => ({ ...p, quantity: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                                <div className="flex items-center justify-center px-3 bg-slate-100 border-l border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                    qty
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Price per Container *</label>
                                            <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <div className="flex items-center justify-center px-3 bg-slate-100 border-r border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                    $
                                                </div>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={formState.unit_price}
                                                    onChange={(e) => setFormState(p => ({ ...p, unit_price: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {preset.key === 'by_cwt' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Weight *</label>
                                            <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <input
                                                    type="number"
                                                    value={formState.weight}
                                                    onChange={(e) => setFormState(p => ({ ...p, weight: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                                <div className="flex items-center justify-center px-3 bg-slate-100 border-l border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                    lb
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Price per Cwt *</label>
                                            <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <div className="flex items-center justify-center px-3 bg-slate-100 border-r border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                    $
                                                </div>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={formState.unit_price}
                                                    onChange={(e) => setFormState(p => ({ ...p, unit_price: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </ChargeFormSection>
                    </div>

                    {/* Right Summary Column */}
                    <div className="lg:col-span-5 p-5 md:p-8 bg-slate-50/50 lg:overflow-y-auto lg:h-full flex flex-col justify-between">
                        {/* Adjustments */}
                        <div className="space-y-5">
                            {/* Subtotal Override */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Subtotal</label>
                                    <button
                                        type="button"
                                        onClick={() => setFormState(p => ({
                                            ...p,
                                            is_subtotal_overridden: !p.is_subtotal_overridden,
                                            subtotal_override: p.is_subtotal_overridden ? '' : String(subtotal)
                                        }))}
                                        className="text-xs font-extrabold text-brand hover:text-brand-dark transition-colors focus:outline-none cursor-pointer"
                                    >
                                        {formState.is_subtotal_overridden ? 'Use Calc' : 'Override'}
                                    </button>
                                </div>
                                {formState.is_subtotal_overridden ? (
                                    <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                        <div className="flex items-center justify-center px-3 bg-slate-100 border-r border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                            $
                                        </div>
                                        <input
                                            type="number"
                                            value={formState.subtotal_override}
                                            onChange={(e) => setFormState(p => ({ ...p, subtotal_override: e.target.value }))}
                                            className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between h-11 px-4 rounded-xl border border-slate-200 bg-slate-100 text-sm font-bold text-slate-700">
                                        <span>Calculated Subtotal</span>
                                        <span>${subtotal.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Discount */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Discount</label>
                                    <button
                                        type="button"
                                        onClick={() => setFormState(p => ({
                                            ...p,
                                            discount_mode: isPercent ? 'amount' : 'percent',
                                            discount_percent: '',
                                            discount_amount_input: '',
                                        }))}
                                        className="text-xs font-extrabold text-brand hover:text-brand-dark transition-colors focus:outline-none cursor-pointer"
                                    >
                                        {isPercent ? 'Change to Amount' : 'Change to Percent'}
                                    </button>
                                </div>
                                {isPercent ? (
                                    <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                        <input
                                            type="number"
                                            min="0"
                                            value={formState.discount_percent}
                                            onChange={(e) => setFormState(p => ({ ...p, discount_percent: e.target.value }))}
                                            placeholder="Discount percent"
                                            className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                        />
                                        <div className="flex items-center justify-center px-3 bg-slate-100 border-l border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                            %
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                        <div className="flex items-center justify-center px-3 bg-slate-100 border-r border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                            $
                                        </div>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formState.discount_amount_input}
                                            onChange={(e) => setFormState(p => ({ ...p, discount_amount_input: e.target.value }))}
                                            placeholder="Discount amount"
                                            className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Pricing Summary Component */}
                        <div className="mt-6">
                            <ChargePricingSummary
                                form={{
                                    ...formState,
                                    mode: preset.mode,
                                }}
                                context={chargeContext}
                                catalogItems={catalogItems}
                                subtotal={subtotal}
                                discount={discountVal}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 p-5 md:p-6 bg-slate-50 border-t border-ink-100 shrink-0 rounded-b-none md:rounded-b-[2rem]">
                <GhostBtn onClick={onClose}>Cancel</GhostBtn>
                <PrimaryBtn onClick={onSave} disabled={isSaving} loading={isSaving}>
                    {isEditing ? 'Save Changes' : '+ Add New'}
                </PrimaryBtn>
            </div>
        </div>
    );
};


const calculateMovingLaborCalculatedSubtotal = (form, context) => {
    const tempForm = { ...form, is_subtotal_overridden: false };
    return computeChargeTotal(tempForm, context, { presetMode: form.moving_labor_mode });
};

const renderMovingLaborModalContent = (formState, setFormState, isEditing, onClose, onSave, chargeContext, isSaving) => {
    // Calculate all display values
    const laborHours = parseDurationToHours(formState.labor_time_display, 0);
    const driveHours = parseDurationToHours(formState.origin_to_destination_display, 0);
    const travelHours = parseDurationToHours(formState.travel_time_display, 0);
    
    const estimatedTimeHours = laborHours + driveHours + travelHours;
    
    const handicapOrigin = parseDurationToHours(formState.handicap_origin_display, 0);
    const handicapStops = parseDurationToHours(formState.handicap_stops_display, 0);
    const handicapDest = parseDurationToHours(formState.handicap_destination_display, 0);
    
    const handicapTimeHours = handicapOrigin + handicapStops + handicapDest;
    const totalTimeHours = estimatedTimeHours + handicapTimeHours;
    
    const minTimeHours = parseDurationToHours(formState.minimum_time_display, 0);
    const billableTimeHours = formState.moving_labor_mode === 'flat_plus_hourly'
        ? Math.ceil(totalTimeHours)
        : Math.ceil(Math.max(totalTimeHours, minTimeHours));
        
    // Calculate subtotal
    const calculatedSubtotal = calculateMovingLaborCalculatedSubtotal(formState, chargeContext);
    const subtotal = formState.is_subtotal_overridden
        ? Number(formState.subtotal_override || 0)
        : calculatedSubtotal;
        
    // Calculate discount
    const discountAmount = formState.discount_mode === 'amount'
        ? Number(formState.discount_amount_input || 0)
        : subtotal * (Number(formState.discount_percent || 0) / 100);
        
    const finalTotal = Math.max(0, subtotal - discountAmount);

    return (
        <div className="relative w-full h-full md:h-auto max-h-screen md:max-h-[calc(100vh-4rem)] md:max-w-5xl rounded-none md:rounded-[2rem] border-0 md:border border-ink-100 bg-white shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 px-5 md:px-8 py-4 md:py-5 border-b border-ink-100 bg-gradient-to-r from-brand-tint/20 to-white shrink-0">
                <div className="flex items-center gap-3">
                    {!isEditing && (
                        <button
                            type="button"
                            onClick={() => setFormState(p => ({ ...p, category: 'other' }))}
                            className="p-1.5 rounded-full text-slate-500 hover:text-heading hover:bg-page transition-colors cursor-pointer"
                            aria-label="Back"
                        >
                            <ChevronLeft size={20} />
                        </button>
                    )}
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Clock size={20} />
                    </div>
                    <div>
                        <h3 className="text-xl font-heading font-black text-heading leading-tight">
                            {isEditing ? 'Edit' : 'Add'} Moving Labor
                        </h3>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-full text-ink-400 hover:text-heading hover:bg-page transition-colors cursor-pointer"
                    aria-label="Close"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Scrollable Grid Layout */}
            <div className="flex-1 overflow-y-auto min-h-0">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:h-full">
                    {/* Left Form Column */}
                    <div className="lg:col-span-7 p-5 md:p-8 space-y-5 md:space-y-6 lg:border-r border-ink-100 lg:overflow-y-auto lg:h-full">
                        {/* Charge Details */}
                        <ChargeFormSection title="Charge Details">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormInput
                                    label="Name *"
                                    value={formState.name}
                                    onChange={(e) => setFormState(p => ({ ...p, name: e.target.value }))}
                                    placeholder="e.g. Moving Labor"
                                />

                            </div>
                            <FormInput
                                label="Description"
                                as="textarea"
                                value={formState.description}
                                onChange={(e) => setFormState(p => ({ ...p, description: e.target.value }))}
                                placeholder="Optional description for this charge..."
                            />
                        </ChargeFormSection>

                        {/* Labor Pricing */}
                        <ChargeFormSection title="Labor Pricing">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Pricing Type</label>
                                    <div className="grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1 gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setFormState((p) => ({ ...p, moving_labor_mode: 'hourly' }))}
                                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${formState.moving_labor_mode === 'hourly' ? 'bg-brand text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                                        >
                                            Hourly
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormState((p) => ({ ...p, moving_labor_mode: 'flat_plus_hourly' }))}
                                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${formState.moving_labor_mode === 'flat_plus_hourly' ? 'bg-brand text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                                        >
                                            Flat Rate Plus Hourly
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Trucks *</label>
                                        <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                            <input
                                                type="number"
                                                min="0"
                                                value={formState.trucks}
                                                onChange={(e) => setFormState(p => ({ ...p, trucks: e.target.value }))}
                                                className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                            />
                                            <div className="flex items-center justify-center px-3 bg-slate-100 border-l border-slate-200 text-slate-400 shrink-0">
                                                <Truck size={16} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Crew *</label>
                                        <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                            <input
                                                type="number"
                                                min="0"
                                                value={formState.crew}
                                                onChange={(e) => setFormState(p => ({ ...p, crew: e.target.value }))}
                                                className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                            />
                                            <div className="flex items-center justify-center px-3 bg-slate-100 border-l border-slate-200 text-slate-400 shrink-0">
                                                <Users size={16} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            {formState.moving_labor_mode === 'flat_plus_hourly' ? 'Extra Rate *' : 'Hourly Rate *'}
                                        </label>
                                        <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                            <div className="flex items-center justify-center px-3 bg-slate-100 border-r border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                $
                                            </div>
                                            <input
                                                type="number"
                                                min="0"
                                                value={formState.moving_labor_mode === 'flat_plus_hourly' ? formState.additional_hourly_rate : formState.hourly_rate_override}
                                                onChange={(e) => setFormState(p => formState.moving_labor_mode === 'flat_plus_hourly'
                                                    ? ({ ...p, additional_hourly_rate: e.target.value })
                                                    : ({ ...p, hourly_rate_override: e.target.value })
                                                )}
                                                className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {formState.moving_labor_mode === 'flat_plus_hourly' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Flat Rate *</label>
                                            <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <div className="flex items-center justify-center px-3 bg-slate-100 border-r border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                    $
                                                </div>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={formState.flat_rate}
                                                    onChange={(e) => setFormState(p => ({ ...p, flat_rate: e.target.value }))}
                                                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Included Hours *</label>
                                            <div className="relative flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <input
                                                    type="text"
                                                    value={formState.included_hours}
                                                    onChange={(e) => setFormState(p => ({ ...p, included_hours: e.target.value }))}
                                                    className="w-full pl-3 pr-10 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-brand">
                                                    <Clock size={16} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {formState.moving_labor_mode === 'hourly' && (
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Minimum Time *</label>
                                        <div className="relative flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                            <input
                                                type="text"
                                                value={formState.minimum_time_display}
                                                onChange={(e) => setFormState(p => ({ ...p, minimum_time_display: e.target.value }))}
                                                className="w-full pl-3 pr-10 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                            />
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-brand">
                                                <Clock size={16} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ChargeFormSection>

                        {/* Time Details */}
                        <ChargeFormSection title="Time Details">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Estimated Time</div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Labor Time *</label>
                                            <div className="relative flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <input
                                                    type="text"
                                                    value={formState.labor_time_display}
                                                    onChange={(e) => setFormState(p => ({ ...p, labor_time_display: e.target.value }))}
                                                    className="w-full pl-3 pr-10 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-brand">
                                                    <Clock size={16} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Origin to Dest. *</label>
                                            <div className="relative flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <input
                                                    type="text"
                                                    value={formState.origin_to_destination_display}
                                                    onChange={(e) => setFormState(p => ({ ...p, origin_to_destination_display: e.target.value }))}
                                                    className="w-full pl-3 pr-10 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-brand">
                                                    <Clock size={16} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Travel Time *</label>
                                            <div className="relative flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <input
                                                    type="text"
                                                    value={formState.travel_time_display}
                                                    onChange={(e) => setFormState(p => ({ ...p, travel_time_display: e.target.value }))}
                                                    className="w-full pl-3 pr-10 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-brand">
                                                    <Clock size={16} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Handicap Time</div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Origin *</label>
                                            <div className="relative flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <input
                                                    type="text"
                                                    value={formState.handicap_origin_display}
                                                    onChange={(e) => setFormState(p => ({ ...p, handicap_origin_display: e.target.value }))}
                                                    className="w-full pl-3 pr-10 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-brand">
                                                    <Clock size={16} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Stops *</label>
                                            <div className="relative flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <input
                                                    type="text"
                                                    value={formState.handicap_stops_display}
                                                    onChange={(e) => setFormState(p => ({ ...p, handicap_stops_display: e.target.value }))}
                                                    className="w-full pl-3 pr-10 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-brand">
                                                    <Clock size={16} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Destination *</label>
                                            <div className="relative flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                                <input
                                                    type="text"
                                                    value={formState.handicap_destination_display}
                                                    onChange={(e) => setFormState(p => ({ ...p, handicap_destination_display: e.target.value }))}
                                                    className="w-full pl-3 pr-10 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-brand">
                                                    <Clock size={16} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ChargeFormSection>

                        {/* Adjustments */}
                        <ChargeFormSection title="Adjustments">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Subtotal Override</label>
                                        <button
                                            type="button"
                                            onClick={() => setFormState(p => ({
                                                ...p,
                                                is_subtotal_overridden: !p.is_subtotal_overridden,
                                                subtotal_override: p.is_subtotal_overridden ? '' : String(calculatedSubtotal)
                                            }))}
                                            className="text-xs font-extrabold text-brand hover:text-brand-dark transition-colors focus:outline-none cursor-pointer"
                                        >
                                            {formState.is_subtotal_overridden ? 'Reset' : 'Override'}
                                        </button>
                                    </div>
                                    {formState.is_subtotal_overridden ? (
                                        <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/20 focus-within:border-brand transition-all bg-white h-11">
                                            <div className="flex items-center justify-center px-3 bg-slate-100 border-r border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                $
                                            </div>
                                            <input
                                                type="number"
                                                min="0"
                                                value={formState.subtotal_override}
                                                onChange={(e) => setFormState(p => ({ ...p, subtotal_override: e.target.value }))}
                                                className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex border border-slate-200 rounded-lg bg-slate-50 h-11 items-center px-4 text-sm font-bold text-slate-600">
                                            {money(calculatedSubtotal)} (Auto-calculated)
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between gap-3">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Discount</label>
                                        <button
                                            type="button"
                                            onClick={() => setFormState(p => ({
                                                ...p,
                                                discount_mode: p.discount_mode === 'percent' ? 'amount' : 'percent'
                                            }))}
                                            className="rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-xs font-extrabold text-brand hover:bg-brand/10 hover:text-brand-dark transition-colors focus:outline-none cursor-pointer"
                                        >
                                            {formState.discount_mode === 'amount' ? 'Use %' : 'Use $'}
                                        </button>
                                    </div>
                                    {formState.discount_mode === 'amount' ? (
                                        <div className="space-y-1.5">
                                            <div className="flex h-11 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                                                <div className="flex items-center justify-center px-3 bg-slate-100 border-r border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                    $
                                                </div>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    inputMode="decimal"
                                                    value={formState.discount_amount_input}
                                                    onChange={(e) => setFormState(p => ({ ...p, discount_amount_input: e.target.value }))}
                                                    placeholder="Discount amount"
                                                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                            </div>
                                            <p className="text-[11px] font-medium text-slate-500">Applied as a flat dollar amount before tax.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5">
                                            <div className="flex h-11 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    inputMode="decimal"
                                                    value={formState.discount_percent}
                                                    onChange={(e) => setFormState(p => ({ ...p, discount_percent: e.target.value }))}
                                                    placeholder="Percent off"
                                                    className="w-full px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none bg-transparent"
                                                />
                                                <div className="flex items-center justify-center px-3 bg-slate-100 border-l border-slate-200 text-slate-500 font-semibold text-sm shrink-0">
                                                    %
                                                </div>
                                            </div>
                                            <p className="text-[11px] font-medium text-slate-500">Use decimals if needed. The backend keeps cents.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </ChargeFormSection>
                    </div>

                    {/* Right Summary Column */}
                    <div className="lg:col-span-5 p-5 md:p-8 bg-slate-50/50 lg:overflow-y-auto lg:h-full flex flex-col justify-between">
                        <div className="flex flex-col h-full rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-5 lg:justify-between">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 border border-blue-200/60">
                                        <Clock size={18} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border-blue-200/60">
                                            Moving Labor
                                        </span>
                                        <h4 className="font-extrabold text-slate-800 text-sm truncate mt-0.5">
                                            {formState?.name || 'Unnamed Charge'}
                                        </h4>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pricing Formula</div>
                                    <p className="text-xs font-semibold text-slate-600 leading-relaxed bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
                                        {formState.moving_labor_mode === 'flat_plus_hourly' ? (
                                            `Flat Rate $${Number(formState.flat_rate || 0).toFixed(2)} (includes ${formState.included_hours || '0h'}) + Extra hours @ $${Number(formState.additional_hourly_rate || 0).toFixed(2)}/hr`
                                        ) : (
                                            `${formState.crew || 2} crew / ${formState.trucks || 1} trucks @ $${Number(formState.hourly_rate_override || 0).toFixed(2)}/hr`
                                        )}
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Time Details</div>
                                    <div className="space-y-2 bg-white rounded-xl p-4 border border-slate-100 shadow-sm text-xs font-semibold">
                                        <div className="flex justify-between text-slate-500">
                                            <span>Labor / Orig-Dest / Travel</span>
                                            <span className="font-mono text-slate-900">
                                                {formState.labor_time_display || '0h'} / {formState.origin_to_destination_display || '0h'} / {formState.travel_time_display || '0h'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center pt-1.5 border-t border-dashed border-slate-100 text-slate-600 font-bold">
                                            <span>Total Estimated Time</span>
                                            <span className="font-mono text-slate-950">{formatHoursAsCompactDuration(estimatedTimeHours)}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-500 pt-1">
                                            <span>Handicap (Orig / Stops / Dest)</span>
                                            <span className="font-mono text-slate-900">
                                                {formState.handicap_origin_display || '0h'} / {formState.handicap_stops_display || '0h'} / {formState.handicap_destination_display || '0h'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center pt-1.5 border-t border-dashed border-slate-100 text-slate-600 font-bold">
                                            <span>Total Handicap Time</span>
                                            <span className="font-mono text-slate-950">{formatHoursAsCompactDuration(handicapTimeHours)}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 text-slate-800 font-extrabold">
                                            <span>Total Time</span>
                                            <span className="font-mono text-slate-950">{formatHoursAsCompactDuration(totalTimeHours)}</span>
                                        </div>
                                        {formState.moving_labor_mode === 'hourly' && (
                                            <div className="flex justify-between text-slate-500">
                                                <span>Minimum Time</span>
                                                <span className="font-mono text-slate-900">{formState.minimum_time_display || '0h'}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center pt-1.5 border-t border-double border-slate-200 text-brand font-black">
                                            <span>Billable Time</span>
                                            <span className="font-mono">{formatHoursAsCompactDuration(billableTimeHours)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Cost Breakdown</div>
                                    <div className="space-y-2 bg-white rounded-xl p-4 border border-slate-100 shadow-sm text-xs font-semibold">
                                        <div className="flex justify-between text-slate-500">
                                            <span>Base Charge Subtotal</span>
                                            <span className="font-mono text-slate-900">${subtotal.toFixed(2)}</span>
                                        </div>
                                        {discountAmount > 0 && (
                                            <div className="flex justify-between text-rose-600">
                                                <span>Discount Applied</span>
                                                <span className="font-mono">-${discountAmount.toFixed(2)}</span>
                                            </div>
                                        )}

                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5 pt-4 border-t border-slate-200">
                                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Estimated Total Price</div>
                                <div className="rounded-xl border border-brand/20 bg-gradient-to-br from-brand/5 via-white to-brand/5 p-3.5 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                                            <Calculator size={18} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Auto-calculated</div>
                                            <div className="mt-0.5 flex items-baseline gap-0.5 overflow-hidden">
                                                <span className="text-xs font-bold text-slate-500">$</span>
                                                <span className="truncate font-mono text-2xl font-black tracking-tight text-slate-900">
                                                    {finalTotal.toLocaleString('en-US', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-5 md:p-6 bg-slate-50 border-t border-ink-100 shrink-0 rounded-b-none md:rounded-b-[2rem]">
                <button
                    type="button"
                    onClick={onClose}
                    className="text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors focus:outline-none cursor-pointer"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={onSave}
                    disabled={isSaving}
                    className="px-6 py-2.5 rounded-lg bg-brand text-white font-bold text-sm shadow-sm hover:bg-brand-dark transition-all focus:outline-none cursor-pointer disabled:opacity-50"
                >
                    {isEditing ? 'Save Changes' : '+ Add New'}
                </button>
            </div>
        </div>
    );
};

const DEFAULT_CATEGORY_FORM_SCHEMAS = {
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
            { key: 'flat_truck', label: 'Flat Rate', mode: 'flat_truck' },
            { key: 'mileage', label: 'Distance Rate', mode: 'mileage' },
        ],
    },
    materials: { version: 1, fields: [{ key: 'qty' }, { key: 'rate' }] },
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
    additional_lbs: { version: 1, fields: [{ key: 'qty' }, { key: 'rate' }] },
    additional_lbs: { version: 1, fields: [{ key: 'qty' }, { key: 'rate' }] },
    storage_in_transit: { version: 1, fields: [{ key: 'qty' }, { key: 'rate' }] },
    packing: {
        version: 1,
        presets: [
            { key: 'hourly_labor', label: 'Hourly', mode: 'hourly_labor' },
            { key: 'flat_plus_hourly', label: 'Flat Rate Plus Hourly', mode: 'flat_plus_hourly' },
            { key: 'by_container', label: 'By Container', mode: 'unit' },
            { key: 'by_cwt', label: 'By Cwt', mode: 'weight' },
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
    discount: { version: 1, fields: [{ key: 'discount_mode' }, { key: 'amount' }] },
    bulky_item: { version: 1, fields: [{ key: 'qty' }, { key: 'rate' }] },
    shuttle_fees: { version: 1, fields: [{ key: 'qty' }, { key: 'rate' }] },
    other: { version: 1, fields: [{ key: 'qty' }, { key: 'rate' }] },
};

const blankInventoryItem = {
    item_name: '',
    quantity: '1',
    room_name: 'General',
    notes: '',
    is_fragile: false,
    is_special: false,
    weight_lbs_each: '0',
};

export const getInventoryPhotoRequestSpecs = ({ estimateId, opportunityId, leadId }) => {
    const specs = [];
    const inventoryCategories = ['descriptive-inventory', 'inventory-photos', 'inventory'];
    if (estimateId) {
        for (const category of inventoryCategories) {
            specs.push({ target_type: 'estimates.estimate', target_id: String(estimateId), category });
        }
    }
    if (opportunityId) {
        for (const category of inventoryCategories) {
            specs.push({ target_type: 'sales.opportunity', target_id: String(opportunityId), category });
        }
    }
    if (leadId) {
        for (const category of inventoryCategories) {
            specs.push({ target_type: 'leads.lead', target_id: String(leadId), category });
        }
    }
    return specs;
};

const unitOptions = [
    { value: 'no', label: 'No.' },
    { value: 'hr', label: 'Hour' },
    { value: 'day', label: 'Day' },
    { value: 'mi', label: 'Mile' },
    { value: 'km', label: 'Kilometer' },
    { value: 'lb', label: 'Pound' },
    { value: 'kg', label: 'Kilogram' },
    { value: 'ft', label: 'Foot' },
    { value: 'm', label: 'Meter' },
    { value: 'pct', label: 'Percent' },
    { value: 'flat', label: 'Flat' },
];


const estimateDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
};

const displayDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString();
};

const titleCase = (value) =>
    String(value || '')
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (match) => match.toUpperCase());

const prettyCategoryName = (value) =>
    titleCase(
        String(value || 'other')
            .replaceAll('_', ' ')
            .trim() || 'Other'
    );

const isDiscountCharge = (category) => String(category || '') === 'discount';

const LEGACY_CHARGE_CATEGORY_ALIASES = {
    accessorial: 'additional_services',
    'descriptive-inventory': 'other',
    descriptive_inventory: 'other',
    fuel: 'fuel_surcharge',
    misc: 'other',
    miscellaneous: 'other',
    truck: 'transportation',
    'trip-travel': 'trip_and_travel',
    trip_travel: 'trip_and_travel',
};

const VALID_CHARGE_CATEGORIES = new Set([
    'moving_labor',
    'transportation',
    'materials',
    'trip_and_travel',
    'valuation',
    'storage_in_transit',
    'packing',
    'additional_services',
    'additional_lbs',
    'fuel_surcharge',
    'discount',
    'bulky_item',
    'shuttle_fees',
    'other',
]);

const CHARGE_CATEGORY_OPTIONS = [
    ['moving_labor', 'Moving Labor'],
    ['transportation', 'Transportation'],
    ['materials', 'Materials'],
    ['trip_and_travel', 'Trip and Travel'],
    ['valuation', 'Valuation'],
    ['storage_in_transit', 'Storage in Transit'],
    ['packing', 'Packing'],
    ['additional_services', 'Additional Services'],
    ['additional_lbs', 'Additional Lbs'],
    ['fuel_surcharge', 'Fuel Surcharge'],
    ['discount', 'Discount'],
    ['bulky_item', 'Bulky Item'],
    ['shuttle_fees', 'Shuttle Fees'],
    ['other', 'Other'],
];

const normalizeChargeCategory = (value) => {
    const raw = String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
    if (!raw) return 'other';
    if (VALID_CHARGE_CATEGORIES.has(raw)) return raw;
    return LEGACY_CHARGE_CATEGORY_ALIASES[raw] || 'other';
};

const getCategoryFormSchemaFromCatalog = (category, catalogRows = []) => {
    const normalized = normalizeChargeCategory(category);
    const rows = Array.isArray(catalogRows) ? catalogRows : [];
    const schemaFromCatalog = rows
        .filter((row) => normalizeChargeCategory(row?.category) === normalized)
        .map((row) => row?.category_form_schema || row?.metadata?.category_form_schema)
        .find((schema) => schema && typeof schema === 'object');
    
    const defaultSchema = DEFAULT_CATEGORY_FORM_SCHEMAS[normalized] || null;
    if (!schemaFromCatalog) return defaultSchema;

    return {
        ...schemaFromCatalog,
        presets: schemaFromCatalog.presets && schemaFromCatalog.presets.length > 0
            ? schemaFromCatalog.presets
            : (defaultSchema?.presets || []),
    };
};

const asList = (value) => {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.results)) return value.results;
    return [];
};

const toYyyyMmDd = (value = new Date()) => {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const yyyy = String(d.getFullYear());
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
};

const buildEstimateContractNumber = (estimate, template) => {
    const estimateKey = String(estimate?.display_number || estimate?.sales_number || estimate?.estimate_number || 'EST').trim();
    const uniqueKey = String(estimate?.id || '0').trim();
    const templateKey = String(template?.id || template?.name || 'DOC').trim().replace(/\s+/g, '-').slice(0, 16);
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `CTR-${estimateKey}-${uniqueKey}-${templateKey}-${toYyyyMmDd(new Date())}-${suffix}`;
};

const getChargePresetModeHelper = (form, catalogItems) => {
    const category = normalizeChargeCategory(form?.category || 'other');
    const schema = getCategoryFormSchemaFromCatalog(category, catalogItems);
    const preset = (schema?.presets || []).find((p) => String(p?.key) === String(form?.category_preset_key || ''));
    return preset?.mode || '';
};

const getPricingFormulaText = (form, context, catalogItems) => {
    const category = normalizeChargeCategory(form?.category || 'other');
    const quantity = Number(form?.quantity || 0);
    const unitPrice = Number(form?.unit_price || 0);

    if (category === 'moving_labor') {
        if (form.moving_labor_mode === 'flat_plus_hourly') {
            const flatRate = Number(form.flat_rate || 0);
            const includedHours = Number(form.included_hours || 0);
            const extraHourRate = Number(form.additional_hourly_rate || 0);
            return `Fixed price of $${flatRate.toLocaleString('en-US', { minimumFractionDigits: 2 })} (includes ${includedHours} hrs) + additional hours at $${extraHourRate.toLocaleString('en-US', { minimumFractionDigits: 2 })}/hr.`;
        } else {
            const hourlyRate = Number(form.hourly_rate_override || context?.hourlyRate || 0);
            const laborHours = Number(form.labor_time_display || 0);
            const travelHours = Number(form.travel_time_display || 0);
            const totalHours = laborHours + travelHours;
            return `Hourly labor: ${laborHours} hrs + travel: ${travelHours} hrs = ${totalHours} total billable hrs × $${hourlyRate.toLocaleString('en-US', { minimumFractionDigits: 2 })}/hr.`;
        }
    }
    
    if (category === 'packing') {
        const presetMode = getChargePresetModeHelper(form, catalogItems);
        if (presetMode === 'hourly_labor') {
            const crew = Number(form.crew || 1);
            const hours = form.labor_time_display 
                ? parseDurationToHours(form.labor_time_display, 0)
                : Number(form.quantity || form.labor_hours || 0);
            const hourlyRate = Number(form.unit_price || form.hourly_rate_override || 0);
            return `Packing: ${hours} hrs × ${crew} crew members × $${hourlyRate.toLocaleString('en-US', { minimumFractionDigits: 2 })}/hr.`;
        } else if (presetMode === 'flat_plus_hourly') {
            const flatRate = Number(form.flat_rate || 0);
            const includedHours = Number(form.included_hours || 0);
            const addlRate = Number(form.additional_hourly_rate || 0);
            const crew = Number(form.crew || 1);
            return `Flat packing rate of $${flatRate.toLocaleString('en-US', { minimumFractionDigits: 2 })} (includes ${includedHours} hrs) + additional hours at $${addlRate.toLocaleString('en-US', { minimumFractionDigits: 2 })}/hr per crew member (${crew} crew).`;
        } else if (presetMode === 'unit') {
            const quantity = Number(form.quantity || 0);
            const unitPrice = Number(form.unit_price || 0);
            return `Packing by Container: ${quantity} containers × $${unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}/each.`;
        } else if (presetMode === 'weight') {
            const weight = Number(form.weight || 0);
            const rate = Number(form.unit_price || 0);
            return `Packing by Cwt: ${weight} lbs / 100 × $${rate.toLocaleString('en-US', { minimumFractionDigits: 2 })}/cwt.`;
        }
    }

    if (['transportation', 'trip_and_travel', 'additional_services', 'fuel_surcharge'].includes(category)) {
        const presetMode = getChargePresetModeHelper(form, catalogItems);
        if (presetMode === 'mileage') {
            const mileage = Number(form.mileage || 0);
            const costPerMile = Number(form.cost_per_mile || 0);
            const minCost = Number(form.min_cost || 0);
            const includedMiles = Number(form.included_miles || 0);
            const billableMiles = Math.max(0, mileage - includedMiles);
            if (category === 'fuel_surcharge') {
                const trucks = Number(form.trucks || 1);
                return `Fuel surcharge: ${trucks} Trucks x ${billableMiles} billable miles (${mileage} total - ${includedMiles} incl.) @ $${costPerMile.toLocaleString('en-US', { minimumFractionDigits: 2 })}/mi (min. fee $${minCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}).`;
            }
            return `Mileage travel: ${billableMiles} billable miles (${mileage} total - ${includedMiles} incl.) × $${costPerMile.toLocaleString('en-US', { minimumFractionDigits: 2 })}/mi (min. fee $${minCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}).`;
        } else if (presetMode === 'percentage') {
            const percentageRate = Number(form.percentage_rate || 0);
            return `Surcharge calculated as ${percentageRate}% of base amount.`;
        } else if (presetMode === 'flat_truck') {
            const trucks = Number(form.quantity || 0);
            const ratePerTruck = Number(form.unit_price || 0);
            return `Flat truck rate: ${trucks} trucks × $${ratePerTruck.toLocaleString('en-US', { minimumFractionDigits: 2 })}/truck.`;
        } else {
            return '';
        }
    }

    if (category === 'additional_lbs') {
        return `Additional lbs: ${quantity} lbs × $${unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}/lb.`;
    }

    if (category === 'discount') {
        return `Discount amount: -$${Math.abs(unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    }

    return '';
};

const ChargePricingSummary = ({ form, context, catalogItems, subtotal, discount }) => {
    const category = normalizeChargeCategory(form?.category || 'other');
    const displaySubtotal = Number(subtotal || 0);
    const displayDiscount = Math.abs(Number(discount || 0));
    const displayTotal = Math.max(0, displaySubtotal - displayDiscount);

    // Dynamic category icon
    let IconComp = Calculator;
    let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
    let categoryLabel = 'Other';

    if (category === 'moving_labor') {
        IconComp = Clock;
        badgeColor = 'bg-blue-50 text-blue-700 border-blue-200/60';
        categoryLabel = 'Moving Labor';
    } else if (category === 'packing') {
        IconComp = Package;
        badgeColor = 'bg-purple-50 text-purple-700 border-purple-200/60';
        categoryLabel = 'Packing / Unpacking';
    } else if (category === 'transportation') {
        IconComp = MapIcon;
        badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
        categoryLabel = 'Transportation';
    } else if (category === 'trip_and_travel') {
        IconComp = MapPin;
        badgeColor = 'bg-amber-50 text-amber-700 border-amber-200/60';
        categoryLabel = 'Trip & Travel Surcharge';
    } else if (category === 'additional_services') {
        IconComp = Plus;
        badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200/60';
        categoryLabel = 'Additional Services';
    } else if (category === 'additional_lbs') {
        IconComp = Package;
        badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
        categoryLabel = 'Additional Lbs';
    } else if (category === 'discount') {
        IconComp = Trash2;
        badgeColor = 'bg-rose-50 text-rose-700 border-rose-200/60';
        categoryLabel = 'Discount';
    }

    const formula = getPricingFormulaText(form, context, catalogItems);

    return (
        <div className="flex flex-col h-full rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-5 lg:justify-between">
            <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${badgeColor.split(' ')[0]} ${badgeColor.split(' ')[1]} border`}>
                        <IconComp size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${badgeColor}`}>
                            {categoryLabel}
                        </span>
                        <h4 className="font-extrabold text-slate-800 text-sm truncate mt-0.5">
                            {form?.name || 'Unnamed Charge'}
                        </h4>
                    </div>
                </div>

                {formula && (
                    <div className="space-y-1.5">
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pricing Formula</div>
                        <p className="text-xs font-semibold text-slate-600 leading-relaxed bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
                            {formula}
                        </p>
                    </div>
                )}

                <div className="space-y-1.5">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Cost Breakdown</div>
                    <div className="space-y-2 bg-white rounded-xl p-4 border border-slate-100 shadow-sm text-xs font-semibold">
                        <div className="flex justify-between text-slate-500">
                            <span>Base Charge Subtotal</span>
                            <span className="font-mono text-slate-900">${displaySubtotal.toFixed(2)}</span>
                        </div>
                        {displayDiscount > 0 && (
                            <div className="flex justify-between text-rose-600">
                                <span>Discount Applied</span>
                                <span className="font-mono">-${displayDiscount.toFixed(2)}</span>
                            </div>
                        )}

                    </div>
                </div>
            </div>

            <div className="space-y-1.5 pt-4 border-t border-slate-200">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Estimated Total Price</div>
                <div className="rounded-xl border border-brand/20 bg-gradient-to-br from-brand/5 via-white to-brand/5 p-3.5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                            <Calculator size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Auto-calculated</div>
                            <div className="mt-0.5 flex items-baseline gap-0.5 overflow-hidden">
                                <span className="text-xs font-bold text-slate-500">$</span>
                                <span className="truncate font-mono text-2xl font-black tracking-tight text-slate-900">
                                    {displayTotal.toLocaleString('en-US', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const GOOGLE_MAPS_SCRIPT_ID = 'crm-google-maps-js';

const loadGoogleMapsScript = (apiKey) => {
    if (!apiKey) return Promise.reject(new Error('Missing Google Maps API key.'));
    if (typeof window !== 'undefined' && window.google?.maps) return Promise.resolve(window.google.maps);

    const existing = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);
    if (existing) {
        return new Promise((resolve, reject) => {
            existing.addEventListener('load', () => resolve(window.google?.maps), { once: true });
            existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps script.')), { once: true });
        });
    }

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.id = GOOGLE_MAPS_SCRIPT_ID;
        // `loading=async` can cause the script "load" event to fire before constructors (like `google.maps.Map`)
        // are available, leading to intermittent blank maps or "not a constructor" errors.
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = async () => {
            const maps = window.google?.maps;
            if (!maps) {
                reject(new Error('Google Maps loaded but window.google.maps is unavailable.'));
                return;
            }
            // With `loading=async`, onload may fire before the "maps" library is ready.
            if (typeof maps.importLibrary === 'function') {
                try {
                    await maps.importLibrary('maps');
                } catch {
                    // ignore; caller will handle constructor availability.
                }
            }
            resolve(maps);
        };
        script.onerror = () => reject(new Error('Failed to load Google Maps script.'));
        document.head.appendChild(script);
    });
};

const createStopId = () => `stop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const toRadians = (value) => (Number(value) * Math.PI) / 180;

const haversineMiles = (lat1, lng1, lat2, lng2) => {
    const earthRadiusMiles = 3958.8;
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusMiles * c;
};

const formatDistanceKm = (miles) => `${Math.max(0, Number(miles || 0) * 1.60934).toFixed(1)}`;

const formatDurationHoursMinutes = (minutes) => {
    const totalMinutes = Math.max(0, Math.round(Number(minutes || 0)));
    const hours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    if (!hours) return `${remainingMinutes} min`;
    if (!remainingMinutes) return `${hours} hr`;
    return `${hours} hr ${remainingMinutes} min`;
};


const formatAddressDetails = (details) => {
  if (!details) return '';
  const parts = [];
  if (details.property_type) {
    const pt = String(details.property_type);
    parts.push(pt.charAt(0).toUpperCase() + pt.slice(1));
  }
  if (details.parking_type) parts.push(`Parking: ${details.parking_type}`);
  if (details.flights_of_stairs) parts.push(`${details.flights_of_stairs} Stairs`);
  if (details.has_elevator) parts.push('Elevator');
  return parts.join(' | ');
};
const normalizeDisplayText = (value) => {
  const text = String(value || '').trim();
  if (!text || text === '-' || text === '—') return '';
  return text.trim().replace(/^[,\s|-]+|[,\s|-]+$/g, '');
};

const normalizeAddressCompareText = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const parseAddressString = (addressStr) => {
  const parts = (addressStr || '').split(',').map(p => p.trim()).filter(Boolean);
  let city = '';
  let state = '';
  let postal_code = '';

  if (parts.length === 0) {
    return { city, state, postal_code };
  }

  const lastPart = parts[parts.length - 1];
  const isCountry = ['canada', 'usa', 'united states', 'ca', 'us'].includes(lastPart.toLowerCase());
  const addressParts = isCountry ? parts.slice(0, -1) : parts;

  if (addressParts.length >= 2) {
    const stateZipPart = addressParts[addressParts.length - 1];
    city = addressParts[addressParts.length - 2];

    const szParts = stateZipPart.split(' ').map(s => s.trim()).filter(Boolean);
    if (szParts.length > 0) {
      state = szParts[0];
      if (szParts.length > 1) {
        postal_code = szParts.slice(1).join(' ');
      }
    }
  } else if (addressParts.length === 1) {
    const singlePart = addressParts[0];
    const spParts = singlePart.split(' ').map(s => s.trim()).filter(Boolean);
    if (spParts.length > 1) {
      city = spParts[0];
      state = spParts[1];
    } else {
      city = singlePart;
    }
  }

  return { city, state, postal_code };
};

const STATE_NAMES = {
  'bc': 'british columbia',
  'ab': 'alberta',
  'on': 'ontario',
  'qc': 'quebec',
  'ns': 'nova scotia',
  'nb': 'new brunswick',
  'mb': 'manitoba',
  'pe': 'prince edward island',
  'sk': 'saskatchewan',
  'nl': 'newfoundland and labrador',
  'yt': 'yukon',
  'nt': 'northwest territories',
  'nu': 'nunavut',
  'ca': 'california',
  'ny': 'new york',
  'tx': 'texas',
  'fl': 'florida',
  'wa': 'washington'
};

const isStateInAddress = (state, address) => {
  if (!state || !address) return false;
  const s = String(state).toLowerCase().trim();
  const addr = String(address).toLowerCase();
  if (addr.includes(s)) return true;
  const fullName = STATE_NAMES[s];
  if (fullName && addr.includes(fullName)) return true;
  for (const [abbr, name] of Object.entries(STATE_NAMES)) {
    if (s === name && addr.includes(abbr)) return true;
  }
  return false;
};

const isCityInAddress = (city, state, address) => {
  if (!city || !address) return false;
  const c = String(city).toLowerCase().trim();
  const addr = String(address).toLowerCase();
  if (addr.includes(c)) return true;
  if (state && c === String(state).toLowerCase().trim()) return true;
  return false;
};

const stripTrailingUS = (str) => String(str || '').replace(/(?:,\s*(?:US|USA|United States))$/i, '').trim();

const formatAddressForDisplay = (details = {}) => {
  const line1 = stripTrailingUS(normalizeDisplayText(details?.address_line1 || details?.street));
  const city = normalizeDisplayText(details?.city);
  const state = normalizeDisplayText(details?.state);
  const postalCode = normalizeDisplayText(details?.postal_code || details?.zip_code);
  const country = normalizeDisplayText(details?.country);

  const cleanCity = city.toLowerCase() === state.toLowerCase() ? '' : city;
  const locality = [cleanCity, [state, postalCode].filter(Boolean).join(' ')].filter(Boolean).join(', ');

  if (!line1) return [locality, country].filter(Boolean).join(', ');

  const normalizedLine1 = line1.toLowerCase();
  const normalizedLine1Compact = normalizeAddressCompareText(line1);
  const includesCity = isCityInAddress(city, state, line1);
  const includesState = isStateInAddress(state, line1);
  const includesPostal = postalCode ? normalizedLine1.includes(postalCode.toLowerCase()) : false;
  const includesCountry = country ? normalizedLine1.includes(country.toLowerCase()) : false;

  const extraParts = [];

  const normalizedLocality = normalizeAddressCompareText(locality);
  const localityRepresented =
    (includesCity && includesState && (!postalCode || includesPostal)) ||
    (normalizedLocality && normalizedLine1Compact.includes(normalizedLocality));
  if (locality && !localityRepresented) {
    const appendCity = includesCity ? '' : cleanCity;
    const appendState = includesState ? '' : state;
    const appendStateZip = [appendState, includesPostal ? '' : postalCode].filter(Boolean).join(' ');
    const appendLocality = [appendCity, appendStateZip].filter(Boolean).join(', ');
    if (appendLocality) {
      extraParts.push(appendLocality);
    }
  }

  const hasCanada = normalizedLine1.includes('canada');
  const hasUS = normalizedLine1.includes('usa') || normalizedLine1.includes('united states') || normalizedLine1.includes(', us');

  let appendCountry = country;
  if (includesCountry) {
    appendCountry = '';
  } else if (country.toLowerCase() === 'us' || country.toLowerCase() === 'usa' || country.toLowerCase() === 'united states') {
    if (hasCanada) appendCountry = '';
  } else if (country.toLowerCase() === 'canada' || country.toLowerCase() === 'ca') {
    if (hasUS) appendCountry = '';
  }

  if (appendCountry) {
    extraParts.push(appendCountry);
  }

  return [line1, ...extraParts].filter(Boolean).join(', ');
};

const buildRouteAddressFromOpportunity = (record, prefix, sourceType = 'opportunity') => {
  if (!record) return '';

  if (sourceType === 'lead') {
    return formatAddressForDisplay({
      street: record?.[`${prefix}_street`],
      city: record?.[`${prefix}_city`],
      state: record?.[`${prefix}_state`],
      zip_code: record?.[`${prefix}_zip`],
      unit_number: record?.[`${prefix}_unit_number`],
    });
  }

  return formatAddressForDisplay(record?.[`${prefix}_address_details`] || {});
};

const buildEstimateChargePricingRuleV2 = ({ category, preset, form, taxable }) => {
    const normalizedCategory = normalizeChargeCategory(category);

    if (normalizedCategory === 'moving_labor') {
        if (String(form?.moving_labor_mode || 'hourly') === 'hourly') {
            return {
                engine: 'v2',
                category: normalizedCategory,
                mode: 'hourly',
                inputs: ['crew', 'labor_hours', 'hourly_rate'],
                defaults: {
                    crew: Number(form?.crew || 2),
                    labor_hours: parseDurationToHours(form?.labor_time_display, Number(form?.labor_hours || 0)),
                    hourly_rate: Number(form?.hourly_rate_override || 0),
                },
                display: { rate_label: '{crew} crew x {labor_hours} hrs @ ${hourly_rate}/hr' },
                flags: { taxable: !!taxable, commissionable: true },
            };
        }
        return {
            engine: 'v2',
            category: normalizedCategory,
            mode: 'flat_plus_hourly',
            inputs: ['crew', 'trucks', 'labor_hours', 'flat_rate', 'included_hours', 'additional_hourly_rate'],
            defaults: {
                crew: Number(form?.crew || 2),
                trucks: Number(form?.trucks || 1),
                labor_hours: parseDurationToHours(form?.labor_time_display, Number(form?.labor_hours || 0)),
                flat_rate: Number(form?.flat_rate || 0),
                included_hours: String(form?.included_hours || '0h').replace(/h$/i, ''),
                additional_hourly_rate: Number(form?.additional_hourly_rate || 0),
            },
            display: {
                rate_label: '${flat_rate} for first {included_hours}h plus {extra_hours}h @ ${additional_hourly_rate}/hr ({trucks} trucks, {crew} crew)',
            },
            flags: { taxable: !!taxable, commissionable: true },
        };
    }

    if (normalizedCategory === 'transportation' && preset?.mode) {
        if (preset.mode === 'flat_truck') {
            return {
                engine: 'v2',
                category: normalizedCategory,
                mode: 'flat_truck',
                inputs: ['trucks', 'flat_rate_per_truck'],
                defaults: {
                    trucks: Number(form?.quantity || 0),
                    flat_rate_per_truck: Number(form?.unit_price || 0),
                },
                display: { rate_label: '{trucks} @ ${flat_rate_per_truck}' },
                flags: { taxable: !!taxable, commissionable: true },
            };
        }
        if (preset.mode === 'mileage') {
            return {
                engine: 'v2',
                category: normalizedCategory,
                mode: 'mileage',
                inputs: ['mileage', 'rate_per_mile', 'included_miles', 'minimum_charge'],
                defaults: {
                    mileage: Number(form?.mileage || 0),
                    rate_per_mile: Number(form?.cost_per_mile || 0),
                    included_miles: Number(form?.included_miles || 0),
                    minimum_charge: Number(form?.min_cost || 0),
                },
                display: { rate_label: '{mileage} miles @ ${rate_per_mile}/mile' },
                flags: { taxable: !!taxable, commissionable: true },
            };
        }
    }

    if (normalizedCategory === 'packing' && preset?.mode) {
        if (preset.mode === 'hourly_labor') {
            return {
                engine: 'v2',
                category: normalizedCategory,
                mode: 'hourly_labor',
                inputs: ['packers', 'hours', 'hourly_rate'],
                defaults: {
                    packers: Number(form?.crew || 1),
                    hours: parseDurationToHours(form?.labor_time_display, Number(form?.labor_hours || form?.quantity || 0)),
                    hourly_rate: Number(form?.unit_price || 0),
                },
                display: { rate_label: '{packers} packers x {hours} hrs @ ${hourly_rate}/hr' },
                flags: { taxable: !!taxable, commissionable: true },
            };
        }
        if (preset.mode === 'flat_plus_hourly') {
            const totalHours = form?.labor_time_display 
                ? parseDurationToHours(form.labor_time_display, 0)
                : Number(form?.labor_hours || 0);
            return {
                engine: 'v2',
                category: normalizedCategory,
                mode: 'flat_plus_hourly',
                inputs: ['crew', 'labor_hours', 'flat_rate', 'included_hours', 'additional_hourly_rate'],
                defaults: {
                    crew: Number(form?.crew || 1),
                    labor_hours: totalHours,
                    flat_rate: Number(form?.flat_rate || 0),
                    included_hours: String(form?.included_hours || '0h').replace(/h$/i, ''),
                    additional_hourly_rate: Number(form?.additional_hourly_rate || 0),
                },
                display: {
                    rate_label: '${flat_rate} flat rate (includes {included_hours}h) + additional hours @ ${additional_hourly_rate}/hr per packer ({crew} crew)',
                },
                flags: { taxable: !!taxable, commissionable: true },
            };
        }
        if (preset.mode === 'unit') {
            return {
                engine: 'v2',
                category: normalizedCategory,
                mode: 'unit',
                inputs: ['quantity', 'unit_price'],
                defaults: {
                    quantity: Number(form?.quantity || 0),
                    unit_price: Number(form?.unit_price || 0),
                },
                display: { rate_label: '{quantity} @ ${unit_price}' },
                flags: { taxable: !!taxable, commissionable: false },
            };
        }
        if (preset.mode === 'weight') {
            return {
                engine: 'v2',
                category: normalizedCategory,
                mode: 'weight',
                inputs: ['weight_lbs', 'rate_per_cwt'],
                defaults: {
                    weight_lbs: Number(form?.weight || 0),
                    rate_per_cwt: Number(form?.unit_price || 0),
                },
                display: { rate_label: '{weight_lbs} lbs / 100 @ ${rate_per_cwt}/cwt' },
                flags: { taxable: !!taxable, commissionable: false },
            };
        }
    }

    if (['trip_and_travel', 'additional_services', 'fuel_surcharge'].includes(normalizedCategory) && preset?.mode) {
        if (preset.mode === 'mileage') {
            const inputs = normalizedCategory === 'fuel_surcharge'
                ? ['mileage', 'cost_per_mile', 'included_miles', 'min_cost', 'trucks']
                : ['mileage', 'cost_per_mile', 'included_miles', 'min_cost'];
            return {
                engine: 'v2',
                category: normalizedCategory,
                mode: 'mileage',
                inputs,
                defaults: {
                    mileage: Number(form?.mileage || 0),
                    cost_per_mile: Number(form?.cost_per_mile || 0),
                    included_miles: Number(form?.included_miles || 0),
                    min_cost: Number(form?.min_cost || 0),
                    ...(normalizedCategory === 'fuel_surcharge' ? { trucks: Number(form?.trucks || 1) } : {}),
                },
                display: normalizedCategory === 'fuel_surcharge'
                    ? { rate_label: '{trucks} trucks x {mileage} miles @ ${cost_per_mile}/mile' }
                    : { rate_label: '{mileage} miles @ ${cost_per_mile}/mile' },
                flags: { taxable: !!taxable, commissionable: false },
            };
        }
        if (preset.mode === 'flat') {
            return {
                engine: 'v2',
                category: normalizedCategory,
                mode: 'flat',
                inputs: ['amount'],
                defaults: { amount: Number(form?.unit_price || 0) },
                display: { rate_label: '1 @ ${amount}' },
                flags: { taxable: !!taxable, commissionable: false },
            };
        }
        if (preset.mode === 'unit') {
            return {
                engine: 'v2',
                category: normalizedCategory,
                mode: 'unit',
                inputs: ['quantity', 'unit_price'],
                defaults: {
                    quantity: Number(form?.quantity || 0),
                    unit_price: Number(form?.unit_price || 0),
                },
                display: { rate_label: '{quantity} @ ${unit_price}' },
                flags: { taxable: !!taxable, commissionable: false },
            };
        }
        if (preset.mode === 'percentage') {
            return {
                engine: 'v2',
                category: normalizedCategory,
                mode: 'percentage',
                inputs: ['base_amount', 'percentage_rate'],
                defaults: {
                    base_amount: Number(form?.quantity || 0),
                    percentage_rate: Number(form?.percentage_rate || 0),
                },
                display: { rate_label: '{percentage_rate}% of ${base_amount}' },
                flags: { taxable: !!taxable, commissionable: false },
            };
        }
    }

    if (['valuation'].includes(normalizedCategory)) {
        if (preset?.mode === 'unit') {
            return {
                engine: 'v2',
                category: normalizedCategory,
                mode: 'unit',
                inputs: ['quantity', 'unit_price'],
                defaults: {
                    quantity: Number(form?.quantity || 0),
                    unit_price: Number(form?.unit_price || 0),
                },
                display: { rate_label: '{quantity} @ ${unit_price}' },
                flags: { taxable: !!taxable, commissionable: false },
            };
        }
        return {
            engine: 'v2',
            category: normalizedCategory,
            mode: 'percentage',
            inputs: ['base_amount', 'percentage_rate'],
            defaults: {
                base_amount: Number(form?.quantity || 0),
                percentage_rate: Number(form?.percentage_rate || form?.unit_price || 0),
            },
            display: { rate_label: '{percentage_rate}% of ${base_amount}' },
            flags: { taxable: !!taxable, commissionable: false },
        };
    }

    return null;
};

const EditStopModal = ({ isOpen, onClose, stop, onSave, isSaving }) => {
  const [formData, setFormData] = useState({
    stop_type: 'stop',
    address_line1: '',
    city: '',
    state: '',
    postal_code: '',
    unit_number: '',
    property_type: '',
    parking_type: '',
    flights_of_stairs: 0,
    has_elevator: false,
    walk_distance_ft: 50,
  });

  const lastStopKeyRef = useRef('');
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!isOpen || !stop) return;
    const stopKey = `${stop?.id || ''}:${stop?.details?.updated_at || ''}`;
    if (lastStopKeyRef.current === stopKey) return;
    lastStopKeyRef.current = stopKey;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData({
      stop_type: stop.type || stop.stop_type || 'stop',
      address_line1: formatAddressForDisplay(stop.details || {}) || stop.address || '',
      city: stop.details?.city || '',
      state: stop.details?.state || '',
      postal_code: stop.details?.postal_code || stop.details?.zip_code || '',
      unit_number: stop.details?.unit_number || '',
      property_type: stop.details?.property_type || '',
      parking_type: stop.details?.parking_type || '',
      flights_of_stairs: stop.details?.flights_of_stairs || 0,
      has_elevator: !!stop.details?.has_elevator,
      walk_distance_ft: stop.details?.walk_distance_ft || 50,
    });
  }, [isOpen, stop?.id, stop?.details?.updated_at]);

  if (!isOpen || !stop) return null;

  const inputCls = 'w-full px-4 py-2.5 bg-subtle/50 border border-border/80 rounded-xl text-sm font-bold text-black focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-black/50';
  const isDraftStop = String(stop?.id || '').startsWith('temp-') || Boolean(stop?.isDraft);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/20 animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      <Card className="relative w-full max-w-2xl rounded-[2rem] border border-ink-100 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-4rem)] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 md:px-8 py-5 border-b border-ink-100 bg-gradient-to-r from-brand-tint/10 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <MapIcon size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-xl font-heading font-black text-heading leading-tight">
                {isDraftStop ? 'Add Stop' : 'Edit Stop'}
              </h3>
              <p className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-ink-400 mt-1">
                {stop?.label}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-ink-400 hover:text-heading hover:bg-page transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-5">
          <div className="space-y-1.5">
            <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">
              Address
            </label>
            <div className="relative">
              <AddressAutocomplete
                country="ca,us"
                value={formData.address_line1}
                onChange={e => setFormData(p => ({ ...p, address_line1: e.target.value }))}
                onPick={(parts) =>
                  setFormData((p) => ({
                    ...p,
                    address_line1: parts.formattedAddress || parts.street || p.address_line1,
                    city: parts.city || p.city,
                    state: parts.province || p.state,
                    postal_code: parts.postalCode || p.postal_code,
                  }))
                }
                className={inputCls}
                placeholder="Enter address"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Unit / Apt #"
              value={formData.unit_number}
              onChange={e => setFormData(p => ({ ...p, unit_number: e.target.value }))}
              placeholder="e.g. 402"
            />
            <FormInput
              label="Property Type"
              as="select"
              value={formData.property_type}
              onChange={e => setFormData(p => ({ ...p, property_type: e.target.value }))}
            >
              <option value="">Select type...</option>
              <option value="house">House</option>
              <option value="apartment">Apartment</option>
              <option value="condo">Condo</option>
              <option value="townhouse">Townhouse</option>
              <option value="office">Office</option>
              <option value="storage">Storage</option>
              <option value="other">Other</option>
            </FormInput>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Parking Logistics"
              as="select"
              value={formData.parking_type}
              onChange={e => setFormData(p => ({ ...p, parking_type: e.target.value }))}
            >
              <option value="">Select parking...</option>
              <option value="Driveway">Driveway</option>
              <option value="Street">Street</option>
              <option value="Parking Lot">Parking Lot</option>
              <option value="Loading Dock">Loading Dock</option>
              <option value="Other">Other / TBD</option>
            </FormInput>
            <FormInput
              label="Stairs (Flights)"
              as="select"
              value={formData.flights_of_stairs}
              onChange={e => setFormData(p => ({ ...p, flights_of_stairs: parseInt(e.target.value) }))}
            >
              <option value="0">No Stairs / Ground</option>
              <option value="1">1 Flight</option>
              <option value="2">2 Flights</option>
              <option value="3">3+ Flights</option>
            </FormInput>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Walk Distance"
              as="select"
              value={formData.walk_distance_ft}
              onChange={e => setFormData(p => ({ ...p, walk_distance_ft: parseInt(e.target.value) }))}
            >
              <option value="50">Less than 100 feet</option>
              <option value="150">100-200 feet</option>
              <option value="300">200+ feet (Long Carry)</option>
            </FormInput>
            <FormInput
              label="Elevator Access"
              as="select"
              value={formData.has_elevator ? 'yes' : 'no'}
              onChange={e => setFormData(p => ({ ...p, has_elevator: e.target.value === 'yes' }))}
            >
              <option value="no">No Elevator</option>
              <option value="yes">Yes, Available</option>
            </FormInput>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 md:px-8 py-5 border-t border-ink-100 shrink-0 bg-page/30">
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn
            onClick={() => onSave(stop.id, formData)}
            disabled={isSaving}
            loading={isSaving}
          >
            {isDraftStop ? 'Create Stop' : 'Save Stop Details'}
          </PrimaryBtn>
        </div>
      </Card>
    </div>
  );
};

const DocumentActionMenu = ({ 
  contract, 
  row, 
  link, 
  isSigned, 
  isClosed, 
  hasActiveDocumentAction, 
  isActioning, 
  sendLabel,
  onDownloadPdf,
  copyDocumentLink,
  clearDocumentSignatureAndResend,
  resetDocumentSignature,
  handleOpenPreview
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = (e, action) => {
    e.stopPropagation();
    setIsOpen(false);
    action();
  };

  const canDownloadPdf = Boolean(contract?.id || row?.template?.id);
  const disabledActions = Boolean(hasActiveDocumentAction && !isActioning);
  const handleResetDocumentSignature = typeof resetDocumentSignature === 'function'
    ? resetDocumentSignature
    : clearDocumentSignatureAndResend;

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        disabled={disabledActions}
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-50"
      >
        <span>Action</span>
        <ChevronDown className={`w-4 h-4 text-white transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl z-[100] py-1">
          {canDownloadPdf && (
            <button
              onClick={(e) => handleAction(e, () => {
                onDownloadPdf();
              })}
              className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              <Icon name="download" className="w-4 h-4 mr-2.5 text-slate-400" />
              Download PDF
            </button>
          )}

          {contract?.signing_token && (
            <>
              <button
                disabled={disabledActions}
                onClick={(e) => handleAction(e, () => copyDocumentLink(row))}
                className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
              >
                <Icon name="copy" className="w-4 h-4 mr-2.5 text-slate-400" />
                Copy link
              </button>
              <button
                disabled={disabledActions}
                onClick={(e) => handleAction(e, () => window.open(link, '_blank'))}
                className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
              >
                <Icon name="external-link" className="w-4 h-4 mr-2.5 text-slate-400" />
                Open portal
              </button>
            </>
          )}

          {isSigned ? (
            <>
              <button
                disabled={disabledActions}
                onClick={(e) => handleAction(e, () => clearDocumentSignatureAndResend(row))}
                className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
              >
                <Icon name="rotate-ccw" className="w-4 h-4 mr-2.5 text-slate-400" />
                Clear sign & resend
              </button>
              <button
                disabled={disabledActions}
                onClick={(e) => handleAction(e, () => handleResetDocumentSignature(row))}
                className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
              >
                <Icon name="refresh-cw" className="w-4 h-4 mr-2.5 text-slate-400" />
                Reset sign
              </button>
              <button
                disabled={disabledActions}
                onClick={(e) => handleAction(e, () => handleOpenPreview(row))}
                className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
              >
                <Icon name="file-text" className="w-4 h-4 mr-2.5 text-slate-400" />
                View Signed
              </button>
            </>
          ) : !contract?.signed_pdf ? (
            <button
              disabled={Boolean(disabledActions || isClosed)}
              onClick={(e) => handleAction(e, () => handleOpenPreview(row))}
              className="w-full flex items-center px-4 py-2.5 text-sm font-bold text-brand hover:bg-brand/5 transition disabled:opacity-50"
            >
              {isActioning ? (
                <Icon name="loader-2" className="w-4 h-4 mr-2.5 animate-spin" />
              ) : (
                <Icon name="send" className="w-4 h-4 mr-2.5" />
              )}
              {sendLabel}
            </button>
          ) : (
            <button
              disabled={disabledActions}
              onClick={(e) => handleAction(e, () => handleOpenPreview(row))}
              className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
            >
              <Icon name="file-text" className="w-4 h-4 mr-2.5 text-slate-400" />
              View Signed
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default function EstimateView({
    opportunity,
    sourceType = 'opportunity',
    isLoadingLinkedOpportunity = false,
    onRefresh,
    opportunityJobs = [],
    subJobServiceOptions = [],
    selectedSubJobId = '',
    onSelectedSubJobChange,
    onCreateSubJob,
    onRefreshSubJobs,
    onDeleteSelectedSubJob,
    onUpdateSelectedSubJob,
    triggerSendEstimate = 0,
    triggerViewEstimate = 0,
    initialSubTab,
    onSubTabChange,
    isOpportunityLocked = false,
    canCreateOpportunity = false,
    canEditOpportunity = false,
    canManageActivityHistory = false,
    canSendEmail = false,
}) {
    const navigate = useNavigate();
    // Consume new requests only after the estimate is available. Initializing
    // from the prop also prevents an old request replaying after a later remount.
    const previousSendEstimateTrigger = useRef(triggerSendEstimate);
    const previousViewEstimateTrigger = useRef(triggerViewEstimate);
    const [activeTab, setActiveTab] = useState('Internal Notes');
    const [isEditingDetails, setIsEditingDetails] = useState(false);
    const [detailErrors, setDetailErrors] = useState({});
    const [estimate, setEstimate] = useState(null);
    const [manual, setManual] = useState(blankManualFields);
    const [discountPresets, setDiscountPresets] = useState([]);
    const [selectedDiscountPresetId, setSelectedDiscountPresetId] = useState('');
    const [packages, setPackages] = useState([]);
    const [selectedPackageId, setSelectedPackageId] = useState('');
    const [packageRefreshKey, setPackageRefreshKey] = useState(0);
    const [portalTemplates, setPortalTemplates] = useState([]);
    const [portalTemplatesLoaded, setPortalTemplatesLoaded] = useState(false);
    const [selectedPortalTemplateId, setSelectedPortalTemplateId] = useState('');
    const [resendUseSameTemplate, setResendUseSameTemplate] = useState(true);
    const [chargeForm, setChargeForm] = useState(blankCharge);
    const [chargeTotalIsManual, setChargeTotalIsManual] = useState(false);
    const [isAddChargeModalOpen, setIsAddChargeModalOpen] = useState(false);
    const [editingChargeId, setEditingChargeId] = useState(null);
    const [editingChargeForm, setEditingChargeForm] = useState(blankCharge);
    const [editingChargeTotalIsManual, setEditingChargeTotalIsManual] = useState(false);
    const lastSavedTaxRef = useRef({ sales_tax_pct: null, tax_exempt: null });
    const lastSavedDiscountRef = useRef({ discount_amount: null });
    const taxSaveTimeoutRef = useRef(null);
    const discountSaveTimeoutRef = useRef(null);
    const detailsAutoSaveTimeoutRef = useRef(null);
    const notesAutoSaveTimeoutRef = useRef(null);

    const lastAutoFilledFormulaRef = useRef('');
    const lastEditingAutoFilledFormulaRef = useRef('');
    const lastCatalogAutoFilledFormulaRef = useRef('');

    const [estimatePortalLink, setEstimatePortalLink] = useState('');
    const [inventoryLink, setInventoryLink] = useState('');
    const [isInventoryRequestModalOpen, setIsInventoryRequestModalOpen] = useState(false);
    const [inventoryRequestSendEmail, setInventoryRequestSendEmail] = useState(true);
    const [inventoryRequestSendSMS, setInventoryRequestSendSMS] = useState(false);
    const [inventoryRequestToEmail, setInventoryRequestToEmail] = useState('');
    const [inventoryRequestToPhone, setInventoryRequestToPhone] = useState('');
    const [inventoryRequestIsCustomEmail, setInventoryRequestIsCustomEmail] = useState(false);
    const [inventoryRequestIsCustomPhone, setInventoryRequestIsCustomPhone] = useState(false);
    const [isSendDropdownOpen, setIsSendDropdownOpen] = useState(false);
    const sendDropdownRef = useRef(null);
    const [inventoryPhotos, setInventoryPhotos] = useState([]);
    const [inventoryPhotosLoading, setInventoryPhotosLoading] = useState(false);
    const [portalItemsState, setPortalItemsState] = useState(null);
    const [estimateActiveTab, setEstimateActiveTab] = useState(initialSubTab || 'charges');

    useEffect(() => {
        if (initialSubTab) {
            setEstimateActiveTab(initialSubTab);
        }
    }, [initialSubTab]);

    const [portalTarget, setPortalTarget] = useState(null);
    useEffect(() => {
        const target = document.getElementById('estimate-header-portal-target');
        setPortalTarget(target);
    }, []);

    const [routeSummary, setRouteSummary] = useState({ distanceMiles: 0, durationMinutes: 0 });
    const buildRouteCacheSignature = useCallback(
        (stops = []) =>
            (Array.isArray(stops) ? stops : [])
                .map((stop) => `${String(stop?.type || '').trim().toLowerCase()}::${String(stop?.address || '').trim().toLowerCase()}`)
                .join('|'),
        []
    );

    const persistRouteCache = useCallback(async ({
        nextRouteSummary,
        nextRouteLegs = [],
        nextRoutePathPoints = [],
        nextFallbackStopPoints = [],
        nextRouteMode = 'none',
    }) => {
        if (!opportunity?.id || sourceType === 'lead') return;
        const routeCacheSignature = buildRouteCacheSignature(routeStops);
        const routeCachePayload = {
            routeMode: nextRouteMode,
            routeLegs: Array.isArray(nextRouteLegs) ? nextRouteLegs : [],
            routePathPoints: Array.isArray(nextRoutePathPoints) ? nextRoutePathPoints : [],
            fallbackStopPoints: Array.isArray(nextFallbackStopPoints) ? nextFallbackStopPoints : [],
        };
        try {
            await updateOpportunity(opportunity.id, {
                route_distance_miles: Number(nextRouteSummary?.distanceMiles || 0).toFixed(2),
                route_duration_minutes: Math.max(0, Math.round(Number(nextRouteSummary?.durationMinutes || 0))),
                route_cache_signature: routeCacheSignature,
                route_cache_payload: routeCachePayload,
                route_calculated_at: new Date().toISOString(),
            });
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error('Failed to persist route cache:', err);
        }
    }, [buildRouteCacheSignature, onRefresh, opportunity?.id, sourceType]);

    const chargeContext = useMemo(() => {
        const distanceMiles = Number(routeSummary?.distanceMiles || 0) || 0;
        const durationHours = (Number(routeSummary?.durationMinutes || 0) || 0) / 60;
        const crewSize = Number(manual?.crew_size || 0) || 0;
        const hourlyRate = Number(manual?.hourly_rate || 0) || 0;
        const estimatedHours = Number(manual?.estimated_hours || 0) || 0;
        const travelHours = Number(manual?.travel_time_hours || 0) || 0;
        const transportationBase = (estimate?.charges || [])
            .filter((c) => String(c?.category || '') === 'transportation')
            .reduce((sum, c) => sum + Number(c?.total_price || c?.total || 0), 0);
        const laborBase = (estimate?.charges || [])
            .filter((c) => ['moving_labor', 'packing', 'trip_and_travel'].includes(String(c?.category || '')))
            .reduce((sum, c) => sum + Number(c?.total_price || c?.total || 0), 0);
        const chargesSubtotal = (estimate?.charges || [])
            .filter((c) => String(c?.category || '') !== 'fuel_surcharge' && String(c?.category || '') !== 'valuation')
            .reduce((sum, c) => sum + Number(c?.total_price || c?.total || 0), 0);
        const estimateTotal = (estimate?.charges || [])
            .reduce((sum, c) => sum + Number(c?.total_price || c?.total || 0), 0);
        return {
            distanceMiles,
            durationHours,
            crewSize,
            hourlyRate,
            estimatedHours,
            travelHours,
            transportationBase,
            laborBase,
            chargesSubtotal,
            estimateTotal,
        };
    }, [routeSummary, manual, estimate]);

    const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
    const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
    const [catalogItems, setCatalogItems] = useState([]);
    const [selectedCatalogItemId, setSelectedCatalogItemId] = useState('');
    const [catalogChargeForm, setCatalogChargeForm] = useState(blankCharge);

    // Automatically fill and update description for chargeForm
    useEffect(() => {
        if (!isAddChargeModalOpen) return;
        const formulaText = getPricingFormulaText(chargeForm, chargeContext, catalogItems);
        if (!chargeForm.description || chargeForm.description === lastAutoFilledFormulaRef.current) {
            setChargeForm(p => ({ ...p, description: formulaText }));
            lastAutoFilledFormulaRef.current = formulaText;
        }
    }, [
        isAddChargeModalOpen,
        chargeForm.category,
        chargeForm.category_preset_key,
        chargeForm.moving_labor_mode,
        chargeForm.flat_rate,
        chargeForm.included_hours,
        chargeForm.additional_hourly_rate,
        chargeForm.hourly_rate_override,
        chargeForm.labor_time_display,
        chargeForm.travel_time_display,
        chargeForm.crew,
        chargeForm.quantity,
        chargeForm.unit_price,
        chargeForm.mileage,
        chargeForm.cost_per_mile,
        chargeForm.min_cost,
        chargeForm.included_miles,
        chargeForm.trucks,
        chargeForm.percentage_rate,
    ]);

    // Automatically fill and update description for editingChargeForm
    useEffect(() => {
        if (!editingChargeId) return;
        const formulaText = getPricingFormulaText(editingChargeForm, chargeContext, catalogItems);
        if (!editingChargeForm.description || editingChargeForm.description === lastEditingAutoFilledFormulaRef.current) {
            setEditingChargeForm(p => ({ ...p, description: formulaText }));
            lastEditingAutoFilledFormulaRef.current = formulaText;
        }
    }, [
        editingChargeId,
        editingChargeForm.category,
        editingChargeForm.category_preset_key,
        editingChargeForm.moving_labor_mode,
        editingChargeForm.flat_rate,
        editingChargeForm.included_hours,
        editingChargeForm.additional_hourly_rate,
        editingChargeForm.hourly_rate_override,
        editingChargeForm.labor_time_display,
        editingChargeForm.travel_time_display,
        editingChargeForm.crew,
        editingChargeForm.quantity,
        editingChargeForm.unit_price,
        editingChargeForm.mileage,
        editingChargeForm.cost_per_mile,
        editingChargeForm.min_cost,
        editingChargeForm.included_miles,
        editingChargeForm.trucks,
        editingChargeForm.percentage_rate,
    ]);

    // Automatically fill and update description for catalogChargeForm
    useEffect(() => {
        if (!isCatalogModalOpen) return;
        const formulaText = getPricingFormulaText(catalogChargeForm, chargeContext, catalogItems);
        if (!catalogChargeForm.description || catalogChargeForm.description === lastCatalogAutoFilledFormulaRef.current) {
            setCatalogChargeForm(p => ({ ...p, description: formulaText }));
            lastCatalogAutoFilledFormulaRef.current = formulaText;
        }
    }, [
        isCatalogModalOpen,
        catalogChargeForm.category,
        catalogChargeForm.category_preset_key,
        catalogChargeForm.moving_labor_mode,
        catalogChargeForm.flat_rate,
        catalogChargeForm.included_hours,
        catalogChargeForm.additional_hourly_rate,
        catalogChargeForm.hourly_rate_override,
        catalogChargeForm.labor_time_display,
        catalogChargeForm.travel_time_display,
        catalogChargeForm.crew,
        catalogChargeForm.quantity,
        catalogChargeForm.unit_price,
        catalogChargeForm.mileage,
        catalogChargeForm.cost_per_mile,
        catalogChargeForm.min_cost,
        catalogChargeForm.included_miles,
        catalogChargeForm.trucks,
        catalogChargeForm.percentage_rate,
    ]);
    const [isAddInventoryItemModalOpen, setIsAddInventoryItemModalOpen] = useState(false);
    const [inventoryItemForm, setInventoryItemForm] = useState(blankInventoryItem);
    const [documentTemplates, setDocumentTemplates] = useState([]);
    const [documentContracts, setDocumentContracts] = useState([]);
    const [documentsLoading, setDocumentsLoading] = useState(false);
    const [documentsError, setDocumentsError] = useState('');
    const [documentActionId, setDocumentActionId] = useState('');
    const [selectedDocKeys, setSelectedDocKeys] = useState([]);
    const [isMultiSendModalOpen, setIsMultiSendModalOpen] = useState(false);
    const [isMultiSending, setIsMultiSending] = useState(false);
    const [multiSendEmailData, setMultiSendEmailData] = useState({ to: '', subject: '', body: '', documents: [] });
    const [isMultiSendCustomEmail, setIsMultiSendCustomEmail] = useState(false);
    const [previewingRow, setPreviewingRow] = useState(null);
    const [previewHtml, setPreviewHtml] = useState('');
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [documentSendEmail, setDocumentSendEmail] = useState(true);
    const [documentSendSms, setDocumentSendSms] = useState(false);
    const [documentSelectedEmails, setDocumentSelectedEmails] = useState([]);
    const [documentSelectedPhones, setDocumentSelectedPhones] = useState([]);
    const [documentCustomEmail, setDocumentCustomEmail] = useState('');
    const [documentCustomPhone, setDocumentCustomPhone] = useState('');
    const [isJobSchedulerModalOpen, setIsJobSchedulerModalOpen] = useState(false);
    const [jobSchedulerJobId, setJobSchedulerJobId] = useState('');
    const [jobSchedulerAvailability, setJobSchedulerAvailability] = useState(null);
    const [jobSchedulerAvailabilityLoading, setJobSchedulerAvailabilityLoading] = useState(false);
    const [jobSchedulerAvailabilityError, setJobSchedulerAvailabilityError] = useState('');
    const [jobSchedulerViewDate, setJobSchedulerViewDate] = useState(() => opportunity?.move_date ? String(opportunity.move_date).slice(0, 10) : new Date().toISOString().slice(0, 10));
    const [jobSchedulerDraft, setJobSchedulerDraft] = useState({
        move_date: '',
        arrival_window_start: '',
        arrival_window_end: '',
    });

    const getOpportunityBranchId = () =>
        opportunity?.branch?.id ||
        opportunity?.branch_id ||
        opportunity?.branch_details?.id ||
        '';

    const getEstimatePortalTemplateId = () => {
        const template = estimate?.portal_template;
        if (template && typeof template === 'object') return template.id || '';
        return template || estimate?.portal_template_id || estimate?.portal_template_source_id || '';
    };

    const hasEstimatePortalTemplateSnapshot = () => {
        const snapshot = estimate?.portal_template_snapshot;
        return Boolean(snapshot && typeof snapshot === 'object' && Object.keys(snapshot).length);
    };

    const resolvePortalTemplateSelection = (rows = portalTemplates) => {
        const activeRows = Array.isArray(rows) ? rows : [];
        const branchId = getOpportunityBranchId();
        const existingTemplateId = getEstimatePortalTemplateId();
        const resolveTemplateBranchId = (row) => {
            const branch = row?.branch_id ?? row?.branch ?? row?.branch_details?.id ?? '';
            if (branch && typeof branch === 'object') return branch?.id ?? '';
            return branch;
        };
        // For branch opportunities, allow selecting either a branch template or a global template.
        // If a global template is selected, we'll copy it to the branch on send.
        const branchCompatibleRows = branchId
            ? activeRows.filter((row) => {
                    const tplBranchId = resolveTemplateBranchId(row);
                    return !tplBranchId || String(tplBranchId) === String(branchId);
                })
            : activeRows.filter((row) => !resolveTemplateBranchId(row));

        const fallback = branchCompatibleRows.find((row) => row.is_default) || branchCompatibleRows[0] || null;
        const existingTemplate = existingTemplateId
            ? branchCompatibleRows.find((row) => String(row.id) === String(existingTemplateId))
            : null;
        if (existingTemplate) {
            return { portalTemplateId: String(existingTemplate.id), hasExistingTemplate: true };
        }
        return {
            portalTemplateId: fallback ? String(fallback.id) : '',
            hasExistingTemplate: false,
        };
    };

    const buildEstimatePortalRequestPayload = (templateId = selectedPortalTemplateId) => {
        const selection = resolvePortalTemplateSelection();
        const resolvedTemplateId = templateId || selection.portalTemplateId;
        const payload = { portal_base_url: getPortalBaseUrl() };
        if (resolvedTemplateId) {
            payload.portal_template_id = Number(resolvedTemplateId);
        }
        return payload;
    };

    const getErrorMessage = (err, fallback = 'Request failed.') => {
      const data = err?.response?.data;
      if (!data) return fallback;
      if (typeof data.detail === 'string') return data.detail;
      if (typeof data.message === 'string') return data.message;
      const firstKey = Object.keys(data)[0];
      if (!firstKey) return fallback;
      const firstVal = data[firstKey];
      if (Array.isArray(firstVal) && firstVal.length) return String(firstVal[0]);
      if (typeof firstVal === 'string') return firstVal;
      return fallback;
    };

    const getCatalogChargeErrorMessage = (err) => {
        const message = getErrorMessage(err, 'Failed to add catalog item.');
        if (message.toLowerCase().includes('catalog item branch must match the estimate branch')) {
            return 'This catalog item belongs to a different branch and cannot be added to this estimate.';
        }
        return message;
    };

    const getOpportunityCustomer = () => {
        const customer = opportunity?.customer_details || opportunity?.customer || null;
        const customerId = customer?.id || opportunity?.customer_id || opportunity?.customer || null;
        return {
            id: customerId ? Number(customerId) : null,
            name:
                customer?.full_name ||
                `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() ||
                customer?.name ||
                'Customer',
            email: customer?.email || '',
            phone: customer?.primary_phone || customer?.phone || '',
        };
    };

    const buildEstimateRequirementsDraft = () => {
        const customer = opportunity?.customer_details || opportunity?.customer || null;
        const originAddress = opportunity?.origin_address_details || opportunity?.origin_address || null;
        const destinationAddress = opportunity?.destination_address_details || opportunity?.destination_address || null;
        return {
            first_name: customer?.first_name || '',
            last_name: customer?.last_name || '',
            email: customer?.email || '',
            phone: customer?.primary_phone || customer?.phone || '',
            move_date: opportunity?.move_date || '',
            branch: String(
                opportunity?.branch?.id ||
                opportunity?.branch_id ||
                opportunity?.branch_details?.id ||
                ''
            ),
            service_type: opportunity?.service_type || '',
            move_type: opportunity?.move_type || '',
            origin_street: originAddress?.address_line1 || '',
            origin_city: originAddress?.city || '',
            origin_state: originAddress?.state || '',
            origin_zip: originAddress?.zip_code || originAddress?.postal_code || '',
            destination_street: destinationAddress?.address_line1 || '',
            destination_city: destinationAddress?.city || '',
            destination_state: destinationAddress?.state || '',
            destination_zip: destinationAddress?.zip_code || destinationAddress?.postal_code || '',
        };
    };

    const getEstimateCreationRequirementGaps = (draft = null) => {
        const target = draft || buildEstimateRequirementsDraft();
        const customerName = `${target?.first_name || ''} ${target?.last_name || ''}`.trim();
        const missing = [];

        if (!String(target?.first_name || '').trim() && !customerName) {
            missing.push('customer first name');
        }
        if (!String(target?.email || '').trim() && !String(target?.phone || '').trim()) {
            missing.push('customer email or phone');
        }
        if (!String(target?.move_date || '').trim()) missing.push('move date');
        if (!String(target?.branch || '').trim()) missing.push('branch');
        if (!String(target?.service_type || '').trim()) missing.push('service type');
        if (!String(target?.move_type || '').trim()) missing.push('move type');
        if (!String(target?.origin_street || '').trim()) missing.push('origin address');
        if (!String(target?.destination_street || '').trim()) missing.push('destination address');

        return missing;
    };

    const openEstimateRequirementsModal = () => {
        setEstimateRequirementsDraft(buildEstimateRequirementsDraft());
        setEstimateRequirementsError('');
        setIsEstimateRequirementsModalOpen(true);
    };

    const closeEstimateRequirementsModal = () => {
        if (isSavingEstimateRequirements) return;
        setIsEstimateRequirementsModalOpen(false);
        setEstimateRequirementsDraft(null);
        setEstimateRequirementsError('');
    };

    const buildContractPortalLink = (contract) => {
        const token = String(contract?.signing_token || '').trim();
        if (!token) return '';
        const base = getPortalBaseUrl();
        return `${base}/portal/contracts/${token}`;
    };

    const selectedPlannedSubJob = useMemo(
        () => opportunityJobs.find((job) => String(job?.id || '') === String(selectedSubJobId || '')) || null,
        [opportunityJobs, selectedSubJobId]
    );

    const documentScopeLabel = useCallback((scopeType, plannedSubJob = null) => {
        const scope = String(scopeType || 'opportunity').toLowerCase();
        if (scope === 'planned_sub_job' || scope === 'job') {
            const number = plannedSubJob?.sub_job_number || plannedSubJob?.display_number || '';
            const service = String(
                plannedSubJob?.title ||
                plannedSubJob?.service_type_label ||
                plannedSubJob?.service_type ||
                'Job'
            )
                .replaceAll('_', ' ')
                .trim();
            return number ? `${number} · ${service}` : service;
        }
        return 'Opportunity';
    }, []);

    const jobSchedulerTarget = useMemo(
        () => opportunityJobs.find((job) => String(job?.id || '') === String(jobSchedulerJobId || '')) || selectedPlannedSubJob || null,
        [jobSchedulerJobId, opportunityJobs, selectedPlannedSubJob]
    );

    const loadJobSchedulerAvailability = useCallback(async (date = jobSchedulerViewDate) => {
        const opportunityId = jobSchedulerTarget?.opportunity_id || opportunity?.id;
        if (!opportunityId) return;
        const nextDate = String(date || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
        setJobSchedulerAvailabilityLoading(true);
        setJobSchedulerAvailabilityError('');
        try {
            const response = await getOpportunityAvailability(opportunityId, nextDate);
            const data = response?.data ?? response;
            setJobSchedulerAvailability(data || null);
            setJobSchedulerViewDate(nextDate);
        } catch (err) {
            setJobSchedulerAvailability(null);
            setJobSchedulerAvailabilityError(getErrorMessage(err, 'Unable to load availability.'));
        } finally {
            setJobSchedulerAvailabilityLoading(false);
        }
    }, [getErrorMessage, jobSchedulerTarget?.opportunity_id, jobSchedulerViewDate, opportunity?.id]);

    const openJobSchedulerControls = useCallback((jobId) => {
        if (!jobId) return;
        if (String(selectedSubJobId || '') !== String(jobId)) {
            onSelectedSubJobChange?.(String(jobId));
        }
        const job = opportunityJobs.find((item) => String(item?.id || '') === String(jobId)) || null;
        setJobSchedulerJobId(String(jobId));
        const centerDate = String(job?.move_date || opportunity?.move_date || jobSchedulerViewDate || new Date().toISOString().slice(0, 10)).slice(0, 10);
        setJobSchedulerViewDate(centerDate);
        setJobSchedulerDraft({
            move_date: job?.move_date || '',
            arrival_window_start: formatTimeInputValue(job?.arrival_window_start),
            arrival_window_end: formatTimeInputValue(job?.arrival_window_end),
        });
        loadJobSchedulerAvailability(centerDate);
        setEstimateActiveTab('charges');
        setIsJobSchedulerModalOpen(true);
    }, [jobSchedulerViewDate, loadJobSchedulerAvailability, opportunity?.move_date, opportunityJobs, onSelectedSubJobChange, selectedSubJobId]);

    const closeJobSchedulerModal = useCallback(() => {
        setIsJobSchedulerModalOpen(false);
        setJobSchedulerJobId('');
        setJobSchedulerAvailability(null);
        setJobSchedulerAvailabilityError('');
    }, []);

    const saveJobSchedulerModal = useCallback(async () => {
        if (!jobSchedulerJobId) return;
        try {
            await onUpdateSelectedSubJob?.({
                move_date: jobSchedulerDraft.move_date || null,
                arrival_window_start: jobSchedulerDraft.arrival_window_start || null,
                arrival_window_end: jobSchedulerDraft.arrival_window_end || null,
            });
            setIsJobSchedulerModalOpen(false);
        } catch (err) {
            setToast({ type: 'error', text: getErrorMessage(err, 'Unable to save the scheduling window.') });
        }
    }, [jobSchedulerDraft.arrival_window_end, jobSchedulerDraft.arrival_window_start, jobSchedulerDraft.move_date, jobSchedulerJobId, onUpdateSelectedSubJob]);

    const clearJobSchedulerModal = useCallback(async () => {
        if (!jobSchedulerJobId) return;
        try {
            await onUpdateSelectedSubJob?.({
                move_date: null,
                arrival_window_start: null,
                arrival_window_end: null,
            });
            setJobSchedulerDraft({
                move_date: '',
                arrival_window_start: '',
                arrival_window_end: '',
            });
            setIsJobSchedulerModalOpen(false);
        } catch (err) {
            setToast({ type: 'error', text: getErrorMessage(err, 'Unable to clear the scheduling window.') });
        }
    }, [jobSchedulerJobId, onUpdateSelectedSubJob]);

    const jobSchedulerSelectedDateKey = jobSchedulerDraft.move_date ? String(jobSchedulerDraft.move_date).slice(0, 10) : '';
    const jobSchedulerDaysToRender = useMemo(() => {
        const dayOffsets = [-2, -1, 0, 1, 2];
        return dayOffsets.map((offset) => {
            const date = getOffsetDateStr(jobSchedulerViewDate, offset);
            const dayData = jobSchedulerAvailability?.days?.find((day) => day.date === date);
            return { date, dayData };
        });
    }, [jobSchedulerAvailability, jobSchedulerViewDate]);
    const jobSchedulerSelectedDayData = useMemo(
        () => jobSchedulerDaysToRender.find((day) => day.date === jobSchedulerSelectedDateKey)?.dayData || null,
        [jobSchedulerDaysToRender, jobSchedulerSelectedDateKey]
    );
    const jobSchedulerSelectedWindowLabel = jobSchedulerDraft.arrival_window_start && jobSchedulerDraft.arrival_window_end
        ? `${formatTimeAMPM(jobSchedulerDraft.arrival_window_start)} - ${formatTimeAMPM(jobSchedulerDraft.arrival_window_end)}`
        : 'No time selected';

    const normalizeTemplateCondition = useCallback((value) => {
        return String(value || '')
            .trim()
            .toLowerCase()
            .replaceAll(' ', '_')
            .replaceAll('-', '_');
    }, []);

    const templateAppliesToContext = useCallback((template, plannedSubJob = null) => {
        const scope = String(template?.scope_type || 'opportunity').toLowerCase();
        if (scope === 'planned_sub_job' && !plannedSubJob) return false;
        if (!(scope === 'opportunity' || scope === 'planned_sub_job' || scope === 'job')) return false;

        const templateServiceType = normalizeTemplateCondition(template?.applies_to_service_type);
        const templateBindingType = normalizeTemplateCondition(template?.applies_to_binding_type);
        const templateOppType = normalizeTemplateCondition(template?.applies_to_opp_type);

        const selectedServiceType = normalizeTemplateCondition(
            scope === 'planned_sub_job'
                ? (plannedSubJob?.service_type || plannedSubJob?.service_type_label || opportunity?.service_type)
                : opportunity?.service_type
        );
        const selectedBindingType = normalizeTemplateCondition(
            opportunity?.binding_type || estimate?.binding_type || estimate?.rate_type
        );
        const selectedOppType = normalizeTemplateCondition(
            opportunity?.move_type || estimate?.move_type
        );

        if (templateServiceType && templateServiceType !== selectedServiceType) return false;
        if (templateBindingType && templateBindingType !== selectedBindingType) return false;
        if (templateOppType && templateOppType !== selectedOppType) return false;

        return true;
    }, [opportunity?.service_type, opportunity?.binding_type, opportunity?.move_type, estimate?.binding_type, estimate?.rate_type, estimate?.move_type, normalizeTemplateCondition]);

    const contractStatusTone = (statusValue) => {
        const status = String(statusValue || '').toLowerCase();
        if (status === 'signed') return 'success';
        if (status === 'sent') return 'warning';
        if (status === 'voided' || status === 'expired') return 'danger';
        return 'neutral';
    };

    const contractStatusLabel = (statusValue) => {
        const status = String(statusValue || '').toLowerCase();
        if (status === 'draft') return 'Not Sent';
        if (status === 'sent') return 'Sent';
        if (status === 'signed') return 'Signed';
        if (status === 'voided') return 'Voided';
        if (status === 'expired') return 'Expired';
        return String(statusValue || 'Unknown');
    };

    const statusPillClass = (tone) => {
        if (tone === 'success') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (tone === 'warning') return 'bg-amber-50 text-amber-700 border-amber-200';
        if (tone === 'danger') return 'bg-rose-50 text-rose-700 border-rose-200';
        return 'bg-slate-100 text-slate-700 border-slate-200';
    };

    const documentRows = useMemo(() => {
        const templates = asList(documentTemplates);
        const contracts = asList(documentContracts).slice().sort((a, b) => {
            const aTime = new Date(a?.updated_at || a?.created_at || 0).getTime();
            const bTime = new Date(b?.updated_at || b?.created_at || 0).getTime();
            return bTime - aTime;
        });
        const templateRows = [];
        const templateKeys = new Set();

        templates.forEach((template) => {
            const scope = String(template?.scope_type || 'opportunity').toLowerCase();
            if (scope === 'planned_sub_job') {
                asList(opportunityJobs).forEach((job) => {
                    if (!templateAppliesToContext(template, job)) return;
                    const plannedKey = String(job?.id || '');
                    const templateKey = `${String(template?.id || '')}:${scope}:${plannedKey}`;
                    const schedulingWindow = formatSchedulingWindow(job);
                    templateKeys.add(templateKey);
                    templateRows.push({
                        key: `template-${templateKey || template?.name || Math.random().toString(36).slice(2, 8)}`,
                        template,
                        contract: null,
                        kind: 'template',
                        title: `${String(template?.name || 'Document').trim() || 'Document'}${schedulingWindow ? ` · ${schedulingWindow}` : ''}`,
                        description: `${String(template?.template_type || 'contract').replaceAll('_', ' ')} · ${documentScopeLabel(scope, job)}`,
                        scopeType: scope,
                        plannedSubJob: job,
                        templateKey,
                    });
                });
                return;
            }
            if (!templateAppliesToContext(template, null)) return;
            const templateKey = `${String(template?.id || '')}:${scope}:`;
            templateKeys.add(templateKey);
            templateRows.push({
                key: `template-${templateKey || template?.name || Math.random().toString(36).slice(2, 8)}`,
                template,
                contract: null,
                kind: 'template',
                title: String(template?.name || 'Document').trim() || 'Document',
                description: `${String(template?.template_type || 'contract').replaceAll('_', ' ')} · ${documentScopeLabel(scope, null)}`,
                scopeType: scope,
                plannedSubJob: null,
                templateKey,
            });
        });

        const contractByTemplate = new Map();
        const seenContractIds = new Set();

        contracts.forEach((contract) => {
            const templateId = String(contract?.document_template || '').trim();
            if (!templateId) return;
            const scope = String(contract?.scope_type || contract?.document_template_details?.scope_type || 'opportunity').toLowerCase();
            const plannedKey = scope === 'planned_sub_job' ? String(contract?.planned_sub_job || contract?.planned_sub_job_id || '') : '';
            const templateKey = `${templateId}:${scope}:${plannedKey}`;
            if (templateKeys.has(templateKey)) {
                seenContractIds.add(String(contract.id));
                if (!contractByTemplate.has(templateKey)) {
                    contractByTemplate.set(templateKey, contract);
                }
            }
        });

        const resolvedTemplateRows = templateRows.map((row) => ({
            ...row,
            contract: contractByTemplate.get(row.templateKey) || null,
        }));

        const orphanContracts = contracts
            .filter((contract) => {
                if (seenContractIds.has(String(contract?.id))) return false;
                const scope = String(contract?.scope_type || 'opportunity').toLowerCase();
                return scope === 'opportunity' || scope === 'job';
            })
            .map((contract) => ({
                key: `contract-${contract?.id}-${contract?.scope_type || 'opportunity'}-${contract?.planned_sub_job || contract?.planned_sub_job_id || ''}`,
                template: null,
                contract,
                kind: 'contract',
                title: (() => {
                    const baseTitle = String(contract?.title || contract?.contract_number || 'Document').trim() || 'Document';
                    const relatedJob = opportunityJobs.find((job) => String(job?.id || '') === String(contract?.planned_sub_job || contract?.planned_sub_job_id || '')) || null;
                    const schedulingWindow = relatedJob ? formatSchedulingWindow(relatedJob) : '';
                    return `${baseTitle}${schedulingWindow ? ` · ${schedulingWindow}` : ''}`;
                })(),
                description: `${String(contract?.contract_number || 'Contract').trim() || 'Contract'} · ${documentScopeLabel(contract?.scope_type, opportunityJobs.find((job) => String(job?.id || '') === String(contract?.planned_sub_job || contract?.planned_sub_job_id || '')) || null)}`,
                scopeType: String(contract?.scope_type || 'opportunity').toLowerCase(),
                plannedSubJob: opportunityJobs.find((job) => String(job?.id || '') === String(contract?.planned_sub_job || contract?.planned_sub_job_id || '')) || null,
            }));

        return [...resolvedTemplateRows, ...orphanContracts].sort((a, b) => {
            const aName = String(a?.title || '').toLowerCase();
            const bName = String(b?.title || '').toLowerCase();
            return aName.localeCompare(bName);
        });
    }, [documentContracts, documentTemplates, documentScopeLabel, opportunityJobs, templateAppliesToContext]);

    const documentSections = useMemo(() => {
        const rows = asList(documentRows);
        const sections = [];

        const opportunityRows = rows.filter((row) => String(row?.scopeType || 'opportunity').toLowerCase() === 'opportunity');
        if (opportunityRows.length) {
            sections.push({
                key: 'opportunity',
                title: 'Opportunity',
                description: 'Customer-facing commercial documents for the full opportunity.',
                rows: opportunityRows,
            });
        }

        asList(opportunityJobs).forEach((job) => {
            const jobRows = rows.filter((row) => (
                ['planned_sub_job', 'job'].includes(String(row?.scopeType || '').toLowerCase()) &&
                String(row?.plannedSubJob?.id || '') === String(job?.id || '')
            ));
            if (!jobRows.length) return;
            sections.push({
                key: `job-${job?.id || Math.random().toString(36).slice(2, 8)}`,
                title: `Job ${documentScopeLabel('planned_sub_job', job)}`,
                description: 'Service-day documents for this job.',
                jobId: job?.id || null,
                rows: jobRows,
            });
        });

        return sections;
    }, [documentRows, documentScopeLabel, opportunityJobs]);
    const hasActiveDocumentAction = Boolean(documentActionId);

    const loadDocuments = async () => {
        const opportunityId = estimate?.opportunity?.id || estimate?.opportunity_id || opportunity?.id;
        if (!estimate?.id || !opportunityId) {
            setDocumentTemplates([]);
            setDocumentContracts([]);
            setDocumentsError('');
            return;
        }

        setDocumentsLoading(true);
        setDocumentsError('');
        try {
            const branchId = getOpportunityBranchId();
            const templateParams = { template_type: 'contract', is_active: 'true' };
            if (branchId) {
                templateParams.branch = branchId;
            }
            const [templatesRes, estimateContractsRes, opportunityContractsRes] = await Promise.all([
                getDocumentTemplates(templateParams),
                getContracts({ estimate: estimate.id }),
                getContracts({ opportunity: opportunityId }),
            ]);
            const templates = asList(templatesRes?.data ?? templatesRes);
            const estimateContracts = asList(estimateContractsRes?.data ?? estimateContractsRes);
            const opportunityContracts = asList(opportunityContractsRes?.data ?? opportunityContractsRes);
            const mergedContracts = [...estimateContracts, ...opportunityContracts].reduce((rows, contract) => {
                if (!contract?.id) return rows;
                if (rows.some((row) => String(row.id) === String(contract.id))) return rows;
                rows.push(contract);
                return rows;
            }, []);

            setDocumentTemplates(templates);
            setDocumentContracts(mergedContracts);
        } catch (err) {
            setDocumentTemplates([]);
            setDocumentContracts([]);
            setDocumentsError(getErrorMessage(err, 'Unable to load documents.'));
        } finally {
            setDocumentsLoading(false);
        }
    };

    const getBranchDetails = () => {
        const branch = opportunity?.branch_details || opportunity?.branch || {};
        return {
            name: branch.name || 'Our Branch',
            phone: branch.phone || branch.primary_phone || '',
            email: branch.email || '',
            address: [branch.address_line1, branch.city, branch.state, branch.postal_code].filter(Boolean).join(', ') || ''
        };
    };

    const stripHtml = (html) => {
        if (!html) return '';
        return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    };

    const generateEmailTemplate1 = (customerName, documents, branch, salesNumber) => {
        const docButtons = documents.map(doc => {
            const link = doc.link;
            return `
                <div style="margin-bottom: 12px; text-align: center;">
                    <a href="${link}" target="_blank" style="display: inline-block; padding: 12px 24px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; font-weight: bold; color: #ffffff; background-color: #1f7ae0; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 6px rgba(31, 122, 224, 0.15); transition: background-color 0.2s;">
                        Review & Sign: ${doc.title}
                    </a>
                </div>
            `;
        }).join('');

        return `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); background-color: #ffffff;">
                <div style="background-color: #1f7ae0; padding: 32px 24px; text-align: center; color: #ffffff;">
                    <h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">Move Documents For Review</h2>
                    <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Opportunity #${salesNumber || ''}</p>
                </div>
                <div style="padding: 32px 24px;">
                    <p style="margin-top: 0; font-size: 16px; font-weight: 600; color: #0f172a;">Hello ${customerName || 'Valued Customer'},</p>
                    <p style="font-size: 14px; color: #475569;">Please review and sign the contract documents for your upcoming move. Click on each document button below to open the secure portal and complete your signature:</p>
                    
                    <div style="margin: 28px 0; padding: 20px; background-color: #f8fafc; border-radius: 16px; border: 1px dashed #cbd5e1;">
                        ${docButtons}
                    </div>
                    
                    <p style="font-size: 14px; color: #475569;">If you have any questions or need to make adjustments, please contact our branch. We are happy to help!</p>
                    
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0 24px 0;" />
                    
                    <div style="font-size: 13px; color: #64748b; background-color: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #f1f5f9;">
                        <strong style="color: #0f172a; font-size: 14px; display: block; margin-bottom: 6px;">${branch.name}</strong>
                        ${branch.phone ? `<strong>Phone:</strong> ${branch.phone}<br />` : ''}
                        ${branch.email ? `<strong>Email:</strong> ${branch.email}<br />` : ''}
                        ${branch.address ? `<strong>Address:</strong> ${branch.address}` : ''}
                    </div>
                </div>
                <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
                    This is an automated request from our CRM. Please do not reply directly to this email.
                </div>
            </div>
        `;
    };

    const handleOpenMultiSend = async () => {
        if (!selectedDocKeys.length) {
            setToast({ type: 'error', text: 'Please select at least one document.' });
            return;
        }

        const opportunityId = estimate?.opportunity?.id || estimate?.opportunity_id || opportunity?.id;
        if (!estimate?.id || !opportunityId) return;

        const customer = getOpportunityCustomer();
        const defaultEmail = availableEmails[0]?.value || customer.email || '';
        if (!defaultEmail) {
            setToast({ type: 'error', text: 'Customer needs an email address or additional contact email before sending documents.' });
            return;
        }

        const selectedRows = documentRows.filter(row => selectedDocKeys.includes(row.key));
        
        setIsMultiSending(true);
        try {
            const preparedDocs = [];
            for (const row of selectedRows) {
                let contract = row.contract;
                if (!contract?.id && row.template?.id) {
                    const template = row.template;
                    const created = await createContract({
                        opportunity: opportunityId,
                        estimate: estimate.id,
                        customer: customer.id,
                        document_template: template.id,
                        title: String(template?.name || 'Contract').trim() || 'Contract',
                        contract_number: buildEstimateContractNumber(estimate, template),
                    });
                    contract = created?.data || created;
                }
                if (contract?.id) {
                    const link = buildContractPortalLink(contract);
                    preparedDocs.push({
                        title: row.title,
                        link: link,
                    });
                }
            }

            if (!preparedDocs.length) {
                throw new Error('Unable to prepare documents for signature.');
            }

            const branchInfo = getBranchDetails();
            const salesNo = estimate?.opportunity?.sales_number || opportunity?.sales_number || estimate?.opportunity_id || '';
            const emailSubject = `Move Documents for Signature - Opportunity #${salesNo}`;
            const emailBody = generateEmailTemplate1(customer.name, preparedDocs, branchInfo, salesNo);

            setMultiSendEmailData({
                to: defaultEmail,
                subject: emailSubject,
                body: emailBody,
                documents: preparedDocs
            });
            setIsMultiSendCustomEmail(false);
            setIsMultiSendModalOpen(true);
        } catch (err) {
            setToast({ type: 'error', text: getErrorMessage(err, 'Failed to prepare selected documents.') });
        } finally {
            setIsMultiSending(false);
        }
    };

    const handleConfirmMultiSend = async () => {
        const opportunityId = estimate?.opportunity?.id || estimate?.opportunity_id || opportunity?.id;
        if (!opportunityId) return;

        setIsMultiSending(true);
        try {
            const activeBody = multiSendEmailData.body;
            const subject = multiSendEmailData.subject.trim();
            const toEmail = multiSendEmailData.to.trim();
            
            const createdRes = await createSalesActivity({
                opportunity: opportunityId,
                activity_type: 'email',
                subject: subject,
                description: stripHtml(activeBody),
                direction: 'outbound',
                status: 'completed',
            });
            const created = createdRes?.data || createdRes;
            
            if (!created?.id) {
                throw new Error('Failed to log email activity.');
            }

            const formData = new FormData();
            formData.append('activity', created.id);
            formData.append('to_email', toEmail);
            formData.append('subject', subject);
            formData.append('body_html', activeBody);
            
            const emailLog = await api.post('/sales/email-logs/', formData);
            if (emailLog?.status === 'failed') {
                throw new Error(emailLog?.error_message || 'Email integration delivery failed.');
            }

            setToast({
                type: 'success',
                text: 'Email with selected documents sent successfully.',
            });
            setIsMultiSendModalOpen(false);
            setSelectedDocKeys([]);
            await loadDocuments();
            if (onRefresh) onRefresh();
        } catch (err) {
            setToast({
                type: 'error',
                text: getErrorMessage(err, 'Failed to send consolidated email.'),
            });
        } finally {
            setIsMultiSending(false);
        }
    };

    const sendDocumentForSignature = async (row, delivery = {}) => {
        const opportunityId = estimate?.opportunity?.id || estimate?.opportunity_id || opportunity?.id;
        if (!estimate?.id || !opportunityId) return;
        const template = row?.template || null;
        const existingContract = row?.contract || null;
        if (!template && !existingContract) return;

        const customer = getOpportunityCustomer();
        if (!customer.id) {
            setToast({ type: 'error', text: 'Customer is missing on this opportunity.' });
            return;
        }
        const wantsEmail = delivery.send_email !== undefined
            ? Boolean(delivery.send_email)
            : Boolean(availableEmails[0]?.value || customer.email);
        const wantsSms = delivery.send_sms !== undefined
            ? Boolean(delivery.send_sms)
            : Boolean(availablePhones[0]?.value || customer.phone);
        const targetEmail = String(delivery.to_email ?? availableEmails[0]?.value ?? customer.email ?? '').trim();
        const targetPhone = String(delivery.to_phone ?? availablePhones[0]?.value ?? customer.phone ?? '').trim();
        const sendEmail = wantsEmail && Boolean(targetEmail);
        const sendSms = wantsSms && Boolean(targetPhone);
        if (wantsEmail && !targetEmail) {
            setToast({ type: 'error', text: 'Select or enter an email recipient before sending the document.' });
            return;
        }
        if (wantsSms && !targetPhone) {
            setToast({ type: 'error', text: 'Select or enter an SMS recipient before sending the document.' });
            return;
        }
        if (!sendEmail && !sendSms) {
            setToast({ type: 'error', text: 'Select email, SMS, or both before sending the document.' });
            return;
        }

        setDocumentActionId(String(row?.key || template?.id || existingContract?.id || ''));
        try {
            let contract = existingContract;
            if (!contract?.id && template?.id) {
                const scopeType = String(template?.scope_type || 'opportunity').toLowerCase();
                const created = await createContract({
                    opportunity: opportunityId,
                    estimate: estimate.id,
                    customer: customer.id,
                    document_template: template.id,
                    scope_type: scopeType,
                    planned_sub_job: scopeType === 'planned_sub_job' ? selectedPlannedSubJob?.id || null : null,
                    title: String(template?.name || 'Contract').trim() || 'Contract',
                    contract_number: buildEstimateContractNumber(estimate, template),
                });
                contract = created?.data || created;
            }

            if (!contract?.id) {
                throw new Error('Unable to create document record.');
            }

            const response = await sendContractForSignature(contract.id, {
                send_email: sendEmail,
                send_sms: sendSms,
                to_email: sendEmail ? targetEmail : undefined,
                to_phone: sendSms ? targetPhone : undefined,
                portal_base_url: getPortalBaseUrl(),
                dispatch_via_automation: true,
            });
            const warnings = Array.isArray(response?.errors) && response.errors.length ? ` Warnings: ${response.errors.join(' ')}` : '';
            setToast({
                type: 'success',
                text: `${contract?.status === 'sent' ? 'Document resent.' : 'Document sent for signature.'}${warnings}`,
            });
            await loadDocuments();
            if (onRefresh) onRefresh();
        } catch (err) {
            setToast({ type: 'error', text: getErrorMessage(err, 'Unable to send document for signature.') });
        } finally {
            setDocumentActionId('');
        }
    };

    const ensureDocumentContract = async (row) => {
        const opportunityId = estimate?.opportunity?.id || estimate?.opportunity_id || opportunity?.id;
        if (!estimate?.id || !opportunityId) return null;
        const template = row?.template || null;
        const existingContract = row?.contract || null;
        if (existingContract?.id) return existingContract;
        if (!template?.id) return null;

        const customer = getOpportunityCustomer();
        if (!customer.id) {
            throw new Error('Customer is missing on this opportunity.');
        }

        const scopeType = String(template?.scope_type || 'opportunity').toLowerCase();
        const created = await createContract({
            opportunity: opportunityId,
            estimate: estimate.id,
            customer: customer.id,
            document_template: template.id,
            scope_type: scopeType,
            planned_sub_job: scopeType === 'planned_sub_job' ? row?.plannedSubJob?.id || selectedPlannedSubJob?.id || null : null,
            title: String(template?.name || 'Contract').trim() || 'Contract',
            contract_number: buildEstimateContractNumber(estimate, template),
        });
        return created?.data || created || null;
    };

    const handleOpenPreview = async (row) => {
        const templateId = row.template?.id || row.contract?.document_template?.id || row.contract?.document_template;
        const isSignedPreview = ['signed', 'closed', 'voided'].includes(String(row.contract?.status || '').toLowerCase());
        if (!templateId && !isSignedPreview) {
            setToast({ type: 'error', text: 'Template ID is missing for this document.' });
            return;
        }

        const defaultEmail = String(availableEmails[0]?.value || getOpportunityCustomer().email || '').trim();
        const defaultPhone = String(availablePhones[0]?.value || getOpportunityCustomer().phone || '').trim();
        setDocumentSendEmail(Boolean(defaultEmail));
        setDocumentSendSms(Boolean(defaultPhone));
        setDocumentSelectedEmails(defaultEmail ? [defaultEmail] : []);
        setDocumentSelectedPhones(defaultPhone ? [defaultPhone] : []);
        setDocumentCustomEmail('');
        setDocumentCustomPhone('');
        setPreviewingRow(row);
        setPreviewHtml('');
        setIsPreviewLoading(true);

        if (isSignedPreview) {
            const fallbackHtml = row.contract?.content_html || '';
            const token = String(row.contract?.signing_token || '').trim();
            if (token) {
                try {
                    const response = await getPublicContractPortal(token);
                    const portalData = response?.data ?? response;
                    const signedHtml = portalData?.content_html || fallbackHtml;
                    setPreviewHtml(signedHtml);
                    if (portalData?.contract_id) {
                        setDocumentContracts((contracts) => asList(contracts).map((contract) => (
                            String(contract?.id) === String(portalData.contract_id)
                                ? { ...contract, content_html: signedHtml, status: portalData.status || contract.status }
                                : contract
                        )));
                    }
                } catch (err) {
                    setPreviewHtml(fallbackHtml);
                }
            } else {
                setPreviewHtml(fallbackHtml);
            }
            setIsPreviewLoading(false);
            return;
        }

        const opportunityId = estimate?.opportunity?.id || estimate?.opportunity_id || opportunity?.id;
        try {
            const response = await previewDocumentTemplate(templateId, {
                opportunity: opportunityId,
                planned_sub_job: row?.scopeType === 'planned_sub_job' ? row?.plannedSubJob?.id || selectedPlannedSubJob?.id || null : null,
                portal_base_url: getPortalBaseUrl()
            });
            const html = response?.rendered_html || response?.data?.rendered_html || '';
            setPreviewHtml(html);
        } catch (err) {
            setToast({ type: 'error', text: getErrorMessage(err, 'Unable to load document preview.') });
            setPreviewingRow(null);
        } finally {
            setIsPreviewLoading(false);
        }
    };

    const copyDocumentLink = async (row) => {
        const link = buildContractPortalLink(row?.contract);
        if (!link) return;
        try {
            await navigator.clipboard.writeText(link);
            setToast({ type: 'success', text: 'Document link copied to clipboard.' });
        } catch {
            setToast({ type: 'error', text: 'Unable to copy document link.' });
        }
    };

    const clearDocumentSignatureAndResend = async (row) => {
        const contract = row?.contract || null;
        if (!contract?.id) return;

        const ok = window.confirm(
            'Clear the signed document? The customer will need to sign it again after you resend.'
        );
        if (!ok) return;

        setDocumentActionId(String(row?.key || contract.id));
        try {
            const response = await clearContractSignature(contract.id);
            const clearedContract = response?.data || response;
            const nextRow = { ...row, contract: clearedContract };
            setDocumentContracts((contracts) => asList(contracts).map((item) => (
                String(item?.id) === String(clearedContract?.id) ? clearedContract : item
            )));
            setToast({ type: 'success', text: 'Signature cleared. Review and resend the document.' });
            await handleOpenPreview(nextRow);
            if (onRefresh) onRefresh();
        } catch (err) {
            setToast({ type: 'error', text: getErrorMessage(err, 'Unable to clear the document signature.') });
        } finally {
            setDocumentActionId('');
        }
    };

    const resetDocumentSignature = async (row) => {
        const contract = row?.contract || null;
        if (!contract?.id) return;

        const ok = window.confirm(
            'Reset the signed document? The customer will need to sign again, but you do not have to resend immediately.'
        );
        if (!ok) return;

        setDocumentActionId(String(row?.key || contract.id));
        try {
            const response = await clearContractSignature(contract.id);
            const clearedContract = response?.data || response;
            setDocumentContracts((contracts) => asList(contracts).map((item) => (
                String(item?.id) === String(clearedContract?.id) ? clearedContract : item
            )));
            setToast({ type: 'success', text: 'Signature reset. You can resend the document later.' });
            if (onRefresh) onRefresh();
        } catch (err) {
            setToast({ type: 'error', text: getErrorMessage(err, 'Unable to reset the document signature.') });
        } finally {
            setDocumentActionId('');
        }
    };

    const renderDocumentRow = useCallback((row) => {
        const contract = row.contract || null;
        const status = String(contract?.status || 'draft').toLowerCase();
        const tone = contractStatusTone(status);
        const link = buildContractPortalLink(contract);
        const isActioning = documentActionId && documentActionId === String(row.key);
        const isClosed = ['signed', 'voided', 'expired'].includes(status);
        const isSigned = status === 'signed';
        const sendLabel = isClosed
            ? status === 'signed'
                ? 'Signed'
                : 'Closed'
                : contract
                    ? status === 'sent'
                        ? 'Resend'
                        : 'Send'
                : 'Create & Send';
        const triggerDownload = async (url, filename) => {
            if (!url) return;
            const anchor = document.createElement('a');
            const response = await fetch(url);
            if (!response.ok) throw new Error('Unable to generate document PDF.');
            const blob = await response.blob();
            if (!blob.type.includes('application/pdf')) throw new Error('The server did not return a PDF.');
            const objectUrl = URL.createObjectURL(blob);
            anchor.href = objectUrl;
            anchor.download = filename;
            anchor.rel = 'noopener noreferrer';
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        };

        const onDownloadPdf = async () => {
            try {
                const contractForDownload = await ensureDocumentContract(row);
                if (!contractForDownload?.id) {
                    throw new Error('Unable to create document record.');
                }

                const token = String(contractForDownload?.signing_token || '').trim();
                if (!token) {
                    throw new Error('Unable to generate document PDF.');
                }

                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
                const url = `${apiUrl}/public/contracts/portal/pdf/?token=${encodeURIComponent(token)}`;
                await triggerDownload(url, `contract_${contractForDownload.id}.pdf`);
            } catch (err) {
                setToast({ type: 'error', text: getErrorMessage(err, 'Unable to download document PDF.') });
            }
        };

        return (
            <div key={row.key} className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="mt-1 flex items-center shrink-0">
                        <input
                            type="checkbox"
                            checked={selectedDocKeys.includes(row.key)}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    setSelectedDocKeys(prev => [...prev, row.key]);
                                } else {
                                    setSelectedDocKeys(prev => prev.filter(k => k !== row.key));
                                }
                            }}
                            className="h-4.5 w-4.5 rounded border-slate-300 text-brand focus:ring-brand cursor-pointer"
                        />
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            {link ? (
                                <button
                                    type="button"
                                    onClick={() => window.open(link, '_blank')}
                                    className="truncate text-sm font-extrabold text-brand hover:text-brand-dark hover:underline focus:outline-none cursor-pointer text-left"
                                >
                                    {row.title}
                                </button>
                            ) : (
                                <h4 className="truncate text-sm font-extrabold text-slate-900">{row.title}</h4>
                            )}
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusPillClass(tone)}`}>
                                {contractStatusLabel(status)}
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                            {row.description}
                            {contract?.contract_number ? ` · ${contract.contract_number}` : ''}
                            {row.template?.id ? ` · Template #${row.template.id}` : ''}
                        </p>
                        {row.scopeType === 'planned_sub_job' && row.plannedSubJob ? (
                            <div className="mt-2 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                                {documentScopeLabel(row.scopeType, row.plannedSubJob)}
                            </div>
                        ) : null}
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span>Sent: {formatDateTime(contract?.sent_at)}</span>
                            <span>Signed: {formatDateTime(contract?.signed_at)}</span>
                            <span>Updated: {formatDateTime(contract?.updated_at || contract?.created_at)}</span>
                        </div>
                        {contract?.signing_token ? (
                            <p className="mt-2 break-all text-xs text-slate-400">
                                {link}
                            </p>
                        ) : null}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:justify-end shrink-0">
                    <DocumentActionMenu
                        contract={contract}
                        row={row}
                        link={link}
                        isSigned={isSigned}
                        isClosed={isClosed}
                        hasActiveDocumentAction={hasActiveDocumentAction}
                        isActioning={isActioning}
                        sendLabel={sendLabel}
                        onDownloadPdf={onDownloadPdf}
                        copyDocumentLink={copyDocumentLink}
                        clearDocumentSignatureAndResend={clearDocumentSignatureAndResend}
                        resetDocumentSignature={resetDocumentSignature}
                        handleOpenPreview={handleOpenPreview}
                    />
                </div>
            </div>
        );
    }, [
        buildContractPortalLink,
        clearDocumentSignatureAndResend,
        contractStatusLabel,
        contractStatusTone,
        copyDocumentLink,
        documentActionId,
        documentScopeLabel,
        estimate?.id,
        handleOpenPreview,
        hasActiveDocumentAction,
        opportunity?.id,
        selectedDocKeys,
        selectedPlannedSubJob?.id,
    ]);

    useEffect(() => {
        loadDocuments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [estimate?.id, opportunity?.id, selectedPlannedSubJob?.id]);

    useEffect(() => {
        setSelectedDocKeys([]);
    }, [selectedPlannedSubJob?.id]);

    const handleSaveStop = async (stopId, data) => {
        if (!opportunity) return;
        setSaving(true);
        try {
            if (stopId === 'origin' || stopId === 'destination') {
                const prefix = stopId === 'origin' ? 'origin_' : 'destination_';
                let city = String(data.city || '').trim();
                let state = String(data.state || '').trim();
                let postal_code = String(data.postal_code || '').trim();

                if (!city || !state || !postal_code) {
                    const parsed = parseAddressString(data.address_line1);
                    if (!city) city = parsed.city;
                    if (!state) state = parsed.state;
                    if (!postal_code) postal_code = parsed.postal_code;
                }

                const otherPrefix = stopId === 'origin' ? 'destination_' : 'origin_';
                if (!city) city = opportunity[`${otherPrefix}city`] || 'TBD';
                if (!state) state = opportunity[`${otherPrefix}state`] || 'TBD';
                if (!postal_code) postal_code = opportunity[`${otherPrefix}postal_code`] || 'TBD';

                const payload = {};
                payload[`${prefix}address_line1`] = data.address_line1;
                payload[`${prefix}city`] = city;
                payload[`${prefix}state`] = state;
                payload[`${prefix}postal_code`] = postal_code;
                payload[`${prefix}unit_number`] = data.unit_number;
                payload[`${prefix}property_type`] = data.property_type;
                payload[`${prefix}parking_type`] = data.parking_type;
                payload[`${prefix}flights_of_stairs`] = data.flights_of_stairs;
                payload[`${prefix}has_elevator`] = data.has_elevator;
                payload[`${prefix}walk_distance_ft`] = data.walk_distance_ft;
                
                if (sourceType === 'lead') {
                    await updateLead(opportunity.id, payload);
                } else {
                    await updateOpportunity(opportunity.id, payload);
                }
            } else {
                // Intermediate stop
                let city = String(data.city || '').trim();
                let state = String(data.state || '').trim();
                let postal_code = String(data.postal_code || '').trim();

                if (!city || !state || !postal_code) {
                    const parsed = parseAddressString(data.address_line1);
                    if (!city) city = parsed.city;
                    if (!state) state = parsed.state;
                    if (!postal_code) postal_code = parsed.postal_code;
                }

                const originDetails = opportunity.origin_address_details || {};
                const destinationDetails = opportunity.destination_address_details || {};
                
                if (!city) city = originDetails.city || destinationDetails.city || 'TBD';
                if (!state) state = originDetails.state || destinationDetails.state || 'TBD';
                if (!postal_code) postal_code = originDetails.zip_code || originDetails.postal_code || destinationDetails.zip_code || destinationDetails.postal_code || 'TBD';

                const payload = {
                    opportunity: opportunity.id,
                    address_line1: data.address_line1,
                    city: city,
                    state: state,
                    postal_code: postal_code,
                    unit_number: data.unit_number,
                    property_type: data.property_type,
                    parking_type: data.parking_type,
                    flights_of_stairs: data.flights_of_stairs,
                    has_elevator: data.has_elevator,
                    walk_distance_ft: data.walk_distance_ft,
                    stop_type: data.stop_type || 'stop',
                    notes: data.notes || '',
                    sort_order: Number.isFinite(Number(data.sort_order))
                        ? Number(data.sort_order)
                        : (Number.isFinite(Number(editingStopData?.sort_order)) ? Number(editingStopData.sort_order) : 0),
                };
                const isDraftStop = String(stopId || '').startsWith('temp-stop-');
                if (isDraftStop) {
                    const response = await createOpportunityStop(payload);
                    const createdStop = normalizeRouteStop(response?.data || response);
                    setRouteStops((prev) => prev.map((stop) => (stop.id === stopId ? createdStop : stop)));
                } else {
                    const response = await updateOpportunityStop(stopId, payload);
                    const updatedStop = normalizeRouteStop(response?.data || response);
                    setRouteStops((prev) => prev.map((stop) => (stop.id === stopId ? updatedStop : stop)));
                }
            }
            // Ideally we need to refresh the opportunity here, but EstimateView usually relies on props.
            // For now, we'll just show success and close.
            setEditingStopData(null);
            setIsEditStopModalOpen(false);
            if (onRefresh) onRefresh();
            setToast({ type: 'success', text: 'Stop details updated successfully.' });
        } catch (err) {
            setToast({ type: 'error', text: getErrorMessage(err, 'Failed to update stop details.') });
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sendDropdownRef.current && !sendDropdownRef.current.contains(event.target)) {
                setIsSendDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const [routeStops, setRouteStops] = useState([]);
    const [routeLegs, setRouteLegs] = useState([]);
    const [routeLoading, setRouteLoading] = useState(false);
    const [routeError, setRouteError] = useState('');
    const [routePathPoints, setRoutePathPoints] = useState([]);
    const [fallbackStopPoints, setFallbackStopPoints] = useState([]);
    const [mapsReady, setMapsReady] = useState(false);
    const [mapsLoadError, setMapsLoadError] = useState('');
    const [mapInstanceVersion, setMapInstanceVersion] = useState(0);
    const [mapTypeId, setMapTypeId] = useState('roadmap');
    const [routeMode, setRouteMode] = useState('none'); // none | routes_api | fallback
    const [isEditStopModalOpen, setIsEditStopModalOpen] = useState(false);
    const [editingStopData, setEditingStopData] = useState(null);
    const [routeProviderNotice, setRouteProviderNotice] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState({ type: '', text: '' });
    const [branches, setBranches] = useState([]);
    const [isEstimateRequirementsModalOpen, setIsEstimateRequirementsModalOpen] = useState(false);
    const [estimateRequirementsDraft, setEstimateRequirementsDraft] = useState(null);
    const [estimateRequirementsError, setEstimateRequirementsError] = useState('');
    const [isSavingEstimateRequirements, setIsSavingEstimateRequirements] = useState(false);
    const [isSendModalOpen, setIsSendModalOpen] = useState(false);
    const [isPortalSelectModalOpen, setIsPortalSelectModalOpen] = useState(false);
    const [sendEmail, setSendEmail] = useState(true);
    const [sendSMS, setSendSMS] = useState(false);
    const [depositType, setDepositType] = useState('percentage'); // 'percentage' | 'amount'
    const [depositValue, setDepositValue] = useState('10');
    const [selectedRecipientEmails, setSelectedRecipientEmails] = useState([]);
    const [selectedRecipientPhones, setSelectedRecipientPhones] = useState([]);
    const [customRecipientEmail, setCustomRecipientEmail] = useState('');
    const [customRecipientPhone, setCustomRecipientPhone] = useState('');

    const availableEmails = useMemo(() => {
        const list = [];
        const seen = new Set();

        const addEmail = (email, label) => {
            if (!email) return;
            const cleaned = email.trim();
            if (!cleaned || seen.has(cleaned.toLowerCase())) return;
            seen.add(cleaned.toLowerCase());
            list.push({ label, value: cleaned });
        };

        if (opportunity?.customer_details?.email) {
            addEmail(
                opportunity.customer_details.email,
                `Customer Primary: ${opportunity.customer_details.email}`
            );
        }
        if (opportunity?.email) {
            addEmail(
                opportunity.email,
                `Opportunity Email: ${opportunity.email}`
            );
        }
        if (opportunity?.customer_details?.contacts && Array.isArray(opportunity.customer_details.contacts)) {
            opportunity.customer_details.contacts.forEach((contact) => {
                if (contact.email) {
                    const label = contact.relationship
                        ? `${contact.name} (${contact.relationship}): ${contact.email}`
                        : `${contact.name}: ${contact.email}`;
                    addEmail(contact.email, label);
                }
            });
        }
        if (opportunity?.additional_contacts && Array.isArray(opportunity.additional_contacts)) {
            opportunity.additional_contacts.forEach((contact) => {
                if (contact.email) {
                    const label = contact.relationship
                        ? `${contact.name} (${contact.relationship}): ${contact.email}`
                        : `${contact.name}: ${contact.email}`;
                    addEmail(contact.email, label);
                }
            });
        }
        return list;
    }, [opportunity]);

    const availablePhones = useMemo(() => {
        const list = [];
        const seen = new Set();

        const addPhone = (phone, label) => {
            if (!phone) return;
            const cleaned = phone.trim();
            if (!cleaned || seen.has(cleaned)) return;
            seen.add(cleaned);
            list.push({ label, value: cleaned });
        };

        if (opportunity?.customer_details?.primary_phone) {
            const pType = opportunity.customer_details.primary_phone_type || 'Primary';
            addPhone(
                opportunity.customer_details.primary_phone,
                `Customer ${pType}: ${opportunity.customer_details.primary_phone}`
            );
        }
        if (opportunity?.customer_details?.alternate_phone) {
            const aType = opportunity.customer_details.alternate_phone_type || 'Alternate';
            addPhone(
                opportunity.customer_details.alternate_phone,
                `Customer ${aType}: ${opportunity.customer_details.alternate_phone}`
            );
        }
        if (opportunity?.phone) {
            addPhone(
                opportunity.phone,
                `Opportunity Phone: ${opportunity.phone}`
            );
        }
        if (opportunity?.customer_details?.contacts && Array.isArray(opportunity.customer_details.contacts)) {
            opportunity.customer_details.contacts.forEach((contact) => {
                if (contact.phone) {
                    const label = contact.relationship
                        ? `${contact.name} (${contact.relationship}): ${contact.phone}`
                        : `${contact.name}: ${contact.phone}`;
                    addPhone(contact.phone, label);
                }
            });
        }
        if (opportunity?.additional_contacts && Array.isArray(opportunity.additional_contacts)) {
            opportunity.additional_contacts.forEach((contact) => {
                if (contact.phone) {
                    const label = contact.relationship
                        ? `${contact.name} (${contact.relationship}): ${contact.phone}`
                        : `${contact.name}: ${contact.phone}`;
                    addPhone(contact.phone, label);
                }
            });
        }
        return list;
    }, [opportunity]);

    const toggleMultiRecipientSelection = (value, setter) => {
        const normalizedValue = String(value || '').trim();
        if (!normalizedValue) return;
        setter((prev) => {
            const current = Array.isArray(prev) ? prev : [];
            return current.includes(normalizedValue)
                ? current.filter((item) => item !== normalizedValue)
                : [...current, normalizedValue];
        });
    };

    const estimateIsLocked = useMemo(() => {
        const status = String(estimate?.status || '').toLowerCase();
        const requiresReapproval = Boolean(estimate?.requires_reapproval);
        if (requiresReapproval) return false;
        return status === 'voided';
    }, [estimate?.requires_reapproval, estimate?.status]);

    const estimateIsSigned = useMemo(() => {
        const status = String(estimate?.status || '').toLowerCase();
        return status === 'signed' || Boolean(estimate?.esigned);
    }, [estimate?.esigned, estimate?.status]);

    const canModifyEstimate = canEditOpportunity && !estimateIsLocked;

    const routeTabActive = estimateActiveTab === 'route';
    const paymentsEnabled = Boolean(estimate?.id);

    const ensureEstimateEditable = (message = 'This estimate is locked.') => {
        if (!estimateIsLocked) return true;
        setToast({ type: 'error', text: message });
        return false;
    };

    const ensureChargeEditable = (message = 'This estimate cannot be edited right now.') => {
        return ensureEstimateEditable(message);
    };

    useEffect(() => {
        if (!toast?.text) return undefined;
        const t = window.setTimeout(() => setToast({ type: '', text: '' }), 4500);
        return () => window.clearTimeout(t);
    }, [toast?.text]);

    useEffect(() => {
        if (!estimateIsLocked) return;
        setIsAddChargeModalOpen(false);
        setEditingChargeId(null);
        setIsPackageModalOpen(false);
        setIsCatalogModalOpen(false);
    }, [estimateIsLocked]);

    useEffect(() => {
        let active = true;
        const loadBranchOptions = async () => {
            try {
                const res = await getBranches();
                const rows = Array.isArray(res?.results) ? res.results : Array.isArray(res) ? res : [];
                if (active) setBranches(rows);
            } catch {
                if (active) setBranches([]);
            }
        };
        loadBranchOptions();
        return () => {
            active = false;
        };
    }, []);
    const [paymentGateways, setPaymentGateways] = useState([]);
    const [paymentRequests, setPaymentRequests] = useState([]);
    const [payments, setPayments] = useState([]);
    const [refunds, setRefunds] = useState([]);
    const [paymentsLoading, setPaymentsLoading] = useState(false);
    const [paymentsError, setPaymentsError] = useState('');
    const [createPaymentOption, setCreatePaymentOption] = useState('deposit');
    const [createPaymentGatewayId, setCreatePaymentGatewayId] = useState('');
    const [createPaymentAmount, setCreatePaymentAmount] = useState('');
    const [paymentRequestLink, setPaymentRequestLink] = useState('');
    const [isPaymentRequestLinkOpen, setIsPaymentRequestLinkOpen] = useState(false);
    const [isPaymentRequestModalOpen, setIsPaymentRequestModalOpen] = useState(false);
    const [refundPaymentId, setRefundPaymentId] = useState('');
    const [refundAmount, setRefundAmount] = useState('');
    const [manualPaymentDraft, setManualPaymentDraft] = useState({ amount: '', method: 'e_transfer', reference: '', note: '' });
    const [manualPaymentEditingId, setManualPaymentEditingId] = useState(null);
    const [isSavingManualPayment, setIsSavingManualPayment] = useState(false);
    const [isManualPaymentModalOpen, setIsManualPaymentModalOpen] = useState(false);
    const [paymentToDelete, setPaymentToDelete] = useState(null);
    const [isDeletingManualPayment, setIsDeletingManualPayment] = useState(false);
    const [manualPaymentJobId, setManualPaymentJobId] = useState(null);
    const [manualPaymentSummary, setManualPaymentSummary] = useState(null);

    // Close transient dialogs when switching estimate sub-tabs so a modal never leaks into another workspace.
    useEffect(() => {
        setIsAddChargeModalOpen(false);
        setIsPackageModalOpen(false);
        setIsCatalogModalOpen(false);
        setIsAddInventoryItemModalOpen(false);
        setIsMultiSendModalOpen(false);
        setIsEditStopModalOpen(false);
        setIsEstimateRequirementsModalOpen(false);
        setIsSendModalOpen(false);
        setIsPortalSelectModalOpen(false);
        setIsPaymentRequestLinkOpen(false);
        setIsPaymentRequestModalOpen(false);
        setRefundPaymentId('');
        setIsManualPaymentModalOpen(false);
        setPaymentToDelete(null);
        setIsJobSchedulerModalOpen(false);
    }, [estimateActiveTab]);

    const customerName =
        opportunity?.customer_details?.full_name ||
        `${opportunity?.customer_details?.first_name || ''} ${opportunity?.customer_details?.last_name || ''}`.trim() ||
        opportunity?.customer_details?.name ||
        'Customer';
    const contactName =
        `${opportunity?.customer_details?.first_name || ''} ${opportunity?.customer_details?.last_name || ''}`.trim() ||
        customerName;
    const customerEmail = opportunity?.customer_details?.email || '-';
    const originText = buildRouteAddressFromOpportunity(opportunity, 'origin', sourceType);
    const destinationText = buildRouteAddressFromOpportunity(opportunity, 'destination', sourceType);
    const routeText = `${originText}\n${destinationText}`;
    const initialOriginAddress = originText;
    const initialDestinationAddress = destinationText;
    const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
    const isLeadSource = sourceType === 'lead';

    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const mapResizeObserverRef = useRef(null);
    const fallbackMarkersRef = useRef([]);
    const routeMarkersRef = useRef([]);
    const routePolylineRef = useRef(null);
    const fallbackPolylineRef = useRef(null);
    const directionsRendererRef = useRef(null);
    const directionsChangedListenerRef = useRef(null);

    const syncManual = (row) => {
        if (!row) return;
        const presetMeta = normalizeDiscountPresetList(row?.inputs?.discount_presets || row?.inputs?.discount_preset || []);
        setSelectedDiscountPresetId('');
        const nextManual = {
            pricing_mode: row.pricing_mode || 'hourly',
            crew_size: String(row.crew_size ?? 2),
            truck_count: String(row.truck_count ?? 1),
            estimated_hours: String(row.estimated_hours ?? '0'),
            travel_time_hours: String(row.travel_time_hours ?? '0'),
            hourly_rate: String(row.hourly_rate ?? '0'),
            flat_rate_amount: String(row.flat_rate_amount ?? '0'),
            rooms_summary: row.rooms_summary || '',
            special_items_notes: row.special_items_notes || '',
            packing_notes: row.packing_notes || '',
            access_notes: row.access_notes || '',
            has_stairs: Boolean(row.has_stairs),
            has_elevator: Boolean(row.has_elevator),
            long_carry_distance: String(row.long_carry_distance ?? '0'),
            minimum_charge_override: String(row.minimum_charge_override ?? '0'),
            markup_amount: String(row.markup_amount ?? '0'),
            sales_tax_pct: (() => {
                let pct = Number(row.sales_tax_pct ?? '0');
                if (pct > 0 && pct <= 1) pct = pct * 100;
                return String(Math.max(0, pct));
            })(),
            tax_exempt: Boolean(row.tax_exempt),
            discount_amount: String(Math.max(0, Number(row.discount_amount ?? '0') || 0)),
        };
        setManual(nextManual);
        lastSavedTaxRef.current = {
            sales_tax_pct: String(nextManual.sales_tax_pct ?? ''),
            tax_exempt: Boolean(nextManual.tax_exempt),
        };

    };

    const loadEstimate = async (silent = false) => {
        if (!opportunity?.id || opportunity.id === 'new') {
            setEstimate(null);
            setPortalItemsState(null);
            if (!silent) setLoading(false);
            return null;
        }
        if (!silent) setLoading(true);
        try {
            const response = await getEstimates({ opportunity: opportunity.id });
            const rows = Array.isArray(response?.results) ? response.results : Array.isArray(response) ? response : [];
            const active = rows.find((row) => row.method === 'manual') || null;
            if (active?.id) {
                const detailResponse = await api.get(`/estimates/${active.id}/`);
                const detail = detailResponse?.data || active;
                setEstimate(detail);
                // Don't overwrite manual fields if the user is actively editing them
                if (!isEditingDetails) syncManual(detail);
                return detail;
            } else {
                setEstimate(active);
                if (!isEditingDetails) syncManual(active);
                return active;
            }
        } catch {
            if (!silent) setToast({ type: 'error', text: 'Failed to load manual estimate.' });
            return null;
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const loadEstimatePortalItems = useCallback(async (estimateId, { silent = false } = {}) => {
        if (!estimateId) {
            setPortalItemsState(null);
            return;
        }
        try {
            const response = await getEstimatePortalInventory(estimateId);
            const rows = Array.isArray(response?.items)
                ? response.items
                : Array.isArray(response)
                    ? response
                    : [];
            setPortalItemsState(rows);
        } catch (err) {
            if (!silent) {
                console.warn('Failed to load estimate portal inventory:', err);
            }
            setPortalItemsState(null);
        }
    }, []);

	    const loadPackages = async () => {
	        const branchId = getOpportunityBranchId();
	        try {
	            const params = { is_active: 'true' };
	            if (branchId) params.branch = branchId;
	            const res = await getEstimatePackages(params);
            const rows = Array.isArray(res?.results) ? res.results : Array.isArray(res) ? res : [];
            setPackages(rows);
        } catch (err) {
            setPackages([]);
            const status = err?.response?.status;
            if (status === 403) {
                setToast({ type: 'error', text: 'You do not have permission to view packages. Ask an admin to grant access.' });
            } else if (status) {
                setToast({ type: 'error', text: `Failed to load packages (HTTP ${status}).` });
            }
        }
    };

    const loadCatalogItems = async () => {
        const branchId = getOpportunityBranchId();
        try {
            const params = { include_inactive: 0 };
            if (branchId) params.branch = branchId;
            const res = await getEstimateCatalogItems(params);
            const rows = Array.isArray(res?.results) ? res.results : Array.isArray(res) ? res : [];
            setCatalogItems(rows);
        } catch {
            setCatalogItems([]);
        }
    };

    const loadPortalTemplates = async () => {
        setPortalTemplatesLoaded(false);
        try {
            const params = { is_active: true };
            const res = await getEstimatePortalTemplates(params);
            const rows = Array.isArray(res?.results) ? res.results : Array.isArray(res) ? res : [];
            setPortalTemplates(rows);
            const selection = resolvePortalTemplateSelection(rows);
            setSelectedPortalTemplateId(selection.portalTemplateId);
            setResendUseSameTemplate(Boolean(estimate?.sent && selection.hasExistingTemplate));
        } catch {
            setPortalTemplates([]);
        } finally {
            setPortalTemplatesLoaded(true);
        }
    };

    useEffect(() => {
        loadEstimate();
    }, [opportunity?.id]);

    useEffect(() => {
        if (!estimate?.id || packageRefreshKey === 0) return;
        loadEstimate(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [estimate?.id, packageRefreshKey]);

    useEffect(() => {
        if (!estimate?.id) {
            setPortalItemsState(null);
            return;
        }
        loadEstimatePortalItems(estimate.id, { silent: true });
    }, [estimate?.id, loadEstimatePortalItems]);

    useEffect(() => {
        const loadPortalLinks = async () => {
            if (!estimate?.id) {
                setEstimatePortalLink('');
                setInventoryLink('');
                return;
            }
            if (!portalTemplatesLoaded) return;
            try {
                const payload = hasEstimatePortalTemplateSnapshot()
                    ? { portal_base_url: getPortalBaseUrl() }
                    : buildEstimatePortalRequestPayload();
                const response = await requestEstimatePortal(estimate.id, payload);
                setEstimatePortalLink(response?.estimate_portal_link || '');
                setInventoryLink(response?.inventory_link || '');
            } catch {
                // no-op: manual generate remains available
            }
        };
        loadPortalLinks();
    }, [estimate?.id, estimate?.portal_template_snapshot, portalTemplatesLoaded, selectedPortalTemplateId]);

    const loadPaymentsData = async (nextEstimateId) => {
        const estimateId = nextEstimateId || estimate?.id;
        const opportunityId = opportunity?.id;
        if (!estimateId && !opportunityId) {
            setPaymentRequests([]);
            setPayments([]);
            return;
        }
        setPaymentsLoading(true);
        setPaymentsError('');
        try {
            // Always load by opportunity so the estimate page reflects payments created against
            // any estimate version under the same sale.
            const [requestsRes, paymentsRes] = await Promise.all([
                getPaymentRequests(opportunityId ? { opportunity_id: opportunityId } : { estimate_id: estimateId }),
                getPayments(opportunityId ? { opportunity_id: opportunityId } : { estimate_id: estimateId }),
            ]);
            const refundsRes = await getRefunds(opportunityId ? { opportunity_id: opportunityId } : { estimate_id: estimateId });
            setPaymentRequests(asList(requestsRes));
            setPayments(asList(paymentsRes));
            setRefunds(asList(refundsRes));
        } catch (err) {
            setPaymentsError(err.response?.data?.detail || 'Unable to load payments for this estimate.');
        } finally {
            setPaymentsLoading(false);
        }
    };

    const loadManualPaymentContext = async () => {
        const opportunityId = opportunity?.id;
        if (!opportunityId) {
            setManualPaymentJobId(null);
            setManualPaymentSummary(null);
            return;
        }
        try {
            const jobs = await getJobs({ opportunity: opportunityId });
            const rows = Array.isArray(jobs?.results) ? jobs.results : Array.isArray(jobs) ? jobs : [];
            const job = rows[0] || null;
            if (!job?.id) {
                setManualPaymentJobId(null);
                setManualPaymentSummary(null);
                return;
            }
            setManualPaymentJobId(job.id);
            const summary = await getJobAccountingSummary(job.id);
            setManualPaymentSummary(summary);
        } catch {
            setManualPaymentJobId(null);
            setManualPaymentSummary(null);
        }
    };

    const openAddManualPaymentModal = () => {
        if (!estimate?.id) {
            setToast({ type: 'error', text: 'Use the estimate payment request or record an estimate payment from the ledger.' });
            return;
        }
        setManualPaymentEditingId(null);
        setManualPaymentDraft({ amount: '', method: 'e_transfer', reference: '', note: '' });
        setIsManualPaymentModalOpen(true);
    };

    const openEditManualPaymentModal = (payment) => {
        if (!estimate?.id || !payment?.id) return;
        setManualPaymentEditingId(String(payment.id));
        setManualPaymentDraft({
            amount: String(payment?.amount ?? ''),
            method: String(payment?.method || 'e_transfer'),
            reference: String(payment?.reference || ''),
            note: String(payment?.note || ''),
        });
        setIsManualPaymentModalOpen(true);
    };

    const closeManualPaymentModal = () => {
        setIsManualPaymentModalOpen(false);
        setManualPaymentEditingId(null);
        setManualPaymentDraft({ amount: '', method: 'e_transfer', reference: '', note: '' });
    };

    const openRefundPaymentModal = (payment) => {
        if (!payment?.id) return;
        const remaining = Math.max(0, Number(payment?.amount || 0) - Number(payment?.refunded_amount || 0));
        setRefundPaymentId(String(payment.id));
        setRefundAmount(remaining > 0 ? String(remaining.toFixed(2)) : '');
    };

    const closeRefundPaymentModal = () => {
        setRefundPaymentId('');
        setRefundAmount('');
    };

    const openDeleteManualPaymentModal = (payment) => {
        if (!estimate?.id || !payment?.id) return;
        setPaymentToDelete(payment);
    };

    const closeDeleteManualPaymentModal = () => {
        setPaymentToDelete(null);
    };

    const saveManualPayment = async () => {
        if (!estimate?.id) return;
        const amount = String(manualPaymentDraft.amount || '').trim();
        if (!amount) return;
        const balanceDue = Number(manualPaymentSummary?.payments?.balance_due ?? 0);
        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            setToast({ type: 'error', text: 'Enter a valid payment amount.' });
            return;
        }
        if (!manualPaymentEditingId && Number.isFinite(balanceDue) && balanceDue > 0 && numericAmount > balanceDue) {
            setToast({ type: 'error', text: 'Amount cannot be greater than balance due.' });
            return;
        }
        setIsSavingManualPayment(true);
        try {
            if (manualPaymentEditingId) {
                await updateEstimateManualPayment(manualPaymentEditingId, {
                    amount,
                    method: manualPaymentDraft.method,
                    reference: manualPaymentDraft.reference || '',
                    note: manualPaymentDraft.note || '',
                });
                setToast({ type: 'success', text: 'Payment updated.' });
            } else {
                await createEstimateManualPayment({
                    estimate_id: estimate.id,
                    amount,
                    method: manualPaymentDraft.method,
                    reference: manualPaymentDraft.reference || '',
                    note: manualPaymentDraft.note || '',
                });
                setToast({ type: 'success', text: 'Payment recorded.' });
            }
            closeManualPaymentModal();
            await Promise.allSettled([
                loadPaymentsData(estimate?.id),
                loadManualPaymentContext(),
            ]);
        } catch (err) {
            setToast({ type: 'error', text: err?.response?.data?.detail || 'Unable to record payment.' });
        } finally {
            setIsSavingManualPayment(false);
        }
    };

    const deleteManualPayment = async () => {
        if (!estimate?.id || !paymentToDelete?.id) return;
        setIsDeletingManualPayment(true);
        try {
            await deleteEstimateManualPayment(paymentToDelete.id);
            closeDeleteManualPaymentModal();
            await Promise.allSettled([
                loadPaymentsData(estimate?.id),
                loadManualPaymentContext(),
            ]);
            setToast({ type: 'success', text: 'Payment deleted.' });
        } catch (err) {
            setToast({ type: 'error', text: err?.response?.data?.detail || 'Unable to delete payment.' });
        } finally {
            setIsDeletingManualPayment(false);
        }
    };

    const loadPaymentGateways = async () => {
        const branchId = getOpportunityBranchId();
        try {
            const res = await getPaymentGateways(branchId ? { branch: branchId } : undefined);
            const rows = Array.isArray(res?.results) ? res.results : Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
            const active = rows.filter((row) => {
                const rowBranchId = row?.branch_id ?? row?.branch?.id ?? row?.branch ?? null;
                const matchesBranch = branchId ? String(rowBranchId) === String(branchId) : !rowBranchId;
                return row?.is_active && String(row?.status || '').toLowerCase() === 'verified' && matchesBranch;
            });
            console.debug('[estimate-portal] payment gateways loaded', {
                opportunityId: opportunity?.id,
                branchId: branchId || null,
                total: rows.length,
                active: active.length,
                rowBranchIds: rows.map((row) => row?.branch_id ?? row?.branch?.id ?? row?.branch ?? null),
            });
            setPaymentGateways(active);
            const selectedExists = active.some((row) => String(row.id) === String(createPaymentGatewayId));
            if (createPaymentGatewayId && !selectedExists) {
                setCreatePaymentGatewayId(active.length === 1 ? String(active[0].id) : '');
            } else if (!createPaymentGatewayId && active.length === 1) {
                setCreatePaymentGatewayId(String(active[0].id));
            }
        } catch {
            setPaymentGateways([]);
        }
    };

    useEffect(() => {
        loadPaymentGateways();
    }, [opportunity?.branch?.id, opportunity?.branch_id, opportunity?.branch_details?.id]);

    useEffect(() => {
        if (estimate?.id) {
            loadPaymentsData(estimate.id);
        }
    }, [estimate?.id]);

    useEffect(() => {
        loadManualPaymentContext();
    }, [opportunity?.id]);

    useEffect(() => {
        if (!estimate?.id && !opportunity?.id) {
            setPaymentRequests([]);
            setPayments([]);
            setRefunds([]);
            return undefined;
        }

        const refreshAll = async (silent = true) => {
            // Avoid background refresh if the user is actively saving or editing details to prevent conflicts
            if (saving || isEditingDetails) return;
            
            await Promise.allSettled([
                loadEstimate(silent),
                loadEstimatePortalItems(estimate?.id, { silent: true }),
                loadPaymentsData(estimate?.id),
                loadManualPaymentContext(),
                loadInventoryPhotos(silent)
            ]);
        };

        const interval = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                refreshAll(true);
            }
        }, 15000);

        const onFocus = () => refreshAll(true);
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                refreshAll(true);
            }
        };
        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisibilityChange);
        
        return () => {
            window.clearInterval(interval);
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [estimate?.id, opportunity?.id, saving, isEditingDetails]);

    const handleCreatePaymentRequest = async () => {
        if (!estimate?.id) return;
        if (!createPaymentGatewayId) {
            setPaymentsError('Select a payment gateway first.');
            return;
        }
        if (createPaymentAmount !== '') {
            const amt = Number(createPaymentAmount);
            if (!Number.isFinite(amt) || amt <= 0) {
                setPaymentsError('Enter a valid amount.');
                return;
            }
            const balanceDue = Number(manualPaymentSummary?.payments?.balance_due ?? 0);
            if (Number.isFinite(balanceDue) && balanceDue > 0 && amt > balanceDue) {
                setPaymentsError('Amount cannot be greater than balance due.');
                return;
            }
            if (String(createPaymentOption).toLowerCase() === 'deposit') {
                const maxDeposit = Number(estimate?.deposit_amount || 0);
                if (Number.isFinite(maxDeposit) && maxDeposit > 0 && amt > maxDeposit) {
                    setPaymentsError('Amount cannot be greater than deposit amount.');
                    return;
                }
            }
        }
        setPaymentsLoading(true);
        setPaymentsError('');
        try {
            const payload = {
                estimate_id: estimate.id,
                payment_option: createPaymentOption,
                payment_gateway_id: Number(createPaymentGatewayId),
            };
            if (createPaymentAmount !== '') {
                payload.amount = createPaymentAmount;
            }
            const res = await createPaymentRequestAndSend(payload);
            setIsPaymentRequestModalOpen(true);
            await loadPaymentsData(estimate.id);
            setToast({ type: 'success', text: res?.data?.detail || 'Payment request created successfully.' });
        } catch (err) {
            const nextError =
                err.response?.data?.detail ||
                Object.values(err.response?.data || {}).flat().join(' ') ||
                'Unable to create payment request.';
            setPaymentsError(nextError);
        } finally {
            setPaymentsLoading(false);
        }
    };

    const handleCreateRefund = async () => {
        if (!refundPaymentId) {
            setPaymentsError('Select a payment first.');
            return;
        }
        setPaymentsLoading(true);
        setPaymentsError('');
        try {
            const payload = { payment_id: Number(refundPaymentId) };
            if (refundAmount !== '') {
                payload.amount = refundAmount;
            }
            await createRefund(payload);
            closeRefundPaymentModal();
            await loadPaymentsData(estimate?.id);
        } catch (err) {
            const nextError =
                err.response?.data?.detail ||
                Object.values(err.response?.data || {}).flat().join(' ') ||
                'Unable to create refund.';
            setPaymentsError(nextError);
        } finally {
            setPaymentsLoading(false);
        }
    };

    useEffect(() => {
    }, []);

    useEffect(() => {
        loadPackages();
        loadCatalogItems();
        loadPortalTemplates();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [opportunity?.branch?.id, opportunity?.branch_id]);

	    const selectedPackage = useMemo(
	        () => packages.find((item) => String(item.id) === String(selectedPackageId)) || null,
	        [packages, selectedPackageId]
	    );

	    const portalTemplatesForSend = useMemo(() => {
	        const branchId = getOpportunityBranchId();
	        const resolveTemplateBranchId = (row) => {
	            const branch = row?.branch_id ?? row?.branch ?? row?.branch_details?.id ?? '';
	            if (branch && typeof branch === 'object') return branch?.id ?? '';
	            return branch;
	        };
	        const rows = Array.isArray(portalTemplates) ? portalTemplates : [];
	        const compatible = branchId
	            ? rows.filter((row) => {
	                    const tplBranchId = resolveTemplateBranchId(row);
	                    return !tplBranchId || String(tplBranchId) === String(branchId);
	                })
	            : rows.filter((row) => !resolveTemplateBranchId(row));
	        return compatible.slice().sort((a, b) => {
	            const aDef = a?.is_default ? 1 : 0;
	            const bDef = b?.is_default ? 1 : 0;
	            if (aDef !== bDef) return bDef - aDef;
	            return String(a?.name || '').localeCompare(String(b?.name || ''));
	        });
	    }, [portalTemplates, opportunity?.branch?.id, opportunity?.branch_id]);

    const selectedTemplateFromHistory = useMemo(() => {
        if (!selectedPortalTemplateId || !estimate?.portal_template_history) return null;
        const hasSelectedTemplate = portalTemplatesForSend.some((tpl) => String(tpl.id) === String(selectedPortalTemplateId));
        if (hasSelectedTemplate) return null;
        return estimate.portal_template_history.find((h) => String(h.template_id) === String(selectedPortalTemplateId));
    }, [selectedPortalTemplateId, estimate?.portal_template_history, portalTemplatesForSend]);

    useEffect(() => {
        if (!estimate?.id || !portalTemplatesLoaded) return;
        const selection = resolvePortalTemplateSelection();
        setSelectedPortalTemplateId(selection.portalTemplateId);
        setResendUseSameTemplate(Boolean(estimate?.sent && selection.hasExistingTemplate));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        estimate?.id,
        estimate?.portal_template,
        estimate?.portal_template_id,
        estimate?.portal_template_source_id,
        estimate?.sent,
        portalTemplatesLoaded,
        portalTemplates,
    ]);

    const handleApplyPackage = async () => {
        if (!estimate?.id || !selectedPackage) return;
        if (!ensureChargeEditable()) return;
        setSaving(true);
        try {
            const currentEstimate = await loadEstimate(true);
            const currentStatus = String(currentEstimate?.status || estimate?.status || '').toLowerCase();
            const currentLocked = (
                currentStatus === 'voided'
            ) && !Boolean(currentEstimate?.requires_reapproval);
            if (currentLocked) {
                setEstimate(currentEstimate);
                syncManual(currentEstimate);
                setToast({ type: 'error', text: 'This estimate is locked.' });
                return;
            }
            const scopedJobId = selectedSubJobId ? Number(selectedSubJobId) || null : null;
            const existingCharges = Array.isArray(estimate?.charges) ? estimate.charges : [];
            const existingChargeIds = new Set(existingCharges.map((charge) => String(charge.id)));
            const matchesSelectedSubJob = (charge) => {
                if (!scopedJobId) return true;
                const metadata = charge?.metadata && typeof charge.metadata === 'object' ? charge.metadata : {};
                const scopedId =
                    metadata?.planned_sub_job_id ??
                    metadata?.opportunity_sub_job_id ??
                    metadata?.sub_job_id ??
                    metadata?.job_id ??
                    null;
                return scopedId != null ? String(scopedId) === String(scopedJobId) : false;
            };

            const existingScopedPackageCharges = existingCharges.filter((charge) => {
                const metadata = charge?.metadata && typeof charge.metadata === 'object' ? charge.metadata : {};
                return metadata?.source_kind === 'estimate_package' && matchesSelectedSubJob(charge);
            });

            for (const charge of existingScopedPackageCharges) {
                await deleteEstimateCharge(charge.id);
            }

            const updated = await applyEstimatePackage(estimate.id, { package_id: selectedPackage.id, mode: 'append' });
            const appendedCharges = (Array.isArray(updated?.charges) ? updated.charges : [])
                .filter((charge) => !existingChargeIds.has(String(charge.id)))
                .filter((charge) => (charge?.metadata?.source_kind || '') === 'estimate_package');

            if (scopedJobId && appendedCharges.length) {
                await Promise.all(
                    appendedCharges.map((charge) =>
                        updateEstimateCharge(charge.id, {
                            name: charge.name,
                            category: normalizeChargeCategory(charge.category),
                            description: charge.description || '',
                            quantity: charge.quantity,
                            unit_price: charge.unit_price,
                            total_price: charge.total_price,
                            taxable: !!charge.taxable,
                            sort_order: charge.sort_order,
                            metadata: {
                                ...(charge.metadata || {}),
                                planned_sub_job_id: scopedJobId,
                                opportunity_sub_job_id: scopedJobId,
                            },
                        })
                    )
                );
                const recalced = await recalculateEstimate(estimate.id);
                setEstimate(recalced);
                syncManual(recalced);
            } else {
                setEstimate(updated);
                syncManual(updated);
            }
            setPackageRefreshKey((value) => value + 1);
            setToast({ type: 'success', text: `Package applied: ${selectedPackage.name}` });
            setSelectedPackageId('');
            setIsPackageModalOpen(false);
        } catch (err) {
            const apiError = err?.response?.data;
            const detail = apiError?.detail || (typeof apiError === 'object' ? Object.values(apiError).flat().join(' ') : '');
            setToast({ type: 'error', text: detail || 'Failed to apply package.' });
        } finally {
            setSaving(false);
        }
    };

    const selectedCatalogItem = useMemo(
        () => catalogItems.find((item) => String(item.id) === String(selectedCatalogItemId)) || null,
        [catalogItems, selectedCatalogItemId]
    );

    const buildCatalogChargeDraft = (item) => {
        if (!item) return { ...blankCharge };
        const category = normalizeChargeCategory(item?.category || 'other');
        const schema = getCategoryFormSchemaFromCatalog(category, catalogItems);
        const firstPreset = schema?.presets?.[0]?.key || '';
        const draft = normalizeFormForCategory({
            ...blankCharge,
            name: String(item?.name || '').trim() || prettyCategoryName(category),
            description: String(item?.description || ''),
            category,
            category_preset_key: firstPreset,
            quantity: String(item?.default_quantity ?? 1),
            unit_price: String(item?.default_unit_price ?? 0),
            taxable: item?.taxable !== false,
            source_catalog_item: item?.id,
            metadata: {
                category_form_schema: item?.category_form_schema || item?.metadata?.category_form_schema || null,
            },
        });
        const initialFormula = getPricingFormulaText(draft, chargeContext, catalogItems);
        if (!draft.description || draft.description === initialFormula) {
            lastCatalogAutoFilledFormulaRef.current = draft.description || initialFormula;
        } else {
            lastCatalogAutoFilledFormulaRef.current = null;
        }
        return draft;
    };

    const handleAddCatalogItem = async () => {
        if (!estimate?.id || !selectedCatalogItem) return;
        if (!ensureChargeEditable()) return;
        const normalizedForm = normalizeFormForCategory(catalogChargeForm);
        const nextForm = {
            ...normalizedForm,
            total_price: String(computeChargeTotal(normalizedForm, chargeContext, { presetMode: getChargePresetMode(normalizedForm) })),
        };
        const formErrors = validateChargeForm(nextForm, chargeContext);
        if (formErrors.length) {
            setToast({ type: 'error', text: formErrors[0] });
            return;
        }
        setSaving(true);
        try {
            const updated = await addEstimateCharge(estimate.id, buildChargePayload({
                ...nextForm,
                source_catalog_item: selectedCatalogItem.id,
            }, chargeContext));
            setEstimate(updated);
            syncManual(updated);
            setSelectedCatalogItemId('');
            setCatalogChargeForm(blankCharge);
            setIsCatalogModalOpen(false);
            setToast({ type: 'success', text: `Catalog item added: ${selectedCatalogItem.name}` });
        } catch (err) {
            setToast({ type: 'error', text: getCatalogChargeErrorMessage(err) });
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        const stops = [];
        
        // Helper to get normalized details for origin/destination
        const getDetails = (type) => {
            const prefix = type === 'origin' ? 'origin' : 'destination';
            const details = opportunity?.[`${prefix}_address_details`];
            if (details) return details;
            
            if (sourceType === 'lead') {
                return {
                    unit_number: opportunity?.[`${prefix}_unit_number`],
                    property_type: opportunity?.[`${prefix}_property_type`],
                    parking_type: opportunity?.[`${prefix}_parking_type`],
                    flights_of_stairs: opportunity?.[`${prefix}_flights_of_stairs`],
                    has_elevator: opportunity?.[`${prefix}_has_elevator`],
                    walk_distance_ft: opportunity?.[`${prefix}_walk_distance_ft`],
                };
            }
            return null;
        };

        const routeStops = Array.isArray(opportunity?.stops) ? opportunity.stops : [];
        const preStops = [];
        const middleStops = [];
        const postStops = [];

        routeStops.forEach((stop) => {
            const normalized = {
                id: stop.id,
                type: stop.stop_type || 'stop',
                address: formatAddressForDisplay(stop.address_details),
                details: stop.address_details,
                notes: stop.notes || '',
                sort_order: stop.sort_order ?? 0,
            };
            if (normalized.type === 'pre_stop') {
                preStops.push(normalized);
            } else if (normalized.type === 'post_stop') {
                postStops.push(normalized);
            } else {
                middleStops.push(normalized);
            }
        });

        preStops.forEach((stop) => {
            stops.push(stop);
        });

        // Origin
        stops.push({
            id: 'origin',
            type: 'origin',
            address: initialOriginAddress || '',
            details: getDetails('origin')
        });

        // Intermediate Stops
        middleStops.forEach((stop) => {
            stops.push(stop);
        });

        // Destination
        stops.push({
            id: 'destination',
            type: 'destination',
            address: initialDestinationAddress || '',
            details: getDetails('destination')
        });

        postStops.forEach((stop) => {
            stops.push(stop);
        });

        setRouteStops(stops);
        setRouteLegs([]);
        setRouteSummary({ distanceMiles: 0, durationMinutes: 0 });
        setRouteError('');
        setRoutePathPoints([]);
        setFallbackStopPoints([]);
    }, [initialOriginAddress, initialDestinationAddress, opportunity, sourceType]);

    useEffect(() => {
        if (!routeStops.length || !opportunity?.id || sourceType === 'lead') return;
        const cacheSignature = String(opportunity?.route_cache_signature || '').trim();
        const currentSignature = buildRouteCacheSignature(routeStops);
        if (!cacheSignature || cacheSignature !== currentSignature) return;

        const cachedDistanceMiles = Number(opportunity?.route_distance_miles || 0);
        const cachedDurationMinutes = Number(opportunity?.route_duration_minutes || 0);
        const cachePayload = opportunity?.route_cache_payload || {};

        setRouteSummary({
            distanceMiles: Number.isFinite(cachedDistanceMiles) ? cachedDistanceMiles : 0,
            durationMinutes: Number.isFinite(cachedDurationMinutes) ? cachedDurationMinutes : 0,
        });
        setRouteLegs(Array.isArray(cachePayload?.routeLegs) ? cachePayload.routeLegs : []);
        setRoutePathPoints(Array.isArray(cachePayload?.routePathPoints) ? cachePayload.routePathPoints : []);
        setFallbackStopPoints(Array.isArray(cachePayload?.fallbackStopPoints) ? cachePayload.fallbackStopPoints : []);
        setRouteMode(String(cachePayload?.routeMode || '').trim() || 'none');
    }, [buildRouteCacheSignature, opportunity, routeStops, sourceType]);

    useEffect(() => {
        if (!mapsApiKey) {
            setMapsLoadError('Set VITE_GOOGLE_MAPS_API_KEY to enable route calculations.');
            return;
        }
        let cancelled = false;
        loadGoogleMapsScript(mapsApiKey)
            .then(() => {
                if (cancelled) return;
                setMapsReady(true);
                setMapsLoadError('');
            })
            .catch((err) => {
                if (cancelled) return;
                setMapsReady(false);
                setMapsLoadError(err?.message || 'Google Maps could not be loaded.');
            });
        return () => {
            cancelled = true;
        };
    }, [mapsApiKey]);

    const clearFallbackMarkers = () => {
        for (const marker of fallbackMarkersRef.current) {
            try {
                marker.setMap(null);
            } catch {
                // ignore
            }
        }
        fallbackMarkersRef.current = [];
    };

    const clearRouteMarkers = () => {
        for (const marker of routeMarkersRef.current) {
            try {
                marker.setMap(null);
            } catch {
                // ignore
            }
        }
        routeMarkersRef.current = [];
    };

    const clearRoutePolyline = () => {
        try {
            routePolylineRef.current?.setMap(null);
        } catch {
            // ignore
        }
        routePolylineRef.current = null;
    };

    const clearFallbackPolyline = () => {
        try {
            fallbackPolylineRef.current?.setMap(null);
        } catch {
            // ignore
        }
        fallbackPolylineRef.current = null;
    };

    const clearDirectionsRenderer = () => {
        try {
            if (directionsChangedListenerRef.current) directionsChangedListenerRef.current.remove();
        } catch {
            // ignore
        }
        directionsChangedListenerRef.current = null;
        try {
            directionsRendererRef.current?.setMap(null);
        } catch {
            // ignore
        }
        directionsRendererRef.current = null;
    };

    useEffect(() => {
        if (!mapsReady || !window.google?.maps) return;
        if (!routeTabActive) return;
        if (mapRef.current) return;

        let cancelled = false;
        (async () => {
            try {
                const maps = window.google?.maps;
                if (!maps) return;

                const startedAt = Date.now();
                while (!mapContainerRef.current && Date.now() - startedAt < 8000) {
                    // eslint-disable-next-line no-await-in-loop
                    await new Promise((r) => setTimeout(r, 50));
                }
                if (cancelled) return;
                if (!mapContainerRef.current) {
                    // Don't hard-fail; user may not have the Route tab open yet or layout may still be mounting.
                    // We'll retry when the tab becomes active again.
                    setMapsLoadError('');
                    return;
                }

                let MapCtor = maps.Map;
                if (typeof maps.importLibrary === 'function') {
                    const lib = await maps.importLibrary('maps');
                    MapCtor = lib?.Map || MapCtor;
                }

                if (cancelled) return;
                if (!MapCtor) {
                    setMapsLoadError('Google Maps library did not load correctly (Map constructor unavailable).');
                    return;
                }

                mapRef.current = new MapCtor(mapContainerRef.current, {
                    center: { lat: 56.1304, lng: -106.3468 },
                    zoom: 4,
                    mapTypeId,
                    clickableIcons: false,
                    disableDefaultUI: false,
                    keyboardShortcuts: true,
                    scrollwheel: true,
                    gestureHandling: 'auto',
                    fullscreenControl: true,
                    streetViewControl: false,
                    mapTypeControl: false,
                });
                setMapsLoadError('');
                setMapInstanceVersion((prev) => prev + 1);

                // In responsive/flex layouts, the map can initialize before the container has a stable size,
                // resulting in a blank map. Trigger a resize after paint.
                window.setTimeout(() => {
                    try {
                        if (!mapRef.current || !window.google?.maps) return;
                        window.google.maps.event?.trigger?.(mapRef.current, 'resize');
                        mapRef.current.setCenter(mapRef.current.getCenter());
                    } catch {
                        // ignore
                    }
                }, 0);
            } catch (err) {
                if (cancelled) return;
                setMapsLoadError(err?.message || 'Google Maps could not be initialized.');
            }
        })();

        return () => {
            cancelled = true;
            clearRoutePolyline();
            clearRouteMarkers();
            clearFallbackPolyline();
            clearFallbackMarkers();
            clearDirectionsRenderer();
            try {
                mapResizeObserverRef.current?.disconnect?.();
            } catch {
                // ignore
            }
            mapResizeObserverRef.current = null;
            mapRef.current = null;
        };
    }, [mapsReady, routeTabActive, mapTypeId]);

    useEffect(() => {
        if (!mapsReady || !window.google?.maps) return;
        if (!mapRef.current) return;
        try {
            mapRef.current.setMapTypeId?.(mapTypeId);
        } catch {
            // ignore
        }
    }, [mapTypeId, mapsReady, mapInstanceVersion]);

    useEffect(() => {
        // Route tab unmounts the map container; Google Maps can't be re-bound to a new DOM node.
        // Dispose and recreate next time the Route tab opens.
        if (routeTabActive) return;
        if (!mapRef.current) return;
        try {
            mapResizeObserverRef.current?.disconnect?.();
        } catch {
            // ignore
        }
        mapResizeObserverRef.current = null;
        clearRoutePolyline();
        clearRouteMarkers();
        clearFallbackPolyline();
        clearFallbackMarkers();
        clearDirectionsRenderer();
        mapRef.current = null;
        setMapInstanceVersion((prev) => prev + 1);
    }, [routeTabActive]);

    useEffect(() => {
        if (!mapsReady || !mapRef.current) return;
        if (!mapContainerRef.current) return;
        if (typeof window === 'undefined' || typeof window.ResizeObserver !== 'function') return;

        try {
            mapResizeObserverRef.current?.disconnect?.();
        } catch {
            // ignore
        }

        mapResizeObserverRef.current = new window.ResizeObserver(() => {
            try {
                if (!mapRef.current || !window.google?.maps) return;
                window.google.maps.event?.trigger?.(mapRef.current, 'resize');
            } catch {
                // ignore
            }
        });
        mapResizeObserverRef.current.observe(mapContainerRef.current);

        return () => {
            try {
                mapResizeObserverRef.current?.disconnect?.();
            } catch {
                // ignore
            }
            mapResizeObserverRef.current = null;
        };
    }, [mapsReady, mapInstanceVersion]);

    useEffect(() => {
        if (!mapsReady || !window.google?.maps) return;
        if (!mapRef.current) return;

        if (fallbackStopPoints?.length) {
            clearDirectionsRenderer();
            clearRoutePolyline();
            clearRouteMarkers();
            clearFallbackPolyline();
            clearFallbackMarkers();

            const bounds = new window.google.maps.LatLngBounds();
            const path = fallbackStopPoints
                .filter((pt) => Number.isFinite(pt?.lat) && Number.isFinite(pt?.lng))
                .map((pt) => ({ lat: pt.lat, lng: pt.lng }));

            fallbackMarkersRef.current = fallbackStopPoints
                .filter((pt) => Number.isFinite(pt?.lat) && Number.isFinite(pt?.lng))
                .map((pt, idx) => {
                    const position = { lat: pt.lat, lng: pt.lng };
                    bounds.extend(position);
                    return new window.google.maps.Marker({
                        map: mapRef.current,
                        position,
                        title: pt.address || (idx === 0 ? 'Origin' : idx === fallbackStopPoints.length - 1 ? 'Destination' : `Stop ${idx}`),
                    });
                });

            if (path.length >= 2) {
                for (const pt of path) bounds.extend(pt);
                fallbackPolylineRef.current = new window.google.maps.Polyline({
                    map: mapRef.current,
                    path,
                    strokeOpacity: 0,
                    icons: [
                        {
                            icon: {
                                path: 'M 0,-1 0,1',
                                strokeOpacity: 0.85,
                                strokeColor: '#64748b',
                                strokeWeight: 3,
                                scale: 4,
                            },
                            offset: '0',
                            repeat: '16px',
                        },
                    ],
                });
            }

            if (!bounds.isEmpty?.() && fallbackMarkersRef.current.length >= 2) {
                mapRef.current.fitBounds(bounds);
            } else if (fallbackMarkersRef.current.length === 1) {
                mapRef.current.setCenter(fallbackMarkersRef.current[0].getPosition());
                mapRef.current.setZoom(14);
            }
            return;
        }

        clearFallbackMarkers();
        clearFallbackPolyline();
        if (routeMode === 'legacy_directions') {
            // DirectionsRenderer manages its own polyline + markers.
            clearRoutePolyline();
            clearRouteMarkers();
            return;
        }
        if (routePathPoints?.length >= 2) {
            clearDirectionsRenderer();
            clearRoutePolyline();
            clearRouteMarkers();

            const path = routePathPoints
                .filter((pt) => Number.isFinite(pt?.lat) && Number.isFinite(pt?.lng))
                .map((pt) => ({ lat: pt.lat, lng: pt.lng }));
            routePolylineRef.current = new window.google.maps.Polyline({
                map: mapRef.current,
                path,
                strokeColor: '#1f7ae0',
                strokeOpacity: 0.9,
                strokeWeight: 5,
            });

            const bounds = new window.google.maps.LatLngBounds();
            for (const pt of path) bounds.extend(pt);

            // Mark origin/destination (polyline endpoints).
            routeMarkersRef.current = [
                new window.google.maps.Marker({ map: mapRef.current, position: path[0], title: 'Origin' }),
                new window.google.maps.Marker({ map: mapRef.current, position: path[path.length - 1], title: 'Destination' }),
            ];

            if (!bounds.isEmpty?.()) {
                mapRef.current.fitBounds(bounds);
            }
            return;
        }

        clearDirectionsRenderer();
        clearRoutePolyline();
        clearRouteMarkers();
    }, [mapsReady, mapInstanceVersion, routeMode, routePathPoints, fallbackStopPoints]);

    const applyDirectionsResult = (directionsResult) => {
        const legs = directionsResult?.routes?.[0]?.legs || [];
        const overviewPath = Array.isArray(directionsResult?.routes?.[0]?.overview_path)
            ? directionsResult.routes[0].overview_path
            : [];
        const totalMeters = legs.reduce((sum, leg) => sum + Number(leg?.distance?.value || 0), 0);
        const totalSeconds = legs.reduce((sum, leg) => sum + Number(leg?.duration?.value || 0), 0);
        const distanceMiles = totalMeters * 0.000621371;
        const durationMinutes = totalSeconds / 60;
        const nextRouteSummary = { distanceMiles, durationMinutes };
        const nextRoutePathPoints = overviewPath
            .map((pt) => ({ lat: Number(pt?.lat?.() ?? pt?.lat), lng: Number(pt?.lng?.() ?? pt?.lng) }))
            .filter((pt) => Number.isFinite(pt.lat) && Number.isFinite(pt.lng));
        const nextRouteLegs = legs.map((leg, idx) => ({
                id: `${idx}-${leg.start_address}-${leg.end_address}`,
                from: leg.start_address,
                to: leg.end_address,
                distanceText: leg?.distance?.value ? `${formatDistanceKm(leg.distance.value / 1609.344)} km` : '-',
                durationText: leg?.duration?.value ? formatDurationHoursMinutes(leg.duration.value / 60) : '-',
            }));
        setRouteSummary(nextRouteSummary);
        setRouteLegs(nextRouteLegs);
        persistRouteCache({
            nextRouteSummary,
            nextRouteLegs,
            nextRoutePathPoints,
            nextFallbackStopPoints: [],
            nextRouteMode: nextRoutePathPoints.length >= 2 ? 'routes_api' : 'legacy_directions',
        });
    };

    const enableDraggableDirections = (directionsResult) => {
        if (!mapRef.current || !window.google?.maps) return;

        if (!directionsRendererRef.current) {
            directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
                draggable: true,
                suppressMarkers: false,
                preserveViewport: false,
            });
            directionsRendererRef.current.setMap(mapRef.current);
        }

        directionsRendererRef.current.setDirections(directionsResult);
        try {
            if (directionsChangedListenerRef.current) directionsChangedListenerRef.current.remove();
        } catch {
            // ignore
        }
        directionsChangedListenerRef.current = directionsRendererRef.current.addListener('directions_changed', () => {
            const next = directionsRendererRef.current?.getDirections?.();
            if (!next) return;
            applyDirectionsResult(next);
            setToast({ type: 'success', text: 'Route updated from map drag.' });
        });
    };

    const estimatePortalItems = Array.isArray(portalItemsState)
        ? portalItemsState
        : (estimate?.portal_inventory_items || []);
    const leadPortalItems = Array.isArray(opportunity?.lead_details?.portal_inventory_items)
        ? opportunity.lead_details.portal_inventory_items
        : [];
    const portalItems = [...leadPortalItems, ...estimatePortalItems];

    const loadInventoryPhotos = async (silent = false) => {
        const estimateId = estimate?.id;
        const opportunityId = estimate?.opportunity?.id || estimate?.opportunity_id || opportunity?.id;
        const leadId = estimate?.opportunity?.lead_id || opportunity?.lead_id || opportunity?.lead_details?.id;
        if (!estimateId && !opportunityId && !leadId) {
            setInventoryPhotos([]);
            return;
        }
        if (!silent) setInventoryPhotosLoading(true);
        try {
            const requests = getInventoryPhotoRequestSpecs({ estimateId, opportunityId, leadId })
                .map((spec) => listFiles(spec));
            const responses = await Promise.allSettled(requests);
            const rows = [];
            const seen = new Set();
            for (const response of responses) {
                if (response.status !== 'fulfilled') continue;
                const data = response.value;
                const list = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
                for (const row of list) {
                    if (!row?.id || seen.has(String(row.id))) continue;
                    seen.add(String(row.id));
                    rows.push(row);
                }
            }
            setInventoryPhotos(rows);
        } catch {
            setInventoryPhotos([]);
        } finally {
            if (!silent) setInventoryPhotosLoading(false);
        }
    };

    useEffect(() => {
        loadInventoryPhotos();
    }, [estimate?.opportunity?.id, estimate?.opportunity?.lead_id, estimate?.opportunity_id, opportunity?.id, opportunity?.lead_id, opportunity?.lead_details?.id]);
    const inventorySummary = useMemo(() => {
        const rooms = new Set();
        let totalQty = 0;
        let totalWeightLbs = 0;
        let totalVol = 0;
        for (const item of portalItems) {
            if (item.room_name) rooms.add(item.room_name);
            totalQty += Number(item.quantity || 0);
            totalWeightLbs += Number(item.quantity || 0) * Number(item.weight_lbs_each || 0);
            totalVol += Number(item.quantity || 0) * Number(item.volume_cuft_each || 0);
        }
        return { roomCount: rooms.size, totalQty, totalWeightLbs, totalVol };
    }, [portalItems]);
    const selectedPortalItems = useMemo(
        () => portalItems.filter((item) => Number(item.quantity || 0) > 0),
        [portalItems]
    );

    const lineItems = useMemo(
        () => {
            const fmtMoneyText = (value) => {
                const amount = Number(value || 0);
                return `$${Math.abs(amount).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            };
            const compactNumber = (value, fallback = '0') => {
                const n = Number(value);
                if (!Number.isFinite(n)) return fallback;
                return String(n).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
            };
            const isBackendManagedRateCategory = (category, metadata) => {
                const rule = metadata?.rule_snapshot || metadata?.pricing_rule || {};
                if (String(rule?.engine || '').toLowerCase() !== 'v2') return false;
                return [
                    'moving_labor',
                    'transportation',
                    'packing',
                    'trip_and_travel',
                    'additional_services',
                    'fuel_surcharge',
                    'valuation',
                ].includes(category);
            };
            const currentRateLabel = (charge) => {
                const category = normalizeChargeCategory(charge?.category);
                const metadata = charge?.metadata && typeof charge.metadata === 'object' ? charge.metadata : {};
                const computedRateLabel = metadata?.computed?.rate_label;
                if (computedRateLabel) {
                    return computedRateLabel;
                }
                if (isBackendManagedRateCategory(category, metadata)) {
                    return '--';
                }
                if (Number(charge?.unit_price || 0) === 0) {
                    return `${compactNumber(charge?.quantity, '0')} @ --`;
                }
                return `${compactNumber(charge?.quantity, '0')} @ ${fmtMoneyText(charge?.unit_price)}`;
            };

            const normalizedSelectedJobId = selectedSubJobId ? String(selectedSubJobId) : '';
            const primarySubJobId = Array.isArray(opportunityJobs)
                ? String((opportunityJobs.find((job) => job?.is_primary) || opportunityJobs[0] || {})?.id || '')
                : '';
            const allCharges = (estimate?.charges || []).map((charge) => ({
                id: charge.id,
                name: charge.name,
                description: charge.description || '',
                unit_price: String(charge.unit_price ?? 0),
                quantity: String(charge.quantity ?? 1),
                unit: charge.unit || charge?.source_snapshot?.frozen?.unit || 'no',
                total_price: String(charge.total_price ?? 0),
                subtotal: String(charge.total_price ?? 0),
                discount_amount: String(charge.discount_amount ?? 0),
                total_cost: String(charge.total_cost ?? charge.total_price ?? 0),
                taxable: Boolean(charge.taxable),
                tax_rate: Number(charge.tax_rate || 0),
                tax_amount: Number(charge.tax_amount || 0),
                taxable_amount: Number(charge.taxable_amount || 0),
                rate: String(charge.unit_price ?? 0),
                qty: String(charge.quantity ?? 1),
                tax: charge.taxable ? 'Standard' : 'Exempt',
                total: Number(charge.total_price || 0),
                source_type: charge.source_type,
                sort_order: Number(charge.sort_order || 0),
                category: charge.category,
                planned_sub_job: charge.planned_sub_job ?? charge.planned_sub_job_id ?? null,
                planned_sub_job_id: charge.planned_sub_job_id ?? charge.planned_sub_job ?? null,
                metadata: charge.metadata || {},
            }));

            const matchesSelectedSubJob = (charge) => {
                if (normalizeChargeCategory(charge?.category) === 'discount') return true;
                if (!normalizedSelectedJobId) return true;
                const metadata = charge?.metadata && typeof charge.metadata === 'object' ? charge.metadata : {};
                const scopedId = charge?.planned_sub_job_id ?? charge?.planned_sub_job ?? metadata?.planned_sub_job_id ?? metadata?.opportunity_sub_job_id ?? metadata?.sub_job_id ?? metadata?.job_id ?? null;
                if (scopedId != null) return String(scopedId) === normalizedSelectedJobId;
                return normalizedSelectedJobId === primarySubJobId;
            };

            // Separate parents and children
            const parents = allCharges.filter((c) => !c.metadata?.parent_charge_id && matchesSelectedSubJob(c));
            const children = allCharges.filter((c) => c.metadata?.parent_charge_id && matchesSelectedSubJob(c));

            return parents.map((p) => {
                const subCharges = children.filter((c) => String(c.metadata.parent_charge_id) === String(p.id));
                return {
                    ...p,
                    subCharges,
                    totalDiscount: p.discount_amount,
                };
            });
        },
        [estimate, catalogItems, opportunityJobs, selectedSubJobId]
    );

    const calculations = useMemo(
        () => {
            const subtotal = Number(estimate?.subtotal || 0);
            const liveDiscountAmount = Math.max(0, Number(manual.discount_amount || estimate?.discount_amount || 0));
            const backendDiscountAmount = Math.max(0, Number(estimate?.discount_amount || 0));
            const taxableSubtotalFromBackend = Number(estimate?.taxable_subtotal || 0);
            const nonTaxableSubtotalFromBackend = Number(estimate?.non_taxable_subtotal || 0);
            let taxPct = Number(manual.sales_tax_pct || estimate?.sales_tax_pct || 0);

            // Heuristic: if taxPct > 1, it is likely a percentage (e.g. 8.25 for 8.25%) 
            // rather than a decimal (0.0825).
            if (taxPct > 1) {
                taxPct = taxPct / 100;
            }

            const isTaxExempt = Boolean(manual.tax_exempt);
            const effectiveSubtotal = Math.max(0, subtotal - liveDiscountAmount);
            const backendHasLiveDiscount = backendDiscountAmount === liveDiscountAmount;
            const estimatedTaxableSubtotal = (() => {
                if (Number.isFinite(taxableSubtotalFromBackend) && backendHasLiveDiscount) {
                    return taxableSubtotalFromBackend;
                }
                if (isTaxExempt) {
                    return 0;
                }
                if (subtotal <= 0) {
                    return 0;
                }
                if (Number.isFinite(taxableSubtotalFromBackend) && taxableSubtotalFromBackend >= 0) {
                    const taxableShare = taxableSubtotalFromBackend / subtotal;
                    return Math.max(0, effectiveSubtotal * taxableShare);
                }
                const nonTaxableFallback = Number.isFinite(nonTaxableSubtotalFromBackend) ? nonTaxableSubtotalFromBackend : 0;
                return Math.max(0, effectiveSubtotal - nonTaxableFallback);
            })();
            const computedTaxAmount = isTaxExempt ? 0 : (estimatedTaxableSubtotal * taxPct);
            const taxAmount = backendHasLiveDiscount && Number.isFinite(Number(estimate?.sales_tax_amount))
                ? Number(estimate.sales_tax_amount)
                : computedTaxAmount;
            
            const minimumCharge = Number(manual.minimum_charge_override || 0);
            let totalDue = backendHasLiveDiscount && Number.isFinite(Number(estimate?.grand_total))
                ? Number(estimate.grand_total)
                : effectiveSubtotal + taxAmount;
            if (minimumCharge && totalDue < minimumCharge) {
                totalDue = minimumCharge;
            }

            return {
                subtotal,
                taxableSubtotal: estimatedTaxableSubtotal,
                nonTaxableSubtotal: Math.max(0, effectiveSubtotal - estimatedTaxableSubtotal),
                taxPct,
                taxExempt: isTaxExempt,
                taxAmount,
                discountAmount: liveDiscountAmount,
                totalDue,
                depositAmount: Number(estimate?.deposit_amount || 0),
            };
        },
        [estimate, manual.sales_tax_pct, manual.tax_exempt, manual.discount_amount, manual.minimum_charge_override]
    );

    const estimateSubtotalBeforeEstimateDiscount = useMemo(
        () => Number(estimate?.subtotal || 0),
        [estimate?.subtotal]
    );

    const getEstimateDiscountPresetState = useCallback((rawValue) => {
        const presets = normalizeDiscountPresetList(rawValue);
        const total = presets.reduce((sum, preset) => sum + Number(preset.applied_amount || 0), 0);
        return { presets, total };
    }, []);



    const getChargePresetMode = (form) => {
        const category = normalizeChargeCategory(form?.category || 'other');
        const schema = getCategoryFormSchemaFromCatalog(category, catalogItems);
        const preset = (schema?.presets || []).find((p) => String(p?.key) === String(form?.category_preset_key || ''));
        return preset?.mode || '';
    };

    const validateChargeForm = (form, context) => {
        const errors = [];
        if (!String(form?.name || '').trim()) errors.push('Name is required.');
        const category = normalizeChargeCategory(form?.category || 'other');
        const isDiscount = category === 'discount';
        const qty = normalizeNumber(form?.quantity, NaN);
        const unitPrice = normalizeNumber(form?.unit_price, NaN);
        const total = normalizeNumber(form?.total_price, NaN);
        const schema = getCategoryFormSchemaFromCatalog(category, catalogItems);
        const preset = (schema?.presets || []).find((p) => String(p?.key) === String(form?.category_preset_key || ''));
        if (!Number.isFinite(qty) || qty < 0) errors.push('Quantity must be a number ≥ 0.');
        if (!Number.isFinite(unitPrice) || unitPrice < 0) errors.push('Rate/Price must be a number ≥ 0.');
        if (!Number.isFinite(total) || (!isDiscount && total < 0) || (isDiscount && total > 0)) {
            errors.push(isDiscount ? 'Discount total must be a number ≤ 0.' : 'Total must be a number ≥ 0.');
        }
        if (isDiscount && unitPrice <= 0) errors.push('Discount amount must be greater than 0.');

        // Do not hard-block save for categories that can be entered manually without route/time context.
        if (category === 'moving_labor') {
            const laborMode = String(form?.moving_labor_mode || 'hourly');
            const laborHours = parseDurationToHours(form?.labor_time_display, normalizeNumber(form?.labor_hours, NaN));
            if (!Number.isFinite(laborHours) || laborHours < 0) {
                errors.push('Labor hours must be a number ≥ 0.');
            }
            if (laborMode === 'hourly') {
                const hourlyRate = normalizeNumber(form?.hourly_rate_override, NaN);
                if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
                    errors.push('Hourly rate must be a number ≥ 0.');
                }
            } else if (laborMode === 'flat_plus_hourly') {
                const flatRate = normalizeNumber(form?.flat_rate, NaN);
                const includedHours = parseDurationToHours(form?.included_hours, normalizeNumber(form?.included_hours, NaN));
                const addlRate = normalizeNumber(form?.additional_hourly_rate, NaN);
                if (!Number.isFinite(flatRate) || flatRate < 0) errors.push('Flat rate must be a number ≥ 0.');
                if (!Number.isFinite(includedHours) || includedHours < 0) errors.push('Included hours must be a number ≥ 0.');
                if (!Number.isFinite(addlRate) || addlRate < 0) errors.push('Additional hourly rate must be a number ≥ 0.');
            }
        }
        if (category === 'packing' && schema?.presets?.length) {
            if (!preset) errors.push('Please select a preset option.');
            if (preset?.mode === 'hourly_labor') {
                const packers = normalizeNumber(form?.crew, NaN);
                if (!Number.isFinite(packers) || packers < 0) errors.push('Packers must be a number ≥ 0.');
            } else if (preset?.mode === 'flat_plus_hourly') {
                const flatRate = normalizeNumber(form?.flat_rate, NaN);
                const includedHours = parseDurationToHours(form?.included_hours, normalizeNumber(form?.included_hours, NaN));
                const addlRate = normalizeNumber(form?.additional_hourly_rate, NaN);
                if (!Number.isFinite(flatRate) || flatRate < 0) errors.push('Flat rate must be a number ≥ 0.');
                if (!Number.isFinite(includedHours) || includedHours < 0) errors.push('Included hours must be a number ≥ 0.');
                if (!Number.isFinite(addlRate) || addlRate < 0) errors.push('Additional hourly rate must be a number ≥ 0.');
            } else if (preset?.mode === 'unit') {
                const q = normalizeNumber(form?.quantity, NaN);
                const p = normalizeNumber(form?.unit_price, NaN);
                if (!Number.isFinite(q) || q < 0) errors.push('Quantity must be a number ≥ 0.');
                if (!Number.isFinite(p) || p < 0) errors.push('Rate must be a number ≥ 0.');
            } else if (preset?.mode === 'weight') {
                const w = normalizeNumber(form?.weight, NaN);
                const r = normalizeNumber(form?.unit_price, NaN);
                if (!Number.isFinite(w) || w < 0) errors.push('Weight must be a number ≥ 0.');
                if (!Number.isFinite(r) || r < 0) errors.push('Rate per Cwt must be a number ≥ 0.');
            }
        }
        if ((category === 'transportation' || category === 'trip_and_travel' || category === 'additional_services' || category === 'fuel_surcharge') && schema?.presets?.length) {
            if (!preset) errors.push('Please select a preset option.');
            if (preset?.mode === 'mileage') {
                if (normalizeNumber(form?.mileage, NaN) < 0 || !Number.isFinite(normalizeNumber(form?.mileage, NaN))) {
                    errors.push('Mileage must be a number ≥ 0.');
                }
                if (normalizeNumber(form?.cost_per_mile, NaN) < 0 || !Number.isFinite(normalizeNumber(form?.cost_per_mile, NaN))) {
                    errors.push('Cost per mile must be a number ≥ 0.');
                }
                if (category === 'fuel_surcharge') {
                    if (normalizeNumber(form?.trucks, NaN) < 1 || !Number.isFinite(normalizeNumber(form?.trucks, NaN))) {
                        errors.push('Number of trucks must be a number ≥ 1.');
                    }
                }
            }
            if (category === 'transportation' && preset?.mode === 'flat_truck') {
                if (!Number.isFinite(qty) || qty < 0) errors.push('Truck count must be a number ≥ 0.');
                if (!Number.isFinite(unitPrice) || unitPrice < 0) errors.push('Flat rate per truck must be a number ≥ 0.');
            }
            if (preset?.mode === 'percentage') {
                const pct = normalizeNumber(form?.percentage_rate, NaN);
                if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
                    errors.push('Percentage must be between 0 and 100.');
                }
            }
        }
        if (category === 'fuel_surcharge') {
            const presetMode = preset?.mode || '';
            if (!presetMode || presetMode === 'percentage') {
                const base = normalizeNumber(context.chargesSubtotal || context.transportationBase, 0);
                if (base <= 0) errors.push('Fuel surcharge base is 0. Add a charge first (or set base manually).');
            }
            if (total <= 0) errors.push('Fuel surcharge amount must be greater than 0.');
        }
        if (category === 'valuation') {
            const base = normalizeNumber(context.laborBase, 0);
            if (base <= 0) errors.push('Valuation base is 0. Add a labor charge first (or set base manually).');
            if (total <= 0) errors.push('Valuation amount must be greater than 0.');
        }
        return errors;
    };

    const normalizeFormForCategory = (form) => {
        const next = { ...(form || {}) };
        const category = normalizeChargeCategory(next.category || 'other');
        const schema = getCategoryFormSchemaFromCatalog(category, catalogItems);
        const presets = schema?.presets || [];
        if (!next.category_preset_key && presets.length) {
            next.category_preset_key = presets[0].key;
        }
        if (!String(next.name || '').trim()) {
            if (category === 'moving_labor') {
                next.name = `Moving Labor - ${next.moving_labor_mode === 'flat_plus_hourly' ? 'Flat Rate Plus Hourly' : 'Hourly'}`;
            } else if (next.category_preset_key) {
                const p = presets.find((x) => String(x.key) === String(next.category_preset_key));
                next.name = p?.label || prettyCategoryName(category);
            } else {
                next.name = prettyCategoryName(category);
            }
        }
        return next;
    };

    const buildChargePayload = (form, context) => {
        const category = normalizeChargeCategory(form?.category || 'other');
        const quantityValue = Number(form?.quantity);
        const unitPriceValue = Number(form?.unit_price);
        const totalValue = Number(form?.total_price);
        const quantity = Number.isFinite(quantityValue) ? quantityValue : 1;
        const unitPrice = Number.isFinite(unitPriceValue) ? unitPriceValue : 0;
        const total = Number.isFinite(totalValue) ? totalValue : NaN;
        const {
            unit,
            quick_discount,
            category_preset_key,
            moving_labor_mode,
            trucks,
            crew,
            labor_hours,
            labor_time_display,
            origin_to_destination_display,
            travel_time_display,
            handicap_origin_display,
            handicap_stops_display,
            handicap_destination_display,
            minimum_time_display,
            hourly_rate_override,
            flat_rate,
            included_hours,
            additional_hourly_rate,
            mileage_calc_method,
            mileage_bill_mode,
            office_to_origin_enabled,
            origin_to_destination_enabled,
            destination_to_office_enabled,
            mileage,
            cost_per_mile,
            min_cost,
            included_miles,
            cogs,
            percentage_rate,
            discount_mode,
            discount_percent,
            discount_amount_input,
            ...rest
        } = form || {};
        const payload = pickChargeModelFields(rest);
        // EstimateCharge.source_snapshot is a non-null JSON object. Legacy rows
        // can still return null, so never send that invalid value back on update.
        if (!payload.source_snapshot || typeof payload.source_snapshot !== 'object' || Array.isArray(payload.source_snapshot)) {
            payload.source_snapshot = {};
        }
        const schema = getCategoryFormSchemaFromCatalog(category, catalogItems);
        const preset = (schema?.presets || []).find((p) => String(p?.key) === String(category_preset_key || ''));
        const computed = computeChargeTotal(form, context, { presetMode: preset?.mode });
        const baseMetadata = payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {};
        const scopedJobId = selectedSubJobId ? Number(selectedSubJobId) || null : null;
        const mergedBaseMetadata = scopedJobId
            ? {
                ...baseMetadata,
                planned_sub_job_id: scopedJobId,
                opportunity_sub_job_id: scopedJobId,
            }
            : baseMetadata;
        const computedTotal = Number.isFinite(computed) ? computed : 0;
        const estimatedBaseAmount = normalizeNumber(
            form?.quantity,
            category === 'fuel_surcharge'
                ? (preset && preset.mode !== 'percentage' ? 1 : context.chargesSubtotal || context.transportationBase || 0)
                : category === 'valuation'
                    ? context.laborBase || 0
                    : context.transportationBase || context.laborBase || 0
        );

        if (category === 'discount') {
            const amount = Number.isFinite(unitPriceValue) && unitPriceValue !== 0
                ? Math.abs(unitPriceValue)
                : Number.isFinite(totalValue)
                    ? Math.abs(totalValue)
                    : 0;
            return {
                ...payload,
                quantity: 1,
                unit_price: amount,
                total_price: -Math.abs(amount),
            };
        }

        if (category === 'moving_labor') {
            const laborMode = String(moving_labor_mode || 'hourly');
            const laborHours = parseDurationToHours(labor_time_display, normalizeNumber(labor_hours, context?.estimatedHours || 0));
            const pricingRule = buildEstimateChargePricingRuleV2({ category, preset, form, taxable: payload.taxable });
            
            const sharedInputs = {
                crew: normalizeNumber(crew, 2),
                trucks: normalizeNumber(trucks, 1),
                labor_hours: laborHours,
                origin_to_destination_hours: parseDurationToHours(form?.origin_to_destination_display, 0),
                travel_time_hours: parseDurationToHours(form?.travel_time_display, 0),
                handicap_origin_hours: parseDurationToHours(form?.handicap_origin_display, 0),
                handicap_stops_hours: parseDurationToHours(form?.handicap_stops_display, 0),
                handicap_destination_hours: parseDurationToHours(form?.handicap_destination_display, 0),
                minimum_time_hours: parseDurationToHours(form?.minimum_time_display, 0),
                is_subtotal_overridden: !!form?.is_subtotal_overridden,
                subtotal_override_val: form?.is_subtotal_overridden ? normalizeNumber(form?.subtotal_override, 0) : 0,
                discount_mode: form?.discount_mode || 'percent',
                discount_percent: normalizeNumber(form?.discount_percent, 0),
                discount_amount_input: normalizeNumber(form?.discount_amount_input, 0),
            };

            if (laborMode === 'flat_plus_hourly') {
                const flatRate = normalizeNumber(flat_rate, 0);
                const included = parseDurationToHours(included_hours, normalizeNumber(included_hours, 0));
                const addlRate = normalizeNumber(additional_hourly_rate, context?.hourlyRate || 0);
                return {
                    ...payload,
                    quantity: 1,
                    unit_price: computedTotal,
                    total_price: computedTotal,
                    metadata: {
                        ...mergedBaseMetadata,
                        ...(pricingRule ? {
                            pricing_rule: pricingRule,
                            user_inputs: {
                                ...sharedInputs,
                                flat_rate: flatRate,
                                included_hours: included,
                                additional_hourly_rate: addlRate,
                            },
                        } : {}),
                    },
                };
            }
            const hourlyRate = normalizeNumber(hourly_rate_override, context?.hourlyRate || 0);
            return {
                ...payload,
                quantity: 1,
                unit_price: computedTotal,
                total_price: computedTotal,
                metadata: {
                    ...mergedBaseMetadata,
                    ...(pricingRule ? {
                        pricing_rule: pricingRule,
                        user_inputs: {
                            ...sharedInputs,
                            hourly_rate: hourlyRate,
                        },
                    } : {}),
                },
            };
        }

        if (category === 'packing' && preset) {
            const pricingRule = buildEstimateChargePricingRuleV2({ category, preset, form, taxable: payload.taxable });
            const discountInputs = {
                discount_mode: form?.discount_mode || 'percent',
                discount_percent: normalizeNumber(form?.discount_percent, 0),
                discount_amount_input: normalizeNumber(form?.discount_amount_input, 0),
            };
            if (preset.mode === 'hourly_labor') {
                return {
                    ...payload,
                    quantity: 1,
                    unit_price: computedTotal,
                    total_price: computedTotal,
                    metadata: {
                        ...mergedBaseMetadata,
                        ...(pricingRule ? {
                            pricing_rule: pricingRule,
                            user_inputs: {
                                packers: normalizeNumber(crew, 1),
                                hours: parseDurationToHours(labor_time_display, quantity),
                                hourly_rate: unitPrice,
                                ...discountInputs,
                            },
                        } : {}),
                    },
                };
            }
            if (preset.mode === 'flat_plus_hourly') {
                const totalHours = form?.labor_time_display 
                    ? parseDurationToHours(form.labor_time_display, 0)
                    : Number(form?.labor_hours || 0);
                return {
                    ...payload,
                    quantity: 1,
                    unit_price: computedTotal,
                    total_price: computedTotal,
                    metadata: {
                        ...mergedBaseMetadata,
                        ...(pricingRule ? {
                            pricing_rule: pricingRule,
                            user_inputs: {
                                crew: Number(crew || 1),
                                labor_hours: totalHours,
                                flat_rate: Number(flat_rate || 0),
                                included_hours: String(included_hours || '0').replace(/h$/i, ''),
                                additional_hourly_rate: Number(additional_hourly_rate || 0),
                                ...discountInputs,
                            },
                        } : {}),
                    },
                };
            }
            if (preset.mode === 'unit') {
                return {
                    ...payload,
                    quantity: Number(quantity || 0),
                    unit_price: Number(unitPrice || 0),
                    total_price: computedTotal,
                    metadata: {
                        ...mergedBaseMetadata,
                        ...(pricingRule ? {
                            pricing_rule: pricingRule,
                            user_inputs: {
                                quantity: Number(quantity || 0),
                                unit_price: Number(unitPrice || 0),
                                ...discountInputs,
                            },
                        } : {}),
                    },
                };
            }
            if (preset.mode === 'weight') {
                const weightLbs = Number(form?.weight || 0);
                return {
                    ...payload,
                    quantity: 1,
                    unit_price: computedTotal,
                    total_price: computedTotal,
                    metadata: {
                        ...mergedBaseMetadata,
                        ...(pricingRule ? {
                            pricing_rule: pricingRule,
                            user_inputs: {
                                weight_lbs: weightLbs,
                                rate_per_cwt: Number(unitPrice || 0),
                                ...discountInputs,
                            },
                        } : {}),
                    },
                };
            }
        }

        if (category === 'transportation' && preset) {
            const pricingRule = buildEstimateChargePricingRuleV2({ category, preset, form, taxable: payload.taxable });
            if (preset.mode === 'mileage') {
                return {
                    ...payload,
                    quantity: 1,
                    unit_price: computedTotal,
                    total_price: computedTotal,
                    metadata: {
                        ...mergedBaseMetadata,
                        ...(pricingRule ? {
                            pricing_rule: pricingRule,
                            user_inputs: {
                                mileage: normalizeNumber(mileage, context.distanceMiles || 0),
                                rate_per_mile: normalizeNumber(cost_per_mile, 0),
                                included_miles: normalizeNumber(included_miles, 0),
                                minimum_charge: normalizeNumber(min_cost, 0),
                                weight_lbs: normalizeNumber(form?.weight, 7000),
                                weight_cwt: normalizeNumber(form?.weight, 7000) / 100,
                                trucks: normalizeNumber(form?.trucks, 1),
                                crew: normalizeNumber(form?.crew, 2),
                                labor_hours: parseDurationToHours(form?.labor_time_display, 0),
                                is_subtotal_overridden: !!form?.is_subtotal_overridden,
                                subtotal_override_val: form?.is_subtotal_overridden ? normalizeNumber(form?.subtotal_override, 0) : 0,
                                discount_mode: form?.discount_mode || 'percent',
                                discount_percent: normalizeNumber(form?.discount_percent, 0),
                                discount_amount_input: normalizeNumber(form?.discount_amount_input, 0),
                            },
                        } : {}),
                    },
                };
            }
            return {
                ...payload,
                quantity: 1,
                unit_price: computedTotal,
                total_price: computedTotal,
                metadata: {
                    ...mergedBaseMetadata,
                    ...(pricingRule ? {
                        pricing_rule: pricingRule,
                        user_inputs: {
                            trucks: quantity,
                            flat_rate_per_truck: unitPrice,
                            crew: normalizeNumber(form?.crew, 2),
                            labor_hours: parseDurationToHours(form?.labor_time_display, 0),
                            discount_mode: form?.discount_mode || 'percent',
                            discount_percent: normalizeNumber(form?.discount_percent, 0),
                            discount_amount_input: normalizeNumber(form?.discount_amount_input, 0),
                        },
                    } : {}),
                },
            };
        }

        if ((category === 'trip_and_travel' || category === 'additional_services' || category === 'fuel_surcharge') && preset) {
            const pricingRule = buildEstimateChargePricingRuleV2({ category, preset, form, taxable: payload.taxable });
            const normalized = {
                mileage: normalizeNumber(mileage, context.distanceMiles || 0),
                cost_per_mile: normalizeNumber(cost_per_mile, 0),
                min_cost: normalizeNumber(min_cost, 0),
                included_miles: normalizeNumber(included_miles, 0),
                percentage_rate: normalizeNumber(percentage_rate, 0),
                trucks: normalizeNumber(trucks, 1),
            };
            if (preset.mode === 'mileage') {
                return {
                    ...payload,
                    quantity: 1,
                    unit_price: computedTotal,
                    total_price: computedTotal,
                    metadata: {
                        ...mergedBaseMetadata,
                        ...(pricingRule ? {
                            pricing_rule: pricingRule,
                            user_inputs: {
                                mileage: normalized.mileage,
                                cost_per_mile: normalized.cost_per_mile,
                                included_miles: normalized.included_miles,
                                min_cost: normalized.min_cost,
                                ...(category === 'fuel_surcharge' ? { trucks: normalized.trucks } : {}),
                            },
                        } : {}),
                    },
                };
            }
            if (preset.mode === 'flat') {
                return {
                    ...payload,
                    quantity: 1,
                    unit_price: computedTotal,
                    total_price: computedTotal,
                    metadata: {
                        ...mergedBaseMetadata,
                        ...(pricingRule ? {
                            pricing_rule: pricingRule,
                            user_inputs: {
                                amount: unitPrice,
                            },
                        } : {}),
                    },
                };
            }
            if (preset.mode === 'percentage') {
                return {
                    ...payload,
                    quantity: 1,
                    unit_price: computedTotal,
                    total_price: computedTotal,
                    metadata: {
                        ...mergedBaseMetadata,
                        ...(pricingRule ? {
                            pricing_rule: pricingRule,
                            user_inputs: {
                                base_amount: estimatedBaseAmount,
                                percentage_rate: normalized.percentage_rate,
                            },
                        } : {}),
                    },
                };
            }
            return {
                ...payload,
                quantity: 1,
                unit_price: computedTotal,
                total_price: computedTotal,
                metadata: {
                    ...mergedBaseMetadata,
                    ...(pricingRule ? {
                        pricing_rule: pricingRule,
                        user_inputs: {
                            quantity,
                            unit_price: unitPrice,
                        },
                    } : {}),
                },
            };
        }

        if (category === 'fuel_surcharge' || category === 'valuation') {
            if (!preset) {
                const pricingRule = buildEstimateChargePricingRuleV2({ category, preset, form, taxable: payload.taxable });
                return {
                    ...payload,
                    quantity: 1,
                    unit_price: computedTotal,
                    total_price: computedTotal,
                    metadata: {
                        ...mergedBaseMetadata,
                        ...(pricingRule ? {
                            pricing_rule: pricingRule,
                            user_inputs: {
                                base_amount: estimatedBaseAmount,
                                percentage_rate: normalizeNumber(percentage_rate, unitPrice),
                            },
                        } : {}),
                    },
                };
            }
        }

        return {
            ...payload,
            quantity,
            unit_price: unitPrice,
            total_price: Number.isFinite(total) ? total : computed,
            metadata: mergedBaseMetadata,
        };
    };

    const paymentOverview = useMemo(() => {
        const safePayments = Array.isArray(payments) ? payments : [];
        const succeeded = safePayments.filter((p) => String(p.status || '').toLowerCase() === 'succeeded');
        const latest = succeeded[0] || null;
        const currency = latest?.currency || 'USD';
        const backendTotalPaid = manualPaymentSummary?.payments?.total_paid;
        const backendBalanceDue = manualPaymentSummary?.payments?.balance_due;
        const hasBackendTotalPaid = backendTotalPaid !== null && backendTotalPaid !== undefined;
        const hasBackendBalanceDue = backendBalanceDue !== null && backendBalanceDue !== undefined;
        const totalPaid = hasBackendTotalPaid ? Number(backendTotalPaid || 0) : 0;
        const balanceDue = hasBackendBalanceDue ? Math.max(0, Number(backendBalanceDue || 0)) : 0;
        return {
            currency,
            totalPaid,
            balanceDue,
            isPaid: totalPaid > 0 && balanceDue <= 0,
        };
    }, [manualPaymentSummary, payments, calculations.totalDue]);

    const paymentRows = useMemo(() => {
        const safePayments = Array.isArray(payments) ? payments : [];
        const gatewayRows = safePayments.map((payment) => ({
            ...payment,
            kind: payment?.method === 'stripe' ? 'gateway' : 'gateway',
        }));
        const manualRows = Array.isArray(manualPaymentSummary?.manual_payments)
            ? manualPaymentSummary.manual_payments.map((row) => ({
                ...row,
                kind: 'manual',
                status: 'succeeded',
                payment_method_display: String(row?.method || 'manual').replaceAll('_', ' '),
                is_request: false,
                created_at: row?.paid_at || row?.created_at,
            }))
            : [];
        return [...manualRows, ...gatewayRows].sort((a, b) => {
            const aTime = new Date(a?.paid_at || a?.captured_at || a?.created_at || 0).getTime();
            const bTime = new Date(b?.paid_at || b?.captured_at || b?.created_at || 0).getTime();
            return bTime - aTime;
        });
    }, [manualPaymentSummary?.manual_payments, payments]);

    const handleCreateEstimate = async () => {
        if (!opportunity?.id || opportunity.id === 'new') return;
        const missingRequirements = getEstimateCreationRequirementGaps();
        if (missingRequirements.length) {
            openEstimateRequirementsModal();
            return;
        }
        setSaving(true);
        try {
            const row = await createEstimate({
                opportunity: opportunity.id,
                method: 'manual',
                ...blankManualFields,
            });
            setEstimate(row);
            syncManual(row);
            setToast({ type: 'success', text: 'Manual estimate created.' });
        } catch (err) {
            setToast({ type: 'error', text: getErrorMessage(err, 'Failed to create manual estimate.') });
        } finally {
            setSaving(false);
        }
    };

    const handleSaveEstimateRequirementsAndCreate = async () => {
        if (!estimateRequirementsDraft || !opportunity?.id || opportunity.id === 'new') return;

        const missingRequirements = getEstimateCreationRequirementGaps(estimateRequirementsDraft);
        if (missingRequirements.length) {
            setEstimateRequirementsError(`Missing: ${missingRequirements.join(', ')}.`);
            return;
        }

        setIsSavingEstimateRequirements(true);
        setEstimateRequirementsError('');
        try {
            const customerId =
                opportunity?.customer_details?.id ||
                opportunity?.customer_id ||
                opportunity?.customer?.id ||
                opportunity?.customer ||
                null;

            let finalCustomerId = customerId ? Number(customerId) : null;
            const customerPayload = {
                first_name: String(estimateRequirementsDraft.first_name || '').trim(),
                last_name: String(estimateRequirementsDraft.last_name || '').trim(),
                email: String(estimateRequirementsDraft.email || '').trim(),
                primary_phone: String(estimateRequirementsDraft.phone || '').trim(),
            };

            if (finalCustomerId) {
                await updateCustomer(finalCustomerId, customerPayload);
            } else {
                const createdCustomer = await createCustomer(customerPayload);
                finalCustomerId = Number(createdCustomer?.id || 0) || null;
            }

            await updateOpportunity(opportunity.id, {
                customer: finalCustomerId,
                service_type: estimateRequirementsDraft.service_type,
                move_date: estimateRequirementsDraft.move_date || null,
                move_type: estimateRequirementsDraft.move_type || null,
                branch: estimateRequirementsDraft.branch ? Number(estimateRequirementsDraft.branch) : null,
                origin_address_line1: String(estimateRequirementsDraft.origin_street || '').trim(),
                origin_city: String(estimateRequirementsDraft.origin_city || '').trim(),
                origin_state: String(estimateRequirementsDraft.origin_state || '').trim(),
                origin_postal_code: String(estimateRequirementsDraft.origin_zip || '').trim(),
                destination_address_line1: String(estimateRequirementsDraft.destination_street || '').trim(),
                destination_city: String(estimateRequirementsDraft.destination_city || '').trim(),
                destination_state: String(estimateRequirementsDraft.destination_state || '').trim(),
                destination_postal_code: String(estimateRequirementsDraft.destination_zip || '').trim(),
            });

            await Promise.resolve(onRefresh?.());

            const row = await createEstimate({
                opportunity: opportunity.id,
                method: 'manual',
                ...blankManualFields,
            });
            setEstimate(row);
            syncManual(row);
            setIsEstimateRequirementsModalOpen(false);
            setEstimateRequirementsDraft(null);
            setToast({ type: 'success', text: 'Manual estimate created.' });
        } catch (err) {
            setEstimateRequirementsError(getErrorMessage(err, 'Failed to save the required estimate data.'));
        } finally {
            setIsSavingEstimateRequirements(false);
        }
    };

    // Legacy template-based workflows removed.

    const getManualDetailValidationErrors = () => {
        const nextErrors = {};
        const crewSize = normalizeNumber(manual.crew_size, 2);
        const truckCount = normalizeNumber(manual.truck_count, 1);
        const estimatedHours = normalizeNumber(manual.estimated_hours, 0);
        const travelHours = normalizeNumber(manual.travel_time_hours, 0);
        const hourlyRate = normalizeNumber(manual.hourly_rate, 0);
        const flatRate = normalizeNumber(manual.flat_rate_amount, 0);
        const minimumCharge = normalizeNumber(manual.minimum_charge_override, 0);
        const markupAmount = normalizeNumber(manual.markup_amount, 0);
        const discountAmount = normalizeNumber(manual.discount_amount, 0);
        const longCarry = normalizeNumber(manual.long_carry_distance, 0);
        const salesTaxPct = normalizeNumber(manual.sales_tax_pct, 0);

        if (!Number.isFinite(crewSize) || crewSize < 1) nextErrors.crew_size = 'Crew size must be at least 1.';
        if (!Number.isFinite(truckCount) || truckCount < 1) nextErrors.truck_count = 'Truck count must be at least 1.';
        if (!Number.isFinite(estimatedHours) || estimatedHours < 0) nextErrors.estimated_hours = 'Estimated hours must be 0 or more.';
        if (!Number.isFinite(travelHours) || travelHours < 0) nextErrors.travel_time_hours = 'Travel hours must be 0 or more.';
        if (!Number.isFinite(minimumCharge) || minimumCharge < 0) nextErrors.minimum_charge_override = 'Minimum charge cannot be negative.';
        if (!Number.isFinite(markupAmount) || markupAmount < 0) nextErrors.markup_amount = 'Markup cannot be negative.';
        if (!Number.isFinite(discountAmount) || discountAmount < 0) nextErrors.discount_amount = 'Discount cannot be negative.';
        if (!Number.isFinite(longCarry) || longCarry < 0) nextErrors.long_carry_distance = 'Long carry distance cannot be negative.';
        if (!Number.isFinite(salesTaxPct) || salesTaxPct < 0) nextErrors.sales_tax_pct = 'Sales tax percent must be 0 or more.';
        if (manual.pricing_mode === 'hourly' && (!Number.isFinite(hourlyRate) || hourlyRate <= 0)) {
            nextErrors.hourly_rate = 'Hourly rate must be greater than 0 for hourly pricing.';
        }
        if (manual.pricing_mode === 'flat' && (!Number.isFinite(flatRate) || flatRate <= 0)) {
            nextErrors.flat_rate_amount = 'Flat rate amount must be greater than 0 for flat pricing.';
        }
        if (!manual.pricing_mode || !['hourly', 'flat'].includes(manual.pricing_mode)) {
            nextErrors.pricing_mode = 'Select a valid pricing mode.';
        }

        return nextErrors;
    };

    const savePricingDetails = async () => {
        if (!estimate?.id) return;
        if (!ensureEstimateEditable()) return null;
        const nextErrors = getManualDetailValidationErrors();
        const crewSize = normalizeNumber(manual.crew_size, 2);
        const truckCount = normalizeNumber(manual.truck_count, 1);
        const discountAmount = normalizeNumber(manual.discount_amount, 0);
        const salesTaxPct = normalizeNumber(manual.sales_tax_pct, 0);

        if (Object.keys(nextErrors).length) {
            setDetailErrors(nextErrors);
            setToast({ type: 'error', text: 'Please fix estimate detail validation errors before saving.' });
            return;
        }

        setDetailErrors({});
        setSaving(true);
        try {
            const payload = {
                ...manual,
                crew_size: crewSize,
                truck_count: truckCount,
                sales_tax_pct: salesTaxPct,
                tax_exempt: Boolean(manual.tax_exempt),
                discount_amount: discountAmount,
            };
            const row = await updateEstimateManualDetails(estimate.id, payload);
            setEstimate(row);
            syncManual(row);
            setToast({ type: 'success', text: 'Manual estimate details saved.' });
            return row;
        } catch {
            setToast({ type: 'error', text: 'Failed to save manual estimate details.' });
            return null;
        } finally {
            setSaving(false);
        }
    };

    // Keep a snapshot of tax fields so the autosave effect doesn't immediately fire after initial load.
    useEffect(() => {
        if (!estimate?.id) return;
        lastSavedTaxRef.current = {
            sales_tax_pct: String(manual?.sales_tax_pct ?? ''),
            tax_exempt: Boolean(manual?.tax_exempt),
        };
        lastSavedDiscountRef.current = { discount_amount: String(manual?.discount_amount ?? '') };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [estimate?.id]);

    const saveTaxPctOnly = async (overrides = {}) => {
        if (!estimate?.id) return false;
        if (!ensureEstimateEditable()) return false;

        const nextTaxExempt = overrides.tax_exempt ?? manual.tax_exempt;
        const salesTaxPct = normalizeNumber(overrides.sales_tax_pct ?? manual.sales_tax_pct, 0);
        console.info('[EstimateView] saveTaxPctOnly: start', {
            estimateId: estimate?.id,
            salesTaxPct,
            taxExempt: Boolean(nextTaxExempt),
            subtotal: estimate?.subtotal,
            taxableSubtotal: estimate?.taxable_subtotal,
        });
        if (!Number.isFinite(salesTaxPct) || salesTaxPct < 0) {
            setToast({ type: 'error', text: 'Sales tax percent must be 0 or more.' });
            return false;
        }

        setSaving(true);
        try {
            const payload = {
                sales_tax_pct: salesTaxPct,
                tax_exempt: Boolean(nextTaxExempt),
            };

            console.info('[EstimateView] saveTaxPctOnly: PATCH manual-details payload', payload);
            const row = await updateEstimateManualDetails(estimate.id, payload);
            console.info('[EstimateView] saveTaxPctOnly: PATCH manual-details response', {
                sales_tax_pct: row?.sales_tax_pct,
                tax_exempt: row?.tax_exempt,
                subtotal: row?.subtotal,
                taxable_subtotal: row?.taxable_subtotal,
                sales_tax_amount: row?.sales_tax_amount,
                grand_total: row?.grand_total,
            });
            setEstimate(row);
            syncManual(row);
            return true;
        } catch (err) {
            console.error('[EstimateView] saveTaxPctOnly: failed', err);
            setToast({ type: 'error', text: getErrorMessage(err, 'Failed to update taxes.') });
            return false;
        } finally {
            setSaving(false);
        }
    };

    const saveDiscountOnly = async (overrides = {}) => {
        if (!estimate?.id) return false;
        if (!ensureEstimateEditable()) return false;

        const discountAmount = normalizeNumber(overrides.discount_amount ?? manual.discount_amount, 0);
        if (!Number.isFinite(discountAmount) || discountAmount < 0) {
            setToast({ type: 'error', text: 'Discount must be 0 or more.' });
            return false;
        }

        setSaving(true);
        try {
            const nextInputs = { ...(estimate?.inputs || {}) };
            const existingPresets = getEstimateDiscountPresetState(nextInputs.discount_presets || nextInputs.discount_preset || []).presets;
            const presetMeta = overrides.discount_preset;
            const removePresetId = String(overrides.remove_discount_preset_id || '').trim();
            let nextPresets = existingPresets;
            if (presetMeta && discountAmount > 0) {
                nextPresets = [
                    ...existingPresets,
                    {
                        id: String(presetMeta.id || '').trim(),
                        label: String(presetMeta.label || 'Discount'),
                        discount_type: String(presetMeta.discount_type || 'fixed').toLowerCase(),
                        value: String(presetMeta.value ?? discountAmount),
                        applied_amount: Number(presetMeta.applied_amount ?? discountAmount) || discountAmount,
                    },
                ];
            }
            if (removePresetId) {
                nextPresets = existingPresets.filter((preset) => String(preset.id || '') !== removePresetId);
            }
            if (overrides.clear_discount_presets) {
                nextPresets = [];
            }
            if (Array.isArray(overrides.next_discount_presets)) {
                nextPresets = getEstimateDiscountPresetState(overrides.next_discount_presets).presets;
            }
            nextInputs.discount_presets = nextPresets;
            delete nextInputs.discount_preset;
            const nextTotalDiscount = getEstimateDiscountPresetState(nextPresets).total;
            const payload = { discount_amount: nextTotalDiscount, inputs: nextInputs };
            const row = await updateEstimateManualDetails(estimate.id, payload);
            setEstimate(row);
            syncManual(row);
            return true;
        } catch (err) {
            setToast({ type: 'error', text: getErrorMessage(err, 'Failed to update discount.') });
            return false;
        } finally {
            setSaving(false);
        }
    };

    const saveManualNotesOnly = async (overrides = {}) => {
        if (!estimate?.id) return false;
        if (!ensureEstimateEditable()) return false;
        setSaving(true);
        try {
            const payload = {
                special_items_notes: overrides.special_items_notes ?? manual.special_items_notes ?? '',
                packing_notes: overrides.packing_notes ?? manual.packing_notes ?? '',
                access_notes: overrides.access_notes ?? manual.access_notes ?? '',
            };
            const row = await updateEstimateManualDetails(estimate.id, payload);
            setEstimate(row);
            syncManual(row);
            return true;
        } catch {
            setToast({ type: 'error', text: 'Failed to save notes.' });
            return false;
        } finally {
            setSaving(false);
        }
    };

    const estimateFieldString = (value) => String(value ?? '');

    const hasUnsavedManualDetailChanges = () => {
        if (!estimate?.id) return false;
        return (
            estimateFieldString(estimate?.pricing_mode || 'hourly') !== estimateFieldString(manual?.pricing_mode || 'hourly') ||
            estimateFieldString(estimate?.crew_size ?? 2) !== estimateFieldString(manual?.crew_size ?? 2) ||
            estimateFieldString(estimate?.truck_count ?? 1) !== estimateFieldString(manual?.truck_count ?? 1) ||
            estimateFieldString(estimate?.estimated_hours ?? 0) !== estimateFieldString(manual?.estimated_hours ?? 0) ||
            estimateFieldString(estimate?.travel_time_hours ?? 0) !== estimateFieldString(manual?.travel_time_hours ?? 0) ||
            estimateFieldString(estimate?.hourly_rate ?? 0) !== estimateFieldString(manual?.hourly_rate ?? 0) ||
            estimateFieldString(estimate?.flat_rate_amount ?? 0) !== estimateFieldString(manual?.flat_rate_amount ?? 0) ||
            estimateFieldString(estimate?.minimum_charge_override ?? 0) !== estimateFieldString(manual?.minimum_charge_override ?? 0) ||
            estimateFieldString(estimate?.markup_amount ?? 0) !== estimateFieldString(manual?.markup_amount ?? 0) ||
            estimateFieldString(estimate?.long_carry_distance ?? 0) !== estimateFieldString(manual?.long_carry_distance ?? 0) ||
            Boolean(estimate?.has_stairs) !== Boolean(manual?.has_stairs) ||
            Boolean(estimate?.has_elevator) !== Boolean(manual?.has_elevator) ||
            estimateFieldString(estimate?.rooms_summary || '') !== estimateFieldString(manual?.rooms_summary || '')
        );
    };

    const hasUnsavedManualNoteChanges = () => {
        if (!estimate?.id) return false;
        return (
            estimateFieldString(estimate?.special_items_notes || '') !== estimateFieldString(manual?.special_items_notes || '') ||
            estimateFieldString(estimate?.packing_notes || '') !== estimateFieldString(manual?.packing_notes || '') ||
            estimateFieldString(estimate?.access_notes || '') !== estimateFieldString(manual?.access_notes || '')
        );
    };

    const cancelPendingEstimateAutosaves = () => {
        if (taxSaveTimeoutRef.current) {
            clearTimeout(taxSaveTimeoutRef.current);
            taxSaveTimeoutRef.current = null;
        }
        if (discountSaveTimeoutRef.current) {
            clearTimeout(discountSaveTimeoutRef.current);
            discountSaveTimeoutRef.current = null;
        }
        if (detailsAutoSaveTimeoutRef.current) {
            clearTimeout(detailsAutoSaveTimeoutRef.current);
            detailsAutoSaveTimeoutRef.current = null;
        }
        if (notesAutoSaveTimeoutRef.current) {
            clearTimeout(notesAutoSaveTimeoutRef.current);
            notesAutoSaveTimeoutRef.current = null;
        }
    };

    const flushPendingEstimateEditsForPortal = async () => {
        if (!estimate?.id) return true;

        cancelPendingEstimateAutosaves();

        const normalizedTaxPct = normalizeDecimalInput(manual?.sales_tax_pct, '0');
        const normalizedDiscount = normalizeDecimalInput(manual?.discount_amount, '0');
        const lastTax = lastSavedTaxRef.current || { sales_tax_pct: null, tax_exempt: null };
        const lastDiscount = lastSavedDiscountRef.current || { discount_amount: null };

        if (
            String(lastTax.sales_tax_pct ?? '') !== String(normalizedTaxPct ?? '') ||
            Boolean(lastTax.tax_exempt) !== Boolean(manual?.tax_exempt)
        ) {
            const ok = await saveTaxPctOnly({
                sales_tax_pct: normalizedTaxPct,
                tax_exempt: Boolean(manual?.tax_exempt),
            });
            if (!ok) return false;
            lastSavedTaxRef.current = {
                sales_tax_pct: String(normalizedTaxPct ?? ''),
                tax_exempt: Boolean(manual?.tax_exempt),
            };
        }

        if (String(lastDiscount.discount_amount ?? '') !== String(normalizedDiscount ?? '')) {
            const ok = await saveDiscountOnly({ discount_amount: normalizedDiscount });
            if (!ok) return false;
            lastSavedDiscountRef.current = { discount_amount: String(normalizedDiscount ?? '') };
        }

        if (hasUnsavedManualNoteChanges()) {
            const ok = await saveManualNotesOnly();
            if (!ok) return false;
        }

        if (isEditingDetails || hasUnsavedManualDetailChanges()) {
            const row = await savePricingDetails();
            if (!row) return false;
        }

        return true;
    };

    useEffect(() => {
        if (!estimate?.id || saving) return;
        if (estimateIsLocked) {
            if (detailsAutoSaveTimeoutRef.current) {
                clearTimeout(detailsAutoSaveTimeoutRef.current);
                detailsAutoSaveTimeoutRef.current = null;
            }
            return;
        }
        if (detailsAutoSaveTimeoutRef.current) {
            clearTimeout(detailsAutoSaveTimeoutRef.current);
            detailsAutoSaveTimeoutRef.current = null;
        }
        if (!hasUnsavedManualDetailChanges()) return;

        const nextErrors = getManualDetailValidationErrors();
        if (Object.keys(nextErrors).length) {
            setDetailErrors(nextErrors);
            return;
        }
        setDetailErrors({});
        detailsAutoSaveTimeoutRef.current = setTimeout(async () => {
            await savePricingDetails();
            detailsAutoSaveTimeoutRef.current = null;
        }, 800);

        return () => {
            if (detailsAutoSaveTimeoutRef.current) {
                clearTimeout(detailsAutoSaveTimeoutRef.current);
                detailsAutoSaveTimeoutRef.current = null;
            }
        };
    }, [
        estimate?.id,
        estimateIsLocked,
        saving,
        manual?.pricing_mode,
        manual?.crew_size,
        manual?.truck_count,
        manual?.estimated_hours,
        manual?.travel_time_hours,
        manual?.hourly_rate,
        manual?.flat_rate_amount,
        manual?.rooms_summary,
        manual?.has_stairs,
        manual?.has_elevator,
        manual?.long_carry_distance,
        manual?.minimum_charge_override,
        manual?.markup_amount,
    ]);

    useEffect(() => {
        if (!estimate?.id || saving) return;
        if (estimateIsLocked) {
            if (notesAutoSaveTimeoutRef.current) {
                clearTimeout(notesAutoSaveTimeoutRef.current);
                notesAutoSaveTimeoutRef.current = null;
            }
            return;
        }
        if (notesAutoSaveTimeoutRef.current) {
            clearTimeout(notesAutoSaveTimeoutRef.current);
            notesAutoSaveTimeoutRef.current = null;
        }
        if (!hasUnsavedManualNoteChanges()) return;

        notesAutoSaveTimeoutRef.current = setTimeout(async () => {
            await saveManualNotesOnly();
            notesAutoSaveTimeoutRef.current = null;
        }, 800);

        return () => {
            if (notesAutoSaveTimeoutRef.current) {
                clearTimeout(notesAutoSaveTimeoutRef.current);
                notesAutoSaveTimeoutRef.current = null;
            }
        };
    }, [
        estimate?.id,
        estimateIsLocked,
        saving,
        manual?.special_items_notes,
        manual?.packing_notes,
        manual?.access_notes,
    ]);

    const handleDiscountBlur = async () => {
        if (!estimate?.id || estimateIsLocked) return;
        if (discountSaveTimeoutRef.current) {
            clearTimeout(discountSaveTimeoutRef.current);
            discountSaveTimeoutRef.current = null;
        }
        const normalizedDiscount = normalizeDecimalInput(manual?.discount_amount, '0');
        if (String(manual?.discount_amount ?? '') !== normalizedDiscount) {
            setManual((prev) => ({ ...prev, discount_amount: normalizedDiscount }));
        }
        const nextDiscount = String(normalizedDiscount ?? '');
        const last = lastSavedDiscountRef.current || { discount_amount: null };
        if (String(last.discount_amount ?? '') === nextDiscount) return;

        const ok = await saveDiscountOnly({ discount_amount: normalizedDiscount, clear_discount_presets: true });
        if (ok) lastSavedDiscountRef.current = { discount_amount: nextDiscount };
    };

    const handleDiscountChange = (value) => {
        const normalizedDiscount = normalizeDecimalInput(value, '0');
        setSelectedDiscountPresetId('');
        setManual((prev) => ({ ...prev, discount_amount: normalizedDiscount }));

        if (!estimate?.id || estimateIsLocked) return;
        if (discountSaveTimeoutRef.current) clearTimeout(discountSaveTimeoutRef.current);

        const nextDiscount = String(normalizedDiscount ?? '');
        const last = lastSavedDiscountRef.current || { discount_amount: null };
        if (String(last.discount_amount ?? '') === nextDiscount) return;

        discountSaveTimeoutRef.current = setTimeout(async () => {
            const ok = await saveDiscountOnly({ discount_amount: nextDiscount, clear_discount_presets: true });
            if (ok) {
                lastSavedDiscountRef.current = { discount_amount: nextDiscount };
            }
            discountSaveTimeoutRef.current = null;
        }, 500);
    };

    const handleApplyCustomDiscount = async (type, rawValue) => {
        if (estimateIsLocked) return;
        const subtotal = Number.isFinite(estimateSubtotalBeforeEstimateDiscount)
            ? estimateSubtotalBeforeEstimateDiscount
            : Number(estimate?.subtotal || calculations?.subtotal || 0);
        const computedAmount = type === 'percent'
            ? (subtotal * Number(rawValue || 0)) / 100
            : Number(rawValue || 0);
        const normalizedDiscount = normalizeDecimalInput(String(Math.max(0, computedAmount)), '0');

        setManual((prev) => ({ ...prev, discount_amount: normalizedDiscount }));
        
        if (discountSaveTimeoutRef.current) {
            clearTimeout(discountSaveTimeoutRef.current);
            discountSaveTimeoutRef.current = null;
        }

        const ok = await saveDiscountOnly({
            discount_amount: normalizedDiscount,
            discount_preset: {
                id: 'custom',
                label: 'Custom Discount',
                discount_type: type,
                value: String(rawValue),
                applied_amount: Number(normalizedDiscount || 0),
            },
        });
        if (ok) {
            lastSavedDiscountRef.current = { discount_amount: normalizedDiscount };
        }
    };

    const handleDiscountPresetChange = async (presetId) => {
        const nextPresetId = String(presetId || '').trim();
        setSelectedDiscountPresetId(nextPresetId);
        if (estimateIsLocked) return;
        if (!nextPresetId) {
            setSelectedDiscountPresetId('');
            return;
        }

        const preset = discountPresets.find((row) => String(row?.id || '') === nextPresetId);
        if (!preset) return;

        if (discountSaveTimeoutRef.current) {
            clearTimeout(discountSaveTimeoutRef.current);
            discountSaveTimeoutRef.current = null;
        }

        const subtotal = Number.isFinite(estimateSubtotalBeforeEstimateDiscount)
            ? estimateSubtotalBeforeEstimateDiscount
            : Number(estimate?.subtotal || calculations?.subtotal || 0);
        const rawValue = Number(preset?.value || 0);
        const computedAmount = String(preset?.discount_type || '').toLowerCase() === 'percent'
            ? (subtotal * rawValue) / 100
            : rawValue;
        const normalizedDiscount = normalizeDecimalInput(String(Math.max(0, computedAmount)), '0');

        const existingPresets = getEstimateDiscountPresetState(estimate?.inputs?.discount_presets || estimate?.inputs?.discount_preset || []).presets;
        const nextPresets = [
            ...existingPresets.filter((row) => String(row.id || '') !== String(preset.id || '')),
            {
                id: preset.id,
                label: preset.label,
                discount_type: preset.discount_type,
                value: preset.value,
                applied_amount: Number(normalizedDiscount || 0),
            },
        ];
        const nextTotal = nextPresets.reduce((sum, row) => sum + Number(row.applied_amount || 0), 0);
        setManual((prev) => ({ ...prev, discount_amount: String(nextTotal) }));
        const ok = await saveDiscountOnly({
            discount_amount: String(nextTotal),
            discount_preset: {
                id: preset.id,
                label: preset.label,
                discount_type: preset.discount_type,
                value: preset.value,
                applied_amount: Number(normalizedDiscount || 0),
            },
            next_discount_presets: nextPresets,
        });
        if (ok) {
            lastSavedDiscountRef.current = { discount_amount: String(nextTotal ?? '') };
        }
    };

    const handleRemoveDiscount = async (presetId = null) => {
        if (estimateIsLocked) return;
        const currentPresets = getEstimateDiscountPresetState(estimate?.inputs?.discount_presets || estimate?.inputs?.discount_preset || []).presets;
        const nextPresets = presetId
            ? currentPresets.filter((row) => String(row.id || '') !== String(presetId))
            : [];
        const nextTotal = nextPresets.reduce((sum, row) => sum + Number(row.applied_amount || 0), 0);
        setManual((prev) => ({ ...prev, discount_amount: String(nextTotal) }));
        if (!presetId) setSelectedDiscountPresetId('');
        const ok = await saveDiscountOnly({
            discount_amount: String(nextTotal),
            clear_discount_presets: !presetId,
            remove_discount_preset_id: presetId || null,
            next_discount_presets: nextPresets,
        });
        if (ok) {
            lastSavedDiscountRef.current = { discount_amount: String(nextTotal) };
        }
    };

    const appliedDiscountPresets = useMemo(() => {
        const presets = getEstimateDiscountPresetState(estimate?.inputs?.discount_presets || estimate?.inputs?.discount_preset || []).presets;
        if (!presets.length || Number(estimate?.discount_amount || 0) <= 0) return [];
        return presets;
    }, [estimate?.discount_amount, estimate?.inputs, normalizeDiscountPresetList]);

    useEffect(() => {
        if (!estimate?.id || saving) return;
        if (estimateIsLocked) {
            if (discountSaveTimeoutRef.current) {
                clearTimeout(discountSaveTimeoutRef.current);
                discountSaveTimeoutRef.current = null;
            }
            return;
        }
        const presetMeta = getEstimateDiscountPresetState(estimate?.inputs?.discount_presets || estimate?.inputs?.discount_preset || []).presets;
        if (!presetMeta.length) return;

        const normalizedDiscount = normalizeDecimalInput(String(Math.max(0, computeDiscountPresetTotal(presetMeta, estimateSubtotalBeforeEstimateDiscount))), '0');
        const currentDiscount = normalizeDecimalInput(String(estimate?.discount_amount || 0), '0');
        if (normalizedDiscount === currentDiscount) return;

        const syncPresetDiscount = async () => {
            const ok = await saveDiscountOnly({
                discount_amount: normalizedDiscount,
                clear_discount_presets: true,
                next_discount_presets: presetMeta.map((row) => ({
                    ...row,
                    applied_amount: computeDiscountPresetAmount(row, estimateSubtotalBeforeEstimateDiscount),
                })),
            });
            if (ok) {
                lastSavedDiscountRef.current = { discount_amount: normalizedDiscount };
            }
        };
        syncPresetDiscount();
    }, [estimate?.id, estimate?.discount_amount, estimate?.inputs, estimateSubtotalBeforeEstimateDiscount, saving, estimateIsLocked, computeDiscountPresetAmount, computeDiscountPresetTotal, normalizeDiscountPresetList]);

    useEffect(() => {
        let cancelled = false;
        const loadDiscountPresets = async () => {
            try {
                const response = await getEstimateDiscountPresets({ is_active: 'true' });
                if (cancelled) return;
                const rows = Array.isArray(response?.results) ? response.results : Array.isArray(response) ? response : [];
                setDiscountPresets(rows);
            } catch (err) {
                console.warn('Failed to load estimate discount presets:', err);
                if (!cancelled) setDiscountPresets([]);
            }
        };
        loadDiscountPresets();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => () => {
        if (taxSaveTimeoutRef.current) clearTimeout(taxSaveTimeoutRef.current);
        if (discountSaveTimeoutRef.current) clearTimeout(discountSaveTimeoutRef.current);
        if (detailsAutoSaveTimeoutRef.current) clearTimeout(detailsAutoSaveTimeoutRef.current);
        if (notesAutoSaveTimeoutRef.current) clearTimeout(notesAutoSaveTimeoutRef.current);
    }, []);

    const handleTaxPctBlur = async () => {
        if (!estimate?.id) return;
        if (taxSaveTimeoutRef.current) {
            clearTimeout(taxSaveTimeoutRef.current);
            taxSaveTimeoutRef.current = null;
        }

        const normalizedPct = normalizeDecimalInput(manual?.sales_tax_pct, '0');
        if (String(manual?.sales_tax_pct ?? '') !== normalizedPct) {
            setManual((prev) => ({ ...prev, sales_tax_pct: normalizedPct }));
        }
        const nextPct = String(normalizedPct ?? '');
        const nextExempt = Boolean(manual?.tax_exempt);
        const last = lastSavedTaxRef.current || { sales_tax_pct: null, tax_exempt: null };

        if (String(last.sales_tax_pct ?? '') === nextPct && Boolean(last.tax_exempt) === nextExempt) return;

        const ok = await saveTaxPctOnly({ sales_tax_pct: normalizedPct });
        if (ok) {
            lastSavedTaxRef.current = { sales_tax_pct: nextPct, tax_exempt: nextExempt };
        }
    };

    const handleTaxPctChange = (value) => {
        const normalizedPct = normalizeDecimalInput(value, '0');
        setManual((prev) => ({ ...prev, sales_tax_pct: normalizedPct }));

        if (!estimate?.id) return;
        if (taxSaveTimeoutRef.current) clearTimeout(taxSaveTimeoutRef.current);

        const nextPct = String(normalizedPct ?? '');
        const nextExempt = Boolean(manual?.tax_exempt);
        const last = lastSavedTaxRef.current || { sales_tax_pct: null, tax_exempt: null };
        if (String(last.sales_tax_pct ?? '') === nextPct && Boolean(last.tax_exempt) === nextExempt) return;

        taxSaveTimeoutRef.current = setTimeout(async () => {
            const ok = await saveTaxPctOnly({ sales_tax_pct: nextPct, tax_exempt: nextExempt });
            if (ok) {
                lastSavedTaxRef.current = { sales_tax_pct: nextPct, tax_exempt: nextExempt };
            }
            taxSaveTimeoutRef.current = null;
        }, 500);
    };

	    const handleTaxExemptToggle = async (checked) => {
	        const nextExempt = Boolean(checked);
            if (taxSaveTimeoutRef.current) {
                clearTimeout(taxSaveTimeoutRef.current);
                taxSaveTimeoutRef.current = null;
            }
	        setManual((prev) => ({ ...prev, tax_exempt: nextExempt }));

	        // Checkbox doesn't have a reliable "unfocus" moment, so save immediately.
	        const ok = await saveTaxPctOnly({ tax_exempt: nextExempt });
	        if (ok) {
	            lastSavedTaxRef.current = { sales_tax_pct: String(manual?.sales_tax_pct ?? ''), tax_exempt: nextExempt };
	        }
	    };

    const handleRecalculate = async () => {
        if (!estimate?.id) return;
        if (!ensureEstimateEditable('This estimate cannot be edited right now.')) return;
        setSaving(true);
        try {
            const row = await recalculateEstimate(estimate.id);
            setEstimate(row);
            syncManual(row);
            setToast({ type: 'success', text: 'Estimate recalculated.' });
        } catch {
            setToast({ type: 'error', text: 'Failed to recalculate estimate.' });
        } finally {
            setSaving(false);
        }
    };

    const handleSendEstimate = () => {
        if (!estimate?.id) return;

        // Pre-fill deposit info if available
        const savedDepositType = estimate.inputs?.deposit_type;
        if (savedDepositType === 'amount') {
            setDepositType('amount');
            setDepositValue(String(estimate.deposit_amount || estimate.inputs?.deposit_amount || 0));
        } else if (savedDepositType === 'percentage' || estimate.inputs?.deposit_pct) {
            setDepositType('percentage');
            setDepositValue(String(Number(estimate.inputs?.deposit_pct || 0.10) * 100));
        } else if (estimate.deposit_amount && Number(estimate.deposit_amount) > 0) {
            setDepositType('amount');
            setDepositValue(String(estimate.deposit_amount));
        } else {
            setDepositType('percentage');
            setDepositValue('10');
        }

        // Default portal template selection for send/resend modal
        const selection = resolvePortalTemplateSelection();
        setSelectedPortalTemplateId(selection.portalTemplateId);
        // For resends, default to "use same template" checked.
        setResendUseSameTemplate(Boolean(estimate?.sent));

        setSelectedRecipientEmails(availableEmails.length > 0 ? [availableEmails[0].value] : []);
        setSelectedRecipientPhones(availablePhones.length > 0 ? [availablePhones[0].value] : []);
        setCustomRecipientEmail('');
        setCustomRecipientPhone('');

        setSendEmail(true);
        setSendSMS(false);
        setIsSendModalOpen(true);
    };

    const lastTriggerSendRef = useRef(triggerSendEstimate);
    const lastTriggerViewRef = useRef(triggerViewEstimate);

    useEffect(() => {
        const previousTrigger = previousSendEstimateTrigger.current;
        if (!triggerSendEstimate || previousTrigger === triggerSendEstimate) return;
        if (!estimate?.id) return;
        if (triggerSendEstimate === lastTriggerSendRef.current) return;
        lastTriggerSendRef.current = triggerSendEstimate;
        handleSendEstimate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [triggerSendEstimate, estimate?.id]);


    useEffect(() => {
        if (!triggerViewEstimate) return;
        if (!estimate?.id) return;
        if (triggerViewEstimate === lastTriggerViewRef.current) return;
        lastTriggerViewRef.current = triggerViewEstimate;
        const selection = resolvePortalTemplateSelection();
        setSelectedPortalTemplateId(selection.portalTemplateId);
        setIsPortalSelectModalOpen(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [triggerViewEstimate, estimate?.id]);


    const handleConfirmSendEstimate = async () => {
        if (!estimate?.id) return;
        const flushed = await flushPendingEstimateEditsForPortal();
        if (!flushed) return;
        const selection = resolvePortalTemplateSelection();
        const selectedTemplateIsValid = Boolean(
            selectedPortalTemplateId &&
            portalTemplates.some((row) => String(row.id) === String(selectedPortalTemplateId))
        );
        const resolvedTemplateId = selectedTemplateIsValid ? selectedPortalTemplateId : selection.portalTemplateId;
        const requiresTemplateSelection = !estimate?.sent || !resendUseSameTemplate || !selection.hasExistingTemplate;
        if (requiresTemplateSelection && !resolvedTemplateId) {
            setToast({ type: 'error', text: 'Select a customer portal template.' });
            return;
        }

        const channels = [];
        if (sendEmail) channels.push('email');
        if (sendSMS) channels.push('sms');

        if (channels.length === 0) {
            setToast({ type: 'error', text: 'Please select at least one delivery channel (Email or SMS).' });
            return;
        }

        const emailRecipients = [
            ...selectedRecipientEmails,
            ...(customRecipientEmail.trim() ? [customRecipientEmail.trim()] : []),
        ];
        const phoneRecipients = [
            ...selectedRecipientPhones,
            ...(customRecipientPhone.trim() ? [customRecipientPhone.trim()] : []),
        ];

        if (sendEmail && emailRecipients.length === 0) {
            setToast({ type: 'error', text: 'Please select at least one recipient email address.' });
            return;
        }
        if (sendSMS && phoneRecipients.length === 0) {
            setToast({ type: 'error', text: 'Please select at least one recipient phone number.' });
            return;
        }

        setSaving(true);
        const estimateId = estimate?.id;
        const isResend = Boolean(estimate?.sent);
        const useSameTemplate = Boolean(resendUseSameTemplate);
        const portalTemplateIdToSend = resolvedTemplateId ? Number(resolvedTemplateId) : null;
        const payload = {
            portal_base_url: getPortalBaseUrl(),
            channels,
            template_key: 'notif_estimate_sent',
            notification_scope: 'company',
            dispatch_via_automation: true,
        };

        if (sendEmail) {
            payload.to_email = emailRecipients.join(', ');
        }
        if (sendSMS) {
            payload.to_phone = phoneRecipients.join(', ');
        }
        if (requiresTemplateSelection) {
            payload.portal_template_id = Number(portalTemplateIdToSend);
        }
        if (depositType === 'percentage') {
            payload.deposit_pct = Number(depositValue) / 100;
        } else {
            payload.deposit_amount = Number(depositValue);
        }

        setIsSendModalOpen(false);
        setSaving(false);

        (async () => {
            try {
                if (isResend) {
                    const resendPayload = useSameTemplate
                        ? {
                            ...payload,
                            use_same_template: true,
                            channels,
                            template_key: 'notif_estimate_sent',
                            notification_scope: 'company',
                            dispatch_via_automation: true,
                            to_email: sendEmail ? emailRecipients.join(', ') : undefined,
                            to_phone: sendSMS ? phoneRecipients.join(', ') : undefined,
                        }
                        : {
                            ...payload,
                            use_same_template: false,
                            portal_template_id: Number(portalTemplateIdToSend),
                            channels,
                            template_key: 'notif_estimate_sent',
                            notification_scope: 'company',
                            dispatch_via_automation: true,
                            to_email: sendEmail ? emailRecipients.join(', ') : undefined,
                            to_phone: sendSMS ? phoneRecipients.join(', ') : undefined,
                        };
                    const res = await resendEstimate(estimateId, resendPayload);
                        setToast({
                            type: 'success',
                            text: res?.automation_enabled
                                ? 'Estimate resent successfully.'
                                : 'Estimate email is correctly skipped.',
                        });
                    if (res?.estimate_portal_link) setEstimatePortalLink(res.estimate_portal_link);
                    return;
                }

                const row = await sendEstimate(estimateId, payload);
                setEstimate(row);
                syncManual(row);
                setToast({ type: 'success', text: 'Estimate sent successfully.' });
            } catch (err) {
                const detail = err?.response?.data?.detail;
                setToast({ type: 'error', text: detail || 'Failed to send estimate.' });
            }
        })();
    };

    const handleClearEstimateSignatures = async () => {
        if (!estimate?.id) return;
        const ok = window.confirm(
            'Clear customer signatures for this estimate? The customer will need to re-accept after you resend.'
        );
        if (!ok) return;

        setSaving(true);
        try {
            const row = await clearEstimateSignatures(estimate.id);
            setEstimate(row);
            syncManual(row);
            setToast({ type: 'success', text: 'Signatures cleared. Resend the estimate to request a new acceptance.' });
        } catch (err) {
            const detail = err?.response?.data?.detail;
            setToast({ type: 'error', text: detail || 'Failed to clear signatures.' });
        } finally {
            setSaving(false);
        }
    };

    const handleAddCharge = async () => {
        if (!estimate?.id) return;
        if (!ensureChargeEditable()) return;
        
        const formWithDiscount = { ...chargeForm };
        if (['moving_labor', 'fuel_surcharge', 'transportation', 'packing'].includes(normalizeChargeCategory(formWithDiscount.category))) {
            const calculatedSubtotal = formWithDiscount.is_subtotal_overridden
                ? Number(formWithDiscount.subtotal_override || 0)
                : (normalizeChargeCategory(formWithDiscount.category) === 'moving_labor'
                    ? calculateMovingLaborCalculatedSubtotal(formWithDiscount, chargeContext)
                    : (normalizeChargeCategory(formWithDiscount.category) === 'transportation'
                        ? (getChargePresetMode(formWithDiscount) === 'mileage'
                            ? Number(formWithDiscount.mileage || 0) * Number(formWithDiscount.cost_per_mile || 0)
                            : Number(formWithDiscount.quantity || 0) * Number(formWithDiscount.unit_price || 0))
                        : computeChargeTotal(formWithDiscount, chargeContext, { presetMode: getChargePresetMode(formWithDiscount) })));
            const discountAmount = formWithDiscount.discount_mode === 'amount'
                ? Number(formWithDiscount.discount_amount_input || 0)
                : calculatedSubtotal * (Number(formWithDiscount.discount_percent || 0) / 100);
            formWithDiscount.quick_discount = String(discountAmount);
        }
        
        const normalizedForm = normalizeFormForCategory(formWithDiscount);
        const nextForm = {
            ...normalizedForm,
            total_price: String(computeChargeTotal(normalizedForm, chargeContext, { presetMode: getChargePresetMode(normalizedForm) })),
        };
        const formErrors = validateChargeForm(nextForm, chargeContext);
        if (formErrors.length) {
            setToast({ type: 'error', text: formErrors[0] });
            return;
        }
        setSaving(true);
        try {
            const existingChargeIds = new Set((estimate?.charges || []).map((charge) => String(charge.id)));
            const addedEstimate = await addEstimateCharge(estimate.id, buildChargePayload(nextForm, chargeContext));
            const addedParent = (addedEstimate?.charges || [])
                .filter((charge) => !existingChargeIds.has(String(charge.id)))
                .filter((charge) => !charge?.metadata?.parent_charge_id)
                .sort((a, b) => Number(b.id || 0) - Number(a.id || 0))[0];
            const quickDiscount = Math.abs(Number(nextForm.quick_discount || 0));
            if (addedParent?.id && quickDiscount > 0) {
                await syncInlineDiscountSubCharges({
                    parentChargeId: addedParent.id,
                    subDiscounts: [],
                    nextDiscount: quickDiscount,
                });
            }
            await recalculateAndSyncEstimate();
            setChargeForm(blankCharge);
            setChargeTotalIsManual(false);
            setIsAddChargeModalOpen(false);
            setToast({ type: 'success', text: 'Charge added.' });
        } catch (err) {
            setToast({ type: 'error', text: getErrorMessage(err, 'Failed to add charge.') });
        } finally {
            setSaving(false);
        }
    };

    const startAddingCharge = () => {
        if (!ensureChargeEditable()) return;
        const initialFormState = {
            ...blankCharge,
            name: '',
            labor_hours: String(chargeContext?.estimatedHours || ''),
            labor_time_display: formatHoursAsCompactDuration(chargeContext?.estimatedHours || 0.5),
            origin_to_destination_display: formatHoursAsCompactDuration(chargeContext?.durationHours || 0),
            travel_time_display: formatHoursAsCompactDuration(chargeContext?.travelHours || 0),
            hourly_rate_override: String(chargeContext?.hourlyRate || ''),
            additional_hourly_rate: String(chargeContext?.hourlyRate || ''),
            category: 'other',
        };
        const initialFormula = getPricingFormulaText(initialFormState, chargeContext, catalogItems);
        lastAutoFilledFormulaRef.current = initialFormula;

        setChargeForm(initialFormState);
        setChargeTotalIsManual(false);
        setEditingChargeId(null);
        setEditingChargeTotalIsManual(false);
        setIsAddChargeModalOpen(true);
    };

    const cancelAddingCharge = () => {
        setChargeForm(blankCharge);
        setChargeTotalIsManual(false);
        setIsAddChargeModalOpen(false);
        lastAutoFilledFormulaRef.current = '';
    };

    // Adding individual catalog items is disabled; use packages from Settings instead.

    const startEditingCharge = (row) => {
        if (!ensureEstimateEditable()) return;
        const pricingRule = row?.metadata?.rule_snapshot || row?.metadata?.pricing_rule || {};
        const ruleInputs = row?.metadata?.user_inputs || {};
        const category = normalizeChargeCategory(row.category);
        const categorySchema = getCategoryFormSchemaFromCatalog(category, catalogItems);
        const schemaPresets = categorySchema?.presets || [];
        const derivedPresetFromMode = schemaPresets.find((p) => String(p?.mode || '') === String(pricingRule?.mode || ''))?.key || '';
        const movingLaborMode = String(pricingRule?.mode || 'hourly');
        const inferredLaborHours = Number(
            ruleInputs?.labor_hours
            ?? (movingLaborMode === 'hourly' ? row.quantity : 0)
            ?? chargeContext?.estimatedHours
            ?? 0
        );
        const inferredBaseAmount = Number(ruleInputs?.base_amount ?? row.quantity ?? 0);
        const inferredFlatAmount = Number(ruleInputs?.amount ?? row.unit_price ?? row.total_price ?? 0);
        const inferredUnitQuantity = Number(ruleInputs?.quantity ?? row.quantity ?? 1);
        const inferredUnitPrice = Number(ruleInputs?.unit_price ?? row.unit_price ?? 0);
        const inferredPctRate = Number(ruleInputs?.percentage_rate ?? row.unit_price ?? 0);
        
        const initialFormState = {
            ...blankCharge,
            name: row.name || '',
            category,
            calculation_type: row.calculation_type || 'flat',
            commissionable: row.commissionable ?? true,
            sort_order: row.sort_order ?? 0,
            source_catalog_item: row.source_catalog_item || null,
            source_snapshot: row.source_snapshot && typeof row.source_snapshot === 'object' && !Array.isArray(row.source_snapshot)
                ? { ...row.source_snapshot }
                : {},
            is_manual_override: row.is_manual_override ?? false,
            tax_rate: row.tax_rate ?? 0,
            taxable_amount: row.taxable_amount ?? 0,
            tax_amount: row.tax_amount ?? 0,
            total_before_tax: row.total_before_tax ?? 0,
            total_after_tax: row.total_after_tax ?? 0,
            metadata: row.metadata && typeof row.metadata === 'object' ? { ...row.metadata } : {},
            quantity: String(
                ['fuel_surcharge', 'valuation'].includes(category) && !pricingRule?.mode
                    ? inferredBaseAmount
                    : (pricingRule?.mode === 'percentage'
                        ? inferredBaseAmount
                        : pricingRule?.mode === 'hourly_labor'
                            ? Number(ruleInputs?.hours ?? row.quantity ?? 0)
                        : pricingRule?.mode === 'flat_truck'
                            ? Number(ruleInputs?.trucks ?? row.quantity ?? 1)
                        : pricingRule?.mode === 'unit'
                            ? inferredUnitQuantity
                            : (row.quantity === 0 || row.quantity === '0'
                                ? '0'
                                : (row.quantity === null || row.quantity === undefined || row.quantity === '' ? '1' : String(row.quantity))))
            ),
            unit: row.unit || 'no',
            unit_price: String(
                pricingRule?.mode === 'flat'
                    ? inferredFlatAmount
                    : pricingRule?.mode === 'hourly_labor'
                        ? Number(ruleInputs?.hourly_rate ?? row.unit_price ?? 0)
                    : pricingRule?.mode === 'flat_truck'
                        ? Number(ruleInputs?.flat_rate_per_truck ?? row.unit_price ?? 0)
                    : pricingRule?.mode === 'unit'
                        ? inferredUnitPrice
                    : pricingRule?.mode === 'weight'
                        ? Number(ruleInputs?.rate_per_cwt ?? row.unit_price ?? 0)
                    : ['fuel_surcharge', 'valuation'].includes(category) && !pricingRule?.mode
                            ? inferredPctRate
                            : (movingLaborMode === 'hourly'
                                ? (ruleInputs?.hourly_rate ?? row.unit_price ?? '0')
                                : row.unit_price || '0')
            ),
            total_price: row.total_price || '0',
            description: row.description || '',
            taxable: row.taxable ?? true,
            quick_discount: String(Math.abs(row.totalDiscount || 0)),
            category_preset_key: String(derivedPresetFromMode || ''),
            moving_labor_mode: movingLaborMode === 'flat_plus_hourly' ? 'flat_plus_hourly' : 'hourly',
            trucks: String(ruleInputs?.trucks ?? 1),
            crew: String(ruleInputs?.crew ?? ruleInputs?.packers ?? 2),
            labor_hours: String(ruleInputs?.labor_hours || inferredLaborHours || ''),
            labor_time_display: formatHoursAsCompactDuration(ruleInputs?.labor_hours ?? inferredLaborHours),
            origin_to_destination_display: formatHoursAsCompactDuration(ruleInputs?.origin_to_destination_hours ?? 0),
            travel_time_display: formatHoursAsCompactDuration(ruleInputs?.travel_time_hours ?? 0),
            handicap_origin_display: formatHoursAsCompactDuration(ruleInputs?.handicap_origin_hours ?? 0),
            handicap_stops_display: formatHoursAsCompactDuration(ruleInputs?.handicap_stops_hours ?? 0),
            handicap_destination_display: formatHoursAsCompactDuration(ruleInputs?.handicap_destination_hours ?? 0),
            minimum_time_display: formatHoursAsCompactDuration(ruleInputs?.minimum_time_hours ?? 0),
            hourly_rate_override: String(ruleInputs?.hourly_rate ?? ruleInputs?.hourly_rate_override ?? chargeContext?.hourlyRate ?? ''),
            flat_rate: String(ruleInputs?.flat_rate ?? '0'),
            included_hours: String(
                ruleInputs?.included_hours !== undefined
                    ? formatHoursAsCompactDuration(ruleInputs?.included_hours)
                    : '0h'
            ),
            additional_hourly_rate: String(ruleInputs?.additional_hourly_rate ?? chargeContext?.hourlyRate ?? '0'),
            is_subtotal_overridden: !!ruleInputs?.is_subtotal_overridden,
            subtotal_override: String(ruleInputs?.subtotal_override_val ?? ''),
            discount_mode: ruleInputs?.discount_mode || 'percent',
            discount_percent: String(ruleInputs?.discount_percent ?? ''),
            discount_amount_input: String(ruleInputs?.discount_amount_input ?? ''),
            mileage_calc_method: 'by_segment',
            mileage_bill_mode: 'actual',
            office_to_origin_enabled: true,
            origin_to_destination_enabled: true,
            destination_to_office_enabled: true,
            mileage: String(ruleInputs?.mileage ?? ''),
            cost_per_mile: String(ruleInputs?.cost_per_mile ?? ruleInputs?.rate_per_mile ?? ''),
            min_cost: String(ruleInputs?.min_cost ?? ruleInputs?.minimum_charge ?? ''),
            included_miles: String(ruleInputs?.included_miles ?? ''),
            cogs: '0',
            percentage_rate: String(inferredPctRate || ''),
            weight: String(ruleInputs?.weight_lbs ?? (ruleInputs?.weight_cwt ? Number(ruleInputs.weight_cwt) * 100 : '') ?? '7000'),
        };

        const initialFormula = getPricingFormulaText(initialFormState, chargeContext, catalogItems);
        if (!row.description || row.description === initialFormula) {
            lastEditingAutoFilledFormulaRef.current = row.description || initialFormula;
        } else {
            lastEditingAutoFilledFormulaRef.current = null;
        }

        setEditingChargeId(row.id);
        setEditingChargeTotalIsManual(false);
        setEditingChargeForm(initialFormState);
    };

    const cancelEditingCharge = () => {
        setEditingChargeId(null);
        setEditingChargeForm(blankCharge);
        setEditingChargeTotalIsManual(false);
        lastEditingAutoFilledFormulaRef.current = '';
    };

    const syncInlineDiscountSubCharges = async ({ parentChargeId, subDiscounts = [], nextDiscount }) => {
        const normalizedDiscount = Math.max(0, Number(nextDiscount || 0));
        const activeDiscounts = (Array.isArray(subDiscounts) ? subDiscounts : []).filter((charge) => charge?.category === 'discount');

        if (normalizedDiscount > 0) {
            if (activeDiscounts.length > 0) {
                const [primaryDiscount, ...duplicates] = activeDiscounts;
                const nextMetadata = { ...(primaryDiscount.metadata || {}) };
                delete nextMetadata.planned_sub_job_id;
                delete nextMetadata.opportunity_sub_job_id;
                await updateEstimateCharge(primaryDiscount.id, {
                    name: primaryDiscount.name || 'Discount',
                    category: 'discount',
                    quantity: 1,
                    unit_price: normalizedDiscount,
                    total_price: -normalizedDiscount,
                    metadata: {
                        ...nextMetadata,
                        parent_charge_id: parentChargeId,
                    },
                });
                for (const duplicate of duplicates) {
                    await deleteEstimateCharge(duplicate.id);
                }
            } else {
                await addEstimateCharge(estimate.id, {
                    name: 'Manual Discount',
                    category: 'discount',
                    quantity: 1,
                    unit_price: normalizedDiscount,
                    total_price: -normalizedDiscount,
                    metadata: {
                        parent_charge_id: parentChargeId,
                    },
                });
            }
            return;
        }

        for (const discountCharge of activeDiscounts) {
            await deleteEstimateCharge(discountCharge.id);
        }
    };

    const recalculateAndSyncEstimate = async () => {
        if (!estimate?.id) return null;
        const recalced = await recalculateEstimate(estimate.id);
        setEstimate(recalced);
        syncManual(recalced);
        return recalced;
    };

    const handleReorderCharges = async (sourceId, targetId) => {
        if (!estimate?.id) return;
        if (!ensureEstimateEditable()) return;
        const sourceIndex = lineItems.findIndex((row) => String(row.id) === String(sourceId));
        const targetIndex = lineItems.findIndex((row) => String(row.id) === String(targetId));
        if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;

        const reordered = [...lineItems];
        const [moved] = reordered.splice(sourceIndex, 1);
        reordered.splice(targetIndex, 0, moved);

        const nextCharges = (estimate.charges || []).map((charge) => {
            const parentIndex = reordered.findIndex((row) => String(row.id) === String(charge.id));
            if (parentIndex < 0) return charge;
            return { ...charge, sort_order: parentIndex + 1 };
        });
        setEstimate((prev) => prev ? { ...prev, charges: nextCharges } : prev);

        setSaving(true);
        try {
            await Promise.all(reordered.map((row, index) => updateEstimateCharge(row.id, {
                name: row.name,
                category: normalizeChargeCategory(row.category),
                description: row.description || '',
                quantity: row.quantity,
                unit_price: row.unit_price,
                total_price: row.total_price,
                taxable: !!row.taxable,
                sort_order: index + 1,
                metadata: row.metadata || {},
            })));
            await recalculateAndSyncEstimate();
            setToast({ type: 'success', text: 'Charge order updated.' });
        } catch (err) {
            await loadEstimate(true);
            setToast({ type: 'error', text: getErrorMessage(err, 'Failed to update charge order.') });
        } finally {
            setSaving(false);
        }
    };

    const handleSaveCharge = async () => {
        if (!editingChargeId) return;
        if (!ensureEstimateEditable()) return;
        
        const formWithDiscount = { ...editingChargeForm };
        if (['moving_labor', 'fuel_surcharge', 'transportation', 'packing'].includes(normalizeChargeCategory(formWithDiscount.category))) {
            const calculatedSubtotal = formWithDiscount.is_subtotal_overridden
                ? Number(formWithDiscount.subtotal_override || 0)
                : (normalizeChargeCategory(formWithDiscount.category) === 'moving_labor'
                    ? calculateMovingLaborCalculatedSubtotal(formWithDiscount, chargeContext)
                    : (normalizeChargeCategory(formWithDiscount.category) === 'transportation'
                        ? (getChargePresetMode(formWithDiscount) === 'mileage'
                            ? Number(formWithDiscount.mileage || 0) * Number(formWithDiscount.cost_per_mile || 0)
                            : Number(formWithDiscount.quantity || 0) * Number(formWithDiscount.unit_price || 0))
                        : computeChargeTotal(formWithDiscount, chargeContext, { presetMode: getChargePresetMode(formWithDiscount) })));
            const discountAmount = formWithDiscount.discount_mode === 'amount'
                ? Number(formWithDiscount.discount_amount_input || 0)
                : calculatedSubtotal * (Number(formWithDiscount.discount_percent || 0) / 100);
            formWithDiscount.quick_discount = String(discountAmount);
        }
        
        const normalizedForm = normalizeFormForCategory(formWithDiscount);
        const nextForm = {
            ...normalizedForm,
            total_price: String(computeChargeTotal(normalizedForm, chargeContext, { presetMode: getChargePresetMode(normalizedForm) })),
        };
        const formErrors = validateChargeForm(nextForm, chargeContext);
        if (formErrors.length) {
            setToast({ type: 'error', text: formErrors[0] });
            return;
        }
        setSaving(true);
        try {
            await updateEstimateCharge(editingChargeId, {
                name: nextForm.name.trim(),
                category: normalizeChargeCategory(nextForm.category),
                ...buildChargePayload(nextForm, chargeContext),
                description: nextForm.description,
                taxable: !!nextForm.taxable,
            });

            // Sync quick discount
            const originalRow = lineItems.find(r => r.id === editingChargeId);
            const nextDiscount = Number(nextForm.quick_discount || 0);
            const prevDiscount = Math.abs(originalRow?.totalDiscount || 0);

            if (nextDiscount !== prevDiscount) {
                await syncInlineDiscountSubCharges({
                    parentChargeId: editingChargeId,
                    subDiscounts: originalRow?.subCharges || [],
                    nextDiscount,
                });
            }
            await recalculateAndSyncEstimate();
            cancelEditingCharge();
            setToast({ type: 'success', text: 'Charge updated.' });
        } catch (err) {
            setToast({ type: 'error', text: getErrorMessage(err, 'Failed to update charge.') });
        } finally {
            setSaving(false);
        }
    };

    const renderPresetDrivenCategoryForm = (formState, setFormState) => {
        const cat = normalizeChargeCategory(formState.category);
        const schema = getCategoryFormSchemaFromCatalog(cat, catalogItems);
        const presets = schema?.presets || [];
        const preset = presets.find((p) => String(p.key) === String(formState.category_preset_key || ''));
        if (!preset) {
            return (
                <FormInput
                    label="Preset"
                    as="select"
                    value={formState.category_preset_key}
                    onChange={(e) => setFormState((p) => ({ ...p, category_preset_key: e.target.value }))}
                >
                    <option value="">Choose preset...</option>
                    {presets.map((p) => (
                        <option key={p.key} value={p.key}>{p.label}</option>
                    ))}
                </FormInput>
            );
        }
        return (
            <>
                <FormInput
                    label="Preset"
                    as="select"
                    value={formState.category_preset_key}
                    onChange={(e) => setFormState((p) => ({ ...p, category_preset_key: e.target.value }))}
                >
                    {presets.map((p) => (
                        <option key={p.key} value={p.key}>{p.label}</option>
                    ))}
                </FormInput>
                {preset.mode === 'mileage' ? (
                    <>
                        <FormInput label="Description" value={formState.description} onChange={(e) => setFormState((p) => ({ ...p, description: e.target.value }))} />
                        <FormInput label="Mileage Calculation Method" as="select" value={formState.mileage_calc_method} onChange={(e) => setFormState((p) => ({ ...p, mileage_calc_method: e.target.value }))}>
                            <option value="by_segment">By Segment</option>
                            <option value="total_route">Total Route</option>
                        </FormInput>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <label className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${!!formState.office_to_origin_enabled ? 'border-brand bg-brand/5 text-brand' : 'border-ink-200 bg-white text-ink-600 hover:bg-slate-50'}`}>
                                <input type="checkbox" checked={!!formState.office_to_origin_enabled} onChange={(e) => setFormState((p) => ({ ...p, office_to_origin_enabled: e.target.checked }))} className="sr-only" />
                                <span>Office → Origin</span>
                            </label>
                            <label className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${!!formState.origin_to_destination_enabled ? 'border-brand bg-brand/5 text-brand' : 'border-ink-200 bg-white text-ink-600 hover:bg-slate-50'}`}>
                                <input type="checkbox" checked={!!formState.origin_to_destination_enabled} onChange={(e) => setFormState((p) => ({ ...p, origin_to_destination_enabled: e.target.checked }))} className="sr-only" />
                                <span>Origin → Dest</span>
                            </label>
                            <label className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${!!formState.destination_to_office_enabled ? 'border-brand bg-brand/5 text-brand' : 'border-ink-200 bg-white text-ink-600 hover:bg-slate-50'}`}>
                                <input type="checkbox" checked={!!formState.destination_to_office_enabled} onChange={(e) => setFormState((p) => ({ ...p, destination_to_office_enabled: e.target.checked }))} className="sr-only" />
                                <span>Dest → Office</span>
                            </label>
                        </div>
                        <FormInput label="Mileage To Be Billed" as="select" value={formState.mileage_bill_mode} onChange={(e) => setFormState((p) => ({ ...p, mileage_bill_mode: e.target.value }))}>
                            <option value="actual">Actual</option>
                            <option value="custom">Custom</option>
                        </FormInput>
                        <div className="grid grid-cols-2 gap-4">
                            <FormInput label="Mileage" type="number" value={formState.mileage} onChange={(e) => setFormState((p) => ({ ...p, mileage: e.target.value }))} />
                            <FormInput label="Cost per Mile" type="number" value={formState.cost_per_mile} onChange={(e) => setFormState((p) => ({ ...p, cost_per_mile: e.target.value }))} />
                            <FormInput label="Min Cost" type="number" value={formState.min_cost} onChange={(e) => setFormState((p) => ({ ...p, min_cost: e.target.value }))} />
                            <FormInput label="Included Miles" type="number" value={formState.included_miles} onChange={(e) => setFormState((p) => ({ ...p, included_miles: e.target.value }))} />
                        </div>
                        <FormInput label="Cost of Goods" type="number" value={formState.cogs} onChange={(e) => setFormState((p) => ({ ...p, cogs: e.target.value }))} />
                    </>
                ) : preset.mode === 'percentage' ? (
                    <div className="grid grid-cols-2 gap-4">
                        <FormInput label="Base Amount" type="number" value={formState.quantity} onChange={(e) => setFormState((p) => ({ ...p, quantity: e.target.value }))} />
                        <FormInput label="Percentage" type="number" value={formState.percentage_rate} onChange={(e) => setFormState((p) => ({ ...p, percentage_rate: e.target.value }))} />
                    </div>
                ) : preset.mode === 'flat_truck' ? (
                    <div className="grid grid-cols-2 gap-4">
                        <FormInput label="Trucks" type="number" value={formState.quantity} onChange={(e) => setFormState((p) => ({ ...p, quantity: e.target.value }))} />
                        <FormInput label="Flat Rate per Truck" type="number" value={formState.unit_price} onChange={(e) => setFormState((p) => ({ ...p, unit_price: e.target.value }))} />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        <FormInput label="Qty" type="number" value={formState.quantity} onChange={(e) => setFormState((p) => ({ ...p, quantity: e.target.value }))} />
                        <FormInput label={preset.mode === 'flat' ? 'Flat Fee' : 'Rate'} type="number" value={formState.unit_price} onChange={(e) => setFormState((p) => ({ ...p, unit_price: e.target.value }))} />
                    </div>
                )}
            </>
        );
    };

    const renderChargeCategoryFields = (formState, setFormState) => {
        const category = normalizeChargeCategory(formState.category);
        if (category === 'moving_labor') {
            return (
                <ChargeFormSection
                    title="Labor Pricing"
                    description=""
                >
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-ink-400 mb-2">Pricing Type</label>
                        <div className="grid grid-cols-2 rounded-xl border border-ink-200 bg-white p-1 gap-1">
                            <button
                                type="button"
                                onClick={() => setFormState((p) => ({ ...p, moving_labor_mode: 'hourly' }))}
                                className={`px-4 py-3 text-xs font-bold rounded-lg transition-all ${formState.moving_labor_mode === 'hourly' ? 'bg-brand text-white shadow-sm' : 'text-ink-500 hover:bg-ink-50 hover:text-ink-900'}`}
                            >
                                Hourly only
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormState((p) => ({ ...p, moving_labor_mode: 'flat_plus_hourly' }))}
                                className={`px-4 py-3 text-xs font-bold rounded-lg transition-all ${formState.moving_labor_mode === 'flat_plus_hourly' ? 'bg-brand text-white shadow-sm' : 'text-ink-500 hover:bg-ink-50 hover:text-ink-900'}`}
                            >
                                Fixed price + extra hours
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <FormInput label="Trucks" type="number" value={formState.trucks} onChange={(e) => setFormState((p) => ({ ...p, trucks: e.target.value }))} />
                        <FormInput label="Crew" type="number" value={formState.crew} onChange={(e) => setFormState((p) => ({ ...p, crew: e.target.value }))} />
                    </div>
                    {formState.moving_labor_mode === 'flat_plus_hourly' ? (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            <FormInput label="Fixed Price" type="number" value={formState.flat_rate} onChange={(e) => setFormState((p) => ({ ...p, flat_rate: e.target.value }))} />
                            <FormInput label="Included Hours" value={formState.included_hours} onChange={(e) => setFormState((p) => ({ ...p, included_hours: e.target.value }))} />
                            <FormInput label="Extra Hour Rate" type="number" value={formState.additional_hourly_rate} onChange={(e) => setFormState((p) => ({ ...p, additional_hourly_rate: e.target.value }))} />
                        </div>
                    ) : (
                        <FormInput
                            label="Hourly Rate"
                            type="number"
                            value={formState.hourly_rate_override}
                            onChange={(e) => setFormState((p) => ({ ...p, hourly_rate_override: e.target.value }))}
                        />
                    )}
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <FormInput label={formState.moving_labor_mode === 'flat_plus_hourly' ? 'Total Labor Time' : 'Billable Hours'} value={formState.labor_time_display} onChange={(e) => setFormState((p) => ({ ...p, labor_time_display: e.target.value }))} />
                        <FormInput label="Travel Time" value={formState.travel_time_display} onChange={(e) => setFormState((p) => ({ ...p, travel_time_display: e.target.value }))} />
                    </div>
                    {formState.moving_labor_mode === 'hourly' ? (
                        <FormInput label="Minimum Time" value={formState.minimum_time_display} onChange={(e) => setFormState((p) => ({ ...p, minimum_time_display: e.target.value }))} />
                    ) : null}
                </ChargeFormSection>
            );
        }
        if (category === 'packing') {
            const presetKey = formState.category_preset_key;
            return (
                <ChargeFormSection title="Packing Pricing" description="">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormInput
                            label="Preset"
                            as="select"
                            value={formState.category_preset_key}
                            onChange={(e) => setFormState((p) => ({ ...p, category_preset_key: e.target.value }))}
                        >
                            {(getCategoryFormSchemaFromCatalog(category, catalogItems)?.presets || []).map((p) => (
                                <option key={p.key} value={p.key}>{p.label}</option>
                            ))}
                        </FormInput>
                        {presetKey === 'hourly_labor' && (
                            <>
                                <FormInput label="Packers" type="number" value={formState.crew} onChange={(e) => setFormState((p) => ({ ...p, crew: e.target.value }))} />
                                <FormInput label="Hours" type="number" value={formState.quantity} onChange={(e) => setFormState((p) => ({ ...p, quantity: e.target.value }))} />
                                <FormInput label="Hourly Rate" type="number" value={formState.unit_price} onChange={(e) => setFormState((p) => ({ ...p, unit_price: e.target.value }))} />
                            </>
                        )}
                        {presetKey === 'flat_plus_hourly' && (
                            <>
                                <FormInput label="Flat Rate" type="number" value={formState.flat_rate} onChange={(e) => setFormState((p) => ({ ...p, flat_rate: e.target.value }))} />
                                <FormInput label="Included Hours" type="number" value={formState.included_hours} onChange={(e) => setFormState((p) => ({ ...p, included_hours: e.target.value }))} />
                                <FormInput label="Additional Hourly Rate" type="number" value={formState.additional_hourly_rate} onChange={(e) => setFormState((p) => ({ ...p, additional_hourly_rate: e.target.value }))} />
                                <FormInput label="Packers" type="number" value={formState.crew} onChange={(e) => setFormState((p) => ({ ...p, crew: e.target.value }))} />
                            </>
                        )}
                        {presetKey === 'by_container' && (
                            <>
                                <FormInput label="Containers" type="number" value={formState.quantity} onChange={(e) => setFormState((p) => ({ ...p, quantity: e.target.value }))} />
                                <FormInput label="Price per Container" type="number" value={formState.unit_price} onChange={(e) => setFormState((p) => ({ ...p, unit_price: e.target.value }))} />
                            </>
                        )}
                        {presetKey === 'by_cwt' && (
                            <>
                                <FormInput label="Weight (lbs)" type="number" value={formState.weight} onChange={(e) => setFormState((p) => ({ ...p, weight: e.target.value }))} />
                                <FormInput label="Price per Cwt" type="number" value={formState.unit_price} onChange={(e) => setFormState((p) => ({ ...p, unit_price: e.target.value }))} />
                            </>
                        )}
                    </div>
                </ChargeFormSection>
            );
        }
        if (category === 'additional_lbs') {
            return (
                <ChargeFormSection title="Additional Lbs Pricing" description="">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormInput
                            label="Additional lbs"
                            type="number"
                            min="0"
                            value={formState.quantity}
                            onChange={(e) => setFormState((p) => ({ ...p, quantity: e.target.value }))}
                            placeholder="0"
                        />
                        <FormInput
                            label="Rate per lb"
                            type="number"
                            min="0"
                            value={formState.unit_price}
                            onChange={(e) => setFormState((p) => ({ ...p, unit_price: e.target.value }))}
                            placeholder="0.00"
                        />
                    </div>
                </ChargeFormSection>
            );
        }
        if (category === 'transportation' || category === 'trip_and_travel' || category === 'additional_services') {
            return (
                <ChargeFormSection title="Charge Formula" description="">
                    {renderPresetDrivenCategoryForm(formState, setFormState)}
                </ChargeFormSection>
            );
        }
        return (
            <ChargeFormSection title="Simple Pricing" description="">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormInput label="Quantity" type="number" value={formState.quantity} onChange={(e) => setFormState((p) => ({ ...p, quantity: e.target.value }))} />
                    <FormInput label="Rate" type="number" value={formState.unit_price} onChange={(e) => setFormState((p) => ({ ...p, unit_price: e.target.value }))} />
                </div>
            </ChargeFormSection>
        );
    };

    const handleDeleteCharge = async (chargeId) => {
        if (!chargeId) return;
        if (!ensureEstimateEditable()) return;
        setSaving(true);
        try {
            const row = lineItems.find((r) => String(r.id) === String(chargeId));
            const subDiscounts = row?.subCharges || [];
            await deleteEstimateCharge(chargeId);
            for (const d of subDiscounts) {
                try {
                    await deleteEstimateCharge(d.id);
                } catch (subErr) {
                    console.error('Failed to remove sub-charge discount:', subErr);
                }
            }
            if (estimate?.id) {
                const recalced = await recalculateEstimate(estimate.id);
                setEstimate(recalced);
                syncManual(recalced);
            }
            if (editingChargeId === chargeId) {
                cancelEditingCharge();
            }
            setToast({ type: 'success', text: 'Charge removed.' });
        } catch {
            setToast({ type: 'error', text: 'Failed to remove charge.' });
        } finally {
            setSaving(false);
        }
    };

    const handleInventoryRequest = async () => {
        if (!estimate?.id) return;
        if (!ensureEstimateEditable()) return;
        setSaving(true);
        try {
            const response = await requestEstimateInventory(estimate.id, {
                portal_base_url: getPortalBaseUrl(),
                send_email: true,
            });
            setInventoryLink(response.inventory_link || '');
            await loadEstimate();
            setToast({ type: 'success', text: response?.emailed ? 'Inventory request emailed.' : 'Inventory request prepared.' });
        } catch {
            setToast({ type: 'error', text: 'Failed to prepare inventory request.' });
        } finally {
            setSaving(false);
        }
    };

    const openInventoryRequestModal = () => {
        const customer = getOpportunityCustomer();
        const defaultEmail = availableEmails[0]?.value || customer?.email || '';
        const defaultPhone = availablePhones[0]?.value || customer?.phone || '';
        setInventoryRequestSendEmail(true);
        setInventoryRequestSendSMS(false);
        setInventoryRequestToEmail(defaultEmail);
        setInventoryRequestToPhone(defaultPhone);
        setInventoryRequestIsCustomEmail(!defaultEmail);
        setInventoryRequestIsCustomPhone(!defaultPhone);
        setIsInventoryRequestModalOpen(true);
    };

    const handleConfirmInventoryRequest = async () => {
        if (!estimate?.id) return;
        if (!ensureEstimateEditable()) return;

        const channels = [];
        if (inventoryRequestSendEmail) channels.push('email');
        if (inventoryRequestSendSMS) channels.push('sms');

        if (!channels.length) {
            setToast({ type: 'error', text: 'Please select at least one delivery channel (Email or SMS).' });
            return;
        }
        if (inventoryRequestSendEmail && !String(inventoryRequestToEmail || '').trim()) {
            setToast({ type: 'error', text: 'Please select or enter a recipient email address.' });
            return;
        }
        if (inventoryRequestSendSMS && !String(inventoryRequestToPhone || '').trim()) {
            setToast({ type: 'error', text: 'Please select or enter a recipient phone number.' });
            return;
        }

        setSaving(true);
        setIsInventoryRequestModalOpen(false);
        setSaving(false);

        (async () => {
            try {
                const response = await requestEstimateInventory(estimate.id, {
                    portal_base_url: getPortalBaseUrl(),
                    send_email: inventoryRequestSendEmail,
                    send_sms: inventoryRequestSendSMS,
                    to_email: inventoryRequestSendEmail ? inventoryRequestToEmail : undefined,
                    to_phone: inventoryRequestSendSMS ? inventoryRequestToPhone : undefined,
                    dispatch_via_automation: true,
                });
                setInventoryLink(response.inventory_link || '');
                await loadEstimate();
                setToast({
                    type: 'success',
                    text: response?.emailed ? 'Inventory request emailed.' : 'Inventory request prepared.',
                });
            } catch (err) {
                setToast({ type: 'error', text: getErrorMessage(err, 'Failed to prepare inventory request.') });
            }
        })();
    };

    const handleToggleInventoryPortalLock = async () => {
        if (!estimate?.id) return;
        setSaving(true);
        try {
            const row = await updateEstimate(estimate.id, {
                inventory_portal_locked_at: estimate?.inventory_portal_locked_at ? null : new Date().toISOString(),
            });
            setEstimate(row);
            syncManual(row);
            setToast({
                type: 'success',
                text: row?.inventory_portal_locked_at ? 'Inventory portal locked.' : 'Inventory portal unlocked.',
            });
        } catch {
            setToast({ type: 'error', text: 'Failed to update inventory portal lock state.' });
        } finally {
            setSaving(false);
        }
    };

    const handleAddInventoryItem = async () => {
        if (!inventoryItemForm.item_name.trim()) return;
        setSaving(true);
        try {
            const updatedItems = [
                ...portalItems.map(item => ({
                    room_name: item.room_name,
                    item_name: item.item_name,
                    quantity: item.quantity,
                    weight_lbs_each: item.weight_lbs_each,
                    notes: item.notes || '',
                    is_fragile: item.is_fragile || false,
                    is_special: item.is_special || false,
                })),
                {
                    room_name: inventoryItemForm.room_name || 'General',
                    item_name: inventoryItemForm.item_name,
                    quantity: parseInt(inventoryItemForm.quantity || 1),
                    weight_lbs_each: parseFloat(inventoryItemForm.weight_lbs_each || 0),
                    notes: inventoryItemForm.notes || '',
                    is_fragile: !!inventoryItemForm.is_fragile,
                    is_special: !!inventoryItemForm.is_special,
                }
            ];

            await updateEstimatePortalInventory(estimate.id, { items: updatedItems });
            await Promise.allSettled([
                loadEstimate(true),
                loadEstimatePortalItems(estimate.id, { silent: true }),
            ]);
            setIsAddInventoryItemModalOpen(false);
            setInventoryItemForm(blankInventoryItem);
            if (onRefresh) onRefresh();
            setToast({ type: 'success', text: 'Inventory item added successfully.' });
        } catch (err) {
            setToast({ type: 'error', text: getErrorMessage(err, 'Failed to add inventory item.') });
        } finally {
            setSaving(false);
        }
    };

    const handleUploadInventoryPhoto = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const estimateId = estimate?.id;
            const opportunityId = estimate?.opportunity?.id || estimate?.opportunity_id || opportunity?.id;
            if (!estimateId && !opportunityId) return;
            
            setSaving(true);
            try {
                const uploaded = await uploadFile({
                    target_type: estimateId ? 'estimates.estimate' : 'sales.opportunity',
                    target_id: estimateId || opportunityId,
                    category: 'descriptive-inventory',
                    file,
                });
                if (uploaded?.id) {
                    setInventoryPhotos((prev) => {
                        const next = (prev || []).filter((photo) => String(photo.id) !== String(uploaded.id));
                        next.unshift({
                            ...uploaded,
                            file_url: uploaded.file || uploaded.file_url || uploaded.url || '',
                            original_filename: uploaded.original_filename || file.name,
                        });
                        return next;
                    });
                }
                await loadInventoryPhotos(true);
                setToast({ type: 'success', text: 'Inventory photo uploaded successfully.' });
            } catch (err) {
                setToast({ type: 'error', text: getErrorMessage(err, 'Failed to upload inventory photo.') });
            } finally {
                setSaving(false);
            }
        };
        input.click();
    };

    const handleEstimatePortalRequest = async () => {
        if (!estimate?.id) return;
        const flushed = await flushPendingEstimateEditsForPortal();
        if (!flushed) return;
        setSaving(true);
        try {
            const response = await requestEstimatePortal(estimate.id, buildEstimatePortalRequestPayload());
            setEstimatePortalLink(response.estimate_portal_link || '');
            setInventoryLink((prev) => response.inventory_link || prev || '');
            setToast({ type: 'success', text: 'Estimate portal link prepared.' });
        } catch (err) {
            const msg = getErrorMessage(err, 'Failed to prepare estimate portal link.');
            setToast({ type: 'error', text: msg });
        } finally {
            setSaving(false);
        }
    };

    const handleViewPortalWithTemplate = async () => {
        if (!estimate?.id) return;
        cancelPendingEstimateAutosaves();
        setSaving(true);
        try {
            const response = estimatePortalLink
                ? { estimate_portal_link: estimatePortalLink, inventory_link: inventoryLink }
                : await requestEstimatePortal(estimate.id, buildEstimatePortalRequestPayload());
            setEstimatePortalLink(response.estimate_portal_link || '');
            setInventoryLink((prev) => response.inventory_link || prev || '');
            setIsPortalSelectModalOpen(false);
            if (response.estimate_portal_link) {
                window.open(response.estimate_portal_link, '_blank');
            } else {
                setToast({ type: 'error', text: 'No portal link returned.' });
            }
        } catch (err) {
            const msg = getErrorMessage(err, 'Failed to prepare estimate portal link.');
            setToast({ type: 'error', text: msg });
        } finally {
            setSaving(false);
        }
    };

    const handleMarkReviewed = async () => {
        if (!estimate?.id) return;
        if (!ensureEstimateEditable()) return;
        setSaving(true);
        try {
            const row = await markEstimateInventoryReviewed(estimate.id);
            setEstimate(row);
            syncManual(row);
            setToast({ type: 'success', text: 'Inventory marked as reviewed.' });
        } catch {
            setToast({ type: 'error', text: 'Failed to update inventory review state.' });
        } finally {
            setSaving(false);
        }
    };

    const copyInventoryLink = async () => {
        if (!inventoryLink) return;
        try {
            await navigator.clipboard.writeText(inventoryLink);
            setToast({ type: 'success', text: 'Inventory link copied.' });
        } catch {
            setToast({ type: 'error', text: 'Could not copy inventory link.' });
        }
    };

    const copyEstimatePortalLink = async () => {
        if (!estimatePortalLink) return;
        try {
            await navigator.clipboard.writeText(estimatePortalLink);
            setToast({ type: 'success', text: 'Estimate portal link copied.' });
        } catch {
            setToast({ type: 'error', text: 'Could not copy estimate portal link.' });
        }
    };

    const toggleMapType = () => {
        setMapTypeId((prev) => (prev === 'roadmap' ? 'satellite' : 'roadmap'));
    };

    const recenterRouteMap = () => {
        const map = mapRef.current;
        const maps = window.google?.maps;
        if (!map || !maps) return;

        try {
            if (routeMode === 'legacy_directions') {
                const directions = directionsRendererRef.current?.getDirections?.();
                const bounds = directions?.routes?.[0]?.bounds;
                if (bounds) {
                    map.fitBounds(bounds);
                    return;
                }
            }

            const points = routePathPoints.length ? routePathPoints : fallbackStopPoints;
            const validPoints = points.filter((pt) => Number.isFinite(pt?.lat) && Number.isFinite(pt?.lng));
            if (validPoints.length >= 2) {
                const bounds = new maps.LatLngBounds();
                validPoints.forEach((pt) => bounds.extend({ lat: pt.lat, lng: pt.lng }));
                if (!bounds.isEmpty?.()) {
                    map.fitBounds(bounds);
                    return;
                }
            }

            if (validPoints.length === 1) {
                map.setCenter({ lat: validPoints[0].lat, lng: validPoints[0].lng });
                map.setZoom(14);
            }
        } catch {
            // ignore
        }
    };

    const openRouteInGoogleMaps = () => {
        const validStops = routeStops
            .map((stop) => String(stop?.address || '').trim())
            .filter(Boolean);
        if (validStops.length < 2) {
            setToast({ type: 'error', text: 'Add at least an origin and destination to open Google Maps.' });
            return;
        }

        const origin = encodeURIComponent(validStops[0]);
        const destination = encodeURIComponent(validStops[validStops.length - 1]);
        const waypoints = validStops.slice(1, -1).map((stop) => encodeURIComponent(stop)).join('|');
        const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving${waypoints ? `&waypoints=${waypoints}` : ''}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const normalizeRouteStop = (stop) => ({
        id: stop?.id,
        type: stop?.stop_type || stop?.type || 'stop',
        address: formatAddressForDisplay(stop?.address_details),
        details: stop?.address_details || {},
        notes: stop?.notes || '',
        sort_order: stop?.sort_order ?? 0,
    });

    const openRouteStopEditor = (stop) => {
        setEstimateActiveTab('route');
        if (onSubTabChange) {
            onSubTabChange('route');
        }
        setEditingStopData(stop);
        setIsEditStopModalOpen(true);
    };

    const addRouteStop = (position = 'middle') => {
        if (routeStops.length < 2) return;
        const stopType = position === 'before_origin'
            ? 'pre_stop'
            : position === 'after_destination'
                ? 'post_stop'
                : 'stop';
        const draftStop = {
            id: `temp-stop-${createStopId()}`,
            type: stopType,
            address: '',
            details: {},
            notes: '',
            sort_order: routeStops.filter((stop) => stop.type === stopType).length,
            isDraft: true,
        };
        setRouteStops((prev) => {
            if (prev.length < 2) return prev;
            const next = [...prev];
            if (position === 'before_origin') {
                next.splice(0, 0, draftStop);
            } else if (position === 'after_destination') {
                next.splice(next.length, 0, draftStop);
            } else {
                const destinationIndex = next.findIndex((stop) => stop.type === 'destination');
                const insertIndex = destinationIndex >= 0 ? destinationIndex : next.length;
                next.splice(insertIndex, 0, draftStop);
            }
            return next;
        });
        openRouteStopEditor(draftStop);
    };

    const normalizeStopTypes = (stops) => {
        if (!Array.isArray(stops) || stops.length < 2) return stops;
        return stops.map((stop) => ({
            ...stop,
            type: stop?.type || 'stop',
        }));
    };

    const updateRouteStopAddress = (id, address) => {
        setRouteStops((prev) => prev.map((stop) => (stop.id === id ? { ...stop, address } : stop)));
    };

    const saveRouteStops = async (newStops) => {
        if (!opportunity) return;
        setSaving(true);
        try {
            // Find the origin and destination stops in the new array.
            const originIndex = newStops.findIndex((s) => s.id === 'origin' || s.type === 'origin');
            const destinationIndex = newStops.findIndex((s) => s.id === 'destination' || s.type === 'destination');
            
            if (originIndex === -1 || destinationIndex === -1) {
                throw new Error("Missing origin or destination stop.");
            }

            let finalOriginIndex = originIndex;
            let finalDestinationIndex = destinationIndex;
            let finalStops = [...newStops];

            // If the origin is placed after the destination, swap their roles
            if (originIndex > destinationIndex) {
                finalOriginIndex = destinationIndex;
                finalDestinationIndex = originIndex;
                
                const orig = finalStops[originIndex];
                const dest = finalStops[destinationIndex];
                
                finalStops[originIndex] = { ...orig, id: 'destination', type: 'destination' };
                finalStops[destinationIndex] = { ...dest, id: 'origin', type: 'origin' };
            }

            const newOriginStop = finalStops[finalOriginIndex];
            const newDestinationStop = finalStops[finalDestinationIndex];

            // Prepare address fields helper
            const getAddressFields = (stop) => {
                const d = stop.details || {};
                let city = String(d.city || '').trim();
                let state = String(d.state || '').trim();
                let postal_code = String(d.postal_code || d.zip_code || '').trim();

                if (!city || !state || !postal_code) {
                    const parsed = parseAddressString(stop.address);
                    if (!city) city = parsed.city;
                    if (!state) state = parsed.state;
                    if (!postal_code) postal_code = parsed.postal_code;
                }

                const originDetails = opportunity.origin_address_details || {};
                const destinationDetails = opportunity.destination_address_details || {};
                
                if (!city) city = originDetails.city || destinationDetails.city || 'TBD';
                if (!state) state = originDetails.state || destinationDetails.state || 'TBD';
                if (!postal_code) postal_code = originDetails.zip_code || originDetails.postal_code || destinationDetails.zip_code || destinationDetails.postal_code || 'TBD';

                return {
                    address_line1: stop.address || '',
                    city: city,
                    state: state,
                    postal_code: postal_code,
                    unit_number: d.unit_number || '',
                    property_type: d.property_type || '',
                    parking_type: d.parking_type || '',
                    flights_of_stairs: Number.isFinite(Number(d.flights_of_stairs)) ? Number(d.flights_of_stairs) : 0,
                    has_elevator: !!d.has_elevator,
                    walk_distance_ft: Number.isFinite(Number(d.walk_distance_ft)) ? Number(d.walk_distance_ft) : 0,
                };
            };

            const oppPayload = {};
            const originFields = getAddressFields(newOriginStop);
            Object.entries(originFields).forEach(([key, val]) => {
                oppPayload[`origin_${key}`] = val;
            });
            const destFields = getAddressFields(newDestinationStop);
            Object.entries(destFields).forEach(([key, val]) => {
                oppPayload[`destination_${key}`] = val;
            });

            // Find database stop IDs that have been dragged into the origin or destination roles.
            // These database stops must be deleted, since their address is now saved in the Opportunity table directly.
            const stopsToDelete = [];
            const isDatabaseStopId = (id) => {
                if (id === 'origin' || id === 'destination') return false;
                if (typeof id === 'string' && id.startsWith('temp-')) return false;
                return id !== undefined && id !== null;
            };

            if (isDatabaseStopId(newOriginStop.id)) {
                stopsToDelete.push(newOriginStop.id);
            }
            if (isDatabaseStopId(newDestinationStop.id)) {
                stopsToDelete.push(newDestinationStop.id);
            }

            // Update Opportunity / Lead
            if (sourceType === 'lead') {
                await updateLead(opportunity.id, oppPayload);
            } else {
                await updateOpportunity(opportunity.id, oppPayload);
            }

            // Delete database stops that have taken on the origin/destination role
            for (const stopId of stopsToDelete) {
                await deleteOpportunityStop(stopId);
            }

            // Process all intermediate, pre-stops, and post-stops
            for (let i = 0; i < finalStops.length; i++) {
                if (i === finalOriginIndex || i === finalDestinationIndex) continue;

                const s = finalStops[i];
                const type = i < finalOriginIndex ? 'pre_stop' : i > finalDestinationIndex ? 'post_stop' : 'stop';
                const sort_order = i;

                if (isDatabaseStopId(s.id)) {
                    // Update existing database stop's type and sort order
                    await updateOpportunityStop(s.id, {
                        stop_type: type,
                        sort_order: sort_order,
                    });
                } else {
                    // Create a new database stop (either it was previously origin/destination, or a temp draft stop)
                    const stopFields = getAddressFields(s);
                    const stopPayload = {
                        opportunity: opportunity.id,
                        address_line1: stopFields.address_line1,
                        city: stopFields.city,
                        state: stopFields.state,
                        postal_code: stopFields.postal_code,
                        unit_number: stopFields.unit_number,
                        property_type: stopFields.property_type,
                        parking_type: stopFields.parking_type,
                        flights_of_stairs: stopFields.flights_of_stairs,
                        has_elevator: stopFields.has_elevator,
                        walk_distance_ft: stopFields.walk_distance_ft,
                        stop_type: type,
                        notes: s.notes || '',
                        sort_order: sort_order,
                    };
                    await createOpportunityStop(stopPayload);
                }
            }

            setToast({ type: 'success', text: 'Route stops reordered successfully.' });
            if (onRefresh) onRefresh();
        } catch (err) {
            setToast({ type: 'error', text: 'Failed to save reordered route stops.' });
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const reorderRouteStops = async (fromIndex, toIndex) => {
        if (fromIndex === toIndex) return;
        if (!Array.isArray(routeStops) || routeStops.length < 2) return;
        if (fromIndex < 0 || fromIndex >= routeStops.length) return;
        if (toIndex < 0 || toIndex >= routeStops.length) return;

        const next = [...routeStops];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);

        // Optimistically update the UI
        setRouteStops(next);
        await saveRouteStops(next);
    };

    const moveRouteStop = async (index, direction) => {
        if (!Array.isArray(routeStops) || routeStops.length < 2) return;
        const target = index + direction;
        if (target < 0 || target >= routeStops.length) return;

        const next = [...routeStops];
        const tmp = next[index];
        next[index] = next[target];
        next[target] = tmp;

        // Optimistically update the UI
        setRouteStops(next);
        await saveRouteStops(next);
    };

    const removeRouteStop = async (index) => {
        if (!Array.isArray(routeStops) || routeStops.length <= 2) return;
        if (index < 0 || index >= routeStops.length) return;

        const stopToRemove = routeStops[index];
        if (stopToRemove?.type === 'origin' || stopToRemove?.type === 'destination') return;

        const next = routeStops.filter((_, idx) => idx !== index);
        setRouteStops(next);

        const isDatabaseStopId = (id) => {
            if (id === 'origin' || id === 'destination') return false;
            if (typeof id === 'string' && id.startsWith('temp-')) return false;
            return id !== undefined && id !== null;
        };

        if (isDatabaseStopId(stopToRemove.id)) {
            setSaving(true);
            try {
                await deleteOpportunityStop(stopToRemove.id);
                setToast({ type: 'success', text: 'Stop deleted successfully.' });
                if (onRefresh) onRefresh();
            } catch (err) {
                setToast({ type: 'error', text: 'Failed to delete stop.' });
                console.error(err);
            } finally {
                setSaving(false);
            }
        }
    };

    const closeEditStopModal = () => {
        if (editingStopData?.isDraft) {
            setRouteStops((prev) => prev.filter((stop) => stop.id !== editingStopData.id));
        }
        setEditingStopData(null);
        setIsEditStopModalOpen(false);
    };

    const calculateRoute = async () => {
        setRouteError('');
        setRouteProviderNotice('');
        if (!mapsReady || !window.google?.maps) {
            setRouteError('Google Maps is not ready yet.');
            return;
        }
        const validStops = routeStops.map((s) => ({ ...s, address: String(s.address || '').trim() })).filter((s) => s.address);
        if (validStops.length < 2) {
            setRouteError('Add at least origin and destination addresses.');
            return;
        }

        setRouteLoading(true);
        try {
            // Preferred for draggable routing: legacy DirectionsService (still supported, but considered legacy by Google).
            try {
                const origin = validStops[0].address;
                const destination = validStops[validStops.length - 1].address;
                const waypoints = validStops.slice(1, -1).map((stop) => ({ location: stop.address, stopover: true }));
                // Prefer bootstrap library access for DirectionsService to avoid constructor timing issues.
                const { DirectionsService } = (await window.google.maps.importLibrary('routes')) || {};
                const directionsService = DirectionsService ? new DirectionsService() : new window.google.maps.DirectionsService();
                const directionsResult = await directionsService.route({
                    origin,
                    destination,
                    waypoints,
                    optimizeWaypoints: false,
                    travelMode: window.google.maps.TravelMode.DRIVING,
                });

                setRouteMode('legacy_directions');
                setRoutePathPoints([]);
                setFallbackStopPoints([]);
                setRouteProviderNotice('');
                enableDraggableDirections(directionsResult);
                applyDirectionsResult(directionsResult);
                return;
            } catch (legacyErr) {
                const legacyMsg = legacyErr?.message || legacyErr?.toString?.() || '';
                // If legacy directions isn't enabled, fall through to Routes API.
                if (legacyMsg.includes('REQUEST_DENIED') || legacyMsg.includes('not enabled') || legacyMsg.includes('legacy')) {
                    setRouteProviderNotice('Directions API was denied/disabled for this API key. Falling back to Routes API / estimates.');
                } else {
                    throw legacyErr;
                }
            }

            // Geocode once and reuse coordinates for both computeRoutes and fallback mode.
            const geocoder = new window.google.maps.Geocoder();
            const geocodedStops = [];
            for (const stop of validStops) {
                const result = await geocoder.geocode({ address: stop.address });
                const first = result?.results?.[0];
                const location = first?.geometry?.location;
                if (!location) throw new Error('Could not geocode one or more stops.');
                geocodedStops.push({
                    address: first.formatted_address || stop.address,
                    lat: location.lat(),
                    lng: location.lng(),
                });
            }

            // Attempt to compute the actual road route via Routes API.
            const { Route } = await window.google.maps.importLibrary('routes');
            const origin = { lat: geocodedStops[0].lat, lng: geocodedStops[0].lng };
            const destination = { lat: geocodedStops[geocodedStops.length - 1].lat, lng: geocodedStops[geocodedStops.length - 1].lng };
            const intermediates = geocodedStops.slice(1, -1).map((stop) => ({ location: { lat: stop.lat, lng: stop.lng } }));

            const request = {
                origin,
                destination,
                travelMode: 'DRIVING',
                ...(intermediates.length ? { intermediates } : {}),
                fields: ['path', 'distanceMeters', 'durationMillis', 'legs', 'legs.distanceMeters', 'legs.durationMillis'],
            };

            const { routes } = await Route.computeRoutes(request);
            const primary = routes?.[0];
            if (!primary?.path?.length) throw new Error('No route returned.');

            const totalMeters =
                Number(primary.distanceMeters || 0) || (primary.legs || []).reduce((sum, leg) => sum + Number(leg?.distanceMeters || 0), 0);
            const totalMillis =
                Number(primary.durationMillis || 0) || (primary.legs || []).reduce((sum, leg) => sum + Number(leg?.durationMillis || 0), 0);

            const distanceMiles = totalMeters * 0.000621371;
            const durationMinutes = totalMillis / 60000;
            const nextRouteSummary = { distanceMiles, durationMinutes };
            const nextRoutePathPoints = primary.path.map((pt) => ({ lat: pt.lat, lng: pt.lng }));

            setRouteSummary(nextRouteSummary);
            setRoutePathPoints(nextRoutePathPoints);
            setFallbackStopPoints([]);
            setRouteMode('routes_api');

            const stopAddresses = geocodedStops.map((s) => s.address);
            const legs = primary.legs || [];
            const nextRouteLegs = legs.map((leg, idx) => {
                    const from = stopAddresses[idx] || `Stop ${idx}`;
                    const to = stopAddresses[idx + 1] || `Stop ${idx + 1}`;
                    const legMiles = Number(leg?.distanceMeters || 0) * 0.000621371;
                    const legMinutes = Number(leg?.durationMillis || 0) / 60000;
                    return {
                        id: `route-${idx}-${from}-${to}`,
                        from,
                        to,
                        distanceText: legMiles ? `${formatDistanceKm(legMiles)} km` : '-',
                        durationText: legMinutes ? formatDurationHoursMinutes(legMinutes) : '-',
                    };
                });
            setRouteLegs(nextRouteLegs);
            await persistRouteCache({
                nextRouteSummary,
                nextRouteLegs,
                nextRoutePathPoints,
                nextFallbackStopPoints: [],
                nextRouteMode: 'routes_api',
            });
        } catch (err) {
            // Fallback mode: geocode stops and compute straight-line estimates.
            try {
                const geocoder = new window.google.maps.Geocoder();
                const geocodedStops = [];
                for (const stop of validStops) {
                    const result = await geocoder.geocode({ address: stop.address });
                    const first = result?.results?.[0];
                    const location = first?.geometry?.location;
                    if (!location) throw new Error('Could not geocode one or more stops.');
                    geocodedStops.push({
                        address: first.formatted_address || stop.address,
                        lat: location.lat(),
                        lng: location.lng(),
                    });
                }

                const legs = [];
                let totalMiles = 0;
                let totalMinutes = 0;
                const averageMph = 30;

                for (let i = 0; i < geocodedStops.length - 1; i += 1) {
                    const from = geocodedStops[i];
                    const to = geocodedStops[i + 1];
                    const miles = haversineMiles(from.lat, from.lng, to.lat, to.lng);
                    const minutes = (miles / averageMph) * 60;
                    totalMiles += miles;
                    totalMinutes += minutes;
                    legs.push({
                        id: `fallback-${i}-${from.address}-${to.address}`,
                        from: from.address,
                        to: to.address,
                        distanceText: `${formatDistanceKm(miles)} km (est.)`,
                        durationText: `${formatDurationHoursMinutes(minutes)} (est.)`,
                    });
                }

                const nextRouteSummary = { distanceMiles: totalMiles, durationMinutes: totalMinutes };
                setRouteSummary(nextRouteSummary);
                setRouteLegs(legs);
                setRouteError('Showing an estimated straight-line route. Enable Directions API (for draggable routes) or Routes API (for road-following routes) to display the actual road route.');
                setRoutePathPoints([]);
                setFallbackStopPoints(geocodedStops);
                setRouteMode('fallback');
                if (!routeProviderNotice) {
                    setRouteProviderNotice('Using estimate because the road-route API request was denied or unavailable.');
                }
                await persistRouteCache({
                    nextRouteSummary,
                    nextRouteLegs: legs,
                    nextRoutePathPoints: [],
                    nextFallbackStopPoints: geocodedStops,
                    nextRouteMode: 'fallback',
                });
            } catch {
                const msg = err?.message || '';
                if (msg.includes('REQUEST_DENIED') || msg.includes('not enabled') || msg.includes('legacy')) {
                    setRouteError('Routes API request was denied. Enable the Routes API for your Google Cloud project and ensure billing + key restrictions are correct.');
                } else {
                    setRouteError('Unable to calculate route right now. Check stop addresses and API permissions.');
                }
                setRouteLegs([]);
                setRouteSummary({ distanceMiles: 0, durationMinutes: 0 });
                setRoutePathPoints([]);
                setFallbackStopPoints([]);
                setRouteMode('none');
            }
        } finally {
            setRouteLoading(false);
        }
    };

    const handlePricingModeChange = (nextMode) => {
        setManual((prev) => ({
            ...prev,
            pricing_mode: nextMode,
            ...(nextMode === 'hourly' ? { flat_rate_amount: prev.flat_rate_amount || '0' } : {}),
            ...(nextMode === 'flat' ? { estimated_hours: prev.estimated_hours || '0', travel_time_hours: prev.travel_time_hours || '0', hourly_rate: prev.hourly_rate || '0' } : {}),
        }));
        setDetailErrors((prev) => {
            if (!prev || !Object.keys(prev).length) return prev;
            const next = { ...prev };
            delete next.pricing_mode;
            delete next.hourly_rate;
            delete next.flat_rate_amount;
            return next;
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center rounded-3xl border border-border/60 bg-card p-16 text-black">
                <Loader2 className="mr-3 animate-spin text-primary" size={20} />
                Loading estimate...
            </div>
        );
    }

    if (isLoadingLinkedOpportunity) {
        return (
            <div className="flex items-center justify-center rounded-3xl border border-border/60 bg-card p-16 text-black">
                <Loader2 className="mr-3 animate-spin text-primary" size={20} />
                Loading linked opportunity...
            </div>
        );
    }

    if (!estimate) {
        if (!opportunity?.id) {
            return (
                <Card className="text-center">
                    <div className="space-y-4">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-tint/40 text-primary">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-extrabold text-black">Estimate unavailable</h3>
                            <p className="mt-2 text-sm text-black">
                                {isLeadSource
                                    ? 'This lead has not been converted into an opportunity yet. Convert it first, then open the opportunity to create an estimate.'
                                    : 'No opportunity is loaded for this estimate workspace.'}
                            </p>
                        </div>
                    </div>
                </Card>
            );
        }

        return (
            <>
                {isEstimateRequirementsModalOpen && estimateRequirementsDraft ? (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/20 p-4">
                        <div className="w-full max-w-4xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
                            <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-950 px-6 py-4 text-white">
                                <div>
                                    <div className="text-[11px] font-black uppercase tracking-[0.24em] text-white/60">Estimate Requirements</div>
                                    <h3 className="text-lg font-black tracking-tight">Complete Required Fields</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeEstimateRequirementsModal}
                                    disabled={isSavingEstimateRequirements}
                                    className="rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                    aria-label="Close estimate requirements modal"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="max-h-[80vh] overflow-y-auto p-6 space-y-6">
                                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                                    <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Before Estimate Creation</div>
                                    <div className="mt-2 text-sm font-semibold text-amber-900">
                                        Fill the missing opportunity data below. The estimate will be created immediately after this save succeeds.
                                    </div>
                                    {getEstimateCreationRequirementGaps(estimateRequirementsDraft).length ? (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {getEstimateCreationRequirementGaps(estimateRequirementsDraft).map((label) => (
                                                <span
                                                    key={label}
                                                    className="inline-flex rounded-full border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-widest text-amber-700"
                                                >
                                                    {label}
                                                </span>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>

                                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                    <div className="space-y-4">
                                        <div className="text-sm font-black uppercase tracking-widest text-slate-400">Customer</div>
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <FormInput
                                                label="First Name"
                                                value={estimateRequirementsDraft.first_name || ''}
                                                onChange={(e) => setEstimateRequirementsDraft((prev) => ({ ...prev, first_name: e.target.value }))}
                                            />
                                            <FormInput
                                                label="Last Name"
                                                value={estimateRequirementsDraft.last_name || ''}
                                                onChange={(e) => setEstimateRequirementsDraft((prev) => ({ ...prev, last_name: e.target.value }))}
                                            />
                                            <FormInput
                                                label="Email"
                                                type="email"
                                                value={estimateRequirementsDraft.email || ''}
                                                onChange={(e) => setEstimateRequirementsDraft((prev) => ({ ...prev, email: e.target.value }))}
                                            />
                                            <FormInput
                                                label="Phone"
                                                value={estimateRequirementsDraft.phone || ''}
                                                onChange={(e) => setEstimateRequirementsDraft((prev) => ({ ...prev, phone: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="text-sm font-black uppercase tracking-widest text-slate-400">Move Details</div>
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <FormInput
                                                label="Move Date"
                                                type="date"
                                                value={estimateRequirementsDraft.move_date || ''}
                                                onChange={(e) => setEstimateRequirementsDraft((prev) => ({ ...prev, move_date: e.target.value }))}
                                            />
                                            <FormInput
                                                label="Branch"
                                                as="select"
                                                value={estimateRequirementsDraft.branch || ''}
                                                onChange={(e) => setEstimateRequirementsDraft((prev) => ({ ...prev, branch: e.target.value }))}
                                            >
                                                <option value="">Select branch...</option>
                                                {branches.map((branch) => (
                                                    <option key={branch.id} value={branch.id}>
                                                        {branch.name}
                                                    </option>
                                                ))}
                                            </FormInput>
                                            <FormInput
                                                label="Service Type"
                                                as="select"
                                                value={estimateRequirementsDraft.service_type || ''}
                                                onChange={(e) => setEstimateRequirementsDraft((prev) => ({ ...prev, service_type: e.target.value }))}
                                            >
                                                <option value="">Select service type...</option>
                                                <option value="moving">Moving</option>
                                                <option value="packing">Packing</option>
                                                <option value="moving_and_packing">Moving & Packing</option>
                                                <option value="load_only">Load Only</option>
                                                <option value="unload_only">Unload Only</option>
                                                <option value="commercial">Commercial</option>
                                                <option value="storage_inbound">Storage Inbound</option>
                                                <option value="storage_outbound">Storage Outbound</option>
                                                <option value="inner_house">Inner House</option>
                                                <option value="junk_removal">Junk Removal</option>
                                                <option value="labor_only">Labor Only</option>
                                            </FormInput>
                                            <FormInput
                                                label="Move Type"
                                                as="select"
                                                value={estimateRequirementsDraft.move_type || ''}
                                                onChange={(e) => setEstimateRequirementsDraft((prev) => ({ ...prev, move_type: e.target.value }))}
                                            >
                                                <option value="">Select move type...</option>
                                                <option value="local">Local</option>
                                                <option value="long_distance">Long Distance</option>
                                                <option value="interstate">Interstate</option>
                                            </FormInput>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="text-sm font-black uppercase tracking-widest text-slate-400">Route</div>
                                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Origin Address</label>
                                            <AddressAutocomplete
                                                country="ca,us"
                                                value={estimateRequirementsDraft.origin_street || ''}
                                                onChange={(e) => setEstimateRequirementsDraft((prev) => ({ ...prev, origin_street: e.target.value }))}
                                                onPick={(parts) =>
                                                    setEstimateRequirementsDraft((prev) => ({
                                                        ...prev,
                                                        origin_street: parts.formattedAddress ?? parts.street ?? prev.origin_street,
                                                        origin_city: parts.city || prev.origin_city,
                                                        origin_state: parts.province || prev.origin_state,
                                                        origin_zip: parts.postalCode || prev.origin_zip,
                                                    }))
                                                }
                                                className="w-full px-4 py-2.5 bg-subtle/50 border border-border/80 rounded-xl text-sm font-bold text-black focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-black/50"
                                                placeholder="123 Main St, City, State ZIP"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Destination Address</label>
                                            <AddressAutocomplete
                                                country="ca,us"
                                                value={estimateRequirementsDraft.destination_street || ''}
                                                onChange={(e) => setEstimateRequirementsDraft((prev) => ({ ...prev, destination_street: e.target.value }))}
                                                onPick={(parts) =>
                                                    setEstimateRequirementsDraft((prev) => ({
                                                        ...prev,
                                                        destination_street: parts.formattedAddress ?? parts.street ?? prev.destination_street,
                                                        destination_city: parts.city || prev.destination_city,
                                                        destination_state: parts.province || prev.destination_state,
                                                        destination_zip: parts.postalCode || prev.destination_zip,
                                                    }))
                                                }
                                                className="w-full px-4 py-2.5 bg-subtle/50 border border-border/80 rounded-xl text-sm font-bold text-black focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-black/50"
                                                placeholder="456 Destination Ave, City, State ZIP"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {estimateRequirementsError ? (
                                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                                        {estimateRequirementsError}
                                    </div>
                                ) : null}
                            </div>

                            <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
                                <div className="text-xs font-semibold text-slate-500">
                                    This saves the opportunity first, then creates the estimate.
                                </div>
                                <div className="flex items-center gap-2">
                                    <GhostBtn onClick={closeEstimateRequirementsModal} disabled={isSavingEstimateRequirements}>
                                        Cancel
                                    </GhostBtn>
                                    <PrimaryBtn onClick={handleSaveEstimateRequirementsAndCreate} loading={isSavingEstimateRequirements}>
                                        Save And Create Estimate
                                    </PrimaryBtn>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}

                <Card className="text-center">
                    <div className="space-y-4">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-tint/40 text-primary">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-extrabold text-black">Estimate</h3>
                            <p className="mt-2 text-sm text-black">Create the estimate to start using the new estimate workspace.</p>
                        </div>
                        <button
                            onClick={handleCreateEstimate}
                            disabled={saving || !opportunity?.id || opportunity.id === 'new'}
                            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-60"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                            Create Manual Estimate
                        </button>
                    </div>
                </Card>
            </>
        );
    }

    return (
        <div className="min-h-screen mt-0 bg-slate-50/50 p-0 font-sans text-slate-900 space-y-3">
            {toast.text ? (

                <div className="pointer-events-none fixed bottom-5 right-5 z-[100] max-w-[92vw] sm:max-w-md">
                    <div
                        className={`pointer-events-auto flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold shadow-lg ${toast.type === 'error' ? 'text-rose-700' : 'text-black'
                            }`}
                    >
                        <div className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-current opacity-80" />
                        <div className="min-w-0 flex-1 break-words">{toast.text}</div>
                        <button
                            type="button"
                            onClick={() => setToast({ type: '', text: '' })}
                            className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-black hover:bg-slate-100"
                            aria-label="Dismiss notification"
                        >
                            Close
                        </button>
                    </div>
                </div>
            ) : null}



    <SummaryBento
        totalVol={inventorySummary.totalVol || 0}
        totalQty={inventorySummary.totalQty || 0}
        zoneCount={inventorySummary.roomCount || 0}
        estWeight={inventorySummary.totalWeightLbs || 0}
        distance={routeSummary.distanceMiles > 0 ? (routeSummary.distanceMiles * 1.60934).toFixed(1) : "0.0"}
        duration={
            (() => {
                const totalMinutes = Math.max(0, Math.round(routeSummary.durationMinutes || 0));
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                if (!hours) return `${minutes} min`;
                if (!minutes) return `${hours} hr`;
                return `${hours} hr ${minutes} min`;
            })()
        }
        stopCount={routeStops.length}
        balance={paymentOverview.balanceDue}
        captured={paymentOverview.totalPaid}
    />



            <main className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {estimateActiveTab === 'charges' && (
                    <>
                    <ChargesTab
	                        charges={lineItems}
	                          subJobs={opportunityJobs}
                          selectedSubJob={opportunityJobs.find((job) => String(job?.id) === String(selectedSubJobId)) || null}
                          subJobServiceOptions={subJobServiceOptions}
                          selectedSubJobId={selectedSubJobId}
                          onSelectedSubJobChange={onSelectedSubJobChange}
                          onCreateSubJob={onCreateSubJob}
                          onRefreshSubJobs={onRefreshSubJobs}
                          onDeleteSelectedSubJob={async (jobId) => {
                              await onDeleteSelectedSubJob?.(jobId);
                              await loadEstimate(true);
                          }}
                          onUpdateSelectedSubJob={onUpdateSelectedSubJob}
	                        totals={calculations}
                        crewNotes={manual.special_items_notes}
                        customerNotes={manual.packing_notes}
                        internalNotes={manual.access_notes}
                        onCrewNotesChange={(val) => setManual(prev => ({ ...prev, special_items_notes: val }))}
                        onCustomerNotesChange={(val) => setManual(prev => ({ ...prev, packing_notes: val }))}
                        onInternalNotesChange={(val) => setManual(prev => ({ ...prev, access_notes: val }))}
                        onCrewNotesBlur={(val) => saveManualNotesOnly({ special_items_notes: val })}
                        onCustomerNotesBlur={(val) => saveManualNotesOnly({ packing_notes: val })}
                        onInternalNotesBlur={(val) => saveManualNotesOnly({ access_notes: val })}
			                        taxPctInput={manual.sales_tax_pct ?? ''}
			                        taxExempt={Boolean(manual.tax_exempt)}
			                        taxSaving={Boolean(saving)}
			                        onTaxPctChange={handleTaxPctChange}
			                        onTaxPctBlur={handleTaxPctBlur}
			                        onTaxExemptChange={handleTaxExemptToggle}
                        discountPresets={discountPresets}
                        selectedDiscountPresetId={selectedDiscountPresetId}
                        appliedDiscountPresets={appliedDiscountPresets}
                        onDiscountPresetChange={handleDiscountPresetChange}
                        onRemoveDiscount={handleRemoveDiscount}
                        discountInput={manual.discount_amount ?? ''}
			                        discountSaving={Boolean(saving)}
			                        onDiscountChange={handleDiscountChange}
			                        onDiscountBlur={handleDiscountBlur}
                                    onApplyCustomDiscount={handleApplyCustomDiscount}
		                        onSaveTaxes={() => {}}
                        onAddCharge={canModifyEstimate ? startAddingCharge : undefined}
                        onApplyPackage={canModifyEstimate ? () => setIsPackageModalOpen(true) : undefined}
                        onAddCatalogItem={canModifyEstimate ? () => setIsCatalogModalOpen(true) : undefined}
                        onEditCharge={canModifyEstimate ? startEditingCharge : undefined}
                        onDeleteCharge={canModifyEstimate ? handleDeleteCharge : undefined}
                        onReorderCharges={handleReorderCharges}
                        isLocked={isOpportunityLocked || estimateIsLocked}
                        canEditEstimate={canModifyEstimate}
                        onOpenJobScheduler={openJobSchedulerControls}
                        paymentsContent={(
                            <PaymentsPanel
                                opportunityId={opportunity?.id}
                                opportunityStatus={opportunity?.workflow_stage || opportunity?.status}
                                estimateId={estimate?.id}
                                estimateTotal={calculations.totalDue}
                                depositValue={manual.deposit_required_amount}
                                canAddManualPayment={Boolean(estimate?.id)}
                                onPaymentChange={async () => {
                                    await Promise.allSettled([
                                        loadPaymentsData(estimate?.id),
                                        loadManualPaymentContext()
                                    ]);
                                }}
                                onToast={setToast}
                            />
                        )}
                    />
                    </>
                )}
                {estimateActiveTab === 'payments' && (
                    <PaymentsPanel
                        opportunityId={opportunity?.id}
                        opportunityStatus={opportunity?.workflow_stage || opportunity?.status}
                        estimateId={estimate?.id}
                        estimateTotal={calculations.totalDue}
                        depositValue={manual.deposit_required_amount}
                        canAddManualPayment={Boolean(estimate?.id)}
                        onPaymentChange={async () => {
                            await Promise.allSettled([
                                loadPaymentsData(estimate?.id),
                                loadManualPaymentContext()
                            ]);
                        }}
                        onToast={setToast}
                    />
                )}
                {estimateActiveTab === 'route' && (
                    <RouteTab
                        stops={routeStops}
                        distance={(routeSummary.distanceMiles * 1.60934).toFixed(1)}
                        duration={
                            (() => {
                                const totalMinutes = Math.max(0, Math.round(routeSummary.durationMinutes || 0));
                                const hours = Math.floor(totalMinutes / 60);
                                const minutes = totalMinutes % 60;
                                if (!hours) return `${minutes} min`;
                                if (!minutes) return `${hours} hr`;
                                return `${hours} hr ${minutes} min`;
                            })()
                        }
                        onAddStop={canEditOpportunity ? addRouteStop : undefined}
                        onEditStop={(stop) => {
                            if (canEditOpportunity) openRouteStopEditor(stop);
                        }}
                        onDeleteStop={canEditOpportunity ? removeRouteStop : undefined}
                        onMoveStop={canEditOpportunity ? moveRouteStop : undefined}
                        onReorderStops={canEditOpportunity ? reorderRouteStops : undefined}
                        onOptimize={canEditOpportunity ? calculateRoute : undefined}
                        mapContainerRef={mapContainerRef}
                        mapTypeId={mapTypeId}
                        onToggleMapType={toggleMapType}
                        onRecenterMap={recenterRouteMap}
                        onOpenRouteInGoogle={openRouteInGoogleMaps}
                        isLocked={isOpportunityLocked}
                    />
                )}
                {estimateActiveTab === 'inventory' && (
                    <InventoryTab
                        items={selectedPortalItems.map(item => ({ name: item.item_name, quantity: item.quantity, room_name: item.room_name }))}
                        photos={inventoryPhotos}
                        inventoryPortalLockedAt={estimate?.inventory_portal_locked_at || null}
                        onAddItem={canEditOpportunity ? () => {
                            setInventoryItemForm(blankInventoryItem);
                            setIsAddInventoryItemModalOpen(true);
                        } : undefined}
                        onAddPhoto={canEditOpportunity ? handleUploadInventoryPhoto : undefined}
                        onRequestInventory={canCreateOpportunity ? openInventoryRequestModal : undefined}
                        onTogglePortalLock={canEditOpportunity ? handleToggleInventoryPortalLock : undefined}
                        isLocked={isOpportunityLocked}
                    />
                )}
                {estimateActiveTab === 'documents' && (
                    <div className="space-y-2">
                        <div className="rounded-3xl border border-slate-200 bg-white shadow-card">
                            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
                                <div className="min-w-0">
                                    <span className="label-eyebrow text-slate-400">Documents</span>
                                    <h3 className="mt-0.5 text-lg font-extrabold text-slate-900">Contracts & signatures</h3>
                                    <p className="mt-1 max-w-2xl text-sm text-slate-500">
                                        Active document templates appear here with their current sent and signed state.
                                        Send a document to create the customer signing link, then track progress in the same row.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {selectedDocKeys.length > 0 && (
                                        <PrimaryBtn icon="mail" onClick={handleOpenMultiSend} loading={isMultiSending}>
                                            Send {selectedDocKeys.length} Selected
                                        </PrimaryBtn>
                                    )}
                                    <GhostBtn icon="refresh-cw" onClick={loadDocuments} disabled={documentsLoading || hasActiveDocumentAction}>
                                        Refresh
                                    </GhostBtn>
                                </div>
                            </div>

                            {documentsError ? (
                                <div className="border-b border-rose-100 bg-rose-50 px-5 py-3 text-sm font-medium text-rose-700">
                                    {documentsError}
                                </div>
                            ) : null}

                            {documentsLoading && !documentRows.length ? (
                                <div className="space-y-3 p-5">
                                    {[0, 1, 2].map((idx) => (
                                        <div key={idx} className="h-24 animate-pulse rounded-2xl bg-slate-100/80" />
                                    ))}
                                </div>
                            ) : null}

                            {!documentsLoading && documentRows.length === 0 ? (
                                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                        <FileText size={24} />
                                    </div>
                                    <h4 className="mt-4 text-base font-bold text-slate-900">No active document templates</h4>
                                    <p className="mt-2 max-w-lg text-sm text-slate-500">
                                        Add a contract template in Settings → Documents → Templates, then come back here to send it to the customer.
                                    </p>
                                </div>
                            ) : null}

                            {documentSections.length ? (
                                <div className="divide-y divide-slate-100">
                                    {documentSections.map((section) => (
                                        <div key={section.key}>
                                            <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
                                                <button
                                                    type="button"
                                                    onClick={() => openJobSchedulerControls(section.jobId)}
                                                    className="text-left text-sm font-extrabold text-slate-900 hover:text-brand hover:underline"
                                                >
                                                    {section.title}
                                                </button>
                                                <p className="mt-1 text-xs font-medium text-slate-500">{section.description}</p>
                                            </div>
                                            <div className="divide-y divide-slate-100">
                                                {section.rows.map(renderDocumentRow)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </div>
                )}
            </main>

            <EditStopModal isOpen={isEditStopModalOpen} onClose={closeEditStopModal} stop={editingStopData} onSave={handleSaveStop} isSaving={saving} />

            {isJobSchedulerModalOpen && jobSchedulerTarget ? (
                <div className="fixed inset-0 z-[105] flex items-center justify-center p-4 bg-slate-900/25 animate-in fade-in duration-200">
                    <div className="relative flex w-full max-w-4xl max-h-[82vh] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
                            <div>
                                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Availability Scheduler</div>
                                <div className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                                    {jobSchedulerTarget?.sub_job_number
                                        ? `Job ${jobSchedulerTarget.sub_job_number}`
                                        : `Job ${jobSchedulerJobId || 'TBD'}`}
                                </div>
                                <div className="mt-2 text-sm font-medium text-slate-500">
                                    {jobSchedulerTarget?.title || jobSchedulerTarget?.service_type_label || jobSchedulerTarget?.service_type || 'Select a service date and arrival window'}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={closeJobSchedulerModal}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto border-b border-slate-200 px-6 py-5">
                            <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr] lg:items-end">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Service Date</label>
                                    <div className="flex items-center overflow-hidden rounded-2xl border border-[#cfdcf0] bg-white shadow-sm transition focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10">
                                        <input
                                            type="date"
                                            value={jobSchedulerDraft.move_date || ''}
                                            onChange={(e) => {
                                                const nextDate = e.target.value;
                                                setJobSchedulerDraft((prev) => ({ ...prev, move_date: nextDate }));
                                                if (nextDate) {
                                                    setJobSchedulerViewDate(nextDate);
                                                    loadJobSchedulerAvailability(nextDate);
                                                }
                                            }}
                                            className="w-full bg-transparent px-4 py-3 text-base font-semibold text-slate-800 outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => loadJobSchedulerAvailability(jobSchedulerViewDate)}
                                            className="flex shrink-0 items-center justify-center border-l border-[#d9e5f4] bg-[#f6f9fd] px-4 py-3 text-brand transition hover:bg-[#edf4fb]"
                                            aria-label="Refresh availability"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                                    <div>
                                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Browse Windows</div>
                                        <div className="mt-0.5 text-sm font-semibold text-slate-700">Move across the 5-day availability range</div>
                                    </div>
                                    <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const nextDate = getOffsetDateStr(jobSchedulerViewDate, -5);
                                                setJobSchedulerViewDate(nextDate);
                                                loadJobSchedulerAvailability(nextDate);
                                            }}
                                            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 active:bg-slate-200"
                                            title="Previous 5 days"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const nextDate = getOffsetDateStr(jobSchedulerViewDate, 5);
                                                setJobSchedulerViewDate(nextDate);
                                                loadJobSchedulerAvailability(nextDate);
                                            }}
                                            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 active:bg-slate-200"
                                            title="Next 5 days"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {jobSchedulerAvailabilityError ? (
                                <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                                    {jobSchedulerAvailabilityError}
                                </div>
                            ) : null}

                            <div className="relative mt-4">
                                {jobSchedulerAvailabilityLoading ? (
                                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/70">
                                        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 shadow-sm">
                                            <Loader2 className="h-4 w-4 animate-spin shrink-0 text-brand" />
                                            <span>Updating availability...</span>
                                        </div>
                                    </div>
                                ) : null}

                                <div className="grid grid-cols-1 gap-3 xl:grid-cols-5">
                                    {jobSchedulerDaysToRender.map((day) => {
                                        const weekday = new Date(`${day.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                                        const dayNum = new Date(`${day.date}T00:00:00`).toLocaleDateString('en-US', { day: '2-digit' });
                                        const isSelectedDate = day.date === jobSchedulerSelectedDateKey;
                                        const slots = day.dayData?.slots || [];
                                        const availableCount = slots.filter((slot) => slot.available).length;
                                        const isClosed = day.dayData?.closed || slots.length === 0;

                                        return (
                                            <div
                                                key={day.date}
                                                className={`flex min-h-[380px] flex-col rounded-[1.4rem] border p-3 transition-all ${
                                                    isSelectedDate
                                                        ? 'border-brand bg-[#f7fbff] shadow-md ring-2 ring-brand/10'
                                                        : 'border-slate-200 bg-slate-50/35 hover:border-slate-300'
                                                }`}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setJobSchedulerDraft((prev) => ({ ...prev, move_date: day.date }));
                                                        setJobSchedulerViewDate(day.date);
                                                        loadJobSchedulerAvailability(day.date);
                                                    }}
                                                    className="w-full rounded-2xl text-left transition"
                                                >
                                                    <div className="flex items-start justify-between gap-2 border-b border-slate-200/80 pb-3">
                                                        <div>
                                                            <div className={`text-base font-black tracking-tight ${isSelectedDate ? 'text-brand' : 'text-slate-800'}`}>
                                                                {weekday} {dayNum}
                                                            </div>
                                                            <div className="mt-0.5 text-[11px] font-medium text-slate-500">
                                                                {formatSchedulerDate(day.date)}
                                                            </div>
                                                        </div>
                                                        <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                                                            isSelectedDate
                                                                ? 'bg-brand text-white'
                                                                : isClosed
                                                                    ? 'bg-slate-200 text-slate-500'
                                                                    : 'bg-emerald-50 text-emerald-700'
                                                        }`}>
                                                            {isClosed ? 'Closed' : `${availableCount} open`}
                                                        </span>
                                                    </div>
                                                </button>

                                                <div className="mt-3 space-y-2.5">
                                                    {slots.length > 0 ? (
                                                        slots.map((slot, idx) => {
                                                            const isSelected = isSelectedDate
                                                                && jobSchedulerDraft.arrival_window_start === slot.start
                                                                && jobSchedulerDraft.arrival_window_end === slot.end;
                                                            const isAvailable = slot.available;

                                                            return (
                                                                <button
                                                                    key={idx}
                                                                    type="button"
                                                                    disabled={!isAvailable}
                                                                    onClick={() => {
                                                                        setJobSchedulerDraft((prev) => ({
                                                                            ...prev,
                                                                            move_date: day.date,
                                                                            arrival_window_start: slot.start,
                                                                            arrival_window_end: slot.end,
                                                                        }));
                                                                    }}
                                                                    className={`w-full rounded-2xl border px-3 py-3 text-left transition-all ${
                                                                        isSelected
                                                                            ? 'border-brand bg-brand text-white shadow-md ring-1 ring-brand'
                                                                            : isAvailable
                                                                                ? 'border-slate-200 bg-white text-slate-800 shadow-sm hover:border-brand/40 hover:bg-brand-tint/30'
                                                                                : 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400/70'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <div>
                                                                            <div className={`text-sm font-black leading-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                                                                                {formatTimeAMPM(slot.start)}
                                                                            </div>
                                                                            <div className={`mt-0.5 text-xs font-semibold ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                                                                                to {formatTimeAMPM(slot.end)}
                                                                            </div>
                                                                        </div>
                                                                        <div className={`text-right text-[10px] font-bold uppercase tracking-[0.16em] ${isSelected ? 'text-white/75' : isAvailable ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                                            {isAvailable ? `${slot.remaining_capacity}/${slot.capacity} left` : 'Full'}
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })
                                                    ) : (
                                                        <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 text-center text-[11px] font-semibold text-slate-400">
                                                            No scheduling windows configured
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
                            <div className="text-sm font-medium text-slate-500">
                                Selected window: <span className="font-bold text-slate-800">{jobSchedulerSelectedWindowLabel}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={closeJobSchedulerModal}
                                    className="px-4 py-2 text-sm font-semibold text-slate-600 transition hover:text-slate-800"
                                >
                                    Close
                                </button>
                                <button
                                    type="button"
                                    onClick={clearJobSchedulerModal}
                                    disabled={saving}
                                    className="rounded-lg border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    Clear Schedule
                                </button>
                                <button
                                    type="button"
                                    onClick={saveJobSchedulerModal}
                                    disabled={saving}
                                    className="flex min-w-[84px] items-center justify-center rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white shadow transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            {previewingRow && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-900/25 animate-in fade-in duration-200">
                    <div className="relative w-full max-w-7xl h-[94vh] bg-white rounded-[2rem] border border-slate-200 shadow-[0_32px_100px_rgba(15,23,42,0.45)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 sm:px-8 py-4 sm:py-5 bg-gradient-to-b from-slate-50 to-white">
                            <div className="min-w-0">
                                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 truncate">
                                    Preview: {previewingRow.title}
                                </h3>
                                <p className="text-sm text-slate-600 mt-1">
                                    Please review the document details before sending it to the customer.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPreviewingRow(null)}
                                className="shrink-0 p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Preview + Send Controls */}
                        <div className="flex-1 min-h-0 bg-slate-100/70">
                            <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
                                <div className="min-h-0 overflow-y-auto p-3 sm:p-6 lg:p-8">
                                    {isPreviewLoading ? (
                                        <div className="flex h-full flex-col items-center justify-center gap-3 py-12">
                                            <Loader2 className="animate-spin text-brand" size={42} />
                                            <p className="text-sm font-semibold text-slate-600">Generating contract preview...</p>
                                        </div>
                                    ) : previewHtml ? (
                                        <div className="mx-auto w-full max-w-5xl bg-white border border-slate-200 rounded-[1.5rem] p-4 sm:p-6 lg:p-8 shadow-xl overflow-x-auto select-text text-left contract-portal relative">
                                            <style>{`
                                                .contract-portal { color: #0f172a; font-size: 16px; line-height: 1.7; }
                                                .contract-portal * { color: inherit; }
                                                .contract-portal h1, .contract-portal h2, .contract-portal h3 { color: #0f172a !important; line-height: 1.2; margin-top: 1.1em; margin-bottom: 0.5em; }
                                                .contract-portal p, .contract-portal li, .contract-portal td, .contract-portal th { color: #1e293b !important; }
                                                .contract-portal img { max-width: 100% !important; height: auto !important; object-fit: contain; border-radius: 12px; }
                                                .contract-portal span[data-sign] img { max-height: 56px; display: inline-block; vertical-align: middle; }
                                                .contract-portal span[data-sign] { display: inline-block; vertical-align: middle; margin: 4px 0; }
                                                .contract-portal table { width: 100% !important; min-width: 720px; border-collapse: collapse; }
                                                .contract-portal th, .contract-portal td { border-color: rgba(148, 163, 184, 0.35) !important; padding: 10px 12px !important; }
                                            `}</style>
                                            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                                        </div>
                                    ) : (
                                        <div className="mx-auto flex max-w-2xl flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-slate-500 shadow-sm">
                                            <AlertCircle className="mb-3 text-slate-300" size={40} />
                                            <p className="text-base font-semibold">No preview content generated.</p>
                                        </div>
                                    )}
                                </div>

                                {!['signed', 'closed', 'voided', 'expired'].includes(String(previewingRow.contract?.status || '').toLowerCase()) ? (
                                    <div className="border-t lg:border-t-0 lg:border-l border-slate-200 bg-white px-4 sm:px-5 py-4 overflow-y-auto">
                                        <div className="space-y-4">
                                            <div>
                                                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                                    Send document to
                                                </div>
                                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                                    Select recipients without taking over the preview area.
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-1 gap-2">
                                                <label className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                                                    documentSendEmail ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-600'
                                                }`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={documentSendEmail}
                                                        onChange={(event) => setDocumentSendEmail(event.target.checked)}
                                                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                    />
                                                    Email
                                                </label>
                                                <label className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                                                    documentSendSms ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-slate-200 bg-slate-50 text-slate-600'
                                                }`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={documentSendSms}
                                                        onChange={(event) => setDocumentSendSms(event.target.checked)}
                                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    SMS
                                                </label>
                                            </div>

                                            {documentSendEmail ? (
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                                        Available Email Recipients
                                                    </label>
                                                    <div className="max-h-40 overflow-y-auto space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                                        {availableEmails.length > 0 ? (
                                                            availableEmails.map((item) => (
                                                                <label key={item.value} className="flex items-start gap-3 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 shadow-sm border border-slate-100">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={documentSelectedEmails.includes(item.value)}
                                                                        onChange={() => toggleMultiRecipientSelection(item.value, setDocumentSelectedEmails)}
                                                                        className="mt-1 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                                                                    />
                                                                    <span className="leading-5">{item.label}</span>
                                                                </label>
                                                            ))
                                                        ) : (
                                                            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-3 text-sm font-semibold text-slate-500">
                                                                No email recipients found.
                                                            </div>
                                                        )}
                                                    </div>
                                                    <label className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                                        Custom Email
                                                    </label>
                                                    <input
                                                        type="email"
                                                        value={documentCustomEmail}
                                                        onChange={(event) => setDocumentCustomEmail(event.target.value)}
                                                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                                                        placeholder="customer@example.com"
                                                    />
                                                </div>
                                            ) : null}

                                            {documentSendSms ? (
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                                        Available Phone Recipients
                                                    </label>
                                                    <div className="max-h-40 overflow-y-auto space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                                        {availablePhones.length > 0 ? (
                                                            availablePhones.map((item) => (
                                                                <label key={item.value} className="flex items-start gap-3 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 shadow-sm border border-slate-100">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={documentSelectedPhones.includes(item.value)}
                                                                        onChange={() => toggleMultiRecipientSelection(item.value, setDocumentSelectedPhones)}
                                                                        className="mt-1 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                                                                    />
                                                                    <span className="leading-5">{item.label}</span>
                                                                </label>
                                                            ))
                                                        ) : (
                                                            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-3 text-sm font-semibold text-slate-500">
                                                                No phone recipients found.
                                                            </div>
                                                        )}
                                                    </div>
                                                    <label className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                                        Custom Phone
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={documentCustomPhone}
                                                        onChange={(event) => setDocumentCustomPhone(event.target.value)}
                                                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                                                        placeholder="(555) 555-5555"
                                                    />
                                                </div>
                                            ) : null}

                                            {!documentSendEmail && !documentSendSms ? (
                                                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700">
                                                    Select at least one delivery method.
                                                </div>
                                            ) : null}

                                            <div className="flex items-center justify-end gap-3 pt-2">
                                                <GhostBtn onClick={() => setPreviewingRow(null)}>Cancel</GhostBtn>
                                                <PrimaryBtn
                                                    icon="send"
                                                    onClick={async () => {
                                                        const rowToActions = previewingRow;
                                                        const selectedDocumentEmails = [
                                                            ...documentSelectedEmails,
                                                            ...(String(documentCustomEmail || '').trim() ? [String(documentCustomEmail).trim()] : []),
                                                        ];
                                                        const selectedDocumentPhones = [
                                                            ...documentSelectedPhones,
                                                            ...(String(documentCustomPhone || '').trim() ? [String(documentCustomPhone).trim()] : []),
                                                        ];
                                                        setPreviewingRow(null);
                                                        await sendDocumentForSignature(rowToActions, {
                                                            send_email: documentSendEmail,
                                                            send_sms: documentSendSms,
                                                            to_email: selectedDocumentEmails.join(', '),
                                                            to_phone: selectedDocumentPhones.join(', '),
                                                        });
                                                    }}
                                                    disabled={
                                                        (!documentSendEmail && !documentSendSms) ||
                                                        (documentSendEmail && !documentSelectedEmails.length && !String(documentCustomEmail || '').trim()) ||
                                                        (documentSendSms && !documentSelectedPhones.length && !String(documentCustomPhone || '').trim())
                                                    }
                                                >
                                                    Confirm & Send
                                                </PrimaryBtn>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isAddChargeModalOpen && (
                <div data-testid="estimate-add-charge-modal" className="fixed inset-0 z-[70] flex items-center justify-center p-0 md:p-4 bg-black/20">
                    {normalizeChargeCategory(chargeForm.category) === 'moving_labor' ? (
                        renderMovingLaborModalContent(chargeForm, setChargeForm, false, cancelAddingCharge, handleAddCharge, chargeContext, saving)
                    ) : normalizeChargeCategory(chargeForm.category) === 'fuel_surcharge' ? (
                        renderFuelSurchargeModalContent(chargeForm, setChargeForm, false, cancelAddingCharge, handleAddCharge, chargeContext, catalogItems, saving)
                    ) : normalizeChargeCategory(chargeForm.category) === 'transportation' ? (
                        renderTransportationModalContent(chargeForm, setChargeForm, false, cancelAddingCharge, handleAddCharge, chargeContext, catalogItems, inventorySummary, saving)
                    ) : normalizeChargeCategory(chargeForm.category) === 'packing' ? (
                        renderPackingModalContent(chargeForm, setChargeForm, false, cancelAddingCharge, handleAddCharge, chargeContext, catalogItems, inventorySummary, saving)
                    ) : (
                        <div className="relative w-full h-full md:h-auto max-h-screen md:max-h-[calc(100vh-4rem)] md:max-w-5xl rounded-none md:rounded-[2rem] border-0 md:border border-ink-100 bg-white shadow-2xl overflow-hidden flex flex-col">
                            {/* Header */}
                            <div className="flex items-center justify-between gap-4 px-5 md:px-8 py-4 md:py-5 border-b border-ink-100 bg-gradient-to-r from-brand-tint/20 to-white shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                        <Calculator size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-heading font-black text-heading leading-tight">
                                            {normalizeChargeCategory(chargeForm.category) === 'moving_labor'
                                                ? `Add Moving Labor`
                                                : 'Add Charge'}
                                        </h3>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={cancelAddingCharge}
                                    className="p-2 rounded-full text-ink-400 hover:text-heading hover:bg-page transition-colors cursor-pointer"
                                    aria-label="Close"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Scrollable Grid Layout */}
                            <div className="flex-1 overflow-y-auto min-h-0">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:h-full">
                                    {/* Left Form Column */}
                                    <div className="lg:col-span-7 p-5 md:p-8 space-y-5 md:space-y-6 lg:border-r border-ink-100 lg:overflow-y-auto lg:h-full">
                                        <ChargeFormSection title="Charge Details" description="">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormInput label="Name" value={chargeForm.name} onChange={(e) => setChargeForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Moving Labor" />
                                                <FormInput
                                                    label="Charge Type"
                                                    as="select"
                                                    value={chargeForm.category}
                                                    onChange={(e) => setChargeForm((p) => ({ ...p, category: normalizeChargeCategory(e.target.value), category_preset_key: '' }))}
                                                >
                                                    {CHARGE_CATEGORY_OPTIONS.map(([value, label]) => (
                                                        <option key={value} value={value}>{label}</option>
                                                    ))}
                                                </FormInput>
                                            </div>
                                        </ChargeFormSection>

                                        {renderChargeCategoryFields(chargeForm, setChargeForm)}

                                        <ChargeFormSection title="Adjustments" description="">
                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                <FormInput
                                                    label="Line Discount ($)"
                                                    type="number"
                                                    value={chargeForm.quick_discount}
                                                    onChange={(e) => setChargeForm((p) => ({ ...p, quick_discount: e.target.value }))}
                                                    placeholder="0.00"
                                                />

                                            </div>
                                        </ChargeFormSection>

                                        <FormInput
                                            label="Description"
                                            as="textarea"
                                            value={chargeForm.description}
                                            onChange={(e) => setChargeForm((p) => ({ ...p, description: e.target.value }))}
                                            placeholder="Optional description for this charge..."
                                        />
                                    </div>

                                    {/* Right Summary Column */}
                                    <div className="lg:col-span-5 p-5 md:p-8 bg-slate-50/50 lg:overflow-y-auto lg:h-full flex flex-col justify-between">
                                        <ChargePricingSummary
                                            form={chargeForm}
                                            context={chargeContext}
                                            catalogItems={catalogItems}
                                            subtotal={computeChargeTotal(chargeForm, chargeContext, { presetMode: getChargePresetMode(chargeForm) })}
                                            discount={chargeForm.quick_discount}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-end gap-3 p-5 md:p-6 bg-slate-50 rounded-b-none md:rounded-b-[2rem] border-t border-ink-100 shrink-0">
                                <GhostBtn onClick={cancelAddingCharge}>Cancel</GhostBtn>
                                {canModifyEstimate ? <PrimaryBtn onClick={handleAddCharge} disabled={saving}>Add Charge</PrimaryBtn> : null}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {editingChargeId && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-0 md:p-4 bg-black/20">
                    {normalizeChargeCategory(editingChargeForm.category) === 'moving_labor' ? (
                        renderMovingLaborModalContent(editingChargeForm, setEditingChargeForm, true, cancelEditingCharge, handleSaveCharge, chargeContext, saving)
                    ) : normalizeChargeCategory(editingChargeForm.category) === 'fuel_surcharge' ? (
                        renderFuelSurchargeModalContent(editingChargeForm, setEditingChargeForm, true, cancelEditingCharge, handleSaveCharge, chargeContext, catalogItems, saving)
                    ) : normalizeChargeCategory(editingChargeForm.category) === 'transportation' ? (
                        renderTransportationModalContent(editingChargeForm, setEditingChargeForm, true, cancelEditingCharge, handleSaveCharge, chargeContext, catalogItems, inventorySummary, saving)
                    ) : normalizeChargeCategory(editingChargeForm.category) === 'packing' ? (
                        renderPackingModalContent(editingChargeForm, setEditingChargeForm, true, cancelEditingCharge, handleSaveCharge, chargeContext, catalogItems, inventorySummary, saving)
                    ) : (
                        <div className="relative w-full h-full md:h-auto max-h-screen md:max-h-[calc(100vh-4rem)] md:max-w-5xl rounded-none md:rounded-[2rem] border-0 md:border border-ink-100 bg-white shadow-2xl overflow-hidden flex flex-col">
                            {/* Header */}
                            <div className="flex items-center justify-between gap-4 px-5 md:px-8 py-4 md:py-5 border-b border-ink-100 bg-gradient-to-r from-brand-tint/20 to-white shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                        <Calculator size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-heading font-black text-heading leading-tight">Edit Charge</h3>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={cancelEditingCharge}
                                    className="p-2 rounded-full text-ink-400 hover:text-heading hover:bg-page transition-colors cursor-pointer"
                                    aria-label="Close"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Scrollable Grid Layout */}
                            <div className="flex-1 overflow-y-auto min-h-0">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:h-full">
                                    {/* Left Form Column */}
                                    <div className="lg:col-span-7 p-5 md:p-8 space-y-5 md:space-y-6 lg:border-r border-ink-100 lg:overflow-y-auto lg:h-full">
                                        <ChargeFormSection title="Charge Details" description="">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormInput
                                                    label="Name"
                                                    value={editingChargeForm.name}
                                                    onChange={(e) => setEditingChargeForm((p) => ({ ...p, name: e.target.value }))}
                                                    placeholder="e.g. Moving Labor"
                                                />
                                                <FormInput
                                                    label="Charge Type"
                                                    as="select"
                                                    value={editingChargeForm.category}
                                                    onChange={(e) => setEditingChargeForm((p) => ({ ...p, category: normalizeChargeCategory(e.target.value), category_preset_key: '' }))}
                                                >
                                                    {CHARGE_CATEGORY_OPTIONS.map(([value, label]) => (
                                                        <option key={value} value={value}>{label}</option>
                                                    ))}
                                                </FormInput>
                                            </div>
                                        </ChargeFormSection>

                                        {renderChargeCategoryFields(editingChargeForm, setEditingChargeForm)}

                                        <ChargeFormSection title="Adjustments" description="">
                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                <FormInput
                                                    label="Line Discount ($)"
                                                    type="number"
                                                    value={editingChargeForm.quick_discount}
                                                    onChange={(e) => setEditingChargeForm((p) => ({ ...p, quick_discount: e.target.value }))}
                                                    placeholder="0.00"
                                                />

                                            </div>
                                        </ChargeFormSection>

                                        <FormInput
                                            label="Description"
                                            as="textarea"
                                            value={editingChargeForm.description}
                                            onChange={(e) => setEditingChargeForm((p) => ({ ...p, description: e.target.value }))}
                                            placeholder="Optional description for this charge..."
                                        />
                                    </div>

                                    {/* Right Summary Column */}
                                    <div className="lg:col-span-5 p-5 md:p-8 bg-slate-50/50 lg:overflow-y-auto lg:h-full flex flex-col justify-between">
                                        <ChargePricingSummary
                                            form={editingChargeForm}
                                            context={chargeContext}
                                            catalogItems={catalogItems}
                                            subtotal={computeChargeTotal(editingChargeForm, chargeContext, { presetMode: getChargePresetMode(editingChargeForm) })}
                                            discount={editingChargeForm.quick_discount}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-end gap-3 p-5 md:p-6 bg-slate-50 rounded-b-none md:rounded-b-[2rem] border-t border-ink-100 shrink-0">
                                <GhostBtn onClick={cancelEditingCharge}>Cancel</GhostBtn>
                                <PrimaryBtn onClick={handleSaveCharge} disabled={saving}>Save Changes</PrimaryBtn>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {isAddInventoryItemModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/20">
                    <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                            <h3 className="text-xl font-extrabold text-black tracking-tight">Add inventory item</h3>
                            <button onClick={() => setIsAddInventoryItemModalOpen(false)} className="p-2 text-black hover:text-black rounded-xl transition"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <FormInput
                                label="Item Name"
                                value={inventoryItemForm.item_name}
                                onChange={(e) => setInventoryItemForm(p => ({ ...p, item_name: e.target.value }))}
                                placeholder="e.g. Three-seater Sofa"
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <FormInput
                                    label="Qty"
                                    type="number"
                                    value={inventoryItemForm.quantity}
                                    onChange={(e) => setInventoryItemForm(p => ({ ...p, quantity: e.target.value }))}
                                />
                                <FormInput
                                    label="Room / Zone"
                                    value={inventoryItemForm.room_name}
                                    onChange={(e) => setInventoryItemForm(p => ({ ...p, room_name: e.target.value }))}
                                    placeholder="e.g. Living Room"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <FormInput
                                    label="Est. Weight (lbs each)"
                                    type="number"
                                    value={inventoryItemForm.weight_lbs_each}
                                    onChange={(e) => setInventoryItemForm(p => ({ ...p, weight_lbs_each: e.target.value }))}
                                />
                                <div className="flex flex-col gap-2 pt-5">
                                    <label className="flex items-center gap-2 text-xs font-bold text-black cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={inventoryItemForm.is_fragile}
                                            onChange={(e) => setInventoryItemForm(p => ({ ...p, is_fragile: e.target.checked }))}
                                            className="rounded border-slate-300"
                                        />
                                        Fragile Item
                                    </label>
                                    <label className="flex items-center gap-2 text-xs font-bold text-black cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={inventoryItemForm.is_special}
                                            onChange={(e) => setInventoryItemForm(p => ({ ...p, is_special: e.target.checked }))}
                                            className="rounded border-slate-300"
                                        />
                                        Special Handling
                                    </label>
                                </div>
                            </div>
                            <FormInput
                                label="Notes"
                                as="textarea"
                                value={inventoryItemForm.notes}
                                onChange={(e) => setInventoryItemForm(p => ({ ...p, notes: e.target.value }))}
                                placeholder="e.g. Wrap in blankets, glass top needs separate box"
                                className="min-h-[80px]"
                            />
                        </div>
                        <div className="flex items-center justify-end gap-3 p-6 bg-slate-50 rounded-b-3xl border-t border-slate-100">
                            <GhostBtn onClick={() => setIsAddInventoryItemModalOpen(false)}>Cancel</GhostBtn>
                            <PrimaryBtn onClick={handleAddInventoryItem} disabled={saving}>Save item</PrimaryBtn>
                        </div>
                    </div>
                </div>
            )}

            {isPackageModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/20">
                    <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                            <h3 className="text-xl font-extrabold text-black tracking-tight">Apply Package</h3>
                            <button onClick={() => setIsPackageModalOpen(false)} className="p-2 text-black hover:text-black rounded-xl transition"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <FormInput label="Select Package" as="select" value={selectedPackageId} onChange={(e) => setSelectedPackageId(e.target.value)}>
                                <option value="">Choose a package...</option>
                                {packages.map(pkg => <option key={pkg.id} value={pkg.id}>{pkg.name}</option>)}
                            </FormInput>
                            {selectedPackage && (
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-black italic">
                                    This will add all items from "{selectedPackage.name}" to the estimate.
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-end gap-3 p-6 bg-slate-50 rounded-b-3xl border-t border-slate-100">
                            <GhostBtn onClick={() => setIsPackageModalOpen(false)}>Cancel</GhostBtn>
                            <PrimaryBtn onClick={handleApplyPackage} disabled={!selectedPackage || saving || estimateIsLocked}>Apply Package</PrimaryBtn>
                        </div>
                    </div>
                </div>
            )}

            {isCatalogModalOpen && (
                <div className={`fixed inset-0 z-[70] flex items-center justify-center ${selectedCatalogItem ? 'p-0 md:p-4' : 'p-4'} bg-slate-900/20`}>
                    <div className={`relative w-full ${selectedCatalogItem ? 'h-full md:h-auto max-h-screen md:max-h-[calc(100vh-4rem)] md:max-w-5xl rounded-none md:rounded-[2rem] border-0 md:border' : 'max-w-lg rounded-[2rem] border'} border-slate-200 bg-white shadow-2xl overflow-hidden transition-all duration-300 flex flex-col`}>
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 bg-gradient-to-r from-brand-tint/20 to-white shrink-0">
                            <h3 className="text-xl font-heading font-black text-heading leading-tight">Add Catalog Item</h3>
                            <button
                                onClick={() => setIsCatalogModalOpen(false)}
                                className="p-2 text-black hover:text-black rounded-xl transition"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto min-h-0">
                            {selectedCatalogItem ? (
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:h-full">
                                    {/* Left Form Column */}
                                    <div className="lg:col-span-7 p-5 md:p-8 space-y-5 md:space-y-6 lg:border-r border-ink-100 lg:overflow-y-auto lg:h-full">
                                        <div className="p-4 rounded-2xl bg-[#eef6ff]/30 border border-[#eef6ff] text-xs font-semibold text-slate-700">
                                            Item type: <span className="font-extrabold text-brand">{titleCase(selectedCatalogItem.item_type)}</span> · Category: <span className="font-extrabold text-brand">{titleCase(selectedCatalogItem.category || 'other')}</span>
                                        </div>

                                        <FormInput
                                            label="Catalog Item Source"
                                            as="select"
                                            value={selectedCatalogItemId}
                                            onChange={(e) => {
                                                const nextId = e.target.value;
                                                setSelectedCatalogItemId(nextId);
                                                const row = catalogItems.find((item) => String(item.id) === String(nextId));
                                                setCatalogChargeForm(buildCatalogChargeDraft(row));
                                            }}
                                        >
                                            <option value="">Choose a catalog item...</option>
                                            {catalogItems.map((item) => (
                                                <option key={item.id} value={item.id}>
                                                    {item.name}
                                                </option>
                                            ))}
                                        </FormInput>

                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                            <FormInput
                                                label="Charge Name"
                                                value={catalogChargeForm.name}
                                                onChange={(e) => setCatalogChargeForm((p) => ({ ...p, name: e.target.value }))}
                                            />
                                            <FormInput
                                                label="Category"
                                                as="select"
                                                value={catalogChargeForm.category}
                                                onChange={(e) => {
                                                    const nextCategory = normalizeChargeCategory(e.target.value);
                                                    const schema = getCategoryFormSchemaFromCatalog(nextCategory, catalogItems);
                                                    setCatalogChargeForm((p) => ({
                                                        ...p,
                                                        category: nextCategory,
                                                        category_preset_key: schema?.presets?.[0]?.key || '',
                                                    }));
                                                }}
                                            >
                                                {CHARGE_CATEGORY_OPTIONS.map(([value, label]) => (
                                                    <option key={value} value={value}>{label}</option>
                                                ))}
                                            </FormInput>
                                        </div>

                                        {renderChargeCategoryFields(catalogChargeForm, setCatalogChargeForm)}

                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                            <FormInput
                                                label="Quantity"
                                                type="number"
                                                value={catalogChargeForm.quantity}
                                                onChange={(e) => setCatalogChargeForm((p) => ({ ...p, quantity: e.target.value }))}
                                            />
                                            <FormInput
                                                label="Unit Price ($)"
                                                type="number"
                                                value={catalogChargeForm.unit_price}
                                                onChange={(e) => setCatalogChargeForm((p) => ({ ...p, unit_price: e.target.value }))}
                                            />
                                        </div>

                                        <FormInput
                                            label="Description"
                                            as="textarea"
                                            value={catalogChargeForm.description}
                                            onChange={(e) => setCatalogChargeForm((p) => ({ ...p, description: e.target.value }))}
                                            placeholder="Optional description for this charge..."
                                        />
                                    </div>

                                    {/* Right Summary Column */}
                                    <div className="lg:col-span-5 p-5 md:p-8 bg-slate-50/50 lg:overflow-y-auto lg:h-full flex flex-col justify-between">
                                        <ChargePricingSummary
                                            form={catalogChargeForm}
                                            context={chargeContext}
                                            catalogItems={catalogItems}
                                            subtotal={computeChargeTotal(catalogChargeForm, chargeContext, { presetMode: getChargePresetMode(catalogChargeForm) })}
                                            discount={0}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="p-6 space-y-4">
                                    <FormInput
                                        label="Catalog Item"
                                        as="select"
                                        value={selectedCatalogItemId}
                                        onChange={(e) => {
                                            const nextId = e.target.value;
                                            setSelectedCatalogItemId(nextId);
                                            const row = catalogItems.find((item) => String(item.id) === String(nextId));
                                            setCatalogChargeForm(buildCatalogChargeDraft(row));
                                        }}
                                    >
                                        <option value="">Choose a catalog item...</option>
                                        {catalogItems.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.name}
                                            </option>
                                        ))}
                                    </FormInput>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-end gap-3 p-5 md:p-6 bg-slate-50 rounded-b-none md:rounded-b-[2rem] border-t border-slate-100 shrink-0">
                            <GhostBtn onClick={() => setIsCatalogModalOpen(false)}>Cancel</GhostBtn>
                            <PrimaryBtn onClick={handleAddCatalogItem} disabled={!selectedCatalogItem || saving}>
                                Add Item
                            </PrimaryBtn>
                        </div>
                    </div>
                </div>
            )}

            {isManualPaymentModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/20">
                    <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden">
                        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5 bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-extrabold text-black tracking-tight">
                                    {manualPaymentEditingId ? 'Edit Manual Payment' : 'Add Manual Payment'}
                                </h3>
                                <p className="text-sm font-semibold text-black">Record a payment received outside the gateway.</p>
                            </div>
                            <button onClick={closeManualPaymentModal} className="p-2 text-black hover:text-black hover:bg-slate-100 rounded-xl transition"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormInput label="Method" as="select" value={manualPaymentDraft.method} onChange={(e) => setManualPaymentDraft(p => ({ ...p, method: e.target.value }))}>
                                    <option value="e_transfer">E-Transfer</option>
                                    <option value="cash">Cash</option>
                                    <option value="cheque">Cheque</option>
                                    <option value="card">Card</option>
                                    <option value="other">Other</option>
                                </FormInput>
                                <FormInput label="Amount" type="number" value={manualPaymentDraft.amount} onChange={(e) => setManualPaymentDraft(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
                            </div>
                            <FormInput label="Reference" value={manualPaymentDraft.reference} onChange={(e) => setManualPaymentDraft(p => ({ ...p, reference: e.target.value }))} placeholder="Transaction ref" />
                            <FormInput label="Note" value={manualPaymentDraft.note} onChange={(e) => setManualPaymentDraft(p => ({ ...p, note: e.target.value }))} placeholder="Notes" />
                        </div>
                        <div className="flex items-center justify-end gap-3 p-6 bg-slate-50 border-t border-slate-100">
                            <GhostBtn onClick={closeManualPaymentModal}>Cancel</GhostBtn>
                            <PrimaryBtn onClick={saveManualPayment} disabled={isSavingManualPayment}>
                                {manualPaymentEditingId ? 'Save Changes' : 'Save Payment'}
                            </PrimaryBtn>
                        </div>
                    </div>
                </div>
            )}

            {isInventoryRequestModalOpen && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/20">
                    <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden">
                        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5 bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><Send size={24} /></div>
                                <div>
                                    <h3 className="text-xl font-extrabold text-black tracking-tight">Request Inventory</h3>
                                    <p className="text-sm font-semibold text-black">Choose how to send the inventory request</p>
                                </div>
                            </div>
                            <button onClick={() => setIsInventoryRequestModalOpen(false)} className="p-2 text-black hover:text-black hover:bg-slate-100 rounded-xl transition"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="space-y-3">
                                <label className="text-xs font-bold uppercase tracking-wider text-black">Delivery Channels</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <label className={`flex items-center gap-3 rounded-2xl border p-4 text-sm font-bold cursor-pointer transition-all ${
                                        inventoryRequestSendEmail
                                            ? 'border-blue-200 bg-blue-50/50 text-blue-800'
                                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                    }`}>
                                        <input
                                            type="checkbox"
                                            checked={inventoryRequestSendEmail}
                                            onChange={(e) => setInventoryRequestSendEmail(e.target.checked)}
                                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span>Send via Email</span>
                                    </label>
                                    <label className={`flex items-center gap-3 rounded-2xl border p-4 text-sm font-bold cursor-pointer transition-all ${
                                        inventoryRequestSendSMS
                                            ? 'border-blue-200 bg-blue-50/50 text-blue-800'
                                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                    }`}>
                                        <input
                                            type="checkbox"
                                            checked={inventoryRequestSendSMS}
                                            onChange={(e) => setInventoryRequestSendSMS(e.target.checked)}
                                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span>Send via SMS / Text</span>
                                    </label>
                                </div>
                            </div>

                            {inventoryRequestSendEmail && (
                                <div className="space-y-3">
                                    <label className="text-xs font-bold uppercase tracking-wider text-black">Recipient Email</label>
                                    <select
                                        value={inventoryRequestIsCustomEmail ? 'custom' : inventoryRequestToEmail}
                                        onChange={(e) => {
                                            if (e.target.value === 'custom') {
                                                setInventoryRequestIsCustomEmail(true);
                                                setInventoryRequestToEmail('');
                                            } else {
                                                setInventoryRequestIsCustomEmail(false);
                                                setInventoryRequestToEmail(e.target.value);
                                            }
                                        }}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-black outline-none font-sans"
                                    >
                                        {availableEmails.map((item) => (
                                            <option key={item.value} value={item.value}>
                                                {item.label}
                                            </option>
                                        ))}
                                        <option value="custom">Custom Email...</option>
                                    </select>
                                    {inventoryRequestIsCustomEmail && (
                                        <input
                                            type="email"
                                            placeholder="Enter custom email address"
                                            value={inventoryRequestToEmail}
                                            onChange={(e) => setInventoryRequestToEmail(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-black outline-none mt-2"
                                        />
                                    )}
                                </div>
                            )}

                            {inventoryRequestSendSMS && (
                                <div className="space-y-3">
                                    <label className="text-xs font-bold uppercase tracking-wider text-black">Recipient Phone Number</label>
                                    <select
                                        value={inventoryRequestIsCustomPhone ? 'custom' : inventoryRequestToPhone}
                                        onChange={(e) => {
                                            if (e.target.value === 'custom') {
                                                setInventoryRequestIsCustomPhone(true);
                                                setInventoryRequestToPhone('');
                                            } else {
                                                setInventoryRequestIsCustomPhone(false);
                                                setInventoryRequestToPhone(e.target.value);
                                            }
                                        }}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-black outline-none font-sans"
                                    >
                                        {availablePhones.map((item) => (
                                            <option key={item.value} value={item.value}>
                                                {item.label}
                                            </option>
                                        ))}
                                        <option value="custom">Custom Phone Number...</option>
                                    </select>
                                    {inventoryRequestIsCustomPhone && (
                                        <input
                                            type="text"
                                            placeholder="Enter custom phone number"
                                            value={inventoryRequestToPhone}
                                            onChange={(e) => setInventoryRequestToPhone(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-black outline-none mt-2"
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-end gap-3 p-6 bg-slate-50 border-t border-slate-100">
                            <GhostBtn onClick={() => setIsInventoryRequestModalOpen(false)}>Cancel</GhostBtn>
                            <PrimaryBtn onClick={handleConfirmInventoryRequest} loading={saving}>
                                Request Inventory
                            </PrimaryBtn>
                        </div>
                    </div>
                </div>
            )}


            {isPortalSelectModalOpen && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/20 animate-in fade-in duration-200">
                    <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5 bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                                    <Globe size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-extrabold text-black tracking-tight">View Estimate Portal</h3>
                                    <p className="text-sm font-semibold text-black/60">Open the customer portal preview for this estimate</p>
                                </div>
                            </div>
                            <button onClick={() => setIsPortalSelectModalOpen(false)} className="p-2 text-black hover:text-black hover:bg-slate-100 rounded-xl transition">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                                This opens the existing customer portal preview for the estimate. No template selection or snapshot changes are made here.
                            </div>
                            {estimate?.portal_template_snapshot ? (
                                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                                    <div className="text-xs font-bold uppercase tracking-wider text-blue-700">Current portal template</div>
                                    <div className="mt-1 text-sm font-extrabold text-slate-900">
                                        {estimate?.portal_template?.name || estimate?.portal_template_snapshot?.name || 'Saved estimate portal'}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                        <div className="flex items-center justify-end gap-3 p-6 bg-slate-50 border-t border-slate-100">
                            <GhostBtn onClick={() => setIsPortalSelectModalOpen(false)}>Cancel</GhostBtn>
                            <PrimaryBtn
                                onClick={handleViewPortalWithTemplate}
                                disabled={saving}
                            >
                                {saving ? 'Preparing Link...' : 'View Portal'}
                            </PrimaryBtn>
                        </div>
                    </div>
                </div>
            )}

            {isSendModalOpen && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/20">
                    <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden">
                        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5 bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><Send size={24} /></div>
                                <div>
                                    <h3 className="text-xl font-extrabold text-black tracking-tight">{estimate?.sent ? 'Resend Estimate' : 'Send Estimate'}</h3>
                                    <p className="text-sm font-semibold text-black">Configure delivery and deposit</p>
                                </div>
                            </div>
                            <button onClick={() => setIsSendModalOpen(false)} className="p-2 text-black hover:text-black hover:bg-slate-100 rounded-xl transition"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="space-y-3">
                                <label className="text-xs font-bold uppercase tracking-wider text-black">Delivery Channels</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <label className={`flex items-center gap-3 rounded-2xl border p-4 text-sm font-bold cursor-pointer transition-all ${
                                        sendEmail 
                                            ? 'border-blue-200 bg-blue-50/50 text-blue-800' 
                                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                    }`}>
                                        <input
                                            type="checkbox"
                                            checked={sendEmail}
                                            onChange={(e) => setSendEmail(e.target.checked)}
                                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span>Send via Email</span>
                                    </label>
                                    <label className={`flex items-center gap-3 rounded-2xl border p-4 text-sm font-bold cursor-pointer transition-all ${
                                        sendSMS 
                                            ? 'border-blue-200 bg-blue-50/50 text-blue-800' 
                                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                    }`}>
                                        <input
                                            type="checkbox"
                                            checked={sendSMS}
                                            onChange={(e) => setSendSMS(e.target.checked)}
                                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span>Send via SMS / Text</span>
                                    </label>
                                </div>
                            </div>

                            {sendEmail && (
                                <div className="space-y-3">
                                    <label className="text-xs font-bold uppercase tracking-wider text-black">Available Email Recipients</label>
                                    <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                                        {availableEmails.length > 0 ? (
                                            availableEmails.map((item) => (
                                                <label key={item.value} className="flex items-start gap-3 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-black shadow-sm border border-slate-100">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRecipientEmails.includes(item.value)}
                                                        onChange={() => toggleMultiRecipientSelection(item.value, setSelectedRecipientEmails)}
                                                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="leading-5">{item.label}</span>
                                                </label>
                                            ))
                                        ) : (
                                            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-3 text-sm font-semibold text-black/60">
                                                No email recipients found.
                                            </div>
                                        )}
                                    </div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-black">Custom Email</label>
                                    <input
                                        type="email"
                                        placeholder="Enter custom email address"
                                        value={customRecipientEmail}
                                        onChange={(e) => setCustomRecipientEmail(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-black outline-none"
                                    />
                                </div>
                            )}

                            {sendSMS && (
                                <div className="space-y-3">
                                    <label className="text-xs font-bold uppercase tracking-wider text-black">Available Phone Recipients</label>
                                    <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                                        {availablePhones.length > 0 ? (
                                            availablePhones.map((item) => (
                                                <label key={item.value} className="flex items-start gap-3 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-black shadow-sm border border-slate-100">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRecipientPhones.includes(item.value)}
                                                        onChange={() => toggleMultiRecipientSelection(item.value, setSelectedRecipientPhones)}
                                                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="leading-5">{item.label}</span>
                                                </label>
                                            ))
                                        ) : (
                                            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-3 text-sm font-semibold text-black/60">
                                                No phone recipients found.
                                            </div>
                                        )}
                                    </div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-black">Custom Phone</label>
                                    <input
                                        type="text"
                                        placeholder="Enter custom phone number"
                                        value={customRecipientPhone}
                                        onChange={(e) => setCustomRecipientPhone(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-black outline-none"
                                    />
                                </div>
                            )}

                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <label className="text-xs font-bold uppercase tracking-wider text-black">Customer portal template</label>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/settings/estimate-portal-templates')}
                                        className="text-[10px] font-black uppercase tracking-widest text-blue-700 hover:text-blue-800 underline underline-offset-4"
                                    >
                                        Manage
                                    </button>
                                </div>

                                {estimate?.sent ? (
                                    <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-black">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(resendUseSameTemplate)}
                                            onChange={(e) => setResendUseSameTemplate(e.target.checked)}
                                            className="mt-1 h-4 w-4 rounded border-slate-300"
                                        />
                                        <span>Use same template as last send</span>
                                    </label>
                                ) : null}

                                {!estimate?.sent || !resendUseSameTemplate ? (
                                    portalTemplatesForSend.length ? (
                                        <>
                                            <select
                                                value={selectedPortalTemplateId || ''}
                                                onChange={(e) => setSelectedPortalTemplateId(e.target.value)}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-black outline-none"
                                            >
                                                <option value="">Select template…</option>
                                                {portalTemplatesForSend.map((tpl) => {
                                                    const isGlobal = !tpl?.branch_id && !tpl?.branch;
                                                    const suffix = isGlobal ? ' (Global — will copy to branch)' : tpl?.is_default ? ' (Default)' : '';
                                                    return (
                                                        <option key={tpl.id} value={tpl.id}>
                                                            {tpl.name}{suffix}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                            <div className="text-[11px] font-semibold text-black/60">
                                                Tip: Global templates are copied to this branch automatically when sending.
                                            </div>
                                        </>
                                    ) : (
                                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-semibold text-black/70">
                                            No templates found. Create one in Settings → Estimates → Estimate Portal Templates.
                                        </div>
                                    )
                                ) : null}
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-bold uppercase tracking-wider text-black">Required Deposit</label>
                                <div className="flex bg-slate-100 p-1 rounded-lg">
                                    <button onClick={() => setDepositType('percentage')} className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${depositType === 'percentage' ? 'bg-white text-blue-600 shadow-sm' : 'text-black'}`}>Percent</button>
                                    <button onClick={() => setDepositType('amount')} className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${depositType === 'amount' ? 'bg-white text-blue-600 shadow-sm' : 'text-black'}`}>Amount</button>
                                </div>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-black font-bold">{depositType === 'percentage' ? '%' : '$'}</div>
                                    <input type="number" value={depositValue} onChange={(e) => setDepositValue(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold text-black outline-none" />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 p-6 bg-slate-50 border-t border-slate-100">
                            <GhostBtn onClick={() => setIsSendModalOpen(false)}>Cancel</GhostBtn>
                            {estimateIsSigned ? (
                                <PrimaryBtn onClick={handleClearEstimateSignatures} disabled={saving}>
                                    {saving ? 'Clearing...' : 'Clear'}
                                </PrimaryBtn>
                            ) : null}
                            <PrimaryBtn onClick={handleConfirmSendEstimate} disabled={saving}>{estimate?.sent ? 'Resend Now' : 'Send Now'}</PrimaryBtn>
                        </div>
                    </div>
                </div>
            )}

            {isMultiSendModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/20 animate-in fade-in">
                    <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-slate-100 bg-[#1f7ae0] text-white px-6 py-5">
                            <h3 className="text-xl font-extrabold tracking-tight">Send Selected Documents</h3>
                            <button onClick={() => setIsMultiSendModalOpen(false)} className="p-2 text-white hover:bg-white/10 rounded-xl transition"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-left">
                            <div className="space-y-2">
                                <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Recipient Email</label>
                                <select
                                    value={isMultiSendCustomEmail ? 'custom' : multiSendEmailData.to}
                                    onChange={(e) => {
                                        if (e.target.value === 'custom') {
                                            setIsMultiSendCustomEmail(true);
                                            setMultiSendEmailData((p) => ({ ...p, to: '' }));
                                        } else {
                                            setIsMultiSendCustomEmail(false);
                                            setMultiSendEmailData((p) => ({ ...p, to: e.target.value }));
                                        }
                                    }}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-black outline-none font-sans"
                                >
                                    {availableEmails.map((item) => (
                                        <option key={item.value} value={item.value}>
                                            {item.label}
                                        </option>
                                    ))}
                                    <option value="custom">Custom Email...</option>
                                </select>
                                {isMultiSendCustomEmail && (
                                    <input
                                        type="email"
                                        placeholder="Enter custom email address"
                                        value={multiSendEmailData.to}
                                        onChange={(e) => setMultiSendEmailData((p) => ({ ...p, to: e.target.value }))}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-black outline-none"
                                    />
                                )}
                            </div>
                            <FormInput 
                                label="Subject" 
                                value={multiSendEmailData.subject} 
                                onChange={(e) => setMultiSendEmailData(p => ({ ...p, subject: e.target.value }))} 
                            />
                            <div className="space-y-1.5">
                                <label className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Email HTML Body Preview</label>
                                <iframe 
                                    title="Email HTML Body Preview"
                                    className="w-full h-[300px] border border-slate-200 rounded-xl bg-white"
                                    srcDoc={multiSendEmailData.body}
                                    sandbox=""
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 p-6 bg-slate-50 rounded-b-3xl border-t border-slate-100">
                            <GhostBtn onClick={() => setIsMultiSendModalOpen(false)}>Cancel</GhostBtn>
                            <PrimaryBtn icon="send" onClick={handleConfirmMultiSend} loading={isMultiSending}>Send Email</PrimaryBtn>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const normalizeDiscountPresetList = (rawValue) => {
    if (!rawValue) return [];
    const rows = Array.isArray(rawValue) ? rawValue : [rawValue];
    return rows
        .filter(Boolean)
        .map((row) => ({
            id: String(row?.id || '').trim(),
            label: String(row?.label || 'Discount').trim() || 'Discount',
            discount_type: String(row?.discount_type || 'fixed').toLowerCase(),
            value: String(row?.value ?? '0'),
            applied_amount: Number(row?.applied_amount ?? row?.amount ?? 0) || 0,
        }))
        .filter((row) => row.id || row.applied_amount > 0);
};

const computeDiscountPresetAmount = (preset, subtotal) => {
    const rawValue = Number(preset?.value || 0);
    const type = String(preset?.discount_type || '').toLowerCase();
    if (type === 'percent') {
        return Math.max(0, (subtotal * rawValue) / 100);
    }
    return Math.max(0, rawValue);
};

const computeDiscountPresetTotal = (presets, subtotal) => {
    return normalizeDiscountPresetList(presets).reduce((sum, preset) => sum + computeDiscountPresetAmount(preset, subtotal), 0);
};
