import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { post } from '@/api/index';
import { deleteTaskAndMessagesAPI, getHistoryAPI } from '@/api/conversationAPI';
import TaskCard from '@/components/TaskCard';
import Pagination from '@/components/Pagination';
import useUserStore from '@/store/userStore';

/**
 * 统一的任务容器页面
 * 整合任务队列（进行中）和已完成任务
 */
const TaskContainerPage = () => {
    const { user } = useUserStore();
    const location = useLocation();

    // 任务列表状态
    const [queueTasks, setQueueTasks] = useState([]);
    const [completedTasks, setCompletedTasks] = useState([]);

    // 加载状态
    const [loadingQueue, setLoadingQueue] = useState(false);
    const [loadingCompleted, setLoadingCompleted] = useState(false);

    // 分页状态
    const [queuePagination, setQueuePagination] = useState({
        currentPage: 1,
        limit: 20,
        offset: 0,
        hasMore: false
    });

    const [completedPagination, setCompletedPagination] = useState({
        currentPage: 1,
        limit: 20,
        offset: 0,
        hasMore: false
    });

    // 批量选择状态
    const [selectedQueueTasks, setSelectedQueueTasks] = useState([]);
    const [selectedCompletedTasks, setSelectedCompletedTasks] = useState([]);

    // 预览状态
    const [previewTask, setPreviewTask] = useState(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // 初始加载
    useEffect(() => {
        fetchQueueTasks();
        fetchCompletedTasks();
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

    /**
     * 获取任务队列（进行中的任务）
     */
    const fetchQueueTasks = async (page = 1) => {
        if (!user?.user_id) return;

        try {
            setLoadingQueue(true);

            console.log('🌐 调用API: /chat/history', { userId: user.user_id });

            // 使用 /chat/history API 获取所有任务历史
            const response = await getHistoryAPI(user.user_id);

            console.log('📦 API完整响应:', response);
            console.log('📦 响应类型:', typeof response);
            console.log('📦 response.history:', response.history);

            const allTasks = response.history || [];

            // 🔧 数据转换：将后端字段映射到前端期望的字段
            const mappedTasks = allTasks.map(task => ({
                ...task,
                // 添加缺失的字段
                status: 'running',  // 默认状态，因为history里的都是进行中的任务
                created_at: task.last_time || task.last_timestamp,  // 使用last_time作为创建时间
                updated_at: task.last_time || task.last_timestamp,  // 使用last_time作为更新时间
            }));

            // 打印第一个任务的数据结构用于调试
            if (mappedTasks.length > 0) {
                console.log('🔍 第一个任务的原始数据:', allTasks[0]);
                console.log('🔍 第一个任务的映射后数据:', mappedTasks[0]);
                console.log('  - task_id:', mappedTasks[0].task_id);
                console.log('  - conversation_id:', mappedTasks[0].conversation_id);
                console.log('  - status:', mappedTasks[0].status);
                console.log('  - created_at:', mappedTasks[0].created_at);
            }
            console.log('📋 所有任务列表:', mappedTasks);

            // 客户端过滤：只保留非完成状态的任务（history API返回的都是进行中的）
            const queueTasksFiltered = mappedTasks.filter(task =>
                task.status !== 'done' && task.status !== 'failed'
            );

            console.log('✅ 过滤后的进行中任务:', queueTasksFiltered);

            // 客户端分页
            const startIndex = (page - 1) * queuePagination.limit;
            const endIndex = startIndex + queuePagination.limit;
            const paginatedTasks = queueTasksFiltered.slice(startIndex, endIndex);

            setQueueTasks(paginatedTasks);
            setQueuePagination(prev => ({
                ...prev,
                currentPage: page,
                offset: startIndex,
                hasMore: endIndex < queueTasksFiltered.length
            }));
        } catch (error) {
            console.error('❌ 获取任务队列失败:', error);
            console.error('❌ 错误详情:', error.response);
        } finally {
            setLoadingQueue(false);
        }
    };

    /**
     * 获取已完成任务
     */
    const fetchCompletedTasks = async (page = 1) => {
        if (!user?.user_id) return;

        try {
            setLoadingCompleted(true);

            const offset = (page - 1) * completedPagination.limit;

            console.log('🌐 调用API: /tasks/list (已完成)', { offset, limit: completedPagination.limit });

            // 使用 /tasks/list API 获取已完成任务（从MySQL）
            const tasks = await post('/tasks/list', {
                status: 'done',
                limit: 50,  // 获取足够多的数据
                offset: 0
            });

            console.log('📊 已完成任务列表:', tasks);

            // 客户端分页
            const startIndex = (page - 1) * completedPagination.limit;
            const endIndex = startIndex + completedPagination.limit;
            const paginatedTasks = tasks.slice(startIndex, endIndex);

            setCompletedTasks(paginatedTasks);
            setCompletedPagination(prev => ({
                ...prev,
                currentPage: page,
                offset: startIndex,
                hasMore: endIndex < tasks.length
            }));
        } catch (error) {
            console.error('❌ 获取已完成任务失败:', error);
            console.error('❌ 错误详情:', error.response);
        } finally {
            setLoadingCompleted(false);
        }
    };

    /**
     * 队列任务分页处理
     */
    const handleQueuePageChange = (newPage) => {
        fetchQueueTasks(newPage);
    };

    /**
     * 已完成任务分页处理
     */
    const handleCompletedPageChange = (newPage) => {
        fetchCompletedTasks(newPage);
    };

    /**
     * 刷新所有任务
     */
    const handleRefresh = () => {
        fetchQueueTasks(queuePagination.currentPage);
        fetchCompletedTasks(completedPagination.currentPage);
    };

    /**
     * 打开预览
     */
    const handlePreview = (task) => {
        setPreviewTask(task);
        setIsPreviewOpen(true);
    };

    /**
     * 删除单个任务
     */
    const handleDeleteTask = async (taskId, isFromQueue = true) => {
        if (!window.confirm('确定要删除该任务及其对话历史吗？此操作不可恢复！')) {
            return;
        }

        try {
            await deleteTaskAndMessagesAPI(taskId);

            // 刷新对应列表
            if (isFromQueue) {
                fetchQueueTasks(queuePagination.currentPage);
                setSelectedQueueTasks(prev => prev.filter(id => id !== taskId));
            } else {
                fetchCompletedTasks(completedPagination.currentPage);
                setSelectedCompletedTasks(prev => prev.filter(id => id !== taskId));
            }
        } catch (error) {
            console.error('删除任务失败:', error);
            alert('删除任务失败，请稍后重试');
        }
    };

    /**
     * 批量删除任务
     */
    const handleBatchDelete = async (taskIds, isFromQueue = true) => {
        if (taskIds.length === 0) {
            alert('请先选择要删除的任务');
            return;
        }

        if (!window.confirm(`确定要删除选中的 ${taskIds.length} 个任务吗？此操作不可恢复！`)) {
            return;
        }

        try {
            // 循环删除（因为后端无批量删除接口）
            for (const taskId of taskIds) {
                await deleteTaskAndMessagesAPI(taskId);
            }

            // 刷新对应列表
            if (isFromQueue) {
                fetchQueueTasks(queuePagination.currentPage);
                setSelectedQueueTasks([]);
            } else {
                fetchCompletedTasks(completedPagination.currentPage);
                setSelectedCompletedTasks([]);
            }

            alert('批量删除成功');
        } catch (error) {
            console.error('批量删除失败:', error);
            alert('批量删除失败，请稍后重试');
        }
    };

    /**
     * 渲染任务列表
     */
    const renderTaskList = (tasks, selectedTasks, setSelectedTasks, isFromQueue) => {
        if (tasks.length === 0) {
            return (
                <div className="text-center py-12 text-gray-500">
                    暂无任务
                </div>
            );
        }

        return (
            <div className="space-y-3">
                {tasks.map(task => (
                    <TaskCard
                        key={task.task_id}
                        task={task}
                        isSelected={selectedTasks.includes(task.task_id)}
                        onSelect={(taskId) => {
                            setSelectedTasks(prev =>
                                prev.includes(taskId)
                                    ? prev.filter(id => id !== taskId)
                                    : [...prev, taskId]
                            );
                        }}
                        onPreview={handlePreview}
                        onDelete={(taskId) => handleDeleteTask(taskId, isFromQueue)}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* 页面标题和刷新按钮 */}
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-gray-800">任务管理</h1>
                    <Button
                        onClick={handleRefresh}
                        variant="outline"
                        className="flex items-center gap-2"
                    >
                        <RefreshCw className="h-4 w-4" />
                        刷新
                    </Button>
                </div>

                {/* 任务队列（进行中） */}
                <section className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-800">
                            任务队列 ({queueTasks.length})
                        </h2>
                        {selectedQueueTasks.length > 0 && (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleBatchDelete(selectedQueueTasks, true)}
                                className="flex items-center gap-2"
                            >
                                <Trash2 className="h-4 w-4" />
                                批量删除 ({selectedQueueTasks.length})
                            </Button>
                        )}
                    </div>

                    {loadingQueue ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <>
                            {renderTaskList(queueTasks, selectedQueueTasks, setSelectedQueueTasks, true)}
                            {queueTasks.length > 0 && (
                                <Pagination
                                    currentPage={queuePagination.currentPage}
                                    hasMore={queuePagination.hasMore}
                                    limit={queuePagination.limit}
                                    onPageChange={handleQueuePageChange}
                                />
                            )}
                        </>
                    )}
                </section>

                {/* 已完成任务 */}
                <section className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-800">
                            已完成任务 ({completedTasks.length})
                        </h2>
                        {selectedCompletedTasks.length > 0 && (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleBatchDelete(selectedCompletedTasks, false)}
                                className="flex items-center gap-2"
                            >
                                <Trash2 className="h-4 w-4" />
                                批量删除 ({selectedCompletedTasks.length})
                            </Button>
                        )}
                    </div>

                    {loadingCompleted ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <>
                            {renderTaskList(completedTasks, selectedCompletedTasks, setSelectedCompletedTasks, false)}
                            {completedTasks.length > 0 && (
                                <Pagination
                                    currentPage={completedPagination.currentPage}
                                    hasMore={completedPagination.hasMore}
                                    limit={completedPagination.limit}
                                    onPageChange={handleCompletedPageChange}
                                />
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
                                    <p className="font-medium">{previewTask.status}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">用户 ID</p>
                                    <p className="font-medium">{previewTask.user_id}</p>
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
