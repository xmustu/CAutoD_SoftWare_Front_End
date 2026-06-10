import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GeometricModelingPage from '../GeometricModelingPage';

const mocks = vi.hoisted(() => ({
  sseHandle: { close: vi.fn() },
  executeTaskAPI: vi.fn(() => ({ close: vi.fn() })),
  cancelTaskAPI: vi.fn(async () => ({ status: 'cancelled' })),
  addMessage: vi.fn(),
  updateLastAiMessage: vi.fn(),
  ensureConversation: vi.fn(async () => 'conv-1'),
  createTask: vi.fn(),
  fetchMessagesForTask: vi.fn(),
  startNewConversation: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ state: null }),
  useOutletContext: () => ({ fetchHistory: vi.fn() }),
}));

vi.mock('@/api/taskAPI', () => ({
  executeTaskAPI: (...args) => mocks.executeTaskAPI(...args),
  cancelTaskAPI: (...args) => mocks.cancelTaskAPI(...args),
}));

vi.mock('@/api/fileAPI.js', () => ({
  uploadFileAPI: vi.fn(),
  downloadFileAPI: vi.fn(),
}));

vi.mock('@/store/userStore', () => ({
  default: () => ({ user: { email: 'tester@example.com' } }),
}));

vi.mock('@/store/conversationStore', () => ({
  default: () => ({
    messages: [{ id: 'msg-1', role: 'user', content: 'previous task' }],
    addMessage: mocks.addMessage,
    updateLastAiMessage: mocks.updateLastAiMessage,
    isLoadingMessages: false,
    activeTaskId: 999,
    activeConversationId: 'conv-1',
    ensureConversation: mocks.ensureConversation,
    createTask: mocks.createTask,
    fetchMessagesForTask: mocks.fetchMessagesForTask,
    startNewConversation: mocks.startNewConversation,
  }),
}));

vi.mock('@/components/ConversationDisplay.jsx', () => ({
  default: () => <div data-testid="conversation-display" />,
}));

vi.mock('@/components/ThreeDViewer', () => ({
  default: () => <div data-testid="three-d-viewer" />,
}));

vi.mock('react-markdown', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('@/components/ChatInput.jsx', () => ({
  default: ({ inputValue, onInputChange, onSendMessage, isStreaming }) => (
    <div>
      <input
        aria-label="geometry prompt"
        value={inputValue}
        onChange={onInputChange}
        disabled={isStreaming}
      />
      <button type="button" onClick={onSendMessage} disabled={isStreaming}>
        Send
      </button>
    </div>
  ),
}));

describe('GeometricModelingPage task cancellation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sseHandle = { close: vi.fn() };
    mocks.executeTaskAPI.mockImplementation(() => mocks.sseHandle);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('confirms and cancels the active streaming task', async () => {
    render(<GeometricModelingPage />);

    fireEvent.change(screen.getByLabelText('geometry prompt'), {
      target: { value: 'continue the model' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(screen.getByRole('button', { name: '终止任务' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '终止任务' }));

    await waitFor(() => expect(mocks.cancelTaskAPI).toHaveBeenCalledWith(999));
    expect(window.confirm).toHaveBeenCalled();
    expect(mocks.sseHandle.close).toHaveBeenCalled();
    expect(mocks.updateLastAiMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        finalData: expect.objectContaining({
          answer: '任务已终止',
        }),
      }),
      999,
    );
  });
});
