import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "./PdfViewer.css";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;
const SCALE_STEP = 0.15;

function isCancelledRender(err: unknown): boolean {
  return err instanceof Error && err.name === "RenderingCancelledException";
}

export function PdfViewer({
  data,
  loading = false,
  error = null,
}: {
  data: Uint8Array | null;
  loading?: boolean;
  error?: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [docError, setDocError] = useState<string | null>(null);

  const file = useMemo(() => {
    if (!data || data.byteLength === 0) return null;
    try {
      const copy = new Uint8Array(data.byteLength);
      copy.set(data);
      return new Blob([copy], { type: "application/pdf" });
    } catch {
      return null;
    }
  }, [data]);

  useEffect(() => {
    setNumPages(0);
    setPageNumber(1);
    setDocError(null);
  }, [file]);

  useEffect(() => {
    if (!file || loading || error) return;
    let cancelled = false;
    let task: PDFDocumentLoadingTask | null = null;
    void (async () => {
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (cancelled) return;
        task = getDocument({
          data: bytes,
          isOffscreenCanvasSupported: false,
        });
        const pdf = await task.promise;
        if (cancelled) return;
        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
      } catch (err) {
        if (cancelled || isCancelledRender(err)) return;
        setDocError(err instanceof Error ? err.message : "Failed to load PDF");
      }
    })();
    return () => {
      cancelled = true;
      pdfRef.current = null;
      void task?.destroy();
    };
  }, [file, loading, error]);

  useEffect(() => {
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas || numPages === 0) return;
    let cancelled = false;
    let renderTask: RenderTask | null = null;
    const safePage = Math.min(Math.max(pageNumber, 1), numPages);
    void (async () => {
      try {
        const page = await pdf.getPage(safePage);
        if (cancelled) return;
        const pixelRatio = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: scale * pixelRatio });
        const context = canvas.getContext("2d");
        if (!context) return;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / pixelRatio)}px`;
        canvas.style.height = `${Math.floor(viewport.height / pixelRatio)}px`;
        renderTask = page.render({ canvasContext: context, viewport });
        await renderTask.promise;
      } catch (err) {
        if (cancelled || isCancelledRender(err)) return;
        setDocError(err instanceof Error ? err.message : "Failed to draw the PDF page");
      }
    })();
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [numPages, pageNumber, scale]);

  const displayError = error ?? docError;
  const showCanvas = Boolean(file) && !loading && !displayError && numPages > 0;

  return (
    <div class="pdf-viewer">
      <div class="pdf-viewer-toolbar">
        <div class="pdf-viewer-pages">
          <button
            type="button"
            class="pdf-viewer-nav-btn"
            disabled={!file || pageNumber <= 1}
            onClick={() => setPageNumber((page) => Math.max(1, page - 1))}
          >
            <ChevronLeft size={16} aria-hidden="true" />
            Prev
          </button>
          <span class="pdf-viewer-label">
            {file && numPages > 0 ? `Page ${pageNumber} / ${numPages}` : "No pages"}
          </span>
          <button
            type="button"
            class="pdf-viewer-nav-btn"
            disabled={!file || pageNumber >= numPages}
            onClick={() =>
              setPageNumber((page) => (numPages > 0 ? Math.min(numPages, page + 1) : page))
            }
          >
            Next
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
        <div class="pdf-viewer-zoom">
          <button
            type="button"
            class="pdf-viewer-nav-btn"
            disabled={!file || scale <= MIN_SCALE}
            aria-label="Zoom out"
            onClick={() =>
              setScale((value) => Math.max(MIN_SCALE, +(value - SCALE_STEP).toFixed(2)))
            }
          >
            <ZoomOut size={16} aria-hidden="true" />
          </button>
          <span class="pdf-viewer-label pdf-viewer-zoom-label">{Math.round(scale * 100)}%</span>
          <button
            type="button"
            class="pdf-viewer-nav-btn"
            disabled={!file || scale >= MAX_SCALE}
            aria-label="Zoom in"
            onClick={() =>
              setScale((value) => Math.min(MAX_SCALE, +(value + SCALE_STEP).toFixed(2)))
            }
          >
            <ZoomIn size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div class="pdf-viewer-stage">
        {loading ? <p class="pdf-viewer-status">Generating PDF preview…</p> : null}
        {displayError ? <p class="pdf-viewer-status pdf-viewer-error">{displayError}</p> : null}
        {!loading && !displayError && !file ? (
          <p class="pdf-viewer-status">No PDF preview.</p>
        ) : null}
        {!showCanvas && file && !loading && !displayError ? (
          <p class="pdf-viewer-status">Loading PDF…</p>
        ) : null}
        <canvas ref={canvasRef} class={showCanvas ? "pdf-viewer-canvas" : "pdf-viewer-canvas is-hidden"} />
      </div>
    </div>
  );
}
