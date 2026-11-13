import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

// 后端已外置（D:/github/pindou/server），前端不再有 server 端代理/OAuth 依赖
const nextConfig: NextConfig = {
  // 手机通过局域网 IP 访问 dev server 时，Origin 是局域网地址；Next 16 默认只放行
  // localhost，会 403 掉 HMR WebSocket，客户端因此不 hydrate（菜单无响应、列表不加载）。
  // 仅作用于开发模式，生产构建无影响。
  allowedDevOrigins: ["10.*.*.*", "172.*.*.*", "192.168.*.*"],
};

export default withNextIntl(nextConfig);

