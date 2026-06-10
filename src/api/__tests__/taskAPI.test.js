import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  sse: vi.fn(),
}));

vi.mock('../index', () => mocks);

describe('taskAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts to the standard cancel task endpoint', async () => {
    const { cancelTaskAPI } = await import('../taskAPI');

    cancelTaskAPI(123);

    expect(mocks.post).toHaveBeenCalledWith('/tasks/123/cancel', {});
  });
});
