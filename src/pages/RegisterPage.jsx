import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useUserStore from '../store/userStore';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  validateUsername, 
  validatePassword, 
  validateEmail,
  calculatePasswordStrength,
  getPasswordStrengthInfo 
} from '../utils/validationRules';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, sendRegisterCode, error, clearError } = useUserStore();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    verificationCode: ''
  });
  const [loading, setLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeCountdown, setCodeCountdown] = useState(0);
  const [validationErrors, setValidationErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState('');

  useEffect(() => {
    if (codeCountdown <= 0) return;
    const timer = setTimeout(() => setCodeCountdown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [codeCountdown]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // 实时验证
    const errors = { ...validationErrors };
    
    if (name === 'username') {
      const usernameError = validateUsername(value);
      if (usernameError) {
        errors.username = usernameError;
      } else {
        delete errors.username;
      }
    }
    
    if (name === 'email') {
      const emailError = validateEmail(value);
      if (emailError && value.length > 0) {
        errors.email = emailError;
      } else {
        delete errors.email;
      }
    }
    
    if (name === 'password') {
      const passwordError = validatePassword(value);
      if (passwordError) {
        errors.password = passwordError;
      } else {
        delete errors.password;
      }
      setPasswordStrength(calculatePasswordStrength(value));
      
      // 检查密码确认匹配
      if (formData.confirmPassword && value !== formData.confirmPassword) {
        errors.confirmPassword = '两次输入的密码不匹配';
      } else {
        delete errors.confirmPassword;
      }
    }
    
    if (name === 'confirmPassword') {
      if (value !== formData.password) {
        errors.confirmPassword = '两次输入的密码不匹配';
      } else {
        delete errors.confirmPassword;
      }
    }

    if (name === 'verificationCode') {
      if (value && !/^\d{4,6}$/.test(value)) {
        errors.verificationCode = '验证码需为4-6位数字';
      } else {
        delete errors.verificationCode;
      }
    }
    
    setValidationErrors(errors);
    if (error) clearError();
  };

  const handleSendCode = async () => {
    const emailError = validateEmail(formData.email);
    if (emailError) {
      setValidationErrors((prev) => ({ ...prev, email: emailError }));
      return;
    }
    if (codeCountdown > 0) {
      return;
    }
    setCodeLoading(true);
    try {
      const res = await sendRegisterCode({ email: formData.email.toLowerCase() });
      const message = res?.message || '请求已发送。';
      alert(message);
      if (!message.toLowerCase().includes('disabled')) {
        setCodeCountdown(60);
      }
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        err.message ||
        '验证码发送失败，请稍后重试';
      alert(message);
    } finally {
      setCodeLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 前端验证
    const errors = {};
    const usernameError = validateUsername(formData.username);
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);
    
    if (usernameError) errors.username = usernameError;
    if (emailError) errors.email = emailError;
    if (passwordError) errors.password = passwordError;
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = '两次输入的密码不匹配';
    }
    if (formData.verificationCode && !/^\d{4,6}$/.test(formData.verificationCode)) {
      errors.verificationCode = '验证码需为4-6位数字';
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setLoading(true);
    setValidationErrors({});
    
    try {
      // 发送JSON格式数据
      const requestData = {
        username: formData.username.trim(),
        email: formData.email.toLowerCase(),
        password: formData.password,
        verification_code: formData.verificationCode.trim(),
      };

      await register(requestData);
      alert("注册成功！即将跳转到登录页面。");
      navigate('/login');
    } catch (err) {
      console.error('注册失败:', err);
      
      // 处理后端返回的详细错误
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        
        // 处理字段级错误
        if (detail.field) {
          setValidationErrors({ [detail.field]: detail.message });
        } 
        // 处理验证错误数组
        else if (Array.isArray(detail)) {
          const newErrors = {};
          detail.forEach(error => {
            const field = error.loc?.[error.loc.length - 1];
            if (field) {
              newErrors[field] = error.msg;
            }
          });
          setValidationErrors(newErrors);
        }
        // 处理普通错误消息
        else if (typeof detail === 'string') {
          alert(`注册失败: ${detail}`);
        } else if (detail.message) {
          alert(`注册失败: ${detail.message}`);
        }
      } else {
        alert(`注册失败: ${err.message || '未知错误'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const strengthInfo = getPasswordStrengthInfo(passwordStrength);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="flex w-full max-w-4xl shadow-lg rounded-lg overflow-hidden">
        {/* Left side: Form */}
        <div className="w-1/2 bg-white p-8">
          <h2 className="text-2xl font-bold mb-2 text-center">注册</h2>
          <p className="text-center text-gray-500 mb-6">创建你的新账户</p>

          <form onSubmit={handleSubmit}>
            {/* 用户名 */}
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="username">
                用户名 <span className="text-red-500">*</span>
              </label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="3-50个字符，支持字母/数字/下划线/中文"
                value={formData.username}
                onChange={handleChange}
                className={validationErrors.username ? 'border-red-500' : ''}
                required
              />
              {validationErrors.username && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.username}</p>
              )}
              <p className="text-gray-500 text-xs mt-1">
                不允许纯数字和保留名(admin, root等)
              </p>
            </div>

            {/* 邮箱 */}
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="email">
                邮箱 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  className={validationErrors.email ? 'border-red-500' : ''}
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendCode}
                  disabled={codeLoading || codeCountdown > 0}
                  className="whitespace-nowrap"
                >
                  {codeCountdown > 0 ? `重新发送(${codeCountdown}s)` : codeLoading ? '发送中...' : '获取验证码'}
                </Button>
              </div>
              {validationErrors.email && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>
              )}
            </div>
            
            {/* 验证码 */}
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="verificationCode">
                验证码
              </label>
              <Input
                id="verificationCode"
                name="verificationCode"
                type="text"
                placeholder="输入邮箱收到的4-6位数字验证码"
                value={formData.verificationCode}
                onChange={handleChange}
                className={validationErrors.verificationCode ? 'border-red-500' : ''}
              />
              {validationErrors.verificationCode && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.verificationCode}</p>
              )}
              <p className="text-gray-500 text-xs mt-1">
                如果未启用邮件功能，可留空直接注册。
              </p>
            </div>
            
            {/* 密码 */}
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="password">
                密码 <span className="text-red-500">*</span>
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="至少6个字符"
                value={formData.password}
                onChange={handleChange}
                className={validationErrors.password ? 'border-red-500' : ''}
                required
              />
              {validationErrors.password && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.password}</p>
              )}
              
              {/* 密码强度指示器 */}
              {formData.password && !validationErrors.password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${strengthInfo.color}`}
                        style={{ width: strengthInfo.width }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${strengthInfo.textColor}`}>
                      {strengthInfo.text}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs mt-1">
                    建议: 8位以上，包含大小写字母、数字和特殊字符
                  </p>
                </div>
              )}
            </div>

            {/* 确认密码 */}
            <div className="mb-6">
              <label className="block text-gray-700 mb-2" htmlFor="confirmPassword">
                确认密码 <span className="text-red-500">*</span>
              </label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="再次输入密码"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={validationErrors.confirmPassword ? 'border-red-500' : ''}
                required
              />
              {validationErrors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.confirmPassword}</p>
              )}
            </div>
            
            <Button 
              type="submit" 
              disabled={loading || Object.keys(validationErrors).length > 0} 
              className="w-full bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '注册中...' : '注册'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              已经有账户了？ 
              <Link to="/login" className="text-blue-600 hover:underline ml-1">
                登录
              </Link>
            </p>
          </div>
        </div>

        {/* Right side: Branding */}
        <div className="w-1/2 bg-blue-800 p-8 flex flex-col items-center justify-center text-white">
          <h1 className="text-5xl font-bold mb-4">CAutoD</h1>
          <p className="mb-6">AI-powered CAD Platform</p>
          <div className="flex items-center bg-blue-700 rounded-full p-1">
            <Button size="sm" className="bg-white text-blue-800 rounded-full">白天模式</Button>
            <Button size="sm" variant="ghost" className="rounded-full">夜间模式</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
