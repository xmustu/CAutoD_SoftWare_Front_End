import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings2, X, Play, Move, ZoomIn, Loader2 } from 'lucide-react'; 
import ProtectedImage from '@/components/ProtectedImage';

// 定义固定参数配置
const fixedParamsDefinitions = [
  { name: 'permissible_stress', initialValue: 355000000, isStress: true, label: '最大应力(mN)' },
  { name: 'method', initialValue: 'GA', isSelect: true, options: ['GA', 'HA'], label: '优化方法' },
  { name: 'generations', initialValue: 6, isSelect: true, options: [...Array.from({ length: 10 }, (_, i) => i + 1), 20, 30, 50], label: '代数' },
  { name: 'population_size', initialValue: 7, isSelect: true, options: [...Array.from({ length: 10 }, (_, i) => i + 1), 20, 30, 50], label: '种群数量' },
];

const OptimizationConfigModal = ({ 
  isOpen, 
  onClose, 
  params, 
  onSubmit, 
  isTaskRunning, // 这个 props 在这里已经不再用于禁用输入了，仅作为参考
  displayedImages 
}) => {
  // --- 状态定义 ---
  const [extendedParams, setExtendedParams] = useState([]);
  const [checkedParams, setCheckedParams] = useState({});
  const [ranges, setRanges] = useState({});
  const [fixedValues, setFixedValues] = useState({});
  
  // 💥 是否已初始化的标记 (快照锁定)
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // 💥 新增：本地提交状态 (防止重复点击，但不依赖外部的 isTaskRunning)
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- 图片预览和拖拽状态 ---
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, initialX: 0, initialY: 0 });
  const manualOverridesRef = useRef({});

  // -------------------------------------------------------------------
  // 核心初始化逻辑：快照锁定 (Snapshot Lock)
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!isOpen) {
        setHasInitialized(false);
        setIsSubmitting(false); // 重置提交状态
        return;
    }

    if (hasInitialized) return;
    if (!params || params.length === 0) return;

    console.log("OptimizationConfigModal: Initializing form snapshot...");

    const extractedParams = params.filter(p => !fixedParamsDefinitions.some(fp => fp.name === p.name));
    const combinedParams = [...extractedParams];

    fixedParamsDefinitions.forEach(fixedParam => {
        const existingParam = params.find(p => p.name === fixedParam.name);
        if (existingParam) {
            combinedParams.push({ ...existingParam, ...fixedParam });
        } else {
            combinedParams.push(fixedParam);
        }
    });

    setExtendedParams(combinedParams);

    const initialChecked = {};
    combinedParams.forEach(param => initialChecked[param.name] = true);
    setCheckedParams(initialChecked);

    const initialFixedValues = {};
    fixedParamsDefinitions.forEach(fixedParam => {
        const existing = params.find(p => p.name === fixedParam.name);
        const val = existing ? (existing.value || existing.initialValue) : fixedParam.initialValue;
        initialFixedValues[fixedParam.name] = String(val || '');
    });
    setFixedValues(initialFixedValues);

    const initialRanges = {};
    combinedParams.forEach(param => {
        if (!param.isSelect && !param.isStress) {
            initialRanges[param.name] = {
                min: param.min ?? (param.initialValue ?? ''),
                max: param.max ?? (param.initialValue ?? '')
            };
        }
    });
    setRanges(initialRanges);

    setHasInitialized(true);

  }, [isOpen, params]); 

  // -------------------------------------------------------------------
  // 智能推荐逻辑
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!hasInitialized || extendedParams.length === 0) return;

    const optimizableParamNames = extendedParams
      .filter(p => !fixedParamsDefinitions.some(fp => fp.name === p.name))
      .map(p => p.name);

    const checkedOptimizableParamsCount = optimizableParamNames.filter(name => checkedParams[name]).length;
    
    let recommendedPopulationSize = 7;
    let recommendedGenerations = 6;

    if (checkedOptimizableParamsCount >= 5 && checkedOptimizableParamsCount <= 8) {
      recommendedPopulationSize = 20;
      recommendedGenerations = 30;
    } else if (checkedOptimizableParamsCount > 8) {
      recommendedPopulationSize = 30;
      recommendedGenerations = 50;
    }

    setFixedValues(prev => {
        const isPopModified = manualOverridesRef.current['population_size'];
        const isGenModified = manualOverridesRef.current['generations'];
        
        const newPopulationSize = isPopModified ? prev.population_size : String(recommendedPopulationSize);
        const newGenerations = isGenModified ? prev.generations : String(recommendedGenerations);

        if (prev.generations === newGenerations && prev.population_size === newPopulationSize) return prev;

        return { 
            ...prev, 
            population_size: newPopulationSize, 
            generations: newGenerations 
        };
    });
  }, [checkedParams]); 

  // --- 拖拽处理逻辑 ---
  const handleDragStart = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('button')) return;

    dragRef.current.isDragging = true;
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
    dragRef.current.initialX = position.x;
    dragRef.current.initialY = position.y;

    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  };

  const handleDragMove = (e) => {
    if (!dragRef.current.isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    
    setPosition({
      x: dragRef.current.initialX + dx,
      y: dragRef.current.initialY + dy
    });
  };

  const handleDragEnd = () => {
    dragRef.current.isDragging = false;
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
  };

  // --- 表单处理函数 ---
  const handleRangeChange = (paramName, bound, value) => {
    setRanges(prev => ({ ...prev, [paramName]: { ...prev[paramName], [bound]: value } }));
  };

  const handleCheckboxChange = (paramName) => {
    setCheckedParams(prev => ({ ...prev, [paramName]: !prev[paramName] }));
  };

  // 💥 核心修复：提交函数逻辑更新
  const handleInternalSubmit = async () => {
    setIsSubmitting(true); // 开始 loading
    try {
      const submissionParams = {};
      extendedParams.forEach(param => {
        if (checkedParams[param.name]) {
          if (param.isSelect || param.isStress) {
            submissionParams[param.name] = { value: param.isStress ? parseFloat(fixedValues[param.name]) : fixedValues[param.name] };
          } else {
            submissionParams[param.name] = {
              min: parseFloat(ranges[param.name]?.min),
              max: parseFloat(ranges[param.name]?.max),
            };
          }
        }
      });
      // 等待父组件处理完毕
      await onSubmit(submissionParams);
      onClose();
    } catch (e) {
      console.error("Submission failed", e);
    } finally {
      setIsSubmitting(false); // 结束 loading
    }
  };

  const currentScreenshot = displayedImages && displayedImages.length > 0 ? displayedImages[displayedImages.length - 1] : null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose} modal={true}>
        <DialogContent 
          className="max-w-5xl h-[85vh] flex flex-col p-0 overflow-hidden shadow-2xl border-2 border-gray-200"
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px)`,
            transition: dragRef.current.isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
          onPointerDownOutside={(e) => e.preventDefault()} 
        >
          <DialogHeader 
            className="px-6 py-4 border-b bg-gray-50 cursor-move select-none active:bg-gray-100 transition-colors"
            onMouseDown={handleDragStart}
          >
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Settings2 className="w-5 h-5" />
              设计优化参数配置
              <div className="flex items-center text-xs font-normal text-gray-400 ml-2 opacity-70">
                <Move className="w-3 h-3 mr-1" />
                (按住此处拖动)
              </div>
            </DialogTitle>
            <DialogDescription>
              左侧为当前模型状态（点击图片可放大），右侧调整优化边界与算法参数。
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* 左侧：可视化反馈区域 */}
            <div className="w-full md:w-5/12 bg-gray-100 flex flex-col items-center justify-center p-4 border-r relative group">
              <div className="absolute top-2 left-2 bg-white/80 px-2 py-1 rounded text-xs text-gray-600 font-mono z-10">
                Model Preview
              </div>
              {currentScreenshot ? (
                <div 
                  className="relative cursor-zoom-in overflow-hidden rounded border bg-white shadow-sm transition-transform hover:scale-[1.02] max-h-full max-w-full flex items-center justify-center"
                  onClick={() => setIsPreviewOpen(true)}
                >
                  <ProtectedImage
                    src={currentScreenshot.imageUrl}
                    alt="Optimization State"
                    className="max-w-full max-h-[60vh] object-contain"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center transition-all pointer-events-none">
                    <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 drop-shadow-md" />
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 flex flex-col items-center">
                  <div className="w-24 h-24 bg-gray-200 rounded-lg mb-2 animate-pulse" />
                  <span>暂无模型预览</span>
                </div>
              )}
            </div>

            {/* 右侧：参数滚动区域 */}
            <div className="w-full md:w-7/12 overflow-y-auto p-6 bg-white">
              <div className="grid grid-cols-[auto_2fr_1fr_1fr] gap-x-4 gap-y-4 items-center mb-2 sticky top-0 bg-white z-10 pb-2 border-b">
                <div className="w-4" />
                <div className="text-sm font-semibold text-gray-700">参数名称</div>
                <div className="text-center text-sm font-semibold text-gray-700">下界/值</div>
                <div className="text-center text-sm font-semibold text-gray-700">上界</div>
              </div>

              <div className="space-y-3">
                {extendedParams.map(param => (
                  <div key={param.name} className="grid grid-cols-[auto_2fr_1fr_1fr] items-center gap-x-3 hover:bg-gray-50 p-1 rounded transition-colors">
                    <Checkbox
                      id={`check-${param.name}`}
                      checked={!!checkedParams[param.name]}
                      onCheckedChange={() => handleCheckboxChange(param.name)}
                      // 💥 移除了 isTaskRunning
                      disabled={param.isStress || param.isSelect}
                    />
                    <div className="flex flex-col">
                      <label htmlFor={`check-${param.name}`} className="font-medium text-sm truncate cursor-pointer" title={param.name}>
                        {param.label || param.name}
                      </label>
                      <span className="text-[10px] text-gray-400 font-mono truncate">{param.name}</span>
                    </div>
                    
                    {param.isSelect ? (
                      <div className="col-span-2">
                        <Select
                          value={fixedValues[param.name] ? String(fixedValues[param.name]) : ''}
                          onValueChange={(value) => {
                            manualOverridesRef.current[param.name] = true;
                            setFixedValues(prev => ({ ...prev, [param.name]: value }));
                          }}
                          // 💥 移除了 disabled={isTaskRunning}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="选择..." />
                          </SelectTrigger>
                          <SelectContent>
                            {param.options.map(opt => <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : param.isStress ? (
                      <div className="col-span-2">
                        <Input
                          type="number"
                          className="h-8"
                          value={fixedValues[param.name] || ''}
                          onChange={e => setFixedValues(prev => ({ ...prev, [param.name]: e.target.value }))}
                          // 💥 移除了 isTaskRunning
                          disabled={!checkedParams[param.name]}
                        />
                      </div>
                    ) : (
                      <>
                        <Input
                          type="number"
                          className="h-8 text-center"
                          value={ranges[param.name]?.min || ''}
                          onChange={e => handleRangeChange(param.name, 'min', e.target.value)}
                          // 💥 移除了 isTaskRunning
                          disabled={!checkedParams[param.name]}
                        />
                        <Input
                          type="number"
                          className="h-8 text-center"
                          value={ranges[param.name]?.max || ''}
                          onChange={e => handleRangeChange(param.name, 'max', e.target.value)}
                          // 💥 移除了 isTaskRunning
                          disabled={!checkedParams[param.name]}
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center sm:justify-between">
            <Button variant="outline" onClick={onClose} className="flex items-center gap-2">
              <X className="w-4 h-4" /> 取消
            </Button>
            <div className='flex gap-2'>
              {/* 💥 核心修复：提交按钮现在只依赖本地的 isSubmitting，
                  彻底摆脱了父组件 isTaskRunning 的干扰！
              */}
              <Button 
                onClick={handleInternalSubmit} 
                disabled={isSubmitting} 
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 px-8"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Play className="w-4 h-4" />} 
                {isSubmitting ? '提交中...' : '提交并开始运行'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-none bg-transparent shadow-none flex items-center justify-center outline-none">
          {currentScreenshot && (
            <div className="relative flex flex-col items-center">
              <ProtectedImage 
                src={currentScreenshot.imageUrl} 
                alt="Full Preview" 
                className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl border-2 border-white object-contain bg-black/50"
              />
              <Button 
                size="icon" 
                className="absolute -top-4 -right-4 rounded-full bg-white text-black hover:bg-gray-200 shadow-lg border"
                onClick={() => setIsPreviewOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OptimizationConfigModal;