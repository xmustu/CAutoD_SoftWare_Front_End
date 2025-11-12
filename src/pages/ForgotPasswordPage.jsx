import { useState } from "react";
import { Link } from "react-router-dom";
import useUserStore from "../store/userStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { validateEmail } from "../utils/validationRules";

const ForgotPasswordPage = () => {
  const { sendPasswordResetCode, error, clearError } = useUserStore();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailError = validateEmail(email);
    if (emailError) {
      setValidationError(emailError);
      return;
    }
    setValidationError("");
    setLoading(true);
    if (error) clearError();
    try {
      const res = await sendPasswordResetCode({ email: email.toLowerCase() });
      const message =
        res?.message || "如果邮箱存在，重置验证码已发送，请检查邮箱。";
      alert(message);
      setCodeSent(true);
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        err.message ||
        "验证码发送失败，请稍后重试。";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white p-8 shadow-lg rounded-lg">
        <h2 className="text-2xl font-bold mb-4 text-center">忘记密码</h2>
        <p className="text-center text-gray-500 mb-6">
          输入您的注册邮箱，我们会发送验证码帮助您重置密码。
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
              placeholder="your@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (validationError) setValidationError("");
                if (error) clearError();
              }}
              className={validationError ? "border-red-500" : ""}
              required
            />
            {validationError && (
              <p className="text-red-500 text-sm mt-1">{validationError}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white hover:bg-blue-700"
          >
            {loading ? "发送中..." : "发送验证码"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            想起密码了？{" "}
            <Link to="/login" className="text-blue-600 hover:underline ml-1">
              返回登录
            </Link>
          </p>
        </div>

        {codeSent && (
          <div className="mt-4 text-center text-sm text-green-600">
            验证码已发送，请查收邮箱。
            <div className="mt-2">
              <Link
                to={`/reset-password?email=${encodeURIComponent(
                  email.toLowerCase()
                )}`}
                className="text-blue-600 hover:underline"
              >
                已收到验证码？前往重置密码
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;

