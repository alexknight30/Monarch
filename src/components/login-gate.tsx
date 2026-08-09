"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ThinkingMark } from "@/components/ui/thinking-mark";
import LoginScreen from "./login-screen";

/** The hidden view switcher stays reachable without signing in. */
const UNGATED = ["/admin"];

const BOOT_MS = 2500;
const FADE_MS = 400;
const LOADER_SIZE = 112;

type Boot = "idle" | "loading" | "fading" | "done";

/**
 * Gates the app behind the login screen.
 *
 * Auth lives in component state only — deliberately not localStorage or a
 * cookie — so a hard refresh or a first load always lands on login, and
 * client-side navigation within a session does not.
 */
export default function LoginGate({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(false);
  const [boot, setBoot] = useState<Boot>("idle");
  const pathname = usePathname();

  useEffect(() => {
    if (boot !== "loading") return;
    const t = window.setTimeout(() => setBoot("fading"), BOOT_MS);
    return () => window.clearTimeout(t);
  }, [boot]);

  useEffect(() => {
    if (boot !== "fading") return;
    const t = window.setTimeout(() => setBoot("done"), FADE_MS);
    return () => window.clearTimeout(t);
  }, [boot]);

  if (UNGATED.includes(pathname)) return <>{children}</>;

  if (!signedIn) {
    return (
      <LoginScreen
        onSignIn={() => {
          setSignedIn(true);
          setBoot("loading");
        }}
      />
    );
  }

  const showLoader = boot === "loading" || boot === "fading";

  return (
    <>
      <div
        className={`flex h-full min-h-0 flex-1 transition-opacity ease-out ${
          boot === "loading" ? "opacity-0" : "opacity-100"
        }`}
        style={{ transitionDuration: `${FADE_MS}ms` }}
      >
        {children}
      </div>

      {showLoader ? (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-white transition-opacity ease-out ${
            boot === "fading" ? "opacity-0" : "opacity-100"
          }`}
          style={{ transitionDuration: `${FADE_MS}ms` }}
          aria-hidden="true"
        >
          <ThinkingMark size={LOADER_SIZE} />
        </div>
      ) : null}
    </>
  );
}
