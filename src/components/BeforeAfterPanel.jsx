import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import {
  Box,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import ProtectedImage from './ProtectedImage';
import {
  parseOptimizationLog,
  formatVolume,
  formatStress,
  formatPercent,
} from '@/utils/optimizationLogParser';

const buildFileUrl = (input, conversationId, taskId) => {
  if (!input) return '';
  if (input.startsWith('/files/')) return input;
  const isImage = /\.(png|jpg|jpeg|gif)$/i.test(input);
  if (isImage) return `/files/${conversationId}/${taskId}/${input}`;
  return `/api/download_file?task_id=${taskId}&conversation_id=${conversationId}&file_name=${encodeURIComponent(input)}`;
};

const MetricCard = ({ label, before, after, formatter, lowerIsBetter, threshold }) => {
  const valid = before != null && after != null && !Number.isNaN(before) && !Number.isNaN(after);
  const delta = valid ? after - before : 0;
  const improved = lowerIsBetter ? delta < 0 : delta > 0;
  const violated = threshold != null && after > threshold;
  const Trend = improved ? TrendingDown : TrendingUp;
  const trendColor = !valid ? 'text-gray-400' : improved ? 'text-emerald-600' : 'text-red-500';

  return (
    <div className="flex flex-col bg-white p-3 rounded-lg border border-gray-200">
      <span className="text-xs text-gray-500 mb-1">{label}</span>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-sm font-mono text-gray-400 line-through">{formatter(before)}</span>
        <span className="text-gray-300">→</span>
        <span className={`text-base font-mono font-bold ${trendColor}`}>{formatter(after)}</span>
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        {valid && (
          <span className={`inline-flex items-center text-xs ${trendColor}`}>
            <Trend className="w-3 h-3 mr-0.5" />
            {formatPercent(before, after)}
          </span>
        )}
        {violated && (
          <span className="inline-flex items-center text-xs text-amber-600" title="超过许用应力">
            <AlertTriangle className="w-3 h-3 mr-0.5" />
            超限
          </span>
        )}
      </div>
    </div>
  );
};

const ModelSlot = ({ label, badge, imageSrc, placeholder, dimmed }) => (
  <div className="flex-1 min-w-0 flex flex-col">
    <div className="text-xs text-gray-600 mb-1 flex items-center gap-2">
      <span className="font-medium">{label}</span>
      {badge && (
        <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600">
          {badge}
        </span>
      )}
    </div>
    <div
      className={`aspect-video bg-gradient-to-b from-gray-50 to-gray-100 border border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden ${
        dimmed ? 'opacity-70' : ''
      }`}
    >
      {imageSrc ? (
        <ProtectedImage
          src={imageSrc}
          alt={label}
          className="max-w-full max-h-full object-contain"
        />
      ) : (
        <div className="flex flex-col items-center text-gray-400">
          <Box className="w-10 h-10 opacity-30" />
          <span className="text-[11px] mt-2">{placeholder || '等待数据'}</span>
        </div>
      )}
    </div>
  </div>
);

/**
 * 设计优化"前后对比"面板（MVP）
 *
 * 数据来源：
 *   - 数值：从 message.content（流式日志文本）正则解析（参考 utils/optimizationLogParser）
 *   - 截图：从 message.parts 里 altText === 'screenshot' 的图片，按时间顺序首/末两张占位
 *   - 3D 模型槽：占位，等后端补 metadata.initial_stl_file / stl_file 字段
 *
 * 若无任何可解析数据 → 返回 null，不渲染
 */
const BeforeAfterPanel = ({ message, conversationId, taskId }) => {
  const [collapsed, setCollapsed] = useState(false);

  const analysis = useMemo(
    () => parseOptimizationLog(message?.content),
    [message?.content]
  );

  const screenshots = useMemo(() => {
    if (!message?.parts) return [];
    return message.parts.filter((p) => p.type === 'image' && p.altText === 'screenshot');
  }, [message?.parts]);

  const hasMetrics = !!(analysis.initial && analysis.best);
  const hasScreenshots = screenshots.length > 0;

  if (!hasMetrics && !hasScreenshots) return null;

  const firstShot = screenshots[0];
  const lastShot = screenshots[screenshots.length - 1];
  const beforeImg = firstShot
    ? buildFileUrl(firstShot.imageUrl || firstShot.fileName, conversationId, taskId)
    : '';
  const afterImg = lastShot && lastShot !== firstShot
    ? buildFileUrl(lastShot.imageUrl || lastShot.fileName, conversationId, taskId)
    : '';

  return (
    <Card className="border-gray-200 shadow-sm bg-white">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-4 py-2 border-b bg-gradient-to-r from-emerald-50 to-white hover:bg-emerald-50/70 transition-colors"
      >
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-semibold text-gray-700">优化前后对比</span>
          {analysis.history.length > 0 && (
            <span className="text-[11px] text-gray-500">
              已迭代 {analysis.history.length} 代 · {analysis.simulations.length} 次仿真
            </span>
          )}
        </div>
        {collapsed ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {!collapsed && (
        <div className="p-4 space-y-4">
          {/* 3D 模型槽（壳子：当前用截图占位，预留双 viewer 位置） */}
          <div className="flex items-stretch gap-3">
            <ModelSlot
              label="优化前 (Before)"
              badge="初始"
              imageSrc={beforeImg}
              placeholder="待上传模型预览"
              dimmed
            />
            <div className="self-center text-xl text-gray-300 select-none px-1">⇄</div>
            <ModelSlot
              label="优化后 (After)"
              badge={analysis.best?.generation ? `gen ${analysis.best.generation}` : 'best'}
              imageSrc={afterImg || beforeImg}
              placeholder="待生成预览"
            />
          </div>

          {/* 数值对比卡 */}
          {hasMetrics && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <MetricCard
                label="结构体积"
                before={analysis.initial?.volume}
                after={analysis.best?.volume}
                formatter={formatVolume}
                lowerIsBetter
              />
              <MetricCard
                label="最大应力"
                before={analysis.initial?.stress}
                after={analysis.best?.stress}
                formatter={formatStress}
                lowerIsBetter
                threshold={analysis.settings?.permissibleStress}
              />
            </div>
          )}

          {/* 算法配置一览 */}
          {analysis.settings?.method && (
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 px-1">
              <span>算法 <b className="text-gray-700">{analysis.settings.method}</b></span>
              {analysis.settings.generations != null && (
                <span>代数 <b className="text-gray-700">{analysis.settings.generations}</b></span>
              )}
              {analysis.settings.population != null && (
                <span>种群 <b className="text-gray-700">{analysis.settings.population}</b></span>
              )}
              {analysis.settings.permissibleStress != null && (
                <span>许用应力 <b className="text-gray-700">{formatStress(analysis.settings.permissibleStress)}</b></span>
              )}
            </div>
          )}

          {/* 待后端补字段提示 */}
          <div className="flex items-start gap-1.5 text-[10px] text-gray-400 leading-relaxed px-1">
            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>
              当前为 MVP 视图：3D 双视图模型对比预留位置，待后端在 message_end 的 metadata 中提供
              <code className="px-1 mx-0.5 bg-gray-100 rounded text-gray-600">initial_stl_file</code>
              与
              <code className="px-1 mx-0.5 bg-gray-100 rounded text-gray-600">stl_file</code>
              字段后启用真实 STL 渲染。
            </span>
          </div>
        </div>
      )}
    </Card>
  );
};

export default BeforeAfterPanel;
