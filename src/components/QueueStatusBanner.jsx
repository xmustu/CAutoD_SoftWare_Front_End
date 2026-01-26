// 文件位置: src/components/QueueStatusBanner.jsx
import React from 'react';
import { Loader2, Activity, CheckCircle2, Clock, Cpu } from 'lucide-react';

const QueueStatusBanner = ({ queueLength, runningTasks }) => {
  const isLoading = queueLength === null;
  const isBusy = runningTasks > 0;
  const hasWaiting = queueLength > 0;

  let themeClass = "bg-gray-50 border-gray-200 text-gray-600";
  let MainIcon = Loader2;
  let mainTitle = "正在连接服务器...";
  let mainDesc = "获取队列信息中";

  if (!isLoading) {
    if (isBusy) {
      themeClass = "bg-blue-50 border-blue-200 text-blue-700";
      MainIcon = Activity;
      mainTitle = "系统正忙";
      mainDesc = "计算资源正在运行任务";
    } else if (hasWaiting) {
      themeClass = "bg-orange-50 border-orange-200 text-orange-700";
      MainIcon = Clock;
      mainTitle = "任务队列中";
      mainDesc = "等待计算资源释放";
    } else {
      themeClass = "bg-green-50 border-green-200 text-green-700";
      MainIcon = CheckCircle2;
      mainTitle = "系统空闲";
      mainDesc = "现在提交任务可立即执行";
    }
  }

  return (
    <div className={`w-full max-w-4xl mx-auto mb-6 p-4 rounded-xl border ${themeClass} flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm transition-all duration-300`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full bg-white/60 ${isBusy ? 'animate-pulse' : ''}`}>
          <MainIcon className={`h-6 w-6 ${isLoading ? 'animate-spin' : ''}`} />
        </div>
        <div>
          <h3 className="font-semibold text-base">{mainTitle}</h3>
          <p className="text-sm opacity-80">{mainDesc}</p>
        </div>
      </div>

      {!isLoading && (isBusy || hasWaiting) && (
        <div className="flex items-center gap-4 bg-white/40 p-2 rounded-lg ml-auto md:ml-0">
          <div className="flex items-center gap-2 px-3 py-1 border-r border-gray-200/50">
            <Cpu className="h-4 w-4" />
            <div className="flex flex-col items-end leading-none">
              <span className="text-xs opacity-70 font-medium">执行中</span>
              <span className="text-lg font-bold">{runningTasks}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1">
            <Clock className="h-4 w-4" />
            <div className="flex flex-col items-end leading-none">
              <span className="text-xs opacity-70 font-medium">等待中</span>
              <span className="text-lg font-bold">{queueLength}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueueStatusBanner;