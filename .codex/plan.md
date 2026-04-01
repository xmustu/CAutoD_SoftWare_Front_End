# Plan

## Goal

在今天 17:00 前形成一个稳定版本，覆盖两类交付：

1. `pretext` 前端轻量化适配研究汇报材料，重点围绕 `AiMessage`/长文本渲染场景如何降低服务端与前端整体负载。
2. 为当前 React 18 前端项目补齐最小测试基础设施，并跑通一个明显且可验收的测试点。

## Planned File Changes

本轮预计涉及的文件如下：

1. `package.json`
2. `vite.config.js`
3. `src/components/ConversationDisplay.jsx`
4. `src/components/ChatInput.jsx` 或其他最终选定的首个测试目标组件
5. `src/store/conversationStore.js`（仅在需要抽离纯函数或降低耦合时修改）
6. `src/test/setup.js`
7. `src/components/__tests__/ConversationDisplay.test.jsx` 或对应测试文件
8. `前端进展汇报.md`

如果实施中发现需要超过以上范围的额外文件，会先重新更新计划。

## Design

### A. `pretext` 汇报与小优化落点

基于 `pretext` 官方 README，核心价值是：

- 通过 `prepare()` 做一次性预处理与测量缓存。
- 通过 `layout()` 在热路径中仅做纯算术布局。
- 避免频繁依赖 DOM 测量，从而减少 reflow。

结合当前项目，前端可落地的轻量化方向：

1. 减少 `AiMessage` 长文本/Markdown/图片混合消息渲染时的重复计算。
2. 对流式消息仅在必要时刷新布局，避免每个 chunk 都触发重型渲染链。
3. 对可预测的文本块高度做前置估算，降低“等完整响应返回后再整体重排”的抖动。
4. 对消息列表采用分层渲染策略：
   - 流式中消息使用轻量文本容器。
   - 完成态消息再进入完整 Markdown/代码高亮/图片提取流程。

本轮建议先落实一个小优化：

- 抽出 `AiMessage` 的消息类型识别与图片去重逻辑，减少流式更新期间的重复开销。
- 视实际代码复杂度，可进一步增加“流式中跳过部分重型渲染”的保护条件。

这类优化与 `pretext` 的关联表达方式：

- 不直接引入 `pretext` 到生产代码。
- 先把“预处理缓存、热路径轻量化、减少布局/重排成本”的思想映射到现有消息渲染链。
- 汇报中说明：后续若消息列表出现超长内容/高频流式输出，可评估把 `pretext` 用于文本高度预测、虚拟列表预估高度、无 DOM 文本测量等场景。

### B. 测试方案

当前项目没有测试模块，建议先补最小测试栈：

- `vitest`
- `jsdom`
- `@testing-library/react`
- `@testing-library/jest-dom`
- `@testing-library/user-event`

不新增 E2E 工具，不引入 Cypress/Playwright，保持轻量。

首个测试点选择原则：

- 不依赖远程后端。
- 用户价值明确。
- 能覆盖当前高风险交互。
- 最好与本轮优化位置一致。

首选测试点：

- `ConversationDisplay` 在 `filterTaskType="optimize"` 或 `"geometry"` 下，能正确保留用户消息，并基于 `task_type`/推断逻辑筛选 AI 消息。

原因：

- 这是当前会话主链路。
- 直接影响用户看到的结果是否正确。
- 逻辑较稳定，容易先做出第一条通过测试。
- 后续可以继续扩展到 `AiMessage` 的图片去重、`ChatInput` 的发送按钮禁用逻辑等。

候选第二测试点：

- `ChatInput` 在 `isStreaming`、`disabled`、空输入、有附件等条件下的按钮状态与发送行为。

## TDD / Validation

按 Red / Green / Refactor 执行：

1. Red
   - 新增测试基础设施与首个测试文件。
   - 先写失败测试，运行 `vitest`，确认失败原因符合预期。

2. Green
   - 以最小改动修正目标组件或抽离纯函数。
   - 再次运行测试，确认通过。

3. Refactor
   - 清理无用 import。
   - 合并重复逻辑。
   - 检查是否引入额外副作用、定时器泄漏、对象 URL 泄漏。

验证命令预期：

- `npm install` 或等价安装命令
- `npm run test`（需要新增 script）
- `npm run lint`
- 如有必要：`npm run build`

## Deliverables

1. 可用于今晚汇报的 `pretext` 研究摘要与前端优化建议，写入 `前端进展汇报.md`。
2. 一套最小可运行测试基础设施。
3. 至少 1 个通过的前端测试用例。
4. 给 `antigravity` 的执行提示词，包含：
   - 拉齐代码检查步骤
   - TDD 顺序
   - 修改范围
   - 验证命令
   - 提交前自检清单
