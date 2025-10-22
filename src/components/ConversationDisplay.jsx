import React, { useState, useEffect } from 'react';
import useConversationStore from '@/store/conversationStore'; // 导入 store
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import PartCard from './PartCard'; // 导入 PartCard
import ProtectedImage from './ProtectedImage'; // 导入 ProtectedImage 组件
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"; // 导入 Dialog
import ModelViewer from '@/layouts/ModelViwer'; // 导入 ModelViewer
import { Download, Code, Image as ImageIcon, Clipboard, View } from 'lucide-react'; // 导入 View icon
import { downloadFileAPI, getModelFileAPI } from '@/api/fileAPI'; // 导入 API
import ReactMarkdown from 'react-markdown'; // 导入 ReactMarkdown
import rehypeRaw from 'rehype-raw'; // 导入 rehype-raw
import remarkGfm from 'remark-gfm'; // 导入 remark-gfm 以支持 GFM (换行符等)
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'; // 导入高亮组件
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'; // 导入深色主题
import SuggestedQuestions from './SuggestedQuestions';

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
  const parseLog = (logContent) => {
    if (!logContent) return [];
    const blocks = logContent.split(/(?=开始优化|发送参数|优化完成|优化结果详细信息)/).filter(Boolean);

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
      // Default block for initial info
      return { type: 'INFO', content: block, id: `info-${index}` };
    });
  };

  const logEvents = parseLog(content);

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


const AiMessage = ({ message, onParametersExtracted, onQuestionClick, onImagesExtracted }) => { // 添加 onImagesExtracted prop
  console.log("AiMessage: Received message object (full):", message); // 打印完整的 message 对象
  const { content, parts, metadata, suggested_questions } = message;
  const [showGreeting, setShowGreeting] = useState(true); // 控制问候语显示的状态

  const handleShowModel = (fileName) => {
    if (!fileName) return;
    const { activeConversationId, activeTaskId } = useConversationStore.getState();
    // 构建模型文件的完整URL，假设后端 /model 接口可以接受 GET 请求或者通过 POST 请求获取数据
    // 这里我们假设 /model 接口可以直接通过 GET 请求访问，或者我们可以在新页面中再次调用 getModelFileAPI
    // 为了简化，我们先假设 /model 接口可以直接访问，或者 model_viewer.html 会自己处理 API 调用
    // 更好的做法是，model_viewer.html 内部调用 getModelFileAPI
    // 但是为了快速实现，我们先传递文件名，让 model_viewer.html 自己处理
    const backendApiBaseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8080'; // 获取后端API URL
    const modelUrl = `/model?task_id=${activeTaskId}&conversation_id=${activeConversationId}&file_name=${fileName}`;
    window.open(`/model_viewer.html?modelUrl=${encodeURIComponent(modelUrl)}&backendApiBaseUrl=${encodeURIComponent(backendApiBaseUrl)}`, '_blank');
  };

  const preprocessMarkdown = (markdownContent) => {
  if (!markdownContent) return '';

  const listItemRegex = /^- (\w+)：(.+?)，推荐 (.+)/;
  const allLines = markdownContent.split('\n');
  let tableRows = [];
  let otherContentLines = [];
  let tablePlaceholderIndex = -1;

  allLines.forEach((line, index) => {
    const match = line.trim().match(listItemRegex);
    if (match) {
      if (tablePlaceholderIndex === -1) {
        tablePlaceholderIndex = otherContentLines.length;
      }
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
    } else {
      otherContentLines.push(line);
    }
  });

  if (tableRows.length > 0) {
    const headerHtml = `<tr class="bg-gray-50">
      <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">参数名</td>
      <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">含义</td>
      <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">推荐值</td>
      <td class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">单位</td>
    </tr>`;
    const finalTable = `<table class="min-w-full divide-y divide-gray-200 border border-gray-300">
      <tbody class="bg-white divide-y divide-gray-200">
        ${headerHtml}
        ${tableRows.join('')}
      </tbody>
    </table>`;
    // 在第一个参数列表项出现的位置插入表格
    otherContentLines.splice(tablePlaceholderIndex, 0, finalTable);
    return otherContentLines.join('\n');
  }

  return markdownContent;
};

  const processedContent = preprocessMarkdown(content);


  useEffect(() => {
    if (content && content.trim() !== '') {
      setShowGreeting(false); // 当内容不为空时，隐藏问候语
    } else {
      setShowGreeting(true); // 否则显示问候语
    }
  }, [content]);

  const partsToRender = parts?.filter(p => p.type === 'part') || [];
  const imagesToDisplay = parts?.filter(p => p.type === 'image') || [];
// 核心修复 1：将图片分流逻辑移到父组件 (DesignOptimizationPage)
    //    这里只负责将图片数据传递给父组件，由父组件决定分流和状态更新。
    useEffect(() => {
        if (imagesToDisplay.length > 0 && onImagesExtracted) {
            onImagesExtracted(imagesToDisplay); // 传递所有图片数据给父组件
        }
    }, [imagesToDisplay, onImagesExtracted]);

    // Use the new task_type property for a reliable check
    const isOptimizationLog = message.task_type === 'optimize' || (content && (content.includes('开始优化') || content.includes('发送参数')));
  // 移除参数提取逻辑，现在由 DesignOptimizationPage 处理
  // useEffect(() => {
  //   if (isOptimizationLog && content && onParametersExtracted) {
  //     console.log("AiMessage: Processing optimization log content for parameter extraction.");
  //     console.log("AiMessage: Full content to parse:", content); // 打印完整内容

  //     // 只有当内容包含完整的初始化信息时才尝试提取参数
  //     if (content.includes('初始化完成，共获取到')) {
  //       const extractedParams = [];
  //       const paramRegex = /获取参数\d+[:：] (.+?) = (.+)/g; // 兼容半角和全角冒号
        
  //       let match;

  //       // 提取参数名称和初始值
  //       paramRegex.lastIndex = 0; // 重置正则表达式的lastIndex
  //       while ((match = paramRegex.exec(content)) !== null) {
  //         console.log("AiMessage: Param regex match:", match); // 打印每次匹配结果
  //         extractedParams.push({
  //           name: match[1].trim(),
  //           initialValue: parseFloat(match[2]),
  //           min: '', // 默认值
  //           max: ''  // 默认值
  //         });
  //       }
  //       console.log("AiMessage: Extracted initial parameters:", extractedParams);
        
  //       if (extractedParams.length > 0) {
  //         console.log("AiMessage: Calling onParametersExtracted with:", extractedParams);
  //         onParametersExtracted(extractedParams);
  //       } else {
  //         console.log("AiMessage: No optimizable parameters found in content after full initialization log.");
  //       }
  //     } else {
  //       console.log("AiMessage: Full initialization log not yet received. Skipping parameter extraction.");
  //     }
  //   }
  // }, [content, isOptimizationLog, onParametersExtracted]);

  const handleDownload = async (fileName) => {
    if (!fileName) return;
    const { activeConversationId, activeTaskId } = useConversationStore.getState(); // 从 store 获取 activeConversationId 和 activeTaskId
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
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  return (
    <div className="flex items-start my-4">
      <Avatar className="mr-4">
        <AvatarFallback>AI</AvatarFallback>
      </Avatar>
      <div className="bg-gray-100 rounded-lg p-3 w-full max-w-4xl">
        {showGreeting && (
          <p className="text-gray-500 italic mb-2">请耐心等待，正在处理中...</p>
        )}
        <div className="flex-grow"> {/* 内容区域 */}
          {isOptimizationLog ? (
            <OptimizationLogRenderer content={content} />
          ) : (
            <div className="prose max-w-none break-words">
              <ReactMarkdown
                rehypePlugins={[rehypeRaw]}
                remarkPlugins={[remarkGfm]} // 添加 remarkGfm 插件
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <CodeBlock language={match[1]} {...props}>
                        {children}
                      </CodeBlock>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  table: ({ node, ...props }) => <table className="min-w-full divide-y divide-gray-200 border border-gray-300" {...props} />,
                  thead: ({ node, ...props }) => <thead className="bg-gray-50" {...props} />,
                  tbody: ({ node, ...props }) => <tbody className="bg-white divide-y divide-gray-200" {...props} />,
                  tr: ({ node, ...props }) => <tr className="hover:bg-gray-50" {...props} />,
                  th: ({ node, ...props }) => <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" {...props} />,
                  td: ({ node, ...props }) => <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700" {...props} />,
                }}
              >
                {processedContent}
              </ReactMarkdown>
            </div>
          )}
        </div>
        {/* 2. 🚨 核心修复 3：在最终结果后插入曲线图 (只渲染曲线图) */}
                {imagesToDisplay.length > 0 && (
                    <div className="mt-4 pt-2 space-y-4">
                        {imagesToDisplay
                            .filter(img => img.altText === "收敛曲线" || img.altText === "参数分布图")
                            .map((image, idx) => (
                                // 使用稍微大一点的卡片样式来显示曲线图，而不是 ParameterForm 中的小图
                                <Card key={idx} className="p-2">
                                    <ProtectedImage
                                        src={image.imageUrl}
                                        alt={image.altText}
                                        className="w-full h-auto object-contain rounded"
                                    />
                                    <p className="text-center text-sm font-semibold mt-2">{image.altText}</p>
                                </Card>
                            ))}
                    </div>
                )}
        {partsToRender && partsToRender.length > 0 && (
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
            {partsToRender.map((part, idx) => (
                <PartCard key={idx} part={part} />
              ))}
          </div>
        )}

        {metadata && (metadata.preview_image || metadata.cad_file || (!isOptimizationLog && metadata.code_file)) && (
          <div className="mt-4 border-t pt-2">
            <h4 className="text-sm font-semibold mb-2">生成文件:</h4>
            <div className="flex flex-col space-y-2">
               {metadata.preview_image && (
                <Button variant="outline" size="sm" onClick={() => handleDownload(metadata.preview_image)}>
                    <ImageIcon className="mr-2 h-4 w-4" /> 预览图
                </Button>
               )}
               {metadata.cad_file && (
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleDownload(metadata.cad_file)} className="flex-1">
                      <Download className="mr-2 h-4 w-4" /> 下载CAD模型
                  </Button>
                  {metadata.stl_file && (
                    <Button variant="outline" size="sm" onClick={() => handleShowModel(metadata.stl_file)} className="flex-1">
                      <View className="mr-2 h-4 w-4" /> 展示STL模型
                    </Button>
                  )}
                </div>
               )}
              {!isOptimizationLog && metadata.code_file && (
                <Button variant="outline" size="sm" onClick={() => handleDownload(metadata.code_file)}>
                    <Code className="mr-2 h-4 w-4" /> 下载建模代码
                </Button>
              )}
            </div>
          </div>
        )}

        {suggested_questions && (
          <SuggestedQuestions 
            questions={suggested_questions} 
            onQuestionClick={onQuestionClick} 
          />
        )}
      </div>
    </div>
  );
};

const ConversationDisplay = ({ messages, isLoading, onParametersExtracted, onQuestionClick, onImagesExtracted }) => { // 添加 onImagesExtracted prop
  if (isLoading) {
    return <div className="flex items-center justify-center h-full">正在加载对话记录...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 h-full">
      {messages.map((msg) =>
        msg.role === 'user' ? (
          <UserMessage key={msg.id || msg.timestamp} content={msg.content} />
        ) : (
          <AiMessage 
            key={msg.id || msg.timestamp} 
            message={msg} 
            onParametersExtracted={onParametersExtracted}
            onQuestionClick={onQuestionClick}
            onImagesExtracted={onImagesExtracted} // 传递 onImagesExtracted prop
          />
        )
      )}
    </div>
  );
};

export default ConversationDisplay;
