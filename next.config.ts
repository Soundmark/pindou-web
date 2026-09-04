import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // 这些包被 Turbopack 打包后类原型链会损坏（https agent 报 getName is not a function），
  // 必须排除出 server bundle，直接引用 node_modules 原版
  serverExternalPackages: ["https-proxy-agent", "agent-base", "openid-client", "undici"],
};

export default withNextIntl(nextConfig);

