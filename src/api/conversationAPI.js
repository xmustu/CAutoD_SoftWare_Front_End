import { get, post, del } from "./index";
import useUserStore from "../store/userStore";

/**
 * 创建一个新的会话
 * @param {object} conversationData - 包含会话信息的对象
 * @param {string} conversationData.title - 会话的标题
 * @param {string} conversationData.conversation_id - 前端生成的临时或已有的ID
 * @returns {Promise<object>} - 返回创建的会话对象
 */
export const createConversationAPI = (conversationData) => {
  // user_id 和 token 会由 axios 拦截器自动处理
  // 后端 `ConversationCreateRequest` 模型只期望 `title`
  const requestBody = {
    title: conversationData.title,
  };

  // 调用 /geometry/conversation 接口，发送 JSON 数据
  return post("/geometry/conversation", requestBody);
};

/**
 * 获取单个会话的详细信息，包括其下的所有任务
 * @param {string} conversation_id - 会话的ID
 * @returns {Promise<object>} - 返回会话对象，其中应包含任务列表
 */
export const getConversationDetailsAPI = (conversation_id) => {
  const token = localStorage.getItem("token");
  const formData = new FormData();
  // 后端需要 'authorization' 作为表单字段
  formData.append("authorization", `Bearer ${token}`);

  // 注意: 后端路由已修正为 /conversation/
  return post(`/conversation/${conversation_id}`, formData);
};

/**
 * 获取指定用户的所有对话历史记录
 * @param {string} userId - 用户的ID
 * @returns {Promise<object>} - 返回包含历史记录的数组
 */
export const getHistoryAPI = (userId) => {
  // 后端接口需要 user_id 作为查询参数
  return get(`/chat/history?user_id=${userId}`);
};

/**
 * 获取指定任务的完整对话历史
 * @param {string} taskId - 任务的ID
 * @returns {Promise<object>} - 返回包含消息历史的对象
 */
export const getTaskHistoryAPI = (taskId) => {
  // 后端接口需要 task_id 作为查询参数
  return get(`/chat/task?task_id=${taskId}`);
};

/**
 * 删除指定任务及其所有对话消息
 * @param {string} taskId - 任务的ID
 * @returns {Promise<object>}
 */
export const deleteTaskAndMessagesAPI = (taskId) => {
  return del(`/chat/message/${taskId}`);
};

/**
 * 仅删除指定任务的对话历史
 * @param {string} taskId - 任务的ID
 * @returns {Promise<object>}
 */
export const deleteHistoryAPI = (taskId) => {
  return del(`/chat/history/${taskId}`);
};

/**
 * 删除指定的会话
 * @param {string} conversationId - 会话的ID
 * @returns {Promise<object>}
 */
export const deleteConversationAPI = (conversationId) => {
  return del(`/conversation/${conversationId}`);
};

/**
 * 建立 SSE 监听，用于接收后端优化/对话任务的实时推送
 * @param {string} taskId - 任务ID
 * @param {function} onMessage - 处理后端推送数据的回调函数
 * @returns {EventSource} - SSE 连接实例
 */
// export const listenOptimizationSSE = (taskId, onMessage, onQueueUpdate) => {
//   const token = localStorage.getItem("token");
//   const url = `${import.meta.env.VITE_API_URL}/tasks/optimize/progress/${taskId}?token=${token}`;
//   const eventSource = new EventSource(url);

//   eventSource.onmessage = (event) => {
//     try {
//       // 解析正常 SSE 数据
//       const data = JSON.parse(event.data);
//       onMessage(data);

//       // 如果消息中含有队列信息，则提取
//       if (typeof data.text === "string" && data.text.includes("Position:")) {
//         const match = data.text.match(/Position:\s*(\d+)/);
//         if (match) {
//           const position = parseInt(match[1], 10);
//           onQueueUpdate?.(position);
//         }
//       }
//     } catch (err) {
//       // 捕获非JSON格式（如 text_chunk）并尝试提取队列信息
//       if (event.data.includes("Position:")) {
//         const match = event.data.match(/Position:\s*(\d+)/);
//         if (match) {
//           const position = parseInt(match[1], 10);
//           onQueueUpdate?.(position);
//         }
//       } else {
//         console.warn("SSE 数据解析失败:", err);
//       }
//     }
//   };

//   eventSource.onerror = (err) => {
//     console.error("SSE 连接出错:", err);
//     eventSource.close();
//   };

//   return eventSource;
// };

// // 获取任务队列位置
// export async function getOptimizationQueue() {
//   const res = await fetch(`${import.meta.env.VITE_API_URL}/tasks/pending`);
//   if (!res.ok) throw new Error("获取队列失败");
//   const data = await res.json();
//   console.log("获取队列结果:", data);
//   return data; // 返回数组
// }


