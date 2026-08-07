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
          "inline-flex items-center justify-center rounded-full font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
          {
            primary:
              "bg-primary text-white shadow-button hover:bg-primary-dark",
            secondary:
              "bg-gray-100 text-text-secondary hover:bg-gray-200",
            ghost: "text-text-secondary hover:bg-gray-100",
            danger: "bg-coral text-white hover:opacity-90",
          }[variant],
          {
            sm: "h-8 px-4 text-xs",
            md: "h-10 px-5 text-sm",
            lg: "h-12 px-6 text-base",
          }[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";