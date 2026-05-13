import React from 'react';
import { Input } from '@/components/ui/input';
import { Lightbulb, Check } from 'lucide-react';

/**
 * 数值输入 + 推荐值徽章
 *
 * 用于既需要用户手动输入、又希望系统给出推荐值的场景（如 generations / population_size）。
 * 当输入值与推荐值一致时显示"已应用"，否则显示"应用"按钮让用户一键采用推荐值。
 *
 * @param {string|number} value          当前值
 * @param {(v: string) => void} onChange 值变更回调（传入字符串，由调用方决定转换）
 * @param {number|string} recommended    推荐值
 * @param {string} reason                推荐来源（hover tooltip）
 * @param {boolean} disabled             是否禁用
 * @param {number} min                   最小值约束
 * @param {number} max                   最大值约束
 * @param {string} placeholder           占位符
 */
const RecommendedNumberInput = ({
  value,
  onChange,
  recommended,
  reason,
  disabled = false,
  min,
  max,
  placeholder,
}) => {
  const num = Number(value);
  const rec = Number(recommended);
  const hasRecommended = recommended !== undefined && recommended !== null && recommended !== '';
  const isApplied = hasRecommended && !Number.isNaN(num) && num === rec;

  return (
    <div className="flex items-center gap-2 min-w-0">
      <Input
        type="number"
        className="h-8 w-20 text-center flex-shrink-0"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        min={min}
        max={max}
        placeholder={placeholder}
      />
      {hasRecommended && (
        <div className="flex items-center gap-1 min-w-0">
          <span
            className="inline-flex items-center gap-0.5 text-[11px] text-gray-500 whitespace-nowrap"
            title={reason || '系统推荐值'}
          >
            <Lightbulb className="w-3 h-3 text-amber-500" />
            推荐
            <span className="font-semibold text-indigo-600 ml-0.5">{recommended}</span>
          </span>
          {isApplied ? (
            <span className="inline-flex items-center gap-0.5 text-[11px] text-green-600 font-medium whitespace-nowrap">
              <Check className="w-3 h-3" />
              已应用
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onChange(String(recommended))}
              disabled={disabled}
              className="text-[11px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              title="使用系统推荐值"
            >
              应用
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default RecommendedNumberInput;
