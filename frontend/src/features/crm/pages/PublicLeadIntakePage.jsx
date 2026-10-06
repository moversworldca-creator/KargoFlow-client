import React from 'react';
import PublicLeadIntakeForm from '../components/PublicLeadIntakeForm';
import { Truck } from 'lucide-react';

export default function PublicLeadIntakePage() {
  return (
    <div className="min-h-screen bg-[#fafafa] text-[#334155] font-sans selection:bg-[#eef5fa] selection:text-[#1f7ae0] flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Decorative background grid and blurs */}
      <div className="absolute inset-0 pointer-events-none opacity-40 grid-bg" />
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#eef5fa] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-50/50 rounded-full blur-[120px] pointer-events-none" />

      {/* Header Info */}
      <div className="max-w-2xl mx-auto w-full text-center mb-8 relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#eef5fa] text-[#1f7ae0] font-bold text-xs uppercase tracking-wider shadow-sm mb-4">
          <Truck size={14} /> Relocation Services
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-[#111d23] tracking-tight">
          Request a Free Moving Quote
        </h1>
        <p className="text-sm text-[#64748b] mt-2 max-w-md mx-auto">
          Get a professional, reliable quote for your residential or commercial relocation in just a few steps.
        </p>
      </div>

      {/* Main Intake Form Container */}
      <div className="relative z-10 w-full mb-12">
        <PublicLeadIntakeForm />
      </div>

      {/* Footer Info */}
      <div className="max-w-2xl mx-auto w-full text-center text-xs text-[#64748b] relative z-10">
        <p>By submitting this form, you authorize our agents to contact you regarding your move.</p>
        <p className="mt-1 font-semibold text-[#111d23]">© 2026 Unique Movers. All rights reserved.</p>
      </div>
    </div>
  );
}
