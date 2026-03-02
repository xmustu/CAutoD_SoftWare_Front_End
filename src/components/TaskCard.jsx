import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Eye, Trash2, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';
import { format } from 'date-fns';

/**
 * 任务卡片组件
 * 支持选择、预览、点击跳转等功能
 */
const TaskCard = ({
    task,
    isSelected = false,
    onSelect,
    onPreview,
    onDelete,
    showCheckbox = true
}) => {
    const navigate = useNavigate();

    const handleCardClick = (e) => {
        // 如果点击的是 checkbox 或按钮，不触发卡片点击
        if (e.target.closest('button') || e.target.closest('[role="checkbox"]')) {
            console.log('🚫 TaskCard: 点击了按钮或checkbox,不跳转');
            return;
        }

        console.log('🖱️ TaskCard: 卡片被点击', task);

        // 根据任务类型跳转到对应的对话页面
        const routes = {
            geometry: '/geometry',  // 修复: 匹配App.jsx中的路由
            optimize: '/design-optimization',
            retrieval: '/parts'  // 修复: 匹配App.jsx中的路由
        };

        const targetRoute = routes[task.task_type] || '/tasks';

        console.log('🎯 TaskCard: 准备跳转', {
            taskType: task.task_type,
            targetRoute,
            conversationId: task.conversation_id,
            taskId: task.task_id
        });

        // 跳转并传递conversation_id以便页面加载对应会话
        navigate(targetRoute, {
            state: {
                conversationId: task.conversation_id,
                taskId: task.task_id,
                fromTaskList: true
            }
        });

        console.log('✅ TaskCard: navigate已调用');
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'done':
                return <CheckCircle className="h-4 w-4 text-green-600" />;
            case 'failed':
                return <XCircle className="h-4 w-4 text-red-600" />;
            case 'processing':
                return <Loader className="h-4 w-4 text-blue-600 animate-spin" />;
            case 'queued':
                return <Loader className="h-4 w-4 text-indigo-600" />;
            case 'pending':
                return <Clock className="h-4 w-4 text-yellow-600" />;
            default:
                return <Clock className="h-4 w-4 text-gray-600" />;
        }
    };

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
        <div
            className={`
        relative p-4 rounded-lg border-2 transition-all cursor-pointer
        ${isSelected
                    ? 'bg-blue-50 border-blue-500 shadow-md'
                    : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }
      `}
            onClick={handleCardClick}
        >
            <div className="flex items-start gap-4">
                {/* 复选框 */}
                {showCheckbox && (
                    <div className="flex-shrink-0 pt-1" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => onSelect(task.task_id)}
                        />
                    </div>
                )}

                {/* 主要内容 */}
                <div className="flex-1 min-w-0">
                    {/* 第一行：任务类型 + 状态 */}
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {getTaskTypeLabel(task.task_type)}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                            {getStatusIcon(task.status)}
                            {task.status}
                        </span>
                    </div>

                    {/* 第二行：任务 ID */}
                    <p className="text-sm text-gray-900 font-medium mb-1">
                        任务 ID: {task.task_id}
                    </p>

                    {/* 第三行：会话 ID */}
                    <p className="text-xs text-gray-500 truncate mb-2">
                        会话: {task.conversation_id}
                    </p>

                    {/* 第四行：时间信息 */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>创建: {task.created_at ? format(new Date(task.created_at), 'yyyy-MM-dd HH:mm') : '未知'}</span>
                        {task.updated_at && (
                            <span>更新: {format(new Date(task.updated_at), 'yyyy-MM-dd HH:mm')}</span>
                        )}
                    </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex-shrink-0 flex gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                            e.stopPropagation();
                            onPreview(task);
                        }}
                        title="详情"
                    >
                        <Eye className="h-4 w-4 text-gray-500" />
                    </Button>
                    {onDelete && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(task.task_id);
                            }}
                            title="删除"
                        >
                            <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TaskCard;
