import { post, get } from "./index";

/**
 * 用户登录
 * 功能描述：使用邮箱和密码进行用户登录
 * 入参：FormData a new FormData object with email and password
 * 返回参数：{ status, access_token }
 * url地址：/user/login
 * 请求方式：POST
 */
export const loginAPI = (data) => {
  return post("/user/login", data);
};

/**
 * 用户注册
 * 功能描述：创建新用户
 * 入参：{ username, email, password } - JSON格式
 * 返回参数：{ status, user_id, email }
 * url地址：/user/register
 * 请求方式：POST
 * 
 * 验证规则:
 * - 用户名: 3-50字符, 支持字母/数字/下划线/中文, 不允许纯数字和保留名
 * - 邮箱: 标准邮箱格式验证
 * - 密码: 6-128字符
 */
export const registerAPI = (data) => {
  return post("/user/register", data);
};

/**
 * 发送注册验证码
 * 功能描述：向用户邮箱发送注册验证码
 * 入参：{ email }
 * 返回参数：{ message }
 * url地址：/user/register/email/send-code
 * 请求方式：POST
 */
export const sendRegisterCodeAPI = (data) => {
  return post("/user/register/email/send-code", data);
};

/**
 * 带验证码注册用户
 * 功能描述：使用邮箱验证码创建新用户
 * 入参：{ username, email, password, verification_code }
 * 返回参数：{ message }
 * url地址：/user/register/email
 * 请求方式：POST
 */
export const registerWithCodeAPI = (data) => {
  return post("/user/register/email", data);
};

/**
 * Google登录
 * 功能描述：使用Google进行用户登录
 * 入参：{ token }
 * 返回参数：用户信息和token
 * url地址：/auth/google
 * 请求方式：POST
 */
export const googleLoginAPI = (data) => {
  return post("/auth/google", data);
};

/**
 * 获取当前用户信息
 * 功能描述：获取当前登录用户的详细信息
 * 入参：无 (token通过拦截器发送)
 * 返回参数：{ user_id, email, created_at }
 * url地址：/user/me
 * 请求方式：GET
 */
export const getProfileAPI = () => {
  return get("/user/me");
};
