import React from 'react';

const KPICard = ({ title, subtitle, value, valueSub, icon: Icon, iconBg = 'bg-page', iconColor = 'text-primary' }) => {
  return (
    <div className="bg-[#ffffff] rounded-2xl p-6 flex items-center gap-5 group hover:-translate-y-1 transition-transform duration-300">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg} ${iconColor}`}>
        <Icon size={24} strokeWidth={2.5} />
      </div>
      <div className="flex-1 w-full">
        <p className="text-sm font-medium text-body flex items-center gap-1.5">
          {title} 
          {subtitle && <span className="text-[0.625rem] uppercase tracking-wider text-disabled font-body">{subtitle}</span>}
        </p>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="font-heading text-2xl md:text-3xl font-bold text-primary">{value}</span>
          {valueSub && <span className="font-heading text-sm md:text-lg font-bold text-primary-tint">{valueSub}</span>}
        </div>
      </div>
    </div>
  );
};

export default KPICard;
