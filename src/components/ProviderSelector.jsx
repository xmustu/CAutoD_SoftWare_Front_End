import React from 'react';
import { Bot, Workflow } from 'lucide-react';

/**
 * Provider 选择器组件 — 切换 Agent / Dify 执行提供方
 *
 * @param {string}   value    - 当前选中的 provider ('agent' | 'dify')
 * @param {function} onChange - 切换回调
 * @param {boolean}  disabled - 是否禁用（如流式传输中）
 * @param {string}   className - 额外样式类名
 */
const PROVIDERS = [
  {
    key: 'agent',
    label: 'Agent',
    icon: Bot,
    description: '智能体执行',
    color: 'from-blue-500 to-indigo-600',
    activeText: 'text-white',
    activeShadow: 'shadow-blue-500/30',
  },
  {
    key: 'dify',
    label: 'Dify',
    icon: Workflow,
    description: '工作流执行',
    color: 'from-violet-500 to-purple-600',
    activeText: 'text-white',
    activeShadow: 'shadow-violet-500/30',
  },
];

const ProviderSelector = ({ value = 'agent', onChange, disabled = false, className = '' }) => {
  const activeIndex = PROVIDERS.findIndex((p) => p.key === value);

  return (
    <div className={`inline-flex items-center ${className}`}>
      {/* 标签 */}
      <span className="text-xs text-gray-400 mr-2 select-none whitespace-nowrap">执行方式</span>

      {/* 切换容器 */}
      <div className="relative inline-flex items-center bg-gray-100 rounded-full p-0.5 border border-gray-200/60">
        {/* 滑动背景 */}
        <div
          className={`
            absolute top-0.5 bottom-0.5 rounded-full
            bg-gradient-to-r ${PROVIDERS[activeIndex]?.color || PROVIDERS[0].color}
            shadow-md ${PROVIDERS[activeIndex]?.activeShadow || ''}
            transition-all duration-300 ease-out
          `}
          style={{
            width: `calc(50% - 2px)`,
            left: activeIndex === 0 ? '2px' : 'calc(50%)',
          }}
        />

        {/* 选项按钮 */}
        {PROVIDERS.map((provider) => {
          const isActive = value === provider.key;
          const Icon = provider.icon;

          return (
            <button
              key={provider.key}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onChange?.(provider.key)}
              className={`
                relative z-10 flex items-center gap-1.5
                px-3 py-1.5 rounded-full
                text-xs font-medium
                transition-all duration-300 ease-out
                ${isActive
                  ? `${provider.activeText} scale-[1.02]`
                  : 'text-gray-500 hover:text-gray-700'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              title={provider.description}
            >
              <Icon
                className={`w-3.5 h-3.5 transition-transform duration-300 ${
                  isActive ? 'scale-110' : ''
                }`}
              />
              <span>{provider.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ProviderSelector;
