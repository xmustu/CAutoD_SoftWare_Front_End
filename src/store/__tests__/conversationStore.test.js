import { beforeEach, describe, expect, it, vi } from 'vitest';
import useConversationStore from '../conversationStore';
import { getTaskHistoryAPI } from '../../api/conversationAPI';
import { createTaskAPI } from '../../api/taskAPI';

vi.mock('../../api/dashboardAPI', () => ({
  getConversationsAPI: vi.fn(),
}));

vi.mock('../../api/taskAPI', () => ({
  createTaskAPI: vi.fn(),
}));

vi.mock('../../api/conversationAPI', () => ({
  createConversationAPI: vi.fn(),
  deleteConversationAPI: vi.fn(),
  getHistoryAPI: vi.fn(),
  getTaskHistoryAPI: vi.fn(),
}));

const resetStore = () => {
  useConversationStore.getState().stopPolling();
  useConversationStore.setState({
    conversations: [],
    tasks: [],
    messages: [],
    activeConversationId: null,
    activeTaskId: null,
    isLoading: false,
    isLoadingTasks: false,
    isLoadingMessages: false,
    error: null,
    isPolling: false,
    pollingIntervalId: null,
    messageContextVersion: 0,
  });
};

const createDeferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('conversationStore task message context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
  });

  it('ignores stale task history after starting a new conversation', async () => {
    const oldHistory = createDeferred();
    getTaskHistoryAPI.mockReturnValueOnce(oldHistory.promise);

    const loadPromise = useConversationStore.getState().fetchMessagesForTask(101, 'conv-old');

    expect(useConversationStore.getState().activeTaskId).toBe(101);
    expect(useConversationStore.getState().isLoadingMessages).toBe(true);

    useConversationStore.getState().startNewConversation();
    oldHistory.resolve({
      items: [{ id: 'old-ai', role: 'assistant', content: 'old task came back' }],
    });
    await loadPromise;

    expect(useConversationStore.getState().activeTaskId).toBeNull();
    expect(useConversationStore.getState().activeConversationId).toBeNull();
    expect(useConversationStore.getState().messages).toEqual([]);
    expect(useConversationStore.getState().isLoadingMessages).toBe(false);
  });

  it('loads history when the requested task is still the active context', async () => {
    getTaskHistoryAPI.mockResolvedValueOnce({
      items: [{ id: 'history-ai', role: 'assistant', content: 'restored task' }],
    });

    await useConversationStore.getState().fetchMessagesForTask(202, 'conv-history');

    expect(useConversationStore.getState().activeTaskId).toBe(202);
    expect(useConversationStore.getState().activeConversationId).toBe('conv-history');
    expect(useConversationStore.getState().messages).toEqual([
      { id: 'history-ai', role: 'assistant', content: 'restored task' },
    ]);
    expect(useConversationStore.getState().isLoadingMessages).toBe(false);
  });

  it('clears stale task messages when switching conversations', () => {
    useConversationStore.setState({
      activeTaskId: 505,
      activeConversationId: 'conv-stale',
      messages: [{ id: 'stale-user', role: 'user', content: 'stale prompt' }],
    });

    useConversationStore.getState().setActiveConversationId('conv-clean');

    expect(useConversationStore.getState().activeConversationId).toBe('conv-clean');
    expect(useConversationStore.getState().activeTaskId).toBeNull();
    expect(useConversationStore.getState().messages).toEqual([]);
  });

  it('ignores a task creation response after the context has been reset', async () => {
    const taskCreation = createDeferred();
    createTaskAPI.mockReturnValueOnce(taskCreation.promise);
    useConversationStore.setState({ activeConversationId: 'conv-create' });

    const createPromise = useConversationStore.getState().createTask({
      conversation_id: 'conv-create',
      task_type: 'geometry',
      details: { query: 'random-cache-path-check' },
    });

    useConversationStore.getState().startNewConversation();
    taskCreation.resolve({ task_id: 606 });

    await expect(createPromise).resolves.toBeNull();
    expect(useConversationStore.getState().activeTaskId).toBeNull();
    expect(useConversationStore.getState().messages).toEqual([]);
  });

  it('does not let an in-flight old polling tick overwrite a newer context', async () => {
    vi.useFakeTimers();
    getTaskHistoryAPI.mockResolvedValueOnce({
      items: [{ id: 'old-running', role: 'assistant', status: 'in_progress', content: 'old running' }],
    });

    await useConversationStore.getState().fetchMessagesForTask(303, 'conv-old');
    expect(useConversationStore.getState().isPolling).toBe(true);

    const oldPollingTick = createDeferred();
    getTaskHistoryAPI.mockReturnValueOnce(oldPollingTick.promise);
    vi.advanceTimersByTime(2000);

    useConversationStore.setState({
      activeTaskId: 404,
      activeConversationId: 'conv-new',
      messages: [{ id: 'new-ai', role: 'assistant', content: 'new task' }],
    });
    useConversationStore.getState().startNewConversation();
    useConversationStore.setState({
      activeTaskId: 404,
      activeConversationId: 'conv-new',
      messages: [{ id: 'new-ai', role: 'assistant', content: 'new task' }],
    });

    oldPollingTick.resolve({
      items: [{ id: 'old-finished', role: 'assistant', status: 'completed', content: 'old finished late' }],
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(useConversationStore.getState().activeTaskId).toBe(404);
    expect(useConversationStore.getState().activeConversationId).toBe('conv-new');
    expect(useConversationStore.getState().messages).toEqual([
      { id: 'new-ai', role: 'assistant', content: 'new task' },
    ]);

    vi.useRealTimers();
  });
});
