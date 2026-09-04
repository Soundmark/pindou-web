/**
 * Next.js instrumentation：服务端启动时执行一次。
 * 让 Node 的全局 fetch（含 NextAuth 访问 Google 的请求）遵循
 * HTTP_PROXY / HTTPS_PROXY 环境变量——大陆开发环境必需；
 * 未配置代理变量时行为与直连一致，线上（Vercel）无感。
 */
export async function register() {
  console.log("[instrumentation] register called, runtime:", process.env.NEXT_RUNTIME, "HTTPS_PROXY:", process.env.HTTPS_PROXY ?? "(unset)");
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { EnvHttpProxyAgent, setGlobalDispatcher } = await import("undici");
    setGlobalDispatcher(new EnvHttpProxyAgent());
  }
}
