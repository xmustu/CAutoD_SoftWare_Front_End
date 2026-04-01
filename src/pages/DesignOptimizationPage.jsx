import React, { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { executeTaskAPI, submitOptimizationParamsAPI } from '@/api/taskAPI';
import { uploadFileAPI } from '@/api/fileAPI.js';
import { Upload } from 'lucide-react';
import { Settings2 } from 'lucide-react';
import { Move } from 'lucide-react';
import useConversationStore from '@/store/conversationStore';
import ConversationDisplay from '@/components/ConversationDisplay.jsx';
import InteractiveFileUpload from '@/components/InteractiveFileUpload.jsx';
import QueueStatusBanner from '@/components/QueueStatusBanner.jsx';
import ProtectedImage from '@/components/ProtectedImage'; // 导入 ProtectedImage 组件
import OptimizationConfigModal from '@/components/OptimizationConfigModal';
import FloatingConfigButton from '@/components/FloatingConfigButton';
// import { listenOptimizationSSE } from "@/api/conversationapi";
// import { getOptimizationQueue } from "@/api/conversationapi";
import axios from 'axios';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Clock } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";

const ConversationSelector = () => {
  const { conversations, activeConversationId, setActiveConversationId } = useConversationStore();

  if (conversations.length === 0) {
    return <p className="text-center text-gray-500">请先创建一个对话。</p>;
  }

  return (
    <div className="mb-4">
      <Select value={activeConversationId} onValueChange={setActiveConversationId}>
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="请选择一个会话" />
        </SelectTrigger>
        <SelectContent>
          {conversations.map(conv => (
            <SelectItem key={conv.conversation_id} value={conv.conversation_id}>
              {conv.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
const WorkflowGuide = ({ queueLength, runningTasks }) => {
  return (
    <div className="text-left max-w-2xl mx-auto bg-green-50 p-4 rounded-lg border border-green-200 mb-8">
      <h2 className="text-lg font-semibold text-green-800 mb-2">第二步：设计优化</h2>
      <ol className="list-decimal list-inside text-gray-700 space-y-1">
        <li>请先在【几何建模】页面完成初始模型的设计和导出。</li>
        <li>上传您在 SolidWorks 中处理过的 <strong>.sldprt</strong> 文件。</li>
        <li>点击下方的“开始优化”按钮，系统将对上传的模型进行分析与优化。</li>
        <li>系统将执行优化，您可以根据结果进行多轮迭代，直到满意为止。</li>
      </ol>
    </div>
  );
};

const fixedParamsDefinitions = [
  { name: 'permissible_stress', initialValue: 355000000, isStress: true, label: '最大应力(mN)' },
  { name: 'method', initialValue: 'GA', isSelect: true, options: ['GA', 'HA'], label: '优化方法' },
  { name: 'generations', initialValue: 6, isSelect: true, options: [...Array.from({ length: 10 }, (_, i) => i + 1), 20, 30, 50], label: '代数' },
  { name: 'population_size', initialValue: 7, isSelect: true, options: [...Array.from({ length: 10 }, (_, i) => i + 1), 20, 30, 50], label: '种群数量' },
];

const ParameterForm = ({ params, onSubmit, isTaskRunning, isSecondRoundCompleted, displayedImages }) => {
  const [extendedParams, setExtendedParams] = useState([]);
  const [checkedParams, setCheckedParams] = useState({});
  const prevParamsRef = React.useRef();
  // 【新增状态】用于图片放大预览
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [previewImageAlt, setPreviewImageAlt] = useState('');
  // 图片点击处理器
  const handleImageClick = (url, alt) => {
    setPreviewImageUrl(url);
    setPreviewImageAlt(alt);
    setIsImagePreviewOpen(true);
  };
  // 状态，用于保存用户的输入和范围
  const [ranges, setRanges] = useState({});
  const [fixedValues, setFixedValues] = useState({});
  // 1️⃣ 【新增】使用 ref 来跟踪用户是否手动修改了特定参数（避免重渲染）
  const manualOverridesRef = React.useRef({});
  // --- 修复点 1：控制 fixedValues, extendedParams, checkedParams 的初始化 ---
  useEffect(() => {
    const extractedParams = params ? params.filter(p => !fixedParamsDefinitions.some(fp => fp.name === p.name)) : [];
    const combinedParams = [...extractedParams];

    // 合并固定参数的定义
    fixedParamsDefinitions.forEach(fixedParam => {
      const existingParam = params ? params.find(p => p.name === fixedParam.name) : undefined;
      if (existingParam) {
        combinedParams.push({ ...existingParam, ...fixedParam });
      } else {
        combinedParams.push(fixedParam);
      }
    });

    setExtendedParams(combinedParams);

    // 只有当 props.params 发生实质性变化时，才重置参数选择和固定值
    if (JSON.stringify(prevParamsRef.current) !== JSON.stringify(params)) {
      // 重置 checkedParams (通常所有项都应被选中)
      const initialChecked = {};
      combinedParams.forEach(param => {
        initialChecked[param.name] = true;
      });
      setCheckedParams(initialChecked);

      // 🚨 关键修复：仅在此处初始化 fixedValues
      const initialFixedValues = {};
      fixedParamsDefinitions.forEach(fixedParam => {
        // 确保使用 fixedParam.initialValue，因为 fixedParamsDefinitions 是固定值定义
        initialFixedValues[fixedParam.name] = String(fixedParam.initialValue || '');
      });
      setFixedValues(initialFixedValues);
      manualOverridesRef.current = {};
    }

    prevParamsRef.current = params;

  }, [params]);

  // ParameterForm.jsx 内部的 useEffect 修复
  // --- 修复点 1：ranges 初始化逻辑 (阻止页面刷新覆盖用户输入) ---
  useEffect(() => {
    if (extendedParams.length > 0) {
      setRanges(currentRanges => {
        let didChange = false;
        const newRanges = { ...currentRanges };

        extendedParams.forEach(param => {
          if (!newRanges[param.name] || newRanges[param.name].min === '' || newRanges[param.name].max === '') {
            newRanges[param.name] = {
              min: param.min !== undefined && param.min !== null ? param.min : (param.initialValue !== undefined && param.initialValue !== null ? param.initialValue : ''),
              max: param.max !== undefined && param.max !== null ? param.max : (param.initialValue !== undefined && param.initialValue !== null ? param.initialValue : '')
            };
            didChange = true;
          }
        });

        return didChange ? newRanges : currentRanges;
      });
    }
  }, [extendedParams]);

  // 2️⃣ 【修改】固定参数推荐逻辑 (增加防覆盖判断)---
  useEffect(() => {
    const optimizableParamNames = extendedParams
      .filter(p => !fixedParamsDefinitions.some(fp => fp.name === p.name))
      .map(p => p.name);

    const checkedOptimizableParamsCount = optimizableParamNames.filter(name => checkedParams[name]).length;

    let recommendedPopulationSize = fixedParamsDefinitions.find(p => p.name === 'population_size').initialValue;
    let recommendedGenerations = fixedParamsDefinitions.find(p => p.name === 'generations').initialValue;

    if (checkedOptimizableParamsCount >= 5 && checkedOptimizableParamsCount <= 8) {
      recommendedPopulationSize = 20;
      recommendedGenerations = 30;
    } else if (checkedOptimizableParamsCount > 8) {
      recommendedPopulationSize = 30;
      recommendedGenerations = 50;
    }

    setFixedValues(prev => {
      // 检查用户是否手动修改过
      const isPopModified = manualOverridesRef.current['population_size'];
      const isGenModified = manualOverridesRef.current['generations'];

      // 如果用户修改过，使用当前值(prev)，否则使用推荐值
      const newPopulationSize = isPopModified ? prev.population_size : String(recommendedPopulationSize);
      const newGenerations = isGenModified ? prev.generations : String(recommendedGenerations);

      // 如果计算出的新状态和当前状态一致，则不更新（避免重渲染）
      if (prev.generations === newGenerations && prev.population_size === newPopulationSize) {
        return prev;
      }

      return {
        ...prev,
        population_size: newPopulationSize,
        generations: newGenerations,
      };
    });

  }, [checkedParams, extendedParams]);

  const [submissionStatus, setSubmissionStatus] = useState('idle');

  const handleRangeChange = (paramName, bound, value) => {
    setRanges(prev => ({
      ...prev,
      [paramName]: { ...prev[paramName], [bound]: value }
    }));
  };

  const handleCheckboxChange = (paramName) => {
    setCheckedParams(prev => ({
      ...prev,
      [paramName]: !prev[paramName]
    }));
  };

  const handleSubmit = async () => {
    setSubmissionStatus('loading');
    const submissionParams = {};

    extendedParams.forEach(param => {
      if (checkedParams[param.name]) {
        if (param.isSelect) {
          const value = fixedValues[param.name];
          submissionParams[param.name] = {
            value: value,
          };
        } else if (param.isStress) {
          const value = parseFloat(fixedValues[param.name]);
          submissionParams[param.name] = {
            value: value,
          };
        } else {
          submissionParams[param.name] = {
            min: parseFloat(ranges[param.name]?.min),
            max: parseFloat(ranges[param.name]?.max),
          };
        }
      }
    });

    try {
      await onSubmit(submissionParams);
      setSubmissionStatus('success');
    } catch (error) {
      setSubmissionStatus('error');
    }
  };

  const isInputDisabled = submissionStatus === 'loading' || submissionStatus === 'success';

  return (
    <div className="w-full mx-auto p-4 border rounded-lg flex flex-col md:flex-row gap-4">
      {/* 渲染图片的部分 */}
      {displayedImages.length > 0 && (
        <div className="flex-shrink-0 w-full md:w-1/2 lg:w-1/3 space-y-2">
          {displayedImages.map((image, idx) => {
            return (
              <div key={`${image.imageUrl}-${idx}`} className="border rounded-lg p-2">
                <ProtectedImage
                  src={image.imageUrl}
                  alt={image.altText}
                  className="w-full h-auto max-h-48 object-contain rounded cursor-pointer" // <-- 添加 cursor-pointer
                  // 💥 绑定点击事件 💥
                  onClick={() => handleImageClick(image.imageUrl, image.altText)}
                />
                <p className="text-sm text-center mt-1">
                  {image.altText || image.fileName}
                </p>
              </div>
            );
          })}
        </div>
      )}
      {/* ⚠️ 图片渲染部分修改结束 */}

      <div className="flex-grow">
        <h3 className="text-lg font-semibold mb-4">设置参数范围</h3>
        <div className="grid grid-cols-[auto_2fr_1fr_1fr] gap-x-4 gap-y-2 mb-2 items-center">
          <div />
          <div className="text-sm font-medium text-gray-600">参数</div>
          <div className="text-center text-sm font-medium text-gray-600">值/下界</div>
          <div className="text-center text-sm font-medium text-gray-600">上界</div>
        </div>
        <div className="space-y-4">
          {extendedParams.map(param => (
            <div key={param.name} className="grid grid-cols-[auto_2fr_1fr_1fr] items-center gap-x-4">
              <Checkbox
                id={`check-${param.name}`}
                checked={!!checkedParams[param.name]}
                onCheckedChange={() => handleCheckboxChange(param.name)}
                disabled={isInputDisabled || param.isStress || param.isSelect}
              />
              <label htmlFor={`check-${param.name}`} className="font-medium" title={param.name}>
                {param.label || param.name}
                {param.label && <span className="text-gray-500 text-sm ml-2">({param.name})</span>}
              </label>
              {param.isSelect ? (
                <Select
                  value={fixedValues[param.name]}
                  // 3️⃣ 【修改】onValueChange：记录用户的手动操作
                  onValueChange={(value) => {
                    manualOverridesRef.current[param.name] = true; // 标记为已手动修改
                    setFixedValues(prev => ({ ...prev, [param.name]: value }));
                  }}
                  disabled={isInputDisabled}
                >
                  <SelectTrigger className="col-span-1">
                    <SelectValue placeholder={`选择 ${param.label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {param.options.map(option => (
                      <SelectItem key={option} value={String(option)}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : param.isStress ? (
                <>
                  <Input
                    type="number"
                    placeholder="最大值"
                    value={fixedValues[param.name]}
                    onChange={e => setFixedValues(prev => ({ ...prev, [param.name]: e.target.value }))}
                    disabled={isInputDisabled || !checkedParams[param.name]}
                    className="col-span-1"
                  />
                  <div />
                </>
              ) : (
                <>
                  <Input
                    type="number"
                    placeholder="下界"
                    value={ranges[param.name]?.min || ''}
                    onChange={e => handleRangeChange(param.name, 'min', e.target.value)}
                    disabled={isInputDisabled || !checkedParams[param.name]}
                  />
                  <Input
                    type="number"
                    placeholder="上界"
                    value={ranges[param.name]?.max || ''}
                    onChange={e => handleRangeChange(param.name, 'max', e.target.value)}
                    disabled={isInputDisabled || !checkedParams[param.name]}
                  />
                </>
              )}
            </div>
          ))}
        </div>
        <Button onClick={handleSubmit} disabled={isTaskRunning || params.length === 0 || isInputDisabled} className="w-full mt-6">
          提交范围并继续进行优化
        </Button>
      </div>
      {/* 💥 添加 Dialog 组件用于图片预览 💥 */}
      <Dialog open={isImagePreviewOpen} onOpenChange={setIsImagePreviewOpen}>
        <DialogContent className="max-w-screen-xl p-4 sm:max-w-5xl md:max-w-6xl">
          <DialogHeader className="p-0">
            <DialogTitle>{previewImageAlt || "模型截图预览"}</DialogTitle>
          </DialogHeader>
          <div className="w-full max-h-[85vh] overflow-y-auto flex justify-center items-center">
            {previewImageUrl && (
              <ProtectedImage
                src={previewImageUrl}
                alt={previewImageAlt}
                className="max-w-full max-h-[80vh] object-contain rounded"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};


const DesignOptimizationPage = () => {
  const location = useLocation();
  const {
    messages,
    addMessage,
    isLoadingMessages,
    activeConversationId,
    activeTaskId,
    createTask,
    updateLastAiMessage, // 使用新的统一 action
    fetchMessagesForTask, // 💥 新增: 用于加载历史对话
  } = useConversationStore();
  const [isTaskRunning, setIsTaskRunning] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [optimizableParams, setOptimizableParams] = useState([]);
  const [paramRanges, setParamRanges] = useState({});
  const [uploadedFileUrl, setUploadedFileUrl] = useState(null);
  const [eventSource, setEventSource] = useState(null);
  const [isSecondRoundCompleted, setIsSecondRoundCompleted] = useState(false);
  const [isQueueDialogOpen, setIsQueueDialogOpen] = useState(false);
  const [displayedImages, setDisplayedImages] = useState([]); // ✅ 必须保留，因为它被 handleImagesExtracted 使用
  const [formScreenshot, setFormScreenshot] = useState([]); // 用于 ParameterForm (只存 screenshot)
  // const [chatResultImages, setChatResultImages] = useState([]); // 用于 ConversationDisplay (曲线图等)
  const [queueLength, setQueueLength] = useState(null); // 等待中的任务数
  const [runningTasks, setRunningTasks] = useState(0); // 运行中的任务数
  const [queuePosition, setQueuePosition] = useState(null); // <-- 修复 1：添加 queuePosition** 
  const [currentTaskId, setCurrentTaskId] = useState(null); // <-- 修复 2：添加 currentTaskId**
  // 新增：控制参数配置模态框的状态
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  // 💥 新增: 跟踪是否正在从任务列表加载历史对话
  const [isLoadingFromTaskList, setIsLoadingFromTaskList] = useState(false);

  // 💥 新增: 从任务列表跳转时自动加载历史对话
  useEffect(() => {
    if (location.state?.fromTaskList && location.state?.taskId && location.state?.conversationId) {
      console.log('🔄 从任务列表跳转,自动加载历史对话:', location.state);

      // **关键修复**: 立即设置loading状态,防止显示空白页面
      setIsLoadingFromTaskList(true);

      const { taskId, conversationId } = location.state;
      fetchMessagesForTask(taskId, conversationId).then(() => {
        // 加载完成后清除loading状态
        setIsLoadingFromTaskList(false);
      });

      // 清除 state,避免刷新页面时重复加载
      window.history.replaceState({}, document.title);
    }
  }, [location, fetchMessagesForTask]);

  // 轮询获取队列长度
  useEffect(() => {
    // 默认轮询间隔 (非任务执行期间)
    const IDLE_POLLING_INTERVAL = 30000; // 30 秒
    // 任务执行期间的轮询间隔
    const ACTIVE_POLLING_INTERVAL = 10000; // 10 秒

    let timeoutId;

    const fetchQueueStatus = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/tasks/optimize/queue_length`);

        const newQueueLength = res.data.length ?? 0;
        const newRunningTasks = res.data.running ?? 0;

        setQueueLength(newQueueLength);
        setRunningTasks(newRunningTasks);

        // 根据是否有运行任务决定下一个间隔
        const nextInterval = (newRunningTasks > 0 || newQueueLength > 0)
          ? ACTIVE_POLLING_INTERVAL
          : IDLE_POLLING_INTERVAL;

        timeoutId = setTimeout(fetchQueueStatus, nextInterval);

      } catch (err) {
        console.error("获取优化队列长度失败，下次尝试间隔 30 秒:", err);
        // 失败时，等待较长时间后再试，避免错误时加速轮询
        timeoutId = setTimeout(fetchQueueStatus, IDLE_POLLING_INTERVAL);
      }
    };

    // 首次启动轮询
    fetchQueueStatus();

    // 清理函数：在组件卸载时清除定时器
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []); // 依赖数组为空，让它在组件挂载时始终启动，但其内部会根据队列状态动态调整频率。

  // 恢复参数提取逻辑
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant' && lastMessage.content) {
        const cleanedContent = lastMessage.content.replace(/[^\x00-\x7F\u4e00-\u9fa5\n\r\t\s\w\d\.\-\+\=\:\：]/g, '');
        const extractedParams = [];
        const paramRegex = /获取到参数\d+[:：]\s*(.+?)：\[\s*([\d.]+)\s*,\s*([\d.]+)\s*\]/g;
        let match;
        paramRegex.lastIndex = 0;
        while ((match = paramRegex.exec(cleanedContent)) !== null) {
          const paramName = match[1].trim();
          const minValue = parseFloat(match[2].trim());
          const maxValue = parseFloat(match[3].trim());
          if (!isNaN(minValue) && !isNaN(maxValue)) {
            extractedParams.push({
              name: paramName,
              initialValue: (minValue + maxValue) / 2,
              min: minValue,
              max: maxValue
            });
          } else {
            console.warn(`DesignOptimizationPage: Could not parse min/max values for param: ${paramName}, min: ${match[2]}, max: ${match[3]}`);
          }
        }
        if (extractedParams.length > 0) {
          setOptimizableParams(extractedParams);
        }
      }
    }

  }, [messages]);

  const handleParametersExtracted = useCallback((params) => {
    console.log("DesignOptimizationPage: Parameters extracted from AI message:", params);
    setOptimizableParams(params);
    // 💥 核心修复：一旦提取到参数，意味着AI进入了“等待用户配置”的阶段
    // 我们必须手动将运行状态设为 false，否则按钮会被隐藏
    setIsTaskRunning(false);
    //setIsStreaming(false); // 可以顺便停止流式加载动画
  }, []);

  const handleImagesExtracted = useCallback((images) => {
    // 1. 筛选出模型截图 (这是唯一需要用于侧边栏的状态)
    const screenshots = images.filter(img => img.altText === "screenshot");

    // 2. 更新 ParameterForm 的状态 (只保留最新的截图)
    //  阻止无限循环：使用防御性检查
    setFormScreenshot(prev => {
      const newShot = screenshots.slice(-1);
      if (JSON.stringify(prev) === JSON.stringify(newShot)) {
        return prev;
      }
      return newShot;
    });
    //  不再处理曲线图。让 updateLastAiMessage 内部逻辑处理所有其他图片。
  }, []);
  const handleRangesSubmit = async (ranges) => {
    console.log("Submitted ranges:", ranges);
    setIsSecondRoundCompleted(false);

    try {
      await submitOptimizationParamsAPI({
        conversation_id: activeConversationId,
        task_id: activeTaskId,
        params: ranges,
      });
      // 确保 currentTaskId 和弹窗打开 ***
      setCurrentTaskId(String(activeTaskId));

      // 🚨 核心修改：设置初始排队位置
      // 如果当前有等待任务，新任务排在队尾 (queueLength + 1)
      const initialQueuePosition = (queueLength === null || queueLength === 0) ? 0 : queueLength + 1;
      setQueuePosition(initialQueuePosition);

      setIsQueueDialogOpen(true);
    } catch (error) {
      console.error("Failed to submit optimization parameters:", error);
      toast.error("提交参数失败，请重试。");
    }
  };


  const handleStartOptimization = async () => {
    if (!selectedFile || isTaskRunning || !activeConversationId) return;
    setFormScreenshot([]);
    setIsTaskRunning(true); // 任务开始，设置为true
    setIsStreaming(true); // 开始流式传输
    const userMessageContent = `已上传文件进行优化: ${selectedFile.name}`;
    addMessage({ role: 'user', content: userMessageContent });
    addMessage({ role: 'assistant', content: '', task_type: 'optimize' }); // AI 回复占位符，并带上任务类型

    const taskType = 'optimize';
    const query = `请对上传的文件 ${selectedFile.name} 进行设计优化。`;
    let taskIdToUse = activeTaskId;

    // 1. 如果没有当前任务ID，则创建一个新任务
    try {
      if (!taskIdToUse) {
        const newTask = await createTask({
          conversation_id: activeConversationId,
          task_type: taskType,
          details: { query: query, fileName: selectedFile?.name }
        });
        if (!newTask) throw new Error("Task creation failed");
        taskIdToUse = newTask.task_id;
      }
    } catch (error) {
      console.error("Failed to create task:", error);
      updateLastAiMessage({
        finalData: { answer: "抱歉，创建任务时出现错误。", metadata: {} },
      }, taskIdToUse);
      setIsTaskRunning(false); // 任务失败，设置为false
      setIsStreaming(false);
      return;
    }

    // 2. 上传文件，并附带会话和任务ID
    let fileUrl = null;
    try {
      const uploadResponse = await uploadFileAPI(selectedFile, activeConversationId, taskIdToUse);
      if (uploadResponse && uploadResponse.path) {
        fileUrl = uploadResponse.path;
        setUploadedFileUrl(fileUrl); // 保存上传文件的URL
      } else {
        throw new Error('File upload failed: Invalid response from server');
      }
    } catch (error) {
      console.error("File upload failed:", error);
      updateLastAiMessage({
        finalData: { answer: "抱歉，文件上传失败。", metadata: {} },
      }, taskIdToUse);
      setIsStreaming(false);
      return;
    }

    try {
      const requestData = {
        task_type: taskType,
        query: query,
        file_url: fileUrl,
        conversation_id: activeConversationId,
        task_id: taskIdToUse,
      };

      executeTaskAPI({
        ...requestData,
        response_mode: "streaming",
        onMessage: {
          text_chunk: (data) => {
            // 💥 检查点：打印完整的 data 对象
            console.log("🔍 SSE text_chunk 回调被触发");
            console.log("🔍 完整 data 对象:", data);
            console.log("🔍 data.text 值:", data.text);
            console.log("🔍 typeof data:", typeof data);

            // 尝试提取文本内容
            const textContent = data.text || data;
            console.log("🔍 提取的文本内容:", textContent);

            if (textContent) {
              updateLastAiMessage({ textChunk: textContent }, taskIdToUse);
            } else {
              console.warn("⚠️ text_chunk 没有有效的文本内容");
            }
          },
          image_chunk: (data) => {
            updateLastAiMessage({ image: data }, taskIdToUse);
          },
          message_end: (data) => {
            updateLastAiMessage({ finalData: data }, taskIdToUse);
            setIsStreaming(false); // 流式传输结束

            // // 在消息结束后打印当前图片状态 修改与2025.9.12.18.44
            // const specialImages = displayedImages.filter(img =>
            //   img.altText === "收敛曲线" || img.altText === "参数分布图"
            // );
            // if (specialImages.length > 0) {
            //   console.log("message_end后收到特殊图片：", specialImages);
            // }
            // 在消息结束时提取参数
            if (data.answer && data.metadata && data.metadata.cad_file === "model.step" && data.metadata.code_file === "script.py") {
              console.log("DesignOptimizationPage: message_end received. Full answer content (raw):", JSON.stringify(data.answer)); // 打印完整答案内容（原始字符串）
              console.log("DesignOptimizationPage: message_end received. Full answer content (parsed):", data.answer); // 打印完整答案内容（已解析）

              // 硬编码测试字符串，用于验证正则表达式
              const testString = "获取参数0：Bottom_main_tube_thick = 0.015\n获取参数1: Uper_main_tube_thick = 0.015";
              const testRegex = /获取参数\d+[:：] (.+?) = (.+)/g;
              let testMatch;
              testRegex.lastIndex = 0;
              while ((testMatch = testRegex.exec(testString)) !== null) {
                console.log("DesignOptimizationPage: Test regex match:", testMatch);
              }

              // 清理 data.answer，移除可能存在的不可见字符
              const cleanedAnswer = data.answer.replace(/[^\x00-\x7F\u4e00-\u9fa5\n\r\t\s\w\d\.\-\+\=\:\：]/g, ''); // 保留ASCII字符、中文、换行符、制表符、空格、单词字符、数字、点、连字符、加号、等号、冒号
              console.log("DesignOptimizationPage: Cleaned answer content (raw):", JSON.stringify(cleanedAnswer));
              console.log("DesignOptimizationPage: Cleaned answer content (parsed):", cleanedAnswer);
              // 打印 cleanedAnswer 中每个字符的 Unicode 编码
              console.log("DesignOptimizationPage: Cleaned answer char codes:");
              for (let i = 0; i < cleanedAnswer.length; i++) {
                console.log(`Char: '${cleanedAnswer[i]}', Code: ${cleanedAnswer.charCodeAt(i)}`);
              }

              const extractedParams = [];
              const paramRegex = /获取参数\d+[:：]\s*(.+?)：\[\s*([\d.]+)\s*,\s*([\d.]+)\s*\]/g;
              let match;
              paramRegex.lastIndex = 0;
              while ((match = paramRegex.exec(cleanedAnswer)) !== null) {
                console.log("DesignOptimizationPage: Param regex match (from cleanedAnswer):", match);
                const paramName = match[1].trim();
                const minValue = parseFloat(match[2].trim());
                const maxValue = parseFloat(match[3].trim());
                if (!isNaN(minValue) && !isNaN(maxValue)) {
                  extractedParams.push({
                    name: paramName,
                    initialValue: (minValue + maxValue) / 2, // 可以设置一个中间值作为初始值
                    min: minValue,
                    max: maxValue
                  });
                } else {
                  console.warn(`DesignOptimizationPage: Could not parse min/max values for param: ${paramName}, min: ${match[2]}, max: ${match[3]}`);
                }
              }
              console.log("DesignOptimizationPage: Extracted parameters at message_end:", extractedParams);
              if (extractedParams.length > 0) {
                handleParametersExtracted(extractedParams);
              } else {
                console.log("DesignOptimizationPage: No optimizable parameters found in final answer content.");
              }
            }
          },
        },
        onError: (error) => {
          console.error("SSE error:", error);
          updateLastAiMessage({
            finalData: {
              answer: "抱歉，请求出错，请稍后再试。",
              metadata: {},
            },
          }, taskIdToUse);
          setIsTaskRunning(false); // 任务失败，设置为false
          setIsStreaming(false);
        },
        onClose: () => {
          setIsTaskRunning(false); // 任务完成，设置为false
          setIsStreaming(false);
          // if (eventSource) eventSource.close(); //  关闭 SSE 连接
        },
      });

    } catch (error) {
      console.error("Failed to start optimization task:", error);
      updateLastAiMessage({
        finalData: {
          answer: "抱歉，启动优化任务时出现错误。",
          metadata: {},
        },
      }, taskIdToUse);
      setIsTaskRunning(false); // 任务失败，设置为false
      setIsStreaming(false);
    }
  };

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white pb-40">
        <div className="w-full max-w-2xl text-center">
          <h1 className="text-4xl font-bold mb-8">上传文件以开始优化</h1>

          {/* ✅ 使用新版队列横幅 */}
          <QueueStatusBanner queueLength={queueLength} runningTasks={runningTasks} />

          <WorkflowGuide />
          <ConversationSelector />

          {/* ✅ 使用新版上传组件 */}
          <InteractiveFileUpload
            onFileSelect={setSelectedFile}
            onStart={handleStartOptimization}
            selectedFile={selectedFile}
            isStreaming={isStreaming}
            disabled={!activeConversationId || isTaskRunning}
          />
        </div>
      </div>

    );
  }

  return (
    <>
      {/* 顶部状态条 */}
      <div className="w-full max-w-4xl mx-auto mb-4 relative z-10">
        <QueueStatusBanner queueLength={queueLength} runningTasks={runningTasks} />
      </div>

      {/* 主聊天区域 - 现在占据全高，去掉了底部的 Panel */}
      <div className="flex flex-col h-full bg-white relative overflow-hidden rounded-lg border shadow-sm">

        {/* 如果有提取到参数，并且没有在运行，显示“打开配置”的悬浮按钮或顶部栏 */}
        {optimizableParams.length > 0 && (
          <FloatingConfigButton onClick={() => setIsConfigModalOpen(true)} />
        )}
        <div className="flex-grow overflow-hidden">
          <ConversationDisplay
            messages={messages}
            isLoading={isLoadingMessages || isLoadingFromTaskList}
            onQuestionClick={() => { }}
            onImagesExtracted={handleImagesExtracted}
            filterTaskType="optimize"
          />
        </div>

        {/* 底部保留文件上传条 (仅当参数未提取时，或作为备选操作) */}
        {optimizableParams.length === 0 && !isTaskRunning && (
          <div className="p-4 border-t bg-gray-50">
            <InteractiveFileUpload
              onFileSelect={setSelectedFile}
              onStart={handleStartOptimization}
              selectedFile={selectedFile}
              isStreaming={isStreaming}
              disabled={!activeConversationId || isTaskRunning}
            />
          </div>
        )}
      </div>

      {/* --- 核心修改：使用 Modal 替代 Panel --- */}
      <OptimizationConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        params={optimizableParams}
        onSubmit={handleRangesSubmit}
        isTaskRunning={isTaskRunning}
        displayedImages={formScreenshot} // 传入截图供 Modal 内部展示
      />

      <Dialog open={isQueueDialogOpen} onOpenChange={setIsQueueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              参数已提交
            </DialogTitle>
            <DialogDescription>
              {queuePosition === null
                ? "正在获取队列信息，请稍候..."
                : queuePosition === 0 && runningTasks > 0
                  ? "当前任务正在执行中。请查看聊天记录。"
                  : queuePosition > 0
                    ? `前方还有 ${queuePosition} 个任务，请耐心等待。`
                    : "任务状态异常或已完成。"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setIsQueueDialogOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DesignOptimizationPage;
