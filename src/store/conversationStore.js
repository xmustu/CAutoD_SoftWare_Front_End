import { create } from "zustand";
import { getConversationsAPI } from "../api/dashboardAPI";
import { createTaskAPI } from "../api/taskAPI";
import {
  createConversationAPI,
  deleteConversationAPI,
  getHistoryAPI,
  getTaskHistoryAPI,
} from "../api/conversationAPI";

const useConversationStore = create((set, get) => ({
  conversations: [],
  tasks: [], // 用于存储任务历史列表
  messages: [], // 用于存储当前激活任务的消息
  activeConversationId: null,
  activeTaskId: null,
  isLoading: false,
  isLoadingTasks: false, // 用于任务列表加载状态
  isLoadingMessages: false, // 用于消息加载状态
  error: null,
  isPolling: false, // 新增：轮询状态
  pollingIntervalId: null, // 新增：轮询定时器ID

  stopPolling: () => {
    const intervalId = get().pollingIntervalId;
    if (intervalId) {
      clearInterval(intervalId);
      set({ isPolling: false, pollingIntervalId: null });
    }
  },

  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        // 为每条消息添加一个唯一的ID，用于React的key
        { ...message, id: `msg-${Date.now()}-${Math.random()}` },
      ],
    })),

  // --- 最终重构：使用函数式 set 保证状态更新的原子性 ---
  updateLastAiMessage: (update) => {
    console.log("🔄 Store.updateLastAiMessage 被调用, update:", update);
    
    set((state) => {
      const lastMessage = state.messages[state.messages.length - 1];

      console.log("🔄 消息列表长度:", state.messages.length);
      console.log("🔄 最后一条消息:", lastMessage);

      if (state.messages.length === 0 || lastMessage.role !== "assistant") {
        console.warn("⚠️ 没有 assistant 消息，跳过更新");
        return state;
      }

      const newMessages = state.messages.map((msg, index) => {
        // 只修改最后一条消息
        if (index !== state.messages.length - 1) {
          return msg;
        }

        let updatedMessage = { ...msg };
       // 初始化元数据，确保不是 null
        updatedMessage.metadata = updatedMessage.metadata || {};
        // 1. 处理文本块
        if (update.textChunk !== undefined) {
          // 💥 添加日志：确认更新是否被触发
            console.log("✅ Store: 合并文本块:", update.textChunk);
            console.log("📝 更新前的 content:", updatedMessage.content);
          updatedMessage.content =
            (updatedMessage.content || "") + update.textChunk;
            console.log("📝 更新后的 content:", updatedMessage.content);
        }
        // 💥 【新增/修改】处理流中传输的独立元数据（用于实时进度）
        if (update.metadata !== undefined) {
            updatedMessage.metadata = { 
                ...updatedMessage.metadata, 
                ...update.metadata 
            };
            console.log("Store: Metadata updated (Progress/Info)", updatedMessage.metadata);
        }
        // 2. 处理图片块
        if (update.image !== undefined) {
          const newImagePart = { type: "image", ...update.image };
          updatedMessage.parts = [
            ...(updatedMessage.parts || []),
            newImagePart,
          ];
        }

        // 新增：处理零件块
        if (update.part !== undefined) {
          // 确保我们提取的是真正的 part 数据，而不是整个 SSE 事件对象
          const actualPartData = update.part.part || update.part; // 如果是 { part: {...} } 结构，则取 part 属性，否则直接使用
          const newPart = { type: "part", ...actualPartData };
          updatedMessage.parts = [...(updatedMessage.parts || []), newPart];
        }

       // 3. 处理结束信号 (修改 metadata 的处理逻辑)
        if (update.finalData !== undefined) {
          console.log("conversationStore: Final Metadata Content:", update.finalData.metadata); // 👈 打印这一行
          console.log(
            "conversationStore: Updating with finalData:",
            update.finalData
          );
          updatedMessage.content = update.finalData.answer;
          
            // 💥 【关键修改】合并 finalData 中的元数据
          updatedMessage.metadata = { 
                ...updatedMessage.metadata, // 保留之前的进度信息
                ...update.finalData.metadata // 覆盖/新增最终结果文件信息
            };
          if (update.finalData.suggested_questions) {
            updatedMessage.suggested_questions =
              update.finalData.suggested_questions;
            console.log(
              "conversationStore: Successfully updated suggested_questions:",
              updatedMessage.suggested_questions
            );
          } else {
            console.log(
              "conversationStore: No suggested_questions in finalData."
            );
          }
        }

        return updatedMessage;
      });

      return { messages: newMessages };
    });
  },

  setActiveConversationId: (conversationId) => {
    set({ activeConversationId: conversationId, activeTaskId: null }); // 切换对话时清空任务
  },

  setActiveTaskId: (taskId) => set({ activeTaskId: taskId }),

  startNewConversation: () =>
    set({
      activeConversationId: null,
      activeTaskId: null,
      messages: [],
    }),

  ensureConversation: async (title = "新对话") => {
    let activeId = get().activeConversationId;
    if (activeId) {
      return activeId;
    }

    // 1. 前端生成临时ID
    const tempId = `temp-${Date.now()}`;

    try {
      // 2. 调用API创建新对话
      const newConversation = await createConversationAPI({
        title: title,
        conversation_id: tempId,
      });

      // 3. 使用后端返回的数据更新store
      set((state) => ({
        conversations: [newConversation, ...state.conversations],
        activeConversationId: newConversation.conversation_id,
      }));

      return newConversation.conversation_id;
    } catch (error) {
      console.error("Failed to ensure conversation:", error);
      // 在这里可以设置一个错误状态来通知UI
      return null;
    }
  },

  createTask: async (taskData) => {
    try {
      const newTask = await createTaskAPI(taskData);
      set((state) => ({
        tasks: {
          ...state.tasks,
          [taskData.conversation_id]: [
            ...(state.tasks[taskData.conversation_id] || []),
            newTask,
          ],
        },
        activeTaskId: newTask.task_id,
      }));
      return newTask;
    } catch (error) {
      console.error(
        "Failed to create task in store:",
        error.response ? error.response.data : error
      );
      set({ error: error.response ? error.response.data : error.message });
      return null; // 明确返回 null 表示失败
    }
  },

  fetchConversations: async (userId) => {
    if (!userId) return;
    set({ isLoading: true, error: null });
    try {
      const conversations = await getConversationsAPI(userId);
      set({ conversations: conversations || [], isLoading: false });
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      set({ error, isLoading: false });
    }
  },

  // 用于在创建新对话后刷新列表
  addConversation: (newConversation) => {
    set((state) => ({
      conversations: [newConversation, ...state.conversations],
    }));
  },

  fetchTasks: async (userId) => {
    if (!userId) return;
    set({ isLoadingTasks: true, error: null });
    try {
      const response = await getHistoryAPI(userId);
      // 假设后端返回的数据结构是 { history: [...] }
      set({ tasks: response.history || [], isLoadingTasks: false });
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      set({ error, isLoadingTasks: false });
    }
  },

  fetchMessagesForTask: async (taskId, conversationId) => {
    if (!taskId) return;

    // 1. 停止任何可能正在进行的轮询
    get().stopPolling();
    set({ isLoadingMessages: true, error: null });

    const fetchAndUpdate = async () => {
      try {
        const response = await getTaskHistoryAPI(taskId);
        const messages = response.message || [];

        set({
          messages: messages,
          activeTaskId: taskId,
          activeConversationId: conversationId,
          isLoadingMessages: false, // 仅在第一次加载时设置为false
        });

        // 2. 检查是否需要启动轮询
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1];
          if (
            lastMessage.role === "assistant" &&
            lastMessage.status === "in_progress"
          ) {
            return true; // 返回 true 表示需要继续轮询
          }
        }
        return false; // 返回 false 表示不需要轮询
      } catch (error) {
        console.error(`Failed to fetch messages for task ${taskId}:`, error);
        set({ error, isLoadingMessages: false });
        get().stopPolling(); // 出错时停止轮询
        return false;
      }
    };

    const shouldStartPolling = await fetchAndUpdate();

    if (shouldStartPolling) {
      set({ isPolling: true });
      const intervalId = setInterval(async () => {
        const shouldContinue = await fetchAndUpdate();
        if (!shouldContinue) {
          get().stopPolling(); // 如果不再需要轮询，则停止
        }
      }, 2000); // 设置2秒的轮询间隔
      set({ pollingIntervalId: intervalId });
    }
  },

  removeTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.filter((task) => task.task_id !== taskId),
    })),

  updateTask: (taskId, updatedData) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.task_id === taskId ? { ...task, ...updatedData } : task
      ),
    })),

  deleteConversation: async (conversationId) => {
    try {
      await deleteConversationAPI(conversationId);
      set((state) => ({
        conversations: state.conversations.filter(
          (c) => c.conversation_id !== conversationId
        ),
      }));
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      // Optionally, set an error state to inform the user
      set({ error: "Failed to delete conversation." });
    }
  },
}));

export default useConversationStore;
