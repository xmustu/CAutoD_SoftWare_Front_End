import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { MessageSquare, Search, Settings2, Code, ArrowRight, Clock, Box, Puzzle, Sparkles } from 'lucide-react';
import useUserStore from '../store/userStore';
import useConversationStore from '../store/conversationStore';
import { useNavigate } from 'react-router-dom';

/**
 * 功能入口卡片（带引导描述）
 */
const QuickActionCard = ({ icon: Icon, title, description, onClick, color }) => (
  <button
    onClick={onClick}
    className="group flex flex-col items-start p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-left w-full"
  >
    <div className={`p-2.5 rounded-lg ${color} mb-3`}>
      <Icon className="h-5 w-5 text-white" />
    </div>
    <h3 className="text-base font-semibold text-gray-800 mb-1">{title}</h3>
    <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    <div className="mt-3 flex items-center text-xs text-blue-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
      开始使用 <ArrowRight className="h-3 w-3 ml-1" />
    </div>
  </button>
);

/**
 * 历史记录卡片（带任务类型标签）
 */
const HistoryCard = ({ title, time, taskType, onClick }) => {
  const typeConfig = {
    geometry: { label: '几何建模', color: 'bg-blue-500' },
    optimize: { label: '设计优化', color: 'bg-orange-500' },
    retrieval: { label: '零件检索', color: 'bg-green-500' },
  };
  const config = typeConfig[taskType];

  return (
    <Card className="border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group" onClick={onClick}>
      <CardHeader className="pb-2">
        {config && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white ${config.color} w-fit mb-1`}>
            {config.label}
          </span>
        )}
        <CardTitle className="text-base font-semibold text-gray-800 group-hover:text-blue-600 transition-colors line-clamp-2">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {time}
        </p>
      </CardContent>
    </Card>
  );
};

/**
 * 创建项目 / 首页
 */
const CreateProjectPage = () => {
  const { user } = useUserStore();
  const { conversations } = useConversationStore();
  const navigate = useNavigate();

  const history = conversations || [];

  // 获取当日时间段问候语
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '早上好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 欢迎区域 */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-800">
          {getGreeting()}，{user?.username || '用户'}
        </h1>
        <p className="text-gray-500 mt-1">选择一个功能模块开始您的 CAD 设计工作</p>
      </div>

      {/* 功能模块入口 */}
      <div className="mb-12">
        <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-500" />
          功能模块
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            icon={Box}
            title="几何建模"
            description="通过自然语言描述创建 3D 几何模型，支持参数化设计"
            onClick={() => navigate('/geometry')}
            color="bg-blue-500"
          />
          <QuickActionCard
            icon={Search}
            title="零件检索"
            description="在零件库中检索相似零件，快速复用已有设计"
            onClick={() => navigate('/parts')}
            color="bg-green-500"
          />
          <QuickActionCard
            icon={Settings2}
            title="设计优化"
            description="对已有设计进行多目标优化，提升性能与效率"
            onClick={() => navigate('/design-optimization')}
            color="bg-orange-500"
          />
          <QuickActionCard
            icon={Code}
            title="软件界面"
            description="通过 AI 辅助操控 CAD 软件，提高工作效率"
            onClick={() => navigate('/software-interface')}
            color="bg-purple-500"
          />
        </div>
      </div>

      {/* 近期历史 */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-400" />
            最近的对话
          </h2>
          {history.length > 0 && (
            <Button variant="ghost" className="text-blue-500 text-sm" onClick={() => navigate('/history')}>
              查看全部 <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
        {history.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {history.slice(0, 3).map(item => (
              <HistoryCard
                key={item.conversation_id}
                title={item.title}
                time={new Date(item.created_at).toLocaleString()}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">暂无历史记录</p>
            <p className="text-sm text-gray-400 mt-1">选择上方功能模块开始您的第一个任务</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateProjectPage;
