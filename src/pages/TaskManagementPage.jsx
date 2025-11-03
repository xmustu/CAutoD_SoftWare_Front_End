import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { 
  ClipboardList, 
  Trash2, 
  Search, 
  Filter,
  RefreshCw,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Loader
} from 'lucide-react';
import {
  getTaskList,
  deleteTask,
  batchDeleteTasks
} from '../api/adminApi';

const TaskManagementPage = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0
  });
  
  const [filters, setFilters] = useState({
    task_type: '',
    status: '',
    user_id: ''
  });
  
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    fetchTasks();
  }, [pagination.page]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await getTaskList({
        page: pagination.page,
        page_size: pagination.page_size,
        task_type: filters.task_type || undefined,
        status: filters.status || undefined,
        user_id: filters.user_id || undefined
      });
      
      console.log('任务列表响应:', response);
      
      if (response && response.items) {
        setTasks(response.items);
        setPagination(prev => ({
          ...prev,
          total: response.total || 0,
          total_pages: response.total_pages || 0
        }));
      } else {
        console.warn('响应数据格式不正确:', response);
        setTasks([]);
      }
    } catch (error) {
      console.error('获取任务列表失败:', error);
      setTasks([]);
      alert('获取任务列表失败：' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchTasks();
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('确定要删除该任务吗？此操作不可恢复！')) return;
    
    try {
      await deleteTask(taskId);
      alert('任务删除成功');
      fetchTasks();
    } catch (error) {
      console.error('删除任务失败:', error);
      alert('删除任务失败：' + (error.response?.data?.detail || error.message));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedTasks.length === 0) {
      alert('请先选择要删除的任务');
      return;
    }
    
    if (!window.confirm(`确定要删除选中的 ${selectedTasks.length} 个任务吗？此操作不可恢复！`)) return;
    
    try {
      await batchDeleteTasks(selectedTasks);
      alert('批量删除成功');
      setSelectedTasks([]);
      fetchTasks();
    } catch (error) {
      console.error('批量删除失败:', error);
      alert('批量删除失败：' + (error.response?.data?.detail || error.message));
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'done':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'processing':
        return <Loader className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'queued':
        return <Loader className="h-5 w-5 text-indigo-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      done: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      processing: 'bg-blue-100 text-blue-800',
      queued: 'bg-indigo-100 text-indigo-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getTaskTypeLabel = (type) => {
    const labels = {
      geometry: '几何建模',
      optimize: '设计优化',
      retrieval: '零件检索'
    };
    return labels[type] || type;
  };

  const openDetailModal = (task) => {
    setSelectedTask(task);
    setShowDetailModal(true);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <ClipboardList className="h-8 w-8" />
          任务管理
        </h1>
        {selectedTasks.length > 0 && (
          <button
            onClick={handleBatchDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            批量删除 ({selectedTasks.length})
          </button>
        )}
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <input
              type="number"
              placeholder="用户ID..."
              value={filters.user_id}
              onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={filters.task_type}
              onChange={(e) => setFilters({ ...filters, task_type: e.target.value })}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有类型</option>
              <option value="geometry">几何建模</option>
              <option value="optimize">设计优化</option>
              <option value="retrieval">零件检索</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有状态</option>
              <option value="pending">等待中</option>
              <option value="queued">排队中</option>
              <option value="processing">处理中</option>
              <option value="done">已完成</option>
              <option value="failed">失败</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              筛选
            </button>
            <button
              type="button"
              onClick={fetchTasks}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              刷新
            </button>
          </form>
        </CardContent>
      </Card>

      {/* 任务列表 */}
      <Card>
        <CardHeader>
          <CardTitle>任务列表 (共 {pagination.total} 个任务)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">加载中...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无任务数据</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedTasks.length === tasks.length && tasks.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTasks(tasks.map(t => t.task_id));
                          } else {
                            setSelectedTasks([]);
                          }
                        }}
                      />
                    </th>
                    <th className="px-4 py-3 text-left">任务ID</th>
                    <th className="px-4 py-3 text-left">用户ID</th>
                    <th className="px-4 py-3 text-left">类型</th>
                    <th className="px-4 py-3 text-left">状态</th>
                    <th className="px-4 py-3 text-left">创建时间</th>
                    <th className="px-4 py-3 text-left">完成时间</th>
                    <th className="px-4 py-3 text-left">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tasks.map((task) => (
                    <tr key={task.task_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedTasks.includes(task.task_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTasks([...selectedTasks, task.task_id]);
                            } else {
                              setSelectedTasks(selectedTasks.filter(id => id !== task.task_id));
                            }
                          }}
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-sm">{task.task_id}</td>
                      <td className="px-4 py-3">{task.user_id}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {getTaskTypeLabel(task.task_type)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(task.status)}`}>
                          {getStatusIcon(task.status)}
                          {task.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(task.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {task.completed_at ? new Date(task.completed_at).toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openDetailModal(task)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                            title="查看详情"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.task_id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                            title="删除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* 分页 */}
          {pagination.total_pages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-600">
                第 {pagination.page} 页，共 {pagination.total_pages} 页
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page >= pagination.total_pages}
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 任务详情模态框 */}
      {showDetailModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Eye className="h-6 w-6" />
              任务详情
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">任务ID</label>
                  <p className="mt-1 font-mono">{selectedTask.task_id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">用户ID</label>
                  <p className="mt-1">{selectedTask.user_id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">任务类型</label>
                  <p className="mt-1">{getTaskTypeLabel(selectedTask.task_type)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">状态</label>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedTask.status)}`}>
                    {getStatusIcon(selectedTask.status)}
                    {selectedTask.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">创建时间</label>
                  <p className="mt-1 text-sm">{new Date(selectedTask.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">完成时间</label>
                  <p className="mt-1 text-sm">
                    {selectedTask.completed_at ? new Date(selectedTask.completed_at).toLocaleString() : '未完成'}
                  </p>
                </div>
              </div>
              
              {selectedTask.input_params && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">输入参数</label>
                  <pre className="bg-gray-100 p-3 rounded-lg text-xs overflow-auto max-h-40">
                    {JSON.stringify(selectedTask.input_params, null, 2)}
                  </pre>
                </div>
              )}
              
              {selectedTask.output_results && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">输出结果</label>
                  <pre className="bg-gray-100 p-3 rounded-lg text-xs overflow-auto max-h-40">
                    {JSON.stringify(selectedTask.output_results, null, 2)}
                  </pre>
                </div>
              )}
              
              {selectedTask.error_message && (
                <div>
                  <label className="block text-sm font-medium text-red-600 mb-2">错误信息</label>
                  <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-sm text-red-800">
                    {selectedTask.error_message}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-6 mt-6 border-t">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedTask(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                关闭
              </button>
              <button
                onClick={() => {
                  handleDeleteTask(selectedTask.task_id);
                  setShowDetailModal(false);
                  setSelectedTask(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                删除任务
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskManagementPage;
