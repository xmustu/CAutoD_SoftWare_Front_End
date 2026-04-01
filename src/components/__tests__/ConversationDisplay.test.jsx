import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
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
