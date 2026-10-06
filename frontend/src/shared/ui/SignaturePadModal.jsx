import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const buttonBase =
  'inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-xs font-extrabold uppercase tracking-widest transition disabled:opacity-60 disabled:cursor-not-allowed';

const overlayClass = 'fixed inset-0 z-[50000] flex items-end sm:items-center justify-center p-4';

export default function SignaturePadModal({
  open,
  title = 'Signature',
  description = 'Draw your signature in the box below, or check the box to accept without signing.',
  saved = false,
  savedTitle = 'Signature saved',
  savedDescription = 'Your signature has been placed into the document.',
  nextLabel = 'Next signature',
  resetKey = '',
  onNext,
  onClose,
  onSave,
}) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [noSignature, setNoSignature] = useState(false);

  const canInteract = Boolean(open) && !noSignature;

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const getDataUrl = () => {
    const canvas = canvasRef.current;
    if (!canvas) return '';
    return canvas.toDataURL('image/png');
  };

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    setReady(true);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || saved) return;
    drawingRef.current = false;
    setNoSignature(false);
    setReady(false);
  }, [open, saved, resetKey]);

  useEffect(() => {
    if (!open || saved) {
      setReady(false);
      return;
    }
    const timer = setTimeout(() => initCanvas(), 0);
    const onResize = () => initCanvas();
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', onResize);
      setReady(false);
    };
  }, [open, saved, resetKey]);

  const pointerToCanvas = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e?.clientX ?? (e?.touches?.[0]?.clientX ?? 0);
    const clientY = e?.clientY ?? (e?.touches?.[0]?.clientY ?? 0);
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e) => {
    if (!canInteract) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    drawingRef.current = true;
    const { x, y } = pointerToCanvas(e);
    lastPointRef.current = { x, y };
  };

  const moveDraw = (e) => {
    if (!drawingRef.current || !canInteract) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { x, y } = pointerToCanvas(e);
    const last = lastPointRef.current;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastPointRef.current = { x, y };
  };

  const endDraw = () => {
    drawingRef.current = false;
  };

  const handleSave = () => {
    if (noSignature) {
      onSave?.('');
    } else {
      onSave?.(getDataUrl());
    }
  };

  const header = String(title || 'Signature');

  if (!open) return null;

  const modalElement = (
    <div className={overlayClass}>
      <button type="button" className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} aria-label="Close" />
      <div className="relative w-full sm:max-w-2xl overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#5d7894]">E-Sign</div>
              <div className="mt-1 text-2xl font-extrabold text-[#0f172a]">{header}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-10 w-10 rounded-2xl border border-slate-200 bg-white text-[#64748b] hover:text-[#0f172a] hover:bg-slate-50"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="mt-3 text-xs font-semibold text-[#5d7894]">{description}</div>
        </div>
        
        <div className="p-6">
          {saved ? (
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
              <div className="text-sm font-extrabold text-emerald-800">{savedTitle}</div>
              <div className="mt-2 text-xs font-semibold leading-relaxed text-emerald-700">{savedDescription}</div>
              <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  className={`${buttonBase} border border-slate-200 bg-white text-[#0f172a] hover:bg-slate-50`}
                  onClick={onClose}
                >
                  Done
                </button>
                {onNext ? (
                  <button
                    type="button"
                    className={`${buttonBase} bg-primary text-white shadow-[0_14px_28px_-18px_rgba(59,130,246,0.6)] hover:bg-primary/90`}
                    onClick={onNext}
                  >
                    {nextLabel}
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              <div 
                className="rounded-3xl border border-slate-250 bg-slate-50 p-4 transition-all duration-200"
                style={{ opacity: noSignature ? 0.45 : 1, pointerEvents: noSignature ? 'none' : 'auto' }}
              >
                <canvas
                  ref={canvasRef}
                  className="h-48 w-full rounded-2xl bg-white border border-slate-200 cursor-crosshair touch-none"
                  onMouseDown={startDraw}
                  onMouseMove={moveDraw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    startDraw(e);
                  }}
                  onTouchMove={(e) => {
                    e.preventDefault();
                    moveDraw(e);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    endDraw();
                  }}
                />
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <label className="inline-flex items-center gap-2 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noSignature}
                    onChange={(e) => setNoSignature(e.target.checked)}
                    className="rounded border-slate-350 focus:ring-primary text-primary h-4 w-4"
                  />
                  <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                    Accept without signature (Direct Accept)
                  </span>
                </label>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  className={`${buttonBase} border border-slate-200 bg-white text-[#0f172a] hover:bg-slate-50`}
                  onClick={clearCanvas}
                  disabled={noSignature || !ready}
                >
                  Clear
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className={`${buttonBase} border border-slate-200 bg-white text-[#0f172a] hover:bg-slate-50`}
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={`${buttonBase} bg-primary text-white shadow-[0_14px_28px_-18px_rgba(59,130,246,0.6)] hover:bg-primary/90`}
                    onClick={handleSave}
                    disabled={!noSignature && !ready}
                  >
                    Save
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalElement, document.body);
}
