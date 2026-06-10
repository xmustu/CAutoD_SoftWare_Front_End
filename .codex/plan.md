# Plan

## Goal

在几何建模模块中完成两项后端接口适配：

1. 为 Dify / Agent 执行模式新增后端几何执行版本选择，默认选择 `v1`，并在调用 `/tasks/execute` 时把所选 `version` 透传给后端。
2. 在任务执行中提供红色“终止任务”按钮，二次确认后调用 `POST /tasks/{task_id}/cancel` 终止当前正在运行的任务。

已确认约束：

1. `provider` 保持当前逻辑，不为了本次需求改写 provider 取值或默认值。
2. 版本默认值为 `v1`。
3. 版本选择 UI 放在 Dify / Agent 模式切换区下面。
4. 不引入新的外部依赖。
5. 终止任务按钮放在几何建模工作视图右侧对话区顶部状态栏，靠近“新建任务”按钮。
6. 后端服务维修期间，本地先完成 UI、请求调用链、自动化测试和截图验证。

## Planned File Changes

预计修改或新增以下文件：

1. `src/components/VersionSelector.jsx`：新增几何执行版本选择组件，提供 `v1 / v2 / v3` 三个选项。
2. `src/components/__tests__/VersionSelector.test.jsx`：新增组件测试，覆盖默认展示、切换回调、禁用态。
3. `src/pages/GeometricModelingPage.jsx`：新增 `version` 状态，默认 `v1`；在初始视图和工作视图中把 VersionSelector 放到 ProviderSelector 下方；调用 `executeTaskAPI` 时带上 `version`。
4. `src/pages/__tests__/GeometricModelingPage.version.test.jsx`：新增页面级测试，验证选择 `v2/v3` 后执行请求 payload 中包含对应 `version`，同时 `provider` 仍按现有逻辑传递。
5. `src/api/taskAPI.js`：新增 `cancelTaskAPI(taskId, body)`，封装 `POST /tasks/{task_id}/cancel`。
6. `src/api/__tests__/taskAPI.test.js`：新增 API 层测试，验证终止任务请求路径和请求体。
7. `src/pages/__tests__/GeometricModelingPage.cancel.test.jsx`：新增页面级测试，验证执行中显示红色终止按钮、二次确认、成功后关闭 SSE 并结束 streaming 状态。
8. `src/mocks/taskMock.js`：如本地 mock 链路需要展示或保留版本/取消信息，则最小化补充透传；如果测试不依赖 mock，则不改。

如果实施中发现必须修改超过以上范围，会先更新本计划并再次请求审批。

## Data / Interface Design

### Frontend state

在 `GeometricModelingPage` 内新增：

```js
const [version, setVersion] = useState('v1');
```

### Execute request payload

在现有 `executeTaskAPI` 调用中保持原字段不变，新增：

```js
version: version,
```

目标请求体形态：

```js
{
  query,
  user,
  conversation_id,
  task_id,
  task_type: 'geometry',
  provider,
  version, // 'v1' | 'v2' | 'v3'
  files,
}
```

### Cancel request payload

新增 API 封装：

```js
export const cancelTaskAPI = (taskId, body = {}) => {
  return post(`/tasks/${taskId}/cancel`, body);
};
```

页面行为：

1. 仅当 `isStreaming && activeTaskId` 时显示“终止任务”按钮。
2. 点击后弹出二次确认。
3. 用户确认后调用 `cancelTaskAPI(activeTaskId)`。
4. 成功后关闭当前 SSE、清空 SSE ref、结束 `isStreaming`，并把最后一条 assistant 消息标记为“任务已终止”。
5. 失败时恢复按钮可点击，并保留当前任务状态。

### UI design

新增 `VersionSelector`，采用和 `ProviderSelector` 接近的轻量分段控件风格：

1. 标签使用“执行版本”。
2. 选项为 `V1`、`V2`、`V3`。
3. 禁用态跟随 `isStreaming`，任务执行中不可切换。
4. 在初始输入视图和工作视图底部输入区中，都放在 `ProviderSelector` 下方，保持紧凑间距。

### Cancel UI design

终止任务按钮放在工作视图右侧顶部状态栏：

1. 默认隐藏，仅任务执行中出现。
2. 使用红色 outline/destructive 风格，图标优先使用 `XCircle` 或 `Square` 类 lucide 图标。
3. 文案为“终止任务”；调用中显示“正在终止...”。
4. 二次确认先使用浏览器 `window.confirm`，避免新增复杂弹窗状态和外部依赖。

## TDD / Validation

按 Red / Green / Refactor 执行。

### Red

1. 先新增 `VersionSelector` 测试：
   - 默认/受控选中 `v1` 时，`V1` 有选中态。
   - 点击 `V2` 调用 `onChange('v2')`。
   - `disabled=true` 时点击不触发 `onChange`。
2. 再新增几何页面测试：
   - Mock `executeTaskAPI`、用户 store、会话 store、`ChatInput` 等复杂依赖。
   - 渲染几何页面初始视图。
   - 切换版本后发送消息。
   - 断言 `executeTaskAPI` 收到的参数包含 `version: 'v2'` 或 `version: 'v3'`。
   - 断言 `provider` 字段仍按当前 UI 选择透传。
3. 新增取消 API 测试：
   - 调用 `cancelTaskAPI(123)`。
   - 断言底层 `post` 收到 `/tasks/123/cancel` 和默认空对象请求体。
4. 新增几何页面取消测试：
   - 让 mock store 返回执行中的任务状态。
   - 断言红色“终止任务”按钮出现。
   - mock `window.confirm` 返回 `true`。
   - 点击按钮后断言 `cancelTaskAPI(activeTaskId)` 被调用，SSE `close` 被调用，页面退出执行中状态。
5. 运行目标测试，确认因为组件/逻辑尚未实现而失败。

### Green

1. 新增 `VersionSelector` 组件。
2. 在 `GeometricModelingPage` 中接入版本状态和 UI。
3. 在 `executeTaskAPI` 参数中新增 `version`。
4. 新增 `cancelTaskAPI`。
5. 在 `GeometricModelingPage` 中新增取消按钮、二次确认、取消中状态和成功/失败处理。
6. 如 mock 链路确实影响测试或本地演示，再补充 `taskMock` 的 `version` / cancel 透传。
7. 运行目标测试，确认通过。

### Refactor

1. 清理无用 import。
2. 检查重复样式和重复布局，必要时只做小范围整理。
3. 确认不引入外部依赖。
4. 运行更完整验证命令。

## Verification Commands

计划执行：

```bash
npm run test -- VersionSelector
npm run test -- GeometricModelingPage.version
npm run test -- taskAPI
npm run test -- GeometricModelingPage.cancel
npm run test
npm run build
```

如时间允许且环境允许，再启动本地前端：

```bash
npm run dev
```

并在浏览器中检查：

1. 初始几何建模页：Dify / Agent 下方显示版本选择，默认 `V1`。
2. 工作视图底部输入区：同样显示版本选择，任务执行中禁用。
3. 选择不同版本后发起请求，Network payload 中包含对应 `version`。
4. 执行中的工作视图顶部状态栏显示红色“终止任务”按钮。
5. 点击“终止任务”出现二次确认。

## Review Checklist

完成后自查：

1. 是否有无用 import。
2. 是否改变了现有 `provider` 默认值或映射逻辑。
3. 是否只在几何建模模块透传 `version`，没有影响其他任务类型。
4. 是否存在任务执行中仍可切换版本导致 payload 不一致的问题。
5. 终止任务是否只在执行中出现，且不会误影响“新建任务”逻辑。
6. 取消成功后是否关闭 SSE，避免继续接收旧任务消息。
7. 是否新增外部依赖。
8. 测试和 build 是否通过。
