/** 与后端 `/auth/*` 和 `/storage/policy` 对齐的请求/响应类型。 */

export type AuthPlatform = "wechat" | "douyin" | "h5" | "google" | "local" | string;

/** `/auth/me`、`/auth/exchange`、`/auth/login` 共用的用户信息 */
export interface AuthUser {
  uid: string;
  platform: AuthPlatform;
  isAdmin: boolean;
  nickname: string;
  avatarUrl: string;
  remaining?: number;
  inviteCode?: string;
}

export interface AuthProviders {
  success: true;
  wechat: boolean;
  /** qr=小程序码扫码（个人主体）；oauth=开放平台网站应用（需企业资质）；缺省=不可用 */
  wechatMode?: "qr" | "oauth";
  google: boolean;
  h5: boolean;
  /** 用户名 + 密码账号：本服务自建，恒为 true；前端表单不依赖它 */
  local?: boolean;
}

/** 注册 / 密码登录成功后返回：与 OAuth 的 ExchangeResult 同形（无 returnTo） */
export interface PasswordAuthResult extends AuthUser {
  success: true;
  token: string;
}

/** 扫码登录：生成小程序码（qrcode 是 dataURL，可直接作 img src） */
export interface WechatQrCreateResult {
  success: true;
  ticket: string;
  qrcode: string;
  /** 二维码有效期（秒） */
  expiresIn: number;
}

export type WechatQrStatus = "pending" | "confirmed" | "expired";

/** 扫码登录轮询：confirmed 时一次性返回 token + 用户信息（与 ExchangeResult 同形，无 returnTo） */
export interface WechatQrStatusResult extends Partial<AuthUser> {
  success: true;
  status: WechatQrStatus;
  token?: string;
}

export interface ExchangeResult extends AuthUser {
  success: true;
  token: string;
  /** 站内回跳路径（可能不带 locale 前缀） */
  returnTo: string;
}

/** 登录成功后返回给 UI 的会话形状，兼容旧的 `session.user?.name/image` 用法 */
export interface SessionLike {
  user: {
    id: string;
    name: string;
    image?: string;
    isAdmin: boolean;
    platform: AuthPlatform;
  };
}

export type OAuthProvider = "wechat" | "google";
