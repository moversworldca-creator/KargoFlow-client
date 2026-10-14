import React, { useEffect } from "react";
import { Check, LoaderCircle, X } from "lucide-react";

export const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-heading outline-none transition-all placeholder:text-slate-400 focus:border-brand-blue focus:ring-3 focus:ring-brand-blue/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

export function Field({
  label,
  error,
  children,
  wide = false,
}) {
  return (
    <label className={wide ? "block sm:col-span-2" : "block"}>
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </span>
      {children}
      {error && <span className="mt-1 block text-[10px] font-semibold text-rose-600">{error}</span>}
    </label>
  );
}

export function Switch({
  checked,
  label,
  onChange,
}) {
  return (
    <button
      aria-checked={checked}
      className="flex w-full items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-left dark:bg-slate-800/60"
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{label}</span>
      <span className={`relative h-5 w-9 shrink-0 rounded-full ${checked ? "bg-brand-blue" : "bg-slate-300 dark:bg-slate-600"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-[1.125rem]" : "translate-x-0.5"}`} />
      </span>
    </button>
  );
}

export function Drawer({
  open,
  title,
  subtitle,
  children,
  onClose,
}) {
  useEffect(() => {
    if (!open) return;
    const listener = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [onClose, open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-slate-950/45 backdrop-blur-sm" role="presentation">
      <button aria-label="Close panel" className="absolute inset-0" onClick={onClose} type="button" />
      <section
        aria-modal="true"
        className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl dark:bg-slate-900"
        role="dialog"
      >
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-5 dark:border-slate-800">
          <div>
            <h2 className="font-heading text-base font-bold text-heading dark:text-white">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[10px] text-slate-400">{subtitle}</p>}
          </div>
          <button aria-label="Close panel" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={onClose} type="button">
            <X size={17} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function Toast({
  toast,
  onClose,
}) {
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(onClose, 3000);
    return () => window.clearTimeout(timeout);
  }, [onClose, toast]);

  if (!toast) return null;
  return (
    <div
      className={`fixed bottom-5 right-5 z-[100] flex max-w-sm items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-semibold shadow-2xl ${
        toast.tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
          : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"
      }`}
      role="status"
    >
      {toast.tone === "success" ? <Check size={15} /> : <X size={15} />}
      {toast.message}
    </div>
  );
}

export function LoadingTable() {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
        <LoaderCircle className="animate-spin" size={15} /> Loading records...
      </div>
      {[0, 1, 2, 3].map((row) => (
        <div className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" key={row} />
      ))}
    </div>
  );
}
