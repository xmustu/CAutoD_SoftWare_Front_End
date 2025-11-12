import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import useUserStore from "../store/userStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { validateEmail, validatePassword } from "../utils/validationRules";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetEmail = searchParams.get("email") || "";
  const presetCode = searchParams.get("code") || "";

  const { resetPasswordWithCode, error, clearError } = useUserStore();

  const [formData, setFormData] = useState({
    email: presetEmail,
    verificationCode: presetCode,
    newPassword: "",
    confirmPassword: "",
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      email: presetEmail,
      verificationCode: presetCode,
    }));
  }, [presetEmail, presetCode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (error) clearError();

    setValidationErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = {};
    const emailError = validateEmail(formData.email);
    if (emailError) errors.email = emailError;

    if (!formData.verificationCode || !/^\d{4,6}$/.test(formData.verificationCode)) {
      errors.verificationCode = "请输入4-6位数字验证码";
    }

    const passwordError = validatePassword(formData.newPassword);
    if (passwordError) errors.newPassword = passwordError;
    if (formData.newPassword !== formData.confirmPassword) {
      errors.confirmPassword = "两次输入的密码不一致";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setLoading(true);
    try {
      await resetPasswordWithCode({
        email: formData.email.toLowerCase(),
        verification_code: formData.verificationCode.trim(),
        new_password: formData.newPassword,
      });
      alert("密码重置成功，请使用新密码登录。");
      navigate("/login");
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        err.message ||
        "密码重置失败，请稍后重试。";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white p-8 shadow-lg rounded-lg">
        <h2 className="text-2xl font-bold mb-4 text-center">重置密码</h2>
        <p className="text-center text-gray-500 mb-6">
          输入邮箱、验证码与新密码，完成密码重置。
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="email">
              邮箱 <span className="text-red-500">*</span>
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={handleChange}
              className={validationErrors.email ? "border-red-500" : ""}
              required
            />
            {validationErrors.email && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="verificationCode">
              验证码 <span className="text-red-500">*</span>
            </label>
            <Input
              id="verificationCode"
              name="verificationCode"
              type="text"
              autoComplete="one-time-code"
              placeholder="输入邮箱收到的4-6位验证码"
              value={formData.verificationCode}
              onChange={handleChange}
              className={validationErrors.verificationCode ? "border-red-500" : ""}
              required
            />
            {validationErrors.verificationCode && (
              <p className="text-red-500 text-sm mt-1">
                {validationErrors.verificationCode}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="newPassword">
              新密码 <span className="text-red-500">*</span>
            </label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              placeholder="至少6个字符"
              value={formData.newPassword}
              onChange={handleChange}
              className={validationErrors.newPassword ? "border-red-500" : ""}
              required
            />
            {validationErrors.newPassword && (
              <p className="text-red-500 text-sm mt-1">
                {validationErrors.newPassword}
              </p>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 mb-2" htmlFor="confirmPassword">
              确认新密码 <span className="text-red-500">*</span>
            </label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="再次输入新密码"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={validationErrors.confirmPassword ? "border-red-500" : ""}
              required
            />
            {validationErrors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">
                {validationErrors.confirmPassword}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white hover:bg-green-700"
          >
            {loading ? "提交中..." : "重置密码"}
          </Button>
        </form>

        <div className="mt-6 flex justify-between text-sm text-gray-600">
          <Link to="/forgot-password" className="text-blue-600 hover:underline">
            返回验证码获取
          </Link>
          <Link to="/login" className="text-blue-600 hover:underline">
            返回登录
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;

