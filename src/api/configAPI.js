import { get } from "./index";

/**
 * 获取 Dify 聊天配置
 * 功能描述：从后端获取 Dify 聊天嵌入的配置信息（token 和 baseUrl）
 * 返回参数：{ token, baseUrl }
 * url地址：/dify-chat-config
 * 请求方式：GET
 */
export const getDifyChatConfigAPI = () => {
  return get("/dify-chat-config");
};

