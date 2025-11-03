import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { 
  Users, 
  FileText, 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { 
  getSystemStats, 
  getUserStats, 
  getTaskTypeStats, 
  getDailyStats 
} from '../api/adminApi';

const AdminDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [userStats, setUserStats] = useState([]);
  const [taskTypeStats, setTaskTypeStats] = useState([]);
  const [dailyStats, setDailyStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsData, usersData, taskTypesData, dailyData] = await Promise.all([
        getSystemStats().catch(err => {
          console.error('获取系统统计失败:', err);
          return null;
        }),
        getUserStats(10).catch(err => {
          console.error('获取用户统计失败:', err);
          return [];
        }),
        getTaskTypeStats().catch(err => {
          console.error('获取任务类型统计失败:', err);
          return [];
        }),
        getDailyStats(7).catch(err => {
          console.error('获取每日统计失败:', err);
          return [];
        })
      ]);
      
      setStats(statsData);
      setUserStats(usersData || []);
      setTaskTypeStats(taskTypesData || []);
      setDailyStats(dailyData || []);
    } catch (error) {
      console.error('获取数据失败:', error);
      // 不显示 alert，只在控制台记录
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">管理员控制台</h1>
        <button 
          onClick={fetchData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          刷新数据
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总用户数</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_users || 0}</div>
            <p className="text-xs text-muted-foreground">
              今日新增: {stats?.users_today || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总任务数</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_tasks || 0}</div>
            <p className="text-xs text-muted-foreground">
              今日新增: {stats?.tasks_today || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">进行中任务</CardTitle>
            <Activity className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active_tasks || 0}</div>
            <p className="text-xs text-muted-foreground">
              待处理: {stats?.pending_tasks || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">完成任务</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completed_tasks || 0}</div>
            <p className="text-xs text-muted-foreground">
              失败: {stats?.failed_tasks || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 任务状态统计 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            任务状态统计
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3 p-4 bg-yellow-50 rounded-lg">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div>
                <div className="text-sm text-gray-600">待处理</div>
                <div className="text-2xl font-bold">{stats?.pending_tasks || 0}</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
              <Activity className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-sm text-gray-600">进行中</div>
                <div className="text-2xl font-bold">{stats?.active_tasks || 0}</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-sm text-gray-600">已完成</div>
                <div className="text-2xl font-bold">{stats?.completed_tasks || 0}</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg">
              <XCircle className="h-8 w-8 text-red-600" />
              <div>
                <div className="text-sm text-gray-600">失败</div>
                <div className="text-2xl font-bold">{stats?.failed_tasks || 0}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 用户活跃度和任务类型 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 活跃用户 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              活跃用户 (Top 10)
            </CardTitle>
            <CardDescription>按任务数量排序</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {userStats && userStats.length > 0 ? (
                userStats.map((user, idx) => (
                  <div key={user.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-400">#{idx + 1}</span>
                      <div>
                        <div className="font-medium">{user.username}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-600">{user.task_count} 任务</div>
                      <div className="text-xs text-gray-500">{user.conversation_count} 会话</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">暂无数据</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 任务类型分布 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              任务类型分布
            </CardTitle>
            <CardDescription>不同类型任务的数量统计</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {taskTypeStats && taskTypeStats.length > 0 ? (
                taskTypeStats.map((item) => {
                  const total = taskTypeStats.reduce((sum, t) => sum + t.count, 0);
                  const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : 0;
                  return (
                    <div key={item.task_type} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium capitalize">{item.task_type}</span>
                        <span className="text-gray-600">{item.count} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-gray-500 py-8">暂无数据</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 每日统计趋势 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            每日统计趋势（最近7天）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">日期</th>
                  <th className="px-4 py-2 text-right">新增用户</th>
                  <th className="px-4 py-2 text-right">新增任务</th>
                  <th className="px-4 py-2 text-right">新增会话</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dailyStats && dailyStats.length > 0 ? (
                  dailyStats.map((day) => (
                    <tr key={day.date} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{day.date}</td>
                      <td className="px-4 py-3 text-right font-medium text-blue-600">{day.user_count}</td>
                      <td className="px-4 py-3 text-right font-medium text-green-600">{day.task_count}</td>
                      <td className="px-4 py-3 text-right font-medium text-purple-600">{day.conversation_count}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-4 py-8 text-center text-gray-500">暂无数据</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboardPage;
