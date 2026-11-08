"use client";

/**
 * 登录 / 注册表单的共用原语。
 *
 * 只承载黏土风表单配方（label + 凹陷输入框 + 错误条），
 * 校验与提交逻辑留在页面里 —— 两个页面的规则并不相同。
 */
import type { InputHTMLAttributes } from "react";

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** 可选说明，显示在输入框下方 */
  hint?: string;
}

export function AuthField({ label, hint, id, ...props }: AuthFieldProps) {
  return (
    <div className="text-left">
      <label htmlFor={id} className="block text-sm font-semibold text-text-primary">
        {label}
      </label>
      <input
        id={id}
        className="mt-1 h-11 w-full rounded-full border-[3px] border-clay-border bg-surface px-4 text-sm text-text-primary shadow-inset outline-none focus:border-primary"
        {...props}
      />
      {hint && <p className="mt-1 px-4 text-xs text-text-muted">{hint}</p>}
    </div>
  );
}

/** 表单级错误条：沿用登录页原有的 role="alert" 配方 */
export function AuthAlert({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-2xl border-[3px] border-clay-border bg-surface px-3 py-2 text-left text-xs font-semibold text-primary-strong"
    >
      {children}
    </p>
  );
}
