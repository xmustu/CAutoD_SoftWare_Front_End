import React, { useState, useEffect, useMemo } from 'react';
import useConversationStore from '@/store/conversationStore'; 
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import PartCard from './PartCard'; 
import ProtectedImage from './ProtectedImage'; 
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle ,// 导入 DialogDescription
    DialogDescription} from "@/components/ui/dialog"; 
import { 
    Download, Code, Image as ImageIcon, Clipboard, View, 
    CheckCircle, Box, Loader2, Image 
} from 'lucide-react'; 
import { downloadFileAPI } from '@/api/fileAPI';
import ReactMarkdown from 'react-markdown'; 
import rehypeRaw from 'rehype-raw'; 
import remarkGfm from 'remark-gfm'; 
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'; 
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'; 
import SuggestedQuestions from './SuggestedQuestions';
import ThreeDViewer from './ThreeDViewer'; 

// --- 辅助组件：UserMessage, CodeBlock, OptimizationLogRenderer (保持不变) ---
const UserMessage = ({ content }) => (
  <div className="flex justify-end my-4">
    <div className="bg-purple-600 text-white rounded-lg p-3 max-w-lg break-words">
      {content}
    </div>
  </div>
);

const CodeBlock = ({ language, children }) => {
  const [isCopied, setIsCopied] = useState(false);
  const textToCopy = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  return (
    <div className="relative group my-4">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 z-10 p-1 rounded-md bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Copy code"
      >
        {isCopied ? (
          <span className="text-xs px-1">Copied!</span>
        ) : (
          <Clipboard className="h-4 w-4" />
        )}
      </button>
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language}
        PreTag="div"
      >
        {textToCopy}
      </SyntaxHighlighter>
    </div>
  );
};

const OptimizationLogRenderer = ({ content }) => {
    // 使用 useMemo 缓存解析后的日志，提高性能
  const logEvents = useMemo(() => {
    if (!content) return [];
    const blocks = content.split(/(?=开始优化|发送参数|优化完成|优化结果详细信息)/).filter(Boolean);

    return blocks.map((block, index) => {
      if (block.includes('仿真执行失败') || block.includes('仿真评估错误')) {
        return { type: 'ERROR', content: block, id: `error-${index}` };
      }
      if (block.startsWith('开始优化')) {
        return { type: 'START', content: block, id: `start-${index}` };
      }
      if (block.startsWith('发送参数')) {
        const titleMatch = block.match(/发送参数 \((.+?)\)/);
        return { type: 'ITERATION', title: titleMatch ? titleMatch[1] : '迭代', content: block, id: `iter-${index}` };
      }
      if (block.startsWith('优化完成')) {
        return { type: 'END', content: block, id: `end-${index}` };
      }
      if (block.startsWith('优化结果详细信息')) {
        return { type: 'RESULT', content: block, id: `result-${index}` };
      }
      return { type: 'INFO', content: block, id: `info-${index}` };
    });
  }, [content]);

  return (
    <div className="space-y-4">
      {logEvents.map(event => {
        const isError = event.type === 'ERROR';
        return (
          <Card key={event.id} className={isError ? 'border-red-500' : ''}>
            <CardHeader>
              <CardTitle className={isError ? 'text-red-500' : ''}>
                {event.type === 'ITERATION' && `迭代详情 (${event.title})`}
                {event.type === 'ERROR' && '错误'}
                {event.type === 'START' && '开始优化'}
                {event.type === 'END' && '优化完成'}
                {event.type === 'RESULT' && '最终结果'}
                {event.type === 'INFO' && '初始化信息'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded-md">
                <code>{event.content.trim()}</code>
              </pre>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

// -------------------------------------------------------------
// 【修复并改进】几何建模进度追踪组件 (保留用户的新逻辑)
// -------------------------------------------------------------
const GeometryProgressTracker = ({ metadata, isOptimizationLog, isStreaming, content}) => {
    
    if (isOptimizationLog) return null;

    const safeMetadata = metadata || {};
    const hasAnyFile = safeMetadata.code_file || safeMetadata.preview_image || safeMetadata.stl_file || safeMetadata.cad_file;
    
    // 简化 isCodeGenerated 判断
    const isCodeGenerated = !!safeMetadata.code_file || (content && content.includes('import cadquery') && content.includes('```'));
    
    const isModelReady = !!safeMetadata.stl_file || !!safeMetadata.cad_file;
    const isPreviewImageReady = !!safeMetadata.preview_image;
    const isTaskComplete = isCodeGenerated && isModelReady && isPreviewImageReady;
    

    // 🚨 最终修复 1: 确保参数对话框被隐藏 (保留用户逻辑)
    const isPureParameterMessage = 
        !isCodeGenerated && 
        !hasAnyFile && 
        content && 
        (content.includes('建模参数') || content.includes('推荐')); 
    
    if (isPureParameterMessage) {
        return null; 
    }
    
    const isGeometryTask = true; // 既然代码已生成或正在流式传输，我们就认为这是几何任务
    if (!isGeometryTask) return null;
    
    // 定义任务流程步骤
    const pipelineSteps = [
        { name: '生成建模代码', icon: Code, condition: isCodeGenerated },
        { name: '构建 CAD 模型 (STP/STL)', icon: Box, condition: isModelReady },
        { name: '生成可视化预览图', icon: Image, condition: isPreviewImageReady },
    ];
    
    // 动态状态文本
    let currentStatusText = "任务正在启动...";
    
    if (isTaskComplete) {
        currentStatusText = "✅ 任务已完成，所有文件已就绪。";
    } else if (isPreviewImageReady) {
        currentStatusText = "模型构建完成，预览图已生成。";
    } else if (isModelReady) {
        currentStatusText = "模型构建完成，正在生成可视化预览图...";
    // 当代码已生成但模型未就绪时，强制显示构建模型状态，解决跳过问题。
    } else if (isCodeGenerated) { 
        currentStatusText = "⚙️ 代码已生成，正在执行构建 CAD 模型...";
    } else if (isStreaming) { 
        currentStatusText = "⚙️ 正在生成建模代码并执行任务，请稍候...";
    } else {
        currentStatusText = "正在初始化建模任务，等待后端响应...";
    }

    // 确定当前正在进行的步骤
    let currentStepIndex = -1;
    for (let i = 0; i < pipelineSteps.length; i++) {
        if (!pipelineSteps[i].condition) {
            currentStepIndex = i;
            break;
        }
    }

    const showProgressBar = !isTaskComplete;
    
    return (
        <div className="mb-4 p-4 border rounded-lg bg-indigo-50 border-indigo-200">
            <h4 className="text-base font-bold mb-3 text-indigo-700 flex items-center">
                <Loader2 className={`mr-2 h-4 w-4 ${showProgressBar ? 'animate-spin' : ''} text-indigo-600`} /> 几何建模进度
            </h4>
            <div className="space-y-2">
                {pipelineSteps.map((step, index) => {
                    const isComplete = step.condition;
                    const isCurrent = index === currentStepIndex && showProgressBar; 
                    
                    const Icon = isComplete ? CheckCircle : (isCurrent ? Loader2 : step.icon);
                    const statusColor = isComplete ? 'text-green-600' : (isCurrent ? 'text-blue-500' : 'text-gray-400');
                    
                    return (
                        <div key={index} className="flex items-center text-sm">
                            <Icon className={`mr-2 h-4 w-4 ${statusColor} ${isCurrent ? 'animate-spin' : ''}`} />
                            <span className={isComplete ? 'font-medium' : 'text-gray-600'}>
                                {step.name}
                                {isComplete ? '：已完成' : (isCurrent ? '：正在生成' : '：等待中')}
                            </span>
                        </div>
                    );
                })}
            </div>
            <p className="mt-3 text-sm italic text-indigo-500 font-semibold">{currentStatusText}</p>
        </div>
    );
};


const AiMessage = ({ message, onParametersExtracted, onQuestionClick, onImagesExtracted }) => {
  //console.log("AiMessage: Received message object (full):", message);
  const { content, parts, metadata, suggested_questions } = message;

    // 【使用 useMemo 优化性能】缓存 Markdown 预处理结果 (保持不变)
   const preprocessMarkdown = useMemo(() => {
        
        const fn = (markdownContent) => {
            if (!markdownContent) return '';
            const listItemRegex = /^- (\w+)：(.+?)，推荐 (.+)/;
            
            const allLines = markdownContent.split('\n');
            let tableRows = [];
            
            // 存储非列表行的内容，以及列表项的起始和结束索引
            let contentBeforeList = [];
            let contentAfterList = [];
            let listStarted = false;
            let listEnded = false;
            let listLineCount = 0; // 记录列表项的行数

            allLines.forEach((line) => {
              const trimmedLine = line.trim();
              const match = trimmedLine.match(listItemRegex);
              
              if (match) {
                listStarted = true;
                listLineCount++;
                // ... (表格行构建逻辑保持不变) ...
                const [, paramName, description, recommendedValue] = match;
        
                const valueParts = recommendedValue.trim().split(/\s+/);
                let value = recommendedValue.trim();
                let unit = '—';
        
                if (valueParts.length > 1) {
                  const lastPart = valueParts[valueParts.length - 1];
                  if (isNaN(parseFloat(lastPart))) {
                    value = valueParts.slice(0, -1).join(' ');
                    unit = lastPart;
                  }
                }
        
                const rowHtml = `<tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${paramName}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${description.trim()}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${value}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${unit}</td>
                </tr>`;
                tableRows.push(rowHtml);
              } else if (listStarted && !listEnded) {
                // 如果列表已开始，但遇到非列表项，我们假设列表结束
                if (trimmedLine !== "") {
                    listEnded = true;
                    contentAfterList.push(line);
                }
              } else if (listEnded) {
                // 列表结束后的所有内容
                contentAfterList.push(line);
              } else {
                // 列表开始前的所有内容
                contentBeforeList.push(line);
              }
            });
        
            if (tableRows.length > 0) {
              const headerHtml = `<tr class="bg-gray-50">
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">参数名</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">含义</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">推荐值</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">单位</th>
              </tr>`;
              
              // 修复 1: 使用标准的 THEAD 和 TBODY 结构
              const finalTable = `<div class="overflow-x-auto my-4"><table class="min-w-full divide-y divide-gray-200 border border-gray-300">
                <thead class="bg-gray-50">${headerHtml}</thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  ${tableRows.join('')}
                </tbody>
              </table></div>`;
              
              // 🚨 修复 2: 将内容重新拼接：之前的内容 + 表格 HTML + 列表后的内容 (包括代码块)
              return [
                    ...contentBeforeList, 
                    '', // 确保表格上方有空行
                    finalTable, 
                    '', // 确保表格下方有空行
                    ...contentAfterList
                ].join('\n');
            }
        
            // 如果没有匹配到参数列表，我们仍然需要修复标准 Markdown 表格周围的空行
            let cleanedContent = markdownContent.split('\n').map(line => line.trimEnd()).join('\n');
            
            if (cleanedContent.includes('| --- |')) { // 检查内容是否包含标准 Markdown 表格
                cleanedContent = cleanedContent.replace(/\| --- \|/g, '\n| --- |');
                cleanedContent = `\n${cleanedContent}\n`;
            }

            return cleanedContent;
          };
          return fn(content);
    }, [content]);

    // 【新增状态】：用于 3D 预览弹窗 (保持不变)
    const [is3DViewerOpen, setIs3DViewerOpen] = useState(false); 
    const [current3DModelUrl, setCurrent3DModelUrl] = useState(''); 
    // 关闭对话框时释放 Blob URL 资源
    useEffect(() => {
        if (!is3DViewerOpen && current3DModelUrl && current3DModelUrl.startsWith('blob:')) {
            URL.revokeObjectURL(current3DModelUrl);
            setCurrent3DModelUrl('');
        }
    }, [is3DViewerOpen, current3DModelUrl]);

    // 【新增状态】：用于图片放大预览 (保持不变)
    const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
    const [previewImageUrl, setPreviewImageUrl] = useState(''); 
    const [previewImageAlt, setPreviewImageAlt] = useState(''); 

    const handleImageClick = (url, alt) => {
        setPreviewImageUrl(url);
        setPreviewImageAlt(alt);
        setIsImagePreviewOpen(true);
    };

    // 🚨 核心辅助函数：根据文件类型构造 URL (双文件机制)
    const getFileUrl = (fileName) => {
        if (!fileName) return '';
        const { activeConversationId, activeTaskId } = useConversationStore.getState();
        const apiBase = (import.meta?.env?.PROD && import.meta?.env?.VITE_API_URL)
            ? String(import.meta.env.VITE_API_URL).replace(/\/+$/, '')
            : '';

        // 文件名后缀检查 (图片是静态资源)
        const isImage = /\.(png|jpg|jpeg|gif)$/i.test(fileName);

        if (isImage) {
            // 静态图片走后端静态文件目录（容器环境必须使用绝对 API 前缀）
            const path = `/files/${activeConversationId}/${activeTaskId}/${fileName}`;
            // 生产环境优先使用绝对地址，避免代理不可用
            return apiBase ? `${apiBase}${path}` : path;
        }

        // 受保护资源路径：模型文件 (STL, STEP/CAD)
        // 依赖 /api/download_file，即使是 POST，前端也必须构造这个 URL。
        const query = `/api/download_file?task_id=${activeTaskId}&conversation_id=${activeConversationId}&file_name=${encodeURIComponent(fileName)}`;
        return apiBase ? `${apiBase}${query}` : query;
    };
    
    // 🚨 新增：通过已鉴权的 API 获取 Blob 并在新窗口打开（解决 401）
    const handlePostFile = async (fileName, isCAD = false) => {
        if (!fileName) return;
        const { activeConversationId, activeTaskId } = useConversationStore.getState();
        try {
            const blob = await downloadFileAPI(activeTaskId, activeConversationId, fileName);
            const blobUrl = window.URL.createObjectURL(blob);
            setCurrent3DModelUrl(blobUrl);
            setIs3DViewerOpen(true);
        } catch (e) {
            console.error('打开文件失败:', e);
        }
    };


    const handleShowModelInDialog = (fileName) => {
        if (!fileName) return;
        
        // 🚨 关键修复：从内嵌预览改为 POST 下载（解决 POST 限制）
        handlePostFile(fileName);
    };

    // ... (其他逻辑保持不变) ...

    const partsToRender = parts?.filter(p => p.type === 'part') || [];
    const imagesToDisplay = parts?.filter(p => p.type === 'image') || [];
    
    useEffect(() => {
        if (imagesToDisplay.length > 0 && onImagesExtracted) {
            onImagesExtracted(imagesToDisplay);
        }
    }, [imagesToDisplay, onImagesExtracted]);

    // 新增一个判断内容是否包含完整代码块的标记
    const hasCompletedCodeBlock = content && content.includes('import cadquery as cq') && content.includes('result = box'); // 使用更保守的判断
    
    // 保持 streaming 的判断逻辑
    const isOptimizationLog = message.task_type === 'optimize' || (content && (content.includes('开始优化') || content.includes('发送参数')));

    // 新增：判断任务是否处于“代码已生成，模型未生成”的中间状态
    const isCodeGeneratedButModelNotReady = 
        (metadata && metadata.code_file) || hasCompletedCodeBlock && !(metadata && (metadata.stl_file || metadata.cad_file));
        
    // 任务是否已完成（所有关键文件都已就绪）
    // AiMessage 组件内
    // 任务是否已完成（所有关键文件都已就绪）
    const isTaskCompleted = metadata && (metadata.stl_file || metadata.cad_file) && metadata.preview_image;
    
    // 🚨 核心改进：判断是否为正在进行中的几何建模任务 (判断是否在流式传输/处理)
    const isGeometryTaskProcessing = message.task_type === 'geometry' && !isTaskCompleted;

    // 🚨 进度条渲染条件：只要是几何任务，就渲染进度条。
    const shouldRenderProgressTracker = message.task_type === 'geometry' && !isOptimizationLog;

    const handleDownload = async (fileName) => {
        if (!fileName) return;
        const { activeConversationId, activeTaskId } = useConversationStore.getState();
        try {
          // 注意：CAD文件直接使用这个 API 进行下载，它很可能也是 POST
          const response = await downloadFileAPI(activeTaskId, activeConversationId, fileName);
          const url = window.URL.createObjectURL(response);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', fileName);
          document.body.appendChild(link);
          link.click();
          link.parentNode.removeChild(link);
          window.URL.revokeObjectURL(url);
        } catch (error) {
          console.error("Download failed:", error);
        }
    };
    
    // 🚨 新增：处理复制代码的逻辑
    const handleCopyCode = () => {
        const codeMatch = content.match(/```python\n([\s\S]*?)```/);
        const codeToCopy = codeMatch ? codeMatch[1].trim() : content.trim(); // 尝试提取代码块，否则复制全部内容
        
        if (codeToCopy && codeToCopy !== '无法解析代码块内容') {
            navigator.clipboard.writeText(codeToCopy).then(() => {
                // 假设有一个 Toast 或其他提示机制
                console.log("Code Copied successfully!"); 
            });
        } else {
            console.error("Failed to find/copy code block.");
        }
    };

    return (
        <>
        
               <div className="flex items-start my-4">
                <Avatar className="mr-4">
                    <AvatarFallback>AI</AvatarFallback>
                </Avatar>
                <div className="bg-gray-100 rounded-lg p-3 w-full max-w-4xl">
                    
                    {/* 进度条组件渲染 */}
                    {shouldRenderProgressTracker && (
                        <GeometryProgressTracker 
                            metadata={metadata} 
                            isOptimizationLog={isOptimizationLog} 
                            // 🚨 修复 1.3: 仅在内容为空时才标记为 isStreaming (用于触发 "正在生成代码" 的状态)
                            isStreaming={isGeometryTaskProcessing && content.trim().length === 0} 
                            content={content} 
                        />
                    )}

                    {/* 内容渲染逻辑 */}
                    {(content && content.trim()) || isOptimizationLog ? ( // 只要有内容或它是日志，就渲染
                        <div className="flex-grow">
                            {isOptimizationLog ? (
                                <OptimizationLogRenderer content={content} />
                            ) : (
                                <div className="prose max-w-none break-words">
                                    <ReactMarkdown
                                        rehypePlugins={[rehypeRaw]}
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            code: (props) => { /* CodeBlock */ const match = /language-(\w+)/.exec(props.className || ''); return !props.inline && match ? (<CodeBlock language={match[1]} {...props}>{props.children}</CodeBlock>) : (<code className={props.className} {...props}>{props.children}</code>);},
                                            // 🚨 修复 3.4: 恢复最初版本中对表格的覆盖
                                            table: (props) => <table className="min-w-full divide-y divide-gray-200 border border-gray-300" {...props} />,
                                            thead: (props) => <thead className="bg-gray-50" {...props} />,
                                            tbody: (props) => <tbody className="bg-white divide-y divide-gray-200" {...props} />,
                                            tr: (props) => <tr className="hover:bg-gray-50" {...props} />,
                                            th: (props) => <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" {...props} />,
                                            td: (props) => <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700" {...props} />,
                                        }}
                                    >
                                        {preprocessMarkdown}
                                    </ReactMarkdown>
                                </div>
                            )}
                        </div>
                    ) : (
                        // 任务启动中的加载指示
                        isGeometryTaskProcessing && (
                            <div className="flex items-center text-indigo-700 font-medium py-2">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 正在等待建模代码流式响应...
                            </div>
                        )
                    )}
                    {/* 迭代曲线图片渲染区域 (imagesToDisplay) */}
                    {imagesToDisplay.length > 0 && (
                        <div className="mt-4 pt-2 space-y-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {imagesToDisplay
                                // 💥 筛选逻辑：确保只渲染曲线和分布图 💥
                                .filter(img => img.altText === "收敛曲线" || img.altText === "参数分布图")
                                .map((image, idx) => {
                                    // 🚨 修复点 1：使用 getFileUrl 构造静态图片 URL
                                    const fullImageUrl = getFileUrl(image.fileName || image.imageUrl); 
                                    
                                    return (
                                        <Card key={idx} className="p-2">
                                            <ProtectedImage
                                                src={fullImageUrl} // 传入正确的静态 URL
                                                alt={image.altText}
                                                className="w-full h-auto object-contain rounded cursor-pointer"
                                                onClick={() => handleImageClick(fullImageUrl, image.altText)} 
                                            />
                                            <p className="text-center text-sm font-semibold mt-2">{image.altText}</p>
                                        </Card>
                                    );
                                })}
                        </div>
                    )}
                    {/* 文件下载按钮区 */}
                    {/* 渲染条件：metadata 中有任何文件 或 content 中包含完整代码块 */}
                    {(metadata && (metadata.preview_image || metadata.cad_file || metadata.code_file)) || hasCompletedCodeBlock ? (
                        <div className="mt-4 border-t pt-2">
                            <h4 className="text-sm font-semibold mb-2">生成文件:</h4>
                            <div className="flex flex-col space-y-2">
                                
                                {/* 预览图按钮 */}
                                {metadata && metadata.preview_image && (
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    // 🚨 修复点 3：预览图使用静态 URL
                                    onClick={() => handleImageClick(getFileUrl(metadata.preview_image), "预览图")}
                                >
                                    <ImageIcon className="mr-2 h-4 w-4" /> 预览图
                                </Button>
                                )}

                                {/* CAD 模型按钮组 */}
                                {(metadata && metadata.cad_file) && (
                                <div className="flex space-x-2">
                                    <Button variant="outline" size="sm" onClick={() => handleDownload(metadata.cad_file)} className="flex-1">
                                        <Download className="mr-2 h-4 w-4" /> 下载CAD模型
                                    </Button>
                                    {/* STL 模型展示按钮 (使用 POST 下载到新窗口) */}
                                    {metadata.stl_file && (
                                    // 🚨 修复点 4：从模态框预览回退到新窗口 POST 下载
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={() => handlePostFile(metadata.stl_file)} 
                                            className="flex-1"
                                        >
                                            <View className="mr-2 h-4 w-4" /> 展示STL模型
                                        </Button>
                                    )}
                                </div>
                                )}

                                {/* 复制代码按钮 (保持不变) */}
                                {!isOptimizationLog && (metadata && metadata.code_file || hasCompletedCodeBlock) && (
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={metadata && metadata.code_file ? () => handleDownload(metadata.code_file) : handleCopyCode}
                                    > 
                                        <Code className="mr-2 h-4 w-4" /> 
                                        {metadata && metadata.code_file ? `下载建模代码 (${metadata.code_file})` : '复制代码 (CadQuery)'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : null}

                    {/* 推荐问题 (保持不变) */}
                    {suggested_questions && (
                        <SuggestedQuestions questions={suggested_questions} onQuestionClick={onQuestionClick} />
                    )}
                </div>
            </div>
            {/* 3D 模型查看器 Dialogs (保持不变) */}
            <Dialog open={is3DViewerOpen} onOpenChange={setIs3DViewerOpen}>
                <DialogContent className="sm:max-w-[800px] h-[600px] p-0"> 
                    <DialogHeader className="p-4 border-b">
                    <DialogTitle>3D 模型预览</DialogTitle>
                    {/* 🚨 添加 Description 解决警告 */}
                    <DialogDescription className="sr-only">三维模型交互预览窗口，用于查看STL格式的几何模型。</DialogDescription>
                    </DialogHeader>
                    <div className="flex-grow w-full h-[calc(100%-60px)]"> 
                    {current3DModelUrl ? (
                        <ThreeDViewer modelUrl={current3DModelUrl} />
                    ) : (
                        <div className="flex items-center justify-center w-full h-full text-gray-500">
                            无法加载模型：URL 为空。
                        </div>
                    )}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isImagePreviewOpen} onOpenChange={setIsImagePreviewOpen}>
                <DialogContent className="max-w-screen-xl p-4 sm:max-w-5xl md:max-w-6xl"> 
                    <DialogHeader className="p-0">
                    <DialogTitle>{previewImageAlt || "图片详情"}</DialogTitle>
                    {/* 🚨 添加 Description 解决警告 */}
                   <DialogDescription className="sr-only">放大查看 {previewImageAlt || "图片"} 的详细内容。</DialogDescription>
                    </DialogHeader>
                    <div className="w-full max-h-[85vh] overflow-y-auto flex justify-center items-center">
                    {previewImageUrl && (
                        <ProtectedImage
                        src={previewImageUrl} // 现在 guaranteed 是正确 URL
                        alt={previewImageAlt}
                        className="max-w-full max-h-[80vh] object-contain rounded"
                        />
                    )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

const ConversationDisplay = ({ messages, isLoading, onParametersExtracted, onQuestionClick, onImagesExtracted }) => {
  if (isLoading) {
    return <div className="flex items-center justify-center h-full">正在加载对话记录...</div>;
  }
  return (
    <div className="flex-1 overflow-y-auto p-8 h-full">
      {messages.map((msg, index) =>
        msg.role === 'user' ? (
          <UserMessage key={msg.id || index} content={msg.content} />
        ) : (
          // 强制在内容长度变化时重新渲染，避免 store 就地修改导致 UI 不刷新
          <React.Fragment key={`${msg.id || index}-${(msg.content || '').length}-${(msg.parts || []).length}`}>
              <AiMessage 
                  message={msg} 
                  onParametersExtracted={onParametersExtracted}
                  onQuestionClick={onQuestionClick}
                  onImagesExtracted={onImagesExtracted}
              />
          </React.Fragment>
        )
      )}
    </div>
  );
};

export default ConversationDisplay;