import React from 'react';
import { Info } from 'lucide-react';

export interface PermissionFeedbackProps {
  message: string;
  className?: string;
}

export const PermissionFeedback: React.FC<PermissionFeedbackProps> = ({ message, className = '' }) => (
  <div className={`flex items-center gap-1 text-xs text-gray-500 italic ${className}`}>
    <Info size={14} className="text-gray-400" aria-hidden />
    <span>{message}</span>
  </div>
);
