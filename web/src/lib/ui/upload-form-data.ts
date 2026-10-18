export type UploadProgress = {
  loaded: number;
  total: number | null;
};

export type UploadResult = {
  ok: boolean;
  payload: unknown;
  status: number;
};

export function uploadFormData(
  url: string,
  body: FormData,
  options: { onProgress?: (progress: UploadProgress) => void; signal?: AbortSignal } = {},
) {
  return new Promise<UploadResult>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", url);
    request.withCredentials = true;
    request.upload.addEventListener("progress", (event) => {
      options.onProgress?.({ loaded: event.loaded, total: event.lengthComputable ? event.total : null });
    });
    request.addEventListener("load", () => {
      let payload: unknown = {};
      try {
        payload = request.responseText ? JSON.parse(request.responseText) : {};
      } catch {
        payload = {};
      }
      resolve({ ok: request.status >= 200 && request.status < 300, payload, status: request.status });
    });
    request.addEventListener("error", () => reject(new Error("Unable to reach the server. Check your connection and try again.")));
    request.addEventListener("abort", () => reject(new DOMException("Upload cancelled.", "AbortError")));
    if (options.signal) {
      if (options.signal.aborted) {
        request.abort();
        return;
      }
      options.signal.addEventListener("abort", () => request.abort(), { once: true });
    }
    request.send(body);
  });
}
