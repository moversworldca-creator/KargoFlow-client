import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { Undo2, Redo2 } from 'lucide-react';
import { 
  ArrowLeft, Save, FileText, Settings, Layout, GripVertical, HelpCircle,
  Trash2, Edit2, ArrowUp, ArrowDown, Plus, MousePointerClick, Copy, Check
} from 'lucide-react';
import RichTextEditor from '../../../shared/ui/RichTextEditor';
import { getPortalBaseUrl } from '../../../shared/utils/portalBaseUrl';

const ESTIMATE_BUILDER_DRAG_TYPE = 'application/x-movers-estimate-builder';
const DEFAULT_DOC_SETTINGS = { format: 'Letter', margin: '40px' };
const DEFAULT_ESTIMATE_TEMPLATE_TYPES = [
  { value: 'moving', label: 'Moving' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'minimal', label: 'Minimal' },
];

const parseEstimateBuilderHtml = (htmlContent) => {
  let content = String(htmlContent || '');
  const docMatch = content.match(/^<!-- DOC_SETTINGS:(.*?) -->\n*/);
  let docSettings = { ...DEFAULT_DOC_SETTINGS };

  if (docMatch) {
    try {
      docSettings = { ...docSettings, ...JSON.parse(docMatch[1]) };
    } catch {
      docSettings = { ...DEFAULT_DOC_SETTINGS };
    }
    content = content.replace(/^<!-- DOC_SETTINGS:(.*?) -->\n*/, '');
  }

  if (!content.trim()) {
    return { docSettings, blocks: [] };
  }

  const blocks = content
    .split('<!-- BLOCK_SEPARATOR -->')
    .map((part, index) => {
      let html = part.trim();
      let settings = {};
      const blockMatch = html.match(/^<!-- BLOCK_SETTINGS:(.*?) -->\n*/);
      if (blockMatch) {
        try {
          settings = JSON.parse(blockMatch[1]);
          html = html.replace(/^<!-- BLOCK_SETTINGS:(.*?) -->\n*/, '');
        } catch {
          settings = {};
        }
      }
      return { id: `block_init_${index}`, html, settings };
    })
    .filter((block) => block.html !== '');

  return { docSettings, blocks };
};

const HEADER_WIDGET_MARKER = 'id="header-accept-toggle"';
const applyHeaderWidgetAcceptanceMode = (htmlTemplate, requireESignature = true) => {
  const rawHtml = String(htmlTemplate || '');
  if (!rawHtml.includes(HEADER_WIDGET_MARKER)) {
    return rawHtml;
  }

  let nextHtml = rawHtml.replace(
    /<div class="est-header-wrapper"(?:\s+data-require-signature="[^"]*")?>/,
    `<div class="est-header-wrapper" data-require-signature="${requireESignature ? 'true' : 'false'}">`
  );

  nextHtml = nextHtml.replace(
    /<div style="font-size: 0\.75rem; font-weight: 600; color: #64748b; margin-bottom: 1rem;">[\s\S]*?<\/div>/,
    `<div style="font-size: 0.75rem; font-weight: 600; color: #64748b; margin-bottom: 1rem;">${
      requireESignature
        ? 'Draw your signature in the box below to accept this estimate.'
        : 'Draw your signature in the box below, or check the box to accept without signing.'
    }</div>`
  );

  if (!requireESignature) {
    nextHtml = nextHtml.replace(
      /<!-- Signature Modal -->[\s\S]*?<div class="est-modal-overlay modal-thankyou">/m,
      '<div class="est-modal-overlay modal-thankyou">'
    );
  }

  if (requireESignature) {
    nextHtml = nextHtml.replace(
      /(<label for="header-sign-save-toggle" data-action="sign-accept" class="btn btn-blue"[^>]*>)([^<]*)(<\/label>)/,
      '$1Sign & Accept$3'
    );
  } else {
    nextHtml = nextHtml.replace(
      /<label for="header-sign-save-toggle" data-action="sign-accept" class="btn btn-blue"[^>]*>[^<]*<\/label>/,
      '<button type="button" data-action="accept-no-sig" class="btn btn-blue" style="padding: 0.5rem 1.5rem; margin: 0;">Accept</button>'
    );
    nextHtml = nextHtml.replace(
      /<label for="signature-toggle" class="sign-button">Open Signature Pad<\/label>/,
      '<button type="button" data-action="accept-no-sig" class="sign-button">Accept</button>'
    );
    nextHtml = nextHtml.replace(
      /<label for="header-accept-toggle" class="btn btn-dark accept-btn">Accept<\/label>/,
      '<button type="button" data-action="accept-no-sig" class="btn btn-dark accept-btn">Accept</button>'
    );
  }

  return nextHtml;
};

const WIDGET_CATEGORIES = [
  {
    title: 'Header & Meta',
    widgets: [
      {
        id: 'est_header',
        label: 'Header Section',
        html: `<style>
.est-header-wrapper { font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
.est-header-wrapper .section-padding { padding: 1.5rem; }
.est-header-wrapper .sticky-header-wrapper { background-color: #ffffff; border-bottom: 1px solid #e2e8f0; box-shadow: 0 4px 10px -2px rgba(0, 0, 0, 0.05); }
.est-header-wrapper .header-top-border { height: 6px; width: 100%; background: linear-gradient(90deg, #1d4ed8, #3b82f6); }
.est-header-wrapper .header-grid { display: flex; flex-direction: column; gap: 1.5rem; }
.est-header-wrapper .header-left { display: flex; align-items: center; gap: 1rem; }
.est-header-wrapper .header-right { display: flex; flex-direction: column; align-items: flex-start; gap: 1rem; }
.est-header-wrapper .logo-img { height: 40px; width: auto; object-fit: contain; }
.est-header-wrapper .action-buttons { display: flex; flex-direction: row; flex-wrap: wrap; gap: 0.75rem; width: 100%; }
.est-header-wrapper .btn { padding: 0.6rem 1.25rem; border-radius: 6px; font-size: 0.875rem; font-weight: 600; cursor: pointer; text-align: center; transition: all 0.2s ease; border: none; flex: 1 1 auto; display: flex; justify-content: center; align-items: center; }
.est-header-wrapper .btn-dark { background-color: #0f172a; color: #ffffff; margin: 0; }
.est-header-wrapper .btn-dark:hover { background-color: #1e293b; }
.est-header-wrapper .btn-blue { background-color: #2563eb; color: #ffffff; position: relative; margin: 0; }
.est-header-wrapper .btn-blue:hover { background-color: #1d4ed8; }
.est-header-wrapper .btn-green { background-color: #10b981; color: #ffffff; margin: 0; }
.est-header-wrapper .btn-green:hover { background-color: #059669; }
.est-header-wrapper .portal-overlay-layer { position: absolute; top: 0; left: 0; right: 0; bottom: 0; opacity: 0.01; cursor: pointer; z-index: 10; }
.est-header-wrapper .portal-overlay-layer [data-portal-block] { display: block; width: 100%; height: 100%; }
.est-header-wrapper .estimate-title-group { text-align: left; }
.est-header-wrapper .estimate-title { font-size: 2rem; font-weight: 900; color: #0f172a; letter-spacing: -0.025em; line-height: 1; margin: 0 0 0.5rem 0; }
.est-header-wrapper .estimate-pill { display: inline-block; background-color: #eff6ff; color: #1d4ed8; padding: 0.25rem 1rem; border-radius: 999px; font-size: 0.875rem; font-weight: 700; border: 1px solid #bfdbfe; }
.est-header-wrapper .pay-buttons { display: none; flex-direction: row; flex-wrap: wrap; gap: 0.75rem; flex: 1 1 auto; }

.est-header-wrapper .est-modal-overlay { display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 9999; align-items: center; justify-content: center; padding: 1rem; }
.est-header-wrapper .est-modal { background: #ffffff; border-radius: 1.5rem; width: 100%; max-width: 600px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); border: 1px solid #e2e8f0; overflow: hidden; }
.est-header-wrapper .sig-header { border-bottom: 1px solid #f1f5f9; background: #f8fafc; padding: 1.25rem 1.5rem; display: flex; justify-content: space-between; align-items: flex-start; }
.est-header-wrapper .sig-body { padding: 1.5rem; }

#header-sign-save-toggle:checked ~ .est-header-wrapper .accept-btn { display: none; }
#header-sign-save-toggle:checked ~ .est-header-wrapper .pay-buttons { display: flex; }

#header-accept-toggle:checked ~ #header-sign-save-toggle:not(:checked) ~ .est-header-wrapper .modal-signature { display: flex; }
#header-sign-save-toggle:checked ~ #header-dismiss-toggle:not(:checked) ~ .est-header-wrapper .modal-thankyou { display: flex; }

@media (min-width: 768px) {
    .est-header-wrapper .section-padding { padding: 2rem 3rem; }
    .est-header-wrapper .header-grid { flex-direction: row; justify-content: space-between; align-items: flex-start; }
    .est-header-wrapper .header-right { align-items: flex-end; }
    .est-header-wrapper .logo-img { height: 50px; }
    .est-header-wrapper .action-buttons { width: auto; max-width: 100%; }
    .est-header-wrapper .btn { flex: none; min-width: 120px; }
    .est-header-wrapper .estimate-title-group { text-align: right; }
    .est-header-wrapper .estimate-title { font-size: 2.5rem; }
}
@media (min-width: 1024px) {
    .est-header-wrapper .sticky-header-wrapper { border-top-left-radius: 11px; border-top-right-radius: 11px; }
}
</style>
<input type="checkbox" id="header-accept-toggle" style="display: none;" />
<input type="checkbox" id="header-sign-save-toggle" style="display: none;" />
<input type="checkbox" id="header-dismiss-toggle" style="display: none;" />

<div class="est-header-wrapper">
    <!-- Signature Modal -->
    <div class="est-modal-overlay modal-signature">
        <div class="est-modal">
            <div class="sig-header">
                <div>
                    <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b;">E-Sign</div>
                    <div style="font-size: 1.5rem; font-weight: 800; color: #0f172a; margin-top: 0.25rem;">Accept Estimate</div>
                </div>
                <label for="header-accept-toggle" style="cursor: pointer; width: 2.5rem; height: 2.5rem; display: flex; align-items: center; justify-content: center; border-radius: 1rem; border: 1px solid #e2e8f0; color: #64748b; background: #fff; font-weight: bold;">✕</label>
            </div>
            <div class="sig-body">
                <div style="font-size: 0.75rem; font-weight: 600; color: #64748b; margin-bottom: 1rem;">Draw your signature in the box below, or check the box to accept without signing.</div>
                <div style="border: 1px solid #e2e8f0; border-radius: 1rem; background: #fff; height: 192px; overflow: hidden; position: relative; touch-action: none;">
                    <canvas id="est-sig-canvas" width="600" height="192" style="width: 100%; height: 100%; cursor: crosshair;"></canvas>
                    <script>
                        (function(){
                            var canvas = document.getElementById('est-sig-canvas');
                            if(!canvas) return;
                            var ctx = canvas.getContext('2d');
                            var isDrawing = false;
                            
                            // Handle high DPI displays for crisp drawing
                            var ratio = Math.max(1, window.devicePixelRatio || 1);
                            var rect = canvas.getBoundingClientRect();
                            if (rect.width && rect.height) {
                                canvas.width = Math.round(rect.width * ratio);
                                canvas.height = Math.round(rect.height * ratio);
                            }

                            // Dynamic line width based on internal width vs default 600
                            ctx.lineWidth = 3 * (canvas.width / 600);
                            ctx.lineCap = 'round';
                            ctx.lineJoin = 'round';
                            ctx.strokeStyle = '#0f172a';
                            
                            function getPos(e) {
                                var currentRect = canvas.getBoundingClientRect();
                                var clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
                                var clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
                                
                                // Calculate dynamic scale based on actual CSS size vs internal size
                                var scaleX = canvas.width / currentRect.width;
                                var scaleY = canvas.height / currentRect.height;
                                
                                // If context was scaled by ratio (DPI), we need to divide by ratio 
                                // because the canvas context transform will multiply it back!
                                // Actually, if we didn't resize because it was hidden, scaleX is e.g. 600/300 = 2.
                                // If we DID resize, scaleX is e.g. (300*ratio)/300 = ratio.
                                // If context is transformed by ratio, drawing at X means X * ratio.
                                // We want the final coordinate to be (clientX - left) * scaleX.
                                // But since ctx.lineTo applies the transform, we must reverse the transform.
                                // To make this bulletproof, we will reset the transform and handle scaling manually!
                                return { 
                                    x: (clientX - currentRect.left) * scaleX, 
                                    y: (clientY - currentRect.top) * scaleY 
                                };
                            }
                            
                            function start(e) {
                                isDrawing = true;
                                var pos = getPos(e);
                                ctx.beginPath();
                                ctx.moveTo(pos.x, pos.y);
                                if(e.cancelable) e.preventDefault();
                            }
                            function draw(e) {
                                if(!isDrawing) return;
                                var pos = getPos(e);
                                ctx.lineTo(pos.x, pos.y);
                                ctx.stroke();
                                if(e.cancelable) e.preventDefault();
                            }
                            function stop(e) {
                                if(isDrawing) { ctx.stroke(); isDrawing = false; }
                            }
                            
                            canvas.addEventListener('mousedown', start);
                            canvas.addEventListener('mousemove', draw);
                            canvas.addEventListener('mouseup', stop);
                            canvas.addEventListener('mouseout', stop);
                            canvas.addEventListener('touchstart', start, {passive: false});
                            canvas.addEventListener('touchmove', draw, {passive: false});
                            canvas.addEventListener('touchend', stop);
                            
                            var clearBtn = document.getElementById('est-sig-clear');
                            if (clearBtn) {
                                clearBtn.addEventListener('click', function(e) {
                                    e.preventDefault();
                                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                                });
                            }
                        })();
                    </script>
                </div>
                
                <div style="margin-top: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    <input type="checkbox" id="header-no-sig-toggle" style="width: 1rem; height: 1rem; cursor: pointer;">
                    <label for="header-no-sig-toggle" style="font-size: 0.75rem; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; cursor: pointer;">Accept without signature (Direct Accept)</label>
                </div>
                
                <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                    <button id="est-sig-clear" class="btn btn-dark" style="background: #fff; color: #0f172a; border: 1px solid #e2e8f0; padding: 0.5rem 1rem;">Clear</button>
                    <div style="display: flex; gap: 0.5rem;">
                        <label for="header-accept-toggle" class="btn btn-dark" style="background: #fff; color: #0f172a; border: 1px solid #e2e8f0; padding: 0.5rem 1rem;">Cancel</label>
                        <label for="header-sign-save-toggle" data-action="sign-accept" class="btn btn-blue" style="padding: 0.5rem 1.5rem; margin: 0;">Save</label>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Thank You Modal -->
    <div class="est-modal-overlay modal-thankyou">
        <div class="est-modal" style="max-width: 400px; padding: 2.5rem; text-align: center;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 4rem; height: 4rem; border-radius: 9999px; background-color: #d1fae5; color: #10b981; margin-bottom: 1.5rem;">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <h2 style="font-size: 1.75rem; font-weight: 900; color: #0f172a; margin: 0 0 0.5rem 0; letter-spacing: -0.025em;">Thank You!</h2>
            <p style="font-size: 1rem; color: #64748b; margin: 0 0 2rem 0; font-weight: 500;">Thank you for accepting the estimate. We look forward to your move!</p>
            <div style="display: flex;">
                <label for="header-dismiss-toggle" class="btn btn-dark" style="flex: 1; padding: 0.875rem;">Close &amp; Continue</label>
            </div>
        </div>
    </div>

    <div class="sticky-header-wrapper">
        <div class="header-top-border"></div>
        <header class="section-padding header-grid">
            <div class="header-left">
                <img src="@company_logo_url" alt="@branch_name Logo" class="logo-img">
                <div>
                    <h2 style="font-size: 1.125rem; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.2;">@branch_name</h2>
                    <p style="font-size: 0.7rem; font-weight: 600; color: #64748b; letter-spacing: 0.05em; margin: 0.25rem 0 0 0;">MOVING PORTAL ESTIMATE</p>
                </div>
            </div>
            <div class="header-right">
                <div class="action-buttons">
                    <label for="header-accept-toggle" class="btn btn-dark accept-btn">Accept</label>
                    <div class="pay-buttons">
                        <label for="payment-toggle-deposit" data-action="pay-deposit" class="btn btn-green">Pay Deposit (@deposit_amount)</label>
                        <label for="payment-toggle-full" data-action="pay-full" class="btn btn-dark">Full Payment (@grand_total)</label>
                    </div>
                    <a href="@inventory_link" target="_blank" class="btn btn-blue" style="text-decoration: none;">
                        Inventory Portal
                    </a>
                </div>
                <div class="estimate-title-group">
                    <h1 class="estimate-title">ESTIMATE</h1>
                    <div class="estimate-pill">#@estimate_number</div>
                </div>
            </div>
        </header>
    </div>
</div>`
      },
      {
        id: 'est_meta_block',
        label: 'Meta Block (Address/Rep)',
        html: `<style>
@media (max-width: 768px) {
    .responsive-grid-3 { grid-template-columns: 1fr !important; }
    .responsive-grid-2 { grid-template-columns: 1fr !important; }
    .mobile-padding { padding-left: 1.5rem !important; padding-right: 1.5rem !important; padding-top: 1.5rem !important; }
    .financial-box-width { width: 100% !important; min-width: 0 !important; }
    .responsive-flex-end { justify-content: flex-start !important; }
    .route-container { flex-direction: column !important; align-items: stretch !important; }
    .route-arrow-h { display: none !important; }
}
</style>
<section class="responsive-grid-3 mobile-padding" style="padding: 2.5rem 3rem; display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; border-bottom: 1px solid #e2e8f0;">
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem;">
        <h3 style="font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0;">Company Details</h3>
        <div>
            <h2 style="font-size: 1.125rem; font-weight: 700; color: #0f172a; margin: 0 0 0.25rem 0;">@branch_name</h2>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.875rem; color: #475569;">
            <p style="margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                <span style="font-weight: 600; color: #0f172a;">Phone:</span> 
                <a href="tel:@branch_phone" style="color: #2563eb; text-decoration: none;">@branch_phone</a>
            </p>
            <p style="margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                <span style="font-weight: 600; color: #0f172a;">Email:</span> 
                <a href="mailto:@branch_email" style="color: #2563eb; text-decoration: none;">@branch_email</a>
            </p>
            <p style="margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                <span style="font-weight: 600; color: #0f172a;">Web:</span> 
                <a href="@branch_website" target="_blank" style="color: #2563eb; text-decoration: none;">@branch_website</a>
            </p>
        </div>
    </div>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem;">
        <h3 style="font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0;">Customer Details</h3>
        <div>
            <h2 style="font-size: 1.125rem; font-weight: 700; color: #0f172a; margin: 0 0 0.25rem 0;">@customer_name</h2>
            <div style="display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.875rem; color: #475569;">
                <p style="margin: 0;"><span style="font-weight: 500; color: #0f172a;">Phone:</span> <a href="tel:@customer_phone" style="color: #2563eb; text-decoration: none;">@customer_phone</a></p>
                <p style="margin: 0;"><span style="font-weight: 500; color: #0f172a;">Email:</span> <a href="mailto:@customer_email" style="color: #2563eb; text-decoration: none;">@customer_email</a></p>
            </div>
        </div>
    </div>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem;">
        <h3 style="font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0;">Sales Representative</h3>
        <div>
            <h2 style="font-size: 1.125rem; font-weight: 700; color: #0f172a; margin: 0 0 0.25rem 0;">@sales_rep_name</h2>
            <div style="display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.875rem; color: #475569;">
                <p style="margin: 0;"><span style="font-weight: 500; color: #0f172a;">Phone:</span> <a href="tel:@sales_rep_phone" style="color: #2563eb; text-decoration: none;">@sales_rep_phone</a></p>
            </div>
        </div>
    </div>
</section>`
      },
      {
        id: 'est_specs_bar',
        label: 'Move Specs Bar',
        html: `<section class="responsive-grid-3 mobile-padding" style="background-color: #eff6ff; border-bottom: 1px solid #dbeafe; padding: 1.5rem 3rem; display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem;">
    <div>
        <p style="font-size: 0.75rem; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem;">Move Date</p>
        <p style="font-size: 1rem; font-weight: 700; color: #0f172a; margin: 0;">@move_date</p>
    </div>
    <div>
        <p style="font-size: 0.75rem; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem;">Move Size</p>
        <p style="font-size: 1rem; font-weight: 700; color: #0f172a; margin: 0;">@move_size_label</p>
    </div>
    <div>
        <p style="font-size: 0.75rem; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem;">Service Type</p>
        <p style="font-size: 1rem; font-weight: 700; color: #0f172a; margin: 0;">@move_type_label</p>
    </div>
</section>`
      }
    ]
  },
  {
    title: 'Services & Details',
    widgets: [
      {
        id: 'est_logistics_plan',
        label: 'Logistics Plan',
        html: `<section class="mobile-padding" style="padding: 2.5rem 3rem 0; display: flex; flex-direction: column; gap: 1rem;">
    <h3 style="font-size: 1.125rem; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.025em; margin: 0;">Logistics Route</h3>
    <div class="route-container" style="display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
        <div class="route-item" style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                <span style="width: 2rem; height: 2rem; border-radius: 0.375rem; background-color: #1e293b; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 0.875rem; font-weight: 700;">A</span>
                <span style="font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Origin Pickup</span>
            </div>
            <p style="font-size: 0.875rem; font-weight: 500; color: #334155; padding-left: 2.75rem; line-height: 1.4; margin: 0;">@origin_address</p>
        </div>
        <div class="route-arrow-h" style="flex-grow: 1; text-align: center; display: flex; align-items: center; justify-content: center; padding: 0 1rem;">
            <svg style="width: 1.5rem; height: 1.5rem; color: #cbd5e1;" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
            </svg>
        </div>
        <div class="route-connector-v" style="display: none;"></div>
        <div class="route-item" style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                <span style="width: 2rem; height: 2rem; border-radius: 0.375rem; background-color: #2563eb; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 0.875rem; font-weight: 700;">B</span>
                <span style="font-size: 0.75rem; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.05em;">Destination Delivery</span>
            </div>
            <p style="font-size: 0.875rem; font-weight: 500; color: #334155; padding-left: 2.75rem; line-height: 1.4; margin: 0;">@destination_address</p>
        </div>
    </div>
</section>`
      },
      {
        id: 'est_itemized_breakdown',
        label: 'Itemized Breakdown Table',
        html: `<section class="mobile-padding" style="padding: 1.75rem 3rem 0; display: flex; flex-direction: column; gap: 1rem;">
    <h3 style="font-size: 1.125rem; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.025em; margin: 0;">Services &amp; Charges</h3>
    <div class="breakdown-table-wrapper">
        @estimate_breakdown
    </div>
</section>`
      },
      {
        id: 'est_financial_summary',
        label: 'Financial Summary',
        html: `<section class="mobile-padding responsive-flex-end" style="padding: 1.75rem 3rem 0; display: flex; justify-content: flex-end; width: 100%;">
    <div class="financial-box-width" style="width: 40%; min-width: 18.75rem; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.875rem; color: #475569;">
            <span style="font-weight: 500;">Deposit Required</span>
            <span style="font-weight: 600; color: #1e293b;">@deposit_amount</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.875rem; color: #475569;">
            <span style="font-weight: 500;">Balance Due</span>
            <span style="font-weight: 600; color: #1e293b;">@balance_due</span>
        </div>
        <div style="height: 1px; background-color: #cbd5e1; margin: 0.25rem 0;"></div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.875rem; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em;">Grand Total</span>
            <span style="font-size: 1.75rem; font-weight: 800; color: #1d4ed8; line-height: 1;">@grand_total</span>
        </div>
    </div>
</section>`
      }
    ]
  },
  {
    title: 'Terms & Signing',
    widgets: [
      {
        id: 'est_terms',
        label: 'Terms & Conditions',
        html: `<section data-portal-section="terms" class="mobile-padding" style="padding: 1.75rem 3rem 0; display: flex; flex-direction: column; gap: 0.5rem;">
    <h3 style="font-size: 1rem; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.025em; margin: 0;">@terms_title</h3>
    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0.75rem 1rem; font-size: 0.8125rem; color: #475569; line-height: 1.5; white-space: pre-wrap; height: auto; margin: 0;">@terms_body</div>
</section>`
      },
      {
        id: 'est_signing_payment',
        label: 'Signing & Payment Panels',
        html: `<section class="responsive-grid-2 mobile-padding" style="padding: 1.75rem 3rem 2.5rem; display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; border-top: 1px solid #e2e8f0; margin-top: 0.5rem;">
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; min-height: 12rem; justify-content: space-between;">
        <div>
            <h4 style="font-size: 0.95rem; font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 0.5rem; margin: 0;">
                <svg style="width: 1.15rem; height: 1.15rem; color: #64748b;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                </svg>
                Authorization
            </h4>
            <p style="font-size: 0.75rem; color: #64748b; margin-top: 0.5rem; margin-bottom: 0;">Please sign below to authorize this estimate and accept terms.</p>
        </div>
        <div style="display: flex; justify-content: center; align-items: center; margin-top: auto;">
            <label for="signature-toggle" class="sign-button">Open Signature Pad</label>
        </div>
    </div>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; min-height: 12rem; justify-content: space-between;">
        <div>
            <h4 style="font-size: 0.95rem; font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 0.5rem; margin: 0;">
                <svg style="width: 1.15rem; height: 1.15rem; color: #64748b;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                </svg>
                Secure Payment
            </h4>
            <p style="font-size: 0.75rem; color: #64748b; margin-top: 0.5rem; margin-bottom: 0;">Submit the deposit requirement payment to reserve booking dates.</p>
        </div>
        <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 0.375rem; padding: 0.75rem; display: flex; justify-content: center; align-items: center;">
            <span data-portal-block="payment"></span>
        </div>
    </div>
</section>`
      }
    ]
  },
  {
    title: 'Footer',
    widgets: [
      {
        id: 'est_footer',
        label: 'Footer Bar',
        html: `<footer class="mobile-padding" style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 2rem 3rem; text-align: center;">
    <div style="max-width: 42rem; margin: 0 auto; font-size: 0.75rem; color: #64748b; display: flex; flex-direction: column; gap: 0.75rem;">
        <p style="line-height: 1.6; margin: 0;">@branch_email_footer</p>
        <div style="height: 1px; background-color: #e2e8f0; width: 3.5rem; margin: 0.5rem auto;"></div>
    </div>
</footer>`
      }
    ]
  }
];

const DEFAULT_VARIABLE_REGISTRY = [
  {
    label: 'Customer',
    fields: [
      { key: 'Customer.full_name', description: 'Shipper full name' },
      { key: 'Customer.email', description: 'Shipper email address' },
      { key: 'Customer.primary_phone', description: 'Shipper phone number' },
    ]
  },
  {
    label: 'Opportunity',
    fields: [
      { key: 'Opportunity.move_date', description: 'Planned move date' },
      { key: 'Opportunity.binding_type', description: 'Binding or non-binding pricing' },
      { key: 'Opportunity.sales_number', description: 'Unique job sales ID' },
    ]
  },
  {
    label: 'Branch & Company',
    fields: [
      { key: 'Branch.name', description: 'Assigned location branch name' },
      { key: 'Branch.phone', description: 'Branch phone number' },
      { key: 'Branch.full_address', description: 'Branch office address' },
      { key: 'Branch.logo_url', description: 'Branch logo image URL' },
    ]
  },
  {
    label: 'Addresses',
    fields: [
      { key: 'OriginAddress.full_address', description: 'Starting address' },
      { key: 'DestinationAddress.full_address', description: 'Delivery address' },
    ]
  },
  {
    label: 'Estimates',
    fields: [
      { key: 'Estimate.hourly_rate', description: 'Hourly service rate' },
      { key: 'Estimate.crew_size', description: 'Number of movers' },
      { key: 'Estimate.truck_count', description: 'Number of trucks' },
      { key: 'Estimate.grand_total', description: 'Total charge estimate' },
    ]
  },
  {
    label: 'Contract',
    fields: [
      { key: 'Contract.contract_number', description: 'Unique invoice/contract number' },
      { key: 'Contract.portal_link', description: 'Online signature link' },
    ]
  }
];

const ESTIMATE_PORTAL_VARIABLE_REGISTRY = [
  {
    label: 'Estimate Portal',
    fields: [
      { key: 'estimate_number', description: 'Estimate display number' },
      { key: 'sales_number', description: 'Sales/Opportunity number' },
      { key: 'estimate_breakdown', description: 'Rendered estimate charges table' },
      { key: 'grand_total', description: 'Estimate grand total' },
      { key: 'deposit_amount', description: 'Deposit required' },
      { key: 'balance_due', description: 'Remaining balance due' },
      { key: 'subtotal', description: 'Estimate subtotal' },
      { key: 'discount_amount', description: 'Discount total' },
      { key: 'sales_tax_amount', description: 'Sales tax total' },
      { key: 'inventory_link', description: 'Customer inventory portal link' },
    ],
  },
  {
    label: 'Portal Customer',
    fields: [
      { key: 'customer_name', description: 'Customer full name' },
      { key: 'customer_email', description: 'Customer email address' },
      { key: 'customer_phone', description: 'Customer phone number' },
      { key: 'sales_rep_name', description: 'Assigned sales representative' },
      { key: 'sales_rep_phone', description: 'Sales representative phone number' },
    ],
  },
  {
    label: 'Portal Branch',
    fields: [
      { key: 'company_name', description: 'Company name' },
      { key: 'company_logo_url', description: 'Company or branch logo URL' },
      { key: 'branch_name', description: 'Assigned branch name' },
      { key: 'branch_phone', description: 'Branch phone number' },
      { key: 'branch_email', description: 'Branch email address' },
      { key: 'branch_website', description: 'Branch website URL' },
      { key: 'branch_address', description: 'Branch office address' },
      { key: 'branch_email_footer', description: 'Branch email footer HTML' },
    ],
  },
  {
    label: 'Portal Move Details',
    fields: [
      { key: 'move_date', description: 'Scheduled move date' },
      { key: 'move_size_label', description: 'Move size label' },
      { key: 'move_type_label', description: 'Move type label' },
      { key: 'origin_address', description: 'Pickup address' },
      { key: 'origin_meta', description: 'Pickup address notes' },
      { key: 'destination_address', description: 'Delivery address' },
      { key: 'destination_meta', description: 'Delivery address notes' },
      { key: 'route_stops_count', description: 'Additional route stop count' },
      { key: 'route_stops_summary', description: 'Plain text additional route stops' },
      { key: 'route_stops_html', description: 'Rendered additional route stops HTML' },
    ],
  },
  {
    label: 'Portal Terms',
    fields: [
      { key: 'terms_title', description: 'Estimate terms heading' },
      { key: 'terms_body', description: 'Estimate terms body text' },
      { key: 'checkbox_text', description: 'Customer agreement checkbox text' },
      { key: 'signature_text', description: 'Signature authorization text' },
      { key: 'payment_authorization_text', description: 'Payment authorization text' },
    ],
  },
];

const mergeVariableRegistries = (...registries) => {
  const seen = new Set();
  const merged = [];

  registries.forEach((groups) => {
    if (!Array.isArray(groups)) return;
    groups.forEach((group) => {
      const fields = (group?.fields || []).filter((field) => {
        const key = String(field?.key || '').trim();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (fields.length) {
        merged.push({
          ...group,
          label: group?.label || group?.entity || 'Variables',
          fields,
        });
      }
    });
  });

  return merged;
};


const BlockSettingsPanel = ({ block, onChange }) => {
  const settings = block.settings || {};
  const update = (k, v) => onChange({ ...block, settings: { ...settings, [k]: v } });

  return (
    <div className="p-4 space-y-6 text-sm font-sans">
      <div className="space-y-3">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-2">Typography & Alignment</h3>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Font Family</label>
          <select className="w-full border rounded p-1.5 text-xs" value={settings.fontFamily || ''} onChange={e => update('fontFamily', e.target.value)}>
            <option value="">Default (Inherit)</option>
            <option value="Arial, sans-serif">Arial</option>
            <option value="'Times New Roman', serif">Times New Roman</option>
            <option value="'Courier New', monospace">Courier New</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Text Align</label>
          <select className="w-full border rounded p-1.5 text-xs" value={settings.textAlign || ''} onChange={e => update('textAlign', e.target.value)}>
            <option value="">Default</option>
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
            <option value="justify">Justify</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-2">Spacing</h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Padding</label>
            <input type="text" className="w-full border rounded p-1.5 text-xs" placeholder="e.g. 10px 20px" value={settings.padding || ''} onChange={e => update('padding', e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Margin</label>
            <input type="text" className="w-full border rounded p-1.5 text-xs" placeholder="e.g. 0px 0px 20px" value={settings.margin || ''} onChange={e => update('margin', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-2">Appearance</h3>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Background Color</label>
          <input type="color" className="w-full border rounded h-8 p-0" value={settings.backgroundColor || '#ffffff'} onChange={e => update('backgroundColor', e.target.value)} />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Border</label>
          <input type="text" className="w-full border rounded p-1.5 text-xs" placeholder="e.g. 1px solid #ccc" value={settings.border || ''} onChange={e => update('border', e.target.value)} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="mt-4 pt-4 border-t flex justify-end">
          <button 
            type="button"
            onClick={() => {
              const label = window.prompt("Enter a name for this reusable clause:");
              if (label) window.dispatchEvent(new CustomEvent('save-clause', { detail: { html: block.html, label } }));
            }}
            className="text-xs font-bold px-3 py-1.5 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded shadow-sm border border-amber-200 flex items-center gap-1.5"
          >
            <Copy size={12}/> Save to Clause Library
          </button>
        </div>
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-2">Document Flow</h3>
        <div>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <input type="checkbox" checked={settings.isHeader || false} onChange={e => update('isHeader', e.target.checked)} />
            Repeat as Page Header
          </label>
        </div>
        <div>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <input type="checkbox" checked={settings.isFooter || false} onChange={e => update('isFooter', e.target.checked)} />
            Repeat as Page Footer
          </label>
        </div>
        <div>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <input type="checkbox" checked={settings.pageBreakBefore || false} onChange={e => update('pageBreakBefore', e.target.checked)} />
            Page Break Before
          </label>
        </div>
      </div>
    </div>
  );
};

const BlockItem =  ({
  block,
  index,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  dragStart,
  isEditing,
  startEditing,
  stopEditing,
  isSelected = false,
  isDragging = false,
  onSelect = () => {},
}) => {
  const settings = block?.settings || {};
  const blockStyle = {
    fontFamily: settings.fontFamily || undefined,
    textAlign: settings.textAlign || undefined,
    padding: settings.padding || undefined,
    margin: settings.margin || undefined,
    backgroundColor: settings.backgroundColor || undefined,
    border: settings.border || undefined,
    pageBreakBefore: settings.pageBreakBefore ? 'always' : undefined,
  };

  const handleBlockClick = (e) => {
    const target = e.target instanceof Element ? e.target : null;
    if (!target) {
      e.stopPropagation();
      onSelect();
      return;
    }

    const label = target.closest('label[for]');
    if (label && e.currentTarget.contains(label)) {
      const controlId = label.getAttribute('for');
      const control = controlId ? label.ownerDocument.getElementById(controlId) : null;
      if (
        control &&
        e.currentTarget.contains(control) &&
        (control instanceof HTMLInputElement) &&
        ['checkbox', 'radio'].includes(control.type)
      ) {
        e.preventDefault();
        control.checked = control.type === 'radio' ? true : !control.checked;
        control.dispatchEvent(new Event('input', { bubbles: true }));
        control.dispatchEvent(new Event('change', { bubbles: true }));
      }
      e.stopPropagation();
      return;
    }

    if (target.closest('button, a, input, select, textarea, canvas, [data-action], [data-portal-block]')) {
      e.stopPropagation();
      return;
    }

    e.stopPropagation();
    onSelect();
  };

  return (
    <div 
      onClick={handleBlockClick}
      className={`relative group rounded-lg transition-all border w-full min-w-0 break-words ${isDragging ? 'scale-[0.99] opacity-40' : ''} ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : isEditing ? 'border-blue-300 bg-blue-50/10' : 'border-transparent hover:border-blue-200 hover:bg-slate-50/50'}`}
    >
      {/* Controls: Float to the top right of the block when hovered */}
      <div className={`absolute -top-3 right-2 flex items-center bg-white border border-slate-200 shadow-sm rounded-lg p-0.5 z-20 transition-opacity ${isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <div 
          draggable={!isEditing} 
          onDragStart={(e) => dragStart(e, index)}
          className={`p-1.5 text-slate-400 hover:text-slate-600 rounded ${!isEditing ? 'cursor-grab active:cursor-grabbing hover:bg-slate-100' : 'opacity-30 cursor-not-allowed'}`}
        >
          <GripVertical size={14}/>
        </div>
        <div className="w-px h-4 bg-slate-200 mx-0.5"></div>
        <button type="button" onClick={onMoveUp} disabled={index === 0} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30 disabled:hover:bg-transparent"><ArrowUp size={14}/></button>
        <button type="button" onClick={onMoveDown} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"><ArrowDown size={14}/></button>
        <div className="w-px h-4 bg-slate-200 mx-0.5"></div>
        <button type="button" onClick={isEditing ? stopEditing : startEditing} className={`p-1.5 rounded ${isEditing ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'}`}><Edit2 size={14}/></button>
        <div className="w-px h-4 bg-slate-200 mx-0.5"></div>
        <button type="button" onClick={onRemove} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={14}/></button>
      </div>

      <div className={`p-1 ${isEditing ? 'pb-2' : ''}`} style={blockStyle}>
        {isEditing ? (
          <div className="bg-white rounded border border-blue-200 shadow-sm overflow-hidden flex flex-col">
             <RichTextEditor value={block.html} onChange={(v) => onUpdate(v)} minHeight="40px" />
             <div className="flex justify-end p-2 bg-slate-50 border-t border-slate-100">
                <button type="button" onClick={(e) => { e.stopPropagation(); stopEditing(); }} className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 shadow-sm">Done Editing</button>
             </div>
          </div>
        ) : (
          <div 
            className="prose max-w-none min-h-[2rem] w-full min-w-0 break-words overflow-x-auto" 
            dangerouslySetInnerHTML={{ __html: block.html || '<span class="text-slate-400 italic">Empty block. Click the pencil icon to edit.</span>' }} 
          />
        )}
      </div>
    </div>
  );
};

// A dropzone that appears and expands between blocks when dragging
const DropZone = ({ index, isDragging, isDragOver, onDragEnter, onDrop }) => {
  return (
    <div 
      data-testid={`document-drop-zone-${index}`}
      className={`relative z-10 transition-all duration-150 ease-in-out ${isDragging ? 'h-7 opacity-100' : 'h-2 -my-1 opacity-0'} ${isDragOver ? 'bg-blue-50/70' : ''}`}
      onDragEnter={(e) => onDragEnter(e, index)}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = e.dataTransfer.effectAllowed === 'copy' ? 'copy' : 'move';
        onDragEnter(e, index);
      }}
      onDrop={(e) => onDrop(e, index)}
      aria-label={`Drop block at position ${index + 1}`}
    >
      {isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-full h-1 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
        </div>
      )}
    </div>
  );
};

export default function EstimateBuilderFullPage({
  draft,
  onChange,
  onSave,
  onBack,
  onDuplicate,
  registry = [],
  branches = [],
  templateTypes = DEFAULT_ESTIMATE_TEMPLATE_TYPES
}) {
  const [isFullPreviewOpen, setIsFullPreviewOpen] = useState(false);
  const blockIdSeqRef = useRef(0);
  const nextBlockId = (prefix = 'block') => `${prefix}_${blockIdSeqRef.current += 1}`;
  const [initialBuilderState] = useState(() => parseEstimateBuilderHtml(draft.html_content));
  const [docSettings, setDocSettings] = useState(() => initialBuilderState.docSettings);
  const [blocks, setBlocks] = useState(() => initialBuilderState.blocks);
  const lastAppliedHtmlRef = useRef(String(draft.html_content || ''));

  const [editingBlockIndex, setEditingBlockIndex] = useState(null);

  const [showImportHtml, setShowImportHtml] = useState(false);
  const [importHtmlContent, setImportHtmlContent] = useState('');
  const [savedClauses, setSavedClauses] = useState(() => {
    try { return JSON.parse(localStorage.getItem('crm_reusable_clauses')) || []; } catch { return []; }
  });

  const saveClause = useCallback((html, label) => {
    const newClauses = [...savedClauses, { id: `clause_${Date.now()}`, html, label }];
    setSavedClauses(newClauses);
    localStorage.setItem('crm_reusable_clauses', JSON.stringify(newClauses));
  }, [savedClauses]);

  
  // Undo/Redo & Autosave state
  const [history, setHistory] = useState(() => [{ blocks, docSettings }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isDirty, setIsDirty] = useState(false);

  // Sidebar state
  const [activeTab, setActiveTab] = useState('widgets'); // 'widgets' | 'variables' | 'settings'
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedVar, setCopiedVar] = useState(null);
  const variableRegistry = mergeVariableRegistries(
    ESTIMATE_PORTAL_VARIABLE_REGISTRY,
    registry && registry.length > 0 ? registry : DEFAULT_VARIABLE_REGISTRY
  );
  const templateTypeOptions = Array.isArray(templateTypes) && templateTypes.length
    ? templateTypes
    : DEFAULT_ESTIMATE_TEMPLATE_TYPES;
  const selectedTemplateTypeLabel = templateTypeOptions.find((type) => type.value === draft.template_type)?.label
    || draft.template_type
    || 'Moving';

  useEffect(() => {
    const incomingHtml = String(draft.html_content || '');
    if (incomingHtml === lastAppliedHtmlRef.current) return;

    const parsed = parseEstimateBuilderHtml(incomingHtml);
    lastAppliedHtmlRef.current = incomingHtml;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBlocks(parsed.blocks);
    setDocSettings(parsed.docSettings);
    setHistory([{ blocks: parsed.blocks, docSettings: parsed.docSettings }]);
    setHistoryIndex(0);
    setEditingBlockIndex(null);
    setSelectedBlockIndex(null);
    setIsDirty(false);
  }, [draft.html_content]);

  useEffect(() => {
    const requireESignature = draft.require_e_signature !== false;
    const nextBlocks = blocks.map((block) => {
      const nextHtml = applyHeaderWidgetAcceptanceMode(block.html, requireESignature);
      return nextHtml === block.html ? block : { ...block, html: nextHtml };
    });
    const changed = nextBlocks.some((block, index) => block !== blocks[index]);
    if (!changed) return;
    syncBlocks(nextBlocks, docSettings, false);
  }, [blocks, docSettings, draft.require_e_signature]);

  useEffect(() => {
    const handleSaveClause = (e) => saveClause(e.detail.html, e.detail.label);
    window.addEventListener('save-clause', handleSaveClause);
    return () => window.removeEventListener('save-clause', handleSaveClause);
  }, [saveClause]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (isDirty) {
        onSave();
        setIsDirty(false);
      }
    }, 10000);
    return () => clearInterval(timer);
  }, [isDirty, onSave]);
  

  const clearSelectedBlock = () => {
    setSelectedBlockIndex(null);
    setEditingBlockIndex(null);
    if (activeTab === 'settings') {
      setActiveTab('widgets');
    }
  };

  const updateDraft = (newBlocks, newSettings) => {
    let htmlStr = newBlocks.map(b => {
      let res = '';
      if (b.settings && Object.keys(b.settings).length > 0) {
        res += `<!-- BLOCK_SETTINGS:${JSON.stringify(b.settings)} -->\n`;
      }
      res += b.html;
      return res;
    }).join('\n<!-- BLOCK_SEPARATOR -->\n');

    if (newSettings && Object.keys(newSettings).length > 0) {
      htmlStr = `<!-- DOC_SETTINGS:${JSON.stringify(newSettings)} -->\n` + htmlStr;
    }
    lastAppliedHtmlRef.current = htmlStr;
    onChange({ ...draft, html_content: htmlStr });
    setIsDirty(true);
  };

  const syncBlocks = (newBlocks, newSettings = docSettings, pushToHistory = true) => {
    setBlocks(newBlocks);
    if (newSettings !== docSettings) setDocSettings(newSettings);
    
    if (pushToHistory) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push({ blocks: newBlocks, docSettings: newSettings });
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
    
    updateDraft(newBlocks, newSettings);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      syncBlocks(prev.blocks, prev.docSettings, false);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      syncBlocks(next.blocks, next.docSettings, false);
      setHistoryIndex(historyIndex + 1);
    }
  };


  const addEmptyBlock = () => {
    const newBlock = { id: nextBlockId(), html: '' };
    syncBlocks([...blocks, newBlock]);
    setEditingBlockIndex(blocks.length);
  };

  const updateBlock = (index, newHtml) => {
    const newBlocks = [...blocks];
    newBlocks[index].html = newHtml;
    syncBlocks(newBlocks);
  };

  const removeBlock = (index) => {
    const newBlocks = [...blocks];
    newBlocks.splice(index, 1);
    syncBlocks(newBlocks);
    if (editingBlockIndex === index) {
      setEditingBlockIndex(null);
    } else if (editingBlockIndex !== null && editingBlockIndex > index) {
      setEditingBlockIndex(editingBlockIndex - 1);
    }
  };

  const moveBlock = (index, dir) => {
    if (index + dir < 0 || index + dir >= blocks.length) return;
    const newBlocks = [...blocks];
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[index + dir];
    newBlocks[index + dir] = temp;
    syncBlocks(newBlocks);
    if (editingBlockIndex === index) {
      setEditingBlockIndex(index + dir);
    } else if (editingBlockIndex === index + dir) {
      setEditingBlockIndex(index);
    }
  };

  // --- Drag and Drop Logic ---
  const [dragItemIndex, setDragItemIndex] = useState(null);
  const [dragSource, setDragSource] = useState(null); // 'canvas' | 'sidebar'
  const [dragOverIndex, setDragOverIndex] = useState(null);
  // State paints drag affordances; the ref/DataTransfer carry the synchronous
  // payload because React state may not flush before the browser fires drop.
  const activeDragRef = useRef(null);

  const resetDragState = () => {
    activeDragRef.current = null;
    setDragItemIndex(null);
    setDragSource(null);
    setDragOverIndex(null);
  };

  const readDragPayload = (dataTransfer) => {
    try {
      const serialized = dataTransfer?.getData(ESTIMATE_BUILDER_DRAG_TYPE);
      if (serialized) return JSON.parse(serialized);
    } catch {
      // Fall back to the in-memory payload for browsers with restricted custom data types.
    }
    return activeDragRef.current;
  };

  const handleBlockDragStart = (e, index) => {
    setEditingBlockIndex(null); // Stop editing when starting a drag
    clearSelectedBlock();
    setDragSource('canvas');
    setDragItemIndex(index);
    const payload = { source: 'canvas', index };
    activeDragRef.current = payload;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(ESTIMATE_BUILDER_DRAG_TYPE, JSON.stringify(payload));
    e.dataTransfer.setData('text/plain', 'document-block');
    setTimeout(() => {
      if (e.target instanceof HTMLElement) e.target.style.opacity = '0.5';
    }, 0);
  };

  const getHtmlWithUniqueKeys = (htmlTemplate) => {
    if (htmlTemplate.includes('${Date.now()}')) {
      return htmlTemplate.replace(/\$\{Date\.now\(\)\}/g, () => `${Date.now()}_${Math.floor(Math.random() * 10000)}`);
    }
    return htmlTemplate;
  };

  const resolveWidgetHtml = (htmlTemplate) =>
    applyHeaderWidgetAcceptanceMode(
      getHtmlWithUniqueKeys(String(htmlTemplate || '')),
      draft.require_e_signature !== false
    );

  const handleSidebarDragStart = (e, htmlTemplate, plainText = 'document-widget') => {
    if (plainText === 'document-widget') {
      setEditingBlockIndex(null);
    }
    setDragSource('sidebar');
    const htmlToInsert = resolveWidgetHtml(htmlTemplate);
    const payload = { source: 'sidebar', html: htmlToInsert };
    activeDragRef.current = payload;
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData(ESTIMATE_BUILDER_DRAG_TYPE, JSON.stringify(payload));
    e.dataTransfer.setData('text/plain', plainText);
  };

  const handleSidebarClick = (htmlTemplate) => {
    const htmlToInsert = resolveWidgetHtml(htmlTemplate);
    const newBlock = { id: nextBlockId(), html: htmlToInsert };
    syncBlocks([...blocks, newBlock]);
  };

  const handleDragEnter = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(index);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    e.stopPropagation();
    const payload = readDragPayload(e.dataTransfer);
    if (payload?.source === 'canvas' && Number.isInteger(payload.index)) {
      const sourceIndex = payload.index;
      if (sourceIndex === dropIndex || sourceIndex + 1 === dropIndex) {
        // Dropped in the same relative spot, do nothing
      } else {
        const newBlocks = [...blocks];
        const draggedItem = newBlocks.splice(sourceIndex, 1)[0];
        if (!draggedItem) {
          resetDragState();
          return;
        }
        // If we removed an item from before the drop index, the drop index shifts by 1
        const actualDropIndex = dropIndex > sourceIndex ? dropIndex - 1 : dropIndex;
        newBlocks.splice(actualDropIndex, 0, draggedItem);
        syncBlocks(newBlocks);
      }
    } else if (payload?.source === 'sidebar' && payload.html) {
      const newBlock = { id: nextBlockId(), html: payload.html };
      const newBlocks = [...blocks];
      newBlocks.splice(dropIndex, 0, newBlock);
      syncBlocks(newBlocks);
    }

    resetDragState();
  };

  const handleDragEnd = (e) => {
    resetDragState();
    if (e.target instanceof HTMLElement) e.target.style.opacity = '1';
  };

  // Handle dropping at the very bottom of the document
  const handleCanvasContainerDrop = (e) => {
    e.preventDefault();
    const payload = readDragPayload(e.dataTransfer);
    if (payload?.source === 'sidebar' && payload.html) {
      const newBlock = { id: nextBlockId(), html: payload.html };
      syncBlocks([...blocks, newBlock]);
    }
    resetDragState();
  };


  const modalContent = (
    <div className="fixed inset-0 z-[60000] bg-[#eef2f6] flex flex-col font-sans h-screen w-screen overflow-hidden">
      {/* Top Navbar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-white border-b border-slate-200 shadow-sm shrink-0 z-20 relative flex-wrap gap-2">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wider"
        >
          <ArrowLeft size={16} /> <span className="hidden sm:inline">Back</span>
        </button>
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
          <button onClick={undo} disabled={historyIndex <= 0} className="px-2 sm:px-3 py-2 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:hover:text-slate-500"><Undo2 size={18} /></button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1} className="px-2 sm:px-3 py-2 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:hover:text-slate-500"><Redo2 size={18} /></button>
          <div className="w-px h-6 bg-slate-200 mx-1 sm:mx-2" />
          <button 
            onClick={() => setShowImportHtml(true)}
            className="hidden sm:block px-3 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
          >
            Import HTML
          </button>
          <button 
            onClick={() => setIsFullPreviewOpen(true)}
            className="px-3 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
          >
            Preview
          </button>
          {draft?.id && onDuplicate && (
            <button 
              onClick={onDuplicate}
              className="px-3 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
            >
              Duplicate
            </button>
          )}
          <button 
            onClick={() => { onSave(); setIsDirty(false); }}
            className={`px-3 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-white rounded-lg shadow-sm transition-colors ${isDirty ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {isDirty ? 'Save' : 'Save'} <span className="hidden sm:inline">{isDirty ? '(Unsaved)' : 'Changes'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden h-full relative z-10">
        
        {/* Left Sidebar - Widgets & Variables */}
        <div className="w-full md:w-72 h-1/3 md:h-auto md:max-h-full bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col shrink-0 z-10 shadow-[2px_0_10px_rgba(0,0,0,0.03)]">
          <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100 shrink-0">
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">Builder Toolkit</h2>
            <HelpCircle size={16} className="text-slate-400 cursor-pointer hover:text-blue-500 animate-pulse" title="Drag elements into the canvas or copy template tags." />
          </div>
          
          {/* Tabs */}
          <div className="flex border-b border-slate-200 shrink-0 bg-slate-50">
            <button
              onClick={() => { clearSelectedBlock(); setActiveTab('widgets'); setSearchQuery(''); }}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 text-center ${activeTab === 'widgets' ? 'border-blue-600 text-blue-600 bg-white active-tab' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              Widgets
            </button>
            <button
              onClick={() => { clearSelectedBlock(); setActiveTab('variables'); setSearchQuery(''); }}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 text-center ${activeTab === 'variables' ? 'border-blue-600 text-blue-600 bg-white active-tab' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              Variables
            </button>
            <button
              onClick={() => { setActiveTab('settings'); setSearchQuery(''); }}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 text-center ${activeTab === 'settings' ? 'border-blue-600 text-blue-600 bg-white active-tab' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              Settings
            </button>
          </div>

          {/* Search bar */}
          <div className="p-3 border-b border-slate-100 bg-white shrink-0">
            <input
              type="text"
              placeholder={activeTab === 'widgets' ? "Search widgets..." : "Search variables..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all font-semibold"
            />
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto bg-slate-50/30">
            {activeTab === 'settings' ? (
              selectedBlockIndex !== null && blocks[selectedBlockIndex] ? (
                <BlockSettingsPanel 
                  block={blocks[selectedBlockIndex]} 
                  onChange={(updatedBlock) => {
                    const newBlocks = [...blocks];
                    newBlocks[selectedBlockIndex] = updatedBlock;
                    syncBlocks(newBlocks);
                  }} 
                />
              ) : (
                <div className="p-4 space-y-5">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2 mb-2">Template Meta</h3>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label htmlFor="estimate-builder-template-type" className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Template Type</label>
                      <select
                        id="estimate-builder-template-type"
                        value={draft.template_type || templateTypeOptions[0]?.value || ''}
                        onChange={(e) => {
                          onChange({ ...draft, template_type: e.target.value });
                          setIsDirty(true);
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                      >
                        {templateTypeOptions.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label || type.value}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="estimate-builder-branch" className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Branch</label>
                      <select
                        id="estimate-builder-branch"
                        value={draft.branch || ''}
                        onChange={(e) => {
                          onChange({ ...draft, branch: e.target.value ? Number(e.target.value) : null });
                          setIsDirty(true);
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                      >
                        <option value="">All Branches</option>
                        {branches?.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Subject (optional)</label>
                      <input
                        value={draft.subject || ''}
                        onChange={(e) => {
                          onChange({ ...draft, subject: e.target.value });
                          setIsDirty(true);
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                        placeholder="Email subject"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label htmlFor="estimate-builder-version" className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Version</label>
                        <input
                          id="estimate-builder-version"
                          type="number"
                          min="1"
                          step="1"
                          value={draft.version || ''}
                          onChange={(e) => {
                            onChange({ ...draft, version: e.target.value });
                            setIsDirty(true);
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                          placeholder="1"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</label>
                        <button
                          type="button"
                          onClick={() => {
                            onChange({ ...draft, is_active: !draft.is_active });
                            setIsDirty(true);
                          }}
                          className={`w-full rounded-xl px-3 py-2 text-xs font-bold border transition-colors ${
                            draft.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {draft.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">Acceptance Settings</h3>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Require E-Signature</label>
                        <button
                          type="button"
                          onClick={() => {
                            onChange({ ...draft, require_e_signature: !draft.require_e_signature });
                            setIsDirty(true);
                          }}
                          className={`w-full rounded-xl px-3 py-2 text-xs font-bold border transition-colors ${
                            draft.require_e_signature !== false ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {draft.require_e_signature !== false ? 'Yes, Require Signature' : 'No, Simple Accept'}
                        </button>
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">Triggers</h3>
                      
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Applies to entity</label>
                          <input
                            value={draft.applies_to_entity || ''}
                            onChange={(e) => {
                              onChange({ ...draft, applies_to_entity: e.target.value });
                              setIsDirty(true);
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                            placeholder="opportunity"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Service type</label>
                          <input
                            value={draft.applies_to_service_type || ''}
                            onChange={(e) => {
                              onChange({ ...draft, applies_to_service_type: e.target.value });
                              setIsDirty(true);
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                            placeholder="moving"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Binding type</label>
                          <input
                            value={draft.applies_to_binding_type || ''}
                            onChange={(e) => {
                              onChange({ ...draft, applies_to_binding_type: e.target.value });
                              setIsDirty(true);
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                            placeholder="binding"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Opp type</label>
                          <input
                            value={draft.applies_to_opp_type || ''}
                            onChange={(e) => {
                              onChange({ ...draft, applies_to_opp_type: e.target.value });
                              setIsDirty(true);
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                            placeholder=""
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            ) : activeTab === 'widgets' ? (
              <div className="p-3 space-y-4">
                
                {savedClauses.length > 0 && (
                  <div className="space-y-1.5 mb-6">
                    <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest px-2 flex justify-between">
                      Reusable Clauses
                      <span className="text-[9px] px-1 bg-amber-100 text-amber-700 rounded-sm">{savedClauses.length}</span>
                    </h3>
                    <div className="space-y-1">
                      {savedClauses.filter(w => w.label.toLowerCase().includes(searchQuery.toLowerCase())).map((widget) => (
                        <div
                          key={widget.id}
                          draggable={true}
                          onDragStart={(e) => handleSidebarDragStart(e, widget.html)}
                          onDragEnd={handleDragEnd}
                          onClick={() => handleSidebarClick(widget.html)}
                          className="w-full flex items-center justify-between px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl hover:border-amber-300 hover:shadow-sm transition-all group cursor-grab active:cursor-grabbing hover:cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-6 h-6 shrink-0 bg-white rounded-lg border border-amber-200">
                              <MousePointerClick size={12} className="text-amber-500 opacity-60" />
                            </div>
                            <span className="text-xs font-semibold text-slate-700">{widget.label}</span>
                          </div>
                          <button 
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-1 rounded hover:bg-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newClauses = savedClauses.filter(c => c.id !== widget.id);
                              setSavedClauses(newClauses);
                              localStorage.setItem('crm_reusable_clauses', JSON.stringify(newClauses));
                            }}
                          >
                            <Trash2 size={12}/>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {WIDGET_CATEGORIES.map((category) => {
                  const filteredWidgets = category.widgets.filter(w =>
                    w.label.toLowerCase().includes(searchQuery.toLowerCase())
                  );
                  if (filteredWidgets.length === 0) return null;
                  return (
                    <div key={category.title} className="space-y-1.5">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{category.title}</h3>
                      <div className="space-y-1">
                        {filteredWidgets.map((widget) => (
                          <div
                            key={widget.id}
                            draggable={true}
                            onDragStart={(e) => handleSidebarDragStart(e, widget.html)}
                            onDragEnd={handleDragEnd}
                            onClick={() => handleSidebarClick(widget.html)}
                            className="w-full flex items-center gap-3 px-3 py-2 bg-white border border-slate-100 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all group text-left cursor-grab active:cursor-grabbing hover:cursor-pointer"
                            title="Drag to canvas or click to add at bottom"
                          >
                            <div className="flex items-center justify-center text-blue-500 font-bold w-6 h-6 shrink-0 bg-blue-50 rounded-lg">
                              <MousePointerClick size={12} className="text-blue-500 opacity-60" />
                            </div>
                            <span className="text-xs font-semibold text-slate-700 group-hover:text-blue-700 transition-colors">{widget.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : activeTab === 'variables' ? (
              <div className="p-3 space-y-4">
                {variableRegistry.map((group) => {
                  const filteredFields = (group.fields || []).filter(f =>
                    f.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (f.description && f.description.toLowerCase().includes(searchQuery.toLowerCase()))
                  );
                  if (filteredFields.length === 0) return null;
                  return (
                    <div key={group.label || group.entity} className="space-y-1.5">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{group.label || group.entity}</h3>
                      <div className="space-y-1">
                        {filteredFields.map((field) => {
                          const isCopied = copiedVar === field.key;
                          return (
                            <div
                              key={field.key}
                              draggable={true}
                              onDragStart={(e) => handleSidebarDragStart(e, `<p>{{${field.key}}}</p>`, `{{${field.key}}}`)}
                              onDragEnd={handleDragEnd}
                              onClick={() => {
                                navigator.clipboard.writeText(`{{${field.key}}}`);
                                setCopiedVar(field.key);
                                setTimeout(() => setCopiedVar(null), 1500);
                                
                                if (editingBlockIndex !== null && blocks[editingBlockIndex]) {
                                  const newBlocks = [...blocks];
                                  newBlocks[editingBlockIndex] = { 
                                    ...newBlocks[editingBlockIndex], 
                                    html: newBlocks[editingBlockIndex].html + ` {{${field.key}}}` 
                                  };
                                  syncBlocks(newBlocks);
                                } else {
                                  handleSidebarClick(`<p>{{${field.key}}}</p>`);
                                }
                              }}
                              className="w-full flex items-center justify-between gap-3 px-3 py-2 bg-white border border-slate-100 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all text-left cursor-grab active:cursor-grabbing hover:cursor-pointer group"
                              title="Drag to canvas or click to add at bottom"
                            >
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-xs font-mono font-bold text-slate-800 break-all select-all">{`{{${field.key}}}`}</span>
                                {field.description && (
                                  <span className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{field.description}</span>
                                )}
                              </div>
                              <button
                                type="button"
                                className={`flex items-center justify-center w-6 h-6 shrink-0 rounded-lg border transition-all ${isCopied ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-150 text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                              >
                                {isCopied ? <Check size={12} /> : <Copy size={12} />}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        {/* Right Area - Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* Header Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-8 py-3 bg-white border-b border-slate-200 shrink-0 shadow-sm z-10 gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="hidden sm:inline-block px-2.5 py-1 text-[10px] font-extrabold text-blue-700 bg-blue-50 rounded uppercase tracking-wider border border-blue-100 shrink-0">
                {selectedTemplateTypeLabel}
              </span>
              <input
                type="text"
                value={draft.name || ''}
                onChange={(e) => onChange({ ...draft, name: e.target.value })}
                className="px-2 py-1 text-base sm:text-lg font-bold text-slate-800 border-b-2 border-transparent hover:border-slate-200 focus:border-blue-500 outline-none bg-transparent transition-colors w-full min-w-0"
                placeholder="Enter document title..."
              />
            </div>
            <div className="flex items-center gap-3 sm:gap-5 text-xs sm:text-sm font-semibold text-slate-500 shrink-0">
              <div className="relative group">
                <button className="flex items-center gap-1.5 hover:text-blue-600 transition-colors py-2">
                  <Layout size={16} /> <span className="hidden sm:inline">Layout</span>
                </button>
                <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-slate-200 shadow-xl rounded-lg p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <h3 className="text-xs font-black text-slate-800 uppercase mb-3">Document Setup</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Page Format</label>
                      <select 
                        value={docSettings.format} 
                        onChange={(e) => syncBlocks(blocks, { ...docSettings, format: e.target.value })}
                        className="w-full border rounded p-1.5 text-xs"
                      >
                        <option value="Letter">US Letter</option>
                        <option value="A4">A4</option>
                        <option value="Legal">Legal</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Page Margins</label>
                      <input 
                        type="text" 
                        value={docSettings.margin} 
                        onChange={(e) => syncBlocks(blocks, { ...docSettings, margin: e.target.value })}
                        className="w-full border rounded p-1.5 text-xs" 
                        placeholder="e.g. 40px" 
                      />
                    </div>
                  </div>
                </div>
              </div>
              <button className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                <Settings size={16} /> <span className="hidden sm:inline">Applies To</span> <FileText size={16} className="text-blue-500" />
              </button>
            </div>
          </div>

          {/* Scrollable Document Canvas */}
          <div 
            className="flex-1 overflow-y-auto flex justify-center bg-slate-100 relative scroll-smooth py-10 px-4"
            onDragOver={(e) => {
              e.preventDefault();
              const payload = readDragPayload(e.dataTransfer);
              e.dataTransfer.dropEffect = payload?.source === 'sidebar' ? 'copy' : 'move';
            }}
            onDrop={handleCanvasContainerDrop}
            onClick={clearSelectedBlock}
          >
            <div className="w-full max-w-[850px] mx-auto bg-white min-h-[1056px] shadow-2xl flex flex-col shrink-0 relative">
              
              {blocks.length === 0 ? (
                <div
                  data-testid="document-empty-drop-zone"
                  onDragEnter={(e) => handleDragEnter(e, 0)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'copy';
                    setDragOverIndex(0);
                  }}
                  onDrop={(e) => handleDrop(e, 0)}
                  className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl text-slate-500 p-12 m-8 transition-all ${dragOverIndex === 0 ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-100 scale-[1.01]' : 'border-slate-200 bg-slate-50'}`}
                >
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-4">
                    <FileText size={24} className="text-blue-500" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Blank Canvas</h3>
                  <p className="text-sm font-medium mb-8 text-center max-w-md">Drag and drop widgets from the left sidebar into this area, or add a text block to start typing your document.</p>
                  <button 
                    onClick={addEmptyBlock}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 shadow-sm transition-colors"
                  >
                    <Plus size={18} /> Add Text Block
                  </button>
                </div>
              ) : (
                <div className="flex flex-col relative w-full min-w-0" onDragEnd={handleDragEnd}>
                  {blocks.map((block, index) => (
                    <React.Fragment key={block.id}>
                      {/* Top Drop Zone for the very first item */}
                      {index === 0 && (
                        <DropZone index={0} isDragging={dragSource !== null} isDragOver={dragOverIndex === 0} onDragEnter={handleDragEnter} onDrop={handleDrop} />
                      )}
                      
                      <BlockItem
                        index={index}
                        block={block}
                        onUpdate={(html) => updateBlock(index, html)}
                        onRemove={() => removeBlock(index)}
                        onMoveUp={() => moveBlock(index, -1)}
                        onMoveDown={() => moveBlock(index, 1)}
                        dragStart={handleBlockDragStart}
                        isEditing={editingBlockIndex === index}
                        startEditing={() => { setEditingBlockIndex(index); setSelectedBlockIndex(index); setActiveTab('settings'); }}
                        stopEditing={() => setEditingBlockIndex(null)}
                        isSelected={selectedBlockIndex === index}
                        isDragging={dragSource === 'canvas' && dragItemIndex === index}
                        onSelect={() => { setSelectedBlockIndex(index); setEditingBlockIndex(index); setActiveTab('settings'); }}
                      />

                      {/* Drop Zone after this block */}
                      <DropZone index={index + 1} isDragging={dragSource !== null} isDragOver={dragOverIndex === index + 1} onDragEnter={handleDragEnter} onDrop={handleDrop} />
                    </React.Fragment>
                  ))}

                  {/* Add Block Button at the bottom */}
                  <div className="mt-8 flex justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
                    <button 
                      onClick={addEmptyBlock}
                      className="flex items-center gap-2 bg-slate-50 text-slate-500 px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-50 hover:text-blue-600 border border-slate-200 transition-colors"
                    >
                      <Plus size={16} /> Add Block
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const handleImportHtml = () => {
    if (!importHtmlContent.trim()) return;
    
    // Strip global <style> and <link> tags to prevent them from breaking the CRM UI
    const sanitizedHtml = importHtmlContent
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<link[^>]*rel=["']?stylesheet["']?[^>]*>/gi, '')
      .trim();

    const newBlock = { id: `block_${Date.now()}_${Math.random()}`, html: sanitizedHtml };
    syncBlocks([...blocks, newBlock]);
    setShowImportHtml(false);
    setImportHtmlContent('');
  };

  const importHtmlModal = showImportHtml ? (
    <div className="fixed inset-0 z-[70000] bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800">Import Raw HTML</h3>
          <button onClick={() => setShowImportHtml(false)} className="text-slate-500 hover:text-slate-800">✕</button>
        </div>
        <div className="p-6 flex-1">
          <p className="text-sm text-slate-500 mb-2">Paste raw HTML here to append it as a new block at the bottom of the document.</p>
          <textarea 
            className="w-full h-64 p-3 border rounded-lg font-mono text-xs outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500" 
            placeholder="<div>...</div>"
            value={importHtmlContent}
            onChange={(e) => setImportHtmlContent(e.target.value)}
          />
        </div>
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={() => setShowImportHtml(false)} className="px-4 py-2 font-bold text-slate-600 hover:text-slate-800">Cancel</button>
          <button onClick={handleImportHtml} className="px-5 py-2 font-bold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700">Import Block</button>
        </div>
      </div>
    </div>
  ) : null;

  const SAMPLE_PREVIEW_DATA = {
    'Company.name': 'KargoFlow',
    'company_name': 'KargoFlow',
    'Company.logo_url': 'https://placehold.co/150x50?text=KargoFlow',
    'company_logo_url': 'https://placehold.co/150x50?text=KargoFlow',
    'Estimate.estimate_number': 'EST-8812',
    'estimate_number': 'EST-8812',
    'Customer.full_name': 'Sandesh Off',
    'customer_name': 'Sandesh Off',
    'Customer.email': 'sandesh@example.com',
    'customer_email': 'sandesh@example.com',
    'Customer.primary_phone': '+1 (555) 014-2834',
    'customer_phone': '+1 (555) 014-2834',
    'Opportunity.customer_name': 'Sandesh Off',
    'Opportunity.opportunity_number': 'OPP-2026-88',
    'Opportunity.move_date': '2026-06-25',
    'move_date': '2026-06-25',
    'Opportunity.sales_number': 'EST-8812',
    'Opportunity.binding_type': 'Hourly Rate',
    'Opportunity.move_size_label': '3 Bedroom House',
    'Opportunity.move_type_label': 'Local Moving',
    'move_size_label': '3 Bedroom House',
    'move_type_label': 'Local Moving',
    'sales_rep_name': 'Sarah Representative',
    'sales_rep_phone': '+1 (555) 019-5678',
    'Contract.contract_number': 'CON-99881',
    'Contract.portal_link': `${getPortalBaseUrl() || 'http://localhost:5173'}/portal/contracts/sample-token`,
    'branch_name': 'Antigravity Movers Inc.',
    'branch_phone': '1-800-555-0199',
    'branch_email': 'info@antigravitymovers.com',
    'branch_website': 'https://www.antigravitymovers.com',
    'branch_address': '456 Branch Office Road, Toronto, ON, M4B 1B3',
    'branch_email_footer': '<p style="margin: 0;">Antigravity Movers | Moving made easy.</p>',
    'subtotal': '$1,150.00',
    'discount_amount': '$50.00',
    'sales_tax_amount': '$150.00',
    'grand_total': '$1,250.00',
    'deposit_amount': '$150.00',
    'balance_due': '$1,100.00',
    'inventory_link': 'https://example.com/portal/inventory?token=sample',
    'OriginAddress.full_address': '123 Main Street, Suite 4B, Toronto, ON, M5V 2T6',
    'origin_address': '123 Main Street, Suite 4B, Toronto, ON, M5V 2T6',
    'origin_meta': 'Ground floor, no elevator',
    'DestinationAddress.full_address': '789 Oak Avenue, North York, ON, M2N 5T8',
    'destination_address': '789 Oak Avenue, North York, ON, M2N 5T8',
    'destination_meta': 'Loading dock available',
    'route_stops_count': '2',
    'route_stops_summary': 'Stop 1: 987 Storage Road, Richmond, BC\nStop 2: 654 Donation Lane, New Westminster, BC',
    'route_stops_html': '<div><strong>Stop 1</strong><br/>987 Storage Road, Richmond, BC</div><div style="margin-top:8px;"><strong>Stop 2</strong><br/>654 Donation Lane, New Westminster, BC</div>',
    'estimate_breakdown': '<table style="width:100%; border-collapse:collapse;"><tbody><tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">Moving labor</td><td style="padding:8px; border-bottom:1px solid #e2e8f0; text-align:right;">$950.00</td></tr><tr><td style="padding:8px;">Packing materials</td><td style="padding:8px; text-align:right;">$200.00</td></tr></tbody></table>',
    'terms_title': 'Terms & Conditions',
    'terms_body': 'This estimate is based on the information provided. Final charges may change if actual move details differ.',
    'checkbox_text': 'I agree to the moving terms.',
    'signature_text': 'Customer signature / acceptance block.',
    'payment_authorization_text': 'I authorize the deposit payment.',
    'Estimate.hourly_rate': '$150.00',
    'Estimate.crew_size': '3',
    'Estimate.truck_count': '1',
    'Estimate.grand_total': '$1,250.00',
    'Estimate.deposit_amount': '$150.00',
  };

  const resolveBranchPreviewData = (branchId, branchRows) => {
    const branch = branchRows?.find((row) => String(row?.id) === String(branchId)) || branchRows?.[0] || {};
    const fullAddress = String(
      branch?.full_address ||
      branch?.address ||
      [branch?.address_line1, branch?.address_line2, branch?.city, branch?.state, branch?.zip_code].filter(Boolean).join(', ') ||
      ''
    ).trim();
    const logoUrl = String(
      branch?.effective_logo_url ||
      branch?.logo_url ||
      branch?.logo ||
      branch?.company_logo_url ||
      ''
    ).trim();
    const emailFooter = String(
      branch?.email_footer_html ||
      branch?.branch_email_footer_html ||
      branch?.email_footer ||
      ''
    ).trim();

    return {
      branch,
      values: {
        'Branch.name': String(branch?.name || branch?.branch_name || SAMPLE_PREVIEW_DATA['branch_name']).trim(),
        'Branch.email': String(branch?.email || SAMPLE_PREVIEW_DATA['branch_email']).trim(),
        'Branch.phone': String(branch?.phone || branch?.primary_phone || SAMPLE_PREVIEW_DATA['branch_phone']).trim(),
        'Branch.website': String(branch?.website || branch?.url || SAMPLE_PREVIEW_DATA['branch_website']).trim(),
        'Branch.full_address': fullAddress || SAMPLE_PREVIEW_DATA['OriginAddress.full_address'],
        'Branch.address': fullAddress || SAMPLE_PREVIEW_DATA['OriginAddress.full_address'],
        'Branch.logo_url': logoUrl || SAMPLE_PREVIEW_DATA['Company.logo_url'],
        'Branch.email_footer_html': emailFooter || SAMPLE_PREVIEW_DATA['branch_email_footer'],
        'Company.name': String(branch?.name || branch?.branch_name || SAMPLE_PREVIEW_DATA['company_name']).trim(),
        'Company.logo_url': logoUrl || SAMPLE_PREVIEW_DATA['Company.logo_url'],
        'company_name': String(branch?.name || branch?.branch_name || SAMPLE_PREVIEW_DATA['company_name']).trim(),
        'company_logo_url': logoUrl || SAMPLE_PREVIEW_DATA['company_logo_url'],
        'branch_name': String(branch?.name || branch?.branch_name || SAMPLE_PREVIEW_DATA['branch_name']).trim(),
        'branch_phone': String(branch?.phone || branch?.primary_phone || SAMPLE_PREVIEW_DATA['branch_phone']).trim(),
        'branch_email': String(branch?.email || SAMPLE_PREVIEW_DATA['branch_email']).trim(),
        'branch_website': String(branch?.website || branch?.url || SAMPLE_PREVIEW_DATA['branch_website']).trim(),
        'branch_address': fullAddress || SAMPLE_PREVIEW_DATA['branch_address'],
        'branch_email_footer': emailFooter || SAMPLE_PREVIEW_DATA['branch_email_footer'],
      },
    };
  };

  const renderSamplePreviewHtml = (html, branchId, branchRows) => {
    const { values: branchValues } = resolveBranchPreviewData(branchId, branchRows);

    let rendered = String(html || '');
    rendered = rendered.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, key) => {
      const trimmed = String(key || '').trim();
      if (branchValues[trimmed] !== undefined) return branchValues[trimmed];
      if (SAMPLE_PREVIEW_DATA[trimmed] !== undefined) return SAMPLE_PREVIEW_DATA[trimmed];
      return match;
    });

    rendered = rendered.replace(/@([a-zA-Z_][a-zA-Z0-9_.]*)/g, (match, key) => {
      const trimmed = String(key || '').trim();
      if (branchValues[trimmed] !== undefined) return branchValues[trimmed];
      if (SAMPLE_PREVIEW_DATA[trimmed] !== undefined) return SAMPLE_PREVIEW_DATA[trimmed];
      return match;
    });

    rendered = rendered.replace(/<span\s+data-sign="([^"]+)"\s+data-key="([^"]+)"\s*>\s*<\/span>/gi, (match, kind) => {
      const type = String(kind || '').toLowerCase();
      if (type === 'signature') {
        return `<div style="border-bottom: 2px dashed #94a3b8; padding: 12px 0; font-family: 'Courier New', Courier, monospace; color: #1e3a8a; font-size: 20px; font-weight: bold; font-style: italic;">Sandesh Off</div>`;
      }
      if (type === 'initial') {
        return `<span style="border: 2px dashed #94a3b8; padding: 6px 12px; font-family: 'Courier New', Courier, monospace; color: #1e3a8a; font-weight: bold; font-style: italic;">SO</span>`;
      }
      if (type === 'date') {
        return `<span style="border-bottom: 1px solid #94a3b8; padding: 2px 8px; color: #334155; font-weight: 600;">2026-06-13</span>`;
      }
      return `<span style="border-bottom: 1px dashed #cbd5e1; padding: 2px 12px; color: #475569;">Sample Input Value</span>`;
    });

    // Fix legacy inventory portal blocks in preview
    rendered = rendered.replace(
      /<div class="btn([^"]*)">((?:(?!<div class="btn)[\s\S])*?)<span data-portal-block="inventory"><\/span>([\s\S]*?)<\/div>/gi,
      `<a href="${branchValues['inventory_link'] || SAMPLE_PREVIEW_DATA['inventory_link']}" target="_blank" class="btn$1" style="text-decoration: none;">$2$3</a>`
    );

    // Fix signature joining bug in legacy templates by removing ctx.closePath()
    rendered = rendered.replace(/ctx\.closePath\(\);\s*/g, '');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media (max-width: 768px) {
                .responsive-grid-3 { grid-template-columns: 1fr !important; }
                .responsive-grid-2 { grid-template-columns: 1fr !important; }
                .mobile-padding { padding-left: 1.5rem !important; padding-right: 1.5rem !important; padding-top: 1.5rem !important; }
                .financial-box-width { width: 100% !important; min-width: 0 !important; }
                .responsive-flex-end { justify-content: flex-start !important; }
                .route-container { flex-direction: column !important; align-items: stretch !important; }
                .route-arrow-h { display: none !important; }
            }
            body {
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
              background-color: white;
            }
          </style>
        </head>
        <body>
          ${rendered}
        </body>
      </html>
    `;
  }

  const previewModal = isFullPreviewOpen ? (
    <div className="fixed inset-0 z-[80000] flex flex-col bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="flex-1 flex flex-col bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Fullscreen Document Preview</span>
            <h3 className="text-lg font-extrabold text-slate-900">{draft.name || 'Document Template'}</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsFullPreviewOpen(false)}
              className="inline-flex items-center justify-center h-10 px-4 rounded-xl border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 text-xs font-bold uppercase tracking-widest transition"
            >
              ✕ Close Preview
            </button>
          </div>
        </div>
        <div className="flex-1 bg-slate-100/50 p-6 overflow-auto flex justify-center">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden flex flex-col">
              <iframe
                title="Fullscreen Document Preview"
                className="w-full flex-1 bg-white border-0"
                srcDoc={renderSamplePreviewHtml(draft.html_content, draft.branch, branches)}
                sandbox="allow-scripts allow-same-origin"
              />
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return ReactDOM.createPortal(<>{modalContent}{importHtmlModal}{previewModal}</>, document.body);
}
