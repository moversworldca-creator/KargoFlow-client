import React from 'react';
import Card from './Card'; // Assuming Card is in the same shared/ui directory

const SectionCard = ({ icon: Icon, title, description, children, className = "" }) => (
  <Card className={`rounded-[2rem] border border-[#dce8f1] bg-white p-6 shadow-sm ${className}`}>
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#edf8f4] text-[#00513f]">
        <Icon size={18} />
      </div>
      <div>
        <h4 className="font-display text-lg font-bold text-[#111d23]">{title}</h4>
        <p className="text-sm text-[#60727b]">{description}</p>
      </div>
    </div>
    <div className="mt-5">{children}</div>
  </Card>
);

export default SectionCard;
