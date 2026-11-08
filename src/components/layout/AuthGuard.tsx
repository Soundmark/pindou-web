"use client";

import { useAuth } from "@/providers/AuthProvider";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useEffect } from "react";
import { Spinner } from "@/components/ui/Spinner";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?returnTo=${encodeURIComponent(pathname)}`);
    }
  }, [status, pathname, router]);

  if (status === "loading") {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!session) return null;

  return <>{children}</>;
}
