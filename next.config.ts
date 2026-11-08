import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

// 后端已外置（D:/github/pindou/server），前端不再有 server 端代理/OAuth 依赖
const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);

