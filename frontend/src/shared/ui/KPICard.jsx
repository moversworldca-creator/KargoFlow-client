import React from 'react';

const KPICard = ({ title, subtitle, value, valueSub, icon: Icon, iconBg = 'bg-page', iconColor = 'text-primary' }) => {
  return (
    <div className="bg-[#ffffff] rounded-2xl p-4 sm:p-5 lg:p-6 flex items-center gap-3.5 sm:gap-4 lg:gap-5 group hover:-translate-y-1 transition-transform duration-300">
      <div className={`w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl flex items-center justify-center flex-shrink-0 ${iconBg} ${iconColor}`}>
        <Icon className="w-5 h-5 sm:w-5.5 sm:h-5.5 lg:w-6 lg:h-6" strokeWidth={2.5} />
      </div>
      <div className="flex-1 w-full min-w-0">
        <p className="text-xs sm:text-sm font-medium text-body flex items-center gap-1.5 truncate">
          {title} 
          {subtitle && <span className="text-[0.625rem] uppercase tracking-wider text-disabled font-body shrink-0">{subtitle}</span>}
        </p>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="font-heading text-xl sm:text-2xl lg:text-3xl font-bold text-primary">{value}</span>
          {valueSub && <span className="font-heading text-xs sm:text-sm lg:text-base font-bold text-primary-tint">{valueSub}</span>}
        </div>
      </div>
    </div>
  );
};

export default KPICard;
