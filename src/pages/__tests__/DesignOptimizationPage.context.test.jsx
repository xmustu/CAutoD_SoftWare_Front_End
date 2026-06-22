import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DesignOptimizationPage from '../DesignOptimizationPage';
import { uploadFileAPI } from '@/api/fileAPI.js';

const mocks = vi.hoisted(() => ({
  routeState: null,
  startNewConversation: vi.fn(),
  fetchMessagesForTask: vi.fn(async () => undefined),
  setActiveConversationId: vi.fn(),
  addMessage: vi.fn(),
  createTask: vi.fn(),
  updateLastAiMessage: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ state: mocks.routeState }),
}));

vi.mock('axios', () => ({
  default: {
    get: vi.fn(async () => ({ data: { length: 0, running: 0 } })),
  },
}));

vi.mock('@/api/taskAPI', () => ({
  executeTaskAPI: vi.fn(() => ({ close: vi.fn() })),
  submitOptimizationParamsAPI: vi.fn(),
}));

vi.mock('@/api/fileAPI.js', () => ({
  uploadFileAPI: vi.fn(async () => ({ path: '/uploads/random-cache.model' })),
}));

vi.mock('@/store/conversationStore', () => ({
  default: () => ({
    conversations: [{ conversation_id: 'conv-current', title: 'Current conversation' }],
    messages: [],
    addMessage: mocks.addMessage,
    isLoadingMessages: false,
    activeConversationId: 'conv-current',
    activeTaskId: null,
    createTask: mocks.createTask,
    updateLastAiMessage: mocks.updateLastAiMessage,
    fetchMessagesForTask: mocks.fetchMessagesForTask,
    startNewConversation: mocks.startNewConversation,
    setActiveConversationId: mocks.setActiveConversationId,
  }),
}));

vi.mock('@/components/ConversationDisplay.jsx', () => ({
  default: () => <div data-testid="conversation-display" />,
}));

vi.mock('@/components/InteractiveFileUpload.jsx', () => ({
  default: ({ onFileSelect, onStart, selectedFile }) => (
    <div data-testid="interactive-file-upload">
      <button
        type="button"
        onClick={() => onFileSelect(new File(['cache-path'], 'random-cache.model', { type: 'application/octet-stream' }))}
      >
        mock select file
      </button>
      <button type="button" onClick={onStart}>
        mock start optimization
      </button>
      {selectedFile?.name ? <span>{selectedFile.name}</span> : null}
    </div>
  ),
}));

vi.mock('@/components/ProviderSelector.jsx', () => ({
  default: () => <div data-testid="provider-selector" />,
}));

vi.mock('@/components/QueueStatusBanner.jsx', () => ({
  default: () => <div data-testid="queue-status-banner" />,
}));

vi.mock('@/components/RecommendedNumberInput.jsx', () => ({
  default: () => <input aria-label="recommended-number" />,
}));

vi.mock('@/components/BeforeAfterPanel.jsx', () => ({
  default: () => <div data-testid="before-after-panel" />,
}));

vi.mock('@/components/ProtectedImage', () => ({
  default: ({ alt }) => <div data-testid="protected-image">{alt}</div>,
}));

vi.mock('@/components/OptimizationConfigModal', () => ({
  default: () => <div data-testid="optimization-config-modal" />,
}));

vi.mock('@/components/FloatingConfigButton', () => ({
  default: () => <button type="button">Open config</button>,
}));

describe('DesignOptimizationPage task context entry paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.routeState = null;
    mocks.createTask.mockResolvedValue({ task_id: 909 });
    uploadFileAPI.mockResolvedValue({ path: '/uploads/random-cache.model' });
  });

  it('starts with a clean task context on normal entry', async () => {
    render(<DesignOptimizationPage />);

    await waitFor(() => {
      expect(mocks.startNewConversation).toHaveBeenCalled();
    });
    expect(mocks.fetchMessagesForTask).not.toHaveBeenCalled();
  });

  it('restores history instead of clearing when entered from the task list', async () => {
    mocks.routeState = {
      fromTaskList: true,
      taskId: 808,
      conversationId: 'conv-history',
    };

    render(<DesignOptimizationPage />);

    await waitFor(() => {
      expect(mocks.fetchMessagesForTask).toHaveBeenCalledWith(808, 'conv-history');
    });
    expect(mocks.startNewConversation).not.toHaveBeenCalled();
  });

  it('does not write a stale createTask result after the page is unmounted', async () => {
    let resolveCreateTask;
    mocks.createTask.mockReturnValueOnce(new Promise((resolve) => {
      resolveCreateTask = resolve;
    }));

    const { unmount } = render(<DesignOptimizationPage />);

    fireEvent.click(screen.getByRole('button', { name: 'mock select file' }));
    await screen.findByText('random-cache.model');
    fireEvent.click(screen.getByRole('button', { name: 'mock start optimization' }));

    await waitFor(() => {
      expect(mocks.createTask).toHaveBeenCalled();
    });

    unmount();
    resolveCreateTask(null);
    await Promise.resolve();
    await Promise.resolve();

    expect(mocks.updateLastAiMessage).not.toHaveBeenCalled();
  });
});
