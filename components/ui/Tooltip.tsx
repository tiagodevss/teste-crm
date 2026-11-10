import React, { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

export interface TooltipProps {
  /** Conteúdo do tooltip (texto ou ReactNode). */
  content: React.ReactNode;
  /** Elemento que dispara o tooltip ao hover/focus. Se não informado, usa ícone de informação. */
  children?: React.ReactNode;
  /** Posição do tooltip em relação ao trigger. */
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** Classe adicional no container do trigger. */
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  placement = 'top',
  className = '',
}) => {
  const [visible, setVisible] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setVisible(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [visible]);

  const trigger = children ?? (
    <Info size={14} className="text-gray-400 hover:text-salesforce-blue shrink-0" aria-hidden />
  );

  const placementClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <span
      ref={triggerRef}
      role={children ? undefined : 'img'}
      aria-label={children ? undefined : 'Informação'}
      tabIndex={children ? undefined : 0}
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {trigger}
      {visible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={`absolute z-[100] px-3 py-2 text-xs font-medium text-white bg-gray-900 rounded-lg shadow-lg whitespace-normal max-w-[240px] animate-fade-in pointer-events-none ${placementClasses[placement]}`}
        >
          {content}
        </div>
      )}
    </span>
  );
};
