import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast'; // 引入 toast 用于错误提示

const InteractiveFileUpload = ({ onFileSelect, onStart, selectedFile, isStreaming, disabled }) => {
  const fileInputRef = useRef(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState('0 KB/s');
  const [status, setStatus] = useState('idle'); // idle, uploading, success, error
  
  // 🆕 新增：拖拽状态
  const [isDragging, setIsDragging] = useState(false);

  // 模拟上传进度的效果
  useEffect(() => {
    let interval;
    if (status === 'uploading') {
      let currentProgress = 0;
      interval = setInterval(() => {
        const increment = Math.random() * 10;
        currentProgress += increment;
        
        const speed = (Math.random() * 500 + 200).toFixed(0);
        setUploadSpeed(`${speed} KB/s`);

        if (currentProgress >= 90) {
          currentProgress = 90;
          setUploadSpeed('处理中...');
        }
        setUploadProgress(Math.min(currentProgress, 90));
      }, 300);
    } else if (status === 'success') {
      setUploadProgress(100);
      setUploadSpeed('完成');
      clearInterval(interval);
    } else {
      setUploadProgress(0);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [status]);

  // 🆕 新增：文件格式校验函数
  const validateAndSelectFile = (file) => {
    if (!file) return;

    const fileName = file.name.toLowerCase();
    // 检查后缀名
    if (!fileName.endsWith('.sldprt')) {
      toast.error('文件格式错误！请上传 .sldprt 格式的 SolidWorks 文件。');
      setStatus('error'); // 可以选择显示错误状态
      return; 
    }

    onFileSelect(file);
    setStatus('idle');
    toast.success('文件已就绪');
  };

  // 修改：原本的文件选择处理
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    validateAndSelectFile(file);
  };

  // 🆕 新增：拖拽进入
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isStreaming) {
      setIsDragging(true);
    }
  };

  // 🆕 新增：拖拽离开
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  // 🆕 新增：拖拽释放
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || isStreaming) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSelectFile(files[0]);
    }
  };

  const handleStartClick = async () => {
    if (!selectedFile) return;
    setStatus('uploading');
    try {
      await onStart(); 
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (e) {
      console.error("Start optimization failed:", e);
      setStatus('error');
    }
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    onFileSelect(null);
    setStatus('idle');
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".sldprt"
      />

      {/* 拖拽/上传区域 */}
      {!selectedFile ? (
        <div
          // 🆕 绑定拖拽事件
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current.click()}
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300
            ${disabled 
              ? 'bg-gray-50 border-gray-200 cursor-not-allowed' 
              : isDragging // 🆕 拖拽时的样式
                ? 'bg-blue-50 border-blue-500 scale-[1.02] shadow-md'
                : 'bg-white border-green-300 hover:border-green-500 hover:bg-green-50/30 hover:scale-[1.02]'
            }`}
        >
          <div className={`p-3 rounded-full mb-4 transition-colors duration-300 ${isDragging ? 'bg-blue-100' : 'bg-green-100'}`}>
            <Upload className={`h-6 w-6 ${isDragging ? 'text-blue-600' : 'text-green-600'}`} />
          </div>
          <p className="text-sm font-medium text-gray-700">
            {isDragging ? '释放以添加文件' : '点击或拖拽上传 .sldprt 模型文件'}
          </p>
          <p className="text-xs text-gray-400 mt-1">支持最大 50MB</p>
        </div>
      ) : (
        <div className="bg-white border rounded-xl p-4 shadow-sm animate-in fade-in zoom-in duration-300">
          {/* 文件信息栏 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className={`p-2 rounded-lg ${status === 'error' ? 'bg-red-100' : 'bg-green-100'}`}>
                <FileText className={`h-5 w-5 ${status === 'error' ? 'text-red-600' : 'text-green-600'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            {status === 'idle' && (
              <Button variant="ghost" size="icon" onClick={handleRemoveFile} className="h-8 w-8 text-gray-400 hover:text-red-500">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* 进度条区域 */}
          {status !== 'idle' && (
            <div className="mb-4 space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>{status === 'uploading' ? '正在上传并准备优化...' : status === 'success' ? '开始执行' : '失败'}</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ease-out ${status === 'error' ? 'bg-red-500' : 'bg-green-500'}`}
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">{uploadSpeed}</span>
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          {status === 'idle' && (
            <Button 
              onClick={handleStartClick} 
              disabled={disabled || isStreaming} 
              className="w-full bg-green-600 hover:bg-green-700 text-white transition-all shadow-md hover:shadow-lg"
            >
               {isStreaming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
               开始优化
            </Button>
          )}
          
          {status === 'success' && (
            <div className="flex items-center justify-center text-green-600 py-2 bg-green-50 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
              <CheckCircle className="w-4 h-4 mr-2" /> 任务已提交，请查看对话
            </div>
          )}
          
          {status === 'error' && (
             <div className="flex items-center justify-center text-red-600 py-2 bg-red-50 rounded-lg text-sm font-medium">
             <AlertCircle className="w-4 h-4 mr-2" /> 启动失败，请重试
           </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InteractiveFileUpload;