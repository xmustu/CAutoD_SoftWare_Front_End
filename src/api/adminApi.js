/**
 * 管理员相关的 API 服务
 * 封装所有管理员操作的 HTTP 请求
 */
import axiosInstance from './index';

// ============================================
// 系统统计相关 API
// ============================================

/**
 * 获取系统统计概览
 */
export const getSystemStats = async () => {
  const response = await axiosInstance.get('/admin/stats/overview');
  return response;
};

/**
 * 获取用户统计数据
 * @param {number} limit - 返回数量限制
 */
export const getUserStats = async (limit = 10) => {
  const response = await axiosInstance.get('/admin/stats/users', { params: { limit } });
  return response;
};

/**
 * 获取任务类型统计
 */
export const getTaskTypeStats = async () => {
  const response = await axiosInstance.get('/admin/stats/tasks/types');
  return response;
};

/**
 * 获取每日统计数据
 * @param {number} days - 统计天数
 */
export const getDailyStats = async (days = 7) => {
  const response = await axiosInstance.get('/admin/stats/daily', { params: { days } });
  return response;
};

// ============================================
// 用户管理相关 API
// ============================================

/**
 * 获取用户列表（分页）
 * @param {Object} params - 查询参数
 */
export const getUserList = async (params) => {
  const response = await axiosInstance.get('/admin/users', { params });
  return response;
};

/**
 * 获取用户详细信息
 * @param {number} userId - 用户ID
 */
export const getUserDetail = async (userId) => {
  const response = await axiosInstance.get(`/admin/users/${userId}`);
  return response;
};

/**
 * 创建新用户
 * @param {Object} userData - 用户数据
 */
export const createUser = async (userData) => {
  const response = await axiosInstance.post('/admin/users', userData);
  return response;
};

/**
 * 更新用户信息
 * @param {number} userId - 用户ID
 * @param {Object} userData - 用户数据
 */
export const updateUser = async (userId, userData) => {
  const response = await axiosInstance.put(`/admin/users/${userId}`, userData);
  return response;
};

/**
 * 删除用户
 * @param {number} userId - 用户ID
 */
export const deleteUser = async (userId) => {
  const response = await axiosInstance.delete(`/admin/users/${userId}`);
  return response;
};

/**
 * 批量删除用户
 * @param {Array<number>} userIds - 用户ID数组
 */
export const batchDeleteUsers = async (userIds) => {
  const response = await axiosInstance.post('/admin/users/batch-delete', { user_ids: userIds });
  return response;
};

// ============================================
// 任务管理相关 API
// ============================================

/**
 * 获取任务列表（分页）
 * @param {Object} params - 查询参数
 */
export const getTaskList = async (params) => {
  const response = await axiosInstance.get('/admin/tasks', { params });
  return response;
};

/**
 * 获取任务详细信息
 * @param {number} taskId - 任务ID
 */
export const getTaskDetail = async (taskId) => {
  const response = await axiosInstance.get(`/admin/tasks/${taskId}`);
  return response;
};

/**
 * 更新任务状态
 * @param {number} taskId - 任务ID
 * @param {Object} taskData - 任务数据
 */
export const updateTask = async (taskId, taskData) => {
  const response = await axiosInstance.put(`/admin/tasks/${taskId}`, taskData);
  return response;
};

/**
 * 删除任务
 * @param {number} taskId - 任务ID
 */
export const deleteTask = async (taskId) => {
  const response = await axiosInstance.delete(`/admin/tasks/${taskId}`);
  return response;
};

/**
 * 批量删除任务
 * @param {Array<number>} taskIds - 任务ID数组
 */
export const batchDeleteTasks = async (taskIds) => {
  const response = await axiosInstance.post('/admin/tasks/batch-delete', { task_ids: taskIds });
  return response;
};

// ============================================
// 系统配置相关 API
// ============================================

/**
 * 获取系统配置
 */
export const getSystemConfig = async () => {
  const response = await axiosInstance.get('/admin/config');
  return response;
};

/**
 * 更新系统配置
 * @param {Object} config - 系统配置
 */
export const updateSystemConfig = async (config) => {
  const response = await axiosInstance.post('/admin/config', config);
  return response;
};

export default {
  // 统计
  getSystemStats,
  getUserStats,
  getTaskTypeStats,
  getDailyStats,
  
  // 用户管理
  getUserList,
  getUserDetail,
  createUser,
  updateUser,
  deleteUser,
  batchDeleteUsers,
  
  // 任务管理
  getTaskList,
  getTaskDetail,
  updateTask,
  deleteTask,
  batchDeleteTasks,
  
  // 系统配置
  getSystemConfig,
  updateSystemConfig,
};
