import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useOutletContext, useLocation } from 'react-router-dom'; // Added useLocation
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
    Download, Share2, Code, Loader2, Box, Maximize2,
    Layers, Eye, EyeOff, Info, Home, Grid,
    ChevronRight, ChevronDown, FileText, Monitor,
    FolderOpen, FileType,
    // 💥 图标
    BoxSelect, Video, ArrowUp, ArrowUpCircle, Lock, Unlock,
    Camera, X // 新增截图相关图标
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import ChatInput from '@/components/ChatInput.jsx';
import { executeTaskAPI } from '@/api/taskAPI';
import { uploadFileAPI, downloadFileAPI } from '@/api/fileAPI.js';
import useUserStore from '@/store/userStore';
import useConversationStore from '@/store/conversationStore';
import ConversationDisplay from '@/components/ConversationDisplay.jsx';
import ThreeDViewer from '@/components/ThreeDViewer';
const GEOMETRY_BOT_ID = 'ep-m-20251211113938-sr72q';
// ----------------------------------------------------------------------
// 1. 辅助组件区域 (悬浮面板、工具栏等)
// ----------------------------------------------------------------------

// --- 悬浮进度条组件 ---
const FloatingProgress = ({ metadata, isStreaming, content }) => {
    // 1. 代码生成判断：
    // - 有代码文件 metadata
    // - 或者内容中包含代码块标记/特定库引用
    // - 必须有一定长度的内容 (content?.length > 50) 防止刚开始就显示
    const hasCodeContent = content && content.length > 50 && (
        content.includes('import cadquery') ||
        content.includes('import bpy') ||
        content.includes('```python') ||
        content.includes('def build_')
    );
    const hasCodeFile = !!metadata?.code_file;

    // 2. 模型构建判断：
    // - 必须有 STL 文件
    // - 且【不再流式传输】(关键！)，否则视为正在构建
    const hasModelFile = !!metadata?.stl_file;

    // 3. 预览图判断：
    const hasPreviewImage = !!metadata?.preview_image;

    // 如果没有代码迹象且不在流式传输，则不显示进度条
    if (!hasCodeContent && !isStreaming && !hasCodeFile) return null;

    const steps = [
        {
            label: '生成代码',
            // 只有当流传输结束，或者已经明确有文件了，才算 Done
            done: hasCodeFile || (hasCodeContent && !isStreaming)
        },
        {
            label: '构建模型',
            // 💥 关键修复：必须流传输结束 (!isStreaming) 才能变绿
            // 即使 metadata 里有了 stl_file，只要还在打字，就视为还在构建中
            done: hasModelFile && !isStreaming
        },
        {
            label: '渲染视图',
            // 同理，流传输结束才算完成
            done: hasPreviewImage && !isStreaming
        },
    ];

    // 计算当前正在进行的动作文本
    let currentAction = "处理中...";
    if (!steps[0].done) currentAction = "编写几何代码...";
    else if (!steps[1].done) currentAction = "构建 3D 模型...";
    else if (!steps[2].done) currentAction = "渲染预览视图...";

    return (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 bg-white/90 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg border border-indigo-100 flex gap-6 transition-all duration-300">
            {steps.map((step, i) => (
                <div key={i} className="flex items-center text-xs">
                    <div className={`w-2 h-2 rounded-full mr-2 transition-colors duration-300 ${step.done ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className={`transition-colors duration-300 ${step.done ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                        {step.label}
                    </span>
                </div>
            ))}
            {/* 只要还在流式传输，或者最后一步还没完成，就显示加载动画 */}
            {(isStreaming || (hasModelFile && !steps[2].done)) && (
                <div className="flex items-center text-xs text-indigo-600 animate-pulse border-l pl-4 border-gray-200">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" /> {currentAction}
                </div>
            )}
        </div>
    );
};

// --- 💥 升级后的顶部工具栏组件 (包含截图菜单) ---
const ModelToolbar = ({
    onResetCamera,
    onToggleGrid, isGridVisible,
    onFullscreen,
    quality, onToggleQuality,
    cameraType, setCameraType,
    upAxis, setUpAxis,
    isViewLocked, setIsViewLocked,
    onSnapshot // 💥 接收截图回调
}) => {
    const [showSnapshotMenu, setShowSnapshotMenu] = useState(false);
    const [snapConfig, setSnapConfig] = useState({ w: 1920, h: 1080 }); // 自定义尺寸

    const qualityLabel = { low: '节能', medium: '均衡', high: '高清' };
    const getBtnClass = (isActive) => `h-8 w-8 hover:bg-white/20 hover:text-white transition-colors ${isActive ? 'text-blue-400 bg-white/10' : 'text-gray-200'}`;

    // 分辨率预设
    const presets = [
        { label: 'Small (720p)', w: 1280, h: 720 },
        { label: 'Medium (1080p)', w: 1920, h: 1080 },
        { label: 'Large (2k)', w: 2560, h: 1440 },
    ];

    const handlePresetClick = (w, h) => {
        onSnapshot(w, h);
        setShowSnapshotMenu(false);
    };

    return (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-20 flex flex-col items-center">
            {/* 主工具条 */}
            <div className="bg-[#2c2c2c]/95 backdrop-blur-sm rounded-md shadow-md border border-white/10 flex items-center p-1 gap-1 text-gray-200">
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/20 hover:text-white" title="复位视角" onClick={onResetCamera}>
                    <Home className="w-4 h-4" />
                </Button>
                <div className="w-px h-4 bg-white/20 mx-1"></div>

                <Button variant="ghost" size="icon" className={getBtnClass(cameraType === 'perspective')} title="透视相机" onClick={() => setCameraType('perspective')}><Video className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className={getBtnClass(cameraType === 'orthographic')} title="正交相机" onClick={() => setCameraType('orthographic')}><BoxSelect className="w-4 h-4" /></Button>

                <div className="w-px h-4 bg-white/20 mx-1"></div>

                <Button variant="ghost" size="icon" className={getBtnClass(upAxis === 'y')} title="Y轴向上" onClick={() => setUpAxis('y')}><ArrowUp className="w-4 h-4" /><span className="sr-only">Y</span></Button>
                <Button variant="ghost" size="icon" className={getBtnClass(upAxis === 'z')} title="Z轴向上" onClick={() => setUpAxis('z')}><ArrowUpCircle className="w-4 h-4" /><span className="sr-only">Z</span></Button>

                {/* 💥 锁定交互 (更名为 View Locked) */}
                <Button variant="ghost" size="icon" className={getBtnClass(isViewLocked)} title={isViewLocked ? "解锁交互" : "锁定交互 (禁止旋转)"} onClick={() => setIsViewLocked(!isViewLocked)}>
                    {isViewLocked ? <Lock className="w-3 h-3 text-red-400" /> : <Unlock className="w-3 h-3 opacity-50" />}
                </Button>

                <div className="w-px h-4 bg-white/20 mx-1"></div>

                {/* 💥 截图按钮 (控制菜单显示) */}
                <div className="relative">
                    <Button variant="ghost" size="icon" className={getBtnClass(showSnapshotMenu)} title="创建快照" onClick={() => setShowSnapshotMenu(!showSnapshotMenu)}>
                        <Camera className="w-4 h-4" />
                    </Button>
                </div>

                <div className="w-px h-4 bg-white/20 mx-1"></div>
                <Button variant="ghost" size="icon" className={getBtnClass(isGridVisible)} title="显示网格" onClick={onToggleGrid}><Grid className="w-4 h-4" /></Button>
                <Button variant="ghost" className="h-8 px-2 text-xs hover:bg-white/20 hover:text-white flex items-center gap-1 min-w-[60px]" onClick={onToggleQuality}><Monitor className="w-3 h-3" /><span>{qualityLabel[quality]}</span></Button>
                <div className="w-px h-4 bg-white/20 mx-1"></div>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/20 hover:text-white" onClick={onFullscreen}><Maximize2 className="w-4 h-4" /></Button>
            </div>

            {/* 💥 截图菜单 Popover */}
            {showSnapshotMenu && (
                <div className="mt-2 bg-[#2c2c2c] border border-white/10 rounded-md shadow-xl p-3 w-64 text-gray-200 text-sm flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-1">
                        <span className="font-semibold flex items-center gap-2"><Camera className="w-3 h-3" /> 导出图片</span>
                        <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-white/20" onClick={() => setShowSnapshotMenu(false)}>
                            <X className="w-3 h-3" />
                        </Button>
                    </div>

                    {/* 预设按钮 */}
                    {presets.map((p) => (
                        <Button
                            key={p.label}
                            variant="ghost"
                            className="justify-start h-8 px-2 text-xs hover:bg-blue-600 hover:text-white w-full"
                            onClick={() => handlePresetClick(p.w, p.h)}
                        >
                            {p.label}
                        </Button>
                    ))}

                    {/* 自定义尺寸 */}
                    <div className="border-t border-white/10 pt-2 mt-1">
                        <div className="text-xs text-gray-400 mb-1">Custom (WxH):</div>
                        <div className="flex gap-2 items-center mb-2">
                            <input
                                type="number"
                                className="w-full bg-black/30 border border-white/10 rounded px-1 py-0.5 text-xs text-center text-white"
                                value={snapConfig.w}
                                onChange={(e) => setSnapConfig({ ...snapConfig, w: parseInt(e.target.value) })}
                            />
                            <span className="text-gray-500">x</span>
                            <input
                                type="number"
                                className="w-full bg-black/30 border border-white/10 rounded px-1 py-0.5 text-xs text-center text-white"
                                value={snapConfig.h}
                                onChange={(e) => setSnapConfig({ ...snapConfig, h: parseInt(e.target.value) })}
                            />
                        </div>
                        <Button
                            className="w-full h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => handlePresetClick(snapConfig.w, snapConfig.h)}
                        >
                            Snapshot
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- 左侧 Meshes 面板组件 ---
const MeshesPanel = ({ parts, visibility, onToggleVisibility, highlightState, onHighlight }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const displayParts = parts && parts.length > 0 ? parts : ['Model'];

    return (
        <div className="absolute top-2 left-2 z-20 w-64 flex flex-col max-h-[calc(100%-20px)] transition-all duration-300">
            {/* 面板头部 */}
            <div
                className="flex items-center justify-between bg-[#2c2c2c] text-gray-200 p-2 rounded-t-md cursor-pointer shadow-sm select-none hover:bg-[#3c3c3c]"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2 text-sm font-medium">
                    <Layers className="w-4 h-4" />
                    Meshes
                </div>
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>

            {/* 面板内容列表 */}
            {isExpanded && (
                <div className="bg-[#2c2c2c]/90 backdrop-blur-md text-gray-300 p-2 rounded-b-md shadow-lg border-t border-white/10 overflow-y-auto custom-scrollbar max-h-[300px]">
                    <div className="space-y-1">
                        {displayParts.map((partName) => (
                            <div
                                key={partName}
                                className={`group flex items-center justify-between p-1.5 rounded cursor-pointer text-xs transition-colors ${highlightState.name === partName && highlightState.isHighlighted
                                    ? 'bg-blue-600 text-white'
                                    : 'hover:bg-white/10'
                                    }`}
                                onClick={() => onHighlight(partName)}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <Box className="w-3 h-3 opacity-70" />
                                    <span className={`truncate ${visibility[partName] === false ? 'opacity-50 text-gray-500 line-through' : ''}`}>{partName}</span>
                                </div>
                                <div
                                    className="p-1 hover:bg-white/20 rounded cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleVisibility(partName, !(visibility[partName] !== false));
                                    }}
                                >
                                    <Switch
                                        className={`scale-75 pointer-events-none ${visibility[partName] === false ? 'bg-gray-500' : 'bg-green-500'}`}
                                        checked={visibility[partName] !== false}
                                        tabIndex={-1}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- 4. 右侧 Details 面板组件 (加载状态 + Mock 数据展示) ---
const DetailsPanel = ({ metadata, prompt, executionTime }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    // 1. 核心判断：是否有模型文件生成
    // 只有当 metadata 中包含 stl_file 或 cad_file 时，才认为模型已就绪
    const fileKey = metadata?.cad_file || metadata?.stl_file;
    const hasModel = !!fileKey;
    const fileName = hasModel ? fileKey : "等待生成...";
    const format = hasModel ? fileName.split('.').pop()?.toUpperCase() : "-";

    return (
        <div className="absolute top-2 right-2 z-20 w-72 flex flex-col transition-all duration-300">
            <div
                className="flex items-center justify-between bg-[#2c2c2c] text-gray-200 p-2 rounded-t-md cursor-pointer shadow-sm select-none hover:bg-[#3c3c3c]"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2 text-sm font-medium">
                    <Info className="w-4 h-4" />
                    Details
                </div>
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>

            {isExpanded && (
                <div className="bg-[#2c2c2c]/90 backdrop-blur-md text-gray-300 p-3 rounded-b-md shadow-lg border-t border-white/10 text-xs space-y-4">

                    {/* 1. 文件基础信息 */}
                    <div className="grid grid-cols-3 gap-2 border-b border-white/10 pb-2">
                        <span className="text-gray-500">当前文件:</span>
                        <span className="col-span-2 text-white truncate" title={fileName}>{fileName}</span>
                        <span className="text-gray-500">格式:</span>
                        <span className="col-span-2 text-white">{format}</span>
                        <span className="text-gray-500">状态:</span>
                        <span className={`col-span-2 ${hasModel ? 'text-green-400' : 'text-yellow-500 animate-pulse'}`}>
                            {hasModel ? '已加载' : '生成中...'}
                        </span>
                        {/* 💥 耗时显示区域 */}
                        {executionTime > 0 && (
                            <>
                                <span className="text-gray-500">生成耗时:</span>
                                <span className="col-span-2 text-blue-400 font-mono font-bold">
                                    {executionTime} ms ({(executionTime / 1000).toFixed(2)}s)
                                </span>
                            </>
                        )}
                    </div>

                    {/* 2. 原始 Prompt (这个应该始终显示，因为它来自用户输入) */}
                    <div className="space-y-1 pt-2"> {/* 移除了 border-t，因为上面已经没有内容分隔了 */}
                        <div className="flex items-center text-gray-500 gap-1">
                            <Code className="w-3 h-3" />
                            <span>原始指令:</span>
                        </div>
                        <div className="bg-black/30 p-2 rounded text-gray-200 leading-relaxed max-h-40 overflow-y-auto custom-scrollbar border border-white/5 text-[10px] break-all">
                            {prompt || "等待用户输入..."}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

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
// 2. 主页面组件 (修正版：UI保留原样，仅增加自动加载逻辑)
// ----------------------------------------------------------------------

const GeometricModelingPage = () => {
    const [inputValue, setInputValue] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const location = useLocation();
    // 3D 视图状态
    const [currentStlUrl, setCurrentStlUrl] = useState(null);
    const [isLoadingModel, setIsLoadingModel] = useState(false);
    const [latestMetadata, setLatestMetadata] = useState(null);
    const [lastAiContent, setLastAiContent] = useState("");
    const [lastUserPrompt, setLastUserPrompt] = useState("");
    const [isGeometryTaskStreaming, setIsGeometryTaskStreaming] = useState(false);

    // Ref
    const loadedFileRef = useRef(null);
    // 💥 关键：添加 viewerRef
    const viewerRef = useRef(null);
    // 💥 新增状态：用于记录耗时
    const [executionTime, setExecutionTime] = useState(0);
    // 💥 新增: 跟踪是否正在从任务列表加载历史对话
    const [isLoadingFromTaskList, setIsLoadingFromTaskList] = useState(false);
    // 3D 交互状态
    const [highlightState, setHighlightState] = useState({ name: null, isHighlighted: false });
    const [partVisibility, setPartVisibility] = useState({});
    const [modelParts, setModelParts] = useState([]);
    const [isGridVisible, setIsGridVisible] = useState(true);
    const [quality, setQuality] = useState('medium');

    // 相机控制
    const [cameraType, setCameraType] = useState('perspective');
    const [upAxis, setUpAxis] = useState('z');
    // 💥 交互锁定
    const [isViewLocked, setIsViewLocked] = useState(false);

    const [leftPanelWidth, setLeftPanelWidth] = useState(60);
    const containerRef = useRef(null);
    const viewerContainerRef = useRef(null);

    const { user } = useUserStore();
    const { messages, addMessage, updateLastAiMessage, isLoadingMessages, activeTaskId, activeConversationId, ensureConversation, createTask, fetchMessagesForTask } = useConversationStore();
    const { fetchHistory } = useOutletContext();

    // 💥 新增: 从任务列表跳转时自动加载历史对话
    const hasLoadedFromTaskList = useRef(false);

    useEffect(() => {
        if (location.state?.fromTaskList && location.state?.taskId && location.state?.conversationId && !hasLoadedFromTaskList.current) {
            console.log('🔄 GeometricModelingPage: 从任务列表跳转', location.state);

            // 标记已加载,防止重复执行
            hasLoadedFromTaskList.current = true;

            // **关键修复**: 立即设置loading状态,防止显示空白页面
            setIsLoadingFromTaskList(true);
            console.log('⏳ GeometricModelingPage: 设置isLoadingFromTaskList=true');

            const { taskId, conversationId } = location.state;

            // 调用 store 的 fetchMessagesForTask 方法加载历史消息
            console.log('📞 GeometricModelingPage: 调用fetchMessagesForTask', { taskId, conversationId });
            fetchMessagesForTask(taskId, conversationId).then(() => {
                // 加载完成后清除loading状态
                console.log('✅ GeometricModelingPage: 完成');
                setIsLoadingFromTaskList(false);
            }).catch(err => {
                console.error('❌ GeometricModelingPage: 错误', err);
                setIsLoadingFromTaskList(false);
            });

            // 清除 state,避免刷新页面时重复加载
            window.history.replaceState({}, document.title);
        } else {
            console.log('ℹ️ GeometricModelingPage: location.state不满足条件或已加载过', { state: location.state, hasLoaded: hasLoadedFromTaskList.current });
        }
    }, [location, fetchMessagesForTask]);

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

    // 💥 处理截图请求
    const handleSnapshot = useCallback((width, height) => {
        if (viewerRef.current) {
            viewerRef.current.captureSnapshot(width, height);
        } else {
            console.warn("Viewer ref is not attached.");
        }
    }, []);

    // --- Effect: 监听消息更新 (包含自动显示逻辑) ---
    useEffect(() => {
        if (!messages || messages.length === 0) return;

        const lastAiMsg = messages.slice().reverse().find(m => m.role === 'assistant');
        const lastUserMsg = messages.slice().reverse().find(m => m.role === 'user');

        if (lastUserMsg) setLastUserPrompt(lastUserMsg.content);

        if (lastAiMsg) {
            setLastAiContent(lastAiMsg.content);
            setLatestMetadata(lastAiMsg.metadata || {});

            // 判断任务是否彻底完成 (有文件且不再流传输)
            const isComplete = lastAiMsg.metadata?.stl_file && lastAiMsg.metadata?.preview_image && !isStreaming;
            setIsGeometryTaskStreaming(lastAiMsg.task_type === 'geometry' && !isComplete);

            // 💥 自动显示逻辑：当检测到 stl_file 且该文件未被加载过时触发
            const stlFile = lastAiMsg.metadata?.stl_file;
            if (stlFile && stlFile !== loadedFileRef.current) {
                console.log("自动加载新生成的模型:", stlFile);
                handleShowModel(stlFile);
            }
        }
    }, [messages, activeTaskId, activeConversationId, isStreaming]);

    // --- 清理 URL 对象 ---
    useEffect(() => {
        return () => {
            if (currentStlUrl) URL.revokeObjectURL(currentStlUrl);
        };
    }, []);

    // --- 💥 新增 Effect: 从历史记录恢复状态 (组件挂载时执行) ---
    useEffect(() => {
        // 仅在有消息、非流式传输且当前没有加载模型时执行
        if (messages && messages.length > 0 && !isStreaming && !currentStlUrl) {

            // 1. 恢复对话状态 (Prompt 和 AI 回复)
            const lastAiMsg = messages.slice().reverse().find(m => m.role === 'assistant');
            const lastUserMsg = messages.slice().reverse().find(m => m.role === 'user');

            if (lastUserMsg) setLastUserPrompt(lastUserMsg.content);

            if (lastAiMsg) {
                setLastAiContent(lastAiMsg.content);
                setLatestMetadata(lastAiMsg.metadata || {});

                // 2. 尝试自动加载模型
                const stlFile = lastAiMsg.metadata?.stl_file;

                // 优先使用 metadata 中的文件名，其次尝试路由传递的 state
                const fileToLoad = stlFile || location.state?.fileName;

                if (fileToLoad && activeTaskId) {
                    console.log("正在从历史记录恢复模型:", fileToLoad);
                    // 稍微延迟确保 activeTaskId 已就绪
                    setTimeout(() => handleShowModel(fileToLoad), 100);
                }
            }
        }
    }, [messages, activeTaskId, activeConversationId]); // 依赖项：当消息加载或任务ID变化时触发

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

    // 交互逻辑
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

    // 聊天逻辑
    const handleQuestionClick = (question) => setInputValue(question);

    const handleSendMessage = async () => {
        if ((!inputValue.trim() && !selectedFile) || isStreaming) return;

        let userMessageContent = inputValue;
        let filesForRequest = [];
        // --- ⏱️ 计时开始 (使用高精度时间) ---
        const startTime = performance.now();
        setExecutionTime(0); // 清空上一轮时间，让用户感知到新任务开始了

        addMessage({ role: 'user', content: userMessageContent });
        setInputValue('');
        setIsStreaming(true);
        // 重置自动加载标记
        loadedFileRef.current = null;
        addMessage({
            role: 'assistant',
            content: '',
            task_type: 'geometry', // <--- 关键补充
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

        executeTaskAPI({
            query: inputValue,
            user: user?.email || "anonymous",
            conversation_id: conversationId,
            task_id: taskIdToUse,
            task_type: 'geometry',
            files: filesForRequest,
            response_mode: "streaming",
            onMessage: {
                conversation_info: (data) => { if (data.metadata) updateLastAiMessage({ metadata: data.metadata }); },

                // 💥💥💥 核心修复逻辑：表格与流式处理 💥💥💥
                text_chunk: (data) => {
                    let text = data.text;

                    // 1. 表格错位修复：
                    // 如果检测到这一行可能是表格（含有 | ），尝试去除不必要的首部空格
                    // 同时，防止将表格内容解析为普通文本
                    if (text && text.includes('|')) {
                        // 移除行首空格，避免 Markdown 解析器将 | 视为引用块或代码块的缩进
                        text = text.replace(/^ +\|/gm, '|');
                    }

                    // 2. 强制分段修复：
                    // 如果检测到“开始执行代码”等转场语，强制前面加双换行
                    // 这能有效防止前面的表格“吸入”后续的文字
                    if (text && (
                        text.includes("I will execute") ||
                        text.includes("我将执行") ||
                        text.includes("Generating code") ||
                        text.includes("生成代码")
                    )) {
                        text = "\n\n" + text;
                    }

                    updateLastAiMessage({ textChunk: text });
                },

                message_end: (data) => updateLastAiMessage({ finalData: data }),
            },
            onError: (error) => {
                console.error("SSE error:", error);
                const endTime = performance.now();
                const duration = Math.round(endTime - startTime);
                console.warn(`[Geometry Task Failed] Duration: ${duration}ms`, error);

                // 建议：即使失败也设置耗时，或者设置一个特殊的失败标记
                // setExecutionTime(duration); // 可选：如果你想让用户看到即使失败也花了多少时间

                updateLastAiMessage({ finalData: { answer: "请求出错。", metadata: {} } });
                setIsStreaming(false);
            },
            onClose: () => {
                // --- ⏱️ 计时结束 (成功) ---
                const endTime = performance.now();
                const duration = Math.round(endTime - startTime);

                // 1. 更新 UI 状态
                setExecutionTime(duration);

                // 2. 纯前端日志记录 (不调用后端 API)
                // 使用特殊的样式打印，方便开发者在 F12 控制台一眼看到
                console.log(
                    `%c [CAutoD Performance] %c Task Completed %c ${duration}ms `,
                    'background:#35495e ; padding: 1px; border-radius: 3px 0 0 3px;  color: #fff',
                    'background:#41b883 ; padding: 1px; border-radius: 0 3px 3px 0;  color: #fff',
                    'background:transparent; color: #333; font-weight: bold'
                );
                // ------------------------

                setIsStreaming(false);
            },
        });
    };
    // 💥 关键修复：如果正在加载历史消息或从任务列表加载，显示加载圈
    if (isLoadingMessages || isLoadingFromTaskList) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-64px)]">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }
    // 只有当确实没有消息且没有activeTaskId且不是从任务列表跳转时,才显示初始页面
    const isFromTaskList = location.state?.fromTaskList;
    if (messages.length === 0 && !activeTaskId && !isFromTaskList) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] bg-white pb-20 overflow-y-auto">
                <div className="w-full max-w-2xl text-center px-4">
                    <h1 className="text-4xl font-bold mb-8 text-gray-800">您的设计需求是？</h1>
                    <WorkflowGuide />
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

    return (
        <div ref={containerRef} className="flex h-[calc(100vh-64px)] bg-gray-50 overflow-hidden relative cursor-default select-none">

            <div style={{ width: `${leftPanelWidth}%` }} className="h-full relative bg-[#1e1e1e] flex flex-col transition-all duration-75 ease-out">
                <div ref={viewerContainerRef} className="relative w-full h-full overflow-hidden bg-gradient-to-b from-[#2c2c2c] to-[#1a1a1a]">

                    {/* 💥 传递截图回调到 Toolbar */}
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
                    {/* 💥 将 executionTime 传入 DetailsPanel */}
                    <DetailsPanel
                        metadata={latestMetadata}
                        prompt={lastUserPrompt}
                        executionTime={executionTime}
                    />

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
                            // 💥 关键修复：传递网格显示状态
                            isGridVisible={isGridVisible}
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                            <Box className="w-16 h-16 mb-4 opacity-20" />
                            <p className="font-medium text-gray-400">等待加载 3D 模型...</p>
                            <p className="text-xs mt-2 opacity-70">生成完成后将自动展示</p>
                        </div>
                    )}

                    <FloatingProgress metadata={latestMetadata} isStreaming={isGeometryTaskStreaming} content={lastAiContent} />
                    {isLoadingModel && (<div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-30"><div className="flex flex-col items-center text-white"><Loader2 className="w-8 h-8 animate-spin mb-2" /><span className="text-sm font-medium">加载模型资源...</span></div></div>)}
                </div>
            </div>

            <div className="w-1 bg-[#333] hover:bg-indigo-500 transition-colors cursor-col-resize z-40 flex-shrink-0 shadow-lg" onMouseDown={handleMouseDown} />

            <div style={{ width: `${100 - leftPanelWidth}%` }} className="h-full flex flex-col bg-white shadow-2xl z-10">
                <div className="flex-1 overflow-hidden">
                    <ConversationDisplay messages={messages} isLoading={isLoadingMessages} onQuestionClick={handleQuestionClick} onImagesExtracted={() => { }} onShowModel={handleShowModel} />
                </div>
                <div className="p-4 border-t bg-white">
                    <ChatInput inputValue={inputValue} onInputChange={(e) => setInputValue(e.target.value)} onSendMessage={handleSendMessage} isStreaming={isStreaming} placeholder="输入您的修改意见..." selectedFile={selectedFile} onFileSelect={setSelectedFile} />
                </div>
            </div>
        </div>
    );
};

export default GeometricModelingPage;