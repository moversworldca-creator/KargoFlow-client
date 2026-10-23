import { getTenantTemplateKind, getTenantTemplateMode, getTenantTemplateRoute } from '../utils/templateBoundary';
import { createPortal } from 'react-dom';
import { getDocumentContent, getDocumentHtml } from './documentContent';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2, PlusCircle, Save, Trash2, Edit2, ArrowLeft, FileText, Copy, Search, Layout, CreditCard, Receipt, FileSignature, Truck, Mail, MessageSquare, ChevronDown } from 'lucide-react';

import Card from '../../../shared/ui/Card';
import UnifiedTemplateBuilder from './UnifiedTemplateBuilder/UnifiedTemplateBuilder';
import CreateUniversalDocumentModal from './modals/CreateUniversalDocumentModal';
import {
  createDocumentTemplate,
  deleteDocumentTemplate,
  getDocumentTemplates,
  getDocumentVariableRegistry,
  getTemplateVariables,
  previewDocumentTemplate,
  updateDocumentTemplate,
  getEstimatePortalTemplates,
  createEstimatePortalTemplate,
  updateEstimatePortalTemplate,
  deactivateEstimatePortalTemplate,
  duplicateEstimatePortalTemplate,
  getCommunicationTemplates,
  createCommunicationTemplate,
  updateCommunicationTemplate,
  deleteCommunicationTemplate,
  getBranches,
  getBuilderTemplate,
  getBuilderTemplateDraft,
  startBuilderTemplateDraft,
  activateDocumentTemplate,
  deactivateDocumentTemplate,
  duplicateBuilderTemplate,
} from '../../../services/api';
import { fromBackendDocument } from './UnifiedTemplateBuilder/core/documentAdapter';
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
    subject: "Service Contract {{opportunity.number}}",
    html: `<!-- Services Contract -->
<div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#0f172a; padding: 20px;">
  <div style="border-radius:28px; padding:28px; background: linear-gradient(135deg, #eff6ff, #ffffff); border:1px solid #e2e8f0;">
    <div style="font-size:10px; font-weight:900; letter-spacing:.18em; text-transform:uppercase; color:#1d4ed8;">Service Contract</div>
    <div style="margin-top:8px; font-size:32px; font-weight:900; letter-spacing:-.03em;">{{company.name}} — Opportunity {{opportunity.number}}</div>
    <div style="margin-top:10px; font-weight:700; color:#475569; line-height:1.5;">
      Customer: <strong>{{customer.full_name}}</strong> • Email: <strong>{{customer.email}}</strong> • Phone: <strong>{{customer.phone}}</strong>
    </div>
    <div style="margin-top:10px; font-weight:700; color:#475569;">Move date: <strong>{{move.date}}</strong></div>
  </div>

  <div style="margin-top:18px; display:flex; flex-wrap:wrap; gap:14px;">
    <div style="flex:1 1 280px; border-radius:24px; border:1px solid #e2e8f0; background:#fff; padding:18px;">
      <div style="font-size:10px; font-weight:900; letter-spacing:.18em; text-transform:uppercase; color:#64748b;">Origin</div>
      <div style="margin-top:8px; font-weight:800;">{{move.origin_address}}</div>
    </div>
    <div style="flex:1 1 280px; border-radius:24px; border:1px solid #e2e8f0; background:#fff; padding:18px;">
      <div style="font-size:10px; font-weight:900; letter-spacing:.18em; text-transform:uppercase; color:#64748b;">Destination</div>
      <div style="margin-top:8px; font-weight:800;">{{move.destination_address}}</div>
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
    name: "Payment Invoice",
    subject: "Invoice {{Opportunity.sales_number}} — {{Customer.full_name}}",
    html: `<!-- Payment Invoice -->
<div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#0f172a; padding: 20px;">
  <div style="display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:16px; border-bottom:2px solid #e2e8f0;">
    <div>
      <div style="font-size:26px; font-weight:900; letter-spacing:-0.03em; color:#1e293b;">{{Company.name}}</div>
      <div style="font-size:11px; font-weight:600; color:#64748b; margin-top:4px;">{{Company.primary_phone}} • {{Company.email}}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:20px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:0.05em;">INVOICE</div>
      <div style="font-size:12px; font-weight:700; color:#2563eb; margin-top:2px;">#{{Opportunity.sales_number}}</div>
      <div style="font-size:11px; color:#64748b; margin-top:2px;">Date: {{Opportunity.move_date}}</div>
    </div>
  </div>

  <div style="margin-top:16px; display:flex; gap:16px; flex-wrap:wrap;">
    <div style="flex:1; min-width:220px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:14px;">
      <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:#64748b; letter-spacing:0.05em;">Billed To</div>
      <div style="margin-top:4px; font-size:13px; font-weight:800; color:#0f172a;">{{Customer.full_name}}</div>
      <div style="font-size:11px; color:#475569; margin-top:2px;">{{Customer.primary_phone}} • {{Customer.email}}</div>
      <div style="font-size:11px; color:#475569; margin-top:2px;">{{OriginAddress.full_address}}</div>
    </div>
    <div style="flex:1; min-width:220px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:14px;">
      <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:#64748b; letter-spacing:0.05em;">Move Details</div>
      <div style="font-size:11px; color:#334155; margin-top:4px;"><strong>From:</strong> {{OriginAddress.full_address}}</div>
      <div style="font-size:11px; color:#334155; margin-top:2px;"><strong>To:</strong> {{DestinationAddress.full_address}}</div>
      <div style="font-size:11px; color:#334155; margin-top:2px;"><strong>Move Date:</strong> {{Opportunity.move_date}}</div>
    </div>
  </div>

  <div style="margin-top:20px; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden;">
    <table style="width:100%; border-collapse:collapse; font-size:12px;">
      <thead>
        <tr style="background:#f1f5f9; color:#475569; text-transform:uppercase; font-size:10px; font-weight:800;">
          <th style="padding:10px 14px; text-align:left;">Item / Description</th>
          <th style="padding:10px 14px; text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:12px 14px; font-weight:600; color:#0f172a;">Moving & Transportation Services</td>
          <td style="padding:12px 14px; text-align:right; font-weight:700; color:#0f172a;">{{Estimate.grand_total}}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr style="background:#f8fafc; border-top:2px solid #e2e8f0;">
          <td style="padding:12px 14px; font-weight:900; font-size:13px; text-align:right;">Total Balance Due:</td>
          <td style="padding:12px 14px; text-align:right; font-weight:900; font-size:14px; color:#2563eb;">{{Estimate.grand_total}}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <div style="margin-top:20px; padding:14px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:12px; font-size:11px; color:#1e40af; line-height:1.5;">
    <strong>Payment Notice:</strong> All invoices are payable upon completion of delivery. Electronic payments and credit cards are processed securely.
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

export default function DocumentTemplates({ branchId = null, builderRouteView = '', builderRouteItemId = null, onOpenChooser = null, basePath = '', templateKind = 'document' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  let location = { pathname: '' };
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    location = useLocation();
  } catch {
    location = { pathname: typeof window !== 'undefined' ? window.location?.pathname || '' : '' };
  }
  const effectiveBasePath = basePath || (
    location.pathname.startsWith('/documents')
      ? '/documents/document-templates'
      : location.pathname.startsWith('/settings/documents')
      ? '/settings/documents/document-templates'
      : '/settings/document-templates'
  );
  const estimateBasePath = effectiveBasePath.startsWith('/documents')
    ? '/documents/estimate-portal-templates'
    : effectiveBasePath.startsWith('/settings/documents')
    ? '/settings/documents/estimate-portal-templates'
    : '/settings/estimate-portal-templates';
  const commBasePath = effectiveBasePath.startsWith('/documents')
    ? '/documents/communication-templates'
    : effectiveBasePath.startsWith('/settings/documents')
    ? '/settings/documents/communication-templates'
    : '/settings/documents/communication-templates';
  const [view, setView] = useState('list'); // 'list' | 'edit'
  const [items, setItems] = useState([]);
  const [legalItems, setLegalItems] = useState([]);
  const [estimateItems, setEstimateItems] = useState([]);
  const [commItems, setCommItems] = useState([]);
  const [activeBuilderMeta, setActiveBuilderMeta] = useState(null);
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
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const pendingNewTypeRef = useRef(null);

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
        const res = await api.get('/tenant/opportunities/', { params: { search: opportunitySearchQuery, page_size: 5 } });
        const list = res?.data?.results || (Array.isArray(res?.data) ? res.data : []);
        setOpportunitySearchResults(list);
      } catch {
        try {
          const fallback = await api.get('/sales/opportunities/', { params: { search: opportunitySearchQuery, limit: 5 } });
          setOpportunitySearchResults(fallback?.data?.results || []);
        } catch {
          setOpportunitySearchResults([]);
        }
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
      new Set((items || []).map((t) => String(t.template_type || t.unified_type || '').trim()).filter(Boolean))
    ).sort();
    return unique;
  }, [items]);

  const filtered = useMemo(() => {
    const term = String(searchTerm || '').trim().toLowerCase();
    return (items || []).filter((t) => {
      const matchesSearch = !term || String(t.name || '').toLowerCase().includes(term);
      const docType = String(t.template_type || t.unified_type || '').toLowerCase();
      let matchesType = true;
      if (typeFilter === 'contract') {
        matchesType = (t.source_type === 'legal' || !t.source_type) && (docType === 'contract' || docType === 'agreement' || (!docType.includes('bol') && !docType.includes('invoice') && !docType.includes('credit')));
      } else if (typeFilter === 'bol') {
        matchesType = (t.source_type === 'legal' || !t.source_type) && (docType === 'bol' || docType.includes('lading') || docType.includes('loc'));
      } else if (typeFilter === 'invoice') {
        matchesType = (t.source_type === 'legal' || !t.source_type) && (docType === 'invoice' || docType.includes('receipt') || docType.includes('bill'));
      } else if (typeFilter === 'credit_card_authorization') {
        matchesType = (t.source_type === 'legal' || !t.source_type) && (docType === 'credit_card_authorization' || docType === 'cc_auth' || docType.includes('card') || docType.includes('auth'));
      } else if (typeFilter === 'estimate') {
        matchesType = t.source_type === 'estimate' || docType === 'estimate';
      } else if (typeFilter === 'email') {
        matchesType = (t.source_type === 'comm' && String(t.channel || '').toLowerCase() === 'email') || docType === 'email';
      } else if (typeFilter === 'sms') {
        matchesType = (t.source_type === 'comm' && String(t.channel || '').toLowerCase() === 'sms') || docType === 'sms';
      } else if (typeFilter !== 'all') {
        matchesType = docType === typeFilter;
      }
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

      const response = await getDocumentTemplates({ ...params, kind: templateKind });
      const rows = normalize(response?.data ?? response).filter((item) => getTenantTemplateKind(item) === templateKind);
      setLegalItems(rows);
      setEstimateItems([]);
      setCommItems([]);
      setItems(rows.map((t) => ({
        ...t,
        source_type: 'legal',
        unified_type: t.template_type,
        display_type: templateKind === 'invoice' ? 'Invoice' : t.template_type === 'bol' ? 'BOL' : t.template_type === 'credit_card_authorization' ? 'CC Auth' : 'Contract',
        applies_to_label: templateKind === 'invoice' ? 'Invoice' : t.scope_type === 'job' ? 'Job' : 'Opportunity',
      })));

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
  }, [branchFilter, templateKind]);

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

  const beginNewTemplate = (targetType) => {
    pendingNewTypeRef.current = targetType || (typeFilter !== 'all' ? typeFilter : 'contract');
    navigate(`${effectiveBasePath}/new/builder`);
  };

  useEffect(() => {
    let isCancelled = false;

    if (builderRouteView !== 'builder') {
      lastBuilderRouteRef.current = '';
      if (isBuilderOpen) setIsBuilderOpen(false);
      return;
    }

    const routeKey = `${builderRouteItemId || 'new'}:builder`;
    if (lastBuilderRouteRef.current === routeKey && isBuilderOpen) return;

    const loadBuilderRoute = async () => {
      if (builderRouteItemId && builderRouteItemId !== 'new') {
        let template = items.find((row) => String(row.id) === String(builderRouteItemId));
        if (!template) {
          try {
            const res = await getBuilderTemplate(builderRouteItemId);
            const raw = res?.data ?? res;
            if (raw?.id && !isCancelled) {
              template = {
                ...raw,
                template_type: raw.subtype || raw.template_type,
                scope_type: raw.kind === 'invoice' ? 'invoice' : (raw.subtype === 'bol' ? 'job' : 'opportunity'),
                branch: raw.branch_id,
                is_active: raw.state === 'active' || raw.is_active,
              };
              setItems((prev) => (prev.some((p) => p.id === template.id) ? prev : [template, ...prev]));
            }
          } catch {
            // Template not found on server
          }
        }

        if (!template) {
          if (isLoading) return;
          if (!isCancelled) {
            setMessage({ type: 'error', text: 'Document template not found.' });
            navigate(effectiveBasePath, { replace: true });
          }
          return;
        }

        if (isCancelled) return;

        const kind = getTenantTemplateKind(template);
        if (kind !== templateKind) {
          navigate(getTenantTemplateRoute(effectiveBasePath, kind, template.id), { replace: true });
          return;
        }
        const mode = getTenantTemplateMode(template);
        const group = 'legal';
        setActiveBuilderMeta({ group, mode });

        let hydratedContent = template.content || null;
        let lockVersion = template.lock_version || 1;

        try {
          const draftRes = await getBuilderTemplateDraft(template.id);
          const draftData = draftRes?.data ?? draftRes;
          if (draftData?.document?.sections) {
            hydratedContent = fromBackendDocument(draftData.document, { name: template.name, mode });
            lockVersion = draftData.revision?.lock_version || draftData.lock_version || 1;
          }
        } catch {
          // Fall back to template summary content if draft cannot be fetched
        }

        if (isCancelled) return;

        setSelectedId(template.id);
        setDraft({
          ...EMPTY_TEMPLATE,
          ...template,
          ...(hydratedContent ? { content: hydratedContent } : {}),
          lock_version: lockVersion,
        });
        loadVariables(template.id);
        setView('edit');
      } else {
        const chosenType = templateKind === 'invoice' ? 'invoice' : pendingNewTypeRef.current || (typeFilter !== 'all' ? typeFilter : 'contract');
        pendingNewTypeRef.current = null;
        const preset = PRESET_LAYOUTS.find((p) => {
          if (chosenType === 'contract') return p.name === 'Services Contract';
          if (chosenType === 'bol') return p.name === 'Uniform Bill of Lading';
          if (chosenType === 'invoice') return p.name === 'Payment Invoice';
          if (chosenType === 'credit_card_authorization') return p.name === 'Credit Card Auth';
          return false;
        });
        setSelectedId(null);
        setVariables([]);
        setDraft({
          ...EMPTY_TEMPLATE,
          template_type: chosenType,
          name: `New ${chosenType === 'bol' ? 'Bill of Lading (LOC)' : chosenType === 'invoice' ? 'Payment Invoice' : chosenType === 'credit_card_authorization' ? 'Credit Card Authorization' : 'Services Contract'}`,
          subject: preset?.subject || '',
          html_content: preset?.html || '',
          branch: branchFilter ? Number(branchFilter) : branches[0]?.id ? Number(branches[0].id) : null,
        });
        setView('edit');
      }

      setIsBuilderOpen(true);
      lastBuilderRouteRef.current = routeKey;
    };

    loadBuilderRoute().catch((error) => { if (!isCancelled) setMessage({ type: 'error', text: error.message }); });

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builderRouteView, builderRouteItemId, isLoading, items, navigate, isBuilderOpen, effectiveBasePath, templateKind]);

  const openDocumentBuilder = () => {
    const templateId = draft?.id || selectedId;
    navigate(templateId ? `${effectiveBasePath}/${templateId}/builder` : `${effectiveBasePath}/builder`);
  };

  const closeDocumentBuilder = () => {
    setIsBuilderOpen(false);
    if (builderRouteView === 'builder') {
      navigate(effectiveBasePath);
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

  const handleEditRow = (template) => {
    navigate(getTenantTemplateRoute(effectiveBasePath, getTenantTemplateKind(template), template.id));
  };

  const getBuilderMode = () => activeBuilderMeta?.mode || (templateKind === 'invoice' ? 'invoice' : getTenantTemplateMode(draft));

  const handleToggleActive = async (template) => {
    const nextState = !template.is_active;
    try {
      setIsLoading(true);
      if (template.source_type === 'estimate') {
        if (!nextState && deactivateEstimatePortalTemplate) {
          await deactivateEstimatePortalTemplate(template.id);
        }
      } else {
        if (nextState) {
          await activateDocumentTemplate(template.id);
        } else {
          await deactivateDocumentTemplate(template.id);
        }
      }
      setItems((prev) =>
        prev.map((it) => (it.id === template.id ? { ...it, is_active: nextState } : it))
      );
      notify('success', `Template "${template.name}" ${nextState ? 'activated' : 'deactivated'}.`);
    } catch (err) {
      notify('error', getApiErrorMessage(err, 'Failed to update template status.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicateRow = async (template) => {
    try {
      setIsLoading(true);

      if (template.source_type === 'estimate') {
        let res;
        try {
          res = await duplicateEstimatePortalTemplate(template.id);
        } catch {
          res = await createEstimatePortalTemplate({
            name: `Copy of ${template.name}`,
            subtype: template.subtype || template.template_type || 'binding',
            template_type: template.subtype || template.template_type || 'binding',
            applies_to_entity: 'opportunity',
            branch: template.branch ? Number(template.branch) : (branches[0]?.id ? Number(branches[0].id) : null),
            is_active: true,
            html_content: template.html_content || '',
          });
        }
        await loadTemplates();
        notify('success', `Duplicated "${template.name}".`);
        return;
      }

      if (template.source_type === 'comm') {
        const payload = {
          name: `Copy of ${template.name}`,
          channel: template.channel,
          template_key: `${template.template_key || 'template'}_copy_${Date.now().toString(36).slice(-4)}`,
          subject: template.subject || '',
          body: template.body || '',
          body_html: template.body_html || '',
          branch: template.branch ? Number(template.branch) : (branches[0]?.id ? Number(branches[0].id) : null),
          is_active: true,
        };
        await createCommunicationTemplate(payload);
        await loadTemplates();
        notify('success', `Duplicated "${template.name}".`);
        return;
      }

      // Legal template duplicate (native backend duplicate with fallback for test mocks)
      try {
        const res = await duplicateBuilderTemplate(template.id, {
          name: `Copy of ${template.name}`,
        });
        const saved = res?.data ?? res;
        await loadTemplates();
        notify('success', `Duplicated "${template.name}".`);
        return;
      } catch {
        const payload = {
          name: `Copy of ${template.name}`,
          template_type: template.template_type,
          applies_to_entity: template.applies_to_entity || 'opportunity',
          kind: getTenantTemplateKind(template),
          subtype: template.subtype,
          scope_type: template.scope_type || template.applies_to_entity || 'opportunity',
          applies_to_service_type: template.applies_to_service_type || '',
          applies_to_binding_type: template.applies_to_binding_type || '',
          applies_to_opp_type: template.applies_to_opp_type || '',
          subject: template.subject || '',
          version: template.version || '1.0',
          branch: template.branch ? Number(template.branch) : (branches[0]?.id ? Number(branches[0].id) : null),
          content: template.content
            ? typeof template.content === 'object'
              ? JSON.parse(JSON.stringify(template.content))
              : template.content
            : '',
        };
        const res = await createDocumentTemplate(payload);
        const saved = res?.data ?? res;
        setItems((prev) => [saved, ...prev]);
        notify('success', `Duplicated "${template.name}".`);
      }
    } catch (err) {
      notify('error', getApiErrorMessage(err, 'Unable to duplicate template.'));
    } finally {
      setIsLoading(false);
    }
  };

  const saveTemplate = async () => {
    if (activeBuilderMeta?.group === 'estimate' || draft?.source_type === 'estimate') {
      const payload = {
        name: String(draft.name || '').trim(),
        subtype: String(draft.subtype || draft.template_type || 'binding').trim(),
        template_type: String(draft.subtype || draft.template_type || 'binding').trim(),
        lock_version: draft.lock_version || 1,
        applies_to_entity: 'opportunity',
        subject: String(draft.subject || '').trim(),
        version: Number(draft.version) || 1,
        branch: draft.branch ? Number(draft.branch) : null,
        is_active: Boolean(draft.is_active),
        html_content: String(draft.html_content || ''),
      };
      setIsSaving(true);
      try {
        const res = draft.id ? await updateEstimatePortalTemplate(draft.id, payload) : await createEstimatePortalTemplate(payload);
        const saved = res?.data ?? res;
        await loadTemplates();
        notify('success', 'Estimate portal template updated.');
        return saved;
      } catch (err) {
        notify('error', getApiErrorMessage(err, 'Unable to save template.'));
        return null;
      } finally {
        setIsSaving(false);
      }
    }

    if (activeBuilderMeta?.group === 'comm' || draft?.source_type === 'comm') {
      const payload = {
        name: String(draft.name || '').trim(),
        channel: draft.channel || 'email',
        template_key: String(draft.template_key || '').trim(),
        subject: String(draft.subject || '').trim(),
        body: String(draft.body || '').trim(),
        body_html: String(draft.body_html || '').trim(),
        branch: draft.branch ? Number(draft.branch) : null,
        is_active: Boolean(draft.is_active),
      };
      setIsSaving(true);
      try {
        const res = draft.id ? await updateCommunicationTemplate(draft.id, payload) : await createCommunicationTemplate(payload);
        const saved = res?.data ?? res;
        await loadTemplates();
        notify('success', 'Communication template updated.');
        return saved;
      } catch (err) {
        notify('error', getApiErrorMessage(err, 'Unable to save template.'));
        return null;
      } finally {
        setIsSaving(false);
      }
    }

    // Default: Legal template
    const payload = {
      name: String(draft.name || '').trim(),
      kind: templateKind,
      subtype: draft.subtype || (templateKind === 'invoice' ? 'final' : draft.template_type),
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
      const res = draft.id
        ? await updateDocumentTemplate(draft.id, { ...payload, lock_version: draft.lock_version || 1 })
        : await createDocumentTemplate(payload);
      const saved = res?.data ?? res;
      const nextLock = saved?.draft?.revision?.lock_version || saved?.draft?.lock_version ||
        saved?.lock_version || (draft.lock_version ? draft.lock_version + 1 : 1);
      setDraft((current) => ({ ...current, id: saved?.id || current.id, lock_version: nextLock }));
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

  const removeTemplate = async (templateOrId, name) => {
    const id = typeof templateOrId === 'object' ? templateOrId.id : templateOrId;
    const target = items.find((t) => t.id === id) || (typeof templateOrId === 'object' ? templateOrId : null);
    const templateName = name || target?.name || 'this template';
    const ok = window.confirm(`Delete template "${templateName}"?`);
    if (!ok) return;
    setIsDeleting(true);
    setMessage({ type: '', text: '' });
    try {
      if (target?.source_type === 'estimate') {
        await deactivateEstimatePortalTemplate(id);
      } else if (target?.source_type === 'comm') {
        await deleteCommunicationTemplate(id);
      } else {
        await deleteDocumentTemplate(id);
      }
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
      const mode = getBuilderMode ? getBuilderMode() : 'contract';
      const kind = mode === 'estimate' ? 'estimate_portal' : mode === 'invoice' ? 'invoice' : 'document';
      const res = await getDocumentVariableRegistry(kind);
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
      const targetSourceId = Number(jobId || oppId) || (oppId ? oppId : 1);
      const payload = { 
        format: 'html',
        audience: 'customer',
        portal_base_url: getPortalBaseUrl(),
        branch_id: draft.branch,
        source: {
          type: effectiveScopeType === 'job' || Boolean(jobId) ? 'job' : 'opportunity',
          id: typeof targetSourceId === 'number' && !isNaN(targetSourceId) ? targetSourceId : 1,
        },
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
      const htmlStr = String(data?.html || data?.rendered_html || '');
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

      <div>
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800">{templateKind === 'invoice' ? 'Invoice Templates' : 'Document Templates'}</h2>
              <p className="text-sm text-slate-500 mt-1">
                {templateKind === 'invoice' ? 'Design final, deposit, storage, and progress invoices.' : 'Design and manage contracts, bills of lading, waivers, and credit card authorizations.'}
              </p>
            </div>

            {/* In-tab New Document Action Button */}
            <button
              type="button"
              onClick={() => {
                if (onOpenChooser) {
                  onOpenChooser(templateKind);
                } else {
                  setIsCreateModalOpen(true);
                }
              }}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition text-sm shrink-0 cursor-pointer"
            >
              <PlusCircle size={18} />
              <span>+ New {templateKind === 'invoice' ? 'Invoice' : 'Document'}</span>
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
              <p className="font-medium text-sm">
                {typeFilter !== 'all'
                  ? `No ${typeFilter === 'bol' ? 'Bill of Lading' : typeFilter === 'invoice' ? 'Payment Invoice' : typeFilter === 'credit_card_authorization' ? 'Credit Card Authorization' : 'Contract'} templates found.`
                  : searchTerm || activeFilter !== 'all' || branchFilter
                  ? 'No document templates match your filters.'
                  : 'No document templates found.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (onOpenChooser) {
                    onOpenChooser(templateKind);
                  } else {
                    setIsCreateModalOpen(true);
                  }
                }}
                className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2.5 rounded-xl transition"
              >
                <PlusCircle size={15} />
                <span>Create {templateKind === 'invoice' ? 'Invoice' : 'Document'}</span>
              </button>
            </div>
          ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-xs font-bold">
                    <tr>
                      <th className="px-6 py-4">Template Name</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Applies To</th>
                      <th className="px-6 py-4">Version</th>
                      <th className="px-6 py-4">Branch</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((t) => (
                      <tr key={`${t.source_type || 'legal'}-${t.id}`} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-800">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
                              <FileText size={16} />
                            </div>
                            <div>
                              <div>{t.name}</div>
                              {t.catalog_source?.revision_number && <p className="text-xs font-normal text-slate-500">Copied from global v{t.catalog_source.revision_number}</p>}
                              <div className="text-[11px] font-normal text-slate-500">{t.subject || t.description || 'No subject'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                            {t.display_type || t.template_type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold">
                            {t.applies_to_label || (t.scope_type === 'job' || t.applies_to_entity === 'job' || t.scope_type === 'planned_sub_job' ? 'Job' : 'Opportunity')}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-600">{t.version || '-'}</td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                          {branches.find((b) => String(b.id) === String(t.branch))?.name || (t.branch ? `Branch #${t.branch}` : 'All Branches')}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(t)}
                            disabled={isLoading || isSaving}
                            title={`Click to ${t.is_active ? 'deactivate' : 'activate'}`}
                            className="focus:outline-hidden"
                          >
                            {t.is_active ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 cursor-pointer px-2.5 py-1 rounded-full transition-colors">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 cursor-pointer px-2.5 py-1 rounded-full transition-colors">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Inactive
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => handleEditRow(t)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
                            title="Edit Template"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDuplicateRow(t)}
                            disabled={isLoading || isSaving}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-colors disabled:opacity-50"
                            title="Duplicate Template"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            onClick={() => removeTemplate(t, t.name)}
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

      {/* Create Document Modal */}
      <CreateUniversalDocumentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(saved, meta) => {
          setIsCreateModalOpen(false);
          const normalizedSaved = {
            ...saved,
            source_type: meta.group,
            unified_type: meta.group === 'estimate' ? 'estimate' : meta.group === 'comm' ? (meta.mode === 'sms' ? 'sms' : 'email') : saved.template_type,
            display_type: meta.group === 'estimate' ? 'Estimate' : meta.group === 'comm' ? (meta.mode === 'sms' ? 'SMS' : 'Email') : (saved.template_type === 'bol' ? 'BOL' : saved.template_type === 'invoice' ? 'Invoice' : saved.template_type === 'credit_card_authorization' ? 'CC Auth' : 'Contract'),
            applies_to_label: meta.group === 'estimate' ? 'Customer Portal' : meta.group === 'comm' ? (meta.mode === 'sms' ? 'SMS Alert' : 'Transactional Email') : (saved.scope_type === 'job' ? 'Job' : 'Opportunity'),
          };
          setItems((prev) => [normalizedSaved, ...prev]);
          setDraft({ ...EMPTY_TEMPLATE, ...normalizedSaved });
          setSelectedId(saved.id);
          setActiveBuilderMeta({ group: meta.group, mode: meta.mode });
          setIsBuilderOpen(true);
          if (meta.group === 'estimate') {
            navigate(`${estimateBasePath}/${saved.id}/builder`);
          } else if (meta.group === 'comm') {
            navigate(`${commBasePath}/${saved.id}/builder`);
          } else {
            navigate(`${effectiveBasePath}/${saved.id}/builder`);
          }
        }}
        existingLegalTemplates={legalItems.length ? legalItems : items.filter((t) => !t.source_type || t.source_type === 'legal')}
        existingEstimateTemplates={estimateItems.length ? estimateItems : items.filter((t) => t.source_type === 'estimate')}
        existingCommTemplates={commItems.length ? commItems : items.filter((t) => t.source_type === 'comm')}
        branches={branches}
        defaultBranchId={branchFilter || branchId}
        templateKind={templateKind}
        initialCategory={templateKind === 'invoice' ? 'invoice' : typeFilter !== 'all' ? typeFilter : 'contract'}
        presetLayouts={PRESET_LAYOUTS}
      />

      {/* Full Page Builder Overlay */}
      {isBuilderOpen ? createPortal(
        <UnifiedTemplateBuilder
          key={draft?.id || selectedId || 'new'}
          mode={getBuilderMode()}
          draft={draft}
          onChange={(newDraft) => setDraft(newDraft)}
          onSave={async (savedDoc) => {
            const saved = await saveTemplate();
            if (saved?.id) {
              if (activeBuilderMeta?.group === 'estimate' || draft?.source_type === 'estimate') {
                navigate(`${estimateBasePath}/${saved.id}/builder`, { replace: true });
              } else if (activeBuilderMeta?.group === 'comm' || draft?.source_type === 'comm') {
                navigate(`${commBasePath}/${saved.id}/builder`, { replace: true });
              } else {
                navigate(`${effectiveBasePath}/${saved.id}/builder`, { replace: true });
              }
            }
            return saved;
          }}
          onBack={closeDocumentBuilder}
          branches={branches}
        />,
        document.body
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
