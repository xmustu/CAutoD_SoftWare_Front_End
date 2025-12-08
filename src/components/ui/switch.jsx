import React from 'react';

const Switch = React.forwardRef(({ className, checked, onCheckedChange, ...props }, ref) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    data-state={checked ? "checked" : "unchecked"}
    onClick={() => onCheckedChange?.(!checked)}
    ref={ref}
    className={`
      peer inline-flex h-[20px] w-[36px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50
      ${checked ? 'bg-indigo-600' : 'bg-gray-200'}
      ${className || ''}
    `}
    {...props}
  >
    <span
      data-state={checked ? "checked" : "unchecked"}
      className={`
        pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform
        ${checked ? 'translate-x-4' : 'translate-x-0'}
      `}
    />
  </button>
));

Switch.displayName = "Switch";

export { Switch };