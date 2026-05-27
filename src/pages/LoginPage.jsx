import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useUserStore from '../store/userStore';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Box, Settings2, Code, Loader2 } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, error, clearError } = useUserStore();
  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (error) clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const data = new FormData();
      if (formData.identifier.includes('@')) {
        data.append('email', formData.identifier);
      } else {
        data.append('username', formData.identifier);
      }
      data.append('password', formData.password);
      
      await login(data);
      navigate('/create-project');
    } catch (err) {
      console.error('登录失败:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 p-4">
      <div className="flex w-full max-w-4xl shadow-2xl rounded-2xl overflow-hidden bg-white">
        {/* Left side: Form */}
        <div className="w-1/2 bg-white p-10 flex flex-col justify-center">
          <h2 className="text-3xl font-bold mb-2 text-gray-800">欢迎回来</h2>
          <p className="text-gray-500 mb-8">登录 CAutoD 智能 CAD 平台</p>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="identifier">
                用户名或邮箱 <span className="text-red-500">*</span>
              </label>
              <Input
                id="identifier"
                name="identifier"
                type="text"
                placeholder="输入您的用户名或邮箱"
                value={formData.identifier}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 mb-2" htmlFor="password">
                密码 <span className="text-red-500">*</span>
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Min. 8 characters"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Checkbox id="remember-me" />
                <label htmlFor="remember-me" className="ml-2 text-sm text-gray-600">
                  保持登录
                </label>
              </div>
              <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
                忘记密码？
              </Link>
            </div>
            
            <Button type="submit" disabled={loading} className="w-full bg-blue-600 text-white hover:bg-blue-700 transition-colors h-11 text-base font-medium">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  登录中...
                </>
              ) : '登录'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              还未注册？ 
              <Link to="/register" className="text-blue-600 hover:underline ml-1">
                注册一个账号
              </Link>
            </p>
          </div>
        </div>

        {/* Right side: Branding */}
        <div className="w-1/2 bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 p-10 flex flex-col justify-center text-white relative overflow-hidden">
          {/* 装饰光晕 */}
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-blue-400/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-indigo-400/20 rounded-full blur-3xl" />

          <div className="relative">
            <h1 className="text-5xl font-bold mb-2 tracking-tight">CAutoD</h1>
            <p className="text-blue-200 mb-10 text-lg">AI-powered CAD Platform</p>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm shrink-0">
                  <Box className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">自然语言建模</p>
                  <p className="text-sm text-blue-200/80">一句话生成参数化 3D 模型</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm shrink-0">
                  <Settings2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">多目标优化</p>
                  <p className="text-sm text-blue-200/80">遗传/启发式算法自动寻优</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm shrink-0">
                  <Code className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">CAD 智能操控</p>
                  <p className="text-sm text-blue-200/80">AI 辅助驱动主流 CAD 软件</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
