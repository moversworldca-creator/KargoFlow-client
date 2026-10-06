import React from 'react';
import { Megaphone } from 'lucide-react';

const Marketing = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-content-sec">
      <Megaphone size={64} className="mb-4 opacity-20" />
      <h1 className="text-2xl font-bold text-heading mb-2">Marketing Center</h1>
      <p>This module is currently under development.</p>
    </div>
  );
};

export default Marketing;
