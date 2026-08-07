"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Modal } from "@/components/ui/Modal";

export function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: "/create", label: "Create" },
    { href: "/gallery", label: "Gallery" },
    ...(session ? [{ href: "/my-patterns", label: "My Patterns" }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-lg font-bold text-primary hover:text-primary-dark"
          >
            Pindou
          </Link>
          <nav className="hidden items-center gap-4 sm:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  pathname.startsWith(link.href)
                    ? "text-primary"
                    : "text-text-secondary"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {session ? (
            <div className="flex items-center gap-3">
              {session.user?.image && (
                <img
                  src={session.user.image}
                  alt=""
                  className="h-7 w-7 rounded-full"
                />
              )}
              <span className="hidden text-sm text-text-secondary sm:inline">
                {session.user?.name}
              </span>
              <button
                onClick={() => signOut()}
                className="hidden rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-gray-200 sm:block"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn()}
              className="hidden rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-white shadow-button transition-colors hover:bg-primary-dark sm:block"
            >
              Sign in
            </button>
          )}

          {/* Hamburger button — visible on mobile only */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="rounded-lg p-2 text-text-secondary hover:bg-gray-100 sm:hidden"
            aria-label="Open menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu modal */}
      <Modal
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        className="max-w-xs"
      >
        <div className="flex flex-col gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`rounded-xl px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-100 ${
                pathname.startsWith(link.href)
                  ? "text-primary"
                  : "text-text-secondary"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {session ? (
            <>
              <hr className="my-2 border-gray-100" />
              <div className="flex items-center gap-3 px-4 py-2">
                {session.user?.image && (
                  <img
                    src={session.user.image}
                    alt=""
                    className="h-8 w-8 rounded-full"
                  />
                )}
                <span className="text-sm text-text-secondary">
                  {session.user?.name}
                </span>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut();
                }}
                className="mx-4 mt-1 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-gray-200"
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                signIn();
              }}
              className="mx-4 mt-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white shadow-button transition-colors hover:bg-primary-dark"
            >
              Sign in
            </button>
          )}
        </div>
      </Modal>
    </header>
  );
}