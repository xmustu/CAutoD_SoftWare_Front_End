/**
 * 仅在开发环境输出，生产构建中由 Vite 静态替换为死代码并被 tree-shake 掉
 * 用法: devLog('foo', bar)
 */
export const devLog = (...args) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};
