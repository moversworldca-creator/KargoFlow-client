import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Icon, Pill, StatusDot, IconButton, PrimaryBtn, GhostBtn } from '../../../shared/ui/RedesignAtoms';
import InlineEdit from '../../../shared/ui/InlineEdit';
import RichTextEditor from '../../../shared/ui/RichTextEditor';
import AsyncSelect from '../../../shared/ui/AsyncSelect';
import { getLookupUsersPage } from '../../../services/api';
import {
  extractVisibleTextFromHtml,
  normalizePreviewHtml,
} from '../utils/emailPreview';

const normalizeDisplayText = (value) => {
  const text = String(value || '').trim();
  if (!text || text === '-' || text === '—' || text.toLowerCase() === 'tbd') return '';
  return text.trim().replace(/^[,\s|-]+|[,\s|-]+$/g, '');
};

const normalizeAddressCompareText = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const STATE_NAMES = {
  bc: 'british columbia',
  ab: 'alberta',
  on: 'ontario',
  qc: 'quebec',
  ns: 'nova scotia',
  nb: 'new brunswick',
  mb: 'manitoba',
  pe: 'prince edward island',
  sk: 'saskatchewan',
  nl: 'newfoundland and labrador',
  yt: 'yukon',
  nt: 'northwest territories',
  nu: 'nunavut',
  ca: 'california',
  ny: 'new york',
  tx: 'texas',
  fl: 'florida',
  wa: 'washington',
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
const isDefaultUSCountry = (value) => ['us', 'usa', 'united states'].includes(normalizeCountryToken(value));

const stripTrailingUS = (str) => String(str || '').replace(/(?:,\s*(?:US|USA|United States))$/i, '').trim();

const formatAddressBlock = (address) => {
  const line1 = stripTrailingUS(normalizeDisplayText(address?.address_line1 || address?.street));
  // const city = normalizeDisplayText(address?.city);
  // const state = normalizeDisplayText(address?.state);
  // const country = normalizeDisplayText(address?.country);
  // const cleanCity = city.toLowerCase() === state.toLowerCase() ? '' : city;
  // const locality = [cleanCity, state].filter(Boolean).join(', ');

  if (!line1) {
    return {
      line1: locality || country,
      line2: '',
    };
  }

  const normalizedLine1 = line1.toLowerCase();
  const normalizedLine1Compact = normalizeAddressCompareText(line1);
  const includesCity = isCityInAddress(city, state, line1);
  const includesState = isStateInAddress(state, line1);
  const includesCountry = country ? normalizedLine1.includes(country.toLowerCase()) : false;
  const normalizedLocality = normalizeAddressCompareText(locality);
  const localityRepresented =
    (includesCity && includesState) ||
    (normalizedLocality && normalizedLine1Compact.includes(normalizedLocality));

  const extraParts = [];
  if (locality && !localityRepresented) {
    const appendCity = includesCity ? '' : cleanCity;
    const appendState = includesState ? '' : state;
    const appendLocality = [appendCity, appendState].filter(Boolean).join(', ');
    if (appendLocality) {
      extraParts.push(appendLocality);
    }
  }
  const normalizedCountry = normalizeCountryToken(country);
  const hasCanada = normalizedLine1.includes('canada');
  const hasUS =
    normalizedLine1.includes('usa') ||
    normalizedLine1.includes('united states') ||
    normalizedLine1.includes(', us');
  let appendCountry = country;
  if (includesCountry) {
    appendCountry = '';
  } else if (isDefaultUSCountry(country)) {
    appendCountry = '';
  } else if (normalizedCountry === 'us' || normalizedCountry === 'usa' || normalizedCountry === 'united states') {
    if (hasCanada) appendCountry = '';
  } else if (normalizedCountry === 'canada' || normalizedCountry === 'ca') {
    if (hasUS) appendCountry = '';
  }

  if (appendCountry) {
    extraParts.push(appendCountry);
  }

  return {
    line1,
    line2: extraParts.join(', '),
  };
};

const normalizeWhitespace = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const dedupeRepeatedSentences = (value) => {
  const text = normalizeWhitespace(value);
  if (!text) return '';

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean);

  if (sentences.length < 2) return text;

  const deduped = [];
  for (const sentence of sentences) {
    if (deduped[deduped.length - 1] === sentence) continue;
    deduped.push(sentence);
  }
  return deduped.join(' ');
};

const getActivityEmailPreviewText = (activity) => {
  const rawPayload = activity?.payload?.raw_payload || {};
  const fromHtml = dedupeRepeatedSentences(
    extractVisibleTextFromHtml(
      normalizePreviewHtml(
        activity?.email_log_details?.preview_html ||
        activity?.email_log_details?.body_html ||
        activity?.email_log_details?.body_text ||
        rawPayload?.data?.content?.html ||
        rawPayload?.data?.content?.body_html ||
        rawPayload?.data?.content?.text ||
        rawPayload?.data?.content?.body ||
        rawPayload?.data?.content?.plain ||
        activity?.body_html ||
        activity?.description ||
        activity?.content ||
        ''
      )
    )
  );
  if (fromHtml) return fromHtml;

  return dedupeRepeatedSentences(
    activity?.email_log_details?.body_text ||
    activity?.email_log_details?.text_body ||
    activity?.email_log_details?.description ||
    rawPayload?.data?.content?.text ||
    rawPayload?.data?.content?.body ||
    rawPayload?.data?.content?.body_text ||
    rawPayload?.data?.content?.plain ||
    activity?.description ||
    activity?.content ||
    ''
  );
};

const getActivityNoteText = (activity) =>
  String(
    activity?.description ||
    activity?.content ||
    activity?.call_log_details?.disposition ||
    activity?.call_log_details?.duration_seconds ||
    activity?.body_html ||
    activity?.body ||
    activity?.notes ||
    activity?.message ||
    activity?.subject ||
    activity?.title ||
    ''
  ).trim();

const getActivityEmailRecipient = (activity) =>
  String(activity?.email_log_details?.to_email || activity?.email_log_details?.recipient_email || activity?.to_email || '').trim();

const formatEventTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatEmailStatusLabel = (value) =>
  String(value || '')
    .replace(/[_.-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());

const formatPhoneDisplay = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length > 10) {
    const localDigits = digits.slice(-10);
    const countryDigits = digits.slice(0, -10);
    const formattedLocal = `(${localDigits.slice(0, 3)}) ${localDigits.slice(3, 6)}-${localDigits.slice(6)}`;
    return countryDigits ? `+${countryDigits} ${formattedLocal}` : formattedLocal;
  }
  return raw;
};

const getEmailLifecycleState = (activity) => {
  const emailLog = activity?.email_log_details || {};
  const status = String(emailLog?.status || activity?.status || '').toLowerCase();
  const errorMessage = String(emailLog?.error_message || activity?.error_message || '');
  const isQueued = status === 'pending' && errorMessage.startsWith('queued:');
  const timeline = [
    emailLog?.delivered_at ? `Delivered ${formatEventTime(emailLog.delivered_at)}` : '',
    emailLog?.opened_at ? `Opened ${formatEventTime(emailLog.opened_at)}` : '',
    emailLog?.clicked_at ? `Clicked ${formatEventTime(emailLog.clicked_at)}` : '',
    emailLog?.bounced_at ? `Bounced ${formatEventTime(emailLog.bounced_at)}` : '',
    emailLog?.complained_at ? `Complained ${formatEventTime(emailLog.complained_at)}` : '',
  ].filter(Boolean);

  if (isQueued) return { label: 'Queued', tone: 'amber', timeline };
  if (emailLog?.complained_at) return { label: 'Complained', tone: 'rose', timeline };
  if (emailLog?.bounced_at) return { label: 'Bounced', tone: 'rose', timeline };
  if (emailLog?.clicked_at) return { label: 'Clicked', tone: 'blue', timeline };
  if (emailLog?.opened_at) return { label: 'Opened', tone: 'green', timeline };
  if (emailLog?.delivered_at) return { label: 'Delivered', tone: 'green', timeline };
  if (status === 'pending') return { label: 'Sending', tone: 'amber', timeline };
  if (status === 'sent') return { label: 'Sent', tone: 'blue', timeline };
  if (status === 'delivered') return { label: 'Delivered', tone: 'green', timeline };
  if (status === 'opened') return { label: 'Opened', tone: 'green', timeline };
  if (status === 'clicked') return { label: 'Clicked', tone: 'blue', timeline };
  if (status === 'received') return { label: 'Received', tone: 'blue', timeline };
  if (status === 'failed') return { label: 'Failed', tone: 'rose', timeline };
  if (status === 'bounced') return { label: 'Bounced', tone: 'rose', timeline };
  if (status === 'complained') return { label: 'Complained', tone: 'rose', timeline };
  if (status) return { label: formatEmailStatusLabel(status), tone: 'amber', timeline };
  return null;
};

/* Customer Card — Just the customer details */
const formatPhoneNumber = (phone) => {
  if (!phone) return phone;
  const cleaned = ("" + phone).replace(/\D/g, "");
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return "(" + match[1] + ") " + match[2] + "-" + match[3];
  }
  return phone;
};

export function CustomerCard({
  customerName,
  salesNumber,
  title,
  email,
  phone,
  location,
  onInlineSave,
  firstName,
  lastName,
  onCustomerChange,
  onAddFollowup,
  onManageContacts,
  additionalContacts = [],
}) {
  const [copiedField, setCopiedField] = useState(null);
  const displayPhone = formatPhoneDisplay(phone);

  const handleCopy = (type, text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(type);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <>
      <article className="rounded-xl border border-slate-200 bg-white shadow-sm h-full flex flex-col overflow-hidden">
        <div className="bg-[#EBF3FA] text-[#133559] border-b border-blue-100 px-3 py-2 flex flex-wrap items-center justify-between gap-3">
          <span className="label-eyebrow text-[#133559]">Customer</span>
          <div className="flex flex-wrap items-center justify-end gap-2">
          </div>
        </div>
        <div className="p-3 flex flex-col flex-1">

          <>
            <div className="mt-3 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="relative shrink-0">
                  <div
                    className="flex h-16 min-w-[4rem] flex-col items-center justify-center rounded-lg shadow-[0_0_15px_#fcb87380] p-[2px]"
                    style={{ background: 'linear-gradient(90deg, #fcb873, #fedfdc)' }}
                  >
                    <div className="flex h-full w-full flex-col items-center justify-center rounded-md bg-[#fef4ea] px-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-black">Lead</span>
                      <span className="font-mono text-xl font-black leading-none tracking-tight text-slate-900">{salesNumber}</span>
                    </div>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="flex flex-wrap items-center text-lg lg:text-xl 2xl:text-2xl font-black tracking-tight text-slate-900 leading-tight w-full break-words gap-x-1">
                    <InlineEdit value={firstName} placeholder="First Name" onSave={(val) => onInlineSave('first_name', val)} className="break-words" />
                    <InlineEdit
                      value={lastName}
                      placeholder="Add last name"
                      renderDisplay={(value) => value || (
                        <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-transparent bg-transparent px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300 opacity-60 not-italic transition-colors group-hover:border-slate-200 group-hover:bg-slate-50 group-hover:text-slate-400 group-hover:opacity-100">
                          <span className="text-xs leading-none">+</span>
                          <span>Add last name</span>
                        </span>
                      )}
                      onSave={(val) => onInlineSave('last_name', val)}
                      className="break-words"
                    />
                  </h2>
                  <p className="truncate text-sm font-semibold text-black mt-1">{title}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <button
                  onClick={onAddFollowup}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-brand-tint)] px-3 py-1.5 text-xs font-bold text-brand-dark border border-blue-100 transition duration-150 ease-in-out hover:bg-blue-100 hover:border-blue-200 shadow-sm"
                >
                  <Icon name="calendar-plus" className="w-4 h-4 text-brand-dark" /> Follow-up
                </button>
                {onManageContacts && (
                  <button
                    type="button"
                    onClick={onManageContacts}
                    className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold text-black transition hover:opacity-90 shadow-md"
                    style={{ background: 'linear-gradient(90deg, #fcb873, #fedfdc)' }}
                  >
                    <Icon name="users" className="w-4 h-4 text-black" /> Contacts ({additionalContacts.length})
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-start gap-x-6 gap-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-black">
                  <Icon name="mail" className="w-4 h-4" />
                </div>
                <div className="flex min-w-0 items-center gap-2 overflow-hidden h-8">
                  <InlineEdit
                    value={email}
                    type="email"
                    placeholder="Add email"
                    onSave={(val) => onInlineSave('email', val)}
                    className="max-w-full truncate font-semibold text-slate-700"
                    inputClassName="min-w-[220px] text-sm font-semibold"
                  />
                  {email && (
                    <button
                      type="button"
                      onClick={() => handleCopy('email', email)}
                      className="shrink-0 text-black hover:text-brand transition cursor-pointer"
                      title="Copy email"
                    >
                      <Icon name={copiedField === 'email' ? 'check' : 'copy'} className={`w-3.5 h-3.5 ${copiedField === 'email' ? 'text-emerald-500' : ''}`} />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-black">
                  <Icon name="phone" className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 h-8">
                    <InlineEdit
                      value={displayPhone}
                      type="tel"
                      placeholder="Add phone"
                      onSave={(val) => onInlineSave('phone', val)}
                      renderDisplay={formatPhoneNumber}
                      className="max-w-full truncate font-bold text-slate-900"
                      inputClassName="min-w-[160px] text-sm font-bold"
                    />
                    {phone && (
                      <button
                        type="button"
                        onClick={() => handleCopy('phone', phone)}
                        className="shrink-0 text-black hover:text-brand transition cursor-pointer"
                        title="Copy phone"
                      >
                        <Icon name={copiedField === 'phone' ? 'check' : 'copy'} className={`w-3.5 h-3.5 ${copiedField === 'phone' ? 'text-emerald-500' : ''}`} />
                      </button>
                    )}
                  </div>
                  {location && <span className="text-[11px] font-medium text-black truncate">{location}</span>}
                </div>
              </div>
            </div>


          </>
        </div>
      </article>
    </>
  );
}

/* Planned Move Card — Just the move details */
const formatTimeAMPM = (timeStr) => {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
};

const getOffsetDateStr = (dateStr, daysOffset) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + daysOffset);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getDayHeader = (dateStr) => {
  if (!dateStr) return { weekday: '', dayNum: '' };
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
  const dayNum = date.toLocaleDateString('en-US', { day: '2-digit' });
  return { weekday, dayNum };
};

const formatSchedulerDate = (dateStr, options = { month: 'long', day: 'numeric', year: 'numeric' }) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', options);
};

const parseDateOnly = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = String(dateStr).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

export function PlannedMoveCard({
  plannedMove,
}) {
  const {
    moveDate,
    moveDateTime,
    truckCount,
    daysUntilMove,
    crewSize,
    estHours,
    saving,
    onSave,
    onStartEdit,
    onCancelEdit,
    onClearSchedule,
    onMoveDateChange,
    isLeadPath,
    draftArrivalWindowStart,
    draftArrivalWindowEnd,
    onArrivalWindowChange,
    availabilityData,
    isAvailabilityLoading,
    branchName,
    hasBranch,
    fetchAvailability,
    moveSizeLabel,
    selectedJobId,
    selectedJob,
    subJobs,
    onSelectedJobChange,
  } = plannedMove || {};
  const dateObj = parseDateOnly(moveDate);
  const month = dateObj ? dateObj.toLocaleString('default', { month: 'short' }).toUpperCase() : 'TBD';
  const day = dateObj ? dateObj.getDate() : '--';
  const weekday = dateObj ? dateObj.toLocaleString('default', { weekday: 'short' }).toUpperCase() : '---';

  const modalDateInputRef = useRef(null);

  const [viewCenterDate, setViewCenterDate] = useState(() => {
    return moveDate ? moveDate.substring(0, 10) : new Date().toISOString().split('T')[0];
  });
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);

  useEffect(() => {
    if (moveDate) {
      setViewCenterDate(moveDate.substring(0, 10));
    }
  }, [moveDate]);

  const showDatePicker = (targetRef) => {
    if (targetRef.current) {
      try {
        targetRef.current.showPicker();
      } catch (err) {
        targetRef.current.focus();
      }
    }
  };

  const handlePagePrev = () => {
    const newDate = getOffsetDateStr(viewCenterDate, -5);
    setViewCenterDate(newDate);
    fetchAvailability?.(newDate);
  };

  const handlePageNext = () => {
    const newDate = getOffsetDateStr(viewCenterDate, 5);
    setViewCenterDate(newDate);
    fetchAvailability?.(newDate);
  };

  const dayOffsets = [-2, -1, 0, 1, 2];
  const daysToRender = dayOffsets.map((offset) => {
    const dateStr = getOffsetDateStr(viewCenterDate, offset);
    const dayData = availabilityData?.days?.find((d) => d.date === dateStr);
    return {
      date: dateStr,
      dayData,
    };
  });
  const selectedDateKey = moveDate ? moveDate.substring(0, 10) : '';
  const selectedDayData = daysToRender.find((day) => day.date === selectedDateKey)?.dayData || null;
  const selectedAvailableCount = selectedDayData?.slots?.filter((slot) => slot.available).length || 0;
  const selectedJobLabel = selectedJob
    ? `${selectedJob.sub_job_number || selectedJob.display_number || `#${selectedJob.id}`} - ${selectedJob.title || selectedJob.service_type_label || selectedJob.service_type || 'Job'}`
    : '';
  const selectedWindowLabel =
    draftArrivalWindowStart && draftArrivalWindowEnd
      ? `${formatTimeAMPM(draftArrivalWindowStart)} - ${formatTimeAMPM(draftArrivalWindowEnd)}`
      : 'No time selected';
  const canOpenScheduler = !isLeadPath && hasBranch;
  const openSchedulerPopup = () => {
    if (!canOpenScheduler) return;
    onStartEdit?.();
    const centerDate = moveDate ? moveDate.substring(0, 10) : viewCenterDate;
    if (!moveDate && centerDate) {
      fetchAvailability?.(centerDate);
    }
    setIsAvailabilityModalOpen(true);
  };
  const closeSchedulerPopup = () => {
    onCancelEdit?.();
    setIsAvailabilityModalOpen(false);
  };
  const applyScheduler = async () => {
    const saved = await onSave?.();
    if (saved !== false) {
      setIsAvailabilityModalOpen(false);
    }
  };
  const clearSchedule = async () => {
    const cleared = await onClearSchedule?.();
    if (cleared !== false) {
      setIsAvailabilityModalOpen(false);
    }
  };

  return (
    <>
      <article className="rounded-xl border border-slate-200 bg-white shadow-sm h-full flex flex-col overflow-hidden">
        <div className="bg-[#EBF3FA] text-[#133559] border-b border-blue-100 px-3 py-2 flex flex-wrap items-center justify-between gap-3">
          <span className="label-eyebrow text-[#133559]">Planned move</span>
        </div>
        <div className="p-3 flex flex-col flex-1">
          <button
            type="button"
            onClick={openSchedulerPopup}
            disabled={!canOpenScheduler}
            className={`mt-4 flex items-start justify-between gap-4 rounded-xl text-left transition duration-150 w-full ${canOpenScheduler ? 'group cursor-pointer hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand/15' : 'cursor-default'
              }`}
          >
            <div className="flex items-start gap-4 min-w-0 flex-1">
              <div className="flex min-w-[64px] flex-col items-center justify-center rounded-xl border-2 border-blue-100 bg-blue-50 px-3 py-2 shadow-sm shrink-0">
                <div className="text-[10px] font-black tracking-widest text-brand">{month}</div>
                <div className="text-3xl font-black leading-none tracking-tight text-brand my-1">{day}</div>
                <div className="text-[10px] font-bold text-brand uppercase">{weekday}</div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-lg lg:text-xl 2xl:text-2xl font-black tracking-tight text-brand leading-tight truncate whitespace-nowrap">
                  {dateObj ? dateObj.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'TBD'}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-black font-medium">
                  <Icon name="clock" className="w-4 h-4 text-black shrink-0" />
                  <span className="truncate">
                    {!isLeadPath && draftArrivalWindowStart && draftArrivalWindowEnd ? (
                      <span>Arrival <span className="font-bold text-slate-800">{formatTimeAMPM(draftArrivalWindowStart)} - {formatTimeAMPM(draftArrivalWindowEnd)}</span></span>
                    ) : (
                      <span>Crew <span className="font-bold text-slate-800">{moveDateTime || '8:00 AM'}</span></span>
                    )}
                  </span>
                  {truckCount && (
                    <>
                      <span className="text-black hidden sm:inline">·</span>
                      <span className="inline-flex items-center gap-1 shrink-0">
                        <Icon name="truck" className="w-3.5 h-3.5" />
                        {truckCount}-truck job
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col shrink-0 items-end gap-2">
              {daysUntilMove !== null && (
                <div className="flex flex-col items-center justify-center rounded-xl bg-emerald-50/50 px-4 py-3 ring-1 ring-emerald-100 flex-1 sm:flex-initial">
                  <div className="text-emerald-700 text-xl font-black leading-none">{daysUntilMove}</div>
                  <div className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mt-0.5">Days</div>
                </div>
              )}
              {moveSizeLabel && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-blue-100 bg-[var(--color-brand-tint)] px-4 py-3 flex-1 sm:flex-initial transition duration-150 ease-in-out">
                  <div className="text-slate-900 text-sm font-black leading-tight text-center">{moveSizeLabel}</div>
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Move Size</div>
                </div>
              )}
            </div>
          </button>
        </div>
      </article>
      {!isLeadPath && hasBranch && isAvailabilityModalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px] animate-in fade-in duration-200">
          <button
            type="button"
            className="absolute inset-0"
            onClick={closeSchedulerPopup}
            aria-label="Close availability scheduler"
          />
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-black">Availability Scheduler</div>
                <div className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                  {selectedDateKey ? formatSchedulerDate(selectedDateKey) : 'Select a service date'}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-black">
                  {branchName ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 ring-1 ring-slate-200">
                      <Icon name="building-2" className="h-3.5 w-3.5 text-black" />
                      {branchName}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 ring-1 ring-slate-200">
                    <Icon name="clock-3" className="h-3.5 w-3.5 text-black" />
                    {selectedWindowLabel}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 ring-1 ring-slate-200">
                    <Icon name="sparkles" className="h-3.5 w-3.5 text-amber-500" />
                    {selectedAvailableCount} open slot{selectedAvailableCount === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={closeSchedulerPopup}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-black transition hover:bg-slate-50 hover:text-slate-800"
              >
                <Icon name="x" className="w-4 h-4" />
              </button>
            </div>

            <div className="border-b border-slate-200 px-6 py-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr] lg:items-end">
                {Array.isArray(subJobs) && subJobs.length > 1 ? (
                  <div className="space-y-1 lg:col-span-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-black">Sub Job</label>
                    <select
                      value={selectedJobId || ''}
                      onChange={(e) => onSelectedJobChange?.(e.target.value)}
                      className="w-full rounded-2xl border border-[#cfdcf0] bg-white px-4 py-3 text-base font-semibold text-slate-800 outline-none shadow-sm transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                    >
                      {subJobs.map((job) => (
                        <option key={job.id} value={String(job.id)}>
                          {job.sub_job_number || job.display_number || `#${job.id}`} - {job.title || job.service_type_label || job.service_type || 'Job'}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-black">Service Date</label>
                  <div className="flex items-center overflow-hidden rounded-2xl border border-[#cfdcf0] bg-white shadow-sm transition focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10">
                    <input
                      type="date"
                      ref={modalDateInputRef}
                      className="w-full bg-transparent px-4 py-3 text-base font-semibold text-slate-800 outline-none"
                      value={moveDate ? moveDate.substring(0, 10) : ''}
                      onChange={(e) => onMoveDateChange(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => showDatePicker(modalDateInputRef)}
                      className="flex shrink-0 items-center justify-center border-l border-[#d9e5f4] bg-[#f6f9fd] px-4 py-3 text-brand transition hover:bg-[#edf4fb]"
                    >
                      <Icon name="calendar" className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-black">Browse Windows</div>
                    <div className="mt-0.5 text-sm font-semibold text-slate-700">Move across the 5-day availability range</div>
                  </div>
                  <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={handlePagePrev}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-black transition hover:bg-slate-100 active:bg-slate-200"
                      title="Previous 5 days"
                    >
                      <Icon name="chevron-left" className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handlePageNext}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-black transition hover:bg-slate-100 active:bg-slate-200"
                      title="Next 5 days"
                    >
                      <Icon name="chevron-right" className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative flex-1 overflow-y-auto px-6 py-5">
              {isAvailabilityLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
                  <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-black shadow-sm">
                    <Icon name="loader-2" className="h-4 w-4 animate-spin shrink-0 text-brand" />
                    <span>Updating availability...</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 xl:grid-cols-5">
                {daysToRender.map((day) => {
                  const { weekday: wDay, dayNum } = getDayHeader(day.date);
                  const isSelectedDate = day.date === selectedDateKey;
                  const slots = day.dayData?.slots || [];
                  const availableCount = slots.filter((slot) => slot.available).length;
                  const isClosed = day.dayData?.closed || slots.length === 0;

                  return (
                    <div
                      key={day.date}
                      className={`flex min-h-[440px] flex-col rounded-[1.4rem] border p-3 transition-all ${isSelectedDate
                        ? 'border-brand bg-[#f7fbff] shadow-md ring-2 ring-brand/10'
                        : 'border-slate-200 bg-slate-50/35 hover:border-slate-300'
                        }`}
                    >
                      <button
                        type="button"
                        onClick={() => onMoveDateChange(day.date)}
                        className="w-full rounded-2xl text-left transition"
                      >
                        <div className="flex items-start justify-between gap-2 border-b border-slate-200/80 pb-3">
                          <div>
                            <div className={`text-base font-black tracking-tight ${isSelectedDate ? 'text-brand' : 'text-slate-800'}`}>
                              {wDay} {dayNum}
                            </div>
                            <div className="mt-0.5 text-[11px] font-medium text-black">
                              {formatSchedulerDate(day.date, { month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${isSelectedDate
                            ? 'bg-brand text-white'
                            : isClosed
                              ? 'bg-slate-200 text-black'
                              : 'bg-emerald-50 text-emerald-700'
                            }`}>
                            {isClosed ? 'Closed' : `${availableCount} open`}
                          </span>
                        </div>
                      </button>

                      <div className="mt-3 space-y-2.5">
                        {slots.length > 0 ? (
                          slots.map((slot, idx) => {
                            const isSelected = isSelectedDate && draftArrivalWindowStart === slot.start && draftArrivalWindowEnd === slot.end;
                            const isAvailable = slot.available;

                            return (
                              <button
                                key={idx}
                                type="button"
                                disabled={!isAvailable}
                                onClick={() => {
                                  onArrivalWindowChange(slot.start, slot.end);
                                  onMoveDateChange(day.date);
                                }}
                                className={`w-full rounded-2xl border px-3 py-3 text-left transition-all ${isSelected
                                  ? 'border-brand bg-brand text-white shadow-md ring-1 ring-brand'
                                  : isAvailable
                                    ? 'border-slate-200 bg-white text-slate-800 shadow-sm hover:border-brand/40 hover:bg-brand-tint/30'
                                    : 'cursor-not-allowed border-slate-100 bg-slate-50 text-black/70'
                                  }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <div className={`text-sm font-black leading-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                                      {formatTimeAMPM(slot.start)}
                                    </div>
                                    <div className={`mt-0.5 text-xs font-semibold ${isSelected ? 'text-white/80' : 'text-black'}`}>
                                      to {formatTimeAMPM(slot.end)}
                                    </div>
                                  </div>
                                  <div className={`text-right text-[10px] font-bold uppercase tracking-[0.16em] ${isSelected ? 'text-white/75' : isAvailable ? 'text-emerald-600' : 'text-black'}`}>
                                    {isAvailable ? `${slot.remaining_capacity}/${slot.capacity} left` : 'Full'}
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 text-center text-[11px] font-semibold text-black">
                            No scheduling windows configured
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <details className="group">
                  <summary className="flex list-none items-center gap-1 select-none text-[11px] font-bold text-black cursor-pointer">
                    <span className="text-[8px] transition-transform group-open:rotate-90">▶</span> Custom Time Override
                  </summary>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-black">Start Time</label>
                      <input
                        type="time"
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-brand"
                        value={draftArrivalWindowStart || ''}
                        onChange={(e) => onArrivalWindowChange(e.target.value, draftArrivalWindowEnd || '')}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-black">End Time</label>
                      <input
                        type="time"
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-brand"
                        value={draftArrivalWindowEnd || ''}
                        onChange={(e) => onArrivalWindowChange(draftArrivalWindowStart || '', e.target.value)}
                      />
                    </div>
                  </div>
                </details>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
              <div className="text-sm font-medium text-black">
                {(selectedJobLabel || 'Selected job') + ': '}
                <span className="font-bold text-slate-800">{selectedWindowLabel}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={closeSchedulerPopup}
                  className="px-4 py-2 text-sm font-semibold text-black transition hover:text-slate-800"
                >
                  Close
                </button>
                {(moveDate || draftArrivalWindowStart || draftArrivalWindowEnd) && onClearSchedule ? (
                  <button
                    type="button"
                    onClick={clearSchedule}
                    disabled={saving}
                    className="rounded-lg border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Clear Schedule
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={applyScheduler}
                  disabled={saving}
                  className="flex min-w-[84px] items-center justify-center rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white shadow transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? <Icon name="loader-2" className="h-4 w-4 animate-spin" /> : 'Apply'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function CardCustomerMoveDate(props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <CustomerCard {...props} />
      <PlannedMoveCard {...props} />
    </div>
  );
}

/* Sidebar Route mini — origin & destination only */
export function RouteSidebar({ origin, destination, onOpenMap }) {
  const originBlock = formatAddressBlock(origin);
  const destinationBlock = formatAddressBlock(destination);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col">
      <div className="bg-[#EBF3FA] text-[#133559] border-b border-blue-100 px-4 py-3 flex items-center justify-between">
        <span className="label-eyebrow text-slate-400">Route</span>
        <button 
          onClick={onOpenMap}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
        >
          <Icon name="external-link" className="w-3 h-3" /> Map
        </button>
      </div>

      <div className="p-4 relative">
        {/* Vertical connector */}
        <span aria-hidden className="absolute left-[11px] top-7 bottom-7 w-px border-l-2 border-dashed border-slate-200" />

        {/* Origin */}
        <div className="relative flex gap-3 pb-5">
          <span className="relative z-10 mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
            <span className="h-2 w-2 rounded-full bg-white" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="label-eyebrow text-slate-500">Origin</div>
            <p className="mt-1 text-[14px] font-bold leading-snug text-slate-900 truncate">{originBlock.line1}</p>
            <p className="text-xs text-slate-500 truncate">{originBlock.line2}</p>
          </div>
        </div>

        {/* Destination */}
        <div className="relative flex gap-3">
          <span className="relative z-10 mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
            <Icon name="map-pin" className="w-3 h-3" strokeWidth={2.5} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="label-eyebrow text-slate-500">Destination</div>
            <p className="mt-1 text-[14px] font-bold leading-snug text-slate-900 truncate">{destinationBlock.line1}</p>
            <p className="text-xs text-slate-500 truncate">{destinationBlock.line2}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----- Comms Hub ----- */
export function CommsHub({
  customerName, 
  customerPhone,
  currentChannel, 
  onChannelChange, 
  body, 
  onBodyChange, 
  subject, 
  onSubjectChange,
  isPosting, 
  onPost,
  onDial,
  emailTemplates = [],
  smsTemplates = [],
  onApplyTemplate,
  emailAttachments = [],
  onEmailAttachmentsChange,
  postLabel,
  categories = [],
  isLoadingTemplates = false,
  callDuration = '',
  onCallDurationChange,
  callDirection = 'outbound',
  onCallDirectionChange,
  callDisposition = 'connected',
  onCallDispositionChange,
  canCreateTask = true,
  canSendEmail = true,
  canSendSms = true,
  canLogCall = true,
  activityEmailToText,
  setActivityEmailToText,
  activityEmailCcText,
  setActivityEmailCcText,
  activityEmailBccText,
  setActivityEmailBccText,
  showCcBcc,
  setShowCcBcc,
  communicationRecipients,
  activityCallRecipient,
  setActivityCallRecipient,
  activitySmsRecipients,
  setActivitySmsRecipients,
}) {
  const attachmentInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const [templatePopupLoading, setTemplatePopupLoading] = useState(false);

  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [showCategoryPopup, setShowCategoryPopup] = useState(false);
  const [showTemplatePopup, setShowTemplatePopup] = useState(false);
  const [toolsByChannel, setToolsByChannel] = useState({});
  const showEmailTools = toolsByChannel[currentChannel] ?? false;
  const toggleMessageTools = () => setToolsByChannel(previous => ({
    ...previous,
    [currentChannel]: !(previous[currentChannel] ?? false),
  }));
  const [prevChannel, setPrevChannel] = useState(currentChannel);

  if (currentChannel !== prevChannel) {
    setPrevChannel(currentChannel);
    setSelectedCategoryId(null);
    setShowCategoryPopup(false);
    setShowTemplatePopup(false);
  }

  const filteredTemplates = useMemo(() => {
    const templates = currentChannel === 'email' ? emailTemplates : smsTemplates;
    if (selectedCategoryId === null) {
      return templates;
    }
    if (selectedCategoryId === 'uncategorized') {
      return templates.filter(t => !t.category);
    }
    return templates.filter(t => t.category === selectedCategoryId);
  }, [currentChannel, emailTemplates, smsTemplates, selectedCategoryId]);

  const channels = [
    { id: "note",  label: "Note",  icon: "sticky-note", color: "text-slate-600" },
    { id: "email", label: "Email", icon: "mail", color: "text-blue-600" },
    { id: "call",  label: "Call",  icon: "phone", color: "text-emerald-600" },
    { id: "text",  label: "Text",  icon: "message-circle", color: "text-amber-600" },
  ];

  const placeholder = {
    note:  "Jot an internal note — only visible to your team…",
    email: `Write to ${customerName}…`,
    call:  "Log call notes — outcome, next step, sentiment…",
    text:  "Send a quick SMS — kept short and friendly…",
	  }[currentChannel];

  const attachments = Array.isArray(emailAttachments) ? emailAttachments : [];
  const canAttach = currentChannel === 'email' && typeof onEmailAttachmentsChange === 'function';
  const callDispositionOptions = [
    { value: 'no_answer', label: 'No Answer' },
    { value: 'busy', label: 'Busy' },
    { value: 'wrong_number', label: 'Wrong Number' },
    { value: 'left_live_message', label: 'Left live message' },
    { value: 'left_voicemail', label: 'Left voicemail' },
    { value: 'connected', label: 'Connected' },
    { value: 'number_disconnected', label: 'Number disconnected' },
  ];

  const addAttachments = (files = []) => {
    const nextFiles = Array.from(files || []).filter(Boolean);
    if (!nextFiles.length) return;
    onEmailAttachmentsChange([...(attachments || []), ...nextFiles]);
  };

  const removeAttachmentAt = (index) => {
    onEmailAttachmentsChange((attachments || []).filter((_, idx) => idx !== index));
  };

  return (
    <section className="rounded-xl border border-ink-100 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-blue-100 px-4 py-3 bg-[#EBF3FA] text-[#133559]">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-ink-100">
            <Icon name="messages-square" className="w-3.5 h-3.5 text-brand" />
          </span>
          <span className="label-eyebrow text-ink-900">Comms hub</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-bold text-ink-400">
          <div className="flex -space-x-1.5">
            {[1,2].map(i => (
              <div key={i} className="h-5 w-5 rounded-full border-2 border-white bg-slate-200" />
            ))}
          </div>
          <span className="ml-1 uppercase tracking-wider">Shared with team</span>
        </div>
      </div>

      <div className="p-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div className="inline-flex flex-wrap gap-1 rounded-xl bg-ink-50 p-1 ring-1 ring-ink-100/50 w-full sm:w-auto">
            {channels.map((c) => {
              const isActive = c.id === currentChannel;
              return (
                <button
                  key={c.id}
                  onClick={() => onChannelChange(c.id)}
                  className={`relative inline-flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? "bg-white text-ink-900 shadow-card ring-1 ring-ink-100 scale-[1.02]"
                      : "text-ink-400 hover:text-ink-600 hover:bg-white/50"
                  }`}
                >
                  <Icon name={c.icon} className={`w-3.5 h-3.5 ${isActive ? c.color : ""}`} />
                  {c.label}
                  {isActive && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand" />}
                </button>
              );
            })}
          </div>

          {(currentChannel === 'email' || currentChannel === 'text') && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Category Popover */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCategoryPopup(!showCategoryPopup)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-ink-100 bg-white px-3 py-2 text-xs font-bold text-ink-700 shadow-sm hover:bg-slate-50 transition active:scale-95 whitespace-nowrap cursor-pointer"
                  title="Filter templates by category"
                >
                  <Icon name="folder" className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    {selectedCategoryId === null 
                      ? 'All Categories' 
                      : selectedCategoryId === 'uncategorized'
                        ? 'Uncategorized'
                        : (categories.find(c => c.id === selectedCategoryId)?.name || 'Category')}
                  </span>
                  <Icon name="chevron-down" className="w-3 h-3 text-ink-300" />
                </button>

                {showCategoryPopup && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowCategoryPopup(false)} 
                    />
                    <div className="absolute right-0 mt-1.5 w-56 rounded-xl border border-ink-100 bg-white p-1.5 shadow-lg z-20 origin-top-right">
                      <div className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-ink-400">
                        Filter by Category
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategoryId(null);
                          setShowCategoryPopup(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition hover:bg-slate-50 cursor-pointer ${
                          selectedCategoryId === null ? 'bg-brand-tint text-brand font-bold' : 'text-ink-700'
                        }`}
                      >
                        <span>All Categories</span>
                        {selectedCategoryId === null && <Icon name="check" className="w-3.5 h-3.5 text-brand" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategoryId('uncategorized');
                          setShowCategoryPopup(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition hover:bg-slate-50 cursor-pointer ${
                          selectedCategoryId === 'uncategorized' ? 'bg-brand-tint text-brand font-bold' : 'text-ink-700'
                        }`}
                      >
                        <span>Uncategorized</span>
                        {selectedCategoryId === 'uncategorized' && <Icon name="check" className="w-3.5 h-3.5 text-brand" />}
                      </button>
                      {categories.length > 0 && <div className="my-1 border-t border-ink-100/50" />}
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setSelectedCategoryId(cat.id);
                            setShowCategoryPopup(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition hover:bg-slate-50 cursor-pointer ${
                            selectedCategoryId === cat.id ? 'bg-brand-tint text-brand font-bold' : 'text-ink-700'
                          }`}
                        >
                          <span className="truncate pr-2">{cat.name}</span>
                          {selectedCategoryId === cat.id && <Icon name="check" className="w-3.5 h-3.5 text-brand" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Template Dropdown */}
              <div className="relative w-full sm:w-auto">
                <button
                  type="button"
                  disabled={isLoadingTemplates}
                  onClick={() => setShowTemplatePopup((prev) => !prev)}
                  className="inline-flex w-full sm:w-auto min-w-[272px] items-center rounded-xl border border-ink-100 bg-white pl-9 pr-8 py-2 text-left text-xs font-bold text-ink-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Icon name="zap" className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand animate-pulse" />
                  <span className="truncate">
                    {templatePopupLoading || isLoadingTemplates
                      ? 'Loading templates...'
                      : filteredTemplates.length === 0
                        ? (currentChannel === 'email' ? 'No templates in category' : 'No SMS in category')
                        : (currentChannel === 'email' ? 'Email template...' : 'SMS template...')}
                  </span>
                  <Icon name="chevron-down" className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-300 pointer-events-none" />
                </button>

                {showTemplatePopup && !isLoadingTemplates && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowTemplatePopup(false)}
                    />
                    <div className="absolute right-0 z-20 mt-1.5 w-full min-w-[272px] overflow-hidden rounded-xl border border-ink-100 bg-white shadow-lg origin-top-right">
                      <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-ink-400">
                        {currentChannel === 'email' ? 'Email Templates' : 'SMS Templates'}
                      </div>
                      <div className="max-h-80 overflow-y-auto overscroll-contain py-1">
                        {filteredTemplates.length === 0 ? (
                          <div className="px-3 py-2 text-xs font-semibold text-ink-400">
                            {currentChannel === 'email' ? 'No templates in category' : 'No SMS in category'}
                          </div>
                        ) : (
                          filteredTemplates.map((template) => (
                            <button
                              key={template.id}
                              type="button"
                              onClick={() => {
                                setShowTemplatePopup(false);
                                onApplyTemplate(template);
                              }}
                              className="flex w-full items-center px-3 py-2 text-left text-xs font-semibold text-ink-700 transition hover:bg-slate-50 cursor-pointer"
                              title={template.name}
                            >
                              <span className="truncate">{template.name}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {currentChannel === "email" && (
          <div className="mb-3 space-y-2 rounded-xl border border-ink-100 p-3 bg-slate-50/30 relative">
            <div className="flex items-start gap-4 text-sm">
              <span className="text-[11px] font-black uppercase tracking-widest text-ink-400 w-16 mt-1.5">To</span>
              <div className="flex-1 flex items-start gap-2">
                <input
                  type="text"
                  value={activityEmailToText}
                  onChange={(e) => setActivityEmailToText(e.target.value)}
                  className="flex-1 rounded border border-transparent hover:border-slate-200 focus:border-brand focus:ring-2 focus:ring-brand/10 bg-transparent px-2 py-1 text-sm font-semibold text-slate-900 outline-none transition"
                  placeholder="recipient@example.com (comma separated)"
                />
                <button
                  type="button"
                  onClick={() => setShowCcBcc(!showCcBcc)}
                  className="text-xs font-bold text-brand hover:text-brand-dark pt-1.5 px-1 whitespace-nowrap"
                >
                  {showCcBcc ? 'Hide Cc/Bcc' : 'Cc/Bcc'}
                </button>
              </div>
            </div>
            
            {showCcBcc && (
              <>
                <div className="h-px bg-ink-100/50" />
                <div className="flex items-start gap-4 text-sm">
                  <span className="text-[11px] font-black uppercase tracking-widest text-ink-400 w-16 mt-1.5">Cc</span>
                  <div className="flex-1 flex items-start gap-2">
                    <input
                      type="text"
                      value={activityEmailCcText}
                      onChange={(e) => setActivityEmailCcText(e.target.value)}
                      className="flex-1 rounded border border-transparent hover:border-slate-200 focus:border-brand focus:ring-2 focus:ring-brand/10 bg-transparent px-2 py-1 text-sm font-semibold text-slate-900 outline-none transition"
                      placeholder="cc@example.com"
                    />
                  </div>
                </div>
                
                <div className="h-px bg-ink-100/50" />
                <div className="flex items-start gap-4 text-sm">
                  <span className="text-[11px] font-black uppercase tracking-widest text-ink-400 w-16 mt-1.5">Bcc</span>
                  <div className="flex-1 flex items-start gap-2">
                    <input
                      type="text"
                      value={activityEmailBccText}
                      onChange={(e) => setActivityEmailBccText(e.target.value)}
                      className="flex-1 rounded border border-transparent hover:border-slate-200 focus:border-brand focus:ring-2 focus:ring-brand/10 bg-transparent px-2 py-1 text-sm font-semibold text-slate-900 outline-none transition"
                      placeholder="bcc@example.com"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="h-px bg-ink-100/50" />
            <div className="flex items-center gap-4 text-sm">
              <span className="text-[11px] font-black uppercase tracking-widest text-ink-400 w-16">Subject</span>
              <input 
                className="flex-1 font-bold text-ink-900 bg-transparent border-none p-0 focus:ring-0 placeholder:text-ink-300"
                value={subject}
                onChange={(e) => onSubjectChange(e.target.value)}
                placeholder="Enter email subject..."
              />
            </div>
          </div>
        )}

        {currentChannel === "text" && (
          <div className="mb-3 space-y-2 rounded-xl border border-ink-100 p-3 bg-slate-50/30">
            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              SMS Recipient
            </label>
            <input
              type="text"
              value={activitySmsRecipients?.[0] || ''}
              onChange={(e) => setActivitySmsRecipients && setActivitySmsRecipients([e.target.value])}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
              placeholder="Enter phone number..."
            />
          </div>
        )}

        {currentChannel === "call" && (
          <div className="mb-3 space-y-3">
            <div className="rounded-xl border border-ink-100 bg-slate-50/30 p-3 shadow-sm">
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                Call Recipient
              </label>
              <input
                type="text"
                value={activityCallRecipient || ''}
                onChange={(e) => setActivityCallRecipient && setActivityCallRecipient(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                placeholder="Enter phone number..."
              />
            </div>

            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-500"></div>
              <div className="relative flex items-center justify-between rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shadow-inner">
                    <Icon name="phone" className="w-6 h-6" strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600/60 mb-0.5">RingCentral Dialer</div>
                    <div className="text-lg font-black text-ink-900 leading-none">
                      {activityCallRecipient || customerPhone || 'No phone number'}
                    </div>
                  </div>
                </div>
                {canLogCall ? (
                  <button
                    onClick={() => onDial && onDial(activityCallRecipient || customerPhone)}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700 active:scale-95"
                  >
                    <Icon name="phone-outgoing" className="w-4 h-4" />
                    Start Call
                  </button>
                ) : null}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-bold text-ink-500">
                <span className="block text-[10px] font-black uppercase tracking-wider text-ink-400">Call Direction</span>
                <select
                  value={callDirection}
                  onChange={(e) => onCallDirectionChange?.(e.target.value)}
                  className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm font-semibold text-ink-800 shadow-sm focus:border-brand focus:ring-2 focus:ring-brand/10"
                >
                  <option value="outbound">Outbound</option>
                  <option value="inbound">Inbound</option>
                </select>
              </label>
              <label className="space-y-1 text-xs font-bold text-ink-500">
                <span className="block text-[10px] font-black uppercase tracking-wider text-ink-400">Outcome</span>
                <select
                  value={callDisposition}
                  onChange={(e) => onCallDispositionChange?.(e.target.value)}
                  className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm font-semibold text-ink-800 shadow-sm focus:border-brand focus:ring-2 focus:ring-brand/10"
                >
                  {callDispositionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs font-bold text-ink-500 sm:col-span-2">
                <span className="block text-[10px] font-black uppercase tracking-wider text-ink-400">Duration (minutes)</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={callDuration}
                  onChange={(e) => onCallDurationChange?.(e.target.value)}
                  className="w-full rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm font-semibold text-ink-800 shadow-sm focus:border-brand focus:ring-2 focus:ring-brand/10"
                  placeholder="e.g. 8.5"
                />
              </label>
            </div>
          </div>
        )}

	        <div className="group relative rounded-xl bg-white ring-1 ring-ink-100 focus-within:ring-2 focus-within:ring-brand shadow-sm transition-all duration-300 overflow-hidden">
          {(currentChannel === 'email' || currentChannel === 'text') ? (
            <div className="p-1 min-h-[140px]">
              <RichTextEditor
                value={body}
                onChange={onBodyChange}
                placeholder={placeholder}
                toolsVisible={showEmailTools}
                showToolsToggle={false}
              />
            </div>
          ) : (
            <textarea
              className="w-full resize-none rounded-xl bg-transparent p-3 sm:p-4 text-sm sm:text-[15px] leading-relaxed text-ink-900 placeholder:text-ink-300 focus:outline-none min-h-[120px]"
              placeholder={placeholder}
              value={body}
              onChange={(e) => onBodyChange(e.target.value)}
            />
	          )}
	          
	          <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 border-t border-ink-100/50 bg-slate-50/50 px-3 sm:px-4 py-2.5 sm:py-3 rounded-b-xl sm:rounded-b-2xl min-w-0">
	            {currentChannel === 'email' ? (
	              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={toggleMessageTools}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600 bg-blue-600 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:border-blue-700 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-50 shrink-00 focus-visible:ring-offset-2"
                    aria-expanded={showEmailTools}
                    aria-label={`${showEmailTools ? 'Hide' : 'Show'} ${currentChannel === 'text' ? 'SMS' : currentChannel === 'email' ? 'email' : currentChannel} tools`}
                  >
                    <Icon name={showEmailTools ? 'chevron-up' : 'chevron-down'} className="w-3.5 h-3.5" />
                    {showEmailTools ? 'Hide Tools' : 'Show Tools'}
                  </button>
                  {showEmailTools ? (
                    <div className="flex flex-wrap items-center gap-1">
                      <IconButton
                        name="paperclip"
                        label="Attach"
                        tone="ghost"
                        className="!h-8 !w-8"
                        onClick={() => {
                          if (!canAttach) return;
                          attachmentInputRef.current?.click?.();
                        }}
                      />
                      <IconButton
                        name="image"
                        label="Image"
                        tone="ghost"
                        className="!h-8 !w-8"
                        onClick={() => {
                          if (!canAttach) return;
                          imageInputRef.current?.click?.();
                        }}
                      />
                      {canAttach && (
                        <>
                          <input
                            ref={attachmentInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              addAttachments(e.target.files);
                              e.target.value = '';
                            }}
                          />
                          <input
                            ref={imageInputRef}
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              addAttachments(e.target.files);
                              e.target.value = '';
                            }}
                          />
                        </>
                      )}
                      <div className="w-px h-4 bg-ink-200 mx-0.5 sm:mx-1" />
                      {canCreateTask ? (
                        <button className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold text-brand hover:bg-brand-tint transition shrink-0">
                          <Icon name="sparkles" className="w-3.5 h-3.5" />
                          AI Enhance
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : canCreateTask ? (
                <div className="flex items-center gap-1.5">
                  <button className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold text-brand hover:bg-brand-tint transition shrink-0">
                    <Icon name="sparkles" className="w-3.5 h-3.5" />
                    AI Enhance
                  </button>
                </div>
              ) : <div />}
              <div className="flex items-center gap-2.5 sm:gap-3 ml-auto shrink-0">
                <span className="text-[10px] font-bold text-ink-400 uppercase tracking-widest whitespace-nowrap">
                  {body.length} chars
                </span>
                {((currentChannel === 'email' && canSendEmail) || (currentChannel === 'text' && canSendSms) || (currentChannel === 'call' && canLogCall) || currentChannel === 'note') ? (
                  <PrimaryBtn 
                    icon={currentChannel === 'email' ? "send" : currentChannel === 'text' ? "message-circle" : "check"} 
                    onClick={onPost} 
                    loading={isPosting}
                    className="!py-2 !px-4 sm:!px-6 whitespace-nowrap text-xs sm:text-sm shrink-0"
                  >
                    {postLabel || (currentChannel === "email" ? "Send Email" : currentChannel === "text" ? "Send SMS" : currentChannel === "call" ? "Log Call" : "Post Note")}
                  </PrimaryBtn>
                ) : null}
              </div>
	          </div>
	        </div>

          {canAttach && attachments.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {attachments.map((file, idx) => (
                <span
                  key={`${file?.name || 'file'}-${idx}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-ink-700 ring-1 ring-inset ring-ink-100"
                >
                  <Icon name="file-text" className="w-4 h-4 text-ink-400" />
                  <span className="max-w-[220px] truncate">{file?.name || 'attachment'}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachmentAt(idx)}
                    className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-lg hover:bg-ink-50"
                    aria-label="Remove attachment"
                  >
                    <Icon name="x" className="w-4 h-4 text-ink-400" />
                  </button>
                </span>
              ))}
            </div>
          )}
	      </div>
	    </section>
	  );
}

/* ----- Activity Timeline ----- */
const getTimelineActivityKind = (activity) => {
  const rawKind = String(activity?.activity_type || activity?.type || '').toLowerCase().trim();
  const source = String(activity?.source || '').toLowerCase();
  if (source.includes('inbound_email') || activity?.inbound_message_id || ['email', 'mail'].includes(rawKind)) return 'email';
  if (
    activity?.sms_log_details?.message ||
    activity?.inbound_sms_id ||
    activity?.inbound_message_id ||
    source.includes('sms') ||
    source.includes('telnyx_inbound_sms') ||
    source.startsWith('inbound_sms')
  ) return 'sms';
  if (['call', 'phone_call', 'phone-call', 'call_log', 'call-log'].includes(rawKind)) return 'call';
  if (['sms', 'text', 'message', 'text_message'].includes(rawKind)) return 'sms';
  if (['email', 'mail'].includes(rawKind)) return 'email';
  if (['note', 'comment'].includes(rawKind)) return 'note';
  if (['task', 'todo', 'to-do'].includes(rawKind)) return 'task';
  if (['meeting', 'meet', 'appointment'].includes(rawKind)) return 'meeting';
  return rawKind;
};

const getTimelineActorLabel = (activity) => {
  const kind = getTimelineActivityKind(activity);
  const source = String(activity?.source || activity?.timeline_source || '').toLowerCase();
  const isInbound =
    String(activity?.direction || '').toLowerCase() === 'inbound' ||
    Boolean(activity?.inbound_message_id) ||
    Boolean(activity?.inbound_sms_id) ||
    source.startsWith('inbound_') ||
    source === 'telnyx_inbound_sms';

  if (isInbound && (kind === 'email' || kind === 'sms')) return 'Inbound';
  if (kind === 'warning' || source.includes('lead_normalization_warning')) return 'System';
  return activity?.user_details?.first_name || activity?.user_details?.email || 'System';
};

export function Timeline({
  activities = [],
  filter,
  onFilterChange,
  onTogglePin,
  onReply,
  onPreview,
  onToggleEmailRead,
  onEditNote,
  onEditCall,
  onDeleteCall,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  totalUnpinnedCount = 0,
  pinnedCount = 0,
}) {
  const filters = ["All", "Email", "SMS", "Call", "Note", "Task"];
  const [expandedActivityIds, setExpandedActivityIds] = useState(() => new Set());
  const observerRef = useRef(null);
  const onLoadMoreRef = useRef(onLoadMore);
  const isLoadingMoreRef = useRef(isLoadingMore);
  const hasMoreRef = useRef(hasMore);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
    isLoadingMoreRef.current = isLoadingMore;
    hasMoreRef.current = hasMore;
  }, [onLoadMore, isLoadingMore, hasMore]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !isLoadingMoreRef.current) {
          onLoadMoreRef.current?.();
        }
      },
      { threshold: 0.1 }
    );
    if (observerRef.current) {
      observer.observe(observerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  const toneMap = {
    email: { ring: "ring-blue-100",    bg: "bg-brand-tint",       fg: "text-brand-dark",    icon: "mail" },
    call:  { ring: "ring-emerald-100", bg: "bg-emerald-50",       fg: "text-emerald-700",   icon: "phone-outgoing" },
    sms:   { ring: "ring-amber-100",   bg: "bg-amber-50",         fg: "text-amber-700",     icon: "message-square-text" },
    text:  { ring: "ring-amber-100",   bg: "bg-amber-50",         fg: "text-amber-700",     icon: "message-circle" },
    note:  { ring: "ring-ink-100",     bg: "bg-ink-50",           fg: "text-ink-600",       icon: "sticky-note" },
    task:  { ring: "ring-violet-100",  bg: "bg-violet-50",        fg: "text-violet-700",    icon: "check-circle" },
    system: { ring: "ring-slate-100",  bg: "bg-slate-50",         fg: "text-slate-500",     icon: "settings" }
  };

  const getActivityKey = (activity) => {
    const source = String(activity?.timeline_source || 'opportunity');
    const id = String(activity?.id ?? '');
    if (id) return `${source}-${id}`;
    const kind = String(activity?.activity_type || activity?.type || '').toLowerCase();
    const createdMinute = String(activity?.created_at || '').slice(0, 16);
    const subject = String(activity?.subject || activity?.description || activity?.content || '').trim().toLowerCase();
    const recipient = String(
      activity?.email_log_details?.to_email ||
      activity?.sms_log_details?.to_phone ||
      activity?.to_email ||
      activity?.to_phone ||
      ''
    ).trim().toLowerCase();
    return `${source}|${kind}|${createdMinute}|${subject}|${recipient}`;
  };
  const isExpanded = (activity) => expandedActivityIds.has(getActivityKey(activity));
  const totalActivityCount = (Number(pinnedCount) || 0) + (Number(totalUnpinnedCount) || 0);
  const visibleActivities = React.useMemo(() => {
    const seen = new Set();
    return (Array.isArray(activities) ? activities : []).filter((activity) => {
      const key = getActivityKey(activity);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [activities]);
  const toggleExpanded = (activity) => {
    const key = getActivityKey(activity);
    if (!String(activity?.id ?? '')) return;
    setExpandedActivityIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <section className="overflow-hidden rounded-xl border border-ink-100 bg-white shadow-sm flex flex-col">
      <header className="bg-[#EBF3FA] text-[#133559] flex flex-col gap-3 border-b border-blue-100 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <span className="label-eyebrow text-ink-400">Activity</span>
          <span className="text-xs text-ink-400">·</span>
          <span className="text-xs font-medium text-ink-500">{totalActivityCount || visibleActivities.length} events</span>
          {pinnedCount > 0 ? (
            <>
              <span className="text-xs text-ink-300">·</span>
              <span className="text-xs font-semibold text-brand-dark">{pinnedCount} pinned</span>
            </>
          ) : null}
        </div>
        <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-ink-50 p-1 ring-1 ring-ink-100">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f.toLowerCase())}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                (filter === 'all' ? 'All' : filter) === f.toLowerCase() || (filter === 'all' && f === 'All') 
                  ? "glass-strong text-ink-900 shadow-card" 
                  : "text-ink-500 hover:text-ink-800"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      <ol className="relative p-3">
        <span aria-hidden className="absolute left-[34px] top-8 bottom-8 w-px bg-gradient-to-b from-ink-100 via-ink-100 to-transparent" />
        {visibleActivities.length === 0 ? (
          <div className="py-10 text-center text-ink-400 text-sm italic">No activities found.</div>
        ) : (
          visibleActivities.map((e) => {
            const type = getTimelineActivityKind(e) || 'note';
            const isInboundEmail = type === 'email' && Boolean(e?.inbound_message_id);
            const t = toneMap[type] || toneMap.note;
            const date = new Date(e.created_at).toLocaleString(undefined, { 
              month: 'short', 
              day: 'numeric', 
              hour: 'numeric', 
              minute: '2-digit' 
            });
            const expanded = isExpanded(e);
            const bodyHtml = type === 'email'
              ? normalizePreviewHtml(
                  e?.email_log_details?.preview_html ||
                  e?.email_log_details?.body_html ||
                  e?.email_log_details?.body_text ||
                  e?.body_html ||
                  e?.description ||
                  e?.content ||
                  ''
                )
              : '';
            const emailAttachments = type === 'email'
              ? (
                  Array.isArray(e?.email_log_details?.attachments) && e.email_log_details.attachments.length
                    ? e.email_log_details.attachments
                    : Array.isArray(e?.payload?.attachments)
                      ? e.payload.attachments
                      : []
                )
              : [];
            const emailLifecycle = type === 'email' ? getEmailLifecycleState(e) : null;
            const emailRecipient = type === 'email' ? getActivityEmailRecipient(e) : '';
            const previewText = type === 'email'
              ? getActivityEmailPreviewText(e)
              : getActivityNoteText(e);
            const canPin = String(e?.timeline_source || '').toLowerCase() !== 'inbound' && typeof onTogglePin === 'function';

            return (
              <li key={`${String(e?.timeline_source || 'opportunity')}-${String(e.id)}`} className="relative flex min-w-0 gap-3 pb-3 sm:gap-3 last:pb-0">
                <div className="relative z-10 shrink-0">
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ring-1 ${isInboundEmail ? 'ring-sky-100 bg-sky-50 text-sky-700' : `${t.ring} ${t.bg} ${t.fg}`} shadow-sm`}>
                    <Icon name={t.icon} className="w-4 h-4" />
                  </span>
                </div>
                <div className={`relative min-w-0 flex-1 overflow-hidden rounded-xl border ${isInboundEmail ? 'border-sky-200 bg-sky-50/40' : e.is_pinned ? "border-brand/40 bg-brand-tint/40" : "border-ink-100 bg-white"} p-3 transition hover:shadow-sm`}>
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                        <span className="max-w-full break-words font-bold text-ink-900">{getTimelineActorLabel(e)}</span>
                        <span className="shrink-0 text-ink-500">
                          {type === 'email'
                            ? (e?.inbound_message_id ? 'replied' : 'sent')
                            : type === 'call'
                              ? 'logged a call'
                              : 'posted'}
                        </span>
                        {e.subject && <span className="min-w-0 max-w-full break-words font-semibold text-brand-dark">{e.subject}</span>}
                        {emailRecipient ? (
                          <span className="min-w-0 max-w-full break-all text-xs font-semibold text-ink-500">
                            {isInboundEmail ? 'to' : 'to'} {emailRecipient}
                          </span>
                        ) : null}
                        <span className="shrink-0 text-ink-300">·</span>
                        <span className="shrink-0 text-xs font-medium text-ink-400">{date}</span>
                        {emailLifecycle ? (
                          <Pill tone={emailLifecycle.tone} className="ml-1 shrink-0">
                            {emailLifecycle.label}
                          </Pill>
                        ) : null}
                        {type === 'email' && e?.inbound_message_id ? (
                          <>
                            <Pill tone={e?.inbound_notification_read_at ? "slate" : "blue"} className="ml-1 shrink-0">
                              {e?.inbound_notification_read_at ? "Read" : "Unread"}
                            </Pill>
                            {typeof onToggleEmailRead === 'function' ? (
                              <button
                                type="button"
                                onClick={() => onToggleEmailRead(e)}
                                className="ml-1 inline-flex shrink-0 items-center rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-200 transition hover:bg-sky-50"
                              >
                                {e?.inbound_notification_read_at ? "Mark Unread" : "Mark Read"}
                              </button>
                            ) : null}
                          </>
                        ) : null}
                        {e.is_pinned && (
                          <Pill tone="blue" className="ml-1 shrink-0">
                            <Icon name="pin" className="w-3 h-3" /> Pinned
                          </Pill>
                        )}
                        {isInboundEmail && typeof onReply === 'function' ? (
                          <button
                            type="button"
                            onClick={() => onReply(e)}
                            className="ml-1 inline-flex shrink-0 items-center rounded-full bg-brand px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-brand-dark"
                          >
                            <Icon name="reply" className="w-3.5 h-3.5 mr-1" />
                            Reply
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {canPin ? (
                        <IconButton
                          name={e.is_pinned ? "pin-off" : "pin"}
                          label={e.is_pinned ? "Unpin activity" : "Pin activity"}
                          onClick={() => onTogglePin(e)}
                          tone={e.is_pinned ? "tint" : "ghost"}
                        />
                      ) : null}
                      {type === 'note' ? (
                        <IconButton
                          name="pencil"
                          label="Edit"
                          onClick={() => onEditNote?.(e)}
                        />
                      ) : null}
                      {type === 'call' ? (
                        <>
                          <IconButton
                            name="pencil"
                            label="Edit call log"
                            onClick={() => onEditCall?.(e)}
                          />
                          <IconButton
                            name="trash-2"
                            label="Delete call log"
                            onClick={() => onDeleteCall?.(e)}
                            className="text-rose-500"
                          />
                        </>
                      ) : null}
                      <IconButton
                        name={expanded ? "chevron-up" : "chevron-down"}
                        label={expanded ? "Collapse" : "Expand"}
                        onClick={() => toggleExpanded(e)}
                      />
                    </div>
                  </div>
                  {emailLifecycle?.timeline?.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {emailLifecycle.timeline.map((item) => (
                        <span
                          key={item}
                          className="inline-flex items-center rounded-full bg-ink-50 px-2.5 py-1 text-[11px] font-semibold text-ink-500 ring-1 ring-inset ring-ink-100"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {previewText && type !== 'email' ? (
                    <div 
                      className={`mt-2 break-words [overflow-wrap:anywhere] text-[14px] leading-relaxed text-ink-600 prose prose-sm max-w-none ${expanded ? '' : 'line-clamp-3'}`}
                      dangerouslySetInnerHTML={{ __html: normalizePreviewHtml(previewText) }}
                    />
                  ) : null}

                  {type === 'email' ? (
                    <div className={`mt-3 overflow-hidden rounded-xl border shadow-sm ${isInboundEmail ? 'border-sky-200 bg-white' : 'border-ink-100 bg-white'}`}>
                      {isInboundEmail ? (
                        <div className="border-b border-sky-100 bg-sky-50/60 px-4 py-2.5">
                          <div className={`overflow-hidden text-sm leading-6 text-ink-700 ${expanded ? '' : 'line-clamp-5'}`}>
                            {bodyHtml ? (
                              <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
                            ) : (
                              <div className="whitespace-pre-wrap break-words">
                                {previewText || getActivityNoteText(e)}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className={`relative overflow-hidden transition-all duration-300 ${expanded ? 'max-h-[800px]' : 'max-h-[260px]'}`}>
                          {bodyHtml ? (
                            <iframe
                              title={`Email activity ${e.id} preview`}
                              className={`block w-full bg-white transition-all duration-300 ${expanded ? 'h-[800px]' : 'h-[260px]'}`}
                              sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                              srcDoc={bodyHtml}
                            />
                          ) : (
                            <div className="whitespace-pre-wrap break-words p-4 text-sm leading-relaxed text-ink-700">
                              {previewText || getActivityNoteText(e)}
                            </div>
                          )}
                          {!expanded ? (
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-white/0" />
                          ) : null}
                        </div>
                      )}
                      {isInboundEmail && emailAttachments.length ? (
                        <div className="border-t border-sky-100 bg-white px-4 py-3">
                          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-sky-700">
                            Attachments
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {emailAttachments.map((file) => {
                              const contentType = String(file?.content_type || '').toLowerCase();
                              const canPreview = contentType.includes('image') || contentType.includes('pdf');
                              return (
                                <span
                                  key={file.id}
                                  className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-bold text-sky-800"
                                >
                                  <Icon name="paperclip" className="w-4 h-4" />
                                  <span className="max-w-[180px] truncate">{file.filename || 'attachment'}</span>
                                  {canPreview && file.file_url ? (
                                    <button
                                      type="button"
                                      onClick={() => onPreview?.({ ...e, __attachmentPreview: file })}
                                      className="rounded-md px-1.5 py-0.5 text-[11px] font-bold text-sky-700 hover:bg-sky-100"
                                    >
                                      Preview
                                    </button>
                                  ) : null}
                                  {file.file_url ? (
                                    <a
                                      href={file.file_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="rounded-md px-1.5 py-0.5 text-[11px] font-bold text-sky-700 hover:bg-sky-100"
                                      download
                                    >
                                      Download
                                    </a>
                                  ) : null}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                      <div className={`flex items-center justify-between gap-3 px-3 py-2 ${isInboundEmail ? 'bg-sky-50/50' : 'border-t border-ink-100 bg-white'}`}>
                        <button
                          type="button"
                          onClick={() => toggleExpanded(e)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${isInboundEmail ? 'text-sky-700 hover:bg-sky-100' : 'text-brand-dark hover:bg-brand-tint'}`}
                        >
                          <Icon name={expanded ? "chevron-up" : "chevron-down"} className="h-4 w-4" />
                          {expanded ? 'Show less' : isInboundEmail ? 'Read full email' : 'Expand more'}
                        </button>
                        {expanded && !isInboundEmail && emailAttachments.length ? (
                          <div className="flex flex-wrap justify-end gap-2">
                            {emailAttachments.map((file) => (
                              <a
                                key={file.id}
                                href={file.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg border border-ink-100 bg-ink-50 px-2.5 py-1.5 text-xs font-bold text-ink-700 transition hover:bg-ink-100"
                              >
                                <Icon name="paperclip" className="w-4 h-4" />
                                <span className="max-w-[180px] truncate">{file.filename || 'attachment'}</span>
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })
        )}
      </ol>
      {hasMore ? (
        <div ref={observerRef} className="flex items-center justify-center border-t border-ink-100 px-4 py-6">
          {isLoadingMore ? (
            <span className="text-sm font-semibold text-ink-500">Loading more activities...</span>
          ) : (
            <button
              type="button"
              onClick={onLoadMore}
              className="inline-flex items-center gap-1.5 rounded-xl border border-ink-100 bg-white px-4 py-2 text-sm font-bold text-ink-600 transition hover:bg-ink-50"
            >
              Load More
            </button>
          )}
        </div>
      ) : visibleActivities.length > 0 ? (
        <div className="flex items-center justify-center border-t border-ink-100 px-4 py-6">
          <span className="text-xs font-semibold text-ink-400">End of activity history</span>
        </div>
      ) : null}
    </section>
  );
}

/* ----- Right sidebar Specifications ----- */
export function SidebarSpecs({
  specs = [],
  onInlineSave,
}) {
  const [editingId, setEditingId] = React.useState(null);

  const getOptionLabel = (option) => {
    if (option == null) return '';
    if (typeof option === 'string' || typeof option === 'number') return String(option);
    if (typeof option === 'object') {
      return (
        option.name ||
        option.label ||
        [option.first_name, option.last_name].filter(Boolean).join(' ').trim() ||
        option.full_name ||
        option.title ||
        option.email ||
        String(option.id || '')
      );
    }
    return String(option);
  };

  return (
    <section className="rounded-xl border border-ink-100 bg-white shadow-sm flex flex-col overflow-visible">
      <header className="bg-[#EBF3FA] text-[#133559] flex items-center justify-between border-b border-blue-100 px-3 py-2">
        <span className="label-eyebrow text-[#133559]">Lead specifications</span>
      </header>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 overflow-visible">
        {specs.map((s) => (
          <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 ring-1 ring-slate-100 overflow-visible">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-ink-50 text-black">
              <Icon name={s.icon} className="w-4 h-4" />
            </span>
            <div className="min-w-0 flex-1">
              <dt className="label-eyebrow text-black">{s.label}</dt>
              {editingId === s.id ? (
                s.fetchOptions ? (
                  <AsyncSelect
                    key={`${s.id}-${s.cacheKey ?? ''}`}
                    value={s.value}
                    onChange={(val, opt) => {
                      onInlineSave(s.id, val, opt);
                      setEditingId(null);
                    }}
                    fetchOptions={s.fetchOptions}
                    labelField={s.labelField || "label"}
                    valueField={s.valueField || "id"}
                    initialLabel={s.initialLabel || s.displayValue || ''}
                    placeholder="Select..."
                    className="mt-1 w-full"
                    autoFocus
                    onBlur={() => setEditingId(null)}
                  />
                ) : s.options ? (
                  <select
                    value={s.value}
                    onChange={(e) => {
                      onInlineSave(s.id, e.target.value);
                      setEditingId(null);
                    }}
                    onBlur={() => setEditingId(null)}
                    autoFocus
                    className="mt-1 w-full rounded-lg border-2 border-brand/20 bg-brand-tint px-2 py-1.5 text-sm font-semibold text-ink-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/10"
                  >
                    <option value="">Select...</option>
                    {s.options.map((o) => (
                      <option key={o?.id ?? o} value={o?.id ?? o}>{getOptionLabel(o)}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={s.type || "text"}
                    defaultValue={s.value}
                    autoFocus
                    onBlur={(e) => {
                      if (e.target.value !== s.value) {
                        onInlineSave(s.id, e.target.value);
                      }
                      setEditingId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.target.blur();
                      }
                      if (e.key === 'Escape') {
                        setEditingId(null);
                      }
                    }}
                    className="mt-1 w-full rounded-lg border-2 border-brand/20 bg-brand-tint px-2 py-1.5 text-sm font-semibold text-ink-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/10"
                  />
                )
              ) : (
                <dd
                  className="mt-0.5 text-sm font-semibold !text-brand truncate cursor-pointer hover:bg-blue-50 rounded px-1 -mx-1 border-b border-dashed border-brand/30 hover:border-brand transition-colors"
                  onClick={() => setEditingId(s.id)}
                  title="Click to edit"
                >
                  {s.displayValue || (s.fetchOptions ? '—' : (s.value || '—'))}
                </dd>
              )}
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ----- Sidebar Inventory Snapshot ----- */
export function InventorySnapshot({ roomCount, totalQty, totalVol, items = [], onOpenFullList, isLoading = false }) {
  if (isLoading) {
    return (
      <section className="rounded-xl border border-ink-100 bg-white shadow-sm flex flex-col overflow-hidden">
        <div className="bg-[#EBF3FA] text-[#133559] flex items-center justify-between px-4 py-3 border-b border-blue-100">
          <span className="label-eyebrow text-ink-400">Inventory items</span>
        </div>
        <div className="p-4 text-sm text-ink-400">Loading inventory...</div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-ink-100 bg-white shadow-sm flex flex-col overflow-hidden">
      <div className="bg-[#EBF3FA] text-[#133559] flex items-center justify-between px-4 py-3 border-b border-blue-100">
        <span className="label-eyebrow text-ink-400">Inventory items</span>
        <button 
          onClick={onOpenFullList}
          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-extrabold text-blue-700 hover:bg-blue-100 hover:border-blue-300 hover:text-blue-800 shadow-sm transition-all cursor-pointer"
        >
          View detailed list <Icon name="chevron-right" className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="p-4">
        <div className="mt-0 grid grid-cols-3 gap-2 text-center">
          {[
            { v: totalQty, l: "Items" },
            { v: totalVol, l: "cu·ft" },
            { v: roomCount, l: "Rooms" },
          ].map((s) => (
            <div key={s.l} className="rounded-xl bg-ink-50/70 p-2.5">
              <div className="text-xl font-black tracking-tight text-ink-900">{s.v || 0}</div>
              <div className="label-eyebrow text-ink-400 mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>
        <ul className="mt-4 space-y-1.5 text-sm">
          {items.slice(0, 4).map((room, idx) => (
            <li key={idx} className="flex items-center justify-between rounded-lg px-1 py-1 hover:bg-ink-50/60">
              <span className="text-ink-600 truncate">{room.name}</span>
              <span className="font-mono text-xs font-semibold text-ink-500 shrink-0">{room.qty} items</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ----- Route Logistics Card ----- */
export function RouteLogisticsCard({
  origin,
  destination,
  stops = [],
  routeStops,
  onEdit,
  onAddStop,
  onEditStop,
  onDeleteStop,
  onOpenMap,
  truckCount,
  driveDistance,
  driveTimeMinutes,
}) {
  const distanceKm = Number(driveDistance || 0) * 1.609344;
  const orderedRouteStops = Array.isArray(routeStops) ? routeStops : [];
  const originStop = orderedRouteStops.find((stop) => stop?.type === 'origin');
  const destinationStop = orderedRouteStops.find((stop) => stop?.type === 'destination');
  const extraStops = orderedRouteStops
    .map((stop, index) => ({ stop, index }))
    .filter(({ stop }) => stop?.type !== 'origin' && stop?.type !== 'destination');

  const originBlock = originStop
    ? { line1: originStop.address || 'Origin not set', line2: originStop.subAddress || '' }
    : formatAddressBlock(origin);
  const destinationBlock = destinationStop
    ? { line1: destinationStop.address || 'Destination not set', line2: destinationStop.subAddress || '' }
    : formatAddressBlock(destination);
  const originAddress = [originBlock.line1, originBlock.line2].filter(Boolean).join(', ');
  const destinationAddress = [destinationBlock.line1, destinationBlock.line2].filter(Boolean).join(', ');
  const stopsCount = extraStops.length || (Array.isArray(stops) ? stops.length : 0);
  const canManageStops = Boolean(onAddStop || onEditStop || onDeleteStop);
  const [isExpanded, setIsExpanded] = useState(false);
  const getStopLabel = (type) => {
    if (type === 'pre_stop') return 'Before origin';
    if (type === 'post_stop') return 'After destination';
    return 'Stop';
  };

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col">
      <div className="flex flex-col h-full">
        <div className="bg-[#EBF3FA] text-[#133559] px-4 py-3 border-b border-blue-100 flex items-center justify-between gap-3 relative z-10">
          <div className="min-w-0">
            <span className="label-eyebrow text-slate-400">Route logistics</span>
            <div className="mt-1 flex items-center gap-2 text-xs font-bold text-slate-500">
              <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                {String(truckCount || 1)} Truck{Number(truckCount) !== 1 ? 's' : ''}
              </span>
              <span className="text-slate-300">•</span>
              <span>{distanceKm.toFixed(distanceKm >= 10 ? 0 : 1)} km</span>
              <span className="text-slate-300">•</span>
              <span>{Math.round(driveTimeMinutes || 0)} min</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button 
              type="button" 
              onClick={onOpenMap} 
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-white text-blue-700 shadow-sm transition-all hover:bg-blue-600 hover:text-white hover:border-blue-600 active:scale-95 cursor-pointer"
              title="Open route logistics"
              aria-label="Open route logistics"
            >
              <Icon name="map" className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded((value) => !value)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:bg-slate-100 hover:text-slate-900 active:scale-95 cursor-pointer"
              aria-label={isExpanded ? 'Collapse route logistics' : 'Expand route logistics'}
              title={isExpanded ? 'Collapse route logistics' : 'Expand route logistics'}
            >
              <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="relative z-10 flex flex-1 flex-col p-4">
          <div className="relative space-y-3">
            {/* Connecting Timeline Line */}
            <div className="absolute left-[13px] top-7 bottom-7 z-0 w-0.5 bg-slate-100"></div>

            {/* Origin */}
            <div className="relative z-10 flex gap-3">
              <div className="flex flex-col items-center shrink-0">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 font-bold text-xs">
                  A
                </div>
              </div>
              <div 
                className={`min-w-0 ${onEdit ? 'cursor-pointer hover:bg-slate-50 rounded -mx-2 px-2 transition' : ''}`}
                onClick={onEdit}
                title={onEdit ? 'Click to edit route' : undefined}
              >
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Origin</div>
                <div className="mt-0.5 text-sm font-extrabold text-slate-900 truncate" title={originAddress}>
                  {originBlock.line1}
                </div>
                {/* {originBlock.line2 && (
                  <div className="text-xs text-slate-500 font-medium">
                    {originBlock.line2}
                  </div>
                )} */}
              </div>
            </div>

            <div
              className={`relative z-10 overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
                isExpanded ? 'max-h-[520px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              {extraStops.length ? (
                <div className="space-y-2 pl-10 pb-1">
                  {extraStops.map(({ stop, index }, itemIndex) => {
                    const address = stop.address || formatAddressBlock(stop.address_details).line1 || 'Address not set';
                    return (
                      <div key={stop.id || `${stop.type}-${itemIndex}`} className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                        <div className="min-w-0">
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {getStopLabel(stop.type)}
                          </div>
                          <div className="mt-0.5 truncate text-xs font-extrabold text-slate-800" title={address}>
                            {address}
                          </div>
                          {stop.details?.unit_number || stop.details?.property_type ? (
                            <div className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
                              {[stop.details?.unit_number ? `#${stop.details.unit_number}` : '', stop.details?.property_type].filter(Boolean).join(' · ')}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {onEditStop ? (
                            <button
                              type="button"
                              onClick={() => onEditStop(stop)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"
                              aria-label="Edit route stop"
                              title="Edit route stop"
                            >
                              <Icon name="pencil" className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                          {onDeleteStop ? (
                            <button
                              type="button"
                              onClick={() => onDeleteStop(index)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                              aria-label="Delete route stop"
                              title="Delete route stop"
                            >
                              <Icon name="trash-2" className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {/* Destination */}
            <div className="relative z-10 flex gap-3">
              <div className="flex flex-col items-center shrink-0">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-1 ring-blue-100 font-bold text-xs">
                  B
                </div>
              </div>
              <div 
                className={`min-w-0 ${onEdit ? 'cursor-pointer hover:bg-slate-50 rounded -mx-2 px-2 transition' : ''}`}
                onClick={onEdit}
                title={onEdit ? 'Click to edit route' : undefined}
              >
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Destination</div>
                <div className="mt-0.5 text-sm font-extrabold text-slate-900 truncate" title={destinationAddress}>
                  {destinationBlock.line1}
                </div>
                {/* {destinationBlock.line2 && (
                  <div className="text-xs text-slate-500 font-medium">
                    {destinationBlock.line2}
                  </div>
                )} */}
              </div>
            </div>
          </div>
        </div>

        {canManageStops ? (
          <div
            className={`grid grid-cols-1 gap-2 overflow-hidden transition-[max-height,opacity,margin-top,padding-top] duration-300 ease-out ${
              isExpanded
                ? 'mt-4 max-h-48 border-t border-slate-100 pt-4 opacity-100'
                : 'mt-0 max-h-0 pt-0 opacity-0'
            }`}
          >
            <button
              type="button"
              onClick={() => onAddStop?.('before_origin')}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              <Icon name="plus" className="h-3.5 w-3.5" />
              Before origin
            </button>
            <button
              type="button"
              onClick={() => onAddStop?.('middle')}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-dark"
            >
              <Icon name="plus" className="h-3.5 w-3.5" />
              Add stop
            </button>
            <button
              type="button"
              onClick={() => onAddStop?.('after_destination')}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              <Icon name="plus" className="h-3.5 w-3.5" />
              After destination
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
