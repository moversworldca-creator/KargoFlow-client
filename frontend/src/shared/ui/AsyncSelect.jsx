import React, { useEffect, useRef, useState, useId, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Loader2, X } from 'lucide-react';

export default function AsyncSelect({ value, onChange, fetchOptions, labelField = 'label', valueField = 'id', placeholder = 'Select...', initialLabel = '', className = '', disabled = false, 'aria-label': ariaLabel }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [selection, setSelection] = useState(null);
  const [position, setPosition] = useState(null);
  const container = useRef(null);
  const trigger = useRef(null);
  const menu = useRef(null);
  const sequence = useRef(0);
  const inFlight = useRef(false);
  const fetchRef = useRef(fetchOptions);
  const listId = useId();
  const limit = 20;
  useEffect(() => { fetchRef.current = fetchOptions; }, [fetchOptions]);
  const selectedOption = options.find((option) => String(option[valueField]) === String(value));
  const selectedLabel = selectedOption?.label || selectedOption?.[labelField]
    || (String(selection?.value) === String(value) ? selection?.label : initialLabel) || String(value ?? '');

  const load = useCallback(async (query, start, reset = false) => {
    if (inFlight.current && !reset) return;
    const requestId = ++sequence.current;
    inFlight.current = true;
    setLoading(true);
    setError('');
    try {
      const response = await fetchRef.current(query, start, limit);
      if (requestId !== sequence.current) return;
      const rows = Array.isArray(response) ? response : response?.results || [];
      setOptions((previous) => reset ? rows : [...previous, ...rows]);
      setOffset(start + rows.length);
      setHasMore(response?.hasMore ?? (response?.count != null ? start + rows.length < response.count : Boolean(response?.next)));
    } catch {
      if (requestId !== sequence.current) return;
      setError('Could not load options.');
      setHasMore(false);
    } finally {
      if (requestId === sequence.current) { inFlight.current = false; setLoading(false); }
    }
  }, []);

  useEffect(() => {
    if (!isOpen || disabled) return undefined;
    const timer = setTimeout(() => {
      setOptions([]);
      setOffset(0);
      setHasMore(false);
      void load(search, 0, true);
    }, 300);
    return () => { clearTimeout(timer); sequence.current += 1; inFlight.current = false; };
  }, [isOpen, search, disabled, load]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const place = () => {
      const rect = container.current?.getBoundingClientRect();
      if (rect) setPosition({ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 });
    };
    const outside = (event) => {
      if (!container.current?.contains(event.target) && !menu.current?.contains(event.target)) setIsOpen(false);
    };
    place();
    document.addEventListener('mousedown', outside);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('mousedown', outside);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [isOpen]);

  const close = () => { setIsOpen(false); trigger.current?.focus(); };
  const open = () => { setOptions([]); setHasMore(false); setLoading(true); setIsOpen(true); };
  const keyboard = (event) => {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const buttons = [...(menu.current?.querySelectorAll('[role="option"]') || [])];
      if (!buttons.length) return;
      const index = buttons.indexOf(document.activeElement);
      const next = event.key === 'ArrowDown' ? (index + 1) % buttons.length : (index <= 0 ? buttons.length - 1 : index - 1);
      buttons[next].focus();
    }
  };
  return <div ref={container} className={`relative ${className}`}>
    <div className="flex items-center rounded-lg border border-slate-300 bg-white">
      <button ref={trigger} type="button" role="combobox" aria-label={ariaLabel || placeholder} aria-expanded={isOpen} aria-controls={listId} aria-haspopup="listbox" disabled={disabled}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm disabled:opacity-50"
        onClick={() => isOpen ? close() : open()} onKeyDown={(event) => { if (event.key === 'ArrowDown') { event.preventDefault(); open(); } if (event.key === 'Escape') close(); }}>
        <span className="truncate">{value ? selectedLabel || initialLabel || String(value) : placeholder}</span><ChevronDown className="h-4 w-4 shrink-0" />
      </button>
      {value && !disabled ? <button type="button" aria-label={`Clear ${ariaLabel || placeholder}`} className="p-2" onClick={() => { onChange('', null); setSelection(null); }}><X className="h-4 w-4" /></button> : null}
    </div>
    {isOpen && !disabled && position && createPortal(<div ref={menu} style={position} onKeyDown={keyboard} className="max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
      <input autoFocus aria-label={`Search ${ariaLabel || placeholder}`} placeholder="Search..." value={search} onChange={(event) => { setSearch(event.target.value); setOptions([]); setHasMore(false); setLoading(true); }} className="mb-2 w-full rounded border p-2 text-sm" />
      {error && <div role="alert" className="p-2 text-sm text-red-700">{error} <button type="button" className="underline" onClick={() => load(search, offset, options.length === 0)}>Retry</button></div>}
      <ul id={listId} role="listbox" aria-label={ariaLabel || placeholder}>
        {options.map((option) => <li key={option[valueField]} role="presentation"><button type="button" role="option" aria-selected={String(value) === String(option[valueField])} className="w-full rounded px-3 py-2 text-left text-sm hover:bg-blue-50 focus:bg-blue-50" onClick={() => { onChange(option[valueField], option); setSelection({ value: option[valueField], label: option.label || option[labelField] || String(option[valueField]) }); setSearch(''); close(); }}>{option.label || option[labelField] || String(option[valueField])}</button></li>)}
      </ul>
      {loading ? <div role="status" className="flex gap-2 p-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Loading options…</div> : !error && !options.length ? <p className="p-2 text-sm text-slate-500">No results found</p> : null}
      {hasMore && !loading && !error && <button type="button" className="p-2 text-sm underline" onClick={() => load(search, offset)}>Load more</button>}
    </div>, document.body)}
  </div>;
}
