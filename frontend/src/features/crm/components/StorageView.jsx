import React, { useState } from 'react';
import { 
  Calendar, Package, Database, Truck, 
  DollarSign, Percent, Plus, Trash2,
  Info, ChevronDown, Clock, Scale,
  User as UserIcon, Building2, TrendingUp,
  Box as BoxIcon
} from 'lucide-react';
import Card from '../../../shared/ui/Card';

const SectionHeader = ({ title, icon: Icon }) => (
  <div className="flex items-center gap-3 mb-6">
    <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
      <Icon size={20} />
    </div>
    <h3 className="font-heading font-bold text-xl text-heading">{title}</h3>
  </div>
);

const FormField = ({ label, required, children }) => (
  <div className="space-y-1.5">
    <label className="text-[0.625rem] font-bold text-[#64748b] uppercase tracking-widest ml-1">
      {label} {required && <span className="text-status-lost-bg0">*</span>}
    </label>
    {children}
  </div>
);

const InputGroup = ({ children, suffix }) => (
  <div className="relative flex items-center">
    {children}
    {suffix && (
      <div className="absolute right-0 top-0 bottom-0 px-3 flex items-center bg-page border-l border-subtle rounded-r-lg text-[0.625rem] font-bold text-[#64748b] uppercase">
        {suffix}
      </div>
    )}
  </div>
);

const inputCls = "w-full px-4 py-2.5 bg-card border border-subtle rounded-xl text-sm font-medium text-heading outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/40 transition-all";
const selectCls = "w-full px-4 py-2.5 bg-card border border-subtle rounded-xl text-sm font-medium text-heading outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/40 transition-all appearance-none cursor-pointer";

const StorageView = ({ opportunity }) => {
  const quoteNumber = opportunity?.id ? String(opportunity.id).padStart(5, '0') : '55886';
  
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-4xl font-heading font-bold text-heading tracking-tight">
          Storage - <span className="text-primary">#{quoteNumber}</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-8">
          {/* Scheduling */}
          <Card className="p-8 border-0 shadow-xl bg-card rounded-[2rem]">
            <SectionHeader title="Scheduling" icon={Calendar} />
            
            <div className="space-y-8">
              <div className="flex flex-wrap items-center gap-x-12 gap-y-4">
                <div className="relative group">
                  <button className="flex items-center gap-2 text-xs font-bold text-[#1f7ae0] uppercase tracking-widest hover:text-primary transition-colors">
                    Storage <ChevronDown size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-[#64748b]">
                  Warehouse Occupancy: <span className="text-heading font-bold">60%</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-[#64748b]">
                  Available Containers: <span className="text-heading font-bold">2</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label="Date In" required>
                  <div className="flex items-center gap-2 text-sm font-bold text-[#1f7ae0] cursor-pointer hover:underline">
                    Not Set <Calendar size={16} />
                  </div>
                </FormField>
                <FormField label="Date Out">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#1f7ae0] cursor-pointer hover:underline">
                    Not Set <Calendar size={16} />
                  </div>
                </FormField>
              </div>
            </div>
          </Card>

          {/* Recurring Storage */}
          <Card className="p-8 border-0 shadow-xl bg-card rounded-[2rem]">
            <SectionHeader title="Recurring Storage" icon={Clock} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="Rate Type" required>
                <div className="relative">
                  <select className={selectCls} defaultValue="flat">
                    <option value="flat">By Flat Rate</option>
                    <option value="cuft">By Volume (cuft)</option>
                    <option value="weight">By Weight (lbs)</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748b] pointer-events-none" />
                </div>
              </FormField>
              <FormField label="Rate" required>
                <InputGroup>
                  <span className="absolute left-4 text-[#64748b] text-sm">$</span>
                  <input type="number" className={`${inputCls} pl-8`} placeholder="0.00" />
                </InputGroup>
              </FormField>
            </div>
          </Card>

          {/* Oversized Items */}
          <Card className="p-8 border-0 shadow-xl bg-card rounded-[2rem]">
            <SectionHeader title="Oversized Items" icon={BoxIcon} />
            <button className="text-sm font-bold text-[#1f7ae0] hover:text-primary transition-colors flex items-center gap-2">
              <Plus size={16} /> Add Oversized Items
            </button>
          </Card>

          {/* Discounts */}
          <Card className="p-8 border-0 shadow-xl bg-card rounded-[2rem]">
            <SectionHeader title="Discounts" icon={Percent} />
            <button className="text-sm font-bold text-[#1f7ae0] hover:text-primary transition-colors flex items-center gap-2">
              <Plus size={16} /> Add Discounts
            </button>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* Storage Needs */}
          <Card className="p-8 border-0 shadow-xl bg-card rounded-[2rem]">
            <SectionHeader title="Storage Needs" icon={Database} />
            
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-[#64748b] uppercase tracking-widest">Storage Type</span>
                <div className="relative inline-block">
                  <button className="flex items-center gap-2 text-sm font-bold text-[#1f7ae0] hover:text-primary transition-colors">
                    SIT <ChevronDown size={14} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label="Volume">
                  <InputGroup suffix="cuft">
                    <input type="number" className={inputCls} defaultValue="432" />
                  </InputGroup>
                </FormField>
                <FormField label="Weight">
                  <InputGroup suffix="lbs">
                    <input type="number" className={inputCls} defaultValue="3024" />
                  </InputGroup>
                </FormField>
              </div>
            </div>
          </Card>

          {/* Warehouse Handling */}
          <Card className="p-8 border-0 shadow-xl bg-card rounded-[2rem]">
            <SectionHeader title="Warehouse Handling" icon={UserIcon} />
            
            <div className="space-y-6">
              <FormField label="Rate Type" required>
                <div className="relative">
                  <select className={selectCls} defaultValue="container">
                    <option value="container">By Container</option>
                    <option value="flat">By Flat Rate</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748b] pointer-events-none" />
                </div>
              </FormField>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label="Containers" required>
                  <InputGroup suffix={<Database size={12} />}>
                    <input type="number" className={inputCls} defaultValue="0" />
                  </InputGroup>
                </FormField>
                <FormField label="Per Container Fee" required>
                  <InputGroup>
                    <span className="absolute left-4 text-[#64748b] text-sm">$</span>
                    <input type="number" className={`${inputCls} pl-8`} defaultValue="0" />
                  </InputGroup>
                </FormField>
              </div>
            </div>
          </Card>

          {/* Valuation */}
          <Card className="p-8 border-0 shadow-xl bg-card rounded-[2rem]">
            <SectionHeader title="Valuation" icon={DollarSign} />
            
            <div className="space-y-6">
              <FormField label="Rate Type" required>
                <div className="relative">
                  <select className={selectCls} defaultValue="flat">
                    <option value="flat">By Flat Rate</option>
                    <option value="per_k">Per $1000</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748b] pointer-events-none" />
                </div>
              </FormField>
              <FormField label="Flat Rate" required>
                <InputGroup>
                  <span className="absolute left-4 text-[#64748b] text-sm">$</span>
                  <input type="number" className={`${inputCls} pl-8`} placeholder="0.00" />
                </InputGroup>
              </FormField>
            </div>
          </Card>

          {/* Totals */}
          <Card className="p-8 border-0 shadow-xl bg-card rounded-[2rem] border-t-4 border-t-[#CC1F1F]">
            <SectionHeader title="Totals" icon={TrendingUp} />
            
            <div className="space-y-4 pt-4 border-t border-page">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-[#64748b]">Recurring Storage Charges</span>
                <span className="text-base font-bold text-heading">$0.00 <span className="text-[0.625rem] text-[#64748b] font-normal uppercase">/Month</span></span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-[#64748b]">WHSE Handling Fee</span>
                <span className="text-base font-bold text-heading">$0.00</span>
              </div>
              <div className="pt-6 mt-6 border-t border-page flex justify-between items-center">
                <span className="text-lg font-heading font-bold text-heading">Estimated Total</span>
                <div className="text-right">
                  <div className="text-3xl font-heading font-bold text-primary">$0.00</div>
                  <div className="text-[0.625rem] font-bold text-[#64748b] uppercase tracking-widest mt-1">First Month Total</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StorageView;
