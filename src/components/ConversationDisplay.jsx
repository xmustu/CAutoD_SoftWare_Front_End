import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import ProtectedImage from './ProtectedImage'; 
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"; 
import { Download, Code, Clipboard, View, CheckCircle, Box, Loader2, Image, Terminal } from 'lucide-react';
import { downloadFileAPI } from '@/api/fileAPI';
import ReactMarkdown from 'react-markdown'; 
import rehypeRaw from 'rehype-raw'; 
import remarkGfm from 'remark-gfm'; 
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'; 
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'; 
import SuggestedQuestions from './SuggestedQuestions';
import ThreeDViewer from './ThreeDViewer';
import useConversationStore from '@/store/conversationStore';
import { inferMessageType, extractUniqueImages, safeParseMetadata } from '@/utils/messageUtils';

// ==============================================================================
// 1. 基础辅助组件
// ==============================================================================

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
        {isCopied ? <span className="text-xs px-1">Copied!</span> : <Clipboard className="h-4 w-4" />}
      </button>
      <SyntaxHighlighter style={vscDarkPlus} language={language} PreTag="div">
        {textToCopy}
      </SyntaxHighlighter>
    </div>
  );
};

// ==============================================================================
// 2. 日志渲染组件
// ==============================================================================

const OptimizationLogRenderer = ({ content }) => {
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);

  const processedLines = useMemo(() => {
    if (!content) return [];

    let rawText = typeof content === 'string' ? content.replace(/\\n/g, '\n') : String(content);

    // 智能折叠刷屏的等待日志
    const waitRegex = /(^.*?等待.*?[\d.]+秒.*$(\n|$))+/gm;
    rawText = rawText.replace(waitRegex, (match) => {
       const timeMatches = match.match(/已等待([\d.]+)秒/g);
       const lastTime = timeMatches ? timeMatches[timeMatches.length - 1] : "0.0秒";
       return `⏳ 系统处理中... (${lastTime}) \n`; 
    });

    return rawText.split('\n').map((line, index) => {
        if (!line || line.trim() === '') return null;

        const trimmed = line.trim();
        let styleClass = 'text-gray-600';

        if (trimmed.includes('开始优化') || trimmed.includes('===') || trimmed.includes('收到目标命令')) {
            styleClass = 'text-blue-700 font-bold border-b border-blue-100 pb-1 mt-3 mb-1 block';
        } 
        else if (trimmed.includes('发送参数') || trimmed.includes('迭代') || trimmed.includes('原始组')) {
            styleClass = 'text-purple-600 font-semibold mt-1 block';
        } 
        else if (trimmed.includes('优化完成') || trimmed.includes('最优参数') || trimmed.includes('最优体积')) {
            styleClass = 'text-green-700 font-bold bg-green-50 p-1 rounded mt-2 block';
        } 
        else if (trimmed.toLowerCase().includes('error') || trimmed.includes('失败') || trimmed.includes('❌') || trimmed.includes('无可行解')) {
            styleClass = 'text-red-600 font-bold bg-red-50 p-1 rounded block';
        } 
        else if (trimmed.includes('info：') || trimmed.includes('info:') || trimmed.includes('更新参数')) {
            styleClass = 'text-gray-800 font-mono text-xs pl-4 border-l-2 border-gray-300 block';
        } 
        else if (trimmed.includes('⏳') || trimmed.includes('等待')) {
            styleClass = 'text-amber-500 italic text-xs animate-pulse block';
        }
        else if (trimmed.includes('n_gen') || trimmed.includes('----') || trimmed.includes('|')) {
             styleClass = 'text-xs font-mono text-gray-400 whitespace-pre block overflow-x-auto';
        }

        return { id: index, text: line, styleClass };
    }).filter(Boolean);
  }, [content]);

  useEffect(() => {
      if (bottomRef.current) {
          bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      }
  }, [processedLines.length, content]);

  return (
    <Card className="border border-gray-200 shadow-sm bg-[#fafafa] w-full mb-4">
      <CardHeader className="py-2 px-4 bg-gray-100 border-b border-gray-200 flex flex-row items-center gap-2">
        <Terminal className="w-4 h-4 text-gray-500" />
        <CardTitle className="text-sm font-medium text-gray-700">
            进程日志
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-80 overflow-y-auto p-4 font-mono text-sm leading-relaxed space-y-1 bg-white">
            {processedLines.length === 0 ? (
                <div className="text-gray-400 italic text-center py-4">日志等待中...</div>
            ) : (
                processedLines.map((line, idx) => (
                    <div key={idx} className={`${line?.styleClass || 'text-gray-600'} break-words min-h-[1.2em]`}>
                        {line?.text || ''}
                    </div>
                ))
            )}
            <div ref={bottomRef} style={{ float: "left", clear: "both" }} />
        </div>
      </CardContent>
    </Card>
  );
};

const GeometryProgressTracker = ({ metadata, content, isProcessing }) => {
    const safeMetadata = metadata || {};
    // 只有当有实质性内容时才显示
    // 🚨 关键：我们不需要在这里判断是否显示，因为 detectMessageType 已经做了路由
    // 如果进入到这个组件，说明已经是 GeometryView 了
    
    const isCodeGenerated = !!safeMetadata.code_file || (content && (
        content.includes('import cadquery') || 
        content.includes('```python') ||
        content.includes('show_object')
    ));

    const isModelReady = !!safeMetadata.stl_file || !!safeMetadata.cad_file;
    const isPreviewImageReady = !!safeMetadata.preview_image;
    const isTaskComplete = isCodeGenerated && isModelReady && isPreviewImageReady;

    const pipelineSteps = [
        { name: '生成建模代码', icon: Code, condition: isCodeGenerated },
        { name: '构建 CAD 模型 (STP/STL)', icon: Box, condition: isModelReady },
        { name: '生成可视化预览图', icon: Image, condition: isPreviewImageReady },
    ];

    let currentStatusText = "任务正在启动...";
    if (isTaskComplete) {
        currentStatusText = "✅ 任务已完成，所有文件已就绪。";
    } else if (isPreviewImageReady) {
        currentStatusText = "模型构建完成，预览图已生成。";
    } else if (isModelReady) {
        currentStatusText = "模型构建完成，正在生成可视化预览图...";
    } else if (isCodeGenerated) { 
        currentStatusText = "⚙️ 代码已生成，正在执行构建 CAD 模型...";
    } else if (isProcessing) { 
        currentStatusText = "⚙️ 正在生成建模代码并执行任务，请稍候...";
    }

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

// ==============================================================================
// 3. 通用 Markdown 预处理 Hook
// ==============================================================================

const useMarkdownProcessor = (content) => {
    return useMemo(() => {
        if (!content) return { processedContent: '', thinkContent: null, isThinking: false };

        let thinkContent = null;
        let mainContent = content;
        const isThinking = mainContent.includes('<think>') && !mainContent.includes('</think>');
        
        const thinkMatch = mainContent.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
        if (thinkMatch) {
            thinkContent = thinkMatch[1].trim();
            mainContent = mainContent.replace(thinkMatch[0], '').trim();
        }

        const listItemRegex = /^- (\w+)：(.+?)，推荐 (.+)/;
        const allLines = mainContent.split('\n');
        let tableRows = [];
        let contentBeforeList = [];
        let contentAfterList = [];
        let listStarted = false;
        let listEnded = false;

        allLines.forEach((line) => {
            const trimmedLine = line.trim();
            const match = trimmedLine.match(listItemRegex);
            
            if (match) {
                listStarted = true;
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
                if (trimmedLine !== "") {
                    listEnded = true;
                    contentAfterList.push(line);
                }
            } else if (listEnded) {
                contentAfterList.push(line);
            } else {
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
            const finalTable = `<div class="overflow-x-auto my-4"><table class="min-w-full divide-y divide-gray-200 border border-gray-300">
                <thead class="bg-gray-50">${headerHtml}</thead>
                <tbody class="bg-white divide-y divide-gray-200">${tableRows.join('')}</tbody>
              </table></div>`;
            return [...contentBeforeList, '', finalTable, '', ...contentAfterList].join('\n');
        }

        let finalLines = [];
        let inTable = false;
        
        mainContent.split('\n').forEach((line) => {
            const trimmed = line.trimEnd();
            const hasPipe = trimmed.includes('|');
            
            if (hasPipe) {
                if (!inTable) {
                    if (finalLines.length > 0 && finalLines[finalLines.length - 1] !== '') finalLines.push('');
                    inTable = true;
                }
                finalLines.push(trimmed);
            } else {
                if (inTable) {
                    if (trimmed !== '') finalLines.push('', trimmed);
                    else finalLines.push(trimmed);
                    inTable = false;
                } else {
                    finalLines.push(trimmed);
                }
            }
        });

        let cleanedContent = finalLines.join('\n');
        return { processedContent: cleanedContent, thinkContent, isThinking };
    }, [content]);
};

const markdownComponents = {
    code: (props) => {
        const match = /language-(\w+)/.exec(props.className || '');
        return !props.inline && match ? (<CodeBlock language={match[1]} {...props}>{props.children}</CodeBlock>) : (<code className={props.className} {...props}>{props.children}</code>);
    },
    table: (props) => <table className="min-w-full divide-y divide-gray-200 border border-gray-300" {...props} />,
    thead: (props) => <thead className="bg-gray-50" {...props} />,
    tbody: (props) => <tbody className="bg-white divide-y divide-gray-200" {...props} />,
    tr: (props) => <tr className="hover:bg-gray-50" {...props} />,
    th: (props) => <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" {...props} />,
    td: (props) => <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700" {...props} />,
};

// ==============================================================================
// 4. 业务逻辑子组件
// ==============================================================================

const ThinkBlock = ({ thinkContent, isThinking }) => {
    if (!thinkContent) return null;
    return (
        <details className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm text-gray-500" open={isThinking}>
            <summary className="cursor-pointer font-medium text-gray-700 select-none flex items-center">
                🧠 模型思考过程 {isThinking && <Loader2 className="ml-2 h-3 w-3 animate-spin inline" />}
            </summary>
            <div className="mt-2 pl-2 border-l-2 border-gray-300 whitespace-pre-wrap text-xs">
                {thinkContent}
            </div>
        </details>
    );
};

const GeometryMessageView = ({ content, metadata, isProcessing, onDownload, onPostFile, onCopyCode }) => {
    const { processedContent, thinkContent, isThinking } = useMarkdownProcessor(content);
    const hasCompletedCodeBlock = content && (content.includes('import cadquery') || content.includes('show_object')) && content.includes('```');

    return (
        <div className="geometry-view">
            <GeometryProgressTracker 
                metadata={metadata} 
                content={content} 
                isProcessing={isProcessing}
            />

            <ThinkBlock thinkContent={thinkContent} isThinking={isThinking} />

            {processedContent && processedContent.trim() ? (
                <div className="prose max-w-none break-words my-2">
                    <ReactMarkdown 
                        rehypePlugins={[rehypeRaw]} 
                        remarkPlugins={[remarkGfm]} 
                        components={markdownComponents}
                    >
                        {processedContent}
                    </ReactMarkdown>
                </div>
            ) : isProcessing && !thinkContent ? (
                <div className="flex items-center text-indigo-700 font-medium py-2">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 正在等待建模代码流式响应...
                </div>
            ) : null}

            {((metadata && (metadata.preview_image || metadata.cad_file || metadata.code_file)) || hasCompletedCodeBlock) && (
                <div className="mt-4 border-t pt-2">
                    <h4 className="text-sm font-semibold mb-2">生成文件:</h4>
                    <div className="flex flex-col space-y-2">
                        {metadata && metadata.cad_file && !metadata.stl_file && (
                            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200 mb-2">
                                当前前端仅支持 STL 预览，CAD 文件可下载但不可直接预览。
                            </div>
                        )}
                        {metadata && metadata.cad_file && (
                            <div className="flex space-x-2">
                                <Button variant="outline" size="sm" onClick={() => onDownload(metadata.cad_file)} className="flex-1">
                                    <Download className="mr-2 h-4 w-4" /> 下载CAD模型
                                </Button>
                                {metadata.stl_file && (
                                    <Button variant="outline" size="sm" onClick={() => onPostFile(metadata.stl_file)} className="flex-1">
                                        <View className="mr-2 h-4 w-4" /> 展示STL模型
                                    </Button>
                                )}
                            </div>
                        )}
                        
                        {(metadata?.code_file || hasCompletedCodeBlock) && (
                            <Button variant="outline" size="sm" onClick={metadata?.code_file ? () => onDownload(metadata.code_file) : onCopyCode}> 
                                <Code className="mr-2 h-4 w-4" /> 
                                {metadata?.code_file ? `下载建模代码 (${metadata.code_file})` : '复制代码 (CadQuery)'}
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
// ==============================================================================
// 🔥 3. 核心修复：OptimizationMessageView & getFileUrl
// ==============================================================================

const OptimizationMessageView = ({ content, imagesToDisplay, onImageClick, getFileUrl }) => {
    // 1. 分离图表和普通截图
    const charts = useMemo(() => {
        return imagesToDisplay.filter(img => img.altText === '收敛曲线' || img.altText === '参数分布图');
    }, [imagesToDisplay]);

    const screenshots = useMemo(() => {
        return imagesToDisplay.filter(img => img.altText !== '收敛曲线' && img.altText !== '参数分布图');
    }, [imagesToDisplay]);

    return (
        <div className="optimization-view w-full">
            <OptimizationLogRenderer content={content} />

            {/* 区域 A: 分析图表 (优化结果) */}
            {charts.length > 0 && (
                <div className="mt-4 pt-2">
                    <h4 className="text-sm font-bold text-gray-700 mb-2">📊 分析图表:</h4>
                    <div className={`grid gap-4 ${charts.length === 1 ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
                        {charts.map((image, idx) => {
                            const fullImageUrl = getFileUrl ? getFileUrl(image.imageUrl || image.fileName) : ''; 
                            return (
                                <Card key={`chart-${idx}`} className="p-2 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="bg-gray-50 rounded flex items-center justify-center p-1">
                                        <ProtectedImage
                                            src={fullImageUrl}
                                            alt={image.altText}
                                            className="w-full h-auto max-h-[300px] object-contain rounded cursor-pointer"
                                            onClick={() => onImageClick(fullImageUrl, image.altText)} 
                                        />
                                    </div>
                                    <p className="text-center text-xs font-medium mt-2 text-gray-600">{image.altText}</p>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

        </div>
    );
};

const GeneralMessageView = ({ content, imagesToDisplay, onImageClick, getFileUrl }) => {
    const { processedContent, thinkContent, isThinking } = useMarkdownProcessor(content);

    return (
        <div className="general-view">
            <ThinkBlock thinkContent={thinkContent} isThinking={isThinking} />
            <div className="prose max-w-none break-words">
                <ReactMarkdown 
                    rehypePlugins={[rehypeRaw]} 
                    remarkPlugins={[remarkGfm]} 
                    components={markdownComponents}
                >
                    {processedContent}
                </ReactMarkdown>
            </div>
            
            {imagesToDisplay.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                    {imagesToDisplay.map((image, idx) => {
                         if (image.altText === "收敛曲线" || image.altText === "参数分布图") return null;
                         const imageInput = image.imageUrl || image.fileName;
                         const fullImageUrl = getFileUrl ? getFileUrl(imageInput) : '';
                         return (
                            <ProtectedImage
                                key={idx}
                                src={fullImageUrl}
                                alt={image.altText}
                                className="max-w-xs h-auto rounded cursor-pointer border"
                                onClick={() => onImageClick(fullImageUrl, image.altText)}
                            />
                         );
                    })}
                </div>
            )}
        </div>
    );
};
// -----------------------------------------------------------------------------
// 🛠️ 辅助函数：消息类型推断现在已移至 /utils/messageUtils.js
// -----------------------------------------------------------------------------
const AiMessage = ({ message, onParametersExtracted, onQuestionClick, onImagesExtracted }) => {
    const { content: rawContent, parts, metadata: rawMetadata, suggested_questions, task_type } = message;

    const cleanContent = useMemo(() => {
        if (!rawContent) return '';
        return typeof rawContent === 'string' ? rawContent.replace(/\\n/g, '\n').replace(/\\"/g, '"') : rawContent;
    }, [rawContent]);

    const metadata = useMemo(() => safeParseMetadata(rawMetadata), [rawMetadata]);

    const [is3DViewerOpen, setIs3DViewerOpen] = useState(false); 
    const [current3DModelUrl, setCurrent3DModelUrl] = useState(''); 
    const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
    const [previewImageUrl, setPreviewImageUrl] = useState(''); 
    const [previewImageAlt, setPreviewImageAlt] = useState(''); 

    useEffect(() => {
        if (!is3DViewerOpen && current3DModelUrl && current3DModelUrl.startsWith('blob:')) {
            URL.revokeObjectURL(current3DModelUrl);
            setCurrent3DModelUrl('');
        }
    }, [is3DViewerOpen, current3DModelUrl]);

    const getFileUrl = (input) => {
        if (!input) return '';
        try {
            const store = useConversationStore.getState();
            if (!store) return '';
            const { activeConversationId, activeTaskId } = store;

            let apiBase = 'http://localhost:8080'; 
            if (import.meta.env.PROD) {
                apiBase = import.meta.env.VITE_API_URL || '';
            } else if (import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes('/api')) {
                apiBase = import.meta.env.VITE_API_URL;
            }
            apiBase = apiBase.replace(/\/+$/, '');

            if (input.startsWith('/files/')) return `${apiBase}${input}`;

            const isImage = /\.(png|jpg|jpeg|gif)$/i.test(input);
            if (isImage) return `${apiBase}/files/${activeConversationId}/${activeTaskId}/${input}`;
            
            const query = `/api/download_file?task_id=${activeTaskId}&conversation_id=${activeConversationId}&file_name=${encodeURIComponent(input)}`;
            return `${apiBase}${query}`;
        } catch (error) {
            console.error("getFileUrl error:", error);
            return '';
        }
    };

    const handlePostFile = async (fileName) => {
        if (!fileName) return;
        const store = useConversationStore.getState();
        if (!store) return;
        const { activeConversationId, activeTaskId } = store;
        try {
            const blob = await downloadFileAPI(activeTaskId, activeConversationId, fileName);
            const blobUrl = window.URL.createObjectURL(blob);
            setCurrent3DModelUrl(blobUrl);
            setIs3DViewerOpen(true);
        } catch (e) { console.error('打开文件失败:', e); }
    };

    const handleDownload = async (fileName) => {
        if (!fileName) return;
        const store = useConversationStore.getState();
        if (!store) return;
        const { activeConversationId, activeTaskId } = store;
        try {
            const response = await downloadFileAPI(activeTaskId, activeConversationId, fileName);
            const url = window.URL.createObjectURL(response);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) { console.error("Download failed:", error); }
    };

    const handleCopyCode = () => {
        const codeMatch = cleanContent.match(/```python\n([\s\S]*?)```/);
        const codeToCopy = codeMatch ? codeMatch[1].trim() : cleanContent.trim();
        if (codeToCopy) navigator.clipboard.writeText(codeToCopy);
    };

    const handleImageClick = (url, alt) => {
        setPreviewImageUrl(url);
        setPreviewImageAlt(alt);
        setIsImagePreviewOpen(true);
    };

    // ✅ 关键修复：图片数据去重已移至 utils
    const uniqueImages = useMemo(() => extractUniqueImages(parts), [parts]);
    
    // 使用去重后的 uniqueImages
    const imagesJson = JSON.stringify(uniqueImages);
    useEffect(() => {
        if (uniqueImages.length > 0 && onImagesExtracted) {
            onImagesExtracted(uniqueImages);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [imagesJson, onImagesExtracted]);

   const detectMessageType = () => {
        // 1. 如果后端有明确的 task_type，且不是 'general'，优先信赖后端
        if (task_type && task_type !== 'general') return task_type;

        // 2. 否则使用推断逻辑 (复用上面的辅助函数)
        return inferMessageType(message);
    };

    const messageType = detectMessageType();

    return (
        <>
            <div className="flex items-start my-4 w-full">
                <Avatar className="mr-4"><AvatarFallback>AI</AvatarFallback></Avatar>
                <div className="bg-gray-100 rounded-lg p-3 w-full max-w-4xl overflow-hidden">
                    {messageType === 'geometry' && (
                        <GeometryMessageView 
                            content={cleanContent}
                            metadata={metadata}
                            isProcessing={!((metadata?.stl_file || metadata?.cad_file) && metadata?.preview_image)}
                            onDownload={handleDownload}
                            onPostFile={handlePostFile}
                            onCopyCode={handleCopyCode}
                        />
                    )}
                    {messageType === 'optimize' && (
                        <OptimizationMessageView 
                            content={cleanContent}
                            imagesToDisplay={uniqueImages} // 传入去重后的图片
                            onImageClick={handleImageClick}
                            getFileUrl={getFileUrl}
                        />
                    )}
                    {messageType === 'general' && (
                        <GeneralMessageView 
                            content={cleanContent}
                            imagesToDisplay={uniqueImages} // 传入去重后的图片
                            onImageClick={handleImageClick}
                            getFileUrl={getFileUrl}
                        />
                    )}
                    {suggested_questions && (
                        <SuggestedQuestions questions={suggested_questions} onQuestionClick={onQuestionClick} />
                    )}
                </div>
            </div>

            <Dialog open={is3DViewerOpen} onOpenChange={setIs3DViewerOpen}>
                <DialogContent className="sm:max-w-[800px] h-[600px] p-0"> 
                    <DialogHeader className="p-4 border-b">
                        <DialogTitle>3D 模型预览</DialogTitle>
                        <DialogDescription className="sr-only">三维模型交互预览窗口</DialogDescription>
                    </DialogHeader>
                    <div className="flex-grow w-full h-[calc(100%-60px)]"> 
                    {current3DModelUrl ? <ThreeDViewer modelUrl={current3DModelUrl} /> : <div className="flex items-center justify-center w-full h-full text-gray-500">无法加载模型：URL 为空。</div>}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isImagePreviewOpen} onOpenChange={setIsImagePreviewOpen}>
                <DialogContent className="max-w-screen-xl p-4 sm:max-w-5xl md:max-w-6xl"> 
                    <DialogHeader className="p-0">
                        <DialogTitle>{previewImageAlt || "图片详情"}</DialogTitle>
                        <DialogDescription className="sr-only">放大查看图片</DialogDescription>
                    </DialogHeader>
                    <div className="w-full max-h-[85vh] overflow-y-auto flex justify-center items-center">
                    {previewImageUrl && <ProtectedImage src={previewImageUrl} alt={previewImageAlt} className="max-w-full max-h-[80vh] object-contain rounded" />}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};
const ConversationDisplay = ({ 
    messages, 
    isLoading, 
    onParametersExtracted, 
    onQuestionClick, 
    onImagesExtracted,
    filterTaskType // 'geometry' | 'optimize'
}) => {
  if (isLoading) return <div className="flex items-center justify-center h-full">正在加载对话记录...</div>;

  const displayMessages = React.useMemo(() => {
    // 如果没有传入过滤类型，显示所有消息 (兼容旧逻辑)
    if (!filterTaskType) return messages;

    return messages.filter(msg => {
        // 1. 永远保留用户消息
        if (msg.role === 'user') return true; 

        // 2. 如果消息有明确的 task_type，直接对比
        if (msg.task_type) {
            return msg.task_type === filterTaskType;
        }

        // 3. 🔥 关键修复：如果 task_type 为空 (历史记录)，则根据内容推断
        const inferredType = inferMessageType(msg);
        return inferredType === filterTaskType;
    });
  }, [messages, filterTaskType]);

  return (
    <div className="flex-1 overflow-y-auto p-8 h-full">
      {displayMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <p>暂无相关历史记录</p>
          </div>
      ) : (
          displayMessages.map((msg, index) =>
            msg.role === 'user' ? (
              <UserMessage key={msg.id || index} content={msg.content} />
            ) : (
              <React.Fragment key={`${msg.id || index}-${(msg.content || '').length}`}>
                  <AiMessage 
                      message={msg} 
                      onParametersExtracted={onParametersExtracted}
                      onQuestionClick={onQuestionClick}
                      onImagesExtracted={onImagesExtracted}
                  />
              </React.Fragment>
            )
          )
      )}
    </div>
  );
};

export default ConversationDisplay;