import React from 'react';
import useCan from './useCan';

const Can = ({ all, any, fallback = null, children }) => {
  const { canAll, canAny } = useCan();

  if (all && !canAll(all)) return fallback;
  if (any && !canAny(any)) return fallback;
  return children;
};

export default Can;
