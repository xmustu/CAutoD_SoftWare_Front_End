import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Trash2, RefreshCw, Loader2, Search, Filter, X, CheckCircle, AlertTriangle, Activity, BarChart3 } from 'lucide-react';
import { post, get } from '@/api/index';
import { deleteTaskAndMessagesAPI, getHistoryAPI } from '@/api/conversationAPI';
import TaskCard from '@/components/TaskCard';
import Pagination from '@/components/Pagination';
import useUserStore from '@/store/userStore';
import axios from 'axios';

/**
 * 筛选工具栏组件
 */
const FilterBar = ({ filterType, setFilterType, filterStatus, setFilterStatus, searchQuery, setSearchQuery, onClearFilters, hasActiveFilters }) => (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
        <div className="flex items-center gap-1 text-gray-500">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">筛选</span>
        </div>

        {/* 任务类型筛选 */}
        <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px] h-9 text-sm bg-white">
                <SelectValue placeholder="任务类型" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="geometry">几何建模</SelectItem>
                <SelectItem value="optimize">设计优化</SelectItem>
                <SelectItem value="retrieval">零件检索</SelectItem>
            </SelectContent>
        </Select>

        {/* 任务状态筛选 */}
        <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] h-9 text-sm bg-white">
                <SelectValue placeholder="任务状态" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="done">已完成</SelectItem>
                <SelectItem value="queued">排队中</SelectItem>
            </SelectContent>
        </Select>

        {/* 搜索框 */}
        <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
                type="text"
                placeholder="搜索任务ID或会话ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm bg-white"
            />
        </div>

        {/* 清除筛选 */}
        {hasActiveFilters && (
            <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="h-9 text-gray-500 hover:text-red-500"
            >
                <X className="h-4 w-4 mr-1" />
                清除
            </Button>
        )}
    </div>
);

/**
 * 空状态引导组件
 */
const EmptyState = ({ type = 'queue' }) => {
    const configs = {
        queue: {
            icon: Activity,
            title: '暂无进行中任务',
            description: '当前没有正在处理的任务。可以前往几何建模或设计优化创建新任务。',
            color: 'text-blue-400'
        },
        history: {
            icon: BarChart3,
            title: '暂无历史任务',
            description: '还没有任何历史记录。完成您的第一个任务后，历史记录会显示在这里。',
            color: 'text-gray-400'
        },
        filtered: {
            icon: Search,
            title: '没有匹配的任务',
            description: '尝试调整筛选条件或清除筛选器查看所有任务。',
            color: 'text-yellow-400'
        }
    };
    const config = configs[type];
    const IconComponent = config.icon;

    return (
        <div className="text-center py-12">
            <IconComponent className={`h-12 w-12 mx-auto mb-3 ${config.color}`} />
            <h3 className="text-lg font-medium text-gray-700 mb-1">{config.title}</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">{config.description}</p>
        </div>
    );
};

/**
 * 统一的任务容器页面
 * 整合任务队列（进行中）和历史任务，支持筛选与搜索
 */
const TaskContainerPage = () => {
    const { user } = useUserStore();
    const location = useLocation();

    // 任务列表状态
    const [queueTasks, setQueueTasks] = useState([]);
    const [completedTasks, setCompletedTasks] = useState([]);
    const [allTasks, setAllTasks] = useState([]);

    // 加载状态
    const [loadingQueue, setLoadingQueue] = useState(false);
    const [loadingCompleted, setLoadingCompleted] = useState(false);

    // 💥 优化队列状态（来自 /tasks/optimize/queue_length）
    const [optimizeQueueLength, setOptimizeQueueLength] = useState(0);
    const [optimizeRunningTasks, setOptimizeRunningTasks] = useState(0);

    // 筛选状态
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [queueSearchQuery, setQueueSearchQuery] = useState(''); // 💥 队列搜索

    // 分页状态
    const [queuePagination, setQueuePagination] = useState({
        currentPage: 1, limit: 10, offset: 0, hasMore: false
    });
    const [completedPagination, setCompletedPagination] = useState({
        currentPage: 1, limit: 10, offset: 0, hasMore: false
    });

    // 批量选择状态
    const [selectedQueueTasks, setSelectedQueueTasks] = useState([]);
    const [selectedCompletedTasks, setSelectedCompletedTasks] = useState([]);

    // 预览状态
    const [previewTask, setPreviewTask] = useState(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // 删除反馈
    const [deleteMessage, setDeleteMessage] = useState(null);

    // 初始加载
    useEffect(() => {
        fetchQueueTasks();
        fetchCompletedTasks();
        fetchOptimizeQueueStatus();
    }, []);

    // 恢复滚动位置
    useEffect(() => {
        if (location.state?.fromDetail && location.state?.scrollPosition) {
            setTimeout(() => {
                window.scrollTo(0, parseInt(location.state.scrollPosition));
            }, 100);
        }
    }, [location]);

    // 保存滚动位置
    useEffect(() => {
        const handleScroll = () => {
            sessionStorage.setItem('taskListScrollPos', window.scrollY.toString());
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // 删除消息自动消失
    useEffect(() => {
        if (deleteMessage) {
            const timer = setTimeout(() => setDeleteMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [deleteMessage]);

    /**
     * 筛选后的任务列表
     */
    const filteredTasks = useMemo(() => {
        let result = [...allTasks];
        if (filterType !== 'all') result = result.filter(task => task.task_type === filterType);
        if (filterStatus !== 'all') result = result.filter(task => task.status === filterStatus);
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(task =>
                String(task.task_id).toLowerCase().includes(query) ||
                (task.conversation_id && task.conversation_id.toLowerCase().includes(query))
            );
        }
        return result;
    }, [allTasks, filterType, filterStatus, searchQuery]);

    const hasActiveFilters = filterType !== 'all' || filterStatus !== 'all' || searchQuery.trim() !== '';
    const clearFilters = () => { setFilterType('all'); setFilterStatus('all'); setSearchQuery(''); };

    /**
     * 💥 获取设计优化队列状态（真实数据）
     */
    const fetchOptimizeQueueStatus = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/tasks/optimize/queue_length`);
            setOptimizeQueueLength(res.data.length ?? 0);
            setOptimizeRunningTasks(res.data.running ?? 0);
            console.log('📊 优化队列状态:', res.data);
        } catch (err) {
            console.error('获取优化队列状态失败:', err);
        }
    };

    /**
     * 获取任务队列（合并 Redis 进行中任务 + MySQL 排队中任务）
     */
    const fetchQueueTasks = async (page = 1) => {
        if (!user?.user_id) return;
        try {
            setLoadingQueue(true);

            // 1. 从 Redis 获取进行中任务
            const response = await getHistoryAPI(user.user_id);
            const allHistoryTasks = response.history || [];
            const redisTasks = allHistoryTasks.map(task => ({
                ...task,
                status: task.status || 'running',
                created_at: task.last_time || task.last_timestamp,
                updated_at: task.last_time || task.last_timestamp,
            })).filter(task => task.status !== 'done' && task.status !== 'failed');

            // 2. 从 MySQL 获取排队中的任务（如设计优化任务 status=queued）
            let mysqlQueuedTasks = [];
            try {
                const queuedTasks = await post('/tasks/list', { status: 'queued', limit: 50, offset: 0 });
                mysqlQueuedTasks = Array.isArray(queuedTasks) ? queuedTasks : [];
            } catch (e) {
                console.warn('获取 queued 任务失败:', e);
            }

            // 3. 合并去重（以 task_id 为准）
            const taskMap = new Map();
            redisTasks.forEach(t => taskMap.set(String(t.task_id), t));
            mysqlQueuedTasks.forEach(t => {
                if (!taskMap.has(String(t.task_id))) taskMap.set(String(t.task_id), t);
            });
            const mergedTasks = Array.from(taskMap.values());

            console.log('📋 队列任务:', { redis: redisTasks.length, mysql: mysqlQueuedTasks.length, merged: mergedTasks.length });

            const startIndex = (page - 1) * queuePagination.limit;
            const endIndex = startIndex + queuePagination.limit;
            setQueueTasks(mergedTasks.slice(startIndex, endIndex));
            setQueuePagination(prev => ({
                ...prev, currentPage: page, offset: startIndex,
                hasMore: endIndex < mergedTasks.length
            }));
        } catch (error) {
            console.error('❌ 获取任务队列失败:', error);
        } finally {
            setLoadingQueue(false);
        }
    };

    /**
     * 获取历史任务（已完成 status=done，来自 MySQL /tasks/list）
     */
    const fetchCompletedTasks = async (page = 1) => {
        if (!user?.user_id) return;
        try {
            setLoadingCompleted(true);
            const tasks = await post('/tasks/list', {
                status: 'done',
                limit: 50,
                offset: 0
            });

            console.log('📊 已完成任务列表:', tasks);

            setAllTasks(Array.isArray(tasks) ? tasks : []);

            const startIndex = (page - 1) * completedPagination.limit;
            const endIndex = startIndex + completedPagination.limit;
            const taskArray = Array.isArray(tasks) ? tasks : [];
            setCompletedTasks(taskArray.slice(startIndex, endIndex));
            setCompletedPagination(prev => ({
                ...prev, currentPage: page, offset: startIndex,
                hasMore: endIndex < taskArray.length
            }));
        } catch (error) {
            console.error('❌ 获取历史任务失败:', error);
        } finally {
            setLoadingCompleted(false);
        }
    };

    const handleQueuePageChange = (newPage) => fetchQueueTasks(newPage);
    const handleCompletedPageChange = (newPage) => fetchCompletedTasks(newPage);

    const handleRefresh = () => {
        fetchQueueTasks(queuePagination.currentPage);
        fetchCompletedTasks(completedPagination.currentPage);
        fetchOptimizeQueueStatus();
    };

    const handlePreview = (task) => {
        setPreviewTask(task);
        setIsPreviewOpen(true);
    };

    const handleDeleteTask = async (taskId, isFromQueue = true) => {
        if (!window.confirm('确定要删除该任务及其对话历史吗？此操作不可恢复！')) return;
        try {
            await deleteTaskAndMessagesAPI(taskId);
            setDeleteMessage({ type: 'success', text: `任务 ${taskId} 已成功删除` });
            if (isFromQueue) {
                fetchQueueTasks(queuePagination.currentPage);
                setSelectedQueueTasks(prev => prev.filter(id => id !== taskId));
            } else {
                fetchCompletedTasks(completedPagination.currentPage);
                setSelectedCompletedTasks(prev => prev.filter(id => id !== taskId));
            }
        } catch (error) {
            console.error('删除任务失败:', error);
            setDeleteMessage({ type: 'error', text: '删除任务失败，请稍后重试' });
        }
    };

    const handleBatchDelete = async (taskIds, isFromQueue = true) => {
        if (taskIds.length === 0) return alert('请先选择要删除的任务');
        if (!window.confirm(`确定要删除选中的 ${taskIds.length} 个任务吗？此操作不可恢复！`)) return;
        try {
            for (const taskId of taskIds) await deleteTaskAndMessagesAPI(taskId);
            setDeleteMessage({ type: 'success', text: `已成功删除 ${taskIds.length} 个任务` });
            if (isFromQueue) {
                fetchQueueTasks(queuePagination.currentPage);
                setSelectedQueueTasks([]);
            } else {
                fetchCompletedTasks(completedPagination.currentPage);
                setSelectedCompletedTasks([]);
            }
        } catch (error) {
            console.error('批量删除失败:', error);
            setDeleteMessage({ type: 'error', text: '批量删除失败，请稍后重试' });
        }
    };

    const getStatusTooltip = (status) => {
        const tips = {
            done: '任务已完成，点击查看详情',
            queued: '任务在排队中，等待执行',
            processing: '任务正在执行中',
            running: '任务正在运行',
            failed: '任务执行失败',
            pending: '任务等待处理'
        };
        return tips[status] || status;
    };

    const renderTaskList = (tasks, selectedTasks, setSelectedTasks, isFromQueue) => {
        if (tasks.length === 0) {
            return <EmptyState type={isFromQueue ? 'queue' : (hasActiveFilters ? 'filtered' : 'history')} />;
        }
        return (
            <div className="space-y-3">
                {tasks.map(task => (
                    <TaskCard key={task.task_id} task={task}
                        isSelected={selectedTasks.includes(task.task_id)}
                        onSelect={(taskId) => setSelectedTasks(prev =>
                            prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
                        )}
                        onPreview={handlePreview}
                        onDelete={(taskId) => handleDeleteTask(taskId, isFromQueue)}
                    />
                ))}
            </div>
        );
    };

    const displayTasks = hasActiveFilters ? filteredTasks : completedTasks;

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* 页面标题和刷新按钮 */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">任务管理</h1>
                        <p className="text-sm text-gray-500 mt-1">管理您的所有任务，查看历史记录和执行状态</p>
                    </div>
                    <Button onClick={handleRefresh} variant="outline" className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" />
                        刷新
                    </Button>
                </div>

                {/* 💥 删除操作反馈 */}
                {deleteMessage && (
                    <div className={`p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${deleteMessage.type === 'success'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                        {deleteMessage.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                        {deleteMessage.text}
                    </div>
                )}

                {/* 任务队列（进行中） */}
                <section className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-800">
                            任务队列 ({queueTasks.length})
                        </h2>
                        {selectedQueueTasks.length > 0 && (
                            <Button variant="destructive" size="sm"
                                onClick={() => handleBatchDelete(selectedQueueTasks, true)}
                                className="flex items-center gap-2">
                                <Trash2 className="h-4 w-4" />
                                批量删除 ({selectedQueueTasks.length})
                            </Button>
                        )}
                    </div>

                    {/* 💥 设计优化队列状态指示器 */}
                    {(optimizeQueueLength > 0 || optimizeRunningTasks > 0) && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                            <Activity className="h-5 w-5 text-blue-500 animate-pulse" />
                            <div className="text-sm text-blue-700">
                                <span className="font-medium">设计优化队列：</span>
                                {optimizeRunningTasks > 0 && <span className="mr-3">{optimizeRunningTasks} 个任务正在执行</span>}
                                {optimizeQueueLength > 0 && <span>{optimizeQueueLength} 个任务排队中</span>}
                            </div>
                        </div>
                    )}

                    {/* 💥 队列搜索框 */}
                    {queueTasks.length > 0 && (
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="搜索队列任务ID或类型..."
                                value={queueSearchQuery}
                                onChange={(e) => setQueueSearchQuery(e.target.value)}
                                className="pl-9 h-9 text-sm"
                            />
                        </div>
                    )}

                    {loadingQueue ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <>
                            {renderTaskList(
                                queueSearchQuery.trim()
                                    ? queueTasks.filter(t => 
                                        String(t.task_id).includes(queueSearchQuery) ||
                                        (t.task_type && t.task_type.includes(queueSearchQuery.toLowerCase()))
                                    )
                                    : queueTasks,
                                selectedQueueTasks, setSelectedQueueTasks, true
                            )}
                            {queueTasks.length > 0 && (
                                <Pagination currentPage={queuePagination.currentPage}
                                    hasMore={queuePagination.hasMore} limit={queuePagination.limit}
                                    onPageChange={handleQueuePageChange} />
                            )}
                        </>
                    )}
                </section>

                {/* 历史任务（带筛选） */}
                <section className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-800">
                            历史任务 ({hasActiveFilters ? `${filteredTasks.length}/${allTasks.length}` : completedTasks.length})
                        </h2>
                        {selectedCompletedTasks.length > 0 && (
                            <Button variant="destructive" size="sm"
                                onClick={() => handleBatchDelete(selectedCompletedTasks, false)}
                                className="flex items-center gap-2">
                                <Trash2 className="h-4 w-4" />
                                批量删除 ({selectedCompletedTasks.length})
                            </Button>
                        )}
                    </div>

                    <FilterBar
                        filterType={filterType} setFilterType={setFilterType}
                        filterStatus={filterStatus} setFilterStatus={setFilterStatus}
                        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                        onClearFilters={clearFilters} hasActiveFilters={hasActiveFilters}
                    />

                    {loadingCompleted ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <>
                            {renderTaskList(displayTasks, selectedCompletedTasks, setSelectedCompletedTasks, false)}
                            {!hasActiveFilters && completedTasks.length > 0 && (
                                <Pagination currentPage={completedPagination.currentPage}
                                    hasMore={completedPagination.hasMore} limit={completedPagination.limit}
                                    onPageChange={handleCompletedPageChange} />
                            )}
                        </>
                    )}
                </section>
            </div>

            {/* 预览对话框 */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>任务预览</DialogTitle>
                        <DialogDescription>快速查看任务信息</DialogDescription>
                    </DialogHeader>
                    {previewTask && (
                        <div className="space-y-3 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-500">任务 ID</p>
                                    <p className="font-mono font-medium">{previewTask.task_id}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">任务类型</p>
                                    <p className="font-medium">{previewTask.task_type}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">状态</p>
                                    <p className="font-medium" title={getStatusTooltip(previewTask.status)}>
                                        {previewTask.status}
                                        <span className="text-xs text-gray-400 ml-2">
                                            ({getStatusTooltip(previewTask.status)})
                                        </span>
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">用户 ID</p>
                                    <p className="font-medium">{previewTask.user_id}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">执行方式</p>
                                    <p className="font-medium">{previewTask.provider === 'dify' ? '🔗 Dify 工作流' : '🤖 Agent 智能体'}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">会话 ID</p>
                                <p className="font-mono text-sm text-gray-700 break-all">{previewTask.conversation_id}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">创建时间</p>
                                <p className="text-sm">{new Date(previewTask.created_at).toLocaleString()}</p>
                            </div>
                            {previewTask.updated_at && (
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">更新时间</p>
                                    <p className="text-sm">{new Date(previewTask.updated_at).toLocaleString()}</p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TaskContainerPage;
