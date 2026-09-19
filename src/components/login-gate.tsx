"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState,useSyncExternalStore, type ReactNode } from "react";
import { useHydrated } from "@/lib/use-hydrated";
import { ThinkingMark } from "@/components/ui/thinking-mark";
import LoginScreen from "./login-screen";

/** The hidden view switcher stays reachable without signing in. */
const UNGATED = ["/admin"];
const AUTH_KEY = "monarch.signed-in";

const BOOT_MS = 2500;
const FADE_MS = 400;
const LOADER_SIZE = 112;

type Boot = "idle" | "loading" | "fading" | "done";
const subscribeSession=()=>()=>{};
const serverSession=()=>false;

function readSignedIn() {
  try {
    return window.sessionStorage.getItem(AUTH_KEY) === "1";
  } catch {
    return false;
  }
}

function persistSignedIn() {
  try {
    window.sessionStorage.setItem(AUTH_KEY, "1");
  } catch {
    /* private mode / blocked storage — stay in-memory for this visit */
  }
}

/**
 * Gates the app behind the login screen.
 *
 * Sign-in is kept in sessionStorage so a refresh stays in the app, while a
 * new tab or a closed session still lands on login.
 */
export default function LoginGate({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(false);
  const [boot, setBoot] = useState<Boot>("idle");
  const ready=useHydrated();
  const savedSession=useSyncExternalStore(subscribeSession,readSignedIn,serverSession);
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

  if (!ready) {
    return <div data-design-id="m-5612e088412e" className="flex h-full min-h-0 flex-1 bg-white" />;
  }

  if (!signedIn&&!savedSession) {
    return (
      <LoginScreen
        onSignIn={() => {
          persistSignedIn();
          setSignedIn(true);
          setBoot("loading");
        }}
      />
    );
  }

  const showLoader = boot === "loading" || boot === "fading";

  return (
    <>
      <div data-design-id="m-b8014e974347"
        className={`flex h-full min-h-0 flex-1 transition-opacity ease-out ${
          boot === "loading" ? "opacity-0" : "opacity-100"
        }`}
        style={{ transitionDuration: `${FADE_MS}ms` }}
      >
        {children}
      </div>

      {showLoader ? (
        <div data-design-id="m-58835ad73a9f"
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
