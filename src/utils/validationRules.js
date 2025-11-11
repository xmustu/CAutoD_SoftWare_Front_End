/**
 * 前端验证规则配置
 * 保持与后端验证规则一致
 */

export const VALIDATION_RULES = {
  username: {
    minLength: 3,
    maxLength: 50,
    pattern: /^[\w\u4e00-\u9fa5]+$/,
    reserved: ['admin', 'root', 'system', 'test', 'guest', 'administrator'],
  },
  password: {
    minLength: 6,
    maxLength: 128,
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  }
};

/**
 * 验证用户名
 * @param {string} username - 用户名
 * @returns {string} 错误消息，如果验证通过则返回空字符串
 */
export const validateUsername = (username) => {
  const trimmed = username.trim();
  
  if (trimmed.length === 0) return '';
  if (trimmed.length < VALIDATION_RULES.username.minLength) {
    return `用户名至少需要${VALIDATION_RULES.username.minLength}个字符`;
  }
  if (trimmed.length > VALIDATION_RULES.username.maxLength) {
    return `用户名不能超过${VALIDATION_RULES.username.maxLength}个字符`;
  }
  if (!VALIDATION_RULES.username.pattern.test(trimmed)) {
    return '用户名只能包含字母、数字、下划线和中文字符';
  }
  if (/^\d+$/.test(trimmed)) {
    return '用户名不能为纯数字';
  }
  if (VALIDATION_RULES.username.reserved.includes(trimmed.toLowerCase())) {
    return '该用户名为保留名称，无法使用';
  }
  
  return '';
};

/**
 * 验证密码
 * @param {string} password - 密码
 * @returns {string} 错误消息，如果验证通过则返回空字符串
 */
export const validatePassword = (password) => {
  if (password.length === 0) return '';
  if (password.length < VALIDATION_RULES.password.minLength) {
    return `密码至少需要${VALIDATION_RULES.password.minLength}个字符`;
  }
  if (password.length > VALIDATION_RULES.password.maxLength) {
    return `密码不能超过${VALIDATION_RULES.password.maxLength}个字符`;
  }
  return '';
};

/**
 * 验证邮箱
 * @param {string} email - 邮箱
 * @returns {string} 错误消息，如果验证通过则返回空字符串
 */
export const validateEmail = (email) => {
  if (!email) return '请输入邮箱地址';
  if (!VALIDATION_RULES.email.pattern.test(email)) {
    return '请输入有效的邮箱地址';
  }
  return '';
};

/**
 * 计算密码强度
 * @param {string} password - 密码
 * @returns {string} 'weak' | 'medium' | 'strong' | ''
 */
export const calculatePasswordStrength = (password) => {
  if (password.length === 0) return '';
  if (password.length < VALIDATION_RULES.password.minLength) return 'weak';
  
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[!@#$%^&*()_+\-=\[\]{};:'",.<>?/\\|`~]/.test(password)) strength++;
  
  if (strength <= 2) return 'weak';
  if (strength <= 3) return 'medium';
  return 'strong';
};

/**
 * 获取密码强度的显示信息
 * @param {string} strength - 密码强度
 * @returns {object} { color, text, width }
 */
export const getPasswordStrengthInfo = (strength) => {
  const info = {
    weak: { color: 'bg-red-500', textColor: 'text-red-500', text: '弱', width: '33%' },
    medium: { color: 'bg-yellow-500', textColor: 'text-yellow-500', text: '中等', width: '66%' },
    strong: { color: 'bg-green-500', textColor: 'text-green-500', text: '强', width: '100%' },
  };
  
  return info[strength] || { color: 'bg-gray-300', textColor: 'text-gray-500', text: '', width: '0%' };
};
