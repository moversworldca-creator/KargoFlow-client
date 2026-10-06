import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { useSearchParams } from 'react-router-dom';
import { 
  AlertCircle, CheckCircle2, CreditCard, FileSignature, 
  Loader2, ShieldCheck, Calendar, MapPin, 
  FileText, Shield, Info, ArrowRight, ArrowDown,
  User, Mail, Eraser, Activity, DollarSign,
  Lock, Check, ExternalLink, Phone, Box as BoxIcon,
  ClipboardList, Zap, Building2, Calculator
} from 'lucide-react';

import {
  approvePublicEstimatePortal,
  createPublicEstimateSquarePayment,
  createPublicEstimatePaymentSession,
  getPublicEstimatePortal,
  getPublicSquareOrder,
} from '../../../services/api';
import SignaturePadModal from '../../../shared/ui/SignaturePadModal';

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const formatPortalDiscount = (value, moneyFn) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount === 0) return '--';
  return `(${moneyFn(Math.abs(amount))})`;
};

const openAuthorizeNetHostedCheckout = (checkoutUrl, token) => {
  const action = String(checkoutUrl || '').split('?')[0].trim();
  const checkoutToken = String(token || '').trim();
  if (!action || !checkoutToken) return false;

  if (action.includes('/api/payments/public/payment-requests/launch/')) {
    window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
    return true;
  }

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = action;
  form.target = '_blank';
  form.style.display = 'none';

  const tokenInput = document.createElement('input');
  tokenInput.type = 'hidden';
  tokenInput.name = 'token';
  tokenInput.value = checkoutToken;
  form.appendChild(tokenInput);

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
  return true;
};

const buildPortalChargeRows = (charges) => {
  const list = Array.isArray(charges) ? charges : [];
  const hasRowLevelDiscounts = list.some((charge) => {
    const discount = Number(charge?.discount_amount ?? charge?.discount ?? 0);
    return Number.isFinite(discount) && discount !== 0;
  });
  if (hasRowLevelDiscounts) {
    return list
      .filter((charge) => String(charge?.category || '') !== 'discount')
      .map((charge) => {
        const subtotal = Number(charge?.subtotal ?? charge?.amount ?? charge?.total_price ?? 0);
        const discount = Math.abs(Number(charge?.discount_amount ?? charge?.discount ?? 0));
        const total = Number(charge?.total_cost ?? (subtotal - discount));
        return {
          ...charge,
          subtotal,
          discount,
          total,
        };
      });
  }
  const parents = list.filter((charge) => !charge?.metadata?.parent_charge_id && String(charge?.category || '') !== 'discount');
  const children = list.filter((charge) => charge?.metadata?.parent_charge_id || String(charge?.category || '') === 'discount');
  return parents.map((parent) => {
    const childDiscount = children
      .filter((child) => String(child?.metadata?.parent_charge_id || '') === String(parent?.id || ''))
      .reduce((sum, child) => sum + Math.abs(Number(child?.amount ?? child?.total_price ?? 0)), 0);
    const subtotal = Number(parent?.amount ?? parent?.total_price ?? 0);
    return {
      ...parent,
      subtotal,
      discount: childDiscount,
      total: subtotal - childDiscount,
    };
  });
};

const summarizePortalChargeRows = (charges) => {
  const rows = buildPortalChargeRows(charges);
  return {
    rows,
    subtotalTotal: rows.reduce((sum, row) => sum + Number(row.subtotal || 0), 0),
    inlineDiscountTotal: rows.reduce((sum, row) => sum + Number(row.discount || 0), 0),
    estimatedTotal: rows.reduce((sum, row) => sum + Number(row.total || 0), 0),
  };
};

const formatSignedMoney = (value, moneyFn) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount === 0) return moneyFn(0);
  return amount < 0 ? `(${moneyFn(Math.abs(amount))})` : moneyFn(amount);
};

const generateEstimateBreakdownHtml = (charges, totals, moneyFn, jobSections = []) => {
  const list = Array.isArray(charges) ? charges : [];
  if (!list.length) return '<div style="font-size: 13px; font-weight: 600; color: #64748b; padding: 16px; text-align: center; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc;">No itemized charges listed.</div>';

  const sectionCharges = Array.isArray(jobSections)
    ? jobSections.flatMap((section) => (Array.isArray(section?.charges) ? section.charges : []))
    : [];
  const dedupeKeyForCharge = (charge) => [
    charge?.id ?? '',
    charge?.name ?? '',
    charge?.description ?? '',
    charge?.subtotal ?? charge?.amount ?? charge?.total_price ?? '',
    charge?.discount ?? charge?.discount_amount ?? '',
  ].join('|');
  const uniqueSectionCharges = sectionCharges.length
    ? sectionCharges.filter((charge, index, arr) => arr.findIndex((candidate) => dedupeKeyForCharge(candidate) === dedupeKeyForCharge(charge)) === index)
    : [];
  const rowsSource = uniqueSectionCharges.length ? uniqueSectionCharges : list;
  const fallbackRows = summarizePortalChargeRows(rowsSource);
  const totalsDiscount = Number(totals?.discount);
  const estimateLevelDiscount = Number.isFinite(totalsDiscount)
    ? Math.max(0, totalsDiscount)
    : Math.max(0, Number(fallbackRows.inlineDiscountTotal || 0));
  const taxAmount = Math.max(0, Number(totals?.tax || 0));
  const balanceDue = Math.max(0, Number(totals?.total || 0));
  const renderRowsTable = (rows) => {
    let rowsHtml = '';
    rows.forEach((c) => {
      const rateText = c.rate_display || c.rate_label || c.description || (Number(c.unit_price || 0) ? moneyFn(c.unit_price) : '--');
      rowsHtml += `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 14px 16px; text-align: left; vertical-align: top; width: 34%;">
            <div style="font-weight: 800; color: #0f172a; font-size: 14px;">${escapeHtml(c.name || '')}</div>
          </td>
          <td style="padding: 14px 16px; text-align: left; font-size: 13px; color: #0f172a; font-weight: 650; vertical-align: top; width: 34%; line-height: 1.45; white-space: normal; word-break: normal;">${escapeHtml(rateText)}</td>
          <td style="padding: 14px 16px; text-align: right; font-weight: 800; color: #0f172a; font-size: 14px; vertical-align: top; white-space: nowrap;">${moneyFn(c.subtotal || 0)}</td>
          <td style="padding: 14px 16px; text-align: right; font-weight: 800; color: ${Number(c.discount || 0) !== 0 ? '#059669' : '#64748b'}; font-size: 14px; vertical-align: top; white-space: nowrap;">${formatPortalDiscount(c.discount, moneyFn)}</td>
          <td style="padding: 14px 16px; text-align: right; font-weight: 900; color: #0f172a; font-size: 14px; vertical-align: top; white-space: nowrap;">${moneyFn(c.total || 0)}</td>
        </tr>
      `;
    });
    return `
      <div style="border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background: #ffffff; margin: 12px 0 20px; font-family: system-ui, -apple-system, sans-serif;">
        <div style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch;">
          <table style="width: 100%; min-width: 650px; border-collapse: collapse; table-layout: fixed;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                <th style="padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #475569; letter-spacing: 0.05em; width: 34%;">Description</th>
                <th style="padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #475569; letter-spacing: 0.05em; width: 34%;">Rate</th>
                <th style="padding: 12px 16px; text-align: right; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #475569; letter-spacing: 0.05em;">Subtotal</th>
                <th style="padding: 12px 16px; text-align: right; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #475569; letter-spacing: 0.05em;">Discount</th>
                <th style="padding: 12px 16px; text-align: right; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #475569; letter-spacing: 0.05em;">Cost</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      </div>
    `;
  };

  const validSections = Array.isArray(jobSections) ? jobSections.filter(s => Array.isArray(s?.charges) && s.charges.length > 0) : [];
  let tablesHtml = '';
  if (validSections.length > 0) {
    validSections.forEach((section) => {
      const sectionRows = summarizePortalChargeRows(section.charges).rows;
      tablesHtml += `
        <div style="margin-top: 16px;">
          <div style="font-size: 15px; font-weight: 800; color: #334155; margin-bottom: -4px;">${escapeHtml(section.title || 'Job')}</div>
          ${renderRowsTable(sectionRows)}
        </div>
      `;
    });
  } else {
    tablesHtml = renderRowsTable(fallbackRows.rows);
  }

  return `
    <div style="margin-top: 4px; font-size: 16px; font-weight: 900; color: #0f172a;">Financial Breakdown</div>
    ${tablesHtml}
    <div style="margin-top: 18px; border-top: 1px solid #e2e8f0; background: #ffffff;">
      <div style="display: flex; justify-content: flex-end; padding: 18px 0 0;">
        <div style="width: 100%; max-width: 340px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
            <span style="font-size: 14px; font-weight: 500; color: #334155;">Estimated Subtotal</span>
            <span style="font-size: 14px; font-weight: 900; color: #0f172a; white-space: nowrap;">${moneyFn(fallbackRows.estimatedTotal)}</span>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
            <span style="font-size: 14px; font-weight: 500; color: #334155;">Estimate Discount</span>
            <span style="font-size: 14px; font-weight: 900; color: ${estimateLevelDiscount > 0 ? '#059669' : '#0f172a'}; white-space: nowrap;">${estimateLevelDiscount > 0 ? `(${moneyFn(estimateLevelDiscount)})` : moneyFn(0)}</span>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
            <span style="font-size: 14px; font-weight: 500; color: #334155;">Tax</span>
            <span style="font-size: 14px; font-weight: 900; color: #0f172a; white-space: nowrap;">${moneyFn(taxAmount)}</span>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 0 0;">
            <span style="font-size: 14px; font-weight: 500; color: #334155;">Estimated Balance</span>
            <span style="font-size: 14px; font-weight: 900; color: #0f172a; white-space: nowrap;">${moneyFn(balanceDue)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
};

const generateRouteStopsHtml = (stops) => {
  const list = Array.isArray(stops) ? stops : [];
  if (!list.length) {
    return '<div style="font-size: 13px; font-weight: 600; color: #64748b;">Direct route with no additional stops.</div>';
  }

  return list
    .map((stop, index) => {
      const label = stop?.label || `Stop ${index + 1}`;
      const address = stop?.address || '';
      const meta = stop?.meta ? `<div style="margin-top: 4px; font-size: 12px; color: #64748b;">${escapeHtml(stop.meta)}</div>` : '';
      const notes = stop?.notes ? `<div style="margin-top: 4px; font-size: 12px; color: #475569;">${escapeHtml(stop.notes)}</div>` : '';
      return `
        <div style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
          <div style="font-size: 11px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; color: #64748b;">${escapeHtml(label)}</div>
          <div style="margin-top: 4px; font-size: 14px; font-weight: 800; color: #0f172a;">${escapeHtml(address)}</div>
          ${meta}
          ${notes}
        </div>
      `;
    })
    .join('');
};

const extractCanvasSignaturePayload = (canvas) => {
  if (!(canvas instanceof HTMLCanvasElement)) return '';
  try {
    const signatureDataUrl = canvas.toDataURL('image/png');
    if (!signatureDataUrl) return '';
    const blankCanvas = document.createElement('canvas');
    blankCanvas.width = canvas.width;
    blankCanvas.height = canvas.height;
    return signatureDataUrl === blankCanvas.toDataURL('image/png') ? '' : signatureDataUrl;
  } catch {
    return '';
  }
};

const DEFAULT_FALLBACK_TEMPLATE_HTML = `
<div class="portal-shell">
  <div class="wrap">
    <div class="hero-main" style="margin-bottom: 24px;">
      <div class="eyebrow">Move Estimate</div>
      <h1 class="headline">{{company_name}} quote for {{customer_name}}</h1>
      <div class="subhead">Estimate #{{estimate_number}} | Move date: {{move_date}}</div>
      <div class="meta-row">
        <div class="meta-chip">{{move_size_label}}</div>
        <div class="meta-chip">{{move_type_label}}</div>
      </div>
    </div>
    <div class="stack">
      <section class="section">
        <div class="section-title">Move Details</div>
        <div class="grid4" style="margin-top: 16px;">
          <div class="info-card">
            <div class="info-k">Origin Address</div>
            <div class="info-v">{{origin_address}}</div>
          </div>
          <div class="info-card">
            <div class="info-k">Destination Address</div>
            <div class="info-v">{{destination_address}}</div>
          </div>
          <div class="info-card">
            <div class="info-k">Route Stops</div>
            <div class="info-v">{{route_stops_html}}</div>
          </div>
          <div class="info-card">
            <div class="info-k">Sales Representative</div>
            <div class="info-v">{{sales_rep_name}}<br/>{{sales_rep_phone}}</div>
          </div>
        </div>
      </section>
      <section class="section">
        <div class="section-title">Pricing Summary</div>
        <div>{{estimate_breakdown}}</div>
      </section>
      <section class="section">
        <div class="section-title">Terms & Conditions</div>
        <div>{{terms_title}}</div>
        <div>{{terms_body}}</div>
        <div class="actions" style="margin-top: 20px;">
          <span data-portal-block="signing"></span>
          <span data-portal-block="payment"></span>
        </div>
      </section>
    </div>
  </div>
</div>
`;

const DEFAULT_FALLBACK_TEMPLATE_CSS = `
.portal-shell { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; color: #0f172a; }
.wrap { max-width: 900px; margin: 0 auto; padding: 24px 16px; }
.hero-main { border-radius: 24px; border: 1px solid #e2e8f0; background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%); box-shadow: 0 10px 30px -10px rgba(0,0,0,0.05); padding: 28px; }
.eyebrow { display: inline-flex; border-radius: 999px; background: #eff6ff; border: 1px solid #dbeafe; color: #1d4ed8; font-size: 10px; font-weight: 800; letter-spacing: .15em; text-transform: uppercase; padding: 6px 12px; }
.headline { margin-top: 12px; font-size: 28px; font-weight: 800; letter-spacing: -.03em; color: #0f172a; }
.subhead { margin-top: 8px; color: #475569; font-size: 14px; font-weight: 500; }
.meta-row { display: flex; gap: 8px; margin-top: 16px; }
.meta-chip { border-radius: 999px; border: 1px solid #e2e8f0; background: #fff; padding: 6px 12px; font-size: 12px; font-weight: 600; color: #475569; }
.stack { display: flex; flex-direction: column; gap: 20px; }
.section { border-radius: 24px; border: 1px solid #e2e8f0; background: #fff; padding: 24px; box-shadow: 0 4px 20px -10px rgba(0,0,0,0.05); }
.section-title { font-size: 18px; font-weight: 800; color: #0f172a; }
.grid4 { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
.info-card { border-radius: 16px; border: 1px solid #f1f5f9; background: #f8fafc; padding: 16px; }
.info-k { font-size: 10px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: #64748b; }
.info-v { margin-top: 6px; font-size: 13px; font-weight: 600; color: #1e293b; line-height: 1.5; }
.callout { border-radius: 16px; border: 1px solid #e2e8f0; background: #f8fafc; padding: 16px; }
`;

const money = (amount) => {
  const value = Number(amount || 0);
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
  }).format(value);
};

const signatureButtonClass =
  'inline-flex items-center gap-2 rounded-xl border border-brand-border bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-content-sec transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60';

const getSquareSdkUrl = (environment) =>
  environment === 'production'
    ? 'https://web.squarecdn.com/v1/square.js'
    : 'https://sandbox.web.squarecdn.com/v1/square.js';

const loadSquareSdk = (environment) =>
  new Promise((resolve, reject) => {
    if (window.Square?.payments) {
      resolve(window.Square);
      return;
    }
    const scriptId = 'square-web-payments-sdk';
    const existing = document.getElementById(scriptId);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Square), { once: true });
      existing.addEventListener('error', () => reject(new Error('Unable to load Square Web Payments SDK.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = getSquareSdkUrl(environment);
    script.async = true;
    script.onload = () => resolve(window.Square);
    script.onerror = () => reject(new Error('Unable to load Square Web Payments SDK.'));
    document.body.appendChild(script);
  });

const replaceTemplateVariables = (html, data) => {
  const raw = String(html || '');
  if (!raw) return '';
  const map = data && typeof data === 'object' ? data : {};
  const resolveTemplateLookupKey = (key) => {
    if (!key.includes('.')) return key;
    if (key === 'Company.name') return 'company_name';
    if (key === 'Company.logo_url') return 'company_logo_url';
    if (key === 'Estimate.estimate_number') return 'estimate_number';
    if (key === 'Estimate.subtotal') return 'subtotal';
    if (key === 'Estimate.discount_amount') return 'discount_amount';
    if (key === 'Estimate.sales_tax_amount') return 'sales_tax_amount';
    if (key === 'Estimate.grand_total') return 'grand_total';
    if (key === 'Estimate.deposit_amount') return 'deposit_amount';
    if (key === 'Estimate.balance_due') return 'balance_due';
    if (key === 'Customer.full_name') return 'customer_name';
    if (key === 'Opportunity.move_date') return 'move_date';
    return key;
  };
  const withCurlies = raw.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_\.]*)\s*\}\}/g, (match, key) => {
    const lookupKey = resolveTemplateLookupKey(key);
    const value = map[lookupKey];
    if (value === undefined || value === null) return match;
    return String(value);
  });
  return withCurlies.replace(/@([a-zA-Z_][a-zA-Z0-9_\.]*)/g, (match, key) => {
    const lookupKey = resolveTemplateLookupKey(key);
    const value = map[lookupKey];
    if (value === undefined || value === null) return match;
    return String(value);
  });
};

const stripOptionalEstimateSignatureHtml = (html) => {
  const raw = String(html || '');
  if (!raw) return '';
  return raw
    .replace(/<!-- Signature Modal -->[\s\S]*?<!-- Thank You Modal -->/m, '<!-- Thank You Modal -->')
    .replace(/<span data-portal-block="signing"><\/span>/gi, '')
    .replace(/<div[^>]*class="[^"]*\bmodal-signature\b[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/m, '')
    .replace(/<div[^>]*class="[^"]*\best-modal-overlay\b[^"]*\bmodal-signature\b[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/m, '')
    .replace(/id="header-no-sig-toggle"/gi, '')
    .replace(/Accept without signature \(Direct Accept\)/gi, '')
    .replace(/Sign & Accept/gi, 'Accept');
};

const decodeHtmlEntities = (raw) => {
  const text = String(raw || '');
  if (!text) return '';
  if (typeof document === 'undefined') return text;
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

const DEFAULT_MOBILE_CSS = `
  @media (max-width: 768px) {
      .responsive-grid-3 { grid-template-columns: 1fr !important; }
      .responsive-grid-2 { grid-template-columns: 1fr !important; }
      .mobile-padding { padding-left: 1.5rem !important; padding-right: 1.5rem !important; padding-top: 1.5rem !important; }
      .financial-box-width { width: 100% !important; min-width: 0 !important; }
      .responsive-flex-end { justify-content: flex-start !important; }
      .route-container { flex-direction: column !important; align-items: stretch !important; }
      .route-arrow-h { display: none !important; }
  }
`;

const scopePortalCss = (css) => {
  const combinedCss = `${css || ''} ${DEFAULT_MOBILE_CSS}`;
  const processed = combinedCss
    .replace(/\bbody(?![a-zA-Z0-9_-])/g, '&')
    .replace(/\bhtml(?![a-zA-Z0-9_-])/g, '&')
    .replace(/:root(?![a-zA-Z0-9_-])/g, '&')
    .replace(/\.portal-template(?![a-zA-Z0-9_-])/g, '&');
  return `.portal-template {
    ${processed}
  }`;
};

const normalizeTemplateHtml = (raw) => {
  const decoded = decodeHtmlEntities(raw);
  const html = String(decoded || '').trim();
  if (!html) return '';

  const styleTags = [];
  const styleRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  const linkRe = /<link\b[^>]*>/gi;

  // Extract and scope all style tags from the entire HTML
  const cleanHtmlForStyle = html.replace(styleRe, (fullStyleTag, cssContent) => {
    const scopedCss = scopePortalCss(cssContent);
    styleTags.push(`<style>${scopedCss}</style>`);
    return '';
  });

  // Extract link tags from head
  const headMatch = cleanHtmlForStyle.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  if (headMatch) {
    const head = headMatch[1] || '';
    const headLinks = head.match(linkRe) || [];
    headLinks.forEach((l) => styleTags.push(l));
  }

  const bodyMatch = cleanHtmlForStyle.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const extracted = bodyMatch ? bodyMatch[1] : cleanHtmlForStyle;

  return `${styleTags.join('\n')}\n${extracted}`.trim();
};

const DEFAULT_TEMPLATE_CSS = `
.portal-template.portal-template-default {
  color: #0f172a;
}
.portal-template.portal-template-default a {
  color: var(--portal-primary-color, #2563eb);
  text-decoration: underline;
  font-weight: 700;
}
.portal-template.portal-template-default h1, .portal-template.portal-template-default h2, .portal-template.portal-template-default h3 {
  letter-spacing: -0.02em;
  font-weight: 900;
}
.portal-template.portal-template-default h1 { font-size: 2.25rem; line-height: 2.5rem; }
.portal-template.portal-template-default h2 { font-size: 1.5rem; line-height: 2rem; margin-top: 1.25rem; }
.portal-template.portal-template-default h3 { font-size: 1.125rem; line-height: 1.75rem; margin-top: 1rem; }
.portal-template.portal-template-default p { margin-top: 0.75rem; color: #334155; font-weight: 600; }
.portal-template.portal-template-default ul { margin-top: 0.75rem; padding-left: 1.25rem; list-style: disc; color: #334155; font-weight: 600; }
.portal-template.portal-template-default hr { margin: 1.25rem 0; border: 0; height: 1px; background: #e2e8f0; }
.portal-template.portal-template-default .btn, .portal-template.portal-template-default button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 1rem;
  padding: 0.85rem 1.1rem;
  font-weight: 900;
  background: var(--portal-primary-color, #2563eb);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.35);
  box-shadow: 0 16px 30px rgba(37,99,235,0.18);
}
.portal-template.portal-template-default .card {
  border-radius: 1.25rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
  padding: 1.25rem;
}
`;

const initializeSignatureCanvas = (canvas) => {
  if (!canvas) return false;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return false;

  const ratio = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);

  const context = canvas.getContext('2d');
  if (!context) return false;

  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.lineWidth = 2;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.strokeStyle = '#1F2937';
  return true;
};

const clearSignatureCanvas = (canvas) => {
  if (!canvas) return;
  const context = canvas.getContext('2d');
  if (!context) return;

  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.restore();
};

// scopePortalCss moved to top of file to prevent ReferenceError in normalizeTemplateHtml

export default function CustomerEstimatePortal() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const debugPortalTemplate = params.get('debug') === '1';
  const squareCardContainerRef = useRef(null);
  const squareCardRef = useRef(null);

  const [portal, setPortal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [payingOption, setPayingOption] = useState('');
  const [error, setError] = useState('');      
  const [approvedByName, setApprovedByName] = useState('');
  const [approvedByEmail, setApprovedByEmail] = useState('');
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [estimateAccepted, setEstimateAccepted] = useState(false);
  const [lastPaymentRequest, setLastPaymentRequest] = useState(null);
  const [squareOrder, setSquareOrder] = useState(null);
  const [squareOrderLoading, setSquareOrderLoading] = useState(false);
  const [squareOrderError, setSquareOrderError] = useState('');
  const [checkoutConfig, setCheckoutConfig] = useState(null);
  const [nativePaymentRequest, setNativePaymentRequest] = useState(null);
  const [squareCardReady, setSquareCardReady] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const lastRequestStatus = String(lastPaymentRequest?.status || '').toLowerCase();
  const lastRequestOption = String(lastPaymentRequest?.payment_option || '').toLowerCase();
  const paymentSummary = portal?.payment_summary || {};
  const paymentResultStatus = String(paymentResult?.status || '').toLowerCase();
  const paymentCompleted =
    Boolean(paymentSummary?.is_fully_paid) ||
    lastRequestStatus === 'paid' ||
    lastRequestStatus === 'refunded' ||
    paymentResultStatus === 'succeeded' ||
    paymentResultStatus === 'paid';
  const fullAlreadyPaid = paymentCompleted && lastRequestOption === 'full';
  const depositAlreadyPaid = paymentCompleted && lastRequestOption === 'deposit';
  const [nativeAttemptStarted, setNativeAttemptStarted] = useState(false);
  const [nativeAttemptFailed, setNativeAttemptFailed] = useState(false);

  const LAST_PAYMENT_STORAGE_KEY = token ? `estimate_portal_last_payment_request:${token}` : '';

  const fetchRef = useRef(false);

  const loadPortal = async ({ silent = false } = {}) => {
    if (!token) {
      setError('Missing estimate portal token.');
      setLoading(false);
      return;
    }
    
    if (fetchRef.current) return;
    fetchRef.current = true;

    if (!silent) {
      setLoading(true);
    }
    setError('');
    try {
      const data = await getPublicEstimatePortal(token);
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[estimate-portal] fetched portal payload', {
          estimateId: data?.estimate_id,
          status: data?.status,
          esigned: data?.esigned,
          templateSnapshotPresent: Boolean(data?.portal_template_snapshot && typeof data.portal_template_snapshot === 'object' && Object.keys(data.portal_template_snapshot).length),
          contractTemplateId: data?.contract_payload?.portal_template?.id,
          contractTemplateVersion: data?.contract_payload?.portal_template?.version,
          contractTemplateName: data?.contract_payload?.portal_template?.name,
        });
      }
      setPortal(data);
      setApprovedByName(data.approved_by_name || data.customer_name || '');
      setApprovedByEmail(data.approved_by_email || data.customer_email || '');
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to load this estimate portal.');
    } finally {
      if (!silent) {
        setLoading(false);
      }
      fetchRef.current = false;
    }
  };

  useEffect(() => {
    loadPortal();
  }, [token]);

  useEffect(() => {
    if (!token) return undefined;

    const refreshVisiblePortal = () => {
      if (document.visibilityState === 'visible') {
        loadPortal({ silent: true });
      }
    };

    const interval = window.setInterval(refreshVisiblePortal, 10000);
    window.addEventListener('focus', refreshVisiblePortal);
    document.addEventListener('visibilitychange', refreshVisiblePortal);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshVisiblePortal);
      document.removeEventListener('visibilitychange', refreshVisiblePortal);
    };
  }, [token]);

  useEffect(() => {
    const root = document.documentElement;
    const hadDarkClass = root.classList.contains('dark');
    if (hadDarkClass) {
      root.classList.remove('dark');
    }
    return () => {
      if (hadDarkClass) {
        root.classList.add('dark');
      }
    };
  }, []);

  useEffect(() => {
    if (loading || !portal) return undefined;

    const scrollToTargetSection = () => {
      const hashTarget = window.location.hash.replace('#', '').trim().toLowerCase();
      const queryTarget = (params.get('navigate') || params.get('section') || (params.get('payment') === 'true' ? 'payment' : '')).trim().toLowerCase();
      const target = hashTarget || queryTarget;

      if (!target) return;

      const timer = setTimeout(() => {
        const element =
          document.getElementById(target) ||
          document.querySelector(`[data-portal-block="${target}"]`) ||
          document.querySelector(`[data-action="${target}"]`);

        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-4', 'ring-primary/40', 'transition-all', 'duration-500');
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-primary/40');
          }, 2500);
        }
      }, 200);

      return () => clearTimeout(timer);
    };

    scrollToTargetSection();
    window.addEventListener('hashchange', scrollToTargetSection);
    return () => window.removeEventListener('hashchange', scrollToTargetSection);
  }, [loading, portal, params]);

  const contractPayload = portal?.contract_payload || {};
  const portalTemplateSnapshot = portal?.portal_template_snapshot && typeof portal.portal_template_snapshot === 'object'
    ? portal.portal_template_snapshot
    : null;
  const portalAccepted = Boolean(portal?.esigned) || portal?.status === 'signed' || Boolean(portal?.approved_at);
  const portalTemplate = portalAccepted
    ? (portalTemplateSnapshot || contractPayload?.portal_template || {})
    : (contractPayload?.portal_template || portalTemplateSnapshot || {});
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[estimate-portal] selected template', {
      portalAccepted,
      templateId: portalTemplate?.id,
      templateVersion: portalTemplate?.version,
      templateName: portalTemplate?.name,
      hasSnapshot: Boolean(portalTemplateSnapshot),
      hasContractTemplate: Boolean(contractPayload?.portal_template),
    });
  }
  
  const portalSettings = portal?.customer_portal_settings || {};
  const estimateEsignEnabled = portalTemplate?.require_e_signature !== false && portalSettings?.estimate_esign_enabled !== false;

  useEffect(() => {
    if (!estimateEsignEnabled) {
      setSignatureModalOpen(false);
    }
  }, [estimateEsignEnabled]);

  const portalBrand = portalTemplate?.brand_config || {};
  const portalSections = portalTemplate?.section_config || {};
  const portalTerms = portalTemplate?.terms_config || {};
  const portalPayments = portalTemplate?.payment_config || {};
  const portalLayout = portalTemplate?.layout_config || {};
  const layoutName = String(portalLayout?.layout || 'modern_card').trim() || 'modern_card';
  const templateHtml = String(portalTemplate?.html_content || portalLayout?.page_html || '').trim();
  const templateCss = String(portalTemplate?.css_content || portalLayout?.page_css || '').trim();
  let activeHtml = templateHtml || DEFAULT_FALLBACK_TEMPLATE_HTML;
  // Fix legacy inventory portal blocks
  activeHtml = activeHtml.replace(
    /<div class="btn([^"]*)">((?:(?!<div class="btn)[\s\S])*?)<span data-portal-block="inventory"><\/span>([\s\S]*?)<\/div>/gi,
    `<a href="{{inventory_link}}" target="_blank" class="btn$1" style="text-decoration: none;">$2$3</a>`
  );
  // Fix signature joining bug in legacy templates by removing ctx.closePath()
  activeHtml = activeHtml.replace(/ctx\.closePath\(\);\s*/g, '');
  const activeCss = templateCss || DEFAULT_FALLBACK_TEMPLATE_CSS;

  useEffect(() => {
    if (activeHtml.includes('cdn.tailwindcss.com')) {
      const scriptId = 'tailwind-cdn-script';
      let script = document.getElementById(scriptId);
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://cdn.tailwindcss.com';
        document.head.appendChild(script);
      }
    }
  }, [activeHtml]);

  useEffect(() => {
    if (!LAST_PAYMENT_STORAGE_KEY) return;
    try {
      const raw = window.localStorage.getItem(LAST_PAYMENT_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      setLastPaymentRequest(parsed && typeof parsed === 'object' ? parsed : null);
    } catch {
      setLastPaymentRequest(null);
    }
  }, [LAST_PAYMENT_STORAGE_KEY]);

  useEffect(() => {
    const orderId = lastPaymentRequest?.provider_order_id || lastPaymentRequest?.provider_reference;
    const provider = String(lastPaymentRequest?.provider || '').toLowerCase();
    if (!token || !orderId || provider !== 'square') {
      setSquareOrder(null);
      setSquareOrderError('');
      return;
    }
    setSquareOrderLoading(true);
    setSquareOrderError('');
    getPublicSquareOrder(token, orderId)
      .then((res) => {
        const data = res?.data ?? res;
        setSquareOrder(data || null);
      })
      .catch((err) => {
        setSquareOrder(null);
        setSquareOrderError(err?.response?.data?.detail || 'Unable to load Square order details.');
      })
      .finally(() => setSquareOrderLoading(false));
  }, [token, lastPaymentRequest?.provider_order_id, lastPaymentRequest?.provider_reference, lastPaymentRequest?.provider]);

  useEffect(() => {
    let isActive = true;

    const setupSquareCard = async () => {
      if (checkoutConfig?.checkout_mode !== 'web_payments') {
        setSquareCardReady(false);
        return;
      }
      if (!checkoutConfig?.application_id || !checkoutConfig?.location_id) {
        setError('Square checkout is not fully configured.');
        setSquareCardReady(false);
        return;
      }
      if (!squareCardContainerRef.current) {
        return;
      }

      setSquareCardReady(false);
      try {
        const Square = await loadSquareSdk(checkoutConfig.environment || 'sandbox');
        if (!isActive) return;
        const payments = Square.payments(checkoutConfig.application_id, checkoutConfig.location_id);
        const card = await payments.card();
        if (!isActive) return;
        squareCardContainerRef.current.innerHTML = '';
        await card.attach(squareCardContainerRef.current);
        squareCardRef.current = card;
        setSquareCardReady(true);
      } catch (sdkError) {
        if (!isActive) return;
        setSquareCardReady(false);
        setError(sdkError?.message || 'Unable to initialize secure card entry.');
      }
    };

    setupSquareCard();

    return () => {
      isActive = false;
    };
  }, [checkoutConfig]);

  const handleApprove = async (signaturePayload) => {
    const signerName = String(approvedByName || portal?.customer_name || '').trim();
    const signerEmail = String(approvedByEmail || portal?.customer_email || '').trim();
    if (estimateEsignEnabled && !String(signaturePayload || '').trim()) {
      setSignatureModalOpen(true);
      return false;
    }
    if (!signerName) {
      setError('Customer name is required before signing.');
      return false;
    }
    setSubmitting(true);
    setError('');
    try {
      const data = await approvePublicEstimatePortal({
        token,
        approved_by_name: signerName,
        approved_by_email: signerEmail,
        signature_payload: signaturePayload || '',
        consent_accepted: true,
        consent_text: 'I agree to sign this moving contract electronically.',
        consent_version: 'v1',
      });
      setPortal(data);
      setEstimateAccepted(true);
      setSignatureModalOpen(true);
      loadPortal({ silent: true });
      return true;
    } catch (err) {
      const nextError =
        err.response?.data?.detail ||
        Object.values(err.response?.data || {}).flat().join(' ') ||
        'Unable to approve this estimate.';
      setError(nextError);
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartPayment = async (paymentOption) => {
    if (paymentCompleted) {
      setError('Payment already completed.');
      return;
    }
    if (paymentOption === 'deposit' && fullAlreadyPaid) {
      setError('Full payment is already completed.');
      return;
    }
    if (paymentOption === 'deposit' && depositAlreadyPaid) {
      setError('Deposit is already paid.');
      return;
    }
    setPayingOption(paymentOption);
    setError('');
    setPaymentResult(null);
    setNativeAttemptStarted(false);
    setNativeAttemptFailed(false);
    try {
      const data = await createPublicEstimatePaymentSession({
        token,
        payment_option: paymentOption,
      });
      if (String(data?.status || '').toLowerCase() === 'paid') {
        setNativePaymentRequest(data || null);
        setCheckoutConfig(data?.checkout_config || null);
        setError(data?.detail || 'Payment already completed.');
        return;
      }
      if (LAST_PAYMENT_STORAGE_KEY) {
        try {
          window.localStorage.setItem(LAST_PAYMENT_STORAGE_KEY, JSON.stringify(data || {}));
          setLastPaymentRequest(data || null);
        } catch {
          // ignore storage errors
        }
      }
      setNativePaymentRequest(data || null);
      setCheckoutConfig(data?.checkout_config || null);
      if (data?.checkout_url) {
        if (String(data?.provider || '').toLowerCase() === 'authorize_net') {
          const opened = openAuthorizeNetHostedCheckout(
            data.checkout_url,
            data?.provider_checkout_reference || data?.provider_reference
          );
          if (opened) return;
        }
        window.location.href = data.checkout_url;
        return;
      }
      if (data?.checkout_config?.checkout_mode === 'web_payments') {
        return;
      }
      setError('Payment checkout session was not returned.');
    } catch (err) {
      const detail = String(err.response?.data?.detail || '');
      const paymentOptionError = String(err.response?.data?.payment_option || '');
      const normalized = `${detail} ${paymentOptionError}`.toLowerCase();
      let nextError =
        detail ||
        Object.values(err.response?.data || {}).flat().join(' ') ||
        'Unable to create a payment session.';
      if (normalized.includes('payment already completed')) {
        nextError = 'Payment already completed.';
      } else if (normalized.includes('active or completed payment request')) {
        nextError = 'A payment session is already active. Please continue with the existing checkout.';
      } else if (normalized.includes('remaining balance') || normalized.includes('overpay')) {
        nextError = 'Payment exceeds remaining balance.';
      }
      setError(nextError);
    } finally {
      setPayingOption('');
    }
  };

  const handleHostedFallback = async () => {
    if (!nativePaymentRequest?.payment_option) {
      return;
    }
    setPayingOption(nativePaymentRequest.payment_option);
    setError('');
    try {
      const data = await createPublicEstimatePaymentSession({
        token,
        payment_option: nativePaymentRequest.payment_option,
        checkout_mode: 'hosted_checkout',
      });
      if (data?.checkout_url) {
        if (String(data?.provider || '').toLowerCase() === 'authorize_net') {
          const opened = openAuthorizeNetHostedCheckout(
            data.checkout_url,
            data?.provider_checkout_reference || data?.provider_reference
          );
          if (opened) return;
        }
        window.location.href = data.checkout_url;
        return;
      }
      setError('Hosted checkout link was not returned.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to switch to hosted checkout.');
    } finally {
      setPayingOption('');
    }
  };

  const handleNativePaymentSubmit = async () => {
    if (!nativePaymentRequest?.id || !nativePaymentRequest?.payment_option) {
      setError('Payment request is not ready yet.');
      return;
    }
    if (!squareCardRef.current) {
      setError('Secure card form is still loading.');
      return;
    }

    setPaymentSubmitting(true);
    setError('');
    setPaymentResult(null);
    setNativeAttemptStarted(true);
    try {
      const tokenResult = await squareCardRef.current.tokenize();
      if (tokenResult.status !== 'OK' || !tokenResult.token) {
        setNativeAttemptFailed(true);
        throw new Error(tokenResult.errors?.[0]?.message || 'Card tokenization failed.');
      }

      const data = await createPublicEstimateSquarePayment({
        token,
        payment_request_id: nativePaymentRequest.id,
        payment_type: nativePaymentRequest.payment_option,
        source_id: tokenResult.token,
      });
      setPaymentResult(data);
      setLastPaymentRequest((prev) => ({
        ...(prev || {}),
        provider: 'square',
        provider_reference: data?.payment_id || prev?.provider_reference || nativePaymentRequest.provider_reference,
        provider_order_id: data?.provider_order_id || prev?.provider_order_id || nativePaymentRequest.provider_order_id,
        receipt_url: data?.receipt_url || prev?.receipt_url || '',
        status: data?.status || prev?.status || '',
      }));
      await loadPortal({ silent: true });
    } catch (err) {
      setNativeAttemptFailed(true);
      setError(err.response?.data?.detail || err.message || 'Payment could not be processed.');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const canShowHostedFallback =
    checkoutConfig?.square_hosted_checkout_fallback_enabled &&
    !paymentSubmitting &&
    !paymentResult &&
    !nativeAttemptStarted &&
    !nativeAttemptFailed;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="text-xs font-bold uppercase tracking-widest text-black">Securing Link...</p>
        </div>
      </div>
    );
  }

  const showSection = (key, fallback = true) => {
    const value = portalSections?.[key];
    return value === undefined ? fallback : Boolean(value);
  };

  const hasSnapshotCharges = Array.isArray(contractPayload?.charges) && contractPayload.charges.length > 0;
  const charges = hasSnapshotCharges
    ? contractPayload.charges
    : Array.isArray(portal?.charge_breakdown)
      ? portal.charge_breakdown.map((line) => ({
          name: line?.name,
          description: line?.description,
          rate_display: line?.rate_display,
          quantity: line?.quantity,
          unit: line?.unit,
          unit_price: line?.unit_price,
          amount: line?.total_price ?? line?.amount ?? 0,
          discount_amount: line?.discount_amount ?? 0,
        }))
      : [];
  const usePayloadTotals = Boolean(contractPayload && Object.keys(contractPayload).length > 0);
  const hasItemizedPricing = hasSnapshotCharges;
  const chargeSummary = summarizePortalChargeRows(charges);
  const totals = {
    subtotal: usePayloadTotals ? Number(contractPayload?.subtotal ?? 0) : Number(portal?.subtotal ?? 0),
    discount: usePayloadTotals ? Number(contractPayload?.discount_amount ?? 0) : Number(portal?.discount_amount ?? 0),
    tax: usePayloadTotals ? Number(contractPayload?.tax ?? 0) : Number(portal?.sales_tax_amount ?? 0),
    total: usePayloadTotals ? Number(contractPayload?.total ?? 0) : Number(portal?.grand_total ?? 0),
    deposit: usePayloadTotals ? Number(contractPayload?.deposit ?? 0) : Number(portal?.deposit_amount ?? 0),
    taxRate: usePayloadTotals ? Number(contractPayload?.tax_rate ?? 0) : Number(portal?.sales_tax_pct ?? 0) * 100,
    taxExempt: usePayloadTotals ? Boolean(contractPayload?.tax_exempt ?? false) : Boolean(portal?.tax_exempt ?? false),
  };
  const discountValue = Number(totals.discount || 0);
  const totalBeforeDiscount = Number.isFinite(Number(totals.subtotal))
    ? Number(totals.subtotal)
    : Number(chargeSummary.subtotalTotal || 0);
  const totalAfterDiscount = Number.isFinite(Number(totals.total))
    ? Number(totals.total)
    : Number(chargeSummary.estimatedTotal || 0) + discountValue + Number(totals.tax || 0);
  const computedFullAmount = Number(checkoutConfig?.payment_option === 'full' ? checkoutConfig?.amount : (paymentSummary?.balance_due_amount ?? totals.total));
  const termsText = String(portalTerms?.terms_body || contractPayload?.legal_terms || '').trim();
  const apiBaseUrl = String(import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/$/, '');
  const inventoryLink = portal?.inventory_link || '';
  const routeStops = Array.isArray(portal?.route_stops) ? portal.route_stops : [];
  const routeStopsHtml = portal?.route_stops_html || generateRouteStopsHtml(routeStops);
  const routeStopsSummary = portal?.route_stops_summary || (routeStops.length ? routeStops.map((stop) => `${stop?.label || 'Stop'}: ${stop?.address || ''}`).join('\n') : 'Direct route with no additional stops.');
  const signedEstimatePdfUrl = token ? `${apiBaseUrl}/public/estimates/portal/pdf/?token=${encodeURIComponent(token)}` : '';

  const openSignaturePad = () => {
    if (estimateEsignEnabled) {
      setSignatureModalOpen(true);
      return;
    }
    handleApprove('');
  };

  const requestConfirm = (actionCallback) => {
    setConfirmAction(() => actionCallback);
    setConfirmModalOpen(true);
  };

  const ctx = {
    token,
    portal,
    money,
    totals,
    charges,
    portalTemplate,
    portalBrand,
    portalSections,
    portalTerms,
    portalPayments,
    estimateEsignEnabled,
    showSection,
    approvedByName,
    setApprovedByName,
    approvedByEmail,
    setApprovedByEmail,
    submitting,
    error,
    setError,
    signatureModalOpen,
    setSignatureModalOpen,
    openSignaturePad,
    handleApprove,
    payingOption,
    paymentSubmitting,
    paymentSummary,
    computedFullAmount,
    depositAlreadyPaid,
    fullAlreadyPaid,
    paymentCompleted,
    handleStartPayment,
    inventoryLink,
    routeStops,
    requestConfirm,
    signedEstimatePdfUrl,
  };

  const variables = {
    company_name: portal?.company_name || portalBrand?.company_name || '',
    company_logo_url: portal?.branch_logo_url || portalBrand?.logo_url || portalBrand?.logo || '',
    branch_name: portal?.branch_name || '',
    branch_phone: portal?.branch_phone || '',
    branch_email: portal?.branch_email || '',
    branch_website: portal?.branch_website || '',
    branch_address: portal?.branch_address || '',
    branch_email_footer: portal?.branch_email_footer_html || '',
    estimate_number: portal?.display_number || portal?.sales_number || portal?.estimate_number || portal?.estimate_id || '',
    customer_name: portal?.customer_name || '',
    customer_email: portal?.customer_email || '',
    customer_phone: portal?.customer_phone || '',
    move_date: portal?.move_date || '',
    move_size_label: portal?.move_size_label || '',
    move_type_label: portal?.move_type_label || portal?.move_type || '',
    origin_address: portal?.origin_address || portal?.pickup_address || '',
    origin_meta: portal?.origin_meta || '',
    destination_address: portal?.destination_address || portal?.delivery_address || '',
    destination_meta: portal?.destination_meta || '',
    route_stops_count: portal?.route_stops_count ?? routeStops.length,
    route_stops_summary: routeStopsSummary,
    route_stops_html: routeStopsHtml,
    sales_rep_name: portal?.sales_rep_name || portal?.rep_name || portal?.assigned_to_name || '',
    sales_rep_phone: portal?.sales_rep_phone || portal?.rep_phone || '',
    subtotal: money(totalBeforeDiscount),
    discount_amount: formatSignedMoney(-discountValue, money),
    sales_tax_amount: money(totals.tax),
    grand_total: money(totalAfterDiscount),
    deposit_amount: money(totals.deposit),
    balance_due: money(paymentSummary?.balance_due_amount ?? totalAfterDiscount),
    inventory_link: inventoryLink,
    terms_title: String(portalTerms?.terms_title || 'Terms & Conditions').trim(),
    terms_body: termsText,
    checkbox_text: String(portalTerms?.checkbox_text || '').trim(),
    signature_text: String(portalTerms?.signature_text || '').trim(),
    payment_authorization_text: String(portalTerms?.payment_authorization_text || '').trim(),
    estimate_breakdown: generateEstimateBreakdownHtml(charges, totals, money, portal?.job_sections || []),
  };

  const normalizedHtml = normalizeTemplateHtml(activeHtml);
  const rendered = replaceTemplateVariables(normalizedHtml, variables);
  const renderedSafe = estimateEsignEnabled ? rendered : stripOptionalEstimateSignatureHtml(rendered);
  const templateSupportsRouteStops = /route_stops_(html|summary|count)|\{\{\s*route_stops_|@route_stops_/i.test(activeHtml || '');
  const templateSupportsEstimateBreakdown = /estimate_breakdown|\{\{\s*estimate_breakdown\s*\}\}|@estimate_breakdown/i.test(activeHtml || '');

  const isCustomHtmlMode = Boolean(templateHtml);
  return (
    <div
      className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-black font-sans"
      style={{
        '--portal-primary-color': portalBrand?.primary_color || undefined,
        '--portal-accent-color': portalBrand?.accent_color || undefined,
      }}
    >
      {!portalLayout?.ignore_default_styles && !isCustomHtmlMode ? (
        <style dangerouslySetInnerHTML={{ __html: DEFAULT_TEMPLATE_CSS }} />
      ) : null}
      {activeCss ? <style dangerouslySetInnerHTML={{ __html: scopePortalCss(activeCss) }} /> : null}
      {error ? (
        <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
          <div
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 shadow-sm"
          >
            {error}
          </div>
        </div>
      ) : null}
      <div className="sticky top-0 z-40 border-b border-[#d9e5f4] bg-white/95 shadow-sm backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4 px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1f7ae0] text-white shadow-sm">
              <Phone className="h-4 w-4" />
            </div>
            <div className="min-w-0 leading-tight">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-600">Call us anytime</div>
              <div className="truncate text-sm font-extrabold text-[#1f7ae0]">
                {portal?.branch_phone || ''}
              </div>
            </div>
          </div>

          <div className="flex max-w-full flex-nowrap items-center gap-3 overflow-x-auto whitespace-nowrap pl-4">
            {portalAccepted ? (
              <a
                href={ctx.signedEstimatePdfUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#1f7ae0] px-5 py-2.5 text-[13px] font-black uppercase tracking-widest text-white shadow-sm transition hover:bg-[#1658a1]"
              >
                Download PDF
              </a>
            ) : null}
            {portalAccepted && !ctx.depositAlreadyPaid && !ctx.fullAlreadyPaid ? (
              <button
                type="button"
                disabled={ctx.paymentSubmitting}
                onClick={() => ctx.handleStartPayment('deposit')}
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#1f7ae0] px-5 py-2.5 text-[13px] font-black uppercase tracking-widest text-white shadow-sm transition hover:bg-[#1658a1] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {ctx.paymentSubmitting && ctx.payingOption === 'deposit'
                  ? 'Starting Deposit…'
                  : `Pay Deposit${Number(ctx.totals?.deposit || 0) > 0 ? ` (${ctx.money(Number(ctx.totals?.deposit || 0))})` : ''}`}
              </button>
            ) : null}
            {ctx.inventoryLink ? (
              <a
                href={ctx.inventoryLink}
                target="_blank"
                rel="noreferrer"
                aria-label="Open inventory portal"
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#1f7ae0] px-5 py-2.5 text-[13px] font-black uppercase tracking-widest text-white shadow-sm transition hover:bg-[#1658a1]"
              >
                Manage Inventory
              </a>
            ) : null}
            {!portalAccepted ? (
              <button
                type="button"
                onClick={() => ctx.openSignaturePad()}
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#1f7ae0] px-5 py-2.5 text-[13px] font-black uppercase tracking-widest text-white shadow-sm transition hover:bg-[#1658a1]"
              >
                Accept Estimate
              </button>
            ) : null}
            </div>
          </div>
        </div>
      </div>

      {isCustomHtmlMode ? (
        <div className="py-10 px-4">
          <div className="w-full max-w-[850px] mx-auto bg-white min-h-[1056px] shadow-2xl overflow-hidden">
            <EstimatePortalTemplateRenderer
              renderedHtml={renderedSafe}
              ctx={ctx}
              debug={debugPortalTemplate}
              templateClassName="portal-template portal-template-custom"
            />
            {routeStops.length > 0 && !templateSupportsRouteStops ? (
              <div className="px-6 pb-10">
                <EstimatePortalRouteStopsBlock ctx={ctx} />
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-200/50">
            <div className="p-6 sm:p-10">
              <section className="mb-6 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">Estimate breakdown</div>
                    <h3 className="mt-1 text-lg font-extrabold text-slate-900">Pricing summary</h3>
                    <p className="mt-1 max-w-2xl text-sm font-medium text-slate-600">
                      This is the full estimate total. The discount shown here is applied before tax and is not tied to the currently selected job segment.
                    </p>
                  </div>
                  <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                    Live estimate
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Subtotal</div>
                    <div className="mt-2 font-mono text-xl font-black tabular-nums text-slate-900">{money(totalBeforeDiscount)}</div>
                  </div>
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">Discount</div>
                    <div className="mt-2 font-mono text-xl font-black tabular-nums text-emerald-700">
                      {discountValue > 0 ? `(${money(discountValue)})` : money(0)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Tax</div>
                    <div className="mt-2 font-mono text-xl font-black tabular-nums text-slate-900">{money(Number(totals.tax || 0))}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Grand total</div>
                    <div className="mt-2 font-mono text-xl font-black tabular-nums text-slate-900">{money(totalAfterDiscount)}</div>
                  </div>
                </div>
              </section>
              <EstimatePortalTemplateRenderer
                renderedHtml={renderedSafe}
                ctx={ctx}
                debug={debugPortalTemplate}
                templateClassName="portal-template portal-template-default"
              />
              {!templateSupportsEstimateBreakdown ? (
                <section className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Estimate Charges</div>
                  <div
                    className="mt-4"
                    dangerouslySetInnerHTML={{ __html: variables.estimate_breakdown }}
                  />
                </section>
              ) : null}
              {routeStops.length > 0 && !templateSupportsRouteStops ? <EstimatePortalRouteStopsBlock ctx={ctx} /> : null}
            </div>
          </div>
        </div>
      )}
      <SignaturePadModal
        open={signatureModalOpen}
        title="Accept Estimate"
        onClose={() => {
          setSignatureModalOpen(false);
          setEstimateAccepted(false);
        }}
        onSave={(dataUrl) => handleApprove(dataUrl)}
        saved={estimateAccepted}
        savedTitle="Estimate Accepted"
        savedDescription="Thank you for accepting the estimate. You can now proceed to payment."
      />
      {confirmModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Accept Estimate</h3>
            <p className="mt-2 text-sm text-slate-600">Are you sure you want to accept this estimate?</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  if (submitting) return;
                  setConfirmModalOpen(false);
                  setConfirmAction(null);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={async () => {
                  if (submitting) return;
                  if (confirmAction) await confirmAction();
                  setConfirmModalOpen(false);
                  setConfirmAction(null);
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary/90 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? 'Accepting…' : 'Accept'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EstimatePortalRouteStopsBlock({ ctx }) {
  const stops = Array.isArray(ctx?.routeStops) ? ctx.routeStops : [];
  if (!stops.length) return null;

  return (
    <section className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Route Stops</div>
      <div className="mt-4 space-y-4">
        {stops.map((stop, index) => (
          <div key={stop?.id || `${stop?.label || 'stop'}-${index}`} className="border-b border-slate-200 pb-4 last:border-b-0 last:pb-0">
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">{stop?.label || `Stop ${index + 1}`}</div>
            <div className="mt-1 text-sm font-extrabold text-slate-900">{stop?.address || 'Address unavailable'}</div>
            {stop?.meta ? <div className="mt-1 text-xs font-semibold text-slate-500">{stop.meta}</div> : null}
            {stop?.notes ? <div className="mt-1 text-xs font-medium text-slate-600">{stop.notes}</div> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

const HtmlContainer = React.memo(({ html, containerId, className }) => {
  return (
    <div id={containerId} className={className} dangerouslySetInnerHTML={{ __html: html }} />
  );
});

function EstimatePortalTemplateRenderer({ renderedHtml, ctx, debug = false, templateClassName = 'portal-template' }) {
  const containerId = useMemo(() => `estimate-portal-template-${Math.random().toString(36).slice(2)}`, []);
  const [portalNodes, setPortalNodes] = useState([]);

  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) {
      setPortalNodes([]);
      return;
    }
    const nodes = Array.from(container.querySelectorAll('[data-portal-block]'));
    setPortalNodes(nodes);

    // Execute scripts so widgets like the inline signature pad work
    const scripts = Array.from(container.querySelectorAll('script'));
    scripts.forEach(oldScript => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
      newScript.appendChild(document.createTextNode(oldScript.innerHTML));
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });

    const setHeaderToggle = (toggleId, checked) => {
      const toggle = container.querySelector(`#${toggleId}`);
      if (
        toggle &&
        (toggle instanceof HTMLInputElement) &&
        ['checkbox', 'radio'].includes(toggle.type)
      ) {
        toggle.checked = checked;
        toggle.dispatchEvent(new Event('input', { bubbles: true }));
        toggle.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };

    const portal = ctx?.portal || {};
    const isSigned = Boolean(portal?.esigned) || portal?.status === 'signed' || Boolean(portal?.approved_at);
    if (isSigned) {
      setHeaderToggle('header-sign-save-toggle', true);
      setHeaderToggle('header-dismiss-toggle', true);
    }

    if (ctx?.estimateEsignEnabled === false) {
      container.querySelectorAll('.modal-signature, .est-modal-overlay.modal-signature').forEach((node) => node.remove());
      container.querySelectorAll('#header-no-sig-toggle, [for="header-no-sig-toggle"]').forEach((node) => node.remove());
      container.querySelectorAll('label[for="signature-toggle"], label[for="header-accept-toggle"], .sign-button').forEach((node) => {
        if (node instanceof HTMLElement) {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = 'Accept';
          button.className = node.className;
          button.setAttribute('data-action', 'accept-no-sig');
          button.setAttribute('style', node.getAttribute('style') || '');
          button.removeAttribute('for');
          node.replaceWith(button);
        }
      });
      container.querySelectorAll('button[data-action="accept-no-sig"]').forEach((node) => {
        if (node instanceof HTMLElement && node.textContent?.trim() === 'Accept') {
          node.classList.add('accept-btn');
        }
      });
      container.querySelectorAll('[data-action="sign-accept"]').forEach((node) => {
        if (node instanceof HTMLElement) {
          node.textContent = 'Accept';
        }
      });
      container.querySelectorAll('input#signature-toggle').forEach((node) => node.remove());
      container.querySelectorAll('p').forEach((node) => {
        if ((node.textContent || '').includes('Please sign below to authorize this estimate and accept terms.')) {
          node.textContent = 'You can accept this estimate without signature.';
        }
      });
    }

    // Attach custom event listeners after any legacy elements are rewritten.
    const actionNodes = Array.from(container.querySelectorAll('[data-action]'));

    const handlers = {
      'pay-deposit': () => { if (!ctx.paymentSubmitting) ctx.handleStartPayment('deposit'); },
      'pay-full': () => { if (!ctx.paymentSubmitting) ctx.handleStartPayment('full'); },
      'sign-accept': async () => {
        if (ctx.submitting) return;
        ctx.setError?.('');
        const esignEnabled = ctx?.estimateEsignEnabled !== false;

        const headerWrapper = container.querySelector('.est-header-wrapper');
        const requireESignature = headerWrapper?.getAttribute('data-require-signature') === 'true';
        if (!esignEnabled) {
          const approved = await ctx.handleApprove('');
          if (approved) setHeaderToggle('header-sign-save-toggle', true);
          return;
        }
        const noSigCheckbox = container.querySelector('#header-no-sig-toggle');
        if (noSigCheckbox && noSigCheckbox.checked) {
          if (requireESignature) {
            ctx.setError?.('This estimate requires a signature before it can be accepted.');
            return;
          }
          const approved = await ctx.handleApprove('');
          if (approved) setHeaderToggle('header-sign-save-toggle', true);
          return;
        }

        const canvas = container.querySelector('#est-sig-canvas');
        if (canvas) {
          const dataUrl = extractCanvasSignaturePayload(canvas);
          if (!dataUrl) {
            ctx.setError?.('Please add your signature before accepting this estimate.');
            return;
          }
          const approved = await ctx.handleApprove(dataUrl);
          if (approved) setHeaderToggle('header-sign-save-toggle', true);
        } else {
          ctx.openSignaturePad();
        }
      },
      'accept-no-sig': async () => {
        if (ctx.submitting) return;
        const approved = await ctx.handleApprove('');
        if (approved) setHeaderToggle('header-sign-save-toggle', true);
      },
    };
    
    const attachedListeners = [];
    actionNodes.forEach(node => {
      const action = node.getAttribute('data-action');
      if (handlers[action]) {
        const handler = async (e) => {
          e.preventDefault();
          await handlers[action]();
        };
        node.addEventListener('click', handler);
        attachedListeners.push({ node, handler });
      }
    });

    return () => {
      attachedListeners.forEach(({ node, handler }) => {
        node.removeEventListener('click', handler);
      });
    };
  }, [containerId, renderedHtml, ctx]);

  return (
    <>
      <HtmlContainer html={renderedHtml} containerId={containerId} className={templateClassName} />
      {portalNodes.map((node) => {
        const block = String(node.getAttribute('data-portal-block') || '').trim().toLowerCase();
        if (!block) return null;
        if (block === 'signing' && ctx?.estimateEsignEnabled === false) return null;
        const portalAccepted = Boolean(ctx?.portal?.esigned) || ctx?.portal?.status === 'signed' || Boolean(ctx?.portal?.approved_at);
        const component =
          block === 'payment' ? (
            <EstimatePortalPaymentBlock ctx={ctx} portalAccepted={portalAccepted} />
          ) : block === 'signing' ? (
            <EstimatePortalSigningBlock ctx={ctx} />
          ) : block === 'inventory' ? (
            <EstimatePortalInventoryBlock ctx={ctx} />
          ) : debug ? (
            <div className="text-xs font-extrabold uppercase tracking-widest text-slate-500">Unknown block: {block}</div>
          ) : null;
        if (!component) return null;
        return createPortal(component, node);
      })}
    </>
  );
}


function EstimatePortalSigningBlock({ ctx, compact = false, className = '' }) {
  const portal = ctx?.portal || {};
  const isSigned = Boolean(portal?.esigned) || portal?.status === 'signed' || Boolean(portal?.approved_at);
  const esignEnabled = ctx?.estimateEsignEnabled !== false;
  const helperText = esignEnabled
    ? 'Customer signature required before acceptance.'
    : 'Customer acceptance only. No signature required.';

  const handleClick = () => {
    if (esignEnabled) {
      ctx.openSignaturePad();
      return;
    }
    ctx.handleApprove('');
  };

  return (
    <div id="signing" className={compact ? 'shrink-0' : 'space-y-3'}>
      {compact ? null : <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">{helperText}</div>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={isSigned || ctx.submitting}
          onClick={handleClick}
          className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-black uppercase tracking-widest shadow-sm disabled:opacity-60 ${
            className || 'bg-primary text-white hover:bg-primary/90'
          }`}
        >
          {ctx.submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSigned ? 'Accepted' : ctx.submitting ? 'Submitting…' : esignEnabled ? 'Accept & Sign' : 'Accept Estimate'}
        </button>
      </div>
    </div>
  );
}

function EstimatePortalPaymentBlock({ ctx, portalAccepted, compact = false, className = '' }) {
  const paymentCompleted = Boolean(ctx?.paymentCompleted);
  const depositAlreadyPaid = Boolean(ctx?.depositAlreadyPaid);
  const fullAlreadyPaid = Boolean(ctx?.fullAlreadyPaid);
  const depositAmount = Number(ctx?.totals?.deposit || 0);
  const fullAmount = Number(ctx?.computedFullAmount || ctx?.totals?.total || 0);

  if (!portalAccepted && !compact) {
    return (
      <div id="payment" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
        Accept the estimate first to unlock payment.
      </div>
    );
  }

  if (!portalAccepted && compact) return null;

  return (
    <div id="payment" className={compact ? 'shrink-0' : 'space-y-3'}>
      <button
        type="button"
        disabled={paymentCompleted || depositAlreadyPaid || fullAlreadyPaid || ctx.paymentSubmitting}
        onClick={() => ctx.handleStartPayment('deposit')}
        className={`inline-flex shrink-0 items-center justify-center rounded-full px-5 py-2.5 text-[13px] font-black uppercase tracking-widest shadow-sm disabled:opacity-60 ${className || 'border border-slate-200 bg-slate-50 text-slate-900 hover:border-primary/40'}`}
      >
        {ctx.paymentSubmitting ? `Starting ${ctx.payingOption || 'payment'}…` : depositAlreadyPaid || fullAlreadyPaid || paymentCompleted ? 'Deposit Paid' : `Pay Deposit ${depositAmount > 0 ? `(${ctx.money(depositAmount)})` : ''}`}
      </button>
      <button
        type="button"
        disabled={paymentCompleted || fullAlreadyPaid || ctx.paymentSubmitting}
        onClick={() => ctx.handleStartPayment('full')}
        className={`inline-flex shrink-0 items-center justify-center rounded-full px-5 py-2.5 text-[13px] font-black uppercase tracking-widest shadow-sm disabled:opacity-60 ${className || 'border border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-300'}`}
      >
        {ctx.paymentSubmitting ? `Starting ${ctx.payingOption || 'payment'}…` : fullAlreadyPaid || paymentCompleted ? 'Full Balance Paid' : `Pay Full Balance ${fullAmount > 0 ? `(${ctx.money(fullAmount)})` : ''}`}
      </button>
    </div>
  );
}

function EstimatePortalInventoryBlock({ ctx, compact = false, className = '' }) {
  const inventoryLink = String(ctx?.inventoryLink || '').trim();
  if (!inventoryLink) return null;

  return (
    <a
      href={inventoryLink}
      target="_blank"
      rel="noreferrer"
      aria-label="Open inventory portal"
      className={`inline-flex shrink-0 items-center justify-center rounded-full px-5 py-2.5 text-[13px] font-black uppercase tracking-widest shadow-sm transition ${className || 'border border-slate-200 bg-white text-slate-900 hover:border-primary/40 hover:text-primary'}`}
    >
      Inventory Portal
    </a>
  );
}
