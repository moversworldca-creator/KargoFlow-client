// Small accessible building blocks for the User Management screens.
import React, { useEffect, useId, useRef } from 'react';
import { AlertTriangle, Loader2, Lock, X } from 'lucide-react';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Modal dialog: labelled, focus moves in on open and back on close, Escape closes. */
export function Dialog({ title, description, onClose, children, footer, size = 'md', busy = false, variant = 'modal' }) {
    const titleId = useId();
    const descId = useId();
    const panel = useRef(null);
    const opener = useRef(typeof document !== 'undefined' ? document.activeElement : null);

    useEffect(() => {
        const first = panel.current?.querySelector(FOCUSABLE);
        (first || panel.current)?.focus();
        const previous = opener.current;
        return () => { if (previous && typeof previous.focus === 'function') previous.focus(); };
    }, []);

    const onKeyDown = (event) => {
        if (event.key === 'Escape' && !busy) { event.stopPropagation(); onClose?.(); return; }
        if (event.key !== 'Tab') return;
        const items = Array.from(panel.current?.querySelectorAll(FOCUSABLE) || []);
        if (!items.length) return;
        const [first, last] = [items[0], items[items.length - 1]];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };

    const width = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' }[size] || 'max-w-xl';
    const drawer = variant === 'drawer';
    return (
        <div className={`fixed inset-0 z-50 flex bg-slate-900/50 ${drawer ? 'justify-end' : 'items-center justify-center p-4'}`} onKeyDown={onKeyDown}>
            <div
                ref={panel}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={description ? descId : undefined}
                tabIndex={-1}
                className={drawer
                    ? 'h-full w-full max-w-2xl overflow-y-auto bg-white p-5 shadow-2xl outline-none dark:bg-slate-900'
                    : `w-full ${width} max-h-[90vh] overflow-y-auto rounded-xl bg-white p-5 shadow-xl outline-none dark:bg-slate-900`}
            >
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <h2 id={titleId} className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>
                        {description && <p id={descId} className="mt-1 text-xs text-slate-600 dark:text-slate-300">{description}</p>}
                    </div>
                    <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-50">
                        <X size={16} />
                    </button>
                </div>
                {children}
                {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
            </div>
        </div>
    );
}

/** Confirmation for sensitive commands. The confirm button is disabled while busy (no double submit). */
export function ConfirmDialog({ title, children, confirmLabel, tone = 'danger', busy, error, onConfirm, onCancel }) {
    return (
        <Dialog
            title={title}
            onClose={onCancel}
            size="sm"
            busy={busy}
            footer={(
                <>
                    <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
                    <Button variant={tone} onClick={onConfirm} busy={busy}>{confirmLabel}</Button>
                </>
            )}
        >
            <div className="space-y-3 text-sm text-slate-700 dark:text-slate-200">{children}</div>
            {error && <ErrorBanner message={error} />}
        </Dialog>
    );
}

const VARIANTS = {
    primary: 'bg-primary text-white hover:bg-primary/90',
    danger: 'bg-rose-700 text-white hover:bg-rose-800',
    ghost: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
};

export function Button({ variant = 'primary', busy = false, disabled = false, children, type = 'button', className = '', ...rest }) {
    return (
        <button
            type={type}
            disabled={disabled || busy}
            aria-busy={busy || undefined}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant] || VARIANTS.primary} ${className}`}
            {...rest}
        >
            {busy && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
            {children}
        </button>
    );
}

const TONES = {
    green: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-800 ring-amber-200',
    red: 'bg-rose-50 text-rose-800 ring-rose-200',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
    blue: 'bg-sky-50 text-sky-800 ring-sky-200',
};

/** A status label: always text, never colour alone. */
export function Badge({ tone = 'slate', children, title }) {
    return (
        <span title={title} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${TONES[tone] || TONES.slate}`}>
            {children}
        </span>
    );
}

export function Field({ label, htmlFor, error, hint, required, children }) {
    return (
        <div className="space-y-1">
            <label htmlFor={htmlFor} className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                {label}{required && <span className="text-rose-700" aria-hidden="true"> *</span>}
            </label>
            {children}
            {hint && !error && <p className="text-[11px] text-slate-500">{hint}</p>}
            {error && <p role="alert" className="text-[11px] font-medium text-rose-700">{error}</p>}
        </div>
    );
}

export const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

export function ErrorBanner({ message, onRetry }) {
    if (!message) return null;
    return (
        <div role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span className="flex-1">{message}</span>
            {onRetry && <button type="button" onClick={onRetry} className="font-semibold underline">Retry</button>}
        </div>
    );
}

/** Shown when the backend refuses to show a section (403), distinct from loading and empty. */
export function DeniedState({ title = 'Access restricted', children }) {
    return (
        <div role="status" className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center">
            <Lock size={20} className="text-slate-400" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
            <p className="max-w-md text-xs text-slate-600 dark:text-slate-300">{children || 'Your role does not include access to this information.'}</p>
        </div>
    );
}

export function LoadingState({ label = 'Loading…' }) {
    return (
        <div role="status" className="flex items-center justify-center gap-2 py-10 text-xs text-slate-500">
            <Loader2 size={16} className="animate-spin" aria-hidden="true" /> {label}
        </div>
    );
}

export function EmptyState({ children }) {
    return <p className="py-8 text-center text-xs text-slate-500">{children}</p>;
}

export function ReadOnlyNotice() {
    return (
        <div role="status" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <Lock size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>Your company&apos;s subscription is read-only. You can review people and access, but changes are disabled.</span>
        </div>
    );
}
