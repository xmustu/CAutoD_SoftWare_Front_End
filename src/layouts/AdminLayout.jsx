import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings, 
  LogOut,
  Shield,
  Menu,
  X,
  Home
} from 'lucide-react';
import useUserStore from '../store/userStore';

const AdminLayout = () => {
  const navigate = useNavigate();
  const { logout } = useUserStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    if (window.confirm('确定要退出登录吗？')) {
      logout();
      navigate('/login');
    }
  };

  const handleBackToMain = () => {
    navigate('/create-project');
  };

  const navItems = [
    {
      path: '/admin/dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
      label: '控制台'
    },
    {
      path: '/admin/users',
      icon: <Users className="h-5 w-5" />,
      label: '用户管理'
    },
    {
      path: '/admin/tasks',
      icon: <FileText className="h-5 w-5" />,
      label: '任务管理'
    },
    {
      path: '/admin/settings',
      icon: <Settings className="h-5 w-5" />,
      label: '系统设置'
    }
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 侧边栏 */}
      <aside 
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-gray-900 text-white transition-all duration-300 flex flex-col`}
      >
        {/* Logo 区域 */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          {sidebarOpen ? (
            <>
              <div className="flex items-center gap-2">
                <Shield className="h-8 w-8 text-blue-400" />
                <div>
                  <h1 className="font-bold text-lg">CAutoD</h1>
                  <p className="text-xs text-gray-400">管理员面板</p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 hover:bg-gray-800 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1 hover:bg-gray-800 rounded mx-auto"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                } ${!sidebarOpen && 'justify-center'}`
              }
              title={!sidebarOpen ? item.label : ''}
            >
              {item.icon}
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* 底部按钮 */}
        <div className="p-4 border-t border-gray-800 space-y-2">
          <button
            onClick={handleBackToMain}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full text-gray-300 hover:bg-gray-800 hover:text-white transition-colors ${
              !sidebarOpen && 'justify-center'
            }`}
            title={!sidebarOpen ? '返回主页' : ''}
          >
            <Home className="h-5 w-5" />
            {sidebarOpen && <span>返回主页</span>}
          </button>
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full text-gray-300 hover:bg-gray-800 hover:text-white transition-colors ${
              !sidebarOpen && 'justify-center'
            }`}
            title={!sidebarOpen ? '退出登录' : ''}
          >
            <LogOut className="h-5 w-5" />
            {sidebarOpen && <span>退出登录</span>}
          </button>
        </div>
      </aside>

      {/* 主内容区域 */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
