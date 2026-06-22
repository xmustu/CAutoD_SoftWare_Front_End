# Plan

## Goal

稳定几何建模与设计优化两个演示页面的任务上下文与 AI Messages 展示体验。

已确认约束：

1. 普通进入几何建模/设计优化页面时，应进入干净的新任务上下文。
2. 只有从任务列表/历史任务携带 `fromTaskList + taskId + conversationId` 进入时，才恢复旧消息与旧结果。
3. AI Messages 在持续输出长内容时应自动跟随最新一行；用户手动向上滚动后暂停自动跟随，用户回到底部后恢复。
4. 进度框优先使用后端已有 metadata/SSE 增量信息；在后端字段尚未完全稳定前保留历史启发式兼容。
5. 不引入新的外部依赖。

## Findings

1. 全局 `conversationStore` 共享 `messages / activeTaskId / activeConversationId`。几何页普通进入会调用 `startNewConversation()`，但设计优化页普通进入目前没有清空旧上下文，因此旧几何或旧优化任务可能残留。
2. `fetchMessagesForTask(taskId, conversationId)` 和它启动的轮询会在接口返回后无条件写回全局 store。若用户在请求未返回时切到新任务，旧请求仍可能把旧消息写回。
3. 设计优化页开始任务时会先复用 `activeTaskId`，如果 store 中残留旧 task，新上传可能被追加到旧任务。
4. 几何页已有 `currentTaskIdRef` 与 SSE 关闭逻辑，设计优化页缺少同等级别的运行任务 guard。
5. `ConversationDisplay` 主滚动容器没有 ref、底部锚点与自动滚动逻辑，所以长代码流式输出时不会自动到底。
6. 几何进度 UI 有两套启发式：消息内进度框支持 `stl_file || cad_file`，右侧浮动进度框主要看 `stl_file`，并且部分完成状态被 `!isStreaming` 卡住，导致 metadata 已到时反馈不够及时。

## Priority

P0：缓存/任务串线问题。必须先做，直接影响演示稳定性。

P1：AI Messages 自动跟随。实现成本低，演示效果提升明显。

P2：几何进度框。先统一现有 metadata 判断和展示速度；如果后端后续提供 `stage / task_status / progress_percent / artifacts`，再接入更完整的进度协议。

## Planned File Changes

1. `src/store/conversationStore.js`
   - 为会话历史加载加入请求令牌或上下文版本号。
   - `startNewConversation()` 清空状态时同步使旧历史请求和旧轮询失效。
   - `fetchMessagesForTask()` 在接口返回和轮询 tick 写入前确认仍是当前请求。
   - 必要时让 `ensureConversation()`、`createTask()` 的异步写回不覆盖已经重置的新上下文。

2. `src/pages/GeometricModelingPage.jsx`
   - 梳理普通进入、历史任务进入、新建任务三种路径。
   - 普通进入时继续清空全局任务上下文和本地几何 UI 状态。
   - 历史任务进入时保留恢复逻辑，但依赖 store guard 防止过期请求回写。
   - 优化右侧浮动进度框，使 `cad_file` 与 `stl_file` 一样可驱动“模型生成”状态，并更快响应 metadata。

3. `src/pages/DesignOptimizationPage.jsx`
   - 普通进入时显式清空全局任务上下文和本地优化 UI 状态。
   - 从任务列表进入时恢复历史任务，不做普通清空。
   - 开始新优化任务时避免复用残留 `activeTaskId`。
   - 补齐运行任务 ref / SSE 关闭 / 当前 task guard，防止旧任务回调影响新页面。

4. `src/components/ConversationDisplay.jsx`
   - 为主对话滚动容器加入 `ref`、底部锚点和“接近底部才自动跟随”的逻辑。
   - 用户手动上滚时暂停自动滚动，回到底部附近后恢复。
   - 将流式消息 key 调整为稳定 key，避免内容增长导致整条消息重复 remount。

5. `src/components/__tests__/ConversationDisplay.test.jsx`
   - 增加自动跟随测试：在底部时新内容追加会滚动到底。
   - 增加暂停测试：用户向上滚动后新内容追加不强制改变滚动位置。
   - 增加恢复测试：用户回到底部附近后新内容追加恢复自动跟随。

6. `src/store/__tests__/conversationStore.test.js`
   - 新增或补充 store 测试：`fetchMessagesForTask(A)` 未返回前调用 `startNewConversation()`，A 返回后不得恢复旧消息。
   - 测试旧任务轮询在上下文切换后不得覆盖新任务。
   - 测试历史任务入口仍可正确写入当前 task/conversation。

7. `src/pages/__tests__/DesignOptimizationPage.test.jsx` 或现有页面测试
   - 覆盖普通进入设计优化页时清空旧任务上下文。
   - 覆盖从任务列表进入时保留并恢复历史上下文。
   - 如果现有页面测试成本过高，则以 store 测试加组件行为测试覆盖核心风险，并在最终说明剩余手动验证点。

8. `.codex/plan.md`
   - 记录本计划、验证方案和后续交付命令。

如实施中发现必须修改超过以上范围的文件，会先更新计划并说明原因。

## TDD / Validation

按 Red / Green / Refactor 执行。

### Red

1. 先补 `conversationStore` 测试，复现旧历史请求/旧轮询在新任务后回写的问题，确认当前实现失败。
2. 先补 `ConversationDisplay` 自动跟随测试，确认当前主对话容器不会自动滚到底。
3. 先补设计优化页普通进入清空测试或等价 store/page 行为测试，确认当前会复用旧 `activeTaskId`。

### Green

1. 给 store 加上下文版本 guard，让旧请求和旧轮询失效。
2. 让设计优化页普通入口、新建优化任务路径显式重置上下文。
3. 给优化页补运行任务 guard 与连接关闭逻辑。
4. 给 `ConversationDisplay` 加自动跟随逻辑。
5. 统一几何浮动进度框对 `stl_file / cad_file / preview_image / code_file` 的判断。

### Refactor

1. 清理无用 import、重复状态和未使用的 `eventSource` 变量。
2. 确认拖拽区域、3D 区域和非文本控件没有因为 `select-text`/滚动逻辑受到影响。
3. 保持 UI 风格与当前页面一致，不加突兀说明文字。

## Verification Commands

计划运行：

```bash
npm run test -- conversationStore
npm run test -- ConversationDisplay
npm run test
npm run lint
npm run build
```

如本地可启动：

```bash
npm run dev
```

手动验证：

1. 普通进入几何建模，提交或中断任务后离开，再普通进入，应是干净新任务。
2. 普通进入设计优化，不能显示或复用几何建模旧任务。
3. 从任务列表进入几何/优化历史任务，应恢复原消息和结果。
4. 长代码流式输出时 AI Messages 自动到底；用户上滚后不抢滚动；回到底部后恢复跟随。
5. 几何 metadata 逐步到达时，进度框能及时更新代码、模型、预览状态。

## Delivery Plan

完成验证后：

1. 提交 Git commit。
2. 推送到 `origin main`。
3. 生成离线 bundle，便于服务器无法访问 GitHub 时使用。
4. 给出服务器端拉取命令：

```powershell
cd D:\CAutoD\CAutoD_SoftWare_Front_End
git pull origin main
git log -1 --oneline
```

如服务器网络仍不可用，则改用 bundle：

```powershell
cd D:\CAutoD\CAutoD_SoftWare_Front_End
git checkout main
git fetch D:\CAutoD\<bundle-name>.bundle <bundle-ref>
git merge --ff-only FETCH_HEAD
git log -1 --oneline
```
