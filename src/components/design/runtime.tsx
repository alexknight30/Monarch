"use client";

import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import saved from "@/design/overrides.json";
import { compileStyles, designText, validateDesign, type DesignDocument } from "@/lib/design/model";

const DesignContext = createContext<DesignDocument>(saved as DesignDocument);
export function DesignRuntime({ children }: { children: ReactNode }) {
  const page = usePathname();
  const [preview, setPreview] = useState<DesignDocument | null>(null);
  useLayoutEffect(() => {
    document.documentElement.dataset.designPage = page;
  }, [page]);
  useLayoutEffect(() => {
    const update = (e: Event) => setPreview((e as CustomEvent<DesignDocument | null>).detail);
    window.addEventListener("monarch-design-preview", update);
    const message = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== window.parent || !new URLSearchParams(location.search).has("design-preview")) return;
      if (event.data?.type === "monarch-design-preview") {
        try { setPreview(validateDesign(event.data.document)); } catch { /* Reject malformed previews. */ }
      }
    };
    window.addEventListener("message", message);
    const readOnlyPreview = new URLSearchParams(location.search).has("design-preview");
    const block = (event: Event) => { event.preventDefault(); event.stopImmediatePropagation(); };
    if (readOnlyPreview) {
      document.addEventListener("click", block, true);
      document.addEventListener("submit", block, true);
      document.addEventListener("keydown", block, true);
      document.addEventListener("pointerdown", block, true);
    }
    return () => { window.removeEventListener("monarch-design-preview", update); window.removeEventListener("message", message); document.removeEventListener("click", block, true); document.removeEventListener("submit", block, true); document.removeEventListener("keydown", block, true); document.removeEventListener("pointerdown", block, true); };
  }, []);
  const doc = preview || saved as DesignDocument;
  return <DesignContext value={doc}><style data-design-styles>{compileStyles(doc)}</style>{children}</DesignContext>;
}
export function DesignCopy({ id, children }: { id: string; children: string }) {
  const page = usePathname();
  return designText(useContext(DesignContext), id, page, children);
}
