import clsx from "clsx";

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-2xl bg-card-bg shadow-card backdrop-blur-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}