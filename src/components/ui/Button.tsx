import { ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          "inline-flex select-none items-center justify-center rounded-full border-[3px] font-semibold transition-[transform,box-shadow,background-color] duration-150 ease-out disabled:pointer-events-none disabled:opacity-50 active:translate-y-1",
          {
            primary:
              "border-primary-light bg-primary text-primary-ink shadow-button hover:bg-primary-dark active:shadow-button-pressed",
            secondary:
              "border-clay-border bg-surface text-text-secondary shadow-button-secondary hover:bg-gray-50 active:shadow-button-secondary-pressed",
            ghost:
              "border-transparent text-text-secondary hover:bg-gray-100 active:scale-95",
            danger:
              "border-[#ffc9c9] bg-coral text-primary-ink shadow-button-danger hover:brightness-105 active:shadow-button-danger-pressed",
          }[variant],
          {
            sm: "h-9 px-4 text-xs",
            md: "h-11 px-5 text-sm",
            lg: "h-13 px-7 text-base",
          }[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";