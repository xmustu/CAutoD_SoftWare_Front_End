// import path from "path";
// import react from "@vitejs/plugin-react";
// import { defineConfig, loadEnv } from "vite";

// export default defineConfig(({ mode }) => {
//   const env = loadEnv(mode, process.cwd(), "");
//   return {
//     plugins: [react()],
//     resolve: {
//       alias: {
//         "@": path.resolve(__dirname, "./src"),
//       },
//     },
//     define: {
//       "process.env": env,
//     },
//   };
// });

import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      "process.env": env,
    },

    // 新增：让 Vite 接受你的外网域名访问，并监听 IPv4+IPv6
    // server: {
    //   host: "::",                 // 监听所有 IPv6 地址（并兼容 IPv4）
    //   port: 5173,                 // 自行调整
    //   allowedHosts: ["cautod.ssvgg.asia"],

    //   // （可选）如果用域名/反代后 HMR 不生效，可显式指定 HMR 的主机名/协议/端口
    //   // hmr: {
    //   //   host: "cautod.ssvgg.asia",
    //   //   protocol: "ws",          // 若走 https 反代，用 "wss"
    //   //   port: 5173               // 与外部访问端口一致或按反代配置填写
    //   // }
    // },

    server: {
      host: "::",                       // 同时监听 IPv4+IPv6
      port: 5172,
      allowedHosts: ["cautod.ssvgg.asia"],

      // 关键：把 /api 代理到服务器本机的 FastAPI
      proxy: {
        "/api": {
          target: "http://127.0.0.1:8080", // 这里是 Vite 所在服务器能访问到的后端地址
          changeOrigin: true,
          // 如果后端真实路由没有 /api 前缀，打开下面的重写
          // rewrite: (p) => p.replace(/^\/api/, ""),
        },
        "/files": {
          target: "http://127.0.0.1:8080",
          changeOrigin: true,
        },
      },

      // （可选）如果走 HTTPS 反代导致 HMR 失效，可指定 HMR 主机
      // hmr: { host: "cautod.ssvgg.asia", protocol: "ws", port: 5173 }
    }
  };
});

