import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { post } from '@/api/index';
import { deleteTaskAndMessagesAPI } from '@/api/conversationAPI';
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
        limit: 5,  // 任务队列每页5个
        offset: 0,
        hasMore: false
    });

    const [completedPagination, setCompletedPagination] = useState({
        currentPage: 1,
        limit: 5,  // 完成任务每页5个
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
            const offset = (page - 1) * queuePagination.limit;

            // 查询所有非完成状态的任务（包括pending, queued, processing等）
            const fetchLimit = 50;  // 降低到50避免后端422错误
            const allTasks = await post('/tasks/list', {
                limit: fetchLimit,
                offset: 0
            });

            // 调试：打印所有任务
            console.log('📋 所有任务列表:', allTasks);

            // 客户端过滤：只保留非done状态的任务
            const tasks = allTasks.filter(task => task.status !== 'done');

            console.log('✅ 过滤后的进行中任务:', tasks);

            setQueueTasks(tasks.slice(offset, offset + queuePagination.limit));
            setQueuePagination(prev => ({
                ...prev,
                currentPage: page,
                offset: offset,
                hasMore: tasks.length > offset + queuePagination.limit
            }));
        } catch (error) {
            console.error('获取任务队列失败:', error);
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

            // 获取更多的已完成任务以查看是否有optimize类型
            const fetchLimit = 50;  // 使用50作为安全的limit值
            const allCompletedTasks = await post('/tasks/list', {
                status: 'done',
                limit: fetchLimit,
                offset: 0
            });

            // 调试：打印已完成任务的类型分布
            console.log(`📊 已完成任务列表(前${fetchLimit}个):`, allCompletedTasks);
            const taskTypeCounts = {};
            allCompletedTasks.forEach(task => {
                taskTypeCounts[task.task_type] = (taskTypeCounts[task.task_type] || 0) + 1;
            });
            console.log('📈 任务类型统计:', taskTypeCounts);
            console.log(`🔢 已完成任务总数: ${allCompletedTasks.length}`);

            // 分页处理
            const offset = (page - 1) * completedPagination.limit;
            const paginatedTasks = allCompletedTasks.slice(offset, offset + completedPagination.limit);

            setCompletedTasks(paginatedTasks);
            setCompletedPagination(prev => ({
                ...prev,
                currentPage: page,
                offset: offset,
                hasMore: allCompletedTasks.length > offset + completedPagination.limit
            }));
        } catch (error) {
            console.error('获取已完成任务失败:', error);
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
