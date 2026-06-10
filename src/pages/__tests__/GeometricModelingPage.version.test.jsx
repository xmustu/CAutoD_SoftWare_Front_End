import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GeometricModelingPage from '../GeometricModelingPage';

const mocks = vi.hoisted(() => ({
  executeTaskAPI: vi.fn(() => ({ close: vi.fn() })),
  cancelTaskAPI: vi.fn(),
  addMessage: vi.fn(),
  updateLastAiMessage: vi.fn(),
  ensureConversation: vi.fn(async () => 'conv-1'),
  createTask: vi.fn(async () => ({ task_id: 321 })),
  fetchMessagesForTask: vi.fn(),
  startNewConversation: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ state: null }),
  useOutletContext: () => ({ fetchHistory: vi.fn() }),
}));

vi.mock('@/api/taskAPI', () => ({
  executeTaskAPI: mocks.executeTaskAPI,
  cancelTaskAPI: mocks.cancelTaskAPI,
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
    messages: [],
    addMessage: mocks.addMessage,
    updateLastAiMessage: mocks.updateLastAiMessage,
    isLoadingMessages: false,
    activeTaskId: null,
    activeConversationId: null,
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

describe('GeometricModelingPage version payload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends the selected version while preserving provider selection', async () => {
    render(<GeometricModelingPage />);

    fireEvent.click(screen.getByRole('button', { name: /Dify/i }));
    fireEvent.click(screen.getByRole('button', { name: 'V2' }));
    fireEvent.change(screen.getByLabelText('geometry prompt'), {
      target: { value: 'generate a bracket' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(mocks.executeTaskAPI).toHaveBeenCalled());

    expect(mocks.executeTaskAPI).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'dify',
        version: 'v2',
        task_type: 'geometry',
      }),
    );
  });
});
