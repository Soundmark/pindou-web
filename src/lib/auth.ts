import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { HttpsProxyAgent } from "https-proxy-agent";
import https from "node:https";
import { createRequire } from "node:module";
import path from "node:path";

// NextAuth 的 OAuth 请求走 openid-client（原生 https 模块，不走 fetch）。
// 两个坑：
// 1. next-auth v4 给 openid-client v5 传 httpOptions 时签名不匹配，provider.httpOptions 实际无效；
// 2. Next dev 环境中默认 globalAgent 不可用（this.getName is not a function）。
// 因此开发环境（HTTPS_PROXY 存在时）锚定 next-auth 实际解析的那份 openid-client，
// 用正确的双参签名注入代理 agent，并同步替换 https.globalAgent 兜底。
// 线上（无代理变量）整段不执行，保持直连。
const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
if (proxyUrl) {
  try {
    const projectRequire = createRequire(path.join(process.cwd(), "package.json"));
    const nextAuthRequire = createRequire(projectRequire.resolve("next-auth"));
    // openid-client 是 next-auth 的传递依赖（未直接声明），这里只用运行时对象，
    // 用结构化类型描述而非 import 类型，避免 Vercel 构建时解析不到类型声明
    const { custom: openidCustom } = nextAuthRequire("openid-client") as {
      custom: { setHttpOptionsDefaults: (props: string[], options: object) => void };
    };
    openidCustom.setHttpOptionsDefaults([], { agent: new HttpsProxyAgent(proxyUrl) });
    https.globalAgent = new HttpsProxyAgent(proxyUrl);
  } catch {
    // 模块解析失败时保持直连（如线上环境）
  }
}

export const authOptions = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET || "",
    }),
  ],
  pages: {
    signIn: "/login",
    newUser: "/create",
  },
  callbacks: {
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        (session.user as Session["user"] & { id: string }).id = token.sub ?? "";
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
