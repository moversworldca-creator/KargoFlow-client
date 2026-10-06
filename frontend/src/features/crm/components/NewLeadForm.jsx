import React, { useEffect, useMemo, useState } from 'react';
import { X, Loader2, Save, User, MapPin, Calendar, Building2, Phone, Mail, Truck, Box as BoxIcon } from 'lucide-react';
import { createLead, getMoveTypeLookups, getServices } from '../../../services/api';
import AddressAutocomplete from '../../../shared/ui/AddressAutocomplete';

const CANADIAN_PROVINCES = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'YT', name: 'Yukon' },
];

const getUserBranchIds = (user) => {
  if (!user) return [];
  const branchIds = new Set();

  const addId = (id) => {
    if (id !== null && id !== undefined && id !== '') {
      branchIds.add(String(id));
    }
  };

  if (Array.isArray(user.branches)) {
    user.branches.forEach((branch) => {
      if (branch && typeof branch === 'object' && branch.id) addId(branch.id);
      else addId(branch);
    });
  }

  if (Array.isArray(user.branch_details)) {
    user.branch_details.forEach((branch) => {
      if (branch && branch.id) addId(branch.id);
    });
  }

  if (user.branch) {
    if (typeof user.branch === 'object' && user.branch.id) addId(user.branch.id);
    else addId(user.branch);
  }

  return Array.from(branchIds);
};

const getUserDisplayName = (user) =>
  (
    user?.full_name ||
    `${user?.first_name || ''} ${user?.last_name || ''}`.trim() ||
    user?.email ||
    (user?.id ? `User #${user.id}` : '')
  ).trim();

const DEFAULT_MOVE_SIZE_OPTIONS = [
  'Studio',
  '1 Bedroom Apartment',
  '2 Bedroom Apartment',
  '3 Bedroom Apartment',
  '3 Bedroom House',
  '4 Bedroom House',
  '5+ Bedroom House',
  'Office',
  'Commercial',
];

const INITIAL_FORM_STATE = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  custom_status_code: '',
  service_type: '',
  move_date: '',
  move_size: '',
  move_type: '',
  branch: '',
  assigned_to: '',
  referral_source: '',
  notes: '',
  origin_street: '',
  origin_unit_number: '',
  origin_property_type: '',
  origin_parking_type: '',
  origin_flights_of_stairs: 0,
  origin_has_elevator: false,
  origin_walk_distance_ft: 0,
  origin_city: '',
  origin_state: '',
  origin_zip: '',
  destination_street: '',
  destination_unit_number: '',
  destination_property_type: '',
  destination_parking_type: '',
  destination_flights_of_stairs: 0,
  destination_has_elevator: false,
  destination_walk_distance_ft: 0,
  destination_city: '',
  destination_state: '',
  destination_zip: '',
};

const getErrorMessage = (err, fallback = 'Failed to create lead.') => {
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

const asList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.results)) return res.results;
  return [];
};

const NewLeadForm = ({ isOpen, onClose, metadata = {}, onSuccess, canCreateLead = true }) => {
  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [moveTypes, setMoveTypes] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);

  useEffect(() => {
    if (!isOpen) return;
    setForm(INITIAL_FORM_STATE);
    setError('');
    setIsSaving(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    let cancelled = false;
    const loadTypeLookups = async () => {
      const params = form.branch ? { branch: form.branch } : {};
      try {
        const [moveTypesResponse, serviceTypesResponse] = await Promise.all([
          getMoveTypeLookups(params),
          getServices(params),
        ]);
        if (cancelled) return;
        setMoveTypes(asList(moveTypesResponse));
        setServiceTypes(asList(serviceTypesResponse));
      } catch {
        if (!cancelled) {
          setMoveTypes([]);
          setServiceTypes([]);
        }
      }
    };

    loadTypeLookups();
    return () => {
      cancelled = true;
    };
  }, [form.branch, isOpen]);

  const branches = useMemo(() => asList(metadata.branches), [metadata.branches]);
  const users = useMemo(() => asList(metadata.users), [metadata.users]);
  const moverSizes = useMemo(() => asList(metadata.moverSizes), [metadata.moverSizes]);
  const referralSources = useMemo(() => asList(metadata.referralSources), [metadata.referralSources]);

  const resolvedMoveSizes = useMemo(
    () =>
      moverSizes
        .filter((size) => size && size.is_active !== false)
        .map((size) => String(size.name || '').trim())
        .filter(Boolean),
    [moverSizes]
  );

  const moveSizeOptions = resolvedMoveSizes.length ? resolvedMoveSizes : DEFAULT_MOVE_SIZE_OPTIONS;
  const currentMoveSize = String(form.move_size || '').trim();
  const hasCustomMoveSize = Boolean(currentMoveSize) && !moveSizeOptions.includes(currentMoveSize);
  const selectedBranchId = form.branch ? String(form.branch) : '';

  const assignableUsers = useMemo(() => {
    if (!selectedBranchId) return users;
    return users.filter((user) => getUserBranchIds(user).includes(selectedBranchId));
  }, [selectedBranchId, users]);

  const selectedUser = useMemo(() => {
    if (!form.assigned_to) return null;
    return users.find((user) => String(user.id) === String(form.assigned_to)) || null;
  }, [form.assigned_to, users]);

  useEffect(() => {
    if (!form.assigned_to || !selectedBranchId) return;
    const userIsAssignable = assignableUsers.some((user) => String(user.id) === String(form.assigned_to));
    if (!userIsAssignable) {
      setForm((prev) => ({ ...prev, assigned_to: '' }));
    }
  }, [assignableUsers, form.assigned_to, selectedBranchId]);

  const managerOptions = useMemo(() => {
    const options = [...assignableUsers];
    if (selectedUser && !options.some((user) => String(user.id) === String(selectedUser.id))) {
      options.push(selectedUser);
    }
    return options;
  }, [assignableUsers, selectedUser]);

  const validateForm = () => {
    if (!form.first_name.trim()) return 'First name is required.';
    if (!form.email.trim() && !form.phone.trim()) return 'At least one contact method (Email or Phone) is required.';

    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return 'Please enter a valid email address.';
    }

    if (form.phone.trim()) {
      const digits = form.phone.replace(/\D/g, '');
      if (digits.length < 10) return 'Please enter a valid 10-digit phone number.';
    }

    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        status: 'new',
        custom_status_code: null,
        service_type: form.service_type ? Number(form.service_type) : null,
        move_date: form.move_date || null,
        move_size: form.move_size,
        move_type: form.move_type ? Number(form.move_type) : null,
        branch: form.branch ? Number(form.branch) : null,
        assigned_to: form.assigned_to && (!selectedBranchId || assignableUsers.some((user) => String(user.id) === String(form.assigned_to)))
          ? Number(form.assigned_to)
          : null,
        referral_source: form.referral_source ? Number(form.referral_source) : null,
        notes: form.notes,
        origin_street: form.origin_street,
        origin_unit_number: form.origin_unit_number,
        origin_property_type: form.origin_property_type,
        origin_parking_type: form.origin_parking_type,
        origin_flights_of_stairs: Number(form.origin_flights_of_stairs) || 0,
        origin_has_elevator: Boolean(form.origin_has_elevator),
        origin_walk_distance_ft: Number(form.origin_walk_distance_ft) || 0,
        origin_city: form.origin_city,
        origin_state: form.origin_state,
        origin_zip: form.origin_zip,
        destination_street: form.destination_street,
        destination_unit_number: form.destination_unit_number,
        destination_property_type: form.destination_property_type,
        destination_parking_type: form.destination_parking_type,
        destination_flights_of_stairs: Number(form.destination_flights_of_stairs) || 0,
        destination_has_elevator: Boolean(form.destination_has_elevator),
        destination_walk_distance_ft: Number(form.destination_walk_distance_ft) || 0,
        destination_city: form.destination_city,
        destination_state: form.destination_state,
        destination_zip: form.destination_zip,
      };

      const created = await createLead(payload);
      const lead = created?.data ?? created;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('crm:lead-created', { detail: { lead } }));
      }
      if (onSuccess) {
        onSuccess(lead);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 md:p-6">
      <div className="bg-brand-surface w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-2rem)] md:max-h-[calc(100vh-4rem)]">
        
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 md:px-8 py-5 border-b border-ink-100 bg-gradient-to-r from-brand-tint/20 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-heading font-black text-heading leading-tight">Create New Lead</h2>
              <p className="text-xs text-ink-400">Essential customer contact, location coordinates, and move details.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-ink-400 hover:text-heading hover:bg-page transition-colors cursor-pointer animate-in fade-in"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
              
              {/* COLUMN 1: CUSTOMER DETAILS */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-ink-100 text-ink-800">
                  <User size={15} className="text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider">Customer Details</span>
                </div>
                
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-xs font-bold text-ink-600 block mb-1">First Name <span className="text-red-500">*</span></span>
                    <input
                      type="text"
                      required
                      value={form.first_name}
                      onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-ink-200 bg-brand-tint/30 text-sm font-semibold text-ink-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder-ink-400"
                      placeholder="First Name"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-bold text-ink-600 block mb-1">Last Name</span>
                    <input
                      type="text"
                      value={form.last_name}
                      onChange={(e) => setForm((prev) => ({ ...prev, last_name: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-ink-200 bg-brand-tint/30 text-sm font-semibold text-ink-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder-ink-400"
                      placeholder="Last Name"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-bold text-ink-600 block mb-1">Phone</span>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-ink-200 bg-brand-tint/30 text-sm font-semibold text-ink-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder-ink-400"
                      placeholder="Phone Number"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-bold text-ink-600 block mb-1">Email</span>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-ink-200 bg-brand-tint/30 text-sm font-semibold text-ink-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder-ink-400"
                      placeholder="Email Address"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-bold text-ink-600 block mb-1">Lead Source</span>
                    <select
                      value={form.referral_source}
                      onChange={(e) => setForm((prev) => ({ ...prev, referral_source: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-ink-200 bg-brand-tint/30 text-sm font-semibold text-ink-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
                    >
                      <option value="">Select Lead Source</option>
                      {referralSources.map((source) => (
                        <option key={source.id} value={String(source.id)}>
                          {source.name || `Source #${source.id}`}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {/* COLUMN 2: LOCATIONS */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-ink-100 text-ink-800">
                  <MapPin size={15} className="text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider">Locations</span>
                </div>

                <div className="space-y-4">
                  {/* Origin Address */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-primary block">Origin Address</span>
                    <label className="block">
                      <AddressAutocomplete
                        country="ca,us"
                        value={form.origin_street}
                        onChange={(e) => setForm((prev) => ({ ...prev, origin_street: e.target.value }))}
                        onPick={(parts) =>
                          setForm((p) => ({
                            ...p,
                            origin_street: parts.formattedAddress || parts.street || p.origin_street,
                            origin_city: parts.city || p.origin_city,
                            origin_state: parts.province || p.origin_state,
                            origin_zip: parts.postalCode || p.origin_zip,
                          }))
                        }
                        className="w-full px-3 py-2 rounded-xl border border-ink-200 bg-brand-tint/30 text-sm font-semibold text-ink-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder-ink-400"
                        placeholder="Origin Address"
                      />
                    </label>
                  </div>

                  {/* Destination Address */}
                  <div className="space-y-2 pt-1 border-t border-dashed border-ink-100">
                    <span className="text-[10px] font-black uppercase tracking-wider text-primary block mt-2">Destination Address</span>
                    <label className="block">
                      <AddressAutocomplete
                        country="ca,us"
                        value={form.destination_street}
                        onChange={(e) => setForm((prev) => ({ ...prev, destination_street: e.target.value }))}
                        onPick={(parts) =>
                          setForm((p) => ({
                            ...p,
                            destination_street: parts.formattedAddress || parts.street || p.destination_street,
                            destination_city: parts.city || p.destination_city,
                            destination_state: parts.province || p.destination_state,
                            destination_zip: parts.postalCode || p.destination_zip,
                          }))
                        }
                        className="w-full px-3 py-2 rounded-xl border border-ink-200 bg-brand-tint/30 text-sm font-semibold text-ink-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder-ink-400"
                        placeholder="Destination Address"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* COLUMN 3: MOVE DETAILS & SPECS */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-ink-100 text-ink-800">
                  <Truck size={15} className="text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider">Move Details</span>
                </div>

                <div className="space-y-3">
                  <label className="block">
                    <span className="text-xs font-bold text-ink-600 block mb-1">Move Date</span>
                    <input
                      type="date"
                      value={form.move_date}
                      onChange={(e) => setForm((prev) => ({ ...prev, move_date: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-ink-200 bg-brand-tint/30 text-sm font-semibold text-ink-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs font-bold text-ink-600 block mb-1">Job Size</span>
                      <select
                        value={form.move_size}
                        onChange={(e) => setForm((prev) => ({ ...prev, move_size: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-ink-200 bg-brand-tint/30 text-sm font-semibold text-ink-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
                      >
                        <option value="">Select Size</option>
                        {hasCustomMoveSize ? (
                          <option value={currentMoveSize}>{currentMoveSize}</option>
                        ) : null}
                        {moveSizeOptions.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-xs font-bold text-ink-600 block mb-1">Job Type</span>
                      <select
                        value={form.move_type}
                        onChange={(e) => setForm((prev) => ({ ...prev, move_type: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-ink-200 bg-brand-tint/30 text-sm font-semibold text-ink-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
                      >
                        <option value="">Select Type</option>
                        {moveTypes.map((moveType) => (
                          <option key={moveType.id} value={moveType.id}>
                            {moveType.name || moveType.label || moveType.code}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-xs font-bold text-ink-600 block mb-1">Job Service</span>
                    <select
                      value={form.service_type}
                      onChange={(e) => setForm((prev) => ({ ...prev, service_type: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-ink-200 bg-brand-tint/30 text-sm font-semibold text-ink-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
                    >
                      <option value="">Select Service</option>
                      {serviceTypes.map((serviceType) => (
                        <option key={serviceType.id} value={serviceType.id}>
                          {serviceType.name || serviceType.label || serviceType.code}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs font-bold text-ink-600 block mb-1">Target Branch</span>
                    <select
                      value={form.branch}
                      onChange={(e) => setForm((prev) => ({ ...prev, branch: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-ink-200 bg-brand-tint/30 text-sm font-semibold text-ink-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
                    >
                      <option value="">Select Branch</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={String(branch.id)}>
                          {branch.name || `Branch #${branch.id}`}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs font-bold text-ink-600 block mb-1">Move Manager</span>
                    <select
                      value={form.assigned_to}
                      onChange={(e) => setForm((prev) => ({ ...prev, assigned_to: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-ink-200 bg-brand-tint/30 text-sm font-semibold text-ink-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {managerOptions.map((user) => (
                        <option key={user.id} value={String(user.id)}>
                          {getUserDisplayName(user)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

            </div>

            {/* Notes */}
            <label className="block">
              <span className="text-xs font-bold text-ink-600 block mb-1">Internal Notes</span>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-ink-200 bg-brand-tint/30 text-sm font-medium text-ink-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 placeholder-ink-400 transition-all"
                placeholder="Additional notes..."
              />
            </label>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 border-t border-ink-100 bg-white/95 backdrop-blur px-6 md:px-8 py-4 flex flex-col-reverse sm:flex-row gap-3 sm:items-center sm:justify-between shrink-0">
            <p className="text-xs font-semibold text-[#64748b]">
              Ready to submit this lead to the CRM.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl border border-ink-200 text-sm font-bold text-ink-700 bg-white hover:bg-page transition-colors cursor-pointer"
              >
                Cancel
              </button>
              {canCreateLead ? (
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-dark transition-colors disabled:opacity-60 inline-flex items-center gap-2 cursor-pointer shadow-md"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Create Lead
                </button>
              ) : null}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewLeadForm;
