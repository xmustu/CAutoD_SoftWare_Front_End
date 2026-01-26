import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { 
  Settings, 
  Save, 
  RefreshCw,
  Database,
  Users,
  Zap,
  Shield,
  Bell,
  Globe,
  CheckCircle,
  MessageSquare // 新增图标
} from 'lucide-react';
import {
  getSystemConfig,
  updateSystemConfig
} from '../api/adminApi';

const SystemSettingsPage = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    max_conversations_per_user: 50, // <--- 新增核心字段，默认50
    max_tasks_per_user: 10,
    max_file_size_mb: 100,
    enable_registration: true,
    enable_email_notifications: true,
    maintenance_mode: false,
    api_rate_limit: 100,
    session_timeout_minutes: 60,
    default_user_role: 'user'
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const data = await getSystemConfig();
      setConfig(data);
    } catch (error) {
      console.error('获取系统配置失败:', error);
      alert('获取系统配置失败：' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateSystemConfig(config);
      alert('系统配置已保存');
    } catch (error) {
      console.error('保存系统配置失败:', error);
      alert('保存系统配置失败：' + (error.response?.data?.detail || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('确定要重置为默认配置吗？')) {
      fetchConfig();
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <Settings className="h-8 w-8" />
          系统设置
        </h1>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            重置
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                保存配置
              </>
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">加载配置中...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 用户设置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                用户设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
            {/* 2. 在这里插入：每用户最大会话数设置 */}
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-gray-500" />
                  每用户最大会话数
                </label>
                <input
                  type="number"
                  min="1"
                  value={config.max_conversations_per_user || ''}
                  onChange={(e) => setConfig({ ...config, max_conversations_per_user: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-red-500">
                  注意：此项控制 "会话数量已达到上限" 的阈值，建议设置 100 以上。
                </p>
              </div>
              {/* ----------------------------------- */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  每用户最大任务数
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={config.max_tasks_per_user}
                  onChange={(e) => setConfig({ ...config, max_tasks_per_user: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">每个用户可以创建的最大任务数量</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  默认用户角色
                </label>
                <select
                  value={config.default_user_role}
                  onChange={(e) => setConfig({ ...config, default_user_role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="user">普通用户</option>
                  <option value="premium">高级用户</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">新注册用户的默认角色</p>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <label className="block text-sm font-medium">允许用户注册</label>
                  <p className="text-xs text-gray-500">开启后允许新用户自主注册</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enable_registration}
                    onChange={(e) => setConfig({ ...config, enable_registration: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* 性能设置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                性能设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  API 请求限制（次/分钟）
                </label>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={config.api_rate_limit}
                  onChange={(e) => setConfig({ ...config, api_rate_limit: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">每个用户每分钟最多可以发起的API请求数</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  会话超时时间（分钟）
                </label>
                <input
                  type="number"
                  min="5"
                  max="1440"
                  value={config.session_timeout_minutes}
                  onChange={(e) => setConfig({ ...config, session_timeout_minutes: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">用户登录会话的有效时长</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  最大上传文件大小（MB）
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={config.max_file_size_mb}
                  onChange={(e) => setConfig({ ...config, max_file_size_mb: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">允许上传的单个文件最大大小</p>
              </div>
            </CardContent>
          </Card>

          {/* 通知设置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                通知设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <label className="block text-sm font-medium">启用邮件通知</label>
                  <p className="text-xs text-gray-500">向用户发送任务完成和系统通知邮件</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enable_email_notifications}
                    onChange={(e) => setConfig({ ...config, enable_email_notifications: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 mb-2">邮件通知说明</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• 任务完成时发送通知</li>
                  <li>• 任务失败时发送错误报告</li>
                  <li>• 系统维护前发送提醒</li>
                  <li>• 账号相关操作确认</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 系统维护 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                系统维护
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-yellow-800">维护模式</label>
                  <p className="text-xs text-yellow-700">启用后只有管理员可以访问系统</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.maintenance_mode}
                    onChange={(e) => setConfig({ ...config, maintenance_mode: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                </label>
              </div>

              {config.maintenance_mode && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Shield className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-red-800">维护模式已启用</h4>
                      <p className="text-xs text-red-700 mt-1">
                        系统当前处于维护模式，普通用户无法访问。请确保在维护完成后关闭此选项。
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">维护模式功能</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• 阻止普通用户登录</li>
                  <li>• 显示维护页面</li>
                  <li>• 管理员仍可正常访问</li>
                  <li>• 暂停所有后台任务</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 数据库信息 */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                系统信息
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-800">系统版本</span>
                    <Globe className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-blue-900">v1.0.0</p>
                  <p className="text-xs text-blue-700 mt-1">CAutoD 管理系统</p>
                </div>

                <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-800">系统状态</span>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-green-900">
                    {config.maintenance_mode ? '维护中' : '运行中'}
                  </p>
                  <p className="text-xs text-green-700 mt-1">所有服务正常</p>
                </div>

                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-purple-800">数据库</span>
                    <Database className="h-5 w-5 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-purple-900">MySQL</p>
                  <p className="text-xs text-purple-700 mt-1">连接正常</p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="text-sm font-medium mb-3">配置摘要</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-gray-600">最大任务数:</span>
                    <span className="ml-2 font-medium">{config.max_tasks_per_user}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">文件限制:</span>
                    <span className="ml-2 font-medium">{config.max_file_size_mb}MB</span>
                  </div>
                  <div>
                    <span className="text-gray-600">请求限制:</span>
                    <span className="ml-2 font-medium">{config.api_rate_limit}/分钟</span>
                  </div>
                  <div>
                    <span className="text-gray-600">会话时长:</span>
                    <span className="ml-2 font-medium">{config.session_timeout_minutes}分钟</span>
                  </div>
                  <div>
                    <span className="text-gray-600">用户注册:</span>
                    <span className="ml-2 font-medium">{config.enable_registration ? '开启' : '关闭'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">邮件通知:</span>
                    <span className="ml-2 font-medium">{config.enable_email_notifications ? '开启' : '关闭'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">维护模式:</span>
                    <span className="ml-2 font-medium">{config.maintenance_mode ? '开启' : '关闭'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">默认角色:</span>
                    <span className="ml-2 font-medium">{config.default_user_role}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SystemSettingsPage;
