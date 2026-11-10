#!/usr/bin/env node
/**
 * 开发服务器启动器：先选后端服务器，再启动 next dev。
 *
 * 为什么需要它：`NEXT_PUBLIC_API_BASE_URL` 由 Next 在启动时内联进客户端产物，
 * 运行中改 `.env.local` 不会生效，必须重启 dev。把「选后端 + 重启」收进一个脚本，
 * 就不用为了让微信扫码登录可用去手改 `.env.local`。
 *
 * 用法：
 *   npm run dev                 # 交互选择（非 TTY 时默认本地）
 *   npm run dev:cloud           # 直接连云端后端
 *   npm run dev:local           # 直接连本地后端
 *   npm run dev -- --port 3001  # 其余参数原样透传给 next dev
 *   npm run dev:cloud -- --port 3001
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createInterface } from "node:readline/promises";
import process from "node:process";

/** 预设后端。新增环境在这里加一行就会出现在选择菜单里。 */
const SERVERS = [
  {
    key: "cloud",
    label: "云端（生产）",
    url: "https://fittingprogress.top/pindou",
    note: "图纸创建 / 发布等写操作会落到线上数据",
  },
  {
    key: "local",
    label: "本地（需先启动 server + MySQL）",
    url: "http://127.0.0.1:3100",
  },
];

/** 非交互环境（CI、管道）下的默认值，保持与旧 `npm run dev` 一致的本地行为 */
const DEFAULT_KEY = "local";

/** 拆分 `[server] [...下一个进程的参数]` */
function parseArgs(argv) {
  const [first, ...rest] = argv;
  if (first && !first.startsWith("-")) return { serverArg: first, nextArgs: rest };
  return { serverArg: undefined, nextArgs: argv };
}

async function chooseServer(serverArg) {
  if (serverArg) {
    const preset = SERVERS.find((s) => s.key === serverArg);
    if (preset) return preset;
    if (/^https?:\/\//i.test(serverArg)) {
      return { key: "custom", label: "自定义", url: serverArg.replace(/\/+$/, "") };
    }
    console.error(
      `未知服务器「${serverArg}」。可选：${SERVERS.map((s) => s.key).join(" / ")}，或直接传完整 URL。`
    );
    process.exit(1);
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY || process.env.CI) {
    return SERVERS.find((s) => s.key === DEFAULT_KEY);
  }

  console.log("\n后端服务器：");
  SERVERS.forEach((s, i) => {
    console.log(`  ${i + 1}) ${s.label.padEnd(12, " ")} ${s.url}`);
  });
  console.log(`     ${SERVERS.length + 1}) 自定义地址`);

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(`\n选择 [1]: `)).trim();
    if (!answer) return SERVERS[0];
    const index = Number(answer);
    if (Number.isInteger(index) && index >= 1 && index <= SERVERS.length) {
      return SERVERS[index - 1];
    }
    if (index === SERVERS.length + 1) {
      const url = (await rl.question("后端地址（含 https:// 或 http://）：")).trim();
      if (!/^https?:\/\//i.test(url)) {
        console.error("地址必须以 http:// 或 https:// 开头");
        process.exit(1);
      }
      return { key: "custom", label: "自定义", url: url.replace(/\/+$/, "") };
    }
    const preset = SERVERS.find((s) => s.key === answer);
    if (preset) return preset;
    if (/^https?:\/\//i.test(answer)) return { key: "custom", label: "自定义", url: answer };
    console.error(`无法识别的选择：${answer}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

/** 启动前探一下后端，避免「页面能开但登录按钮全灰」的迷惑现场 */
async function probe(url) {
  try {
    const res = await fetch(`${url}/auth/providers`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return `可达但返回 HTTP ${res.status}`;
    const data = await res.json();
    return data?.wechat ? "微信扫码登录可用" : "微信登录未配置";
  } catch (error) {
    const reason = error?.name === "TimeoutError" ? "连接超时" : error?.message || "连接失败";
    return `不可达（${reason}）`;
  }
}

const { serverArg, nextArgs } = parseArgs(process.argv.slice(2));
const target = await chooseServer(serverArg);

console.log(`\n后端：${target.label}  ${target.url}`);
if (target.note) console.log(`提示：${target.note}`);
console.log(`检查：${await probe(target.url)}\n`);

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

const child = spawn(process.execPath, [nextBin, "dev", ...nextArgs], {
  stdio: "inherit",
  env: { ...process.env, NEXT_PUBLIC_API_BASE_URL: target.url },
});

child.on("exit", (code, signal) => {
  process.exit(signal ? 1 : code ?? 0);
});
