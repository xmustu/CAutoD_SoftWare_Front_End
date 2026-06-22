import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import ConversationDisplay from '../ConversationDisplay';

// Mock ProtectedImage and other complex sub-components to keep this test unit-focused
vi.mock('../ProtectedImage', () => ({
    __esModule: true,
    default: ({ alt }) => <div data-testid="protected-image">{alt}</div>
}));
vi.mock('../ThreeDViewer', () => ({
    __esModule: true,
    default: () => <div data-testid="3d-viewer">3D Viewer Mock</div>
}));
vi.mock('react-markdown', () => ({
    __esModule: true,
    default: ({ children }) => <div data-testid="markdown">{children}</div>
}));

beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
            writeText: vi.fn().mockResolvedValue(undefined)
        }
    });
});

describe('ConversationDisplay Copy Support', () => {
    it('allows text selection in the conversation area and AI message cards', () => {
        render(
            <ConversationDisplay
                messages={[{ id: 30, role: 'assistant', content: 'copyable assistant text', task_type: 'general' }]}
                isLoading={false}
            />
        );

        expect(screen.getByTestId('conversation-scroll')).toHaveClass('select-text');
        expect(screen.getByTestId('ai-message-card')).toHaveClass('select-text');
    });

    it('copies an AI message with one click', async () => {
        render(
            <ConversationDisplay
                messages={[{ id: 31, role: 'assistant', content: 'copy this answer', task_type: 'general' }]}
                isLoading={false}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: '复制消息' }));

        await waitFor(() => {
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith('copy this answer');
        });
    });
});

describe('ConversationDisplay Auto Follow', () => {
    beforeEach(() => {
        HTMLElement.prototype.scrollIntoView = vi.fn();
    });

    it('scrolls to the newest message when the user is already near the bottom', async () => {
        const { rerender } = render(
            <ConversationDisplay
                messages={[{ id: 40, role: 'assistant', content: 'streaming answer', task_type: 'general' }]}
                isLoading={false}
            />
        );

        HTMLElement.prototype.scrollIntoView.mockClear();

        rerender(
            <ConversationDisplay
                messages={[{ id: 40, role: 'assistant', content: 'streaming answer\nnext line', task_type: 'general' }]}
                isLoading={false}
            />
        );

        await waitFor(() => {
            expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'end', behavior: 'auto' });
        });
    });

    it('pauses auto-follow when the user scrolls up and resumes near the bottom', async () => {
        const { rerender } = render(
            <ConversationDisplay
                messages={[{ id: 41, role: 'assistant', content: 'line 1', task_type: 'general' }]}
                isLoading={false}
            />
        );

        const scrollArea = screen.getByTestId('conversation-scroll');
        Object.defineProperty(scrollArea, 'scrollHeight', { configurable: true, value: 1000 });
        Object.defineProperty(scrollArea, 'clientHeight', { configurable: true, value: 300 });
        Object.defineProperty(scrollArea, 'scrollTop', { configurable: true, writable: true, value: 100 });

        fireEvent.scroll(scrollArea);
        HTMLElement.prototype.scrollIntoView.mockClear();

        rerender(
            <ConversationDisplay
                messages={[{ id: 41, role: 'assistant', content: 'line 1\nline 2', task_type: 'general' }]}
                isLoading={false}
            />
        );

        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();

        scrollArea.scrollTop = 720;
        fireEvent.scroll(scrollArea);

        rerender(
            <ConversationDisplay
                messages={[{ id: 41, role: 'assistant', content: 'line 1\nline 2\nline 3', task_type: 'general' }]}
                isLoading={false}
            />
        );

        await waitFor(() => {
            expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'end', behavior: 'auto' });
        });
    });

    it('does not force the optimization log to the bottom while the user is reading older logs', async () => {
        const { rerender } = render(
            <ConversationDisplay
                messages={[{
                    id: 42,
                    role: 'assistant',
                    task_type: 'optimize',
                    content: '=== 开始优化 ===\n迭代 1\n迭代 2',
                }]}
                isLoading={false}
                filterTaskType="optimize"
            />
        );

        const conversationScroll = screen.getByTestId('conversation-scroll');
        Object.defineProperty(conversationScroll, 'scrollHeight', { configurable: true, value: 1000 });
        Object.defineProperty(conversationScroll, 'clientHeight', { configurable: true, value: 300 });
        Object.defineProperty(conversationScroll, 'scrollTop', { configurable: true, writable: true, value: 100 });
        fireEvent.scroll(conversationScroll);

        const logScroll = screen.getByTestId('optimization-log-scroll');
        Object.defineProperty(logScroll, 'scrollHeight', { configurable: true, value: 1000 });
        Object.defineProperty(logScroll, 'clientHeight', { configurable: true, value: 300 });
        Object.defineProperty(logScroll, 'scrollTop', { configurable: true, writable: true, value: 120 });
        fireEvent.scroll(logScroll);

        HTMLElement.prototype.scrollIntoView.mockClear();

        rerender(
            <ConversationDisplay
                messages={[{
                    id: 42,
                    role: 'assistant',
                    task_type: 'optimize',
                    content: '=== 开始优化 ===\n迭代 1\n迭代 2\n迭代 3',
                }]}
                isLoading={false}
                filterTaskType="optimize"
            />
        );

        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
    });
});

describe('ConversationDisplay Message Filtering', () => {
    const mockMessages = [
        { id: 1, role: 'user', content: 'hello' },
        { id: 2, role: 'ai', content: 'general message', task_type: 'general' },
        { id: 3, role: 'ai', content: '=== 开始优化 ===\n最优参数', task_type: 'optimize' },
        { id: 4, role: 'ai', content: '```python\nimport cadquery as cq\n```', task_type: 'geometry' },
        // Below is an old message without task_type, it should be inferred
        { id: 5, role: 'ai', content: '等待有效参数...', metadata: { } }, // inferred as optimize
        { id: 6, role: 'ai', metadata: { code_file: 'test.py' } } // inferred as geometry
    ];

    it('displays all messages when filterTaskType is undefined', () => {
        render(<ConversationDisplay messages={mockMessages} isLoading={false} />);
        
        // User message
        expect(screen.getByText('hello')).toBeInTheDocument();
        // AI messages
        expect(screen.getByText('general message')).toBeInTheDocument();
        expect(screen.getByText(/开始优化/)).toBeInTheDocument();
        expect(screen.getByText(/import cadquery/)).toBeInTheDocument();
    });

    it('filters correctly for filterTaskType="optimize"', () => {
        const { container } = render(
            <ConversationDisplay messages={mockMessages} isLoading={false} filterTaskType="optimize" />
        );
        
        // User message should always be kept
        expect(screen.getByText('hello')).toBeInTheDocument();
        
        // Optimize message should be present
        expect(screen.getByText(/开始优化/)).toBeInTheDocument();
        
        // Inferred optimize message should be present
        expect(screen.getByText(/等待有效/)).toBeInTheDocument();

        // Geometry and general messages should NOT be present
        expect(screen.queryByText('general message')).not.toBeInTheDocument();
        expect(screen.queryByText(/import cadquery/)).not.toBeInTheDocument();
    });

    it('filters correctly for filterTaskType="geometry"', () => {
        render(
            <ConversationDisplay messages={mockMessages} isLoading={false} filterTaskType="geometry" />
        );
        
        // User message should always be kept
        expect(screen.getByText('hello')).toBeInTheDocument();
        
        // Geometry message should be present
        expect(screen.getByText(/import cadquery/)).toBeInTheDocument();

        // Optimize and general messages should NOT be present
        expect(screen.queryByText('general message')).not.toBeInTheDocument();
        expect(screen.queryByText(/开始优化/)).not.toBeInTheDocument();
    });
    it('Regression: should not infer Markdown table with generic keywords as optimize', () => {
        const mockMarkdownMsg = [
            { id: 10, role: 'user', content: 'hello' },
            { id: 11, role: 'ai', content: '1、分析\n获取到参数，开始构建\n\n| 参数 | 推荐值 |\n| --- | --- |\n| 高度 | 10 |\n' } // No task_type
        ];
        const { container } = render(
            <ConversationDisplay messages={mockMarkdownMsg} isLoading={false} filterTaskType="optimize" />
        );
        // It should NOT be in optimize view because it has a markdown table
        expect(screen.queryByText(/获取到参数/)).not.toBeInTheDocument();
    });

    it('Regression: should display fallback message when Geometry has cad_file but no stl_file', () => {
        const mockGeometryMsg = [
            { id: 20, role: 'user', content: 'hello' },
            { id: 21, role: 'ai', task_type: 'geometry', content: 'Here is CAD', metadata: { cad_file: 'model.step' } } 
        ];
        render(
            <ConversationDisplay messages={mockGeometryMsg} isLoading={false} filterTaskType="geometry" />
        );
        // It SHOULD display the fallback warning
        expect(screen.getByText('当前前端仅支持 STL 预览，CAD 文件可下载但不可直接预览。')).toBeInTheDocument();
    });
});
