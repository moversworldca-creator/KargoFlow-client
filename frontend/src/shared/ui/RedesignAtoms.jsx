import React, { useEffect, useRef, useState } from 'react';
import * as LucideIcons from 'lucide-react';
import AddressAutocomplete from './AddressAutocomplete';

const normalizeDisplayText = (value) => {
  const text = String(value || '').trim();
  if (!text || text === '-' || text === '—' || text.toLowerCase() === 'tbd') return '';
  return text;
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

const normalizeCountryToken = (value) => String(value || '').toLowerCase().trim();

const buildAddressParts = (point) => {
  const line1 = normalizeDisplayText(point?.line1);
  const city = normalizeDisplayText(point?.city);
  const state = normalizeDisplayText(point?.state);
  const zip = normalizeDisplayText(point?.zip);
  const country = normalizeDisplayText(point?.country);
  const line2 = normalizeDisplayText(point?.line2);

  const cleanCity = city.toLowerCase() === state.toLowerCase() ? '' : city;
  const locality = [cleanCity, [state, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');

  if (line1) {
    const includesCity = isCityInAddress(city, state, line1);
    const includesState = isStateInAddress(state, line1);
    const includesPostal = zip ? line1.toLowerCase().includes(zip.toLowerCase()) : false;
    const includesCountry = country ? line1.toLowerCase().includes(country.toLowerCase()) : false;

    let fallbackLine2 = '';
    if (!includesCity || !includesState || (zip && !includesPostal)) {
      const appendCity = includesCity ? '' : cleanCity;
      const appendState = includesState ? '' : state;
      const appendStateZip = [appendState, includesPostal ? '' : zip].filter(Boolean).join(' ');
      fallbackLine2 = [appendCity, appendStateZip].filter(Boolean).join(', ');
    }

    if (!line2 && !fallbackLine2 && country) {
      const normalizedCountry = normalizeCountryToken(country);
      const hasCanada = line1.toLowerCase().includes('canada');
      const hasUS =
        line1.toLowerCase().includes('usa') ||
        line1.toLowerCase().includes('united states') ||
        line1.toLowerCase().includes(', us');
      if (
        !includesCountry &&
        !((normalizedCountry === 'us' || normalizedCountry === 'usa' || normalizedCountry === 'united states') && hasCanada) &&
        !((normalizedCountry === 'canada' || normalizedCountry === 'ca') && hasUS)
      ) {
        fallbackLine2 = country;
      }
    }

    return {
      line1,
      line2: line2 || fallbackLine2,
    };
  }

  const fallbackLine1 = locality || country || line2;
  return {
    line1: fallbackLine1,
    line2: fallbackLine1 && line2 && line2 !== fallbackLine1 ? line2 : '',
  };
};

const getRouteLine = (point) => {
  return buildAddressParts(point);
};

export function Icon({ name, className = "w-4 h-4", strokeWidth = 2, size }) {
  const iconName = name
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  const LucideIcon = LucideIcons[iconName] || LucideIcons.HelpCircle;
  return <LucideIcon className={className} strokeWidth={strokeWidth} size={size} />;
}

const normalizeColorValue = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const shortHexMatch = raw.match(/^#([0-9a-f]{3})$/i);
  if (shortHexMatch) {
    return `#${shortHexMatch[1].split('').map((char) => char + char).join('')}`.toUpperCase();
  }
  const longHexMatch = raw.match(/^#([0-9a-f]{6})$/i);
  if (longHexMatch) {
    return `#${longHexMatch[1].toUpperCase()}`;
  }
  return raw;
};

const getCustomPillStyle = (color) => {
  const normalized = normalizeColorValue(color);
  if (!normalized) return null;
  return {
    color: normalized,
    backgroundColor: `color-mix(in srgb, ${normalized} 14%, white)`,
    borderColor: `color-mix(in srgb, ${normalized} 24%, white)`,
  };
};

const getCustomDotStyle = (color) => {
  const normalized = normalizeColorValue(color);
  if (!normalized) return null;
  return {
    backgroundColor: normalized,
    boxShadow: `0 0 0 3px color-mix(in srgb, ${normalized} 18%, transparent)`,
  };
};

export function StatusDot({ tone = "slate", color }) {
  const map = {
    sky:    "bg-sky-500 shadow-[0_0_0_3px_rgba(14,165,233,0.18)]",
    blue:   "bg-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.18)]",
    indigo: "bg-indigo-500 shadow-[0_0_0_3px_rgba(99,102,241,0.18)]",
    violet: "bg-violet-500 shadow-[0_0_0_3px_rgba(139,92,246,0.18)]",
    purple: "bg-purple-500 shadow-[0_0_0_3px_rgba(168,85,247,0.18)]",
    fuchsia:"bg-fuchsia-500 shadow-[0_0_0_3px_rgba(217,70,239,0.18)]",
    amber:  "bg-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.18)]",
    orange: "bg-orange-500 shadow-[0_0_0_3px_rgba(249,115,22,0.18)]",
    teal:   "bg-teal-500 shadow-[0_0_0_3px_rgba(20,184,166,0.18)]",
    cyan:   "bg-cyan-500 shadow-[0_0_0_3px_rgba(6,182,212,0.18)]",
    green:  "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]",
    good:   "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]",
    emerald:"bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]",
    warn:   "bg-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.18)]",
    rose:   "bg-rose-500 shadow-[0_0_0_3px_rgba(244,63,94,0.18)]",
    bad:    "bg-rose-500 shadow-[0_0_0_3px_rgba(244,63,94,0.18)]",
    red:    "bg-rose-500 shadow-[0_0_0_3px_rgba(244,63,94,0.18)]",
    dark:   "bg-slate-700 shadow-[0_0_0_3px_rgba(51,65,85,0.18)]",
    slate:  "bg-slate-400 shadow-[0_0_0_3px_rgba(148,163,184,0.18)]",
  };
  const customStyle = getCustomDotStyle(color);
  return <span className={`inline-block w-2 h-2 rounded-full ${customStyle ? '' : (map[tone] || map.slate)}`} style={customStyle || undefined} />;
}

export function Pill({ children, tone = "slate", className = "", color }) {
  const tones = {
    slate:   "bg-slate-100 text-slate-700 ring-slate-200",
    sky:     "bg-sky-50 text-sky-700 ring-sky-200",
    blue:    "bg-blue-50 text-blue-700 ring-blue-200",
    indigo:  "bg-indigo-50 text-indigo-700 ring-indigo-200",
    violet:  "bg-violet-50 text-violet-700 ring-violet-200",
    purple:  "bg-purple-50 text-purple-700 ring-purple-200",
    fuchsia: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200",
    teal:    "bg-teal-50 text-teal-700 ring-teal-200",
    cyan:    "bg-cyan-50 text-cyan-700 ring-cyan-200",
    amber:   "bg-amber-50 text-amber-700 ring-amber-200",
    orange:  "bg-orange-50 text-orange-700 ring-orange-200",
    green:   "bg-emerald-50 text-emerald-700 ring-emerald-200",
    good:    "bg-emerald-50 text-emerald-700 ring-emerald-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    rose:    "bg-rose-50 text-rose-700 ring-rose-200",
    red:     "bg-rose-50 text-rose-700 ring-rose-200",
    bad:     "bg-rose-50 text-rose-700 ring-rose-200",
    warn:    "bg-amber-50 text-amber-700 ring-amber-200",
    dark:    "bg-slate-900 text-white ring-slate-900",
    forest:  "bg-emerald-950/10 text-emerald-900 ring-emerald-950/20",
    ink:     "bg-slate-900 text-white ring-slate-900",
  };
  const customStyle = getCustomPillStyle(color);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${customStyle ? '' : (tones[tone] || tones.slate)} ${className}`}
      style={customStyle || undefined}
    >
      {children}
    </span>
  );
}

export function IconButton({ name, label, tone = "ghost", onClick, className = "", type = "button" }) {
  const tones = {
    ghost: "bg-white hover:bg-ink-50 text-black ring-1 ring-ink-100",
    tint:  "bg-brand-tint hover:bg-blue-100 text-brand-dark ring-1 ring-blue-100",
    solid: "bg-ink-900 hover:bg-ink-800 text-white",
    green: "bg-[#F5FEFA] hover:bg-[#e2f9ed] text-emerald-700 ring-1 ring-emerald-100/50",
  };
  return (
    <button
      type={type}
      aria-label={label}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition ${tones[tone] || tones.ghost} ${className}`}
    >
      <Icon name={name} className="w-[18px] h-[18px]" />
    </button>
  );
}

export function PrimaryBtn({ children, icon, onClick, className = "", disabled = false, loading = false, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-pop transition hover:bg-brand-dark active:translate-y-px disabled:opacity-50 disabled:pointer-events-none ${className}`}
    >
      {loading ? <LucideIcons.Loader2 className="w-4 h-4 animate-spin" /> : children}
      {!loading && icon && <Icon name={icon} className="w-4 h-4" />}
    </button>
  );
}

export function GhostBtn({ children, icon, onClick, className = "", tone = "default", disabled = false, type = "button" }) {
  const tones = {
    default: "bg-white text-black ring-ink-200 hover:bg-ink-50",
    danger:  "bg-white text-rose-600 ring-rose-200 hover:bg-rose-50",
    primary: "bg-white text-brand ring-brand/20 hover:bg-brand-tint",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold ring-1 ring-inset transition active:translate-y-px disabled:opacity-50 disabled:pointer-events-none ${tones[tone] || tones.default} ${className}`}
    >
      {icon && <Icon name={icon} className="w-4 h-4" />}
      {children}
    </button>
  );
}

export function StickyHeader({
  title,
  subtitle,
  status,
  statusTone,
  statusColor,
  id,
  onBack,
  actions = [],
  moreActions = [],
  moreLabel = '',
  transparent = false,
  fixed = false,
  sticky = true,
  branchLogoUrl = '',
}) {
  const positionClass = fixed ? "fixed top-0 left-0 right-0" : sticky ? "sticky top-0" : "relative";
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreRef = useRef(null);

  useEffect(() => {
    if (!isMoreOpen) return;
    const handleDocClick = (e) => {
      if (!moreRef.current) return;
      if (moreRef.current.contains(e.target)) return;
      setIsMoreOpen(false);
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, [isMoreOpen]);

  return (
    <header className={`${positionClass} z-30 border-b border-ink-100 ${transparent ? 'bg-transparent border-none shadow-none backdrop-blur-none' : 'bg-white/80 backdrop-blur-md'}`}>
      <div className="mx-auto flex max-w-8xl flex-wrap items-center gap-3 px-4  sm:py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            onClick={onBack}
            className="group inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-bold text-black hover:bg-ink-50 hover:text-black transition cursor-pointer"
          >
            <Icon name="arrow-left" className="w-4 h-4 transition group-hover:-translate-x-0.5 shrink-0" />
            {subtitle && (
              <>
                <span className="font-extrabold">{subtitle}</span>
                <span className="text-ink-300">/</span>
              </>
            )}
          </button>

          {branchLogoUrl ? (
            <img
              src={branchLogoUrl}
              alt="Branch logo"
              className="h-10 sm:h-12 w-20 max-w-[180px] object-contain shrink-0"
            />
          ) : null}
          <div className="hidden h-6 w-px bg-ink-100 sm:block" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[17px] font-bold tracking-tight text-black">{title}</h1>
              {status && (
                <Pill tone={statusTone || "amber"} color={statusColor}>
                  <StatusDot tone={statusTone || "amber"} color={statusColor} /> {status}
                </Pill>
              )}
              {/* {id && <span className="hidden text-[11px] font-mono text-ink-400 sm:inline">#{id}</span>} */}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {actions.map((action, idx) => (
            <React.Fragment key={idx}>
              {action.type === 'primary' ? (
                <PrimaryBtn icon={action.icon} onClick={action.onClick} loading={action.loading}>
                  {action.label}
                </PrimaryBtn>
              ) : (
                <GhostBtn tone={action.tone} icon={action.icon} onClick={action.onClick}>
                  {action.label}
                </GhostBtn>
              )}
            </React.Fragment>
          ))}
          <div className="relative" ref={moreRef}>
            {moreLabel ? (
              <button
                type="button"
                aria-label={moreLabel}
                onClick={() => setIsMoreOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-sm font-semibold text-black ring-1 ring-inset ring-ink-200 transition hover:bg-ink-50 active:translate-y-px"
              >
                <Icon name="more-horizontal" className="w-4 h-4" />
                <span>{moreLabel}</span>
                <Icon name={isMoreOpen ? "chevron-up" : "chevron-down"} className="w-4 h-4 text-ink-400" />
              </button>
            ) : (
              <IconButton
                name="more-horizontal"
                label="More"
                onClick={() => setIsMoreOpen((v) => !v)}
              />
            )}
            {isMoreOpen && moreActions.length > 0 && (
              <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-pop">
                {moreActions.map((item, idx) => {
                  if (item?.type === 'separator') {
                    return <div key={idx} className="h-px bg-ink-100 my-1" />;
                  }
                  if (item?.type === 'label') {
                    return (
                      <div
                        key={idx}
                        className="px-4 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-ink-400"
                      >
                        {item?.label || ''}
                      </div>
                    );
                  }
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setIsMoreOpen(false);
                        item?.onClick?.();
                      }}
                      className="w-full px-4 py-3 text-left text-sm font-semibold text-ink-900 hover:bg-ink-50 transition flex items-center gap-2"
                    >
                      {item?.icon && <Icon name={item.icon} className="w-4 h-4 text-ink-500" />}
                      <span className="truncate">{item?.label || 'Action'}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export function CustomerSection({ firstName, lastName, email, phone, editing, onToggleEdit, onChange }) {
  return (
    <article className="rounded-3xl border border-ink-100 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <span className="label-eyebrow text-ink-400">Customer Details</span>
        <button
          onClick={onToggleEdit}
          className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition ${
            editing ? "bg-brand text-white shadow-pop" : "bg-[#F5FEFA] text-emerald-700 hover:bg-[#e2f9ed]"
          }`}
        >
          <Icon name={editing ? "check" : "pencil"} className="w-3.5 h-3.5" />
          {editing ? "Done" : "Edit"}
        </button>
      </div>

      {editing ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-ink-400">First Name</label>
            <input
              className="w-full rounded-xl border-2 border-brand/10 bg-brand-tint/30 px-3 py-2 text-sm font-semibold text-ink-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/10 transition"
              value={firstName || ''}
              onChange={(e) => onChange('first_name', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-ink-400">Last Name</label>
            <input
              className="w-full rounded-xl border-2 border-brand/10 bg-brand-tint/30 px-3 py-2 text-sm font-semibold text-ink-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/10 transition"
              value={lastName || ''}
              onChange={(e) => onChange('last_name', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-ink-400">Email Address</label>
            <input
              className="w-full rounded-xl border-2 border-brand/10 bg-brand-tint/30 px-3 py-2 text-sm font-semibold text-ink-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/10 transition"
              value={email || ''}
              onChange={(e) => onChange('email', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-ink-400">Phone Number</label>
            <input
              className="w-full rounded-xl border-2 border-brand/10 bg-brand-tint/30 px-3 py-2 text-sm font-semibold text-ink-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/10 transition"
              value={phone || ''}
              onChange={(e) => onChange('phone', e.target.value)}
            />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white text-lg font-black">
            {firstName?.[0] || '?'}{lastName?.[0] || ''}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-extrabold text-ink-900 truncate">{firstName} {lastName}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-500">
              <span className="flex items-center gap-1.5"><Icon name="mail" className="w-3.5 h-3.5" /> {email || 'No email'}</span>
              <span className="flex items-center gap-1.5"><Icon name="phone" className="w-3.5 h-3.5" /> {phone || 'No phone'}</span>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export function RouteSection({
  origin,
  destination,
  editing,
  onStartEdit,
  onCancelEdit,
  onSave,
  onChange,
  onAddressPick,
  saving = false,
}) {
  const originDisplay = getRouteLine(origin);
  const destinationDisplay = getRouteLine(destination);

  return (
    <article className="rounded-3xl border border-ink-100 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <span className="label-eyebrow text-ink-400">Route Logistics</span>
        {editing ? (
          <div className="flex items-center gap-2">
            <GhostBtn onClick={onCancelEdit} disabled={saving}>Cancel</GhostBtn>
            <PrimaryBtn onClick={onSave} loading={saving}>Save changes</PrimaryBtn>
          </div>
        ) : (
          <button
            onClick={onStartEdit}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#F5FEFA] px-2.5 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-[#e2f9ed]"
          >
            <Icon name="pencil" className="w-3.5 h-3.5" />
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-ink-400">Origin Address</label>
            <AddressAutocomplete
              country="ca,us"
              className="w-full rounded-xl border-2 border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-900 placeholder:text-ink-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/10 transition"
              value={origin?.line1 || ''}
              onChange={(e) => onChange('origin_street', e.target.value)}
              onPick={(parts) => onAddressPick?.('origin', parts)}
              placeholder="Enter origin address"
            />
          </div>

          <div className="h-px bg-ink-100 my-4" />

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-ink-400">Destination Address</label>
            <AddressAutocomplete
              country="ca,us"
              className="w-full rounded-xl border-2 border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-900 placeholder:text-ink-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/10 transition"
              value={destination?.line1 || ''}
              onChange={(e) => onChange('destination_street', e.target.value)}
              onPick={(parts) => onAddressPick?.('destination', parts)}
              placeholder="Enter destination address"
            />
          </div>
        </div>
      ) : (
        <div className="relative">
          <span aria-hidden className="absolute left-[11px] top-7 bottom-7 w-px border-l-2 border-dashed border-ink-100" />
          <div className="relative flex gap-3 pb-6">
            <span className="relative z-10 mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
              <span className="h-2 w-2 rounded-full bg-white" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="label-eyebrow text-ink-400">Origin</div>
              <p className="mt-1 text-sm font-bold text-ink-900 truncate">{originDisplay.line1}</p>
              <p className="text-xs text-ink-500 truncate">{originDisplay.line2}</p>
            </div>
          </div>
          <div className="relative flex gap-3">
            <span className="relative z-10 mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
              <Icon name="map-pin" className="w-3 h-3" strokeWidth={3} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="label-eyebrow text-ink-400">Destination</div>
              <p className="mt-1 text-sm font-bold text-ink-900 truncate">{destinationDisplay.line1}</p>
              <p className="text-xs text-ink-500 truncate">{destinationDisplay.line2}</p>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
