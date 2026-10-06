import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { toast as sonnerToast } from 'sonner';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {

  const showToast = useCallback((message, type = 'success', duration = 4000) => {
    const options = { duration };
    if (type === 'success') {
      sonnerToast.success(message, options);
    } else if (type === 'error') {
      sonnerToast.error(message, options);
    } else if (type === 'warning') {
      sonnerToast.warning(message, options);
    } else if (type === 'info') {
      sonnerToast.info(message, options);
    } else {
      sonnerToast(message, options);
    }
  }, []);

  const hideToast = useCallback(() => {
    sonnerToast.dismiss();
  }, []);

  useEffect(() => {
    const onForbidden = (event) => {
      const message = event?.detail?.message || 'You do not have permission for that action.';
      showToast(message, 'warning', 3500);
    };
    window.addEventListener('app:forbidden', onForbidden);
    return () => window.removeEventListener('app:forbidden', onForbidden);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ toast: null, showToast, hideToast }}>
      {children}
    </ToastContext.Provider>
  );
};
