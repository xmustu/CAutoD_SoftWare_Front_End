import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Clock, Calendar, User, Hash, FileText } from 'lucide-react';
import { getTaskDetail } from '@/api/adminApi';

/**
 * 任务详情页面
 * 显示任务的完整信息，支持返回时恢复滚动位置
 */
const TaskDetailPage = () => {
    const { taskId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchTaskDetail();
    }, [taskId]);

    const fetchTaskDetail = async () => {
        try {
            setLoading(true);
            const data = await getTaskDetail(taskId);
            setTask(data);
        } catch (err) {
            console.error('获取任务详情失败:', err);
            setError('加载任务详情失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        // 恢复滚动位置
        const savedScrollPos = sessionStorage.getItem('taskListScrollPos');
        navigate('/tasks', {
            state: {
                scrollPosition: savedScrollPos,
                fromDetail: true
            }
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-xl text-gray-600">加载中...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <p className="text-red-600">{error}</p>
                <Button onClick={handleBack}>返回任务列表</Button>
            </div>
        );
    }

    if (!task) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <p className="text-gray-600">未找到任务信息</p>
                <Button onClick={handleBack}>返回任务列表</Button>
            </div>
        );
    }

    const getStatusColor = (status) => {
        const colors = {
            done: 'bg-green-100 text-green-800',
            failed: 'bg-red-100 text-red-800',
            processing: 'bg-blue-100 text-blue-800',
            queued: 'bg-indigo-100 text-indigo-800',
            pending: 'bg-yellow-100 text-yellow-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getTaskTypeLabel = (type) => {
        const labels = {
            geometry: '几何建模',
            optimize: '设计优化',
            retrieval: '零件检索'
        };
        return labels[type] || type;
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
                {/* 返回按钮 */}
                <Button
                    variant="ghost"
                    onClick={handleBack}
                    className="mb-6 flex items-center gap-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                    返回任务列表
                </Button>

                {/* 任务详情卡片 */}
                <Card>
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <CardTitle className="text-2xl">任务详情</CardTitle>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
                                {task.status}
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* 基本信息 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3">
                                <Hash className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-500">任务 ID</p>
                                    <p className="font-mono font-medium">{task.task_id}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-500">任务类型</p>
                                    <p className="font-medium">{getTaskTypeLabel(task.task_type)}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <User className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-500">用户 ID</p>
                                    <p className="font-medium">{task.user_id}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Hash className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-500">会话 ID</p>
                                    <p className="font-mono text-sm truncate">{task.conversation_id}</p>
                                </div>
                            </div>
                        </div>

                        {/* 时间信息 */}
                        <div className="border-t pt-4">
                            <h3 className="text-lg font-semibold mb-3">时间信息</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center gap-3">
                                    <Calendar className="h-5 w-5 text-gray-400" />
                                    <div>
                                        <p className="text-sm text-gray-500">创建时间</p>
                                        <p className="text-sm">{new Date(task.created_at).toLocaleString()}</p>
                                    </div>
                                </div>

                                {task.updated_at && (
                                    <div className="flex items-center gap-3">
                                        <Clock className="h-5 w-5 text-gray-400" />
                                        <div>
                                            <p className="text-sm text-gray-500">更新时间</p>
                                            <p className="text-sm">{new Date(task.updated_at).toLocaleString()}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 几何建模结果 */}
                        {task.geometry_result && Object.keys(task.geometry_result).length > 0 && (
                            <div className="border-t pt-4">
                                <h3 className="text-lg font-semibold mb-3">几何建模结果</h3>
                                <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-60">
                                    {JSON.stringify(task.geometry_result, null, 2)}
                                </pre>
                            </div>
                        )}

                        {/* 优化结果 */}
                        {task.optimization_result && Object.keys(task.optimization_result).length > 0 && (
                            <div className="border-t pt-4">
                                <h3 className="text-lg font-semibold mb-3">优化结果</h3>
                                <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-60">
                                    {JSON.stringify(task.optimization_result, null, 2)}
                                </pre>
                            </div>
                        )}

                        {/* 错误日志 */}
                        {task.error_logs && task.error_logs.length > 0 && (
                            <div className="border-t pt-4">
                                <h3 className="text-lg font-semibold mb-3 text-red-600">错误日志</h3>
                                <div className="space-y-2">
                                    {task.error_logs.map((log, idx) => (
                                        <div key={idx} className="bg-red-50 border border-red-200 p-3 rounded-lg">
                                            <pre className="text-xs text-red-800 whitespace-pre-wrap">
                                                {typeof log === 'string' ? log : JSON.stringify(log, null, 2)}
                                            </pre>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default TaskDetailPage;
