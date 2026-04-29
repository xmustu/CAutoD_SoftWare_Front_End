import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useOutletContext, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
    Download, Share2, Code, Loader2, Box, Maximize2,
    Layers, Eye, EyeOff, Info, Home, Grid,
    ChevronRight, ChevronDown, FileText, Monitor,
    FolderOpen, FileType,
    BoxSelect, Video, ArrowUp, ArrowUpCircle, Lock, Unlock,
    Camera, X,
    FilePlus2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import ChatInput from '@/components/ChatInput.jsx';
import ProviderSelector from '@/components/ProviderSelector.jsx';
import { executeTaskAPI } from '@/api/taskAPI';
import { uploadFileAPI, downloadFileAPI } from '@/api/fileAPI.js';
import useUserStore from '@/store/userStore';
import useConversationStore from '@/store/conversationStore';
import ConversationDisplay from '@/components/ConversationDisplay.jsx';
import ThreeDViewer from '@/components/ThreeDViewer';
import { generatePreviewFromAIResponse } from '@/utils/geometryBuilder';
const GEOMETRY_BOT_ID = 'ep-m-20251211113938-sr72q';

// ----------------------------------------------------------------------
// 1. 辅助组件区域
// ----------------------------------------------------------------------

const FloatingProgress = ({ metadata, isStreaming, content }) => {
    const hasCodeContent = content && content.length > 50 && (
        content.includes('import cadquery') ||
        content.includes('import bpy') ||
        content.includes('```python') ||
        content.includes('def build_')
    );
    const hasCodeFile = !!metadata?.code_file;
    const hasModelFile = !!metadata?.stl_file;
    const hasPreviewImage = !!metadata?.preview_image;

    if (!hasCodeContent && !isStreaming && !hasCodeFile) return null;

    const steps = [
        {
            label: '生成代码',
            done: hasCodeFile || (hasCodeContent && !isStreaming)
        },
        {
            label: '构建模型',
            done: hasModelFile && !isStreaming
        },
        {
            label: '渲染预览',
            done: hasPreviewImage && !isStreaming
        },
    ];

    return (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 bg-black/70 backdrop-blur-md rounded-full px-5 py-2.5 shadow-lg flex items-center gap-3 border border-white/10">
            {steps.map((step, index) => (
                <React.Fragment key={step.label}>
                    {index > 0 && <div className={`w-6 h-0.5 ${step.done ? 'bg-green-400' : 'bg-gray-600'}`} />}
                    <div className="flex items-center gap-1.5">
                        {step.done ? (
                            <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            </div>
                        ) : (isStreaming && !steps.slice(0, index).every(s => s.done) === false) ? (
                            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                        ) : (
                            <div className="w-4 h-4 rounded-full border border-gray-500" />
                        )}
                        <span className={`text-xs font-medium ${step.done ? 'text-green-400' : 'text-gray-400'}`}>{step.label}</span>
                    </div>
                </React.Fragment>
            ))}
        </div>
    );
};

const ModelToolbar = ({
    onResetCamera, onToggleGrid, isGridVisible, onFullscreen,
    quality, onToggleQuality, cameraType, setCameraType,
    upAxis, setUpAxis, isViewLocked, setIsViewLocked, onSnapshot
}) => {
    const qualityLabel = { low: '节能', medium: '均衡', high: '高清' };
    const getBtnClass = (isActive) => `h-8 w-8 hover:bg-white/20 hover:text-white transition-colors ${isActive ? 'text-blue-400 bg-white/10' : 'text-gray-400'}`;
    const [showSnapshotMenu, setShowSnapshotMenu] = useState(false);
    const [snapConfig, setSnapConfig] = useState({ w: 1920, h: 1080 });

    return (
        <div className="absolute top-3 right-3 z-20 flex flex-col items-center gap-1 bg-[#2c2c2c]/90 backdrop-blur-md rounded-lg shadow-lg p-1 border border-white/10">
            <Button variant="ghost" size="icon" className={getBtnClass(false)} title="重置相机" onClick={onResetCamera}><Home className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className={getBtnClass(isGridVisible)} title="网格" onClick={onToggleGrid}><Grid className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className={getBtnClass(false)} title="全屏" onClick={onFullscreen}><Maximize2 className="w-4 h-4" /></Button>
            <div className="w-full border-t border-white/10 my-0.5" />
            <Button variant="ghost" size="icon" className={getBtnClass(cameraType === 'perspective')} title="透视" onClick={() => setCameraType('perspective')}><Box className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className={getBtnClass(cameraType === 'orthographic')} title="正交" onClick={() => setCameraType('orthographic')}><BoxSelect className="w-4 h-4" /></Button>
            <div className="w-full border-t border-white/10 my-0.5" />
            <Button variant="ghost" size="icon" className={getBtnClass(upAxis === 'z')} title="Z轴向上" onClick={() => setUpAxis('z')}><ArrowUpCircle className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className={getBtnClass(upAxis === 'y')} title="Y轴向上" onClick={() => setUpAxis('y')}><ArrowUp className="w-4 h-4" /></Button>
            <div className="w-full border-t border-white/10 my-0.5" />
            <Button variant="ghost" size="icon" className={getBtnClass(isViewLocked)} title={isViewLocked ? "解锁视角" : "锁定视角"} onClick={() => setIsViewLocked(!isViewLocked)}>
                {isViewLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" className={getBtnClass(false)} title={`画质: ${qualityLabel[quality]}`} onClick={onToggleQuality}>
                <Video className="w-4 h-4" /><span className="text-[8px] absolute bottom-0.5 right-0.5">{qualityLabel[quality]}</span>
            </Button>
            <div className="w-full border-t border-white/10 my-0.5" />
            <div className="relative">
                <Button variant="ghost" size="icon" className={getBtnClass(false)} title="截图" onClick={() => setShowSnapshotMenu(!showSnapshotMenu)}><Camera className="w-4 h-4" /></Button>
                {showSnapshotMenu && (
                    <div className="absolute right-10 top-0 bg-[#2c2c2c]/95 backdrop-blur-md rounded-lg shadow-lg p-3 border border-white/10 w-48 z-30">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-300 font-medium">截图设置</span>
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-gray-400 hover:text-white" onClick={() => setShowSnapshotMenu(false)}><X className="w-3 h-3" /></Button>
                        </div>
                        <div className="space-y-2 text-xs">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400 w-6">宽</span>
                                <input type="number" value={snapConfig.w} onChange={(e) => setSnapConfig({ ...snapConfig, w: parseInt(e.target.value) })} className="flex-1 bg-black/30 border border-white/10 rounded px-1 py-0.5 text-xs text-center text-white" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400 w-6">高</span>
                                <input type="number" value={snapConfig.h} onChange={(e) => setSnapConfig({ ...snapConfig, h: parseInt(e.target.value) })} className="flex-1 bg-black/30 border border-white/10 rounded px-1 py-0.5 text-xs text-center text-white" />
                            </div>
                            <Button className="w-full h-7 text-xs" onClick={() => { onSnapshot(snapConfig.w, snapConfig.h); setShowSnapshotMenu(false); }}>导出图片</Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const MeshesPanel = ({ parts, visibility, onToggleVisibility, highlightState, onHighlight }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    if (!parts || parts.length === 0) return null;
    return (
        <div className="absolute top-3 left-3 z-20 flex flex-col transition-all duration-300">
            <div className="flex items-center justify-between bg-[#2c2c2c] text-gray-200 p-2 rounded-t-md cursor-pointer shadow-sm select-none" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-1 min-w-[60px]">
                    <Layers className="w-4 h-4" />
                    <span className="text-xs font-medium">网格</span>
                </div>
                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </div>
            {isExpanded && (
                <div className="bg-[#2c2c2c]/90 backdrop-blur-md text-gray-300 p-2 rounded-b-md shadow-lg border-t border-white/10 overflow-y-auto max-h-[200px]">
                    {parts.map(partName => (
                        <div key={partName} className="flex items-center gap-2 py-1 px-1 hover:bg-white/10 rounded cursor-pointer" onClick={() => onHighlight(partName)}>
                            <Switch checked={visibility[partName] !== false} onCheckedChange={(c) => onToggleVisibility(partName, c)} className="scale-75" tabIndex={-1} />
                            <span className={`text-xs truncate ${visibility[partName] === false ? 'opacity-50 text-gray-500 line-through' : ''} ${highlightState.name === partName && highlightState.isHighlighted ? 'text-blue-400 font-bold' : ''}`}>
                                {partName}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const DetailsPanel = ({ metadata, prompt, executionTime }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const fileName = metadata?.code_file || metadata?.stl_file || "-";
    const format = metadata?.stl_file ? "STL" : metadata?.cad_file ? "STEP" : "-";
    const hasModel = !!metadata?.stl_file || !!metadata?.cad_file;

    return (
        <div className="absolute bottom-20 right-3 z-20 flex flex-col items-end transition-all duration-300">
            <div className="flex items-center justify-between bg-[#2c2c2c] text-gray-200 p-2 rounded-t-md cursor-pointer shadow-sm select-none min-w-[140px]" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-1">
                    <Info className="w-4 h-4" />
                    <span className="text-xs font-medium">详情</span>
                </div>
                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </div>
            {isExpanded && (
                <div className="bg-[#2c2c2c]/90 backdrop-blur-md text-gray-300 p-3 rounded-b-md shadow-lg border-t border-white/10 text-xs min-w-[240px]">
                    {/* 基础信息 */}
                    <div className="grid grid-cols-3 gap-2 border-b border-white/10 pb-2 mb-1">
                        <span className="text-gray-500">当前文件:</span>
                        <span className="col-span-2 text-white truncate" title={fileName}>{fileName}</span>
                        <span className="text-gray-500">格式:</span>
                        <span className="col-span-2 text-white">{format}</span>
                        <span className="text-gray-500">状态:</span>
                        <span className={`col-span-2 ${hasModel ? 'text-green-400' : 'text-yellow-500 animate-pulse'}`}>
                            {hasModel ? '模型已就绪' : '生成中...'}
                        </span>
                    </div>
                    {/* 耗时显示 */}
                    {executionTime > 0 && (
                        <>
                            <div className="grid grid-cols-3 gap-2 border-b border-white/10 pb-2 mb-1">
                                <span className="text-gray-500">生成耗时:</span>
                                <span className="col-span-2 text-blue-400 font-mono font-bold">
                                    {executionTime} ms ({(executionTime / 1000).toFixed(2)}s)
                                </span>
                            </div>
                        </>
                    )}
                    {/* 用户 prompt */}
                    {prompt && (
                        <div className="border-t border-white/5 pt-2">
                            <span className="text-gray-500 block mb-1">用户输入:</span>
                            <div className="bg-black/30 p-2 rounded text-gray-200 leading-relaxed max-h-40 overflow-y-auto custom-scrollbar text-[10px] break-all">
                                {prompt || "等待用户输入..."}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const SuggestionButton = ({ text, onClick }) => (
    <Button
        variant="outline"
        className="rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100"
        onClick={onClick}
    >
        {text}
    </Button>
);

const WorkflowGuide = () => (
    <div className="text-left max-w-2xl mx-auto bg-blue-50 p-4 rounded-lg border border-blue-200 mb-8">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">第一步：几何建模</h2>
        <ol className="list-decimal list-inside text-gray-700 space-y-1">
            <li>在本页面输入您想设计的模型描述，生成并下载 <strong>.step</strong> 文件。</li>
            <li>在 SolidWorks 中打开下载的 <strong>.step</strong> 文件，进行特征重建并标记相关参数。</li>
            <li>将处理后的文件另存为 <strong>.sldprt</strong> 格式。</li>
            <li>前往【设计优化】页面，上传您的 <strong>.sldprt</strong> 文件以进行后续的优化分析。</li>
        </ol>
    </div>
);

// ----------------------------------------------------------------------
// 2. 主页面组件
// ----------------------------------------------------------------------

const GeometricModelingPage = () => {
    const [inputValue, setInputValue] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [provider, setProvider] = useState('agent');
    const location = useLocation();
    const [isLoadingFromTaskList, setIsLoadingFromTaskList] = useState(
        () => !!(location.state?.fromTaskList && location.state?.taskId && location.state?.conversationId)
    );
    // 3D 视图状态
    const [currentStlUrl, setCurrentStlUrl] = useState(null);
    const [isLoadingModel, setIsLoadingModel] = useState(false);
    const [latestMetadata, setLatestMetadata] = useState(null);
    const [lastAiContent, setLastAiContent] = useState("");
    const [lastUserPrompt, setLastUserPrompt] = useState("");
    const [isGeometryTaskStreaming, setIsGeometryTaskStreaming] = useState(false);
    // 前端预览模型信息（当后端未返回 STL 时由参数表生成）
    const [frontendPreviewInfo, setFrontendPreviewInfo] = useState(null);

    // Ref
    const loadedFileRef = useRef(null);
    const viewerRef = useRef(null);
    // 💥 SSE 连接引用 — 用于中断旧流
    const sseRef = useRef(null);
    // 💥 当前任务ID引用 — 用于 SSE 回调守卫
    const currentTaskIdRef = useRef(null);

    const [executionTime, setExecutionTime] = useState(0);
    // 3D 交互状态
    const [highlightState, setHighlightState] = useState({ name: null, isHighlighted: false });
    const [partVisibility, setPartVisibility] = useState({});
    const [modelParts, setModelParts] = useState([]);
    const [isGridVisible, setIsGridVisible] = useState(true);
    const [quality, setQuality] = useState('medium');

    // 相机控制
    const [cameraType, setCameraType] = useState('perspective');
    const [upAxis, setUpAxis] = useState('z');
    const [isViewLocked, setIsViewLocked] = useState(false);

    const [leftPanelWidth, setLeftPanelWidth] = useState(60);
    const containerRef = useRef(null);
    const viewerContainerRef = useRef(null);

    const { user } = useUserStore();
    const { messages, addMessage, updateLastAiMessage, isLoadingMessages, activeTaskId, activeConversationId, ensureConversation, createTask, fetchMessagesForTask, startNewConversation } = useConversationStore();
    const { fetchHistory } = useOutletContext();

    // 💥 从任务列表跳转时自动加载历史对话
    useEffect(() => {
        if (location.state?.fromTaskList && location.state?.taskId && location.state?.conversationId) {
            console.log('🔄 GeometricModelingPage: 从任务列表跳转, 加载历史对话:', location.state);
            setIsLoadingFromTaskList(true);
            const { taskId, conversationId } = location.state;
            fetchMessagesForTask(taskId, conversationId).then(() => {
                setIsLoadingFromTaskList(false);
            }).catch(() => {
                setIsLoadingFromTaskList(false);
            });
            window.history.replaceState({}, document.title);
        }
    }, [location, fetchMessagesForTask]);

    // 💥 关键修复：页面挂载时清空可能来自其他页面的残留消息
    useEffect(() => {
        if (!location.state?.fromTaskList) {
            startNewConversation();
        }
        // 组件卸载时：中断 SSE + 清空状态
        return () => {
            if (sseRef.current) {
                console.log('🛑 GeometricModelingPage 卸载，中断 SSE 连接');
                sseRef.current.close();
                sseRef.current = null;
            }
            currentTaskIdRef.current = null;
        };
    }, []);

    const handleShowModel = async (fileName) => {
        if (!activeTaskId || !activeConversationId || !fileName) return;
        loadedFileRef.current = fileName;
        setIsLoadingModel(true);
        try {
            const blob = await downloadFileAPI(activeTaskId, activeConversationId, fileName);
            if (blob) {
                const blobUrl = URL.createObjectURL(blob);
                if (currentStlUrl) URL.revokeObjectURL(currentStlUrl);
                setCurrentStlUrl(blobUrl);
                setModelParts(['Model']);
                setPartVisibility({ 'Model': true });
                setHighlightState({ name: null, isHighlighted: false });
            }
        } catch (error) {
            console.error("加载模型失败:", error);
        } finally {
            setIsLoadingModel(false);
        }
    };

    const handleSnapshot = useCallback((width, height) => {
        if (viewerRef.current) {
            viewerRef.current.captureSnapshot(width, height);
        } else {
            console.warn("Viewer ref is not attached.");
        }
    }, []);

    // 监听消息更新 (包含自动显示逻辑 + 前端预览兜底)
    useEffect(() => {
        if (!messages || messages.length === 0) return;

        const lastAiMsg = messages.slice().reverse().find(m => m.role === 'assistant');
        const lastUserMsg = messages.slice().reverse().find(m => m.role === 'user');

        if (lastUserMsg) setLastUserPrompt(lastUserMsg.content);

        if (lastAiMsg) {
            setLastAiContent(lastAiMsg.content);
            setLatestMetadata(lastAiMsg.metadata || {});

            const isComplete = (lastAiMsg.metadata?.stl_file || lastAiMsg.metadata?.cad_file) && lastAiMsg.metadata?.preview_image && !isStreaming;
            setIsGeometryTaskStreaming(lastAiMsg.task_type === 'geometry' && isStreaming);

            const stlFile = lastAiMsg.metadata?.stl_file;
            if (stlFile && stlFile !== loadedFileRef.current) {
                // 后端返回了模型文件 → 正常加载
                console.log("自动加载新生成的模型:", stlFile);
                setFrontendPreviewInfo(null); // 清除前端预览标记
                handleShowModel(stlFile);
            } else if (!stlFile && !isStreaming && lastAiMsg.content && lastAiMsg.content.length > 50) {
                // 💥 后端未返回模型文件 + 流已结束 + 有内容 → 尝试前端预览
                const result = generatePreviewFromAIResponse(lastAiMsg.content);
                if (result && result.blobUrl) {
                    console.log('🎨 [前端预览] 从参数表生成预览模型:', result.geoType.label);
                    // 清理旧的前端预览 URL
                    if (frontendPreviewInfo?.blobUrl) {
                        URL.revokeObjectURL(frontendPreviewInfo.blobUrl);
                    }
                    if (currentStlUrl) URL.revokeObjectURL(currentStlUrl);
                    setCurrentStlUrl(result.blobUrl);
                    setFrontendPreviewInfo(result);
                    setModelParts(['Model']);
                    setPartVisibility({ 'Model': true });
                    setHighlightState({ name: null, isHighlighted: false });
                    loadedFileRef.current = '__frontend_preview__';
                }
            }
        }
    }, [messages, activeTaskId, activeConversationId, isStreaming]);

    // 清理 URL 对象
    useEffect(() => {
        return () => {
            if (currentStlUrl) URL.revokeObjectURL(currentStlUrl);
        };
    }, []);

    // 从历史记录恢复状态
    useEffect(() => {
        if (messages && messages.length > 0 && !isStreaming && !currentStlUrl) {
            const lastAiMsg = messages.slice().reverse().find(m => m.role === 'assistant');
            const lastUserMsg = messages.slice().reverse().find(m => m.role === 'user');

            if (lastUserMsg) setLastUserPrompt(lastUserMsg.content);

            if (lastAiMsg) {
                setLastAiContent(lastAiMsg.content);
                setLatestMetadata(lastAiMsg.metadata || {});

                const stlFile = lastAiMsg.metadata?.stl_file;
                const cadFile = lastAiMsg.metadata?.cad_file;
                const fileToLoad = stlFile || cadFile;

                if (fileToLoad && fileToLoad !== loadedFileRef.current && activeTaskId && activeConversationId) {
                    console.log("正在从历史记录恢复模型:", fileToLoad);
                    setTimeout(() => handleShowModel(fileToLoad), 100);
                }
            }
        }
    }, [messages, activeTaskId, activeConversationId]);

    // 拖动逻辑
    const handleMouseDown = () => {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };
    const handleMouseMove = (e) => {
        if (!containerRef.current) return;
        const containerWidth = containerRef.current.offsetWidth;
        const newWidth = ((e.clientX - containerRef.current.getBoundingClientRect().left) / containerWidth) * 100;
        if (newWidth >= 30 && newWidth <= 70) setLeftPanelWidth(newWidth);
    };
    const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    const handleFullscreen = () => {
        if (viewerContainerRef.current) {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                viewerContainerRef.current.requestFullscreen().catch(err => console.error(err));
            }
        }
    };

    const handlePartClick = (partName) => {
        setHighlightState((prev) => ({
            name: prev.name === partName && prev.isHighlighted ? null : partName,
            isHighlighted: !(prev.name === partName && prev.isHighlighted),
        }));
    };

    const handleTogglePartVisibility = (partName, checked) => {
        setPartVisibility((prev) => ({ ...prev, [partName]: checked }));
    };

    const handleToggleQuality = () => {
        const modes = ['low', 'medium', 'high'];
        const currentIndex = modes.indexOf(quality);
        setQuality(modes[(currentIndex + 1) % modes.length]);
    };

    const handlePartsLoaded = useCallback((parts) => {
        if (parts && parts.length > 0) {
            setModelParts(parts);
            setPartVisibility(prev => {
                const next = { ...prev };
                let hasNew = false;
                parts.forEach(p => {
                    if (next[p] === undefined) {
                        next[p] = true;
                        hasNew = true;
                    }
                });
                return hasNew ? next : prev;
            });
        }
    }, []);

    const handleResetCamera = () => {
        if (currentStlUrl) {
            const temp = currentStlUrl;
            setCurrentStlUrl(null);
            setTimeout(() => setCurrentStlUrl(temp), 10);
        }
    };

    const handleQuestionClick = (question) => setInputValue(question);

    // 💥 新建任务：中断旧 SSE + 重置所有状态
    const handleNewTask = () => {
        if (sseRef.current) {
            console.log('🛑 中断旧 SSE 连接');
            sseRef.current.close();
            sseRef.current = null;
        }
        currentTaskIdRef.current = null;
        setIsStreaming(false);
        startNewConversation();
        if (currentStlUrl) URL.revokeObjectURL(currentStlUrl);
        if (frontendPreviewInfo?.blobUrl) URL.revokeObjectURL(frontendPreviewInfo.blobUrl);
        setCurrentStlUrl(null);
        setFrontendPreviewInfo(null);
        setLatestMetadata(null);
        setLastAiContent("");
        setLastUserPrompt("");
        setIsGeometryTaskStreaming(false);
        setExecutionTime(0);
        setModelParts([]);
        setPartVisibility({});
        setHighlightState({ name: null, isHighlighted: false });
        loadedFileRef.current = null;
        setInputValue('');
        console.log('🆕 已中断旧连接并重置所有状态，可以创建新任务');
    };

    const handleSendMessage = async () => {
        if ((!inputValue.trim() && !selectedFile) || isStreaming) return;

        // 💥 先中断可能存在的旧 SSE 连接
        if (sseRef.current) {
            sseRef.current.close();
            sseRef.current = null;
        }

        let userMessageContent = inputValue;
        let filesForRequest = [];
        const startTime = performance.now();
        setExecutionTime(0);

        addMessage({ role: 'user', content: userMessageContent });
        setInputValue('');
        setIsStreaming(true);
        loadedFileRef.current = null;
        addMessage({
            role: 'assistant',
            content: '',
            task_type: 'geometry',
            metadata: null
        });

        if (selectedFile) setSelectedFile(null);

        const conversationId = await ensureConversation(inputValue.substring(0, 20));
        if (!conversationId) {
            setIsStreaming(false);
            return;
        }

        let taskIdToUse = activeTaskId;
        if (!taskIdToUse) {
            const newTask = await createTask({
                conversation_id: conversationId,
                task_type: 'geometry',
                details: { query: inputValue.substring(0, 50) }
            });
            if (!newTask) {
                setIsStreaming(false);
                return;
            }
            taskIdToUse = newTask.task_id;
        }

        // 💥 保存当前任务ID，用于回调守卫
        currentTaskIdRef.current = taskIdToUse;

        // 💥 保存 SSE 连接引用，用于后续中断
        const sseHandle = executeTaskAPI({
            query: inputValue,
            user: user?.email || "anonymous",
            conversation_id: conversationId,
            task_id: taskIdToUse,
            task_type: 'geometry',
            provider: provider,
            files: filesForRequest,
            response_mode: "streaming",
            onMessage: {
                conversation_info: (data) => {
                    if (currentTaskIdRef.current !== taskIdToUse) return;
                    if (data.metadata) updateLastAiMessage({ metadata: data.metadata }, taskIdToUse);
                },
                text_chunk: (data) => {
                    if (currentTaskIdRef.current !== taskIdToUse) return;
                    let text = data.text;
                    if (text && text.includes('|')) {
                        text = text.replace(/^ +\|/gm, '|');
                    }
                    if (text && (
                        text.includes("I will execute") ||
                        text.includes("我将执行") ||
                        text.includes("Generating code") ||
                        text.includes("生成代码")
                    )) {
                        text = "\n\n" + text;
                    }
                    updateLastAiMessage({ textChunk: text }, taskIdToUse);
                },
                message_end: (data) => {
                    if (currentTaskIdRef.current !== taskIdToUse) return;
                    updateLastAiMessage({ finalData: data }, taskIdToUse);
                },
            },
            onError: (error) => {
                if (currentTaskIdRef.current !== taskIdToUse) return;
                console.error("SSE error:", error);
                const duration = Math.round(performance.now() - startTime);
                console.warn(`[Geometry Task Failed] Duration: ${duration}ms`, error);
                updateLastAiMessage({ finalData: { answer: "请求出错。", metadata: {} } }, taskIdToUse);
                setIsStreaming(false);
                sseRef.current = null;
            },
            onClose: () => {
                if (currentTaskIdRef.current !== taskIdToUse) return;
                const duration = Math.round(performance.now() - startTime);
                setExecutionTime(duration);
                console.log(
                    `%c [CAutoD Performance] %c Task Completed %c ${duration}ms `,
                    'background:#35495e ; padding: 1px; border-radius: 3px 0 0 3px;  color: #fff',
                    'background:#41b883 ; padding: 1px; border-radius: 0 3px 3px 0;  color: #fff',
                    'background:transparent; color: #333; font-weight: bold'
                );
                setIsStreaming(false);
                sseRef.current = null;
            },
        });
        sseRef.current = sseHandle;
    };

    // 加载状态
    if (isLoadingMessages || isLoadingFromTaskList) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-64px)]">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    // 初始输入视图
    if (messages.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] bg-white pb-20 overflow-y-auto">
                <div className="w-full max-w-2xl text-center px-4">
                    <h1 className="text-4xl font-bold mb-8 text-gray-800">您的设计需求是？</h1>
                    <WorkflowGuide />
                    <div className="flex items-center justify-center mb-3">
                        <ProviderSelector value={provider} onChange={setProvider} disabled={isStreaming} />
                    </div>
                    <ChatInput
                        inputValue={inputValue}
                        onInputChange={(e) => setInputValue(e.target.value)}
                        onSendMessage={handleSendMessage}
                        isStreaming={isStreaming}
                        placeholder="设计一个机械臂？"
                        selectedFile={selectedFile}
                        onFileSelect={setSelectedFile}
                        isInitialView={true}
                    />
                    <div className="flex justify-center flex-wrap gap-2 mt-6">
                        {["3D", "建模", "需求", "图像", "文本", "代码", "文件导入/导出"].map((text) => (
                            <SuggestionButton key={text} text={text} onClick={() => setInputValue(text)} />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // 工作视图
    return (
        <div ref={containerRef} className="flex h-[calc(100vh-64px)] bg-gray-50 overflow-hidden relative cursor-default select-none">

            <div style={{ width: `${leftPanelWidth}%` }} className="h-full relative bg-[#1e1e1e] flex flex-col transition-all duration-75 ease-out">
                <div ref={viewerContainerRef} className="relative w-full h-full overflow-hidden bg-gradient-to-b from-[#2c2c2c] to-[#1a1a1a]">

                    <ModelToolbar
                        onResetCamera={handleResetCamera}
                        onToggleGrid={() => setIsGridVisible(!isGridVisible)}
                        isGridVisible={isGridVisible}
                        onFullscreen={handleFullscreen}
                        quality={quality}
                        onToggleQuality={handleToggleQuality}
                        cameraType={cameraType}
                        setCameraType={setCameraType}
                        upAxis={upAxis}
                        setUpAxis={setUpAxis}
                        isViewLocked={isViewLocked}
                        setIsViewLocked={setIsViewLocked}
                        onSnapshot={handleSnapshot}
                    />

                    <MeshesPanel parts={modelParts} visibility={partVisibility} onToggleVisibility={handleTogglePartVisibility} highlightState={highlightState} onHighlight={handlePartClick} />
                    <DetailsPanel metadata={latestMetadata} prompt={lastUserPrompt} executionTime={executionTime} />

                    {currentStlUrl ? (
                        <ThreeDViewer
                            ref={viewerRef}
                            modelUrl={currentStlUrl}
                            highlightState={highlightState}
                            setHighlightState={setHighlightState}
                            partVisibility={partVisibility}
                            onPartsLoaded={handlePartsLoaded}
                            quality={quality}
                            cameraType={cameraType}
                            upAxis={upAxis}
                            isViewLocked={isViewLocked}
                            isGridVisible={isGridVisible}
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                            <Box className="w-16 h-16 mb-4 opacity-20" />
                            <p className="font-medium text-gray-400">等待加载 3D 模型...</p>
                            <p className="text-xs mt-2 opacity-70">生成完成后将自动展示</p>
                        </div>
                    )}

                    {/* 💥 前端预览标识 */}
                    {frontendPreviewInfo && currentStlUrl && (
                        <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-20 bg-gradient-to-r from-amber-500/90 to-orange-500/90 backdrop-blur-md text-white px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2 text-xs font-medium border border-white/20">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            <span>前端预览 · {frontendPreviewInfo.geoType?.label || '几何体'}</span>
                            <span className="opacity-70">|</span>
                            <span className="opacity-80">{Object.entries(frontendPreviewInfo.params || {}).filter(([k]) => !k.startsWith('offset') && !k.startsWith('center')).map(([k, v]) => `${k}=${v}`).join(', ')}</span>
                        </div>
                    )}

                    <FloatingProgress metadata={latestMetadata} isStreaming={isGeometryTaskStreaming} content={lastAiContent} />
                    {isLoadingModel && (<div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-30"><div className="flex flex-col items-center text-white"><Loader2 className="w-8 h-8 animate-spin mb-2" /><span className="text-sm font-medium">加载模型资源...</span></div></div>)}
                </div>
            </div>

            <div className="w-1 bg-[#333] hover:bg-indigo-500 transition-colors cursor-col-resize z-40 flex-shrink-0 shadow-lg" onMouseDown={handleMouseDown} />

            <div style={{ width: `${100 - leftPanelWidth}%` }} className="h-full flex flex-col bg-white shadow-2xl z-10">
                {/* 💥 新建任务按钮栏 */}
                <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
                    <span className="text-sm text-gray-500">
                        {isStreaming ? '任务执行中...' : '任务已完成'}
                    </span>
                    <button
                        onClick={handleNewTask}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-all"
                    >
                        <FilePlus2 className="h-4 w-4" />
                        新建任务
                    </button>
                </div>
                <div className="flex-1 overflow-hidden">
                    <ConversationDisplay messages={messages} isLoading={isLoadingMessages} onQuestionClick={handleQuestionClick} onImagesExtracted={() => { }} onShowModel={handleShowModel} />
                </div>
                <div className="p-4 border-t bg-white">
                    <div className="flex items-center mb-2">
                        <ProviderSelector value={provider} onChange={setProvider} disabled={isStreaming} />
                    </div>
                    <ChatInput inputValue={inputValue} onInputChange={(e) => setInputValue(e.target.value)} onSendMessage={handleSendMessage} isStreaming={isStreaming} placeholder="输入您的修改意见..." selectedFile={selectedFile} onFileSelect={setSelectedFile} />
                </div>
            </div>
        </div>
    );
};

export default GeometricModelingPage;
