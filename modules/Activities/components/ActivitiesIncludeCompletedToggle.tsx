import React from 'react';

interface ActivitiesIncludeCompletedToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function ActivitiesIncludeCompletedToggle({
  checked,
  onChange,
}: ActivitiesIncludeCompletedToggleProps) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer min-h-[44px] sm:min-h-0">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-gray-300 text-salesforce-blue focus:ring-salesforce-blue/30"
      />
      Incluir concluídos
    </label>
  );
}
