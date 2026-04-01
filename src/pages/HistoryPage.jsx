import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Search, ChevronDown, ChevronRight, ChevronLeft, Filter, MessageSquare, Settings2, Box, Puzzle, Clock } from 'lucide-react';
import useConversationStore from '../store/conversationStore';
import { getConversationDetailsAPI } from '../api/conversationAPI';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

/**
 * 任务类型标签组件
 */
const TaskTypeBadge = ({ type }) => {
  const config = {
    geometry: { label: '几何建模', icon: Box, color: 'bg-blue-100 text-blue-700' },
    optimize: { label: '设计优化', icon: Settings2, color: 'bg-orange-100 text-orange-700' },
    retrieval: { label: '零件检索', icon: Puzzle, color: 'bg-green-100 text-green-700' },
  };
  const c = config[type] || { label: type, icon: MessageSquare, color: 'bg-gray-100 text-gray-700' };
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.color}`}>
      <Icon className="h-3 w-3" />
      {c.label}
    </span>
  );
};

/**
 * 任务详情行
 */
const TaskItem = ({ task }) => (
  <div className="pl-10 pr-4 py-3 bg-gray-50 border-t flex justify-between items-center">
    <div className="flex items-center gap-3">
      <TaskTypeBadge type={task.task_type} />
      <div>
        <p className="text-sm font-medium text-gray-700">任务 #{task.task_id}</p>
      </div>
    </div>
    <div className="text-right">
      <p className={`text-xs font-semibold ${task.status === '完成' || task.status === 'done' ? 'text-green-600' : 'text-yellow-600'}`}>
        {task.status === 'done' ? '已完成' : task.status}
      </p>
      <p className="text-xs text-gray-400">{new Date(task.created_at).toLocaleTimeString()}</p>
    </div>
  </div>
);

/**
 * 历史记录条目（可展开查看任务）
 */
const HistoryItem = ({ item, onDelete, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  const handleToggle = async () => {
    setIsOpen(!isOpen);
    if (!isOpen && tasks.length === 0) {
      setIsLoadingTasks(true);
      try {
        const details = await getConversationDetailsAPI(item.conversation_id);
        setTasks(details.tasks || []);
      } catch (error) {
        console.error("Failed to fetch conversation details:", error);
        setTasks([]);
      } finally {
        setIsLoadingTasks(false);
      }
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 transition-colors">
      <div className="flex items-center justify-between p-4 hover:bg-blue-50/50 cursor-pointer" onClick={handleToggle}>
        <div className="flex items-center flex-1 min-w-0">
          {isOpen ? <ChevronDown className="h-5 w-5 mr-3 text-blue-500 shrink-0" /> : <ChevronRight className="h-5 w-5 mr-3 text-gray-400 shrink-0" />}
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 truncate">{item.title}</p>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3" />
              {new Date(item.created_at).toLocaleString()}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="shrink-0 ml-2" onClick={(e) => { e.stopPropagation(); onDelete(item.conversation_id); }}>
          <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
        </Button>
      </div>
      {isOpen && (
        <div>
          {isLoadingTasks ? (
            <p className="p-4 text-center text-gray-500 text-sm">加载任务中...</p>
          ) : tasks.length > 0 ? (
            tasks.map(task => <TaskItem key={task.task_id} task={task} />)
          ) : (
            <p className="p-4 text-center text-gray-400 text-sm">该对话下暂无关联任务</p>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * 历史记录页面
 * 显示当前用户的所有对话历史，支持搜索、分页
 */
const HistoryPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { conversations, isLoading, error, deleteConversation } = useConversationStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const navigate = useNavigate();

  const openDeleteDialog = (conversationId) => {
    setSelectedConversationId(conversationId);
    setIsDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedConversationId) deleteConversation(selectedConversationId);
    setIsDialogOpen(false);
    setSelectedConversationId(null);
  };

  // 搜索过滤
  const filteredHistory = useMemo(() => {
    return (conversations || [])
      .filter(item => item.title.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [conversations, searchTerm]);

  // 分页
  const totalPages = Math.ceil(filteredHistory.length / pageSize);
  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredHistory.slice(start, start + pageSize);
  }, [filteredHistory, currentPage]);

  // 搜索时重置到第一页
  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">加载历史记录失败，请刷新页面重试。</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* 标题 + 引导 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">历史记录</h1>
        <p className="text-sm text-gray-500 mt-1">查看您的所有对话记录，展开可查看关联的任务详情</p>
      </div>

      {/* 搜索栏 */}
      <div className="relative mb-6">
        <Input
          type="text"
          placeholder="搜索对话标题..."
          className="w-full py-5 rounded-lg border-gray-300 pl-10 text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      </div>

      {/* 统计信息 */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-medium text-gray-600">
          共 {filteredHistory.length} 条对话
          {searchTerm && <span className="text-gray-400 ml-1">（搜索 "{searchTerm}"）</span>}
        </h2>
      </div>

      {/* 对话列表 */}
      <div className="space-y-3">
        {paginatedHistory.length > 0 ? (
          paginatedHistory.map(item => (
            <HistoryItem
              key={item.conversation_id}
              item={item}
              onDelete={() => openDeleteDialog(item.conversation_id)}
              onNavigate={navigate}
            />
          ))
        ) : (
          <div className="text-center py-16">
            <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">{searchTerm ? '没有匹配的对话' : '暂无历史记录'}</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchTerm ? '尝试更换关键词搜索' : '开始一段新的对话后，记录会显示在这里'}
            </p>
          </div>
        )}
      </div>

      {/* 分页控件 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button variant="outline" size="sm" disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            上一页
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <Button key={page} variant={page === currentPage ? 'default' : 'ghost'}
                size="sm" className={`w-8 h-8 p-0 ${page === currentPage ? 'bg-blue-600 text-white' : ''}`}
                onClick={() => setCurrentPage(page)}>
                {page}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}>
            下一页
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* 删除确认对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              此操作将永久删除该会话及其包含的所有任务和消息历史。此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HistoryPage;
