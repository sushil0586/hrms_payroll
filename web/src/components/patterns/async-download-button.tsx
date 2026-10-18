"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  fileName?: string;
  href: string;
};

function responseFileName(response: Response, fallback: string) {
  const disposition = response.headers.get("content-disposition") ?? "";
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const plain = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  if (encoded) return decodeURIComponent(encoded);
  return plain || fallback;
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function AsyncDownloadButton({ children, className = "button button--secondary", fileName = "download", href }: Props) {
  const controllerRef = useRef<AbortController | null>(null);
  const requestSequenceRef = useRef(0);
  const [state, setState] = useState<"idle" | "preparing" | "downloading" | "failed">("idle");
  const [stateHref, setStateHref] = useState(href);
  const [loaded, setLoaded] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    requestSequenceRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, [href]);

  useEffect(() => () => {
    requestSequenceRef.current += 1;
    controllerRef.current?.abort();
  }, []);

  async function download() {
    const visibleState = stateHref === href ? state : "idle";
    if (visibleState === "preparing" || visibleState === "downloading") return;
    const controller = new AbortController();
    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;
    controllerRef.current = controller;
    setStateHref(href);
    setState("preparing");
    setLoaded(0);
    setTotal(null);
    setError("");
    try {
      const response = await fetch(href, { credentials: "same-origin", signal: controller.signal });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { detail?: string };
        throw new Error(payload.detail || `Download failed (${response.status}).`);
      }
      if (requestSequenceRef.current !== requestSequence) return;
      const contentLength = Number(response.headers.get("content-length"));
      const expectedTotal = Number.isFinite(contentLength) && contentLength > 0 ? contentLength : null;
      setTotal(expectedTotal);
      setState("downloading");
      const reader = response.body?.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            received += value.byteLength;
            if (requestSequenceRef.current === requestSequence) setLoaded(received);
          }
        }
      } else {
        const bytes = new Uint8Array(await response.arrayBuffer());
        chunks.push(bytes);
        received = bytes.byteLength;
        setLoaded(received);
      }
      if (requestSequenceRef.current !== requestSequence) return;
      const blob = new Blob(chunks as BlobPart[], { type: response.headers.get("content-type") || "application/octet-stream" });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = responseFileName(response, fileName);
      anchor.click();
      URL.revokeObjectURL(objectUrl);
      if (requestSequenceRef.current === requestSequence) setState("idle");
    } catch (nextError) {
      if (controller.signal.aborted || requestSequenceRef.current !== requestSequence) return;
      setError(nextError instanceof Error ? nextError.message : "Download failed. Try again.");
      setState("failed");
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }

  const visibleState = stateHref === href ? state : "idle";
  const visibleError = stateHref === href ? error : "";
  const pending = visibleState === "preparing" || visibleState === "downloading";
  const pendingLabel = visibleState === "preparing" ? "Preparing download" : "Downloading";
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (!pending) void download();
  }
  return (
    <span className="async-download-control">
      <a
        aria-busy={pending || undefined}
        aria-disabled={pending || undefined}
        className={className}
        download={fileName}
        href={href}
        onClick={handleClick}
      >
        {pending ? <span aria-hidden="true" className="async-action-button__spinner" /> : null}
        <span>{visibleState === "failed" ? "Retry download" : pending ? pendingLabel : children}</span>
        {pending ? <span className="sr-only" role="status">{pendingLabel}</span> : null}
      </a>
      {visibleState === "downloading" ? (
        <span className="async-download-control__status" role="status" aria-live="polite">
          {total ? `${formatBytes(loaded)} of ${formatBytes(total)}` : `${formatBytes(loaded)} received`}
        </span>
      ) : null}
      {visibleError ? <span className="async-download-control__error" role="alert">{visibleError}</span> : null}
    </span>
  );
}
