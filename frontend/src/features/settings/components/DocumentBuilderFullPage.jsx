import { getDocumentHtml } from './documentContent';
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Undo2, Redo2 } from 'lucide-react';
import { 
  ArrowLeft, Save, FileText, Settings, Layout, GripVertical, HelpCircle,
  Trash2, Edit2, ArrowUp, ArrowDown, Plus, MousePointerClick, Copy, Check
} from 'lucide-react';
import RichTextEditor from '../../../shared/ui/RichTextEditor';
import { getPortalBaseUrl } from '../../../shared/utils/portalBaseUrl';
import { inlineDocumentBuilderStyles } from '../../../shared/utils/inlineDocumentStyles';

const DOCUMENT_BUILDER_DRAG_TYPE = 'application/x-movers-document-builder';

const WIDGET_CATEGORIES = [
  {
    title: 'Layout Elements',
    widgets: [
      { id: 'header', label: 'Simple Heading', html: '<div style="font-size: 24px; font-weight: bold; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 16px;">Heading</div>' },
      { id: 'col_2', label: '2 Column Layout', html: '<table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;"><tr><td style="width: 50%; padding: 8px; border: 1px solid #e2e8f0; vertical-align: top;">Col 1</td><td style="width: 50%; padding: 8px; border: 1px solid #e2e8f0; vertical-align: top;">Col 2</td></tr></table>' },
      { id: 'col_3', label: '3 Column Layout', html: '<table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;"><tr><td style="width: 33.33%; padding: 8px; border: 1px solid #e2e8f0; vertical-align: top;">Col 1</td><td style="width: 33.33%; padding: 8px; border: 1px solid #e2e8f0; vertical-align: top;">Col 2</td><td style="width: 33.33%; padding: 8px; border: 1px solid #e2e8f0; vertical-align: top;">Col 3</td></tr></table>' },
      { id: 'page_break', label: 'Page Break', html: '<div style="page-break-after: always; text-align: center; border-bottom: 1px dashed #cbd5e1; margin: 24px 0; color: #94a3b8; font-size: 12px; padding-bottom: 4px;">Page Break</div>' },
    ]
  },
  {
    title: 'Mover CRM Sections',
    widgets: [
      { 
        id: 'crm_header_bol', 
        label: 'Premium BOL Header', 
        html: `<header class="flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-black pb-6 mb-8 gap-6 w-full font-sans">
    <div class="flex flex-col gap-4">
        <div class="flex items-center gap-4">
            <img src="{{Branch.logo_url}}" alt="Logo" onerror="this.style.display='none';" class="max-h-12 max-w-[150px] object-contain hidden sm:block grayscale">
            <div>
                <div class="text-xl font-black text-black uppercase tracking-tight">{{Branch.name}}</div>
                <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">HST: 729676072RT0001</div>
            </div>
        </div>
    </div>
    <div class="text-left md:text-right">
        <h1 class="text-xl md:text-2xl font-black text-black uppercase tracking-tighter mb-1">Services Contract</h1>
        <h2 class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Uniform Household Goods Bill of Lading</h2>
        <div class="inline-block border border-black p-2 bg-gray-50 text-left min-w-[180px]">
            <div class="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Contract Number</div>
            <div class="text-base font-mono font-black text-black">{{Contract.contract_number}}</div>
        </div>
    </div>
</header>`
      },
      { 
        id: 'crm_metadata_grid', 
        label: 'Details Grid (3-Col)', 
        html: `<div class="grid grid-cols-3 gap-0 border border-black mb-8 divide-x divide-black bg-gray-50 text-center w-full font-sans">
    <div class="p-3 bg-white">
        <div class="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Contract Date</div>
        <div class="text-xs font-black text-black">{{Opportunity.move_date}}</div>
    </div>
    <div class="p-3 bg-white">
        <div class="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Estimate Type</div>
        <div class="text-xs font-black text-black">{{Opportunity.binding_type}}</div>
    </div>
    <div class="p-3 bg-gray-100">
        <div class="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-1">Job / Sales Number</div>
        <div class="text-xs font-mono font-black text-black">{{Opportunity.sales_number}}</div>
    </div>
</div>`
      },
      { 
        id: 'crm_shipper_carrier', 
        label: 'Shipper & Carrier Info', 
        html: `<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 w-full font-sans">
    <div class="p-4 border border-gray-300 bg-white">
        <div class="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3 border-b border-gray-100 pb-1">Shipper (Client) Details</div>
        <div class="text-xs text-gray-800 space-y-1.5 leading-relaxed">
            <div class="font-black text-sm text-black mb-1">{{Customer.full_name}}</div>
            <div class="flex justify-between border-b border-gray-50 pb-0.5">
                <span class="text-gray-500">Phone:</span> 
                <strong class="text-black text-right">{{Customer.primary_phone}}</strong>
            </div>
            <div class="flex justify-between pb-0.5">
                <span class="text-gray-500">Email:</span> 
                <strong class="text-black text-right break-all">{{Customer.email}}</strong>
            </div>
        </div>
    </div>
    <div class="p-4 border border-gray-300 bg-white">
        <div class="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3 border-b border-gray-100 pb-1">Carrier (Company) Details</div>
        <div class="text-xs text-gray-800 space-y-1.5 leading-relaxed">
            <div class="font-black text-sm text-black mb-1">{{Branch.name}}</div>
            <div class="flex justify-between border-b border-gray-50 pb-0.5">
                <span class="text-gray-500">Phone:</span> 
                <strong class="text-black text-right">{{Branch.phone}}</strong>
            </div>
            <div class="flex justify-between pb-0.5">
                <span class="text-gray-500">Address:</span> 
                <strong class="text-black text-right">{{Branch.full_address}}</strong>
            </div>
        </div>
    </div>
</div>`
      },
      { 
        id: 'crm_logistics_route', 
        label: 'Logistics Route Block', 
        html: `<div class="border border-gray-300 p-4 mb-8 bg-gray-50 relative w-full font-sans">
    <div class="absolute -top-2 left-4 bg-gray-50 px-2 text-[9px] font-black text-black uppercase tracking-widest border border-gray-300">Logistics Route</div>
    <div class="flex justify-between items-center gap-6 mt-2">
        <div class="flex-1 w-full">
            <span class="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Origin</span>
            <strong class="text-xs text-black block">{{OriginAddress.full_address}}</strong>
        </div>
        <div class="hidden sm:flex flex-col items-center shrink-0 w-20">
            <span class="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">Stops</span>
            <div class="w-full border-t border-dashed border-gray-300 my-0.5 relative">
                <div class="absolute right-[-2px] top-[-3px] border-solid border-l-[6px] border-l-gray-300 border-y-[3px] border-y-transparent"></div>
            </div>
            <span class="text-[9px] font-medium text-gray-400 italic">None planned</span>
        </div>
        <div class="flex-1 w-full text-right">
            <span class="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Destination</span>
            <strong class="text-xs text-black block">{{DestinationAddress.full_address}}</strong>
        </div>
    </div>
</div>`
      },
    ]
  },
  {
    title: 'Table & Pricing',
    widgets: [
      { 
        id: 'crm_charges_table', 
        label: 'Estimated Charges Table', 
        html: `<div class="mb-10 w-full font-sans">
    <h3 class="text-xs font-black text-black mb-2 uppercase tracking-wide">Estimated Charges</h3>
    <div class="overflow-x-auto border border-black">
        <table class="w-full text-left text-xs min-w-[500px] border-collapse">
            <thead class="bg-gray-50 border-b border-black">
                <tr>
                    <th class="p-2.5 font-bold text-black uppercase tracking-wider text-[10px]">Service Description</th>
                    <th class="p-2.5 font-bold text-black uppercase tracking-wider text-[10px] border-l border-black">Details</th>
                    <th class="p-2.5 font-bold text-black uppercase tracking-wider text-[10px] text-right border-l border-black w-32">Est. Cost</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white">
                <tr>
                    <td class="p-2.5 font-bold text-black">Moving Labor</td>
                    <td class="p-2.5 text-gray-600 border-l border-gray-200">Hourly rate: {{Estimate.hourly_rate}} ({{Estimate.crew_size}} crew / {{Estimate.truck_count}} truck)</td>
                    <td class="p-2.5 text-right font-black text-black border-l border-gray-200">{{Estimate.grand_total}}</td>
                </tr>
                <tr>
                    <td class="p-2.5 font-bold text-black">Travel &amp; Trip Fee</td>
                    <td class="p-2.5 text-gray-600 border-l border-gray-200">Included</td>
                    <td class="p-2.5 text-right font-black text-black border-l border-gray-200">—</td>
                </tr>
                <tr>
                    <td class="p-2.5 font-bold text-black">Fuel Surcharge</td>
                    <td class="p-2.5 text-gray-600 border-l border-gray-200">Included</td>
                    <td class="p-2.5 text-right font-black text-black border-l border-gray-200">—</td>
                </tr>
            </tbody>
            <tfoot class="bg-black text-white border-t border-black">
                <tr>
                    <td colspan="2" class="p-2.5 font-black uppercase tracking-wider text-[10px] text-right">Estimated Total Charges</td>
                    <td class="p-2.5 text-right font-black text-sm">{{Estimate.grand_total}}</td>
                </tr>
            </tfoot>
        </table>
    </div>
</div>`
      },
      { id: 'table_border', label: 'Simple Table w/ Border', html: '<table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; margin-bottom: 16px;"><tr><th style="border: 1px solid #e2e8f0; padding: 8px; background-color: #f8fafc; text-align: left;">Header 1</th><th style="border: 1px solid #e2e8f0; padding: 8px; background-color: #f8fafc; text-align: left;">Header 2</th></tr><tr><td style="border: 1px solid #e2e8f0; padding: 8px;">Cell 1</td><td style="border: 1px solid #e2e8f0; padding: 8px;">Cell 2</td></tr></table>' },
      { id: 'inventory_table', label: 'Inventory Table', html: '<table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; margin-bottom: 16px;"><tr><th style="border: 1px solid #e2e8f0; padding: 8px; background-color: #f8fafc; text-align: left;">Item</th><th style="border: 1px solid #e2e8f0; padding: 8px; background-color: #f8fafc; text-align: left;">Quantity</th></tr><tr><td style="border: 1px solid #e2e8f0; padding: 8px;">Boxes</td><td style="border: 1px solid #e2e8f0; padding: 8px;">10</td></tr></table>' },
      { id: 'job_timeline', label: 'Job Timeline', html: '<div style="padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 16px;"><strong>Job Timeline</strong><br><br>Start: ______<br>End: ______</div>' },
    ]
  },
  {
    title: 'E-Signatures & Form Inputs',
    widgets: [
      { 
        id: 'crm_premove_auth', 
        label: 'Pre-Move Auth Block', 
        html: `<div class="border border-gray-300 p-4 bg-white font-sans w-full">
    <h4 class="font-black text-xs text-black mb-1 uppercase tracking-tight">Pre-Move Authorization</h4>
    <p class="text-[10px] text-gray-500 mb-4 font-medium">I authorize the moving services listed above and accept the terms of this contract.</p>
    <div class="flex flex-col sm:flex-row gap-6">
        <div class="flex-1">
            <div class="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Customer Signature</div>
            <span data-sign="signature" data-key="sig_auth_\${Date.now()}" class="block w-full"></span>
        </div>
        <div class="w-full sm:w-40">
            <div class="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Date</div>
            <span data-sign="date" data-key="date_auth_\${Date.now()}" class="block w-full"></span>
        </div>
    </div>
</div>`
      },
      { 
        id: 'crm_delivery_auth', 
        label: 'Delivery Acceptance Block', 
        html: `<div class="border border-gray-300 p-4 bg-white font-sans w-full">
    <h4 class="font-black text-xs text-black mb-1 uppercase tracking-tight">Delivery Acceptance Pre-authorization</h4>
    <p class="text-[10px] text-gray-500 mb-4 font-medium">I preauthorize delivery to destination and agree to sign final documents upon arrival.</p>
    <div class="flex flex-col sm:flex-row gap-6">
        <div class="flex-1">
            <div class="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Customer Signature</div>
            <span data-sign="signature" data-key="sig_del_\${Date.now()}" class="block w-full"></span>
        </div>
        <div class="w-full sm:w-40">
            <div class="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Date</div>
            <span data-sign="date" data-key="date_del_\${Date.now()}" class="block w-full"></span>
        </div>
    </div>
</div>`
      },
      { id: 'sig_req', label: 'Signature Box (Required)', html: '<div style="margin-top: 16px; padding: 16px; border: 2px solid #fbbf24; border-radius: 8px; background-color: #fffbeb;"><div style="font-size: 12px; font-weight: bold; color: #b45309; text-transform: uppercase; margin-bottom: 8px;">Signature Required</div><span data-sign="signature" data-key="sig_req_${Date.now()}"></span></div>' },
      { id: 'sig_opt', label: 'Signature Box (Optional)', html: '<div style="margin-top: 16px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px;"><div style="font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">Signature Optional</div><span data-sign="signature" data-key="sig_opt_${Date.now()}"></span></div>' },
      { id: 'init_req', label: 'Initials Box (Required)', html: '<span data-sign="initial" data-key="init_req_${Date.now()}" style="display: inline-block; border: 2px solid #fbbf24; padding: 8px; border-radius: 4px; background-color: #fffbeb; margin-bottom: 12px;">Initials</span>' },
      { id: 'init_opt', label: 'Initials Box (Optional)', html: '<span data-sign="initial" data-key="init_opt_${Date.now()}" style="display: inline-block; border: 1px solid #e2e8f0; padding: 8px; border-radius: 4px; margin-bottom: 12px;">Initials</span>' },
      { id: 'text_req', label: 'Textbox (Required)', html: '<div style="margin-bottom: 12px;"><label style="font-size: 12px; font-weight: bold; display: block; margin-bottom: 4px;">Required Text</label><input type="text" style="width: 100%; padding: 8px; border: 2px solid #fbbf24; border-radius: 4px;" placeholder="Type here..." /></div>' },
      { id: 'text_opt', label: 'Textbox (Optional)', html: '<div style="margin-bottom: 12px;"><label style="font-size: 12px; font-weight: bold; display: block; margin-bottom: 4px;">Optional Text</label><input type="text" style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 4px;" placeholder="Type here..." /></div>' },
      { id: 'textarea_req', label: 'Textarea (Required)', html: '<div style="margin-bottom: 12px;"><label style="font-size: 12px; font-weight: bold; display: block; margin-bottom: 4px;">Required Textarea</label><textarea style="width: 100%; padding: 8px; border: 2px solid #fbbf24; border-radius: 4px; min-height: 80px;" placeholder="Type here..."></textarea></div>' },
      { id: 'textarea_opt', label: 'Textarea (Optional)', html: '<div style="margin-bottom: 12px;"><label style="font-size: 12px; font-weight: bold; display: block; margin-bottom: 4px;">Optional Textarea</label><textarea style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 4px; min-height: 80px;" placeholder="Type here..."></textarea></div>' },
      { id: 'check_req', label: 'Checkbox (Required)', html: '<div style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px;"><input type="checkbox" style="accent-color: #fbbf24; width: 16px; height: 16px;" /> <label style="font-size: 14px;">Required Checkbox</label></div>' },
      { id: 'check_opt', label: 'Checkbox (Optional)', html: '<div style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px;"><input type="checkbox" style="width: 16px; height: 16px;" /> <label style="font-size: 14px;">Optional Checkbox</label></div>' },
    ]
  },
  {
    title: 'Legal & Carriage Terms',
    widgets: [
      {
        id: 'legal_conditions',
        label: 'Conditions of Carriage',
        html: `<div class="border-2 border-black p-0 bg-white print-expand mb-6 w-full font-sans">
    <div class="bg-black text-white px-4 py-2">
        <h4 class="font-black text-[10px] uppercase tracking-widest text-center m-0">Uniform Conditions of Carriage (Household Goods)</h4>
    </div>
    <div class="p-4 text-[10px] text-gray-700 leading-relaxed max-h-[140px] overflow-y-auto print-expand bg-gray-50">
        <p class="mb-2"><strong>1. Liability of Carrier:</strong> The carrier of the goods is liable for any loss of or damage to goods accepted by the carrier or the carrier's agent except as provided in this Schedule.</p>
        <p class="mb-2"><strong>2. Exceptions from Liability:</strong> The carrier shall not be liable for loss, damage or delay to any goods caused by an act of God, the Queen's or public enemies, riots, strikes, a defect in the goods, an act or default of the consignor, owner or consignee, authority of law or quarantine.</p>
        <p class="mb-2"><strong>3. Valuation &amp; Limits:</strong> Carrier's liability is limited to 60 cents per pound per article ($0.60/lb), unless additional insurance plans are selected and paid for in writing prior to load commencement.</p>
    </div>
</div>`
      }
    ]
  },
  {
    title: 'Payments & Credit Card',
    widgets: [
      {
        id: 'cc_header',
        label: 'Credit Card Auth Header',
        html: `<header class="flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-black pb-6 mb-8 gap-6 w-full font-sans">
    <div class="flex flex-col gap-4 w-full md:w-auto">
        <div class="flex items-center gap-4">
            <img src="{{Branch.logo_url}}" alt="Logo" onerror="this.style.display='none';" class="max-h-12 md:max-h-16 max-w-[150px] object-contain hidden sm:block grayscale">
            <div>
                <div class="text-xl md:text-2xl font-black text-black uppercase tracking-tight">{{Branch.name}}</div>
                <div class="text-[10px] md:text-xs font-bold text-gray-600 mt-1 uppercase tracking-wider">Payment Authorization</div>
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
</header>`
      },
      {
        id: 'cc_terms',
        label: 'Credit Card Terms',
        html: `<div class="mb-10 w-full font-sans">
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
</div>`
      },
      {
        id: 'cc_details',
        label: 'Cardholder & Payment Details',
        html: `<div class="border-2 border-black p-5 md:p-8 bg-white mb-8 relative w-full font-sans">
    <h2 class="text-sm font-black text-black mb-6 border-b-2 border-black pb-2 uppercase tracking-wide">
        Cardholder &amp; Payment Details
    </h2>
    <div class="space-y-6">
        <div>
            <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Cardholder Name (As it appears on card)</label>
            <span data-sign="text" data-key="cc_cardholder_name_\\$\\{Date.now()\\}"></span>
        </div>
        <div>
            <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Credit Card Number</label>
            <span data-sign="text" data-key="cc_number_\\$\\{Date.now()\\}"></span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Card Type (Visa/MC/Amex)</label>
                <span data-sign="text" data-key="cc_card_type_\\$\\{Date.now()\\}"></span>
            </div>
            <div>
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Expiration Date</label>
                <span data-sign="text" data-key="cc_expiry_\\$\\{Date.now()\\}"></span>
            </div>
            <div>
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">CVV Code</label>
                <span data-sign="text" data-key="cc_cvv_\\$\\{Date.now()\\}"></span>
            </div>
        </div>
        <div class="pt-6 mt-4 border-t border-gray-300">
            <h3 class="text-sm font-black text-black mb-5 uppercase tracking-wide">Billing Address Information</h3>
            <div class="space-y-6">
                <div>
                    <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Street Address</label>
                    <span data-sign="text" data-key="cc_billing_address_\\$\\{Date.now()\\}"></span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">City, State/Province</label>
                        <span data-sign="text" data-key="cc_city_state_\\$\\{Date.now()\\}"></span>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Postal / ZIP Code</label>
                        <span data-sign="text" data-key="cc_postal_code_\\$\\{Date.now()\\}"></span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>`
      },
      {
        id: 'cc_auth',
        label: 'Formal CC Authorization',
        html: `<div class="mb-8 relative mt-12 pt-8 border-t-2 border-black w-full font-sans">
    <div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-4 text-[11px] font-black uppercase text-black tracking-widest border border-white">Formal Authorization</div>
    <p class="text-[12px] text-gray-800 leading-relaxed font-bold uppercase tracking-wide mb-8 bg-gray-50 p-5 border border-gray-300">
        According to the terms outlined above, S&amp;P TRADING INC, operating as {{Branch.name}}, is authorized to charge the credit card indicated in this authorization form. I agree to the terms as outlined within this document.
    </p>
    <div class="flex flex-col sm:flex-row gap-8 md:gap-12">
        <div class="flex-1 w-full">
            <span data-sign="signature" data-key="sig_cc_auth_\\$\\{Date.now()\\}" class="block w-full"></span>
            <div class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-2">Authorized Signature</div>
        </div>
        <div class="w-full sm:w-56">
            <span data-sign="date" data-key="date_cc_auth_\\$\\{Date.now()\\}" class="block w-full"></span>
            <div class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-2">Date</div>
        </div>
    </div>
</div>`
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
      { key: 'Opportunity.arrival_window', description: 'Expected arrival window' },
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

  return (
    <div 
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
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

export default function DocumentBuilderFullPage({
  draft,
  onChange,
  onSave,
  onBack,
  onPreview,
  onRunLivePreview,
  previewMode = 'sample',
  onPreviewModeChange,
  previewOpportunityId = '',
  onPreviewOpportunityIdChange,
  previewPlannedSubJobId = '',
  onPreviewPlannedSubJobIdChange,
  previewJobId = '',
  onPreviewJobIdChange,
  scopeType = 'opportunity',
  variables = [],
  registry = [],
  branches = []
}) {
  const visibleScopeType = scopeType === 'planned_sub_job' ? 'job' : scopeType;
  const [isFullPreviewOpen, setIsFullPreviewOpen] = useState(false);
  const [docSettings, setDocSettings] = useState(() => {
    if (draft.content && typeof draft.content === 'object' && draft.content.docSettings) {
      return draft.content.docSettings;
    }
    if (!getDocumentHtml(draft)) return { format: 'Letter', margin: '40px' };
    const match = getDocumentHtml(draft).match(/^<!-- DOC_SETTINGS:(.*?) -->/);
    if (match) {
      try { return JSON.parse(match[1]); } catch(e) {}
    }
    return { format: 'Letter', margin: '40px' };
  });

  const [blocks, setBlocks] = useState(() => {
    if (draft.content && typeof draft.content === 'object' && draft.content.blocks) {
      return draft.content.blocks.map(block => ({ ...block, html: inlineDocumentBuilderStyles(block.html) }));
    }
    if (!getDocumentHtml(draft).trim()) {
      return [];
    }
    let content = getDocumentHtml(draft);
    const docMatch = content.match(/^<!-- DOC_SETTINGS:(.*?) -->\n*/);
    if (docMatch) {
      content = content.replace(/^<!-- DOC_SETTINGS:(.*?) -->\n*/, '');
    }
    const parts = content.split('<!-- BLOCK_SEPARATOR -->');
    return parts.map((p, i) => {
      let html = p.trim();
      let settings = {};
      const match = html.match(/^<!-- BLOCK_SETTINGS:(.*?) -->\n*/);
      if (match) {
        try {
          settings = JSON.parse(match[1]);
          html = html.replace(/^<!-- BLOCK_SETTINGS:(.*?) -->\n*/, '');
        } catch(e) {}
      }
      return { id: `block_init_${i}_${Date.now()}`, html: inlineDocumentBuilderStyles(html), settings };
    }).filter(b => b.html !== '');
  });

  const [editingBlockIndex, setEditingBlockIndex] = useState(null);

  const [showImportHtml, setShowImportHtml] = useState(false);
  const [importHtmlContent, setImportHtmlContent] = useState('');
  const [savedClauses, setSavedClauses] = useState(() => {
    try { return JSON.parse(localStorage.getItem('crm_reusable_clauses')) || []; } catch { return []; }
  });

  const saveClause = (html, label) => {
    const newClauses = [...savedClauses, { id: `clause_${Date.now()}`, html, label }];
    setSavedClauses(newClauses);
    localStorage.setItem('crm_reusable_clauses', JSON.stringify(newClauses));
  };

  
  // Undo/Redo & Autosave state
  const [history, setHistory] = useState([{ blocks: [], docSettings: { format: 'Letter', margin: '40px' } }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  useEffect(() => {
    const handleSaveClause = (e) => saveClause(e.detail.html, e.detail.label);
    window.addEventListener('save-clause', handleSaveClause);
    return () => window.removeEventListener('save-clause', handleSaveClause);
  }, [savedClauses]);

  
  useEffect(() => {
    setHistory([{ blocks, docSettings }]);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (isDirty) {
        handleSave();
      }
    }, 10000);
    return () => clearInterval(timer);
  }, [isDirty, onSave]);
  

  // New States for Sidebar Optimizations
  const [activeTab, setActiveTab] = useState('widgets'); // 'widgets' | 'variables' | 'settings'
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(null);
  useEffect(() => { if (selectedBlockIndex !== null) { setActiveTab('settings'); } else if (activeTab === 'settings') { setActiveTab('widgets'); } }, [selectedBlockIndex]);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedVar, setCopiedVar] = useState(null);

  const savingRef = useRef(false);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const handleSave = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    const submittedDraft = draftRef.current;
    try {
      const saved = await onSave();
      if (saved && JSON.stringify(draftRef.current.content ?? draftRef.current.html_content) === JSON.stringify(submittedDraft.content ?? submittedDraft.html_content)) setIsDirty(false);
    } finally {
      savingRef.current = false;
    }
  };

  const updateDraft = (newBlocks, newSettings) => {
    let newDraft = { ...draft };
    
    if (draft.hasOwnProperty('content')) {
      newDraft.content = { docSettings: newSettings, blocks: newBlocks };
    } else {
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
      newDraft.html_content = htmlStr;
    }
    onChange(newDraft);
    setIsDirty(true);
  };

  const syncBlocks = (newBlocks, newSettings = docSettings, pushToHistory = true) => {
    newBlocks = newBlocks.map(block => ({ ...block, html: inlineDocumentBuilderStyles(block.html) }));
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
    const newBlock = { id: `block_${Date.now()}_${Math.random()}`, html: '' };
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
      const serialized = dataTransfer?.getData(DOCUMENT_BUILDER_DRAG_TYPE);
      if (serialized) return JSON.parse(serialized);
    } catch {
      // Fall back to the in-memory payload for browsers with restricted custom data types.
    }
    return activeDragRef.current;
  };

  const handleBlockDragStart = (e, index) => {
    setEditingBlockIndex(null); // Stop editing when starting a drag
    setSelectedBlockIndex(null);
    setDragSource('canvas');
    setDragItemIndex(index);
    const payload = { source: 'canvas', index };
    activeDragRef.current = payload;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(DOCUMENT_BUILDER_DRAG_TYPE, JSON.stringify(payload));
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

  const handleSidebarDragStart = (e, htmlTemplate, plainText = 'document-widget') => {
    if (plainText === 'document-widget') {
      setEditingBlockIndex(null);
    }
    setDragSource('sidebar');
    const htmlToInsert = getHtmlWithUniqueKeys(htmlTemplate);
    const payload = { source: 'sidebar', html: htmlToInsert };
    activeDragRef.current = payload;
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData(DOCUMENT_BUILDER_DRAG_TYPE, JSON.stringify(payload));
    e.dataTransfer.setData('text/plain', plainText);
  };

  const handleSidebarClick = (htmlTemplate) => {
    const htmlToInsert = getHtmlWithUniqueKeys(htmlTemplate);
    const newBlock = { id: `block_${Date.now()}_${Math.random()}`, html: htmlToInsert };
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
      const newBlock = { id: `block_${Date.now()}_${Math.random()}`, html: payload.html };
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
      const newBlock = { id: `block_${Date.now()}_${Math.random()}`, html: payload.html };
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
            Sample Preview
          </button>
          <button
            onClick={onRunLivePreview}
            className="px-3 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 transition-colors"
          >
            Live Preview
          </button>
          <button 
            onClick={handleSave}
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
              onClick={() => { setActiveTab('widgets'); setSearchQuery(''); }}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 text-center ${activeTab === 'widgets' ? 'border-blue-600 text-blue-600 bg-white active-tab' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              Widgets
            </button>
            <button
              onClick={() => { setActiveTab('variables'); setSearchQuery(''); }}
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
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Template Type</label>
                      <input
                        value={draft.template_type || ''}
                        onChange={(e) => {
                          onChange({ ...draft, template_type: e.target.value });
                          setIsDirty(true);
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                        placeholder="contract"
                      />
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
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Version</label>
                        <input
                          value={draft.version || ''}
                          onChange={(e) => {
                            onChange({ ...draft, version: e.target.value });
                            setIsDirty(true);
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                          placeholder="1.0"
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
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">Triggers</h3>
                      
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Scope type</label>
                          <select
                            value={visibleScopeType || 'opportunity'}
                            onChange={(e) => {
                              const nextVisibleScope = e.target.value;
                              const nextInternalScope = nextVisibleScope === 'job' ? 'planned_sub_job' : nextVisibleScope;
                              onChange({ ...draft, scope_type: nextInternalScope, applies_to_entity: nextVisibleScope });
                              setIsDirty(true);
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                          >
                            <option value="opportunity">Opportunity</option>
                            <option value="job">Job</option>
                          </select>
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
                        <div className="pt-2">
                          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">Live Preview Context</h3>
                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Preview mode</label>
                              <select
                                value={previewMode}
                                onChange={(e) => onPreviewModeChange?.(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                              >
                                <option value="sample">Sample data</option>
                                <option value="opportunity">Real opportunity</option>
                              </select>
                            </div>
                            {previewMode === 'opportunity' ? (
                              <>
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Opportunity ID</label>
                                  <input
                                    value={previewOpportunityId || ''}
                                    onChange={(e) => onPreviewOpportunityIdChange?.(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                                    placeholder="123"
                                  />
                                </div>
                                {visibleScopeType === 'job' ? (
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Job ID</label>
                                    <input
                                      value={previewPlannedSubJobId || ''}
                                      onChange={(e) => onPreviewPlannedSubJobIdChange?.(e.target.value)}
                                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                                      placeholder="Use the opportunity job/sub-job ID"
                                    />
                                  </div>
                                ) : null}
                              </>
                            ) : (
                              <p className="text-[11px] font-medium text-slate-500">
                                Sample preview uses placeholder data only. Use Live Preview for scope-aware opportunity or job rendering.
                              </p>
                            )}
                          </div>
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
                {(registry && registry.length > 0 ? registry : DEFAULT_VARIABLE_REGISTRY).map((group) => {
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
                              onDragStart={(e) => {
                                const isLogo = field.key === 'Branch.logo_url';
                                const htmlToInsert = isLogo ? `<img src="{{Branch.logo_url}}" alt="Logo" class="max-h-12 max-w-[150px] object-contain grayscale" onerror="this.style.display='none';" />` : `<p>{{${field.key}}}</p>`;
                                handleSidebarDragStart(e, htmlToInsert, `{{${field.key}}}`);
                              }}
                              onDragEnd={handleDragEnd}
                              onClick={() => {
                                const isLogo = field.key === 'Branch.logo_url';
                                const htmlToInsert = isLogo ? `<img src="{{Branch.logo_url}}" alt="Logo" class="max-h-12 max-w-[150px] object-contain grayscale" onerror="this.style.display='none';" />` : `{{${field.key}}}`;
                                navigator.clipboard.writeText(`{{${field.key}}}`);
                                setCopiedVar(field.key);
                                setTimeout(() => setCopiedVar(null), 1500);
                                
                                if (editingBlockIndex !== null && blocks[editingBlockIndex]) {
                                  const newBlocks = [...blocks];
                                  newBlocks[editingBlockIndex] = { 
                                    ...newBlocks[editingBlockIndex], 
                                    html: newBlocks[editingBlockIndex].html + (isLogo ? ` ${htmlToInsert}` : ` {{${field.key}}}`) 
                                  };
                                  syncBlocks(newBlocks);
                                } else {
                                  handleSidebarClick(isLogo ? htmlToInsert : `<p>{{${field.key}}}</p>`);
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
                {draft.template_type || 'Contract'}
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
            className="flex-1 overflow-y-auto p-2 sm:p-8 flex justify-center bg-[#f3f4f6] relative scroll-smooth"
            onDragOver={(e) => {
              e.preventDefault();
              const payload = readDragPayload(e.dataTransfer);
              e.dataTransfer.dropEffect = payload?.source === 'sidebar' ? 'copy' : 'move';
            }}
            onDrop={handleCanvasContainerDrop}
            onClick={() => setSelectedBlockIndex(null)}
          >
            <div className="w-full max-w-[850px] min-w-0 bg-white min-h-[1056px] shadow-xl border border-slate-200/80 p-6 sm:p-12 flex flex-col" style={{ boxShadow: '0 10px 40px -10px rgba(0,0,0,0.08)' }}>
              
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
                        startEditing={() => { setEditingBlockIndex(index); setSelectedBlockIndex(index); }}
                        stopEditing={() => setEditingBlockIndex(null)}
                        isSelected={selectedBlockIndex === index}
                        isDragging={dragSource === 'canvas' && dragItemIndex === index}
                        onSelect={() => { setSelectedBlockIndex(index); setEditingBlockIndex(index); }}
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
                srcDoc={renderSamplePreviewHtml(getDocumentHtml({ content: { blocks } }), draft.branch, branches)}
                sandbox="allow-scripts allow-same-origin"
              />
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return ReactDOM.createPortal(<>{modalContent}{importHtmlModal}{previewModal}</>, document.body);
}

const SAMPLE_PREVIEW_DATA = {
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

const renderSamplePreviewHtml = (html, branchId, branches) => {
  const branch = branches?.find(b => String(b.id) === String(branchId)) || branches?.[0] || {};
  
  let rendered = String(html || '');
  rendered = rendered.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, key) => {
    const trimmed = String(key || '').trim();
    if (trimmed === 'Branch.name') return branch.name || 'Antigravity Movers Inc.';
    if (trimmed === 'Branch.email') return branch.email || 'info@antigravitymovers.com';
    if (trimmed === 'Branch.phone') return branch.phone || '1-800-555-0199';
    if (trimmed === 'Branch.full_address') return branch.full_address || '123 Main Street, Suite 4B, Toronto, ON, M5V 2T6';
    if (trimmed === 'Branch.logo_url') return branch.logo_url || 'https://via.placeholder.com/150x50?text=Logo';
    
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

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
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
        ${inlineDocumentBuilderStyles(rendered)}
      </body>
    </html>
  `;
};
