import React from 'react';
import { GitBranch } from 'lucide-react';

const VERSIONS = [
  { key: 'v1', label: 'V1', description: '稳定版本' },
  { key: 'v2', label: 'V2', description: '增强版本' },
  { key: 'v3', label: 'V3', description: '最新版本' },
];

const VersionSelector = ({ value = 'v1', onChange, disabled = false, className = '' }) => {
  const activeValue = VERSIONS.some((version) => version.key === value) ? value : 'v1';

  return (
    <div className={`inline-flex items-center ${className}`}>
      <span className="text-xs text-gray-400 mr-2 select-none whitespace-nowrap inline-flex items-center gap-1">
        <GitBranch className="w-3.5 h-3.5" />
        执行版本
      </span>

      <div className="relative inline-flex items-center bg-gray-100 rounded-full p-0.5 border border-gray-200/60">
        {VERSIONS.map((version) => {
          const isActive = activeValue === version.key;

          return (
            <button
              key={version.key}
              type="button"
              aria-pressed={isActive}
              disabled={disabled}
              onClick={() => !disabled && onChange?.(version.key)}
              className={`
                relative z-10 min-w-10 px-3 py-1.5 rounded-full
                text-xs font-semibold transition-all duration-200 ease-out
                ${isActive
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-600 text-white shadow-md shadow-emerald-500/20'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/70'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              title={version.description}
            >
              {version.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default VersionSelector;
