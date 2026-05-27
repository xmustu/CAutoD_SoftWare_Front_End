import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * 全局错误边界
 * 捕获子树渲染异常，避免整页白屏，演示场景至少能回到上一步
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-50 rounded-full mb-5">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-2">页面遇到了一点问题</h1>
          <p className="text-gray-500 mb-6">
            别担心，您的数据是安全的。可以尝试刷新页面或回到首页继续操作。
          </p>

          {import.meta.env.DEV && this.state.error && (
            <details className="text-left mb-6 bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
              <summary className="cursor-pointer font-medium text-gray-700">
                调试信息 (仅开发环境可见)
              </summary>
              <pre className="mt-2 whitespace-pre-wrap break-all">
                {this.state.error.toString()}
              </pre>
            </details>
          )}

          <div className="flex gap-3 justify-center">
            <Button onClick={this.handleReload} className="bg-blue-600 hover:bg-blue-700 text-white">
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新页面
            </Button>
            <Button onClick={this.handleGoHome} variant="outline">
              <Home className="h-4 w-4 mr-2" />
              返回首页
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
