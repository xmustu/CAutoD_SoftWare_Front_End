import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// 布局
import DashboardLayout from './layouts/DashboardLayout';
import AdminLayout from './layouts/AdminLayout';

// 页面
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import CreateProjectPage from './pages/CreateProjectPage';
import GeometricModelingPage from './pages/GeometricModelingPage';
import PartRetrievalPage from './pages/PartRetrievalPage';
import DesignOptimizationPage from './pages/DesignOptimizationPage';
import SoftwareInterfacePage from './pages/SoftwareInterfacePage';
import DifyTestPage from './pages/DifyTestPage';
import HistoryPage from './pages/HistoryPage';
//import TaskListPage from './pages/TaskListPage';
import TaskContainerPage from './pages/TaskContainerPage';
import TaskDetailPage from './pages/TaskDetailPage';
// 管理员页面
import AdminDashboardPage from './pages/AdminDashboardPage';
import UserManagementPage from './pages/UserManagementPage';
import TaskManagementPage from './pages/TaskManagementPage';
import SystemSettingsPage from './pages/SystemSettingsPage';

import useUserStore from './store/userStore';
//  引入远程新页面
import RemoteDesktopPage from './pages/RemoteDesktopPage';

// Admin route protection
const AdminRoute = ({ children }) => {
  const { user } = useUserStore();
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  const { token } = useUserStore();

  return (
    <BrowserRouter>
      <Routes>
        {/* 公共路由 */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        
        {token ? (
          <>
            {/* 普通用户布局路由 */}
            <Route path="/" element={<DashboardLayout />}>
              <Route index element={<Navigate to="/create-project" />} />
              <Route path="create-project" element={<CreateProjectPage />} />
              <Route path="geometry" element={<GeometricModelingPage />} />
              <Route path="parts" element={<PartRetrievalPage />} />
              <Route path="design-optimization" element={<DesignOptimizationPage />} />
              <Route path="software-interface" element={<SoftwareInterfacePage />} />
              <Route path="dify-test" element={<DifyTestPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="tasks" element={<TaskContainerPage />} />
              <Route path="tasks/:taskId" element={<TaskDetailPage />} />
            </Route>
            
            {/* 管理员路由 */}
            <Route 
              path="/admin" 
              element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="users" element={<UserManagementPage />} />
              <Route path="tasks" element={<TaskManagementPage />} />
              <Route path="settings" element={<SystemSettingsPage />} />
            </Route>
            
            {/* --- 关键修改：把远程桌面放在这里，且在 * 号路由之前 --- */}
            <Route path="/remote-demo" element={<RemoteDesktopPage />} />

            {/* 兜底路由 (必须放在最后) */}
            <Route path="*" element={<Navigate to="/" />} />
          </>
        ) : (
          /* 未登录时的兜底路由 */
          <Route path="*" element={<Navigate to="/login" />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;