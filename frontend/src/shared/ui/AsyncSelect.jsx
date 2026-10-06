import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Loader2, Search, X } from 'lucide-react';

export default function AsyncSelect({
  value,
  onChange,
  fetchOptions, // (search, offset, limit) => Promise<{results: [], hasMore: boolean}>
  labelField = 'label',   // default to 'label' — all lookup APIs return this field
  valueField = 'id',
  placeholder = 'Select...',
  initialLabel = '',      // pass the human-readable label for the current value on mount
  className = '',
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  // Seed selectedLabel from initialLabel so the control shows something immediately
  const [selectedLabel, setSelectedLabel] = useState(initialLabel || '');

  const containerRef = useRef(null);
  const observerRef = useRef(null);
  const menuRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState(null);
  const limit = 20;

  // When initialLabel changes (e.g. parent re-loads record data), sync it
  useEffect(() => {
    if (initialLabel) setSelectedLabel(initialLabel);
  }, [initialLabel]);

  // When value changes externally, try to resolve label from already-loaded options
  useEffect(() => {
    if (!value) {
      setSelectedLabel('');
      return;
    }
    if (options.length) {
      const opt = options.find(o => String(o[valueField]) === String(value));
      if (opt) {
        // prefer the standardized 'label' field, then the configured labelField
        setSelectedLabel(opt['label'] || opt[labelField] || String(value));
      }
    }
    // If we don't have options yet and no initialLabel, leave whatever we have (may be empty)
  }, [value, options, labelField, valueField]);

  // Click outside to close
  useEffect(() => {
    const handleClick = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        !(menuRef.current && menuRef.current.contains(e.target))
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const updatePosition = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    };
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  const loadOptions = useCallback(async (currentSearch, currentOffset, reset = false) => {
    if (isLoading || (!hasMore && !reset)) return;
    setIsLoading(true);
    try {
      const res = await fetchOptions(currentSearch, currentOffset, limit);
      const results = res?.results ?? [];
      const more = res?.hasMore ?? false;
      setOptions(prev => reset ? results : [...prev, ...results]);
      setHasMore(more);
      setOffset(currentOffset + limit);
    } catch (err) {
      console.error('AsyncSelect fetchOptions error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchOptions, isLoading, hasMore]);

  // Debounced search — fires whenever the dropdown opens or search text changes
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      setHasMore(true);
      setOffset(0);
      loadOptions(search, 0, true);
    }, 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, isOpen]);

  // Intersection observer for infinite scroll sentinel
  useEffect(() => {
    if (!isOpen || !hasMore || isLoading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadOptions(search, offset, false);
        }
      },
      { threshold: 0.1 }
    );
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, hasMore, isLoading, search, offset]);

  const handleSelect = (opt) => {
    onChange(opt[valueField], opt);
    // prefer the standardized 'label' field, then the configured labelField
    setSelectedLabel(opt['label'] || opt[labelField] || String(opt[valueField]));
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('', null);
    setSelectedLabel('');
  };

  const displayText = value ? (selectedLabel || placeholder) : null;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        className={`flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors hover:border-brand/50 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="truncate text-slate-700">
          {displayText ?? <span className="text-slate-400">{placeholder}</span>}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {value && !disabled && (
            <X className="h-4 w-4 text-slate-400 hover:text-slate-600" onClick={handleClear} />
          )}
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && menuStyle && createPortal(
        <div ref={menuRef} style={menuStyle} className="max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {/* Search box */}
          <div className="sticky top-0 z-10 border-b border-slate-100 bg-white px-3 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                autoFocus
                className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          <ul className="mt-1">
            {options.length === 0 && !isLoading ? (
              <li className="px-3 py-4 text-center text-sm text-slate-500">No results found</li>
            ) : (
              options.map((opt, i) => {
                const label = opt['label'] || opt[labelField] || String(opt[valueField] ?? i);
                const isSelected = String(opt[valueField]) === String(value);
                return (
                  <li
                    key={opt[valueField] ?? i}
                    className={`cursor-pointer px-3 py-2 text-sm transition-colors hover:bg-blue-50 hover:text-blue-700 ${isSelected ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'}`}
                    onClick={() => handleSelect(opt)}
                  >
                    {label}
                  </li>
                );
              })
            )}

            {/* Infinite scroll sentinel */}
            {hasMore && (
              <li ref={observerRef} className="flex items-center justify-center py-3">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              </li>
            )}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
}
