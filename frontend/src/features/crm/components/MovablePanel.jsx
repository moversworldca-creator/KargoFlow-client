import React, { useState, useEffect, useRef } from 'react';
import { X, GripHorizontal } from 'lucide-react';

export default function MovablePanel({ children, title, onClose, isOpen }) {
  const [position, setPosition] = useState({ x: window.innerWidth - 360, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);
  const offsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!isOpen) return;
    
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      const newX = e.clientX - offsetRef.current.x;
      const newY = e.clientY - offsetRef.current.y;
      
      // Keep within bounds
      const boundedX = Math.max(0, Math.min(newX, window.innerWidth - 320));
      const boundedY = Math.max(0, Math.min(newY, window.innerHeight - 100));
      
      setPosition({ x: boundedX, y: boundedY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isOpen]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    offsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
        width: '320px',
      }}
      className="bg-white border-2 border-primary/20 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200"
    >
      <div
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between px-4 py-2 bg-primary/5 cursor-move border-b border-primary/10"
      >
        <div className="flex items-center gap-2">
          <GripHorizontal size={14} className="text-primary/40" />
          <span className="text-[0.625rem] font-black uppercase tracking-widest text-primary">
            {title}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-primary/10 rounded-lg text-primary transition-colors"
        >
          <X size={14} />
        </button>
      </div>
      <div className="p-0">
        {children}
      </div>
    </div>
  );
}
