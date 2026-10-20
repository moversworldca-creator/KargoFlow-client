import React from 'react';

const Card = ({ children, className = '', title, extraHeader, ...props }) => {
  return (
    <div className={`bg-brand-surface rounded-2xl p-6 ${className}`} {...props}>
      {(title || extraHeader) && (
        <div className="flex justify-between items-center mb-6">
          {title && <h3 className="text-lg font-bold text-content-main">{title}</h3>}
          {extraHeader}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
