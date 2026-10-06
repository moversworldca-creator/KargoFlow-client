import { useEffect } from 'react';

/**
 * Custom hook to manage modal ergonomics:
 * - Locks body scroll when open
 * - Closes on 'Escape' keypress
 * @param {boolean} isOpen Whether modal is currently open
 * @param {Function} onClose Callback invoked to close modal
 */
export function useModal(isOpen, onClose) {
  useEffect(() => {
    if (!isOpen) return;

    // Save previous overflow style
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);
}

export default useModal;
