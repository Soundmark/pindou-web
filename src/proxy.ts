import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // 排除 api / _next / favicon 等：api 路由永远不本地化
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};