import clsx from "clsx";

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-2xl border-[3px] border-clay-border bg-card-bg shadow-card",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}