import { createPortal } from 'react-dom';
import { getDocumentContent, getDocumentHtml } from './documentContent';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2, PlusCircle, Save, Trash2, Edit2, ArrowLeft, FileText, Copy, Search, Layout } from 'lucide-react';

import Card from '../../../shared/ui/Card';
import DocumentBuilderFullPage from './DocumentBuilderFullPage';
import {
  createDocumentTemplate,
  deleteDocumentTemplate,
  getDocumentTemplates,
  getDocumentVariableRegistry,
  getTemplateVariables,
  previewDocumentTemplate,
  updateDocumentTemplate,
  getBranches,
} from '../../../services/api';
import api from '../../../services/api';
import { getPortalBaseUrl } from '../../../shared/utils/portalBaseUrl';
import { filterAccessibleBranches } from '../../../shared/utils/branchScope';
import { useAuth } from '../../auth/context/AuthContext';
import { inlineDocumentBuilderStyles } from '../../../shared/utils/inlineDocumentStyles';

const EMPTY_TEMPLATE = {
  id: null,
  branch: null,
  name: '',
  template_type: 'contract',
  applies_to_entity: 'opportunity',
  scope_type: 'opportunity',
  applies_to_service_type: '',
  applies_to_binding_type: '',
  applies_to_opp_type: '',
  subject: '',
  version: '1.0',
  is_active: true,
  content: { docSettings: { format: 'Letter', margin: '40px' }, blocks: [] },
  html_content: '',
};

const PRESET_LAYOUTS = [
  {
    name: "Services Contract",
    subject: "Service Contract {{Contract.contract_number}}",
    html: `<!-- Services Contract -->
<div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#0f172a; padding: 20px;">
  <div style="border-radius:28px; padding:28px; background: linear-gradient(135deg, #eff6ff, #ffffff); border:1px solid #e2e8f0;">
    <div style="font-size:10px; font-weight:900; letter-spacing:.18em; text-transform:uppercase; color:#1d4ed8;">Service Contract</div>
    <div style="margin-top:8px; font-size:32px; font-weight:900; letter-spacing:-.03em;">{{Company.name}} — Contract {{Contract.contract_number}}</div>
    <div style="margin-top:10px; font-weight:700; color:#475569; line-height:1.5;">
      Customer: <strong>{{Customer.full_name}}</strong> • Email: <strong>{{Customer.email}}</strong> • Phone: <strong>{{Customer.primary_phone}}</strong>
    </div>
    <div style="margin-top:10px; font-weight:700; color:#475569;">Move date: <strong>{{Opportunity.move_date}}</strong></div>
  </div>

  <div style="margin-top:18px; display:flex; flex-wrap:wrap; gap:14px;">
    <div style="flex:1 1 280px; border-radius:24px; border:1px solid #e2e8f0; background:#fff; padding:18px;">
      <div style="font-size:10px; font-weight:900; letter-spacing:.18em; text-transform:uppercase; color:#64748b;">Origin</div>
      <div style="margin-top:8px; font-weight:800;">{{OriginAddress.full_address}}</div>
    </div>
    <div style="flex:1 1 280px; border-radius:24px; border:1px solid #e2e8f0; background:#fff; padding:18px;">
      <div style="font-size:10px; font-weight:900; letter-spacing:.18em; text-transform:uppercase; color:#64748b;">Destination</div>
      <div style="margin-top:8px; font-weight:800;">{{DestinationAddress.full_address}}</div>
    </div>
  </div>

  <div style="margin-top:18px; border-radius:24px; border:1px solid #e2e8f0; background:#fff; padding:18px;">
    <div style="font-size:12px; font-weight:900;">Terms & Conditions</div>
    <div style="margin-top:10px; color:#334155; font-weight:600; line-height:1.6;">
      This contract outlines the scope and pricing for your move. Final charges may change if actual move details differ.
    </div>
    <ul style="margin-top:12px; padding-left:18px; color:#334155; font-weight:600; line-height:1.6;">
      <li>Customer agrees to provide accurate move details.</li>
      <li>Company will perform services with reasonable care.</li>
      <li>Payment terms and cancellation policies apply.</li>
    </ul>
  </div>

  <div style="margin-top:18px; display:flex; flex-wrap:wrap; gap:14px;">
    <div style="flex:1 1 280px; border-radius:24px; border:1px solid #e2e8f0; background:#fff; padding:18px;">
      <div style="font-size:10px; font-weight:900; letter-spacing:.18em; text-transform:uppercase; color:#64748b;">Customer Signature</div>
      <div style="margin-top:10px;"><span data-sign="signature" data-key="sig_1"></span></div>
    </div>
    <div style="flex:1 1 280px; border-radius:24px; border:1px solid #e2e8f0; background:#fff; padding:18px;">
      <div style="font-size:10px; font-weight:900; letter-spacing:.18em; text-transform:uppercase; color:#64748b;">Date</div>
      <div style="margin-top:10px;"><span data-sign="date" data-key="date_1"></span></div>
    </div>
  </div>
</div>`
  },
  {
    name: "Time Sheet",
    subject: "Time Sheet — {{Customer.full_name}} ({{Opportunity.opportunity_number}})",
    html: `<!-- Time Sheet -->
<div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#0f172a; padding: 20px;">
  <div style="border-bottom: 2px solid #e2e8f0; padding-bottom: 12px;">
    <div style="font-size:24px; font-weight:900;">{{Company.name}} — Job Time Sheet</div>
    <div style="font-size:12px; color:#64748b; font-weight:700;">Job Number: {{Opportunity.opportunity_number}} · Customer: {{Customer.full_name}}</div>
  </div>
  
  <div style="margin-top:18px; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; background-color: #f8fafc;">
    <div style="font-size:14px; font-weight:900; color:#334155;">Work Time Verification</div>
    <div style="margin-top:12px; display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
      <div>
        <label style="font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase;">Start Time</label>
        <div style="margin-top:6px;"><span data-sign="text" data-key="start_time"></span></div>
      </div>
      <div>
        <label style="font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase;">End Time</label>
        <div style="margin-top:6px;"><span data-sign="text" data-key="end_time"></span></div>
      </div>
    </div>
  </div>

  <div style="margin-top:18px; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px;">
    <div style="font-size:12px; font-weight:800; color:#475569;">Sign-Off Verification</div>
    <div style="margin-top:12px; display:flex; flex-wrap:wrap; gap:16px;">
      <div style="flex:1; border: 1px solid #e2e8f0; padding:12px; border-radius:12px;">
        <div style="font-size:11px; font-weight:700; color:#64748b;">Customer Signature</div>
        <div style="margin-top:8px;"><span data-sign="signature" data-key="cust_sig"></span></div>
      </div>
      <div style="flex:1; border: 1px solid #e2e8f0; padding:12px; border-radius:12px;">
        <div style="font-size:11px; font-weight:700; color:#64748b;">Crew Leader Initials</div>
        <div style="margin-top:8px;"><span data-sign="initial" data-key="crew_leader_initial"></span></div>
      </div>
    </div>
  </div>
</div>`
  },
  {
    name: "Uniform Bill of Lading",
    subject: "Bill of Lading — {{Customer.full_name}} ({{Opportunity.opportunity_number}})",
    html: `<!-- Bill of Lading -->
<div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#0f172a; padding: 16px;">
  <div style="display:flex; justify-content:space-between; gap:18px; align-items:flex-start; padding-bottom:14px; border-bottom:2px solid #e2e8f0;">
    <div>
      <div style="font-size:22px; font-weight:900; letter-spacing:-.02em;">{{Company.name}}</div>
      <div style="margin-top:2px; font-size:11px; font-weight:750; color:#64748b;">Branch: {{Branch.name}}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:12px; font-weight:900;">Bill of Lading</div>
      <div style="font-size:11px; color:#475569;">Date: {{Opportunity.move_date}}</div>
    </div>
  </div>

  <div style="margin-top:14px; display:flex; flex-wrap:wrap; gap:12px;">
    <div style="flex:1 1 200px; border:1px solid #e2e8f0; border-radius:12px; padding:12px;">
      <div style="font-size:10px; font-weight:800; color:#2563eb; text-transform:uppercase;">Shipper Info</div>
      <div style="margin-top:6px; font-size:12px; font-weight:900;">{{Customer.full_name}}</div>
      <div style="font-size:11px; color:#475569;">{{Customer.primary_phone}} · {{Customer.email}}</div>
    </div>
    <div style="flex:1 1 200px; border:1px solid #e2e8f0; border-radius:12px; padding:12px;">
      <div style="font-size:10px; font-weight:800; color:#2563eb; text-transform:uppercase;">Route Address</div>
      <div style="margin-top:6px; font-size:11px; font-weight:850; color:#0f172a;">From: {{OriginAddress.full_address}}</div>
      <div style="margin-top:4px; font-size:11px; font-weight:850; color:#0f172a;">To: {{DestinationAddress.full_address}}</div>
    </div>
  </div>

  <div style="margin-top:16px; border:1px solid #e2e8f0; border-radius:12px; overflow-x:auto;">
    <table style="width:100%; border-collapse:collapse; font-size:11px;">
      <thead>
        <tr style="background:#f8fafc; border-bottom:1px solid #e2e8f0;">
          <th style="text-align:left; padding:10px;">Service item description</th>
          <th style="text-align:right; padding:10px;">Total cost</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:10px; font-weight:850;">Local Move Transportation & Labor</td>
          <td style="padding:10px; text-align:right; font-weight:900;">{{Estimate.grand_total}}</td>
        </tr>
        <tr>
          <td style="padding:10px; font-weight:900;">Total Balance Due</td>
          <td style="padding:10px; text-align:right; font-weight:900; color:#2563eb;">{{Estimate.grand_total}}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div style="margin-top:16px; border:1px solid #e2e8f0; border-radius:12px; padding:12px;">
    <div style="font-size:11px; font-weight:850; color:#0f172a;">Customer Authorization</div>
    <div style="margin-top:8px; font-size:10px; color:#475569; line-height:1.5;">
      I authorize the company to load, transport and deliver the shipment described above. Charges are due prior to unloading.
    </div>
    <div style="margin-top:10px; display:flex; flex-wrap:wrap; gap:12px;">
      <div style="flex:1.2 1 200px; border:1px solid #e2e8f0; border-radius:10px; padding:10px;">
        <span style="font-size:9px; color:#64748b; font-weight:700;">Customer signature</span>
        <div style="margin-top:6px;"><span data-sign="signature" data-key="sig_bol"></span></div>
      </div>
      <div style="flex:0.8 1 120px; border:1px solid #e2e8f0; border-radius:10px; padding:10px;">
        <span style="font-size:9px; color:#64748b; font-weight:700;">Date</span>
        <div style="margin-top:6px;"><span data-sign="date" data-key="date_bol"></span></div>
      </div>
    </div>
  </div>
</div>`
  },
  {
    name: "Credit Card Auth",
    subject: "Credit Card Authorization — {{Customer.full_name}} ({{Opportunity.sales_number}})",
    html: `<!-- DOC_SETTINGS:{"format":"Legal","margin":"0px"} -->
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    
    .cc-auth-body {
        font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    @media print {
        .cc-auth-body {
            background-color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .cc-auth-body .doc-container {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
        }
        .cc-auth-body .print-border-black {
            border-color: #000000 !important;
        }
        .cc-auth-body .bg-gray-50, .cc-auth-body .bg-gray-100 {
            background-color: transparent !important;
        }
    }
    .cc-auth-body span[data-sign] {
        display: inline-block;
        width: 100%;
        cursor: pointer;
        transition: background-color 0.2s;
    }
    .cc-auth-body span[data-sign]:hover {
        background-color: #f3f4f6;
    }
    .cc-auth-body span[data-sign="text"] {
        min-height: 2.5rem;
        border-bottom: 1px dashed #6b7280;
        background-color: #f9fafb;
        padding: 0.5rem;
        word-break: break-all;
    }
    .cc-auth-body span[data-sign="signature"],
    .cc-auth-body span[data-sign="date"] {
        min-height: 3rem;
        border-bottom: 2px solid #000000;
        background-color: transparent;
    }
    @media print {
        .cc-auth-body span[data-sign="text"] {
            background-color: transparent !important;
            border-bottom: 1px solid #000000 !important;
        }
    }
</style>
<div class="cc-auth-body">
    <div class="doc-container max-w-[850px] mx-auto bg-white px-5 py-8 md:p-12 shadow-lg border border-gray-300">
        <header class="flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-black pb-6 mb-8 gap-6">
            <div class="flex flex-col gap-4 w-full md:w-auto">
                <div class="flex items-center gap-4">
                    <img src="{{Branch.logo_url}}" alt="Logo" onerror="this.style.display='none';" class="max-h-12 md:max-h-16 max-w-[150px] object-contain hidden sm:block grayscale">
                    <div>
                        <div class="text-2xl font-black text-black uppercase tracking-tight">{{Branch.name}}</div>
                        <div class="text-xs font-bold text-gray-600 mt-1 uppercase tracking-wider">Payment Authorization</div>
                    </div>
                </div>
            </div>
            <div class="w-full md:w-auto text-left md:text-right">
                <h1 class="text-2xl md:text-3xl font-black text-black uppercase tracking-tighter mb-4">Credit Card Auth</h1>
                <div class="flex flex-col sm:flex-row gap-2 md:justify-end">
                    <div class="inline-block border-2 border-black p-2 bg-gray-50 text-left min-w-[120px]">
                        <div class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Move Date</div>
                        <div class="text-sm font-black text-black">{{Opportunity.move_date}}</div>
                    </div>
                    <div class="inline-block border-2 border-black p-2 bg-gray-50 text-left min-w-[140px]">
                        <div class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Job Number</div>
                        <div class="text-sm md:text-base font-mono font-black text-black">{{Opportunity.sales_number}}</div>
                    </div>
                </div>
            </div>
        </header>

        <div class="mb-10">
            <p class="text-sm text-gray-700 leading-relaxed font-medium mb-6">
                By signing this form, you give <strong class="text-black">{{Branch.name}}</strong> permission to debit your account for the amount indicated on, before, or after the stated contract date.
            </p>
            <div class="border-l-[4px] border-black bg-gray-50 p-4 md:p-6 print-border-black">
                <p class="text-sm leading-relaxed text-black font-semibold mb-2">
                    I, <span class="uppercase border-b border-gray-500 pb-0.5 mx-1 font-bold">{{Customer.full_name}}</span>, authorize to charge my credit card account indicated below for moving services under Job Number <span class="font-mono font-black bg-gray-200 px-1 border border-gray-300">{{Opportunity.sales_number}}</span>.
                </p>
                <p class="text-xs text-gray-600 font-medium mt-3">
                    This payment is for services as described in the accompanying move estimate/invoice #{{Opportunity.sales_number}}.
                </p>
            </div>
        </div>

        <div class="border-2 border-black p-5 md:p-8 bg-white mb-8 relative">
            <h2 class="text-sm font-black text-black mb-6 border-b-2 border-black pb-2 uppercase tracking-wide">
                Cardholder &amp; Payment Details
            </h2>
            <div class="space-y-6">
                <div>
                    <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Cardholder Name (As it appears on card)</label>
                    <span data-sign="text" data-key="cc_cardholder_name_preset"></span>
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Credit Card Number</label>
                    <span data-sign="text" data-key="cc_number_preset"></span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div>
                        <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Card Type (Visa/MC/Amex)</label>
                        <span data-sign="text" data-key="cc_card_type_preset"></span>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Expiration Date</label>
                        <span data-sign="text" data-key="cc_expiry_preset"></span>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">CVV Code</label>
                        <span data-sign="text" data-key="cc_cvv_preset"></span>
                    </div>
                </div>
                <div class="pt-6 mt-4 border-t border-gray-300">
                    <h3 class="text-sm font-black text-black mb-5 uppercase tracking-wide">Billing Address Information</h3>
                    <div class="space-y-6">
                        <div>
                            <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Street Address</label>
                            <span data-sign="text" data-key="cc_billing_address_preset"></span>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">City, State/Province</label>
                                <span data-sign="text" data-key="cc_city_state_preset"></span>
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Postal / ZIP Code</label>
                                <span data-sign="text" data-key="cc_postal_code_preset"></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="mb-8 relative mt-12 pt-8 border-t-2 border-black">
            <div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-4 text-[11px] font-black uppercase text-black tracking-widest border border-white">Formal Authorization</div>
            <p class="text-[12px] text-gray-800 leading-relaxed font-bold uppercase tracking-wide mb-8 bg-gray-50 p-5 border border-gray-300">
                According to the terms outlined above, S&amp;P TRADING INC, operating as {{Branch.name}}, is authorized to charge the credit card indicated in this authorization form. I agree to the terms as outlined within this document.
            </p>
            <div class="flex flex-col sm:flex-row gap-8 md:gap-12">
                <div class="flex-1 w-full">
                    <span data-sign="signature" data-key="sig_cc_auth_preset" class="block w-full"></span>
                    <div class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-2">Authorized Signature</div>
                </div>
                <div class="w-full sm:w-56">
                    <span data-sign="date" data-key="date_cc_auth_preset" class="block w-full"></span>
                    <div class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-2">Date</div>
                </div>
            </div>
        </div>
        <div class="text-center text-[10px] text-gray-500 mt-12 font-mono uppercase tracking-widest border-t border-gray-200 pt-4"><br></div>
    </div>
</div>`
  }
];

const SAMPLE_PREVIEW_DATA = {
  'Company.name': 'Antigravity Movers Inc.',
  'Company.email': 'info@antigravitymovers.com',
  'Company.primary_phone': '1-800-555-0199',
  'Company.website': 'www.antigravitymovers.com',
  'Customer.full_name': 'Sandesh Off',
  'Customer.email': 'sandesh@example.com',
  'Customer.primary_phone': '+1 (555) 014-2834',
  'Opportunity.opportunity_number': 'OPP-2026-88',
  'Opportunity.move_date': '2026-06-25',
  'Opportunity.sales_number': 'EST-8812',
  'Opportunity.binding_type': 'Hourly Rate',
  'Contract.contract_number': 'CON-99881',
  'Contract.portal_link': `${getPortalBaseUrl() || 'http://localhost:5173'}/portal/contracts/sample-token`,
  'OriginAddress.full_address': '123 Main Street, Suite 4B, Toronto, ON, M5V 2T6',
  'DestinationAddress.full_address': '789 Oak Avenue, North York, ON, M2N 5T8',
  'Estimate.hourly_rate': '$150.00',
  'Estimate.crew_size': '3',
  'Estimate.truck_count': '1',
  'Estimate.grand_total': '$1,250.00',
  'Estimate.deposit_amount': '$150.00',
};

const renderSamplePreviewHtml = (html) => {
  let rendered = String(html || '');
  rendered = rendered.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, key) => {
    const trimmed = String(key || '').trim();
    if (SAMPLE_PREVIEW_DATA[trimmed] !== undefined) {
      return SAMPLE_PREVIEW_DATA[trimmed];
    }
    return match;
  });

  rendered = rendered.replace(/<span\s+data-sign="([^"]+)"\s+data-key="([^"]+)"\s*>\s*<\/span>/gi, (match, kind, key) => {
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

  return rendered;
};

const templateContentToHtml = (template) => {
  const content = template?.content;
  if (content && typeof content === 'object' && Array.isArray(content.blocks)) {
    return inlineDocumentBuilderStyles(content.blocks.map((block) => String(block?.html || '')).filter(Boolean).join('\n'));
  }
  if (typeof content === 'string') return inlineDocumentBuilderStyles(content);
  return inlineDocumentBuilderStyles(template?.html_content || '');
};

const inlineTemplateContent = (content) => {
  if (content && typeof content === 'object' && Array.isArray(content.blocks)) {
    return { ...content, blocks: content.blocks.map((block) => ({ ...block, html: inlineDocumentBuilderStyles(block?.html || '') })) };
  }
  return inlineDocumentBuilderStyles(content || '');
};

const toastCls = (type) =>
  type === 'success'
    ? 'bg-primary-tint/30 text-primary'
    : 'bg-[#FDE8E8]/30 text-[#791F1F]';

const DOCUMENT_TEMPLATE_TYPE_RE = /^[a-z0-9][a-z0-9_-]*$/i;
const DOCUMENT_VERSION_RE = /^[a-z0-9][a-z0-9._-]*$/i;

const getApiErrorMessage = (err, fallback) => {
  const detail = err?.response?.data?.detail || err?.response?.data?.message || err?.message;
  return detail ? String(detail) : fallback;
};

const normalize = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return [];
};

const buildPlaceholder = (kind, key) => `<span data-sign="${kind}" data-key="${key}"></span>`;
const tokenWrap = (key) => `{{${String(key || '').trim()}}}`;

const safeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return [];
};

export default function DocumentTemplates({ branchId = null, builderRouteView = '', builderRouteItemId = null }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState('list'); // 'list' | 'edit'
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(EMPTY_TEMPLATE);
  const [variables, setVariables] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState(branchId ? String(branchId) : '');

  useEffect(() => {
    if (branchId !== null) {
      setBranchFilter(String(branchId));
    }
  }, [branchId]);
  const [branches, setBranches] = useState([]);

  const [registry, setRegistry] = useState([]);
  const [registryLoading, setRegistryLoading] = useState(false);
  const [registryError, setRegistryError] = useState('');
  const [registrySearch, setRegistrySearch] = useState('');
  const [previewOpportunityId, setPreviewOpportunityId] = useState('');
  const [previewPlannedSubJobId, setPreviewPlannedSubJobId] = useState('');
  const [previewJobId, setPreviewJobId] = useState('');
  const [previewMode, setPreviewMode] = useState('sample'); // sample | opportunity
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [isFullPreviewOpen, setIsFullPreviewOpen] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  const [opportunitySearchQuery, setOpportunitySearchQuery] = useState('');
  const [opportunitySearchResults, setOpportunitySearchResults] = useState([]);
  const [isSearchingOpps, setIsSearchingOpps] = useState(false);

  useEffect(() => {
    if (!opportunitySearchQuery || opportunitySearchQuery.length < 2) {
      setOpportunitySearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingOpps(true);
      try {
        const res = await api.get('/sales/opportunities/', { params: { search: opportunitySearchQuery, limit: 5 } });
        setOpportunitySearchResults(res?.data?.results || []);
      } catch (e) {
        // Ignore
      } finally {
        setIsSearchingOpps(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [opportunitySearchQuery]);

  const lastBuilderRouteRef = useRef('');
  const messageTimeoutRef = useRef(null);

  const notify = (type, text, duration = 3000) => {
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
      messageTimeoutRef.current = null;
    }
    setMessage({ type, text });
    if (duration) {
      messageTimeoutRef.current = setTimeout(() => {
        setMessage({ type: '', text: '' });
        messageTimeoutRef.current = null;
      }, duration);
    }
  };

  const templateTypes = useMemo(() => {
    const unique = Array.from(
      new Set((items || []).map((t) => String(t.template_type || '').trim()).filter(Boolean))
    ).sort();
    return unique;
  }, [items]);

  const filtered = useMemo(() => {
    const term = String(searchTerm || '').trim().toLowerCase();
    return (items || []).filter((t) => {
      const matchesSearch = !term || String(t.name || '').toLowerCase().includes(term);
      const matchesType = typeFilter === 'all' || String(t.template_type || '') === typeFilter;
      const matchesActive =
        activeFilter === 'all' ? true : Boolean(t.is_active) === (activeFilter === 'active');
      const matchesBranch = !branchFilter || String(t.branch || '') === String(branchFilter);
      return matchesSearch && matchesType && matchesActive && matchesBranch;
    });
  }, [items, searchTerm, typeFilter, activeFilter, branchFilter]);

  const loadTemplates = async () => {
    setIsLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const params = {};
      if (branchFilter) params.branch = branchFilter;
      const res = await getDocumentTemplates(params);
      const list = normalize(res?.data ?? res);
      setItems(list);
    } catch (err) {
      setItems([]);
      setMessage({ type: 'error', text: err?.response?.data?.detail || 'Unable to load templates.' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadVariables = async (templateId) => {
    if (!templateId) {
      setVariables([]);
      return;
    }
    try {
      const res = await getTemplateVariables({ template: templateId });
      setVariables(normalize(res?.data ?? res));
    } catch {
      setVariables([]);
    }
  };

  useEffect(() => {
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchFilter]);

  useEffect(() => {
    (async () => {
      try {
        const res = await getBranches();
        const rows = filterAccessibleBranches(user, normalize(res?.data ?? res));
        setBranches(rows);
        if (!branchFilter && rows.length) setBranchFilter(String(rows[0].id));
      } catch {
        setBranches([]);
      }
    })();
  }, [branchFilter, user]);

  useEffect(() => {
    if (!selectedId) return;
    const template = items.find((t) => t.id === selectedId);
    if (template) setDraft({ ...EMPTY_TEMPLATE, ...template });
    loadVariables(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const beginNewTemplate = () => {
    navigate('/settings/document-templates/new/builder');
  };

  useEffect(() => {
    if (builderRouteView !== 'builder') {
      lastBuilderRouteRef.current = '';
      if (isBuilderOpen) setIsBuilderOpen(false);
      return;
    }
    if (isLoading) return;

    const routeKey = `${builderRouteItemId || 'new'}:builder`;
    if (lastBuilderRouteRef.current === routeKey && isBuilderOpen) return;

    if (builderRouteItemId && builderRouteItemId !== 'new') {
      const template = items.find((row) => String(row.id) === String(builderRouteItemId));
      if (!template) {
        setMessage({ type: 'error', text: 'Document template not found.' });
        navigate('/settings/document-templates', { replace: true });
        return;
      }
      setSelectedId(template.id);
      setDraft({ ...EMPTY_TEMPLATE, ...template });
      loadVariables(template.id);
      setView('edit');
    } else {
      setSelectedId(null);
      setVariables([]);
      setDraft({
        ...EMPTY_TEMPLATE,
        template_type: typeFilter !== 'all' ? typeFilter : 'contract',
        branch: branchFilter ? Number(branchFilter) : null,
      });
      setView('edit');
    }

    setIsBuilderOpen(true);
    lastBuilderRouteRef.current = routeKey;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builderRouteView, builderRouteItemId, isLoading, items, navigate, isBuilderOpen]);

  const openDocumentBuilder = () => {
    const templateId = draft?.id || selectedId;
    navigate(templateId ? `/settings/document-templates/${templateId}/builder` : '/settings/document-templates/builder');
  };

  const closeDocumentBuilder = () => {
    setIsBuilderOpen(false);
    if (builderRouteView === 'builder') {
      navigate('/settings/document-templates');
    }
  };


  const duplicateTemplate = async () => {
    if (!draft.id) return;
    const newDraft = { ...draft };
    delete newDraft.id;
    newDraft.name = `Copy of ${newDraft.name}`;
    setDraft(newDraft);
    setMessage({ type: 'success', text: 'Template duplicated. Click Save to create it.' });
  };

  const saveTemplate = async () => {
    const payload = {
      name: String(draft.name || '').trim(),
      template_type: String(draft.template_type || '').trim(),
      applies_to_entity: String(draft.applies_to_entity || '').trim() || 'opportunity',
      scope_type: String(draft.scope_type || draft.applies_to_entity || '').trim() || 'opportunity',
      applies_to_service_type: String(draft.applies_to_service_type || '').trim(),
      applies_to_binding_type: String(draft.applies_to_binding_type || '').trim(),
      applies_to_opp_type: String(draft.applies_to_opp_type || '').trim(),
      subject: String(draft.subject || '').trim(),
      version: String(draft.version || '').trim() || '1.0',
      branch: draft.branch ? Number(draft.branch) : null,
      is_active: Boolean(draft.is_active),
      content: inlineTemplateContent(draft.content ?? String(draft.html_content || '')),
      html_content: String(draft.html_content || ''),
    };
    if (!payload.name) {
      notify('error', 'Document template name is required.');
      return null;
    }
    if (!payload.template_type) {
      notify('error', 'Document template type is required.');
      return null;
    }
    if (!DOCUMENT_TEMPLATE_TYPE_RE.test(payload.template_type)) {
      notify('error', 'Document template type can use letters, numbers, dash, or underscore only.');
      return null;
    }
    if (!payload.branch) {
      notify('error', 'Choose a branch before saving this document template.');
      return null;
    }
    if (!DOCUMENT_VERSION_RE.test(payload.version)) {
      notify('error', 'Version can use letters, numbers, dot, dash, or underscore only.');
      return null;
    }

    setIsSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const wasExisting = Boolean(draft.id);
      const res = draft.id ? await updateDocumentTemplate(draft.id, payload) : await createDocumentTemplate(payload);
      const saved = res?.data ?? res;
      setDraft((current) => ({ ...current, id: saved?.id || current.id }));
      setItems((current) => {
        const row = { ...draft, ...payload, ...saved };
        return current.some((item) => item.id === row.id)
          ? current.map((item) => item.id === row.id ? row : item)
          : [...current, row];
      });
      notify('success', wasExisting ? 'Document template updated.' : 'Document template created.');
      return saved;
    } catch (err) {
      notify('error', getApiErrorMessage(err, 'Unable to save template.'));
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const removeTemplate = async (id, name) => {
    const ok = window.confirm(`Delete template "${name}"?`);
    if (!ok) return;
    setIsDeleting(true);
    setMessage({ type: '', text: '' });
    try {
      await deleteDocumentTemplate(id);
      await loadTemplates();
      if (selectedId === id) {
        setView('list');
        setSelectedId(null);
      }
      notify('success', 'Document template deleted.');
    } catch (err) {
      notify('error', getApiErrorMessage(err, 'Unable to delete template.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const appendToHtml = (snippet) => {
    const next = `${draft.html_content || ''}${draft.html_content ? '\n' : ''}${snippet}`;
    setDraft((prev) => ({ ...prev, html_content: next }));
  };

  const insertToken = (tokenKey) => {
    const key = String(tokenKey || '').trim();
    if (!key) return;
    appendToHtml(tokenWrap(key));
  };

  const quickTokens = useMemo(() => {
    const fromVars = (variables || [])
      .map((v) => String(v.token_key || '').trim())
      .filter(Boolean);
    const defaults = [
      'Customer.full_name',
      'Customer.email',
      'Customer.primary_phone',
      'Opportunity.opportunity_number',
      'Opportunity.move_date',
      'Company.name',
      'Contract.contract_number',
      'Contract.portal_link',
    ];
    return Array.from(new Set([...fromVars, ...defaults])).slice(0, 16);
  }, [variables]);

  const loadRegistry = async () => {
    setRegistryLoading(true);
    setRegistryError('');
    try {
      const res = await getDocumentVariableRegistry();
      const groups = safeList(res?.data?.groups ?? res?.data ?? res);
      setRegistry(groups);
    } catch (err) {
      setRegistry([]);
      setRegistryError(err?.response?.data?.detail || 'Unable to load variable registry.');
    } finally {
      setRegistryLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'edit') {
      loadRegistry();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const filteredRegistry = useMemo(() => {
    const term = String(registrySearch || '').trim().toLowerCase();
    if (!term) return registry;
    return (registry || [])
      .map((group) => {
        const fields = (group?.fields || []).filter((f) =>
          String(f?.key || '').toLowerCase().includes(term)
        );
        if (!fields.length) return null;
        return { ...group, fields };
      })
      .filter(Boolean);
  }, [registry, registrySearch]);

  const effectiveScopeType = useMemo(
    () => String(draft.scope_type || draft.applies_to_entity || 'opportunity').trim() || 'opportunity',
    [draft.scope_type, draft.applies_to_entity]
  );

  const visibleScopeType = useMemo(
    () => (effectiveScopeType === 'planned_sub_job' ? 'job' : effectiveScopeType),
    [effectiveScopeType]
  );

  const runPreview = async () => {
    let templateIdToPreview = draft?.id;
    setIsFullPreviewOpen(true);
    setPreviewHtml(renderSamplePreviewHtml(templateContentToHtml(draft)));
    const saved = await saveTemplate();
    if (saved && saved.id) {
      templateIdToPreview = saved.id;
    } else {
      setPreviewLoading(false);
      return;
    }
    const oppId = String(previewOpportunityId || opportunitySearchQuery || '').trim();
    const plannedSubJobId = String(previewPlannedSubJobId || '').trim();
    const jobId = String(previewJobId || '').trim();
    if (previewMode === 'opportunity' && !oppId) {
      setMessage({ type: 'error', text: 'Enter an Opportunity ID to preview with real data.' });
      return;
    }
    if (previewMode === 'opportunity' && effectiveScopeType === 'planned_sub_job' && !plannedSubJobId) {
      setMessage({ type: 'error', text: 'Enter a Planned Sub-Job ID for planned sub-job preview.' });
      return;
    }
    if (previewMode === 'opportunity' && effectiveScopeType === 'job' && !jobId) {
      setMessage({ type: 'error', text: 'Enter a Job ID for job-scoped preview.' });
      return;
    }
    setPreviewLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const payload = { 
        portal_base_url: getPortalBaseUrl(),
        branch_id: draft.branch 
      };
      if (previewMode === 'opportunity') payload.opportunity = oppId;
      if (previewMode === 'opportunity' && effectiveScopeType === 'planned_sub_job') {
        payload.planned_sub_job = plannedSubJobId;
      }
      if (previewMode === 'opportunity' && effectiveScopeType === 'job') {
        payload.job = jobId;
      }
      const res = await previewDocumentTemplate(templateIdToPreview, payload);
      const data = res?.data ?? res;
      const htmlStr = String(data?.rendered_html || '');
      setPreviewHtml(htmlStr);
      
      const missingVarsMatch = htmlStr.match(/\\{\\{[a-zA-Z0-9_.]+\\}\\}/g);
      if (missingVarsMatch && missingVarsMatch.length > 0) {
        const uniqueVars = Array.from(new Set(missingVarsMatch));
        setMessage({ type: 'error', text: `Warning: ${uniqueVars.length} unresolved variable(s) found in preview: ${uniqueVars.slice(0, 3).join(', ')}${uniqueVars.length > 3 ? '...' : ''}` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.detail || 'Unable to preview template.' });
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {message.text ? (
        <div
          className={`fixed right-4 top-4 z-[70000] flex max-w-[min(420px,calc(100vw-2rem))] items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold shadow-2xl ${toastCls(message.type)}`}
        >
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      ) : null}

      <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Document Templates</h2>
                <p className="text-sm text-slate-500 mt-1">Manage standard HTML document templates for contracts, invoices, and more.</p>
              </div>
              <button
                type="button"
                onClick={beginNewTemplate}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm hover:bg-blue-700 transition"
              >
                <PlusCircle size={18} /> New Template
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search templates..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All Types</option>
                {templateTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              {!branchId && (
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              )}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-blue-500" size={24} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                <FileText className="mx-auto mb-3 opacity-50" size={32} />
                <p className="font-medium text-sm">No templates found matching your criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-xs font-bold">
                    <tr>
                      <th className="px-6 py-4">Template Name</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Version</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-800">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
                              <FileText size={16} />
                            </div>
                            <div>
                              <div>{t.name}</div>
                              <div className="text-[11px] font-normal text-slate-500">{t.subject || 'No subject'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                            {t.template_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-600">{t.version || '-'}</td>
                        <td className="px-6 py-4">
                          {t.is_active ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => navigate(`/settings/document-templates/${t.id}/builder`)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
                            title="Edit Template"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => removeTemplate(t.id, t.name)}
                            disabled={isDeleting}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
                            title="Delete Template"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

      {/* Full Page Builder Overlay */}
      {isBuilderOpen ? (
        <DocumentBuilderFullPage
          draft={draft}
          onChange={(newDraft) => setDraft(newDraft)}
          onSave={async () => {
            const saved = await saveTemplate();
            if (saved?.id) {
              navigate(`/settings/document-templates/${saved.id}/builder`, { replace: true });
            }
            return saved;
          }}
          onBack={closeDocumentBuilder}
          onPreview={() => setIsFullPreviewOpen(true)}
          onRunLivePreview={runPreview}
          previewMode={previewMode}
          onPreviewModeChange={setPreviewMode}
          previewOpportunityId={previewOpportunityId}
          onPreviewOpportunityIdChange={setPreviewOpportunityId}
          previewPlannedSubJobId={previewPlannedSubJobId}
          onPreviewPlannedSubJobIdChange={setPreviewPlannedSubJobId}
          previewJobId={previewJobId}
          onPreviewJobIdChange={setPreviewJobId}
          scopeType={visibleScopeType}
          variables={variables}
          registry={registry}
          branches={branches}
        />
      ) : null}

      {/* Fullscreen Overlay Preview Modal */}
      {isFullPreviewOpen ? createPortal(
        <div className="fixed inset-0 z-[80000] flex flex-col bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-300">
          <div className="flex-1 flex flex-col bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200">
            {/* Header */}
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

            {/* Content Body */}
            <div className="flex-1 bg-slate-100/50 p-6 overflow-auto flex justify-center">
              <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden flex flex-col">
                {previewLoading ? <div role="status" className="p-12 text-center">Loading preview...</div> : (previewMode === 'sample' || previewHtml) ? (
                  <iframe
                    title="Fullscreen Document Preview"
                    className="w-full flex-1 bg-white border-0"
                    srcDoc={previewMode === 'sample' ? renderSamplePreviewHtml(templateContentToHtml(draft)) : previewHtml}
                    sandbox=""
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                    <div className="text-xl font-extrabold text-slate-400 mb-2">No Opportunity Data Loaded</div>
                    <div className="text-sm font-semibold text-slate-500">
                      Close this preview, enter a valid Opportunity ID, and click "Run" to fetch live CRM data.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      , document.body) : null}

    </div>
  );
}
