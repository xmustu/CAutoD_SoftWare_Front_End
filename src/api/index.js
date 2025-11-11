import axios from "axios";

// 创建axios实例
const instance = axios.create({
  baseURL: process.env.VITE_API_URL,
  timeout: 60000, // 请求超时时间
});

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
instance.interceptors.response.use(
  (response) => {
    // 如果请求的 responseType 是 'blob'，并且状态码是 2xx，则直接返回整个响应对象
    // 这样调用方可以访问到 response.data (Blob) 和 response.headers (如 Content-Disposition)
    if (
      (response.config.responseType === "blob" ||
        response.config.responseType === "arraybuffer") &&
      response.status >= 200 &&
      response.status < 300
    ) {
      return response;
    }
    // 否则，返回响应数据
    return response.data;
  },
  (error) => {
    // 对响应错误做点什么
    console.error("API请求错误:", error);
    // 对于非 Blob 响应的错误，直接拒绝 Promise
    // 对于 Blob 响应的错误，如果需要处理错误信息，可能需要从 error.response.data 中读取
    // 但通常对于下载失败，直接抛出错误即可
    return Promise.reject(error);
  }
);

// 封装请求方法
export const get = (url, config) => instance.get(url, config);
export const post = (url, data, config) => instance.post(url, data, config);
export const put = (url, data) => instance.put(url, data);
export const del = (url) => instance.delete(url);

/**
 * 封装 SSE 请求
 * @param {string} url - 请求地址
 * @param {object} options - 包含回调函数的对象
 * @param {object} options.requestData - 发送给后端的数据
 * @param {function} options.onOpen - 连接打开时的回调
 * @param {function} options.onMessage - 收到消息时的回调
 * @param {function} options.onError - 发生错误时的回调
 * @param {function} options.onClose - 连接关闭时的回调
 */
export const sse = (
  url,
  { requestData, onOpen, onMessage, onError, onClose }
) => {
  const controller = new AbortController();
  const signal = controller.signal;

  const start = async () => {
    try {
      const response = await fetch(`${process.env.VITE_API_URL}${url}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(requestData),
        signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (onOpen) onOpen();

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

const processText = (text) => {
        buffer += text;
        let boundary = buffer.indexOf("\n\n");

        while (boundary !== -1) {
          const chunk = buffer.substring(0, boundary).trim(); //  改进 1: trim() 移除前后空白

          //  改进 2: 移除已处理的块
          buffer = buffer.substring(boundary + 2); 

          //  改进 3: 检查是否是空块或注释块。如果为空，直接跳过处理。
          if (chunk.length === 0 || chunk.startsWith(':')) { 
            boundary = buffer.indexOf("\n\n");
            continue; // 跳到下一个循环迭代
          }

          let eventName = "message";
          let data = "";
          let isCompleteMessage = true; // 标记是否为完整 SSE 消息

          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("event:")) {
              eventName = line.substring(6).trim();
            } else if (line.startsWith("data:")) {
              //  改进 4: 累加 data 行，因为 data 可能跨多行
              data += line.substring(5).trim();
            } else if (line.trim().length > 0) {
              //  改进 5: 捕获非 event/data 的文本，可能是后端调试信息
              console.warn("SSE 接收到非标准行:", line);
              isCompleteMessage = false; // 标记此块包含无效内容
            }
          }

          //  改进 6: 仅在解析为一个完整的 SSE 消息时才调用 onMessage
          if (isCompleteMessage && eventName && onMessage && onMessage[eventName]) {
            try {
              const parsedData = JSON.parse(data);
              
              // 💥 添加详细日志
              console.log("📡 SSE 解析成功:");
              console.log("  - eventName:", eventName);
              console.log("  - parsedData:", parsedData);
              
              // 智能提取逻辑保持不变
              const eventPayload =
                parsedData[eventName] !== undefined
                  ? parsedData[eventName]
                  : parsedData;
              
              console.log("  - eventPayload:", eventPayload);
              console.log("  - 调用回调: onMessage[" + eventName + "]");
              
              onMessage[eventName](eventPayload);
            } catch (e) {
              console.error(
                `Failed to parse SSE JSON data for event ${eventName}:`,
                e, data
              );
              // 仅在 JSON 解析失败时传递原始数据，如果 isCompleteMessage=false，则不传递
              onMessage[eventName](data);
            }
          }
          boundary = buffer.indexOf("\n\n");
        }
      };      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (onClose) onClose();
          break;
        }
        const text = decoder.decode(value, { stream: true });
        processText(text);
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        if (onError) onError(error);
      }
    }
  };

  start();

  return {
    close: () => {
      controller.abort();
    },
  };
};

export default instance;
