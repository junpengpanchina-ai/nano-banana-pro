import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** 自有服务器 / Docker：生成 `.next/standalone`，便于 `node server.js` 运行 */
  output: "standalone",
};

export default nextConfig;
