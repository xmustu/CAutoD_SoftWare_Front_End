import React, { useMemo, useState } from 'react';
import {
  Box,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronRight,
  X,
  Clock,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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

// =====================================================================
// 1. 顶部 KPI 状态条（始终可见）
// =====================================================================

const KpiBadge = ({ label, before, after, formatter, lowerIsBetter, threshold }) => {
  const valid = before != null && after != null && !Number.isNaN(before) && !Number.isNaN(after);
  if (!valid) return null;
  const delta = after - before;
  const improved = lowerIsBetter ? delta < 0 : delta > 0;
  const violated = threshold != null && after > threshold;
  const Trend = improved ? TrendingDown : TrendingUp;

  const color = violated
    ? 'text-amber-600 bg-amber-50 border-amber-200'
    : improved
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
      : 'text-red-600 bg-red-50 border-red-200';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border ${color}`}>
      <span className="text-gray-500">{label}</span>
      <Trend className="w-3 h-3" />
      <span className="font-mono font-semibold">{formatPercent(before, after)}</span>
      {violated && <AlertTriangle className="w-3 h-3" title="超过许用应力" />}
    </span>
  );
};

const KpiBar = ({ analysis, onOpen }) => {
  const completed = analysis.isComplete;
  const hasMetrics = !!(analysis.initial && analysis.best);

  if (!hasMetrics) return null;

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 bg-gradient-to-r from-emerald-50 via-white to-white border-y border-emerald-100">
      <div className="flex items-center gap-3 min-w-0 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 shrink-0">
          {completed ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          {completed ? '优化完成' : '优化中'}
        </span>

        <KpiBadge
          label="体积"
          before={analysis.initial?.volume}
          after={analysis.best?.volume}
          formatter={formatVolume}
          lowerIsBetter
        />
        <KpiBadge
          label="应力"
          before={analysis.initial?.stress}
          after={analysis.best?.stress}
          formatter={formatStress}
          lowerIsBetter
          threshold={analysis.settings?.permissibleStress}
        />

        {analysis.duration != null && (
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            {analysis.duration.toFixed(1)}s
          </span>
        )}

        {analysis.history.length > 0 && (
          <span className="text-xs text-gray-400 shrink-0">
            {analysis.history.length} 代 · {analysis.simulations.length} 次仿真
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-white border border-emerald-200 rounded-full hover:bg-emerald-50 hover:border-emerald-400 transition-colors shrink-0"
      >
        查看详情
        <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
};

// =====================================================================
// 2. 详情 Drawer 内部组件
// =====================================================================

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
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        {valid && (
          <span className={`inline-flex items-center text-xs ${trendColor}`}>
            <Trend className="w-3 h-3 mr-0.5" />
            {formatPercent(before, after)}
          </span>
        )}
        {violated && (
          <span className="inline-flex items-center text-xs text-amber-600">
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

const DetailContent = ({ analysis, beforeImg, afterImg }) => (
  <div className="space-y-4">
    {/* 双 ModelSlot（3D 视图壳子） */}
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
    {analysis.initial && analysis.best && (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MetricCard
          label="结构体积"
          before={analysis.initial.volume}
          after={analysis.best.volume}
          formatter={formatVolume}
          lowerIsBetter
        />
        <MetricCard
          label="最大应力"
          before={analysis.initial.stress}
          after={analysis.best.stress}
          formatter={formatStress}
          lowerIsBetter
          threshold={analysis.settings?.permissibleStress}
        />
      </div>
    )}

    {/* 最优参数表（若解析到） */}
    {analysis.finalResult?.params && analysis.finalResult.params.length > 0 && (
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <div className="text-xs text-gray-500 mb-2 font-medium">最优参数</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {analysis.finalResult.params.map((p) => (
            <div key={p.name} className="flex justify-between border-b border-gray-100 py-0.5">
              <span className="text-gray-600 font-mono truncate" title={p.name}>{p.name}</span>
              <span className="font-mono text-gray-800">{p.value.toFixed(6)}</span>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* 算法配置 */}
    {analysis.settings?.method && (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500 px-1">
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
        {analysis.constraintSatisfied === true && (
          <span className="inline-flex items-center gap-0.5 text-emerald-600">
            <CheckCircle2 className="w-3 h-3" /> 符合约束
          </span>
        )}
        {analysis.constraintSatisfied === false && (
          <span className="inline-flex items-center gap-0.5 text-amber-600">
            <AlertTriangle className="w-3 h-3" /> 不符合约束
          </span>
        )}
      </div>
    )}

    {/* 待后端字段提示 */}
    <div className="flex items-start gap-1.5 text-[10px] text-gray-400 leading-relaxed px-1 pt-2 border-t border-gray-100">
      <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
      <span>
        3D 双视图模型对比预留位置，待后端在 message_end 的 metadata 中提供
        <code className="px-1 mx-0.5 bg-gray-100 rounded text-gray-600">initial_stl_file</code>
        与
        <code className="px-1 mx-0.5 bg-gray-100 rounded text-gray-600">stl_file</code>
        字段后启用真实 STL 渲染。
      </span>
    </div>
  </div>
);

// =====================================================================
// 3. 主组件：顶部 KPI 条 + 详情 Dialog
// =====================================================================

const BeforeAfterPanel = ({ message, conversationId, taskId }) => {
  const [open, setOpen] = useState(false);

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
    <>
      <KpiBar analysis={analysis} onOpen={() => setOpen(true)} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-5 py-3 border-b bg-gradient-to-r from-emerald-50 to-white">
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <TrendingDown className="w-4 h-4" />
              优化前后对比
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              查看体积/应力变化、最优参数与算法配置。3D 双视图待后端 STL 字段接入。
            </DialogDescription>
          </DialogHeader>
          <div className="p-5">
            <DetailContent analysis={analysis} beforeImg={beforeImg} afterImg={afterImg} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BeforeAfterPanel;
