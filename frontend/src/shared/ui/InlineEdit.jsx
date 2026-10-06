import React, { useState, useRef, useEffect } from 'react';

export default function InlineEdit({ 
  value, 
  onSave, 
  placeholder = 'Click to edit...', 
  type = 'text', 
  className = '', 
  renderDisplay,
  inputClassName = '',
  options = [] // for select
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value || '');
  const inputRef = useRef(null);

  useEffect(() => {
    setTempValue(value || '');
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (tempValue !== (value || '')) {
      onSave(tempValue);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setTempValue(value || '');
      setIsEditing(false);
    }
  };

  if (isEditing) {
    if (type === 'select') {
      return (
        <select
          ref={inputRef}
          className={`w-full rounded border border-brand/30 bg-white px-2 py-1 text-inherit outline-none focus:border-brand focus:ring-1 focus:ring-brand ${inputClassName}`}
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }
    return (
      <input
        ref={inputRef}
        type={type}
        className={`w-full rounded border border-brand/30 bg-white px-2 py-1 text-inherit outline-none focus:border-brand focus:ring-1 focus:ring-brand ${inputClassName}`}
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
    );
  }

  const displayText = value || placeholder;

  return (
    <span
      className={`cursor-pointer hover:bg-slate-100 rounded px-1 -mx-1 border border-transparent hover:border-slate-200 transition-colors inline-block min-w-[20px] ${className} ${!value ? 'text-slate-400 italic' : ''}`}
      onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
      title="Click to edit"
    >
      {renderDisplay ? renderDisplay(value) : displayText}
    </span>
  );
}
