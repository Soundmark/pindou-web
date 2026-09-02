"use client";

import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

export function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const t = useTranslations("header");
  const tc = useTranslations("common");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: "/create", label: t("navCreate") },
    { href: "/gallery", label: t("navGallery") },
    ...(session ? [{ href: "/my-patterns", label: t("navMyPatterns") }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 border-b-[3px] border-clay-border bg-background shadow-[0_4px_12px_rgba(214,120,138,0.08)]">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="font-heading text-xl font-semibold text-primary-strong transition-transform hover:animate-wobble"
          >
            Pindou
          </Link>
          <nav className="hidden items-center gap-4 sm:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                  pathname.startsWith(link.href)
                    ? "bg-primary/15 font-semibold text-primary-strong"
                    : "text-text-secondary hover:text-text-primary"
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
              <Button
                onClick={() => signOut()}
                variant="secondary"
                size="sm"
                className="max-sm:hidden"
              >
                {tc("signOut")}
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => signIn()}
              size="sm"
              className="max-sm:hidden"
            >
              {tc("signIn")}
            </Button>
          )}

          <div className="max-sm:hidden">
            <LanguageSwitcher size="sm" />
          </div>

          {/* Hamburger button — visible on mobile only */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border-[3px] border-clay-border bg-surface text-text-secondary shadow-button-secondary transition-[transform,box-shadow] active:translate-y-[3px] active:shadow-button-secondary-pressed sm:hidden"
            aria-label={t("openMenu")}
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
              className={`rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${
                pathname.startsWith(link.href)
                  ? "bg-primary/15 font-semibold text-primary-strong"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 px-4">
            <LanguageSwitcher />
          </div>
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
              <Button
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut();
                }}
                variant="secondary"
                className="mx-4 mt-1"
              >
                {tc("signOut")}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => {
                setMobileMenuOpen(false);
                signIn();
              }}
              className="mx-4 mt-2"
            >
              {tc("signIn")}
            </Button>
          )}
        </div>
      </Modal>
    </header>
  );
}