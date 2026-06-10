# Plan

## Goal

修复几何建模和设计优化页面中 AI Messages 对话内容不可复制的问题，并新增 AI 消息一键复制入口。完成后生成新的离线 bundle，供服务器在无法访问 GitHub 时本地更新。

已确认约束：

1. 几何建模和设计优化两个页面的对话内容都要支持复制。
2. 支持鼠标选中文字后 `Ctrl+C` / 右键复制。
3. 给 AI 消息增加一键复制按钮。
4. 3D 视图区、分栏拖拽区域等交互区域继续保持不可选中或不影响拖拽体验。
5. 不引入新的外部依赖。

## Current Finding

1. `src/pages/GeometricModelingPage.jsx` 的工作视图最外层容器包含 `select-none`，这是几何建模页无法选中对话文字的主要嫌疑。
2. `src/pages/DesignOptimizationPage.jsx` 没有同样的整页 `select-none`，但它和几何建模页共用 `src/components/ConversationDisplay.jsx`。
3. 因此：
   - 鼠标选中复制：优先在 `ConversationDisplay` 根容器和消息气泡上显式加 `select-text`，覆盖几何页外层禁选。
   - 一键复制：在 `AiMessage` 中新增复制按钮，两个页面自然同时生效。

## Planned File Changes

预计修改以下文件：

1. `src/components/ConversationDisplay.jsx`
   - AI 消息卡片加 `select-text`。
   - 对话滚动容器加 `select-text`。
   - 新增 AI 消息一键复制按钮，复制当前消息清洗后的文本内容。
   - 复制成功后短暂显示成功态。
2. `src/components/__tests__/ConversationDisplay.test.jsx`
   - 增加测试：AI 消息渲染一键复制按钮。
   - 增加测试：点击复制按钮会调用 `navigator.clipboard.writeText`。
   - 增加测试：对话容器/AI 消息区域包含允许选择文本的 class。
3. `src/pages/GeometricModelingPage.jsx`
   - 如 `ConversationDisplay` 内部 `select-text` 仍不足以覆盖外层 `select-none`，则只在右侧对话区容器补充 `select-text`，不改左侧 3D 区和拖拽条。
4. `.codex/plan.md`
   - 记录本轮计划和验证方案。

如果实施中发现需要修改超过以上范围，会先更新计划并再次说明。

## TDD / Validation

按 Red / Green / Refactor 执行。

### Red

1. 先修改/新增 `ConversationDisplay` 测试：
   - Mock `navigator.clipboard.writeText`。
   - 渲染一条 assistant 消息。
   - 断言存在“复制消息”按钮。
   - 点击后断言复制内容为消息文本。
   - 断言对话容器或 AI 消息卡片有 `select-text`。
2. 运行目标测试，确认当前实现缺少按钮或 `select-text` 而失败。

### Green

1. 在 `AiMessage` 中新增复制状态和 `handleCopyMessage`。
2. 在 AI 消息卡片右上角加入小型复制按钮，默认使用 `Clipboard` 图标，成功后显示 `CheckCircle` 或“已复制”。
3. 给 `ConversationDisplay` 根容器、AI 消息卡片和主要内容区域增加 `select-text`。
4. 如几何页外层 `select-none` 仍影响选择，则在右侧对话容器局部加 `select-text`。
5. 运行目标测试通过。

### Refactor

1. 清理无用 import。
2. 确认 3D 区和拖拽条仍不因为本次修改变成可选文字。
3. 运行完整测试、lint、build。

## Verification Commands

计划执行：

```bash
npm run test -- ConversationDisplay
npm run test
npm run lint
npm run build
```

完成后生成离线更新包：

```bash
git bundle create _delivery/<bundle-name>.bundle <new-commit> ^b2a13bc
git bundle verify _delivery/<bundle-name>.bundle
git bundle list-heads _delivery/<bundle-name>.bundle
```

## Server Update Plan

服务器收到 bundle 后，预计执行：

```powershell
cd D:\CAutoD\CAutoD_SoftWare_Front_End
git checkout main
git fetch D:\CAutoD\<bundle-name>.bundle <bundle-ref>
git merge --ff-only FETCH_HEAD
git log -1 --oneline
```

