"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { PDFDocumentProxy, RenderTask, TextLayer } from "pdfjs-dist";
import "./pdf-reading-viewer.css";

const button = "rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs disabled:opacity-40";
export function PdfReadingViewer({ url, onQuote, onTextView }: { url: string; onQuote: (quote: string) => void; onTextView: () => void }) {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(600);
  const [size, setSize] = useState({ width: 600, height: 780, scale: 1 });
  const [error, setError] = useState("");
  const [rendering, setRendering] = useState(true);
  const wrapper = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const text = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = wrapper.current; if (!node) return;
    const observer = new ResizeObserver(entries => setWidth(Math.max(200, entries[0].contentRect.width - 32)));
    observer.observe(node); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let cancelled = false;
    let loading: ReturnType<typeof import("pdfjs-dist").getDocument> | undefined;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error("The original file could not be opened.");
        const data = new Uint8Array(await response.arrayBuffer());
        if (new TextDecoder().decode(data.slice(0, 5)) !== "%PDF-") { if (!cancelled) onTextView(); return; }
        const pdfjs = await import("pdfjs-dist");
        if (cancelled) return;
        pdfjs.GlobalWorkerOptions.workerSrc = "/api/pdf-worker";
        loading = pdfjs.getDocument({ data });
        const pdf = await loading.promise;
        if (!cancelled) setDocument(pdf);
      } catch (cause) { if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not open PDF."); }
    })();
    return () => { cancelled = true; controller.abort(); void loading?.destroy(); };
    // The callbacks update parent UI; only a source change should reload the file.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);
  useEffect(() => {
    if (!document || !canvas.current || !text.current) return;
    let cancelled = false;
    let task: RenderTask | undefined;
    let layer: TextLayer | undefined;
    const target = canvas.current, container = text.current;
    void (async () => {
      try {
        setRendering(true);
        const pdfPage = await document.getPage(page);
        if (cancelled) return;
        const viewport = pdfPage.getViewport({ scale: width / pdfPage.getViewport({ scale: 1 }).width * zoom });
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        target.width = Math.floor(viewport.width * ratio); target.height = Math.floor(viewport.height * ratio);
        container.replaceChildren();
        container.style.setProperty("--total-scale-factor", String(viewport.scale));
        setSize({ width: viewport.width, height: viewport.height, scale: viewport.scale });
        task = pdfPage.render({ canvas: target, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] });
        await task.promise;
        if (cancelled) return;
        const pdfjs = await import("pdfjs-dist");
        if (cancelled) return;
        layer = new pdfjs.TextLayer({ textContentSource: pdfPage.streamTextContent(), container, viewport });
        await layer.render();
        if (!cancelled) setRendering(false);
      } catch (cause) { if (!cancelled) { setError(cause instanceof Error ? cause.message : "Could not render page."); setRendering(false); } }
    })();
    return () => { cancelled = true; task?.cancel(); layer?.cancel(); };
  }, [document, page, width, zoom]);
  const capture = () => {
    const selection = window.getSelection();
    if (selection?.rangeCount && text.current?.contains(selection.getRangeAt(0).commonAncestorContainer)) {
      const quote = selection.toString().trim(); if (quote) onQuote(quote);
    }
  };
  return <section className="overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
    <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 bg-white p-3">
      <button className={button} disabled={!document || page <= 1} onClick={() => setPage(value => value - 1)}>←</button>
      <label className="flex items-center gap-2 text-xs text-stone-500">Page <input aria-label="PDF page" type="number" min={1} step={1} max={document?.numPages || 1} value={page} onChange={event => setPage(Math.max(1, Math.min(document?.numPages || 1, Math.floor(Number(event.target.value)) || 1)))} className="w-14 rounded border border-stone-200 p-1" /> of {document?.numPages || "…"}</label>
      <button className={button} disabled={!document || page >= document.numPages} onClick={() => setPage(value => value + 1)}>→</button>
      <select aria-label="PDF zoom" className={button + " ml-auto"} value={zoom} onChange={event => setZoom(Number(event.target.value))}><option value={1}>Fit width</option><option value={1.25}>125%</option><option value={1.5}>150%</option><option value={2}>200%</option></select>
      <button className={button} onClick={onTextView}>Text view</button>
    </div>
    {error ? <div role="alert" className="p-5 text-sm text-red-700">{error} <button className="underline" onClick={onTextView}>Read extracted text</button></div> : <>
      <p role="status" className="px-4 pt-3 text-xs text-stone-500">{rendering ? "Rendering the original page…" : "Select a passage to add it to your notes below."}</p>
      <div ref={wrapper} className="max-h-[80vh] overflow-auto p-4">
        <div className="relative mx-auto bg-white shadow-sm" style={{ width: size.width, height: size.height, "--total-scale-factor": size.scale } as CSSProperties}>
          <canvas ref={canvas} aria-label={"Original PDF page " + page} style={{ width: size.width, height: size.height }} />
          <div ref={text} className="monarch-pdf-text" onMouseUp={capture} onKeyUp={capture} />
        </div>
      </div>
    </>}
  </section>;
}
