import React, { useEffect, useState } from 'react';
import { 
  User, 
  MapPin, 
  Calendar, 
  Phone, 
  Mail, 
  Truck, 
  ArrowRight, 
  ArrowLeft, 
  Loader2, 
  CheckCircle, 
  FileText,
  Building,
  Info
} from 'lucide-react';
import { createLead, getBranches } from '../../../services/api';
import AddressAutocomplete from '../../../shared/ui/AddressAutocomplete';

const DEFAULT_MOVE_SIZES = [
  'Studio',
  '1 Bedroom Apartment',
  '2 Bedroom Apartment',
  '3 Bedroom Apartment',
  '3 Bedroom House',
  '4 Bedroom House',
  '5+ Bedroom House',
  'Office',
  'Commercial'
];

export default function PublicLeadIntakeForm({ onSubmit, onSuccess }) {
  const [step, setStep] = useState(1);
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Form State
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    service_type: 'moving',
    move_date: '',
    move_size: 'Studio',
    move_type: 'local',
    branch: '',
    notes: '',
    origin_street: '',
    origin_unit_number: '',
    origin_city: '',
    origin_state: '',
    origin_zip: '',
    destination_street: '',
    destination_unit_number: '',
    destination_city: '',
    destination_state: '',
    destination_zip: '',
  });

  // Load active branches
  useEffect(() => {
    let mounted = true;
    setLoadingBranches(true);
    getBranches()
      .then((res) => {
        if (!mounted) return;
        const list = Array.isArray(res) ? res : (Array.isArray(res?.results) ? res.results : []);
        setBranches(list.filter(b => b.is_active !== false));
      })
      .catch((err) => {
        console.error('Failed to load branches for intake:', err);
      })
      .finally(() => {
        if (mounted) setLoadingBranches(false);
      });
    return () => { mounted = false; };
  }, []);

  // Validation helper
  const getStepError = () => {
    if (step === 1) {
      if (!form.first_name.trim()) return 'First name is required.';
      if (!form.last_name.trim()) return 'Last name is required.';
      if (!form.email.trim() && !form.phone.trim()) return 'At least one contact method (Email or Phone) is required.';
      if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        return 'Please enter a valid email address.';
      }
      if (form.phone.trim()) {
        const digits = form.phone.replace(/\D/g, '');
        if (digits.length < 10) return 'Please enter a valid 10-digit phone number.';
      }
    }
    if (step === 2) {
      if (!form.move_date) return 'Please select your move date.';
      if (!form.branch) return 'Please select a branch closest to you.';
    }
    if (step === 3) {
      if (!form.origin_street.trim() || !form.origin_city.trim()) {
        return 'Pickup street address and city are required.';
      }
      if (!form.destination_street.trim() || !form.destination_city.trim()) {
        return 'Delivery street address and city are required.';
      }
    }
    return '';
  };

  const handleNext = () => {
    const err = getStepError();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(prev => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = getStepError();
    if (err) {
      setError(err);
      return;
    }

    setIsSubmitting(true);
    setError('');

    const payload = {
      ...form,
      branch: form.branch ? Number(form.branch) : null,
      status: 'new',
    };

    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        await createLead(payload);
      }
      setSuccess(true);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Lead submission failed:', err);
      const backendErr = err?.response?.data;
      if (backendErr && typeof backendErr === 'object') {
        const firstKey = Object.keys(backendErr)[0];
        const val = backendErr[firstKey];
        setError(Array.isArray(val) ? val[0] : String(val || 'Failed to submit quote request.'));
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-xl mx-auto bg-white border border-[#eef5fa] shadow-lift rounded-3xl p-10 text-center">
        <div className="mx-auto w-16 h-16 bg-[#eef5fa] text-[#10b981] flex items-center justify-center rounded-full mb-6">
          <CheckCircle size={32} />
        </div>
        <h2 className="text-2xl font-black text-[#111d23] mb-4">Quote Request Submitted!</h2>
        <p className="text-[#334155] leading-relaxed mb-6">
          Thank you for choosing <strong>Unique Movers</strong>. We have received your details and one of our relocation specialists will call or email you shortly.
        </p>
        <button
          onClick={() => {
            setForm({
              first_name: '',
              last_name: '',
              email: '',
              phone: '',
              service_type: 'moving',
              move_date: '',
              move_size: 'Studio',
              move_type: 'local',
              branch: '',
              notes: '',
              origin_street: '',
              origin_unit_number: '',
              origin_city: '',
              origin_state: '',
              origin_zip: '',
              destination_street: '',
              destination_unit_number: '',
              destination_city: '',
              destination_state: '',
              destination_zip: '',
            });
            setStep(1);
            setSuccess(false);
          }}
          className="px-6 py-3 bg-[#1f7ae0] hover:bg-[#1658a1] text-white font-bold rounded-xl shadow-sm transition-all"
        >
          Submit Another Request
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white border border-[#eef5fa] shadow-lift rounded-3xl overflow-hidden glass-strong transition-all duration-300">
      
      {/* Header with Visual Icon */}
      <div className="p-6 md:p-8 bg-gradient-to-br from-[#eef5fa] to-white border-b border-[#eef5fa] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white shadow-sm border border-[#eef5fa] text-[#1f7ae0] flex items-center justify-center rounded-2xl">
            {step === 1 && <User size={24} />}
            {step === 2 && <Calendar size={24} />}
            {step === 3 && <MapPin size={24} />}
            {step === 4 && <FileText size={24} />}
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-[#111d23] tracking-tight">
              {step === 1 && 'Let’s Get Started'}
              {step === 2 && 'Tell Us About Your Move'}
              {step === 3 && 'Addresses'}
              {step === 4 && 'Review & Submit'}
            </h1>
            <p className="text-xs text-[#64748b] font-medium tracking-wide uppercase mt-0.5">
              Step {step} of 4 — {step === 1 ? 'Contact Info' : step === 2 ? 'Move Specs' : step === 3 ? 'Route details' : 'Verification'}
            </p>
          </div>
        </div>
        <div className="hidden sm:flex gap-1.5">
          {[1, 2, 3, 4].map(idx => (
            <div 
              key={idx} 
              className={`h-2 w-8 rounded-full transition-all duration-300 ${
                idx <= step ? 'bg-[#1f7ae0]' : 'bg-[#eef5fa]'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="p-6 md:p-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-[#ef4444] text-sm font-semibold flex items-center gap-2">
            <Info size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* STEP 1: Contact Information */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-1.5">First Name</label>
                  <input
                    type="text"
                    required
                    value={form.first_name}
                    onChange={e => setForm({ ...form, first_name: e.target.value })}
                    className="w-full px-4 py-3 bg-[#eef5fa] border-2 border-[#bae0f5] text-[#111d23] rounded-xl focus:border-[#1f7ae0] focus:ring-2 focus:ring-[#1f7ae0]/10 focus:bg-white outline-none transition-all font-semibold"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-1.5">Last Name</label>
                  <input
                    type="text"
                    required
                    value={form.last_name}
                    onChange={e => setForm({ ...form, last_name: e.target.value })}
                    className="w-full px-4 py-3 bg-[#eef5fa] border-2 border-[#bae0f5] text-[#111d23] rounded-xl focus:border-[#1f7ae0] focus:ring-2 focus:ring-[#1f7ae0]/10 focus:bg-white outline-none transition-all font-semibold"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3.5 top-3.5 text-[#64748b]" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 bg-[#eef5fa] border-2 border-[#bae0f5] text-[#111d23] rounded-xl focus:border-[#1f7ae0] focus:ring-2 focus:ring-[#1f7ae0]/10 focus:bg-white outline-none transition-all font-semibold"
                    placeholder="john.doe@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3.5 top-3.5 text-[#64748b]" />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 bg-[#eef5fa] border-2 border-[#bae0f5] text-[#111d23] rounded-xl focus:border-[#1f7ae0] focus:ring-2 focus:ring-[#1f7ae0]/10 focus:bg-white outline-none transition-all font-semibold"
                    placeholder="416-323-7254"
                  />
                </div>
                <p className="text-[10px] text-[#64748b] mt-1.5">Please provide either a phone number or email address so we can send your quote.</p>
              </div>
            </div>
          )}

          {/* STEP 2: Move details */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-1.5">Service Type</label>
                  <select
                    value={form.service_type}
                    onChange={e => setForm({ ...form, service_type: e.target.value })}
                    className="w-full px-4 py-3 bg-[#eef5fa] border-2 border-[#bae0f5] text-[#111d23] rounded-xl focus:border-[#1f7ae0] focus:ring-2 focus:ring-[#1f7ae0]/10 focus:bg-white outline-none transition-all font-semibold"
                  >
                    <option value="moving">Full Service Moving</option>
                    <option value="delivery">Single Item Delivery</option>
                    <option value="packing">Packing Only</option>
                    <option value="storage">Storage Solutions</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-1.5">Move Date</label>
                  <input
                    type="date"
                    required
                    value={form.move_date}
                    onChange={e => setForm({ ...form, move_date: e.target.value })}
                    className="w-full px-4 py-3 bg-[#eef5fa] border-2 border-[#bae0f5] text-[#111d23] rounded-xl focus:border-[#1f7ae0] focus:ring-2 focus:ring-[#1f7ae0]/10 focus:bg-white outline-none transition-all font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-1.5">Move Size</label>
                  <select
                    value={form.move_size}
                    onChange={e => setForm({ ...form, move_size: e.target.value })}
                    className="w-full px-4 py-3 bg-[#eef5fa] border-2 border-[#bae0f5] text-[#111d23] rounded-xl focus:border-[#1f7ae0] focus:ring-2 focus:ring-[#1f7ae0]/10 focus:bg-white outline-none transition-all font-semibold"
                  >
                    {DEFAULT_MOVE_SIZES.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-1.5">Move Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['local', 'long_distance'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setForm({ ...form, move_type: opt })}
                        className={`py-3 px-2 text-center rounded-xl border-2 font-bold text-xs uppercase transition-all ${
                          form.move_type === opt 
                            ? 'bg-[#1f7ae0] border-[#1f7ae0] text-white shadow-sm' 
                            : 'bg-[#eef5fa] border-[#bae0f5] text-[#334155] hover:bg-white'
                        }`}
                      >
                        {opt.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-1.5">Select Nearest Branch</label>
                {loadingBranches ? (
                  <div className="flex items-center gap-2 py-3 text-sm text-[#64748b]">
                    <Loader2 size={16} className="animate-spin" /> Loading branches...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {branches.map(br => (
                      <button
                        key={br.id}
                        type="button"
                        onClick={() => setForm({ ...form, branch: String(br.id) })}
                        className={`p-4 text-left rounded-2xl border-2 transition-all flex flex-col justify-center ${
                          String(form.branch) === String(br.id)
                            ? 'bg-blue-50/50 border-[#1f7ae0] ring-1 ring-[#1f7ae0]'
                            : 'bg-white border-[#eef5fa] hover:border-[#bae0f5]'
                        }`}
                      >
                        <span className="font-bold text-sm text-[#111d23]">{br.name}</span>
                        {br.city && (
                          <span className="text-xs text-[#64748b] mt-0.5">{br.city}, {br.state}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Route Details */}
          {step === 3 && (
            <div className="space-y-6">
              
              {/* Origin Section */}
              <div className="bg-[#f8fafc]/50 p-4 sm:p-5 rounded-2xl border border-[#eef5fa]">
                <h3 className="font-bold text-[#111d23] mb-4 flex items-center gap-2 text-sm uppercase tracking-wider text-slate-800 border-b border-[#eef5fa] pb-2">
                  <MapPin size={16} className="text-[#1f7ae0]" /> Pickup Address (Origin)
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-1.5">Street Address</label>
                    <AddressAutocomplete
                      value={form.origin_street}
                      onChange={val => setForm(prev => ({ ...prev, origin_street: val }))}
                      onPick={parsed => {
                        setForm(prev => ({
                          ...prev,
                          origin_street: parsed.street,
                          origin_city: parsed.city,
                          origin_state: parsed.province,
                          origin_zip: parsed.postalCode,
                        }));
                      }}
                      placeholder="Start typing your street address..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-1.5">Apt/Unit #</label>
                      <input
                        type="text"
                        value={form.origin_unit_number}
                        onChange={e => setForm({ ...form, origin_unit_number: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#eef5fa] border-2 border-[#bae0f5] text-[#111d23] rounded-xl outline-none"
                        placeholder="e.g. 10B"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-1.5">City</label>
                      <input
                        type="text"
                        value={form.origin_city}
                        onChange={e => setForm({ ...form, origin_city: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#eef5fa] border-2 border-[#bae0f5] text-[#111d23] rounded-xl outline-none"
                        placeholder="Toronto"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-1.5">Province/State</label>
                      <input
                        type="text"
                        value={form.origin_state}
                        onChange={e => setForm({ ...form, origin_state: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#eef5fa] border-2 border-[#bae0f5] text-[#111d23] rounded-xl outline-none"
                        placeholder="ON"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-1.5">ZIP/Postal Code</label>
                      <input
                        type="text"
                        value={form.origin_zip}
                        onChange={e => setForm({ ...form, origin_zip: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#eef5fa] border-2 border-[#bae0f5] text-[#111d23] rounded-xl outline-none"
                        placeholder="M1X 1C9"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Destination Section */}
              <div className="bg-[#f8fafc]/50 p-4 sm:p-5 rounded-2xl border border-[#eef5fa]">
                <h3 className="font-bold text-[#111d23] mb-4 flex items-center gap-2 text-sm uppercase tracking-wider text-slate-800 border-b border-[#eef5fa] pb-2">
                  <MapPin size={16} className="text-[#f59e0b]" /> Delivery Address (Destination)
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-1.5">Street Address</label>
                    <AddressAutocomplete
                      value={form.destination_street}
                      onChange={val => setForm(prev => ({ ...prev, destination_street: val }))}
                      onPick={parsed => {
                        setForm(prev => ({
                          ...prev,
                          destination_street: parsed.street,
                          destination_city: parsed.city,
                          destination_state: parsed.province,
                          destination_zip: parsed.postalCode,
                        }));
                      }}
                      placeholder="Start typing your street address..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-1.5">Apt/Unit #</label>
                      <input
                        type="text"
                        value={form.destination_unit_number}
                        onChange={e => setForm({ ...form, destination_unit_number: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#eef5fa] border-2 border-[#bae0f5] text-[#111d23] rounded-xl outline-none"
                        placeholder="e.g. Penthouse"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-1.5">City</label>
                      <input
                        type="text"
                        value={form.destination_city}
                        onChange={e => setForm({ ...form, destination_city: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#eef5fa] border-2 border-[#bae0f5] text-[#111d23] rounded-xl outline-none"
                        placeholder="Toronto"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-1.5">Province/State</label>
                      <input
                        type="text"
                        value={form.destination_state}
                        onChange={e => setForm({ ...form, destination_state: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#eef5fa] border-2 border-[#bae0f5] text-[#111d23] rounded-xl outline-none"
                        placeholder="ON"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-1.5">ZIP/Postal Code</label>
                      <input
                        type="text"
                        value={form.destination_zip}
                        onChange={e => setForm({ ...form, destination_zip: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#eef5fa] border-2 border-[#bae0f5] text-[#111d23] rounded-xl outline-none"
                        placeholder="M5V 1V1"
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* STEP 4: Summary / notes */}
          {step === 4 && (
            <div className="space-y-6">
              
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#f8fafc] p-4 rounded-xl border border-[#eef5fa]">
                  <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider mb-2">Customer Details</div>
                  <div className="font-bold text-sm text-[#111d23]">{form.first_name} {form.last_name}</div>
                  <div className="text-xs text-[#334155] mt-1">{form.email || 'No email provided'}</div>
                  <div className="text-xs text-[#334155]">{form.phone || 'No phone provided'}</div>
                </div>
                <div className="bg-[#f8fafc] p-4 rounded-xl border border-[#eef5fa]">
                  <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider mb-2">Move Details</div>
                  <div className="text-xs text-[#334155]">Date: <strong className="text-[#111d23]">{form.move_date}</strong></div>
                  <div className="text-xs text-[#334155]">Size: <strong className="text-[#111d23]">{form.move_size}</strong></div>
                  <div className="text-xs text-[#334155]">Type: <strong className="text-[#111d23] uppercase">{form.move_type.replace('_', ' ')}</strong></div>
                  <div className="text-xs text-[#334155]">Branch: <strong className="text-[#111d23]">{branches.find(b => String(b.id) === form.branch)?.name || 'Selected branch'}</strong></div>
                </div>
              </div>

              {/* Route Summary */}
              <div className="bg-[#eef5fa] p-4 rounded-xl border border-[#bae0f5]">
                <div className="text-[10px] font-bold text-[#1f7ae0] uppercase tracking-wider mb-2">Planned Route</div>
                <div className="text-xs text-[#334155] leading-relaxed">
                  <div className="flex items-start gap-1">
                    <span className="font-bold text-[#111d23] shrink-0">Pickup:</span>
                    <span>{form.origin_street}{form.origin_unit_number && `, Apt ${form.origin_unit_number}`}, {form.origin_city}, {form.origin_state} {form.origin_zip}</span>
                  </div>
                  <div className="flex items-start gap-1 mt-2">
                    <span className="font-bold text-[#111d23] shrink-0">Delivery:</span>
                    <span>{form.destination_street}{form.destination_unit_number && `, Apt ${form.destination_unit_number}`}, {form.destination_city}, {form.destination_state} {form.destination_zip}</span>
                  </div>
                </div>
              </div>

              {/* Special Notes */}
              <div>
                <label className="block text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-1.5">Special Instructions / Inventory Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-4 py-3 bg-[#eef5fa] border-2 border-[#bae0f5] text-[#111d23] rounded-xl focus:border-[#1f7ae0] focus:ring-2 focus:ring-[#1f7ae0]/10 focus:bg-white outline-none transition-all font-semibold h-24 resize-none"
                  placeholder="e.g. Heavy piano on pickup, fragile antiques, packing needed for kitchen..."
                />
              </div>

            </div>
          )}

          {/* Buttons Navigation */}
          <div className="flex justify-between gap-3 pt-4 border-t border-[#eef5fa]">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className="px-5 py-3 border border-[#bae0f5] bg-white text-[#334155] hover:bg-[#eef5fa] font-bold rounded-xl flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                <ArrowLeft size={16} /> Back
              </button>
            ) : (
              <div /> // Spacer
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-3 bg-[#1f7ae0] hover:bg-[#1658a1] text-white font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all active:scale-95 hover:shadow-md"
              >
                Continue <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 bg-[#10b981] hover:bg-[#059669] text-white font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all active:scale-95 hover:shadow-md disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    Submit Request <CheckCircle size={16} />
                  </>
                )}
              </button>
            )}
          </div>

        </form>
      </div>

    </div>
  );
}
